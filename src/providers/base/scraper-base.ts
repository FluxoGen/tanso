import * as cheerio from 'cheerio';
import { fetchWithRetry } from '@/lib/fetch-utils';
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

export abstract class ScraperBase implements MangaProvider {
	abstract readonly info: ProviderInfo;

	abstract search(options: SearchOptions): Promise<PaginatedResult<MangaSearchResult>>;
	abstract browse(options: BrowseOptions): Promise<PaginatedResult<MangaSearchResult>>;
	abstract getMangaDetails(mangaId: string): Promise<MangaDetails>;
	abstract getChapters(mangaId: string, language?: string): Promise<ChapterInfo[]>;
	abstract getChapterPages(chapterId: string): Promise<ChapterPagesResult>;
	abstract healthCheck(): Promise<{ healthy: boolean; latency: number; message?: string }>;

	protected async fetchPage(url: string): Promise<cheerio.CheerioAPI> {
		const response = await fetchWithRetry(url, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			},
		});
		const html = await response.text();
		return cheerio.load(html);
	}

	protected createError(code: ProviderError['code'], message: string): ProviderError {
		return {
			code,
			message,
			provider: this.info.id,
			retryable: code === 'RATE_LIMITED' || code === 'NETWORK_ERROR',
			retryAfter: code === 'RATE_LIMITED' ? 60 : undefined,
		};
	}

	/**
	 * Parse relative date strings like "3 hours ago" into ISO timestamps.
	 * Also handles ISO dates and YYYY-MM-DD formats.
	 */
	protected parseDate(raw: string | undefined | null): string | undefined {
		if (!raw) return undefined;

		const d = new Date(raw);
		if (!isNaN(d.getTime())) return d.toISOString();

		const now = new Date();
		const relativeMatch = raw.match(
			/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i
		);
		if (relativeMatch) {
			const value = parseInt(relativeMatch[1], 10);
			const unit = relativeMatch[2].toLowerCase();
			switch (unit) {
				case 'second':
					now.setSeconds(now.getSeconds() - value);
					break;
				case 'minute':
					now.setMinutes(now.getMinutes() - value);
					break;
				case 'hour':
					now.setHours(now.getHours() - value);
					break;
				case 'day':
					now.setDate(now.getDate() - value);
					break;
				case 'week':
					now.setDate(now.getDate() - value * 7);
					break;
				case 'month':
					now.setMonth(now.getMonth() - value);
					break;
				case 'year':
					now.setFullYear(now.getFullYear() - value);
					break;
			}
			return now.toISOString();
		}

		return undefined;
	}
}
