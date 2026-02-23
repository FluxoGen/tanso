"use client";

import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Chapter, MangaSource } from "@/types/manga";

interface ChapterListProps {
  mangaId: string;
  mangaTitle: string;
  altTitles?: string[];
  lastChapter: string | null;
  anilistId?: string;
}

const CHAPTERS_PER_PAGE = 30;

export function ChapterList({ mangaId, mangaTitle, altTitles, lastChapter, anilistId }: ChapterListProps) {
  const [sources, setSources] = useState<MangaSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<MangaSource | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [chapterError, setChapterError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Discover sources progressively
  useEffect(() => {
    const params = new URLSearchParams({ title: mangaTitle });
    if (lastChapter) params.set("lastChapter", lastChapter);
    if (anilistId) params.set("anilistId", anilistId);
    if (altTitles?.length) params.set("altTitles", altTitles.join("||"));

    fetch(`/api/manga/${mangaId}/sources?${params}`)
      .then((r) => r.json())
      .then((json) => {
        const fetched: MangaSource[] = json.sources ?? [];
        setSources(fetched);

        if (fetched.length > 0 && !selectedSource) {
          const best = pickDefaultSource(fetched, lastChapter);
          setSelectedSource(best);
        }
      })
      .catch(() => {})
      .finally(() => setSourcesLoading(false));
  }, [mangaId, mangaTitle, altTitles, lastChapter, anilistId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch chapters when source or page changes
  const fetchChapters = useCallback(
    (source: MangaSource, pg: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setChapterError(null);

      let url: string;
      if (source.provider === "mangadex") {
        url = `/api/manga/${mangaId}/chapters?source=mangadex&page=${pg}`;
      } else {
        url = `/api/manga/${mangaId}/chapters?source=${source.provider}&sourceId=${encodeURIComponent(source.sourceId)}`;
      }

      fetch(url, { signal: controller.signal })
        .then((r) => r.json())
        .then((json) => {
          const data: Chapter[] = json.data ?? [];
          const fetchedTotal: number = json.total ?? 0;
          setChapters(data);
          setTotal(fetchedTotal);

          const realCount = source.provider === "mangadex" ? fetchedTotal : data.length;
          if (realCount > 0 && source.chapterCount === 0) {
            setSources((prev) =>
              prev.map((s) =>
                s.provider === source.provider && s.sourceId === source.sourceId
                  ? { ...s, chapterCount: realCount }
                  : s,
              ),
            );
          }
        })
        .catch((e) => {
          if (e.name !== "AbortError") {
            setChapterError(`Failed to load chapters from ${source.displayName}.`);
          }
        })
        .finally(() => setLoading(false));
    },
    [mangaId],
  );

  useEffect(() => {
    if (selectedSource) {
      fetchChapters(selectedSource, page);
    }
  }, [selectedSource, page, fetchChapters]);

  // Reset page when switching source
  const handleSourceChange = (source: MangaSource) => {
    setSelectedSource(source);
    setPage(1);
  };

  // For non-MangaDex sources, do client-side pagination
  const isMangaDex = selectedSource?.provider === "mangadex";
  const displayChapters = isMangaDex
    ? chapters
    : chapters.slice((page - 1) * CHAPTERS_PER_PAGE, page * CHAPTERS_PER_PAGE);
  const totalPages = isMangaDex
    ? Math.ceil(total / CHAPTERS_PER_PAGE)
    : Math.ceil(chapters.length / CHAPTERS_PER_PAGE);

  return (
    <div className="space-y-4">
      {/* Source tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {sources.map((s) => (
          <button
            key={`${s.provider}:${s.sourceId}`}
            onClick={() => handleSourceChange(s)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedSource?.provider === s.provider && selectedSource?.sourceId === s.sourceId
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            <span>{s.displayName}</span>
            <span className="opacity-75">({s.chapterCount || "?"})</span>
          </button>
        ))}

        {sourcesLoading && (
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-32 rounded-full" />
            <span className="text-xs text-muted-foreground">Discovering sources...</span>
          </div>
        )}
      </div>

      {!sourcesLoading && sources.length <= 1 && sources[0]?.provider === "mangadex" && (
        <p className="text-xs text-muted-foreground">
          Only MangaDex available for this title.
        </p>
      )}

      {/* Chapter list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : chapterError ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-sm text-muted-foreground">{chapterError}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => selectedSource && fetchChapters(selectedSource, page)}
          >
            Try again
          </Button>
        </div>
      ) : displayChapters.length === 0 ? (
        <p className="text-muted-foreground py-4">
          {selectedSource
            ? `No chapters found on ${selectedSource.displayName}.`
            : "No chapters available."}
        </p>
      ) : (
        <div className="space-y-1">
          {displayChapters.map((ch) => (
            <ChapterRow key={`${ch.source}:${ch.id}`} ch={ch} mangaId={mangaId} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !loading && !chapterError && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function ChapterRow({ ch, mangaId }: { ch: Chapter; mangaId: string }) {
  const href =
    ch.source === "mangadex"
      ? `/read/${ch.id}?manga=${mangaId}`
      : `/read/ext?manga=${mangaId}&source=${ch.source}&chapterId=${encodeURIComponent(ch.id)}`;

  return (
    <Link
      href={href}
      className="block rounded-md px-3 py-2.5 text-sm hover:bg-accent transition-colors"
    >
      <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0 flex-1">
          <span className="font-medium shrink-0">
            {ch.volume ? `Vol. ${ch.volume} ` : ""}
            Ch. {ch.chapter ?? "—"}
          </span>
          {ch.title && (
            <span className="text-muted-foreground">
              {ch.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground shrink-0">
          {ch.scanlationGroup && (
            <span className="hidden sm:inline whitespace-nowrap">
              {ch.scanlationGroup}
            </span>
          )}
          {ch.publishAt && (
            <span className="whitespace-nowrap">
              {new Date(ch.publishAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      {ch.scanlationGroup && (
        <span className="sm:hidden text-xs text-muted-foreground mt-1 block">
          {ch.scanlationGroup}
        </span>
      )}
    </Link>
  );
}

function pickDefaultSource(sources: MangaSource[], lastChapter: string | null): MangaSource {
  const mdSource = sources.find((s) => s.provider === "mangadex");
  const expected = lastChapter ? parseInt(lastChapter, 10) : 0;

  if (mdSource && expected > 0 && mdSource.chapterCount >= expected * 0.8) {
    return mdSource;
  }

  // Pick highest-confidence source with the most chapters
  const sorted = [...sources].sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return b.chapterCount - a.chapterCount;
  });

  return sorted[0] ?? sources[0];
}
