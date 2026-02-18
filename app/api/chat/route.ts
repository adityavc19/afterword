import { NextRequest, NextResponse } from 'next/server';
import { getKnowledge } from '@/lib/store';
import { retrieveChunks } from '@/lib/retrieval';
import { streamChat } from '@/lib/claude';
import { ChatMessage } from '@/types';

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    bookId: string;
    message: string;
    history: ChatMessage[];
  };

  const { bookId, message, history } = body;

  if (!bookId || !message) {
    return NextResponse.json({ error: 'bookId and message required' }, { status: 400 });
  }

  const knowledge = getKnowledge(bookId);
  if (!knowledge) {
    return NextResponse.json(
      { error: 'Book not ingested yet. Please visit the book page first.' },
      { status: 404 }
    );
  }

  // Retrieve relevant chunks for this message
  const retrievedChunks = retrieveChunks(message, knowledge.chunks, 8);

  // Build conversation history for Gemini (exclude the current message)
  const geminiHistory = history.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));

  const stream = await streamChat(
    knowledge.metadata,
    knowledge.sources,
    retrievedChunks,
    geminiHistory,
    message
  );

  // Include source attribution as a header
  const usedSources = [...new Set(retrievedChunks.map(c => c.source))];

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Sources': JSON.stringify(usedSources),
      'Transfer-Encoding': 'chunked',
    },
  });
}
