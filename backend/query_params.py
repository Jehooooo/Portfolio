"""
query_params.py - MongoDB NoSQL Injection Prevention & Input Sanitization
"""

import html
import re
from typing import Any, Optional
from bson import ObjectId
from bson.errors import InvalidId

# Allowed MongoDB query operator prefixes - anything starting with $ is a NoSQL operator
_MONGO_OPERATOR_RE = re.compile(r'^\$')

# Whitelists for enum fields
ALLOWED_STATUSES = frozenset({"approved", "rejected", "pending_review", "all"})
ALLOWED_PROCESSING_STATUSES = frozenset({"pending", "processing", "completed", "failed"})


def escape_content(unsafe: str) -> str:
    """15. Escape user content to prevent HTML/XSS injection."""
    if not unsafe or not isinstance(unsafe, str):
        return ""
    return html.escape(unsafe, quote=True)


def sanitize_str(value: Any, max_length: int = 512, default: str = "", escape_html: bool = False) -> str:
    """
    14. Ensures value is a safe plain string.
    Rejects dicts (NoSQL operator injection attempts like {"$ne": ""}).
    Strips leading/trailing whitespace & non-printable control chars.
    Truncates to max_length.
    """
    if value is None:
        return default

    # Block NoSQL injection: reject any dict (MongoDB operator objects)
    if isinstance(value, (dict, list)):
        return default

    # Convert to string, strip control characters (except newline, tab)
    safe = str(value)
    safe = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', safe).strip()

    # Block strings that look like MongoDB operators
    if _MONGO_OPERATOR_RE.match(safe):
        return default

    truncated = safe[:max_length]
    return escape_content(truncated) if escape_html else truncated


def sanitize_id(value: Any) -> Optional[ObjectId]:
    """Safely converts a value to a MongoDB ObjectId."""
    if value is None or isinstance(value, (dict, list)):
        return None

    try:
        return ObjectId(str(value).strip())
    except (InvalidId, TypeError, ValueError):
        return None


def allowed_value(value: Any, whitelist: frozenset, default: str = "") -> str:
    """Validates that a value is within an explicit whitelist."""
    safe = sanitize_str(value, default=default)
    return safe if safe in whitelist else default


def build_session_query(session_id: Any) -> dict:
    """Build a safe query scoped strictly to a sanitized session_id."""
    safe_session = sanitize_str(session_id, max_length=256)
    if not safe_session:
        return {"_id": None}
    return {"session_id": safe_session}


def build_status_query(status_filter: Any) -> dict:
    """Build a safe knowledge status filter from a whitelisted enum value."""
    safe_status = allowed_value(status_filter, ALLOWED_STATUSES, default="approved")
    if safe_status == "all":
        return {}
    return {"status": safe_status}


def build_id_query(item_id: Any) -> Optional[dict]:
    """Build a safe _id query for MongoDB document lookup."""
    obj_id = sanitize_id(item_id)
    if obj_id is not None:
        return {"_id": obj_id}

    safe_str_id = sanitize_str(item_id, max_length=128)
    if safe_str_id:
        return {"_id": safe_str_id}

    return None


def trim_response(data: Any) -> Any:
    """17. Trim API Responses: strip sensitive internal keys and whitespace."""
    if isinstance(data, str):
        return data.strip()
    if isinstance(data, list):
        return [trim_response(item) for item in data]
    if isinstance(data, dict):
        SENSITIVE_KEYS = {
            'password', 'secret', 'token', 'api_key', 'apiKey',
            'database', 'connection_string', 'internal_error',
            'stack', '__v', '_internal'
        }
        trimmed = {}
        for k, v in data.items():
            if k in SENSITIVE_KEYS or v is None:
                continue
            trimmed[k] = trim_response(v)
        return trimmed
    return data