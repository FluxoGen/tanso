import { slugify } from './slugify';

/**
 * Builds the manga detail page URL.
 * Uses slug for SEO: /manga/[id]/[slug]
 */
export function buildMangaUrl(mangaId: string, title: string): string {
	const slug = slugify(title);
	return `/manga/${mangaId}/${slug}`;
}
