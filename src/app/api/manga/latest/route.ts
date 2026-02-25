import { NextRequest, NextResponse } from 'next/server';
import { getLatestManga } from '@/lib/mangadex';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const limit = parseInt(params.get('limit') ?? '20', 10);
    const offset = parseInt(params.get('offset') ?? '0', 10);
    const tags = params.getAll('tags');
    const ratings = params.getAll('ratings');

    const result = await getLatestManga(
      limit,
      tags.length ? tags : undefined,
      ratings.length ? ratings : undefined,
      offset
    );

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch latest manga' }, { status: 500 });
  }
}
