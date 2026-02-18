import SearchBar from '@/components/SearchBar';

export default function HomePage() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/afterword-bg.jpeg')" }}
      />
      {/* Dark overlay to ensure text readability */}
      <div className="absolute inset-0 bg-stone-950/70" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl mx-auto text-center space-y-8">
        {/* Wordmark */}
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-stone-100">
            Afterword
          </h1>
          <p className="mt-3 text-stone-300 text-lg">
            Discuss any book like you read it together.
          </p>
        </div>

        {/* Search */}
        <SearchBar />

        {/* Subtle hint */}
        <p className="text-stone-300 text-sm">
          Search for any book — we&apos;ll read the reviews so you don&apos;t have to.
        </p>
      </div>
    </main>
  );
}
