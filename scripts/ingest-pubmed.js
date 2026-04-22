/**
 * PubMed ingestion script
 * Fetches abstracts from NCBI E-utilities, embeds them with OpenAI, upserts into Supabase studies table.
 *
 * Usage:
 *   node scripts/ingest-pubmed.js
 *   node scripts/ingest-pubmed.js --slug creatine-monohydrate   # single supplement
 *   node scripts/ingest-pubmed.js --dry-run                     # fetch & log, no DB writes
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

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
    const studyType   = pubTypes.length ? inferStudyTypeFromPubTypes(pubTypes) : inferStudyType(title + ' ' + abstract);

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

// Primary: use PubMed's own PublicationType tags — much more reliable than text matching
function inferStudyTypeFromPubTypes(pubTypes) {
  if (pubTypes.some(t => t.includes('meta-analysis') || t.includes('systematic review'))) return 'meta-analysis';
  if (pubTypes.some(t => t.includes('randomized controlled trial') || t.includes('controlled clinical trial'))) return 'rct';
  if (pubTypes.some(t => t.includes('clinical trial'))) return 'rct';
  if (pubTypes.some(t => t.includes('observational') || t.includes('cohort'))) return 'observational';
  return 'other';
}

// Fallback: text inference for articles missing PublicationType
function inferStudyType(text) {
  const t = text.toLowerCase();
  if (t.includes('meta-analysis') || t.includes('systematic review')) return 'meta-analysis';
  if (t.includes('randomized') || t.includes('double-blind') || t.includes('rct')) return 'rct';
  if (t.includes('animal') || t.includes('rat ') || t.includes('mice')) return 'animal';
  if (t.includes('observational') || t.includes('cohort') || t.includes('cross-sectional')) return 'observational';
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

// ── Main ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const slugArg = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : null;

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
  process.stdout.write(` ${articles.length} abstracts parsed. Embedding...`);
  await sleep(DELAY_MS);

  if (!articles.length) {
    console.log(' nothing to insert.');
    continue;
  }

  // Embed in batches
  const allEmbeddings = [];
  for (let i = 0; i < articles.length; i += EMBED_BATCH_SIZE) {
    const batch = articles.slice(i, i + EMBED_BATCH_SIZE);
    const embeddings = await embedBatch(batch);
    allEmbeddings.push(...embeddings);
  }

  const rows = articles.map((a, i) => ({
    ...a,
    embedding: allEmbeddings[i],
    supplements: [slug],
  }));

  if (dryRun) {
    console.log(`\n  [DRY RUN] Would upsert ${rows.length} rows. Sample PMID: ${rows[0]?.pmid}`);
  } else {
    await upsertStudies(rows);
    console.log(` ✓ upserted ${rows.length} rows.`);
    totalInserted += rows.length;
  }

  await sleep(DELAY_MS);
}

console.log(`\nDone. Total rows upserted: ${totalInserted}`);
