import { chromium } from 'playwright';
import { Chunk } from '@/types';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function chunkText(text: string, source: string, sourceUrl: string, type: Chunk['type'], rating?: number): Chunk[] {
  const TARGET_CHARS = 1600;
  const chunks: Chunk[] = [];

  if (text.length <= TARGET_CHARS) {
    chunks.push({ id: generateId(), content: text, source, sourceUrl, type, rating });
    return chunks;
  }

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
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      locale: 'en-US',
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    // Block images/fonts to speed up loading
    await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2}', route => route.abort());

    // Search for the book
    const searchUrl = `https://www.goodreads.com/search?q=${encodeURIComponent(title + ' ' + author)}`;
    console.log(`[Goodreads] Searching: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });

    // Wait a moment for JS rendering
    await page.waitForTimeout(2000);

    // Try multiple selectors for the first result (Goodreads changes their UI)
    let bookUrl: string | null = null;
    const selectors = ['a.bookTitle', 'a[href*="/book/show/"]', '.bookTitle a', 'table.tableList a[href*="/book/show/"]'];
    for (const sel of selectors) {
      const el = page.locator(sel).first();
      bookUrl = await el.getAttribute('href').catch(() => null);
      if (bookUrl) break;
    }

    if (!bookUrl) {
      console.log('[Goodreads] No book found in search results');
      await browser.close();
      return [];
    }

    const fullBookUrl = bookUrl.startsWith('http') ? bookUrl : `https://www.goodreads.com${bookUrl}`;
    console.log(`[Goodreads] Found book: ${fullBookUrl}`);
    await page.goto(fullBookUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(3000);

    const chunks: Chunk[] = [];

    // Try multiple review selector strategies
    const reviewSelectors = [
      '[data-testid="review"]',
      '.ReviewCard',
      'article.ReviewCard',
      '[itemprop="reviews"]',
      '.review',
    ];

    let reviewEls: Awaited<ReturnType<typeof page.locator>>[] = [];
    for (const sel of reviewSelectors) {
      reviewEls = await page.locator(sel).all();
      if (reviewEls.length > 0) {
        console.log(`[Goodreads] Found ${reviewEls.length} reviews with selector: ${sel}`);
        break;
      }
    }

    // Extract review text with multiple content selectors
    const contentSelectors = [
      '[data-testid="contentContainer"]',
      '.ReviewText__content',
      '.ReviewCard__text',
      '.readable span[style*="display"]',
      'span.readable',
    ];

    for (const reviewEl of reviewEls.slice(0, 12)) {
      try {
        let text = '';
        for (const cSel of contentSelectors) {
          text = await reviewEl.locator(cSel).first().textContent({ timeout: 2000 }).catch(() => '') ?? '';
          if (text.trim().length > 50) break;
        }

        // Try to get star rating
        let rating: number | undefined;
        const ratingText = await reviewEl.locator('[aria-label*="star"], [data-testid*="rating"], .RatingStars').first()
          .getAttribute('aria-label').catch(() => null);
        if (ratingText) {
          const match = ratingText.match(/(\d)/);
          if (match) rating = parseInt(match[1]);
        }

        if (text.trim().length > 100) {
          chunks.push(...chunkText(text.trim(), 'Goodreads', fullBookUrl, 'reader_review', rating));
        }
      } catch {
        // Skip individual review errors
      }
    }

    // If no reviews found via structured selectors, try a raw text extraction
    if (chunks.length === 0) {
      console.log('[Goodreads] No structured reviews found, trying raw text extraction...');
      const bodyText = await page.locator('.BookPage__mainContent, main').textContent({ timeout: 5000 }).catch(() => '');
      if (bodyText && bodyText.length > 500) {
        // Extract a summary of what's on the page
        const cleaned = bodyText.replace(/\s+/g, ' ').trim().slice(0, 3000);
        chunks.push(...chunkText(`[Goodreads page content for ${title}]\n${cleaned}`, 'Goodreads', fullBookUrl, 'reader_review'));
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
