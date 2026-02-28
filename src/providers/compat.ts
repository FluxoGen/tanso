/**
 * Compatibility Layer
 *
 * Bridges the old ContentProvider interface with the new MangaProvider interface.
 * This allows gradual migration of API routes.
 */

import type { Chapter, ChapterPagesResponse } from '@/types/manga';
import type { MangaProvider, ChapterPagesResult, ProviderError } from './types';
import { getDisplayName } from './source-aliases';
import { normalizeRomanization, levenshteinSimilarity } from '@/lib/matching';

/**
 * Old ContentProvider interface (from lib/providers/types.ts)
 */
export interface LegacyProviderSearchResult {
	sourceId: string;
	title: string;
	chapterCount?: number;
	status?: string;
	image?: string;
}

export interface LegacyContentProvider {
	name: string;
	displayName: string;
	type: 'manga' | 'anime' | 'lightnovel';
	search(query: string): Promise<LegacyProviderSearchResult[]>;
	getChapters(sourceId: string): Promise<Chapter[]>;
	getChapterPages(chapterId: string): Promise<ChapterPagesResponse>;
	needsImageProxy: boolean;
	imageHeaders?: Record<string, string>;
}

/**
 * Wraps a new MangaProvider to work with old API routes
 */
export function wrapAsLegacyProvider(provider: MangaProvider): LegacyContentProvider {
	return {
		name: provider.info.id,
		displayName: getDisplayName(provider.info.id),
		type: 'manga',
		needsImageProxy: provider.info.id !== 'mangadex',
		imageHeaders:
			provider.info.id === 'mangapill'
				? { Referer: 'https://mangapill.com/' }
				: undefined,

		async search(query: string): Promise<LegacyProviderSearchResult[]> {
			// Try keyword search first
			try {
				const result = await provider.search({ query, limit: 10 });
				if (result.data.length > 0) {
					return result.data.map((m) => ({
						sourceId: m.id,
						title: m.title,
						chapterCount: undefined,
						status: m.status,
						image: m.coverUrl,
					}));
				}
			} catch {
				// Search failed (VRF, Cloudflare block, etc.) — fall through to browse fallback
			}

			// Fallback: browse popular pages and match by title (cached)
			if (provider.info.features.includes('browse')) {
				try {
					const browsed = await getBrowseFallbackResults(provider);
					const matches = filterByTitle(query, browsed);
					if (matches.length > 0) return matches;
				} catch {
					// Browse also failed
				}
			}

			return [];
		},

		async getChapters(sourceId: string): Promise<Chapter[]> {
			const chapters = await provider.getChapters(sourceId);
			return chapters.map((ch) => ({
				id: ch.id,
				title: ch.title ?? null,
				chapter: String(ch.number),
				volume: ch.volume ? String(ch.volume) : null,
				pages: ch.pages ?? 0,
				translatedLanguage: ch.language,
				publishAt: ch.uploadDate ?? '',
				scanlationGroup: ch.scanlator ? getDisplayName(provider.info.id) : null,
				source: provider.info.id,
			}));
		},

		async getChapterPages(chapterId: string): Promise<ChapterPagesResponse> {
			const result = await provider.getChapterPages(chapterId);
			return convertPagesResult(result, provider.info.id);
		},
	};
}

/**
 * Cache browse results per provider to avoid re-fetching for every search query
 */
const browseCache = new Map<string, { data: { id: string; title: string; coverUrl?: string; status?: string }[]; timestamp: number }>();
const BROWSE_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function getBrowseFallbackResults(provider: MangaProvider): Promise<{ id: string; title: string; coverUrl?: string; status?: string }[]> {
	const cached = browseCache.get(provider.info.id);
	if (cached && Date.now() - cached.timestamp < BROWSE_CACHE_TTL) {
		return cached.data;
	}

	// Fetch popular + latest + rating sorted to maximize title coverage
	const browsePromises = [];
	for (const sort of ['popular', 'latest', 'rating'] as const) {
		for (let page = 1; page <= 3; page++) {
			browsePromises.push(
				provider.browse({ sort, page }).catch(() => null)
			);
		}
	}

	const browseResults = await Promise.all(browsePromises);
	const allResults = browseResults.flatMap((r) => r?.data ?? []);

	const seen = new Set<string>();
	const unique = allResults.filter((m) => {
		if (seen.has(m.id)) return false;
		seen.add(m.id);
		return true;
	});

	browseCache.set(provider.info.id, { data: unique, timestamp: Date.now() });
	return unique;
}

/**
 * Filter browse results by title similarity when keyword search is unavailable
 */
function filterByTitle(
	query: string,
	data: { id: string; title: string; coverUrl?: string; status?: string }[]
): LegacyProviderSearchResult[] {
	const normalized = normalizeRomanization(query.toLowerCase().trim());

	return data
		.map((m) => {
			const mNormalized = normalizeRomanization(m.title.toLowerCase().trim());
			const similarity = levenshteinSimilarity(normalized, mNormalized);
			const includes = mNormalized.includes(normalized) || normalized.includes(mNormalized);
			return { m, score: includes ? 1 : similarity };
		})
		.filter((r) => r.score >= 0.5)
		.sort((a, b) => b.score - a.score)
		.map((r) => ({
			sourceId: r.m.id,
			title: r.m.title,
			chapterCount: undefined,
			status: r.m.status,
			image: r.m.coverUrl,
		}));
}

/**
 * Convert new ChapterPagesResult to old ChapterPagesResponse format
 */
function convertPagesResult(result: ChapterPagesResult, source: string): ChapterPagesResponse {
	if (source === 'mangadex') {
		return {
			source: 'mangadex' as const,
			baseUrl: '',
			hash: '',
			data: result.pages.map((p) => p.url),
			dataSaver: result.pages.map((p) => p.url),
		};
	}

	return {
		source: source as 'mangapill',
		pages: result.pages.map((p, idx) => ({
			img: p.url,
			page: idx + 1,
		})),
	};
}
