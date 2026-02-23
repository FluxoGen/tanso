import type { AniListMedia, AniListResponse } from "@/types/anilist";

const ANILIST_URL = "https://graphql.anilist.co";

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

export async function searchAniListManga(title: string): Promise<AniListMedia | null> {
  try {
    const res = await fetch(ANILIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: MANGA_QUERY, variables: { search: title } }),
    });

    if (!res.ok) return null;

    const json: AniListResponse = await res.json();
    return json.data.Media;
  } catch {
    return null;
  }
}
