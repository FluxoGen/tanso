/**
 * CSS selectors for MangaPill pages.
 * Centralized here so they're easy to update when the site changes.
 */

export const MANGAPILL_SELECTORS = {
	search: {
		container: 'div.container div.my-3.justify-end > div',
		link: 'a',
		title: 'div > a > div',
		image: 'a img',
	},

	mangaInfo: {
		title: 'div.container div.my-3 div.flex-col div.mb-3 h1',
		description: 'div.container div.my-3 div.flex-col p.text--secondary',
		status: 'div.container div.my-3 div.flex-col div.gap-3.mb-3 div:contains("Status")',
		year: 'div.container div.my-3 div.flex-col div.gap-3.mb-3 div:contains("Year")',
		genres: 'div.container div.my-3 div.flex-col div.mb-3:contains("Genres") a',
		chapters: 'div.container div.border-border div#chapters div.grid-cols-1 a',
	},

	chapterPages: {
		container: 'chapter-page',
		image: 'div picture img',
	},

	recentChapters: {
		container: 'div.container div.grid > div',
		mangaLink: 'a[href^="/manga/"]',
		mangaTitle: 'a[href^="/manga/"] div.line-clamp-2.font-bold',
		coverImage: 'figure img',
		datetime: 'time-ago',
	},
} as const;
