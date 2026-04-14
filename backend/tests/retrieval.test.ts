import test from "node:test";
import assert from "node:assert/strict";
import { topKChunks } from "../src/retrieval.js";
import { cosineSimilarity } from "../src/similarity.js";
import { ChunkRecord } from "../src/types.js";

test("cosineSimilarity prefers aligned vectors", () => {
  const a = [1, 0, 0];
  const b = [1, 0, 0];
  const c = [0, 1, 0];

  assert.ok(cosineSimilarity(a, b) > cosineSimilarity(a, c));
});

test("topKChunks ranks the most similar chunk first", () => {
  const chunks: ChunkRecord[] = [
    { id: 1, documentId: 10, chunkIndex: 0, content: "roadmap", embedding: [1, 0, 0] },
    { id: 2, documentId: 10, chunkIndex: 1, content: "budget", embedding: [0, 1, 0] }
  ];

  const results = topKChunks([1, 0, 0], chunks, new Map([[10, "plan.txt"]]), 2);
  assert.equal(results[0].chunkId, 1);
  assert.equal(results.length, 2);
});
