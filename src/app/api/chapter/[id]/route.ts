import { NextResponse } from "next/server";
import { getChapterPages } from "@/lib/mangadex";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const pages = await getChapterPages(id);
    return NextResponse.json({
      source: "mangadex",
      baseUrl: pages.baseUrl,
      hash: pages.hash,
      data: pages.data,
      dataSaver: pages.dataSaver,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch chapter pages" }, { status: 500 });
  }
}
