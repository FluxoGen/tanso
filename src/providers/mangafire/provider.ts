/**
 * MangaFire Provider Implementation
 *
 * Hybrid approach:
 * - Uses AJAX endpoints for browse/filter (fast, no protection)
 * - Falls back to Playwright for search and chapter pages (VRF protected)
 */

import type {
	MangaProvider,
	BrowserEnabledProvider,
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

import { fetchJson, fetchUrl, isCloudflareBlock } from './http-client';
import {
	parseMangaList,
	parseChapterList,
	parseMangaDetails,
	extractSyncData,
	parsePagination,
} from './parser';
import type { MangaFireAjaxResponse } from './types';

const BASE_URL = 'https://mangafire.to';
const PROVIDER_ID = 'mangafire';

export class MangaFireProvider implements BrowserEnabledProvider {
	readonly info: ProviderInfo = {
		id: PROVIDER_ID,
		name: 'MangaFire',
		baseUrl: BASE_URL,
		languages: ['en', 'es', 'pt', 'fr', 'de', 'it', 'ru', 'pl', 'tr', 'ja', 'zh', 'ko'],
		features: ['search', 'browse', 'chapters', 'pages', 'trending', 'latest', 'filters'],
		rateLimit: {
			requestsPerMinute: 60,
			requestsPerSecond: 2,
		},
	};

	private browserEnabled = false;
	private browser: unknown = null;

	/**
	 * Browse manga with filters (no keyword - AJAX works without VRF)
	 */
	async browse(options: BrowseOptions): Promise<PaginatedResult<MangaSearchResult>> {
		const params = new URLSearchParams();

		params.set('page', String(options.page ?? 1));

		if (options.language) {
			params.append('language[]', options.language);
		} else {
			params.append('language[]', 'en');
		}

		if (options.sort) {
			const sortMap: Record<string, string> = {
				latest: 'recently_updated',
				popular: 'most_viewed',
				rating: 'scores',
				az: 'title_az',
				za: 'title_za',
			};
			params.set('sort', sortMap[options.sort] ?? 'most_viewed');
		}

		if (options.genres) {
			for (const genre of options.genres) {
				params.append('genre[]', genre);
			}
		}

		if (options.status) {
			params.set('status', options.status);
		}

		const url = `${BASE_URL}/filter?${params.toString()}`;

		try {
			const response = await fetchJson<string>(url);

			if (response.status !== 200 || !response.result) {
				throw this.createError('NETWORK_ERROR', 'Failed to fetch browse results');
			}

			if (isCloudflareBlock(response.result)) {
				throw this.createError('BLOCKED', 'Cloudflare protection detected');
			}

			const data = parseMangaList(response.result);
			const pagination = parsePagination(response.result);

			return {
				data,
				page: options.page ?? 1,
				totalPages: pagination.totalPages,
				hasNextPage: pagination.hasNext,
			};
		} catch (error) {
			if ((error as ProviderError).code) {
				throw error;
			}
			throw this.createError('NETWORK_ERROR', `Browse failed: ${(error as Error).message}`);
		}
	}

	/**
	 * Search for manga by keyword.
	 *
	 * MangaFire protects keyword search with VRF tokens, so this requires
	 * browser automation (Playwright) to work properly.
	 *
	 * Workaround: Use browse() with filters instead of keyword search.
	 */
	async search(options: SearchOptions): Promise<PaginatedResult<MangaSearchResult>> {
		// MangaFire's filter endpoint with keyword requires VRF (returns 403)
		// Use browser mode if available, otherwise throw VRF_REQUIRED

		if (this.browserEnabled) {
			return this.searchWithBrowser(options);
		}

		// Try the AJAX search endpoint (also requires VRF but let's confirm)
		const ajaxUrl = `${BASE_URL}/ajax/manga/search?keyword=${encodeURIComponent(options.query)}`;

		try {
			const ajaxResponse = await fetchJson(ajaxUrl);

			if (ajaxResponse.status === 403 || ajaxResponse.message === 'Request is invalid.') {
				throw this.createError(
					'VRF_REQUIRED',
					'Keyword search requires VRF token. Use browse() with filters, or enable browser mode.'
				);
			}

			// If somehow we got results, parse them
			if (ajaxResponse.status === 200 && ajaxResponse.result) {
				const data = parseMangaList(
					typeof ajaxResponse.result === 'string'
						? ajaxResponse.result
						: JSON.stringify(ajaxResponse.result)
				);
				return {
					data,
					page: options.page ?? 1,
					totalPages: 1,
					hasNextPage: false,
				};
			}

			throw this.createError('VRF_REQUIRED', 'Search requires VRF token. Enable browser mode.');
		} catch (error) {
			if ((error as ProviderError).code) {
				throw error;
			}
			throw this.createError('VRF_REQUIRED', 'Search requires VRF token. Enable browser mode.');
		}
	}

	/**
	 * Get chapter list for a manga (AJAX works without VRF!)
	 */
	async getChapters(mangaId: string, language = 'en'): Promise<ChapterInfo[]> {
		// Extract the short ID from mangaId (e.g., "one-piece.dkw" -> "dkw")
		const shortId = mangaId.includes('.') ? mangaId.split('.').pop() : mangaId;

		const url = `${BASE_URL}/ajax/manga/${shortId}/chapter/${language}`;

		try {
			const response = await fetchJson<string>(url);

			if (response.status !== 200 || !response.result) {
				throw this.createError('NOT_FOUND', `No chapters found for ${mangaId}`);
			}

			return parseChapterList(response.result, mangaId);
		} catch (error) {
			if ((error as ProviderError).code) {
				throw error;
			}
			throw this.createError('NETWORK_ERROR', `Failed to get chapters: ${(error as Error).message}`);
		}
	}

	/**
	 * Get manga details
	 */
	async getMangaDetails(mangaId: string): Promise<MangaDetails> {
		const url = `${BASE_URL}/manga/${mangaId}`;

		try {
			const response = await fetchUrl(url);

			if (response.statusCode !== 200) {
				// Handle redirects
				if (response.statusCode === 301 || response.statusCode === 302) {
					const location = response.headers['location'];
					if (location && typeof location === 'string') {
						const redirectResponse = await fetchUrl(location);
						if (redirectResponse.statusCode === 200) {
							return this.parseDetailsResponse(redirectResponse.body, mangaId);
						}
					}
				}
				throw this.createError('NOT_FOUND', `Manga ${mangaId} not found`);
			}

			return this.parseDetailsResponse(response.body, mangaId);
		} catch (error) {
			if ((error as ProviderError).code) {
				throw error;
			}
			throw this.createError('NETWORK_ERROR', `Failed to get manga details: ${(error as Error).message}`);
		}
	}

	private parseDetailsResponse(body: string, mangaId: string): MangaDetails {
		let html = body;

		// Check if it's JSON wrapped
		if (body.trim().startsWith('{')) {
			try {
				const json = JSON.parse(body) as MangaFireAjaxResponse<string>;
				if (json.result) {
					html = json.result;
				}
			} catch {
				// Use body as-is
			}
		}

		if (isCloudflareBlock(html)) {
			throw this.createError('BLOCKED', 'Cloudflare protection detected');
		}

		const details = parseMangaDetails(html, mangaId);

		return {
			id: mangaId,
			title: details.title ?? mangaId,
			provider: PROVIDER_ID,
			url: `${BASE_URL}/manga/${mangaId}`,
			...details,
		};
	}

	/**
	 * Get chapter pages (requires VRF - needs browser)
	 */
	async getChapterPages(chapterId: string): Promise<ChapterPagesResult> {
		// Chapter ID format: "one-piece.dkw:1175" or just URL segment
		// Try AJAX endpoint first (will likely fail with VRF)
		const [mangaId, chapterNum] = chapterId.includes(':')
			? chapterId.split(':')
			: [chapterId, '1'];

		const shortId = mangaId.includes('.') ? mangaId.split('.').pop() : mangaId;

		// Try the read page to extract chapter data
		const readUrl = `${BASE_URL}/read/${mangaId}/en/chapter-${chapterNum}`;

		try {
			const response = await fetchUrl(readUrl);

			if (response.statusCode !== 200) {
				throw this.createError('NOT_FOUND', 'Chapter not found');
			}

			let html = response.body;

			// Check if JSON response
			if (html.trim().startsWith('{')) {
				try {
					const json = JSON.parse(html) as MangaFireAjaxResponse<string>;
					if (json.result) {
						html = json.result;
					}
				} catch {
					// Use as-is
				}
			}

			// Extract syncData for chapter info
			const syncData = extractSyncData(html);

			if (syncData) {
				// The page loads images via JavaScript, we need the AJAX endpoint
				// Try AJAX chapter read endpoint
				const ajaxReadUrl = `${BASE_URL}/ajax/read/${shortId}/chapter/${chapterNum}`;
				const ajaxResponse = await fetchJson(ajaxReadUrl);

				if (ajaxResponse.status === 403) {
					// VRF required
					if (this.browserEnabled) {
						return this.getChapterPagesWithBrowser(chapterId);
					}
					throw this.createError(
						'VRF_REQUIRED',
						'Chapter pages require VRF token. Enable browser mode or use getChapterPagesWithBrowser()'
					);
				}

				// Parse pages from AJAX response if successful
				if (ajaxResponse.status === 200 && ajaxResponse.result) {
					return this.parseChapterPagesResponse(ajaxResponse.result, chapterId);
				}
			}

			// Fallback: try browser mode
			if (this.browserEnabled) {
				return this.getChapterPagesWithBrowser(chapterId);
			}

			throw this.createError(
				'VRF_REQUIRED',
				'Unable to extract pages without browser automation'
			);
		} catch (error) {
			if ((error as ProviderError).code) {
				throw error;
			}
			throw this.createError('NETWORK_ERROR', `Failed to get pages: ${(error as Error).message}`);
		}
	}

	private parseChapterPagesResponse(result: unknown, chapterId: string): ChapterPagesResult {
		// Result could be HTML or JSON with images array
		if (typeof result === 'object' && result !== null && 'images' in result) {
			const data = result as { images: Array<{ url: string; w?: number; h?: number }> };
			return {
				chapterId,
				provider: PROVIDER_ID,
				referer: BASE_URL,
				pages: data.images.map((img, idx) => ({
					index: idx,
					url: img.url,
					width: img.w,
					height: img.h,
				})),
			};
		}

		// Parse HTML for image URLs
		const html = typeof result === 'string' ? result : JSON.stringify(result);
		const imageUrls: string[] = [];

		// Look for image URLs in the response
		const imgMatches = html.match(/https?:\/\/[^"'\s]+\.(jpg|jpeg|png|webp)/gi);
		if (imgMatches) {
			for (const url of imgMatches) {
				if (!imageUrls.includes(url)) {
					imageUrls.push(url);
				}
			}
		}

		return {
			chapterId,
			provider: PROVIDER_ID,
			referer: BASE_URL,
			pages: imageUrls.map((url, idx) => ({
				index: idx,
				url,
			})),
		};
	}

	/**
	 * Get trending manga
	 */
	async getTrending(options?: BrowseOptions): Promise<PaginatedResult<MangaSearchResult>> {
		return this.browse({
			...options,
			sort: 'popular',
		});
	}

	/**
	 * Get latest updated manga
	 */
	async getLatest(options?: BrowseOptions): Promise<PaginatedResult<MangaSearchResult>> {
		return this.browse({
			...options,
			sort: 'latest',
		});
	}

	/**
	 * Health check
	 */
	async healthCheck(): Promise<{ healthy: boolean; latency: number; message?: string }> {
		const start = Date.now();

		try {
			const response = await fetchUrl(`${BASE_URL}/home`);
			const latency = Date.now() - start;

			if (response.statusCode === 200) {
				if (isCloudflareBlock(response.body)) {
					return { healthy: false, latency, message: 'Cloudflare protection active' };
				}
				return { healthy: true, latency };
			}

			return { healthy: false, latency, message: `HTTP ${response.statusCode}` };
		} catch (error) {
			return {
				healthy: false,
				latency: Date.now() - start,
				message: (error as Error).message,
			};
		}
	}

	// Browser-enabled provider methods

	hasBrowserSupport(): boolean {
		return this.browserEnabled;
	}

	setBrowserEnabled(enabled: boolean): void {
		this.browserEnabled = enabled;
	}

	/**
	 * Get chapter pages using Playwright (for VRF bypass)
	 * This is a placeholder - actual Playwright implementation will be added
	 */
	async getChapterPagesWithBrowser(chapterId: string): Promise<ChapterPagesResult> {
		// TODO: Implement Playwright-based page extraction
		throw this.createError(
			'VRF_REQUIRED',
			'Browser automation not yet implemented. Install and configure Playwright.'
		);
	}

	/**
	 * Search using Playwright (for VRF bypass)
	 */
	async searchWithBrowser(options: SearchOptions): Promise<PaginatedResult<MangaSearchResult>> {
		// TODO: Implement Playwright-based search
		throw this.createError(
			'VRF_REQUIRED',
			'Browser automation not yet implemented. Install and configure Playwright.'
		);
	}

	private createError(
		code: ProviderError['code'],
		message: string
	): ProviderError {
		return {
			code,
			message,
			provider: PROVIDER_ID,
			retryable: code === 'RATE_LIMITED' || code === 'NETWORK_ERROR',
			retryAfter: code === 'RATE_LIMITED' ? 60 : undefined,
		};
	}
}

// Singleton instance
export const mangafire = new MangaFireProvider();
