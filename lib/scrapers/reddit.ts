import axios from 'axios';
import { Chunk } from '@/types';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function chunkText(text: string, source: string, sourceUrl: string): Chunk[] {
  const TARGET_CHARS = 1600;
  const chunks: Chunk[] = [];

  if (text.length <= TARGET_CHARS) {
    chunks.push({ id: generateId(), content: text, source, sourceUrl, type: 'community_discussion' });
    return chunks;
  }

  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length > TARGET_CHARS && current.length > 0) {
      chunks.push({ id: generateId(), content: current.trim(), source, sourceUrl, type: 'community_discussion' });
      current = sentence;
    } else {
      current += ' ' + sentence;
    }
  }
  if (current.trim()) {
    chunks.push({ id: generateId(), content: current.trim(), source, sourceUrl, type: 'community_discussion' });
  }
  return chunks;
}

interface RedditPost {
  title: string;
  selftext: string;
  permalink: string;
  subreddit: string;
  num_comments: number;
}

interface RedditComment {
  body: string;
  permalink: string;
  score: number;
}

// Reddit blocks generic user agents. Use a browser-like one.
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

async function fetchRedditJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await axios.get(url, { headers: HEADERS, timeout: 12000 });
    return res.data as T;
  } catch (err) {
    console.log(`[Reddit] fetch failed for ${url.slice(0, 80)}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

// Small delay between Reddit requests to avoid rate limiting
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function scrapeReddit(title: string, author: string): Promise<Chunk[]> {
  const query = encodeURIComponent(`"${title}" ${author}`);
  const querySimple = encodeURIComponent(title);
  const chunks: Chunk[] = [];

  try {
    // Search r/books specifically first (most relevant)
    const booksUrl = `https://www.reddit.com/r/books/search.json?q=${querySimple}&restrict_sr=1&sort=relevance&limit=5&t=all`;
    const booksData = await fetchRedditJSON<{ data: { children: { data: RedditPost }[] } }>(booksUrl);
    const booksPosts = booksData?.data?.children?.map(c => c.data) ?? [];

    await delay(1000); // Respect rate limits

    // Also search r/literature
    const litUrl = `https://www.reddit.com/r/literature/search.json?q=${querySimple}&restrict_sr=1&sort=relevance&limit=3&t=all`;
    const litData = await fetchRedditJSON<{ data: { children: { data: RedditPost }[] } }>(litUrl);
    const litPosts = litData?.data?.children?.map(c => c.data) ?? [];

    await delay(1000);

    // General search as fallback
    const generalUrl = `https://www.reddit.com/search.json?q=${query}&sort=relevance&limit=5&type=link&t=all`;
    const generalData = await fetchRedditJSON<{ data: { children: { data: RedditPost }[] } }>(generalUrl);
    const generalPosts = generalData?.data?.children?.map(c => c.data) ?? [];

    // Deduplicate by permalink and sort by comment count
    const seen = new Set<string>();
    const allPosts = [...booksPosts, ...litPosts, ...generalPosts]
      .filter(p => {
        if (seen.has(p.permalink)) return false;
        seen.add(p.permalink);
        return true;
      })
      .sort((a, b) => b.num_comments - a.num_comments)
      .slice(0, 6);

    console.log(`[Reddit] Found ${allPosts.length} posts for "${title}"`);

    for (const post of allPosts) {
      const postUrl = `https://www.reddit.com${post.permalink}`;

      // Include post body
      if (post.selftext && post.selftext.length > 80 && post.selftext !== '[deleted]' && post.selftext !== '[removed]') {
        chunks.push(...chunkText(`[r/${post.subreddit}: ${post.title}]\n${post.selftext}`, 'Reddit', postUrl));
      }

      // Fetch top comments
      await delay(800);
      const commentsData = await fetchRedditJSON<[unknown, { data: { children: { kind: string; data: RedditComment }[] } }]>(
        `https://www.reddit.com${post.permalink}.json?limit=8&sort=top`
      );

      const comments = commentsData?.[1]?.data?.children
        ?.filter(c => c.kind === 't1') // Only actual comments, not "more" markers
        ?.map(c => c.data)
        ?.filter(c => c.body && c.body.length > 60 && c.body !== '[deleted]' && c.body !== '[removed]')
        ?.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        ?.slice(0, 4) ?? [];

      for (const comment of comments) {
        chunks.push(...chunkText(`[Discussion in r/${post.subreddit}]\n${comment.body}`, 'Reddit', postUrl));
      }
    }

    console.log(`[Reddit] Got ${chunks.length} chunks total`);
    return chunks;
  } catch (err) {
    console.log('[Reddit] Scraper failed:', err instanceof Error ? err.message : err);
    return [];
  }
}
