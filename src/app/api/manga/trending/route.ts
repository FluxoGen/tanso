import { NextRequest, NextResponse } from "next/server";
import { getTrendingManga } from "@/lib/mangadex";

export async function GET(request: NextRequest) {
  try {
    const tags = request.nextUrl.searchParams.getAll("tags");
    const data = await getTrendingManga(20, tags.length ? tags : undefined);
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Failed to fetch trending manga" }, { status: 500 });
  }
}
