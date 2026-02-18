import axios from 'axios';
import { Chunk } from '@/types';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function chunkText(text: string, source: string, sourceUrl: string): Chunk[] {
  const TARGET_CHARS = 1600;
  const chunks: Chunk[] = [];

  if (text.length <= TARGET_CHARS) {
    chunks.push({ id: generateId(), content: text, source, sourceUrl, type: 'critic_review' });
    return chunks;
  }

  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length > TARGET_CHARS && current.length > 0) {
      chunks.push({ id: generateId(), content: current.trim(), source, sourceUrl, type: 'critic_review' });
      current = sentence;
    } else {
      current += ' ' + sentence;
    }
  }
  if (current.trim()) {
    chunks.push({ id: generateId(), content: current.trim(), source, sourceUrl, type: 'critic_review' });
  }
  return chunks;
}

interface GuardianArticle {
  webTitle: string;
  webUrl: string;
  fields?: {
    bodyText?: string;
    standfirst?: string;
  };
}

export async function scrapeGuardian(title: string, author: string): Promise<Chunk[]> {
  try {
    const query = encodeURIComponent(`${title} ${author}`);
    const apiKey = process.env.GUARDIAN_API_KEY || 'test';
    const url = `https://content.guardianapis.com/search?q=${query}&section=books&api-key=${apiKey}&show-fields=bodyText,standfirst&page-size=5`;

    const res = await axios.get(url, { timeout: 10000 });
    const articles: GuardianArticle[] = res.data?.response?.results ?? [];

    const chunks: Chunk[] = [];
    for (const article of articles.slice(0, 4)) {
      const body = article.fields?.bodyText ?? '';
      const standfirst = article.fields?.standfirst ?? '';
      const combined = [standfirst, body].filter(Boolean).join('\n\n');

      if (combined.length > 100) {
        const articleChunks = chunkText(
          `[The Guardian — ${article.webTitle}]\n${combined}`,
          'The Guardian',
          article.webUrl
        );
        chunks.push(...articleChunks);
      }
    }

    console.log(`[Guardian] Got ${chunks.length} chunks`);
    return chunks;
  } catch (err) {
    console.log('[Guardian] Failed:', err instanceof Error ? err.message : err);
    return [];
  }
}
