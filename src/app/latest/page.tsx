"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MangaCard, MangaCardSkeleton } from "@/components/manga-card";
import { TagFilter } from "@/components/tag-filter";
import type { Manga } from "@/types/manga";
import { Loader2 } from "lucide-react";

const ITEMS_PER_PAGE = 20;

export default function LatestPage() {
  const [manga, setManga] = useState<Manga[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
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
          setManga((prev) => [...prev, ...json.data]);
        }

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
    setHasMore(true);
    fetchManga(0, true);
  }, [selectedTags, selectedRatings]);

  // Infinite scroll observer
  useEffect(() => {
    if (isLoading || isLoadingMore || !hasMore) return;

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
  }, [isLoading, isLoadingMore, hasMore, offset, fetchManga]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Latest Updates</h1>
        <p className="text-muted-foreground">
          Discover the most recently updated manga
        </p>
      </div>

      <TagFilter
        selectedTags={selectedTags}
        selectedRatings={selectedRatings}
        onTagsChange={setSelectedTags}
        onRatingsChange={setSelectedRatings}
      />

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

          {/* Load more trigger */}
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
        </>
      )}
    </main>
  );
}
