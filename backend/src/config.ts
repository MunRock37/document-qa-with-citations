import dotenv from "dotenv";

dotenv.config({ path: "../.env" });
dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 3001),
  dbPath: process.env.DB_PATH ?? "./data/app.db",
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  embeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
  chatModel: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
  minCitationScore: Number(process.env.MIN_CITATION_SCORE ?? 0.25)
};

if (!config.openAiApiKey) {
  console.warn("OPENAI_API_KEY is not set. API calls will fail until configured.");
}
