/**
 * MangaFire-specific types
 */

export interface MangaFireChapter {
	id: string;
	number: string;
	title?: string;
	url: string;
	dataId?: string;
}

export interface MangaFireManga {
	id: string;
	slug: string;
	title: string;
	coverUrl?: string;
	url: string;
	genres?: string[];
	status?: string;
	type?: string;
}

export interface MangaFirePageData {
	images: MangaFireImage[];
	isScrambled?: boolean;
}

export interface MangaFireImage {
	url: string;
	width?: number;
	height?: number;
	scrambleKey?: number[];
}

export interface MangaFireAjaxResponse<T = string> {
	status: number;
	result: T;
	message?: string;
	messages?: string[];
}

export interface MangaFireSyncData {
	page: string;
	number: string;
	name: string;
	manga_id: number;
	mal_id: string;
	anilist_id: string;
	base_url: string;
	manga_url: string;
	selector_position: string;
	next_chapter_url: string;
}
