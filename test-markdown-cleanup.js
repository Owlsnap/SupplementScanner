/**
 * Test markdown cleanup to see what noise gets removed
 */

import { EnhancedSupplementScraper } from './src/services/enhancedScraper.js';

const testURL = process.argv[2] || 'https://www.tillskottsbolaget.se/sv/solid-nutrition-magnesium-bisglycinate-90-caps';

async function testCleanup() {
  console.log('🧪 Testing Markdown Cleanup');
  console.log('🔗 URL:', testURL);
  console.log('');

  try {
    const jinaUrl = `https://r.jina.ai/${testURL}`;

    console.log('📡 Fetching raw markdown from Jina...');
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'markdown'
      }
    });

    const rawMarkdown = await response.text();
    console.log(`✅ Raw markdown: ${rawMarkdown.length} characters`);

    // Clean it
    const scraper = new EnhancedSupplementScraper();
    const cleaned = scraper.cleanMarkdown(rawMarkdown);
    console.log(`✅ Cleaned markdown: ${cleaned.length} characters`);
    console.log(`🧹 Removed: ${rawMarkdown.length - cleaned.length} characters (${Math.round((1 - cleaned.length/rawMarkdown.length) * 100)}% reduction)`);

    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📄 CLEANED MARKDOWN (first 3000 chars):');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log(cleaned.substring(0, 3000));
    console.log('');
    console.log('... (truncated)');
    console.log('');

    // Look for price mentions
    console.log('═══════════════════════════════════════');
    console.log('🔍 PRICE ANALYSIS');
    console.log('═══════════════════════════════════════');
    console.log('');

    const priceMatches = cleaned.match(/(\d+)\s*kr/gi);
    if (priceMatches) {
      console.log('Found price mentions:');
      priceMatches.forEach(match => {
        console.log(`  - ${match}`);
      });
      console.log('');
      console.log('💡 Claude should pick the product price (typically 2-3 digits near product info)');
    }

    // Look for ingredients
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🧪 INGREDIENT ANALYSIS');
    console.log('═══════════════════════════════════════');
    console.log('');

    const ingredientSection = cleaned.match(/(?:Innehåll|Ingredienser|per kapsel|per portion|Näringsdeklaration)[\s\S]{0,800}/i);
    if (ingredientSection) {
      console.log('Found ingredient section:');
      console.log('---');
      console.log(ingredientSection[0]);
      console.log('---');
    } else {
      console.log('⚠️ No ingredient section found in cleaned markdown');
    }

    console.log('');
    console.log('✅ Cleanup complete - this cleaned version goes to Claude');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCleanup();
