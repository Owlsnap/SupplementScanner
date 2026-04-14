# memory.md — Architectural Decisions & Project History

> A living log. Append new entries at the top of each section.

---

## 2026-04-13 — Initial documentation pass

### Architecture Decisions

**Monorepo: web + mobile in the same git repo (`SuppScanner/`)**  
The mobile app lives at `SuppScannerApp/` inside the git root, not as a separate repo. This keeps the backend API and both clients in sync — a breaking API change is visible in the same PR. Downside: Expo build tooling and web build tooling coexist, which can cause confusion (separate `package.json` files).

**Express 5 over Next.js, Fastify, or Hono**  
The backend is a traditional Express app (`server.js`). It serves both the API and the Vite-built static files in production. No framework overhead. Express 5 is in use (confirmed by `"express": "^5.1.0"`) — async error handling in route handlers propagates to Express automatically without try/catch wrappers on every handler.

**Vite + React over Next.js for the web frontend**  
SPA, not SSR. The encyclopedia content is loaded client-side from `encyclopediaData.ts`; deep dives are fetched from the API on demand. No SEO requirement drove the SPA choice. Simple to deploy: `vite build` outputs to `dist/`, served by Express.

**Both OpenAI and Anthropic in the backend**  
- **OpenAI** handles structured data extraction and normalization (the multi-layer extraction pipeline — converting raw scraped/barcode data into a normalized `Product` shape).
- **Anthropic** handles encyclopedia deep dive generation (narrative, long-form content).
The split is intentional: OpenAI is used where structured JSON output matters; Anthropic where prose quality matters.

**Supabase over a standalone Postgres instance**  
Supabase provides auth (JWT verification in `requireAuth` middleware), managed Postgres, and the JS client. The auth middleware in `server.js` uses `supabaseAuth.auth.getUser(token)` to validate Bearer tokens — no custom JWT logic needed. Service role key is used for server-side writes.

**Expo over bare React Native**  
EAS Build, expo-camera, expo-router, and the managed workflow reduce the overhead of maintaining native build configs. The trade-off (less control over native modules) is acceptable for this project's feature set.

**Expo Router v6 (file-based routing)**  
Routes map directly to files under `app/`. Tab screens live under `app/(tabs)/`. This eliminates a separate navigation config file and makes the route structure immediately readable from the filesystem.

**AsyncStorage for scan history (mobile)**  
History is stored locally on device, not synced to Supabase. Fast, zero-auth, works offline. Downside: no cross-device history. Cross-device sync is a post-MVP concern (see issue #4).

**Dark mode via CSS variables + `document.documentElement.classList` (web only)**  
Dark mode is web-only. The `DarkModeProvider` in `DarkModeContext.tsx` persists the preference to `localStorage` and adds/removes the `dark` class on `<html>`. Styles use `var(--card-info-bg)` etc. Mobile has no dark mode.

---

## What Changed / Pivots

**Encyclopedia became the primary product**  
Early versions focused on the barcode scanner. The pivot to encyclopedia-first happened because: (1) supplement data is hard to acquire via barcode alone, (2) the encyclopedia provides value without needing a physical product to scan, (3) the AI deep dive is a more defensible premium feature than scan-gating.

**Stale `SuppScannerApp/` at monorepo root (issue #1, resolved)**  
An early version had the mobile app at `SupplementScannerSiteAndApp/SuppScannerApp/`. After moving it to `SuppScanner/SuppScannerApp/` (inside the git root), the old folder was left in place and became stale. It must never be edited — all work goes into `SuppScanner/SuppScannerApp/`. See issue #14 for context.

**Supabase replaced the old JSON file approach**  
Products were initially stored in a local JSON file. This was replaced by Supabase (`products` table) for persistence and multi-user support. `dbService.js` is the sole interface to Supabase for product CRUD — don't reintroduce file-based storage.

**Railway over Vercel for the backend**  
The backend uses Puppeteer (headless Chrome) for scraping, which doesn't run on Vercel's serverless functions (no persistent process, size limits). Railway runs a long-lived Node process, which supports Puppeteer. The Vite frontend also deploys on Railway via the same process (Express serves `dist/`). A `vercel.json` exists in the repo — it's a leftover from an earlier attempt; Railway is the active host.

---

## Gotchas

- **Puppeteer on Railway requires `PUPPETEER_EXECUTABLE_PATH=/run/current-system/sw/bin/chromium`** — the bundled Chromium doesn't work in the Railway Nix environment. This env var must be set on the Railway service (it is already set — see closed issue #11).
- **ESLint legacy config** — uses `.eslintrc.cjs`. Any ESLint run must set `ESLINT_USE_FLAT_CONFIG=false` or the lint step fails. This is set in the GitHub Actions workflow.
- **`server.js` loads `.env.local`** via `dotenv.config({ path: '.env.local' })` — if you add a new env var, add it to both `.env.local` (locally) and Railway (production).
- **CORS in production** restricts origins to `supplementscanner.io`, `supp-scanner.vercel.app`, and the Expo dev server. In development, all origins are allowed. Adding a new frontend domain requires updating `corsOptions` in `server.js`.
- **Supabase lazy init** — `_supabaseAuth` and `_supabaseService` in `server.js` are lazily initialized (getters) because `dotenv.config` must run first. Don't call `createClient` at module top-level.
- **`product.service.ts` console.logs** — several `console.log` calls exist for debugging. These are legacy and should be removed when the file is next touched.
- **`DEV_PREMIUM_BYPASS`** — set `VITE_DEV_PREMIUM_BYPASS=true` in `.env.local` to bypass the premium paywall in development. Never set this in production.
- **Mobile `COLORS` duplication** — each screen file defines its own `COLORS` object. This is intentional for now (avoids a shared constants dependency). If you're adding a new screen, copy from `app/(tabs)/index.tsx`.

---

## Data Layer Status (as of 2026-04-13)

| Layer | Status |
|-------|--------|
| `products` Supabase table | Live — populated via barcode ingest pipeline |
| `supplement_deep_dives` Supabase table | Live — Anthropic-generated, 30d cache |
| `profiles` Supabase table | Schema exists, auth not implemented (issue #9, post-MVP) |
| `saved_scans` Supabase table | Schema exists, not wired to any endpoint yet |
| `favorites` Supabase table | Schema exists, not wired to any endpoint yet |
| `encyclopediaData.ts` | 30 hardcoded supplements — source of truth for encyclopedia |
| AsyncStorage (mobile) | Scan history only — local, no Supabase sync |

---

## Open Questions

- The `rewards.tsx` tab screen exists in the tab bar — what is the intended behavior? (Gamification? Points? Unclear from code.)
- `search.tsx` tab exists — does it call the `/api/search` endpoint? Verify before building on it.
- The `vercel.json` at the repo root — is it safe to delete, or does it serve a purpose alongside Railway?
- Premium paywall (`PremiumPage.tsx`) — what's the actual payment mechanism? Stripe? Supabase auth tier? Not yet implemented.
- `src/services/qualityAnalyzer.js` — what triggers quality analysis? Is it part of the ingest pipeline or a separate step?
