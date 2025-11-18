// API endpoint for extracting product information
// You'll need to install: npm install openai puppeteer

import OpenAI from 'openai';
import puppeteer from 'puppeteer';
import { SwedishSupplementScraper } from '../src/scraper/scraper.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize the scraper system
const scraper = new SwedishSupplementScraper();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
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
        ...validation.cleanedData
      });
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.log('Raw AI Response:', extractedText);
      return res.status(500).json({
        success: false,
        error: 'Could not parse AI response - please try a different supplement product page'
      });
    }

  } catch (error) {
    console.error('Extraction error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to extract product information'
    });
  }
}