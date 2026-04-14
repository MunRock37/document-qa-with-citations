import Fastify from "fastify";
import cors from "@fastify/cors";
import { z } from "zod";
import { chunkText } from "./chunking.js";
import { config } from "./config.js";
import { deleteDocument, documentNameByIdMap, getAllChunks, getDocumentText, insertChunks, insertDocument, listDocuments } from "./db.js";
import { answerQuestion, embedText } from "./openai.js";
import { topKChunks } from "./retrieval.js";
import { apiCache, generateQuestionCacheKey } from "./cache.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

const createDocumentSchema = z.object({
  name: z.string().min(1).max(120),
  text: z.string().min(1)
});

const askSchema = z.object({
  question: z.string().min(3),
  topK: z.number().int().min(1).max(8).optional().default(4)
});

const paginationSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 5)
});

app.get("/health", async () => ({ ok: true }));

app.get("/api/documents", async (request, reply) => {
  const parseResult = paginationSchema.safeParse(request.query);
  if (!parseResult.success) {
    return reply.status(400).send({ error: "Invalid pagination parameters", details: parseResult.error.flatten() });
  }

  const { page, limit } = parseResult.data;
  
  // Cache key includes pagination
  const cacheKey = `documents:${page}:${limit}`;
  const cached = apiCache.get<{ documents: any[], pagination: any }>(cacheKey);
  if (cached) {
    return cached;
  }
  
  const allDocuments = listDocuments();
  const totalCount = allDocuments.length;
  const totalPages = Math.ceil(totalCount / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const documents = allDocuments.slice(startIndex, endIndex);
  
  const result = {
    documents,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
  
  // Cache paginated results for shorter time
  apiCache.set(cacheKey, result, 1000 * 60 * 2); // 2 minutes
  return result;
});

app.get("/api/documents/:id/text", async (request, reply) => {
  const idRaw = (request.params as { id?: string }).id;
  const documentId = Number(idRaw);
  if (!Number.isInteger(documentId) || documentId <= 0) {
    return reply.status(400).send({ error: "Invalid document id" });
  }

  try {
    const text = getDocumentText(documentId);
    if (text === null) {
      return reply.status(404).send({ error: "Document not found" });
    }
    return { text };
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch document text." });
  }
});

app.delete("/api/documents/:id", async (request, reply) => {
  const idRaw = (request.params as { id?: string }).id;
  const documentId = Number(idRaw);
  if (!Number.isInteger(documentId) || documentId <= 0) {
    return reply.status(400).send({ error: "Invalid document id" });
  }

  try {
    const deleted = deleteDocument(documentId);
    if (!deleted) {
      return reply.status(404).send({ error: "Document not found" });
    }
    // Invalidate caches when document is deleted
    apiCache.clear();
    return { ok: true };
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: "Failed to delete document." });
  }
});

app.post("/api/documents", async (request, reply) => {
  const parseResult = createDocumentSchema.safeParse(request.body);
  if (!parseResult.success) {
    return reply.status(400).send({ error: "Invalid request body", details: parseResult.error.flatten() });
  }

  const { name, text } = parseResult.data;
  const textChunks = chunkText(text);
  if (textChunks.length === 0) {
    return reply.status(400).send({ error: "Document text produced no chunks." });
  }

  try {
    const documentId = insertDocument(name);
    const embeddedChunks = await Promise.all(
      textChunks.map(async (content, idx) => ({
        chunkIndex: idx,
        content,
        embedding: await embedText(content)
      }))
    );
    insertChunks(documentId, embeddedChunks);
    // Invalidate caches when new document is added
    apiCache.clear();
    return { documentId, chunkCount: embeddedChunks.length };
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: "Failed to ingest document." });
  }
});

app.post("/api/ask", async (request, reply) => {
  const parseResult = askSchema.safeParse(request.body);
  if (!parseResult.success) {
    return reply.status(400).send({ error: "Invalid request body", details: parseResult.error.flatten() });
  }

  const { question, topK } = parseResult.data;
  const chunks = getAllChunks();
  if (chunks.length === 0) {
    return reply.status(400).send({ error: "No document chunks found. Ingest at least one document first." });
  }

  // Check cache first
  const cacheKey = generateQuestionCacheKey(question, topK);
  const cached = apiCache.get<{ answer: string; citations: any[] }>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const queryEmbedding = await embedText(question);
    const citations = topKChunks(queryEmbedding, chunks, documentNameByIdMap(), topK).filter(
      (c) => c.score >= config.minCitationScore
    );

    if (citations.length === 0) {
      const result = {
        answer: "I do not have enough information in the document corpus to answer this question.",
        citations: []
      };
      // Cache negative results for shorter time
      apiCache.set(cacheKey, result, 1000 * 60 * 2); // 2 minutes
      return reply.status(200).send(result);
    }

    const context = citations
      .map(
        (c, i) =>
          `[${i + 1}] document="${c.documentName}" chunk=${c.chunkIndex}\n${c.excerpt}`
      )
      .join("\n\n");

    const answer = await answerQuestion(question, context);
    const result = { answer, citations };
    // Cache successful results for longer
    apiCache.set(cacheKey, result, 1000 * 60 * 15); // 15 minutes
    return result;
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: "Failed to generate answer." });
  }
});

app.listen({ port: config.port, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
