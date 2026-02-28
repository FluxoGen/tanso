# Provider System

Tanso uses a unified provider system to aggregate manga from multiple sources. Each provider is self-contained and can be extracted into a microservice.

## Architecture Overview

```
src/providers/
├── types.ts              # Core interfaces (MangaProvider, etc.)
├── index.ts              # Provider registry
├── source-aliases.ts     # Display name mapping (mythical theme)
├── aggregator.ts         # Multi-source queries
├── compat.ts             # Legacy compatibility layer
├── mangadex/             # Primary source (Phoenix)
├── mangafire/            # Aggregator source (Dragon)
├── mangapill/            # Consumet-based (Griffin)
└── anilist/              # Metadata enrichment
```

## Source Aliases (Mythical Theme)

To protect source identities, we use mythical creature names:

| Internal ID | Display Name | Description |
|-------------|--------------|-------------|
| `mangadex`  | Phoenix      | Community-driven, official API |
| `mangafire` | Dragon       | Fast aggregator with broad coverage |
| `mangapill` | Griffin      | Alternative source via Consumet |
| `comick`    | Sphinx       | High-quality scans (future) |
| `mangakakalot` | Hydra     | Multi-language support (future) |

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
    features: ['search', 'chapters', 'pages'],
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
  mangafire,
  mangapill,
  yourprovider,  // Add here
};
```

5. Add display name in `src/providers/source-aliases.ts`:

```typescript
export const SOURCE_ALIASES = {
  // ...
  yourprovider: { display: 'Kraken', description: 'Your description' },
};
```

## Aggregator

The aggregator queries multiple providers in parallel:

```typescript
import { searchAll, browseAll, getAllProviders } from '@/providers';

// Search across all providers
const results = await searchAll(
  { query: 'one piece' },
  { providers: getAllProviders(), enrichWithAniList: true }
);

// Browse popular manga
const popular = await browseAll(
  { sort: 'popular' },
  { providers: getAllProviders() }
);
```

## API Routes

All API routes use the unified provider system:

| Route | Description |
|-------|-------------|
| `/api/search` | Search manga (MangaDex + AniList enrichment) |
| `/api/manga/[id]` | Manga details |
| `/api/manga/[id]/chapters` | Chapter list (any provider) |
| `/api/manga/[id]/sources` | Available sources for a manga |
| `/api/chapter/[id]` | Chapter pages (MangaDex) |
| `/api/chapter/resolve` | Chapter pages (any provider) |

## Error Handling

Providers throw `ProviderError` with standardized codes:

```typescript
type ProviderErrorCode =
  | 'RATE_LIMITED'    // Too many requests
  | 'NOT_FOUND'       // Resource doesn't exist
  | 'BLOCKED'         // Cloudflare/anti-bot
  | 'VRF_REQUIRED'    // Needs browser automation
  | 'NETWORK_ERROR'   // Connection failed
  | 'PARSE_ERROR'     // Invalid response
  | 'UNKNOWN';        // Unexpected error
```

## Browser Automation (MangaFire)

MangaFire requires VRF tokens for some endpoints. The provider supports a hybrid approach:

- AJAX endpoints (fast): Browse, chapter lists
- Playwright (slow): Search with keyword, chapter pages

```typescript
import { mangafire } from '@/providers';

// Check if browser is needed
if (mangafire.hasBrowserSupport()) {
  const pages = await mangafire.getChapterPagesWithBrowser(chapterId);
}
```

## Testing

Run the provider test:

```bash
npx tsx scripts/test-mangafire-provider.ts
```

## Future Improvements

- [ ] Implement Playwright for MangaFire VRF bypass
- [ ] Add more providers (ComicK, MangaKakalot)
- [ ] Provider health monitoring dashboard
- [ ] Automatic failover between providers
- [ ] Caching layer with Redis
