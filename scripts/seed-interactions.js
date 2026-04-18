/**
 * Interactions seed script
 * Populates the interactions table with curated supplement-supplement and
 * supplement-drug interactions sourced from published literature.
 *
 * Severity tiers:
 *   danger  — known contraindication, avoid combination
 *   caution — overlapping mechanisms or additive risk, monitor
 *   synergy — complementary mechanisms, beneficial pairing
 *
 * Usage:
 *   node scripts/seed-interactions.js
 *   node scripts/seed-interactions.js --dry-run
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// substance_a / substance_b are free-text — use supplement slugs for encyclopedia
// supplements, or plain drug names (lowercase) for pharmaceutical interactions.
const INTERACTIONS = [

  // ── DANGER ────────────────────────────────────────────────────────────────

  {
    substance_a: 'omega-3',
    substance_b: 'warfarin',
    severity: 'danger',
    mechanism: 'Omega-3 fatty acids inhibit platelet aggregation and potentiate the anticoagulant effect of warfarin, increasing bleeding risk.',
    source: 'Buckley MS et al. Ann Pharmacother 2004; NIH ODS Omega-3 fact sheet',
  },
  {
    substance_a: 'curcumin',
    substance_b: 'warfarin',
    severity: 'danger',
    mechanism: 'Curcumin inhibits platelet aggregation and CYP2C9, raising warfarin plasma levels and bleeding risk.',
    source: 'Pharmacognosy Res 2012; Natural Medicines Database',
  },
  {
    substance_a: 'panax-ginseng',
    substance_b: 'warfarin',
    severity: 'danger',
    mechanism: 'Ginsenosides reduce warfarin efficacy via CYP3A4 induction, with documented case reports of decreased INR.',
    source: 'Janetzky K, Morreale AP. Am J Health Syst Pharm 1997',
  },
  {
    substance_a: 'berberine',
    substance_b: 'metformin',
    severity: 'danger',
    mechanism: 'Both lower blood glucose via AMPK activation. Combined use risks hypoglycemia; dose adjustment required.',
    source: 'Zhang Y et al. Metabolism 2008',
  },
  {
    substance_a: 'berberine',
    substance_b: 'cyclosporine',
    severity: 'danger',
    mechanism: 'Berberine inhibits CYP3A4 and P-glycoprotein, significantly raising cyclosporine plasma levels and toxicity risk.',
    source: 'Xin HW et al. Eur J Clin Pharmacol 2006',
  },
  {
    substance_a: 'ashwagandha',
    substance_b: 'thyroid medication',
    severity: 'danger',
    mechanism: 'Ashwagandha increases T3 and T4 levels; combining with levothyroxine or antithyroid drugs can cause hyper- or hypothyroid overshoot.',
    source: 'Sharma AK et al. J Int Soc Sports Nutr 2018',
  },
  {
    substance_a: 'melatonin',
    substance_b: 'fluvoxamine',
    severity: 'danger',
    mechanism: 'Fluvoxamine strongly inhibits CYP1A2, the primary melatonin-metabolising enzyme, increasing melatonin AUC up to 17-fold.',
    source: 'Härtter S et al. Clin Pharmacol Ther 2000',
  },
  {
    substance_a: 'caffeine',
    substance_b: 'maoi antidepressants',
    severity: 'danger',
    mechanism: 'MAOIs impair caffeine metabolism via CYP1A2 inhibition; high caffeine levels combined with MAOIs risk hypertensive crisis.',
    source: 'Natural Medicines Database; FDA drug interaction guidance',
  },
  {
    substance_a: 'vitamin-d3-k2',
    substance_b: 'thiazide diuretics',
    severity: 'danger',
    mechanism: 'Thiazides reduce renal calcium excretion; high-dose vitamin D3 combined with thiazides significantly increases hypercalcemia risk.',
    source: 'Crowe M et al. BMJ 1984; NIH ODS Vitamin D fact sheet',
  },
  {
    substance_a: 'alpha-gpc',
    substance_b: 'anticholinergic drugs',
    severity: 'danger',
    mechanism: 'Alpha-GPC raises acetylcholine levels; directly opposes anticholinergic medications (antihistamines, bladder drugs, tricyclics), reducing their efficacy.',
    source: 'Biological Psychiatry 1991; pharmacodynamic antagonism',
  },

  // ── CAUTION ───────────────────────────────────────────────────────────────

  {
    substance_a: 'omega-3',
    substance_b: 'curcumin',
    severity: 'caution',
    mechanism: 'Both inhibit platelet aggregation via different pathways. Individually safe; combined use at high doses may have additive anticoagulant effect.',
    source: 'Chainani-Wu N. J Altern Complement Med 2003',
  },
  {
    substance_a: 'omega-3',
    substance_b: 'vitamin-c',
    severity: 'caution',
    mechanism: 'High-dose vitamin C (>1g) may oxidise omega-3 fatty acids in the gut, reducing absorption. Take at separate times.',
    source: 'Maron DJ et al. Arterioscler Thromb Vasc Biol 2003',
  },
  {
    substance_a: 'magnesium-glycinate',
    substance_b: 'magnesium-malate',
    severity: 'caution',
    mechanism: 'Both deliver elemental magnesium. Stacking raises total daily intake; excess magnesium (>350mg supplemental) causes osmotic diarrhea.',
    source: 'NIH ODS Magnesium fact sheet',
  },
  {
    substance_a: 'zinc-bisglycinate',
    substance_b: 'magnesium-glycinate',
    severity: 'caution',
    mechanism: 'Zinc and magnesium compete for the same divalent mineral transporters. High-dose zinc (>40mg) can impair magnesium absorption and vice versa.',
    source: 'Coudray C et al. Eur J Clin Nutr 2005',
  },
  {
    substance_a: 'zinc-bisglycinate',
    substance_b: 'curcumin',
    severity: 'caution',
    mechanism: 'Curcumin chelates zinc ions, reducing bioavailability. Separate by at least 2 hours.',
    source: 'Mineo H et al. Biosci Biotechnol Biochem 2002',
  },
  {
    substance_a: 'ashwagandha',
    substance_b: 'rhodiola-rosea',
    severity: 'caution',
    mechanism: 'Both modulate cortisol and the HPA axis. Stacking two adaptogens can cause excessive cortisol suppression; start low and monitor energy and stress response.',
    source: 'Panossian A. Phytomedicine 2017',
  },
  {
    substance_a: 'panax-ginseng',
    substance_b: 'rhodiola-rosea',
    severity: 'caution',
    mechanism: 'Both are stimulating adaptogens with overlapping CNS effects. Combined use may cause overstimulation, insomnia, or irritability.',
    source: 'Panossian A, Wikman G. Phytother Res 2010',
  },
  {
    substance_a: 'melatonin',
    substance_b: 'l-theanine',
    severity: 'caution',
    mechanism: 'Both have sedative/calming effects. Combined use at full doses can cause excessive drowsiness; reduce individual doses when stacking.',
    source: 'Pharmacodynamic additive sedation — clinical observation',
  },
  {
    substance_a: 'melatonin',
    substance_b: 'glycine',
    severity: 'caution',
    mechanism: 'Glycine lowers core body temperature and promotes sleep onset via NMDA receptors. Stacking with melatonin can over-deepen sedation.',
    source: 'Bannai M et al. Sleep Biol Rhythms 2012',
  },
  {
    substance_a: 'berberine',
    substance_b: 'vitamin-d3-k2',
    severity: 'caution',
    mechanism: 'Berberine inhibits CYP3A4, which metabolises vitamin D3. Combined use may elevate vitamin D levels above intended range.',
    source: 'Pharmacokinetic interaction via CYP3A4 inhibition',
  },
  {
    substance_a: 'curcumin',
    substance_b: 'iron supplement',
    severity: 'caution',
    mechanism: 'Curcumin chelates non-haem iron in the gut, reducing absorption by up to 50%. Separate by at least 2 hours if taking iron supplements.',
    source: 'Tuntipopipat S et al. J Nutr 2006',
  },
  {
    substance_a: 'caffeine',
    substance_b: 'ashwagandha',
    severity: 'caution',
    mechanism: 'Caffeine raises cortisol acutely; ashwagandha blunts cortisol chronically. The interaction is not dangerous but may reduce ashwagandha\'s cortisol-lowering benefit if taken together.',
    source: 'Chandrasekhar K et al. Indian J Psychol Med 2012',
  },

  // ── SYNERGY ───────────────────────────────────────────────────────────────

  {
    substance_a: 'l-theanine',
    substance_b: 'caffeine',
    severity: 'synergy',
    mechanism: 'L-theanine blunts caffeine\'s anxiety and jitteriness via GABA-A modulation while preserving the cognitive boost. The classic 2:1 (theanine:caffeine) stack is one of the most replicated nootropic combinations.',
    source: 'Haskell CF et al. Biol Psychol 2008',
  },
  {
    substance_a: 'creatine-monohydrate',
    substance_b: 'beta-alanine',
    severity: 'synergy',
    mechanism: 'Creatine powers explosive 0–10 second efforts via ATP regeneration; beta-alanine buffers acid in 60–240 second efforts. Complementary, non-overlapping mechanisms cover the full anaerobic spectrum.',
    source: 'Hoffman J et al. Int J Sport Nutr Exerc Metab 2006',
  },
  {
    substance_a: 'vitamin-d3-k2',
    substance_b: 'magnesium-glycinate',
    severity: 'synergy',
    mechanism: 'Magnesium is a cofactor for the enzymes that convert vitamin D to its active form (1,25-OH2D3). Without adequate magnesium, vitamin D supplementation is less effective.',
    source: 'Uwitonze AM, Razzaque MS. J Am Osteopath Assoc 2018',
  },
  {
    substance_a: 'vitamin-d3-k2',
    substance_b: 'magnesium-malate',
    severity: 'synergy',
    mechanism: 'Same as magnesium-glycinate: magnesium activates the vitamin D hydroxylation enzymes. Either magnesium form provides this benefit.',
    source: 'Uwitonze AM, Razzaque MS. J Am Osteopath Assoc 2018',
  },
  {
    substance_a: 'curcumin',
    substance_b: 'omega-3',
    severity: 'synergy',
    mechanism: 'Curcumin inhibits COX-2 and NF-κB; omega-3s resolve inflammation via SPMs. Dual-pathway anti-inflammatory action with no harmful additive anticoagulant effect at standard doses.',
    source: 'Chainani-Wu N. J Altern Complement Med 2003',
  },
  {
    substance_a: 'alpha-gpc',
    substance_b: 'lions-mane',
    severity: 'synergy',
    mechanism: 'Alpha-GPC boosts acetylcholine availability acutely; lion\'s mane promotes NGF and long-term neurogenesis. Complementary acute + chronic cognitive mechanisms.',
    source: 'Mori K et al. Phytother Res 2009; De Jesus Moreno Moreno M. Clin Ther 2003',
  },
  {
    substance_a: 'bacopa-monnieri',
    substance_b: 'lions-mane',
    severity: 'synergy',
    mechanism: 'Bacopa enhances memory consolidation via serotonin and acetylcholine modulation; lion\'s mane supports NGF-driven neuroplasticity. Together they target memory encoding and the substrate for learning.',
    source: 'Stough C et al. Psychopharmacology 2001; Mori K et al. Phytother Res 2009',
  },
  {
    substance_a: 'creatine-monohydrate',
    substance_b: 'hmb',
    severity: 'synergy',
    mechanism: 'Creatine drives strength and power gains; HMB reduces muscle protein breakdown during caloric restriction. Together they support muscle gain and preserve mass during a cut.',
    source: 'Jówko E et al. Nutrition 2001',
  },
  {
    substance_a: 'coq10',
    substance_b: 'omega-3',
    severity: 'synergy',
    mechanism: 'CoQ10 supports mitochondrial electron transport; omega-3s improve membrane fluidity and reduce cardiac inflammation. Complementary cardiovascular mechanisms.',
    source: 'Sarter B. J Cardiovasc Nurs 2002',
  },
  {
    substance_a: 'tart-cherry',
    substance_b: 'omega-3',
    severity: 'synergy',
    mechanism: 'Tart cherry anthocyanins inhibit COX enzymes acutely post-exercise; omega-3-derived SPMs resolve inflammation over hours. Additive recovery benefit with complementary timing.',
    source: 'Connolly DA et al. Br J Sports Med 2006',
  },
  {
    substance_a: 'zinc-bisglycinate',
    substance_b: 'vitamin-c',
    severity: 'synergy',
    mechanism: 'Zinc and vitamin C both support immune function via independent pathways (T-cell signalling vs. neutrophil activity). Standard immune-support stack with strong safety profile.',
    source: 'Carr AC, Maggini S. Nutrients 2017',
  },
  {
    substance_a: 'magnesium-glycinate',
    substance_b: 'l-theanine',
    severity: 'synergy',
    mechanism: 'Both reduce glutamate excitotoxicity and promote GABA activity. Complementary sleep and anxiety-reduction pathways without additive sedation risk at standard doses.',
    source: 'Boyle NB et al. Nutrients 2017; Kimura K et al. Biol Psychol 2007',
  },
  {
    substance_a: 'ashwagandha',
    substance_b: 'magnesium-glycinate',
    severity: 'synergy',
    mechanism: 'Ashwagandha modulates HPA-axis cortisol response; magnesium reduces neurological stress sensitivity. Complementary mechanisms for stress and sleep without overlap.',
    source: 'Chandrasekhar K et al. Indian J Psychol Med 2012',
  },
  {
    substance_a: 'probiotics',
    substance_b: 'vitamin-c',
    severity: 'synergy',
    mechanism: 'Vitamin C creates a mildly acidic gut environment that supports probiotic survival through the digestive tract. Take together for enhanced probiotic colonisation.',
    source: 'Hill C et al. Nat Rev Gastroenterol Hepatol 2014',
  },
];

// ── Main ─────────────────────────────────────────────────────────────────────

const dryRun = process.argv.includes('--dry-run');

console.log(`Seeding ${INTERACTIONS.length} interactions${dryRun ? ' [DRY RUN]' : ''}...\n`);

if (dryRun) {
  const counts = INTERACTIONS.reduce((acc, i) => { acc[i.severity] = (acc[i.severity] || 0) + 1; return acc; }, {});
  console.log(`  danger:  ${counts.danger || 0}`);
  console.log(`  caution: ${counts.caution || 0}`);
  console.log(`  synergy: ${counts.synergy || 0}`);
  console.log('\n[DRY RUN] No rows written.');
  process.exit(0);
}

const { error } = await supabase
  .from('interactions')
  .upsert(INTERACTIONS, { onConflict: 'substance_a,substance_b' });

if (error) {
  console.error('Upsert failed:', error.message);
  process.exit(1);
}

const counts = INTERACTIONS.reduce((acc, i) => { acc[i.severity] = (acc[i.severity] || 0) + 1; return acc; }, {});
console.log(`✓ Upserted ${INTERACTIONS.length} interactions:`);
console.log(`  danger:  ${counts.danger || 0}`);
console.log(`  caution: ${counts.caution || 0}`);
console.log(`  synergy: ${counts.synergy || 0}`);
