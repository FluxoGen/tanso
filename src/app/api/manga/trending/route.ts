import { NextRequest, NextResponse } from 'next/server';
import { browseAll, getAllProviders } from '@/providers';
import { getTrendingManga } from '@/providers/mangadex';

export async function GET(request: NextRequest) {
	try {
		const params = request.nextUrl.searchParams;
		const tags = params.getAll('tags');
		const ratings = params.getAll('ratings');
		const multiSource = params.get('multiSource') !== 'false';

		if (multiSource) {
			const providers = getAllProviders().filter((p) => p.info.features.includes('browse'));

			const result = await browseAll(
				{
					sort: 'popular',
					page: 1,
					genres: tags.length ? tags : undefined,
				},
				{
					providers,
					timeout: 8000,
					enrichWithAniList: false,
				}
			);

			return NextResponse.json({
				data: result.data.slice(0, 20),
				sources: [...new Set(result.data.flatMap((m) => m.sources))],
			});
		}

		const data = await getTrendingManga(
			20,
			tags.length ? tags : undefined,
			ratings.length ? ratings : undefined
		);
		return NextResponse.json({ data });
	} catch (error) {
		console.error('[API] Trending error:', error);
		return NextResponse.json({ error: 'Failed to fetch trending manga' }, { status: 500 });
	}
}
