import axios from 'axios';
import * as cheerio from 'cheerio';
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

async function fetchHTML(url: string): Promise<string | null> {
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html',
      },
      timeout: 10000,
    });
    return res.data as string;
  } catch {
    return null;
  }
}

export async function scrapeLitHub(title: string, author: string): Promise<Chunk[]> {
  try {
    const query = encodeURIComponent(`${title} ${author}`);
    const searchUrl = `https://lithub.com/?s=${query}`;
    const html = await fetchHTML(searchUrl);
    if (!html) return [];

    const $ = cheerio.load(html);
    const articleLinks: string[] = [];

    // LitHub search results typically show article cards
    $('article a, .post-title a, h2 a, h3 a').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('lithub.com') && !articleLinks.includes(href)) {
        articleLinks.push(href);
      }
    });

    const chunks: Chunk[] = [];
    for (const link of articleLinks.slice(0, 2)) {
      const articleHtml = await fetchHTML(link);
      if (!articleHtml) continue;

      const $a = cheerio.load(articleHtml);
      const titleText = $a('h1').first().text().trim();

      // Extract main article body
      let bodyText = '';
      $a('article p, .entry-content p, .post-content p').each((_, el) => {
        const text = $a(el).text().trim();
        if (text.length > 50) bodyText += text + ' ';
      });

      if (bodyText.length > 200) {
        const articleChunks = chunkText(
          `[Literary Hub — ${titleText}]\n${bodyText.trim()}`,
          'Literary Hub',
          link
        );
        chunks.push(...articleChunks);
      }
    }

    console.log(`[LitHub] Got ${chunks.length} chunks`);
    return chunks;
  } catch (err) {
    console.log('[LitHub] Failed:', err instanceof Error ? err.message : err);
    return [];
  }
}
