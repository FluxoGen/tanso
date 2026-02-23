import { NextRequest, NextResponse } from "next/server";
import { searchManga } from "@/lib/mangadex";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const result = await searchManga(query, { limit: 20 });

    const suggestions = result.data.map((manga) => ({
      id: manga.id,
      title: manga.title,
      coverFileName: manga.coverFileName,
      authorName: manga.authorName,
      year: manga.year,
      status: manga.status,
    }));

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
