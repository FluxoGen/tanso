# Deployment Guide

Platform-agnostic deployment guide for Tanso. Platform-specific instructions (Vercel, Docker, etc.) will be added once the deployment target is chosen.

## Build & Run

```bash
pnpm install
pnpm build
pnpm start
```

- **Output:** `.next` directory (or `standalone/` if `output: "standalone"` is set in `next.config.ts`)
- **Node version:** 20 or higher (see `engines` in `package.json`)

## Environment Variables

Currently no environment variables are required. Add them to `.env.example` and document here when introduced.

## Health Check

Use `/api/health` for load balancers and monitoring:

```bash
curl https://your-domain.com/api/health
```

Response: `{ "status": "ok", "timestamp": "..." }`

## Post-Deploy Checklist

- [ ] Home page loads
- [ ] Search works (`/search?q=...`)
- [ ] Manga detail page loads (`/manga/[id]`)
- [ ] Chapter reader works
- [ ] Health check returns 200

## Known Limitations

- **In-memory caches:** Tag cache and chapter cache are not shared across instances. For single-instance deployment this is fine.
- **Rate limit:** Proxy-image rate limit is per-instance. Multiple instances multiply the effective limit.
- **Deployment workflow:** Auto-deploy on merge, preview URLs, etc. will be configured when the platform is chosen.
