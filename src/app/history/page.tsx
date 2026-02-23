"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useHistory, formatRelativeTime, groupHistoryByDate } from "@/hooks/useHistory";
import { getCoverUrl } from "@/lib/mangadex";
import { Clock, ChevronRight, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HistoryEntry } from "@/lib/storage";

export default function HistoryPage() {
  const [mounted, setMounted] = useState(false);
  const { history, isLoading, remove, clear } = useHistory();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="space-y-6">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-24 w-16 rounded bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  const groupedHistory = groupHistoryByDate(history);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="h-7 w-7" />
          <h1 className="text-2xl font-bold">Reading History</h1>
        </div>
        {history.length > 0 && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-8">
          {Array.from(groupedHistory.entries()).map(([dateGroup, entries]) => (
            <section key={dateGroup} className="space-y-4">
              <h2 className="text-lg font-semibold text-muted-foreground border-b pb-2">
                {dateGroup}
              </h2>
              <div className="space-y-3">
                {entries.map((entry) => (
                  <HistoryCard key={entry.mangaId} entry={entry} onRemove={() => remove(entry.mangaId)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-popover rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-2">Clear History</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to clear your entire reading history? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clear();
                  setShowClearConfirm(false);
                }}
                className="px-4 py-2 text-sm font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Clock className="h-16 w-16 text-muted-foreground/50 mb-4" />
      <h2 className="text-lg font-medium mb-2">No reading history</h2>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Your reading history will appear here as you read manga chapters.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-primary hover:underline"
      >
        Start reading
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

interface HistoryCardProps {
  entry: HistoryEntry;
  onRemove: () => void;
}

function HistoryCard({ entry, onRemove }: HistoryCardProps) {
  const coverUrl = entry.coverUrl
    ? entry.coverUrl.includes("mangadex.org")
      ? entry.coverUrl
      : getCoverUrl(entry.mangaId, entry.coverUrl, "256")
    : null;

  const chapterText = entry.lastChapterNumber
    ? `Ch. ${entry.lastChapterNumber}`
    : entry.lastChapterTitle || "Chapter";

  return (
    <div className="group flex gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors">
      <Link
        href={`/manga/${entry.mangaId}`}
        className="shrink-0"
      >
        <div className="relative h-24 w-16 overflow-hidden rounded-md bg-muted">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={entry.title}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
              No Cover
            </div>
          )}
        </div>
      </Link>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <Link
          href={`/manga/${entry.mangaId}`}
          className="font-medium line-clamp-1 hover:text-primary transition-colors"
        >
          {entry.title}
        </Link>
        <p className="text-sm text-muted-foreground line-clamp-1">
          {chapterText}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatRelativeTime(entry.lastReadAt)}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={
            entry.source === "mangadex"
              ? `/read/${entry.lastChapterId}`
              : `/read/ext?chapterId=${entry.lastChapterId}&mangaId=${entry.mangaId}`
          }
          className="text-sm font-medium text-primary hover:underline shrink-0"
        >
          Continue
        </Link>
        <button
          onClick={onRemove}
          className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-accent transition-all"
          title="Remove from history"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
