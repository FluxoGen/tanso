"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import type { MangaTag } from "@/types/manga";

interface GenreChipsProps {
  selected: string[];
  onChange: (tags: string[]) => void;
}

export function GenreChips({ selected, onChange }: GenreChipsProps) {
  const [tags, setTags] = useState<MangaTag[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/manga/tags")
      .then((r) => r.json())
      .then((json) => {
        const genreTags = (json.data as MangaTag[])
          .filter((t) => t.group === "genre")
          .sort((a, b) => a.name.localeCompare(b.name));
        setTags(genreTags);
      })
      .catch(() => {});
  }, []);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  if (tags.length === 0) {
    return (
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-8 w-20 shrink-0 rounded-full bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto pb-2 scrollbar-none"
    >
      <button
        onClick={() => onChange([])}
        className={cn(
          "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
          selected.length === 0
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        All
      </button>
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => toggle(tag.id)}
          className={cn(
            "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
            selected.includes(tag.id)
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          {tag.name}
        </button>
      ))}
    </div>
  );
}
