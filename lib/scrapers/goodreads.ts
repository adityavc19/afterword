import { chromium } from 'playwright';
import { Chunk } from '@/types';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function chunkText(text: string, source: string, sourceUrl: string, type: Chunk['type'], rating?: number): Chunk[] {
  const TARGET_CHARS = 1600; // ~400 tokens
  const chunks: Chunk[] = [];

  if (text.length <= TARGET_CHARS) {
    chunks.push({ id: generateId(), content: text, source, sourceUrl, type, rating });
    return chunks;
  }

  // Split by sentences
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length > TARGET_CHARS && current.length > 0) {
      chunks.push({ id: generateId(), content: current.trim(), source, sourceUrl, type, rating });
      current = sentence;
    } else {
      current += ' ' + sentence;
    }
  }
  if (current.trim()) {
    chunks.push({ id: generateId(), content: current.trim(), source, sourceUrl, type, rating });
  }
  return chunks;
}

export async function scrapeGoodreads(title: string, author: string): Promise<Chunk[]> {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-US',
    });
    const page = await context.newPage();

    // Search for the book
    const searchUrl = `https://www.goodreads.com/search?q=${encodeURIComponent(title + ' ' + author)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Try to find and click the first result
    const firstResult = page.locator('a.bookTitle').first();
    const bookUrl = await firstResult.getAttribute('href').catch(() => null);
    if (!bookUrl) {
      console.log('[Goodreads] No book found in search results');
      return [];
    }

    const fullBookUrl = `https://www.goodreads.com${bookUrl}`;
    await page.goto(fullBookUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Wait for reviews to appear
    await page.waitForSelector('[data-testid="review"]', { timeout: 8000 }).catch(() => null);

    const chunks: Chunk[] = [];

    // Scrape reviews with diverse ratings
    const reviewEls = await page.locator('[data-testid="review"]').all();
    for (const reviewEl of reviewEls.slice(0, 12)) {
      try {
        const text = await reviewEl.locator('[data-testid="contentContainer"]').textContent({ timeout: 2000 });
        const ratingEl = await reviewEl.locator('[data-testid="review-star-rating"]').textContent({ timeout: 2000 }).catch(() => '');
        const ratingMatch = ratingEl?.match(/(\d)/);
        const rating = ratingMatch ? parseInt(ratingMatch[1]) : undefined;

        if (text && text.trim().length > 100) {
          const reviewChunks = chunkText(text.trim(), 'Goodreads', fullBookUrl, 'reader_review', rating);
          chunks.push(...reviewChunks);
        }
      } catch {
        // Skip individual review errors
      }
    }

    await browser.close();
    console.log(`[Goodreads] Got ${chunks.length} chunks`);
    return chunks;
  } catch (err) {
    console.log('[Goodreads] Scrape failed, skipping:', err instanceof Error ? err.message : err);
    try { await browser?.close(); } catch { /* ignore */ }
    return [];
  }
}
