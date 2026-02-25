import { Metadata } from 'next';

type Props = { params: Promise<{ id: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { id } = await params;
	try {
		const base = process.env.VERCEL_URL
			? `https://${process.env.VERCEL_URL}`
			: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
		const res = await fetch(`${base}/api/manga/${id}`, {
			next: { revalidate: 3600 },
		});
		const json = await res.json();
		const manga = json?.manga;
		if (manga) {
			const description =
				manga.description?.replace(/<[^>]*>/g, '').slice(0, 160) || `Read ${manga.title} on Tanso`;
			return {
				title: `${manga.title} | Tanso`,
				description,
				openGraph: {
					title: manga.title,
					description,
				},
			};
		}
	} catch {
		// ignore
	}
	return { title: 'Manga | Tanso' };
}

export default function MangaSlugLayout({ children }: { children: React.ReactNode }) {
	return <>{children}</>;
}
