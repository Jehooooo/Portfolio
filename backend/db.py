import sys
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from config import MONGODB_URI, MONGODB_DB_NAME

import time

_client = None
_db_available = None  # None = not tested yet, True/False = result
_last_connect_attempt = 0
RECONNECT_COOLDOWN = 15  # Retry connection every 15 seconds if previously failed

# Fallback in-memory storage when MongoDB service is offline
_in_memory_conversations = []
_in_memory_knowledge = []
_in_memory_logs = []

class InMemoryCollection:
    """Lightweight in-memory store that mimics basic PyMongo collection API."""
    def __init__(self, storage):
        self._storage = storage

    def insert_one(self, doc):
        if "_id" not in doc:
            doc["_id"] = f"mem-{len(self._storage) + 1}"
        self._storage.append(doc)
        class Result:
            inserted_id = doc["_id"]
        return Result()

    def find(self, query=None, projection=None):
        query = query or {}
        results = []
        for item in self._storage:
            if self._matches(item, query):
                item_copy = dict(item)
                if projection and projection.get("_id") == 0:
                    item_copy.pop("_id", None)
                results.append(item_copy)
        return results

    def update_one(self, query, update):
        set_dict = update.get("$set", {})
        matched = 0
        for item in self._storage:
            if self._matches(item, query):
                item.update(set_dict)
                matched = 1
                break
        class Result:
            matched_count = matched
        return Result()

    @staticmethod
    def _matches(item, query):
        for k, v in query.items():
            if isinstance(v, dict):
                if "$ne" in v and item.get(k) == v["$ne"]:
                    return False
            elif str(item.get(k)) != str(v):
                return False
        return True


def _try_connect():
    """Attempt MongoDB connection with automatic reconnect cooldown."""
    global _client, _db_available, _last_connect_attempt
    now = time.time()

    # If already connected, verify client reference
    if _db_available is True and _client is not None:
        return True

    # If recently failed, wait for cooldown before retrying to prevent thrashing
    if _db_available is False and (now - _last_connect_attempt < RECONNECT_COOLDOWN):
        return False

    _last_connect_attempt = now

    # Try resolving TLS certificate path via certifi if installed
    ca_file = None
    try:
        import certifi
        ca_file = certifi.where()
    except Exception:
        pass

    options_list = []
    base_timeout = {"serverSelectionTimeoutMS": 4000, "connectTimeoutMS": 4000, "socketTimeoutMS": 20000}

    if ca_file:
        options_list.append({**base_timeout, "tlsCAFile": ca_file})
    options_list.append(base_timeout)
    options_list.append({**base_timeout, "tls": True, "tlsAllowInvalidCertificates": True})

    last_err = None
    for opts in options_list:
        try:
            client_temp = MongoClient(MONGODB_URI, **opts)
            client_temp.admin.command('ping')
            _client = client_temp
            _db_available = True
            print(f"[Info] MongoDB connected successfully to database: {MONGODB_DB_NAME}", file=sys.stderr)
            return True
        except Exception as e:
            last_err = e
            continue

    _client = None
    _db_available = False
    print(
        f"[Warn] MongoDB connection failed ({type(last_err).__name__}: {last_err}). "
        f"Using in-memory store. Retrying automatically in {RECONNECT_COOLDOWN}s. "
        f"(Check MongoDB Atlas Network Access: Whitelist 0.0.0.0/0).",
        file=sys.stderr,
    )
    return False


def get_db():
    if _try_connect() and _client is not None:
        return _client[MONGODB_DB_NAME]
    return None


def get_conversations_collection():
    db = get_db()
    return db['conversations'] if db is not None else InMemoryCollection(_in_memory_conversations)


def get_knowledge_collection():
    db = get_db()
    return db['knowledge'] if db is not None else InMemoryCollection(_in_memory_knowledge)


def get_processing_logs_collection():
    db = get_db()
    return db['processing_logs'] if db is not None else InMemoryCollection(_in_memory_logs)


def check_db_status():
    """Diagnostic health-check for MongoDB Atlas."""
    connected = _try_connect()
    if connected and _client is not None:
        try:
            t0 = time.time()
            _client.admin.command('ping')
            latency = round((time.time() - t0) * 1000, 2)
            db = _client[MONGODB_DB_NAME]
            collections = db.list_collection_names()
            return {
                "status": "connected",
                "connected": True,
                "latency_ms": latency,
                "database": MONGODB_DB_NAME,
                "collections": collections,
                "storage_mode": "mongodb_atlas"
            }
        except Exception as e:
            return {
                "status": "error",
                "connected": False,
                "error": str(e),
                "database": MONGODB_DB_NAME,
                "storage_mode": "in_memory_fallback"
            }
    return {
        "status": "offline",
        "connected": False,
        "error": "Could not establish MongoDB connection",
        "database": MONGODB_DB_NAME,
        "storage_mode": "in_memory_fallback",
        "hint": "Check MongoDB Atlas Network Access (ensure 0.0.0.0/0 is active) and credentials."
    }
