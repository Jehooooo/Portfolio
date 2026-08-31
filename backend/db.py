import sys
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from config import MONGODB_URI, MONGODB_DB_NAME

_client = None
_db_available = None  # None = not tested yet, True/False = cached result

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
    """Attempt MongoDB connection once and cache the result."""
    global _client, _db_available
    if _db_available is not None:
        return _db_available
    
    # Try standard connection first, then TLS fallback options
    options_list = [
        {"serverSelectionTimeoutMS": 5000},
        {"serverSelectionTimeoutMS": 5000, "tls": True, "tlsAllowInvalidCertificates": True},
    ]

    for opts in options_list:
        try:
            client_temp = MongoClient(MONGODB_URI, **opts)
            client_temp.admin.command('ping')
            _client = client_temp
            _db_available = True
            print("[Info] MongoDB connected successfully to database:", MONGODB_DB_NAME, file=sys.stderr)
            return True
        except Exception:
            continue

    _client = None
    _db_available = False
    print(f"[Info] MongoDB Atlas connection pending (Ensure IP is Whitelisted in Atlas Network Access -> Allow Access From Anywhere). Using in-memory store.", file=sys.stderr)
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
