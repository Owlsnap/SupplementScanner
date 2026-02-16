/**
 * Test Jina Reader and show product details
 */

const testURL = process.argv[2] || 'https://www.tillskottsbolaget.se/sv/solid-nutrition-magnesium-bisglycinate-90-caps';

async function testJina() {
  console.log('🔍 Testing Jina Reader - Detailed Analysis');
  console.log('🔗 URL:', testURL);
  console.log('');

  try {
    const jinaUrl = `https://r.jina.ai/${testURL}`;

    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'markdown'
      }
    });

    if (!response.ok) {
      throw new Error(`Jina failed: ${response.status}`);
    }

    const markdown = await response.text();

    console.log('✅ Fetched', markdown.length, 'characters');
    console.log('');

    // Extract key sections
    console.log('═══════════════════════════════════════');
    console.log('🔍 SEARCHING FOR KEY PRODUCT DATA');
    console.log('═══════════════════════════════════════');
    console.log('');

    // Search for price
    const priceMatch = markdown.match(/(\d+)\s*kr|(\d+)\s*SEK/i);
    if (priceMatch) {
      console.log('💰 Found price:', priceMatch[0]);
    }

    // Search for product name
    const nameMatch = markdown.match(/SOLID Nutrition.*?(\d+)\s*caps/i);
    if (nameMatch) {
      console.log('📦 Product:', nameMatch[0]);
    }

    // Search for ingredients/dosage section
    const ingredientSection = markdown.match(/(?:Innehåll|Ingredienser|per kapsel|per portion)[\s\S]{0,500}/i);
    if (ingredientSection) {
      console.log('');
      console.log('🧪 Ingredient section found:');
      console.log('---');
      console.log(ingredientSection[0].substring(0, 400));
      console.log('---');
    }

    // Search for dosage
    const dosageMatch = markdown.match(/(\d+)\s*mg.*?(magnesium|Mg)/i);
    if (dosageMatch) {
      console.log('');
      console.log('📏 Dosage found:', dosageMatch[0]);
    }

    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📄 FULL CONTENT PREVIEW (relevant section):');
    console.log('═══════════════════════════════════════');
    console.log('');

    // Find and show the main product description area
    const productStart = markdown.indexOf('Magnesium Bisglycinate');
    if (productStart !== -1) {
      const relevantSection = markdown.substring(productStart, productStart + 3000);
      console.log(relevantSection);
    } else {
      // Fallback - show middle section
      const middle = Math.floor(markdown.length / 3);
      console.log(markdown.substring(middle, middle + 2000));
    }

    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('✨ Next step: Send this to Claude for structured extraction');
    console.log('📊 Claude will extract: name, brand, price, ingredients, dosages, etc.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testJina();
