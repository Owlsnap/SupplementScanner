/**
 * SEO & AEO Specialist Agent for SupplementScanner.io
 *
 * Modes:
 *   node scripts/seo-aeo-agent.js --mode analyze --url https://www.supplementscanner.io
 *   node scripts/seo-aeo-agent.js --mode generate --topic "Vitamin D dosage for adults"
 *   node scripts/seo-aeo-agent.js --mode keywords --supplement magnesium
 *   node scripts/seo-aeo-agent.js --mode audit
 *
 * Reports are saved to scripts/seo-reports/
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const client = new Anthropic();

// ─── Tools ───────────────────────────────────────────────────────────────────

const tools = [
  {
    name: 'fetch_page',
    description:
      'Fetch the full HTML source of a URL to analyze its SEO/AEO elements (title, meta, headings, schema markup, content structure). Call this when you need the actual page content before analyzing.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Absolute URL to fetch' },
      },
      required: ['url'],
    },
  },
  {
    name: 'save_report',
    description:
      'Save the completed analysis report to a markdown file under scripts/seo-reports/. Call this once the full analysis is written.',
    input_schema: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description:
            'Filename slug (no extension, no path) e.g. "audit-homepage"',
        },
        content: {
          type: 'string',
          description: 'Full report content in markdown format',
        },
      },
      required: ['filename', 'content'],
    },
  },
];

async function executeTool(name, input) {
  if (name === 'fetch_page') {
    try {
      const res = await fetch(input.url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; SupplementScanner-SEO-Agent/1.0)',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) return `HTTP ${res.status} ${res.statusText} for ${input.url}`;
      const html = await res.text();
      // Keep first 60 KB — enough to capture <head> + initial <body> content
      return html.length > 60_000
        ? html.slice(0, 60_000) + '\n<!-- [truncated at 60 KB] -->'
        : html;
    } catch (err) {
      return `Error fetching ${input.url}: ${err.message}`;
    }
  }

  if (name === 'save_report') {
    const reportsDir = join(__dirname, 'seo-reports');
    if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });

    const date = new Date().toISOString().slice(0, 10);
    const filepath = join(reportsDir, `${input.filename}-${date}.md`);
    writeFileSync(filepath, input.content, 'utf8');
    return `✅ Report saved → ${filepath}`;
  }

  return `Unknown tool: ${name}`;
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM = `You are an expert SEO and AEO (Answer Engine Optimization) specialist embedded in the SupplementScanner.io product team.

## Site context
- Domain: https://www.supplementscanner.io
- Purpose: Swedish supplement encyclopedia + barcode scanner app
- Target audience: Swedish health-conscious consumers
- Primary content: Encyclopedia (70 supplements with AI deep dives), scan-to-result flow
- Tech: React SPA (Vercel) + Express API (Railway) + Supabase
- URL patterns: /supplement/:slug  |  /encyclopedia  |  /scan  |  /premium

## Your SEO expertise
- Technical: title tags, meta descriptions, canonical URLs, Open Graph, structured data
- On-page: keyword placement, heading hierarchy (H1 → H2 → H3), content density
- E-E-A-T signals: Experience, Expertise, Authoritativeness, Trustworthiness — critical for health content
- Core Web Vitals considerations for React SPAs
- International: Swedish-language keywords, hreflang, local search intent
- Featured snippets: paragraph, list, and table snippets for position zero

## Your AEO expertise
AEO = making content extractable and citeable by AI answer engines (Perplexity, ChatGPT, Gemini, Copilot, etc.)
- Concise authoritative answers in the first 100 words of each section
- Clear entity definitions: [supplement name] is [brief authoritative definition]
- Structured Q&A pairs that mirror how users query AI assistants
- Schema.org types: MedicalWebPage, Drug, DietarySupplement, FAQPage, HowTo, MedicalCondition
- Factual, citation-friendly statements (no hedging with "may" when evidence is strong)
- Avoid "fluff" opening sentences — AI engines skip them and cite the first substantive sentence

## Output standards
- Produce specific, code-level recommendations (real JSON-LD, real meta tag HTML)
- Rank issues by business impact: traffic potential × fix effort
- Note Swedish market specifics where relevant (local search terms, regulatory language)
- Always save completed reports with the save_report tool`;

// ─── Agent runner ─────────────────────────────────────────────────────────────

async function runAgent(userMessage) {
  const messages = [{ role: 'user', content: userMessage }];

  while (true) {
    const stream = client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 8192,
      thinking: { type: 'adaptive' },
      system: SYSTEM,
      tools,
      messages,
    });

    // Stream text output in real time
    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        process.stdout.write(event.delta.text);
      }
    }

    const message = await stream.finalMessage();

    if (message.stop_reason === 'end_turn') break;

    if (message.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: message.content });

      const toolResults = [];
      for (const block of message.content) {
        if (block.type === 'tool_use') {
          process.stdout.write(`\n\n⚙️  [${block.name}: ${block.input.url || block.input.filename || ''}]\n`);
          const result = await executeTool(block.name, block.input);
          if (block.name === 'save_report') {
            process.stdout.write(result + '\n');
          }
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      messages.push({ role: 'user', content: toolResults });
    } else {
      break;
    }
  }
}

// ─── Modes ────────────────────────────────────────────────────────────────────

async function analyzeMode(url) {
  const target = url || 'https://www.supplementscanner.io';
  const slug = new URL(target).pathname.replace(/\//g, '-').replace(/^-/, '') || 'homepage';

  console.log(`\n🔍 SEO/AEO page audit: ${target}\n${'─'.repeat(60)}\n`);

  await runAgent(
    `Perform a comprehensive SEO and AEO audit for this SupplementScanner page: ${target}

Steps:
1. Fetch the page with fetch_page
2. Extract and evaluate:
   - Title tag (keyword present? brand suffix? character count?)
   - Meta description (compelling? keyword-rich? ≤160 chars?)
   - H1 / H2 / H3 hierarchy
   - All schema.org JSON-LD blocks (type, completeness, errors)
   - Open Graph / Twitter Card tags
   - Canonical URL
   - Visible body content (first 500 words — what would an AI engine cite?)
3. AEO analysis:
   - Is the primary question answered in the first paragraph?
   - Are there Q&A pairs an AI engine could extract?
   - Are supplement entities defined clearly (name, category, dosage, effects)?
4. Produce a prioritized issue list (P1/P2/P3) with:
   - Current state
   - Recommended fix
   - Actual code snippet (HTML or JSON-LD)
   - Estimated traffic impact
5. Save the full report as "audit-${slug}"`,
  );
}

async function generateMode(topic) {
  if (!topic) {
    console.error('--topic is required. Example: --topic "Vitamin D benefits"');
    process.exit(1);
  }

  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  console.log(`\n✍️  Generating SEO/AEO content: "${topic}"\n${'─'.repeat(60)}\n`);

  await runAgent(
    `Generate fully optimized SEO and AEO content for SupplementScanner.io on the topic: "${topic}"

Produce in this exact order:
1. **Optimized title tag** — include primary keyword + "| SupplementScanner" suffix
2. **Meta description** — 150-160 chars, include primary keyword + clear value prop
3. **H1** — natural, keyword-lead heading
4. **AEO summary paragraph** (100-120 words) — answer the primary question directly in the opening; the first sentence must be citation-friendly ("X is a supplement that...")
5. **10 FAQ pairs** with concise authoritative answers (2-4 sentences each), covering:
   - What is it / how does it work
   - Recommended dosage
   - Key benefits (evidence-based)
   - Side effects / safety
   - Who should take it / who should avoid
   - Interactions with other supplements
   - Best time to take
   - Swedish-specific context if relevant
6. **Schema.org JSON-LD block** — combine DietarySupplement (or Drug) + FAQPage schemas; include name, description, dosageForm, relevantSpecialty, contraindication
7. **Internal linking suggestions** — 5 related SupplementScanner supplement pages to link to

Save the complete output as "content-${slug}"`,
  );
}

async function keywordsMode(supplement) {
  if (!supplement) {
    console.error('--supplement is required. Example: --supplement magnesium');
    process.exit(1);
  }

  const slug = supplement.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  console.log(`\n🔑 Keyword research: "${supplement}"\n${'─'.repeat(60)}\n`);

  await runAgent(
    `Conduct thorough keyword and question research for SupplementScanner.io content about: "${supplement}"

Deliver:
1. **Primary keywords** (5-10) — high-intent, supplement-specific, with estimated monthly search intent (high/med/low)
2. **Long-tail keywords** (15-20) — conversational + question format, intent mapped
3. **Swedish-market keywords** — Swedish-language search terms, local health concerns, brand names common in Sweden
4. **AEO question clusters** — the exact natural-language questions users ask AI assistants about ${supplement}:
   - What questions / How questions / Why questions / Should I / Is it safe / vs [competitor supplement]
5. **Featured snippet opportunities** — questions where a crisp SupplementScanner answer could win position zero
6. **Content gap analysis** — what aspects of ${supplement} likely aren't covered on the current site, based on common user questions
7. **Semantic topic map** — related entities, conditions, co-supplements, and health goals that should appear in content to build topical authority
8. **Recommended content structure** — suggested H2/H3 outline using the top keywords and questions

Save the full research report as "keywords-${slug}"`,
  );
}

async function auditMode() {
  console.log(`\n🌐 Full site SEO/AEO audit — SupplementScanner.io\n${'─'.repeat(60)}\n`);

  await runAgent(
    `Perform a full technical SEO and AEO site audit for SupplementScanner.io.

Fetch and analyze these pages in order:
1. https://www.supplementscanner.io  (homepage)
2. https://www.supplementscanner.io/encyclopedia  (main content hub)

For each page, extract and evaluate all SEO signals.

Then produce a unified audit covering:

## Technical SEO
- Title tag patterns — is there a consistent, optimized formula?
- Meta description coverage and quality
- Schema.org implementation — what's present, what's missing?
- Open Graph completeness
- Internal link structure between pages

## AEO Readiness Score (0-10) with justification
- Content structure for AI extraction
- Entity clarity (supplement names, dosages, effects)
- Q&A content present?
- Citation-friendly opening sentences?
- Structured data that AI engines read

## Priority Action Plan
List the top 20 improvements, each with:
- Category (Technical / Content / Schema / AEO)
- Current state
- Recommended fix (with code when applicable)
- Priority: P1 (this week) / P2 (this month) / P3 (roadmap)
- Impact: High / Medium / Low

## Quick Wins
5 changes that take <2 hours and have high impact.

## Strategic Recommendations
Long-term SEO/AEO strategy tailored to the Swedish supplement market.

Save the complete audit report as "full-site-audit"`,
  );
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

const MODES = { analyze: analyzeMode, generate: generateMode, keywords: keywordsMode, audit: auditMode };

function getArg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : null;
}

const mode = getArg('--mode') || 'analyze';
const url = getArg('--url');
const topic = getArg('--topic');
const supplement = getArg('--supplement');

if (!MODES[mode]) {
  console.error(`Unknown mode: "${mode}". Available modes: ${Object.keys(MODES).join(', ')}`);
  process.exit(1);
}

console.log('═'.repeat(60));
console.log('  SEO & AEO Specialist Agent — SupplementScanner.io');
console.log('═'.repeat(60));

MODES[mode](url || topic || supplement)
  .then(() => {
    console.log('\n\n✅ Done.\n');
  })
  .catch((err) => {
    console.error('\n❌ Agent error:', err.message);
    process.exit(1);
  });
