"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import type { MangaTag } from "@/types/manga";

export type TagGroup = "genre" | "theme" | "format" | "demographic";

const CONTENT_RATINGS = [
  { id: "safe", name: "Safe" },
  { id: "suggestive", name: "Suggestive" },
  { id: "erotica", name: "Erotica" },
  { id: "pornographic", name: "18+" },
] as const;

const TAG_GROUP_LABELS: Record<TagGroup, string> = {
  genre: "Genres",
  theme: "Themes",
  format: "Format",
  demographic: "Demographic",
};

const TAG_GROUP_ORDER: TagGroup[] = ["genre", "theme", "demographic", "format"];

interface TagFilterProps {
  selectedTags: string[];
  selectedRatings: string[];
  onTagsChange: (tags: string[]) => void;
  onRatingsChange: (ratings: string[]) => void;
  compact?: boolean;
}

export function TagFilter({
  selectedTags,
  selectedRatings,
  onTagsChange,
  onRatingsChange,
  compact = false,
}: TagFilterProps) {
  const [tags, setTags] = useState<MangaTag[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["genre"]));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/manga/tags")
      .then((r) => r.json())
      .then((json) => {
        setTags(json.data as MangaTag[]);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const toggleTag = useCallback(
    (id: string) => {
      if (selectedTags.includes(id)) {
        onTagsChange(selectedTags.filter((s) => s !== id));
      } else {
        onTagsChange([...selectedTags, id]);
      }
    },
    [selectedTags, onTagsChange]
  );

  const toggleRating = useCallback(
    (id: string) => {
      if (selectedRatings.includes(id)) {
        onRatingsChange(selectedRatings.filter((s) => s !== id));
      } else {
        onRatingsChange([...selectedRatings, id]);
      }
    },
    [selectedRatings, onRatingsChange]
  );

  const toggleGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  const clearAll = () => {
    onTagsChange([]);
    onRatingsChange([]);
  };

  const tagsByGroup = TAG_GROUP_ORDER.reduce((acc, group) => {
    acc[group] = tags
      .filter((t) => t.group === group)
      .sort((a, b) => a.name.localeCompare(b.name));
    return acc;
  }, {} as Record<TagGroup, MangaTag[]>);

  const hasActiveFilters = selectedTags.length > 0 || selectedRatings.length > 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {["Genres", "Rating"].map((label) => (
          <div key={label} className="space-y-2">
            <div className="h-5 w-24 rounded bg-muted animate-pulse" />
            <div className="flex gap-2 overflow-hidden">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-8 w-20 shrink-0 rounded-full bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Active filters summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pb-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {selectedRatings.map((id) => {
            const rating = CONTENT_RATINGS.find((r) => r.id === id);
            return (
              <button
                key={id}
                onClick={() => toggleRating(id)}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                {rating?.name}
                <X className="h-3 w-3" />
              </button>
            );
          })}
          {selectedTags.map((id) => {
            const tag = tags.find((t) => t.id === id);
            return (
              <button
                key={id}
                onClick={() => toggleTag(id)}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                {tag?.name}
                <X className="h-3 w-3" />
              </button>
            );
          })}
          <button
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Content Rating Row */}
      <FilterRow
        label="Rating"
        isExpanded={expandedGroups.has("rating")}
        onToggle={() => toggleGroup("rating")}
        compact={compact}
      >
        {CONTENT_RATINGS.map((rating) => (
          <FilterChip
            key={rating.id}
            label={rating.name}
            isSelected={selectedRatings.includes(rating.id)}
            onClick={() => toggleRating(rating.id)}
            variant={
              rating.id === "pornographic"
                ? "danger"
                : rating.id === "erotica"
                ? "warning"
                : undefined
            }
          />
        ))}
      </FilterRow>

      {/* Tag Groups */}
      {TAG_GROUP_ORDER.map((group) => {
        const groupTags = tagsByGroup[group];
        if (!groupTags?.length) return null;

        return (
          <FilterRow
            key={group}
            label={TAG_GROUP_LABELS[group]}
            isExpanded={expandedGroups.has(group)}
            onToggle={() => toggleGroup(group)}
            compact={compact}
            selectedCount={groupTags.filter((t) => selectedTags.includes(t.id)).length}
          >
            {groupTags.map((tag) => (
              <FilterChip
                key={tag.id}
                label={tag.name}
                isSelected={selectedTags.includes(tag.id)}
                onClick={() => toggleTag(tag.id)}
              />
            ))}
          </FilterRow>
        );
      })}
    </div>
  );
}

interface FilterRowProps {
  label: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  compact?: boolean;
  selectedCount?: number;
}

function FilterRow({
  label,
  isExpanded,
  onToggle,
  children,
  compact,
  selectedCount = 0,
}: FilterRowProps) {
  return (
    <div className="space-y-2">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
      >
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
        {label}
        {selectedCount > 0 && (
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
            {selectedCount}
          </span>
        )}
      </button>
      {isExpanded && (
        <div
          className={cn(
            "flex gap-2 pb-1",
            compact
              ? "flex-wrap"
              : "overflow-x-auto scrollbar-none"
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface FilterChipProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
  variant?: "default" | "warning" | "danger";
}

function FilterChip({ label, isSelected, onClick, variant = "default" }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
        isSelected
          ? variant === "danger"
            ? "bg-red-500 text-white"
            : variant === "warning"
            ? "bg-orange-500 text-white"
            : "bg-primary text-primary-foreground"
          : variant === "danger"
          ? "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
          : variant === "warning"
          ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20"
          : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {label}
    </button>
  );
}

// Simpler version for compact displays (e.g., genres only)
export function GenreChipsSimple({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (tags: string[]) => void;
}) {
  const [tags, setTags] = useState<MangaTag[]>([]);

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
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
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
