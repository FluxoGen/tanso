# Provider System

Tanso uses a unified provider system to aggregate manga from multiple sources. Each provider is self-contained and can be extracted into a microservice.

## Architecture Overview

```
src/providers/
├── types.ts              # Core interfaces (MangaProvider, etc.)
├── index.ts              # Provider registry
├── source-aliases.ts     # Display name mapping (mythical theme)
├── aggregator.ts         # Multi-source queries with deduplication + timestamp sorting
├── compat.ts             # Legacy compatibility layer
├── base/                 # Shared scraper infrastructure
│   ├── scraper-base.ts   # Base class for HTML scraper providers
│   └── rate-limiter.ts   # Token-bucket rate limiter
├── mangadex/             # Primary source (Phoenix) — official API
├── mangapill/            # First-party scraper (Griffin)
│   ├── provider.ts       # ScraperBase implementation with browse support
│   └── selectors.ts      # CSS selectors (easy to update when site changes)
└── anilist/              # Metadata enrichment
```

## Source Aliases (Mythical Theme)

To protect source identities, we use mythical creature names:

| Internal ID    | Display Name | Description                     |
| -------------- | ------------ | ------------------------------- |
| `mangadex`     | Phoenix      | Community-driven, official API  |
| `mangapill`    | Griffin      | Alternative source, first-party scraper |
| `comick`       | Sphinx       | High-quality scans (future)     |
| `mangakakalot` | Hydra        | Multi-language support (future) |

## Composite IDs

Tanso uses composite IDs to identify manga across providers without changing the URL structure:

- **MangaDex**: `/manga/abc-123-uuid/one-piece` — bare UUID, auto-detected
- **Other providers**: `/manga/mangapill:manga-slug-123/one-piece` — prefixed with `provider:`

### Utilities (`src/lib/provider-id.ts`)

- `parseProviderId(id)` — Splits composite ID into `{ provider, sourceId }`. MangaDex UUIDs auto-detected.
- `buildProviderId(provider, sourceId)` — Creates composite ID. Returns bare ID for MangaDex.
- `isMangaDexId(id)` — Quick check if an ID belongs to MangaDex.

### How It Works

The aggregator's `deduplicateManga()` calls `buildProviderId()` when creating result IDs. This means:

- MangaDex results keep their bare UUID: `abc-123-uuid`
- MangaPill-only results get prefixed: `mangapill:manga-slug-123`
- When a user clicks a MangaPill-only manga card, the URL becomes `/manga/mangapill:manga-slug-123/title`
- The API route parses this and dispatches to the correct provider

## Provider Interface

Every provider implements the `MangaProvider` interface:

```typescript
interface MangaProvider {
	readonly info: ProviderInfo;

	search(options: SearchOptions): Promise<PaginatedResult<MangaSearchResult>>;
	browse(options: BrowseOptions): Promise<PaginatedResult<MangaSearchResult>>;
	getMangaDetails(mangaId: string): Promise<MangaDetails>;
	getChapters(mangaId: string, language?: string): Promise<ChapterInfo[]>;
	getChapterPages(chapterId: string): Promise<ChapterPagesResult>;
	healthCheck(): Promise<{ healthy: boolean; latency: number; message?: string }>;

	// Optional
	getTrending?(options?: BrowseOptions): Promise<PaginatedResult<MangaSearchResult>>;
	getLatest?(options?: BrowseOptions): Promise<PaginatedResult<MangaSearchResult>>;
}
```

## Multi-Source Discovery

The aggregator enables searching across all providers simultaneously:

```typescript
import { searchAll, browseAll, getAllProviders } from '@/providers';

// Search across all providers with deduplication
const results = await searchAll(
	{ query: 'one piece' },
	{
		providers: getAllProviders(),
		enrichWithAniList: true,
		timeout: 10000,
	}
);

// Browse popular manga from all sources
const popular = await browseAll({ sort: 'popular' }, { providers: getAllProviders() });
```

### Deduplication

The aggregator uses intelligent deduplication:

1. **Romanization normalization**: Handles variants like "ou" → "o", "wo" → "o"
2. **Fuzzy matching**: Levenshtein similarity with 0.85 threshold
3. **Source tracking**: Keeps track of which providers have each manga

## API Routes with Multi-Source

All discovery APIs support multi-source mode via the `multiSource` query parameter:

| Route                     | Description                  | Multi-Source        |
| ------------------------- | ---------------------------- | ------------------- |
| `/api/search?q=...`       | Search manga                 | `?multiSource=true` |
| `/api/suggest?q=...`      | Search suggestions           | `?multiSource=true` |
| `/api/manga/trending`     | Trending manga               | Default enabled     |
| `/api/manga/popular`      | Popular manga                | Default enabled     |
| `/api/manga/latest`       | Latest updates               | Default enabled     |
| `/api/manga/[id]`         | Manga details                | Via `?source=`      |
| `/api/manga/[id]/sources` | Available sources            | N/A                 |
| `/api/chapter/resolve`    | Chapter pages (any provider) | N/A                 |

## Adding a New Provider

1. Create a folder: `src/providers/yourprovider/`

2. Create the provider files:
   - `index.ts` - Exports
   - `provider.ts` - Main implementation
   - `api-client.ts` or `http-client.ts` - HTTP utilities (optional)
   - `parser.ts` - HTML parsing (for scrapers)

3. Implement the `MangaProvider` interface:

```typescript
// src/providers/yourprovider/provider.ts
import type { MangaProvider, ProviderInfo, ... } from '../types';

const PROVIDER_ID = 'yourprovider';

export class YourProvider implements MangaProvider {
  readonly info: ProviderInfo = {
    id: PROVIDER_ID,
    name: 'YourProvider',
    baseUrl: 'https://yourprovider.com',
    languages: ['en'],
    features: ['search', 'browse', 'chapters', 'pages'],
  };

  async search(options: SearchOptions) { ... }
  async browse(options: BrowseOptions) { ... }
  async getMangaDetails(mangaId: string) { ... }
  async getChapters(mangaId: string) { ... }
  async getChapterPages(chapterId: string) { ... }
  async healthCheck() { ... }
}

export const yourprovider = new YourProvider();
```

4. Register in `src/providers/index.ts`:

```typescript
import { yourprovider } from './yourprovider';

export const providers = {
	mangadex,
	mangapill,
	yourprovider, // Add here
};
```

5. Add display name in `src/providers/source-aliases.ts`:

```typescript
export const SOURCE_ALIASES = {
	// ...
	yourprovider: { display: 'Kraken', description: 'Your description' },
};
```

6. Add image domains to proxy allowlist in `src/app/api/proxy-image/route.ts`:
   - Add CDN domain to `ALLOWED_DOMAINS` or `ALLOWED_DOMAIN_SUFFIXES`
   - Add referer mapping to `PROVIDER_REFERERS`

7. Cover resolution works automatically if your provider's `MangaSearchResult` returns a `coverUrl` field. The `resolveMangaCover()` function checks `coverUrl` before falling back to MangaDex CDN.

8. Composite IDs are handled automatically by the aggregator. Your provider's results will get IDs like `yourprovider:sourceId` in aggregated search/browse results.

## Error Handling

Providers throw `ProviderError` with standardized codes:

```typescript
type ProviderErrorCode =
	| 'RATE_LIMITED' // Too many requests
	| 'NOT_FOUND' // Resource doesn't exist
	| 'BLOCKED' // Cloudflare/anti-bot
	| 'NETWORK_ERROR' // Connection failed
	| 'PARSE_ERROR' // Invalid response
	| 'UNKNOWN'; // Unexpected error
```

## Scraper Base Infrastructure

Scraper-based providers (like MangaPill) extend the `ScraperBase` class in `src/providers/base/scraper-base.ts`:

- **`fetchPage(url)`** — Fetches HTML and returns a cheerio API for parsing
- **`parseDate(raw)`** — Handles ISO dates, YYYY-MM-DD, and relative dates like "3 hours ago"
- **`createError(code, message)`** — Creates standardized `ProviderError` objects

A `RateLimiter` (token-bucket) in `src/providers/base/rate-limiter.ts` prevents hitting upstream rate limits.

### Adding a New Scraper Provider

1. Create a selectors file (`selectors.ts`) with CSS selectors for each page type
2. Create a provider file (`provider.ts`) extending `ScraperBase`
3. Register in `src/providers/index.ts` and add a display alias

## Timestamp-Based Sorting

The aggregator sorts browse results by `updatedAt` timestamp after deduplication:

- MangaDex provides `updatedAt` from its API response
- MangaPill extracts timestamps from the recent chapters page
- Items without timestamps sort to the end
- During deduplication, the most recent `updatedAt` from any source is preserved

## Future Improvements

- [x] Multi-source discovery APIs
- [x] Fuzzy deduplication with romanization normalization
- [x] First-party scraper architecture (replacing Consumet)
- [x] Timestamp-based sorting for consistent "latest" ordering
- [ ] Add more providers (ComicK, MangaKakalot)
- [ ] Provider health monitoring dashboard
- [ ] Automatic failover between providers
- [ ] Caching layer with Redis
