import json
import time
from datetime import datetime, timezone
from google import genai
from google.genai import types
from config import GEMINI_API_KEY
from db import get_conversations_collection, get_knowledge_collection, get_processing_logs_collection

EXTRACTION_SYSTEM_PROMPT = """You are a strict data analysis assistant for AI Jehosue.

Your task is to analyze visitor conversation logs and extract new, factual knowledge explicitly stated by Jehosue during the conversation.

STRICT RULES:
1. ONLY extract statements explicitly made by Jehosue (in the AI response) about his skills, learning goals, preferences, projects, or background.
2. NEVER treat visitor questions or visitor claims as facts about Jehosue.
3. NEVER invent or assume facts.
4. Do NOT extract generic greetings, small talk, or boilerplate portfolio descriptions that are already known.
5. If no new information is present, return an empty array `[]`.

OUTPUT FORMAT:
Return ONLY a valid JSON array of objects with these exact keys:
[
  {
    "category": "skills" | "personal" | "education" | "projects" | "experience" | "career" | "preferences" | "interests" | "other",
    "information": "Specific fact about Jehosue stated in the conversation",
    "confidence": 0.0 to 1.0 (float),
    "reason": "Brief explanation of why this was extracted"
  }
]
"""

# Only use currently available models — ordered by preference
CANDIDATE_MODELS = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.1-flash-lite-preview',
    'gemini-flash-lite-latest',
    'gemini-3-flash-preview',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.7-flash',
    'gemini-3.8-flash-lite'
]

# Seconds to wait between each conversation to avoid rate limit (429)
REQUEST_DELAY_SECONDS = 3


def _call_gemini_extraction(client, prompt_text):
    """Try each Gemini model until one succeeds."""
    last_err = None
    for model in CANDIDATE_MODELS:
        try:
            response = client.models.generate_content(
                model=model,
                config=types.GenerateContentConfig(
                    system_instruction=EXTRACTION_SYSTEM_PROMPT,
                    temperature=0.2,
                    response_mime_type="application/json"
                ),
                contents=prompt_text
            )
            return response.text.strip(), model
        except Exception as e:
            last_err = e
            err_str = str(e)
            # Skip immediately on 404 (model not available)
            if "404" in err_str or "NOT_FOUND" in err_str:
                print(f"[Warning] Model {model} not available (404), skipping.")
                continue
            # On rate limit, wait then continue to next model
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                print(f"[Warning] Rate limit hit on {model} (429). Waiting 5s before next model...")
                time.sleep(5)
                continue
            print(f"[Warning] Model {model} failed: {e}")
    raise RuntimeError(f"All Gemini models failed for extraction. Last error: {last_err}")


def process_unprocessed_conversations():
    """
    Main processing function:
    1. Fetch all conversations where processed=False / processing_status=pending.
    2. For each: mark as processing, call Gemini, save knowledge, mark completed.
    3. On any failure: mark conversation as failed.
    4. Write a processing_logs entry with accurate counts.
    """
    conv_coll = get_conversations_collection()
    know_coll = get_knowledge_collection()
    log_coll = get_processing_logs_collection()

    if conv_coll is None or know_coll is None:
        print("[Error] MongoDB collections not available -- cannot process.")
        return {
            "error": "MongoDB collections not available",
            "processed_conversations_count": 0,
            "extracted_items_count": 0,
            "failed_conversation_count": 0,
        }

    # Only fetch conversations that still need processing
    query = {
        "$or": [
            {"processing_status": "pending"},
            {"processing_status": {"$exists": False}, "processed": False},
        ]
    }
    unprocessed = list(conv_coll.find(query))

    if not unprocessed:
        print("[Info] No pending conversations found.")
        return {
            "message": "No pending conversations found",
            "processed_conversations_count": 0,
            "extracted_items_count": 0,
            "failed_conversation_count": 0,
        }

    print(f"[Info] Found {len(unprocessed)} unprocessed conversation(s). Starting processing...")

    gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    started_at = datetime.now(timezone.utc).isoformat()

    all_extracted = []
    processed_count = 0
    failed_count = 0

    for idx, conv in enumerate(unprocessed):
        conv_id = conv["_id"]
        visitor_msg = conv.get("visitor_message", "")
        ai_resp = conv.get("ai_response", "")
        session_id = conv.get("session_id", "unknown")

        print(f"[Info] Processing conversation {idx + 1}/{len(unprocessed)}: {conv_id}")

        # Mark as processing to prevent double-processing
        conv_coll.update_one(
            {"_id": conv_id},
            {"$set": {"processing_status": "processing"}}
        )

        try:
            prompt = f"Conversation to analyze:\n\nVisitor: {visitor_msg}\nAI Jehosue: {ai_resp}\n"
            print(f"[Info] Gemini extraction started for conversation: {conv_id}")
            text, used_model = _call_gemini_extraction(gemini_client, prompt)

            extracted_list = []
            if text:
                try:
                    extracted_list = json.loads(text)
                    if not isinstance(extracted_list, list):
                        extracted_list = []
                except json.JSONDecodeError:
                    print(f"[Warning] Could not parse Gemini JSON for {conv_id}: {text[:200]}")

            now_iso = datetime.now(timezone.utc).isoformat()
            saved_count = 0

            for item in extracted_list:
                if isinstance(item, dict) and item.get("information") and item.get("category"):
                    knowledge_doc = {
                        "category": item.get("category", "other"),
                        "information": item["information"],
                        "source": "processed_conversation",
                        "session_id": session_id,
                        "conversation_id": str(conv_id),
                        "confidence": float(item.get("confidence", 0.8)),
                        "reason": item.get("reason", ""),
                        "status": "pending_review",
                        "created_at": now_iso,
                        "updated_at": now_iso,
                    }
                    know_coll.insert_one(knowledge_doc)
                    knowledge_doc["_id"] = str(knowledge_doc["_id"])
                    all_extracted.append(knowledge_doc)
                    saved_count += 1

            print(f"[Info] Extracted {saved_count} knowledge item(s) from conversation {conv_id} (model: {used_model}).")

            # Mark conversation as completed
            conv_coll.update_one(
                {"_id": conv_id},
                {"$set": {
                    "processed": True,
                    "processing_status": "completed",
                    "processed_at": datetime.now(timezone.utc).isoformat(),
                }}
            )
            print(f"[Info] Conversation {conv_id} marked as completed.")
            processed_count += 1

        except Exception as e:
            print(f"[Error] Failed to process conversation {conv_id}: {e}")
            try:
                conv_coll.update_one(
                    {"_id": conv_id},
                    {"$set": {
                        "processed": False,
                        "processing_status": "failed",
                        "processing_error": str(e)[:500],
                    }}
                )
            except Exception as update_err:
                print(f"[Error] Could not update failed status for {conv_id}: {update_err}")
            failed_count += 1

        # Small delay between requests to avoid rate limiting
        if idx < len(unprocessed) - 1:
            time.sleep(REQUEST_DELAY_SECONDS)

    completed_at = datetime.now(timezone.utc).isoformat()

    # Write accurate processing log
    if log_coll is not None:
        log_doc = {
            "started_at": started_at,
            "completed_at": completed_at,
            "processed_conversations_count": processed_count,
            "extracted_items_count": len(all_extracted),
            "failed_conversation_count": failed_count,
            "status": "completed" if failed_count == 0 else "completed_with_errors",
        }
        try:
            log_coll.insert_one(log_doc)
        except Exception as e:
            print(f"[Error] Could not write processing log: {e}")

    print(f"[Info] Processing finished. Processed: {processed_count}, Extracted: {len(all_extracted)}, Failed: {failed_count}")

    return {
        "processed_conversations_count": processed_count,
        "extracted_items_count": len(all_extracted),
        "failed_conversation_count": failed_count,
        "extracted_items": all_extracted,
    }


