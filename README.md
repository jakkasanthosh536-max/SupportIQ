# SupportIQ — AI Customer Support Knowledge System
### Hackathon Project: HACK-P380 | College Hackathon Deliverable

SupportIQ is a production-inspired, enterprise-grade AI customer support knowledge operating system designed to eliminate repetitive customer inquiries, enforce verified answer grounding, safely abstain when policies do not exist, and autonomously identify knowledge gaps to recommend new FAQs.

Built for **NovaStore** — an innovative direct-to-consumer tech and apparel lifestyle brand — SupportIQ bridges the gap between unstructured company documents, front-line support specialists, and customer-facing AI agents.

---

## 🌟 Key Capabilities & Differentiators

1. **Grounded RAG with Traceable Citations**: Every AI response explicitly references actual retrieved article IDs and quotes matching evidence excerpts.
2. **Zero Hallucination Guarantee & Safe Abstention**: If retrieval confidence falls below the configurable threshold, SupportIQ safely refuses to guess company policies and provides immediate 1-click human agent escalation.
3. **Autonomous Knowledge Gap Detection**: Questions that receive negative feedback, trigger abstention, or cause ticket escalation are automatically clustered and logged into a Knowledge Gap queue.
4. **1-Click FAQ Draft Generation**: Administrators can review detected knowledge gaps and convert them into published, indexed knowledge articles with a single click, instantly closing the gap.
5. **Multi-Format Document Ingestion Engine**: Drag-and-drop ingestion of **PDF, DOCX, TXT, and Markdown** files with text extraction, sliding-window chunking (with token overlap), and instant searchable indexing.
6. **Multi-Role Server-Side RBAC**: Strict role-based authorization for **Administrator**, **Support Agent**, and **Customer** personas, backed by PBKDF2-HMAC-SHA256 password hashing and JWT tokens.
7. **100% Offline Local Demo Mode**: Runs deterministically without requiring paid third-party AI API keys, while also supporting plug-and-play provider switching for **Google Gemini, Groq, or OpenAI**.
8. **Interactive 3-Minute Hackathon Demo Tour**: Built-in top walkthrough bar guiding judges through answerable queries, safe abstentions, human escalation, gap resolution, and live analytics.

---

## 🏗️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts, React Router v6 |
| **Backend** | Python 3.13 / FastAPI, Pydantic v2, SQLAlchemy 2.0, SQLite |
| **AI & Retrieval** | Hybrid BM25 keyword ranking + Cosine similarity vector matching, SentenceTransformers support with TF-IDF fallback, AI Provider Abstraction (Gemini / Groq / OpenAI / Deterministic Local Demo Engine) |
| **Document Processing** | `pypdf` (PDF extraction), `python-docx` (DOCX extraction), Sliding window tokenizer with token overlap |
| **Security & Auth** | PBKDF2-HMAC-SHA256 (200k iterations with unique salts), PyJWT access tokens, Server-side role middleware |
| **Testing** | Pytest, FastAPI TestClient, Vite TypeScript production build |

---

## 📁 Project Structure

```text
supportiq/
├── backend/
│   ├── app/
│   │   ├── api/             # REST endpoints (auth, knowledge, documents, search, chat, tickets, gaps, analytics, settings)
│   │   ├── core/            # Configuration, database setup, and security utilities
│   │   ├── models/          # SQLAlchemy ORM models (Users, Articles, Chunks, Conversations, Tickets, Gaps)
│   │   ├── schemas/         # Pydantic v2 validation schemas
│   │   ├── services/        # Document extraction, hybrid retrieval, AI engine, gap detection, analytics
│   │   ├── seed_data.py     # NovaStore sample database seeder
│   │   └── main.py          # FastAPI application entrypoint with lifespan events
│   ├── tests/
│   │   └── test_api.py      # Automated integration test suite
│   ├── requirements.txt     # Python backend dependencies
│   ├── .env.example         # Environment template
│   └── pytest.ini
├── frontend/
│   ├── src/
│   │   ├── components/      # EvidenceDrawer, EscalateModal, ArticleModal, ChunkInspectorModal, DemoWalkthroughBar
│   │   ├── context/         # AuthContext and RBAC state
│   │   ├── layouts/         # MainLayout with collapsible sidebar, top bar, and role switcher
│   │   ├── pages/           # Landing, Login, Dashboard, Chat, Knowledge, Search, Tickets, Gaps, Analytics, Settings
│   │   ├── services/        # Typed API service client
│   │   ├── types/           # TypeScript data interfaces
│   │   ├── App.tsx          # Router configuration and protected routes
│   │   └── main.tsx         # React root
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── sample_data/             # Sample policy documents (Markdown & Text) for testing upload ingestion
├── README.md
└── .gitignore
```

---

## ⚡ Quickstart & Setup Guide

### Prerequisites
- Python 3.10+ (tested with Python 3.13)
- Node.js 18+ and npm

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment (optional if using system python)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Seed the database with NovaStore initial data (10 articles, tickets, gaps)
python3 -m app.seed_data

# Start FastAPI development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend will be running at `http://127.0.0.1:8000`.  
Interactive Swagger API documentation is available at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup

Open a second terminal window:

```bash
cd frontend

# Install npm packages
npm install

# Start Vite development server
npm run dev
```

The frontend application will be running at `http://localhost:5173`.

---

## 👥 Seeded Demo Personas & Credentials

SupportIQ features 1-click login cards on the landing page and login page. You can also sign in manually using these seeded demo accounts:

| Role | Email | Password | Access Privileges |
|---|---|---|---|
| **Administrator** | `admin@novastore.com` | `admin123` | Full knowledge CRUD, document upload, gap resolution, system settings |
| **Support Agent** | `agent@novastore.com` | `agent123` | Support ticket queue, customer chat review, internal notes, resolution |
| **Customer (Sarah)** | `sarah@example.com` | `customer123` | Grounded AI chat, citation inspection, ticket escalation, feedback |

---

## 🎤 3-Minute Live Hackathon Presentation Script

Follow this sequence for an impressive, bullet-proof live demonstration:

### [0:00 - 0:30] Introduction & Problem
1. Introduce **SupportIQ**: Customer support teams face repetitive queries, inconsistent answers, and document clutter.
2. Click **"Administrator"** on the landing page to enter the dashboard.
3. Point out live metrics: Total Articles, Grounded Answers, and live Recharts trend curves calculated directly from database records.

### [0:30 - 1:15] Grounded Answering & Citations (The Happy Path)
1. In the top bar, click **"Step 1: Answerable Query"** or navigate to **AI Support Chat**.
2. Click the prompt chip: *"What is the return policy and eligibility window?"*
3. Show the generated answer: Notice the 14-day policy window, the **Source Citations** badge, and the **92% Retrieval Confidence**.
4. Click **"Inspect Evidence"** to slide open the **Grounded Knowledge Evidence Drawer**, showing the exact verbatim excerpts from the database.

### [1:15 - 2:00] Zero-Hallucination Safe Abstention & Escalation
1. Click **"Step 2: Safe Abstention"** in the top walkthrough bar.
2. The AI is asked: *"Can I get drone delivery to Antarctica by next week?"*
3. Highlight that SupportIQ **refuses to invent policies or hallucinate drone services**. It clearly states:
   > *"I couldn't find a verified answer in the current knowledge base. You can create a support ticket or contact a support agent."*
4. Click **"Escalate to Human Agent"** to create a support ticket directly from the conversation.

### [2:00 - 2:30] Agent Workspace & Knowledge Gap Detection
1. Switch role to **Support Agent** (via the bottom-left quick switcher).
2. Open **Support Tickets**: Show the newly escalated ticket with linked customer conversation history and post an internal note.
3. Open **Knowledge Gaps**: Show how the polar shipping inquiry was automatically detected, clustered, and given a frequency counter.

### [2:30 - 3:00] Self-Healing Knowledge Base (1-Click FAQ)
1. On the Knowledge Gap row, click **"1-Click FAQ"**.
2. The modal pre-fills an official FAQ draft. Click **"Publish Article & Resolve Gap"**.
3. Return to **AI Support Chat** and ask the polar shipping question again:
   SupportIQ now immediately returns a verified, grounded answer backed by the newly created FAQ article!
4. Conclude by opening **Analytics** to show the live satisfaction score and CSV export.

---

## 🧪 Automated Testing

SupportIQ comes with automated unit and integration tests covering the entire backend pipeline.

To run the automated test suite:

```bash
cd backend
python3 -m pytest tests/test_api.py -v
```

**Test Execution Results:**
```text
============================= test session starts ==============================
collected 15 items

tests/test_api.py::test_health_check PASSED                              [  6%]
tests/test_api.py::test_auth_demo_login_admin PASSED                     [ 13%]
tests/test_api.py::test_auth_demo_login_agent PASSED                     [ 20%]
tests/test_api.py::test_auth_demo_login_customer PASSED                  [ 26%]
tests/test_api.py::test_get_articles PASSED                              [ 33%]
tests/test_api.py::test_get_article_detail PASSED                        [ 40%]
tests/test_api.py::test_create_and_delete_article PASSED                 [ 46%]
tests/test_api.py::test_smart_search PASSED                              [ 53%]
tests/test_api.py::test_chat_grounded_answer PASSED                      [ 60%]
tests/test_api.py::test_chat_unsupported_abstention PASSED               [ 66%]
tests/test_api.py::test_chat_feedback PASSED                             [ 73%]
tests/test_api.py::test_support_tickets_lifecycle PASSED                 [ 80%]
tests/test_api.py::test_knowledge_gap_to_article PASSED                  [ 86%]
tests/test_api.py::test_analytics_overview PASSED                        [ 93%]
tests/test_api.py::test_document_chunking PASSED                         [100%]

======================== 15 passed, 1 warning in 4.44s =========================
```

Frontend production build verification:
```bash
cd frontend
npm run build
# Result: built in 2.12s with zero TypeScript compilation errors.
```

---

## 🔒 Security & Privacy Considerations

- **Password Hashing**: Cryptographic PBKDF2-HMAC-SHA256 with 200,000 iterations and per-user salt.
- **Server-Side Authorization**: Endpoints verify user roles on the backend before executing privileged actions (e.g. creating articles, viewing internal notes).
- **Prompt Injection Defense**: Retrieved knowledge content is labeled as untrusted reference data with system guardrails forbidding execution of embedded commands.
- **API Key Isolation**: API keys remain strictly on the backend and are never sent to client bundles.
- **Input Validation**: Enforced via Pydantic schemas and file extension/size validation (max 10 MB).

---

## 📄 License
Created for college hackathon presentation **HACK-P380**.
Fictional company NovaStore policies are provided solely for demo and evaluation purposes.
