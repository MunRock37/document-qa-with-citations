import Fastify from "fastify";
import cors from "@fastify/cors";

const app = Fastify({ logger: true });

// Enable CORS
await app.register(cors, { origin: true });

// Health check route
app.get("/health", async () => {
  return { ok: true };
});

// Basic placeholder routes (no logic yet)
app.post("/api/documents", async (request, reply) => {
  return {
    message: "Document ingestion not implemented yet"
  };
});

app.post("/api/ask", async (request, reply) => {
  return {
    message: "Q&A not implemented yet"
  };
});

// Start server
app.listen({ port: 3001, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});