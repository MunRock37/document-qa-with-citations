export type DocumentRecord = {
  id: number;
  name: string;
  createdAt: string;
};

export type ChunkRecord = {
  id: number;
  documentId: number;
  chunkIndex: number;
  content: string;
  embedding: number[];
};

export type Citation = {
  chunkId: number;
  documentId: number;
  documentName: string;
  chunkIndex: number;
  excerpt: string;
  score: number;
};
