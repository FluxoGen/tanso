import type { ContentProvider, ProviderSearchResult } from "./types";
import type { Chapter, ChapterPagesResponse } from "@/types/manga";
import { searchManga, getMangaChapters, getChapterPages } from "@/lib/mangadex";

export class MangaDexProvider implements ContentProvider {
  name = "mangadex";
  displayName = "MangaDex";
  type = "manga" as const;
  needsImageProxy = false;

  async search(query: string): Promise<ProviderSearchResult[]> {
    const result = await searchManga(query, { limit: 10 });
    return result.data.map((m) => ({
      sourceId: m.id,
      title: m.title,
      chapterCount: m.lastChapter ? parseInt(m.lastChapter, 10) || undefined : undefined,
      status: m.status,
      image: m.coverFileName
        ? `https://uploads.mangadex.org/covers/${m.id}/${m.coverFileName}.256.jpg`
        : undefined,
    }));
  }

  async getChapters(sourceId: string): Promise<Chapter[]> {
    const chapters: Chapter[] = [];
    let offset = 0;
    const limit = 100;

    // Fetch all chapters by paginating
    while (true) {
      const page = await getMangaChapters(sourceId, { limit, offset, order: "desc" });
      chapters.push(...page.data);
      if (chapters.length >= page.total || page.data.length < limit) break;
      offset += limit;
    }

    return chapters;
  }

  async getChapterPages(chapterId: string): Promise<ChapterPagesResponse> {
    const pages = await getChapterPages(chapterId);
    return {
      source: "mangadex" as const,
      baseUrl: pages.baseUrl,
      hash: pages.hash,
      data: pages.data,
      dataSaver: pages.dataSaver,
    };
  }
}
