/**
 * Compatibility Layer
 *
 * Bridges the old ContentProvider interface with the new MangaProvider interface.
 * This allows gradual migration of API routes.
 */

import type { Chapter, ChapterPagesResponse } from '@/types/manga';
import type { MangaProvider, ChapterPagesResult } from './types';
import { getDisplayName } from './source-aliases';

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
				: provider.info.id === 'mangafire'
					? { Referer: 'https://mangafire.to/' }
					: undefined,

		async search(query: string): Promise<LegacyProviderSearchResult[]> {
			try {
				const result = await provider.search({ query, limit: 10 });
				return result.data.map((m) => ({
					sourceId: m.id,
					title: m.title,
					chapterCount: undefined,
					status: m.status,
					image: m.coverUrl,
				}));
			} catch {
				return [];
			}
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
				scanlationGroup: ch.scanlator ?? null,
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
