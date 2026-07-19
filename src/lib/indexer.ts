import natural from 'natural';
import { prisma } from './db';
import { parseFile, detectSource } from './parser';

const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

// Common English stopwords
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'dare',
  'ought', 'used', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he',
  'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their',
  'this', 'that', 'these', 'those', 'am', 'not', 'no', 'nor', 'so',
  'if', 'then', 'than', 'too', 'very', 'just', 'about', 'above',
  'after', 'again', 'all', 'also', 'any', 'as', 'because', 'before',
  'between', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
  'such', 'only', 'own', 'same', 'into', 'over', 'under', 'up', 'down',
  'out', 'off', 'here', 'there', 'when', 'where', 'why', 'how', 'which',
  'who', 'whom', 'what', 'now', 'much', 'many',
]);

const TOP_KEYWORDS_PER_DOC = 25;

interface TermDoc {
  term: string;
  stem: string;
  count: number;
}

/**
 * Tokenize text into meaningful terms, removing stopwords and short tokens.
 */
function tokenize(text: string): TermDoc[] {
  const tokens = tokenizer.tokenize(text.toLowerCase()) || [];
  const termMap = new Map<string, { stem: string; count: number }>();

  for (const token of tokens) {
    // Skip stopwords, numbers, and very short tokens
    if (STOPWORDS.has(token)) continue;
    if (token.length < 3) continue;
    if (/^\d+$/.test(token)) continue;

    const stem = stemmer.stem(token);
    const existing = termMap.get(stem);
    if (existing) {
      existing.count++;
    } else {
      termMap.set(stem, { stem, count: 1 });
    }
  }

  return Array.from(termMap.entries()).map(([term, { stem, count }]) => ({
    term,
    stem,
    count,
  }));
}

/**
 * Calculate TF-IDF scores for terms within a document relative to a corpus.
 */
function calculateTfIdf(
  docTerms: TermDoc[],
  corpusDocFreq: Map<string, number>,
  totalDocs: number,
): { term: string; stem: string; score: number; count: number }[] {
  const totalTerms = docTerms.reduce((sum, t) => sum + t.count, 0);

  return docTerms.map(({ term, stem, count }) => {
    const tf = count / totalTerms;
    const df = corpusDocFreq.get(stem) || 1;
    const idf = Math.log((totalDocs + 1) / (df + 1)) + 1;
    const score = tf * idf;
    return { term, stem, score, count };
  });
}

/**
 * Main indexing function: parses a file, extracts keywords, and stores everything.
 */
export async function indexFile(filePath: string): Promise<string> {
  const parsed = await parseFile(filePath);
  return indexContent(filePath, parsed);
}

/**
 * Index in-memory content (for LLM imports and other non-file sources).
 * Uses a virtual file path derived from the title.
 */
export async function indexContent(
  virtualPath: string,
  parsed: import('@/types').ParsedDocument & {
    model?: string;
    messageCount?: number;
  },
): Promise<string> {
  const source = parsed.source || detectSource(parsed.content, virtualPath);

  // Check if document already exists (update) or create new
  const existing = await prisma.document.findUnique({
    where: { filePath: virtualPath },
  });

  const document = await prisma.document.upsert({
    where: { filePath: virtualPath },
    create: {
      filename: virtualPath.split('/').pop() || virtualPath,
      filePath: virtualPath,
      fileType: parsed.fileType,
      title: parsed.title,
      content: parsed.content,
      source,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: (parsed as any).model || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messageCount: (parsed as any).messageCount || 0,
      wordCount: parsed.content.split(/\s+/).length,
    },
    update: {
      filename: virtualPath.split('/').pop() || virtualPath,
      fileType: parsed.fileType,
      title: parsed.title,
      content: parsed.content,
      source,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: (parsed as any).model || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messageCount: (parsed as any).messageCount || 0,
      wordCount: parsed.content.split(/\s+/).length,
      updatedAt: new Date(),
    },
  });

  // 3. If updating, remove old keyword associations
  if (existing) {
    await prisma.documentKeyword.deleteMany({
      where: { documentId: document.id },
    });
  }

  // 4. Tokenize and extract keywords
  const docTerms = tokenize(parsed.content);

  // Get corpus document frequencies for IDF calculation
  const allDocs = await prisma.document.findMany({
    select: { id: true },
  });
  const totalDocs = allDocs.length;

  // Get all existing keywords for DF calculation
  const allKeywords = await prisma.keyword.findMany({
    select: { stem: true },
  });
  const corpusDf = new Map<string, number>();
  for (const kw of allKeywords) {
    corpusDf.set(kw.stem, (corpusDf.get(kw.stem) || 0) + 1);
  }
  // Add current doc terms to DF
  for (const { stem } of docTerms) {
    corpusDf.set(stem, (corpusDf.get(stem) || 0) + 1);
  }

  // Calculate TF-IDF and get top keywords
  const tfidfScores = calculateTfIdf(docTerms, corpusDf, totalDocs);
  const topKeywords = tfidfScores
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_KEYWORDS_PER_DOC);

  // 5. Upsert keywords and create document-keyword associations
  const keywordIds: string[] = [];
  for (const { term, stem, score, count } of topKeywords) {
    const keyword = await prisma.keyword.upsert({
      where: { word: term },
      create: {
        word: term,
        stem,
        count: count,
      },
      update: {
        count: { increment: count },
      },
    });

    await prisma.documentKeyword.create({
      data: {
        documentId: document.id,
        keywordId: keyword.id,
        score,
        count,
      },
    });

    keywordIds.push(keyword.id);
  }

  // 6. Build co-occurrence edges between keywords in this document
  await buildEdges(keywordIds);

  // 7. Mark as indexed
  await prisma.document.update({
    where: { id: document.id },
    data: { indexedAt: new Date() },
  });

  // 8. Update global TF-IDF for all keywords
  await updateGlobalTfIdf();

  return document.id;
}

/**
 * Build or update co-occurrence edges between keywords.
 */
async function buildEdges(keywordIds: string[]): Promise<void> {
  for (let i = 0; i < keywordIds.length; i++) {
    for (let j = i + 1; j < keywordIds.length; j++) {
      const sourceId = keywordIds[i];
      const targetId = keywordIds[j];

      // Ensure consistent ordering (smaller ID first)
      const [sId, tId] = sourceId < targetId ? [sourceId, targetId] : [targetId, sourceId];

      const existing = await prisma.keywordEdge.findUnique({
        where: { sourceId_targetId: { sourceId: sId, targetId: tId } },
      });

      if (existing) {
        await prisma.keywordEdge.update({
          where: { id: existing.id },
          data: { weight: { increment: 1 } },
        });
      } else {
        await prisma.keywordEdge.create({
          data: {
            sourceId: sId,
            targetId: tId,
            weight: 1,
          },
        });
      }
    }
  }
}

/**
 * Update global TF-IDF scores for all keywords.
 */
async function updateGlobalTfIdf(): Promise<void> {
  const totalDocs = await prisma.document.count();
  if (totalDocs === 0) return;

  const keywords = await prisma.keyword.findMany({
    include: {
      documents: { select: { documentId: true } },
    },
  });

  for (const kw of keywords) {
    const df = kw.documents.length;
    const idf = Math.log((totalDocs + 1) / (df + 1)) + 1;
    await prisma.keyword.update({
      where: { id: kw.id },
      data: { tfidf: idf },
    });
  }
}

/**
 * Re-index all documents in the database.
 */
export async function reindexAll(): Promise<number> {
  const docs = await prisma.document.findMany();
  let count = 0;

  for (const doc of docs) {
    try {
      await indexFile(doc.filePath);
      count++;
    } catch (err) {
      console.error(`Failed to reindex ${doc.filePath}:`, err);
    }
  }

  return count;
}

/**
 * Delete a document and clean up orphaned keywords and edges.
 */
export async function deleteDocument(id: string): Promise<void> {
  const doc = await prisma.document.findUnique({
    where: { id },
    include: { keywords: true },
  });

  if (!doc) return;

  // Get keyword IDs associated with this document
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
const keywordIds = (doc.keywords as any[]).map((dk) => dk.keywordId as string);

  // Delete the document (cascades to DocumentKeyword)
  await prisma.document.delete({ where: { id } });

  // Clean up keywords that have no more documents
  for (const kwId of keywordIds) {
    const remaining = await prisma.documentKeyword.count({
      where: { keywordId: kwId },
    });
    if (remaining === 0) {
      // Delete edges involving this keyword
      await prisma.keywordEdge.deleteMany({
        where: {
          OR: [{ sourceId: kwId }, { targetId: kwId }],
        },
      });
      // Delete the keyword itself
      await prisma.keyword.delete({ where: { id: kwId } });
    }
  }
}