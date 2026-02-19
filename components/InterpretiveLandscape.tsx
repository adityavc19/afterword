import { InterpretiveLandscape as ILType } from '@/types';

interface Props {
  landscape: ILType;
}

const CATEGORIES = [
  {
    label: 'Critics',
    key: 'criticConsensus' as const,
    color: '#8B7355',
    bgColor: '#EDE4D6',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    label: 'Readers',
    key: 'readerSentiment' as const,
    color: '#6B8B73',
    bgColor: '#DDE8DF',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'The debate',
    key: 'theDebate' as const,
    color: '#7B6B8B',
    bgColor: '#E4DDE8',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

export default function InterpretiveLandscape({ landscape }: Props) {
  return (
    <div
      style={{
        padding: 24,
        margin: '0 -24px',
        background: '#F5F0E8',
        borderTop: '1px solid #E8DFD0',
        borderBottom: '1px solid #E8DFD0',
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-instrument-serif), serif',
          fontSize: 13,
          fontWeight: 400,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: '#8B7355',
          marginBottom: 20,
        }}
      >
        How This Book Is Read
      </h2>

      <div className="flex flex-col gap-[18px]">
        {CATEGORIES.map(({ label, key, color, bgColor, icon }) => (
          <div
            key={label}
            className="flex gap-[14px] items-start"
            style={{
              background: '#FDFAF6',
              borderRadius: 10,
              padding: '14px 16px',
              border: '1px solid #E8DFD0',
            }}
          >
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: bgColor,
                color,
              }}
            >
              {icon}
            </div>
            <div className="flex-1">
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                {label}
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: '#3D3428' }}>
                {landscape[key]}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
