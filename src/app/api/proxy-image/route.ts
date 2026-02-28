import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_DOMAINS = new Set(['cdn.readdetectiveconan.com', 'uploads.mangadex.org']);

// Allow any *.mangadex.network subdomain
function isAllowedDomain(hostname: string): boolean {
	if (ALLOWED_DOMAINS.has(hostname)) return true;
	if (hostname.endsWith('.mangadex.network')) return true;
	return false;
}

const PROVIDER_REFERERS: Record<string, string> = {
	mangapill: 'https://mangapill.com/',
	mangadex: 'https://mangadex.org/',
};

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100;
const RATE_WINDOW_MS = 60 * 1000;

function checkRateLimit(ip: string): boolean {
	const now = Date.now();
	const entry = rateLimitMap.get(ip);

	if (!entry || now > entry.resetAt) {
		rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
		return true;
	}

	if (entry.count >= RATE_LIMIT) return false;
	entry.count++;
	return true;
}

export async function GET(request: NextRequest) {
	try {
		const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

		if (!checkRateLimit(ip)) {
			return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
		}

		const imageUrl = request.nextUrl.searchParams.get('url');
		const source = request.nextUrl.searchParams.get('source');

		if (!imageUrl || !source) {
			return NextResponse.json({ error: 'url and source params required' }, { status: 400 });
		}

		let parsed: URL;
		try {
			parsed = new URL(imageUrl);
		} catch {
			return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
		}

		if (parsed.protocol !== 'https:') {
			return NextResponse.json({ error: 'Only HTTPS URLs allowed' }, { status: 400 });
		}

		if (!isAllowedDomain(parsed.hostname)) {
			return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
		}

		const referer = PROVIDER_REFERERS[source];
		if (!referer) {
			return NextResponse.json({ error: 'Unknown source' }, { status: 400 });
		}

		const headers: Record<string, string> = {
			Referer: referer,
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
		};

		const upstream = await fetch(imageUrl, { headers });

		if (!upstream.ok) {
			return NextResponse.json(
				{ error: `Upstream returned ${upstream.status}` },
				{ status: upstream.status }
			);
		}

		const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';

		return new NextResponse(upstream.body, {
			status: 200,
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=86400, immutable',
				'Access-Control-Allow-Origin': '*',
			},
		});
	} catch {
		return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
	}
}
