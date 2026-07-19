export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

export function highlightSnippet(text: string, query: string, contextWords: number = 8): string {
  const words = text.split(/\s+/);
  const queryLower = query.toLowerCase();
  const matchIndex = words.findIndex((w) => w.toLowerCase().includes(queryLower));

  if (matchIndex === -1) {
    return truncate(text, 200);
  }

  const start = Math.max(0, matchIndex - contextWords);
  const end = Math.min(words.length, matchIndex + contextWords + 1);
  const snippet = words.slice(start, end).join(' ');

  return (start > 0 ? '...' : '') + snippet + (end < words.length ? '...' : '');
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}