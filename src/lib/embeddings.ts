import { prisma } from './db';

const CHUNK_SIZE = 400; // words per chunk

/**
 * Split text into overlapping chunks of roughly equal word count.
 */
function chunkContent(content: string): string[] {
  const words = content.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += Math.floor(CHUNK_SIZE * 0.75)) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(' ');
    if (chunk.length > 20) {
      chunks.push(chunk);
    }
    if (i + CHUNK_SIZE >= words.length) break;
  }

  return chunks;
}

/**
 * Try to load transformers.js pipeline. Returns null if not available.
 */
async function tryLoadPipeline(): Promise<((text: string, opts: Record<string, unknown>) => Promise<{ data: Float32Array }>) | null> {
  try {
    // Dynamic import - won't fail at build time for missing optional dep
    const mod = await Function('return import("@xenova/transformers")')() as { pipeline: unknown } | undefined;
    if (!mod) return null;
    const extractor = await (mod.pipeline as (
      task: string,
      model: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) => Promise<any>)('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    return (text: string, opts: Record<string, unknown>) => extractor(text, opts);
  } catch {
    return null;
  }
}

let pipelinePromise: ReturnType<typeof tryLoadPipeline> | null = null;

/**
 * Generate embeddings for a document's content chunks using local transformers.
 * Returns an array of embedding vectors (number[][]). Returns empty if not available.
 */
export async function generateEmbeddings(text: string): Promise<number[][]> {
  if (!pipelinePromise) {
    pipelinePromise = tryLoadPipeline();
  }

  const extractor = await pipelinePromise;
  if (!extractor) return [];

  try {
    const chunks = chunkContent(text);
    const embeddings: number[][] = [];

    for (const chunk of chunks) {
      const result = await extractor(chunk, { pooling: 'mean', normalize: true });
      embeddings.push(Array.from(result.data) as number[]);
    }

    return embeddings;
  } catch (err) {
    console.warn('Embedding generation failed:', err);
    return [];
  }
}

/**
 * Store embeddings for a document. Deletes old chunks first.
 */
export async function storeEmbeddings(documentId: string, content: string): Promise<void> {
  await prisma.chunk.deleteMany({ where: { documentId } });

  const embeddings = await generateEmbeddings(content);
  if (embeddings.length === 0) return;

  const chunks = chunkContent(content);

  for (let i = 0; i < Math.min(chunks.length, embeddings.length); i++) {
    await prisma.chunk.create({
      data: {
        documentId,
        content: chunks[i],
        embedding: JSON.stringify(embeddings[i]),
        index: i,
      },
    });
  }
}

/**
 * Search chunks by semantic similarity to a query.
 */
export async function semanticSearch(
  query: string,
  limit: number = 10,
): Promise<{ documentId: string; score: number; snippet: string }[]> {
  const queryEmbeddings = await generateEmbeddings(query);
  if (queryEmbeddings.length === 0 || !queryEmbeddings[0]) return [];

  const queryVec = queryEmbeddings[0];

  const allChunks = await prisma.chunk.findMany({
    include: { document: { select: { id: true } } },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = (allChunks as any[])
    .map((chunk: { embedding: string | null; content: string; document: { id: string } }) => {
      if (!chunk.embedding) return null;
      const chunkVec = JSON.parse(chunk.embedding) as number[];
      const score = cosineSimilarity(queryVec, chunkVec);
      return {
        documentId: chunk.document.id,
        score,
        snippet: chunk.content.slice(0, 300),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Deduplicate by document, keeping highest score
  const seen = new Set<string>();
  const deduped: typeof results = [];
  for (const r of results) {
    if (!seen.has(r.documentId)) {
      seen.add(r.documentId);
      deduped.push(r);
    }
  }

  return deduped;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
