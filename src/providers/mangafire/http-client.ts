/**
 * HTTP Client for MangaFire
 *
 * Handles GZIP decompression, proper headers, and response parsing.
 */

import https from 'https';
import zlib from 'zlib';
import type { MangaFireAjaxResponse } from './types';

const BASE_URL = 'https://mangafire.to';

const DEFAULT_HEADERS: Record<string, string> = {
	'User-Agent':
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
	Accept: 'application/json, text/html, */*',
	'Accept-Language': 'en-US,en;q=0.9',
	'Accept-Encoding': 'gzip, deflate, br',
	Referer: 'https://mangafire.to/',
	'X-Requested-With': 'XMLHttpRequest',
};

export interface HttpResponse {
	statusCode: number;
	headers: Record<string, string | string[] | undefined>;
	body: string;
}

export async function fetchUrl(url: string, headers?: Record<string, string>): Promise<HttpResponse> {
	return new Promise((resolve, reject) => {
		const parsedUrl = new URL(url.startsWith('http') ? url : `${BASE_URL}${url}`);

		const options = {
			hostname: parsedUrl.hostname,
			path: parsedUrl.pathname + parsedUrl.search,
			method: 'GET',
			headers: { ...DEFAULT_HEADERS, ...headers },
		};

		const req = https.request(options, (res) => {
			const chunks: Buffer[] = [];

			res.on('data', (chunk: Buffer) => {
				chunks.push(chunk);
			});

			res.on('end', () => {
				let buffer = Buffer.concat(chunks);
				const encoding = res.headers['content-encoding'];

				try {
					if (encoding === 'gzip') {
						buffer = zlib.gunzipSync(buffer);
					} else if (encoding === 'br') {
						buffer = zlib.brotliDecompressSync(buffer);
					} else if (encoding === 'deflate') {
						buffer = zlib.inflateSync(buffer);
					}
				} catch {
					// Use raw buffer if decompression fails
				}

				resolve({
					statusCode: res.statusCode ?? 500,
					headers: res.headers,
					body: buffer.toString('utf-8'),
				});
			});
		});

		req.on('error', (error) => {
			reject(error);
		});

		req.setTimeout(30000, () => {
			req.destroy();
			reject(new Error('Request timeout'));
		});

		req.end();
	});
}

export async function fetchJson<T = unknown>(url: string): Promise<MangaFireAjaxResponse<T>> {
	const response = await fetchUrl(url);

	if (response.statusCode !== 200) {
		throw new Error(`HTTP ${response.statusCode}`);
	}

	try {
		return JSON.parse(response.body) as MangaFireAjaxResponse<T>;
	} catch {
		throw new Error('Invalid JSON response');
	}
}

export function isCloudflareBlock(body: string): boolean {
	return (
		body.includes('Checking your browser') ||
		body.includes('Just a moment') ||
		body.includes('cf-browser-verification') ||
		body.includes('Cloudflare')
	);
}
