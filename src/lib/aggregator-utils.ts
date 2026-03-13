import type { Manga } from '@/types/manga';
import type { MangaSearchResult } from '@/providers/types';

interface AggregatedResult extends MangaSearchResult {
	sources: string[];
	displaySource: string;
	contentRating?: string;
}

/**
 * Maps an AggregatedSearchResult from the aggregator into a Manga-compatible
 * shape for the frontend. Preserves extra fields (sources, displaySource)
 * as pass-through for MangaCard.
 */
export function toMangaShape(
	result: AggregatedResult
): Manga & { sources?: string[]; displaySource?: string } {
	return {
		id: result.id,
		title: result.title,
		altTitle: result.altTitles?.[0],
		description: result.description ?? '',
		status: result.status ?? 'unknown',
		year: result.year ?? null,
		contentRating: result.contentRating ?? 'safe',
		tags: (result.genres ?? []).map((g) => ({ id: g, name: g, group: 'genre' })),
		coverId: null,
		coverFileName: null,
		coverUrl: result.coverUrl,
		authorName: result.author ?? null,
		artistName: result.artist ?? null,
		lastChapter: null,
		lastVolume: null,
		provider: result.provider,
		sources: result.sources,
		displaySource: result.displaySource,
		updatedAt: result.updatedAt,
	};
}
