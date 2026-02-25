import { NextRequest, NextResponse } from 'next/server';
import { getPopularManga } from '@/lib/mangadex';

export async function GET(request: NextRequest) {
	try {
		const params = request.nextUrl.searchParams;
		const tags = params.getAll('tags');
		const ratings = params.getAll('ratings');

		const data = await getPopularManga(
			20,
			tags.length ? tags : undefined,
			ratings.length ? ratings : undefined
		);
		return NextResponse.json({ data });
	} catch {
		return NextResponse.json({ error: 'Failed to fetch popular manga' }, { status: 500 });
	}
}
