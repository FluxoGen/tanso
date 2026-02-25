export interface MangaTag {
	id: string;
	name: string;
	group: string;
}

export interface Manga {
	id: string;
	title: string;
	altTitle?: string;
	description: string;
	status: string;
	year: number | null;
	contentRating: string;
	tags: MangaTag[];
	coverId: string | null;
	coverFileName: string | null;
	authorName: string | null;
	artistName: string | null;
	lastChapter: string | null;
	lastVolume: string | null;
}

export interface Chapter {
	id: string;
	title: string | null;
	chapter: string | null;
	volume: string | null;
	pages: number;
	translatedLanguage: string;
	publishAt: string;
	scanlationGroup: string | null;
	source: string;
}

export interface MangaSource {
	provider: string;
	displayName: string;
	sourceId: string;
	matchedTitle: string;
	chapterCount: number;
	confidence: number;
}

export type ChapterPagesResponse =
	| {
			source: 'mangadex';
			baseUrl: string;
			hash: string;
			data: string[];
			dataSaver: string[];
	  }
	| {
			source: string;
			pages: { img: string; page: number }[];
	  };

export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	offset: number;
	limit: number;
}
