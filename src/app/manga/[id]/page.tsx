"use client";

import Image from "next/image";
import { useEffect, useState, useCallback, use } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ChapterList } from "@/components/chapter-list";
import { getCoverUrl } from "@/lib/mangadex";
import type { Manga } from "@/types/manga";
import type { AniListMedia } from "@/types/anilist";

interface MangaDetailData {
  manga: Manga;
  anilist: AniListMedia | null;
}

export default function MangaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<MangaDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/manga/${id}`)
      .then((r) => r.json())
      .then((json) => setData(json))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <MangaDetailSkeleton />;
  if (!data?.manga) return <p className="text-center py-12 text-muted-foreground">Manga not found.</p>;

  const { manga, anilist } = data;
  const coverUrl = manga.coverFileName ? getCoverUrl(manga.id, manga.coverFileName, "512") : null;
  const bannerUrl = anilist?.bannerImage;
  const description = anilist?.description || manga.description;
  const score = anilist?.averageScore;
  const genres = manga.tags.filter((t) => t.group === "genre");

  const altTitles = Array.from(
    new Set(
      [
        manga.altTitle,
        anilist?.title?.romaji,
        anilist?.title?.english,
        anilist?.title?.native,
      ].filter((t): t is string => !!t && t !== manga.title),
    ),
  );

  return (
    <div className="space-y-6">
      {bannerUrl && (
        <div className="relative h-40 sm:h-48 md:h-64 -mx-4 -mt-6 w-[calc(100%+2rem)] overflow-hidden">
          <Image src={bannerUrl} alt="" fill className="object-cover object-center" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        </div>
      )}

      <div className="flex flex-col items-center sm:items-start sm:flex-row gap-6">
        {coverUrl && (
          <div className="relative shrink-0 w-36 sm:w-48 aspect-[3/4] rounded-lg overflow-hidden shadow-lg">
            <Image src={coverUrl} alt={manga.title} fill className="object-cover" priority />
          </div>
        )}

        <div className="flex-1 space-y-3 text-center sm:text-left">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{manga.title}</h1>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-sm">
            {manga.authorName && (
              <span className="text-muted-foreground">
                By <span className="font-medium text-foreground">{manga.authorName}</span>
                {manga.artistName && manga.artistName !== manga.authorName && (
                  <> &amp; <span className="font-medium text-foreground">{manga.artistName}</span></>
                )}
              </span>
            )}
            {manga.year && <span className="text-muted-foreground">· {manga.year}</span>}
            <Badge variant="outline" className="capitalize">{manga.status}</Badge>
            {score && (
              <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">
                ★ {score}%
              </Badge>
            )}
          </div>

          {genres.length > 0 && (
            <div className="flex flex-wrap justify-center sm:justify-start gap-1.5">
              {genres.map((g) => (
                <Badge key={g.id} variant="secondary" className="text-xs">
                  {g.name}
                </Badge>
              ))}
            </div>
          )}

          {description && (
            <ExpandableDescription html={description} />
          )}

          {altTitles.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Alternate Titles
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {altTitles.map((t) => (
                  <span
                    key={t}
                    className="inline-block rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Chapters</h2>
        <ChapterList
          mangaId={id}
          mangaTitle={manga.title}
          altTitles={altTitles}
          lastChapter={manga.lastChapter}
          anilistId={anilist?.id ? String(anilist.id) : undefined}
        />
      </section>
    </div>
  );
}

const DESCRIPTION_CLAMP_LINES = 4;

function ExpandableDescription({ html }: { html: string }) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const measuredRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    setClamped(node.scrollHeight > node.clientHeight + 1);
  }, []);

  const SAFE_TAGS = /^(i|b|em|strong|br)$/i;
  const sanitized = html
    .replace(/<br\s*\/?>/gi, "<br/>")
    .replace(/<(\/?)([\w]+)([^>]*)>/g, (match, slash, tag) =>
      SAFE_TAGS.test(tag) ? `<${slash}${tag.toLowerCase()}>` : ""
    )
    .replace(/&nbsp;/g, " ")
    .trim();

  return (
    <div className="max-w-prose">
      <div
        ref={!expanded ? measuredRef : undefined}
        className={`text-sm text-muted-foreground leading-relaxed`}
        style={!expanded ? { WebkitLineClamp: DESCRIPTION_CLAMP_LINES, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" } : undefined}
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
      {(clamped || expanded) && (
        <Button
          variant="link"
          size="sm"
          className="px-0 h-auto mt-1 text-xs"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Show less" : "Read full description"}
        </Button>
      )}
    </div>
  );
}

function MangaDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-6">
        <Skeleton className="w-40 sm:w-48 aspect-[3/4] rounded-lg shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
      <Skeleton className="h-px w-full" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}
