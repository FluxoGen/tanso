import { NextResponse } from "next/server";
import { getMangaDetails } from "@/lib/mangadex";
import { searchAniListManga } from "@/lib/anilist";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const manga = await getMangaDetails(id);
    const anilist = await searchAniListManga(manga.title);

    return NextResponse.json({ manga, anilist });
  } catch {
    return NextResponse.json({ error: "Failed to fetch manga details" }, { status: 500 });
  }
}
