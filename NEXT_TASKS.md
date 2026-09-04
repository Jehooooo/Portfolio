# 🚀 Next Development Tasks & Roadmap

**Project:** Jehosue (Jeho) Biscarra — Portfolio & AI Platform  
**Status:** Post-Deployment Phase (Vercel & MongoDB Atlas Live)  
**Last Updated:** September 3, 2026  

---

## 📊 Roadmap Overview & Priority Matrix

| Priority | Feature / Task Area | Primary Impact | Estimated Effort |
|---|---|---|---|
| **P0** | **Automated Conversation Knowledge Pipeline** | Makes the AI actively learn and extract insights from chats | 2 - 3 hrs |
| **P0** | **Admin Knowledge Moderation Dashboard (`/admin`)** | Visual UI to approve/reject facts and view analytics | 3 - 4 hrs |
| **P1** | **SEO, OpenGraph & Social Share Previews** | High-converting rich preview cards on LinkedIn & X | 1 - 2 hrs |
| **P1** | **Expand Featured Projects Showcase (3 Projects)** | Completes the showcase with Municipal & Client apps | 1 - 2 hrs |
| **P2** | **Chat UI Polish & Message Persistence** | `localStorage` memory, 1-click copy, and project jump links | 1 - 2 hrs |

---

## 🧠 Task 1 (P0): Automated Conversation Knowledge Pipeline

### 📌 Context & Problem:
Chat conversations from visitors are now successfully saving to MongoDB Atlas (`conversations` collection). However, each record remains with `processed: false`, meaning:
- Gemini is not yet automatically analyzing these conversations.
- No new facts are being extracted into the `knowledge` collection.
- `processing_logs` table remains at 0 processed conversations.

### 🛠️ Objectives:
1. Create a serverless-compatible background processor in Next.js (`app/api/process-data/route.ts` or `app/api/cron/process-conversations/route.ts`).
2. Fetch unprocessed conversations (`{ processed: false }`).
3. Send batches to Google Gemini (`gemini-3.5-flash-lite` or `gemini-3.7-flash`) with strict extraction rules (only explicit statements by Jeho, no hallucinations).
4. Save new candidate facts into MongoDB `knowledge` collection with `status: "pending_review"`.
5. Update conversations to `{ processed: true, processed_at: new Date() }`.
6. Configure a Vercel Cron Job in `vercel.json` to trigger this automatically once daily at midnight.

### 📁 Target Files:
- `app/api/process-data/route.ts`
- `lib/knowledge-processor.ts` (new serverless extractor)
- `vercel.json` (add cron schedule)

---

## 🛡️ Task 2 (P0): Admin Knowledge Moderation Dashboard (`/admin`)

### 📌 Context & Problem:
The backend has Row-Level Security (RLS) endpoints for reviewing knowledge (`/api/knowledge/status`), but there is currently **no visual interface** for Jeho. You currently have to inspect MongoDB Compass or run curl commands to view visitor conversations or approve facts.

### 🛠️ Objectives:
1. Build a clean, password-protected Admin Dashboard page at `/admin` (styled with your sleek dark/light aesthetic).
2. Authenticate using `ADMIN_SECRET` stored in session cookie / local storage.
3. **Core Dashboard Features:**
   - **Live Metrics:** Total visitor conversations, messages today, database ping latency, and pending facts count.
   - **Knowledge Moderation Queue:** Cards showing facts extracted by Gemini &rarr; 1-click **Approve** (injects into AI persona memory) or **Reject** (discards).
   - **Conversation Inspector:** Read recent chat conversations with search, session filtering, and timestamp grouping.
   - **Manual Trigger Button:** "Run Processor Now" button to immediately process unread chats on demand.

### 📁 Target Files:
- `app/admin/page.tsx` (new admin interface)
- `app/api/admin/auth/route.ts` (secret verification)
- `components/admin/knowledge-queue.tsx`
- `components/admin/conversation-viewer.tsx`

---

## 🌐 Task 3 (P1): SEO, Social Graph & OpenGraph Image Generation

### 📌 Context & Problem:
When your portfolio URL (`https://jehooooo.vercel.app` or `https://jehobiscarra.com`) is shared on LinkedIn, Discord, Telegram, or Twitter, it currently displays a bare link without an image banner, rich title, or preview description.

### 🛠️ Objectives:
1. Enhance metadata in `app/layout.tsx`:
   - Title template (`%s | Jehosue Biscarra`)
   - Compelling meta description highlighting your CS background, full-stack stack, and AI engineering focus.
   - OpenGraph tags (`og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`, `og:image`).
   - Twitter Cards (`twitter:card`, `twitter:creator`).
2. Add dynamic OpenGraph banner via Next.js `app/opengraph-image.tsx` or create a high-resolution branded preview image in `public/images/og-preview.png`.
3. Add search engine optimization files:
   - `app/sitemap.ts` (Generates dynamic XML sitemap).
   - `app/robots.ts` (Configures web crawlers and indexers).

### 📁 Target Files:
- `app/layout.tsx`
- `app/opengraph-image.tsx`
- `app/sitemap.ts`
- `app/robots.ts`

---

## 💼 Task 4 (P1): Expand Featured Projects Showcase to 3 Projects

### 📌 Context & Problem:
In your timeline, you mention leading a 13-member client project in 2nd year and 3 municipal/community software projects in 3rd year. However, the Projects section currently displays only **1 project card** (*DMMMSU Disaster/Emergency Reports Management System*).

### 🛠️ Objectives:
1. Add Project 02: **Municipal / Community Web Application** (e.g. Local Barangay Registry, Public Assistance Portal, or Municipal Services platform).
2. Add Project 03: **Client Enterprise / Commercial System** or **Freelance Creative Showcase** (e.g. Video Editing Production Portfolio or Inventory Automation System).
3. Ensure each new project has:
   - Rich technical breakdown (Frontend, Backend, Database, Architecture).
   - Live Demo & GitHub repository links (or "Client Confidential" badge).
   - Interactive modal with workflow steps and key feature highlights.

### 📁 Target Files:
- `lib/portfolio-data.ts`
- `public/images/` (project mockups or UI screenshots)

---

## 💬 Task 5 (P2): Chat Experience & Interactive Follow-ups

### 📌 Context & Problem:
The AI chat currently resets if the visitor refreshes the browser tab. In addition, when the AI discusses a project, the visitor must manually scroll up or find the project in the page.

### 🛠️ Objectives:
1. **Local Storage Session Persistence:**
   - Store conversation messages in `localStorage` keyed by session ID with a 24-hour expiration.
   - Returning visitors instantly see their recent conversation thread.
2. **Interactive Action Pills Inside Chat:**
   - When AI mentions *"DMMMSU Disaster Management System"*, render a clickable chip: `[📂 View Project Details]`.
   - Clicking the chip automatically opens the project modal without leaving the chat.
3. **Copy Message / Code Snippet Button:**
   - Add a subtle hover icon to assistant messages to copy the response text to the clipboard with visual checkmark feedback.

### 📁 Target Files:
- `components/ai-chat.tsx`

---

## 📋 Execution Checklist

- [x] **Task 1:** Automated Conversation Knowledge Pipeline & Cron Job
- [x] **Task 2:** Admin Knowledge Moderation & Conversation Dashboard (`/admin`)
- [x] **Task 3:** SEO, OpenGraph Tags & Social Sharing Banner
- [ ] **Task 4:** Add 2 More Featured Projects to Complete the 3-Project Grid
- [ ] **Task 5:** Chat Local Storage Persistence & Interactive Project Action Pills
