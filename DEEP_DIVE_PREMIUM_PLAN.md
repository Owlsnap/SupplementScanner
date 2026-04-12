# Deep Dive Premium Feature — Architecture Plan

> **Status:** Planning / not yet implemented. Captures the design for the premium-tier "Deep Dive" feature so we can pick it up later.

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

## Next Steps (when we pick this up)

- [ ] Enable `pgvector` extension in Supabase
- [ ] Schema: `studies` table (PMID, title, abstract, embedding, study_type, sample_size, year, funding_source)
- [ ] Schema: `interactions` table (substance_a, substance_b, severity, mechanism, source)
- [ ] Schema: `user_health_profile` table (gated by auth — depends on issue #9)
- [ ] Ingestion script: PubMed E-utilities → embed → upsert into `studies`
- [ ] Seed interaction DB from chosen source
- [ ] New endpoint: `POST /api/premium/deep-dive/:slug` with auth middleware
- [ ] Frontend: Source Card component + Premium Dashboard layout
