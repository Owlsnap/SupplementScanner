# AI Product Info Extraction Setup

# What to do, train ai to find discounted prices, give conditions to look for depending on which url/site is used

## What I've Added

1. **URL Input Field**: Each product card now has a URL input where users can paste product links
2. **AI Extract Button**: Analyzes the webpage and fills out product info automatically
3. **Backend API**: Uses OpenAI Vision API to extract product data from screenshots

## Installation Steps

### 1. Install Dependencies
```bash
npm install openai playwright
```

### 2. Get OpenAI API Key
1. **Go to**: https://platform.openai.com/api-keys
2. **Sign up/Login** to your OpenAI account
3. **Click "Create new secret key"**
4. **Copy the key** (it starts with `sk-...`)
5. **Important**: You'll need to add a payment method to your OpenAI account

### 3. Set up Environment Variables
Create a `.env.local` file in your project root:
```
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### 3. Alternative: Simple Text-Based Extraction (Cheaper)
If you don't want to use Vision API, here's a simpler approach using web scraping:

```javascript
// Alternative API without Vision (api/extract-product.js)
import { chromium } from 'playwright';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(req.body.url);
    
    // Extract text content
    const pageText = await page.evaluate(() => {
      return document.body.innerText;
    });
    
    await browser.close();

    // Use GPT to extract structured data from text
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "user",
        content: `Extract product info from this text and return JSON:
        ${pageText.substring(0, 2000)}
        
        Return: {"name": "", "price": "", "quantity": "", "unit": ""}`
      }]
    });

    const productInfo = JSON.parse(response.choices[0].message.content);
    res.json({ success: true, ...productInfo });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

## How It Works

1. **User pastes URL** into the product card
2. **Clicks "🤖 Extract"** button
3. **System takes screenshot** of the webpage
4. **OpenAI Vision analyzes** the image for product info
5. **Automatically fills** name, price, quantity, and unit fields

## Supported Sites
- E-commerce sites (Amazon, eBay, etc.)
- Grocery stores
- Any product page with visible pricing and quantity info

## 💰 Costs & Pricing

### **Yes, this costs money** - but it's very affordable!

**OpenAI API Pricing (Pay-per-use):**
- **GPT-4 Vision** (screenshot analysis): ~$0.01-0.03 per extraction
- **GPT-3.5 Turbo** (text-only): ~$0.001 per extraction
- **No monthly fees** - you only pay for what you use

**Example costs:**
- Extract 10 products = $0.01-0.30
- Extract 100 products = $0.10-3.00  
- Extract 1000 products = $1.00-30.00

### **Getting Started:**
1. **$5 minimum deposit** required on OpenAI platform
2. **Usage tracking** available in your OpenAI dashboard
3. **Set spending limits** to control costs
4. **Free $5 credit** sometimes available for new accounts

### **Cost-Saving Tips:**
- Use **text-only extraction** (much cheaper) instead of Vision API
- Set up **spending limits** in your OpenAI account
- Only extract when needed (manual entry is still free!)

### **Alternative: Start Free**
If you want to test first, you can:
1. **Skip the AI feature** for now
2. **Use manual entry** (always free)
3. **Add AI extraction later** when ready

The feature is optional - your price calculator works perfectly without it!