import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getCoverUrl } from "@/lib/mangadex";
import type { Manga } from "@/types/manga";

export function MangaCard({ manga }: { manga: Manga }) {
  const coverUrl =
    manga.coverFileName
      ? getCoverUrl(manga.id, manga.coverFileName, "256")
      : null;

  return (
    <Link
      href={`/manga/${manga.id}`}
      className="group flex flex-col gap-2 rounded-lg overflow-hidden transition-transform hover:scale-[1.02]"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-muted">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={manga.title}
            fill
            className="object-cover transition-opacity group-hover:opacity-90"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            No Cover
          </div>
        )}
        {manga.contentRating === "suggestive" && (
          <Badge variant="secondary" className="absolute top-1.5 right-1.5 text-[10px]">
            Suggestive
          </Badge>
        )}
      </div>
      <div className="space-y-0.5 px-0.5">
        <h3 className="text-sm font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {manga.title}
        </h3>
        {manga.authorName && (
          <p className="text-xs text-muted-foreground truncate">{manga.authorName}</p>
        )}
      </div>
    </Link>
  );
}

export function MangaCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="aspect-[3/4] w-full rounded-lg bg-muted animate-pulse" />
      <div className="space-y-1.5 px-0.5">
        <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}
