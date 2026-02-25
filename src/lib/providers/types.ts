import type { Chapter, ChapterPagesResponse } from '@/types/manga';

export interface ProviderSearchResult {
  sourceId: string;
  title: string;
  chapterCount?: number;
  status?: string;
  image?: string;
}

export interface ContentProvider {
  name: string;
  displayName: string;
  type: 'manga' | 'anime' | 'lightnovel';
  search(query: string): Promise<ProviderSearchResult[]>;
  getChapters(sourceId: string): Promise<Chapter[]>;
  getChapterPages(chapterId: string): Promise<ChapterPagesResponse>;
  needsImageProxy: boolean;
  imageHeaders?: Record<string, string>;
}
