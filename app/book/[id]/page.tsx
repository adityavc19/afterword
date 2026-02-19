import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getKnowledge } from '@/lib/store';
import SearchBar from '@/components/SearchBar';
import InterpretiveLandscape from '@/components/InterpretiveLandscape';
import SourceBadges from '@/components/SourceBadges';
import ChatWindow from '@/components/ChatWindow';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BookPage({ params }: Props) {
  const { id } = await params;
  const knowledge = getKnowledge(id);

  if (!knowledge) {
    redirect('/');
  }

  const { metadata, interpretiveLandscape, sources, questionPrompts, chunkCount } = knowledge;
  const authorLastName = metadata.author.split(' ').pop()?.toUpperCase() ?? '';

  return (
    <div className="min-h-screen flex flex-col animate-fade-up" style={{ background: '#FDFAF6' }}>
      {/* Top bar */}
      <div
        className="flex items-center gap-4 sticky top-0 z-10"
        style={{
          padding: '12px 24px',
          borderBottom: '1px solid #EDE6DB',
          background: '#FDFAF6',
        }}
      >
        <Link
          href="/"
          className="transition-opacity hover:opacity-70"
          style={{
            fontFamily: 'var(--font-instrument-serif), serif',
            fontSize: 15,
            letterSpacing: '0.1em',
            color: '#8B7355',
            textTransform: 'uppercase',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Afterword
        </Link>
        <SearchBar variant="detail" />
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex" style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', width: '100%' }}>

        {/* Left column: Book metadata + landscape */}
        <div style={{ width: 340, flexShrink: 0, padding: '32px 24px 32px 0', borderRight: '1px solid #EDE6DB', overflowY: 'auto' }}>
          {/* Cover */}
          <div style={{ marginBottom: 20 }}>
            {metadata.cover ? (
              <div
                className="overflow-hidden"
                style={{
                  width: 110,
                  height: 165,
                  borderRadius: 4,
                  border: '1px solid #E0D6CA',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                }}
              >
                <Image src={metadata.cover} alt={metadata.title} width={110} height={165} className="w-full h-full object-cover" unoptimized />
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center"
                style={{
                  width: 110,
                  height: 165,
                  borderRadius: 4,
                  background: 'linear-gradient(145deg, #3D3428 0%, #2A2318 100%)',
                  border: '1px solid #E0D6CA',
                  padding: 14,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                }}
              >
                <div style={{ fontFamily: 'var(--font-instrument-serif), serif', fontSize: 13, textAlign: 'center', lineHeight: 1.3, color: '#E8D5C4' }}>
                  {metadata.title}
                </div>
                <div style={{ fontSize: 9, color: '#8B7355', marginTop: 8, letterSpacing: '0.05em' }}>
                  {authorLastName}
                </div>
              </div>
            )}
          </div>

          {/* Title + Year */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontFamily: 'var(--font-instrument-serif), serif', fontSize: 24, fontWeight: 400, lineHeight: 1.2 }}>
              {metadata.title}
            </h1>
            {metadata.year > 0 && (
              <span style={{ fontSize: 13, color: '#B0A08A', fontFamily: 'var(--font-jetbrains-mono), monospace', flexShrink: 0 }}>
                {metadata.year}
              </span>
            )}
          </div>

          {/* Author */}
          <div style={{ fontSize: 14, color: '#6B5D4D', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B0A08A" strokeWidth="2" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>{metadata.author}</span>
          </div>

          {/* Genre + rating */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {metadata.genre.length > 0 && (
              <span style={{ fontSize: 11, color: '#8B7355', background: '#F5EDE4', padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>
                {metadata.genre[0]}
              </span>
            )}
            {metadata.goodreadsRating && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                <span style={{ color: '#C4974A' }}>★</span>
                <span style={{ fontWeight: 500, color: '#6B5D4D' }}>{metadata.goodreadsRating}</span>
                <span style={{ color: '#B0A08A', fontSize: 11 }}>/ 5</span>
              </div>
            )}
            {metadata.pageCount > 0 && (
              <span style={{ fontSize: 11, color: '#B0A08A' }}>{metadata.pageCount} pages</span>
            )}
          </div>

          {/* Synopsis */}
          {metadata.synopsis && (
            <p style={{ fontSize: 13, lineHeight: 1.6, color: '#5A4F40', marginBottom: 16 }}>
              {metadata.synopsis.slice(0, 300)}
              {metadata.synopsis.length > 300 ? '...' : ''}
            </p>
          )}

          {/* Ratings count */}
          {metadata.ratingsCount && (
            <div style={{ fontSize: 11, color: '#B0A08A', marginBottom: 24 }}>
              {metadata.ratingsCount.toLocaleString()} ratings
            </div>
          )}

          {/* How This Book Is Read */}
          <InterpretiveLandscape landscape={interpretiveLandscape} />

          {/* Sources */}
          <div style={{ padding: '16px 0' }}>
            <SourceBadges sources={sources} variant="bar" />
          </div>
        </div>

        {/* Right column: Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ flex: 1, padding: '0 0 0 24px', display: 'flex', flexDirection: 'column' }}>
            <ChatWindow
              bookId={id}
              bookSources={sources}
              bookTitle={metadata.title}
              questionPrompts={questionPrompts ?? []}
              chunkCount={chunkCount ?? 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
