# Roadmap

Status legend: `done` `in-progress` `next` `planned` `post-mvp` `out-of-scope`

---

## MVP — Ship-blocking

These must be done before public launch.

| Status | Item | Notes |
|--------|------|-------|
| `done` | Encyclopedia — 30 supplements with AI deep dives | `encyclopediaData.ts` + `/api/encyclopedia/deep-dive/:slug` |
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
| `planned` | User auth (Supabase auth) | GitHub issue #9 — profiles + saved scans tables exist, not wired |
| `planned` | Search screen (mobile) | GitHub issue #6 — tab exists, calls `/api/search` |
| `planned` | Stats screen (mobile) | GitHub issue #6 — `/api/stats` endpoint exists |
| `planned` | Rewards/gamification (mobile) | Tab exists (`rewards.tsx`) — intent unclear, define before building |
| `planned` | Cross-device scan history sync | Requires user auth first — AsyncStorage → Supabase `saved_scans` |
| `planned` | Favorites (mobile) | `favorites` table exists in Supabase, not wired |
| `planned` | Image upload for manual products | GitHub issue #10 |
| `planned` | More encyclopedia supplements | Expand beyond 30 — aim for 100+ |

---

## Premium Tier — Revenue feature

Build after user auth is in place (auth gates the premium tier).

| Status | Item | Notes |
|--------|------|-------|
| `planned` | Premium Deep Dive (RAG pipeline) | Separate from free deep dive — vector store + PubMed/NIH sources + Anthropic at temp 0.0 + source citations. See `docs/context.md` for full spec. |
| `planned` | Confidence scores | Weighted by study type: meta-analysis > RCT > animal study |
| `planned` | "The Catch" — AI flags study limitations | Dosage gaps (studied dose vs. retail dose) |
| `planned` | Interaction Engine | Red (drug interactions, hard-coded DB) / Yellow (overlapping mechanisms) / Green (synergies) |
| `planned` | Personalization — user health profile | Dietary filters (vegan + gelatin flag), timing tips |
| `planned` | Stripe integration | Payment for premium tier |
| `planned` | Shared subscription with encyclopedia site | Single account covers web + mobile |
| `planned` | Affiliate links to Swedish retailers | Revenue stream alongside premium |

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
