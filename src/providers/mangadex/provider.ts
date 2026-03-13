/**
 * MangaDex Provider Implementation
 *
 * Implements the MangaProvider interface using the MangaDex API.
 * This is the primary/default provider for Tanso.
 */

import type {
	MangaProvider,
	ProviderInfo,
	MangaSearchResult,
	MangaDetails,
	ChapterInfo,
	ChapterPagesResult,
	SearchOptions,
	BrowseOptions,
	PaginatedResult,
	ProviderError,
} from '../types';

import {
	searchManga,
	getMangaDetails as getMangaDetailsApi,
	getMangaChapters,
	getChapterPages as getChapterPagesApi,
	getPopularManga,
	getLatestManga,
	getTrendingManga,
	getCoverUrl,
} from './api-client';

const PROVIDER_ID = 'mangadex';
const BASE_URL = 'https://api.mangadex.org';

export class MangaDexProvider implements MangaProvider {
	readonly info: ProviderInfo = {
		id: PROVIDER_ID,
		name: 'MangaDex',
		baseUrl: BASE_URL,
		languages: ['en', 'ja', 'ko', 'zh', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'pl', 'vi', 'th', 'id'],
		features: ['search', 'browse', 'chapters', 'pages', 'trending', 'latest', 'filters'],
		rateLimit: {
			requestsPerMinute: 40,
			requestsPerSecond: 5,
		},
	};

	async search(options: SearchOptions): Promise<PaginatedResult<MangaSearchResult>> {
		try {
			const result = await searchManga(options.query, {
				limit: options.limit ?? 20,
				offset: ((options.page ?? 1) - 1) * (options.limit ?? 20),
				includedTags: options.genres,
			});

			const totalPages = Math.ceil(result.total / result.limit);

			return {
				data: result.data.map((manga) => this.mapToSearchResult(manga)),
				page: options.page ?? 1,
				totalPages,
				totalItems: result.total,
				hasNextPage: result.offset + result.data.length < result.total,
			};
		} catch (error) {
			throw this.createError('NETWORK_ERROR', `Search failed: ${(error as Error).message}`);
		}
	}

	async browse(options: BrowseOptions): Promise<PaginatedResult<MangaSearchResult>> {
		try {
			const limit = options.limit ?? 20;
			const offset = ((options.page ?? 1) - 1) * limit;

			let data;
			let total = 0;

			switch (options.sort) {
				case 'latest':
					const latestResult = await getLatestManga(
						limit,
						options.genres,
						options.contentRatings,
						offset
					);
					data = latestResult.data;
					total = latestResult.total;
					break;
				case 'rating':
					data = await getTrendingManga(limit, options.genres, options.contentRatings);
					total = data.length;
					break;
				case 'popular':
				default:
					data = await getPopularManga(limit, options.genres, options.contentRatings);
					total = data.length;
					break;
			}

			const totalPages = Math.ceil(total / limit);

			return {
				data: data.map((manga) => this.mapToSearchResult(manga)),
				page: options.page ?? 1,
				totalPages,
				totalItems: total,
				hasNextPage: offset + data.length < total,
			};
		} catch (error) {
			throw this.createError('NETWORK_ERROR', `Browse failed: ${(error as Error).message}`);
		}
	}

	async getMangaDetails(mangaId: string): Promise<MangaDetails> {
		try {
			const manga = await getMangaDetailsApi(mangaId);

			return {
				id: manga.id,
				title: manga.title,
				altTitles: manga.altTitle ? [manga.altTitle] : undefined,
				coverUrl: manga.coverFileName
					? getCoverUrl(manga.id, manga.coverFileName, '512')
					: undefined,
				description: manga.description,
				status: this.mapStatus(manga.status),
				genres: manga.tags.map((t) => t.name),
				author: manga.authorName ?? undefined,
				artist: manga.artistName ?? undefined,
				year: manga.year ?? undefined,
				provider: PROVIDER_ID,
				url: `https://mangadex.org/title/${manga.id}`,
				totalChapters: manga.lastChapter ? parseInt(manga.lastChapter, 10) : undefined,
				tags: manga.tags.map((t) => t.name),
			};
		} catch (error) {
			throw this.createError('NOT_FOUND', `Manga not found: ${(error as Error).message}`);
		}
	}

	async getChapters(mangaId: string, language = 'en'): Promise<ChapterInfo[]> {
		try {
			const chapters: ChapterInfo[] = [];
			let offset = 0;
			const limit = 100;

			while (true) {
				const page = await getMangaChapters(mangaId, {
					limit,
					offset,
					translatedLanguage: language,
					order: 'desc',
				});

				chapters.push(
					...page.data.map((ch) => ({
						id: ch.id,
						number: ch.chapter ? parseFloat(ch.chapter) : 0,
						title: ch.title ?? undefined,
						volume: ch.volume ? parseInt(ch.volume, 10) : undefined,
						language: ch.translatedLanguage,
						pages: ch.pages,
						uploadDate: ch.publishAt,
						scanlator: ch.scanlationGroup ?? undefined,
						provider: PROVIDER_ID,
						url: `https://mangadex.org/chapter/${ch.id}`,
					}))
				);

				if (chapters.length >= page.total || page.data.length < limit) {
					break;
				}
				offset += limit;
			}

			return chapters;
		} catch (error) {
			throw this.createError(
				'NETWORK_ERROR',
				`Failed to get chapters: ${(error as Error).message}`
			);
		}
	}

	async getChapterPages(chapterId: string): Promise<ChapterPagesResult> {
		try {
			const pages = await getChapterPagesApi(chapterId);

			return {
				chapterId,
				provider: PROVIDER_ID,
				referer: 'https://mangadex.org/',
				pages: pages.data.map((filename, index) => ({
					index,
					url: `${pages.baseUrl}/data/${pages.hash}/${filename}`,
				})),
			};
		} catch (error) {
			throw this.createError('NOT_FOUND', `Chapter pages not found: ${(error as Error).message}`);
		}
	}

	async getTrending(options?: BrowseOptions): Promise<PaginatedResult<MangaSearchResult>> {
		return this.browse({ ...options, sort: 'rating' });
	}

	async getLatest(options?: BrowseOptions): Promise<PaginatedResult<MangaSearchResult>> {
		return this.browse({ ...options, sort: 'latest' });
	}

	async healthCheck(): Promise<{ healthy: boolean; latency: number; message?: string }> {
		const start = Date.now();

		try {
			const res = await fetch(`${BASE_URL}/ping`);
			const latency = Date.now() - start;

			if (res.ok) {
				return { healthy: true, latency };
			}

			return { healthy: false, latency, message: `HTTP ${res.status}` };
		} catch (error) {
			return {
				healthy: false,
				latency: Date.now() - start,
				message: (error as Error).message,
			};
		}
	}

	private mapToSearchResult(manga: {
		id: string;
		title: string;
		altTitle?: string;
		description: string;
		status: string;
		year: number | null;
		contentRating?: string;
		tags: { id: string; name: string; group: string }[];
		coverFileName: string | null;
		authorName: string | null;
		artistName: string | null;
		updatedAt?: string;
	}): MangaSearchResult {
		return {
			id: manga.id,
			title: manga.title,
			altTitles: manga.altTitle ? [manga.altTitle] : undefined,
			coverUrl: manga.coverFileName ? getCoverUrl(manga.id, manga.coverFileName, '256') : undefined,
			description: manga.description,
			status: this.mapStatus(manga.status),
			contentRating: manga.contentRating,
			genres: manga.tags.map((t) => t.name),
			author: manga.authorName ?? undefined,
			artist: manga.artistName ?? undefined,
			year: manga.year ?? undefined,
			provider: PROVIDER_ID,
			url: `https://mangadex.org/title/${manga.id}`,
			updatedAt: manga.updatedAt,
		};
	}

	private mapStatus(status: string): 'ongoing' | 'completed' | 'hiatus' | 'cancelled' | 'unknown' {
		switch (status?.toLowerCase()) {
			case 'ongoing':
				return 'ongoing';
			case 'completed':
				return 'completed';
			case 'hiatus':
				return 'hiatus';
			case 'cancelled':
				return 'cancelled';
			default:
				return 'unknown';
		}
	}

	private createError(code: ProviderError['code'], message: string): ProviderError {
		return {
			code,
			message,
			provider: PROVIDER_ID,
			retryable: code === 'RATE_LIMITED' || code === 'NETWORK_ERROR',
			retryAfter: code === 'RATE_LIMITED' ? 60 : undefined,
		};
	}
}

export const mangadex = new MangaDexProvider();
