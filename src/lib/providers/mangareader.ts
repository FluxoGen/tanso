import { MANGA } from "@consumet/extensions";
import type { ContentProvider, ProviderSearchResult } from "./types";
import type { Chapter, ChapterPagesResponse } from "@/types/manga";

const TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms),
    ),
  ]);
}

function parseChapterNumber(ch: { id: string; chapterNumber?: number; chapter?: string; title?: string }): string | null {
  if (ch.chapter != null) return String(ch.chapter);
  if (ch.chapterNumber != null && !isNaN(ch.chapterNumber)) {
    return String(ch.chapterNumber);
  }
  if (ch.title) {
    const match = ch.title.match(/chapter\s*(\d+(?:\.\d+)?)/i);
    if (match) return match[1];
  }
  const idMatch = ch.id.match(/chapter-(\d+(?:\.\d+)?)/);
  if (idMatch) return idMatch[1];
  return null;
}

function safeDate(raw: string | undefined | null): string {
  if (!raw) return "";
  const d = new Date(raw);
  return isNaN(d.getTime()) ? "" : d.toISOString();
}

export class MangaReaderProvider implements ContentProvider {
  name = "mangapill";
  displayName = "MangaPill";
  type = "manga" as const;
  needsImageProxy = true;
  imageHeaders = { Referer: "https://mangapill.com/" };

  private client = new MANGA.MangaPill();

  async search(query: string): Promise<ProviderSearchResult[]> {
    const results = await withTimeout(this.client.search(query), TIMEOUT_MS);
    if (!results?.results) return [];

    return results.results.map((r) => ({
      sourceId: r.id,
      title: r.title as string,
      chapterCount: undefined,
      status: undefined,
      image: r.image ?? undefined,
    }));
  }

  async getChapters(sourceId: string): Promise<Chapter[]> {
    const info = await withTimeout(this.client.fetchMangaInfo(sourceId), TIMEOUT_MS);
    if (!info?.chapters) return [];

    return info.chapters.map((ch) => ({
      id: ch.id,
      title: (ch.title as string) ?? null,
      chapter: parseChapterNumber(ch as { id: string; chapterNumber?: number; chapter?: string; title?: string }),
      volume: ch.volume != null ? String(ch.volume) : null,
      pages: 0,
      translatedLanguage: "en",
      publishAt: safeDate(ch.releaseDate as string | undefined),
      scanlationGroup: "MangaPill",
      source: "mangapill",
    }));
  }

  async getChapterPages(chapterId: string): Promise<ChapterPagesResponse> {
    const data = await withTimeout(this.client.fetchChapterPages(chapterId), TIMEOUT_MS);

    return {
      source: "mangapill",
      pages: (data ?? []).map((p, idx) => ({
        img: p.img,
        page: p.page ?? idx + 1,
      })),
    };
  }
}
