# AI Jehosue — Python Backend & Knowledge Pipeline

Backend service for the **AI Jehosue** portfolio chatbot, powered by **Google Gemini API** and **MongoDB Atlas**.

## Architecture

- **`app.py`**: Flask API server providing chat, knowledge retrieval, and data processing endpoints.
- **`config.py`**: Loads environment variables from `.env.local` or environment.
- **`db.py`**: MongoDB database connector for `conversations`, `knowledge`, and `processing_logs` collections.
- **`knowledge_base.py`**: System prompt and verified profile builder with dynamic approved knowledge integration.
- **`processor.py`**: Gemini data processor that extracts factual insights from unprocessed conversation logs.

## Setup & Running

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment variables in `.env.local`:**
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?appName=jehosueai
   MONGODB_DB_NAME=jehosue_ai
   PORT=5000
   ```

3. **Start the backend server:**
   ```bash
   python app.py
   ```
   The server runs on `http://127.0.0.1:5000`.

## API Endpoints

- `GET /api/health` — Health check and MongoDB connection status.
- `POST /api/chat` — Process visitor chat messages, generate AI response, save to MongoDB, and trigger background data extraction.
- `POST /api/process-data` — Trigger knowledge extraction on unprocessed conversations.
- `GET /api/knowledge?status=all|approved|pending_review` — Query extracted knowledge items.
- `POST /api/knowledge/status` — Approve or reject knowledge items.
