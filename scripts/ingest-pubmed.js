/**
 * PubMed ingestion script
 * Fetches abstracts from NCBI E-utilities, embeds them with OpenAI, upserts into Supabase studies table.
 *
 * Usage:
 *   node scripts/ingest-pubmed.js
 *   node scripts/ingest-pubmed.js --slug creatine-monohydrate   # single supplement
 *   node scripts/ingest-pubmed.js --dry-run                     # fetch & log, no DB writes
 *   node scripts/ingest-pubmed.js --reclassify                  # re-derive study_type for every stored study
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { SUBSTANCE_TERMS, SUPPLEMENTATION_FILTER, PUBTYPE_FILTERS } from './evidence-terms.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  console.error('Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Map slug → PubMed search term (slug alone is often good enough; override where needed)
const SUPPLEMENT_SEARCH_TERMS = {
  'creatine-monohydrate':  'creatine monohydrate supplementation',
  'caffeine':              'caffeine exercise performance',
  'beta-alanine':          'beta-alanine supplementation',
  'citrulline-malate':     'citrulline malate supplementation',
  'betaine-anhydrous':     'betaine anhydrous supplementation',
  'hmb':                   'HMB beta-hydroxy-beta-methylbutyrate',
  'sodium-bicarbonate':    'sodium bicarbonate exercise buffering',
  'magnesium-glycinate':   'magnesium glycinate supplementation',
  'melatonin':             'melatonin sleep supplementation',
  'l-theanine':            'L-theanine supplementation',
  'ashwagandha':           'ashwagandha withania somnifera',
  'glycine':               'glycine supplementation sleep',
  'lions-mane':            'lion\'s mane hericium erinaceus',
  'bacopa-monnieri':       'bacopa monnieri cognitive',
  'alpha-gpc':             'alpha-GPC choline cognitive',
  'rhodiola-rosea':        'rhodiola rosea adaptogen',
  'panax-ginseng':         'panax ginseng supplementation',
  'phosphatidylserine':    'phosphatidylserine cognitive',
  'tart-cherry':           'tart cherry juice recovery',
  'omega-3':               'omega-3 fish oil supplementation',
  'collagen-peptides':     'collagen peptides supplementation',
  'curcumin':              'curcumin bioavailability supplementation',
  'glutamine':             'glutamine supplementation exercise',
  'vitamin-d3-k2':         'vitamin D3 K2 supplementation',
  'zinc-bisglycinate':     'zinc bisglycinate supplementation',
  'magnesium-malate':      'magnesium malate supplementation',
  'probiotics':            'probiotics gut health supplementation',
  'vitamin-c':             'vitamin C ascorbic acid supplementation',
  'berberine':             'berberine supplementation metabolic',
  'coq10':                 'coenzyme Q10 CoQ10 supplementation',
  'taurine':               'taurine supplementation exercise performance',
  '5-htp':                 '5-hydroxytryptophan 5-HTP supplementation sleep mood',
  'valerian-root':         'valerian root Valeriana officinalis sleep supplementation',
  'alcar':                 'acetyl-L-carnitine ALCAR supplementation cognitive',
  'citicoline':            'citicoline CDP-choline supplementation cognitive',
  'ginkgo-biloba':         'ginkgo biloba EGb761 cognitive supplementation',
  'nac':                   'N-acetylcysteine NAC glutathione supplementation',
  'msm':                   'methylsulfonylmethane MSM joint supplementation',
  'spirulina':             'spirulina supplementation health anti-inflammatory',
  'nmn':                   'nicotinamide mononucleotide NMN NAD supplementation',
  'quercetin':             'quercetin supplementation anti-inflammatory immune',
  'vitamin-b12':           'vitamin B12 cobalamin methylcobalamin supplementation',
  'resveratrol':           'resveratrol supplementation cardiovascular longevity',
  'selenium':              'selenium supplementation thyroid health selenomethionine',
  'whey-protein':          'whey protein supplementation muscle protein synthesis',
  'l-arginine':            'L-arginine supplementation nitric oxide cardiovascular',
  'yohimbine':             'yohimbine',
  'kava':                  'kava kavalactones anxiety supplementation',
  'passionflower':         'passiflora incarnata passionflower anxiety supplementation',
  'holy-basil':            'ocimum sanctum tulsi',
  'l-tyrosine':            'L-tyrosine supplementation cognitive stress performance',
  'pqq':                   'pyrroloquinoline quinone PQQ mitochondrial biogenesis',
  'nadh':                  'NADH supplementation fatigue nicotinamide adenine dinucleotide',
  'cla':                   'conjugated linoleic acid CLA supplementation body fat',
  'colostrum':             'bovine colostrum supplementation gut immune athletes',
  'forskolin':             'forskolin coleus forskohlii supplementation body composition',
  'shilajit':              'shilajit',
  'vitamin-d3':            'vitamin D3 cholecalciferol supplementation deficiency',
  'vitamin-k2':            'vitamin K2 menaquinone MK-7 supplementation',
  'multivitamin':          'multivitamin supplementation micronutrient health outcomes',
  'calcium':               'calcium supplementation bone density',
  'potassium':             'potassium supplementation blood pressure',
  'vitamin-b6':            'vitamin B6 pyridoxine supplementation',
  'niacin':                'niacin vitamin B3 supplementation cholesterol lipid',
  'thiamine':              'thiamine vitamin B1 supplementation deficiency',
  'riboflavin':            'riboflavin vitamin B2 supplementation migraine prevention',
  'pantothenic-acid':      'pantothenic acid vitamin B5 supplementation coenzyme A',
  'copper':                'copper supplementation deficiency zinc interaction',
  'manganese':             'manganese supplementation superoxide dismutase',
  'boron':                 'boron supplementation human',
  'fish-oil':              'fish oil supplementation EPA DHA cardiovascular',
  'beta-glucan':           'beta-glucan supplementation cholesterol immune function',
  'dhea':                  'DHEA dehydroepiandrosterone supplementation aging',
  'ubiquinol':             'ubiquinol reduced coenzyme Q10 supplementation bioavailability',
  // backfill: slugs that predate the PubMed ingest
  'bcaas': 'branched-chain amino acids supplementation',
  'eaas': 'essential amino acids supplementation muscle protein synthesis',
  'electrolytes': 'electrolyte supplementation exercise hydration',
  'beetroot-extract': 'beetroot juice nitrate exercise performance',
  'l-carnitine': 'L-carnitine supplementation',
  'gaba': 'GABA supplementation oral',
  'myo-inositol': 'myo-inositol supplementation',
  'magnesium-l-threonate': 'magnesium L-threonate cognitive',
  'mucuna-pruriens': 'mucuna pruriens L-dopa',
  'glucosamine': 'glucosamine supplementation osteoarthritis',
  'chondroitin': 'chondroitin sulfate supplementation',
  'hyaluronic-acid': 'oral hyaluronic acid supplementation',
  'iron': 'iron supplementation',
  'folate': 'folate folic acid supplementation',
  'biotin': 'biotin supplementation',
  'milk-thistle': 'milk thistle silymarin',
  'elderberry': 'elderberry sambucus supplementation',
  'tongkat-ali': 'tongkat ali eurycoma longifolia',
  'maca-root': 'maca lepidium meyenii supplementation',
  'vitamin-a': 'vitamin A supplementation',
  'vitamin-e': 'vitamin E supplementation',
  'astaxanthin': 'astaxanthin supplementation',
  'iodine': 'iodine supplementation',
  'chromium': 'chromium supplementation',
  'saw-palmetto': 'saw palmetto serenoa repens',
  'lutein-zeaxanthin': 'lutein zeaxanthin supplementation',
};

const RESULTS_PER_SUPPLEMENT = 20; // abstracts fetched per supplement
const EMBED_BATCH_SIZE = 20;       // OpenAI embedding batch size
const NCBI_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const DELAY_MS = 350; // stay under NCBI's 3 req/sec unauthenticated limit

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── NCBI helpers ──────────────────────────────────────────────────────────────

async function searchPubMed(term, retmax = RESULTS_PER_SUPPLEMENT) {
  const url = `${NCBI_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(term)}&retmax=${retmax}&retmode=json&sort=relevance`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PubMed search failed: ${res.status}`);
  const json = await res.json();
  return json.esearchresult.idlist; // string[]
}

async function fetchAbstracts(pmids) {
  if (!pmids.length) return [];
  const url = `${NCBI_BASE}/efetch.fcgi?db=pubmed&id=${pmids.join(',')}&rettype=abstract&retmode=xml`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PubMed fetch failed: ${res.status}`);
  const xml = await res.text();
  return parseAbstractsXml(xml);
}

function parseAbstractsXml(xml) {
  const articles = [];
  const articleBlocks = xml.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) || [];

  for (const block of articleBlocks) {
    const pmid        = extractTag(block, 'PMID');
    const title       = extractTag(block, 'ArticleTitle');
    const abstract    = extractTag(block, 'AbstractText');
    const yearMatch   = block.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/);
    const year        = yearMatch ? parseInt(yearMatch[1]) : null;
    const sampleMatch = block.match(/\bn\s*=\s*(\d+)/i) || abstract?.match(/(\d+)\s+(?:participants|subjects|patients)/i);
    const sampleSize  = sampleMatch ? parseInt(sampleMatch[1]) : null;

    const funding     = block.includes('industry') || block.includes('manufacturer') ? 'industry' : null;
    const pubTypes    = [...block.matchAll(/<PublicationType[^>]*>([\s\S]*?)<\/PublicationType>/g)].map(m => m[1].toLowerCase());
    const meshTerms   = [...block.matchAll(/<DescriptorName[^>]*>([\s\S]*?)<\/DescriptorName>/g)].map(m => m[1].toLowerCase());
    const studyType   = classifyStudy(pubTypes, meshTerms, `${title || ''} ${abstract || ''}`);

    if (!pmid || !abstract) continue;

    articles.push({
      pmid,
      title:          stripXmlTags(title || ''),
      abstract:       stripXmlTags(abstract),
      year,
      sample_size:    sampleSize,
      funding_source: funding,
      study_type:     studyType,
    });
  }
  return articles;
}

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1] : null;
}

function stripXmlTags(str) {
  return str.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Every PubMed record carries at least "Journal Article", so PublicationType alone can't be the
// only signal: animal-only research is identified via MeSH (Animals without Humans), and
// records with no specific type (often recent, not yet indexed) fall back to text matching.
const OBSERVATIONAL_MESH = ['cohort studies', 'cross-sectional studies', 'case-control studies', 'prospective studies'];

function classifyStudy(pubTypes, meshTerms, text) {
  const has = (t) => pubTypes.some(p => p.includes(t));
  if (meshTerms.includes('animals') && !meshTerms.includes('humans')) return 'animal';
  if (has('meta-analysis') || has('systematic review')) return 'meta-analysis';
  if (has('randomized controlled trial') || has('clinical trial')) return 'rct';
  if (has('observational') || meshTerms.some(m => OBSERVATIONAL_MESH.includes(m))) return 'observational';
  if (has('review') || has('guideline') || has('consensus')) return 'review';
  return inferStudyTypeFromText(text);
}

function inferStudyTypeFromText(text) {
  const t = text.toLowerCase();
  if (t.includes('meta-analysis') || t.includes('systematic review')) return 'meta-analysis';
  if (t.includes('randomized') || t.includes('randomised') || t.includes('double-blind') || t.includes('placebo-controlled')) return 'rct';
  if (t.includes('observational') || t.includes('cohort') || t.includes('cross-sectional')) return 'observational';
  if (/\b(rats?|mice|murine|in vitro)\b/.test(t)) return 'animal';
  if (t.includes('review')) return 'review';
  return 'other';
}

// ── Embedding ─────────────────────────────────────────────────────────────────

async function embedBatch(articles) {
  const inputs = articles.map((a) => `${a.title}\n\n${a.abstract}`.slice(0, 8000));
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: inputs,
  });
  return res.data.map((d) => d.embedding);
}

// ── Upsert ────────────────────────────────────────────────────────────────────

async function upsertStudies(rows) {
  const { error } = await supabase
    .from('studies')
    .upsert(rows, { onConflict: 'pmid' });
  if (error) throw error;
}

// Existing rows keyed by PMID, so a study found by several supplements' searches keeps all of
// its tags (upserting `supplements: [slug]` used to overwrite them) and isn't re-embedded.
async function fetchExisting(pmids) {
  const { data, error } = await supabase
    .from('studies')
    .select('pmid, supplements')
    .in('pmid', pmids);
  if (error) throw error;
  return new Map((data || []).map(r => [r.pmid, r.supplements || []]));
}

// ── Research base (PubMed counts) ─────────────────────────────────────────────

async function countPubMed(term) {
  const url = `${NCBI_BASE}/esearch.fcgi?db=pubmed&rettype=count&retmode=json&term=${encodeURIComponent(term)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PubMed count failed: ${res.status}`);
  return Number((await res.json()).esearchresult.count);
}

async function updateEvidenceCounts(slug) {
  const substance = SUBSTANCE_TERMS[slug];
  if (!substance) {
    console.warn(`\n  ⚠ No substance term for "${slug}" in evidence-terms.js, research base not updated`);
    return null;
  }
  const base = `(${substance}) AND ${SUPPLEMENTATION_FILTER}`;
  const meta_analyses = await countPubMed(`${base} AND ${PUBTYPE_FILTERS.meta_analyses}`);
  await sleep(DELAY_MS);
  const rcts = await countPubMed(`${base} AND ${PUBTYPE_FILTERS.rcts}`);
  await sleep(DELAY_MS);

  const row = { slug, meta_analyses, rcts, pubmed_query: base, updated_at: new Date().toISOString() };
  if (!dryRun) {
    const { error } = await supabase.from('supplement_evidence').upsert(row, { onConflict: 'slug' });
    if (error) throw error;
  }
  return row;
}

// ── Reclassify ────────────────────────────────────────────────────────────────

// Re-fetches every stored study from PubMed and updates only its study_type.
async function reclassifyAll() {
  const stored = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('studies').select('pmid, study_type').range(from, from + 999);
    if (error) throw error;
    stored.push(...data);
    if (data.length < 1000) break;
  }
  console.log(`Reclassifying ${stored.length} stored studies...`);

  const current = new Map(stored.map(r => [r.pmid, r.study_type]));
  const changed = {};
  for (let i = 0; i < stored.length; i += 200) {
    const articles = await fetchAbstracts(stored.slice(i, i + 200).map(r => r.pmid));
    for (const a of articles) {
      if (a.study_type !== current.get(a.pmid)) (changed[a.study_type] ??= []).push(a.pmid);
    }
    await sleep(DELAY_MS);
  }

  for (const [type, ids] of Object.entries(changed)) {
    console.log(`  → ${type}: ${ids.length} changed`);
    if (dryRun) continue;
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await supabase.from('studies').update({ study_type: type }).in('pmid', ids.slice(i, i + 200));
      if (error) throw error;
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const slugArg = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : null;

if (args.includes('--reclassify')) {
  await reclassifyAll();
  console.log('\nDone.');
  process.exit(0);
}

const slugs = slugArg
  ? [slugArg]
  : Object.keys(SUPPLEMENT_SEARCH_TERMS);

console.log(`Ingesting ${slugs.length} supplement(s)${dryRun ? ' [DRY RUN]' : ''}...\n`);

let totalInserted = 0;

for (const slug of slugs) {
  const term = SUPPLEMENT_SEARCH_TERMS[slug];
  if (!term) {
    console.warn(`  ⚠ No search term for slug "${slug}", skipping`);
    continue;
  }

  process.stdout.write(`${slug} — searching PubMed...`);
  const pmids = await searchPubMed(term);
  process.stdout.write(` ${pmids.length} PMIDs found. Fetching abstracts...`);
  await sleep(DELAY_MS);

  const articles = await fetchAbstracts(pmids);
  process.stdout.write(` ${articles.length} abstracts parsed.`);
  await sleep(DELAY_MS);

  const evidence = await updateEvidenceCounts(slug);
  if (evidence) process.stdout.write(` Research base: ${evidence.meta_analyses} MA/SR, ${evidence.rcts} RCTs.`);

  if (!articles.length) {
    console.log(' nothing to insert.');
    continue;
  }

  const existing = await fetchExisting(articles.map(a => a.pmid));
  const fresh = articles.filter(a => !existing.has(a.pmid));
  const known = articles.filter(a => existing.has(a.pmid));

  // Embed only studies we don't already have
  process.stdout.write(` Embedding ${fresh.length} new...`);
  const allEmbeddings = [];
  for (let i = 0; i < fresh.length; i += EMBED_BATCH_SIZE) {
    const batch = fresh.slice(i, i + EMBED_BATCH_SIZE);
    const embeddings = await embedBatch(batch);
    allEmbeddings.push(...embeddings);
  }

  // Two separate upserts so every row in a call has the same columns: supabase-js nulls out
  // columns missing from some rows, which would wipe existing embeddings.
  const freshRows = fresh.map((a, i) => ({ ...a, embedding: allEmbeddings[i], supplements: [slug] }));
  const knownRows = known.map(a => ({ ...a, supplements: [...new Set([...existing.get(a.pmid), slug])] }));

  if (dryRun) {
    console.log(`\n  [DRY RUN] Would insert ${freshRows.length} and update ${knownRows.length} rows.`);
  } else {
    if (freshRows.length) await upsertStudies(freshRows);
    if (knownRows.length) await upsertStudies(knownRows);
    console.log(` ✓ ${freshRows.length} inserted, ${knownRows.length} updated.`);
    totalInserted += freshRows.length + knownRows.length;
  }

  await sleep(DELAY_MS);
}

console.log(`\nDone. Total rows upserted: ${totalInserted}`);
