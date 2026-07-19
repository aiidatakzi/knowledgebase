import { NextRequest, NextResponse } from 'next/server';
import { buildGraphData } from '@/lib/graph';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source') || undefined;
  const minWeight = parseInt(searchParams.get('minWeight') || '1');
  const limit = parseInt(searchParams.get('limit') || '100');

  const data = await buildGraphData({ source, minWeight, limit });

  return NextResponse.json(data);
}