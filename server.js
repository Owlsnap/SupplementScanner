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

app.use(cors());
app.use(express.json());

// Site-specific extraction rules
function getSiteSpecificRules(url) {
  const hostname = new URL(url).hostname.toLowerCase();
  
  // Define rules for different websites
  if (hostname.includes('proteinbolaget')) {
    return {
      siteName: 'Proteinbolaget',
      priceSelectors: ['.price-current', '.product-price', '[data-testid="price"]'],
      quantitySelectors: ['.product-weight', '.size-info', '[class*="vikt"]'],
      pricePattern: /(\d{2,4})\s*kr/i,
      specialInstructions: 'PRICE: Look for span.PrisREA with text color #FF7043, next to crossed out prices or span.PrisBOLD with text color: #414141. QUANTITY: Keep original units - if "1kg" use quantity "1" and unit "kg", if "750g" use quantity "750" and unit "g", if "60 capsules" use quantity "60" and unit "capsules".'
    };
  }
  
  if (hostname.includes('tillskottsbolaget')) {
    return {
      siteName: 'Tillskottsbolaget', 
      priceSelectors: ['.price', '.current-price', '[class*="pris"]'],
      quantitySelectors: ['.product-size', '.weight', '[class*="storlek"]', 'h1'],
      pricePattern: /(\d{2,4})\s*(kr|:-)/i,
      specialInstructions: 'PRICE: Look for span.PrisREA with text color #A61513 and "fr." before the price, next to crossed out prices or span.PrisBOLD with text color: ##0F091C. QUANTITY: Keep original units - if "1kg" use quantity "1" and unit "kg", if "750g" use quantity "750" and unit "g", if "30 servings" use quantity "30" and unit "servings".'
    };
  }
  
  if (hostname.includes('gymgrossisten')) {
    return {
      siteName: 'Gymgrossisten',
      priceSelectors: ['.product-price', '.price-box', '.current-price'],
      quantitySelectors: ['.product-details', '.size-selector', '[class*="vikt"]'],
      pricePattern: /(\d{2,4})\s*kr/i,
      specialInstructions: 'PRICE: Look for div.price-adjusted with color #cd0000, usually next to or above a crossed-out original price. Also look for div.price-sales with text color #000000. QUANTITY: Keep original units - if "1kg" use quantity "1" and unit "kg", if "500g" use quantity "500" and unit "g", if "120 tablets" use quantity "120" and unit "tablets".'
    };
  }
  


  if (hostname.includes('tyngre')) {
    return {
      siteName: 'Tyngre',
      priceSelectors: ['.css-1po23rs', '.css-pfatic', '[class*="price"]'],
      quantitySelectors: ['h1', '.product-title', '[class*="size"]', '[class*="weight"]'],
      pricePattern: /(\d{2,4})\s*(kr|sek|€|\$|:-)/i,
      specialInstructions: 'PRICE: Look for element with class css-1po23rs and text color #AA2E25 (red sale price) next to crossed out price, or p.css-pfatic with text color #1D1D1D (regular price). Ignore URL numbers like "3662p.html". QUANTITY: Keep original units - if "1kg" use quantity "1" and unit "kg", if "900g" use quantity "900" and unit "g", if "90 capsules" use quantity "90" and unit "capsules".'
    };
  }
  
  if (hostname.includes('bodylab')) {
    return {
      siteName: 'Bodylab',
      priceSelectors: ['[itemprop="price"]', '[data-price]', '[class*="Prices_Custom_DIV"]', '.price-current', '.sale-price', '[class*="price"]'],
      quantitySelectors: ['[itemprop="weight"]', 'h1', '.product-title', '[class*="size"]', '[class*="weight"]', '.product-subtitle'],
      pricePattern: /(\d{2,4})[,.]?(\d{0,2})\s*(kr|sek|€|\$)/i,
      specialInstructions: 'PRICE: PRIORITY 1: Look for span with itemprop="price" and extract value from content="X.XX" attribute (e.g., content="299.00" means price is "299"). PRIORITY 2: Look for span with itemprop="price" and data-unitprice attribute. PRIORITY 3: Look for div with class containing "Prices_Custom_DIV". The correct price format is like <span content="299.00" itemprop="price">299,00</span> - extract "299" from the content attribute. CRITICAL: Ignore URL numbers like "663p.html" and ignore any prices like "169" that might be old/crossed out prices. QUANTITY: Look for itemprop="weight" first, then in product title. Keep original units - if "500g" use quantity "500" and unit "g", if "1kg" use quantity "1" and unit "kg", if "60 capsules" use quantity "60" and unit "capsules".'
    };
  }

  // Default rules for unknown sites
  return {
    siteName: 'Generic',
    priceSelectors: ['.price', '[class*="price"]', '[data-testid*="price"]'],
    quantitySelectors: ['h1', '.product-title', '[class*="size"]', '[class*="weight"]'],
    pricePattern: /(\d{2,4})\s*(kr|sek|€|\$|:-)/i,
    specialInstructions: 'PRICE: Find the main product price that customers pay. Ignore URL numbers. QUANTITY: Keep original units - if "500g" use quantity "500" and unit "g", if "1kg" use quantity "1" and unit "kg", if "60 capsules" use quantity "60" and unit "capsules", if "30 servings" use quantity "30" and unit "servings".'
  };
}

// Simple health check
app.get('/', (req, res) => {
  res.json({ message: 'AI Product Extraction API is running!' });
});

// Product extraction endpoint
app.post('/api/extract-product', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  console.log('Extracting product info from:', url);

  // Get site-specific extraction rules
  const siteRules = getSiteSpecificRules(url);
  console.log('Using site rules for:', siteRules.siteName);

  try {
    console.log('🚀 Launching browser...');
    // Launch browser and get page text (cheaper than Vision API)
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
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    });
    
    // Wait longer for Swedish sites
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    // Extract text content from the page
    const pageText = await page.evaluate((siteRules) => {
      // Remove script and style elements
      const scripts = document.querySelectorAll('script, style, noscript');
      scripts.forEach(el => el.remove());
      
      // Get site-specific selectors (passed from server)
      const sitePriceSelectors = siteRules.priceSelectors || [];
      const siteQuantitySelectors = siteRules.quantitySelectors || [];
      
      // Combine site-specific and general selectors
      const selectors = [
        // Site-specific selectors first (highest priority)
        ...sitePriceSelectors,
        ...siteQuantitySelectors,
        // General price selectors
        '[class*="current"]', '[class*="sale"]', '[class*="discount"]', '[class*="special"]',
        '[data-testid*="price"]', '.price', '[class*="price"]', '[id*="price"]',
        '[class*="pris"]', '[class*="rea"]', '[class*="nu"]',
        // Product info
        '.product-title', '.product-name', 'h1', 'h2',
        '[class*="weight"]', '[class*="size"]', '[class*="amount"]',
        '.product-info', '.product-description', '[class*="product"]',
        // Swedish-specific selectors
        '[class*="vikt"]', '[class*="storlek"]'
      ];
      
      let content = '';
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          // For itemprop="price" elements, prioritize content attribute
          if (el.getAttribute('itemprop') === 'price') {
            const contentAttr = el.getAttribute('content');
            const dataUnitPrice = el.getAttribute('data-unitprice');
            if (contentAttr) {
              content += `MAIN_PRICE_CONTENT_ATTR: ${contentAttr} | `;
            }
            if (dataUnitPrice) {
              content += `MAIN_PRICE_DATA_ATTR: ${dataUnitPrice} | `;
            }
          }
          
          if (el.innerText && el.innerText.trim()) {
            content += el.innerText.trim() + ' | ';
          }
        });
      });
      
      // Fallback to body text if specific selectors don't work
      if (content.length < 150) {
        const bodyText = document.body.innerText || '';
        // Extract lines that might contain price/product info
        const lines = bodyText.split('\n').filter(line => 
          line.length > 5 && line.length < 200 && (
            /\d/.test(line) || // contains numbers
            /kr|sek|€|\$|pound|gram|kilogram|liter|ml|g|kg|l/i.test(line) || // contains units/currency
            /solid|whey|protein|supplement|nutrition/i.test(line) // contains product keywords
          )
        );
        content = lines.slice(0, 20).join(' | ');
      }
      
      return content.substring(0, 4000); // Increased limit
    }, siteRules);
    
    await browser.close();

    console.log('Extracted text length:', pageText.length);
    console.log('Price-related text sample:', pageText.split('|').filter(line => 
      /\d+\s*(kr|sek|€|\$|:-|pris|price)/i.test(line)
    ).slice(0, 10).join(' | '));

    // Use OpenAI to extract structured data
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "user",
        content: `You are extracting product information from ${siteRules.siteName} (${url}). Analyze this text and find the MAIN PRODUCT PRICE that a customer would pay.

SITE-SPECIFIC INSTRUCTIONS: ${siteRules.specialInstructions}

TEXT TO ANALYZE:
${pageText}

Look for the primary purchase price (usually 2-3 digits for supplements). Examples of what to look for:
- "199 kr" → extract "199"
- "299:-" → extract "299" 
- "Pris: 249 kr" → extract "249"
- "149 SEK or 149,00 SEK" → extract "149"

Return exactly this format (no other text):
{
  "name": "product name here",
  "price": "complete numeric price only (remove currency symbols)",
  "quantity": "numeric quantity in original unit", 
  "unit": "original unit (g, kg, ml, capsules, tablets, servings, etc.)"
}

Examples:
- "Whey Protein 1kg for 249kr" → {"name": "Whey Protein", "price": "249", "quantity": "1", "unit": "kg"}
- "Creatine 500g for 150kr" → {"name": "Creatine", "price": "150", "quantity": "500", "unit": "g"}
- "Omega-3 60 capsules for 199kr" → {"name": "Omega-3", "price": "199", "quantity": "60", "unit": "capsules"}
- "Vitamin D3 100 tablets for 89kr" → {"name": "Vitamin D3", "price": "89", "quantity": "100", "unit": "tablets"}

CRITICAL PRICE RULES:
- ⚠️  NEVER USE NUMBERS FROM THE URL! URLs like "clear-whey-3662p.html" contain product IDs, NOT prices
- Find the MAIN PRICE that a customer would pay to buy this product right now
- Look for the most prominent price display (usually largest font, most visible)
- If there are multiple prices, choose the CURRENT price (what customer pays), not old/crossed-out prices
- Look for price with different color near crossed-out prices or "old price" labels
- Common price patterns: "199 kr", "199:-", "199 SEK", "Price: 199"
- Ignore partial prices like "99" if the full price is "199" 
- Ignore shipping costs, membership prices, or "from" prices
- Price should be a complete number (remove kr, SEK, $, €, :- etc.)
- Double-check: does this price make sense for a supplement product? (usually 50-500+ kr)
- ⚠️  If you find a 4-digit number like "3662", check if it's from URL - if so, ignore it!

OTHER RULES:
- Extract only the main product being sold
- Look for Swedish terms: "pris" (price), "vikt" (weight), "storlek" (size)
- CRITICAL: PRESERVE original units exactly as they appear:
  * "1kg" → quantity: "1", unit: "kg"
  * "2.5kg" → quantity: "2.5", unit: "kg" 
  * "750g" → quantity: "750", unit: "g"
  * "500ml" → quantity: "500", unit: "ml"
  * "60 capsules" → quantity: "60", unit: "capsules"
  * "100 tablets" → quantity: "100", unit: "tablets"
  * "30 servings" → quantity: "30", unit: "servings"
- Keep units as they appear on the product page for accurate comparison
- Common supplement units: g, kg, ml, capsules, tablets, servings, doses, scoops
- If information is unclear, make reasonable assumptions based on context
- Return ONLY the JSON object, nothing else`
      }],
      max_tokens: 200,
      temperature: 0.1
    });

    const aiResponse = response.choices[0].message.content.trim();
    console.log('AI Response:', aiResponse);

    try {
      const productInfo = JSON.parse(aiResponse);
      
      // Validate the response has expected fields
      const validResponse = {
        name: productInfo.name || '',
        price: productInfo.price || '',
        quantity: productInfo.quantity || '',
        unit: productInfo.unit || 'g'
      };

      console.log('Extracted product info:', validResponse);

      return res.json({
        success: true,
        ...validResponse
      });

    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('AI Response was:', aiResponse);
      
      return res.status(500).json({
        success: false,
        error: 'Could not parse AI response. The page might be too complex or blocked.'
      });
    }

  } catch (error) {
    console.error('❌ Extraction error details:', {
      message: error.message,
      stack: error.stack,
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

app.listen(PORT, () => {
  console.log(`🚀 AI Extraction API running on http://localhost:${PORT}`);
  console.log(`📝 OpenAI API Key loaded: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
});