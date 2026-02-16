/**
 * Enhanced Supplement Scraper using Jina Reader + Claude Sonnet
 *
 * This service replaces the Puppeteer + OpenAI vision pipeline with:
 * - Jina Reader: Free, fast web scraping that returns clean markdown
 * - Claude Sonnet 4.5: Superior structured data extraction
 *
 * Benefits:
 * - No browser automation overhead (Puppeteer)
 * - Better extraction accuracy
 * - Faster processing
 * - Lower cost
 */

import Anthropic from '@anthropic-ai/sdk';

export class EnhancedSupplementScraper {
  constructor(apiKey) {
    this.anthropic = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });

    // Jina Reader API endpoint (free)
    this.jinaBaseURL = 'https://r.jina.ai/';
  }

  /**
   * Fetch clean content from URL using Jina Reader
   * @param {string} url - Product URL to scrape
   * @returns {Promise<string>} - Clean markdown content
   */
  async fetchCleanContent(url) {
    try {
      const jinaUrl = `${this.jinaBaseURL}${url}`;

      console.log('🔍 Fetching with Jina Reader:', url);

      const response = await fetch(jinaUrl, {
        headers: {
          'Accept': 'text/plain',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'X-Return-Format': 'markdown',
          'X-With-Generated-Alt': 'true' // Include image alt text
        }
      });

      if (!response.ok) {
        throw new Error(`Jina Reader failed: ${response.status} ${response.statusText}`);
      }

      const markdown = await response.text();
      console.log(`✅ Fetched ${markdown.length} characters from Jina Reader`);

      // Clean the markdown to remove navigation noise
      const cleanedMarkdown = this.cleanMarkdown(markdown);
      console.log(`🧹 Cleaned to ${cleanedMarkdown.length} characters (removed ${markdown.length - cleanedMarkdown.length} chars of noise)`);

      return cleanedMarkdown;
    } catch (error) {
      console.error('❌ Jina Reader error:', error.message);
      throw error;
    }
  }

  /**
   * Clean markdown to remove navigation and interference
   * @param {string} markdown - Raw markdown from Jina
   * @returns {string} - Cleaned markdown focused on product content
   */
  cleanMarkdown(markdown) {
    const lines = markdown.split('\n');

    // Strategy 1: Find the main product heading (usually h1 with product name)
    // Look for a line with the product name followed by equals signs (h1 in markdown)
    let productHeadingIdx = -1;
    let productEndIdx = lines.length;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = i < lines.length - 1 ? lines[i + 1] : '';

      // Find h1 heading (line followed by ======)
      if (nextLine.match(/^=+$/) && !line.includes('|') && line.length > 10 && line.length < 200) {
        // Make sure it's not the page title (too early)
        if (i > 50) {
          productHeadingIdx = i - 2; // Include a bit of context before
          console.log('🎯 Found product heading at line', i, ':', line.substring(0, 60));
          break;
        }
      }
    }

    // Strategy 2: Find where related products section starts
    const relatedProductMarkers = [
      'Perfekt att kombinera med',
      'Liknande produkter',
      'Kunder som köpte',
      'Du kanske också gillar',
      'Andra köpte också',
      'Relaterade produkter',
      'Recensions' // Reviews section
    ];

    if (productHeadingIdx !== -1) {
      for (let i = productHeadingIdx + 10; i < lines.length; i++) {
        const line = lines[i];

        for (const marker of relatedProductMarkers) {
          if (line.includes(marker)) {
            productEndIdx = i;
            console.log('🛑 Found related products at line', i, ':', marker);
            break;
          }
        }

        if (productEndIdx < lines.length) break;
      }
    }

    // Extract main product section
    let productLines = productHeadingIdx !== -1
      ? lines.slice(productHeadingIdx, productEndIdx)
      : lines;

    // Strategy 3: Filter out remaining noise within product section
    const filteredLines = [];
    let consecutiveLinks = 0;

    for (let i = 0; i < productLines.length; i++) {
      const line = productLines[i].trim();

      // Skip obvious noise lines
      if (
        line.match(/^Gratis fraktalternativ/i) ||
        line.match(/^Bonusprodukter/i) ||
        line.match(/^Logga in/i) ||
        line.match(/^Önskelista/i) ||
        line.match(/^Varukorg/i) ||
        line.match(/^Meny\s*$/i) ||
        line.match(/^Country\s*$/i) ||
        line.match(/Hoppa till innehållet/i) ||
        line.match(/^\[Image \d+:/) ||
        line.match(/^Sök produkt/) ||
        line.match(/Antal i önskelistan/i)
      ) {
        continue;
      }

      // Track consecutive navigation links
      if (line.startsWith('*') && line.includes('](http')) {
        consecutiveLinks++;
      } else {
        consecutiveLinks = 0;
      }

      // Skip long navigation menus (more than 5 consecutive links)
      if (consecutiveLinks > 5) {
        continue;
      }

      filteredLines.push(productLines[i]);
    }

    let cleaned = filteredLines.join('\n');

    // Strategy 4: Remove price filter patterns
    cleaned = cleaned.replace(/\d+\s*-\s*\d+\s*kr/gi, ''); // "500-1000 kr" filter ranges

    // Strategy 5: Clean up excessive whitespace
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * Extract structured supplement data using Claude with tool calling
   * @param {string} markdown - Clean markdown content from webpage
   * @param {string} url - Original URL for context
   * @returns {Promise<Object>} - Structured supplement data
   */
  async extractSupplementData(markdown, url) {
    try {
      console.log('🤖 Extracting with Claude Sonnet 4.5...');

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        tools: [{
          name: 'extract_supplement_data',
          description: 'Extract structured supplement information from a Swedish product page',
          input_schema: {
            type: 'object',
            properties: {
              productName: {
                type: 'string',
                description: 'Full product name'
              },
              brand: {
                type: 'string',
                description: 'Brand/manufacturer name'
              },
              price: {
                type: 'object',
                properties: {
                  value: {
                    type: 'number',
                    description: 'Current selling price (not old/crossed-out price)'
                  },
                  currency: {
                    type: 'string',
                    description: 'Currency code (SEK, EUR, etc.)'
                  }
                },
                required: ['value', 'currency']
              },
              servingsPerContainer: {
                type: 'number',
                description: 'Total servings in container (e.g., 60 capsules if serving is 2 capsules = 30 servings)'
              },
              servingSize: {
                type: 'object',
                properties: {
                  amount: { type: 'number' },
                  unit: { type: 'string', description: 'kapslar, tabletter, scoops, ml, etc.' }
                },
                required: ['amount', 'unit']
              },
              ingredients: {
                type: 'array',
                description: 'List of active ingredients with dosages',
                items: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      description: 'Ingredient name with form if specified (e.g., "Magnesium bisglycinate", "Vitamin D3")'
                    },
                    dosage: {
                      type: 'number',
                      description: 'Amount per serving'
                    },
                    unit: {
                      type: 'string',
                      description: 'mg, g, mcg, IU, etc.'
                    },
                    form: {
                      type: 'string',
                      description: 'Chemical form if specified (e.g., "bisglycinate", "citrate", "D3")'
                    }
                  },
                  required: ['name', 'dosage', 'unit']
                }
              },
              form: {
                type: 'string',
                enum: ['capsule', 'tablet', 'powder', 'liquid', 'gummy', 'softgel', 'other'],
                description: 'Product form'
              },
              description: {
                type: 'string',
                description: 'Brief product description or benefits'
              },
              nutritionalFacts: {
                type: 'object',
                description: 'Macro nutritional table data (Näringsvärde). For products like protein powders, fat burners, etc. that have a nutritional facts table with "Per 100 g" and "Per portion/serving" columns.',
                properties: {
                  per100g: {
                    type: 'object',
                    properties: {
                      servingSize: { type: 'string', description: 'Always "100 g" for this column' },
                      energy_kj: { type: 'number' },
                      energy_kcal: { type: 'number' },
                      protein_g: { type: 'number' },
                      fat_g: { type: 'number' },
                      saturatedFat_g: { type: 'number' },
                      carbohydrates_g: { type: 'number' },
                      sugars_g: { type: 'number' },
                      fiber_g: { type: 'number' },
                      salt_g: { type: 'number' }
                    }
                  },
                  perServing: {
                    type: 'object',
                    properties: {
                      servingSize: { type: 'string', description: 'Serving size like "30 g" or "1 skopa (30 g)"' },
                      energy_kj: { type: 'number' },
                      energy_kcal: { type: 'number' },
                      protein_g: { type: 'number' },
                      fat_g: { type: 'number' },
                      saturatedFat_g: { type: 'number' },
                      carbohydrates_g: { type: 'number' },
                      sugars_g: { type: 'number' },
                      fiber_g: { type: 'number' },
                      salt_g: { type: 'number' }
                    }
                  }
                }
              },
              ingredientListText: {
                type: 'string',
                description: 'The full ingredient list text (usually starts with "Ingredienser:" and lists all raw ingredients). Copy it verbatim.'
              }
            },
            required: ['productName', 'ingredients', 'price']
          }
        }],
        tool_choice: { type: 'tool', name: 'extract_supplement_data' },
        messages: [{
          role: 'user',
          content: `Extract supplement data from this Swedish product page.

URL: ${url}

PAGE CONTENT:
${markdown}

CRITICAL EXTRACTION RULES:

1. **PRICE** - MOST IMPORTANT:
   - Find the ACTUAL PRODUCT PRICE, not shipping thresholds or promotional messages
   - Look for price near "Lägg i varukorg" (Add to cart) button
   - IGNORE: "Gratis frakt över 500kr", "fri frakt", navigation prices
   - IGNORE: "tidigare pris" (old price), crossed-out prices
   - The product price is usually a 2-3 digit number followed by "kr" or "SEK"
   - Example: "179 kr" = 179, NOT 500 or other random numbers

2. **INGREDIENTS** (active ingredients like vitamins, minerals, caffeine, creatine, etc.):
   - Look for "Innehåll per portion", "Per kapsel", "Per dos", "Näringsdeklaration"
   - Extract the specific chemical form (e.g., "bisglycinate", "citrate", "D3")
   - Include dosage per serving
   - These are typically listed with mg, mcg, or IU units

3. **NUTRITIONAL FACTS TABLE** (Näringsvärde / Näring & ingredienser):
   - Many products (protein powders, weight gainers, meal replacements, fat burners) have a macro nutrition table
   - This table typically has columns: nutrient name | Per 100 g | Per serving/portion
   - Extract energy (kJ and kcal), protein, fat (total and saturated), carbohydrates (total and sugars), fiber, salt
   - Put these in the nutritionalFacts object with per100g and perServing sub-objects
   - This is DIFFERENT from the active ingredients list

4. **INGREDIENT LIST TEXT**:
   - Look for "Ingredienser:" followed by the raw ingredient list
   - Copy it verbatim into ingredientListText

5. **SERVING SIZE**:
   - "Rekommenderad dosering" = recommended serving
   - Look for "daglig dos", "ta X kapslar"
   - Usually 1-3 capsules/tablets/scoops

6. **FORM**:
   - kapslar = capsule
   - tabletter = tablet
   - pulver = powder
   - vätska/flytande = liquid

7. **BRAND**:
   - Often at the start of product name
   - Examples: "SOLID Nutrition", "Thorne", "NOW Foods"

8. **IGNORE COMPLETELY**:
   - Navigation menus and category links
   - Shipping and delivery information
   - "Över 500kr" or similar promotional text
   - Cookie messages
   - Footer content

Extract only accurate information from the product page content. If unsure, omit the field.`
        }]
      });

      // Extract tool use result
      const toolUse = response.content.find(block => block.type === 'tool_use');

      if (!toolUse) {
        throw new Error('Claude did not return structured data');
      }

      const extractedData = toolUse.input;
      console.log('✅ Claude extraction successful');
      console.log('📊 Extracted:', {
        product: extractedData.productName,
        ingredients: extractedData.ingredients?.length || 0,
        price: extractedData.price?.value || 'N/A'
      });

      return extractedData;

    } catch (error) {
      console.error('❌ Claude extraction error:', error.message);
      throw error;
    }
  }

  /**
   * Fetch HTML content using Puppeteer (fallback when Jina fails)
   * @param {string} url - Product URL
   * @returns {Promise<string>} - Cleaned text content
   */
  async fetchWithPuppeteer(url) {
    const puppeteer = await import('puppeteer');

    console.log('🌐 Fetching with Puppeteer (Jina fallback)...');

    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Extract only the main product content using page.evaluate
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

      // Fallback to body if no product area found
      const content = (productElement || document.body).innerText;

      return content;
    });

    await browser.close();

    console.log(`✅ Fetched ${productData.length} characters of text from HTML`);
    return productData;
  }

  /**
   * Complete pipeline: Scrape URL and extract structured data
   * @param {string} url - Product URL
   * @returns {Promise<Object>} - Complete extraction result
   */
  async scrapeAndExtract(url) {
    try {
      let content;
      let method = 'jina_claude';

      // Step 1: Try Jina first, fallback to Puppeteer
      try {
        content = await this.fetchCleanContent(url);
      } catch (jinaError) {
        console.log('⚠️ Jina Reader failed, using Puppeteer fallback:', jinaError.message);
        content = await this.fetchWithPuppeteer(url);
        method = 'puppeteer_claude';

        // Clean HTML (Claude can handle HTML directly)
        content = this.cleanMarkdown(content);
      }

      // Step 2: Extract with Claude
      const extractedData = await this.extractSupplementData(content, url);

      // Step 3: Transform to your schema format (SupplementSchemaV1 compatible)
      const supplementData = this.transformToSchema(extractedData, url);

      return {
        success: true,
        data: supplementData,
        rawExtraction: extractedData,
        method: method
      };

    } catch (error) {
      console.error('💥 Enhanced scraper pipeline error:', error);
      return {
        success: false,
        error: error.message,
        method: 'failed'
      };
    }
  }

  /**
   * Transform Claude's output to SupplementSchemaV1 format
   * @param {Object} extractedData - Raw Claude extraction
   * @param {string} url - Source URL
   * @returns {Object} - Schema-compliant supplement data
   */
  transformToSchema(extractedData, url) {
    // Calculate price per serving if we have the data
    let pricePerServing = null;
    if (extractedData.price?.value && extractedData.servingsPerContainer) {
      pricePerServing = extractedData.price.value / extractedData.servingsPerContainer;
    }

    return {
      productName: extractedData.productName,
      brand: extractedData.brand || 'Unknown',
      form: extractedData.form || 'other',
      servingsPerContainer: extractedData.servingsPerContainer || null,
      servingSize: extractedData.servingSize || { amount: null, unit: null },
      ingredients: (extractedData.ingredients || []).map(ing => ({
        name: ing.name,
        dosage: ing.dosage,
        unit: ing.unit,
        form: ing.form || null
      })),
      price: {
        value: extractedData.price?.value || null,
        currency: extractedData.price?.currency || 'SEK',
        pricePerServing: pricePerServing
      },
      description: extractedData.description || null,
      nutritionalFacts: extractedData.nutritionalFacts || null,
      ingredientListText: extractedData.ingredientListText || null,
      meta: {
        source: 'jina_claude',
        sourceURL: url,
        extractedAt: new Date().toISOString(),
        verified: false
      }
    };
  }

  /**
   * Validate extraction quality
   * @param {Object} data - Extracted data
   * @returns {Object} - Validation result
   */
  validateExtraction(data) {
    const issues = [];
    const warnings = [];

    // Check required fields
    if (!data.productName) issues.push('Missing product name');
    if ((!data.ingredients || data.ingredients.length === 0) && !data.nutritionalFacts) {
      issues.push('No ingredients or nutritional facts extracted');
    }
    if (!data.price?.value) warnings.push('Missing price');
    if (!data.servingsPerContainer) warnings.push('Missing servings per container');
    if (!data.nutritionalFacts && data.form === 'powder') warnings.push('Missing nutritional facts for powder product');

    // Check ingredient quality
    if (data.ingredients) {
      data.ingredients.forEach((ing, idx) => {
        if (!ing.name) issues.push(`Ingredient ${idx + 1} missing name`);
        if (!ing.dosage) warnings.push(`Ingredient ${ing.name || idx + 1} missing dosage`);
        if (!ing.unit) warnings.push(`Ingredient ${ing.name || idx + 1} missing unit`);
      });
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      completeness: this.calculateCompleteness(data)
    };
  }

  /**
   * Calculate data completeness score (0-100)
   * @param {Object} data - Extracted data
   * @returns {number} - Completeness percentage
   */
  calculateCompleteness(data) {
    let score = 0;
    const weights = {
      productName: 10,
      brand: 5,
      price: 15,
      ingredients: 20,
      servingsPerContainer: 10,
      servingSize: 10,
      form: 5,
      description: 5,
      ingredientForms: 5,
      nutritionalFacts: 10,
      ingredientListText: 5
    };

    if (data.productName) score += weights.productName;
    if (data.brand && data.brand !== 'Unknown') score += weights.brand;
    if (data.price?.value) score += weights.price;
    if (data.ingredients?.length > 0) score += weights.ingredients;
    if (data.servingsPerContainer) score += weights.servingsPerContainer;
    if (data.servingSize?.amount) score += weights.servingSize;
    if (data.form && data.form !== 'other') score += weights.form;
    if (data.description) score += weights.description;

    // Check if ingredients have forms specified
    const ingredientsWithForms = data.ingredients?.filter(i => i.form).length || 0;
    if (ingredientsWithForms > 0) {
      score += weights.ingredientForms * (ingredientsWithForms / (data.ingredients?.length || 1));
    }

    // Nutritional facts completeness
    if (data.nutritionalFacts) {
      const nf = data.nutritionalFacts;
      const hasPer100g = nf.per100g && Object.keys(nf.per100g).length > 0;
      const hasPerServing = nf.perServing && Object.keys(nf.perServing).length > 0;
      if (hasPer100g && hasPerServing) {
        score += weights.nutritionalFacts;
      } else if (hasPer100g || hasPerServing) {
        score += weights.nutritionalFacts * 0.5;
      }
    }

    // Ingredient list text
    if (data.ingredientListText) score += weights.ingredientListText;

    return Math.round(score);
  }
}

export default EnhancedSupplementScraper;
