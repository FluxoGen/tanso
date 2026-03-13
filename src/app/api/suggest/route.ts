import { NextRequest, NextResponse } from 'next/server';
import { searchManga } from '@/providers/mangadex';
import { searchAll, getAllProviders, getDisplayName } from '@/providers';

export async function GET(request: NextRequest) {
	const query = request.nextUrl.searchParams.get('q');
	const multiSource = request.nextUrl.searchParams.get('multiSource') === 'true';

	if (!query || query.trim().length < 2) {
		return NextResponse.json({ suggestions: [] });
	}

	try {
		if (multiSource) {
			const providers = getAllProviders().filter((p) => p.info.features.includes('search'));

			const result = await searchAll(
				{
					query,
					limit: 10,
				},
				{
					providers,
					timeout: 5000,
					enrichWithAniList: false,
				}
			);

			const suggestions = result.data.slice(0, 20).map((manga) => ({
				id: manga.id,
				title: manga.title,
				coverUrl: manga.coverUrl,
				status: manga.status,
				source: manga.provider,
				displaySource: getDisplayName(manga.provider),
				sources: manga.sources,
			}));

			return NextResponse.json({ suggestions });
		}

		// Default: MangaDex only (fast)
		const result = await searchManga(query, { limit: 20 });

		const suggestions = result.data.map((manga) => ({
			id: manga.id,
			title: manga.title,
			coverFileName: manga.coverFileName,
			authorName: manga.authorName,
			year: manga.year,
			status: manga.status,
		}));

		return NextResponse.json({ suggestions });
	} catch {
		return NextResponse.json({ suggestions: [] });
	}
}
