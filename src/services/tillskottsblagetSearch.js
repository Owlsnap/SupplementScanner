import puppeteer from 'puppeteer';
import { AIProductMatcherService } from './aiProductMatcher.js';

export class TillskottsblagetSearchService {
  static BASE_URL = 'https://www.tillskottsbolaget.se';
  
  /**
   * Search tillskottsbolaget.se for a product and return the most relevant URL
   */
  static async findProductURL(productName, brand = null, openFoodFactsData = null) {
    let browser = null;
    
    try {
      console.log(`🔍 Searching tillskottsbolaget.se for: "${productName}" by "${brand || 'any brand'}"`);
      
      browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      // Construct search query
      let searchQuery = productName;
      if (brand && brand.toLowerCase() !== 'unknown brand') {
        searchQuery = `${brand} ${productName}`;
      }
      
      // Try multiple search strategies
      const searchStrategies = await this.tryMultipleSearches(page, searchQuery, productName, brand);
      
      if (searchStrategies.length === 0) {
        console.log('❌ No search results found with any strategy');
        return { success: false, error: 'No products found on tillskottsbolaget.se' };
      }
      
      // Combine results from all strategies
      const allResults = searchStrategies.flat();
      
      // Use combined results from multiple search strategies
      const searchResults = allResults;
      
      console.log(`🔍 Total results from all strategies: ${searchResults.length}`);
      console.log('📋 Found results:');
      searchResults.slice(0, 5).forEach((result, i) => {
        console.log(`  ${i + 1}. ${result.title} (${result.type || 'unknown'}) [${result.strategy || 'unknown'}]`);
      });

      // Use AI-powered matching to find the best result
      const matchResult = await AIProductMatcherService.enhancedProductMatching(
        productName, 
        brand, 
        searchResults,
        openFoodFactsData
      );

      if (!matchResult.success) {
        console.log('❌ AI matching failed');
        return { success: false, error: 'Failed to match product' };
      }

      const bestMatch = matchResult.data;
      console.log(`✅ Best match (${matchResult.method}): "${bestMatch.title}" (confidence: ${bestMatch.confidence}%)`);
      console.log(`🔗 URL: ${bestMatch.url}`);

      return {
        success: true,
        data: {
          url: bestMatch.url,
          title: bestMatch.title,
          confidence: bestMatch.confidence,
          matchingMethod: matchResult.method,
          reasoning: bestMatch.reasoning || 'Rule-based scoring'
        }
      };    } catch (error) {
      console.error('💥 Tillskottsbolaget search error:', error);
      return { 
        success: false, 
        error: `Search failed: ${error.message}` 
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
  
  /**
   * Try multiple search strategies to find products
   */
  static async tryMultipleSearches(page, originalQuery, productName, brand) {
    const strategies = [
      // Strategy 1: Original search
      { query: originalQuery, name: 'original' },
      // Strategy 2: Product name only
      { query: productName, name: 'product-only' },
      // Strategy 3: Brand only (if available)
      ...(brand ? [{ query: brand, name: 'brand-only' }] : []),
      // Strategy 4: Simplified terms
      { query: this.simplifySearchTerms(originalQuery), name: 'simplified' },
      // Strategy 5: Individual words
      { query: productName.split(' ')[0], name: 'first-word' },
      // Strategy 6: Category-specific searches
      ...this.getCategorySpecificSearches(productName, brand)
    ];
    
    const allResults = [];
    
    for (const strategy of strategies) {
      if (!strategy.query || strategy.query.length < 2) continue;
      
      console.log(`🔍 Trying ${strategy.name} strategy: "${strategy.query}"`);
      
      try {
        const results = await this.executeSearch(page, strategy.query);
        if (results.length > 0) {
          console.log(`✅ ${strategy.name} found ${results.length} results`);
          allResults.push(...results.map(r => ({ ...r, strategy: strategy.name })));
        } else {
          console.log(`❌ ${strategy.name} found no results`);
        }
      } catch (error) {
        console.warn(`⚠️ ${strategy.name} strategy failed:`, error.message);
      }
    }
    
    // Remove duplicates based on URL
    const uniqueResults = [];
    const seenUrls = new Set();
    
    for (const result of allResults) {
      if (!seenUrls.has(result.url)) {
        seenUrls.add(result.url);
        uniqueResults.push(result);
      }
    }
    
    console.log(`🎯 Found ${uniqueResults.length} unique results`);
    return uniqueResults;
  }
  
  /**
   * Execute a single search query
   */
  static async executeSearch(page, query) {
    const searchURL = `${this.BASE_URL}/search?q=${encodeURIComponent(query)}`;
    
    await page.goto(searchURL, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(1000); // Wait for dynamic content
    
    return await page.evaluate(() => {
      const results = [];
      
      // Enhanced selectors for different page layouts
      const selectors = [
        // Common product link patterns
        'a[href*="/products/"]',
        'a[href*="/produkt/"]',
        'a[href*="/product/"]',
        'a[href*="/item/"]',
        
        // Category and variant pages
        'a[href*="/kategori/"]',
        'a[href*="/category/"]',
        'a[href*="/variants/"]',
        'a[href*="/varianter/"]',
        
        // CSS class patterns
        '.product-item a',
        '.product-link',
        '.product-card a',
        '.item-link',
        '.search-result a',
        '.variant-link',
        '.category-link',
        
        // Generic patterns
        '[data-product-url]',
        '[data-href*="product"]',
        '[data-href*="kategori"]',
        
        // Broader search for any links in product containers
        '.product a',
        '.item a',
        '.variant a',
        '[class*="product"] a',
        '[class*="item"] a',
        '[class*="variant"] a'
      ];
      
      for (const selector of selectors) {
        try {
          const links = document.querySelectorAll(selector);
          
          links.forEach(link => {
            const href = link.href || link.getAttribute('href') || link.getAttribute('data-href');
            
            // Multiple ways to get title
            const title = link.textContent?.trim() || 
                         link.querySelector('img')?.alt || 
                         link.getAttribute('title') ||
                         link.getAttribute('aria-label') ||
                         link.querySelector('[class*="title"]')?.textContent?.trim() ||
                         link.querySelector('[class*="name"]')?.textContent?.trim() || '';
            
            if (href && title && title.length > 2) {
              const cleanUrl = href.startsWith('http') ? href : `https://www.tillskottsbolaget.se${href}`;
              
              // Validate it looks like a product/category URL
              if (cleanUrl.includes('tillskottsbolaget.se') && 
                  (cleanUrl.includes('/product') || 
                   cleanUrl.includes('/item') || 
                   cleanUrl.includes('/kategori') ||
                   cleanUrl.includes('/category') ||
                   cleanUrl.includes('/variant') ||
                   href.includes('/products/'))) {
                
                results.push({
                  url: cleanUrl,
                  title: title.trim(),
                  relevanceScore: 0,
                  type: this.detectLinkType(cleanUrl, title)
                });
              }
            }
          });
          
          if (results.length > 0) {
            console.log(`Found ${results.length} results with selector: ${selector}`);
            break; // Found results with this selector
          }
        } catch (e) {
          // Skip failed selectors
        }
      }
      
      return results;
    });
  }
  
  /**
   * Simplify search terms for better matching
   */
  static simplifySearchTerms(query) {
    return query
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, ' ') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }
  
  /**
   * Get category-specific search variations
   */
  static getCategorySpecificSearches(productName, brand) {
    const searches = [];
    const productLower = productName.toLowerCase();
    
    // Energy drinks - handle variant structure
    if (productLower.includes('monster') || productLower.includes('energy')) {
      searches.push(
        { query: 'monster energy 500', name: 'monster-size' },
        { query: 'monster energy 500ml', name: 'monster-size-ml' },
        { query: 'monster energy', name: 'monster-brand' },
        { query: 'monster', name: 'monster-only' },
        { query: 'energidryck monster', name: 'energy-swedish-monster' },
        { query: 'energidryck', name: 'energy-swedish' }
      );
      
      // Extract flavor and try without it
      const flavorTerms = ['ultra', 'zero', 'pipeline', 'punch', 'assault', 'rehab', 'juice', 'mango', 'paradise'];
      const baseName = this.removeFlavorTerms(productName, flavorTerms);
      if (baseName !== productName) {
        searches.push({ query: baseName, name: 'no-flavor' });
      }
    }
    
    // Protein supplements
    if (productLower.includes('protein') || productLower.includes('whey')) {
      searches.push(
        { query: 'protein', name: 'protein-category' },
        { query: 'vassle', name: 'whey-swedish' }
      );
    }
    
    // Vitamins
    if (productLower.includes('vitamin')) {
      searches.push({ query: 'vitamin', name: 'vitamin-category' });
    }
    
    // Creatine
    if (productLower.includes('creatine') || productLower.includes('kreatin')) {
      searches.push(
        { query: 'kreatin', name: 'creatine-swedish' },
        { query: 'creatine', name: 'creatine-english' }
      );
    }
    
    return searches;
  }
  
  /**
   * Remove flavor terms to get base product name
   */
  static removeFlavorTerms(productName, flavorTerms) {
    let cleanName = productName;
    flavorTerms.forEach(flavor => {
      const regex = new RegExp(`\\b${flavor}\\b`, 'gi');
      cleanName = cleanName.replace(regex, '').trim();
    });
    return cleanName.replace(/\s+/g, ' ').trim();
  }
  
  /**
   * Detect the type of link found
   */
  static detectLinkType(url, title) {
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();
    
    if (urlLower.includes('/kategori') || urlLower.includes('/category')) {
      return 'category';
    }
    if (urlLower.includes('/variant') || titleLower.includes('variant')) {
      return 'variant';
    }
    if (urlLower.includes('/product') || urlLower.includes('/item')) {
      return 'product';
    }
    
    return 'unknown';
  }
  
  /**
   * Validate that a URL is from tillskottsbolaget.se and is a product page
   */
  static isValidProductURL(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('tillskottsbolaget.se') && 
             (url.includes('/products/') || url.includes('/produkt/'));
    } catch {
      return false;
    }
  }
}