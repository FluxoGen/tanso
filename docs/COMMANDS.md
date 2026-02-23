# Commands

All commands needed to set up, develop, build, and maintain the Tanso project.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Initial Setup](#2-initial-setup)
3. [Development](#3-development)
4. [Building for Production](#4-building-for-production)
5. [Running Production Build](#5-running-production-build)
6. [Linting](#6-linting)
7. [Adding shadcn/ui Components](#7-adding-shadcnui-components)
8. [Dependency Management](#8-dependency-management)

---

## 1. Prerequisites

Before starting, ensure you have the following installed:

| Tool | Minimum Version | Check Command |
|---|---|---|
| Node.js | 18.17+ | `node --version` |
| pnpm | 10.x | `pnpm --version` |

**Install pnpm** (if not already installed):

```bash
npm install -g pnpm
```

Or via Corepack (ships with Node.js 16.13+):

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

---

## 2. Initial Setup

Clone the repository and install dependencies:

```bash
# Clone the repo
git clone <repository-url>
cd tanso

# Install all dependencies
pnpm install
```

No environment variables or `.env` files are required. The app uses public APIs (MangaDex and AniList) that do not require API keys for the operations we perform.

---

## 3. Development

Start the Next.js development server with Turbopack:

```bash
pnpm dev
```

This starts the app at `http://localhost:3000` (or the next available port if 3000 is in use). The terminal will display the exact URL.

The dev server provides:
- Hot Module Replacement (HMR) — changes to source files are reflected instantly in the browser.
- Turbopack — significantly faster compilation than webpack.
- API routes are available at `http://localhost:3000/api/*`.

---

## 4. Building for Production

Create an optimized production build:

```bash
pnpm build
```

This command:
- Compiles all TypeScript files and checks for type errors.
- Bundles and optimizes all client-side JavaScript.
- Pre-renders static pages.
- Outputs the build to the `.next/` directory.

A successful build will display a route summary showing which pages are static (`○`) and which are dynamic/server-rendered (`ƒ`).

---

## 5. Running Production Build

After building, start the production server:

```bash
pnpm start
```

This serves the production build at `http://localhost:3000`. This is how the app would run in a deployment environment.

---

## 6. Linting

Run ESLint to check code quality:

```bash
pnpm lint
```

This uses the Next.js ESLint configuration (`eslint-config-next`) which includes rules for React, React Hooks, Next.js best practices, and accessibility.

---

## 7. Adding shadcn/ui Components

The project uses [shadcn/ui](https://ui.shadcn.com/) for pre-built, accessible UI components. Components are not installed as a package — they are copied into `src/components/ui/` so you can customize them.

**Add a new component:**

```bash
pnpm dlx shadcn@latest add <component-name>
```

**Examples:**

```bash
# Add a single component
pnpm dlx shadcn@latest add dialog

# Add multiple components at once
pnpm dlx shadcn@latest add dropdown-menu tooltip popover

# Add with automatic yes to all prompts
pnpm dlx shadcn@latest add card --yes
```

**Currently installed shadcn/ui components:**

| Component | File | Purpose |
|---|---|---|
| Button | `src/components/ui/button.tsx` | Buttons with variants (default, outline, ghost, etc.) |
| Badge | `src/components/ui/badge.tsx` | Small status/tag indicators |
| Input | `src/components/ui/input.tsx` | Text input fields |
| Skeleton | `src/components/ui/skeleton.tsx` | Loading placeholder shapes |
| Scroll Area | `src/components/ui/scroll-area.tsx` | Custom scrollable containers |
| Separator | `src/components/ui/separator.tsx` | Horizontal/vertical dividers |

---

## 8. Dependency Management

**Add a new runtime dependency:**

```bash
pnpm add <package-name>
```

**Add a dev dependency:**

```bash
pnpm add -D <package-name>
```

**Remove a dependency:**

```bash
pnpm remove <package-name>
```

**Update all dependencies to latest compatible versions:**

```bash
pnpm update
```

**Check for outdated packages:**

```bash
pnpm outdated
```

---

## Quick Reference

| Task | Command |
|---|---|
| Install dependencies | `pnpm install` |
| Start dev server | `pnpm dev` |
| Build for production | `pnpm build` |
| Start production server | `pnpm start` |
| Lint code | `pnpm lint` |
| Add shadcn component | `pnpm dlx shadcn@latest add <name>` |
| Add package | `pnpm add <name>` |
| Add dev package | `pnpm add -D <name>` |
