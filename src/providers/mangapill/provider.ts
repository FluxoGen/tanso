/**
 * MangaPill Provider Implementation
 *
 * Uses the Consumet library for manga data.
 * Migrated from src/lib/providers/mangareader.ts
 */

import { MANGA } from '@consumet/extensions';
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

const PROVIDER_ID = 'mangapill';
const TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return Promise.race([
		promise,
		new Promise<never>((_, reject) =>
			setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
		),
	]);
}

function parseChapterNumber(ch: {
	id: string;
	chapterNumber?: number;
	chapter?: string;
	title?: string;
}): number | string {
	if (ch.chapter != null) return parseFloat(ch.chapter) || ch.chapter;
	if (ch.chapterNumber != null && !isNaN(ch.chapterNumber)) {
		return ch.chapterNumber;
	}
	if (ch.title) {
		const match = ch.title.match(/chapter\s*(\d+(?:\.\d+)?)/i);
		if (match) return parseFloat(match[1]);
	}
	const idMatch = ch.id.match(/chapter-(\d+(?:\.\d+)?)/);
	if (idMatch) return parseFloat(idMatch[1]);
	return 0;
}

function safeDate(raw: string | undefined | null): string | undefined {
	if (!raw) return undefined;

	const d = new Date(raw);
	if (!isNaN(d.getTime())) return d.toISOString();

	const now = new Date();
	const relativeMatch = raw.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i);
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

export class MangaPillProvider implements MangaProvider {
	readonly info: ProviderInfo = {
		id: PROVIDER_ID,
		name: 'MangaPill',
		baseUrl: 'https://mangapill.com',
		languages: ['en'],
		features: ['search', 'chapters', 'pages'],
		rateLimit: {
			requestsPerMinute: 30,
		},
	};

	private client = new MANGA.MangaPill();

	async search(options: SearchOptions): Promise<PaginatedResult<MangaSearchResult>> {
		try {
			const results = await withTimeout(this.client.search(options.query), TIMEOUT_MS);

			if (!results?.results) {
				return {
					data: [],
					page: 1,
					totalPages: 1,
					hasNextPage: false,
				};
			}

			const data = results.results.map((r) => ({
				id: r.id,
				title: r.title as string,
				coverUrl: r.image ?? undefined,
				provider: PROVIDER_ID,
				url: `https://mangapill.com/manga/${r.id}`,
			}));

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

	async browse(_options: BrowseOptions): Promise<PaginatedResult<MangaSearchResult>> {
		throw this.createError('UNKNOWN', 'MangaPill does not support browsing');
	}

	async getMangaDetails(mangaId: string): Promise<MangaDetails> {
		try {
			const info = await withTimeout(this.client.fetchMangaInfo(mangaId), TIMEOUT_MS);

			if (!info) {
				throw this.createError('NOT_FOUND', 'Manga not found');
			}

			return {
				id: mangaId,
				title: info.title as string,
				coverUrl: typeof info.image === 'string' ? info.image : undefined,
				description: typeof info.description === 'string' ? info.description : undefined,
				status: this.mapStatus(typeof info.status === 'string' ? info.status : ''),
				provider: PROVIDER_ID,
				url: `https://mangapill.com/manga/${mangaId}`,
				totalChapters: info.chapters?.length,
			};
		} catch (error) {
			if ((error as ProviderError).code) throw error;
			throw this.createError('NETWORK_ERROR', `Failed to get details: ${(error as Error).message}`);
		}
	}

	async getChapters(mangaId: string): Promise<ChapterInfo[]> {
		try {
			const info = await withTimeout(this.client.fetchMangaInfo(mangaId), TIMEOUT_MS);

			if (!info?.chapters) {
				return [];
			}

			return info.chapters.map((ch) => ({
				id: ch.id,
				number: parseChapterNumber(
					ch as { id: string; chapterNumber?: number; chapter?: string; title?: string }
				),
				title: (ch.title as string) ?? undefined,
				volume: ch.volume != null ? parseInt(String(ch.volume), 10) : undefined,
				language: 'en',
				uploadDate: safeDate(ch.releaseDate as string | undefined),
				scanlator: 'MangaPill',
				provider: PROVIDER_ID,
				url: `https://mangapill.com/chapters/${ch.id}`,
			}));
		} catch (error) {
			throw this.createError('NETWORK_ERROR', `Failed to get chapters: ${(error as Error).message}`);
		}
	}

	async getChapterPages(chapterId: string): Promise<ChapterPagesResult> {
		try {
			const data = await withTimeout(this.client.fetchChapterPages(chapterId), TIMEOUT_MS);

			return {
				chapterId,
				provider: PROVIDER_ID,
				referer: 'https://mangapill.com/',
				pages: (data ?? []).map((p, idx) => ({
					index: idx,
					url: p.img,
				})),
			};
		} catch (error) {
			throw this.createError('NETWORK_ERROR', `Failed to get pages: ${(error as Error).message}`);
		}
	}

	async healthCheck(): Promise<{ healthy: boolean; latency: number; message?: string }> {
		const start = Date.now();

		try {
			const results = await withTimeout(this.client.search('one piece'), 5000);
			const latency = Date.now() - start;

			if (results?.results?.length) {
				return { healthy: true, latency };
			}

			return { healthy: false, latency, message: 'No search results returned' };
		} catch (error) {
			return {
				healthy: false,
				latency: Date.now() - start,
				message: (error as Error).message,
			};
		}
	}

	private mapStatus(status: string): 'ongoing' | 'completed' | 'hiatus' | 'cancelled' | 'unknown' {
		const s = status.toLowerCase();
		if (s.includes('ongoing') || s.includes('publishing')) return 'ongoing';
		if (s.includes('completed') || s.includes('finished')) return 'completed';
		if (s.includes('hiatus')) return 'hiatus';
		if (s.includes('cancelled') || s.includes('discontinued')) return 'cancelled';
		return 'unknown';
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

export const mangapill = new MangaPillProvider();
