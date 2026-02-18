export interface BookMetadata {
  id: string; // Open Library work ID e.g. "OL123W"
  title: string;
  author: string;
  year: number;
  cover: string; // Cover image URL
  synopsis: string;
  genre: string[];
  pageCount: number;
  goodreadsRating?: number;
  ratingsCount?: number;
}

export interface Chunk {
  id: string;
  content: string;
  source: string; // Display name e.g. "Goodreads", "The Guardian"
  sourceUrl?: string;
  type: 'reader_review' | 'critic_review' | 'author_interview' | 'community_discussion';
  rating?: number; // For Goodreads reviews (1-5)
}

export interface InterpretiveLandscape {
  criticConsensus: string;
  readerSentiment: string;
  theDebate: string;
}

export interface BookKnowledge {
  metadata: BookMetadata;
  chunks: Chunk[];
  interpretiveLandscape: InterpretiveLandscape;
  ingestedAt: number;
  sources: string[]; // List of successfully ingested source names
}

export interface IngestionEvent {
  step: string;
  status: 'pending' | 'loading' | 'done' | 'failed';
  quote?: string; // Ambient quote to show during loading
  landscape?: InterpretiveLandscape; // Sent with final 'done' event
  sources?: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

export interface SearchResult {
  id: string;
  title: string;
  author: string;
  year: number;
  cover: string;
}
