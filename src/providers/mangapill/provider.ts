/**
 * MangaPill Provider — First-Party Scraper
 *
 * Direct HTML scraping using cheerio, replacing the Consumet dependency.
 * Supports search, manga details, chapter pages, and browsing recent chapters.
 */

import type {
	ProviderInfo,
	MangaSearchResult,
	MangaDetails,
	ChapterInfo,
	ChapterPagesResult,
	SearchOptions,
	BrowseOptions,
	PaginatedResult,
} from '../types';
import { ScraperBase } from '../base';
import { RateLimiter } from '../base';
import { MANGAPILL_SELECTORS as S } from './selectors';

const PROVIDER_ID = 'mangapill';
const BASE_URL = 'https://mangapill.com';

function parseChapterNumber(text: string, id: string): number | string {
	const fromText = text.match(/Chapter\s*(\d+(?:\.\d+)?)/i);
	if (fromText) return parseFloat(fromText[1]);

	const fromId = id.match(/chapter-(\d+(?:\.\d+)?)/);
	if (fromId) return parseFloat(fromId[1]);

	const hashNum = text.match(/#(\d+(?:\.\d+)?)/);
	if (hashNum) return parseFloat(hashNum[1]);

	return 0;
}

export class MangaPillProvider extends ScraperBase {
	readonly info: ProviderInfo = {
		id: PROVIDER_ID,
		name: 'MangaPill',
		baseUrl: BASE_URL,
		languages: ['en'],
		features: ['search', 'browse', 'chapters', 'pages'],
		rateLimit: { requestsPerMinute: 30 },
	};

	private limiter = new RateLimiter(30);

	private async fetchLimited(url: string) {
		await this.limiter.acquire();
		return this.fetchPage(url);
	}

	async search(options: SearchOptions): Promise<PaginatedResult<MangaSearchResult>> {
		try {
			const $ = await this.fetchLimited(
				`${BASE_URL}/search?q=${encodeURIComponent(options.query)}`
			);

			const data: MangaSearchResult[] = [];

			$(S.search.container).each((_, el) => {
				const linkHref = $(el).find(S.search.link).attr('href') ?? '';
				const id = linkHref.split('/manga/')[1];
				if (!id) return;

				const title = $(el).find(S.search.title).first().text().trim();
				const coverUrl = $(el).find(S.search.image).attr('data-src') ?? undefined;

				data.push({
					id,
					title,
					coverUrl,
					provider: PROVIDER_ID,
					url: `${BASE_URL}/manga/${id}`,
				});
			});

			return {
				data,
				page: 1,
				totalPages: 1,
				totalItems: data.length,
				hasNextPage: false,
			};
		} catch (error) {
			throw this.createError('NETWORK_ERROR', `Search failed: ${(error as Error).message}`);
		}
	}

	async browse(_options?: BrowseOptions): Promise<PaginatedResult<MangaSearchResult>> {
		try {
			const $ = await this.fetchLimited(`${BASE_URL}/chapters`);

			const seen = new Map<string, MangaSearchResult>();

			$(S.recentChapters.container).each((_, el) => {
				const mangaLinkEl = $(el).find(S.recentChapters.mangaLink);
				const href = mangaLinkEl.attr('href') ?? '';
				const id = href.split('/manga/')[1];
				if (!id || seen.has(id)) return;

				const title = $(el).find(S.recentChapters.mangaTitle).first().text().trim();
				const coverUrl = $(el).find(S.recentChapters.coverImage).attr('data-src') ?? undefined;

				const timeEl = $(el).find(S.recentChapters.datetime);
				const updatedAt = this.parseDate(timeEl.attr('datetime') ?? timeEl.text().trim());

				seen.set(id, {
					id,
					title,
					coverUrl,
					provider: PROVIDER_ID,
					url: `${BASE_URL}/manga/${id}`,
					updatedAt,
				});
			});

			const data = Array.from(seen.values());

			return {
				data,
				page: 1,
				totalPages: 1,
				totalItems: data.length,
				hasNextPage: false,
			};
		} catch (error) {
			throw this.createError('NETWORK_ERROR', `Browse failed: ${(error as Error).message}`);
		}
	}

	async getMangaDetails(mangaId: string): Promise<MangaDetails> {
		try {
			const $ = await this.fetchLimited(`${BASE_URL}/manga/${mangaId}`);

			const title = $(S.mangaInfo.title).text().trim();
			if (!title) throw this.createError('NOT_FOUND', 'Manga not found');

			const description = $(S.mangaInfo.description)
				.text()
				.split('\n')
				.join(' ')
				.trim();

			const statusText = $(S.mangaInfo.status).text();
			const status = this.mapStatus(statusText);

			const yearText = $(S.mangaInfo.year).text();
			const yearMatch = yearText.match(/\d{4}/);
			const year = yearMatch ? parseInt(yearMatch[0], 10) : undefined;

			const genres: string[] = [];
			$(S.mangaInfo.genres).each((_, el) => {
				const g = $(el).text().trim();
				if (g && g !== 'Genres') genres.push(g);
			});

			const totalChapters = $(S.mangaInfo.chapters).length;

			return {
				id: mangaId,
				title,
				description,
				status,
				genres,
				year,
				provider: PROVIDER_ID,
				url: `${BASE_URL}/manga/${mangaId}`,
				totalChapters: totalChapters || undefined,
			};
		} catch (error) {
			if ((error as { code?: string }).code) throw error;
			throw this.createError(
				'NETWORK_ERROR',
				`Failed to get details: ${(error as Error).message}`
			);
		}
	}

	async getChapters(mangaId: string): Promise<ChapterInfo[]> {
		try {
			const $ = await this.fetchLimited(`${BASE_URL}/manga/${mangaId}`);

			const chapters: ChapterInfo[] = [];

			$(S.mangaInfo.chapters).each((_, el) => {
				const href = $(el).attr('href') ?? '';
				const chapterId = href.split('/chapters/')[1];
				if (!chapterId) return;

				const text = $(el).text().trim();

				chapters.push({
					id: chapterId,
					number: parseChapterNumber(text, chapterId),
					title: text || undefined,
					language: 'en',
					scanlator: 'MangaPill',
					provider: PROVIDER_ID,
					url: `${BASE_URL}/chapters/${chapterId}`,
				});
			});

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
			const $ = await this.fetchLimited(`${BASE_URL}/chapters/${chapterId}`);

			const pages: { index: number; url: string }[] = [];

			$(S.chapterPages.container).each((idx, el) => {
				const img =
					$(el).find(S.chapterPages.image).attr('data-src') ??
					$(el).find(S.chapterPages.image).attr('src');
				if (img) {
					pages.push({ index: idx, url: img });
				}
			});

			return {
				chapterId,
				provider: PROVIDER_ID,
				referer: `${BASE_URL}/`,
				pages,
			};
		} catch (error) {
			throw this.createError(
				'NETWORK_ERROR',
				`Failed to get pages: ${(error as Error).message}`
			);
		}
	}

	async healthCheck(): Promise<{ healthy: boolean; latency: number; message?: string }> {
		const start = Date.now();
		try {
			const $ = await this.fetchLimited(`${BASE_URL}/search?q=one+piece`);
			const latency = Date.now() - start;
			const hasResults = $(S.search.container).length > 0;

			if (hasResults) return { healthy: true, latency };
			return { healthy: false, latency, message: 'No search results returned' };
		} catch (error) {
			return {
				healthy: false,
				latency: Date.now() - start,
				message: (error as Error).message,
			};
		}
	}

	private mapStatus(
		text: string
	): 'ongoing' | 'completed' | 'hiatus' | 'cancelled' | 'unknown' {
		const s = text.toLowerCase();
		if (s.includes('ongoing') || s.includes('publishing')) return 'ongoing';
		if (s.includes('completed') || s.includes('finished')) return 'completed';
		if (s.includes('hiatus')) return 'hiatus';
		if (s.includes('cancelled') || s.includes('discontinued')) return 'cancelled';
		return 'unknown';
	}
}

export const mangapill = new MangaPillProvider();
