import { notFound, redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getKnowledge } from '@/lib/store';
import InterpretiveLandscape from '@/components/InterpretiveLandscape';
import ChatWindow from '@/components/ChatWindow';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BookPage({ params }: Props) {
  const { id } = await params;
  const knowledge = getKnowledge(id);

  if (!knowledge) {
    // Book not ingested — redirect back to home
    redirect('/');
  }

  const { metadata, interpretiveLandscape, sources } = knowledge;

  return (
    <div className="min-h-screen">
      {/* Top nav */}
      <nav className="border-b border-stone-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-stone-400 hover:text-stone-200 transition-colors text-sm">
          ← Afterword
        </Link>
      </nav>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
          {/* Left column: Book info + landscape */}
          <div className="space-y-6">
            {/* Book header */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-24 h-36 bg-stone-800 rounded-lg overflow-hidden shadow-xl">
                {metadata.cover ? (
                  <Image
                    src={metadata.cover}
                    alt={metadata.title}
                    width={96}
                    height={144}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-600 text-3xl">📖</div>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-stone-100 leading-snug">{metadata.title}</h1>
                <p className="text-stone-400 mt-1">{metadata.author}</p>
                {metadata.year > 0 && (
                  <p className="text-stone-600 text-sm mt-0.5">{metadata.year}</p>
                )}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {metadata.goodreadsRating && (
                    <span className="text-sm text-amber-400">
                      ★ {metadata.goodreadsRating}
                      {metadata.ratingsCount && (
                        <span className="text-stone-600 text-xs ml-1">
                          ({metadata.ratingsCount.toLocaleString()} ratings)
                        </span>
                      )}
                    </span>
                  )}
                  {metadata.pageCount > 0 && (
                    <span className="text-stone-600 text-xs">{metadata.pageCount} pages</span>
                  )}
                </div>
              </div>
            </div>

            {/* Synopsis */}
            {metadata.synopsis && (
              <details className="group">
                <summary className="text-stone-500 text-sm cursor-pointer hover:text-stone-300 transition-colors list-none flex items-center gap-1">
                  <span className="group-open:hidden">+ Synopsis</span>
                  <span className="hidden group-open:block">− Synopsis</span>
                </summary>
                <p className="mt-3 text-stone-400 text-sm leading-relaxed">
                  {metadata.synopsis.slice(0, 500)}
                  {metadata.synopsis.length > 500 ? '...' : ''}
                </p>
              </details>
            )}

            {/* Genre tags */}
            {metadata.genre.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {metadata.genre.slice(0, 4).map(g => (
                  <span
                    key={g}
                    className="text-xs px-2 py-0.5 bg-stone-800 text-stone-500 rounded-full border border-stone-700"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Interpretive landscape */}
            <InterpretiveLandscape landscape={interpretiveLandscape} />
          </div>

          {/* Right column: Chat */}
          <div className="h-[calc(100vh-10rem)] sticky top-8">
            <ChatWindow bookId={id} bookSources={sources} />
          </div>
        </div>
      </div>
    </div>
  );
}
