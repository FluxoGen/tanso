"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { GenreChips } from "@/components/genre-chips";
import { MangaGrid, MangaGridSkeleton } from "@/components/manga-grid";
import type { Manga } from "@/types/manga";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const q = searchParams.get("q") ?? "";
  const pageParam = parseInt(searchParams.get("page") ?? "1", 10);
  const genreParams = searchParams.getAll("genres");

  const [selectedGenres, setSelectedGenres] = useState<string[]>(genreParams);
  const [manga, setManga] = useState<Manga[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(pageParam);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.ceil(total / 20);

  const updateUrl = useCallback(
    (newQ: string, newGenres: string[], newPage: number) => {
      const params = new URLSearchParams();
      if (newQ) params.set("q", newQ);
      if (newPage > 1) params.set("page", String(newPage));
      for (const g of newGenres) params.append("genres", g);
      router.push(`/search?${params.toString()}`);
    },
    [router]
  );

  useEffect(() => {
    if (!q && genreParams.length === 0) return;

    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(pageParam));
    for (const g of genreParams) params.append("genres", g);

    fetch(`/api/search?${params}`)
      .then((r) => r.json())
      .then((json) => {
        setManga(json.data ?? []);
        setTotal(json.total ?? 0);
      })
      .catch(() => setManga([]))
      .finally(() => setLoading(false));
  }, [q, pageParam, genreParams.join(",")]);

  const handleGenreChange = (genres: string[]) => {
    setSelectedGenres(genres);
    setPage(1);
    updateUrl(q, genres, 1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrl(q, genreParams, newPage);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">
          {q ? `Results for "${q}"` : "Search Manga"}
        </h1>

        <GenreChips selected={selectedGenres} onChange={handleGenreChange} />
      </div>

      {q || genreParams.length > 0 ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {total > 0 ? `${total} result${total === 1 ? "" : "s"} found` : "No results"}
            </p>
          </div>

          {loading ? (
            <MangaGridSkeleton count={20} />
          ) : (
            <MangaGrid manga={manga} />
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
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
                onClick={() => handlePageChange(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <p className="text-center text-muted-foreground py-12">
          Use the search bar above to find manga, or select a genre to browse.
        </p>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<MangaGridSkeleton count={20} />}>
      <SearchContent />
    </Suspense>
  );
}
