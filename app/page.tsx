import SearchBar from '@/components/SearchBar';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl mx-auto text-center space-y-8">
        {/* Wordmark */}
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-stone-100">
            Afterword
          </h1>
          <p className="mt-3 text-stone-400 text-lg">
            Discuss any book like you read it together.
          </p>
        </div>

        {/* Search */}
        <SearchBar />

        {/* Subtle hint */}
        <p className="text-stone-600 text-sm">
          Search for any book — we&apos;ll read the reviews so you don&apos;t have to.
        </p>
      </div>
    </main>
  );
}
