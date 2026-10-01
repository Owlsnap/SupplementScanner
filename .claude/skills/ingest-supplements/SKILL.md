---
name: ingest-supplements
description: Add new supplements to the SupplementScanner encyclopedia. Use whenever the user mentions adding, ingesting, or expanding supplements ("add creatine HCl", "let's add 20 new supplements", "add 10 more sleep supplements", "what should we add next"). Audits what already exists, proposes a candidate list sized to the request, waits for approval, then runs the full pipeline (encyclopedia data, en/sv i18n, PubMed RAG ingest, interaction seeds).
---

# Ingest new supplements

Two phases, always in this order: **Propose → (user approves) → Implement.** Never write files before the user approves a list, even for a single named supplement (a short confirm of slug/category/tier is enough for that case).

Run everything from the git root `SuppScanner/` (`C:\Users\ASUS\Desktop\SupplementScannerSiteAndApp\SuppScanner`). Never edit the stale root-level `SupplementScannerSiteAndApp/SuppScannerApp/`.

Terminology: the free encyclopedia entry is the **supplement page**; the premium RAG page is the **deep-dive**. Adding a supplement creates the supplement page data and feeds the deep-dive's evidence (PubMed studies + interactions).

## Phase 1 — Propose

### 1. Audit current state
```bash
node .claude/skills/ingest-supplements/audit.mjs
```
Read-only. It prints the source-of-truth list by category (from `src/data/encyclopediaData.ts`), per-registry drift, and which supplements lack interaction rows. Do not trust counts in docs/memory/CLAUDE.md; they go stale (they still say 30 or 70).

### 2. Interpret the request
| User says | Meaning |
|---|---|
| "add ashwagandha KSM-66 / this specific supplement" | 1 named supplement. Check it isn't already covered (see dedupe). |
| "add 20 new supplements" | N candidates, balanced across categories unless a category is named. |
| "add 10 sleep supplements" | N candidates in that category. |
| "add a bunch" / no number | Propose 10 and say so. |

### 3. Dedupe before proposing
A candidate must not already exist under another name or form. Check against the audit list for: synonyms (`omega-3` vs `fish-oil`), salts/forms (`magnesium-*`, `zinc-*`, `vitamin-d3` vs `vitamin-d3-k2`), and umbrella vs component (`multivitamin`, `bcaas`). Note: the repo already has some overlaps (`fish-oil`/`omega-3`, `vitamin-d3`/`vitamin-k2`/`vitamin-d3-k2`, `ubiquinol`/`coq10`). Do not add more without saying so. If the user names something that already exists, tell them and ask whether they want a distinct form.

### 4. Pick candidates
Use your own knowledge of the supplement landscape. Prioritize: commonly searched by the target market (health-conscious Swedish consumers; Swedish/EU availability matters, flag items restricted or banned in the EU/Sweden), enough human trial literature on PubMed for RAG to work, and real gaps in the current categories. Avoid: prescription-only drugs, banned/controlled substances, SARMs/prohormones, anything with essentially no human evidence (RAG would return nothing and the deep-dive would say "I don't know" everywhere).

### 5. Present the proposal
A table, then stop and ask for approval/edits:

| # | Slug | Name | Category | Evidence tier | PubMed search term | Interactions (danger/caution/synergy) | Why add |
|---|------|------|----------|---------------|--------------------|---------------------------------------|---------|

Rules for the fields:
- **slug**: kebab-case, lowercase, unique, stable (it's the URL, cache key, `studies` key, and interaction substance id).
- **category**: exactly one of `Performance | Sleep | Nootropics | Recovery | Health`.
- **evidenceTier**: exactly one of `Strong | Moderate | Emerging | Anecdotal`. Be conservative. Be consistent with existing tiers (check similar entries).
- **PubMed term**: a search phrase likely to return ≥15 relevant abstracts (e.g. `'L-tyrosine supplementation cognitive'`).
- **Interactions**: which existing supplements or drug classes it interacts with and why. Flag any **danger**-level drug interaction (this is health content; accuracy matters more than volume).
- Mention any drift the audit finds (see "Known gaps") and ask whether to include a catch-up. Don't silently widen scope.

## Phase 2 — Implement (after approval)

The proven pipeline, from the "Add 30 new encyclopedia supplements" commit (946bc82). Do all steps for every approved supplement.

### Step 1: `src/data/encyclopediaData.ts`
Append entries to `encyclopediaSupplements`, placing each under its category comment (`// Performance`, `// Sleep`, ...). Entry fields hold **i18n keys, not prose**:
```ts
{
  slug: 'l-tyrosine',
  name: 'L-Tyrosine',
  category: 'Nootropics',
  tagline: 'supplements.l-tyrosine.tagline',
  evidenceTier: 'Moderate',
  primaryUse: 'supplements.l-tyrosine.primaryUse',
  overview: 'supplements.l-tyrosine.overview',
  typicalDose: 'supplements.l-tyrosine.typicalDose',
  bestFor: ['supplements.l-tyrosine.bestFor.0', '...bestFor.1', '...bestFor.2'],
  keyFacts: ['supplements.l-tyrosine.keyFacts.0', '...keyFacts.1', '...keyFacts.2'],
  commonMistakes: ['supplements.l-tyrosine.commonMistakes.0', '...commonMistakes.1'],
},
```
Match the existing counts: 3 `bestFor`, 3 `keyFacts`, 2 `commonMistakes`. `name` is plain text (escape apostrophes).

### Step 2: `src/i18n/locales/en.json` and `sv.json`
Add `supplements.<slug>` to **both** files with the same keys: `tagline`, `primaryUse`, `overview`, `typicalDose`, `bestFor[3]`, `keyFacts[3]`, `commonMistakes[2]`. Read 2 nearby existing entries first and match their voice (tagline: one punchy line; overview: 2–3 sentences; keyFacts include concrete numbers such as trial counts/doses; commonMistakes are actionable). Swedish must be real Swedish (not machine-literal; use standard Swedish supplement terms). Keep en-dashes in dose ranges like `3–5g`. Edit with a JSON-safe method (parse → add keys → write with 2-space indent, UTF-8, no ASCII escaping, trailing newline preserved) so the diff only shows additions. Verify both files still parse.

Content accuracy rule: only state claims you are confident are supported by human evidence. Hedge where the evidence is thin, match the tier, never claim to treat/cure a disease. Doses must be realistic typical ranges.

### Step 3: `scripts/ingest-pubmed.js`
Add `'<slug>': '<pubmed search term>',` to `SUPPLEMENT_SEARCH_TERMS`.

Also add `'<slug>': '<substance>[tiab] OR <synonym>[tiab]',` to `SUBSTANCE_TERMS` in `scripts/evidence-terms.js`. This is the substance alone (no "supplementation"/outcome words). The ingest uses it to count PubMed meta-analyses + RCTs for the premium "Research base" score; a missing entry means no score is shown.

### Step 4: `scripts/seed-interactions.js`
Add rows to the `INTERACTIONS` array (shape):
```js
{ substance_a: 'ashwagandha', substance_b: 'thyroid medication', severity: 'danger', mechanism: '...', source: 'Sharma AK et al. J Int Soc Sports Nutr 2018' },
```
- `severity`: `danger` (pharma interaction or real harm risk) | `caution` (overlapping mechanisms) | `synergy` (beneficial pairing).
- `substance_a`/`substance_b`: supplement slugs, or a plain drug/class name. Upsert key is `substance_a,substance_b`, so don't add the same pair in reverse.
- `mechanism`: one or two factual sentences. `source`: a real citation (author, journal, year). If you can't recall a real citation, leave the row out rather than invent one. **Never fabricate sources.** Flag uncertain ones to the user for PMID verification.
- Aim for 1–3 rows per new supplement: prioritize any danger interactions, then notable synergies with existing supplements.

### Step 4b: Keep the other registries in sync (all additive)
These were previously allowed to drift; keep them at parity with `encyclopediaData.ts` on every run:
- `scripts/prerender.js` `SUPPLEMENT_SLUGS`: static SEO prerender; new slugs are not crawlable until added.
- `scripts/prewarm-encyclopedia.js` `SLUGS`: pre-generates free deep dives on Railway.
- `server.js` `SLUG_TO_NAME` (display name) and `SLUG_TO_TYPICAL_DOSE` (grounds the dosage-gap comparison in the premium RAG prompt; use the English `typicalDose`). Both are near line 1428-1500.
- Mobile: copy `src/data/encyclopediaData.ts` over `SuppScannerApp/src/data/encyclopediaData.ts` (they're meant to be identical) and add the new `supplements.<slug>` blocks from web `en.json` to `SuppScannerApp/src/i18n/en.json` (English only; mobile has no sv file). Insert textually; mobile `en.json` has hand-formatted inline objects, so don't re-serialize the whole file. Only edit under `SuppScanner/SuppScannerApp/`.

### Step 5: Verify (no network)
```bash
node .claude/skills/ingest-supplements/audit.mjs      # new slugs present in en/sv i18n + pubmed terms + interactions
npx tsc --noEmit                                      # from SuppScanner/
node scripts/seed-interactions.js --dry-run           # counts; requires env loaded, no writes
node scripts/ingest-pubmed.js --dry-run --slug <slug> # fetches PubMed only, no DB writes, per new slug
```
`ingest-pubmed.js --dry-run` hits NCBI **and still calls OpenAI embeddings** (small cost, `text-embedding-3-small`, ~20 abstracts per slug); it only skips the Supabase write. It needs `OPENAI_API_KEY` + Supabase vars in `.env.local` just to start. The "PMIDs found / abstracts parsed" line per slug is what to check: if a term returns <10, refine it before the live run. `seed-interactions.js --dry-run` makes no writes and only prints severity counts.

### Step 6: Live writes — ask first
The PubMed ingest is **required**, not optional: both deep-dives are strictly PubMed-grounded RAG. The free page (`GET /api/encyclopedia/deep-dive/:slug`, `generateFreeDive` in `server.js`) is a cited teaser built from the top-5 retrieved abstracts, and with fewer than 3 stored studies it shows "insufficient evidence" instead of generating anything. A new supplement without ingested studies therefore has an empty deep-dive.

These write to the **production Supabase** project and (for PubMed) spend OpenAI credits. Get explicit user approval in this conversation, then run:
```bash
node scripts/ingest-pubmed.js --slug <slug>    # once per new slug (NOT the no-arg form, which re-ingests all slugs)
node scripts/seed-interactions.js              # upserts all rows idempotently
```
Afterward, sanity check counts in the output (aim for 15+ abstracts per slug). Optionally warm the free-page cache (`node scripts/prewarm-encyclopedia.js`, about one GPT-4o call per supplement), or let the first visit generate it. Both need `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (and `OPENAI_API_KEY` for PubMed) in `.env.local`. If missing, tell the user; don't hunt for keys elsewhere.

### Step 7: Report
Summarize: supplements added (slug/category/tier), interactions added by severity, PubMed rows ingested per slug, anything skipped, anything the user should fact-check (especially danger interactions and any tier judgement calls). Do **not** commit or push unless asked. If asked to commit, match the style of 946bc82 (one commit, descriptive body).

## Known gaps (as of the last audit; re-run the audit, don't trust this list)

The registry drift was cleaned up; `audit.mjs` now shows 100/100 everywhere except interactions. Remaining:
- ~25 older supplements have no rows in `scripts/seed-interactions.js` (the audit lists them). Backfilling needs real citations, so propose rows to the user for review rather than writing them unprompted.
- PubMed terms for the 26 backfilled slugs are in `ingest-pubmed.js` but the live ingest (`--slug <slug>`, Step 6) hasn't been run for them unless the user says so.

## Guardrails
- This is health content. Accuracy over speed; hedge thin evidence; no disease-treatment claims.
- Don't invent citations, PMIDs, or study numbers. Anything shown as study evidence must come from PubMed via the `studies` table (the user's hard rule); hand-written encyclopedia text is reference copy only and must not make study/efficacy claims beyond what PubMed supports.
- Don't touch production data without the Step 6 approval.
- Don't change existing supplements' content as a side effect of adding new ones.
- Keep diffs additive and minimal.
