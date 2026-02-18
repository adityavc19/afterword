import { BookKnowledge } from '@/types';

declare global {
  // eslint-disable-next-line no-var
  var bookStore: Map<string, BookKnowledge> | undefined;
}

// Anchored to globalThis so it survives Next.js module re-evaluations in dev.
const store: Map<string, BookKnowledge> =
  globalThis.bookStore ?? (globalThis.bookStore = new Map());

export function getKnowledge(bookId: string): BookKnowledge | undefined {
  return store.get(bookId);
}

export function setKnowledge(bookId: string, knowledge: BookKnowledge): void {
  store.set(bookId, knowledge);
}

export function hasKnowledge(bookId: string): boolean {
  return store.has(bookId);
}
