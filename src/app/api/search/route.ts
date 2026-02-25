import { NextRequest, NextResponse } from 'next/server';
import { searchManga } from '@/lib/mangadex';
import { searchAniListManga } from '@/lib/anilist';
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
		const limit = 20;
		const offset = (page - 1) * limit;
		const tagFilters = tags.length ? tags : undefined;

		const contentRatings = ratings.length ? ratings : undefined;

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
	} catch {
		return NextResponse.json({ error: 'Failed to search manga' }, { status: 500 });
	}
}
