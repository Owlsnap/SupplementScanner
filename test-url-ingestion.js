/**
 * Test URL ingestion endpoint
 */

const testURL = process.argv[2] || 'https://www.tillskottsbolaget.se/sv/solid-nutrition-magnesium-bisglycinate-90-caps';
const API_URL = 'http://localhost:3001';

async function testURLIngestion() {
  console.log('🧪 Testing URL Ingestion Endpoint');
  console.log('🔗 URL:', testURL);
  console.log('📡 API:', API_URL);
  console.log('');

  try {
    console.log('📤 Sending POST request to /api/ingest/url...');

    const response = await fetch(`${API_URL}/api/ingest/url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: testURL })
    });

    const data = await response.json();

    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📊 INGESTION RESULTS');
    console.log('═══════════════════════════════════════');
    console.log('');

    if (data.success) {
      console.log('✅ SUCCESS! Product saved to database');
      console.log('');
      console.log('📦 Product:', data.data.productName);
      console.log('🏷️  Brand:', data.data.brand);
      console.log('💰 Price:', data.data.price.value, data.data.price.currency);
      console.log('🔢 Servings:', data.data.servingsPerContainer);
      console.log('📏 Form:', data.data.form);
      console.log('🎯 Category:', data.data.category, '/', data.data.subCategory);
      console.log('🔑 Barcode:', data.barcode);
      console.log('');

      if (data.data.ingredients && data.data.ingredients.length > 0) {
        console.log('🧪 Ingredients:');
        data.data.ingredients.forEach((ing, idx) => {
          console.log(`   ${idx + 1}. ${ing.name}: ${ing.dosage}${ing.unit}` + (ing.form ? ` (${ing.form})` : ''));
        });
        console.log('');
      }

      console.log('⚗️  Quality Analysis:');
      console.log('   - Underdosed:', data.data.quality.underDosed ? '⚠️ Yes' : '✅ No');
      console.log('   - Overdosed:', data.data.quality.overDosed ? '⚠️ Yes' : '✅ No');
      console.log('   - Filler Risk:', data.data.quality.fillerRisk || 'N/A');
      console.log('   - Bioavailability:', data.data.quality.bioavailability || 'N/A');
      console.log('');

      console.log('📈 Extraction Metrics:');
      console.log('   - Method:', data.extraction.method);
      console.log('   - Completeness:', data.extraction.completeness + '%');
      console.log('   - Valid:', data.extraction.validation.isValid ? '✅' : '❌');

      if (data.extraction.validation.warnings.length > 0) {
        console.log('   - Warnings:', data.extraction.validation.warnings.join(', '));
      }

      console.log('');
      console.log('═══════════════════════════════════════');
      console.log('');
      console.log('💾 Full database entry:');
      console.log(JSON.stringify(data.data, null, 2));

    } else {
      console.log('❌ FAILED');
      console.log('Error:', data.error);

      if (data.extractedData) {
        console.log('');
        console.log('📊 Extracted data (not saved):');
        console.log(JSON.stringify(data.extractedData, null, 2));
      }
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error('');
    console.error('Make sure:');
    console.error('  1. Server is running: npm run server');
    console.error('  2. Server is on port 3001');
    console.error('  3. Anthropic API key is set in .env.local');
  }
}

testURLIngestion();
