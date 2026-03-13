import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/providers';
import { chapterCache } from '@/lib/cache';
import type { Chapter } from '@/types/manga';
import { wrapAsLegacyProvider } from '@/providers/compat';
import { parseProviderId } from '@/lib/provider-id';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const searchParams = request.nextUrl.searchParams;
		const { provider: defaultProvider, sourceId: defaultSourceId } = parseProviderId(id);
		const source = searchParams.get('source') ?? defaultProvider;
		const sourceId = searchParams.get('sourceId') ?? defaultSourceId;
		const currentChapterId = searchParams.get('chapterId');

		const newProvider = getProvider(source);
		if (!newProvider) {
			return NextResponse.json({ error: `Unknown provider: ${source}` }, { status: 400 });
		}
		const provider = wrapAsLegacyProvider(newProvider);

		if (source === 'mangadex') {
			const page = parseInt(searchParams.get('page') ?? '1', 10);
			const lang = searchParams.get('lang') ?? 'en';
			const limit = 30;
			const offset = (page - 1) * limit;

			const mangadexId = searchParams.get('sourceId') ?? defaultSourceId;
			const { getMangaChapters } = await import('@/providers/mangadex');
			const result = await getMangaChapters(mangadexId, {
				limit,
				offset,
				translatedLanguage: lang,
			});

			if (currentChapterId) {
				const nav = await getChapterNavigation(mangadexId, currentChapterId, lang);
				return NextResponse.json({ ...result, nav });
			}

			return NextResponse.json(result);
		}

		// Non-MangaDex: return full chapter list (client-side pagination)
		const cacheKey = `${source}:${sourceId}`;
		const cached = chapterCache.get(cacheKey);
		if (cached) {
			const nav = currentChapterId ? findNavInList(cached, currentChapterId) : null;
			return NextResponse.json({ data: cached, total: cached.length, nav });
		}

		const chapters = await provider.getChapters(sourceId);
		chapterCache.set(cacheKey, chapters);

		const nav = currentChapterId ? findNavInList(chapters, currentChapterId) : null;
		return NextResponse.json({ data: chapters, total: chapters.length, nav });
	} catch {
		return NextResponse.json({ error: 'Failed to fetch chapters' }, { status: 500 });
	}
}

function findNavInList(chapters: Chapter[], currentChapterId: string) {
	const idx = chapters.findIndex((c) => c.id === currentChapterId);
	if (idx === -1) return null;

	const current = chapters[idx];

	// Detect if chapters are in descending order (newest first) by comparing first and last
	const firstNum = parseFloat(chapters[0]?.chapter ?? '0');
	const lastNum = parseFloat(chapters[chapters.length - 1]?.chapter ?? '0');
	const isDescending = firstNum > lastNum;

	// For descending lists: prev in array = next chapter, next in array = prev chapter
	const prevInArray = idx > 0 ? chapters[idx - 1] : null;
	const nextInArray = idx < chapters.length - 1 ? chapters[idx + 1] : null;

	return {
		prevChapterId: isDescending ? (nextInArray?.id ?? null) : (prevInArray?.id ?? null),
		nextChapterId: isDescending ? (prevInArray?.id ?? null) : (nextInArray?.id ?? null),
		chapterNumber: current.chapter,
		chapterTitle: current.title,
	};
}

async function getChapterNavigation(mangaId: string, chapterId: string, lang: string) {
	const { getMangaChapters } = await import('@/providers/mangadex');

	// Fetch all chapters in ascending order to find prev/next
	const result = await getMangaChapters(mangaId, {
		limit: 500,
		offset: 0,
		translatedLanguage: lang,
		order: 'asc',
	});

	return findNavInList(result.data, chapterId);
}
