# SupplementScanner — Premium Plan

## Overview

Three purchase options targeting different user intent:

| SKU | Price | Model |
|-----|-------|-------|
| **Pay-per-Deep Dive** | ~$1.99 / dive | One-time Stripe Payment Intent |
| **Monthly sub** | ~$7.99 / mo | Stripe Subscription (monthly) |
| **Yearly sub** | ~$59.99 / yr (~$5/mo) | Stripe Subscription (yearly) |

Lifetime option: consider a limited early-adopter offer ($79–99, first 100 buyers) once subscriptions are live. Frame it as "current feature set" to avoid open-ended token liability.

---

## What Premium Unlocks

### Free tier
- Encyclopedia cards (name, tagline, evidence tier, primary use)
- URL / barcode scanner

### Premium tier
- **Deep Dive** — full AI-generated breakdown per supplement (currently exists as free, to be paywalled + upgraded to RAG)
  - What it is / How it works
  - Dosing (conservative / standard / high + timing)
  - Forms & bioavailability
  - Synergies (pairings)
  - Cautions & interactions

### Premium RAG upgrade (Phase 2)
- Evidence-grounded RAG pipeline (PubMed / NIH / meta-analysis snippets)
- Confidence Score (meta-analysis 100%, RCT 80%, animal 10%)
- "The Catch" — AI-flagged limitations (small N, industry-funded)
- Dosage Gap — studied dose vs. retail dose comparison
- Source Cards — every claim links to PMID
- Interaction Engine: Red/Yellow/Green (hard-coded pharma DB + overlap detection + synergy)
- Personalization stack (health profile → vegan filter, timing tips)

---

## UX Decisions

### Paywall flow
1. Free user clicks "Deep Dive" on any encyclopedia card
2. **Paywall modal** appears — short pitch + "See plans" CTA (does not navigate away mid-browse)
3. "See plans" routes to `/premium` page
4. User picks SKU → Stripe Checkout → redirect back with session_id → entitlement granted

### /premium page structure
- Hero: headline + sub-headline
- 3-column SKU cards (per-dive, monthly, yearly — yearly highlighted as "Best Value")
- Feature comparison table (Free vs Premium)
- FAQ strip (refunds, device support, mobile app)
- Footer CTA

---

## Mobile strategy

- **Unified entitlement**: one account unlocks both web + mobile (requires auth, currently post-MVP #9)
- **Scanner → Deep Dive bridge**: product scan shows ingredient list with "Deep Dive (Premium)" badges — highest-intent paywall moment
- **Mobile-only perks** (justify sub vs one-off): push notifications for new studies on saved supplements, offline cached deep dives, interaction warnings in scan history
- **Platform billing**: sell exclusively via web/Stripe to avoid Apple/Google 15–30% cut; mobile app reads entitlement from Supabase user record

---

## Implementation phases

### Phase 1 — Paywall UI (current sprint)
- [x] `/premium` page with 3 SKU cards + feature table
- [ ] Paywall modal on Deep Dive click (for non-premium users)
- [ ] Dev bypass: `VITE_DEV_PREMIUM_BYPASS=true` skips entitlement check

### Phase 2 — Stripe + entitlement
- [ ] Auth (Supabase Auth) — prerequisite for subscriptions (#9)
- [ ] Stripe Payment Links / Checkout sessions
- [ ] `user_entitlements` Supabase table (user_id, plan, expires_at)
- [ ] Server middleware: check entitlement on `/api/encyclopedia/deep-dive/:slug`

### Phase 3 — RAG deep dives
- [ ] Vector DB (pgvector on Supabase or Pinecone) seeded with PubMed / NIH abstracts
- [ ] Premium endpoint: `/api/encyclopedia/deep-dive-premium/:slug`
- [ ] RAG pipeline: retrieve top-5 chunks → grounded prompt (temperature 0.0) → source citations in response
- [ ] Source Cards UI component
- [ ] Confidence Score + "The Catch" + Dosage Gap display blocks

---

## Dev notes

- `VITE_DEV_PREMIUM_BYPASS=true` in `.env.local` → skips all entitlement checks in frontend
- Do NOT reuse `/api/encyclopedia/deep-dive/:slug` for premium RAG — it's plain LLM generation; build a separate endpoint
- LLM temperature must be 0.0 for all premium RAG calls
