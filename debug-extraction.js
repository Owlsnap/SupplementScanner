/**
 * Debug what Puppeteer is actually extracting
 */

import puppeteer from 'puppeteer';

const testURL = process.argv[2] || 'https://www.tillskottsbolaget.se/sv/solid-pwo-230-g';

async function debugExtraction() {
  console.log('🔍 Debugging Puppeteer Extraction');
  console.log('🔗 URL:', testURL);
  console.log('');

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(testURL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Get the page title
    const title = await page.title();
    console.log('📄 Page title:', title);

    // Get the URL after any redirects
    const finalURL = page.url();
    console.log('🔗 Final URL:', finalURL);
    console.log('');

    // Extract text content (same way enhancedScraper does)
    const productData = await page.evaluate(() => {
      // Remove scripts, styles, navigation
      const scripts = document.querySelectorAll('script, style, nav, header, footer, aside, .navigation, .menu, .sidebar');
      scripts.forEach(el => el.remove());

      // Try to find main product content area
      const productSelectors = [
        '[itemtype*="Product"]',
        '.product-main',
        '.product-info',
        '.product-detail',
        '#product',
        'main',
        '[role="main"]'
      ];

      let productElement = null;
      for (const selector of productSelectors) {
        productElement = document.querySelector(selector);
        if (productElement) break;
      }

      const content = (productElement || document.body).innerText;
      return {
        content: content,
        contentLength: content.length,
        firstLine: content.split('\n')[0],
        first500: content.substring(0, 500)
      };
    });

    console.log('📊 Extracted content:');
    console.log('  - Length:', productData.contentLength, 'characters');
    console.log('  - First line:', productData.firstLine);
    console.log('');
    console.log('  - First 500 chars:');
    console.log('─'.repeat(60));
    console.log(productData.first500);
    console.log('─'.repeat(60));

    await browser.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugExtraction();
