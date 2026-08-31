import json
import threading
from datetime import datetime, timezone
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from bson import ObjectId
from google import genai
from google.genai import types

from config import GEMINI_API_KEY, PORT
from db import get_conversations_collection, get_knowledge_collection, get_db
from knowledge_base import build_system_instruction
from processor import process_unprocessed_conversations

app = Flask(__name__)
CORS(app)

# ---------------------------------------------------------------------------
# Candidate Gemini models — ordered by availability & active quota
# ---------------------------------------------------------------------------
CANDIDATE_MODELS = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.1-flash-lite-preview',
    'gemini-flash-lite-latest',
    'gemini-3-flash-preview',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
]


def _run_processing_background():
    """Auto-trigger processor in a daemon thread after a conversation is saved."""
    try:
        print("[Info] Background processing auto-triggered...")
        result = process_unprocessed_conversations()
        print(f"[Info] Background processing finished: {result.get('processed_conversations_count', 0)} processed, "
              f"{result.get('extracted_items_count', 0)} knowledge items extracted.")
    except Exception as e:
        print(f"[Error] Background processing failed: {e}")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route('/api/health', methods=['GET'])
def health_check():
    db = get_db()
    mongo_status = "connected" if db is not None else "disconnected"
    return jsonify({
        "status": "online",
        "service": "AI Jehosue Backend",
        "mongodb": mongo_status
    })


@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json() or {}
        session_id = data.get("session_id", "anonymous-session")
        messages = data.get("messages", [])

        if not messages or not isinstance(messages, list):
            single_msg = data.get("message", "")
            if single_msg:
                messages = [{"role": "user", "content": single_msg}]
            else:
                return jsonify({"error": "Messages are required"}), 400

        visitor_message = messages[-1].get("content", "")
        if not visitor_message:
            return jsonify({"error": "Visitor message cannot be empty"}), 400

        # Build Gemini history format from previous messages
        gemini_history = []
        for msg in messages[:-1]:
            role = "user" if msg.get("role") == "user" else "model"
            content = msg.get("content", "")
            if content:
                gemini_history.append(types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=content)]
                ))

        system_instruction = build_system_instruction()
        client = genai.Client(api_key=GEMINI_API_KEY)

        response_text = ""
        last_error = None
        used_model = None

        for model in CANDIDATE_MODELS:
            try:
                gen_response = client.models.generate_content(
                    model=model,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.7,
                        top_p=0.9,
                        max_output_tokens=2048,
                    ),
                    contents=visitor_message
                )
                response_text = gen_response.text
                if response_text:
                    used_model = model
                    break
            except Exception as e:
                last_error = e
                print(f"[Warning] Model {model} failed: {e}")

        if not response_text:
            return jsonify({"error": f"Failed to generate response: {last_error}"}), 500

        # Save conversation to MongoDB with processing_status = "pending"
        conv_coll = get_conversations_collection()
        if conv_coll is not None:
            conv_doc = {
                "session_id": session_id,
                "visitor_message": visitor_message,
                "ai_response": response_text,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "processed": False,
                "processing_status": "pending",
                "metadata": {
                    "model": used_model or "unknown",
                }
            }
            try:
                inserted = conv_coll.insert_one(conv_doc)
                print(f"[Info] Conversation saved successfully with ID: {inserted.inserted_id} (session: {session_id})")

                # Auto-trigger processing in the background
                t = threading.Thread(target=_run_processing_background, daemon=True)
                t.start()

            except Exception as e:
                print(f"[Error] Failed to insert conversation to MongoDB: {e}")

        return jsonify({
            "session_id": session_id,
            "response": response_text,
            "role": "assistant"
        })

    except Exception as e:
        print(f"[Error] Exception in /api/chat: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/process-data', methods=['POST'])
def process_data():
    """Manual endpoint to trigger processing (also auto-runs after each chat)."""
    try:
        result = process_unprocessed_conversations()
        return jsonify(result)
    except Exception as e:
        print(f"[Error] Exception in /api/process-data: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/knowledge', methods=['GET'])
def get_knowledge():
    try:
        status_filter = request.args.get('status', 'all')
        know_coll = get_knowledge_collection()
        if know_coll is None:
            return jsonify({"error": "MongoDB knowledge collection unavailable", "items": []})

        query = {} if status_filter == 'all' else {"status": status_filter}
        items = list(know_coll.find(query))

        for item in items:
            item['_id'] = str(item['_id'])

        return jsonify({
            "count": len(items),
            "status_filter": status_filter,
            "items": items
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/knowledge/status', methods=['POST'])
def update_knowledge_status():
    try:
        data = request.get_json() or {}
        item_id = data.get("id")
        new_status = data.get("status")

        if not item_id or new_status not in ["approved", "rejected", "pending_review"]:
            return jsonify({"error": "Valid id and status ('approved', 'rejected', 'pending_review') are required"}), 400

        know_coll = get_knowledge_collection()
        if know_coll is None:
            return jsonify({"error": "MongoDB knowledge collection unavailable"}), 500

        try:
            query = {"_id": ObjectId(item_id)}
        except Exception:
            query = {"_id": item_id}

        result = know_coll.update_one(
            query,
            {"$set": {
                "status": new_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )

        if result.matched_count == 0:
            return jsonify({"error": "Knowledge item not found"}), 404

        return jsonify({"success": True, "id": item_id, "status": new_status})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    print(f"AI Jehosue Python Backend running on http://127.0.0.1:{PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=True)

