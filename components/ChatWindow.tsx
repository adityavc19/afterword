'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/types';
import SourceBadges from './SourceBadges';

interface Props {
  bookId: string;
  bookSources: string[];
}

export default function ChatWindow({ bookId, bookSources }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'What stayed with you?',
      sources: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [currentSources, setCurrentSources] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  async function sendMessage() {
    if (!input.trim() || streaming) return;

    const userMessage = input.trim();
    setInput('');
    setStreaming(true);
    setCurrentSources([]);

    const history = messages.filter(m => m.content !== 'What stayed with you?' || m.role !== 'assistant');

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    // Add empty assistant message to stream into
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
          updated[updated.length - 1] = {
            role: 'assistant',
            content: err.error ?? 'Something went wrong. Please try again.',
            sources: [],
          };
          return updated;
        });
        setStreaming(false);
        return;
      }

      // Get sources from header
      const sourcesHeader = res.headers.get('X-Sources');
      const sources = sourcesHeader ? JSON.parse(sourcesHeader) as string[] : [];
      setCurrentSources(sources);

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
          updated[updated.length - 1] = {
            role: 'assistant',
            content: finalText,
            sources,
          };
          return updated;
        });
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Connection error. Please try again.',
          sources: [],
        };
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

  return (
    <div className="flex flex-col h-full bg-stone-900/30 border border-stone-800 rounded-xl overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] ${
                msg.role === 'user'
                  ? 'bg-stone-800 text-stone-100 rounded-2xl rounded-tr-sm px-4 py-3'
                  : 'text-stone-200'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="text-xs text-stone-600 font-medium mb-2 uppercase tracking-wider">
                  Companion
                </div>
              )}
              <p
                className={`leading-relaxed whitespace-pre-wrap ${
                  streaming && i === messages.length - 1 && msg.role === 'assistant' && !msg.content
                    ? 'streaming-cursor'
                    : ''
                } ${
                  streaming && i === messages.length - 1 && msg.role === 'assistant' && msg.content
                    ? 'streaming-cursor'
                    : ''
                }`}
              >
                {msg.content || (streaming && i === messages.length - 1 ? '' : '…')}
              </p>
              {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && !streaming && (
                <div className="mt-3">
                  <SourceBadges sources={msg.sources} />
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-stone-800 p-4">
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share your thoughts..."
            rows={1}
            className="flex-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-stone-500 resize-none max-h-32 transition-colors text-sm"
            disabled={streaming}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || streaming}
            className="flex-shrink-0 bg-stone-700 hover:bg-stone-600 disabled:opacity-40 disabled:cursor-not-allowed text-stone-100 rounded-xl px-4 py-3 text-sm font-medium transition-colors"
          >
            {streaming ? (
              <div className="w-4 h-4 border-2 border-stone-400 border-t-stone-200 rounded-full animate-spin" />
            ) : (
              'Send'
            )}
          </button>
        </div>
        <div className="mt-3">
          <SourceBadges sources={bookSources} />
        </div>
      </div>
    </div>
  );
}
