import { prisma } from './db';
import type { SearchResult } from '@/types';
import { highlightSnippet } from './utils';
import { semanticSearch } from './embeddings';

/**
 * Full-text search across documents.
 */
export async function fulltextSearch(
  query: string,
  limit: number = 20,
): Promise<SearchResult[]> {
  // Split into individual words and create an AND of contains for each word
  const words = query.split(/\s+/).filter((w) => w.length > 2);
  const orConditions = words.map((word) => ({
    OR: [
      { content: { contains: word } },
      { title: { contains: word } },
      { filename: { contains: word } },
    ],
  }));

  const documents = await prisma.document.findMany({
    where: {
      AND: orConditions.length > 0 ? orConditions : [{ content: { contains: query } }],
    },
    include: {
      keywords: {
        include: { keyword: true },
        orderBy: { score: 'desc' },
        take: 10,
      },
    },
    take: limit,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
return (documents as any[]).map((doc: any) => ({
    document: {
      id: doc.id,
      filename: doc.filename,
      filePath: doc.filePath,
      fileType: doc.fileType,
      title: doc.title,
      content: doc.content,
      source: doc.source,
      wordCount: doc.wordCount,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      indexedAt: doc.indexedAt?.toISOString() || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      keywords: (doc.keywords as any[]).map((dk: any) => ({
        keyword: {
          id: dk.keyword.id,
          word: dk.keyword.word,
          stem: dk.keyword.stem,
        },
        score: dk.score,
        count: dk.count,
      })),
    },
    score: 1, // Full-text doesn't have a numeric score
    snippet: highlightSnippet(doc.content, query),
    matchType: 'fulltext' as const,
  }));
}

/**
 * Combined search: tries full-text first, optionally blends with semantic results.
 */
export async function combinedSearch(
  query: string,
  options: { semantic?: boolean; limit?: number } = {},
): Promise<SearchResult[]> {
  const { semantic = false, limit = 20 } = options;

  const fulltextResults = await fulltextSearch(query, limit);

  if (!semantic) {
    return fulltextResults;
  }

  // Get semantic results
  const semanticResults = await semanticSearch(query, limit);

  // Get full documents for semantic results
  const semanticDocIds = semanticResults.map((r) => r.documentId);
  const existingIds = new Set(fulltextResults.map((r) => r.document.id));
  const newIds = semanticDocIds.filter((id) => !existingIds.has(id));

  const newDocs = await prisma.document.findMany({
    where: { id: { in: newIds } },
    include: {
      keywords: {
        include: { keyword: true },
        orderBy: { score: 'desc' },
        take: 10,
      },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
const semanticSearchResults: SearchResult[] = (newDocs as any[]).map((doc: any) => {
    const semResult = semanticResults.find((r) => r.documentId === doc.id);
    return {
      document: {
        id: doc.id,
        filename: doc.filename,
        filePath: doc.filePath,
        fileType: doc.fileType,
        title: doc.title,
        content: doc.content,
        source: doc.source,
        wordCount: doc.wordCount,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
        indexedAt: doc.indexedAt?.toISOString() || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        keywords: (doc.keywords as any[]).map((dk: any) => ({
          keyword: {
            id: dk.keyword.id,
            word: dk.keyword.word,
            stem: dk.keyword.stem,
          },
          score: dk.score,
          count: dk.count,
        })),
      },
      score: semResult?.score || 0,
      snippet: semResult?.snippet || doc.content.slice(0, 300),
      matchType: 'semantic' as const,
    };
  });

  // Merge: semantic scores for fulltext results, then semantic-only results
  return [...fulltextResults, ...semanticSearchResults].sort((a, b) => b.score - a.score);
}