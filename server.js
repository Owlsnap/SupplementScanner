import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import Stripe from 'stripe';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import { createHmac, timingSafeEqual } from 'crypto';
import { Resend } from 'resend';

// Use system Chromium on Railway (set PUPPETEER_EXECUTABLE_PATH env var), fall back to bundled
const PUPPETEER_LAUNCH_OPTS = {
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  ...(process.env.PUPPETEER_EXECUTABLE_PATH ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH } : {})
};
import { createClient } from '@supabase/supabase-js';
import {
  SLUG_TO_NAME, FREE_DIVE_VERSION, FREE_DIVE_RETRIEVAL, FREE_DIVE_TTL_MS, PREMIUM_DIVE_VERSION,
  getResearchBase, generateFreeDive, generatePremiumDive,
} from './lib/rag.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;

// Railway (and most hosts) sit behind a reverse proxy — trust one hop so
// express-rate-limit can read X-Forwarded-For correctly.
app.set('trust proxy', 1);

// Debug environment variables
console.log('🔑 OpenAI API Key available:', !!process.env.OPENAI_API_KEY);
console.log('🚀 Starting server on port:', PORT);
console.log('🌐 SITE_URL:', process.env.SITE_URL || '(not set — defaulting to localhost)');

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
    'https://supplementscanner.io',
    'https://www.supplementscanner.io',
    'https://supplementscanner-production.up.railway.app',
  ],
  credentials: true
};

// Allow all origins in development (for mobile app on local network)
if (process.env.NODE_ENV !== 'production') {
  app.options('*path', cors());
  app.use(cors());
} else {
  // Explicitly handle OPTIONS preflight before any route matching
  app.options('*path', cors(corsOptions));
  app.use(cors(corsOptions));
}
// ── Stripe webhook (raw body required — must be before express.json) ──────────
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) return res.status(503).send('Not configured');

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('💥 Webhook signature error:', err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  const db = getSupabaseService();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription' && session.metadata?.userId) {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          await db.from('subscriptions').upsert({
            user_id: session.metadata.userId,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            plan: session.metadata.plan || 'monthly',
            status: 'active',
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'stripe_subscription_id' });
          console.log(`✅ Subscription created for user ${session.metadata.userId}`);
        } else if (session.mode === 'payment' && session.metadata?.supplementSlug) {
          const slug = session.metadata.supplementSlug;
          const sessionId = session.id;
          const email = session.customer_details?.email;
          if (email && process.env.RESEND_SECRET && process.env.RESEND_API_KEY) {
            await sendDeepDiveAccessEmail({ email, slug, sessionId });
          }
          console.log(`✅ Single dive purchased — slug: ${slug}, email: ${email || '(none)'}`);
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const isActive = sub.status === 'active' || sub.status === 'trialing';
        await db.from('subscriptions')
          .update({
            status: isActive ? 'active' : 'inactive',
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub.id);
        console.log(`✅ Subscription updated: ${sub.id} → ${sub.status}`);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await db.from('subscriptions')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id);
        console.log(`✅ Subscription cancelled: ${sub.id}`);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await db.from('subscriptions')
            .update({ status: 'inactive', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', invoice.subscription);
          console.log(`⚠️ Payment failed, subscription marked inactive: ${invoice.subscription}`);
        }
        break;
      }
    }
  } catch (err) {
    console.error('💥 Webhook DB error:', err.message);
    // Still return 200 so Stripe doesn't retry — DB errors shouldn't block Stripe
  }

  return res.json({ received: true });
});

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
// In development, accepts the token "dev-bypass" when DEV_PREMIUM_BYPASS=true
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.slice(7);

  if (process.env.NODE_ENV !== 'production' && token === 'dev-bypass') {
    req.user = { id: 'dev-user', email: 'dev@local' };
    return next();
  }

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


// GET /api/encyclopedia/deep-dive/:slug
// Returns the cached PubMed-grounded teaser or generates one via RAG (30-day TTL)
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

    // 2. Return if cache is fresh and was built by the current (grounded) generator
    if (cached && new Date(cached.expires_at) > new Date() && cached.content?.version === FREE_DIVE_VERSION && cached.content?.retrieval === FREE_DIVE_RETRIEVAL) {
      console.log(`✅ Cache hit for: ${slug}`);
      return res.json({ success: true, data: cached.content, cached: true });
    }

    // 3. Generate from retrieved PubMed abstracts
    console.log(`🤖 Cache miss — generating grounded teaser for: ${slug}`);
    const content = await generateFreeDive(slug);

    // 4. Upsert into Supabase (insert or overwrite expired)
    const expiresAt = new Date(Date.now() + FREE_DIVE_TTL_MS).toISOString();
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

// GET /api/encyclopedia/study-count/:slug
// Number of PubMed studies we hold for this supplement (a real count, read-only, no AI).
app.get('/api/encyclopedia/study-count/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const { count, error } = await getSupabaseService()
      .from('studies')
      .select('pmid', { count: 'exact', head: true })
      .contains('supplements', [slug]);

    if (error) throw error;
    return res.json({ success: true, studyCount: count ?? null });
  } catch (error) {
    console.error(`💥 study-count error for ${slug}:`, error);
    return res.status(500).json({ success: false, studyCount: null });
  }
});

// POST /api/encyclopedia/deep-dive/:slug/refresh
// Force-regenerates a deep dive (ignores TTL) — for admin/dev use
app.post('/api/encyclopedia/deep-dive/:slug/refresh', async (req, res) => {
  const { slug } = req.params;
  console.log(`🔄 POST /api/encyclopedia/deep-dive/${slug}/refresh`);

  try {
    const content = await generateFreeDive(slug);
    const expiresAt = new Date(Date.now() + FREE_DIVE_TTL_MS).toISOString();

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

// ====== PREMIUM ENDPOINTS ======

// POST /api/premium/deep-dive/:slug
// Accepts either a Bearer JWT (premium subscriber) or a verified Stripe session ID
async function requirePremiumAccess(req, res, next) {
  // 1. Stripe single-dive session (no auth required)
  const stripeSessionId = req.headers['x-stripe-session'];
  if (stripeSessionId && stripe) {
    try {
      const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
      if (session.payment_status === 'paid') {
        req.user = { id: `stripe:${stripeSessionId}`, stripeSessionSlug: session.metadata?.supplementSlug || null };
        return next();
      }
    } catch (_) { /* fall through */ }
  }

  // 2. Authenticate via JWT, then verify subscription or tester status
  return requireAuth(req, res, async () => {
    // Dev-bypass token — granted full premium access in non-production
    if (req.user.id === 'dev-user') return next();

    try {
      const db = getSupabaseService();

      // Beta tester — full premium access
      const { data: tester } = await db
        .from('beta_testers')
        .select('email')
        .eq('email', req.user.email)
        .maybeSingle();
      if (tester) return next();

      // Active subscription
      const { data: sub } = await db
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('user_id', req.user.id)
        .eq('status', 'active')
        .gt('current_period_end', new Date().toISOString())
        .maybeSingle();
      if (sub) return next();

      return res.status(403).json({ success: false, error: 'Premium subscription required' });
    } catch (err) {
      console.error('💥 Premium access check error:', err.message);
      return res.status(500).json({ success: false, error: 'Access check failed' });
    }
  });
}

// RAG-grounded deep dive — premium subscriber or paid single session
app.post('/api/premium/deep-dive/:slug', requirePremiumAccess, async (req, res) => {
  const { slug } = req.params;
  const { question } = req.body;
  console.log(`💎 POST /api/premium/deep-dive/${slug} user=${req.user.id}`);

  // Stripe single-dive sessions are scoped to the purchased supplement
  if (req.user.stripeSessionSlug && req.user.stripeSessionSlug !== slug) {
    return res.status(403).json({ success: false, error: 'This session is not valid for this supplement' });
  }

  // Only the no-question "open" call is cached — each asked question is a
  // distinct query, but reopening the same deep dive should never re-run
  // embeddings + GPT-4o generation for something already paid for and seen.
  const db = getSupabaseService();
  if (!question) {
    try {
      const { data: cached } = await db
        .from('premium_deep_dives')
        .select('data')
        .eq('user_id', req.user.id)
        .eq('slug', slug)
        .maybeSingle();
      if (cached?.data?.version === PREMIUM_DIVE_VERSION) {
        // Research base is looked up fresh so counts refreshed by the ingest show up immediately
        const research_base = await getResearchBase(slug);
        return res.json({
          success: true, cached: true,
          data: { ...cached.data, research_base, confidence_score: research_base?.score ?? null },
        });
      }
    } catch (err) {
      console.error(`💥 Premium deep dive cache read error for ${slug}:`, err.message);
      // Fall through to regeneration — a cache miss/error should never block access.
    }
  }

  try {
    // Research base: size of the PubMed literature, not just the 5 retrieved sources
    const [dive, research_base] = await Promise.all([generatePremiumDive(slug, question), getResearchBase(slug)]);
    // confidence_score is a legacy field for app builds that predate research_base
    const resultData = { ...dive, research_base, confidence_score: research_base?.score ?? null };

    if (!question) {
      try {
        await db.from('premium_deep_dives').upsert(
          { user_id: req.user.id, slug, data: resultData, generated_at: new Date().toISOString() },
          { onConflict: 'user_id,slug' }
        );
      } catch (err) {
        console.error(`💥 Premium deep dive cache write error for ${slug}:`, err.message);
        // Non-fatal — the user still gets their freshly generated result this request.
      }
    }

    return res.json({ success: true, cached: false, data: resultData });

  } catch (error) {
    console.error(`💥 Premium deep dive error for ${slug}:`, error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/premium/interactions/:slug
// Returns all interactions for a supplement (danger + caution + synergy)
app.get('/api/premium/interactions/:slug', requirePremiumAccess, async (req, res) => {
  const { slug } = req.params;
  console.log(`💎 GET /api/premium/interactions/${slug} user=${req.user.id}`);

  try {
    const { data, error } = await getSupabaseService()
      .from('interactions')
      .select('*')
      .or(`substance_a.eq.${slug},substance_b.eq.${slug}`)
      .order('severity');

    if (error) throw error;

    // Normalise so the queried supplement is always substance_a
    const normalised = (data || []).map(row => ({
      ...row,
      substance_a: slug,
      substance_b: row.substance_a === slug ? row.substance_b : row.substance_a,
    }));

    return res.json({ success: true, data: normalised });

  } catch (error) {
    console.error(`💥 Interactions error for ${slug}:`, error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

const STACK_INSIGHTS_TOOL = {
  name: 'analyze_supplement_stack',
  description: 'Analyze a supplement stack and return a daily schedule, redundancy warnings, and missing complements.',
  input_schema: {
    type: 'object',
    properties: {
      schedule: {
        type: 'array',
        description: 'Daily timing schedule — group each supplement into the most appropriate time slot. Every supplement in the stack must appear in exactly one slot. Only include slots that have at least one supplement.',
        items: {
          type: 'object',
          properties: {
            time_of_day: {
              type: 'string',
              enum: ['morning', 'pre-workout', 'with-meal', 'afternoon', 'evening', 'before-bed'],
              description: 'The time slot for this group of supplements',
            },
            supplements: {
              type: 'array',
              items: { type: 'string' },
              description: 'Supplement names assigned to this time slot',
            },
            note: {
              type: 'string',
              description: 'Optional one-sentence reason why this timing is optimal (e.g. absorption, half-life, sleep support)',
            },
          },
          required: ['time_of_day', 'supplements'],
        },
      },
      redundancies: {
        type: 'array',
        description: 'Supplements in the stack that overlap meaningfully (same nutrient, duplicate mechanism, or risk of over-supplementation).',
        items: {
          type: 'object',
          properties: {
            supplements: { type: 'array', items: { type: 'string' }, description: 'Names of the overlapping supplements' },
            note: { type: 'string', description: 'Why this is redundant and what to watch for (1-2 sentences)' },
          },
          required: ['supplements', 'note'],
        },
      },
      missing_complements: {
        type: 'array',
        description: 'Up to 3 supplements not in the stack that would meaningfully improve it.',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Supplement name' },
            slug: { type: 'string', description: 'URL slug for this supplement using kebab-case (e.g. vitamin-d3-k2, omega-3, magnesium-glycinate). Use null if unsure.' },
            reason: { type: 'string', description: 'Why it complements this stack (1-2 sentences)' },
          },
          required: ['name', 'slug', 'reason'],
        },
      },
    },
    required: ['schedule', 'redundancies', 'missing_complements'],
  },
};

const KNOWN_SLUGS = Object.keys(SLUG_TO_NAME);

async function generateStackInsights(slugs) {
  const names = slugs.map(s => SLUG_TO_NAME[s] || s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
  const stackList = names.join(', ');
  const knownSlugList = KNOWN_SLUGS.join(', ');

  const response = await getAnthropicClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    tools: [STACK_INSIGHTS_TOOL],
    tool_choice: { type: 'tool', name: 'analyze_supplement_stack' },
    messages: [{
      role: 'user',
      content: `Analyze this supplement stack: ${stackList}.\n\nProvide:\n1. Schedule — assign every supplement to exactly one time slot (morning, pre-workout, with-meal, afternoon, evening, before-bed). Base assignments on absorption science, half-life, and known best practices. Add a brief note per slot explaining why. Only include slots that have supplements.\n2. Redundancies — flag any meaningful overlaps (same nutrient from multiple sources, duplicate mechanisms, over-supplementation risk). Only flag real overlaps.\n3. Missing complements — up to 3 supplements not already in the stack that would meaningfully improve it. For each, provide a slug from this list if it appears there (otherwise use null): ${knownSlugList}\n\nKeep all text concise and stick to well-established practice.`,
    }],
  });

  const toolUse = response.content.find(b => b.type === 'tool_use');
  if (!toolUse) return { schedule: [], redundancies: [], missing_complements: [] };

  const result = toolUse.input;
  // Not retrieval-grounded: this is general model guidance, labelled as such (insights_basis) in
  // the API response and the UI, unlike the source-cited interaction rows.
  // Validate complement slugs — null out any slug Claude invented that isn't in our encyclopedia
  if (Array.isArray(result.missing_complements)) {
    result.missing_complements = result.missing_complements.map(c => ({
      ...c,
      slug: KNOWN_SLUGS.includes(c.slug) ? c.slug : null,
    }));
  }
  return result;
}

// POST /api/premium/evaluate-stack
// Returns all interactions between supplements in the provided slug list
app.post('/api/premium/evaluate-stack', requirePremiumAccess, async (req, res) => {
  const { slugs } = req.body;
  console.log(`💎 POST /api/premium/evaluate-stack user=${req.user.id} slugs=[${(slugs || []).join(',')}]`);

  const emptyInsights = { schedule: [], redundancies: [], missing_complements: [] };

  if (!Array.isArray(slugs) || slugs.length < 2) {
    return res.json({ success: true, data: { interactions: [], by_severity: { danger: [], caution: [], synergy: [] }, ...emptyInsights } });
  }

  try {
    const [interactionsResult, insights] = await Promise.all([
      getSupabaseService()
        .from('interactions')
        .select('*')
        .in('substance_a', slugs)
        .in('substance_b', slugs)
        .order('severity'),
      generateStackInsights(slugs).catch(err => {
        console.error('💥 Stack insights generation error:', err);
        return emptyInsights;
      }),
    ]);

    if (interactionsResult.error) throw interactionsResult.error;

    const interactions = interactionsResult.data || [];
    const by_severity = {
      danger: interactions.filter(i => i.severity === 'danger'),
      caution: interactions.filter(i => i.severity === 'caution'),
      synergy: interactions.filter(i => i.severity === 'synergy'),
    };

    return res.json({ success: true, data: { interactions, by_severity, ...insights, insights_basis: 'general_guidance' } });
  } catch (error) {
    console.error('💥 Evaluate stack error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ── Stripe / Payment ──────────────────────────────────────────────────────────

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null;

const SITE_URL = (process.env.SITE_URL || 'http://localhost:5173').trim();

// POST /api/payment/create-checkout
// Creates a Stripe Checkout session for a single deep dive purchase.
// Swish is offered first (SEK), card accepted as fallback.
app.post('/api/payment/create-checkout', async (req, res) => {
  if (!stripe) return res.status(503).json({ success: false, error: 'Payment not configured' });

  const { supplementSlug, successUrl: successUrlOverride, cancelUrl: cancelUrlOverride } = req.body;

  // Mobile passes an app deep link so expo-web-browser can detect completion;
  // web falls back to the site's premium-deep-dive page.
  const successUrl = successUrlOverride || (supplementSlug
    ? `${SITE_URL}/encyclopedia/${supplementSlug}/premium-deep-dive?dive_paid=1&session_id={CHECKOUT_SESSION_ID}`
    : `${SITE_URL}/premium`);
  const cancelUrl = cancelUrlOverride || (supplementSlug
    ? `${SITE_URL}/encyclopedia/${supplementSlug}`
    : `${SITE_URL}/premium`);

  console.log('🛒 Creating checkout — slug:', supplementSlug, '| success_url:', successUrl);

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Research Deep Dive',
            description: 'Full evidence-grounded deep dive on one supplement — dosing, forms, synergies, cited sources.',
          },
          unit_amount: 199, // $1.99 USD
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { supplementSlug: supplementSlug || '' },
    });

    return res.json({ success: true, url: session.url });
  } catch (err) {
    console.error('💥 Stripe checkout error:', err.message, '| param:', err.param, '| raw:', JSON.stringify(err.raw));
    return res.status(500).json({ success: false, error: err.message, param: err.param });
  }
});

// GET /api/payment/verify-session?id=<sessionId>
// Called after redirect from Stripe to confirm the session is paid.
app.get('/api/payment/verify-session', async (req, res) => {
  if (!stripe) return res.status(503).json({ success: false, error: 'Payment not configured' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'Missing session id' });

  try {
    const session = await stripe.checkout.sessions.retrieve(id);
    const paid = session.payment_status === 'paid';
    return res.json({ success: true, paid, supplementSlug: session.metadata?.supplementSlug || null });
  } catch (err) {
    console.error('💥 Stripe verify error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── Resend helpers ────────────────────────────────────────────────────────────

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function generateAccessToken(sessionId, slug) {
  return createHmac('sha256', process.env.RESEND_SECRET || '')
    .update(sessionId + slug)
    .digest('hex');
}

async function sendDeepDiveAccessEmail({ email, slug, sessionId }) {
  if (!resend) return;
  const token = generateAccessToken(sessionId, slug);
  const supplementName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const accessUrl = `${SITE_URL}/deep-dive/access?token=${token}&slug=${slug}&session=${sessionId}`;

  await resend.emails.send({
    from: 'SupplementScanner <noreply@supplementscanner.io>',
    to: email,
    subject: `Your ${supplementName} deep dive — bookmark this link`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:2rem 1.5rem;color:#171d1c">
        <h1 style="font-family:Manrope,sans-serif;font-size:1.375rem;font-weight:800;color:#00685f;margin:0 0 0.5rem">
          Your ${supplementName} Research Deep Dive
        </h1>
        <p style="color:#3d4947;line-height:1.65;margin:0 0 1.5rem">
          Thanks for your purchase. Bookmark the link below to re-access your deep dive from any device at any time — no account needed.
        </p>
        <a href="${accessUrl}"
           style="display:inline-block;background:#00685f;color:#fff;text-decoration:none;
                  padding:0.75rem 1.5rem;border-radius:28px;font-weight:600;font-size:0.9375rem">
          Open My Deep Dive →
        </a>
        <p style="color:#6d7a77;font-size:0.8125rem;line-height:1.6;margin:1.5rem 0 0">
          If the button doesn't work, copy and paste this URL:<br>
          <span style="color:#00685f;word-break:break-all">${accessUrl}</span>
        </p>
        <hr style="border:none;border-top:1px solid #e4e9e7;margin:1.5rem 0">
        <p style="color:#6d7a77;font-size:0.75rem;margin:0">
          Questions? Email us at <a href="mailto:supplementscanner.io@gmail.com" style="color:#00685f">supplementscanner.io@gmail.com</a>
        </p>
      </div>
    `,
  });
  console.log(`📧 Access email sent to ${email} for slug: ${slug}`);
}

// GET /api/payment/verify-access-token?token=<token>&slug=<slug>&session=<sessionId>
// Validates a permanent re-access token generated at purchase time.
app.get('/api/payment/verify-access-token', (req, res) => {
  const { token, slug, session: sessionId } = req.query;
  if (!token || !slug || !sessionId) {
    return res.status(400).json({ success: false, error: 'Missing token, slug, or session' });
  }
  if (!process.env.RESEND_SECRET) {
    return res.status(503).json({ success: false, error: 'Not configured' });
  }

  const expected = generateAccessToken(sessionId, slug);
  let valid = false;
  try {
    valid = timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    valid = false;
  }

  if (!valid) return res.json({ success: true, valid: false });
  return res.json({ success: true, valid: true, sessionId, slug });
});

// POST /api/payment/create-subscription-checkout
// Creates a Stripe Checkout session for monthly or yearly subscription.
app.post('/api/payment/create-subscription-checkout', requireAuth, async (req, res) => {
  if (!stripe) return res.status(503).json({ success: false, error: 'Payment not configured' });

  const { plan, successUrl, cancelUrl } = req.body;
  const priceId = plan === 'yearly'
    ? process.env.STRIPE_PRICE_ID_YEARLY
    : process.env.STRIPE_PRICE_ID_MONTHLY;

  if (!priceId) return res.status(503).json({ success: false, error: `Price ID for '${plan}' not configured` });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: req.user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      // Mobile passes an app deep link so expo-web-browser can detect completion;
      // web falls back to the site's premium page.
      success_url: successUrl || `${SITE_URL}/premium?subscribed=1`,
      cancel_url: cancelUrl || `${SITE_URL}/premium`,
      metadata: { userId: req.user.id, plan },
    });
    return res.json({ success: true, url: session.url });
  } catch (err) {
    console.error('💥 Subscription checkout error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/payment/create-portal-session
// Returns a Stripe Customer Portal URL so subscribers can manage/cancel.
app.post('/api/payment/create-portal-session', requireAuth, async (req, res) => {
  if (!stripe) return res.status(503).json({ success: false, error: 'Payment not configured' });

  try {
    const db = getSupabaseService();
    const { data: sub } = await db
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!sub?.stripe_customer_id) {
      return res.status(404).json({ success: false, error: 'No active subscription found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${SITE_URL}/profile`,
    });

    return res.json({ success: true, url: session.url });
  } catch (err) {
    console.error('💥 Portal session error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── Serve Vite frontend build (must be after all API routes) ──────────────────
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = join(__dirname, 'dist');

if (existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA catch-all — serve index.html for any non-API route
  app.get('*path', (req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

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