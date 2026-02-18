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
  url: string;
}

interface RedditComment {
  body: string;
  permalink: string;
  score: number;
}

async function fetchRedditJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Afterword/1.0 (book companion app)',
        Accept: 'application/json',
      },
      timeout: 10000,
    });
    return res.data as T;
  } catch {
    return null;
  }
}

export async function scrapeReddit(title: string, author: string): Promise<Chunk[]> {
  const query = encodeURIComponent(`${title} ${author}`);
  const chunks: Chunk[] = [];

  try {
    // Search across Reddit
    const searchUrl = `https://www.reddit.com/search.json?q=${query}&sort=relevance&limit=8&type=link`;
    const searchData = await fetchRedditJSON<{ data: { children: { data: RedditPost }[] } }>(searchUrl);

    const posts = searchData?.data?.children?.map(c => c.data) ?? [];

    // Also search r/books specifically
    const booksUrl = `https://www.reddit.com/r/books/search.json?q=${query}&restrict_sr=1&sort=top&limit=5`;
    const booksData = await fetchRedditJSON<{ data: { children: { data: RedditPost }[] } }>(booksUrl);
    const booksPosts = booksData?.data?.children?.map(c => c.data) ?? [];

    const allPosts = [...posts, ...booksPosts].slice(0, 8);

    for (const post of allPosts) {
      const postUrl = `https://www.reddit.com${post.permalink}`;

      // Include post body if substantial
      if (post.selftext && post.selftext.length > 100 && post.selftext !== '[deleted]') {
        const postChunks = chunkText(
          `[Post: ${post.title}]\n${post.selftext}`,
          'Reddit',
          postUrl
        );
        chunks.push(...postChunks);
      }

      // Fetch top comments
      const commentsData = await fetchRedditJSON<[unknown, { data: { children: { data: RedditComment }[] } }]>(
        `https://www.reddit.com${post.permalink}.json?limit=10&sort=top`
      );

      const comments = commentsData?.[1]?.data?.children
        ?.map(c => c.data)
        ?.filter(c => c.body && c.body.length > 80 && c.body !== '[deleted]' && c.body !== '[removed]')
        ?.sort((a, b) => b.score - a.score)
        ?.slice(0, 5) ?? [];

      for (const comment of comments) {
        const commentChunks = chunkText(
          `[Discussion about "${post.title}"]\n${comment.body}`,
          'Reddit',
          postUrl
        );
        chunks.push(...commentChunks);
      }
    }

    console.log(`[Reddit] Got ${chunks.length} chunks`);
    return chunks;
  } catch (err) {
    console.log('[Reddit] Failed:', err instanceof Error ? err.message : err);
    return [];
  }
}
