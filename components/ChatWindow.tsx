'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/types';
import SourceBadges from './SourceBadges';

interface Props {
  bookId: string;
  bookSources: string[];
  bookTitle: string;
  questionPrompts: string[];
  chunkCount: number;
}

const FALLBACK_PROMPTS = [
  'What stayed with you after finishing?',
  'Which character felt most real to you?',
  'Was there a moment that changed how you read the rest?',
  'Would you recommend this to a friend? Why or why not?',
];

export default function ChatWindow({ bookId, bookSources, bookTitle, questionPrompts, chunkCount }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [userHasSent, setUserHasSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const displayPrompts = questionPrompts.length > 0 ? questionPrompts : FALLBACK_PROMPTS;

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streaming]);

  async function sendMessage(text?: string) {
    const userMessage = (text ?? input).trim();
    if (!userMessage || streaming) return;

    setInput('');
    setStreaming(true);
    setUserHasSent(true);

    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setMessages(prev => [...prev, { role: 'assistant', content: '', sources: [] }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, message: userMessage, history }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: err.error ?? 'Something went wrong.', sources: [] };
          return updated;
        });
        setStreaming(false);
        return;
      }

      const sourcesHeader = res.headers.get('X-Sources');
      const sources = sourcesHeader ? JSON.parse(sourcesHeader) as string[] : [];

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) { setStreaming(false); return; }

      let accumulated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const finalText = accumulated;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: finalText, sources };
          return updated;
        });
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: 'Connection error. Please try again.', sources: [] };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const showOpening = !userHasSent && messages.length === 0 && !streaming;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Persistent mini-header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 20px',
          borderBottom: '1px solid #EDE6DB',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: '#2A2318',
            border: '1px solid #4A3F32',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C4B49A" strokeWidth="2" strokeLinecap="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <span style={{ fontFamily: 'var(--font-instrument-serif), serif', fontSize: 17, color: '#1A1A1A' }}>
          Discuss <em>{bookTitle}</em>
        </span>
        <span style={{ fontSize: 11, color: '#B0A08A', marginLeft: 'auto' }}>
          {chunkCount > 0 ? `${chunkCount} sources` : ''}
        </span>
      </div>

      {/* Scrollable messages area */}
      <div
        className="chat-scroll"
        style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 8px', display: 'flex', flexDirection: 'column', gap: 20 }}
      >
        {/* Opening state — question prompts */}
        {showOpening && (
          <div className="animate-fade-up" style={{ maxWidth: 560 }}>
            <p style={{ fontSize: 14, color: '#8B7355', lineHeight: 1.5, marginBottom: 20 }}>
              Ask anything about this book — the companion has absorbed reviews, criticism, and reader discussions.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {displayPrompts.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="text-left transition-all"
                  style={{
                    background: 'transparent',
                    border: '1px solid #D4C4B0',
                    borderRadius: 10,
                    padding: '12px 14px',
                    fontSize: 13,
                    fontFamily: 'var(--font-dm-sans), sans-serif',
                    color: '#3D3428',
                    lineHeight: 1.4,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = '#F5EDE4';
                    (e.currentTarget as HTMLElement).style.borderColor = '#B0A08A';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.borderColor = '#D4C4B0';
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className="animate-fade-up"
            style={{
              maxWidth: msg.role === 'user' ? '85%' : '100%',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            {msg.role === 'assistant' && (
              <div style={{ fontSize: 10, color: '#B0A08A', marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Companion
              </div>
            )}
            <div
              className={streaming && i === messages.length - 1 && msg.role === 'assistant' ? 'streaming-cursor' : ''}
              style={{
                background: msg.role === 'user' ? '#1A1A1A' : 'transparent',
                color: msg.role === 'user' ? '#FDFAF6' : '#1A1A1A',
                borderRadius: msg.role === 'user' ? 16 : 0,
                padding: msg.role === 'user' ? '10px 16px' : 0,
                fontSize: 14,
                fontFamily: 'var(--font-dm-sans), sans-serif',
                lineHeight: 1.7,
                whiteSpace: 'pre-line',
              }}
            >
              {msg.content}
            </div>
            {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && !streaming && (
              <div style={{ marginTop: 8 }}>
                <SourceBadges sources={msg.sources} variant="inline" />
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {streaming && messages.length > 0 && messages[messages.length - 1].content === '' && (
          <div className="animate-fade-up">
            <div style={{ fontSize: 10, color: '#B0A08A', marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Companion
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="typing-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#C4B49A' }} />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input — pinned at bottom */}
      <div style={{ padding: '12px 20px 16px', borderTop: '1px solid #EDE6DB', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={userHasSent ? 'Continue the conversation...' : `What stayed with you?`}
            rows={1}
            disabled={streaming}
            style={{
              flex: 1,
              background: '#FFFFFF',
              border: '1px solid #E0D6CA',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 14,
              fontFamily: 'var(--font-dm-sans), sans-serif',
              lineHeight: 1.5,
              color: '#1A1A1A',
              minHeight: 42,
              maxHeight: 100,
              resize: 'none',
            }}
            onInput={e => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || streaming}
            style={{
              background: input.trim() ? '#1A1A1A' : '#E0D6CA',
              color: input.trim() ? '#FDFAF6' : '#B0A08A',
              border: 'none',
              borderRadius: 10,
              width: 42,
              height: 42,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: input.trim() ? 'pointer' : 'default',
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <div style={{ fontSize: 10, color: '#C4B49A', marginTop: 6, textAlign: 'center' }}>
          Powered by Claude · Sources verified against published reviews and criticism
        </div>
      </div>
    </div>
  );
}
