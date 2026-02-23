import type { Manga, MangaTag, Chapter, PaginatedResponse } from "@/types/manga";

interface MangaDexChapterPages {
  baseUrl: string;
  hash: string;
  data: string[];
  dataSaver: string[];
}

const BASE_URL = "https://api.mangadex.org";

// --- Raw MangaDex types (internal) ---

interface MdRelationship {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
}

interface MdMangaAttributes {
  title: Record<string, string>;
  altTitles: Record<string, string>[];
  description: Record<string, string>;
  status: string;
  year: number | null;
  contentRating: string;
  tags: {
    id: string;
    attributes: { name: Record<string, string>; group: string };
  }[];
  lastChapter: string | null;
  lastVolume: string | null;
}

interface MdChapterAttributes {
  title: string | null;
  chapter: string | null;
  volume: string | null;
  pages: number;
  translatedLanguage: string;
  publishAt: string;
}

const ALL_CONTENT_RATINGS = ["safe", "suggestive", "erotica", "pornographic"];

function appendContentRatings(params: URLSearchParams): void {
  for (const rating of ALL_CONTENT_RATINGS) {
    params.append("contentRating[]", rating);
  }
}

// --- Helpers ---

function pickTitle(titles: Record<string, string>, altTitles?: Record<string, string>[]): { title: string; altTitle?: string } {
  const en = titles["en"];
  const jaRo = titles["ja-ro"] || titles["ja"];
  const first = Object.values(titles)[0];
  const title = en || jaRo || first || "Untitled";

  let altTitle: string | undefined;
  if (en && jaRo && en !== jaRo) {
    altTitle = jaRo;
  } else if (altTitles?.length) {
    const alt = altTitles.find((a) => a["ja-ro"] || a["ja"] || a["en"]);
    if (alt) altTitle = Object.values(alt)[0];
  }

  return { title, altTitle };
}

function normalizeManga(item: { id: string; attributes: MdMangaAttributes; relationships: MdRelationship[] }): Manga {
  const a = item.attributes;
  const { title, altTitle } = pickTitle(a.title, a.altTitles);

  const coverRel = item.relationships.find((r) => r.type === "cover_art");
  const authorRel = item.relationships.find((r) => r.type === "author");
  const artistRel = item.relationships.find((r) => r.type === "artist");

  return {
    id: item.id,
    title,
    altTitle,
    description: a.description["en"] || Object.values(a.description)[0] || "",
    status: a.status,
    year: a.year,
    contentRating: a.contentRating,
    tags: a.tags.map((t) => ({
      id: t.id,
      name: t.attributes.name["en"] || Object.values(t.attributes.name)[0] || "",
      group: t.attributes.group,
    })),
    coverId: coverRel?.id ?? null,
    coverFileName: (coverRel?.attributes?.["fileName"] as string) ?? null,
    authorName: (authorRel?.attributes?.["name"] as string) ?? null,
    artistName: (artistRel?.attributes?.["name"] as string) ?? null,
    lastChapter: a.lastChapter,
    lastVolume: a.lastVolume,
  };
}

function normalizeChapter(item: { id: string; attributes: MdChapterAttributes; relationships: MdRelationship[] }): Chapter {
  const a = item.attributes;
  const groupRel = item.relationships.find((r) => r.type === "scanlation_group");

  return {
    id: item.id,
    title: a.title,
    chapter: a.chapter,
    volume: a.volume,
    pages: a.pages,
    translatedLanguage: a.translatedLanguage,
    publishAt: a.publishAt,
    scanlationGroup: (groupRel?.attributes?.["name"] as string) ?? null,
    source: "mangadex",
  };
}

// --- Public API ---

export async function searchManga(
  query: string,
  options: { limit?: number; offset?: number; includedTags?: string[] } = {}
): Promise<PaginatedResponse<Manga>> {
  const params = new URLSearchParams({
    title: query,
    limit: String(options.limit ?? 20),
    offset: String(options.offset ?? 0),
    "includes[]": "cover_art",
    "order[relevance]": "desc",
  });
  appendContentRatings(params);

  if (options.includedTags?.length) {
    for (const tag of options.includedTags) {
      params.append("includedTags[]", tag);
    }
  }

  params.append("includes[]", "author");
  params.append("includes[]", "artist");

  const res = await fetch(`${BASE_URL}/manga?${params}`);
  const json = await res.json();

  return {
    data: json.data.map(normalizeManga),
    total: json.total,
    offset: json.offset,
    limit: json.limit,
  };
}

export async function getMangaDetails(id: string): Promise<Manga> {
  const params = new URLSearchParams();
  params.append("includes[]", "cover_art");
  params.append("includes[]", "author");
  params.append("includes[]", "artist");
  appendContentRatings(params);

  const res = await fetch(`${BASE_URL}/manga/${id}?${params}`);
  const json = await res.json();
  return normalizeManga(json.data);
}

export async function getMangaChapters(
  id: string,
  options: { limit?: number; offset?: number; translatedLanguage?: string; order?: "asc" | "desc" } = {}
): Promise<PaginatedResponse<Chapter>> {
  const params = new URLSearchParams({
    limit: String(options.limit ?? 30),
    offset: String(options.offset ?? 0),
    "translatedLanguage[]": options.translatedLanguage ?? "en",
    "order[chapter]": options.order ?? "desc",
    "includes[]": "scanlation_group",
  });
  appendContentRatings(params);

  const res = await fetch(`${BASE_URL}/manga/${id}/feed?${params}`);
  const json = await res.json();

  return {
    data: json.data.map(normalizeChapter),
    total: json.total,
    offset: json.offset,
    limit: json.limit,
  };
}

export async function getChapterPages(chapterId: string): Promise<MangaDexChapterPages> {
  const res = await fetch(`${BASE_URL}/at-home/server/${chapterId}`);
  const json = await res.json();

  return {
    baseUrl: json.baseUrl,
    hash: json.chapter.hash,
    data: json.chapter.data,
    dataSaver: json.chapter.dataSaver,
  };
}

let cachedTags: MangaTag[] | null = null;

export async function getMangaTags(): Promise<MangaTag[]> {
  if (cachedTags) return cachedTags;

  const res = await fetch(`${BASE_URL}/manga/tag`);
  const json = await res.json();

  cachedTags = json.data.map(
    (t: { id: string; attributes: { name: Record<string, string>; group: string } }) => ({
      id: t.id,
      name: t.attributes.name["en"] || Object.values(t.attributes.name)[0] || "",
      group: t.attributes.group,
    })
  );

  return cachedTags!;
}

export async function getPopularManga(limit = 20, includedTags?: string[]): Promise<Manga[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: "0",
    "includes[]": "cover_art",
    "order[followedCount]": "desc",
  });
  appendContentRatings(params);
  params.append("includes[]", "author");
  params.append("includes[]", "artist");
  if (includedTags?.length) {
    for (const tag of includedTags) params.append("includedTags[]", tag);
  }
  const res = await fetch(`${BASE_URL}/manga?${params}`);
  const json = await res.json();
  return json.data.map(normalizeManga);
}

export async function getLatestManga(limit = 20, includedTags?: string[]): Promise<Manga[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: "0",
    "includes[]": "cover_art",
    "order[latestUploadedChapter]": "desc",
  });
  appendContentRatings(params);
  params.append("includes[]", "author");
  params.append("includes[]", "artist");
  if (includedTags?.length) {
    for (const tag of includedTags) params.append("includedTags[]", tag);
  }
  const res = await fetch(`${BASE_URL}/manga?${params}`);
  const json = await res.json();
  return json.data.map(normalizeManga);
}

export async function getTrendingManga(limit = 20, includedTags?: string[]): Promise<Manga[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: "0",
    "includes[]": "cover_art",
    "order[rating]": "desc",
  });
  appendContentRatings(params);
  params.append("includes[]", "author");
  params.append("includes[]", "artist");
  if (includedTags?.length) {
    for (const tag of includedTags) params.append("includedTags[]", tag);
  }
  const res = await fetch(`${BASE_URL}/manga?${params}`);
  const json = await res.json();
  return json.data.map(normalizeManga);
}

export function getCoverUrl(mangaId: string, coverFileName: string, size: "256" | "512" | "original" = "256"): string {
  const suffix = size === "original" ? "" : `.${size}.jpg`;
  return `https://uploads.mangadex.org/covers/${mangaId}/${coverFileName}${suffix}`;
}

