import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "./config.js";
import { ChunkRecord, DocumentRecord } from "./types.js";

const dbDir = path.dirname(config.dbPath);
fs.mkdirSync(dbDir, { recursive: true });

export const db = new Database(config.dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(document_id) REFERENCES documents(id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_document_chunk ON chunks(document_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
`);

const insertDocumentStmt = db.prepare("INSERT INTO documents (name) VALUES (?)");
const insertChunkStmt = db.prepare(
  "INSERT INTO chunks (document_id, chunk_index, content, embedding_json) VALUES (?, ?, ?, ?)"
);

export function insertDocument(name: string): number {
  const result = insertDocumentStmt.run(name);
  return Number(result.lastInsertRowid);
}

export function insertChunks(documentId: number, chunks: Array<{ chunkIndex: number; content: string; embedding: number[] }>): void {
  const txn = db.transaction(() => {
    for (const chunk of chunks) {
      insertChunkStmt.run(documentId, chunk.chunkIndex, chunk.content, JSON.stringify(chunk.embedding));
    }
  });
  txn();
}

export function listDocuments(): DocumentRecord[] {
  const rows = db
    .prepare("SELECT id, name, created_at as createdAt FROM documents ORDER BY id DESC")
    .all() as DocumentRecord[];
  return rows;
}

 const deleteChunksByDocumentIdStmt = db.prepare("DELETE FROM chunks WHERE document_id = ?");
 const deleteDocumentByIdStmt = db.prepare("DELETE FROM documents WHERE id = ?");

 export function deleteDocument(documentId: number): boolean {
   const txn = db.transaction(() => {
     deleteChunksByDocumentIdStmt.run(documentId);
     const result = deleteDocumentByIdStmt.run(documentId);
     return result.changes > 0;
   });

   return txn();
 }

export function getAllChunks(): ChunkRecord[] {
  const rows = db
    .prepare(
      "SELECT id, document_id as documentId, chunk_index as chunkIndex, content, embedding_json as embeddingJson FROM chunks"
    )
    .all() as Array<{ id: number; documentId: number; chunkIndex: number; content: string; embeddingJson: string }>;

  return rows.map((row) => ({
    id: row.id,
    documentId: row.documentId,
    chunkIndex: row.chunkIndex,
    content: row.content,
    embedding: JSON.parse(row.embeddingJson) as number[]
  }));
}

export function documentNameByIdMap(): Map<number, string> {
  const rows = db.prepare("SELECT id, name FROM documents").all() as Array<{ id: number; name: string }>;
  return new Map(rows.map((r) => [r.id, r.name]));
}

export function getDocumentText(documentId: number): string | null {
  const rows = db
    .prepare("SELECT content FROM chunks WHERE document_id = ? ORDER BY chunk_index")
    .all(documentId) as Array<{ content: string }>;
  
  if (rows.length === 0) {
    return null;
  }
  
  return rows.map(row => row.content).join('\n\n');
}
