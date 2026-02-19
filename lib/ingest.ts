import { BookMetadata, BookKnowledge, Chunk, IngestionEvent } from '@/types';
import { scrapeGoodreads } from './scrapers/goodreads';
import { scrapeReddit } from './scrapers/reddit';
import { scrapeGuardian } from './scrapers/guardian';
import { scrapeLitHub } from './scrapers/lithub';
import { generateLandscapeAndPrompts } from './claude';
import { setKnowledge } from './store';

export async function ingestBook(
  metadata: BookMetadata,
  onProgress: (event: IngestionEvent) => void
): Promise<BookKnowledge> {
  const title = metadata.title;
  const author = metadata.author;
  const allChunks: Chunk[] = [];
  const successfulSources: string[] = [];
  let ambientQuote: string | undefined;

  onProgress({ step: 'Fetching book details', status: 'done' });

  // Run all scrapers in parallel
  onProgress({ step: 'Reading Goodreads reviews', status: 'loading' });
  onProgress({ step: 'Scanning Reddit discussions', status: 'loading' });
  onProgress({ step: 'Loading critical reviews', status: 'loading' });

  const [goodreadsChunks, redditChunks, guardianChunks, lithubChunks] = await Promise.all([
    scrapeGoodreads(title, author),
    scrapeReddit(title, author),
    scrapeGuardian(title, author),
    scrapeLitHub(title, author),
  ]);

  if (goodreadsChunks.length > 0) {
    allChunks.push(...goodreadsChunks);
    successfulSources.push('Goodreads');
    // Pick an ambient quote from the first reader review
    const firstReview = goodreadsChunks.find(c => c.type === 'reader_review');
    if (firstReview) {
      ambientQuote = firstReview.content.slice(0, 200).trim();
    }
    onProgress({ step: 'Reading Goodreads reviews', status: 'done', quote: ambientQuote });
  } else {
    onProgress({ step: 'Reading Goodreads reviews', status: 'failed' });
  }

  if (redditChunks.length > 0) {
    allChunks.push(...redditChunks);
    successfulSources.push('Reddit');
    if (!ambientQuote) {
      const firstDiscussion = redditChunks[0];
      ambientQuote = firstDiscussion.content.slice(0, 200).trim();
    }
    onProgress({ step: 'Scanning Reddit discussions', status: 'done' });
  } else {
    onProgress({ step: 'Scanning Reddit discussions', status: 'failed' });
  }

  if (guardianChunks.length > 0) {
    allChunks.push(...guardianChunks);
    successfulSources.push('The Guardian');
    onProgress({ step: 'Loading critical reviews', status: 'done' });
  } else {
    onProgress({ step: 'Loading critical reviews', status: 'failed' });
  }

  if (lithubChunks.length > 0) {
    allChunks.push(...lithubChunks);
    successfulSources.push('Literary Hub');
  }

  onProgress({ step: 'Building knowledge base', status: 'loading' });

  // Generate interpretive landscape + question prompts
  const { landscape: interpretiveLandscape, questionPrompts } = await generateLandscapeAndPrompts(metadata, allChunks);

  const knowledge: BookKnowledge = {
    metadata,
    chunks: allChunks,
    interpretiveLandscape,
    questionPrompts,
    chunkCount: allChunks.length,
    ingestedAt: Date.now(),
    sources: successfulSources,
  };

  setKnowledge(metadata.id, knowledge);

  onProgress({
    step: 'Ready',
    status: 'done',
    quote: ambientQuote,
    landscape: interpretiveLandscape,
    sources: successfulSources,
  });

  return knowledge;
}
