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
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#FDFAF6' }}>
      {/* Nav bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '10px 24px',
          borderBottom: '1px solid #EDE6DB',
          background: '#FDFAF6',
          flexShrink: 0,
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

      {/* Main content: sidebar + chat */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left sidebar — sticky, scrollable */}
        <div
          className="chat-scroll"
          style={{
            width: 280,
            flexShrink: 0,
            overflowY: 'auto',
            padding: '24px 20px',
            borderRight: '1px solid #EDE6DB',
          }}
        >
          {/* Cover */}
          <div style={{ marginBottom: 16 }}>
            {metadata.cover ? (
              <div
                className="overflow-hidden"
                style={{
                  width: 100,
                  height: 150,
                  borderRadius: 4,
                  border: '1px solid #E0D6CA',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                }}
              >
                <Image src={metadata.cover} alt={metadata.title} width={100} height={150} className="w-full h-full object-cover" unoptimized />
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center"
                style={{
                  width: 100,
                  height: 150,
                  borderRadius: 4,
                  background: 'linear-gradient(145deg, #3D3428 0%, #2A2318 100%)',
                  border: '1px solid #E0D6CA',
                  padding: 12,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                }}
              >
                <div style={{ fontFamily: 'var(--font-instrument-serif), serif', fontSize: 12, textAlign: 'center', lineHeight: 1.3, color: '#E8D5C4' }}>
                  {metadata.title}
                </div>
                <div style={{ fontSize: 8, color: '#8B7355', marginTop: 6, letterSpacing: '0.05em' }}>
                  {authorLastName}
                </div>
              </div>
            )}
          </div>

          {/* Title */}
          <h1 style={{ fontFamily: 'var(--font-instrument-serif), serif', fontSize: 20, fontWeight: 400, lineHeight: 1.2, marginBottom: 4 }}>
            {metadata.title}
          </h1>

          {/* Author + year */}
          <div style={{ fontSize: 13, color: '#6B5D4D', marginBottom: 10 }}>
            {metadata.author}
            {metadata.year > 0 && (
              <span style={{ color: '#B0A08A', marginLeft: 6, fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 12 }}>
                {metadata.year}
              </span>
            )}
          </div>

          {/* Quick stats row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {metadata.goodreadsRating && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12 }}>
                <span style={{ color: '#C4974A' }}>★</span>
                <span style={{ fontWeight: 500, color: '#6B5D4D' }}>{metadata.goodreadsRating}</span>
              </span>
            )}
            {metadata.genre.length > 0 && (
              <span style={{ fontSize: 10, color: '#8B7355', background: '#F5EDE4', padding: '2px 8px', borderRadius: 12, fontWeight: 500 }}>
                {metadata.genre[0]}
              </span>
            )}
            {metadata.pageCount > 0 && (
              <span style={{ fontSize: 11, color: '#B0A08A' }}>{metadata.pageCount}p</span>
            )}
          </div>

          {/* Synopsis */}
          {metadata.synopsis && (
            <p style={{ fontSize: 12, lineHeight: 1.55, color: '#5A4F40', marginBottom: 14 }}>
              {metadata.synopsis.slice(0, 250)}
              {metadata.synopsis.length > 250 ? '...' : ''}
            </p>
          )}

          {/* Divider */}
          <div style={{ borderTop: '1px solid #EDE6DB', margin: '4px 0 14px' }} />

          {/* How This Book Is Read — collapsible */}
          <details>
            <summary
              style={{
                cursor: 'pointer',
                fontFamily: 'var(--font-instrument-serif), serif',
                fontSize: 11,
                fontWeight: 400,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#8B7355',
                marginBottom: 12,
                listStyle: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 9, transition: 'transform 0.2s' }}>▸</span>
              How This Book Is Read
            </summary>
            <div style={{ marginTop: 10 }}>
              <InterpretiveLandscape landscape={interpretiveLandscape} />
            </div>
          </details>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #EDE6DB', margin: '14px 0' }} />

          {/* Sources */}
          <SourceBadges sources={sources} variant="bar" />

          {metadata.ratingsCount && (
            <div style={{ fontSize: 10, color: '#B0A08A', marginTop: 10 }}>
              {metadata.ratingsCount.toLocaleString()} ratings on Open Library
            </div>
          )}
        </div>

        {/* Right column — full-height chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
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
  );
}
