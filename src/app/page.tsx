"use client";

import { useEffect, useState, useCallback } from "react";
import { GenreChips } from "@/components/genre-chips";
import { MangaGrid, MangaGridSkeleton } from "@/components/manga-grid";
import type { Manga } from "@/types/manga";

type Section = "trending" | "popular" | "latest";

function useMangaSection(section: Section, tags: string[]) {
  const [data, setData] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    for (const t of tags) params.append("tags", t);

    fetch(`/api/manga/${section}?${params}`)
      .then((r) => r.json())
      .then((json) => setData(json.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [section, tags]);

  return { data, loading };
}

export default function HomePage() {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const trending = useMangaSection("trending", selectedTags);
  const popular = useMangaSection("popular", selectedTags);
  const latest = useMangaSection("latest", selectedTags);

  const handleTagChange = useCallback((tags: string[]) => {
    setSelectedTags(tags);
  }, []);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold tracking-tight mb-4">Discover Manga</h1>
        <GenreChips selected={selectedTags} onChange={handleTagChange} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Trending</h2>
        {trending.loading ? <MangaGridSkeleton count={5} /> : <MangaGrid manga={trending.data} />}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Most Popular</h2>
        {popular.loading ? <MangaGridSkeleton count={5} /> : <MangaGrid manga={popular.data} />}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Latest Updates</h2>
        {latest.loading ? <MangaGridSkeleton count={5} /> : <MangaGrid manga={latest.data} />}
      </section>
    </div>
  );
}
