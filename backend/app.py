import json
import threading
from datetime import datetime, timezone, timedelta
from flask import Flask, request, jsonify, Response, redirect
from flask_cors import CORS
from bson import ObjectId
from google import genai
from google.genai import types

from config import GEMINI_API_KEY, PORT, ADMIN_SECRET, ENABLE_RLS
from db import get_conversations_collection, get_knowledge_collection, get_db, check_db_status
from knowledge_base import build_system_instruction
from processor import process_unprocessed_conversations
from query_params import (
    sanitize_str,
    escape_content,
    allowed_value,
    build_session_query,
    build_status_query,
    build_id_query,
    trim_response,
    ALLOWED_STATUSES,
)

app = Flask(__name__)
CORS(app)

# 16. Restrict File Uploads: Set max payload limit to 1MB
app.config['MAX_CONTENT_LENGTH'] = 1 * 1024 * 1024  # 1 Megabyte max

# Secure Session Cookie Configuration
app.config.update(
    SECRET_KEY=ADMIN_SECRET or 'dev-only-insecure-key',
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    PERMANENT_SESSION_LIFETIME=timedelta(days=7),
    SESSION_COOKIE_NAME='__Secure-jeho-session'
)

# ---------------------------------------------------------------------------
# 19. Force HTTPS in Production / Forwarded Proxy Environments
# ---------------------------------------------------------------------------
@app.before_request
def enforce_https_and_restrictions():
    # 19. Check X-Forwarded-Proto for HTTPS enforcement behind proxies
    forwarded_proto = request.headers.get('X-Forwarded-Proto')
    if forwarded_proto and forwarded_proto.lower() == 'http':
        url = request.url.replace('http://', 'https://', 1)
        return redirect(url, code=301)

    # 16. Restrict File Uploads & enforce JSON on POST/PUT requests
    if request.method in ('POST', 'PUT', 'PATCH'):
        content_type = request.headers.get('Content-Type', '')
        if not content_type.lower().startswith('application/json'):
            return jsonify(trim_response({
                "error": "Unsupported Media Type: Only application/json is accepted. File uploads are disabled."
            })), 415


# ---------------------------------------------------------------------------
# 18. Add Security Headers to All Responses
# ---------------------------------------------------------------------------
@app.after_request
def add_security_headers(response: Response) -> Response:
    # 19. Force HTTPS / HSTS
    response.headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload'
    # 18. Modern Security Headers
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
    response.headers['Cross-Origin-Opener-Policy'] = 'same-origin'
    response.headers['Content-Security-Policy'] = "default-src 'self'; frame-ancestors 'self'; object-src 'none';"
    return response


# ---------------------------------------------------------------------------
# Error Handlers: Trim & Sanitize Exception Responses
# ---------------------------------------------------------------------------
@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify(trim_response({
        "error": "Payload Too Large: Request body exceeds maximum allowed size (1 MB)."
    })), 413

@app.errorhandler(404)
def not_found(error):
    return jsonify(trim_response({"error": "Resource not found."})), 404

@app.errorhandler(500)
def internal_server_error(error):
    return jsonify(trim_response({"error": "Internal server error occurred."})), 500


# ---------------------------------------------------------------------------
# Candidate Gemini models
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

# ---------------------------------------------------------------------------
# In-Memory Rate Limiter
# ---------------------------------------------------------------------------
_rate_limit_store = {}
_rate_limit_lock = threading.Lock()

def check_backend_rate_limit(key: str, limit: int, window_seconds: int = 60) -> tuple[bool, int]:
    now = datetime.now(timezone.utc).timestamp()
    window_start = now - window_seconds
    with _rate_limit_lock:
        if key not in _rate_limit_store:
            _rate_limit_store[key] = []
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


import hmac
import re

def check_admin_auth(req) -> bool:
    if not ENABLE_RLS:
        return True
    if not ADMIN_SECRET:
        return False
    admin_header = req.headers.get("X-Admin-Secret") or req.headers.get("x-admin-secret") or ""
    if admin_header and hmac.compare_digest(admin_header, ADMIN_SECRET):
        return True
    auth_header = req.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        if token and hmac.compare_digest(token, ADMIN_SECRET):
            return True
    return False

def sanitize_ai_output(text: str) -> str:
    if not text:
        return ""
    # Deterministic filter: replace third-party model claims with trained by Jeho
    cleaned = re.sub(
        r'\b(powered by (Google\'?s?|Gemini|ChatGPT|OpenAI|Anthropic|Claude))\b',
        'trained and built directly by Jeho himself',
        text,
        flags=re.IGNORECASE
    )
    cleaned = re.sub(
        r'\b(uses? (Google\'?s? Gemini|OpenAI\'?s? ChatGPT|Claude))\b',
        'was trained directly by Jeho himself',
        cleaned,
        flags=re.IGNORECASE
    )
    cleaned = cleaned.replace('lib/jehosue-knowledge.ts', '[knowledge-base]')
    cleaned = cleaned.replace('backend/knowledge_base.py', '[knowledge-base]')
    return cleaned


def _run_processing_background():
    try:
        process_unprocessed_conversations()
    except Exception as e:
        print(f"[Error] Background processing failed: {e}")


# ---------------------------------------------------------------------------
# API Routes
# ---------------------------------------------------------------------------

@app.route('/', methods=['GET'])
def root_index():
    db = get_db()
    mongo_status = "connected" if db is not None else "disconnected"
    return jsonify(trim_response({
        "status": "online",
        "service": "AI Jehosue Knowledge & Chat API Server",
        "version": "1.0.0",
        "mongodb": mongo_status,
        "frontend_url": "http://localhost:3000",
        "endpoints": {
            "health": "/api/health",
            "chat": "POST /api/chat",
            "knowledge": "GET /api/knowledge",
            "conversations": "GET /api/conversations",
            "process_data": "POST /api/process-data"
        }
    }))

@app.route('/api/health', methods=['GET'])
def health_check():
    db = get_db()
    mongo_status = "connected" if db is not None else "disconnected"
    return jsonify(trim_response({
        "status": "online",
        "service": "AI Jehosue Backend",
        "mongodb": mongo_status,
        "row_level_security": "enabled" if ENABLE_RLS else "disabled",
        "query_parameterization": "active",
        "security_headers": "active",
        "file_upload_restrictions": "active",
    }))


@app.route('/api/chat', methods=['POST'])
def chat():
    if not check_admin_auth(request):
        client_ip = get_client_ip(request)
        allowed, retry_after = check_backend_rate_limit(f"chat:{client_ip}", limit=25, window_seconds=60)
        if not allowed:
            return jsonify(trim_response({
                "error": f"Too many chat requests. Please slow down and try again in {retry_after} seconds."
            })), 429

    try:
        data = request.get_json(silent=True) or {}

        # 14. Validate all inputs & 15. Escape user content
        session_id = sanitize_str(data.get("session_id"), max_length=128, default="anonymous-session")
        messages = data.get("messages", [])

        if not messages or not isinstance(messages, list):
            single_msg = sanitize_str(data.get("message"), max_length=4096)
            if single_msg:
                messages = [{"role": "user", "content": single_msg}]
            else:
                return jsonify(trim_response({"error": "Messages are required."})), 400

        last_msg = messages[-1] if messages else {}
        raw_content = last_msg.get("content") if isinstance(last_msg, dict) else ""
        visitor_message = sanitize_str(raw_content, max_length=4000)

        if not visitor_message:
            return jsonify(trim_response({"error": "Visitor message cannot be empty."})), 400

        # Easter Egg Check: if visitor mentions "Cha" or "charizh"
        import re
        if re.search(r'\b(cha|charizh)\b', visitor_message, re.IGNORECASE):
            easter_egg = "whoops,  what are you trying to breakin"
            conv_coll = get_conversations_collection()
            if conv_coll is not None:
                try:
                    conv_coll.insert_one({
                        "session_id": session_id,
                        "visitor_message": visitor_message,
                        "ai_response": easter_egg,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "processed": False,
                        "processing_status": "pending",
                        "metadata": {"model": "easter-egg-rule", "source": "flask-backend"},
                    })
                except Exception:
                    pass
            return jsonify(trim_response({"response": easter_egg})), 200

        # Build Gemini history
        gemini_history = []
        for msg in messages[:-1]:
            if not isinstance(msg, dict):
                continue
            role = "user" if sanitize_str(msg.get("role")) == "user" else "model"
            content = sanitize_str(msg.get("content"), max_length=4000)
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

        if not response_text:
            return jsonify(trim_response({"error": "AI service temporarily unavailable. Please try again."})), 503

        # Parameterized Insert with sanitized fields
        clean_response = sanitize_ai_output(str(response_text).strip())
        conv_coll = get_conversations_collection()
        if conv_coll is not None:
            conv_doc = {
                "session_id": session_id,
                "visitor_message": visitor_message,
                "ai_response": clean_response[:8192],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "processed": False,
                "processing_status": "pending",
                "metadata": {
                    "model": sanitize_str(used_model, max_length=64, default="unknown"),
                }
            }
            try:
                conv_coll.insert_one(conv_doc)
                t = threading.Thread(target=_run_processing_background, daemon=True)
                t.start()
            except Exception as e:
                print(f"[Error] Failed to insert conversation: {e}")

        # 17. Trim API response
        return jsonify(trim_response({
            "session_id": session_id,
            "response": clean_response,
            "role": "assistant"
        }))

    except Exception as e:
        return jsonify(trim_response({"error": "Failed to process chat request."})), 500


@app.route('/api/conversations', methods=['GET'])
def get_session_conversations():
    try:
        is_admin = check_admin_auth(request)
        raw_session_id = request.args.get("session_id")
        session_id = sanitize_str(raw_session_id, max_length=128)

        conv_coll = get_conversations_collection()
        if conv_coll is None:
            return jsonify(trim_response({"error": "Conversations collection unavailable", "items": []}))

        if not is_admin:
            if not session_id:
                return jsonify(trim_response({
                    "error": "RLS restriction: session_id is required for non-admin requests"
                })), 403
            query = build_session_query(session_id)
        else:
            query = build_session_query(session_id) if session_id else {}

        items = list(conv_coll.find(query))
        cleaned_items = []
        for item in items:
            item['_id'] = str(item['_id'])
            cleaned_items.append(trim_response(item))

        # 17. Trim API response
        return jsonify(trim_response({
            "count": len(cleaned_items),
            "session_id": session_id if not is_admin else "all_admin",
            "items": cleaned_items
        }))
    except Exception as e:
        return jsonify(trim_response({"error": "Failed to retrieve conversations."})), 500


@app.route('/api/process-data', methods=['POST'])
def process_data():
    if not check_admin_auth(request):
        return jsonify(trim_response({"error": "Forbidden: Admin access required."})), 403
    try:
        result = process_unprocessed_conversations()
        return jsonify(trim_response(result))
    except Exception as e:
        return jsonify(trim_response({"error": "Processing error occurred."})), 500


@app.route('/api/knowledge', methods=['GET'])
def get_knowledge():
    try:
        is_admin = check_admin_auth(request)
        raw_status = request.args.get('status', 'approved' if not is_admin else 'all')
        status_filter = allowed_value(raw_status, ALLOWED_STATUSES, default='approved')

        if not is_admin and status_filter != 'approved':
            status_filter = 'approved'

        know_coll = get_knowledge_collection()
        if know_coll is None:
            return jsonify(trim_response({"error": "MongoDB knowledge collection unavailable", "items": []}))

        query = build_status_query(status_filter)
        items = list(know_coll.find(query))
        cleaned_items = []
        for item in items:
            item['_id'] = str(item['_id'])
            cleaned_items.append(trim_response(item))

        # 17. Trim API response
        return jsonify(trim_response({
            "count": len(cleaned_items),
            "status_filter": status_filter,
            "row_level_security": "active",
            "access_role": "admin" if is_admin else "public",
            "items": cleaned_items
        }))
    except Exception as e:
        return jsonify(trim_response({"error": "Failed to retrieve knowledge."})), 500


@app.route('/api/knowledge/status', methods=['POST'])
def update_knowledge_status():
    if not check_admin_auth(request):
        return jsonify(trim_response({
            "error": "Forbidden: Row-Level Security restriction. Only administrators can update knowledge status."
        })), 403

    try:
        data = request.get_json(silent=True) or {}
        raw_id = data.get("id")
        raw_status = data.get("status")

        new_status = allowed_value(
            raw_status,
            frozenset({"approved", "rejected", "pending_review"}),
            default=""
        )
        if not new_status:
            return jsonify(trim_response({"error": "Valid status is required."})), 400

        query = build_id_query(raw_id)
        if query is None:
            return jsonify(trim_response({"error": "Invalid or missing item ID."})), 400

        know_coll = get_knowledge_collection()
        if know_coll is None:
            return jsonify(trim_response({"error": "MongoDB knowledge collection unavailable."})), 500

        result = know_coll.update_one(
            query,
            {"$set": {
                "status": new_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )

        if result.matched_count == 0:
            return jsonify(trim_response({"error": "Knowledge item not found."})), 404

        return jsonify(trim_response({"success": True, "id": sanitize_str(raw_id, max_length=128), "status": new_status}))
    except Exception as e:
        return jsonify(trim_response({"error": "Failed to update knowledge status."})), 500


@app.route('/api/db-status', methods=['GET'])
def db_status_endpoint():
    """Diagnostic endpoint to inspect MongoDB Atlas connection health."""
    status = check_db_status()
    code = 200 if status.get("connected") else 503
    return jsonify(trim_response(status)), code


if __name__ == '__main__':
    print(f"AI Jehosue Hardened Backend on http://127.0.0.1:{PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=True)