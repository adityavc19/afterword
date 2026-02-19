import Anthropic from '@anthropic-ai/sdk';
import { Chunk, BookMetadata, InterpretiveLandscape } from '@/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildSystemPrompt(metadata: BookMetadata, retrievedChunks: Chunk[], sources: string[]): string {
  const chunksByType = {
    reader_review: retrievedChunks.filter(c => c.type === 'reader_review'),
    critic_review: retrievedChunks.filter(c => c.type === 'critic_review'),
    author_interview: retrievedChunks.filter(c => c.type === 'author_interview'),
    community_discussion: retrievedChunks.filter(c => c.type === 'community_discussion'),
  };

  const sourceList = sources.length > 0 ? sources.join(', ') : 'limited sources available';

  let prompt = `You are a knowledgeable book companion for "${metadata.title}" by ${metadata.author}${metadata.year ? ` (${metadata.year})` : ''}.

You have access to the following knowledge sources: ${sourceList}
${chunksByType.reader_review.length > 0 ? `- Goodreads: ${chunksByType.reader_review.length} reader reviews` : ''}
${chunksByType.critic_review.length > 0 ? `- Critical reviews from literary press` : ''}
${chunksByType.community_discussion.length > 0 ? `- Reddit discussions` : ''}
${chunksByType.author_interview.length > 0 ? `- Author interviews` : ''}
${sources.length === 0 ? '- Note: Limited online discussion was found — drawing on training knowledge directly.' : ''}

Your role is to help the user process, understand, and discuss this book — as a thoughtful companion who has read it and absorbed the discourse around it.

Core principles:
- Assume the user has finished the book. Discuss freely, including the ending.
- Do NOT summarise the plot unless explicitly asked — the user knows it.
- Be specific. Reference actual scenes, passages, characters, structural choices.
- Surface interpretive tensions: where readers disagree, where critics diverge from audiences, where the book resists easy reading.
- When drawing from sources, weave them in naturally: "Goodreads readers broadly felt...", "The Guardian argues...", "Reddit discussions often circle around..."
- Never just tell the user what something means. Offer readings. Ask questions. Help them arrive at their own synthesis.
- Match the user's energy: analytical, emotional, casual — whatever they bring.
- If sources are limited, be transparent: "There isn't much critical coverage of this one, but..."
- Keep responses conversational and focused — not lecture-length.`;

  if (retrievedChunks.length > 0) {
    const contextBlock = retrievedChunks.map(chunk => {
      const sourceLabel = chunk.rating ? `${chunk.source} (${chunk.rating}★)` : chunk.source;
      return `--- ${sourceLabel} ---\n${chunk.content}`;
    }).join('\n\n');
    prompt += `\n\nRelevant source passages:\n${contextBlock}`;
  } else {
    prompt += '\n\n[No specific source passages retrieved for this query — draw on your training knowledge about this book.]';
  }

  return prompt;
}

export async function streamChat(
  metadata: BookMetadata,
  sources: string[],
  retrievedChunks: Chunk[],
  history: { role: string; content: string }[],
  userMessage: string
): Promise<ReadableStream<Uint8Array>> {
  const systemPrompt = buildSystemPrompt(metadata, retrievedChunks, sources);

  // Claude requires alternating user/assistant turns
  const messages: Anthropic.MessageParam[] = [
    ...history.map(msg => ({
      role: (msg.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
    stream: true,
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of response) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
  });
}

export async function generateLandscapeAndPrompts(
  metadata: BookMetadata,
  chunks: Chunk[]
): Promise<{ landscape: InterpretiveLandscape; questionPrompts: string[] }> {
  if (chunks.length === 0) {
    return {
      landscape: {
        criticConsensus: 'Limited critical coverage found.',
        readerSentiment: 'Reader responses vary widely.',
        theDebate: 'No strong consensus found in online discussion.',
      },
      questionPrompts: [],
    };
  }

  const sampleChunks = chunks
    .slice(0, 20)
    .map(c => `[${c.source} — ${c.type}]\n${c.content}`)
    .join('\n\n---\n\n');

  const prompt = `You are analyzing reader and critic responses to "${metadata.title}" by ${metadata.author}.

Based on the following source excerpts:

1. Write THREE very concise summaries (STRICTLY 1-2 sentences each, max 50 words each):
   - CRITICS: What is the critical consensus in one line?
   - READERS: What is the dominant reader sentiment in one line?
   - THE DEBATE: What is the single biggest point of disagreement?

2. Generate exactly 5 SHORT discussion questions (max 15 words each). These are displayed as clickable buttons in a UI — they must be brief. Examples of good length: "Why don't the students ever try to escape?", "Is Kathy a reliable narrator or in deep denial?", "What's the significance of the Judy Bridgewater tape?". Be specific to THIS book.

Be specific and grounded in the sources. Keep the three summaries SHORT — they are displayed as UI cards, not paragraphs.

Return ONLY a JSON object in this format (no markdown, no backticks):
{"criticConsensus": "...", "readerSentiment": "...", "theDebate": "...", "questionPrompts": ["...", "...", "...", "...", "..."]}

Source excerpts:
${sampleChunks}`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    const jsonText = text.replace(/^```json?\s*/i, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(jsonText);
    return {
      landscape: {
        criticConsensus: parsed.criticConsensus,
        readerSentiment: parsed.readerSentiment,
        theDebate: parsed.theDebate,
      },
      questionPrompts: parsed.questionPrompts ?? [],
    };
  } catch (err) {
    console.log('[Claude] landscape generation failed:', err);
    return {
      landscape: {
        criticConsensus: 'Critical perspectives vary across sources.',
        readerSentiment: 'Reader responses are divided.',
        theDebate: 'Multiple interpretations coexist in the discourse around this book.',
      },
      questionPrompts: [],
    };
  }
}
