// API endpoint for extracting product information with multi-layer extraction system
// You'll need to install: npm install openai puppeteer

import OpenAI from 'openai';
import puppeteer from 'puppeteer';
import { SwedishSupplementScraper } from '../src/scraper/scraper.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize the scraper system
const scraper = new SwedishSupplementScraper();

// Import our new multi-layer extraction system (server-side only)
let extractSupplementData, completeWithUserInput, getExtractionSummary;

// Dynamically import the extraction system to avoid client-side issues
async function loadExtractionSystem() {
  if (!extractSupplementData) {
    try {
      const extractionModule = await import('../src/extraction/multiLayerExtractor.js');
      extractSupplementData = extractionModule.extractSupplementData;
      completeWithUserInput = extractionModule.completeWithUserInput; 
      getExtractionSummary = extractionModule.getExtractionSummary;
      console.log('✅ Multi-layer extraction system loaded');
    } catch (error) {
      console.error('❌ Failed to load extraction system:', error);
      console.log('🔄 Falling back to legacy extraction only');
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, method = 'hybrid', userInput = null } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    console.log(`🚀 Starting extraction with method: ${method}`);

    // Load the extraction system
    await loadExtractionSystem();

    // If user provided input to complete a previous extraction
    if (userInput && method === 'complete') {
      return handleUserInputCompletion(req, res);
    }

    // Choose extraction method based on availability
    if ((method === 'multi-layer' || method === 'hybrid') && extractSupplementData) {
      return await handleMultiLayerExtraction(url, res, method === 'hybrid');
    } else {
      console.log('🔄 Using legacy extraction method');
      return await handleLegacyExtraction(url, res);
    }

  } catch (error) {
    console.error('💥 Extraction error:', error);
    res.status(500).json({ 
      error: 'Extraction failed', 
      details: error.message 
    });
  }
}

/**
 * Handle multi-layer extraction method
 */
async function handleMultiLayerExtraction(url, res, useHybrid = false) {
  console.log('📦 Starting multi-layer extraction...');
  
  try {
    // Get HTML content using puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Get the full HTML content
    const htmlContent = await page.content();
    
    await browser.close();

    console.log(`📄 HTML content extracted: ${htmlContent.length} characters`);

    // Use the multi-layer extraction system
    const extractionResult = await extractSupplementData(htmlContent, url);
    
    if (extractionResult.success) {
      console.log('✅ Multi-layer extraction successful');
      
      return res.status(200).json({
        success: true,
        data: extractionResult.data,
        extraction_method: 'multi-layer',
        metadata: extractionResult.metadata,
        summary: getExtractionSummary(extractionResult)
      });
    } else {
      console.log('⚠️ Multi-layer extraction partial - user input needed');
      
      // If hybrid mode and multi-layer failed, try legacy
      if (useHybrid && extractionResult.metadata.layers_completed < 3) {
        console.log('🔄 Falling back to legacy vision method...');
        return await handleLegacyExtraction(url, res);
      }
      
      return res.status(206).json({
        success: false,
        partial_data: extractionResult.data,
        missing_fields: extractionResult.metadata.missing_fields || [],
        user_input_needed: extractionResult.metadata.user_input_needed || [],
        extraction_method: 'multi-layer-partial',
        metadata: extractionResult.metadata,
        summary: getExtractionSummary(extractionResult)
      });
    }
    
  } catch (error) {
    console.error('💥 Multi-layer extraction failed:', error);
    
    if (useHybrid) {
      console.log('🔄 Hybrid mode: Falling back to legacy vision method...');
      return await handleLegacyExtraction(url, res);
    }
    
    throw error;
  }
}

/**
 * Handle user input completion
 */
async function handleUserInputCompletion(req, res) {
  const { partialResult, userInput } = req.body;
  
  if (!partialResult || !userInput) {
    return res.status(400).json({ 
      error: 'Partial result and user input are required' 
    });
  }

  try {
    const completedResult = completeWithUserInput(partialResult, userInput);
    
    return res.status(200).json({
      success: true,
      data: completedResult.data,
      extraction_method: 'multi-layer-completed',
      metadata: completedResult.metadata,
      summary: getExtractionSummary(completedResult)
    });
    
  } catch (error) {
    console.error('💥 User input completion failed:', error);
    throw error;
  }
}

/**
 * Handle legacy vision-based extraction
 */
async function handleLegacyExtraction(url, res) {
    // Get site-specific configuration
    const { prompt: sitePrompt, siteConfig } = scraper.generateExtractionPrompt(url);
    const browserConfig = scraper.getBrowserConfig(url);
    
    console.log(`🌐 Extracting from ${siteConfig.siteName} with site-specific configuration`);

    // Launch browser and take screenshot
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Apply site-specific browser config
    await page.setViewport(browserConfig.viewport);
    await page.setUserAgent(browserConfig.userAgent);
    await page.setExtraHTTPHeaders(browserConfig.extraHeaders);
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait according to site config
    await page.waitFor(browserConfig.waitTime);
        
    // Try to click on site-specific target sections
    try {
      const targetSections = browserConfig.targetSections || [];
      
      for (const selector of targetSections) {
        try {
          const element = await page.$(selector);
          if (element) {
            const isVisible = await page.evaluate(el => {
              return el.offsetParent !== null;
            }, element);
            
            if (isVisible) {
              console.log(`🔽 Clicking on section: ${selector} for ${siteConfig.siteName}`);
              await element.click();
              await page.waitFor(1000);
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }
    } catch (e) {
      console.log('Target section interaction failed, continuing...');
    }
    
    // Get page text for validation
    const pageText = await page.evaluate(() => document.body.innerText);
    
    // Take a full page screenshot
    const screenshot = await page.screenshot({ 
      fullPage: true,
      timeout: 10000
    });
    
    await browser.close();

    // Convert screenshot to base64
    const base64Image = screenshot.toString('base64');

    // Use site-specific prompt for extraction
    console.log(`📋 Using site-specific prompt for ${siteConfig.siteName}`);
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: sitePrompt
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
      max_tokens: 800
    });

    const extractedText = response.choices[0].message.content;
    console.log(`🤖 AI Response for ${siteConfig.siteName}:`, extractedText);
    
    try {
      // Clean the response
      let cleanedText = extractedText.trim();
      
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const productInfo = JSON.parse(cleanedText);
      
      // Validate extraction using site-specific rules
      const validation = scraper.validateExtraction(productInfo, url, pageText);
      
      console.log(`✅ Validation result for ${siteConfig.siteName}:`, {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        priceVerification: validation.priceVerification
      });
      
      return res.status(200).json({
        success: true,
        siteName: siteConfig.siteName,
        validation: validation,
        extraction_method: 'legacy-vision',
        ...validation.cleanedData
      });
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.log('Raw AI Response:', extractedText);
      return res.status(500).json({
        success: false,
        error: 'Failed to parse AI response',
        details: parseError.message,
        raw_response: extractedText,
        extraction_method: 'legacy-vision'
      });
    }
}