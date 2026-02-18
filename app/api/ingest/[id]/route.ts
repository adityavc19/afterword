import { NextRequest } from 'next/server';
import { BookMetadata, IngestionEvent } from '@/types';
import { hasKnowledge, getKnowledge } from '@/lib/store';
import { ingestBook } from '@/lib/ingest';

function sseEvent(event: IngestionEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const metadataParam = url.searchParams.get('metadata');

  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  };

  // Already ingested — return immediately
  if (hasKnowledge(id)) {
    const knowledge = getKnowledge(id)!;
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(
            sseEvent({
              step: 'Ready',
              status: 'done',
              landscape: knowledge.interpretiveLandscape,
              sources: knowledge.sources,
            })
          )
        );
        controller.close();
      },
    });
    return new Response(stream, { headers });
  }

  // Parse metadata from query param
  let metadata: BookMetadata | null = null;
  if (metadataParam) {
    try {
      metadata = JSON.parse(decodeURIComponent(metadataParam));
    } catch {
      metadata = null;
    }
  }

  if (!metadata) {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(sseEvent({ step: 'Error: metadata missing', status: 'failed' }))
        );
        controller.close();
      },
    });
    return new Response(stream, { headers });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        await ingestBook(metadata!, (event: IngestionEvent) => {
          controller.enqueue(encoder.encode(sseEvent(event)));
        });
      } catch (err) {
        console.error('[Ingest] Error:', err);
        controller.enqueue(
          encoder.encode(sseEvent({ step: 'Ingestion failed', status: 'failed' }))
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers });
}
