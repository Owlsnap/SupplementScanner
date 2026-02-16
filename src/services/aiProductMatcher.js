/**
 * AI-powered product matching service for finding the most relevant product
 * from search results using OpenAI's API for intelligent matching
 */

import { AI_MATCHING_CONFIG, shouldUseAIMatching } from '../config/aiMatchingConfig.js';

export class AIProductMatcherService {
  
  /**
   * Use AI to find the best matching product from search results
   */
  static async findBestMatch(productName, brand, searchResults, openFoodFactsData = null) {
    try {
      console.log(`🤖 Using AI to match "${productName}" by "${brand}" from ${searchResults.length} results`);
      
      // Prepare context for AI matching
      const context = this.buildMatchingContext(productName, brand, searchResults, openFoodFactsData);
      
      // Call OpenAI API for intelligent matching
      const aiResponse = await this.callOpenAIForMatching(context);
      
      return this.processAIResponse(aiResponse, searchResults);
      
    } catch (error) {
      console.error('🚨 AI matching failed, falling back to rule-based scoring:', error);
      
      // Fallback to rule-based scoring if AI fails
      return this.fallbackRuleBasedMatching(productName, brand, searchResults);
    }
  }
  
  /**
   * Build comprehensive context for AI matching
   */
  static buildMatchingContext(productName, brand, searchResults, openFoodFactsData) {
    const context = {
      targetProduct: {
        name: productName,
        brand: brand || 'unknown',
        openFoodFactsData: openFoodFactsData ? {
          categories: openFoodFactsData.categories,
          ingredients: openFoodFactsData.ingredients_text,
          nutrientLevels: openFoodFactsData.nutrient_levels
        } : null
      },
      searchResults: searchResults.map((result, index) => ({
        index,
        title: result.title,
        url: result.url,
        type: result.type || 'product',
        strategy: result.strategy || 'unknown'
      }))
    };
    
    return context;
  }
  
  /**
   * Call OpenAI API for intelligent product matching
   */
  static async callOpenAIForMatching(context) {
    const prompt = this.buildMatchingPrompt(context);
    
    // This would integrate with your existing OpenAI setup
    // For now, we'll return a mock response structure
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_MATCHING_CONFIG.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: AI_MATCHING_CONFIG.OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at matching supplement products. Analyze search results and identify the most relevant product match.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1
      })
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
  }
  
  /**
   * Build the matching prompt for OpenAI
   */
  static buildMatchingPrompt(context) {
    return `
I need to find the best matching supplement product from search results.

TARGET PRODUCT:
- Name: "${context.targetProduct.name}"
- Brand: "${context.targetProduct.brand}"
${context.targetProduct.openFoodFactsData ? `
- Categories: ${context.targetProduct.openFoodFactsData.categories}
- Ingredients: ${context.targetProduct.openFoodFactsData.ingredients}` : ''}

SEARCH RESULTS:
${context.searchResults.map(result => 
  `${result.index}: "${result.title}" (${result.type}) [${result.strategy}]`
).join('\n')}

TASK:
1. Analyze each search result for relevance to the target product
2. Consider: exact name matches, brand matches, product type, form factor, strength/dosage
3. PRIORITIZE: Direct product links > Category pages > Variant pages
4. For energy drinks like Monster: Look for base product "Monster Energy, 500 ml" over specific flavors
5. Identify the MOST RELEVANT match
6. Provide confidence score (0-100)

RESPOND WITH JSON:
{
  "bestMatchIndex": <number>,
  "confidence": <number>,
  "reasoning": "<explanation>",
  "alternativeMatches": [<array of other potential match indexes>]
}
`;
  }
  
  /**
   * Process AI response and return structured result
   */
  static processAIResponse(aiResponse, searchResults) {
    try {
      const parsed = JSON.parse(aiResponse);
      
      if (parsed.bestMatchIndex >= 0 && parsed.bestMatchIndex < searchResults.length) {
        const bestMatch = searchResults[parsed.bestMatchIndex];
        
        return {
          success: true,
          method: 'ai',
          data: {
            ...bestMatch,
            confidence: parsed.confidence,
            reasoning: parsed.reasoning,
            aiScore: parsed.confidence
          }
        };
      }
      
      throw new Error('Invalid AI response index');
      
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw error;
    }
  }
  
  /**
   * Fallback rule-based matching (current system)
   */
  static fallbackRuleBasedMatching(productName, brand, searchResults) {
    console.log('📊 Using rule-based fallback matching');
    
    const scoredResults = searchResults.map(result => {
      let score = 0;
      const title = result.title.toLowerCase();
      const searchTerm = productName.toLowerCase();
      const brandTerm = brand?.toLowerCase();
      
      // Link type bonuses
      if (result.type === 'product') score += 5;
      else if (result.type === 'category') score += 3;
      else if (result.type === 'variant') score += 2;
      
      // Exact match bonus
      if (title.includes(searchTerm)) score += 10;
      
      // Brand match bonus  
      if (brandTerm && title.includes(brandTerm)) score += 5;
      
      //TO BE FIXED
      // Special handling for Monster Energy products
      if (searchTerm.includes('monster') && title.includes('monster')) {
        score += 8;
        // Bonus for base product (500ml) vs specific flavors
        if (title.includes('500') || title.includes('500ml')) score += 5;
        // Penalty for very specific flavors if we're looking for generic
        if (!searchTerm.includes('ultra') && title.includes('ultra')) score -= 2;
        if (!searchTerm.includes('zero') && title.includes('zero')) score -= 2;
      }
      
      // Word matching
      const searchWords = searchTerm.split(' ');
      searchWords.forEach(word => {
        if (word.length > 2 && title.includes(word)) score += 2;
      });
      
      // Penalty for very long titles
      if (title.length > 100) score -= 2;
      
      return { ...result, relevanceScore: score };
    });
    
    const bestMatch = scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore)[0];
    
    return {
      success: true,
      method: 'rule-based',
      data: {
        ...bestMatch,
        confidence: Math.min(bestMatch.relevanceScore * 8, 95) // Convert to percentage
      }
    };
  }
  
  /**
   * Enhanced matching that considers multiple factors
   */
  static async enhancedProductMatching(productName, brand, searchResults, openFoodFactsData = null) {
    // First, run rule-based matching to get baseline confidence
    const ruleBasedResult = this.fallbackRuleBasedMatching(productName, brand, searchResults);
    const ruleBasedConfidence = ruleBasedResult.data.confidence;
    
    // Determine if we should use AI
    const aiDecision = shouldUseAIMatching(productName, brand, searchResults, ruleBasedConfidence);
    
    if (AI_MATCHING_CONFIG.LOG_AI_DECISIONS) {
      console.log(`🤖 AI Decision: ${aiDecision.useAI ? 'USE AI' : 'USE RULES'} - ${aiDecision.reason}`);
    }
    
    if (!aiDecision.useAI) {
      return ruleBasedResult;
    }
    
    // Use AI matching with fallback to rule-based
    try {
      return await this.findBestMatch(productName, brand, searchResults, openFoodFactsData);
    } catch (error) {
      console.warn('🚨 AI matching failed, using rule-based fallback:', error.message);
      return ruleBasedResult;
    }
  }
}