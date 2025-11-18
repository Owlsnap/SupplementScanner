/**
 * Vision fallback API for OCR analysis of specific content blocks
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { html_block, prompt, missing_fields } = req.body;

    if (!html_block || !prompt) {
      return res.status(400).json({ error: 'HTML block and prompt are required' });
    }

    console.log('👁️ Vision fallback API called for fields:', missing_fields);

    // Convert HTML to image using a headless browser simulation approach
    // For now, we'll extract text from HTML and use text-based analysis
    const textContent = extractTextFromHTML(html_block);
    
    console.log('📝 Extracted text content:', textContent.substring(0, 200) + '...');

    // Call OpenAI with focused prompt for the missing information
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are analyzing supplement product content to extract specific missing information. 
                     You always respond with valid JSON only. Focus only on the requested fields.
                     Convert all doses to mg. Be conservative with uncertain values.`
          },
          {
            role: 'user',
            content: `${prompt}

Content to analyze:
${textContent}

Missing fields: ${missing_fields.join(', ')}

Return JSON with only the missing fields that you can confidently extract:
{
  ${missing_fields.includes('active_ingredients') ? '"active_ingredients": [{"name": "", "dose_mg": 0, "is_primary": false}],' : ''}
  ${missing_fields.includes('serving_size') ? '"serving_size": "",' : ''}
  ${missing_fields.includes('total_servings') ? '"total_servings": 0,' : ''}
  "confidence": 0
}`
          }
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API failed: ${response.status}`);
    }

    const data = await response.json();
    const extractedData = JSON.parse(data.choices[0].message.content);

    console.log('👁️ Vision fallback extraction:', extractedData);

    res.status(200).json(extractedData);

  } catch (error) {
    console.error('👁️ Vision fallback error:', error);
    res.status(500).json({ 
      error: 'Vision fallback failed', 
      details: error.message 
    });
  }
}

/**
 * Extract clean text from HTML
 */
function extractTextFromHTML(html) {
  // Simple HTML cleaning - remove tags but preserve structure
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
    .replace(/<[^>]+>/g, ' ') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}