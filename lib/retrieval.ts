import { Chunk } from '@/types';

// Simple keyword-based retrieval — no vector embeddings needed for MVP.
// Scores chunks by term frequency against the query, with source type boosts.

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'it', 'in', 'on', 'at', 'to', 'for', 'of', 'and',
  'or', 'but', 'with', 'this', 'that', 'was', 'are', 'be', 'been', 'have',
  'has', 'had', 'do', 'did', 'what', 'how', 'why', 'when', 'where', 'i',
  'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function scoreChunk(queryTokens: string[], chunk: Chunk): number {
  const chunkTokens = tokenize(chunk.content);
  const chunkSet = new Set(chunkTokens);

  let score = 0;
  for (const qt of queryTokens) {
    if (chunkSet.has(qt)) score += 1;
    // Partial match
    for (const ct of chunkSet) {
      if (ct.includes(qt) && ct !== qt) score += 0.5;
    }
  }

  // Normalize by chunk length to avoid always picking long chunks
  score = score / Math.log(chunkTokens.length + 2);

  // Boost high-value source types for analytical queries
  if (chunk.type === 'critic_review') score *= 1.3;
  if (chunk.type === 'author_interview') score *= 1.4;

  return score;
}

export function retrieveChunks(
  query: string,
  chunks: Chunk[],
  topK: number = 8
): Chunk[] {
  if (chunks.length === 0) return [];

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    // No meaningful query — return a diversity sample
    return diversitySample(chunks, topK);
  }

  const scored = chunks.map(chunk => ({
    chunk,
    score: scoreChunk(queryTokens, chunk),
  }));

  scored.sort((a, b) => b.score - a.score);

  // Take top candidates but ensure source diversity
  const top = scored.slice(0, topK * 2).map(s => s.chunk);
  return ensureDiversity(top, topK);
}

function ensureDiversity(ranked: Chunk[], topK: number): Chunk[] {
  const result: Chunk[] = [];
  const seenTypes = new Set<string>();
  const seenSources = new Set<string>();

  // First pass: one of each type
  for (const chunk of ranked) {
    if (!seenTypes.has(chunk.type)) {
      result.push(chunk);
      seenTypes.add(chunk.type);
      seenSources.add(chunk.source);
    }
    if (result.length >= topK) break;
  }

  // Second pass: fill remaining slots with highest-scored chunks
  for (const chunk of ranked) {
    if (result.length >= topK) break;
    if (!result.includes(chunk)) {
      result.push(chunk);
    }
  }

  return result;
}

function diversitySample(chunks: Chunk[], topK: number): Chunk[] {
  // When no query, return a spread of source types
  const byType = new Map<string, Chunk[]>();
  for (const chunk of chunks) {
    const arr = byType.get(chunk.type) ?? [];
    arr.push(chunk);
    byType.set(chunk.type, arr);
  }

  const result: Chunk[] = [];
  let i = 0;
  const types = Array.from(byType.keys());
  while (result.length < topK) {
    const type = types[i % types.length];
    const arr = byType.get(type) ?? [];
    const idx = Math.floor(result.length / types.length);
    if (arr[idx]) result.push(arr[idx]);
    i++;
    if (i > topK * 4) break; // Safety
  }
  return result;
}
