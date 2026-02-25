/**
 * Builds the read URL for a chapter.
 * For MangaDex: /read/[chapterId]?manga=...
 * For external sources: /read/ext?chapterId=...&manga=...&source=...
 */
export function buildReadUrl(params: {
  chapterId: string;
  mangaId?: string;
  source?: string;
  title?: string;
  cover?: string | null;
  sourceId?: string;
  page?: number;
}): string {
  const {
    chapterId,
    mangaId,
    source = 'mangadex',
    title = 'Manga',
    cover,
    sourceId,
    page = 0,
  } = params;

  const titleParam = `title=${encodeURIComponent(title)}`;
  const coverParam = cover ? `&cover=${encodeURIComponent(cover)}` : '';
  const pageParam = page > 0 ? `&page=${page}` : '';
  const sourceIdParam =
    source !== 'mangadex' && sourceId ? `&sourceId=${encodeURIComponent(sourceId)}` : '';

  if (source === 'mangadex') {
    const base = `/read/${chapterId}`;
    const search = [mangaId && `manga=${mangaId}`, titleParam, coverParam, pageParam]
      .filter(Boolean)
      .join('&');
    return search ? `${base}?${search}` : base;
  }

  const search = [
    `chapterId=${encodeURIComponent(chapterId)}`,
    mangaId && `manga=${mangaId}`,
    `source=${encodeURIComponent(source)}`,
    titleParam,
    coverParam,
    sourceIdParam,
    pageParam,
  ]
    .filter(Boolean)
    .join('&');

  return `/read/ext?${search}`;
}
