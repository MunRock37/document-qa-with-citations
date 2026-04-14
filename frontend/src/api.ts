export type DocumentItem = {
  id: number;
  name: string;
  createdAt: string;
};

export type Pagination = {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type PaginatedDocuments = {
  documents: DocumentItem[];
  pagination: Pagination;
};

export type Citation = {
  chunkId: number;
  documentId: number;
  documentName: string;
  chunkIndex: number;
  excerpt: string;
  score: number;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? `Request failed (${response.status})`);
  }
  return data;
}

export async function fetchDocuments(page: number = 1, limit: number = 5): Promise<PaginatedDocuments> {
  const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  const response = await fetch(`${apiBaseUrl}/api/documents?${params}`);
  const data = await parseJson<PaginatedDocuments>(response);
  return data;
}

export async function ingestDocument(payload: { name: string; text: string }): Promise<{ documentId: number; chunkCount: number }> {
  const response = await fetch(`${apiBaseUrl}/api/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseJson(response);
}

export async function deleteDocument(documentId: number): Promise<{ ok: true }> {
  const response = await fetch(`${apiBaseUrl}/api/documents/${documentId}`, {
    method: "DELETE"
  });
  return parseJson(response);
}

export async function fetchDocumentText(documentId: number): Promise<{ text: string }> {
  const response = await fetch(`${apiBaseUrl}/api/documents/${documentId}/text`);
  return parseJson(response);
}

export async function askQuestion(payload: { question: string; topK: number }): Promise<{ answer: string; citations: Citation[] }> {
  const response = await fetch(`${apiBaseUrl}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseJson(response);
}
