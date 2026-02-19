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

export default function ChatWindow({ bookId, bookSources, bookTitle, questionPrompts, chunkCount }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [userHasSent, setUserHasSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    <div className="flex flex-col" style={{ paddingTop: 24, paddingBottom: 24, minHeight: 400 }}>
      {/* Messages area */}
      <div className="chat-scroll flex-1 flex flex-col gap-6 overflow-y-auto" style={{ maxHeight: 520, paddingBottom: 16 }}>

        {/* Opening state */}
        {showOpening && (
          <div className="animate-fade-up">
            {/* Header */}
            <div className="flex items-center gap-[10px] mb-3">
              <div
                className="flex items-center justify-center"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#2A2318',
                  border: '1px solid #4A3F32',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C4B49A" strokeWidth="2" strokeLinecap="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <span style={{ fontFamily: 'var(--font-instrument-serif), serif', fontSize: 20, color: '#1A1A1A' }}>
                Discuss <em>{bookTitle}</em>
              </span>
            </div>

            {/* Subtitle */}
            <p style={{ fontSize: 15, color: '#8B7355', lineHeight: 1.5, marginBottom: 24 }}>
              The companion has read {chunkCount > 0 ? chunkCount.toLocaleString() : 'various'} reviews, threads, and essays. Ask it anything.
            </p>

            {/* Question prompt grid */}
            {questionPrompts.length > 0 && (
              <div className="grid grid-cols-2 gap-[10px] mb-2">
                {questionPrompts.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="text-left transition-all"
                    style={{
                      background: 'transparent',
                      border: '1px solid #D4C4B0',
                      borderRadius: 12,
                      padding: '16px 18px',
                      fontSize: 14,
                      fontFamily: 'var(--font-dm-sans), sans-serif',
                      color: '#3D3428',
                      lineHeight: 1.45,
                      cursor: 'pointer',
                      gridColumn: i === questionPrompts.length - 1 && questionPrompts.length % 2 !== 0 ? '1 / -1' : 'auto',
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
            )}
          </div>
        )}

        {/* Chat messages */}
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
              <div style={{ fontSize: 11, color: '#B0A08A', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Companion
              </div>
            )}
            <div
              className={streaming && i === messages.length - 1 && msg.role === 'assistant' ? 'streaming-cursor' : ''}
              style={{
                background: msg.role === 'user' ? '#1A1A1A' : 'transparent',
                color: msg.role === 'user' ? '#FDFAF6' : '#1A1A1A',
                borderRadius: msg.role === 'user' ? 16 : 0,
                padding: msg.role === 'user' ? '12px 18px' : 0,
                fontSize: 15,
                fontFamily: 'var(--font-dm-sans), sans-serif',
                lineHeight: 1.65,
                whiteSpace: 'pre-line',
              }}
            >
              {msg.content}
            </div>
            {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && !streaming && (
              <div className="mt-[10px]">
                <SourceBadges sources={msg.sources} variant="inline" />
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {streaming && messages.length > 0 && messages[messages.length - 1].content === '' && (
          <div className="animate-fade-up">
            <div style={{ fontSize: 11, color: '#B0A08A', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Companion
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#C4B49A' }} />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={{ borderTop: '1px solid #EDE6DB', paddingTop: 16, marginTop: 8 }}>
        <div className="flex gap-[10px] items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={userHasSent ? 'Continue the conversation...' : `Ask about ${bookTitle}...`}
            rows={1}
            disabled={streaming}
            className="flex-1"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E0D6CA',
              borderRadius: 12,
              padding: '12px 16px',
              fontSize: 15,
              fontFamily: 'var(--font-dm-sans), sans-serif',
              lineHeight: 1.5,
              color: '#1A1A1A',
              minHeight: 46,
              maxHeight: 120,
              resize: 'none',
            }}
            onInput={e => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || streaming}
            className="flex-shrink-0 flex items-center justify-center transition-all"
            style={{
              background: input.trim() ? '#1A1A1A' : '#E0D6CA',
              color: input.trim() ? '#FDFAF6' : '#B0A08A',
              border: 'none',
              borderRadius: 12,
              width: 46,
              height: 46,
              cursor: input.trim() ? 'pointer' : 'default',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <div style={{ fontSize: 11, color: '#C4B49A', marginTop: 8, textAlign: 'center' }}>
          Powered by Claude · Sources verified against published reviews and criticism
        </div>
      </div>
    </div>
  );
}
