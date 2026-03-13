import { getCoverUrl } from '@/providers/mangadex';
import type { Manga } from '@/types/manga';

/**
 * Resolves a cover image URL for any provider.
 *
 * Priority:
 * 1. manga.coverUrl (direct URL from any provider)
 * 2. manga.coverFileName via MangaDex CDN
 * 3. null (no cover available)
 */
export function resolveMangaCover(
	manga: Pick<Manga, 'id' | 'coverFileName' | 'coverUrl'>,
	size: '256' | '512' = '256'
): string | null {
	if (manga.coverUrl) {
		if (manga.coverUrl.startsWith('http')) return manga.coverUrl;
		// Might be a MangaDex filename stored in coverUrl
		if (manga.coverUrl.includes('.')) {
			return getCoverUrl(manga.id, manga.coverUrl, size);
		}
	}

	if (manga.coverFileName) {
		return getCoverUrl(manga.id, manga.coverFileName, size);
	}

	return null;
}

/**
 * Legacy helper: resolves a cover URL from mangaId and coverUrl string.
 * Kept for backward compatibility with existing callers.
 */
export function resolveCoverUrl(
	mangaId: string,
	coverUrl: string | null,
	size: '256' | '512' = '256'
): string | null {
	if (!coverUrl) return null;
	if (coverUrl.startsWith('http') || coverUrl.includes('mangadex.org')) {
		return coverUrl;
	}
	if (coverUrl.includes('.')) {
		return getCoverUrl(mangaId, coverUrl, size);
	}
	return null;
}
