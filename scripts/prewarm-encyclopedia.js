// Pre-warms all 70 encyclopedia deep dives on Railway before launch.
// Run: node scripts/prewarm-encyclopedia.js
// Requires Node 18+ (uses native fetch).

const BASE_URL =
  process.env.API_URL ||
  'https://supplementscanner-production.up.railway.app';

const SLUGS = [
  // Performance
  'creatine-monohydrate',
  'caffeine',
  'beta-alanine',
  'citrulline-malate',
  'betaine-anhydrous',
  'hmb',
  'sodium-bicarbonate',
  'taurine',
  'bcaas',
  'eaas',
  'electrolytes',
  'beetroot-extract',
  'l-carnitine',
  // Sleep
  'magnesium-glycinate',
  'melatonin',
  'l-theanine',
  'ashwagandha',
  'glycine',
  '5-htp',
  'valerian-root',
  'gaba',
  'myo-inositol',
  // Nootropics
  'lions-mane',
  'bacopa-monnieri',
  'alpha-gpc',
  'rhodiola-rosea',
  'panax-ginseng',
  'phosphatidylserine',
  'alcar',
  'citicoline',
  'ginkgo-biloba',
  'magnesium-l-threonate',
  'mucuna-pruriens',
  // Recovery
  'tart-cherry',
  'omega-3',
  'collagen-peptides',
  'curcumin',
  'glutamine',
  'msm',
  'glucosamine',
  'chondroitin',
  'hyaluronic-acid',
  // Health
  'vitamin-d3-k2',
  'zinc-bisglycinate',
  'magnesium-malate',
  'probiotics',
  'vitamin-c',
  'berberine',
  'coq10',
  'nac',
  'spirulina',
  'nmn',
  'quercetin',
  'vitamin-b12',
  'resveratrol',
  'selenium',
  'iron',
  'folate',
  'biotin',
  'milk-thistle',
  'elderberry',
  'tongkat-ali',
  'maca-root',
  'vitamin-a',
  'vitamin-e',
  'astaxanthin',
  'iodine',
  'chromium',
  'saw-palmetto',
  'lutein-zeaxanthin',
];

const DELAY_MS = 1500; // be kind to Railway — 1.5s between requests

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function prewarm() {
  console.log(`Pre-warming ${SLUGS.length} supplements against ${BASE_URL}\n`);

  const results = { cached: 0, generated: 0, failed: 0 };
  const failed = [];

  for (let i = 0; i < SLUGS.length; i++) {
    const slug = SLUGS[i];
    const url = `${BASE_URL}/api/encyclopedia/deep-dive/${slug}`;
    const label = `[${i + 1}/${SLUGS.length}] ${slug}`;

    try {
      const start = Date.now();
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });

      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body.error) errMsg += ` — ${body.error}`;
        } catch {}
        console.error(`  FAIL  ${label} — ${errMsg}`);
        results.failed++;
        failed.push(slug);
        await sleep(DELAY_MS);
        continue;
      }

      const data = await res.json();
      const elapsed = Date.now() - start;
      const fromCache = elapsed < 800; // generated calls take several seconds

      if (fromCache) {
        console.log(`  CACHE ${label} (${elapsed}ms)`);
        results.cached++;
      } else {
        console.log(`  GEN   ${label} (${elapsed}ms)`);
        results.generated++;
      }
    } catch (err) {
      console.error(`  FAIL  ${label} — ${err.message}`);
      results.failed++;
      failed.push(slug);
    }

    if (i < SLUGS.length - 1) await sleep(DELAY_MS);
  }

  console.log('\n--- Done ---');
  console.log(`  Already cached : ${results.cached}`);
  console.log(`  Generated now  : ${results.generated}`);
  console.log(`  Failed         : ${results.failed}`);

  if (failed.length) {
    console.log(`\nFailed slugs (retry manually):\n  ${failed.join('\n  ')}`);
  }
}

prewarm().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
