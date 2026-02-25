import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/providers';

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const source = searchParams.get('source');
		const chapterId = searchParams.get('chapterId');

		if (!source || !chapterId) {
			return NextResponse.json({ error: 'source and chapterId params required' }, { status: 400 });
		}

		const provider = getProvider(source);
		if (!provider) {
			return NextResponse.json({ error: `Unknown provider: ${source}` }, { status: 400 });
		}

		const pages = await provider.getChapterPages(chapterId);
		return NextResponse.json(pages);
	} catch {
		return NextResponse.json({ error: 'Failed to fetch chapter pages' }, { status: 500 });
	}
}
