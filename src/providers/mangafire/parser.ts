/**
 * HTML Parser for MangaFire
 *
 * Extracts manga data from MangaFire's HTML responses.
 * Uses regex-based parsing (no cheerio dependency for easier microservice extraction).
 */

import type { MangaFireChapter, MangaFireManga, MangaFireSyncData } from './types';
import type { MangaSearchResult, ChapterInfo, MangaDetails } from '../types';

const PROVIDER_ID = 'mangafire';

/**
 * Extract manga ID from URL like /manga/one-piece.dkw
 */
export function extractMangaId(url: string): { slug: string; id: string } | null {
	const match = url.match(/\/manga\/([a-z0-9-]+)\.([a-z0-9]+)/i);
	if (match) {
		return { slug: match[1], id: match[2] };
	}
	return null;
}

/**
 * Parse manga items from filter/browse HTML
 */
export function parseMangaList(html: string): MangaSearchResult[] {
	const results: MangaSearchResult[] = [];

	// Match manga unit divs with their content
	// Pattern: <div class="unit">...<a href="/manga/slug.id">...</a>...</div>
	const unitPattern =
		/<div[^>]*class="[^"]*unit[^"]*"[^>]*>[\s\S]*?<a[^>]*href="(\/manga\/[^"]+)"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi;

	let match;
	while ((match = unitPattern.exec(html)) !== null) {
		const unitHtml = match[0];
		const mangaUrl = match[1];

		const idData = extractMangaId(mangaUrl);
		if (!idData) continue;

		// Extract title
		const titleMatch = unitHtml.match(/<div[^>]*class="[^"]*info[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
		const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : '';

		// Extract cover image
		const imgMatch = unitHtml.match(/<img[^>]*src="([^"]+)"[^>]*>/i);
		const coverUrl = imgMatch ? imgMatch[1] : undefined;

		// Extract genres/tags
		const genreMatches = unitHtml.match(/<span[^>]*class="[^"]*genre[^"]*"[^>]*>([^<]+)<\/span>/gi);
		const genres = genreMatches
			? genreMatches.map((g) => {
					const m = g.match(/>([^<]+)</);
					return m ? m[1].trim() : '';
				})
			: [];

		// Extract status
		const statusMatch = unitHtml.match(/<span[^>]*class="[^"]*status[^"]*"[^>]*>([^<]+)<\/span>/i);
		const statusText = statusMatch ? statusMatch[1].toLowerCase() : '';
		const status = parseStatus(statusText);

		if (title) {
			results.push({
				id: `${idData.slug}.${idData.id}`,
				title,
				coverUrl,
				genres: genres.filter(Boolean),
				status,
				provider: PROVIDER_ID,
				url: `https://mangafire.to${mangaUrl}`,
			});
		}
	}

	// Simpler fallback pattern if unit pattern doesn't match
	if (results.length === 0) {
		const linkPattern = /<a[^>]*href="(\/manga\/([a-z0-9-]+)\.([a-z0-9]+))"[^>]*title="([^"]+)"/gi;
		while ((match = linkPattern.exec(html)) !== null) {
			const [, url, slug, id, title] = match;

			// Check if we already have this manga
			const mangaId = `${slug}.${id}`;
			if (!results.some((r) => r.id === mangaId)) {
				results.push({
					id: mangaId,
					title: decodeHtmlEntities(title),
					provider: PROVIDER_ID,
					url: `https://mangafire.to${url}`,
				});
			}
		}
	}

	return results;
}

/**
 * Parse chapter list from AJAX response HTML
 */
export function parseChapterList(html: string, mangaId: string): ChapterInfo[] {
	const chapters: ChapterInfo[] = [];

	// Pattern: <li class="item" data-number="1175">
	//            <a href="/read/one-piece.dkw/en/chapter-1175" title="...">
	//              <span>Chapter 1175: Title*</span>
	const chapterPattern =
		/<li[^>]*class="[^"]*item[^"]*"[^>]*data-number="([^"]+)"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/gi;

	let match;
	while ((match = chapterPattern.exec(html)) !== null) {
		const [, number, url, titleSpan] = match;

		// Extract chapter ID from URL
		const chapterIdMatch = url.match(/chapter-([a-z0-9.-]+)$/i);
		const chapterId = chapterIdMatch ? chapterIdMatch[1] : number;

		// Parse title from span content like "Chapter 1175: Title*"
		const titleMatch = titleSpan.match(/Chapter\s+[\d.]+:?\s*(.*)/i);
		const title = titleMatch ? titleMatch[1].trim() : undefined;

		// Extract volume if present
		const volumeMatch = titleSpan.match(/Vol\s+(\d+)/i);
		const volume = volumeMatch ? parseInt(volumeMatch[1], 10) : undefined;

		// Extract data-id for AJAX calls
		const dataIdMatch = match[0].match(/data-id="(\d+)"/);
		const dataId = dataIdMatch ? dataIdMatch[1] : undefined;

		chapters.push({
			id: `${mangaId}:${chapterId}`,
			number: parseFloat(number) || number,
			title: title || undefined,
			volume,
			language: 'en',
			provider: PROVIDER_ID,
			url: `https://mangafire.to${url}`,
		});
	}

	return chapters;
}

/**
 * Parse manga details from manga page HTML
 */
export function parseMangaDetails(html: string, mangaId: string): Partial<MangaDetails> {
	const details: Partial<MangaDetails> = {
		id: mangaId,
		provider: PROVIDER_ID,
	};

	// Title
	const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
	if (titleMatch) {
		details.title = decodeHtmlEntities(titleMatch[1].trim());
	}

	// Cover
	const coverMatch = html.match(/<img[^>]*class="[^"]*poster[^"]*"[^>]*src="([^"]+)"/i);
	if (coverMatch) {
		details.coverUrl = coverMatch[1];
	}

	// Description
	const descMatch = html.match(/<div[^>]*class="[^"]*summary[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
	if (descMatch) {
		details.description = stripHtml(descMatch[1]).trim();
	}

	// Status
	const statusMatch = html.match(/Status:\s*<\/span>[^<]*<span[^>]*>([^<]+)/i);
	if (statusMatch) {
		details.status = parseStatus(statusMatch[1].toLowerCase());
	}

	// Author
	const authorMatch = html.match(/Author:\s*<\/span>[^<]*<a[^>]*>([^<]+)/i);
	if (authorMatch) {
		details.author = decodeHtmlEntities(authorMatch[1].trim());
	}

	// Artist
	const artistMatch = html.match(/Artist:\s*<\/span>[^<]*<a[^>]*>([^<]+)/i);
	if (artistMatch) {
		details.artist = decodeHtmlEntities(artistMatch[1].trim());
	}

	// Genres
	const genreSection = html.match(/Genres?:\s*<\/span>([\s\S]*?)(?:<\/div>|<span[^>]*class="[^"]*item)/i);
	if (genreSection) {
		const genres: string[] = [];
		const genreLinks = genreSection[1].match(/<a[^>]*>([^<]+)<\/a>/gi);
		if (genreLinks) {
			for (const link of genreLinks) {
				const g = link.match(/>([^<]+)</);
				if (g) genres.push(g[1].trim());
			}
		}
		details.genres = genres;
	}

	// Year
	const yearMatch = html.match(/Released:\s*<\/span>[^<]*<span[^>]*>(\d{4})/i);
	if (yearMatch) {
		details.year = parseInt(yearMatch[1], 10);
	}

	// URL
	details.url = `https://mangafire.to/manga/${mangaId}`;

	return details;
}

/**
 * Extract syncData JSON from page
 */
export function extractSyncData(html: string): MangaFireSyncData | null {
	const match = html.match(/<script id="syncData" type="application\/json">([^<]+)<\/script>/);
	if (match) {
		try {
			return JSON.parse(match[1]);
		} catch {
			return null;
		}
	}
	return null;
}

/**
 * Parse pagination info
 */
export function parsePagination(html: string): { page: number; totalPages: number; hasNext: boolean } {
	// Look for pagination links
	const pageMatch = html.match(/page=(\d+)[^>]*class="[^"]*active/i);
	const currentPage = pageMatch ? parseInt(pageMatch[1], 10) : 1;

	// Find max page
	const allPages = html.match(/page=(\d+)/g);
	let maxPage = 1;
	if (allPages) {
		for (const p of allPages) {
			const num = parseInt(p.replace('page=', ''), 10);
			if (num > maxPage) maxPage = num;
		}
	}

	// Check for "next" link
	const hasNext = html.includes('rel="next"') || currentPage < maxPage;

	return { page: currentPage, totalPages: maxPage, hasNext };
}

// Helper functions

function parseStatus(status: string): 'ongoing' | 'completed' | 'hiatus' | 'cancelled' | 'unknown' {
	const s = status.toLowerCase();
	if (s.includes('ongoing') || s.includes('releasing')) return 'ongoing';
	if (s.includes('complete') || s.includes('finished')) return 'completed';
	if (s.includes('hiatus')) return 'hiatus';
	if (s.includes('cancel') || s.includes('discontinue')) return 'cancelled';
	return 'unknown';
}

function decodeHtmlEntities(text: string): string {
	return text
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

function stripHtml(html: string): string {
	return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
}
