# Document Q&A with Citations (MVP)

This project implements the practical full-stack AI evaluation task as a local-first MVP:

- Frontend: React + TypeScript (Vite)
- Backend: Node.js + Fastify + TypeScript
- Storage: SQLite (`documents`, `chunks`, embeddings as JSON)
- AI: OpenAI embeddings + chat completion for answer synthesis

## What I Built

- Ingestion flow:
  - User pastes text or uploads `.txt`
  - Backend chunks the text with overlap
  - Each chunk is embedded and saved in SQLite
- Q&A flow:
  - User asks a natural-language question
  - Backend embeds the question
  - Similarity search across all chunk embeddings (cosine)
  - Top-k chunks become context for the LLM
  - API returns answer + citations (document, chunk index, excerpt, score)
- Performance optimizations:
  - In-memory caching for embeddings and API responses
  - Debounced search queries to reduce API calls
  - Efficient pagination for document listings
- Product UX:
  - Clear ingest/ask steps
  - Interactive citation display with modal views
  - Document management (view, delete)
  - loading states
  - empty states
  - error states

## What I Intentionally Skipped

- PDF parsing (optional stretch)
- auth, billing, multitenancy, infra hardening
- vector DB (SQLite-only approach used, as allowed)

## Project Structure

```
.
├── backend
│   ├── src
│   │   ├── cache.ts
│   │   ├── chunking.ts
│   │   ├── config.ts
│   │   ├── db.ts
│   │   ├── openai.ts
│   │   ├── retrieval.ts
│   │   ├── server.ts
│   │   ├── similarity.ts
│   │   └── types.ts
│   ├── scripts
│   │   └── eval.ts
│   ├── tests
│   │   ├── chunking.test.ts
│   │   └── retrieval.test.ts
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend
│   ├── src
│   │   ├── api.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── styles.css
│   │   ├── components
│   │   │   ├── CitationList.tsx
│   │   │   ├── DocumentForm.tsx
│   │   │   ├── DocumentList.tsx
│   │   │   ├── DocumentViewModal.tsx
│   │   │   └── QuestionForm.tsx
│   │   └── hooks
│   │       └── useDebounce.ts
│   ├── index.html
│   ├── package.json
│   ├── tsconfig*.json
│   ├── Dockerfile
│   └── vite.config.ts
├── .env.example
├── docker-compose.yml
└── README.md
```

## Environment Variables

Copy `.env.example` to `.env` in repository root:

```bash
cp .env.example .env
```

Required:

- `OPENAI_API_KEY`
- `OPENAI_EMBEDDING_MODEL` (default: `text-embedding-3-small`)
- `OPENAI_CHAT_MODEL` (default: `gpt-4o-mini`)
- `PORT` (default: `3001`)
- `DB_PATH` (default: `./data/app.db`)
- `VITE_API_BASE_URL` (default: `http://localhost:3001`)

## Install and Run Locally

### 1) Install Node.js and npm

If not installed:

```bash
sudo apt update
sudo apt install -y nodejs npm
```

### 2) Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3) Run backend

```bash
cd backend
npm run dev
```

### 4) Run frontend (new terminal)

```bash
cd frontend
npm run dev
```

Open the Vite URL (usually `http://localhost:5173`).

## Optional: Run with Docker Compose

```bash
docker compose up --build
```

Then open `http://localhost:5173`.

## Tests

Backend includes lightweight tests for chunking and retrieval:

```bash
cd backend
npm test
```

## Tiny Eval Script

A tiny qualitative eval (fixture corpus + 2 hand-written questions) is included:

```bash
cd backend
npm run eval
```

It prints top-1 retrieval excerpts and a simple `precision@1` summary.

## Performance Optimizations

### Caching Strategy

- **In-Memory Embedding Cache**: JavaScript Map-based cache for text embeddings to avoid redundant OpenAI API calls
- **In-Memory API Response Cache**: Caches question-answer responses for identical queries using Map storage
- **TTL-based Expiration**: Cache entries expire after 1 hour to ensure freshness
- **SHA-256 Key Generation**: Deterministic cache keys based on content hash
- **Note**: Uses simple in-memory caching (not Redis/Redis) - suitable for single-instance deployment

### Frontend Optimizations

- **Debounced Search**: 300ms debounce on question input to reduce API calls
- **Component Memoization**: React.memo for expensive component renders
- **Efficient Pagination**: Server-side pagination for document listings
- **Lazy Loading**: Modal content loaded only when needed

### Database Optimizations

- **Indexed Queries**: Proper indexing on document and chunk tables
- **Batch Operations**: Efficient bulk inserts for chunk processing
- **Connection Pooling**: SQLite connection management for concurrent requests

## API Overview

- `GET /health` - Health check endpoint
- `GET /api/documents` - List all documents with pagination
- `GET /api/documents/:id/text` - Get full text content of a specific document
- `DELETE /api/documents/:id` - Delete a specific document and its chunks
- `POST /api/documents` - Create new document `{ name, text }`
- `POST /api/ask` - Ask question with citations `{ question, topK }`

## Short Design Note

### Chunking Strategy

- Fixed-size character chunking (default 800 chars) with overlap (120 chars).
- Tradeoff: simple and deterministic; may split semantic boundaries.

### How Citations Are Produced

- Retrieve top-k chunks by cosine similarity between query embedding and chunk embeddings.
- Returned citations are directly those retrieved chunks:
  - `documentName`
  - `chunkIndex`
  - `excerpt`
  - `score`
- Answer is generated from only these chunks, so citations remain grounded in retrieval.
- A minimum similarity threshold (`MIN_CITATION_SCORE`, default `0.25`) is applied; chunks below it are dropped to reduce near-topic but irrelevant citations.

### Known Failure Modes

- Hallucination: reduced by strict system prompt, but still possible.
- Empty retrieval / weak retrieval: when corpus lacks relevant content.
- Poor chunk boundaries: fixed-size chunking can split key statements.
- Irrelevant citations: embedding similarity can surface near-topic but wrong chunks.
- Prompt injection / retrieval contamination:
  - Any malicious content inside chunks can influence answer generation.
  - Mitigation in this MVP is mostly prompt constraints + transparent citation display.

## Security Notes 

- Do not commit `.env`.
- API keys must stay local.

## AI Tool Usage Disclosure

- AI assistant was used to accelerate scaffolding and implementation.
- Core architecture, API boundaries, retrieval approach, and failure-mode reasoning were reviewed and verified during implementation.