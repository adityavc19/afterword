import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import IngestionProgress from '@/components/IngestionProgress';
import { BookMetadata } from '@/types';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ metadata?: string }>;
}

export default async function LoadingPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { metadata: metadataParam } = await searchParams;

  if (!metadataParam) {
    notFound();
  }

  let metadata: BookMetadata;
  try {
    metadata = JSON.parse(decodeURIComponent(metadataParam)) as BookMetadata;
  } catch {
    notFound();
  }

  return (
    <Suspense>
      <IngestionProgress bookId={id} metadata={metadata} />
    </Suspense>
  );
}
