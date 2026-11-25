# Roadmap

Status legend: `done` `in-progress` `next` `planned` `post-mvp` `out-of-scope`

---

## MVP — Ship-blocking

These must be done before public launch.

| Status | Item | Notes |
|--------|------|-------|
| `done` | Encyclopedia — 100 supplements with PubMed-grounded deep dives | `encyclopediaData.ts` + `/api/encyclopedia/deep-dive/:slug` (`lib/rag.js`) |
| `done` | Barcode scan → product result (mobile) | Full pipeline: camera → ingest → Supabase → product screen |
| `done` | Deploy to Railway (backend + web) | CI/CD via GitHub Actions on push to `main` |
| `done` | Supabase migration (products table) | Schema in `scripts/supabase-schema.sql` |
| `done` | Rate limiting | 100 req/15min general, 10 req/15min ingest |
| `done` | Scan history screen (AsyncStorage, last 20) | `app/(tabs)/history.tsx` — local only |
| `next` | E2E testing — 8 test cases | GitHub issue #2, run against live Railway URL |
| `next` | Offline support (AsyncStorage cache + NetInfo) | GitHub issue #5 — cache product results locally |

---

## Post-MVP — High value, not ship-blocking

Do these after the first public release.

| Status | Item | Notes |
|--------|------|-------|
| `done` | User auth (Supabase auth) | Web + mobile (email/password + Google OAuth), shared `auth.users` |
| `out-of-scope` | Search screen (mobile) | Removed in the 2026-07 encyclopedia-first pivot (tab replaced by Saved Deep Dives) |
| `out-of-scope` | Stats screen (mobile) | Removed in the 2026-07 encyclopedia-first pivot |
| `out-of-scope` | Rewards/gamification (mobile) | Tab removed in the 2026-07 pivot |
| `planned` | Cross-device scan history sync | Requires user auth first — AsyncStorage → Supabase `saved_scans` |
| `planned` | Favorites (mobile) | `favorites` table exists in Supabase, not wired |
| `planned` | Image upload for manual products | GitHub issue #10 |
| `done` | More encyclopedia supplements | 100 supplements; add more via the `ingest-supplements` Claude Code skill |

---

## Premium Tier — Revenue feature

Build after user auth is in place (auth gates the premium tier).

| Status | Item | Notes |
|--------|------|-------|
| `done` | Premium Deep Dive (RAG pipeline) | `POST /api/premium/deep-dive/:slug` — PubMed `studies` table, exact-cosine retrieval, GPT-4o temp 0, code-level grounding check, source cards |
| `done` | Research base score (replaced confidence score) | Log-scaled PubMed meta-analysis + RCT counts per supplement; measures research volume, not efficacy |
| `done` | "The Catch" — AI flags study limitations | Plus dosage gap (studied dose vs. retail dose); both pass the grounding check |
| `in-progress` | Interaction Engine | Danger / caution / synergy rows live and source-cited; 25 supplements still have none — `scripts/interactions-draft.js` awaits source verification |
| `in-progress` | Personalization — user health profile | Profile + stack stored in `user_health_profiles`; stack evaluation live (timing/overlap suggestions labelled general guidance). Dietary filters not built |
| `done` | Stripe integration | Subscriptions + single deep-dive purchases (web), Android subscription checkout (mobile) |
| `planned` | Shared subscription with encyclopedia site | Single account covers web + mobile |
| `planned` | Affiliate links to Swedish retailers | Revenue stream alongside premium |

---

## AI Quality & Infrastructure

| Status | Item | Notes |
|--------|------|-------|
| `done` | Grounding check on both deep-dives | Citations must exist; every number must appear in the cited abstract (`lib/rag.js`) |
| `done` | RAG eval harness + CI gate | `npm run eval:rag`; `.github/workflows/rag-eval.yml` (needs `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` secrets) |
| `next` | Close corpus gaps found by the eval | 5-HTP has 0 stored studies; kava, passionflower, forskolin, niacin have 1; vitamin D3 corpus has nothing on infections |
| `next` | LLM call logging | Model, tokens, latency, cost, cache hit and grounding drops per call into Supabase |
| `planned` | Scheduled PubMed refresh | Weekly incremental ingest via GitHub Actions, with a change log |
| `planned` | Ground stack insights in retrieval | Currently general model guidance, labelled as such in API + UI |

---

## Tech Debt — Clean up when touching relevant code

Not blocking anything, but should be resolved before they compound.

| Status | Item | Notes |
|--------|------|-------|
| `planned` | Remove `console.log` calls from `product.service.ts` | Debug leftovers |
| `planned` | Shared `COLORS` constant for mobile | Currently duplicated in every screen file |
| `planned` | Tighten `any` types in `SupplementAnalyzer.tsx` | Legacy, fix when touching the file |
| `planned` | Delete or archive stale `SuppScannerApp/` at monorepo root | See issue #14 — never edit this folder |
| `planned` | Clarify or remove `vercel.json` | Leftover from pre-Railway attempt |
| `planned` | Migrate ESLint to flat config | Currently using legacy `.eslintrc.cjs` |

---

## Out of Scope (for now)

Things explicitly deferred — don't build these without a discussion first.

- SSR / Next.js migration for the web frontend (no SEO requirement yet)
- Native iOS/Android app store release (Expo Go / dev build is enough for MVP)
- Barcode scanning on web (mobile is the scan surface)
- Custom supplement data entry by end users (admin-only for now)
- Multi-language UI (English-first, Swedish localisation is post-MVP)
