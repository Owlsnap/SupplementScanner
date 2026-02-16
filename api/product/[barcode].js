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

  const { barcode } = req.query;

  if (!barcode) {
    return res.status(400).json({
      success: false,
      error: 'Barcode is required'
    });
  }

  try {
    if (req.method === 'GET') {
      // Get supplement by barcode
      const result = await DatabaseService.getByBarcode(barcode);
      
      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: `Supplement with barcode ${barcode} not found`,
          barcode
        });
      }

      return res.status(200).json({
        success: true,
        data: result.data
      });
    }
    
    if (req.method === 'DELETE') {
      // Delete supplement
      const result = await DatabaseService.deleteSupplement(barcode);
      
      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: result.error || `Supplement with barcode ${barcode} not found`
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Supplement deleted successfully',
        backup_created: result.backupCreated
      });
    }

    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });

  } catch (error) {
    console.error('Product endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}