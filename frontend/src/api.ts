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

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit | undefined, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? `Request failed (${response.status})`);
  }
  return data;
}

export async function fetchDocuments(page: number = 1, limit: number = 5): Promise<PaginatedDocuments> {
  const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  const response = await fetchWithTimeout(`${apiBaseUrl}/api/documents?${params}`, undefined, 20000);
  const data = await parseJson<PaginatedDocuments>(response);
  return data;
}

export async function ingestDocument(payload: { name: string; text: string }): Promise<{ documentId: number; chunkCount: number }> {
  const response = await fetchWithTimeout(`${apiBaseUrl}/api/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }, 60000);
  return parseJson(response);
}

export async function deleteDocument(documentId: number): Promise<{ ok: true }> {
  const response = await fetchWithTimeout(`${apiBaseUrl}/api/documents/${documentId}`, {
    method: "DELETE"
  }, 20000);
  return parseJson(response);
}

export async function fetchDocumentText(documentId: number): Promise<{ text: string }> {
  const response = await fetchWithTimeout(`${apiBaseUrl}/api/documents/${documentId}/text`, undefined, 20000);
  return parseJson(response);
}

export async function askQuestion(payload: { question: string; topK: number }): Promise<{ answer: string; citations: Citation[] }> {
  try {
    const response = await fetchWithTimeout(
      `${apiBaseUrl}/api/ask`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      },
      60000
    );
    return parseJson(response);
  } catch (e) {
    const msg = (e as Error)?.name === "AbortError"
      ? `Request timed out. Check that the backend is running and VITE_API_BASE_URL is correct (currently: ${apiBaseUrl}).`
      : `Failed to reach backend. Check that the backend is running and VITE_API_BASE_URL is correct (currently: ${apiBaseUrl}).`;
    throw new Error(msg);
  }
}
