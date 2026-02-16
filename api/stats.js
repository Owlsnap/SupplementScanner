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
    const result = await DatabaseService.getStats();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to get statistics'
      });
    }

    return res.status(200).json({
      success: true,
      stats: result.data
    });

  } catch (error) {
    console.error('Stats endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}