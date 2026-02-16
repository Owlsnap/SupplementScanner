/**
 * Test Jina Reader only (no API key needed)
 */

const testURL = process.argv[2] || 'https://www.tillskottsbolaget.se/sv/solid-nutrition-magnesium-bisglycinate-90-caps';

async function testJina() {
  console.log('🔍 Testing Jina Reader (no API key needed)');
  console.log('🔗 URL:', testURL);
  console.log('');

  try {
    const jinaUrl = `https://r.jina.ai/${testURL}`;

    console.log('📡 Fetching from Jina Reader...');
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'markdown'
      }
    });

    if (!response.ok) {
      throw new Error(`Jina failed: ${response.status} ${response.statusText}`);
    }

    const markdown = await response.text();

    console.log('✅ Success! Fetched', markdown.length, 'characters');
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📄 MARKDOWN CONTENT (first 2000 chars):');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log(markdown.substring(0, 2000));
    console.log('');
    console.log('... (truncated)');
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('💡 This clean markdown would be sent to Claude for extraction');
    console.log('📊 Contains product info, price, ingredients, etc.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testJina();
