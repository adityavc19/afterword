import axios from 'axios';
import { BookMetadata } from '@/types';

// Fetches full book metadata from Open Library + Google Books.
// This is the "metadata enrichment" step — takes partial metadata from search
// and fills in synopsis, genre, pageCount, rating, etc.
//
// Future: This can be replaced by a metadata agent that queries multiple APIs.

async function fetchOpenLibraryFull(workId: string): Promise<Partial<BookMetadata>> {
  try {
    const [workRes, ratingsRes, editionsRes] = await Promise.all([
      axios.get(`https://openlibrary.org/works/${workId}.json`, { timeout: 10000 }),
      axios.get(`https://openlibrary.org/works/${workId}/ratings.json`, { timeout: 10000 }).catch(() => null),
      axios.get(`https://openlibrary.org/works/${workId}/editions.json?limit=5`, { timeout: 10000 }).catch(() => null),
    ]);

    const work = workRes.data;
    const ratings = ratingsRes?.data;
    const editions = editionsRes?.data?.entries ?? [];

    // Find best edition for page count
    const editionWithPages = editions.find((e: { number_of_pages?: number }) => (e.number_of_pages ?? 0) > 0);
    const pageCount = editionWithPages?.number_of_pages ?? 0;

    // Author name
    let author = '';
    if (work.authors?.length > 0) {
      const authorKey = work.authors[0]?.author?.key;
      if (authorKey) {
        const authorRes = await axios.get(`https://openlibrary.org${authorKey}.json`, { timeout: 5000 }).catch(() => null);
        author = authorRes?.data?.name ?? '';
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

    // Year
    const year = work.first_publish_date
      ? parseInt(work.first_publish_date)
      : editions[0]?.publish_date
        ? parseInt(editions[0].publish_date)
        : 0;

    // Subjects/genres
    const genre = work.subjects?.slice(0, 5) ?? [];

    return {
      title: work.title,
      author: author || undefined,
      year: year || undefined,
      cover: cover || undefined,
      synopsis: synopsis.slice(0, 2000) || undefined,
      genre: genre.length > 0 ? genre : undefined,
      pageCount: pageCount || undefined,
      goodreadsRating: ratings?.summary?.average ? parseFloat(ratings.summary.average.toFixed(1)) : undefined,
      ratingsCount: ratings?.summary?.count ?? undefined,
    };
  } catch (err) {
    console.log('[Metadata] OL full fetch failed:', err instanceof Error ? err.message : err);
    return {};
  }
}

async function fetchGoogleBooksFull(title: string, author: string): Promise<Partial<BookMetadata>> {
  try {
    const query = encodeURIComponent(`${title} ${author}`);
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    const url = apiKey
      ? `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1&key=${apiKey}`
      : `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;

    const res = await axios.get(url, { timeout: 8000 });
    const item = res.data?.items?.[0];
    if (!item) return {};

    const info = item.volumeInfo;
    const cover =
      info.imageLinks?.large?.replace('http://', 'https://') ||
      info.imageLinks?.thumbnail?.replace('http://', 'https://') ||
      '';

    return {
      synopsis: info.description ?? undefined,
      genre: info.categories?.length > 0 ? info.categories : undefined,
      pageCount: info.pageCount ?? undefined,
      cover: cover || undefined,
    };
  } catch (err) {
    console.log('[Metadata] Google Books fetch failed:', err instanceof Error ? err.message : err);
    return {};
  }
}

export async function enrichMetadata(partial: BookMetadata): Promise<BookMetadata> {
  console.log(`[Metadata] Enriching metadata for "${partial.title}"...`);

  // Fetch from both sources in parallel
  const isOpenLibrary = !partial.id.startsWith('gb_');
  const emptyPartial: Partial<BookMetadata> = {};
  const [olData, gbData] = await Promise.all([
    isOpenLibrary ? fetchOpenLibraryFull(partial.id) : Promise.resolve(emptyPartial),
    fetchGoogleBooksFull(partial.title, partial.author),
  ]);

  // Merge: prefer Open Library data, fill gaps with Google Books, fall back to partial
  const enriched: BookMetadata = {
    id: partial.id,
    title: olData.title || partial.title,
    author: olData.author || partial.author,
    year: olData.year || partial.year || 0,
    cover: olData.cover || partial.cover || gbData.cover || '',
    synopsis: olData.synopsis || gbData.synopsis || partial.synopsis || '',
    genre: olData.genre || gbData.genre || partial.genre || [],
    pageCount: olData.pageCount || gbData.pageCount || partial.pageCount || 0,
    goodreadsRating: olData.goodreadsRating,
    ratingsCount: olData.ratingsCount,
  };

  console.log(`[Metadata] Enriched: synopsis=${enriched.synopsis.length > 0 ? 'yes' : 'no'}, genre=${enriched.genre.length}, pages=${enriched.pageCount}, rating=${enriched.goodreadsRating ?? 'none'}`);

  return enriched;
}
