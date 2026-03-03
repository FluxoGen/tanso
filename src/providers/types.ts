/**
 * Provider System Types
 *
 * This module defines the interfaces for the multi-source manga aggregator.
 * Each provider (MangaDex, MangaPill, etc.) implements these interfaces,
 * allowing Tanso to fetch data from multiple sources with a unified API.
 *
 * Designed for easy microservice extraction: each provider is self-contained
 * and can be moved to a separate service with minimal changes.
 */

export interface ProviderInfo {
	id: string;
	name: string;
	baseUrl: string;
	languages: string[];
	features: ProviderFeature[];
	rateLimit?: {
		requestsPerMinute: number;
		requestsPerSecond?: number;
	};
}

export type ProviderFeature =
	| 'search'
	| 'browse'
	| 'chapters'
	| 'pages'
	| 'trending'
	| 'latest'
	| 'filters'
	| 'recommendations';

export interface MangaSearchResult {
	id: string;
	title: string;
	altTitles?: string[];
	coverUrl?: string;
	description?: string;
	status?: 'ongoing' | 'completed' | 'hiatus' | 'cancelled' | 'unknown';
	contentRating?: string;
	genres?: string[];
	author?: string;
	artist?: string;
	year?: number;
	rating?: number;
	provider: string;
	url: string;
}

export interface MangaDetails extends MangaSearchResult {
	chapters?: ChapterInfo[];
	totalChapters?: number;
	lastUpdated?: string;
	views?: number;
	alternativeTitles?: string[];
	tags?: string[];
}

export interface ChapterInfo {
	id: string;
	number: number | string;
	title?: string;
	volume?: number | string;
	language: string;
	pages?: number;
	uploadDate?: string;
	scanlator?: string;
	provider: string;
	url: string;
}

export interface ChapterPage {
	index: number;
	url: string;
	width?: number;
	height?: number;
	isScrambled?: boolean;
}

export interface ChapterPagesResult {
	chapterId: string;
	pages: ChapterPage[];
	provider: string;
	referer?: string;
}

export interface SearchOptions {
	query: string;
	page?: number;
	limit?: number;
	language?: string;
	genres?: string[];
	status?: string;
	sort?: 'relevance' | 'latest' | 'popular' | 'rating';
}

export interface BrowseOptions {
	page?: number;
	limit?: number;
	language?: string;
	genres?: string[];
	contentRatings?: string[];
	status?: string;
	sort?: 'latest' | 'popular' | 'rating' | 'az' | 'za';
}

export interface PaginatedResult<T> {
	data: T[];
	page: number;
	totalPages: number;
	totalItems?: number;
	hasNextPage: boolean;
}

export interface ProviderError {
	code:
		| 'RATE_LIMITED'
		| 'NOT_FOUND'
		| 'BLOCKED'
		| 'NETWORK_ERROR'
		| 'PARSE_ERROR'
		| 'UNKNOWN';
	message: string;
	provider: string;
	retryable: boolean;
	retryAfter?: number;
}

/**
 * Base interface for all manga providers.
 * Implement this interface to add a new source to Tanso.
 */
export interface MangaProvider {
	readonly info: ProviderInfo;

	/**
	 * Search for manga by keyword
	 */
	search(options: SearchOptions): Promise<PaginatedResult<MangaSearchResult>>;

	/**
	 * Browse manga with filters (no keyword search)
	 */
	browse(options: BrowseOptions): Promise<PaginatedResult<MangaSearchResult>>;

	/**
	 * Get detailed manga information including chapter list
	 */
	getMangaDetails(mangaId: string): Promise<MangaDetails>;

	/**
	 * Get chapter list for a manga
	 */
	getChapters(mangaId: string, language?: string): Promise<ChapterInfo[]>;

	/**
	 * Get page URLs for a chapter
	 */
	getChapterPages(chapterId: string): Promise<ChapterPagesResult>;

	/**
	 * Get trending/popular manga
	 */
	getTrending?(options?: BrowseOptions): Promise<PaginatedResult<MangaSearchResult>>;

	/**
	 * Get latest updated manga
	 */
	getLatest?(options?: BrowseOptions): Promise<PaginatedResult<MangaSearchResult>>;

	/**
	 * Health check - verify provider is accessible
	 */
	healthCheck(): Promise<{ healthy: boolean; latency: number; message?: string }>;
}

