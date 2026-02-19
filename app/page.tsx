'use client';

import SearchBar from '@/components/SearchBar';

export default function HomePage() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden" style={{ padding: '40px 24px' }}>
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/afterword-bg.jpeg')" }}
      />
      {/* Warm cream overlay */}
      <div className="absolute inset-0" style={{ background: 'rgba(253, 250, 246, 0.25)' }} />

      {/* Content */}
      <div className="relative z-10 w-full flex flex-col items-center animate-fade-up">
        {/* Logo */}
        <div
          style={{
            fontFamily: 'var(--font-instrument-serif), serif',
            fontSize: 28,
            letterSpacing: '0.14em',
            color: '#1A1A1A',
            marginBottom: 80,
            textTransform: 'uppercase',
            fontWeight: 400,
          }}
        >
          Afterword
        </div>

        {/* Tagline */}
        <h1
          style={{
            fontFamily: 'var(--font-instrument-serif), serif',
            fontSize: 'clamp(32px, 5vw, 56px)',
            fontWeight: 400,
            textAlign: 'center',
            lineHeight: 1.15,
            maxWidth: 600,
            marginBottom: 48,
            color: '#1A1A1A',
          }}
        >
          Discuss any book like you<br />
          <em style={{ fontStyle: 'italic' }}>read it together.</em>
        </h1>

        {/* Search */}
        <SearchBar variant="home" />

        {/* Curated suggestions */}
        <div className="flex gap-2 flex-wrap justify-center" style={{ marginTop: 48, maxWidth: 520 }}>
          {['Never Let Me Go', 'Educated', 'Project Hail Mary'].map(title => (
            <button
              key={title}
              className="transition-all cursor-pointer"
              style={{
                background: 'rgba(255, 255, 255, 0.85)',
                border: '1px solid #E0D6CA',
                borderRadius: 20,
                padding: '8px 16px',
                fontSize: 13,
                color: '#5A4F40',
                fontWeight: 500,
                fontFamily: 'var(--font-dm-sans), sans-serif',
                backdropFilter: 'blur(4px)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(245, 237, 228, 0.95)';
                (e.currentTarget as HTMLElement).style.borderColor = '#C4B49A';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.85)';
                (e.currentTarget as HTMLElement).style.borderColor = '#E0D6CA';
              }}
            >
              {title}
            </button>
          ))}
        </div>

      </div>

      {/* Footer — pinned to bottom of page */}
      <div
        className="absolute bottom-8 z-10"
        style={{
          fontSize: 12,
          color: '#5A4F40',
          letterSpacing: '0.04em',
          fontWeight: 500,
          background: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(4px)',
          padding: '6px 14px',
          borderRadius: 20,
        }}
      >
        Made by Aurora Labs
      </div>
    </main>
  );
}
