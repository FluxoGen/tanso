/**
 * AniList GraphQL Client
 *
 * Used for metadata enrichment (descriptions, recommendations, etc.)
 * Not a full manga provider - just supplements other providers.
 * Migrated from src/lib/anilist.ts
 */

import type { AniListMedia, AniListResponse } from '@/types/anilist';
import { fetchWithRetry } from '@/lib/fetch-utils';

const ANILIST_URL = 'https://graphql.anilist.co';

const MANGA_QUERY = `
query ($search: String) {
  Media(search: $search, type: MANGA) {
    id
    title {
      romaji
      english
      native
    }
    description(asHtml: false)
    averageScore
    meanScore
    genres
    tags {
      name
      rank
    }
    bannerImage
    coverImage {
      extraLarge
      large
    }
    status
    chapters
    volumes
    startDate {
      year
      month
      day
    }
    recommendations(perPage: 6, sort: RATING_DESC) {
      nodes {
        mediaRecommendation {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
          }
        }
      }
    }
  }
}
`;

const MANGA_BY_ID_QUERY = `
query ($id: Int) {
  Media(id: $id, type: MANGA) {
    id
    title {
      romaji
      english
      native
    }
    description(asHtml: false)
    averageScore
    meanScore
    genres
    tags {
      name
      rank
    }
    bannerImage
    coverImage {
      extraLarge
      large
    }
    status
    chapters
    volumes
    startDate {
      year
      month
      day
    }
    recommendations(perPage: 6, sort: RATING_DESC) {
      nodes {
        mediaRecommendation {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
          }
        }
      }
    }
  }
}
`;

/**
 * Search for manga by title on AniList
 */
export async function searchAniListManga(title: string): Promise<AniListMedia | null> {
	try {
		const res = await fetchWithRetry(ANILIST_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query: MANGA_QUERY, variables: { search: title } }),
		});

		if (!res.ok) return null;

		const json: AniListResponse = await res.json();
		return json.data.Media;
	} catch {
		return null;
	}
}

/**
 * Get manga by AniList ID
 */
export async function getAniListMangaById(id: number): Promise<AniListMedia | null> {
	try {
		const res = await fetchWithRetry(ANILIST_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query: MANGA_BY_ID_QUERY, variables: { id } }),
		});

		if (!res.ok) return null;

		const json: AniListResponse = await res.json();
		return json.data.Media;
	} catch {
		return null;
	}
}

/**
 * AniList metadata that can be merged with provider results
 */
export interface AniListMetadata {
	anilistId: number;
	description?: string;
	averageScore?: number;
	genres?: string[];
	bannerImage?: string;
	recommendations?: Array<{
		id: number;
		title: string;
		coverImage?: string;
	}>;
}

/**
 * Extract enrichment metadata from AniList response
 */
export function extractMetadata(media: AniListMedia): AniListMetadata {
	return {
		anilistId: media.id,
		description: media.description ?? undefined,
		averageScore: media.averageScore ?? undefined,
		genres: media.genres,
		bannerImage: media.bannerImage ?? undefined,
		recommendations: media.recommendations?.nodes
			?.filter((n) => n.mediaRecommendation)
			.map((n) => ({
				id: n.mediaRecommendation!.id,
				title:
					n.mediaRecommendation!.title.english || n.mediaRecommendation!.title.romaji || 'Unknown',
				coverImage: n.mediaRecommendation!.coverImage?.large ?? undefined,
			})),
	};
}
