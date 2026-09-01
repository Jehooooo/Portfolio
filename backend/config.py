import os
import sys
from dotenv import load_dotenv

# Load env variables from root .env.local or local .env
env_local_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env.local')
if os.path.exists(env_local_path):
    load_dotenv(env_local_path)
else:
    load_dotenv()

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
MONGODB_DB_NAME = os.getenv('MONGODB_DB_NAME', 'jehosue_ai')
PORT = int(os.getenv('PORT', '5000'))

# ADMIN_SECRET must be set via environment variable - no hardcoded fallback
ADMIN_SECRET = os.getenv('ADMIN_SECRET', '')
if not ADMIN_SECRET:
    print('[Security] WARNING: ADMIN_SECRET is not set. Admin endpoints will be disabled.', file=sys.stderr)

ENABLE_RLS = os.getenv('ENABLE_RLS', 'true').lower() in ('true', '1', 'yes')