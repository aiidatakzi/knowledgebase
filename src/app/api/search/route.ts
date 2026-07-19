import { NextRequest, NextResponse } from 'next/server';
import { combinedSearch } from '@/lib/search';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const semantic = searchParams.get('semantic') === 'true';
  const limit = parseInt(searchParams.get('limit') || '20');

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ results: [], total: 0 });
  }

  const results = await combinedSearch(query, { semantic, limit });

  return NextResponse.json({
    results,
    total: results.length,
    query,
    semantic,
  });
}