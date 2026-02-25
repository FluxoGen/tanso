import { MetadataRoute } from 'next';

const BASE_URL = process.env.VERCEL_URL
	? `https://${process.env.VERCEL_URL}`
	: process.env.NEXT_PUBLIC_SITE_URL || 'https://tanso.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{ url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
		{
			url: `${BASE_URL}/search`,
			lastModified: new Date(),
			changeFrequency: 'daily',
			priority: 0.9,
		},
		{
			url: `${BASE_URL}/latest`,
			lastModified: new Date(),
			changeFrequency: 'hourly',
			priority: 0.9,
		},
		{
			url: `${BASE_URL}/library`,
			lastModified: new Date(),
			changeFrequency: 'weekly',
			priority: 0.8,
		},
		{
			url: `${BASE_URL}/history`,
			lastModified: new Date(),
			changeFrequency: 'weekly',
			priority: 0.8,
		},
	];
}
