import { DatabaseService } from '../../src/services/dbService.js';

let isInitialized = false;

export default async function handler(req, res) {
  // Initialize database on first request
  if (!isInitialized) {
    const initResult = await DatabaseService.initialize();
    if (!initResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Database initialization failed',
        details: initResult.error
      });
    }
    isInitialized = true;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { 
      q = '', 
      category, 
      brand, 
      verified, 
      limit = 50, 
      offset = 0 
    } = req.query;

    // Validate pagination
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const parsedOffset = Math.max(parseInt(offset) || 0, 0);

    // Build search options
    const searchOptions = {
      limit: parsedLimit,
      offset: parsedOffset
    };

    if (category) searchOptions.category = category;
    if (brand) searchOptions.brand = brand;
    if (verified !== undefined) {
      searchOptions.verified = verified === 'true' || verified === '1';
    }

    // Perform search
    const result = await DatabaseService.search(q.toString(), searchOptions);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Search failed'
      });
    }

    // Get total count for pagination (simplified)
    const allResults = await DatabaseService.search(q.toString(), {
      ...searchOptions,
      limit: 1000,
      offset: 0
    });
    
    const totalCount = allResults.success ? allResults.data.length : 0;
    const hasMore = parsedOffset + parsedLimit < totalCount;

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        limit: parsedLimit,
        offset: parsedOffset,
        total: totalCount,
        hasMore
      },
      query: {
        search: q,
        filters: { category, brand, verified }
      }
    });

  } catch (error) {
    console.error('Search endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during search',
      details: error.message
    });
  }
}