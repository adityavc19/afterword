'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { BookMetadata, IngestionEvent, InterpretiveLandscape } from '@/types';

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
        // Short delay so user sees "Ready" before redirect
        setTimeout(() => {
          router.push(`/book/${bookId}`);
        }, 600);
      }

      if (event.status === 'done' && event.step === 'Building knowledge base') {
        setSteps(prev =>
          prev.map(s => s.label === 'Building knowledge base' ? { ...s, status: 'done' } : s)
        );
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  }, [bookId, metadata, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background cover blur */}
      {metadata.cover && (
        <div
          className="absolute inset-0 opacity-10 bg-cover bg-center blur-3xl scale-110"
          style={{ backgroundImage: `url(${metadata.cover})` }}
        />
      )}

      <div className="relative z-10 w-full max-w-md mx-auto space-y-8">
        {/* Book info */}
        <div className="flex items-start gap-5">
          <div className="flex-shrink-0 w-20 h-28 bg-stone-800 rounded-lg overflow-hidden shadow-2xl">
            {metadata.cover ? (
              <Image
                src={metadata.cover}
                alt={metadata.title}
                width={80}
                height={112}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-600 text-2xl">📖</div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-stone-100 leading-snug">{metadata.title}</h2>
            <p className="text-stone-400 mt-1">{metadata.author}</p>
            {metadata.year > 0 && <p className="text-stone-600 text-sm">{metadata.year}</p>}
          </div>
        </div>

        {/* Progress steps */}
        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.label} className="flex items-center gap-3">
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {step.status === 'done' && (
                  <span className="text-emerald-400 text-sm">✓</span>
                )}
                {step.status === 'loading' && (
                  <div className="w-3 h-3 border-2 border-stone-500 border-t-stone-300 rounded-full animate-spin" />
                )}
                {step.status === 'failed' && (
                  <span className="text-stone-600 text-sm">—</span>
                )}
                {step.status === 'pending' && (
                  <div className="w-2 h-2 rounded-full bg-stone-700" />
                )}
              </div>
              <span
                className={`text-sm transition-colors ${
                  step.status === 'done'
                    ? 'text-stone-300'
                    : step.status === 'loading'
                    ? 'text-stone-200'
                    : step.status === 'failed'
                    ? 'text-stone-600'
                    : 'text-stone-600'
                }`}
              >
                {step.label}
                {step.status === 'failed' && ' (skipped)'}
              </span>
            </div>
          ))}
        </div>

        {/* Ambient quote */}
        {quote && (
          <div className="border-l-2 border-stone-700 pl-4">
            <p className="text-stone-500 text-sm italic leading-relaxed line-clamp-3">
              &ldquo;{quote}&rdquo;
            </p>
          </div>
        )}

        {done && (
          <p className="text-emerald-400 text-sm text-center animate-pulse">
            Opening your companion...
          </p>
        )}
      </div>
    </div>
  );
}
