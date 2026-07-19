import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const keywords = await prisma.keyword.findMany({
    orderBy: { count: 'desc' },
    take: 100,
  });

  return NextResponse.json({ keywords });
}