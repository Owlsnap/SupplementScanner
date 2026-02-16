/**
 * Test script for Enhanced Scraper (Jina + Claude)
 *
 * Usage:
 *   node test-enhanced-scraper.js <product-url>
 *
 * Example:
 *   node test-enhanced-scraper.js https://tillskottsbolaget.se/produkt/magnesium-bisglycinate-200mg
 */

import { EnhancedSupplementScraper } from './src/services/enhancedScraper.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testScraper() {
  // Get URL from command line or use default
  const testURL = process.argv[2] || 'https://tillskottsbolaget.se/produkt/d3-vitamin-4000-ie';

  console.log('🧪 Testing Enhanced Scraper (Jina + Claude)');
  console.log('🔗 URL:', testURL);
  console.log('🔑 Anthropic API Key:', process.env.ANTHROPIC_API_KEY ? '✅ Loaded' : '❌ Missing');
  console.log('');

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-anthropic-api-key-here') {
    console.error('❌ ERROR: Please set ANTHROPIC_API_KEY in .env.local');
    console.log('\nTo get an API key:');
    console.log('1. Go to https://console.anthropic.com/');
    console.log('2. Sign up or log in');
    console.log('3. Navigate to API Keys');
    console.log('4. Create a new key');
    console.log('5. Add it to .env.local as: ANTHROPIC_API_KEY=your-key-here');
    process.exit(1);
  }

  try {
    const scraper = new EnhancedSupplementScraper();
    const startTime = Date.now();

    // Run the pipeline
    const result = await scraper.scrapeAndExtract(testURL);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📊 EXTRACTION RESULTS');
    console.log('═══════════════════════════════════════');
    console.log('');

    if (result.success) {
      console.log('✅ Success!');
      console.log('⏱️  Duration:', duration + 's');
      console.log('');

      // Validate
      const validation = scraper.validateExtraction(result.data);

      console.log('📦 Product:', result.data.productName);
      console.log('🏷️  Brand:', result.data.brand);
      console.log('💰 Price:', result.data.price?.value, result.data.price?.currency);
      console.log('📏 Form:', result.data.form);
      console.log('🔢 Servings:', result.data.servingsPerContainer);
      console.log('🥄 Serving Size:', result.data.servingSize?.amount, result.data.servingSize?.unit);

      if (result.data.ingredients && result.data.ingredients.length > 0) {
        console.log('');
        console.log('🧪 Ingredients:');
        result.data.ingredients.forEach((ing, idx) => {
          console.log(`   ${idx + 1}. ${ing.name}: ${ing.dosage}${ing.unit}` + (ing.form ? ` (${ing.form})` : ''));
        });
      }

      console.log('');
      console.log('✓ Validation:');
      console.log('  - Valid:', validation.isValid ? '✅' : '❌');
      console.log('  - Completeness:', validation.completeness + '%');

      if (validation.issues.length > 0) {
        console.log('  - Issues:', validation.issues.join(', '));
      }

      if (validation.warnings.length > 0) {
        console.log('  - Warnings:', validation.warnings.join(', '));
      }

      console.log('');
      console.log('═══════════════════════════════════════');
      console.log('');
      console.log('💡 Full data object:');
      console.log(JSON.stringify(result.data, null, 2));

    } else {
      console.log('❌ Extraction failed');
      console.log('Error:', result.error);
    }

  } catch (error) {
    console.error('');
    console.error('💥 Test failed:', error.message);
    console.error('');
    console.error('Stack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testScraper().catch(error => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});
