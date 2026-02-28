import { NextRequest, NextResponse } from 'next/server';
import { getAllProviders, getDisplayName } from '@/providers';
import { sourceCache } from '@/lib/cache';
import { scoreMatch } from '@/lib/matching';
import { getMangaChapters } from '@/providers/mangadex';
import type { MangaSource } from '@/types/manga';
import { wrapAsLegacyProvider } from '@/providers/compat';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const searchParams = request.nextUrl.searchParams;
		const title = searchParams.get('title') ?? '';
		const lastChapter = searchParams.get('lastChapter');
		const status = searchParams.get('status');

		if (!title) {
			return NextResponse.json({ error: 'title param required' }, { status: 400 });
		}

		const cached = sourceCache.get(id);
		if (cached) {
			return NextResponse.json({ sources: cached });
		}

		const sources: MangaSource[] = [];

		// MangaDex source (always present) - using mythical display name
		try {
			const mdChapters = await getMangaChapters(id, { limit: 1 });
			sources.push({
				provider: 'mangadex',
				displayName: getDisplayName('mangadex'),
				sourceId: id,
				matchedTitle: title,
				chapterCount: mdChapters.total,
				confidence: 100,
			});
		} catch {
			sources.push({
				provider: 'mangadex',
				displayName: getDisplayName('mangadex'),
				sourceId: id,
				matchedTitle: title,
				chapterCount: 0,
				confidence: 100,
			});
		}

		// Non-MangaDex providers in parallel
		const altTitlesRaw = searchParams.get('altTitles');
		const altTitles = altTitlesRaw ? altTitlesRaw.split('||').filter(Boolean) : [];
		const searchQueries = [title, ...altTitles.filter((t) => t !== title)];

		const allProviders = getAllProviders();
		const otherProviders = allProviders
			.filter((p) => p.info.id !== 'mangadex')
			.map((p) => wrapAsLegacyProvider(p));

		const providerPromises = otherProviders.map(async (provider) => {
			try {
				let bestResults: {
					result: Awaited<ReturnType<typeof provider.search>>[number];
					score: number;
				}[] = [];

				for (const query of searchQueries) {
					const results = await provider.search(query);
					if (!results.length) continue;

					const allScored = results.map((r) => ({
						result: r,
						score: scoreMatch(query, r, { lastChapter, status: status ?? undefined }),
					}));

					const passing = allScored.filter((s) => s.score >= 40).sort((a, b) => b.score - a.score);

					if (passing.length > 0) {
						bestResults = passing;
						break;
					}
				}

				return bestResults.map((s) => ({
					provider: provider.name,
					displayName: getDisplayName(provider.name),
					sourceId: s.result.sourceId,
					matchedTitle: s.result.title,
					chapterCount: s.result.chapterCount ?? 0,
					confidence: s.score,
				}));
			} catch {
				return [];
			}
		});

		const providerResults = await Promise.all(providerPromises);
		for (const results of providerResults) {
			sources.push(...results);
		}

		sourceCache.set(id, sources);

		return NextResponse.json({ sources });
	} catch {
		return NextResponse.json({ error: 'Failed to discover sources' }, { status: 500 });
	}
}
