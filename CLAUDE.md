# CLAUDE.md — SupplementScanner

> This file lives at the git root (`SuppScanner/`). Read it before touching anything.

## Project Overview

SupplementScanner is two products in one repo:

1. **Web app** (`SuppScanner/`) — supplement encyclopedia with AI-generated deep dives on 30+ supplements. This is the primary product. Deployed to Railway.
2. **Mobile app** (`SuppScanner/SuppScannerApp/`) — companion barcode scanner that calls the same backend API. Built with Expo/React Native.

**Target market:** Swedish health-conscious consumers.  
**State:** MVP. Encyclopedia and scan-to-result flow are working in production.

> ⚠️ **Stale duplicate warning:** There is an outdated `SuppScannerApp/` folder at the monorepo root (`SupplementScannerSiteAndApp/SuppScannerApp/`). **Never edit it.** Always work inside `SuppScanner/SuppScannerApp/`.

---

## Tech Stack

### Backend (`SuppScanner/server.js` + `SuppScanner/api/`)
- Node.js / **Express 5**
- **OpenAI SDK** (`openai`) — used for supplement data extraction/normalization
- **Anthropic SDK** (`@anthropic-ai/sdk`) — used for encyclopedia deep dive generation
- **Puppeteer** — scraping Swedish supplement retailer pages
- **Supabase** (`@supabase/supabase-js`) — PostgreSQL production database
- **express-rate-limit** — 100 req/15min general, 10 req/15min on `/api/ingest`
- **Zod** — request/response schema validation
- `dotenv` loading from `.env.local`

### Web Frontend (`SuppScanner/src/`)
- **Vite** + **React 18** + **TypeScript**
- **React Router v7** — single-page routing via `SupplementAnalyzer.tsx`
- **Tailwind CSS v4** — utility classes + CSS variables for dark mode
- **Dark mode** — `DarkModeContext` (localStorage + `prefers-color-scheme`), toggled via `document.documentElement.classList`
- **Phosphor Icons** (`@phosphor-icons/react`) + Lucide React
- State: local `useState`/`useEffect` — no global store

### Mobile App (`SuppScanner/SuppScannerApp/`)
- **Expo SDK 54** / **React Native 0.81**
- **Expo Router v6** — file-based routing under `app/`
- **expo-camera** — barcode scanning via `CameraView` + `onBarcodeScanned`
- **React Navigation** (bottom tabs via custom `BottomNav` component)
- **AsyncStorage** — scan history cache
- **Axios** + native `fetch` for API calls
- **Manrope** (headings) + **Inter** (body) via `@expo-google-fonts`
- **react-native-reanimated** + **react-native-gesture-handler** (installed, used in gesture-based UI)
- API base URL: `EXPO_PUBLIC_API_URL` env var, defaults to `http://localhost:3001`

### Infrastructure
- **Railway** — hosts backend + web (CI/CD via GitHub Actions → `deploy.yml` on push to `main`)
- **Supabase** — project `tdfveybkkikzltnhiawr`, schema in `scripts/supabase-schema.sql`
- **Live URL:** `https://supplementscanner-production.up.railway.app`
- Required Railway env vars: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PUPPETEER_EXECUTABLE_PATH=/run/current-system/sw/bin/chromium`

---

## Architecture

### Folder Structure
```
SuppScanner/
├── server.js              # Express app — API routes + static file serving
├── src/
│   ├── App.tsx            # Root: BrowserRouter + DarkModeProvider
│   ├── components/
│   │   └── SupplementAnalyzer.tsx  # Main shell — all Routes defined here
│   ├── pages/             # EncyclopediaPage, DeepDivePage, SupplementInfoPage,
│   │                      # PremiumPage, MobileAppPage, RecommendationsPage
│   ├── data/
│   │   └── encyclopediaData.ts    # 30 hardcoded supplements (source of truth)
│   ├── contexts/
│   │   └── DarkModeContext.tsx
│   ├── services/
│   │   └── dbService.js           # Supabase CRUD, snake_case ↔ camelCase mapping
│   ├── extraction/        # multiLayerExtractor.js, siteExtractors/, structuredAINormalizer.ts
│   ├── schemas/           # Zod schemas + migrations
│   ├── types/             # Product, StructuredSupplementData types + validators
│   └── utils/             # validationUtils.js
├── api/
│   ├── ingest/
│   │   ├── barcode/[code].js  # POST — scan barcode → extract → Supabase
│   │   ├── url.js             # POST — ingest from URL
│   │   └── manual.js          # POST — manual product entry
│   ├── product/[barcode].js   # GET — fetch product from Supabase
│   ├── search.js              # GET — search products
│   ├── stats.js               # GET — product stats
│   └── encyclopedia/          # GET /deep-dive/:slug — cache-or-generate (30d TTL)
├── scripts/
│   └── supabase-schema.sql    # Full DB schema (run in Supabase SQL Editor)
└── SuppScannerApp/
    ├── app/
    │   ├── (tabs)/            # Tab screens: index (scanner), history, search, rewards
    │   ├── product/[barcode].tsx  # Product detail screen
    │   ├── manual-add.tsx         # Manual product entry
    │   └── _layout.tsx
    ├── components/
    │   └── BottomNav.tsx      # Custom tab bar
    ├── services/
    │   └── product.service.ts # fetchProductByBarcode → supplementAPI → Zod parse
    ├── src/
    │   ├── config/api.js      # API_BASE_URL from EXPO_PUBLIC_API_URL
    │   └── services/api.js    # supplementAPI axios wrapper
    └── schemas/
        └── product.ts         # Zod ProductSchema
```

### Data Flows

**Encyclopedia (web):**
`encyclopediaData.ts` → user opens DeepDivePage → `GET /api/encyclopedia/deep-dive/:slug` → check `supplement_deep_dives` Supabase table (30d TTL) → hit or miss → Anthropic generates → cache → return JSON

**Barcode scan (mobile):**
`CameraView.onBarcodeScanned` → `POST /api/ingest/barcode/:code` → `multiLayerExtractor` (OpenFoodFacts → Puppeteer scrape → OpenAI normalization) → `dbService.upsertProduct` → `product/[barcode].tsx`

**Product fetch (mobile):**
`fetchProductByBarcode` → `supplementAPI.getSupplement` → `GET /api/product/:barcode` → Supabase `products` table → `ProductSchema.safeParse` → render

---

## Code Conventions

### TypeScript
- Web: TypeScript with `any` appearing in some legacy code (e.g., `SupplementAnalyzer.tsx`) — tighten when touching
- Mobile: TypeScript, Zod schemas for product validation (`schemas/product.ts`)
- `tsconfig.json` in both web and mobile — check before assuming strict settings

### Components
- Functional components only, hooks-based
- Mobile: inline `StyleSheet.create` at bottom of each file — keep styles collocated
- Web: Tailwind utility classes + CSS variables (`var(--card-info-bg)` etc.) for theming
- No global state library — local `useState`/`useEffect`; `DarkModeContext` is the only context

### Naming
- Files: `PascalCase` for components, `camelCase` for services/utils
- DB: `snake_case` in Postgres, `camelCase` in JS — `dbService.js` handles the mapping
- API routes: kebab-case paths (`/api/ingest/barcode/:code`)

### Mobile Screens
- Each screen defines its own `COLORS` constant at the top (duplicated across files — known pattern)
- Font usage: `Manrope_800ExtraBold` for headings, `Inter_600SemiBold` for labels, `Inter_400Regular` for body
- Pill buttons: `borderRadius: 28`
- Safe area: use `SafeAreaView` from `react-native-safe-area-context`

---

## Commands

### Web / Backend (run from `SuppScanner/`)
```bash
npm run dev          # Vite dev server (frontend only)
npm run server       # Express backend only
npm run start:full   # Both Vite + Express via concurrently
npm run build        # Production Vite build
npm run lint         # ESLint (legacy config: ESLINT_USE_FLAT_CONFIG=false)
npm run format       # Prettier — format all src, api, server files
npm run format:check # Prettier — check without writing (used in CI)
```

### Mobile (run from `SuppScanner/SuppScannerApp/`)
```bash
npm start            # Expo dev server
npm run android      # Run on Android device/emulator
npm run ios          # Run on iOS simulator
npm run lint         # Expo lint
```

---

## Development Guidelines

- **Read before writing.** Understand existing patterns in the relevant file(s) before adding anything.
- **Match conventions.** Especially mobile screen structure — inline StyleSheet, local COLORS object, SafeAreaView.
- **Small, focused files.** Don't add unrelated changes to a PR.
- **No class components.** Functional + hooks only.
- **No `console.log` in production code** (some exist in `product.service.ts` — legacy, clean up when touching).
- **Supabase is production.** Don't reference old JSON file approaches.
- **Mobile API calls go to Railway URL** in production — `EXPO_PUBLIC_API_URL` env var.

---

## Known Issues / Tech Debt

- `product.service.ts` has multiple `console.log` calls — leftover debug code
- `SupplementAnalyzer.tsx` uses `any` in several places — legacy, tighten when touching
- Mobile `COLORS` object is duplicated in every screen file — no shared constants file yet
- `SuppScannerApp/` at monorepo root is stale — must not be edited (see issue #14)
- History tab uses AsyncStorage only — not backed by Supabase; no cross-device sync
- Search, Rewards tabs exist in the tab bar but their content state is unclear — verify before editing
- ESLint uses legacy config (`.eslintrc.cjs`) — needs `ESLINT_USE_FLAT_CONFIG=false` flag
- No test suite in either web or mobile
- `DEV_PREMIUM_BYPASS` flag in `SupplementAnalyzer.tsx` via `VITE_DEV_PREMIUM_BYPASS` env var — dev only

---

## Further Reading

- `docs/context.md` — product vision, domain model, business context
- `docs/agents.md` — how AI agents should approach this codebase
- `docs/skills.md` — step-by-step patterns for common tasks
- `docs/memory.md` — architectural decisions and project history
- `ROADMAP.md` — prioritized backlog, what's next vs. post-MVP vs. out of scope
- `.env.example` — all environment variables with descriptions (copy to `.env.local`)
