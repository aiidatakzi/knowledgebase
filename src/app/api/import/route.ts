import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { scanDirectory, startWatching, stopWatching } from '@/lib/watcher';

// GET /api/import — Get import stats
export async function GET() {
  const [totalDocuments, totalKeywords, totalEdges, bySource, byFileType] = await Promise.all([
    prisma.document.count(),
    prisma.keyword.count(),
    prisma.keywordEdge.count(),
    prisma.document.groupBy({
      by: ['source'],
      _count: true,
    }),
    prisma.document.groupBy({
      by: ['fileType'],
      _count: true,
    }),
  ]);

  return NextResponse.json({
    totalDocuments,
    totalKeywords,
    totalEdges,
    bySource: bySource.map((s: { source: string | null; _count: number }) => ({ source: s.source || 'unknown', count: s._count })),
    byFileType: byFileType.map((f: { fileType: string; _count: number }) => ({ fileType: f.fileType, count: f._count })),
  });
}

// POST /api/import — Scan a directory or start watching
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, directory } = body;

  switch (action) {
    case 'scan': {
      const dir = directory || './data';
      const result = await scanDirectory(dir);
      return NextResponse.json(result);
    }
    case 'watch': {
      const dir = directory || './data';
      startWatching(dir);
      return NextResponse.json({ watching: dir });
    }
    case 'stop': {
      stopWatching();
      return NextResponse.json({ stopped: true });
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}