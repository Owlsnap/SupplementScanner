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

  // ── DANGER (new supplements) ──────────────────────────────────────────────

  {
    substance_a: '5-htp',
    substance_b: 'ssri antidepressants',
    severity: 'danger',
    mechanism: '5-HTP directly increases serotonin synthesis; SSRIs block serotonin reuptake. Combined serotonin excess can cause serotonin syndrome — hyperthermia, agitation, rapid heart rate, and in severe cases seizures.',
    source: 'Turner EH et al. Altern Med Rev 2006; Natural Medicines Database',
  },
  {
    substance_a: '5-htp',
    substance_b: 'maoi antidepressants',
    severity: 'danger',
    mechanism: 'MAOIs block serotonin breakdown while 5-HTP dramatically increases synthesis. This combination carries one of the highest serotonin syndrome risks of any supplement-drug interaction — avoid entirely.',
    source: 'Natural Medicines Database; FDA drug interaction guidance',
  },
  {
    substance_a: 'ginkgo-biloba',
    substance_b: 'warfarin',
    severity: 'danger',
    mechanism: 'Ginkgolides inhibit platelet-activating factor (PAF), reducing platelet aggregation. Combined with warfarin, this meaningfully increases bleeding risk; case reports of spontaneous intracranial bleeding are documented.',
    source: 'Rosenblatt M, Mindel J. N Engl J Med 1997; Jiang X et al. J Clin Pharmacol 2005',
  },
  {
    substance_a: 'valerian-root',
    substance_b: 'benzodiazepines',
    severity: 'danger',
    mechanism: 'Both act on GABA-A receptors — benzodiazepines via direct positive allosteric modulation, valerian via inhibiting GABA reuptake and breakdown. Combined use produces additive CNS depression: excessive sedation, impaired motor coordination, and respiratory depression risk.',
    source: 'Carrasco MC et al. Drug Alcohol Depend 2009; Natural Medicines Database',
  },
  {
    substance_a: 'nac',
    substance_b: 'nitroglycerin',
    severity: 'danger',
    mechanism: 'NAC potentiates nitric oxide–mediated vasodilation from nitroglycerin, causing sudden and severe blood pressure drops. Case reports document pronounced hypotension and debilitating headaches with this combination.',
    source: 'Iversen HK et al. Eur J Clin Pharmacol 1992',
  },
  {
    substance_a: 'quercetin',
    substance_b: 'warfarin',
    severity: 'danger',
    mechanism: 'Quercetin inhibits CYP2C9, the primary enzyme metabolising warfarin. Reduced warfarin clearance raises plasma levels, potentiating anticoagulation and increasing bleeding risk significantly.',
    source: 'Mallet AL et al. Br J Clin Pharmacol 2002; Moon YJ et al. J Pharm Sci 2006',
  },
  {
    substance_a: 'resveratrol',
    substance_b: 'warfarin',
    severity: 'danger',
    mechanism: 'Resveratrol inhibits CYP2C9, slowing warfarin metabolism and elevating plasma concentrations. Particularly relevant at longevity-protocol doses (200mg+) where the inhibition is clinically meaningful.',
    source: 'Detampel P et al. Drug Metab Rev 2012; Bertelli AA et al. Drugs Exp Clin Res 1996',
  },

  // ── CAUTION (new supplements) ─────────────────────────────────────────────

  {
    substance_a: '5-htp',
    substance_b: 'melatonin',
    severity: 'caution',
    mechanism: '5-HTP raises serotonin, which the pineal gland converts to melatonin. Combined use at full doses can produce excessive pineal output and over-deepen sleep; reduce individual doses when stacking for sleep.',
    source: 'Birdsall TC. Altern Med Rev 1998; pharmacodynamic additive effect',
  },
  {
    substance_a: 'ginkgo-biloba',
    substance_b: 'omega-3',
    severity: 'caution',
    mechanism: 'Both inhibit platelet aggregation via different pathways — ginkgo via PAF inhibition, omega-3 via thromboxane A2 suppression. At high doses of each, the additive anticoagulant effect may increase bleeding risk.',
    source: 'Beckert BW et al. Plast Reconstr Surg 2007',
  },
  {
    substance_a: 'valerian-root',
    substance_b: 'l-theanine',
    severity: 'caution',
    mechanism: 'Both modulate GABAergic neurotransmission — valerian inhibits GABA reuptake and breakdown; theanine reduces glutamate excitotoxicity and promotes GABA activity. Stacking at full doses can produce deeper sedation than intended; reduce individual doses.',
    source: 'Pharmacodynamic additive GABAergic effect — clinical observation',
  },
  {
    substance_a: 'valerian-root',
    substance_b: 'melatonin',
    severity: 'caution',
    mechanism: 'Valerian produces sedation via GABA modulation; melatonin signals sleep onset via MT1/MT2 receptors. Combined use at standard doses of each can cause excessive sedation and prolonged morning grogginess in some individuals.',
    source: 'Pharmacodynamic additive sedation — clinical observation',
  },
  {
    substance_a: 'alcar',
    substance_b: 'alpha-gpc',
    severity: 'caution',
    mechanism: 'Both elevate acetylcholine — ALCAR via acetyl group donation to synthesis, Alpha-GPC via direct choline supply. Stacking at full doses can produce acetylcholine excess: headaches, vivid dreams, and GI discomfort in sensitive individuals. Use half-doses of each.',
    source: 'Ueland PM. Pharmacol Rev 1982; pharmacodynamic acetylcholine accumulation',
  },
  {
    substance_a: 'alcar',
    substance_b: 'citicoline',
    severity: 'caution',
    mechanism: 'Both contribute to acetylcholine synthesis — ALCAR via acetyl groups, citicoline via choline. Combined use raises total ACh load; may cause headache or cognitive heaviness in sensitive individuals. Reduce doses when stacking.',
    source: 'Pharmacodynamic acetylcholine accumulation — clinical observation',
  },
  {
    substance_a: 'msm',
    substance_b: 'warfarin',
    severity: 'caution',
    mechanism: 'MSM has mild antiplatelet properties, potentially via sulfur-mediated effects on platelet aggregation. Combined with warfarin, this may modestly increase anticoagulation; monitor INR when starting or stopping MSM.',
    source: 'Natural Medicines Database; Kim LS et al. Osteoarthritis Cartilage 2006',
  },
  {
    substance_a: 'spirulina',
    substance_b: 'warfarin',
    severity: 'caution',
    mechanism: 'Spirulina contains meaningful amounts of vitamin K, which opposes warfarin\'s anticoagulant mechanism. Consistent daily spirulina intake can lower INR; inconsistent use causes unpredictable INR fluctuations.',
    source: 'Natural Medicines Database; NIH Office of Dietary Supplements',
  },
  {
    substance_a: 'vitamin-b12',
    substance_b: 'metformin',
    severity: 'caution',
    mechanism: 'Metformin significantly reduces ileal B12 absorption by impairing calcium-dependent intrinsic factor binding. Long-term metformin users require higher B12 doses or periodic monitoring; deficiency risk increases substantially after 3+ years of use.',
    source: 'Reinstatler L et al. Diabetes Care 2012; de Jager J et al. BMJ 2010',
  },
  {
    substance_a: 'selenium',
    substance_b: 'vitamin-c',
    severity: 'caution',
    mechanism: 'High-dose Vitamin C (>1g) can reduce selenite (inorganic selenium) to elemental selenium in the gut, significantly impairing absorption. This interaction does not apply to organic selenomethionine — separate by 2+ hours only if using inorganic selenium forms.',
    source: 'Mutanen M, Mykkänen HM. Ann Nutr Metab 1985',
  },

  // ── SYNERGY (new supplements) ─────────────────────────────────────────────

  {
    substance_a: 'nmn',
    substance_b: 'resveratrol',
    severity: 'synergy',
    mechanism: 'NMN raises cellular NAD+; resveratrol activates SIRT1, a longevity-associated sirtuin that requires NAD+ as its essential cofactor. Each amplifies the other — the most mechanistically validated longevity supplement pairing.',
    source: 'Baur JA et al. Nature 2006; Yoshino J et al. Cell Metab 2018',
  },
  {
    substance_a: 'quercetin',
    substance_b: 'vitamin-c',
    severity: 'synergy',
    mechanism: 'Ascorbate regenerates oxidized quercetin back to its active antioxidant form, substantially extending its activity in the body. The combination shows greater antioxidant and anti-inflammatory effect than either alone.',
    source: 'Skaper SD et al. Proc Natl Acad Sci 1997; Day AJ et al. Free Radic Res 2000',
  },
  {
    substance_a: 'nac',
    substance_b: 'selenium',
    severity: 'synergy',
    mechanism: 'NAC provides cysteine for glutathione synthesis; selenium is the catalytic center of glutathione peroxidase (GPx), the enzyme that uses glutathione to neutralize peroxides. Together they support the complete glutathione antioxidant system.',
    source: 'Moosmann B, Behl C. Trends Neurosci 2002; Papp LV et al. Antioxid Redox Signal 2007',
  },
  {
    substance_a: 'msm',
    substance_b: 'collagen-peptides',
    severity: 'synergy',
    mechanism: 'Collagen peptides provide hydroxyproline and glycine substrates for new collagen; MSM supplies the bioavailable sulfur required for collagen cross-linking and disulfide bond formation. Together they address both substrate supply and structural chemistry of connective tissue synthesis.',
    source: 'Usha PR, Naidu MU. Clin Drug Invest 2004; Butawan M et al. Nutrients 2017',
  },
  {
    substance_a: '5-htp',
    substance_b: 'l-theanine',
    severity: 'synergy',
    mechanism: '5-HTP raises serotonin, addressing mood and anxiety-driven sleep disruption; L-theanine promotes alpha wave activity and GABA signaling for calm without sedation. Complementary neurotransmitter pathways converging on relaxation and sleep onset via serotonergic and GABAergic routes.',
    source: 'Birdsall TC. Altern Med Rev 1998; Kimura K et al. Biol Psychol 2007',
  },
  {
    substance_a: 'citicoline',
    substance_b: 'bacopa-monnieri',
    severity: 'synergy',
    mechanism: 'Citicoline boosts acetylcholine acutely and provides uridine for neuronal membrane repair; bacopa enhances memory consolidation via cholinergic and antioxidant mechanisms over weeks. Acute cholinergic support paired with long-term memory architecture improvement.',
    source: 'Stough C et al. Psychopharmacology 2001; Fioravanti M, Buckley AE. Clin Drug Invest 2006',
  },
  {
    substance_a: 'taurine',
    substance_b: 'creatine-monohydrate',
    severity: 'synergy',
    mechanism: 'Both are osmolytes that drive water into muscle cells — creatine via phosphocreatine-driven volumization, taurine via direct osmotic regulation. Together they maximize intracellular hydration, supporting power output and reducing exercise-induced cellular stress.',
    source: 'Hoffman JR et al. J Strength Cond Res 2008; Spriet LL, Whitfield J. Appl Physiol Nutr Metab 2015',
  },
  {
    substance_a: 'valerian-root',
    substance_b: 'magnesium-glycinate',
    severity: 'synergy',
    mechanism: 'Valerian inhibits GABA reuptake and breakdown; magnesium activates GABA-A receptors and blocks NMDA excitotoxicity. Complementary mechanisms targeting the same inhibitory neurotransmitter system for more complete sleep preparation without additive sedation risk at standard doses.',
    source: 'Bent S et al. Am J Med 2006; Boyle NB et al. Nutrients 2017',
  },
  {
    substance_a: 'nac',
    substance_b: 'vitamin-c',
    severity: 'synergy',
    mechanism: 'Vitamin C (ascorbate) regenerates oxidized glutathione (GSSG) back to active GSH in the cytoplasm; NAC provides the cysteine substrate to synthesize more glutathione. Together they maintain the complete glutathione recycling cycle — synthesis and regeneration.',
    source: 'Johnston CS et al. J Am Coll Nutr 1993; Pastore A et al. Clin Chim Acta 2003',
  },
  {
    substance_a: 'nmn',
    substance_b: 'coq10',
    severity: 'synergy',
    mechanism: 'NMN raises NAD+, fueling the electron transport chain at complexes I and III; CoQ10 carries electrons between those complexes in the same chain. Together they support both substrate supply and electron shuttle capacity for mitochondrial ATP production.',
    source: 'Yoshino J et al. Cell Metab 2018; Mortensen SA. Ann N Y Acad Sci 2003',
  },
  {
    substance_a: 'alcar',
    substance_b: 'coq10',
    severity: 'synergy',
    mechanism: 'ALCAR shuttles long-chain fatty acids into mitochondria as fuel; CoQ10 transfers electrons derived from that fuel through the electron transport chain to generate ATP. Complementary upstream (substrate delivery) and downstream (electron shuttle) mitochondrial roles.',
    source: 'Hagen TM et al. Proc Natl Acad Sci 2002; Mortensen SA. Ann N Y Acad Sci 2003',
  },
  {
    substance_a: 'spirulina',
    substance_b: 'vitamin-c',
    severity: 'synergy',
    mechanism: 'Spirulina is rich in non-heme iron, which has poor intrinsic absorption. Vitamin C converts non-heme iron (Fe³⁺) to the more absorbable ferrous form (Fe²⁺) and chelates it to prevent re-oxidation. Taking together significantly improves iron uptake — especially important for plant-based athletes.',
    source: 'Hallberg L et al. Ann N Y Acad Sci 1987; NIH Office of Dietary Supplements',
  },
  {
    substance_a: 'ginkgo-biloba',
    substance_b: 'panax-ginseng',
    severity: 'synergy',
    mechanism: 'Ginkgo improves cerebral blood flow and reduces neuronal oxidative stress; ginseng modulates the HPA axis and multiple neurotransmitter systems for sustained cognitive performance under stress. Together they address both the circulatory and neurochemical components of cognitive function — a combination with RCT-level support.',
    source: 'Kennedy DO et al. Psychopharmacology 2001; Wesnes KA et al. Psychopharmacology 2000',
  },
  {
    substance_a: 'quercetin',
    substance_b: 'omega-3',
    severity: 'synergy',
    mechanism: 'Quercetin inhibits COX-2-mediated pro-inflammatory prostaglandin synthesis acutely; omega-3-derived specialized pro-resolving mediators (SPMs) actively resolve inflammation over hours. Dual-pathway anti-inflammatory coverage with complementary mechanisms and timing.',
    source: 'Chainani-Wu N. J Altern Complement Med 2003; Serhan CN. Annu Rev Immunol 2007',
  },
  {
    substance_a: 'taurine',
    substance_b: 'magnesium-glycinate',
    severity: 'synergy',
    mechanism: 'Taurine modulates GABA-A receptors and reduces adrenal-driven neurological excitability; magnesium blocks NMDA excitotoxicity and activates GABA-A. Complementary inhibitory pathways for exercise recovery, stress management, and sleep quality without meaningful sedation risk.',
    source: 'El Idrissi A, Trenkner E. J Neurosci 1999; Boyle NB et al. Nutrients 2017',
  },
  {
    substance_a: 'selenium',
    substance_b: 'vitamin-d3-k2',
    severity: 'synergy',
    mechanism: 'Both support immune function via distinct mechanisms — selenium as the catalytic site of immune-regulating selenoproteins (GPx, thioredoxin reductase), vitamin D3 as a transcription regulator of immune cell differentiation. Complementary immune modulation with no overlapping risk.',
    source: 'Hiffler L, Rakotoambinina B. Front Nutr 2020; Aranow C. J Investig Med 2011',
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
