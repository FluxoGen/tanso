import { NextResponse } from 'next/server';
import { getMangaDetails } from '@/providers/mangadex';
import { searchAniListManga } from '@/providers/anilist';
import { getProvider } from '@/providers';
import { parseProviderId } from '@/lib/provider-id';
import type { Manga } from '@/types/manga';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const { provider, sourceId } = parseProviderId(id);

		let manga: Manga;

		if (provider === 'mangadex') {
			manga = await getMangaDetails(sourceId);
		} else {
			const prov = getProvider(provider);
			if (!prov) {
				return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
			}
			const details = await prov.getMangaDetails(sourceId);
			manga = {
				id,
				title: details.title,
				altTitle: details.altTitles?.[0],
				description: details.description ?? '',
				status: details.status ?? 'unknown',
				year: details.year ?? null,
				contentRating: 'safe',
				tags: (details.genres ?? []).map((g) => ({ id: g, name: g, group: 'genre' })),
				coverId: null,
				coverFileName: null,
				coverUrl: details.coverUrl,
				authorName: details.author ?? null,
				artistName: details.artist ?? null,
				lastChapter: details.totalChapters ? String(details.totalChapters) : null,
				lastVolume: null,
				provider,
			};
		}

		const anilist = await searchAniListManga(manga.title).catch(() => null);

		return NextResponse.json({ manga, anilist });
	} catch {
		return NextResponse.json({ error: 'Failed to fetch manga details' }, { status: 500 });
	}
}
