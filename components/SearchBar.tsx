'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { SearchResult, BookMetadata } from '@/types';

export default function SearchBar() {
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

  // Close dropdown when clicking outside
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
    setQuery(result.title);
    // Pass metadata via URL so the loading screen can start immediately
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

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search for a book or author..."
          className="w-full bg-stone-900 border border-stone-700 rounded-xl px-5 py-4 text-lg text-stone-100 placeholder-stone-500 focus:outline-none focus:border-stone-400 focus:bg-stone-800 transition-colors"
          autoFocus
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-stone-500 border-t-stone-300 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-stone-900 border border-stone-700 rounded-xl overflow-hidden shadow-2xl z-50">
          {results.map((result, i) => (
            <button
              key={`${result.id}-${i}`}
              onClick={() => selectBook(result)}
              className="w-full flex items-center gap-4 px-4 py-3 hover:bg-stone-800 transition-colors text-left group"
            >
              <div className="flex-shrink-0 w-10 h-14 bg-stone-800 rounded overflow-hidden">
                {result.cover ? (
                  <Image
                    src={result.cover}
                    alt={result.title}
                    width={40}
                    height={56}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-600 text-xs">📖</div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-stone-100 font-medium truncate group-hover:text-white">
                  {result.title}
                </p>
                <p className="text-stone-400 text-sm truncate">
                  {result.author}{result.year ? ` · ${result.year}` : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
