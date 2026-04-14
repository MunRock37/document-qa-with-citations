export function chunkText(text: string, maxChars = 800, overlap = 120): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const end = Math.min(start + maxChars, normalized.length);
    const slice = normalized.slice(start, end);
    chunks.push(slice.trim());

    if (end === normalized.length) break;
    start = Math.max(0, end - overlap);
  }

  return chunks.filter(Boolean);
}
