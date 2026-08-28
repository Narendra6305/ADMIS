# Agenda-Driven Meeting Intelligence System (ADMIS)
## Project Documentation

### 1. Project Overview
The Agenda-Driven Meeting Intelligence System (ADMIS) is a full-stack web application designed to ingest meeting recordings (audio/video or transcripts) and automatically generate highly relevant, concise executive summaries based on a specific **Agenda Topic**. 

Unlike standard transcription tools that summarize an entire meeting (including tangents, small talk, and unrelated projects), ADMIS strictly filters the conversation to extract only the sentences relevant to the specified agenda before generating actionable summaries, decisions, and tasks.

### 2. Architecture & Technology Stack
The project is divided into a decoupled Backend and Frontend, communicating via RESTful APIs and Server-Sent Events (SSE) for real-time updates.

#### 2.1 Backend (Python / FastAPI)
- **Framework:** FastAPI is used for its high performance, native async support, and automatic API documentation generation (Swagger UI).
- **Database:** SQLite with SQLAlchemy ORM for relational data management (Documents, Users, Votes).
- **AI Integration:** 
  - **Speech-to-Text (STT):** Uses OpenAI's `Whisper` model locally to transcribe media files into raw text.
  - **LLM Engine:** Integrates with **Mistral AI** (`mistral-large-latest`) for advanced NLP filtering and summarization tasks.
- **Why FastAPI?** Meeting processing pipelines (transcription -> LLM filtering -> LLM summarization) are computationally expensive and time-consuming. FastAPI's async capabilities allow the server to handle these long-running background tasks without blocking the main event loop, while also providing real-time status broadcasts to the frontend via SSE.

#### 2.2 Frontend (React / Vite / TypeScript)
- **Framework:** React built with Vite for fast Hot Module Replacement (HMR) and optimized production builds.
- **Language:** TypeScript for strong typing, preventing runtime errors when dealing with complex API payloads.
- **Styling:** Tailwind CSS for a modern, responsive, and maintainable UI design.
- **Real-time UX:** Listens to Server-Sent Events (`/broadcast/stream`) to instantly update the UI when a document finishes processing, without requiring the user to refresh the page.

### 3. The Intelligence Pipeline
The core value of ADMIS lies in its processing pipeline, which triggers asynchronously whenever a new meeting recording or URL is ingested. 

The pipeline runs in three distinct stages:

#### Stage 1: Transcription (STT)
The system receives an audio/video file (or a YouTube/Instagram URL) and uses the `Whisper` model to transcribe the speech into a raw text transcript. If the API or model is unavailable, smart fallbacks are used.

#### Stage 2: Sentence-Level Agenda Filtering (`nlp_filter.py`)
This is the most critical step. The raw transcript is split into individual sentences. 
- The sentences, along with the user-defined **Agenda Topic**, are sent to the Mistral LLM.
- The LLM is instructed (via a strict System Prompt) to independently classify each sentence as `RELEVANT` or `NOT_RELEVANT` to the agenda.
- Small talk, jokes, and off-topic discussions are entirely discarded.
- The LLM also cleans up filler words ("um", "uh") from the relevant sentences while preserving the original meaning.
- *Fallback Mechanism:* If the LLM API is unavailable, a regex and keyword-based heuristic fallback algorithm filters the transcript by matching core keywords and ignoring known small-talk patterns.

#### Stage 3: Executive Summarization (`summarizer.py`)
The newly filtered, highly-dense transcript is then passed back to the Mistral LLM to generate a structured executive summary.
- Because the LLM only sees agenda-relevant text, the resulting summary is completely immune to meeting tangents.
- The LLM outputs strict JSON containing:
  - An overarching `summary` paragraph.
  - A list of `key_decisions`.
  - A list of `action_items` (with task, owner, and deadline).
  - Any `open_questions` that were left unresolved.

### 4. Workflow & Document Lifecycle
To ensure quality control and team collaboration, documents pass through several states:
1. **INGESTING / PROCESSING:** The system is downloading media or running the AI pipeline.
2. **DRAFT:** The AI has generated the summary. The uploader can review it in their private "My Drafts" tab.
3. **PUBLISHED:** The uploader approves the draft, moving it to the "Shared Inbox" for the whole team to see.
4. **PENDING_DELETE (Consensus Deletion):** If a user wants to delete a published document, it goes to the Trash Bin. To prevent accidental or malicious data loss, ADMIS implements a consensus mechanism:
   - The document is permanently purged only if **all registered users** vote to `DELETE` it (N/N unanimous consensus).
   - Any single user can cast a `RESTORE` vote, immediately returning the document to the Published state.
