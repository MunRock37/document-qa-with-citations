import { chunkText } from "../src/chunking.js";
import { topKChunks } from "../src/retrieval.js";
import { ChunkRecord } from "../src/types.js";

type Fixture = {
  documentName: string;
  text: string;
};

type QueryCase = {
  question: string;
  expectedKeyword: string;
};

const fixtures: Fixture[] = [
  {
    documentName: "roadmap.txt",
    text: "Q3 priorities are reliability improvements, latency reduction, and user onboarding quality."
  },
  {
    documentName: "support.txt",
    text: "Customer support hours are Monday through Friday from 9am to 6pm local time."
  }
];

const queries: QueryCase[] = [
  { question: "What are the Q3 priorities?", expectedKeyword: "reliability" },
  { question: "When is customer support available?", expectedKeyword: "Monday" }
];

// Deterministic tiny embedding for offline qualitative eval.
function fakeEmbed(text: string): number[] {
  const t = text.toLowerCase();
  return [
    t.includes("q3") || t.includes("priorities") ? 1 : 0,
    t.includes("support") || t.includes("monday") ? 1 : 0,
    t.includes("latency") ? 1 : 0
  ];
}

function buildChunks(): { chunks: ChunkRecord[]; names: Map<number, string> } {
  const chunks: ChunkRecord[] = [];
  const names = new Map<number, string>();
  let chunkId = 1;

  fixtures.forEach((doc, i) => {
    const documentId = i + 1;
    names.set(documentId, doc.documentName);

    chunkText(doc.text, 500, 50).forEach((content, chunkIndex) => {
      chunks.push({
        id: chunkId,
        documentId,
        chunkIndex,
        content,
        embedding: fakeEmbed(content)
      });
      chunkId += 1;
    });
  });

  return { chunks, names };
}

function runEval(): void {
  const { chunks, names } = buildChunks();
  let hits = 0;

  for (const q of queries) {
    const retrieved = topKChunks(fakeEmbed(q.question), chunks, names, 1);
    const topExcerpt = retrieved[0]?.excerpt ?? "";
    const isHit = topExcerpt.toLowerCase().includes(q.expectedKeyword.toLowerCase());
    if (isHit) hits += 1;

    console.log(`Q: ${q.question}`);
    console.log(`Top-1 excerpt: ${topExcerpt}`);
    console.log(`Hit expected keyword "${q.expectedKeyword}": ${isHit ? "yes" : "no"}`);
    console.log("---");
  }

  const pAt1 = hits / queries.length;
  console.log(`precision@1: ${pAt1.toFixed(2)} (${hits}/${queries.length})`);
}

runEval();
