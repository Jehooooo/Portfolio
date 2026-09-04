# 🚀 Complete Deployment Guide: AI Portfolio & Knowledge Moderation System

This comprehensive guide covers everything required to deploy the latest updates of **Jehosue (Jeho) Biscarra's Portfolio** — including the **Next.js 16 frontend**, **AI Jehosue persona engine**, **MongoDB Atlas knowledge base**, **Admin Moderation Dashboard (`/admin`)**, and **Automated Cron Pipelines**.

---

## 📋 Table of Contents
1. [System Architecture Overview](#1-system-architecture-overview)
2. [Pre-Deployment Checklist](#2-pre-deployment-checklist)
3. [Environment Variables Reference](#3-environment-variables-reference)
4. [Step 1: MongoDB Atlas Setup](#step-1-mongodb-atlas-setup)
5. [Step 2: Google Gemini API Setup](#step-2-google-gemini-api-setup)
6. [Step 3: Deploy Frontend & API to Vercel (Recommended)](#step-3-deploy-frontend--api-to-vercel-recommended)
7. [Step 4: Configure Automated Vercel Cron Jobs](#step-4-configure-automated-vercel-cron-jobs)
8. [Step 5 (Optional): Deploy Python Backend to Render](#step-5-optional-deploy-python-backend-to-render)
9. [Step 6: Post-Deployment Smoke Tests & Verification](#step-6-post-deployment-smoke-tests--verification)
10. [Troubleshooting & FAQ](#10-troubleshooting--faq)

---

## 1. System Architecture Overview

The system offers two deployment topologies:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        TOPOLOGY A (RECOMMENDED)                         │
│                    100% Serverless & Zero Maintenance                   │
│                                                                         │
│   Visitors / Admin Browser                                              │
│             │                                                           │
│             ▼                                                           │
│   ┌──────────────────────────────────┐                                  │
│   │   Vercel (Next.js 16 App)        │                                  │
│   │   • Portfolio UI & Interactive   │                                  │
│   │     Project Modal Pills          │                                  │
│   │   • Streaming AI Chat Engine     │◄──── Google Gemini API           │
│   │   • Admin Dashboard (/admin)     │      (Conversational Persona)    │
│   │   • Automated Daily Cron Job     │                                  │
│   │   • Dynamic OpenGraph SEO Engine │                                  │
│   └─────────────────┬────────────────┘                                  │
│                     │                                                   │
│                     ▼                                                   │
│   ┌──────────────────────────────────┐                                  │
│   │   MongoDB Atlas Cloud Database   │                                  │
│   │   • conversations collection     │                                  │
│   │   • knowledge collection         │                                  │
│   │   • processing_logs collection   │                                  │
│   └──────────────────────────────────┘                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Next.js 16 Application (Vercel):** Runs the full UI, the streaming conversational AI, rate limiting, cryptographic HMAC admin authentication, and automated knowledge extraction.
- **Python Flask Backend (Optional - Render):** Can optionally be deployed as a high-concurrency dedicated worker. If offline or not deployed, Next.js seamlessly runs its native serverless Gemini pipeline with zero disruption.
- **MongoDB Atlas:** Stores real-time conversation logs, extracted facts, moderation statuses (`pending_review`, `approved`, `rejected`), and pipeline audits.

---

## 2. Pre-Deployment Checklist

Before deploying, ensure you have:
- [x] A **GitHub account** with access to [`Jehooooo/Portfolio`](https://github.com/Jehooooo/Portfolio).
- [x] A **Vercel account** (free tier is 100% sufficient): [vercel.com](https://vercel.com).
- [x] A **MongoDB Atlas account**: [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas).
- [x] A **Google AI Studio API Key**: [aistudio.google.com](https://aistudio.google.com).
- [x] (Optional) A **Render account**: [render.com](https://render.com).

---

## 3. Environment Variables Reference

Here is the exact set of environment variables needed. Keep these handy for the setup steps below:

| Variable Name | Required | Example / Description |
| :--- | :---: | :--- |
| `GEMINI_API_KEY` | **Yes** | Your API key from Google AI Studio. |
| `MONGODB_URI` | **Yes** | MongoDB Atlas SRV string (`mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?appName=jehosueai`). |
| `MONGODB_DB_NAME` | No | Database name (Default: `jehosue_ai`). |
| `ADMIN_PASSWORD` | **Yes** | **Your custom password** for logging into the `/admin` dashboard. |
| `ADMIN_SECRET` | **Yes** | 32+ character random secret used for cryptographic HMAC token signing. |
| `CRON_SECRET` | **Yes** | Random secret string to authorize automated background extraction cron jobs. |
| `ENABLE_RLS` | No | `true` (enforces Row-Level Security on admin and knowledge endpoints). |
| `PYTHON_BACKEND_URL` | Optional | URL of your Python service on Render (e.g. `https://ai-backend.onrender.com`). If empty, Next.js handles chat directly. |

> [!TIP]
> Generate strong secrets for `ADMIN_SECRET` and `CRON_SECRET` using your terminal:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

## Step 1: MongoDB Atlas Setup

1. **Create an Atlas Cluster:**
   - Log in to [MongoDB Atlas](https://cloud.mongodb.com).
   - Create a free **M0 Shared Cluster** (e.g. AWS / Singapore or closest region).
2. **Configure Database User:**
   - Go to **Security** &rarr; **Database Access**.
   - Click **Add New Database User**.
   - Select **Password** authentication.
   - Set a username (e.g. `jehosue_admin`) and a secure password.
   - Assign the **Read and write to any database** role.
3. **Configure Network IP Access:**
   - Go to **Security** &rarr; **Network Access**.
   - Click **Add IP Address**.
   - Select **Allow Access from Anywhere** (`0.0.0.0/0`). *(This is required because serverless hosting providers like Vercel use dynamic IP addresses).*
4. **Copy the Connection String:**
   - Go to **Deployments** &rarr; **Database**.
   - Click **Connect** &rarr; **Drivers** &rarr; **Node.js**.
   - Copy the URI:
     ```text
     mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=jehosueai
     ```
   - Replace `<username>` and `<password>` with your database user credentials.
5. **(Optional but Recommended) Setup Recommended Indexes:**
   In your MongoDB Atlas Data Explorer, create these indexes for optimal query speeds:
   - Database: `jehosue_ai`
     - Collection `conversations`: Index `{ session_id: 1, timestamp: -1 }` and `{ processed: 1 }`
     - Collection `knowledge`: Index `{ status: 1, created_at: -1 }` and `{ confidence: -1 }`

---

## Step 2: Google Gemini API Setup

1. Visit [Google AI Studio](https://aistudio.google.com).
2. Sign in with your Google account and click **Get API key**.
3. Create a new key or choose an existing Google Cloud project.
4. Copy the API key string.
5. Verify that your API key has access to standard models (`gemini-2.5-flash`, `gemini-2.0-flash`, or `gemini-1.5-flash`).

---

## Step 3: Deploy Frontend & API to Vercel (Recommended)

### Method A: Deploy via Vercel Web Dashboard (Easiest)

1. Go to [vercel.com/new](https://vercel.com/new).
2. Under **Import Git Repository**, select **`Jehooooo/Portfolio`**.
3. In the **Configure Project** screen:
   - **Framework Preset:** `Next.js`
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
   - **Install Command:** `npm install`
4. Expand the **Environment Variables** section and add the following:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?appName=jehosueai
   MONGODB_DB_NAME=jehosue_ai
   ADMIN_PASSWORD=your_custom_admin_password_here
   ADMIN_SECRET=your_admin_secret_here
   CRON_SECRET=your_cron_secret_here
   ENABLE_RLS=true
   ```
5. Click **Deploy**.
6. Wait 1–2 minutes for the build to complete. Once finished, Vercel will provide your production URL (e.g. `https://portfolio-jehooooo.vercel.app`).

---

### Method B: Deploy via Vercel CLI

If you prefer using the command line:

```bash
# 1. Install Vercel CLI globally
npm install -g vercel

# 2. Link your project to Vercel
vercel link

# 3. Add environment variables to production
vercel env add GEMINI_API_KEY production
vercel env add MONGODB_URI production
vercel env add MONGODB_DB_NAME production
vercel env add ADMIN_PASSWORD production
vercel env add ADMIN_SECRET production
vercel env add CRON_SECRET production
vercel env add ENABLE_RLS production

# 4. Trigger production deployment
vercel --prod
```

---

## Step 4: Configure Automated Vercel Cron Jobs

The repository includes [`vercel.json`](file:///c:/Users/Jeho/Downloads/portfolio/vercel.json) pre-configured with a daily background knowledge extractor:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-conversations",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### How Vercel Cron Works:
- Every night at **00:00 UTC**, Vercel sends a request to `/api/cron/process-conversations`.
- The endpoint automatically extracts facts from new visitor chat conversations and places them in the `/admin` moderation queue.
- **Security:** Vercel automatically passes `Authorization: Bearer <CRON_SECRET>` with each invocation when `CRON_SECRET` is set in your Vercel Environment Variables.

### (Alternative) External Cron Trigger (cron-job.org or GitHub Actions)
If you are on a free plan and prefer a custom schedule (e.g. every hour or every 6 hours):
1. Use [cron-job.org](https://cron-job.org) (free).
2. Create a job pointing to: `https://your-domain.vercel.app/api/cron/process-conversations`.
3. Add request header:
   ```http
   Authorization: Bearer YOUR_CRON_SECRET
   ```
   *or*
   ```http
   x-cron-secret: YOUR_CRON_SECRET
   ```

---

## Step 5 (Optional): Deploy Python Backend to Render

> [!NOTE]
> The Python backend is **completely optional**. The Next.js serverless app already features a built-in Gemini engine. Deploy this only if you want a dedicated Flask microservice.

1. Log in to [Render](https://dashboard.render.com).
2. Click **New +** &rarr; **Blueprint**.
3. Select your repository `Jehooooo/Portfolio`.
4. Render will read [`render.yaml`](file:///c:/Users/Jeho/Downloads/portfolio/render.yaml) automatically:
   - **Runtime:** Python 3.11
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --threads 4`
5. Set the required Environment Variables in Render:
   - `GEMINI_API_KEY`
   - `MONGODB_URI`
   - `MONGODB_DB_NAME` = `jehosue_ai`
   - `ADMIN_SECRET`
   - `ADMIN_PASSWORD`
   - `ENABLE_RLS` = `true`
6. Click **Apply**.
7. Once deployed, copy your Render service URL (e.g. `https://ai-jehosue-backend.onrender.com`).
8. Add this URL to your **Vercel** project environment variables as `PYTHON_BACKEND_URL`:
   ```env
   PYTHON_BACKEND_URL=https://ai-jehosue-backend.onrender.com
   ```
9. Redeploy Vercel to activate the link.

---

## Step 6: Post-Deployment Smoke Tests & Verification

Perform these quick tests on your live production URL to verify that all systems and security features are working properly:

### 1. Test AI Chat Persona & Easter Egg
- Open your live portfolio in your browser.
- Open the floating AI Chat.
- **Test Birthday & Birthplace:** Ask: *"When is your birthday and where were you born?"*
  - Expected: Mentions **April 15, 2006** and **Bangued, Abra**.
- **Test Provenance / Model Non-Disclosure:** Ask: *"Are you powered by Google Gemini or ChatGPT?"*
  - Expected: Confirms it was **designed, built, and trained directly by Jeho himself** for this portfolio, without claiming third-party AI powering.
- **Test Easter Egg:** Type: *"What are you doing Cha?"*
  - Expected: *"whoops,  what are you trying to breakin"*.
- **Test Persistence:** Refresh the browser page — your previous chat messages should remain visible (restored from validated `localStorage`).

### 2. Test Admin Moderation Dashboard (`/admin`)
- Navigate to `https://your-domain.vercel.app/admin`.
- Log in using your custom `ADMIN_PASSWORD`.
- **Test Verification:**
  - Verify that the login issues a secure, HttpOnly, signed session cookie.
  - Review pending facts extracted from conversations.
  - Test 1-click **Approve** and **Reject**.
  - Test **Auto-Moderate** with confidence thresholds.
  - Switch tabs to inspect raw conversation history and system metrics.

### 3. Test Security Protections (via Terminal)
```bash
# A. Verify that backdoor tokens are rejected (Should return 401 Unauthorized)
curl -i -H "Cookie: admin_session=admin_session_authenticated" https://your-domain.vercel.app/api/admin/knowledge

# B. Verify unauthenticated process-data is blocked (Should return 403 Forbidden)
curl -i https://your-domain.vercel.app/api/process-data

# C. Verify rate limiting on brute-force login attempts (Should return 429 after 5 failed attempts)
for i in {1..6}; do curl -X POST -H "Content-Type: application/json" -d '{"password":"wrong"}' https://your-domain.vercel.app/api/admin/auth; done
```

### 4. Test SEO & OpenGraph Social Sharing
- Open `https://your-domain.vercel.app/opengraph-image` in your browser &rarr; should render an on-the-fly branded 1200x630 card.
- Open `https://your-domain.vercel.app/sitemap.xml` &rarr; should return valid XML sitemap.
- Open `https://your-domain.vercel.app/robots.txt` &rarr; should return valid crawler rules.

---

## 10. Troubleshooting & FAQ

### Q1: AI Chat gives "AI service temporarily unavailable"
- **Cause:** `GEMINI_API_KEY` is missing or invalid in your Vercel Environment Variables.
- **Fix:** Go to Vercel &rarr; Settings &rarr; Environment Variables &rarr; add or update `GEMINI_API_KEY` &rarr; trigger a redeployment.

### Q2: MongoDB connection timeout on Vercel
- **Cause:** MongoDB Atlas Network Access IP whitelist does not allow access from Vercel's dynamic IP ranges.
- **Fix:** In MongoDB Atlas &rarr; Network Access &rarr; add IP `0.0.0.0/0` (Allow from anywhere).

### Q3: How do I change my Admin Password later?
- Simply update `ADMIN_PASSWORD` in your Vercel project Environment Variables. The change takes effect immediately upon redeployment or restart.

### Q4: Will I be charged for running this?
- **Vercel:** Free on the Hobby plan.
- **MongoDB Atlas:** Free on the M0 Shared Cluster (512 MB storage).
- **Google Gemini API:** Free tier provides up to 15 RPM (Requests Per Minute), well within personal portfolio visitor traffic.
- **Overall Cost:** **$0.00 / month**.
