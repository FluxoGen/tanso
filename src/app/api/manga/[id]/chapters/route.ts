import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";
import { chapterCache } from "@/lib/cache";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get("source") ?? "mangadex";
    const sourceId = searchParams.get("sourceId") ?? id;

    const provider = getProvider(source);
    if (!provider) {
      return NextResponse.json({ error: `Unknown provider: ${source}` }, { status: 400 });
    }

    if (source === "mangadex") {
      // MangaDex uses server-side pagination
      const page = parseInt(searchParams.get("page") ?? "1", 10);
      const lang = searchParams.get("lang") ?? "en";
      const limit = 30;
      const offset = (page - 1) * limit;

      const { getMangaChapters } = await import("@/lib/mangadex");
      const result = await getMangaChapters(id, { limit, offset, translatedLanguage: lang });
      return NextResponse.json(result);
    }

    // Non-MangaDex: return full chapter list (client-side pagination)
    const cacheKey = `${source}:${sourceId}`;
    const cached = chapterCache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ data: cached, total: cached.length });
    }

    const chapters = await provider.getChapters(sourceId);
    chapterCache.set(cacheKey, chapters);

    return NextResponse.json({ data: chapters, total: chapters.length });
  } catch {
    return NextResponse.json({ error: "Failed to fetch chapters" }, { status: 500 });
  }
}
