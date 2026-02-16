/**
 * Configuration for AI-enhanced product matching
 */

export const AI_MATCHING_CONFIG = {
  // Enable/disable AI matching globally
  ENABLE_AI_MATCHING: process.env.ENABLE_AI_MATCHING !== 'false',
  
  // OpenAI API configuration
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4',
  
  // When to use AI vs rule-based matching
  USE_AI_WHEN: {
    // Use AI when we have many search results to choose from
    MIN_RESULTS_FOR_AI: 3,
    
    // Use AI when rule-based confidence is low
    LOW_CONFIDENCE_THRESHOLD: 50,
    
    // Always use AI for these scenarios
    COMPLEX_MATCHING_KEYWORDS: [
      'protein', 'creatine', 'vitamin', 'omega', 'magnesium', 
      'calcium', 'zinc', 'iron', 'b12', 'collagen'
    ]
  },
  
  // Fallback settings
  FALLBACK_TO_RULES_ON_ERROR: true,
  AI_REQUEST_TIMEOUT: 10000, // 10 seconds
  
  // Debug settings
  LOG_AI_DECISIONS: process.env.NODE_ENV === 'development',
  LOG_MATCHING_DETAILS: process.env.NODE_ENV === 'development'
};

/**
 * Determine if we should use AI matching for a given scenario
 */
export function shouldUseAIMatching(productName, brand, searchResults, ruleBasedConfidence = null) {
  // Check if AI is globally enabled
  if (!AI_MATCHING_CONFIG.ENABLE_AI_MATCHING || !AI_MATCHING_CONFIG.OPENAI_API_KEY) {
    return { useAI: false, reason: 'AI matching disabled or no API key' };
  }
  
  // Use AI if we have many results to analyze
  if (searchResults.length >= AI_MATCHING_CONFIG.USE_AI_WHEN.MIN_RESULTS_FOR_AI) {
    return { useAI: true, reason: `${searchResults.length} search results need AI analysis` };
  }
  
  // Use AI if rule-based confidence is low
  if (ruleBasedConfidence !== null && ruleBasedConfidence < AI_MATCHING_CONFIG.USE_AI_WHEN.LOW_CONFIDENCE_THRESHOLD) {
    return { useAI: true, reason: `Low rule-based confidence (${ruleBasedConfidence}%)` };
  }
  
  // Use AI for complex supplement types
  const productLower = productName.toLowerCase();
  const hasComplexKeyword = AI_MATCHING_CONFIG.USE_AI_WHEN.COMPLEX_MATCHING_KEYWORDS.some(
    keyword => productLower.includes(keyword)
  );
  
  if (hasComplexKeyword) {
    return { useAI: true, reason: 'Complex supplement type detected' };
  }
  
  return { useAI: false, reason: 'Simple matching scenario, using rule-based' };
}