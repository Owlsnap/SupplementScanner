# agents.md — Agentic Development Guide

> How AI agents (Claude Code, Cursor, Copilot, etc.) should work in this project.

## Principles

- **Read before writing.** Always inspect the relevant files before generating anything. Match existing patterns exactly.
- **Solo-dev MVP.** Ship working code over perfect code. Don't add abstractions, helpers, or config that isn't immediately needed.
- **Functional style.** Hooks, composition, small focused files. No class components anywhere.
- **When in doubt, copy a sibling.** Adding a new screen? Copy the closest existing screen's structure. Adding an API route? Copy the closest existing route.
- **Narrow PRs.** One concern per PR. Don't clean up unrelated code in the same commit.

---

## Repository Awareness

- **Git root is `SuppScanner/`** — all `npm` commands, paths, and imports are relative to here.
- **⚠️ Never edit `SupplementScannerSiteAndApp/SuppScannerApp/`** — it is a stale duplicate of the mobile app from before issue #1 was resolved. The real mobile app is at `SuppScanner/SuppScannerApp/`.
- The Express backend (`server.js`) and the React web frontend (`src/`) are in the **same project** — they share one `package.json`. In production, Express serves the Vite build as static files.
- The mobile app (`SuppScannerApp/`) has its **own `package.json`** — run `npm install` and all mobile commands from inside that folder.
- Mobile calls the backend via `EXPO_PUBLIC_API_URL` (defaults to `http://localhost:3001` for dev, Railway URL for production).

---

## Workflow: New Backend API Endpoint

1. Read `server.js` to understand how existing routes are registered.
2. Create a file under `api/` following the naming of existing routes.
3. Use `getSupabaseService()` for writes, `getSupabaseAuth()` for user-scoped reads.
4. Apply `ingestLimiter` if the endpoint mutates data; `generalLimiter` is already applied to all `/api/*`.
5. Validate request body with Zod — see `src/schemas/` for existing schemas.
6. Return `{ success: true, data: ... }` or `{ success: false, error: '...' }`.

## Workflow: New Web Page

1. Create the component in `src/pages/` (PascalCase filename, `.tsx`).
2. Register the route in `SupplementAnalyzer.tsx` inside the `<Routes>` block.
3. Use Tailwind for all styling. Use `useDarkMode()` from `DarkModeContext` if the component needs dark mode variants.
4. No global state — local `useState`/`useEffect` only unless using the existing `DarkModeContext`.
5. For API calls, use `fetch` or create a thin wrapper — no new HTTP library.

## Workflow: New Mobile Screen

1. Create the file in `app/` (Expo Router — file path = route path).
   - Tab screen → `app/(tabs)/yourscreen.tsx` and register in `app/(tabs)/_layout.tsx`
   - Standalone screen → `app/yourscreen.tsx` or `app/yourscreen/[param].tsx`
2. Copy the `COLORS` constant from an existing screen (e.g., `app/(tabs)/index.tsx`) — it's duplicated intentionally for now.
3. Use `SafeAreaView` from `react-native-safe-area-context` for top/bottom safe areas.
4. Define styles at the bottom of the file via `StyleSheet.create`.
5. Fonts: `Manrope_800ExtraBold` for headings, `Inter_600SemiBold` for labels, `Inter_400Regular` for body.
6. API calls: import `API_BASE_URL` from `../../src/config/api` and use `fetch` or the `supplementAPI` wrapper from `src/services/api.js`.

## Workflow: Bug Fix

1. Trace the full data flow before patching — backend service → API route → client fetch → render.
2. Fix the root cause, not the symptom.
3. Don't refactor surrounding code in the same PR.
4. If the bug is in `product.service.ts` — note it has multiple `console.log` statements that can be removed when touched.

---

## Do's

- Use TypeScript — minimize `any`. If you see existing `any`, don't add more.
- Handle loading and error states in every component that fetches data.
- Use `Zod` for validating API inputs — schemas live in `src/schemas/`.
- Use `dbService.js` for all Supabase queries — don't instantiate a new client inline.
- Use `express-rate-limit` for any new endpoint that mutates data.
- Keep `encyclopediaData.ts` as the single source of truth for encyclopedia supplement metadata.

## Don'ts

- Don't add new npm dependencies without a clear reason. Check if something already in the stack covers the need.
- Don't create class components.
- Don't leave `console.log` in production code (a few exist in `product.service.ts` — legacy debt).
- Don't assume the mobile app can reach `localhost` — it uses `EXPO_PUBLIC_API_URL`.
- Don't touch `SupplementScannerSiteAndApp/SuppScannerApp/` (stale root duplicate).
- Don't write directly to Supabase from the mobile app — all data access goes through the backend API.
- Don't add features, refactors, or "improvements" beyond what the task requires.
- Don't bypass ESLint (`--no-verify`) — fix the lint error instead. ESLint runs with `ESLINT_USE_FLAT_CONFIG=false`.

---

## PR Standards

- **Title prefix:** `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`
- **Description:** What changed and why — one paragraph max.
- **Scope note:** State whether the change is web, mobile, backend, or multiple.
- **Keep PRs small.** One feature or one bug fix per PR.
- **No draft cleanup.** Don't merge half-finished work — if it's not ready, keep it in a branch.
