# Document Q&A with Citations 

A fullstack AI application that allows users to upload or paste text documents and ask natural language questions. The system retrieves relevant document snippets using semantic search and generates answers grounded in those snippets, along with citations.

## Features

- **Document Ingestion**
  - Upload or paste `.txt` documents
  - Automatic text chunking with overlap
  - Storage in SQLite database

- **Question Answering**
  - Ask questions in natural language
  - Semantic search over document chunks using embeddings
  - Retrieve top relevant chunks

- **Citations**
  - Answers are generated using retrieved context
  - Each response includes source citations (document + excerpt)

- **Core Architecture**
  - Retrieval-Augmented Generation (RAG) pipeline
  - Backend API built with Fastify
  - Frontend built with React + TypeScript

## Setup & Run Locally

### 1. Configure environment
```bash
cp .env.example .env
```

Add your OpenAI API key to the `.env` file:

```env
OPENAI_API_KEY=your_key_here
```

### 2. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Run backend

```bash
cd backend
npm run dev
```

### 4. Run frontend

```bash
cd frontend
npm run dev
```

Open the app in your browser (default: http://localhost:5173)
