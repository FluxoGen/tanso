"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLibrary, LIBRARY_STATUS_LABELS, LIBRARY_STATUS_COLORS } from "@/hooks/useLibrary";
import type { LibraryStatus, LibraryEntry } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { getCoverUrl } from "@/lib/mangadex";
import { BookOpen, ChevronRight, Library, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const STATUS_TABS: { value: LibraryStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "reading", label: "Reading" },
  { value: "plan_to_read", label: "Plan to Read" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On Hold" },
  { value: "dropped", label: "Dropped" },
];

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<LibraryStatus | "all">("all");
  const [mounted, setMounted] = useState(false);
  const { library, isLoading, removeItem, updateItemStatus } = useLibrary(
    activeTab === "all" ? undefined : activeTab
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="space-y-6">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
          <div className="flex gap-2 overflow-x-auto">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 w-24 rounded-full bg-muted animate-pulse shrink-0" />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Library className="h-7 w-7" />
        <h1 className="text-2xl font-bold">My Library</h1>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Library Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : library.length === 0 ? (
        <EmptyState activeTab={activeTab} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {library.map((entry) => (
            <LibraryCard
              key={entry.mangaId}
              entry={entry}
              onRemove={() => removeItem(entry.mangaId)}
              onStatusChange={(status) => updateItemStatus(entry.mangaId, status)}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function EmptyState({ activeTab }: { activeTab: LibraryStatus | "all" }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <BookOpen className="h-16 w-16 text-muted-foreground/50 mb-4" />
      <h2 className="text-lg font-medium mb-2">No manga in your library</h2>
      <p className="text-muted-foreground mb-6 max-w-sm">
        {activeTab === "all"
          ? "Start building your collection by adding manga you want to read or track."
          : `You don't have any manga marked as "${LIBRARY_STATUS_LABELS[activeTab as LibraryStatus]}".`}
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-primary hover:underline"
      >
        Browse manga
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

interface LibraryCardProps {
  entry: LibraryEntry;
  onRemove: () => void;
  onStatusChange: (status: LibraryStatus) => void;
}

function LibraryCard({ entry, onRemove, onStatusChange }: LibraryCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const coverUrl = entry.coverUrl
    ? entry.coverUrl.includes("mangadex.org")
      ? entry.coverUrl
      : getCoverUrl(entry.mangaId, entry.coverUrl, "256")
    : null;

  return (
    <div className="group relative">
      <Link
        href={`/manga/${entry.mangaId}`}
        className="flex flex-col gap-2 rounded-lg overflow-hidden transition-transform hover:scale-[1.02]"
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-muted">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={entry.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              No Cover
            </div>
          )}
          <Badge
            className={cn(
              "absolute top-1.5 left-1.5 text-[10px]",
              LIBRARY_STATUS_COLORS[entry.status]
            )}
          >
            {LIBRARY_STATUS_LABELS[entry.status]}
          </Badge>
        </div>
        <div className="px-0.5">
          <h3 className="text-sm font-medium leading-tight line-clamp-2">
            {entry.title}
          </h3>
        </div>
      </Link>

      {/* Quick Actions */}
      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.preventDefault();
            setShowMenu(!showMenu);
          }}
          className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm hover:bg-accent transition-colors"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </button>
      </div>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute top-10 right-0 z-50 bg-popover rounded-md shadow-lg border p-1 min-w-[140px]">
            <button
              onClick={() => {
                onRemove();
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent rounded-sm transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          </div>
        </>
      )}
    </div>
  );
}
