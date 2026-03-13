/**
 * Provider Aggregator
 *
 * Queries multiple manga providers in parallel and combines results.
 * Handles deduplication, fallback, and metadata enrichment.
 */

import type {
	MangaProvider,
	MangaSearchResult,
	MangaDetails,
	ChapterInfo,
	PaginatedResult,
	SearchOptions,
	BrowseOptions,
	ProviderError,
} from './types';
import { searchAniListManga, extractMetadata } from './anilist';
import { getDisplayName } from './source-aliases';
import { normalizeRomanization, levenshteinSimilarity } from '@/lib/matching';
import { buildProviderId } from '@/lib/provider-id';

interface AggregatorOptions {
	providers: MangaProvider[];
	timeout?: number;
	enrichWithAniList?: boolean;
}

interface AggregatedSearchResult extends MangaSearchResult {
	sources: string[];
	displaySource: string;
}

const DEFAULT_TIMEOUT = 10000;

/**
 * Search across multiple providers in parallel
 */
export async function searchAll(
	options: SearchOptions,
	aggregatorOptions: AggregatorOptions
): Promise<PaginatedResult<AggregatedSearchResult>> {
	const { providers, timeout = DEFAULT_TIMEOUT, enrichWithAniList = false } = aggregatorOptions;

	const searchPromises = providers.map((provider) =>
		withTimeout(
			provider.search(options).catch((err: ProviderError) => {
				console.error(`Search failed for ${provider.info.id}:`, err.message);
				return null;
			}),
			timeout
		)
	);

	const results = await Promise.all(searchPromises);

	const allResults: MangaSearchResult[] = [];
	for (let i = 0; i < results.length; i++) {
		const result = results[i];
		if (result?.data) {
			allResults.push(...result.data);
		}
	}

	const deduplicated = deduplicateManga(allResults);

	let enriched = deduplicated;
	if (enrichWithAniList && deduplicated.length > 0) {
		enriched = await enrichWithAniListMetadata(deduplicated);
	}

	return {
		data: enriched,
		page: options.page ?? 1,
		totalPages: 1,
		totalItems: enriched.length,
		hasNextPage: false,
	};
}

/**
 * Browse across multiple providers (for trending, popular, latest)
 */
export async function browseAll(
	options: BrowseOptions,
	aggregatorOptions: AggregatorOptions
): Promise<PaginatedResult<AggregatedSearchResult>> {
	const { providers, timeout = DEFAULT_TIMEOUT, enrichWithAniList = false } = aggregatorOptions;

	const browsePromises = providers
		.filter((p) => p.info.features.includes('browse'))
		.map((provider) =>
			withTimeout(
				provider.browse(options).catch((err: ProviderError) => {
					console.error(`Browse failed for ${provider.info.id}:`, err.message);
					return null;
				}),
				timeout
			)
		);

	const results = await Promise.all(browsePromises);

	const allResults: MangaSearchResult[] = [];
	let maxTotalItems = 0;
	for (const result of results) {
		if (result?.data) {
			allResults.push(...result.data);
			if (result.totalItems && result.totalItems > maxTotalItems) {
				maxTotalItems = result.totalItems;
			}
		}
	}

	const deduplicated = deduplicateManga(allResults);

	let enriched = deduplicated;
	if (enrichWithAniList && deduplicated.length > 0) {
		enriched = await enrichWithAniListMetadata(deduplicated.slice(0, 20));
	}

	const validResults = results.filter(Boolean);

	return {
		data: enriched,
		page: options.page ?? 1,
		totalPages: validResults.length > 0 ? Math.max(...validResults.map((r) => r!.totalPages)) : 1,
		totalItems: maxTotalItems || deduplicated.length,
		hasNextPage: results.some((r) => r?.hasNextPage),
	};
}

/**
 * Get manga details with fallback to other providers
 */
export async function getMangaDetailsWithFallback(
	mangaId: string,
	primaryProvider: MangaProvider,
	fallbackProviders: MangaProvider[]
): Promise<MangaDetails | null> {
	try {
		return await primaryProvider.getMangaDetails(mangaId);
	} catch (error) {
		console.error(`Primary provider failed for ${mangaId}:`, (error as Error).message);

		for (const provider of fallbackProviders) {
			try {
				return await provider.getMangaDetails(mangaId);
			} catch {
				continue;
			}
		}

		return null;
	}
}

/**
 * Get chapters from multiple providers and merge
 */
export async function getChaptersFromAllSources(
	mangaTitle: string,
	providers: MangaProvider[],
	timeout = DEFAULT_TIMEOUT
): Promise<Map<string, ChapterInfo[]>> {
	const chaptersMap = new Map<string, ChapterInfo[]>();

	const searchPromises = providers.map(async (provider) => {
		try {
			const searchResult = await withTimeout(
				provider.search({ query: mangaTitle, limit: 5 }),
				timeout
			);

			if (!searchResult || searchResult.data.length === 0) return null;

			const bestMatch = searchResult.data[0];
			const chapters = await withTimeout(provider.getChapters(bestMatch.id), timeout);

			return { providerId: provider.info.id, chapters: chapters ?? [] };
		} catch {
			return null;
		}
	});

	const results = await Promise.all(searchPromises);

	for (const result of results) {
		if (result) {
			chaptersMap.set(result.providerId, result.chapters);
		}
	}

	return chaptersMap;
}

/**
 * Deduplicate manga results by title similarity with fuzzy matching
 */
function deduplicateManga(results: MangaSearchResult[]): AggregatedSearchResult[] {
	const seen = new Map<string, AggregatedSearchResult>();
	const normalizedKeys: string[] = [];

	for (const manga of results) {
		const normalized = normalizeTitle(manga.title);
		const existingKey = findExistingMatch(normalized, normalizedKeys, seen);

		if (existingKey) {
			const existing = seen.get(existingKey)!;
			if (!existing.sources.includes(manga.provider)) {
				existing.sources.push(manga.provider);
			}
			if (!existing.coverUrl && manga.coverUrl) {
				existing.coverUrl = manga.coverUrl;
			}
			if (!existing.description && manga.description) {
				existing.description = manga.description;
			}
		} else {
			const compositeId = buildProviderId(manga.provider, manga.id);
			seen.set(normalized, {
				...manga,
				id: compositeId,
				sources: [manga.provider],
				displaySource: getDisplayName(manga.provider),
			});
			normalizedKeys.push(normalized);
		}
	}

	return Array.from(seen.values());
}

/**
 * Find an existing match in the seen map using fuzzy matching
 */
function findExistingMatch(
	normalized: string,
	normalizedKeys: string[],
	seen: Map<string, AggregatedSearchResult>
): string | null {
	// Exact match first (fast path)
	if (seen.has(normalized)) {
		return normalized;
	}

	// Fuzzy match with threshold
	const SIMILARITY_THRESHOLD = 0.85;

	for (const key of normalizedKeys) {
		const similarity = levenshteinSimilarity(normalized, key);
		if (similarity >= SIMILARITY_THRESHOLD) {
			return key;
		}
	}

	return null;
}

/**
 * Normalize title for comparison with romanization normalization
 */
function normalizeTitle(title: string): string {
	const basic = title
		.toLowerCase()
		.replace(/[^\w\s]/g, '')
		.replace(/\s+/g, ' ')
		.trim();

	return normalizeRomanization(basic);
}

/**
 * Enrich results with AniList metadata
 */
async function enrichWithAniListMetadata(
	results: AggregatedSearchResult[]
): Promise<AggregatedSearchResult[]> {
	const enrichPromises = results.slice(0, 10).map(async (manga) => {
		try {
			const anilistData = await searchAniListManga(manga.title);
			if (anilistData) {
				const metadata = extractMetadata(anilistData);
				return {
					...manga,
					description: manga.description || metadata.description,
					genres: manga.genres?.length ? manga.genres : metadata.genres,
					rating: manga.rating ?? metadata.averageScore,
				};
			}
		} catch {
			// Ignore enrichment failures
		}
		return manga;
	});

	const enriched = await Promise.all(enrichPromises);

	return [...enriched, ...results.slice(10)];
}

/**
 * Utility to add timeout to a promise
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
	return Promise.race([
		promise,
		new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
	]);
}

/**
 * Check health of all providers
 */
export async function checkAllProvidersHealth(
	providers: MangaProvider[]
): Promise<Map<string, { healthy: boolean; latency: number; message?: string }>> {
	const results = new Map<string, { healthy: boolean; latency: number; message?: string }>();

	const healthPromises = providers.map(async (provider) => {
		const health = await provider.healthCheck();
		return { id: provider.info.id, health };
	});

	const healths = await Promise.all(healthPromises);

	for (const { id, health } of healths) {
		results.set(id, health);
	}

	return results;
}
