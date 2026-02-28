import { NextRequest, NextResponse } from 'next/server';
import { searchManga } from '@/providers/mangadex';
import { searchAniListManga } from '@/providers/anilist';
import { searchAll, getAllProviders } from '@/providers';
import type { Manga, PaginatedResponse } from '@/types/manga';

function mergeResults(
	primary: PaginatedResponse<Manga>,
	secondary: PaginatedResponse<Manga>,
	limit: number
): PaginatedResponse<Manga> {
	const seenIds = new Set(primary.data.map((m) => m.id));
	const unique = secondary.data.filter((m) => !seenIds.has(m.id));
	return {
		data: [...primary.data, ...unique].slice(0, limit),
		total: primary.total + unique.length,
		offset: primary.offset,
		limit: primary.limit,
	};
}

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const q = searchParams.get('q') ?? '';
		const page = parseInt(searchParams.get('page') ?? '1', 10);
		const tags = searchParams.getAll('tags');
		const ratings = searchParams.getAll('ratings');
		const multiSource = searchParams.get('multiSource') === 'true';
		const limit = 20;
		const offset = (page - 1) * limit;
		const tagFilters = tags.length ? tags : undefined;
		const contentRatings = ratings.length ? ratings : undefined;

		// Multi-source search mode
		if (multiSource && q) {
			const providers = getAllProviders().filter((p) => p.info.features.includes('search'));

			const result = await searchAll(
				{
					query: q,
					page,
					genres: tagFilters,
				},
				{
					providers,
					timeout: 10000,
					enrichWithAniList: true,
				}
			);

			return NextResponse.json({
				data: result.data.slice(0, limit),
				total: result.totalItems ?? result.data.length,
				offset,
				limit,
				sources: [...new Set(result.data.flatMap((m) => m.sources))],
			});
		}

		// Default: MangaDex-first with AniList title enrichment
		if (!q) {
			const result = await searchManga('', {
				limit,
				offset,
				includedTags: tagFilters,
				contentRatings,
			});
			return NextResponse.json(result);
		}

		const [mdResult, anilistMedia] = await Promise.all([
			searchManga(q, { limit, offset, includedTags: tagFilters, contentRatings }),
			searchAniListManga(q),
		]);

		const altTitles = anilistMedia
			? [anilistMedia.title.romaji, anilistMedia.title.english].filter(
					(t): t is string => !!t && t.toLowerCase() !== q.toLowerCase()
				)
			: [];

		if (altTitles.length === 0) {
			return NextResponse.json(mdResult);
		}

		// AniList suggests a different canonical title — search MangaDex with it
		for (const altTitle of altTitles) {
			const altResult = await searchManga(altTitle, {
				limit,
				offset,
				includedTags: tagFilters,
				contentRatings,
			});
			if (altResult.data.length === 0) continue;

			if (mdResult.data.length === 0) {
				return NextResponse.json(altResult);
			}

			// Both have results — AniList-guided results first, then unique originals
			return NextResponse.json(mergeResults(altResult, mdResult, limit));
		}

		return NextResponse.json(mdResult);
	} catch (error) {
		console.error('[API] Search error:', error);
		return NextResponse.json({ error: 'Failed to search manga' }, { status: 500 });
	}
}
