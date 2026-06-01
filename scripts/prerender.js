/**
 * Build-time prerender script
 *
 * After `vite build`, starts a local Express server serving dist/, then uses
 * Puppeteer to snapshot each known route and writes the rendered HTML back to
 * dist/<route>/index.html. Vercel serves those static files directly to
 * crawlers and AI engines; browsers hydrate them as normal React SPAs.
 *
 * Run: node scripts/prerender.js  (chained from "build" in package.json)
 */

import express from 'express';
import { createServer } from 'http';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, writeFileSync } from 'fs';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const PORT = 4173;
const BASE = `http://localhost:${PORT}`;

// All supplement slugs from encyclopediaData.ts (kept in sync here)
const SUPPLEMENT_SLUGS = [
  // Performance
  'creatine-monohydrate', 'caffeine', 'beta-alanine', 'citrulline-malate',
  'betaine-anhydrous', 'hmb', 'sodium-bicarbonate', 'taurine',
  'bcaas', 'eaas', 'electrolytes', 'beetroot-extract', 'l-carnitine',
  // Sleep
  'magnesium-glycinate', 'melatonin', 'l-theanine', 'ashwagandha',
  'glycine', '5-htp', 'valerian-root', 'gaba', 'myo-inositol',
  // Nootropics
  'lions-mane', 'bacopa-monnieri', 'alpha-gpc', 'rhodiola-rosea',
  'panax-ginseng', 'phosphatidylserine', 'alcar', 'citicoline',
  'ginkgo-biloba', 'mucuna-pruriens', 'magnesium-l-threonate',
  // Recovery
  'tart-cherry', 'collagen-peptides', 'glutamine', 'msm',
  'glucosamine', 'chondroitin', 'hyaluronic-acid',
  // Health
  'omega-3', 'curcumin', 'vitamin-d3-k2', 'zinc-bisglycinate',
  'magnesium-malate', 'probiotics', 'vitamin-c', 'berberine',
  'coq10', 'nac', 'spirulina', 'nmn', 'quercetin', 'vitamin-b12',
  'resveratrol', 'selenium', 'iron', 'folate', 'biotin',
  'milk-thistle', 'elderberry', 'tongkat-ali', 'maca-root',
  'vitamin-a', 'vitamin-e', 'astaxanthin', 'iodine', 'chromium',
  'saw-palmetto', 'lutein-zeaxanthin',
];

const ROUTES = [
  '/',
  '/recommendations',
  '/app',
  '/premium',
  ...SUPPLEMENT_SLUGS.map(s => `/encyclopedia/${s}`),
];

function startServer() {
  const app = express();
  // Serve static files from dist/
  app.use(express.static(DIST));
  // SPA fallback — all unknown paths serve index.html so React Router can boot
  app.use((_req, res) => res.sendFile(join(DIST, 'index.html')));
  return new Promise(resolve => {
    const server = createServer(app);
    server.listen(PORT, () => resolve(server));
  });
}

async function renderRoute(page, route) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle0', timeout: 30_000 });

  // Wait for React to paint something meaningful (root must be non-empty)
  await page.waitForFunction(
    () => document.getElementById('root')?.children?.length > 0,
    { timeout: 15_000 },
  );

  return page.evaluate(() => '<!DOCTYPE html>\n' + document.documentElement.outerHTML);
}

function saveHtml(route, html) {
  const routePath = route === '/' ? '' : route;
  const dir = join(DIST, routePath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html, 'utf8');
}

async function main() {
  console.log(`\n🖨  Prerendering ${ROUTES.length} routes into dist/\n`);

  const server = await startServer();

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Suppress console noise from the app
  page.on('console', () => {});
  page.on('pageerror', () => {});

  let ok = 0;
  let fail = 0;

  for (const route of ROUTES) {
    try {
      const html = await renderRoute(page, route);
      saveHtml(route, html);
      process.stdout.write(`  ✓ ${route}\n`);
      ok++;
    } catch (err) {
      process.stdout.write(`  ✗ ${route}  (${err.message})\n`);
      fail++;
    }
  }

  await browser.close();
  server.close();

  console.log(`\n✅ Prerender complete — ${ok} succeeded, ${fail} failed\n`);

  if (fail > 0) process.exit(1);
}

main().catch(err => {
  console.error('Prerender fatal error:', err);
  process.exit(1);
});
