const SOURCE_ICONS: Record<string, string> = {
  Goodreads: '★',
  Reddit: '◉',
  'The Guardian': '▤',
  'Literary Hub': '▣',
  'Paris Review': '◈',
};

interface Props {
  sources: string[];
  variant?: 'bar' | 'inline';
  label?: string;
}

export default function SourceBadges({ sources, variant = 'bar', label }: Props) {
  const displayLabel = label ?? (variant === 'bar' ? 'Sources ingested:' : 'Drew from:');

  if (sources.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 12, color: '#B0A08A' }}>{displayLabel}</span>
        <span style={{ fontSize: 12, color: '#B0A08A', fontStyle: 'italic' }}>Training knowledge only</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {variant === 'bar' && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B0A08A" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 2 }}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      )}
      <span style={{ fontSize: variant === 'bar' ? 12 : 11, color: variant === 'bar' ? '#B0A08A' : '#C4B49A', marginRight: 4 }}>
        {displayLabel}
      </span>
      {sources.map(source => (
        <span
          key={source}
          className="flex items-center gap-1 transition-colors"
          style={{
            fontSize: 11,
            color: '#6B5D4D',
            background: '#F5EDE4',
            padding: variant === 'bar' ? '4px 10px' : '2px 8px',
            borderRadius: variant === 'bar' ? 12 : 8,
            cursor: 'default',
          }}
        >
          {SOURCE_ICONS[source] && (
            <span style={{ fontSize: 10, opacity: 0.6 }}>{SOURCE_ICONS[source]}</span>
          )}
          {source}
        </span>
      ))}
    </div>
  );
}
