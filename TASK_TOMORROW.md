# 📋 Action Plan & Tasks for Tomorrow

**Project:** Jehosue (Jeho) Biscarra — Portfolio & AI Knowledge Platform  
**Target Date:** Tomorrow's Session  
**Focus Areas:** AI Persona Balancing + Post-Deployment Database Connectivity  

---

## 🎯 Task 1: Rebalance AI Persona (Prevent Hyper-Focus on Projects/Coding)

### 📌 The Problem:
Currently, the AI Jehosue system instructions in `lib/jehosue-knowledge.ts` and `backend/knowledge_base.py` heavily emphasize coding, technical skills, and featured software projects. When visitors ask general, casual, or lifestyle questions, the AI tends to steer the conversation back to coding or technical achievements.

### 🛠️ Objective:
Transform AI Jehosue into a well-rounded, natural, and engaging digital twin who can converse effortlessly about:
- **College Life & Journey:** Experiences as a 3rd-year CS student at DMMMSU-SLUC, campus culture, team leadership.
- **Creative Passions & Freelance:** Video editing (Premiere Pro, After Effects), storytelling, content creation for clients.
- **Personal Philosophy & Soft Skills:** Problem-solving, curiosity, adaptability, collaboration, work ethic.
- **Casual & Friendly Chat:** Greetings, banter, general advice, personal interests, hobbies.
- **Contextual Adaptation:** Talk deeply about tech **only when asked**, and discuss other facets of Jeho when appropriate.

### 📝 Action Checklist:
- [ ] **1. Update System Prompt in `lib/jehosue-knowledge.ts`**:
  - Add a dedicated **"Conversational Balance & Tone Guidelines"** section.
  - Instruct the AI: *"Do not force every conversation to be about programming or projects. Match the user's intent. If asked a casual or personal question, reply naturally as a friendly student/developer without reciting your project resume."*
- [ ] **2. Mirror Changes in `backend/knowledge_base.py`**:
  - Keep the Python backend system prompt synchronized with the Next.js frontend prompt.
- [ ] **3. Add Diverse Persona Knowledge**:
  - Hobbies and interests outside tech (gaming, films, design, sports, music).
  - Stories and lessons from freelance video editing with 10+ clients.
  - Perspectives on teamwork, community collaboration, and learning mindset.
- [ ] **4. Test with Conversation Scenarios**:
  - Test 1: *"What do you do for fun when you're not on a computer?"* (Should not mention Python/Next.js).
  - Test 2: *"Tell me about your college experience so far."* (Should discuss student life and leadership, not just code).
  - Test 3: *"Can you edit videos?"* (Should highlight creative editing work and client experience).

---

## 🗄️ Task 2: Fix Database Not Querying After Deployment

### 📌 The Problem:
After deploying to Vercel and the VPS, database queries (saving conversations, retrieving knowledge items, or logging chats) are either failing silently, hanging, or not returning data.

### 🔍 Probable Root Causes & Solutions:

#### 1. MongoDB Atlas Network Access (IP Whitelist)
- **Cause:** MongoDB Atlas clusters block all incoming connections by default unless the client's IP is added to the Network Access list. Since Vercel uses dynamic serverless IP ranges, individual IPs cannot be whitelisted.
- **Fix:**
  1. Open [MongoDB Atlas Dashboard](https://cloud.mongodb.com/).
  2. Navigate to **Security** → **Network Access**.
  3. Check if **`0.0.0.0/0`** (Allow Access from Anywhere) is active.
  4. If missing, click **Add IP Address** → choose **Allow Access from Anywhere (`0.0.0.0/0`)** → Confirm.

#### 2. Vercel Environment Variables Missing or Incomplete
- **Cause:** Next.js API routes on Vercel cannot read local `.env.local` files unless they are explicitly declared in the Vercel Project Settings.
- **Fix:**
  1. Go to [Vercel Project Dashboard](https://vercel.com/jehooooos-projects/portfolio/settings/environment-variables).
  2. Verify that these variables exist for **Production, Preview, and Development**:
     - `MONGODB_URI`: `mongodb+srv://jehosuebiscarra09_db_user:<PASSWORD>@jehosueai.zslr8u5.mongodb.net/jehosue_ai?retryWrites=true&w=majority&appName=jehosueai`
     - `MONGODB_DB_NAME`: `jehosue_ai`
     - `GEMINI_API_KEY`: `<YOUR_GEMINI_API_KEY>`
     - `ADMIN_SECRET`: `<YOUR_ADMIN_SECRET>`
     - `ENABLE_RLS`: `true`
  3. **Important:** Trigger a **Redeploy** on Vercel after saving any environment variables for changes to take effect.

#### 3. Serverless Connection Caching (Next.js Edge / Serverless)
- **Cause:** Vercel functions spin up and down dynamically. Opening new database connections on every request without caching causes connection timeouts and exceeds MongoDB Atlas connection limits.
- **Fix:** Ensure a global cached MongoDB client connection helper is utilized in Next.js API routes.

#### 4. Diagnostic Endpoint Verification
- **Test:** Run a quick health-check script or curl command against your deployment:
  ```bash
  curl -s https://jehooooo.vercel.app/api/chat -X POST -H "Content-Type: application/json" -d "{\"message\":\"hello\"}"
  ```

---

## 📅 Summary Checklist for Tomorrow:

| # | Task | Target File(s) | Status |
|---|---|---|---|
| 1 | Diversify AI System Prompt & Tone | `lib/jehosue-knowledge.ts` | ⏳ Pending |
| 2 | Mirror Persona to Backend Knowledge Base | `backend/knowledge_base.py` | ⏳ Pending |
| 3 | Whitelist `0.0.0.0/0` on MongoDB Atlas | MongoDB Atlas Console | ⏳ Pending |
| 4 | Confirm Vercel Environment Variables | Vercel Project Settings | ⏳ Pending |
| 5 | Verify Live Chat & Conversation Logging | `https://jehooooo.vercel.app` | ⏳ Pending |