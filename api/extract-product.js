// API endpoint for extracting product information
// You'll need to install: npm install openai playwright

import OpenAI from 'openai';
import { chromium } from 'playwright';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Launch browser and take screenshot
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    await page.goto(url, { waitUntil: 'networkidle' });
    const screenshot = await page.screenshot({ fullPage: true });
    await browser.close();

    // Convert screenshot to base64
    const base64Image = screenshot.toString('base64');

    // Use OpenAI Vision to extract product info
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this product page and extract the following information in JSON format:
              {
                "name": "product name",
                "price": "price as number (remove currency symbols)",
                "quantity": "quantity/weight as number",
                "unit": "unit (g, kg, ml, l, oz, lb, etc.)"
              }
              
              Look for:
              - Product title/name
              - Price (remove kr, $, €, etc.)
              - Weight/quantity/size information
              - Unit of measurement
              
              If any information is not found, use empty string for that field.
              Return only valid JSON.`
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
      max_tokens: 500
    });

    const extractedText = response.choices[0].message.content;
    
    try {
      const productInfo = JSON.parse(extractedText);
      return res.status(200).json({
        success: true,
        ...productInfo
      });
    } catch (parseError) {
      return res.status(500).json({
        success: false,
        error: 'Could not parse AI response'
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