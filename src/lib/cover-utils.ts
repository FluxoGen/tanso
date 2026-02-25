import { getCoverUrl } from '@/lib/mangadex';

/**
 * Resolves a cover URL from mangaId and coverUrl (filename or full URL).
 * Returns null if coverUrl is null/empty.
 */
export function resolveCoverUrl(
  mangaId: string,
  coverUrl: string | null,
  size: '256' | '512' = '256'
): string | null {
  if (!coverUrl) return null;
  // Already a full URL (e.g. from MangaDex CDN)
  if (coverUrl.startsWith('http') || coverUrl.includes('mangadex.org')) {
    return coverUrl;
  }
  // Filename (e.g. "abc123.jpg" from MangaDex)
  if (coverUrl.includes('.')) {
    return getCoverUrl(mangaId, coverUrl, size);
  }
  return null;
}
