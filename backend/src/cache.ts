import crypto from "node:crypto";

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 1000 * 60 * 60; // 1 hour

  set<T>(key: string, value: T, ttl = this.defaultTTL): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export const embeddingCache = new MemoryCache();
export const apiCache = new MemoryCache();

export function generateCacheKey(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function generateQuestionCacheKey(question: string, topK: number): string {
  return `question:${generateCacheKey(question)}:${topK}`;
}
