/**
 * Tanso Provider System
 *
 * Multi-source manga aggregator with unified API.
 * Each provider is self-contained for easy microservice extraction.
 *
 * Current providers:
 * - MangaDex (Phoenix): Primary source, official API
 * - MangaPill (Griffin): Consumet-based provider
 *
 * Metadata enrichment:
 * - AniList: Descriptions, recommendations, scores
 */

export * from './types';
export * from './source-aliases';

export { MangaDexProvider, mangadex } from './mangadex';
export { MangaPillProvider, mangapill } from './mangapill';

export { searchAniListManga, getAniListMangaById, extractMetadata } from './anilist';
export type { AniListMetadata } from './anilist';

export {
	searchAll,
	browseAll,
	getMangaDetailsWithFallback,
	getChaptersFromAllSources,
	checkAllProvidersHealth,
} from './aggregator';

import type { MangaProvider } from './types';
import { mangadex } from './mangadex';
import { mangapill } from './mangapill';

/**
 * Registry of all available providers
 */
export const providers: Record<string, MangaProvider> = {
	mangadex,
	mangapill,
};

/**
 * Get a provider by ID
 */
export function getProvider(id: string): MangaProvider | undefined {
	return providers[id];
}

/**
 * Get all available provider IDs
 */
export function getProviderIds(): string[] {
	return Object.keys(providers);
}

/**
 * Get all providers as array
 */
export function getAllProviders(): MangaProvider[] {
	return Object.values(providers);
}

/**
 * Get providers that support a specific feature
 */
export function getProvidersWithFeature(
	feature: 'search' | 'browse' | 'chapters' | 'pages' | 'trending' | 'latest'
): MangaProvider[] {
	return Object.values(providers).filter((p) => p.info.features.includes(feature));
}
