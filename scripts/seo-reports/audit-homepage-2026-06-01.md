# SEO & AEO Audit — SupplementScanner.io Homepage

**URL audited:** https://www.supplementscanner.io
**Date:** Homepage (root) audit
**Auditor:** SEO/AEO Specialist — SupplementScanner team
**Verdict:** 🔴 **Critical** — The homepage ships an empty React shell with no server-rendered content, English-only metadata for a Swedish audience, and zero structured data. This blocks both classic SEO indexing and AEO citeability.

---

## 0. The Headline Finding (read this first)

The raw HTML returned for `https://www.supplementscanner.io` is a **client-side-only SPA shell**:

```html
<body>
  <div id="root"></div>
</body>
```

There is **no body content, no headings, no schema** in the server response. Everything is injected by `/assets/index-7678f956.js` after load.

**Why this is the #1 issue:**
- **AI answer engines** (Perplexity, ChatGPT browse, Gemini, Copilot) and many crawlers do **not** execute JavaScript reliably, or heavily discount JS-rendered content. They see a blank page → **nothing to cite, nothing to rank.**
- Googlebot *can* render JS, but on a deferred "second wave" with budget limits — slower indexing, frequent partial renders for a 70-page encyclopedia.
- Social shares (the OG/Twitter gap below) produce blank, unbranded previews.

**Everything else in this report is secondary to fixing rendering.** A perfectly optimized title tag is worthless if the answer engine never sees the content beneath it.

---

## 1. Technical SEO Element Evaluation

### 1.1 Title Tag
**Current:**
```html
<title>SupplementScanner - Supplement Index</title>
```
- Length: ~35 characters (under-utilized; you have ~60 to work with)
- ❌ **English** — target audience is Swedish
- ❌ No primary keyword ("kosttillskott", "scanna kosttillskott")
- ❌ "Supplement Index" is internal jargon, not a search term
- ❌ No value proposition / no scan hook
- ⚠️ Brand-first ordering wastes the highest-weighted pixels on a brand nobody is searching yet

**Recommended:**
```html
<title>Kosttillskott Lexikon & Streckkodsskanner | SupplementScanner</title>
```
*(58 chars — keyword-led, brand suffix, describes both core features)*

Alternative if leading with the scan USP:
```html
<title>Skanna kosttillskott & se vad de innehåller | SupplementScanner</title>
```

---

### 1.2 Meta Description
**Current:**
```html
<meta name="description" content="Discover evidence-based info on 30+ supplements. Deep dive into mechanisms, dosing, and synergies — powered by AI.">
```
- ❌ **English** for a Swedish market
- ❌ Stale count: says "30+" — you have **70** supplements
- ❌ No CTA, no scan feature mention (your differentiator)
- Length: 116 chars (room to expand to ~155)

**Recommended:**
```html
<meta name="description" content="Skanna streckkoden på dina kosttillskott och få evidensbaserad info om 70+ tillskott — verkningssätt, dosering och synergier. Gratis att börja.">
```
*(154 chars — keyword-rich, accurate count, scan USP, soft CTA)*

---

### 1.3 Language & International Targeting
**Current:**
```html
<html lang="en">
```
- 🔴 **Critical mismatch** — Swedish product, Swedish content, declared English. This confuses language classifiers, suppresses ranking in `google.se`, and tells AI engines the content is English.
- ❌ No `hreflang` tags

**Recommended:**
```html
<html lang="sv">
```
And in `<head>` (even if Swedish-only today, declare it explicitly):
```html
<link rel="alternate" hreflang="sv-SE" href="https://www.supplementscanner.io/" />
<link rel="alternate" hreflang="x-default" href="https://www.supplementscanner.io/" />
```

---

### 1.4 Canonical URL
**Current:** ❌ **Missing entirely.**
- Risk: www vs non-www, trailing-slash, and query-param duplicates (e.g. UTM links from your scan flow) all index as separate URLs, splitting authority.

**Recommended (self-referencing, per page):**
```html
<link rel="canonical" href="https://www.supplementscanner.io/" />
```
Ensure the SPA router writes a correct canonical for every route (`/encyclopedia`, `/supplement/:slug`, etc.).

---

### 1.5 Open Graph / Twitter Cards
**Current:** ❌ **Completely absent.** Shares to Facebook, LinkedIn, X, WhatsApp, and Slack render a blank, untitled box → near-zero social CTR and lost referral traffic.

**Recommended:**
```html
<!-- Open Graph -->
<meta property="og:type" content="website" />
<meta property="og:site_name" content="SupplementScanner" />
<meta property="og:locale" content="sv_SE" />
<meta property="og:title" content="Kosttillskott Lexikon & Streckkodsskanner | SupplementScanner" />
<meta property="og:description" content="Skanna streckkoden på dina kosttillskott och få evidensbaserad info om 70+ tillskott — verkningssätt, dosering och synergier." />
<meta property="og:url" content="https://www.supplementscanner.io/" />
<meta property="og:image" content="https://www.supplementscanner.io/og/home-1200x630.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Kosttillskott Lexikon & Streckkodsskanner | SupplementScanner" />
<meta name="twitter:description" content="Skanna streckkoden på dina kosttillskott och få evidensbaserad info om 70+ tillskott." />
<meta name="twitter:image" content="https://www.supplementscanner.io/og/home-1200x630.png" />
```

---

### 1.6 Heading Hierarchy (H1/H2/H3)
**Current:** ❌ **Cannot be evaluated** — no headings exist in the server-rendered HTML (empty `#root`). After JS render the H1 may exist, but it is invisible to non-rendering crawlers.

**Recommended homepage structure (must be in initial HTML):**
```html
<h1>Skanna kosttillskott och förstå vad du tar</h1>
  <h2>Vad är SupplementScanner?</h2>
  <h2>Så fungerar streckkodsskannern</h2>
  <h2>Kosttillskott i vårt lexikon (70+)</h2>
    <h3>Populära tillskott: Magnesium, Omega-3, D-vitamin…</h3>
  <h2>Vanliga frågor om kosttillskott</h2>   <!-- FAQ section -->
```
One H1 only, keyword-bearing, followed by a logical H2 cascade.

---

### 1.7 Structured Data (JSON-LD)
**Current:** ❌ **None.** No `Organization`, `WebSite`, `SearchAction`, `FAQPage`, or `MedicalWebPage`. This is the largest missed AEO opportunity on the site.

See Section 3 for full recommended JSON-LD blocks.

---

## 2. Body Content & First-500-Words Analysis (AEO)

**Current:** There is **no body content in the server response.** An AI engine fetching this URL today extracts the title and meta description only — it has **nothing substantive to cite.** The "first 100 words" AEO opportunity is currently empty.

This means:
- ❌ Primary question ("What is SupplementScanner / how do I check a supplement?") is **not** answered in the first paragraph — there is no paragraph.
- ❌ No extractable Q&A pairs.
- ❌ No clear entity definition of the product or any supplement.

Once rendering is fixed (SSR/SSG/prerender), the homepage must open with a citeable, definitional first paragraph:

> **SupplementScanner är en svensk tjänst där du skannar streckkoden på ett kosttillskott och direkt får evidensbaserad information om innehåll, dosering, verkningssätt och säkerhet.** Databasen omfattar över 70 vanliga tillskott som magnesium, omega-3 och D-vitamin, med djupgående analyser baserade på vetenskaplig forskning.

This pattern — **[Entity] är [authoritative definition]** in sentence one — is exactly what answer engines lift verbatim.

---

## 3. Recommended JSON-LD (drop into rendered `<head>`)

### 3.1 Organization + WebSite + Sitelinks Searchbox
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.supplementscanner.io/#org",
      "name": "SupplementScanner",
      "url": "https://www.supplementscanner.io/",
      "logo": "https://www.supplementscanner.io/supplement-scanner-logo.svg",
      "description": "Svenskt lexikon och streckkodsskanner för kosttillskott, baserat på vetenskaplig evidens.",
      "areaServed": "SE",
      "knowsLanguage": "sv-SE"
    },
    {
      "@type": "WebSite",
      "@id": "https://www.supplementscanner.io/#website",
      "url": "https://www.supplementscanner.io/",
      "name": "SupplementScanner",
      "inLanguage": "sv-SE",
      "publisher": { "@id": "https://www.supplementscanner.io/#org" },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://www.supplementscanner.io/encyclopedia?q={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    }
  ]
}
</script>
```

### 3.2 FAQPage (drives FAQ rich results + AI citations)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "inLanguage": "sv-SE",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Vad är SupplementScanner?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "SupplementScanner är en svensk tjänst där du skannar streckkoden på ett kosttillskott och får evidensbaserad information om innehåll, dosering, verkningssätt och säkerhet för över 70 tillskott."
      }
    },
    {
      "@type": "Question",
      "name": "Hur skannar jag ett kosttillskott?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Öppna SupplementScanner, rikta kameran mot produktens streckkod, så identifieras tillskottet och du får en sammanfattning av innehåll, dosering och forskningsläge."
      }
    },
    {
      "@type": "Question",
      "name": "Är informationen evidensbaserad?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Ja. Varje tillskott analyseras utifrån vetenskaplig forskning med fokus på verkningssätt, dosering och dokumenterade effekter."
      }
    }
  ]
}
</script>
```

### 3.3 For supplement detail pages (`/supplement/:slug`) — use `DietarySupplement` + `MedicalWebPage`
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "MedicalWebPage",
  "inLanguage": "sv-SE",
  "about": {
    "@type": "DietarySupplement",
    "name": "Magnesium",
    "alternateName": "Magnesiumtillskott",
    "activeIngredient": "Magnesium",
    "recommendedIntake": "300–400 mg per dag för vuxna",
    "mechanismOfAction": "Magnesium är en kofaktor i över 300 enzymatiska reaktioner, inklusive energiomsättning och muskelfunktion."
  },
  "lastReviewed": "2025-01-01",
  "reviewedBy": { "@type": "Organization", "name": "SupplementScanner" }
}
</script>
```
*(This is the template to roll out across all 70 encyclopedia pages — highest AEO leverage on the site.)*

---

## 4. Prioritized Issue List

Ranked by **business impact (traffic × citeability) ÷ effort**.

### 🔴 P1 — Critical (do first)

| # | Issue | Current | Fix | Est. impact |
|---|-------|---------|-----|-------------|
| P1-1 | **No server-rendered content** | Empty `#root`; AI/crawlers see blank page | Implement SSR/SSG or prerendering (Next.js, Vite-SSR, or `prerender.io`/Vercel prerender) for `/`, `/encyclopedia`, all `/supplement/:slug` | **Foundational.** Unlocks all indexing + AI citation. Potential 5–10× organic surface area |
| P1-2 | **`lang="en"` on Swedish site** | `<html lang="en">` | `<html lang="sv">` + hreflang `sv-SE` | High — corrects language targeting in google.se; minutes of effort |
| P1-3 | **No structured data** | Zero JSON-LD | Add Organization + WebSite + FAQPage (home) and DietarySupplement/MedicalWebPage (detail pages) | High — FAQ rich results + dramatically higher AI citation rate |

### 🟠 P2 — High

| # | Issue | Current | Fix | Est. impact |
|---|-------|---------|-----|-------------|
| P2-1 | **English + stale title/description** | "30+", English | Swedish, keyword-led, accurate "70+" (see §1.1/1.2) | Medium-high — CTR + relevance in SE SERPs |
| P2-2 | **No Open Graph / Twitter tags** | Absent | Add full OG + Twitter block (§1.5) + 1200×630 image | Medium — social CTR & referral traffic |
| P2-3 | **No canonical** | Absent | Self-referencing canonical per route | Medium — prevents duplicate/UTM dilution |
| P2-4 | **No citeable opening paragraph** | No body text | Definitional "[X] är …" first sentence + FAQ section (§2) | Medium-high — direct AEO win |

### 🟡 P3 — Medium / polish

| # | Issue | Current | Fix | Est. impact |
|---|-------|---------|-----|-------------|
| P3-1 | Title under-uses character budget | 35 chars | Expand to ~55–60 with keyword + USP | Low-medium |
| P3-2 | No H1/H2 hierarchy in markup | None visible | Implement structured headings (§1.6) | Medium (post-SSR) |
| P3-3 | No breadcrumb schema | Absent | Add `BreadcrumbList` on detail pages | Low-medium |
| P3-4 | Core Web Vitals risk | Single JS bundle, blocking font CSS | `preconnect` fonts, `font-display: swap`, code-split routes | Low-medium |

---

## 5. Swedish Market Notes

- **Keyword targets:** "kosttillskott", "skanna kosttillskott", "vad innehåller mitt kosttillskott", "magnesium dosering", "omega-3 effekt". Map each encyclopedia page to a Swedish head term.
- **Regulatory language:** Health claims for supplements in Sweden/EU are governed by **Livsmedelsverket** and EFSA-approved claims. Avoid disease-treatment claims; frame as "stödjer", "bidrar till" in line with approved EFSA wording. This *also* improves E-E-A-T/trust signals.
- **E-E-A-T:** Add author/reviewer attribution, `lastReviewed` dates, and references to studies on each supplement page — essential for YMYL health content to rank and to be trusted by AI engines.

---

## 6. Recommended Execution Order

1. **Ship prerendering/SSR** (P1-1) — nothing else matters until crawlers see content.
2. Fix `lang`, add canonical, OG/Twitter, Swedish title/description (P1-2, P2-1/2/3) — same deploy.
3. Inject JSON-LD: Organization/WebSite/FAQ on home (P1-3).
4. Roll out `DietarySupplement`/`MedicalWebPage` template across all 70 pages + citeable opening paragraphs (P2-4).
5. Headings, breadcrumbs, CWV polish (P3).

**Single biggest lever:** P1-1. Fixing rendering converts a site that is currently near-invisible to AI answer engines into 70+ citeable, structured supplement entities.
