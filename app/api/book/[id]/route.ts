import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { BookMetadata } from '@/types';
import { getKnowledge, hasKnowledge } from '@/lib/store';

async function fetchOpenLibraryMetadata(workId: string): Promise<BookMetadata | null> {
  try {
    const [workRes, ratingsRes] = await Promise.all([
      axios.get(`https://openlibrary.org/works/${workId}.json`, { timeout: 8000 }),
      axios.get(`https://openlibrary.org/works/${workId}/ratings.json`, { timeout: 8000 }).catch(() => null),
    ]);

    const work = workRes.data;
    const ratings = ratingsRes?.data;

    // Get edition for page count and year
    const editionsRes = await axios
      .get(`https://openlibrary.org/works/${workId}/editions.json?limit=5`, { timeout: 8000 })
      .catch(() => null);
    const editions = editionsRes?.data?.entries ?? [];
    const firstEdition = editions[0];

    // Author name
    let authorName = 'Unknown Author';
    if (work.authors?.length > 0) {
      const authorKey = work.authors[0]?.author?.key;
      if (authorKey) {
        const authorRes = await axios.get(`https://openlibrary.org${authorKey}.json`, { timeout: 5000 }).catch(() => null);
        authorName = authorRes?.data?.name ?? 'Unknown Author';
      }
    }

    // Cover
    const coverId = work.covers?.[0];
    const cover = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : '';

    // Synopsis
    const description = work.description;
    const synopsis = typeof description === 'string'
      ? description
      : description?.value ?? '';

    // First publish year
    const year = work.first_publish_date
      ? parseInt(work.first_publish_date)
      : firstEdition?.publish_date
        ? parseInt(firstEdition.publish_date)
        : 0;

    return {
      id: workId,
      title: work.title ?? 'Unknown Title',
      author: authorName,
      year,
      cover,
      synopsis: synopsis.slice(0, 2000),
      genre: work.subjects?.slice(0, 5) ?? [],
      pageCount: firstEdition?.number_of_pages ?? 0,
      goodreadsRating: ratings?.summary?.average ? parseFloat(ratings.summary.average.toFixed(1)) : undefined,
      ratingsCount: ratings?.summary?.count ?? undefined,
    };
  } catch (err) {
    console.log('[Book API] OL fetch failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

async function fetchGoogleBooksMetadata(gbId: string): Promise<BookMetadata | null> {
  try {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    const url = apiKey
      ? `https://www.googleapis.com/books/v1/volumes/${gbId}?key=${apiKey}`
      : `https://www.googleapis.com/books/v1/volumes/${gbId}`;
    const res = await axios.get(url, { timeout: 8000 });
    const info = res.data?.volumeInfo;
    if (!info) return null;

    const cover =
      info.imageLinks?.large?.replace('http://', 'https://') ||
      info.imageLinks?.thumbnail?.replace('http://', 'https://') ||
      '';

    return {
      id: `gb_${gbId}`,
      title: info.title ?? 'Unknown Title',
      author: info.authors?.[0] ?? 'Unknown Author',
      year: info.publishedDate ? parseInt(info.publishedDate.slice(0, 4)) : 0,
      cover,
      synopsis: info.description ?? '',
      genre: info.categories ?? [],
      pageCount: info.pageCount ?? 0,
    };
  } catch (err) {
    console.log('[Book API] GB fetch failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (hasKnowledge(id)) {
    const knowledge = getKnowledge(id)!;
    return NextResponse.json({ status: 'cached', metadata: knowledge.metadata });
  }

  let metadata: BookMetadata | null = null;

  if (id.startsWith('gb_')) {
    metadata = await fetchGoogleBooksMetadata(id.slice(3));
  } else {
    metadata = await fetchOpenLibraryMetadata(id);
  }

  if (!metadata) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 });
  }

  return NextResponse.json({ status: 'fresh', metadata });
}
