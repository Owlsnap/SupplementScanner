import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;

// Debug environment variables
console.log('🔑 OpenAI API Key available:', !!process.env.OPENAI_API_KEY);
console.log('🚀 Starting server on port:', PORT);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// CORS configuration for production
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000', 
    'https://supp-scanner.vercel.app',
    'https://supplementscanner.io',
    'https://www.supplementscanner.io'
  ],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' })); // Increase payload limit for large HTML extractions

// Simple health check
app.get('/', (req, res) => {
  res.json({ message: 'AI Product Extraction API is running!' });
});

// Test endpoint to verify API is reachable
app.get('/api/test', (req, res) => {
  console.log('🧪 Test endpoint hit from:', req.headers['origin'] || req.headers['host']);
  res.json({ success: true, message: 'API is working!', timestamp: new Date().toISOString() });
});

// Product extraction endpoint
app.post('/api/extract-product', async (req, res) => {
  console.log('🎯 POST /api/extract-product - Request received');
  console.log('📨 Headers:', req.headers);
  console.log('📦 Body:', req.body);
  
  const { url, method = 'hybrid' } = req.body;

  if (!url) {
    console.log('❌ No URL provided in request');
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  // Try new multi-layer extraction system for structured method
  if (method === 'structured') {
    try {
      console.log('🧬 Using new structured extraction system');
      
      // Setup DOM for server-side extraction
      const { JSDOM } = await import('jsdom');
      const { window } = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
      global.window = window;
      global.document = window.document;
      global.DOMParser = window.DOMParser;
      global.Node = window.Node;
      global.Element = window.Element;
      global.HTMLElement = window.HTMLElement;
      
      const { extractSupplementDataStructured } = await import('./src/extraction/multiLayerExtractor.js');
      
      // Get HTML using puppeteer 
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Handle Tillskottsbolaget read-more
      try {
        const readMoreButton = await page.$('.btn.sup-read-more-btn');
        if (readMoreButton) {
          await readMoreButton.click();
          await page.waitForTimeout(2000);
        }
      } catch (e) {}
      
      const html = await page.content();
      await browser.close();

      console.log(`📄 Extracted HTML: ${html.length} characters`);
      
      const result = await extractSupplementDataStructured(html, url);
      
      if (result.success) {
        return res.status(200).json({
          success: true,
          data: result.data,
          structuredData: result.structuredData,
          extraction_method: 'structured',
          metadata: result.metadata
        });
      } else {
        console.log('⚠️ Structured extraction failed, falling back to legacy');
      }
    } catch (error) {
      console.error('❌ Structured extraction error:', error);
      console.log('⚠️ Falling back to legacy extraction');
    }
  }
  
  // Try parallel extraction system (structured + legacy simultaneously)
  if (method === 'parallel') {
    try {
      console.log('🚀 Using parallel extraction system (structured + legacy simultaneously)');
      
      // Setup DOM for server-side extraction
      const { JSDOM } = await import('jsdom');
      const { window } = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
      global.window = window;
      global.document = window.document;
      global.DOMParser = window.DOMParser;
      global.Node = window.Node;
      global.Element = window.Element;
      global.HTMLElement = window.HTMLElement;
      
      const { extractSupplementDataParallel } = await import('./src/extraction/multiLayerExtractor.js');
      
      // Get HTML using puppeteer 
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Handle Tillskottsbolaget read-more
      try {
        const readMoreButton = await page.$('.btn.sup-read-more-btn');
        if (readMoreButton) {
          console.log('🔽 Clicking on Tillskottsbolaget read-more button');
          await readMoreButton.click();
          await page.waitForTimeout(2000);
        }
      } catch (e) {}
      
      const html = await page.content();
      await browser.close();

      console.log(`📄 Extracted HTML: ${html.length} characters for parallel extraction`);
      
      const result = await extractSupplementDataParallel(html, url);
      
      if (result.success) {
        console.log('✅ Parallel extraction completed successfully');
        return res.status(200).json({
          success: true,
          data: result.data,
          structuredData: result.structuredData,
          extraction_method: 'parallel',
          metadata: result.metadata
        });
      } else {
        console.log('⚠️ Parallel extraction failed, falling back to legacy');
      }
    } catch (error) {
      console.error('❌ Parallel extraction error:', error);
      console.log('⚠️ Falling back to legacy extraction');
    }
  }

  console.log('🔍 Using legacy extraction for:', url);

  try {
    console.log('🚀 Launching browser...');
    // Launch browser and take screenshot
    const browser = await puppeteer.launch({ 
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    console.log('✅ Browser launched successfully');
    const page = await browser.newPage();
    
    // Set viewport for better mobile/desktop compatibility
    await page.setViewport({ width: 1200, height: 800 });
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
    // Try to click on common description/information tabs that might contain supplement info
    try {
      // Look for Tillskottsbolaget specific read-more button
      const readMoreButton = await page.$('.btn.sup-read-more-btn');
      if (readMoreButton) {
        console.log('🔽 Clicking on Tillskottsbolaget read-more button');
        await readMoreButton.click();
        await page.waitFor(2000); // Wait for content expansion
      }
    } catch (e) {
      // If clicking fails, continue with screenshot
    }
    
    // Take a full page screenshot to capture all content including expanded sections
    const screenshot = await page.screenshot({ 
      fullPage: true,
      timeout: 10000
    });
    
    await browser.close();

    // Convert screenshot to base64
    const base64Image = screenshot.toString('base64');

    // Use OpenAI with structured extraction system
    const extractedData = await performStructuredExtraction(base64Image);
    
    if (!extractedData) {
      throw new Error('Failed to extract product information');
    }
    
    // Validate and clean the extracted data
    const validatedData = validateAndCleanData(extractedData);
    
    console.log('AI Extraction Result:', {
      foundBasicInfo: !!(validatedData.name || validatedData.price),
      foundSupplementInfo: !!(validatedData.activeIngredient || validatedData.dosagePerUnit),
      extractedData: validatedData
    });
    
    return res.status(200).json({
      success: true,
      ...validatedData
    });

  } catch (error) {
    console.error('❌ Extraction error details:', {
      message: error.message,
      stack: error.stack?.substring(0, 500),
      name: error.name,
      url: url
    });
    
    if (error.message.includes('timeout')) {
      return res.status(500).json({
        success: false,
        error: 'Page took too long to load. Try a different URL.'
      });
    }
    
    if (error.message.includes('OpenAI')) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI API error. Please check API key and credits.'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: `Server error: ${error.message}`
    });
  }
});

// ====== PROFESSIONAL AI EXTRACTION SYSTEM ======

// JSON Schema for supplement extraction
const SUPPLEMENT_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string", description: "Product name" },
    price: { type: "number", description: "Current selling price as number" },
    quantity: { type: "number", description: "Quantity/weight as number" },
    unit: { type: "string", description: "Unit (kapslar, tabletter, g, ml, etc.)" },
    activeIngredient: { type: "string", description: "Main active ingredient" },
    dosagePerUnit: { type: "number", description: "Dosage per unit as number" },
    servingSize: { type: "number", description: "Recommended serving size" },
    servingsPerContainer: { type: "number", description: "Total servings per container" }
  },
  required: ["name", "price", "quantity", "unit"]
};

// // Specialized extraction functions
// function extractPrice(html) {
//   // Price extraction logic - find current selling price
//   const pricePatterns = [
//     /(?:pris|price)[^\d]*([\d,\.]+)\s*kr/i,
//     /([\d,\.]+)\s*kr(?!.*tidigare|.*var|.*förut)/i,
//     /\b([\d,\.]+)\s*kr\s*(?:köp|buy)/i
//   ];
  
//   for (const pattern of pricePatterns) {
//     const match = html.match(pattern);
//     if (match) {
//       return parseFloat(match[1].replace(',', '.'));
//     }
//   }
//   return null;
// }
// function extractDosage(html) {
//   // Dosage extraction with Swedish patterns
//   const dosagePatterns = [
//     /(?:per\s+kapsel|per\s+tablett)[^\d]*([\d]+)\s*mg/i,
//     /([\d]+)\s*mg\s+per\s+(?:kapsel|tablett)/i,
//     /innehåll\s+per\s+kapsel[^\d]*([\d]+)\s*mg/i
//   ];
  
//   for (const pattern of dosagePatterns) {
//     const match = html.match(pattern);
//     if (match) {
//       return parseInt(match[1]);
//     }
//   }
//   return null;
// }

function cleanNumber(str) {
  if (typeof str === 'number') return str;
  if (!str) return null;
  
  // Remove all non-numeric characters except decimal points
  const cleaned = str.toString().replace(/[^\d\.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// System prompt for AI extraction
function getSystemPrompt() {
  return `You are a professional supplement data extraction bot. Your role is to extract structured product information from Swedish supplement website screenshots.

You MUST return valid JSON that matches this exact schema:
{
  "name": "string - exact product name",
  "price": "number - current selling price (IGNORE crossed-out/old prices)",
  "quantity": "number - amount/weight", 
  "unit": "string - measurement unit",
  "activeIngredient": "string - main ingredient",
  "dosagePerUnit": "number - mg/g per capsule/tablet",
  "servingSize": "number - capsules/tablets per serving",
  "servingsPerContainer": "number - total servings"
}

EXTRACTION RULES:
1. PRICE: Find the current selling price (largest, near "Lägg till i kundvagnen" buttons). Ignore "tidigare pris" or crossed-out prices
2. DOSAGE: Look in product description or "Läs mer" sections for "per kapsel" information
3. SERVING: Check "Rekommenderad dosering" for daily intake
4. Return ONLY valid JSON, no explanatory text`;
}

// Fallback extraction prompt
function getFallbackPrompt() {
  return `FALLBACK EXTRACTION: Extract basic product info if detailed extraction failed.
Focus on finding at least: name, price, quantity, unit.
Return JSON only.`;
}

// Structured extraction with fallback strategy
async function performStructuredExtraction(base64Image) {
  try {
    // Primary extraction attempt
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: getSystemPrompt()
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract supplement information from this product page screenshot."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 800,
      response_format: { type: "json_object" }
    });

    const extractedText = response.choices[0].message.content;
    const productInfo = JSON.parse(extractedText);
    
    return productInfo;
    
  } catch (error) {
    console.error('Primary extraction failed:', error);
    
    // Fallback extraction attempt
    try {
      const fallbackResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: getFallbackPrompt()
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 400
      });
      
      let fallbackText = fallbackResponse.choices[0].message.content.trim();
      
      // Clean markdown if present
      if (fallbackText.startsWith('```json')) {
        fallbackText = fallbackText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (fallbackText.startsWith('```')) {
        fallbackText = fallbackText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      return JSON.parse(fallbackText);
      
    } catch (fallbackError) {
      console.error('Fallback extraction failed:', fallbackError);
      return null;
    }
  }
}

// Validation and data cleaning
function validateAndCleanData(data) {
  const cleaned = {
    name: data.name || "Unknown Product",
    price: cleanNumber(data.price) || 0,
    quantity: cleanNumber(data.quantity) || 0,
    unit: data.unit || "units",
    activeIngredient: data.activeIngredient || "Unknown",
    dosagePerUnit: cleanNumber(data.dosagePerUnit) || 0,
    servingSize: cleanNumber(data.servingSize) || 1,
    servingsPerContainer: cleanNumber(data.servingsPerContainer) || 0
  };
  
  // Calculate missing values if possible
  if (cleaned.servingsPerContainer === 0 && cleaned.quantity > 0 && cleaned.servingSize > 0) {
    cleaned.servingsPerContainer = Math.floor(cleaned.quantity / cleaned.servingSize);
  }
  
  return cleaned;
}

app.listen(PORT, () => {
  console.log(`🚀 AI Extraction API running on http://localhost:${PORT}`);
  console.log(`📝 OpenAI API Key loaded: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
});