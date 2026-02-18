import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { SearchResult } from '@/types';

interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  number_of_pages_median?: number;
  subject?: string[];
}

interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publishedDate?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    pageCount?: number;
    categories?: string[];
    description?: string;
  };
}

async function searchOpenLibrary(query: string): Promise<SearchResult[]> {
  try {
    const res = await axios.get(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8&fields=key,title,author_name,first_publish_year,cover_i`,
      { timeout: 8000 }
    );
    const docs: OpenLibraryDoc[] = res.data?.docs ?? [];
    return docs.map(doc => ({
      id: doc.key.replace('/works/', ''), // e.g. "OL123W"
      title: doc.title,
      author: doc.author_name?.[0] ?? 'Unknown Author',
      year: doc.first_publish_year ?? 0,
      cover: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
        : '',
    }));
  } catch {
    return [];
  }
}

async function searchGoogleBooks(query: string): Promise<SearchResult[]> {
  try {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    const url = apiKey
      ? `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8&key=${apiKey}`
      : `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8`;
    const res = await axios.get(url, { timeout: 8000 });
    const items: GoogleBooksVolume[] = res.data?.items ?? [];
    return items.map(item => ({
      id: `gb_${item.id}`,
      title: item.volumeInfo.title,
      author: item.volumeInfo.authors?.[0] ?? 'Unknown Author',
      year: item.volumeInfo.publishedDate ? parseInt(item.volumeInfo.publishedDate.slice(0, 4)) : 0,
      cover:
        item.volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://') ||
        item.volumeInfo.imageLinks?.smallThumbnail?.replace('http://', 'https://') ||
        '',
    }));
  } catch {
    return [];
  }
}

function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return results.filter(r => {
    const key = `${r.title.toLowerCase()}-${r.author.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q');
  if (!query || query.trim().length < 2) {
    return NextResponse.json([]);
  }

  const [olResults, gbResults] = await Promise.all([
    searchOpenLibrary(query),
    searchGoogleBooks(query),
  ]);

  // Prefer Open Library results (have stable IDs), then fill with Google Books
  const merged = deduplicateResults([...olResults, ...gbResults]);
  return NextResponse.json(merged.slice(0, 8));
}
