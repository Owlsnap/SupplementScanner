// PubMed RAG core shared by server.js and scripts/eval-rag.js: retrieval, grounding
// guardrails and the free/premium deep-dive generators. Nothing here starts a server.
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Lazy clients (env vars are loaded by the caller via dotenv before first use)
let _openai = null;
let _db = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}
function getSupabaseService() {
  if (!_db) _db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  return _db;
}

// Slug → display name map (avoids importing .ts files in Node)
const SLUG_TO_NAME = {
  'creatine-monohydrate': 'Creatine Monohydrate',
  'caffeine': 'Caffeine',
  'beta-alanine': 'Beta-Alanine',
  'citrulline-malate': 'Citrulline Malate',
  'betaine-anhydrous': 'Betaine Anhydrous',
  'hmb': 'HMB (Beta-Hydroxy Beta-Methylbutyrate)',
  'sodium-bicarbonate': 'Sodium Bicarbonate',
  'magnesium-glycinate': 'Magnesium Glycinate',
  'melatonin': 'Melatonin',
  'l-theanine': 'L-Theanine',
  'ashwagandha': 'Ashwagandha (KSM-66)',
  'glycine': 'Glycine',
  'lions-mane': "Lion's Mane Mushroom",
  'bacopa-monnieri': 'Bacopa Monnieri',
  'alpha-gpc': 'Alpha-GPC',
  'rhodiola-rosea': 'Rhodiola Rosea',
  'panax-ginseng': 'Panax Ginseng',
  'phosphatidylserine': 'Phosphatidylserine',
  'tart-cherry': 'Tart Cherry Extract',
  'omega-3': 'Omega-3 (EPA/DHA)',
  'collagen-peptides': 'Collagen Peptides',
  'curcumin': 'Curcumin (with Piperine)',
  'glutamine': 'L-Glutamine',
  'vitamin-d3-k2': 'Vitamin D3 + K2',
  'zinc-bisglycinate': 'Zinc Bisglycinate',
  'magnesium-malate': 'Magnesium Malate',
  'probiotics': 'Probiotics (Multi-strain)',
  'vitamin-c': 'Vitamin C (Ascorbic Acid)',
  'berberine': 'Berberine',
  'coq10': 'CoQ10 (Ubiquinol)',
  // added to match the 100-supplement encyclopedia
  'taurine': 'Taurine',
  '5-htp': '5-HTP',
  'valerian-root': 'Valerian Root',
  'alcar': 'Acetyl-L-Carnitine (ALCAR)',
  'citicoline': 'Citicoline (CDP-Choline)',
  'ginkgo-biloba': 'Ginkgo Biloba',
  'msm': 'MSM (Methylsulfonylmethane)',
  'nac': 'NAC (N-Acetyl Cysteine)',
  'spirulina': 'Spirulina',
  'nmn': 'NMN (Nicotinamide Mononucleotide)',
  'quercetin': 'Quercetin',
  'vitamin-b12': 'Vitamin B12 (Methylcobalamin)',
  'resveratrol': 'Resveratrol',
  'selenium': 'Selenium',
  'bcaas': 'BCAAs (Branched-Chain Amino Acids)',
  'eaas': 'EAAs (Essential Amino Acids)',
  'electrolytes': 'Electrolyte Complex',
  'beetroot-extract': 'Beetroot Extract',
  'l-carnitine': 'L-Carnitine (L-Tartrate)',
  'gaba': 'GABA',
  'myo-inositol': 'Myo-Inositol',
  'magnesium-l-threonate': 'Magnesium L-Threonate',
  'mucuna-pruriens': 'Mucuna Pruriens',
  'glucosamine': 'Glucosamine',
  'chondroitin': 'Chondroitin Sulfate',
  'hyaluronic-acid': 'Hyaluronic Acid',
  'iron': 'Iron (Bisglycinate)',
  'folate': 'Folate (Vitamin B9)',
  'biotin': 'Biotin (Vitamin B7)',
  'milk-thistle': 'Milk Thistle (Silymarin)',
  'elderberry': 'Elderberry Extract',
  'tongkat-ali': 'Tongkat Ali',
  'maca-root': 'Maca Root',
  'vitamin-a': 'Vitamin A (Retinol)',
  'vitamin-e': 'Vitamin E (Tocopherol)',
  'astaxanthin': 'Astaxanthin',
  'iodine': 'Iodine',
  'chromium': 'Chromium Picolinate',
  'saw-palmetto': 'Saw Palmetto',
  'lutein-zeaxanthin': 'Lutein & Zeaxanthin',
  'whey-protein': 'Whey Protein',
  'l-arginine': 'L-Arginine',
  'yohimbine': 'Yohimbine',
  'kava': 'Kava',
  'passionflower': 'Passionflower',
  'holy-basil': 'Holy Basil (Tulsi)',
  'l-tyrosine': 'L-Tyrosine',
  'pqq': 'PQQ (Pyrroloquinoline Quinone)',
  'nadh': 'NADH',
  'cla': 'CLA (Conjugated Linoleic Acid)',
  'colostrum': 'Bovine Colostrum',
  'forskolin': 'Forskolin',
  'shilajit': 'Shilajit',
  'vitamin-d3': 'Vitamin D3 (Cholecalciferol)',
  'vitamin-k2': 'Vitamin K2 (MK-7)',
  'multivitamin': 'Multivitamin',
  'calcium': 'Calcium (Citrate)',
  'potassium': 'Potassium',
  'vitamin-b6': 'Vitamin B6 (Pyridoxine)',
  'niacin': 'Niacin (Vitamin B3)',
  'thiamine': 'Thiamine (Vitamin B1)',
  'riboflavin': 'Riboflavin (Vitamin B2)',
  'pantothenic-acid': 'Pantothenic Acid (Vitamin B5)',
  'copper': 'Copper (Glycinate)',
  'manganese': 'Manganese',
  'boron': 'Boron',
  'fish-oil': 'Fish Oil',
  'beta-glucan': 'Beta-Glucan',
  'dhea': 'DHEA',
  'ubiquinol': 'Ubiquinol (Reduced CoQ10)',
};

// Slug → typical retail dose (used to ground dosage_gap comparison in the RAG prompt)
const SLUG_TO_TYPICAL_DOSE = {
  'creatine-monohydrate': '3–5g daily',
  'caffeine': '150–400mg pre-workout',
  'beta-alanine': '3.2–6.4g daily',
  'citrulline-malate': '6–8g 60 min pre-workout',
  'betaine-anhydrous': '2.5g twice daily',
  'hmb': '3g daily (split doses)',
  'sodium-bicarbonate': '200–300mg per kg bodyweight',
  'taurine': '1–3g daily',
  'magnesium-glycinate': '200–400mg elemental Mg before bed',
  'melatonin': '0.5–3mg 30–60 min before bed',
  'l-theanine': '100–200mg before bed',
  'ashwagandha': '300–600mg KSM-66 daily',
  'glycine': '3g 30–60 min before bed',
  '5-htp': '50–200mg 30–45 min before bed',
  'valerian-root': '300–600mg standardized extract 30–60 min before bed',
  'lions-mane': '500mg–2g fruiting body extract daily',
  'bacopa-monnieri': '300–450mg standardized extract daily',
  'alpha-gpc': '300–600mg daily',
  'rhodiola-rosea': '200–600mg 3% rosavins / 1% salidroside',
  'panax-ginseng': '200–400mg standardized extract daily',
  'phosphatidylserine': '100–300mg daily with a meal',
  'alcar': '500–2000mg daily, preferably morning or pre-workout',
  'citicoline': '250–500mg daily',
  'ginkgo-biloba': '120–240mg standardized extract daily (24% flavonoids / 6% terpenes)',
  'tart-cherry': '480mg extract or 240–480ml juice twice daily',
  'omega-3': '1–3g EPA+DHA daily with a meal',
  'collagen-peptides': '10–15g daily, ideally with Vitamin C',
  'curcumin': '500–1000mg daily with piperine or fat',
  'glutamine': '5–10g daily (or up to 20g in clinical settings)',
  'msm': '1.5–3g daily',
  'vitamin-d3-k2': '2000–5000 IU D3 + 100–200mcg K2 (MK-7) daily',
  'zinc-bisglycinate': '15–30mg elemental zinc daily',
  'magnesium-malate': '200–400mg elemental Mg daily',
  'probiotics': '10–50 billion CFU daily',
  'vitamin-c': '250–1000mg daily (split doses)',
  'berberine': '500mg 2–3× daily with meals',
  'coq10': '100–300mg ubiquinol daily with a meal',
  'nac': '600–1800mg daily',
  'spirulina': '1–3g daily (up to 8–10g in more therapeutic protocols)',
  'nmn': '250–500mg daily, morning',
  'quercetin': '500–1000mg daily with a meal and Vitamin C',
  'vitamin-b12': '500–1000mcg daily (sublingual for fastest absorption)',
  'resveratrol': '100–500mg daily with a meal',
  'selenium': '100–200mcg daily',
  // added to match the 100-supplement encyclopedia (from en typicalDose)
  'bcaas': '5–10g intra-workout or post-workout',
  'eaas': '10–15g intra- or post-workout',
  'electrolytes': '500–1000mg sodium + 200–400mg potassium per hour of exercise',
  'beetroot-extract': '400–600mg nitrate (≈ 500ml beetroot juice) 2–3 hours pre-exercise',
  'l-carnitine': '1–3g daily, ideally with a carbohydrate-containing meal',
  'gaba': '100–500mg, 30–60 minutes before bed',
  'myo-inositol': '2–4g before bed; 2–4g twice daily for PCOS/hormonal goals',
  'magnesium-l-threonate': '1.5–2g elemental magnesium (≈ 144mg elemental) daily, split morning and evening',
  'mucuna-pruriens': '300–500mg of standardised extract (15–40% L-DOPA) daily',
  'glucosamine': '1500mg glucosamine sulfate daily',
  'chondroitin': '800–1200mg daily',
  'hyaluronic-acid': '80–200mg daily',
  'iron': '18–45mg elemental iron daily (therapeutic: 100–200mg under medical supervision)',
  'folate': '400–800mcg daily (800mcg–1mg for pregnancy or MTHFR variants)',
  'biotin': '30–100mcg daily (adequate intake); 1000–5000mcg for hair/nail goals',
  'milk-thistle': '140mg silymarin (standardised to 70–80%) two to three times daily',
  'elderberry': '600–900mg elderberry extract daily at symptom onset; 150–300mg for prevention',
  'tongkat-ali': '200–400mg standardised extract (LJ100® or equivalent) daily',
  'maca-root': '1.5–3g of gelatinised maca powder daily',
  'vitamin-a': '700–900mcg RAE (2300–3000 IU) daily; do not exceed 3000mcg RAE (10,000 IU) from retinol',
  'vitamin-e': '15mg (22 IU natural, 33 IU synthetic) daily; do not exceed 1000mg (1500 IU)',
  'astaxanthin': '6–12mg daily with a fat-containing meal',
  'iodine': '150mcg daily (RDA); 220mcg during pregnancy; do not routinely exceed 1100mcg',
  'chromium': '200–1000mcg chromium picolinate daily with meals',
  'saw-palmetto': '320mg of standardised liposterolic extract daily',
  'lutein-zeaxanthin': '10mg lutein + 2mg zeaxanthin daily',
  'whey-protein': '20–40g per serving, 1–2× daily',
  'l-arginine': '3–6g daily',
  'yohimbine': '0.2mg/kg bodyweight, fasted',
  'kava': '70–250mg kavalactones daily',
  'passionflower': '250–500mg extract, or 1 cup tea before bed',
  'holy-basil': '300–600mg extract daily, or 2–3 cups tea',
  'l-tyrosine': '500–2000mg, 30–60 min before a stressor',
  'pqq': '10–20mg daily',
  'nadh': '5–20mg daily, on an empty stomach',
  'cla': '3.2–6g daily, split with meals',
  'colostrum': '10–20g daily',
  'forskolin': '250mg of 10% forskolin extract, twice daily',
  'shilajit': '300–500mg purified resin/extract daily',
  'vitamin-d3': '1000–4000 IU daily (higher if correcting a diagnosed deficiency)',
  'vitamin-k2': '90–200mcg MK-7 daily',
  'multivitamin': '1 serving daily per label, with food',
  'calcium': '500–1000mg daily, split into doses of 500mg or less',
  'potassium': '99mg per supplement dose (regulatory cap); food sources for the bulk of intake',
  'vitamin-b6': '10–25mg daily (avoid chronic high doses)',
  'niacin': '14–16mg daily for basic RDA; 500mg+ only under medical supervision for lipid effects',
  'thiamine': '1.2–1.5mg daily (RDA); higher for correcting deficiency',
  'riboflavin': '1.1–1.3mg daily (RDA); 400mg daily specifically for migraine prevention',
  'pantothenic-acid': '5mg daily (RDA); often included at higher doses in B-complex formulas',
  'copper': '0.9mg daily (RDA); 1–2mg if offsetting high-dose zinc',
  'manganese': '1.8–2.3mg daily (RDA), often included in multivitamin/bone formulas',
  'boron': '3–6mg daily',
  'fish-oil': '1000–2000mg combined EPA+DHA daily',
  'beta-glucan': '3g daily (oat/barley for cholesterol); 250–500mg daily (yeast/mushroom for immune support)',
  'dhea': '25–50mg daily (older adults with low levels); not generally recommended under 40 without testing',
  'ubiquinol': '100–200mg daily, with a fat-containing meal',
};

// ====== FREE DEEP DIVE (PubMed-grounded teaser) ======
// The free page is a slice of the premium deep-dive: same retrieval query, same top-5
// studies, same "answer ONLY from the snippets" rules. Nothing here comes from model memory.

const FREE_DIVE_VERSION = 2;       // response format; clients check it, so only bump on shape changes
const FREE_DIVE_RETRIEVAL = 2;     // cached content from an older retrieval/classification is regenerated
const MIN_STUDIES_FOR_DIVE = 3;    // below this we skip the LLM entirely (insufficient evidence)
const FREE_DIVE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function supplementDisplayName(slug) {
  return SLUG_TO_NAME[slug] || slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Nudges ranking toward stronger study designs. Similarities between a supplement's top
// abstracts are typically within a few hundredths of each other, so on broad queries pure
// similarity favours narrative reviews over the meta-analyses they summarise.
const STUDY_QUALITY_BOOST = { 'meta-analysis': 0.06, rct: 0.04, observational: 0.01, review: 0, other: 0, animal: -0.06 };

// Embed the query and return the top-N PubMed abstracts for a supplement, ranked by
// similarity plus a study-design boost. Ranking is exact (cosine over that supplement's rows,
// ~20 each) rather than via the match_studies RPC: its ivfflat index scans a single list and
// then applies the supplement filter, which silently drops nearly every row (0-2 results for
// most supplements).
async function retrieveStudies(slug, query, count) {
  const embeddingRes = await getOpenAI().embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });
  const q = embeddingRes.data[0].embedding;

  const { data, error } = await getSupabaseService()
    .from('studies')
    .select('pmid, title, abstract, study_type, sample_size, year, funding_source, embedding')
    .contains('supplements', [slug])
    .limit(500);
  if (error) throw error;

  return (data || [])
    .map(({ embedding, ...study }) => {
      const v = typeof embedding === 'string' ? JSON.parse(embedding) : embedding;
      // OpenAI embeddings are unit length, so the dot product is the cosine similarity
      const similarity = Array.isArray(v) ? v.reduce((sum, x, i) => sum + x * q[i], 0) : -1;
      return { ...study, similarity, rank: similarity + (STUDY_QUALITY_BOOST[study.study_type] ?? 0) };
    })
    .sort((x, y) => y.rank - x.rank)
    .slice(0, count);
}

// How much human supplementation research exists on PubMed for a supplement (counts written
// by scripts/ingest-pubmed.js). Log-scaled with 100% at ~1000 combined meta-analyses + RCTs:
// caffeine ≈ 94%, beta-alanine ≈ 70%, ashwagandha ≈ 51%, lion's mane ≈ 20%. It measures the
// size of the research base, not whether that research found an effect.
function researchBaseScore({ meta_analyses, rcts }) {
  const points = (meta_analyses + rcts) / 2;
  return Math.round(100 * Math.min(1, Math.log10(1 + points) / Math.log10(501)));
}

async function getResearchBase(slug) {
  const { data, error } = await getSupabaseService()
    .from('supplement_evidence')
    .select('meta_analyses, rcts')
    .eq('slug', slug)
    .maybeSingle();
  if (error) {
    console.error(`💥 Research base lookup error for ${slug}:`, error.message);
    return null;
  }
  if (!data) return null;
  const score = researchBaseScore(data);
  const level = score >= 70 ? 'extensive' : score >= 40 ? 'moderate' : 'limited';
  return { score, level, meta_analyses: data.meta_analyses, rcts: data.rcts };
}

// Real numbers about the evidence we hold for a supplement (never model-estimated).
async function getStudyStats(slug) {
  const { data, error } = await getSupabaseService()
    .from('studies')
    .select('study_type, year')
    .contains('supplements', [slug])
    .limit(1000);
  if (error) throw error;

  const rows = data || [];
  const typeCounts = {};
  for (const r of rows) typeCounts[r.study_type || 'other'] = (typeCounts[r.study_type || 'other'] || 0) + 1;
  const years = rows.map(r => r.year).filter(Boolean);

  return {
    studies_analyzed: rows.length,
    type_counts: typeCounts,
    year_min: years.length ? Math.min(...years) : null,
    year_max: years.length ? Math.max(...years) : null,
  };
}

const numbersIn = (text) => (text.replace(/\[\d+\]/g, ' ').match(/\d+(?:[.,]\d+)?/g) || []).map(n => n.replace(',', '.'));

// Keep only citation indexes that point at a real retrieved snippet.
function validCites(cites, max) {
  return [...new Set((Array.isArray(cites) ? cites : []).map(Number))].filter(n => Number.isInteger(n) && n >= 1 && n <= max);
}

// Code-level guardrail on top of the prompt: a finding survives only if it cites a retrieved
// study and every number it states actually appears in a cited abstract.
function keepGroundedFindings(findings, studies) {
  const kept = [];
  for (const f of Array.isArray(findings) ? findings : []) {
    const text = typeof f?.text === 'string' ? f.text.trim() : '';
    const cites = validCites(f?.cites, studies.length);
    if (!text || !cites.length) continue;

    const source = cites.map(n => `${studies[n - 1].title} ${studies[n - 1].abstract}`).join(' ').replace(/(\d),(\d)/g, '$1.$2');
    const sourceNumbers = new Set(source.match(/\d+(?:\.\d+)?/g) || []);
    if (!numbersIn(text).every(n => sourceNumbers.has(n))) continue;

    // Citations are rendered from the structured `citations` list, so drop inline [N] markers from the text
    kept.push({ text: text.replace(/\s*\[\d+\]/g, '').trim(), citations: cites });
  }
  return kept;
}

async function generateFreeDive(slug) {
  const name = supplementDisplayName(slug);
  // Same query as the premium open call so the free page is literally a slice of the full report.
  const query = `${name} supplementation efficacy dosage mechanisms`;

  const [studies, stats] = await Promise.all([retrieveStudies(slug, query, 5), getStudyStats(slug)]);

  const citations = studies.map((s, i) => ({
    index: i + 1,
    pmid: s.pmid,
    title: s.title,
    year: s.year,
    study_type: s.study_type,
    sample_size: s.sample_size,
    url: `https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/`,
  }));

  const base = { version: FREE_DIVE_VERSION, retrieval: FREE_DIVE_RETRIEVAL, stats, citations, summary: '', findings: [], insufficient_evidence: false };

  if (studies.length < MIN_STUDIES_FOR_DIVE) {
    console.log(`⚠️ Only ${studies.length} studies for ${slug} — skipping generation`);
    return { ...base, insufficient_evidence: true };
  }

  const snippets = studies.map((s, i) => {
    const meta = [s.study_type, s.sample_size ? `n=${s.sample_size}` : null, s.year].filter(Boolean).join(', ');
    return `[${i + 1}] PMID:${s.pmid} (${meta})\n${s.title}\n${s.abstract}`;
  }).join('\n\n---\n\n');

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a precise clinical nutrition analyst. Answer using ONLY the provided study snippets. Do not use any outside knowledge.

Rules:
- Cite every factual claim with [N] referencing the snippet number.
- Only state numbers (doses, durations, sample sizes, percentages) that appear verbatim in the cited snippet.
- If the snippets don't support a claim, leave it out. Never fill gaps from general knowledge.
- Always say who or what was studied (e.g. healthy adults, patients, mice, cells). Never present animal or in-vitro results as effects in humans.
- Be exact, not creative. Do not give medical advice or claim to treat any condition.

STUDY SNIPPETS:
${snippets}`,
      },
      {
        role: 'user',
        content: `Write a short teaser for ${name} for a public encyclopedia page. Respond with a JSON object with exactly these fields:
{
  "summary": "2-3 sentences on what the studies found, with [N] inline citations",
  "findings": [
    { "text": "One specific, interesting finding stated in one sentence, with a [N] citation", "cites": [N] }
  ]
}
Provide 3-4 findings. Prefer concrete, surprising or practically useful results (effect sizes, doses used, populations, notable limitations) over generic statements.`,
      },
    ],
  });

  const parsed = JSON.parse(completion.choices[0].message.content);

  const summaryText = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
  const summaryCites = [...summaryText.matchAll(/\[(\d+)\]/g)].map(m => Number(m[1]));
  const summarySource = studies.map(s => `${s.title} ${s.abstract}`).join(' ').replace(/(\d),(\d)/g, '$1.$2');
  const summarySourceNumbers = new Set(summarySource.match(/\d+(?:\.\d+)?/g) || []);
  const summaryOk =
    summaryText &&
    summaryCites.length > 0 &&
    summaryCites.every(n => n >= 1 && n <= studies.length) &&
    numbersIn(summaryText).every(n => summarySourceNumbers.has(n));

  const result = {
    ...base,
    summary: summaryOk ? summaryText : '',
    findings: keepGroundedFindings(parsed.findings, studies),
  };

  console.log(`✅ Free deep dive generated for: ${slug} (${result.findings.length} findings, summary ${summaryOk ? 'kept' : 'dropped'})`);
  return result;
}

// ====== PREMIUM DEEP DIVE (full RAG report) ======

// Cached premium dives without this version are regenerated
// (v2: quality-boosted retrieval, v3: code-level grounding of every section)
const PREMIUM_DIVE_VERSION = 3;

// Every number that appears in the given studies' titles and abstracts ("1,000" → "1.000").
function sourceNumbersOf(studies) {
  const source = studies.map(s => `${s.title} ${s.abstract}`).join(' ').replace(/(\d),(\d)/g, '$1.$2');
  return new Set(source.match(/\d+(?:\.\d+)?/g) || []);
}

// A sentence or list item is grounded when every [N] points at a retrieved study and every number
// it states appears in a study it cites. Uncited text is grounded only if it states no numbers,
// unless `uncitedSources` is given (used for limitations and dose ranges, which the model often
// writes about the retrieved set as a whole).
function isGrounded(text, studies, { requireCite = false, uncitedSources = null } = {}) {
  const raw = [...text.matchAll(/\[(\d+)\]/g)].map(m => Number(m[1]));
  const cites = validCites(raw, studies.length);
  if (cites.length !== new Set(raw).size) return false; // cites a snippet that doesn't exist
  if (requireCite && !cites.length) return false;

  const numbers = numbersIn(text);
  if (!numbers.length) return true;
  const allowed = cites.length ? sourceNumbersOf(cites.map(n => studies[n - 1])) : uncitedSources;
  return !!allowed && numbers.every(n => allowed.has(n));
}

// The premium summary is several sentences long, so instead of discarding all of it over one
// bad number (as the free teaser does) only the sentences that fail the check are dropped.
function keepGroundedSentences(text, studies) {
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(s => s.trim());
  const kept = sentences.filter(s => isGrounded(s, studies));
  return { text: kept.join(' '), dropped: sentences.length - kept.length };
}

function partitionGrounded(items, studies, opts) {
  const strings = (Array.isArray(items) ? items : []).filter(x => typeof x === 'string' && x.trim());
  const kept = strings.filter(x => isGrounded(x, studies, opts));
  return { kept, dropped: strings.length - kept.length };
}

// Open call (no question) or an asked question, answered only from the top-5 retrieved abstracts.
// Every section passes a code-level grounding check before it is returned; `grounding` reports
// how much was dropped so it can be logged and tracked by scripts/eval-rag.js.
async function generatePremiumDive(slug, question) {
  const name = supplementDisplayName(slug);
  const query = question ? `${name}: ${question}` : `${name} supplementation efficacy dosage mechanisms`;

  // 1-2. Retrieve the top 5 most relevant studies for the query
  const studies = await retrieveStudies(slug, query, 5);

  // 3. Build grounded prompt with study snippets
  const snippets = studies.map((s, i) => {
    const meta = [
      s.study_type,
      s.sample_size ? `n=${s.sample_size}` : null,
      s.year,
      s.funding_source ? `funded by ${s.funding_source}` : null,
    ].filter(Boolean).join(', ');
    return `[${i + 1}] PMID:${s.pmid} (${meta})\n${s.title}\n${s.abstract}`;
  }).join('\n\n---\n\n');

  const userQuery = question || `What does the clinical evidence say about ${name}? Cover efficacy, dosage, and any important caveats.`;
  const typicalDose = SLUG_TO_TYPICAL_DOSE[slug] || null;

  const systemPrompt = `You are a precise clinical nutrition analyst. Answer using ONLY the provided study snippets. Do not use any outside knowledge.

Rules:
- Cite every factual claim with [N] referencing the snippet number.
- Only state numbers (doses, durations, sample sizes, percentages) that appear verbatim in the cited snippet.
- If information is not in the snippets, say "The available studies don't address this."
- Be exact, not creative. Temperature is 0.
${typicalDose ? `\nKNOWN RETAIL DOSE: The typical retail dose for ${name} is ${typicalDose}.\n` : ''}
STUDY SNIPPETS:
${snippets || 'No studies found for this supplement.'}`;

  const dosageGapInstruction = typicalDose
    ? `"dosage_gap": "Compare the dose(s) used in the study snippets to the known typical retail dose of ${typicalDose}. One sentence, e.g. 'Studies used Xg/day vs the typical retail dose of ${typicalDose}.' If no specific doses are mentioned in the snippets, return null."`
    : '"dosage_gap": "One sentence describing the dose range used across these studies, or null if no doses are mentioned in the snippets"';

  // 4. Generate grounded structured response (temp=0.0)
  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `${userQuery}

Respond with a JSON object with exactly these fields:
{
  "summary": "Main evidence-based answer with [N] inline citations",
  "the_catch": ["array of study limitations: small samples, industry funding, short duration, animal-only evidence, etc."],
  ${dosageGapInstruction},
  "interesting_findings": ["2–4 noteworthy findings from the snippets that are NOT covered in the summary above — e.g. unexpected secondary outcomes, surprising subgroup results, counterintuitive mechanistic details, or novel comparisons. Each item is one sentence with a [N] citation. Return an empty array if nothing stands out beyond what is in the summary."]
}`,
      },
    ],
  });

  const parsed = JSON.parse(completion.choices[0].message.content);

  // 5. Code-level guardrail on top of the prompt
  const allNumbers = sourceNumbersOf(studies);
  const summary = keepGroundedSentences(typeof parsed.summary === 'string' ? parsed.summary.trim() : '', studies);
  const findings = partitionGrounded(parsed.interesting_findings, studies, { requireCite: true });
  const theCatch = partitionGrounded(parsed.the_catch, studies, { uncitedSources: allNumbers });
  // The dose comparison may quote the retail dose, which isn't in any abstract
  const doseNumbers = new Set([...allNumbers, ...numbersIn(typicalDose || '')]);
  const dosageGapRaw = typeof parsed.dosage_gap === 'string' ? parsed.dosage_gap.trim() : '';
  const dosageGapOk = !dosageGapRaw || isGrounded(dosageGapRaw, studies, { uncitedSources: doseNumbers });

  // 6. Build citation list from retrieved studies
  const citations = studies.map((s, i) => ({
    index: i + 1,
    pmid: s.pmid,
    title: s.title,
    year: s.year,
    study_type: s.study_type,
    sample_size: s.sample_size,
    funding_source: s.funding_source,
    url: `https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/`,
  }));

  const grounding = {
    summary_sentences_dropped: summary.dropped,
    findings_dropped: findings.dropped,
    catch_dropped: theCatch.dropped,
    dosage_gap_dropped: !dosageGapOk,
  };
  const droppedCount = summary.dropped + findings.dropped + theCatch.dropped + (dosageGapOk ? 0 : 1);
  if (droppedCount) console.log(`🛡️ Premium deep dive for ${slug}: grounding check dropped ${droppedCount} item(s)`, grounding);

  return {
    version: PREMIUM_DIVE_VERSION,
    slug,
    supplement: name,
    question: userQuery,
    summary: summary.text,
    the_catch: theCatch.kept,
    dosage_gap: dosageGapOk && dosageGapRaw ? dosageGapRaw : null,
    interesting_findings: findings.kept,
    citations,
    studies_found: citations.length,
    grounding,
  };
}

export {
  SLUG_TO_NAME,
  FREE_DIVE_VERSION,
  FREE_DIVE_RETRIEVAL,
  FREE_DIVE_TTL_MS,
  MIN_STUDIES_FOR_DIVE,
  PREMIUM_DIVE_VERSION,
  supplementDisplayName,
  retrieveStudies,
  researchBaseScore,
  getResearchBase,
  getStudyStats,
  numbersIn,
  validCites,
  isGrounded,
  keepGroundedFindings,
  keepGroundedSentences,
  generateFreeDive,
  generatePremiumDive,
};
