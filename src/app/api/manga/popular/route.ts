import { NextRequest, NextResponse } from "next/server";
import { getPopularManga } from "@/lib/mangadex";

export async function GET(request: NextRequest) {
  try {
    const tags = request.nextUrl.searchParams.getAll("tags");
    const data = await getPopularManga(20, tags.length ? tags : undefined);
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Failed to fetch popular manga" }, { status: 500 });
  }
}
