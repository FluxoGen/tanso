/**
 * MangaDex Provider
 *
 * Primary manga provider using the official MangaDex API.
 */

export { MangaDexProvider, mangadex } from './provider';

export {
	searchManga,
	getMangaDetails,
	getMangaChapters,
	getChapterPages,
	getMangaTags,
	getPopularManga,
	getLatestManga,
	getTrendingManga,
	getCoverUrl,
	appendContentRatings,
} from './api-client';

export type { MangaDexChapterPages } from './api-client';
