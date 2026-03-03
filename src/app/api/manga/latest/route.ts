import { NextRequest, NextResponse } from 'next/server';
import { browseAll, getAllProviders } from '@/providers';
import { getLatestManga } from '@/providers/mangadex';
import { toMangaShape } from '@/lib/aggregator-utils';

export async function GET(request: NextRequest) {
	try {
		const params = request.nextUrl.searchParams;
		const limit = parseInt(params.get('limit') ?? '20', 10);
		const offset = parseInt(params.get('offset') ?? '0', 10);
		const tags = params.getAll('tags');
		const ratings = params.getAll('ratings');
		const multiSource = params.get('multiSource') !== 'false';
		const page = Math.floor(offset / limit) + 1;

		if (multiSource) {
			const providers = getAllProviders().filter((p) => p.info.features.includes('browse'));

			const result = await browseAll(
				{
					sort: 'latest',
					page,
					genres: tags.length ? tags : undefined,
					contentRatings: ratings.length ? ratings : undefined,
				},
				{
					providers,
					timeout: 8000,
					enrichWithAniList: false,
				}
			);

			return NextResponse.json({
				data: result.data.slice(0, limit).map(toMangaShape),
				total: result.totalItems ?? result.data.length,
				offset,
				limit,
				sources: [...new Set(result.data.flatMap((m) => m.sources))],
			});
		}

		const result = await getLatestManga(
			limit,
			tags.length ? tags : undefined,
			ratings.length ? ratings : undefined,
			offset
		);

		return NextResponse.json(result);
	} catch (error) {
		console.error('[API] Latest error:', error);
		return NextResponse.json({ error: 'Failed to fetch latest manga' }, { status: 500 });
	}
}
