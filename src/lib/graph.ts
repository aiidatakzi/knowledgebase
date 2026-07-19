import { prisma } from './db';
import type { GraphData } from '@/types';

/**
 * Build graph data from keyword co-occurrence edges.
 * Supports filtering by source and date range.
 */
export async function buildGraphData(options: {
  source?: string;
  minWeight?: number;
  limit?: number;
} = {}): Promise<GraphData> {
  const { source, minWeight = 1, limit = 100 } = options;

  // Build filter for edges
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const edgeWhere: any = {
    weight: { gte: minWeight },
  };

  // If source filter is active, we need to filter edges where both keywords
  // appear in documents of that source
  let keywordFilter: string[] | undefined;
  if (source) {
    const docsOfSource = await prisma.document.findMany({
      where: { source },
      select: { id: true },
    });
    const docIds = docsOfSource.map(
      (d: { id: string }) => d.id,
    );

    const docKeywords = await prisma.documentKeyword.findMany({
      where: { documentId: { in: docIds } },
      select: { keywordId: true },
      distinct: ['keywordId'],
    });
    keywordFilter = docKeywords.map(
      (dk: { keywordId: string }) => dk.keywordId,
    );

    if (keywordFilter && keywordFilter.length === 0) {
      return { nodes: [], edges: [] };
    }
  }

  // Get edges with their source/target keywords
  const edges = await prisma.keywordEdge.findMany({
    where: edgeWhere,
    include: {
      source: { select: { id: true, word: true, count: true } },
      target: { select: { id: true, word: true, count: true } },
    },
    orderBy: { weight: 'desc' },
    take: limit * 3,
  });

  // Filter by keyword source if needed
  const filteredEdges = keywordFilter
    ? edges.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e: any) => keywordFilter!.includes(e.sourceId) && keywordFilter!.includes(e.targetId),
      )
    : edges;

  // Build node set from edges
  const nodeMap = new Map<string, { word: string; count: number }>();
  for (const edge of filteredEdges.slice(0, limit)) {
    if (!nodeMap.has(edge.source.id)) {
      nodeMap.set(edge.source.id, {
        word: edge.source.word,
        count: edge.source.count,
      });
    }
    if (!nodeMap.has(edge.target.id)) {
      nodeMap.set(edge.target.id, {
        word: edge.target.word,
        count: edge.target.count,
      });
    }
  }

  // If we have few nodes, add top keywords to fill in
  if (nodeMap.size < 20) {
    const topKeywords = await prisma.keyword.findMany({
      orderBy: { count: 'desc' },
      take: 50,
    });
    for (const kw of topKeywords) {
      if (!nodeMap.has(kw.id)) {
        nodeMap.set(kw.id, { word: kw.word, count: kw.count });
      }
    }
  }

  // Normalize sizes for visualization (min 10, max 50)
  const maxCount = Math.max(...Array.from(nodeMap.values()).map((n) => n.count), 1);

  const nodes = Array.from(nodeMap.entries()).map(([id, { word, count }]) => ({
    id,
    label: word,
    value: Math.max(10, Math.round((count / maxCount) * 50)),
    group: 'keyword',
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
const edgesOut = filteredEdges.slice(0, limit).map((edge: any) => ({
    id: edge.id,
    from: edge.sourceId,
    to: edge.targetId,
    value: Math.min(edge.weight, 10),
    title: `${edge.source.word} ↔ ${edge.target.word} (${edge.weight})`,
  }));

  return { nodes, edges: edgesOut };
}