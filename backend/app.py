import json
import threading
from datetime import datetime, timezone, timedelta
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from bson import ObjectId
from google import genai
from google.genai import types

from config import GEMINI_API_KEY, PORT, ADMIN_SECRET, ENABLE_RLS
from db import get_conversations_collection, get_knowledge_collection, get_db
from knowledge_base import build_system_instruction
from processor import process_unprocessed_conversations

app = Flask(__name__)
CORS(app)

# Secure Session Cookie Configuration
app.config.update(
    SECRET_KEY=ADMIN_SECRET,
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    PERMANENT_SESSION_LIFETIME=timedelta(days=7),
    SESSION_COOKIE_NAME='__Secure-jeho-session'
)

# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# In-Memory Rate Limiter for Python Flask Backend
# ---------------------------------------------------------------------------
_rate_limit_store = {}
_rate_limit_lock = threading.Lock()

def check_backend_rate_limit(key: str, limit: int, window_seconds: int = 60) -> tuple[bool, int]:
    """Sliding-window rate limiter per client key (IP or session)."""
    now = datetime.now(timezone.utc).timestamp()
    window_start = now - window_seconds

    with _rate_limit_lock:
        if key not in _rate_limit_store:
            _rate_limit_store[key] = []

        # Filter active timestamps
        _rate_limit_store[key] = [ts for ts in _rate_limit_store[key] if ts > window_start]

        if len(_rate_limit_store[key]) >= limit:
            oldest = _rate_limit_store[key][0]
            retry_after = max(int(oldest + window_seconds - now), 1)
            return False, retry_after

        _rate_limit_store[key].append(now)
        return True, 0

def get_client_ip(req) -> str:
    if req.headers.get('X-Forwarded-For'):
        return req.headers.get('X-Forwarded-For').split(',')[0].strip()
    return req.remote_addr or '127.0.0.1'

# Candidate Gemini models - ordered by availability & active quota
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


def check_admin_auth(req) -> bool:
    """Validate administrator credentials for Row-Level Security overrides."""
    if not ENABLE_RLS:
        return True

    # Check X-Admin-Secret header
    admin_header = req.headers.get("X-Admin-Secret") or req.headers.get("x-admin-secret")
    if admin_header and admin_header == ADMIN_SECRET:
        return True

    # Check Bearer Token
    auth_header = req.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        if token == ADMIN_SECRET:
            return True

    return False


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
# Routes with Row-Level Security (RLS)
# ---------------------------------------------------------------------------

@app.route('/api/health', methods=['GET'])
def health_check():
    db = get_db()
    mongo_status = "connected" if db is not None else "disconnected"
    return jsonify({
        "status": "online",
        "service": "AI Jehosue Backend",
        "mongodb": mongo_status,
        "row_level_security": "enabled" if ENABLE_RLS else "disabled"
    })


@app.route('/api/chat', methods=['POST'])
def chat():
    # Rate Limiting: 25 requests per minute per IP (Admin bypasses)
    if not check_admin_auth(request):
        client_ip = get_client_ip(request)
        allowed, retry_after = check_backend_rate_limit(f"chat:{client_ip}", limit=25, window_seconds=60)
        if not allowed:
            print(f"[RateLimit] 🛑 Chat rate limit hit for IP: {client_ip}. Retry in {retry_after}s.")
            return jsonify({
                "error": f"Too many chat requests. Please slow down and try again in {retry_after} seconds."
            }), 429

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

        # Save conversation to MongoDB scoped strictly by session_id (RLS compliant)
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
                print(f"[Info] Conversation saved with ID: {inserted.inserted_id} (session: {session_id})")

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


@app.route('/api/conversations', methods=['GET'])
def get_session_conversations():
    """Retrieve conversations with strict Row-Level Security scoped to the caller's session_id."""
    try:
        session_id = request.args.get("session_id")
        is_admin = check_admin_auth(request)

        conv_coll = get_conversations_collection()
        if conv_coll is None:
            return jsonify({"error": "Conversations collection unavailable", "items": []})

        if not is_admin:
            if not session_id:
                return jsonify({"error": "RLS restriction: session_id query parameter is required for non-admin requests"}), 403
            query = {"session_id": session_id}
        else:
            query = {"session_id": session_id} if session_id else {}

        items = list(conv_coll.find(query))
        for item in items:
            item['_id'] = str(item['_id'])

        return jsonify({
            "count": len(items),
            "session_id": session_id if not is_admin else "all_admin",
            "items": items
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/process-data', methods=['POST'])
def process_data():
    """Manual endpoint to trigger processing."""
    try:
        result = process_unprocessed_conversations()
        return jsonify(result)
    except Exception as e:
        print(f"[Error] Exception in /api/process-data: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/knowledge', methods=['GET'])
def get_knowledge():
    """
    Retrieve knowledge base items with Row-Level Security:
    - Public callers: ONLY rows where status == 'approved' are returned.
    - Admin callers (with X-Admin-Secret): Can query 'all', 'pending_review', or 'rejected'.
    """
    try:
        is_admin = check_admin_auth(request)
        status_filter = request.args.get('status', 'approved' if not is_admin else 'all')

        # Enforce RLS: Non-admins cannot access unapproved rows
        if not is_admin and status_filter != 'approved':
            print("[RLS Guard] 🛑 Non-admin attempted to query unapproved knowledge rows. Forcing status='approved'.")
            status_filter = 'approved'

        know_coll = get_knowledge_collection()
        if know_coll is None:
            return jsonify({"error": "MongoDB knowledge collection unavailable", "items": []})

        query = {} if (is_admin and status_filter == 'all') else {"status": status_filter}
        items = list(know_coll.find(query))

        for item in items:
            item['_id'] = str(item['_id'])

        return jsonify({
            "count": len(items),
            "status_filter": status_filter,
            "row_level_security": "active",
            "access_role": "admin" if is_admin else "public",
            "items": items
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/knowledge/status', methods=['POST'])
def update_knowledge_status():
    """Update knowledge status - protected by Row-Level Security / Admin authorization."""
    try:
        # Enforce RLS mutation policy
        if not check_admin_auth(request):
            return jsonify({
                "error": "Forbidden: Row-Level Security restriction. Only authorized administrators can update knowledge status."
            }), 403

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
    print(f"AI Jehosue Python Backend with Row-Level Security running on http://127.0.0.1:{PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=True)