// Audit which supplements exist and where each per-supplement registry is out of sync.
// Run from the git root (SuppScanner/):  node .claude/skills/ingest-supplements/audit.mjs
// Read-only. No network, no env vars needed.
import { readFileSync } from 'fs';

const read = (p) => readFileSync(p, 'utf8');
const slugsIn = (re, text) => new Set([...text.matchAll(re)].map((m) => m[1]));
const section = (text, start, end) => text.slice(text.indexOf(start), text.indexOf(end, text.indexOf(start)));

const enc = read('src/data/encyclopediaData.ts');
const blocks = enc.split(/\n  \{\n/).slice(1);
const entries = blocks.map((b) => [
  null,
  b.match(/slug: '([^']+)'/)?.[1],
  b.match(/name: '((?:[^'\\]|\\.)*)'/)?.[1],
  b.match(/category: '(\w+)'/)?.[1],
  b.match(/evidenceTier: '(\w+)'/)?.[1],
]).filter((m) => m[1]);
const web = new Set(entries.map((m) => m[1]));

const registries = {
  'web i18n en': new Set(Object.keys(JSON.parse(read('src/i18n/locales/en.json')).supplements)),
  'web i18n sv': new Set(Object.keys(JSON.parse(read('src/i18n/locales/sv.json')).supplements)),
  'pubmed terms': slugsIn(/^  '([^']+)':\s+'/gm, section(read('scripts/ingest-pubmed.js'), 'SUPPLEMENT_SEARCH_TERMS', '};')),
  'prerender': slugsIn(/'([a-z0-9-]+)'/g, section(read('scripts/prerender.js'), 'SUPPLEMENT_SLUGS', '];')),
  'prewarm': slugsIn(/'([a-z0-9-]+)'/g, section(read('scripts/prewarm-encyclopedia.js'), 'SLUGS', '];')),
  'mobile data': slugsIn(/slug: '([^']+)'/g, read('SuppScannerApp/src/data/encyclopediaData.ts')),
  'mobile i18n': new Set(Object.keys(JSON.parse(read('SuppScannerApp/src/i18n/en.json')).supplements)),
  'server names': slugsIn(/^  '([^']+)':/gm, section(read('server.js'), 'const SLUG_TO_NAME', 'const SLUG_TO_TYPICAL_DOSE')),
};

// Interaction coverage: substances that appear in scripts/seed-interactions.js
const seed = read('scripts/seed-interactions.js');
const inInteractions = slugsIn(/substance_[ab]:\s*'([^']+)'/g, seed);

const byCat = {};
for (const m of entries) (byCat[m[3]] ||= []).push(`${m[1]} (${m[4]})`);

console.log(`WEB SOURCE OF TRUTH: ${web.size} supplements`);
for (const [c, l] of Object.entries(byCat)) console.log(`  ${c} [${l.length}]: ${l.map((s) => s.split(' ')[0]).join(', ')}`);

console.log('\nREGISTRY DRIFT (slugs in web encyclopediaData.ts missing from each registry):');
for (const [name, set] of Object.entries(registries)) {
  const missing = [...web].filter((s) => !set.has(s));
  const extra = [...set].filter((s) => !web.has(s));
  console.log(`  ${name.padEnd(13)} ${String(set.size).padStart(3)}  missing ${missing.length}${missing.length ? ': ' + missing.join(', ') : ''}${extra.length ? `  | EXTRA (not in web): ${extra.join(', ')}` : ''}`);
}

const noInter = [...web].filter((s) => !inInteractions.has(s));
console.log(`\nINTERACTIONS: ${inInteractions.size} distinct substances in seed file; ${noInter.length} supplements have no interaction rows${noInter.length ? ': ' + noInter.join(', ') : ''}`);
