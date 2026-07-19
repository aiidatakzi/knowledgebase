import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { indexFile } from '@/lib/indexer';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'data');

// GET /api/documents — List all documents with filtering and pagination
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const source = searchParams.get('source');
  const fileType = searchParams.get('fileType');
  const sort = searchParams.get('sort') || 'createdAt';
  const order = searchParams.get('order') || 'desc';

  const where: Record<string, unknown> = {};
  if (source) where.source = source;
  if (fileType) where.fileType = fileType;

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        keywords: {
          include: { keyword: true },
          orderBy: { score: 'desc' },
          take: 10,
        },
      },
      orderBy: { [sort]: order },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.document.count({ where }),
  ]);

  return NextResponse.json({
    documents,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

// POST /api/documents — Import a single file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const filePath = formData.get('path') as string | null;

    if (file) {
      // Handle file upload
      const buffer = Buffer.from(await file.arrayBuffer());
      const destPath = path.join(UPLOAD_DIR, file.name);

      // Ensure upload directory exists
      if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      }

      fs.writeFileSync(destPath, buffer);
      const docId = await indexFile(destPath);

      const doc = await prisma.document.findUnique({
        where: { id: docId },
        include: {
          keywords: {
            include: { keyword: true },
            orderBy: { score: 'desc' },
            take: 10,
          },
        },
      });

      return NextResponse.json({ success: true, document: doc }, { status: 201 });
    }

    if (filePath) {
      // Handle path-based import
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      const docId = await indexFile(filePath);
      const doc = await prisma.document.findUnique({
        where: { id: docId },
        include: {
          keywords: {
            include: { keyword: true },
            orderBy: { score: 'desc' },
            take: 10,
          },
        },
      });

      return NextResponse.json({ success: true, document: doc }, { status: 201 });
    }

    return NextResponse.json({ error: 'No file or path provided' }, { status: 400 });
  } catch (err) {
    console.error('Import error:', err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 },
    );
  }
}