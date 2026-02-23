export interface AniListMedia {
  id: number;
  title: {
    romaji: string | null;
    english: string | null;
    native: string | null;
  };
  description: string | null;
  averageScore: number | null;
  meanScore: number | null;
  genres: string[];
  tags: { name: string; rank: number }[];
  bannerImage: string | null;
  coverImage: {
    extraLarge: string | null;
    large: string | null;
  } | null;
  status: string | null;
  chapters: number | null;
  volumes: number | null;
  startDate: { year: number | null; month: number | null; day: number | null } | null;
  recommendations: {
    nodes: {
      mediaRecommendation: {
        id: number;
        title: { romaji: string | null; english: string | null };
        coverImage: { large: string | null } | null;
      } | null;
    }[];
  } | null;
}

export interface AniListResponse {
  data: {
    Media: AniListMedia | null;
  };
}
