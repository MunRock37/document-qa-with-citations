import { Citation, ChunkRecord } from "./types.js";
import { cosineSimilarity } from "./similarity.js";

export function topKChunks(
  queryEmbedding: number[],
  allChunks: ChunkRecord[],
  documentNames: Map<number, string>,
  topK: number
): Citation[] {
  const scored = allChunks.map((chunk) => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding)
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ chunk, score }) => ({
      chunkId: chunk.id,
      documentId: chunk.documentId,
      documentName: documentNames.get(chunk.documentId) ?? `Document ${chunk.documentId}`,
      chunkIndex: chunk.chunkIndex,
      excerpt: chunk.content,
      score
    }));
}
