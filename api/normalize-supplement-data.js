/**
 * API endpoint for AI-based supplement data normalization
 * Receives preprocessed blocks and regex results for final normalization
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, pattern_extraction, blocks_summary } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('🤖 AI Normalizer API called');
    console.log('📊 Blocks summary:', blocks_summary);
    console.log('🔍 Pattern confidence:', pattern_extraction?.confidence_scores);

    // Call OpenAI API
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
            content: 'You are a data normalizer for supplement products. You always respond with valid JSON only, no explanation text. Focus on accuracy and completeness.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Low temperature for consistency
        max_tokens: 1000,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API Error:', error);
      return res.status(500).json({ 
        error: 'OpenAI API failed', 
        details: error,
        fallback_recommended: true 
      });
    }

    const data = await response.json();
    
    // Parse the JSON response
    let normalizedData;
    try {
      const content = data.choices[0].message.content;
      normalizedData = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Raw response:', data.choices[0]?.message?.content);
      return res.status(500).json({ 
        error: 'Failed to parse AI response', 
        details: parseError.message,
        fallback_recommended: true 
      });
    }

    // Basic validation
    if (!normalizedData || typeof normalizedData !== 'object') {
      return res.status(500).json({ 
        error: 'Invalid AI response format',
        fallback_recommended: true 
      });
    }

    // Add processing metadata
    normalizedData._metadata = {
      processed_at: new Date().toISOString(),
      ai_model: 'gpt-4o-mini',
      pattern_confidence: pattern_extraction?.confidence_scores?.overall || 0,
      blocks_processed: Object.values(blocks_summary || {}).reduce((a, b) => a + b, 0)
    };

    console.log('✅ AI normalization successful');
    console.log('📋 Normalized product:', {
      name: normalizedData.name?.substring(0, 50),
      price: normalizedData.price_sek,
      ingredients: normalizedData.active_ingredients?.length || 0,
      confidence: normalizedData.confidence
    });

    res.status(200).json(normalizedData);

  } catch (error) {
    console.error('💥 AI Normalizer Error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      fallback_recommended: true 
    });
  }
}