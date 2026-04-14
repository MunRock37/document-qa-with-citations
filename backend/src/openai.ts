import OpenAI from "openai";
import crypto from "node:crypto";
import { config } from "./config.js";
import { embeddingCache, generateCacheKey } from "./cache.js";

const client = config.openAiApiKey
  ? new OpenAI({
      apiKey: config.openAiApiKey
    })
  : null;

function localEmbedding(input: string, dims = 256): number[] {
  const embedding = new Array<number>(dims).fill(0);
  const tokens = input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  for (const token of tokens) {
    const digest = crypto.createHash("sha256").update(token).digest();
    const idx = digest.readUInt32LE(0) % dims;
    embedding[idx] += 1;
  }

  const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0)) || 1;
  return embedding.map((v) => v / norm);
}

export async function embedText(input: string): Promise<number[]> {
  const cacheKey = generateCacheKey(input);
  
  // Try to get from cache first
  const cachedEmbedding = embeddingCache.get<number[]>(cacheKey);
  if (cachedEmbedding) {
    return cachedEmbedding;
  }

  let embedding: number[];
  
  if (!client) {
    embedding = localEmbedding(input);
  } else {
    try {
      const response = await client.embeddings.create({
        model: config.embeddingModel,
        input
      });
      embedding = response.data[0]?.embedding ?? [];
    } catch {
      embedding = localEmbedding(input);
    }
  }

  // Cache the result for 24 hours
  embeddingCache.set(cacheKey, embedding, 1000 * 60 * 60 * 24);
  return embedding;
}

export async function answerQuestion(question: string, contextBlocks: string): Promise<string> {
  if (!client) {
    const context = contextBlocks.trim();
    if (!context) return "The documents do not provide enough information.";
    const lines = context.split("\n").filter(Boolean);
    const excerpt = lines.slice(0, 12).join("\n");
    return `OpenAI is not configured, so I can't generate a model-based answer.\n\nRelevant context:\n${excerpt}`;
  }

  const response = await client.chat.completions.create({
    model: config.chatModel,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: [
          "You are a document Q&A assistant.",
          "The provided contexts are ordered by relevance (most relevant first).",
          "CRITICAL: Only use information from contexts that are directly relevant to the question.",
          "If a context discusses unrelated topics, completely ignore it and do not reference it.",
          "If none of the contexts contain relevant information, say that the documents do not provide enough information.",
          "Do not invent details or mix information from different contexts.",
          "If helpful, you may then provide a brief general-knowledge answer, clearly labeled as such."
        ].join("\n")
      },
      {
        role: "user",
        content: `Question:\n${question}\n\nContext:\n${contextBlocks}\n\nReturn a concise answer.`
      }
    ]
  });

  return response.choices[0]?.message?.content?.trim() ?? "No answer generated.";
}
