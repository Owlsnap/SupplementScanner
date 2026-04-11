import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';

// Use system Chromium on Railway (set PUPPETEER_EXECUTABLE_PATH env var), fall back to bundled
const PUPPETEER_LAUNCH_OPTS = {
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  ...(process.env.PUPPETEER_EXECUTABLE_PATH ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH } : {})
};
import { createClient } from '@supabase/supabase-js';

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

// CORS configuration for production and mobile
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8081', // Expo development server
    'https://supp-scanner.vercel.app',
    'https://supplementscanner.io',
    'https://www.supplementscanner.io'
  ],
  credentials: true
};

// Allow all origins in development (for mobile app on local network)
if (process.env.NODE_ENV !== 'production') {
  app.use(cors());
} else {
  app.use(cors(corsOptions));
}
app.use(express.json({ limit: '50mb' })); // Increase payload limit for large HTML extractions

// Rate limiting
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });
const ingestLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { success: false, error: 'Too many requests, try again later.' } });
app.use('/api', generalLimiter);
app.use('/api/ingest', ingestLimiter);

// Lazy Supabase clients (env vars aren't available until dotenv.config runs)
let _supabaseAuth = null;
let _supabaseService = null;

function getSupabaseAuth() {
  if (!_supabaseAuth) {
    _supabaseAuth = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  }
  return _supabaseAuth;
}

function getSupabaseService() {
  if (!_supabaseService) {
    _supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabaseService;
}

// Auth middleware: verifies Bearer token via Supabase and sets req.user
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.slice(7);
  const { data: { user }, error } = await getSupabaseAuth().auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }

  req.user = user;
  next();
}

// Simple health check
app.get('/', (req, res) => {
  res.json({ message: 'AI Product Extraction API is running!' });
});

// Health check endpoint for mobile app
app.get('/api/health', (req, res) => {
  console.log('🏥 Health check from:', req.headers['origin'] || req.headers['host']);
  res.json({
    success: true,
    status: 'healthy',
    message: 'API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Test endpoint to verify API is reachable
app.get('/api/test', (req, res) => {
  console.log('🧪 Test endpoint hit from:', req.headers['origin'] || req.headers['host']);
  res.json({ success: true, message: 'API is working!', timestamp: new Date().toISOString() });
});

// Enhanced extraction endpoint using Jina + Claude pipeline
app.post('/api/extract-product-enhanced', async (req, res) => {
  console.log('✨ POST /api/extract-product-enhanced - Request received (Jina + Claude)');
  console.log('📨 Body:', req.body);

  const { url } = req.body;

  if (!url) {
    console.log('❌ No URL provided in request');
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  try {
    // Initialize the enhanced scraper
    const scraper = new EnhancedSupplementScraper(process.env.ANTHROPIC_API_KEY);

    console.log('🚀 Starting Jina + Claude extraction for:', url);

    // Run the complete pipeline
    const result = await scraper.scrapeAndExtract(url);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
        method: 'jina_claude'
      });
    }

    // Validate the extraction
    const validation = scraper.validateExtraction(result.data);

    console.log('📊 Extraction validation:', {
      isValid: validation.isValid,
      completeness: validation.completeness + '%',
      issues: validation.issues,
      warnings: validation.warnings
    });

    return res.status(200).json({
      success: true,
      data: result.data,
      extraction_method: 'jina_claude',
      validation: {
        isValid: validation.isValid,
        completeness: validation.completeness,
        issues: validation.issues,
        warnings: validation.warnings
      },
      rawExtraction: result.rawExtraction
    });

  } catch (error) {
    console.error('❌ Enhanced extraction error:', {
      message: error.message,
      stack: error.stack?.substring(0, 500),
      url: url
    });

    return res.status(500).json({
      success: false,
      error: `Enhanced extraction failed: ${error.message}`,
      method: 'jina_claude'
    });
  }
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
      const browser = await puppeteer.launch(PUPPETEER_LAUNCH_OPTS);
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
      const browser = await puppeteer.launch(PUPPETEER_LAUNCH_OPTS);
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
    const browser = await puppeteer.launch(PUPPETEER_LAUNCH_OPTS);
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

// Import our barcode ingestion functionality
import { DatabaseService } from './src/services/dbService.js';
import { OpenFoodFactsService } from './src/services/openFoodFacts.js';
import { CategoryDetector } from './src/services/categoryDetector.js';
import { TillskottsblagetSearchService } from './src/services/tillskottsblagetSearch.js';
import { QualityAnalyzer } from './src/services/qualityAnalyzer.js';
import { EnhancedSupplementScraper } from './src/services/enhancedScraper.js';

// Initialize database on server start
DatabaseService.initialize().then(result => {
  if (result.success) {
    console.log('✅ Database initialized successfully');
  } else {
    console.error('❌ Database initialization failed:', result.error);
  }
});

// POST /api/ingest/url - Ingest product from URL using enhanced scraper
app.post('/api/ingest/url', async (req, res) => {
  console.log('🔗 POST /api/ingest/url - Request received');

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    console.log('🚀 Starting enhanced extraction for:', url);

    // Use enhanced scraper (Puppeteer + Claude)
    const scraper = new EnhancedSupplementScraper(process.env.ANTHROPIC_API_KEY);
    const extractionResult = await scraper.scrapeAndExtract(url);

    if (!extractionResult.success) {
      return res.status(500).json({
        success: false,
        error: extractionResult.error || 'Extraction failed'
      });
    }

    const extractedData = extractionResult.data;
    console.log('✅ Enhanced extraction successful:', extractedData.productName);

    // Detect category
    const category = CategoryDetector.detectCategory(
      extractedData.productName,
      extractedData.ingredients || []
    );

    // Create supplement object (SupplementSchemaV1)
    const supplementData = {
      productName: extractedData.productName,
      brand: extractedData.brand || 'Unknown',
      category: category.category,
      subCategory: category.subCategory,
      form: extractedData.form || 'other',
      servingsPerContainer: extractedData.servingsPerContainer || null,
      servingSize: extractedData.servingSize || { amount: null, unit: null },
      ingredients: extractedData.ingredients || [],
      ingredientListText: extractedData.ingredientListText || null,
      quality: {
        underDosed: null,
        overDosed: null,
        fillerRisk: null,
        bioavailability: null
      },
      meta: {
        source: 'url_enhanced_claude',
        verified: false,
        sourceMap: {
          sourceURL: url,
          extractionMethod: extractionResult.method
        },
        lastUpdated: new Date().toISOString()
      }
    };

    // Run quality analysis (passes category/subCategory/ingredientListText for protein analysis)
    const qualityAnalysis = QualityAnalyzer.analyzeQuality(supplementData);
    supplementData.quality = {
      underDosed: qualityAnalysis.underDosed,
      overDosed: qualityAnalysis.overDosed,
      fillerRisk: qualityAnalysis.fillerRisk,
      bioavailability: qualityAnalysis.bioavailability,
      proteinQuality: qualityAnalysis.proteinQuality || null
    };

    // Generate barcode (use crypto hash of URL for uniqueness)
    const crypto = await import('crypto');
    const urlHash = crypto.createHash('sha256').update(url).digest('hex').substring(0, 12);
    const barcode = `URL-${urlHash}`;

    // Save to database
    const saveResult = await DatabaseService.getOrCreateSupplement(barcode, supplementData);

    if (saveResult.success) {
      console.log('✅ Supplement saved to database with barcode:', barcode);

      const validation = scraper.validateExtraction(extractedData);

      res.json({
        success: true,
        data: saveResult.data,
        barcode: barcode,
        extraction: {
          method: extractionResult.method,
          completeness: validation.completeness,
          validation: validation
        },
        qualityAnalysis: qualityAnalysis,
        message: 'Product successfully extracted and saved to database'
      });
    } else {
      console.error('❌ Failed to save supplement:', saveResult.error);
      res.status(500).json({
        success: false,
        error: 'Failed to save supplement to database',
        extractedData: extractedData // Return extracted data anyway
      });
    }

  } catch (error) {
    console.error('💥 URL ingestion error:', error);
    res.status(500).json({
      success: false,
      error: `Internal server error: ${error.message}`
    });
  }
});

// GET /api/find-product-url/:barcode - Find product URL on tillskottsbolaget.se
app.get('/api/find-product-url/:barcode', async (req, res) => {
  console.log('🔍 GET /api/find-product-url/' + req.params.barcode + ' - Request received');
  
  try {
    const { barcode } = req.params;
    
    // Step 1: Get product info from OpenFoodFacts
    const ofResult = await OpenFoodFactsService.getProduct(barcode);
    if (!ofResult.success) {
      return res.status(404).json({
        success: false,
        error: 'Product not found in OpenFoodFacts database'
      });
    }

    const product = ofResult.data;
    const productName = product.product_name;
    const brand = product.brands?.split(',')[0]?.trim();
    
    console.log(`📦 Product: "${productName}" by "${brand}"`);
    
    // Step 2: Search tillskottsbolaget.se with AI-enhanced matching
    const searchResult = await TillskottsblagetSearchService.findProductURL(productName, brand, product);
    
    if (searchResult.success) {
      res.json({
        success: true,
        data: {
          barcode,
          productName,
          brand,
          tillskottsblagetURL: searchResult.data.url,
          searchTitle: searchResult.data.title,
          relevanceScore: searchResult.data.relevanceScore,
          allResults: searchResult.data.allResults
        }
      });
    } else {
      res.status(404).json({
        success: false,
        error: searchResult.error,
        productInfo: { productName, brand }
      });
    }
    
  } catch (error) {
    console.error('💥 Find product URL error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during URL search'
    });
  }
});

// POST /api/ingest/barcode/:barcode - Full barcode ingestion pipeline
app.post('/api/ingest/barcode/:barcode', async (req, res) => {
  console.log('🔍 POST /api/ingest/barcode/' + req.params.barcode + ' - Request received');
  
  try {
    const { barcode } = req.params;
    
    // Handle manual data merging if provided
    if (req.body.manualData) {
      console.log('📝 Manual data provided, merging with existing product...');
      
      // Get existing product from database
      const existingResult = await DatabaseService.getByBarcode(barcode);
      if (!existingResult.success || !existingResult.data) {
        return res.status(404).json({
          success: false,
          error: 'Product not found in database for manual update'
        });
      }
      
      const existingProduct = existingResult.data;
      
      // Merge manual data with existing product
      const updatedProduct = {
        ...existingProduct,
        ...req.body.manualData,
        meta: {
          ...existingProduct.meta,
          manuallyUpdated: true,
          lastManualUpdate: new Date().toISOString()
        }
      };
      
      // Save updated product to database
      const saveResult = await DatabaseService.updateSupplement(barcode, updatedProduct);
      if (!saveResult.success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to save manually updated product'
        });
      }
      
      console.log('✅ Product manually updated successfully');
      return res.json({
        success: true,
        data: updatedProduct,
        source: 'manual_update'
      });
    }
    
    // Step 1: Check if supplement already exists
    const existingResult = await DatabaseService.getByBarcode(barcode);
    if (existingResult.success && existingResult.data) {
      console.log('✅ Supplement found in database');
      return res.json({
        success: true,
        data: existingResult.data,
        source: 'database'
      });
    }

    // Step 2: Get basic product info from OpenFoodFacts
    console.log('🔍 Fetching from OpenFoodFacts...');
    const ofResult = await OpenFoodFactsService.getProduct(barcode);
    if (!ofResult.success) {
      return res.status(404).json({
        success: false,
        error: 'Product not found in OpenFoodFacts database'
      });
    }

    const product = ofResult.data;
    const productName = product.product_name;
    const brand = product.brands?.split(',')[0]?.trim();
    
    console.log(`📦 Product found: "${productName}" by "${brand}"`);

    // Step 3: Find product on tillskottsbolaget.se with AI-enhanced matching
    console.log('🔍 Searching tillskottsbolaget.se...');
    const searchResult = await TillskottsblagetSearchService.findProductURL(productName, brand, product);
    
    let extractionResult = null;
    let aiExtractionSuccess = false;
    
    if (searchResult.success) {
      // Step 4: Run AI extraction on tillskottsbolaget.se URL
      console.log('🤖 Running AI extraction on tillskottsbolaget.se...');
      
      try {
        const extractionResponse = await fetch(`http://localhost:${PORT}/api/extract-product`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: searchResult.data.url,
            targetSite: 'tillskottsbolaget'
          })
        });

        if (extractionResponse.ok) {
          extractionResult = await extractionResponse.json();
          aiExtractionSuccess = !!(extractionResult.productName && extractionResult.ingredients);
          console.log(aiExtractionSuccess ? '✅ AI extraction successful' : '⚠️ AI extraction partial');
        }
      } catch (extractionError) {
        console.log('❌ AI extraction failed:', extractionError.message);
      }
    }

    // Step 5: Fallback to OpenFoodFacts data if AI extraction failed
    if (!aiExtractionSuccess) {
      console.log('📋 Using OpenFoodFacts data as fallback');
      extractionResult = {
        productName: productName,
        brand: brand,
        ingredients: [],
        form: 'other',
        servingsPerContainer: null,
        servingSize: { amount: null, unit: null },
      };
    }

    // Step 6: Category detection
    const category = CategoryDetector.detectCategory(
      extractionResult.productName || productName,
      extractionResult.ingredients || []
    );

    // Step 7: Create supplement object (SupplementSchemaV1)
    const supplementData = {
      productName: extractionResult.productName || productName,
      brand: extractionResult.brand || brand || 'Unknown Brand',
      category: category.category,
      subCategory: category.subCategory,
      form: extractionResult.form || 'other',
      servingsPerContainer: extractionResult.servingsPerContainer || null,
      servingSize: extractionResult.servingSize || { amount: null, unit: null },
      ingredients: extractionResult.ingredients || [],
      quality: {
        underDosed: null,
        overDosed: null,
        fillerRisk: null,
        bioavailability: null
      },
      meta: {
        source: aiExtractionSuccess ? 'tillskottsbolaget_ai' : 'openfoodfacts_basic',
        verified: false,
        sourceMap: {
          openfoodfacts: barcode,
          tillskottsblagetURL: searchResult.success ? searchResult.data.url : null,
          aiExtraction: aiExtractionSuccess
        }
      }
    };

    // Step 7.1: Run quality analysis
    const qualityAnalysis = QualityAnalyzer.analyzeQuality(supplementData);
    supplementData.quality = {
      underDosed: qualityAnalysis.underDosed,
      overDosed: qualityAnalysis.overDosed,
      fillerRisk: qualityAnalysis.fillerRisk,
      bioavailability: qualityAnalysis.bioavailability
    };

    // Add category-specific data
    if (category.category === 'supplement' && category.subCategory === 'preworkout') {
      supplementData.preWorkoutData = extractionResult.structuredIngredients || null;
    }

    // Step 8: Save to database
    const saveResult = await DatabaseService.getOrCreateSupplement(barcode, supplementData);
    
    // Step 9: Check for missing fields and prepare response
    const requiredFields = [];
    if (!supplementData.price.value) requiredFields.push('price');
    if (!supplementData.ingredients || supplementData.ingredients.length === 0) requiredFields.push('ingredients');
    if (!supplementData.servingsPerContainer) requiredFields.push('servingsPerContainer');
    
    if (saveResult.success) {
      console.log('✅ Supplement saved to database');
      res.json({
        success: true,
        data: saveResult.data,
        source: aiExtractionSuccess ? 'tillskottsbolaget_ai' : 'openfoodfacts_basic',
        backupCreated: saveResult.backupCreated,
        requiredFields: requiredFields.length > 0 ? requiredFields : undefined,
        searchInfo: searchResult.success ? {
          tillskottsblagetURL: searchResult.data.url,
          relevanceScore: searchResult.data.relevanceScore
        } : null
      });
    } else {
      console.error('❌ Failed to save supplement:', saveResult.error);
      res.status(500).json({
        success: false,
        error: 'Failed to save supplement to database'
      });
    }

  } catch (error) {
    console.error('💥 Barcode ingestion error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during barcode processing'
    });
  }
});

// Get supplement by barcode
app.get('/api/product/:barcode', async (req, res) => {
  console.log('📖 GET /api/product/' + req.params.barcode + ' - Request received');
  
  try {
    const { barcode } = req.params;
    const result = await DatabaseService.getByBarcode(barcode);
    
    if (result.success && result.data) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Supplement not found'
      });
    }
  } catch (error) {
    console.error('💥 Get product error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/correction/:barcode - Manual correction endpoint
app.post('/api/correction/:barcode', async (req, res) => {
  console.log('✏️ POST /api/correction/' + req.params.barcode + ' - Request received');
  
  try {
    const { barcode } = req.params;
    const corrections = req.body;
    
    // Get existing supplement
    const existingResult = await DatabaseService.getByBarcode(barcode);
    if (!existingResult.success || !existingResult.data) {
      return res.status(404).json({
        success: false,
        error: 'Supplement not found for correction'
      });
    }
    
    // Apply corrections (merge with existing data)
    const correctedData = {
      ...existingResult.data,
      ...corrections,
      meta: {
        ...existingResult.data.meta,
        verified: true, // Mark as verified after manual correction
        lastUpdated: new Date().toISOString()
      }
    };
    
    // Update in database
    const updateResult = await DatabaseService.updateSupplement(barcode, correctedData);
    
    if (updateResult.success) {
      console.log('✅ Supplement corrected successfully');
      res.json({
        success: true,
        data: updateResult.data,
        message: 'Supplement data corrected and verified'
      });
    } else {
      res.status(500).json({
        success: false,
        error: updateResult.error
      });
    }
    
  } catch (error) {
    console.error('💥 Correction error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during correction'
    });
  }
});

// Search supplements
app.get('/api/search', async (req, res) => {
  console.log('🔍 GET /api/search - Request received');
  
  try {
    const { q: query, category, brand, verified, limit, offset } = req.query;
    
    const searchOptions = {};
    if (category) searchOptions.category = category;
    if (brand) searchOptions.brand = brand;
    if (verified !== undefined) searchOptions.verified = verified === 'true';
    if (limit) searchOptions.limit = parseInt(limit);
    if (offset) searchOptions.offset = parseInt(offset);

    const result = await DatabaseService.search(query || '', searchOptions);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('💥 Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get database stats
app.get('/api/stats', async (req, res) => {
  console.log('📊 GET /api/stats - Request received');
  
  try {
    const result = await DatabaseService.getStats();
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('💥 Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ====== USER ENDPOINTS (require auth) ======

// GET /api/user/profile - Get current user's profile
app.get('/api/user/profile', requireAuth, async (req, res) => {
  try {
    const { data, error } = await getSupabaseService()
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// PUT /api/user/profile - Update current user's profile
app.put('/api/user/profile', requireAuth, async (req, res) => {
  try {
    const { display_name, avatar_url } = req.body;
    const updates = {};
    if (display_name !== undefined) updates.display_name = display_name;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    const { data, error } = await getSupabaseService()
      .from('profiles')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// GET /api/user/scans - Get user's saved scans
app.get('/api/user/scans', requireAuth, async (req, res) => {
  try {
    const { data, error } = await getSupabaseService()
      .from('saved_scans')
      .select('*, products(product_name, brand, category)')
      .eq('user_id', req.user.id)
      .order('scanned_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Scans fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch scans' });
  }
});

// POST /api/user/scans - Save a scan
app.post('/api/user/scans', requireAuth, async (req, res) => {
  try {
    const { product_id, barcode, notes } = req.body;

    if (!barcode) {
      return res.status(400).json({ success: false, error: 'barcode is required' });
    }

    const { data, error } = await getSupabaseService()
      .from('saved_scans')
      .upsert(
        {
          user_id: req.user.id,
          product_id: product_id || null,
          barcode,
          notes: notes || null,
          scanned_at: new Date().toISOString()
        },
        { onConflict: 'user_id,barcode' }
      )
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Scan save error:', error);
    res.status(500).json({ success: false, error: 'Failed to save scan' });
  }
});

// DELETE /api/user/scans/:barcode - Delete a saved scan
app.delete('/api/user/scans/:barcode', requireAuth, async (req, res) => {
  try {
    const { error } = await getSupabaseService()
      .from('saved_scans')
      .delete()
      .eq('user_id', req.user.id)
      .eq('barcode', req.params.barcode);

    if (error) throw error;

    res.json({ success: true, message: 'Scan deleted' });
  } catch (error) {
    console.error('Scan delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete scan' });
  }
});

// GET /api/user/favorites - Get user's favorites
app.get('/api/user/favorites', requireAuth, async (req, res) => {
  try {
    const { data, error } = await getSupabaseService()
      .from('favorites')
      .select('*, products(product_name, brand, category, barcode)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Favorites fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch favorites' });
  }
});

// POST /api/user/favorites - Add a favorite
app.post('/api/user/favorites', requireAuth, async (req, res) => {
  try {
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({ success: false, error: 'product_id is required' });
    }

    const { data, error } = await getSupabaseService()
      .from('favorites')
      .upsert(
        { user_id: req.user.id, product_id },
        { onConflict: 'user_id,product_id' }
      )
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Favorite add error:', error);
    res.status(500).json({ success: false, error: 'Failed to add favorite' });
  }
});

// DELETE /api/user/favorites/:productId - Remove a favorite
app.delete('/api/user/favorites/:productId', requireAuth, async (req, res) => {
  try {
    const { error } = await getSupabaseService()
      .from('favorites')
      .delete()
      .eq('user_id', req.user.id)
      .eq('product_id', req.params.productId);

    if (error) throw error;

    res.json({ success: true, message: 'Favorite removed' });
  } catch (error) {
    console.error('Favorite delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove favorite' });
  }
});

// ============================================================
// Encyclopedia Deep Dive — AI generation + Supabase cache
// ============================================================

// Lazy Anthropic client (reuses ANTHROPIC_API_KEY already in env)
let _anthropicClient = null;
function getAnthropicClient() {
  if (!_anthropicClient) {
    _anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropicClient;
}

// Slug → display name map (avoids importing .ts files in Node)
const SLUG_TO_NAME = {
  'creatine-monohydrate': 'Creatine Monohydrate',
  'caffeine': 'Caffeine',
  'beta-alanine': 'Beta-Alanine',
  'citrulline-malate': 'Citrulline Malate',
  'betaine-anhydrous': 'Betaine Anhydrous',
  'hmb': 'HMB (Beta-Hydroxy Beta-Methylbutyrate)',
  'sodium-bicarbonate': 'Sodium Bicarbonate',
  'magnesium-glycinate': 'Magnesium Glycinate',
  'melatonin': 'Melatonin',
  'l-theanine': 'L-Theanine',
  'ashwagandha': 'Ashwagandha (KSM-66)',
  'glycine': 'Glycine',
  'lions-mane': "Lion's Mane Mushroom",
  'bacopa-monnieri': 'Bacopa Monnieri',
  'alpha-gpc': 'Alpha-GPC',
  'rhodiola-rosea': 'Rhodiola Rosea',
  'panax-ginseng': 'Panax Ginseng',
  'phosphatidylserine': 'Phosphatidylserine',
  'tart-cherry': 'Tart Cherry Extract',
  'omega-3': 'Omega-3 (EPA/DHA)',
  'collagen-peptides': 'Collagen Peptides',
  'curcumin': 'Curcumin (with Piperine)',
  'glutamine': 'L-Glutamine',
  'vitamin-d3-k2': 'Vitamin D3 + K2',
  'zinc-bisglycinate': 'Zinc Bisglycinate',
  'magnesium-malate': 'Magnesium Malate',
  'probiotics': 'Probiotics (Multi-strain)',
  'vitamin-c': 'Vitamin C (Ascorbic Acid)',
  'berberine': 'Berberine',
  'coq10': 'CoQ10 (Ubiquinol)',
};

const DEEP_DIVE_TOOL = {
  name: 'generate_supplement_deep_dive',
  description: 'Generate a comprehensive, science-based deep-dive encyclopedia entry for a supplement.',
  input_schema: {
    type: 'object',
    properties: {
      whatItIs: {
        type: 'string',
        description: '2-3 sentence plain-language explanation of what the supplement is and its origin (food, synthetic, plant).'
      },
      howItWorks: {
        type: 'string',
        description: '3-5 sentence mechanism of action — name the specific pathway, receptor, or enzyme it affects and why that matters.'
      },
      dosing: {
        type: 'object',
        properties: {
          low: { type: 'string', description: 'Conservative/beginner dose with amount and unit, e.g., "1–2g".' },
          standard: { type: 'string', description: 'Typical effective dose used in most studies, e.g., "5g".' },
          high: { type: 'string', description: 'Upper research dose or advanced range, e.g., "10–20g loading phase".' },
          timing: { type: 'string', description: 'When to take it: pre/post workout, with food, time of day, etc.' }
        },
        required: ['low', 'standard', 'high', 'timing']
      },
      forms: {
        type: 'array',
        description: 'Common available forms ranked best to worst bioavailability (2-4 forms).',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Form name, e.g., "Monohydrate", "Bisglycinate".' },
            bioavailability: { type: 'string', enum: ['Excellent', 'Good', 'Fair', 'Poor'], description: 'Bioavailability rating.' },
            notes: { type: 'string', description: 'One sentence on why this form is notable.' }
          },
          required: ['name', 'bioavailability', 'notes']
        }
      },
      synergies: {
        type: 'array',
        description: 'Up to 4 supplements that combine well with this one.',
        items: {
          type: 'object',
          properties: {
            supplement: { type: 'string', description: 'Name of the synergistic supplement.' },
            reason: { type: 'string', description: 'One sentence explaining the synergistic mechanism or benefit.' }
          },
          required: ['supplement', 'reason']
        }
      },
      cautions: {
        type: 'array',
        description: 'Up to 5 important cautions, contraindications, or drug interactions as plain-language strings.',
        items: { type: 'string' }
      },
      recommendationsLink: {
        type: 'string',
        description: 'If this supplement maps to a health goal — "better sleep", "build muscle", "general health", or "energy boost" — return the exact string. Otherwise return empty string.',
      }
    },
    required: ['whatItIs', 'howItWorks', 'dosing', 'forms', 'synergies', 'cautions', 'recommendationsLink']
  }
};

async function generateDeepDive(slug) {
  const name = SLUG_TO_NAME[slug] || slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const response = await getAnthropicClient().messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    tools: [DEEP_DIVE_TOOL],
    tool_choice: { type: 'tool', name: 'generate_supplement_deep_dive' },
    messages: [{
      role: 'user',
      content: `Generate a complete, accurate, evidence-based deep-dive encyclopedia entry for: ${name}

Requirements:
- Be precise with mechanisms (name the pathway, receptor, or enzyme)
- Dose ranges must reflect what peer-reviewed studies actually used
- Forms section: list 2-4 most commercially relevant forms
- Cautions must be medically accurate (drug interactions, contraindications, who should avoid)
- Tone: knowledgeable but accessible — like a trusted sports dietitian explaining to a motivated amateur
- Do NOT use marketing language or exaggerate effects beyond the evidence

For recommendationsLink: return one of exactly these strings if applicable — "better sleep", "build muscle", "general health", "energy boost" — or an empty string if none fit well.`
    }]
  });

  const toolUse = response.content.find(b => b.type === 'tool_use');
  if (!toolUse) throw new Error('Claude did not return structured tool_use data');

  console.log(`✅ Deep dive generated for: ${slug}`);
  return toolUse.input;
}

// GET /api/encyclopedia/deep-dive/:slug
// Returns cached deep dive or generates one via Claude (30-day TTL)
app.get('/api/encyclopedia/deep-dive/:slug', async (req, res) => {
  const { slug } = req.params;
  console.log(`📖 GET /api/encyclopedia/deep-dive/${slug}`);

  try {
    // 1. Check Supabase cache
    const { data: cached, error: fetchError } = await getSupabaseService()
      .from('supplement_deep_dives')
      .select('content, expires_at')
      .eq('slug', slug)
      .maybeSingle();

    if (fetchError) throw fetchError;

    // 2. Return if cache is fresh
    if (cached && new Date(cached.expires_at) > new Date()) {
      console.log(`✅ Cache hit for: ${slug}`);
      return res.json({ success: true, data: cached.content, cached: true });
    }

    // 3. Generate with Claude
    console.log(`🤖 Cache miss — generating with Claude for: ${slug}`);
    const content = await generateDeepDive(slug);

    // 4. Upsert into Supabase (insert or overwrite expired)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error: upsertError } = await getSupabaseService()
      .from('supplement_deep_dives')
      .upsert(
        { slug, content, generated_at: new Date().toISOString(), expires_at: expiresAt },
        { onConflict: 'slug' }
      );

    if (upsertError) {
      console.error(`⚠️ Cache write failed (returning data anyway):`, upsertError);
    }

    return res.json({ success: true, data: content, cached: false });

  } catch (error) {
    console.error(`💥 Deep dive error for ${slug}:`, error);
    return res.status(500).json({ success: false, error: `Deep dive generation failed: ${error.message}` });
  }
});

// POST /api/encyclopedia/deep-dive/:slug/refresh
// Force-regenerates a deep dive (ignores TTL) — for admin/dev use
app.post('/api/encyclopedia/deep-dive/:slug/refresh', async (req, res) => {
  const { slug } = req.params;
  console.log(`🔄 POST /api/encyclopedia/deep-dive/${slug}/refresh`);

  try {
    const content = await generateDeepDive(slug);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await getSupabaseService()
      .from('supplement_deep_dives')
      .upsert(
        { slug, content, generated_at: new Date().toISOString(), expires_at: expiresAt },
        { onConflict: 'slug' }
      );

    if (error) throw error;
    return res.json({ success: true, data: content, cached: false });

  } catch (error) {
    console.error(`💥 Deep dive refresh error for ${slug}:`, error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AI Extraction API running on http://localhost:${PORT}`);
  console.log(`🌐 Available on network: http://192.168.0.31:${PORT}`);
  console.log(`📝 OpenAI API Key loaded: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
  console.log('\n📋 Available endpoints:');
  console.log('  GET  /api/health - API health check');
  console.log('  ✨ POST /api/extract-product-enhanced - Enhanced extraction (Jina + Claude) ✨');
  console.log('  POST /api/extract-product - Legacy extraction (Puppeteer + OpenAI)');
  console.log('  GET  /api/find-product-url/{barcode} - Find tillskottsbolaget.se product URL');
  console.log('  POST /api/ingest/barcode/{barcode} - Full barcode scanning pipeline + manual data merging');
  console.log('  POST /api/ingest/url - Ingest product from URL');
  console.log('  POST /api/ingest/manual - Add product manually');
  console.log('  GET  /api/product/{barcode} - Retrieve supplement by barcode');
  console.log('  POST /api/correction/{barcode} - Manual data correction');
  console.log('  GET  /api/search - Search supplements database');
  console.log('  GET  /api/stats - Database statistics');
  console.log('  🔐 GET/PUT /api/user/profile - User profile (auth required)');
  console.log('  🔐 GET/POST/DELETE /api/user/scans - Saved scans (auth required)');
  console.log('  🔐 GET/POST/DELETE /api/user/favorites - Favorites (auth required)');
  console.log('  📖 GET  /api/encyclopedia/deep-dive/:slug - AI deep dive (cached 30d)');
  console.log('  🔄 POST /api/encyclopedia/deep-dive/:slug/refresh - Force-regenerate deep dive');
  console.log('\n🎯 SupplementScanner Mobile API Ready!');
  console.log('🔑 Anthropic API Key loaded:', process.env.ANTHROPIC_API_KEY ? 'Yes ✨' : 'No (enhanced extraction disabled)');
  console.log('🗄️ Supabase:', process.env.SUPABASE_URL ? 'Configured ✨' : 'Not configured');
});