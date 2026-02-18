interface Props {
  sources: string[];
}

const SOURCE_COLORS: Record<string, string> = {
  Goodreads: 'bg-amber-950/50 text-amber-400 border-amber-900',
  Reddit: 'bg-orange-950/50 text-orange-400 border-orange-900',
  'The Guardian': 'bg-blue-950/50 text-blue-400 border-blue-900',
  'Literary Hub': 'bg-purple-950/50 text-purple-400 border-purple-900',
};

const DEFAULT_COLOR = 'bg-stone-800 text-stone-400 border-stone-700';

export default function SourceBadges({ sources }: Props) {
  if (sources.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-stone-600 text-xs">Sources:</span>
        <span className="text-stone-600 text-xs italic">Training knowledge only</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-stone-600 text-xs">Sources:</span>
      {sources.map(source => (
        <span
          key={source}
          className={`text-xs px-2 py-0.5 rounded-full border ${SOURCE_COLORS[source] ?? DEFAULT_COLOR}`}
        >
          {source}
        </span>
      ))}
    </div>
  );
}
