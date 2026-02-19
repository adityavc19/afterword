'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { BookMetadata, IngestionEvent } from '@/types';

interface Step {
  label: string;
  status: 'pending' | 'loading' | 'done' | 'failed';
}

const INITIAL_STEPS: Step[] = [
  { label: 'Fetching book details', status: 'pending' },
  { label: 'Reading Goodreads reviews', status: 'pending' },
  { label: 'Scanning Reddit discussions', status: 'pending' },
  { label: 'Loading critical reviews', status: 'pending' },
  { label: 'Building knowledge base', status: 'pending' },
];

interface Props {
  bookId: string;
  metadata: BookMetadata;
}

export default function IngestionProgress({ bookId, metadata }: Props) {
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [quote, setQuote] = useState<string>('');
  const [done, setDone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const metadataParam = encodeURIComponent(JSON.stringify(metadata));
    const url = `/api/ingest/${bookId}?metadata=${metadataParam}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (e) => {
      const event: IngestionEvent = JSON.parse(e.data);

      setSteps(prev =>
        prev.map(step =>
          step.label === event.step
            ? { ...step, status: event.status }
            : step
        )
      );

      if (event.quote) setQuote(event.quote);

      if (event.status === 'done' && event.step === 'Ready') {
        setDone(true);
        eventSource.close();
        setTimeout(() => {
          router.push(`/book/${bookId}`);
        }, 600);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  }, [bookId, metadata, router]);

  const authorLastName = metadata.author.split(' ').pop()?.toUpperCase() ?? '';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center animate-fade-up"
      style={{ background: '#1A1A1A', color: '#FDFAF6', padding: '40px 24px' }}
    >
      {/* Book cover */}
      <div className="mb-8">
        {metadata.cover ? (
          <div className="rounded overflow-hidden" style={{ width: 140, height: 210, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            <Image src={metadata.cover} alt={metadata.title} width={140} height={210} className="w-full h-full object-cover" unoptimized />
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center"
            style={{
              width: 140,
              height: 210,
              borderRadius: 4,
              background: 'linear-gradient(145deg, #3D3428 0%, #2A2318 100%)',
              border: '1px solid #4A3F32',
              padding: 20,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ fontFamily: 'var(--font-instrument-serif), serif', fontSize: 16, textAlign: 'center', lineHeight: 1.3, color: '#E8D5C4' }}>
              {metadata.title}
            </div>
            <div style={{ fontSize: 11, color: '#8B7355', marginTop: 12, letterSpacing: '0.05em' }}>
              {authorLastName}
            </div>
          </div>
        )}
      </div>

      {/* Title + author */}
      <h2 style={{ fontFamily: 'var(--font-instrument-serif), serif', fontSize: 24, fontWeight: 400, marginBottom: 4 }}>
        {metadata.title}
      </h2>
      <div style={{ fontSize: 14, color: '#8B7355', marginBottom: 40 }}>
        {metadata.author}{metadata.year > 0 ? ` · ${metadata.year}` : ''}
      </div>

      {/* Loading steps */}
      <div className="w-full" style={{ maxWidth: 360, marginBottom: 48 }}>
        {steps.map((step) => {
          const isDone = step.status === 'done';
          const isCurrent = step.status === 'loading';
          const isFailed = step.status === 'failed';
          return (
            <div
              key={step.label}
              className="flex items-center gap-3 transition-opacity"
              style={{
                padding: '10px 0',
                opacity: isDone ? 1 : isCurrent ? 0.9 : 0.3,
              }}
            >
              <div
                className="flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: `1.5px solid ${isDone || isCurrent ? '#8B7355' : '#4A3F32'}`,
                }}
              >
                {isDone && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8B7355" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {isCurrent && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#8B7355', animation: 'pulse 1.5s infinite' }} />
                )}
              </div>
              <span
                className="transition-colors"
                style={{
                  fontSize: 14,
                  color: isDone ? '#E8D5C4' : isCurrent ? '#C4B49A' : '#4A3F32',
                }}
              >
                {step.label}
                {isDone && ' ✓'}
                {isCurrent && '...'}
                {isFailed && ' (skipped)'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Ambient quote */}
      {quote && (
        <div className="animate-fade-up-delay" style={{ maxWidth: 440, textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-instrument-serif), serif', fontSize: 16, fontStyle: 'italic', lineHeight: 1.6, color: '#8B7355', marginBottom: 8 }}>
            &ldquo;{quote}&rdquo;
          </p>
        </div>
      )}

      {done && (
        <p style={{ color: '#8B7355', fontSize: 14, marginTop: 24, animation: 'pulse 1.5s infinite' }}>
          Opening your companion...
        </p>
      )}
    </div>
  );
}
