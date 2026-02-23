"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MangaCard, MangaCardSkeleton } from "@/components/manga-card";
import { TagFilter } from "@/components/tag-filter";
import { Button } from "@/components/ui/button";
import type { Manga } from "@/types/manga";
import { Loader2, List, Infinity } from "lucide-react";

const ITEMS_PER_PAGE = 20;

type ViewMode = "infinite" | "paginated";

export default function LatestPage() {
  const [manga, setManga] = useState<Manga[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("infinite");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<string[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchManga = useCallback(
    async (newOffset: number, reset = false) => {
      if (reset) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const params = new URLSearchParams({
          limit: String(ITEMS_PER_PAGE),
          offset: String(newOffset),
        });

        if (selectedTags.length > 0) {
          selectedTags.forEach((tag) => params.append("tags", tag));
        }

        if (selectedRatings.length > 0) {
          selectedRatings.forEach((rating) => params.append("ratings", rating));
        }

        const res = await fetch(`/api/manga/latest?${params}`);
        const json = await res.json();

        if (reset) {
          setManga(json.data);
        } else {
          // Deduplicate manga by ID when appending
          setManga((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newManga = json.data.filter((m: Manga) => !existingIds.has(m.id));
            return [...prev, ...newManga];
          });
        }

        setTotal(json.total ?? 0);
        setHasMore(json.data.length === ITEMS_PER_PAGE && newOffset + json.data.length < json.total);
        setOffset(newOffset + json.data.length);
      } catch (error) {
        console.error("Error fetching latest manga:", error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [selectedTags, selectedRatings]
  );

  // Initial load and filter changes
  useEffect(() => {
    setManga([]);
    setOffset(0);
    setCurrentPage(1);
    setHasMore(true);
    fetchManga(0, true);
  }, [selectedTags, selectedRatings]);

  // Handle page change in paginated mode
  const handlePageChange = useCallback(
    (newPage: number) => {
      setCurrentPage(newPage);
      const newOffset = (newPage - 1) * ITEMS_PER_PAGE;
      setManga([]);
      fetchManga(newOffset, true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [fetchManga]
  );

  // Toggle view mode
  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === viewMode) return;
    setViewMode(mode);
    setManga([]);
    setOffset(0);
    setCurrentPage(1);
    setHasMore(true);
    fetchManga(0, true);
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  // Infinite scroll observer (only active in infinite mode)
  useEffect(() => {
    if (viewMode !== "infinite" || isLoading || isLoadingMore || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          fetchManga(offset);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [viewMode, isLoading, isLoadingMore, hasMore, offset, fetchManga]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Latest Updates</h1>
        <p className="text-muted-foreground">
          Discover the most recently updated manga
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <TagFilter
          selectedTags={selectedTags}
          selectedRatings={selectedRatings}
          onTagsChange={setSelectedTags}
          onRatingsChange={setSelectedRatings}
          compact
        />

        {/* View mode toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm text-muted-foreground">View:</span>
          <div className="flex rounded-md border">
            <button
              onClick={() => handleViewModeChange("infinite")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 rounded-l-md transition-colors ${
                viewMode === "infinite"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
              title="Infinite scroll"
            >
              <Infinity className="h-4 w-4" />
              <span className="hidden sm:inline">Scroll</span>
            </button>
            <button
              onClick={() => handleViewModeChange("paginated")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 rounded-r-md border-l transition-colors ${
                viewMode === "paginated"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
              title="Page navigation"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Pages</span>
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <MangaCardSkeleton key={i} />
          ))}
        </div>
      ) : manga.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No manga found with the selected filters</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {manga.map((m) => (
              <MangaCard key={m.id} manga={m} />
            ))}
          </div>

          {/* Infinite scroll trigger */}
          {viewMode === "infinite" && (
            <div ref={loadMoreRef} className="flex justify-center py-8">
              {isLoadingMore && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading more...</span>
                </div>
              )}
              {!hasMore && manga.length > 0 && (
                <p className="text-muted-foreground">No more manga to load</p>
              )}
            </div>
          )}

          {/* Pagination controls */}
          {viewMode === "paginated" && totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 py-8">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                Previous
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Page</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value, 10);
                    if (page >= 1 && page <= totalPages) {
                      handlePageChange(page);
                    }
                  }}
                  className="w-16 h-9 rounded-md border bg-background px-2 text-sm text-center"
                />
                <span className="text-sm text-muted-foreground">of {totalPages}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
