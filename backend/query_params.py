"""
query_params.py - MongoDB NoSQL Injection Prevention

MongoDB does not use SQL, but it IS vulnerable to NoSQL injection
when user-supplied dicts/operators like {"$ne": "", "$gt": 0, "$where": ""}
are passed directly into query parameters.

This module provides:
  - sanitize_str()  : ensures values are plain strings (strips MongoDB operators)
  - sanitize_id()   : safely converts to ObjectId with fallback
  - build_query()   : constructs parameterized MongoDB filter dicts
  - allowed_value() : whitelist validation for enum-like fields
"""

import re
from typing import Any, Optional
from bson import ObjectId
from bson.errors import InvalidId


# Allowed MongoDB query operator prefixes - anything starting with $ is a NoSQL operator
_MONGO_OPERATOR_RE = re.compile(r'^\$')

# Whitelists for enum fields
ALLOWED_STATUSES = frozenset({"approved", "rejected", "pending_review", "all"})
ALLOWED_PROCESSING_STATUSES = frozenset({"pending", "processing", "completed", "failed"})


def sanitize_str(value: Any, max_length: int = 512, default: str = "") -> str:
    """
    Ensures value is a safe plain string.
    Rejects dicts (NoSQL operator injection attempts like {"$ne": ""}).
    Strips leading/trailing whitespace.
    Truncates to max_length.
    """
    if value is None:
        return default

    # Block NoSQL injection: reject any dict (MongoDB operator objects)
    if isinstance(value, (dict, list)):
        return default

    # Convert to string and strip
    safe = str(value).strip()

    # Block strings that look like MongoDB operators
    if _MONGO_OPERATOR_RE.match(safe):
        return default

    return safe[:max_length]


def sanitize_id(value: Any) -> Optional[ObjectId]:
    """
    Safely converts a value to a MongoDB ObjectId.
    Returns None if the value is not a valid ObjectId.
    Blocks dict-based injection attempts.
    """
    if value is None or isinstance(value, (dict, list)):
        return None

    try:
        return ObjectId(str(value).strip())
    except (InvalidId, TypeError, ValueError):
        return None


def allowed_value(value: Any, whitelist: frozenset, default: str = "") -> str:
    """
    Validates that a value is within an explicit whitelist.
    Rejects any value not in the allowed set.
    This is the MongoDB equivalent of a parameterized enum filter.
    """
    safe = sanitize_str(value, default=default)
    return safe if safe in whitelist else default


def build_session_query(session_id: Any) -> dict:
    """
    Build a safe query scoped strictly to a sanitized session_id.
    Prevents: session_id={"$ne": ""} (dump all sessions injection).
    """
    safe_session = sanitize_str(session_id, max_length=256)
    if not safe_session:
        # Return an impossible query to return zero results safely
        return {"_id": None}
    return {"session_id": safe_session}


def build_status_query(status_filter: Any) -> dict:
    """
    Build a safe knowledge status filter from a whitelisted enum value.
    Prevents: status={"$regex": ".*"} (dump all records injection).
    """
    safe_status = allowed_value(status_filter, ALLOWED_STATUSES, default="approved")
    if safe_status == "all":
        return {}
    return {"status": safe_status}


def build_id_query(item_id: Any) -> Optional[dict]:
    """
    Build a safe _id query for MongoDB document lookup.
    Returns None if the id is invalid/injected.
    Falls back to string _id for in-memory collections.
    """
    obj_id = sanitize_id(item_id)
    if obj_id is not None:
        return {"_id": obj_id}

    # Fallback: try treating as a string id (for in-memory store)
    safe_str_id = sanitize_str(item_id, max_length=128)
    if safe_str_id:
        return {"_id": safe_str_id}

    return None