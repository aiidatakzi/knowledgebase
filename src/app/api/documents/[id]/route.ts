import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { deleteDocument } from '@/lib/indexer';

// GET /api/documents/[id] — Get a single document
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const doc = await prisma.document.findUnique({
    where: { id: params.id },
    include: {
      keywords: {
        include: { keyword: true },
        orderBy: { score: 'desc' },
      },
    },
  });

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Find related documents (sharing keywords)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keywordIds = (doc.keywords as any[]).map((dk) => dk.keywordId as string);
  const relatedDocs = await prisma.document.findMany({
    where: {
      id: { not: doc.id },
      keywords: {
        some: {
          keywordId: { in: keywordIds.slice(0, 10) },
        },
      },
    },
    include: {
      keywords: {
        include: { keyword: true },
        orderBy: { score: 'desc' },
        take: 5,
      },
    },
    take: 5,
  });

  return NextResponse.json({ document: doc, related: relatedDocs });
}

// DELETE /api/documents/[id] — Delete a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await deleteDocument(params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
