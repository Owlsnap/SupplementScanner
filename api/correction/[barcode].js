import { DatabaseService } from '../../src/services/dbService.js';
import { SupplementSchema } from '../../src/schemas/supplementSchema.js';
import { CategoryDetector } from '../../src/services/categoryDetector.js';

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

  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use PUT or PATCH.' 
    });
  }

  const { barcode } = req.query;
  const updates = req.body;

  if (!barcode) {
    return res.status(400).json({
      success: false,
      error: 'Barcode is required'
    });
  }

  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'Update data is required'
    });
  }

  try {
    // Get existing supplement
    const existing = await DatabaseService.getByBarcode(barcode);
    if (!existing.success || !existing.data) {
      return res.status(404).json({
        success: false,
        error: `Supplement with barcode ${barcode} not found`
      });
    }

    // Prepare updates with validation
    const correctionData = { ...updates };
    
    // Track which fields are being corrected
    const sourceMap = { ...existing.data.meta.sourceMap } || {};
    
    // Update source tracking for corrected fields
    const userCorrectedFields = [
      'productName', 'brand', 'category', 'subCategory', 'form',
      'servingsPerContainer', 'servingSize', 'ingredients', 'price'
    ];
    
    for (const field of userCorrectedFields) {
      if (correctionData.hasOwnProperty(field)) {
        sourceMap[field] = 'user';
      }
    }

    // Auto-detect category if ingredients were updated
    if (correctionData.ingredients) {
      try {
        const categoryResult = await CategoryDetector.detectCategory(
          correctionData.productName || existing.data.productName,
          correctionData.ingredients
        );
        
        // Only auto-update category if confidence is high and user didn't specify
        if (categoryResult.confidence > 0.8 && !correctionData.category) {
          correctionData.category = categoryResult.category;
          correctionData.subCategory = categoryResult.subCategory;
          sourceMap.category = 'auto-detected';
          sourceMap.subCategory = 'auto-detected';
        }
      } catch (error) {
        console.warn('Category detection failed during correction:', error.message);
      }
    }

    // Prepare final update object
    const finalUpdates = {
      ...correctionData,
      meta: {
        ...existing.data.meta,
        ...correctionData.meta,
        verified: true, // Mark as verified since user corrected it
        lastUpdated: new Date().toISOString(),
        sourceMap
      }
    };

    // Validate the updates
    try {
      const merged = { ...existing.data, ...finalUpdates };
      SupplementSchema.parse(merged);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationError.errors || validationError.message
      });
    }

    // Apply the correction
    const result = await DatabaseService.updateSupplement(barcode, finalUpdates);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to save correction'
      });
    }

    // Calculate quality improvements
    const improvements = calculateImprovements(existing.data, result.data);

    return res.status(200).json({
      success: true,
      data: result.data,
      message: 'Correction applied successfully',
      backup_created: result.backupCreated,
      improvements
    });

  } catch (error) {
    console.error('Correction endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during correction',
      details: error.message
    });
  }
}

/**
 * Calculate what improvements were made by the correction
 */
function calculateImprovements(before, after) {
  const improvements = [];
  
  // Check for data completeness improvements
  if (!before.servingsPerContainer && after.servingsPerContainer) {
    improvements.push('Added serving container information');
  }
  
  if (before.ingredients.length < after.ingredients.length) {
    improvements.push(`Added ${after.ingredients.length - before.ingredients.length} ingredients`);
  }
  
  const beforeDosages = before.ingredients.filter(ing => ing.dosage).length;
  const afterDosages = after.ingredients.filter(ing => ing.dosage).length;
  if (afterDosages > beforeDosages) {
    improvements.push(`Added dosage information for ${afterDosages - beforeDosages} ingredients`);
  }
  
  if (!before.price.value && after.price.value) {
    improvements.push('Added price information');
  }
  
  // Check for accuracy improvements
  if (before.category !== after.category) {
    improvements.push(`Updated category from ${before.category} to ${after.category}`);
  }
  
  if (before.brand === 'Unknown Brand' && after.brand !== 'Unknown Brand') {
    improvements.push('Added brand information');
  }
  
  return improvements;
}