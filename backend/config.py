import os
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
