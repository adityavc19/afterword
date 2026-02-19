'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { SearchResult, BookMetadata } from '@/types';

interface Props {
  variant?: 'home' | 'detail';
}

export default function SearchBar({ variant = 'home' }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data: SearchResult[] = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function selectBook(result: SearchResult) {
    setOpen(false);
    setQuery('');
    const metadata: Partial<BookMetadata> = {
      id: result.id,
      title: result.title,
      author: result.author,
      year: result.year,
      cover: result.cover,
      synopsis: '',
      genre: [],
      pageCount: 0,
    };
    router.push(`/loading/${result.id}?metadata=${encodeURIComponent(JSON.stringify(metadata))}`);
  }

  const isHome = variant === 'home';

  return (
    <div ref={containerRef} className={`relative ${isHome ? 'w-full max-w-[520px] mx-auto' : 'flex-1 max-w-[360px]'}`}>
      <div
        className="flex items-center transition-all"
        style={{
          background: isHome ? '#FFFFFF' : '#F5F0E8',
          border: `1px solid ${open && results.length > 0 ? '#C4B49A' : (isHome ? '#E0D6CA' : '#E8DFD0')}`,
          borderRadius: open && results.length > 0 ? '12px 12px 0 0' : '12px',
          padding: isHome ? '16px 20px' : '8px 12px',
          boxShadow: isHome ? '0 2px 12px rgba(139, 115, 85, 0.06)' : 'none',
        }}
      >
        <svg
          width={isHome ? 20 : 14}
          height={isHome ? 20 : 14}
          viewBox="0 0 24 24"
          fill="none"
          stroke={isHome ? '#8B7355' : '#B0A08A'}
          strokeWidth="2"
          strokeLinecap="round"
          style={{ marginRight: isHome ? 12 : 8, flexShrink: 0 }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder={isHome ? 'Search by title or author...' : 'Search another book...'}
          className="flex-1 border-none bg-transparent"
          style={{
            fontSize: isHome ? 16 : 13,
            fontFamily: "var(--font-dm-sans), sans-serif",
            color: '#1A1A1A',
            letterSpacing: '-0.01em',
          }}
          autoFocus={isHome}
        />
        {loading && (
          <div
            className="rounded-full animate-spin"
            style={{
              width: isHome ? 16 : 12,
              height: isHome ? 16 : 12,
              border: '2px solid #E0D6CA',
              borderTopColor: '#8B7355',
            }}
          />
        )}
      </div>

      {open && results.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 overflow-hidden z-50"
          style={{
            background: '#FFFFFF',
            border: '1px solid #C4B49A',
            borderTop: '1px solid #EDE6DB',
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
            boxShadow: '0 8px 24px rgba(139, 115, 85, 0.1)',
          }}
        >
          {results.map((result, i) => (
            <button
              key={`${result.id}-${i}`}
              onClick={() => selectBook(result)}
              className="w-full flex items-center justify-between text-left transition-colors"
              style={{ padding: isHome ? '14px 20px' : '10px 14px' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F5EDE4'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <div className="flex items-center gap-3 min-w-0">
                {isHome && result.cover && (
                  <div className="flex-shrink-0 w-8 h-11 rounded overflow-hidden" style={{ background: '#F5F0E8' }}>
                    <Image
                      src={result.cover}
                      alt={result.title}
                      width={32}
                      height={44}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                )}
                <div className="min-w-0">
                  <span style={{ fontWeight: 500, fontSize: isHome ? 15 : 13 }}>{result.title}</span>
                  <span style={{ color: '#8B7355', fontSize: isHome ? 14 : 12, marginLeft: 8 }}>{result.author}</span>
                </div>
              </div>
              <span style={{ color: '#B0A08A', fontSize: isHome ? 13 : 12, flexShrink: 0 }}>
                {result.year > 0 ? result.year : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
