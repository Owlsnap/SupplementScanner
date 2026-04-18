# Deep Dive Premium Feature — Architecture Plan

> **Status:** ✅ Implemented (2026-04-18). Personalization (item 4) is the only remaining item — blocked on user auth (issue #9).

## Why RAG, not raw LLM

The free-tier Deep Dive currently uses plain LLM generation (`/api/encyclopedia/deep-dive/:slug`). For a paid health-context feature, that's not acceptable — hallucinated dosages or interactions create liability and erode trust. The premium tier must shift to **Retrieval-Augmented Generation (RAG)**: the LLM acts as a precise filter over vetted clinical data, never as a source of facts.

---

## 1. Evidence-Grounded RAG Pipeline

Three-step flow on every premium query:

1. **Curated Vector Database** — pre-loaded with vetted sources:
   - PubMed abstracts (free via NCBI E-utilities API)
   - NIH Office of Dietary Supplements fact sheets (public domain)
   - Examine.com-style meta-analysis summaries (build our own or license)
2. **Retrieval** — fetch top 5 most relevant clinical study snippets for the query.
3. **Grounded Generation** — LLM prompt:
   > "Answer the user's question using ONLY the provided study snippets. If the information is not in the snippets, say you don't know. Cite the year and sample size of each study."

**Vector store choice:** `pgvector` extension in our existing Supabase project — no new infra.

---

## 2. Clinical Trial Summary Format

Standardized "Premium Dashboard" presentation per supplement:

| Data Point | Extraction Logic |
|---|---|
| **Confidence Score** | Weighted by study type — Meta-analysis 100%, Double-blind RCT 80%, Animal study 10% |
| **The Catch** | AI flags limitations: small sample size, manufacturer-funded, short duration, etc. |
| **Dosage Gap** | Effective study dose vs. typical retail dose (e.g., 600mg studied vs. 200mg sold) |

---

## 3. Interaction Engine

The most valuable — and riskiest — premium feature. Tiered, exclusionary logic:

- 🔴 **Red (Danger):** Known contraindications (e.g., St. John's Wort + SSRIs). Pulled from a hard-coded pharmaceutical interaction DB.
- 🟡 **Yellow (Caution):** Overlapping mechanisms (e.g., three supplements that all thin the blood).
- 🟢 **Green (Synergy):** Beneficial pairings (Mg + Zn, Turmeric + Black Pepper).

**Interaction DB sourcing options:**
- DrugBank (academic free tier)
- NIH NLM Interaction API (free, but deprecated 2024 — verify current state)
- Natural Medicines (paid, comprehensive)

---

## 4. Personalization & Stack Logic

Premium users input a **Health Profile** (goal, diet, conditions, current stack).

- **Filter:** vegan user scans gelatin-containing supplement → flag immediately.
- **Optimizer:** absorption/timing tips, e.g., "Vitamin D is fat-soluble; take with your largest meal for ~30% better absorption."

---

## 5. Implementation Guardrails

- **UI — Source Cards:** every AI claim renders a clickable card linking to its PMID.
- **Human-in-the-loop:** nutritionist reviews AI templates for the top 50 most-searched supplements. (MVP: solo dev reviews; later: budget for nutritionist.)
- **Hallucination guardrail:** LLM `temperature = 0.0`.
- **Separate endpoint:** do NOT extend the free `/api/encyclopedia/deep-dive/:slug` path. Build a new premium pipeline with auth gating, retrieval step, grounded prompt, and citation in the response schema.

---

## Open Questions / Risks

1. **Examine.com licensing** — proprietary; we'd need to build summaries ourselves or license.
2. **PubMed caching policy** — abstracts are free to fetch but caching has NCBI ToS constraints.
3. **Liability** — even with citations, supplement-drug interaction advice carries medical-advice risk. Needs disclaimer + ToS review before launch.
4. **Vector DB seeding cost** — embedding tens of thousands of PubMed abstracts has a one-time OpenAI/embedding API cost; estimate before kickoff.

---

## Implementation

### Completed (2026-04-18)

- [x] Enable `pgvector` extension in Supabase
- [x] Schema: `studies` table — `scripts/supabase-schema.sql` (section 6)
- [x] Schema: `interactions` table — `scripts/supabase-schema.sql` (section 7)
- [x] Schema: `user_health_profiles` table — `scripts/supabase-schema.sql` (section 8, awaiting auth)
- [x] Supabase RPC: `match_studies()` vector similarity function — `scripts/supabase-schema.sql` (section 9)
- [x] Ingestion script: `scripts/ingest-pubmed.js` — 545 rows across 30 supplements
  - Fix applied: study type extracted from `<PublicationType>` XML tags, not abstract text
- [x] Interaction seed script: `scripts/seed-interactions.js` — 36 interactions (10 danger, 12 caution, 14 synergy)
  - Source: curated from published literature; no licensed DB required at this scale
- [x] New endpoint: `POST /api/premium/deep-dive/:slug` — RAG pipeline, structured output, confidence score
- [x] New endpoint: `GET /api/premium/interactions/:slug` — interaction lookup by supplement slug
- [x] Frontend: `src/components/SourceCard.tsx` — clickable citation cards linking to PubMed
- [x] Frontend: `src/pages/PremiumDeepDivePage.tsx` — full Premium Dashboard
  - Confidence meter (weighted by study type)
  - Evidence summary with inline [N] citation badges
  - The Catch (study limitations)
  - Dosage Gap
  - Ask-the-evidence input (inline answer, does not reload page)
  - Source cards per citation
- [x] `PremiumPage.tsx` feature list updated to reflect built vs. coming-soon

### Remaining

- [ ] Personalization & Stack Logic (item 4) — blocked on user auth (issue #9)
- [ ] Disclaimer + ToS review — required before public launch
- [ ] Examine.com licensing decision — open question

### Open Questions / Risks (updated)

1. **Examine.com licensing** — still open; current implementation uses PubMed only.
2. **PubMed caching** — abstracts fetched once and stored in Supabase; no live NCBI calls at query time.
3. **Liability** — disclaimer shown on `PremiumDeepDivePage`; full ToS review needed before launch.
4. **Embedding cost** — one-time cost incurred (~$0.10–0.20 for 545 rows at `text-embedding-3-small` rates).
