import { NextResponse } from 'next/server';
import { getMangaTags } from '@/lib/mangadex';

export async function GET() {
	try {
		const tags = await getMangaTags();
		return NextResponse.json({ data: tags });
	} catch {
		return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
	}
}
