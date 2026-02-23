"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAllReadingProgress } from "@/hooks/useReadingProgress";
import { getCoverUrl } from "@/lib/mangadex";
import { clearProgress } from "@/lib/storage";
import { BookOpen, ChevronRight, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReadingProgress } from "@/lib/storage";

interface ContinueReadingProps {
  maxItems?: number;
}

export function ContinueReading({ maxItems = 6 }: ContinueReadingProps) {
  const [mounted, setMounted] = useState(false);
  const { progressList, isLoading, refresh } = useAllReadingProgress();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleRemove = useCallback(
    (mangaId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      clearProgress(mangaId);
      refresh();
    },
    [refresh]
  );

  if (!mounted || isLoading) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Continue Reading</h2>
          </div>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-40 shrink-0 space-y-2">
              <div className="aspect-[3/4] rounded-lg bg-muted animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (progressList.length === 0) {
    return null;
  }

  const items = progressList.slice(0, maxItems);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Continue Reading</h2>
        </div>
        {progressList.length > maxItems && (
          <Link
            href="/history"
            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
          >
            View all
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
        {items.map((progress) => (
          <ContinueReadingCard
            key={progress.mangaId}
            progress={progress}
            onRemove={handleRemove}
          />
        ))}
      </div>
    </section>
  );
}

function ContinueReadingCard({
  progress,
  onRemove,
}: {
  progress: ReadingProgress;
  onRemove: (mangaId: string, e: React.MouseEvent) => void;
}) {
  const coverUrl = progress.coverUrl
    ? progress.coverUrl.includes("mangadex.org")
      ? progress.coverUrl
      : getCoverUrl(progress.mangaId, progress.coverUrl, "256")
    : null;

  const percentComplete = Math.round((progress.page / progress.totalPages) * 100);
  const chapterText = progress.chapterNumber
    ? `Ch. ${progress.chapterNumber}`
    : progress.chapterTitle || "Chapter";

  const readUrl =
    progress.source === "mangadex"
      ? `/read/${progress.chapterId}?page=${progress.page}`
      : `/read/ext?chapterId=${progress.chapterId}&mangaId=${progress.mangaId}&page=${progress.page}`;

  return (
    <div className="w-36 sm:w-40 shrink-0 group">
      <Link href={readUrl} className="block relative">
        <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={progress.mangaTitle}
              fill
              className="object-cover transition-opacity group-hover:opacity-80"
              sizes="160px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              No Cover
            </div>
          )}

          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
            <div className="p-3 rounded-full bg-primary text-primary-foreground">
              <Play className="h-6 w-6 fill-current" />
            </div>
          </div>

          {/* Remove button */}
          <button
            onClick={(e) => onRemove(progress.mangaId, e)}
            className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
            title="Remove from Continue Reading"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/50">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>
      </Link>

      <div className="mt-2 space-y-0.5">
        <Link
          href={`/manga/${progress.mangaId}`}
          className="text-sm font-medium leading-tight line-clamp-2 hover:text-primary transition-colors"
        >
          {progress.mangaTitle}
        </Link>
        <p className="text-xs text-muted-foreground">
          {chapterText} · {percentComplete}%
        </p>
      </div>
    </div>
  );
}
