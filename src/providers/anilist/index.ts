/**
 * AniList Client
 *
 * Used for metadata enrichment, not a full manga provider.
 */

export {
	searchAniListManga,
	getAniListMangaById,
	extractMetadata,
} from './client';

export type { AniListMetadata } from './client';
