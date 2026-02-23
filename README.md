# Tanso

A full-stack application for discovering and exploring manga, anime, and more. Built with Next.js, powered by the MangaDex and AniList APIs.

## Why "Tanso"?

**Tanso** is derived from the Japanese word **tansaku** (探索), meaning "to explore" or "to search out." The name was chosen because:

- **It reflects the core experience** — the app is about exploring and discovering Japanese media, not just passively consuming it.
- **It scales with the vision** — unlike a name tied to a single format (e.g., "MangaReader"), Tanso works equally well whether the platform serves manga, anime, light novels, or any future content type.
- **It's short and memorable** — four letters, easy to type, easy to say, works as a brand.
- **It sounds natural** — rooted in real Japanese, fitting for a platform centered on Japanese media.

## Features

- **Discover manga** — Browse trending, popular, and latest manga on the home page
- **Genre filtering** — Filter manga by genre using a scrollable chip bar (Action, Romance, Fantasy, etc.)
- **Search** — Search by title with optional genre filters and paginated results
- **Manga details** — View cover art, metadata, AniList community scores, descriptions, and chapter lists
- **Chapter reader** — Read manga page-by-page with keyboard navigation, click navigation, page selector, and image preloading
- **Quality toggle** — Switch between original quality (HQ) and compressed (Lite) images
- **Dark mode** — Automatic system preference detection with manual toggle

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Primary API | MangaDex REST API |
| Metadata API | AniList GraphQL API |
| Package Manager | pnpm |

## Quick Start

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000` in your browser. No API keys or environment variables required.

For the full list of commands (build, lint, adding components, etc.), see [docs/COMMANDS.md](docs/COMMANDS.md).

## Documentation

Detailed documentation lives in the [`docs/`](docs/) folder:

| Document | Description |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System diagrams (mermaid), data flows, component hierarchy, API route map, and design rationale |
| [COMMANDS.md](docs/COMMANDS.md) | All commands for setup, development, building, linting, and dependency management |
| [PLAN.md](docs/PLAN.md) | Living project plan — current status, completed milestones, upcoming features, and design decisions |
| [PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md) | End-to-end explanation of how every layer works, from API clients to React components, with 4 full-flow trace examples |

## Credits

- [MangaDex](https://mangadex.org/) — Manga content, chapters, and images
- [AniList](https://anilist.co/) — Community scores, descriptions, and banner images
- [shadcn/ui](https://ui.shadcn.com/) — Accessible UI component library
- [Next.js](https://nextjs.org/) — React framework
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS

## License

This project is licensed under the [MIT License](LICENSE).

**Note:** While the code is MIT licensed, usage of third-party APIs (MangaDex, AniList) is subject to their respective terms of service. MangaDex API usage requires crediting MangaDex and scanlation groups, and prohibits monetization of their content.
