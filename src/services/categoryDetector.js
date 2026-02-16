export class CategoryDetector {
  static detectCategory(productName, ingredients = []) {
    const name = productName.toLowerCase();
    
    // Pre-workout detection
    if (name.includes('pre-workout') || name.includes('pwo') || name.includes('pre workout')) {
      return { category: 'supplement', subCategory: 'preworkout' };
    }
    
    // Protein detection
    if (name.includes('protein') || name.includes('whey') || name.includes('casein')) {
      return { category: 'supplement', subCategory: 'protein' };
    }
    
    // Vitamin detection
    if (name.includes('vitamin') || name.includes('multivitamin')) {
      return { category: 'vitamin', subCategory: name.includes('multi') ? 'multivitamin' : 'single-vitamin' };
    }
    
    // Magnesium detection
    if (name.includes('magnesium')) {
      return { category: 'mineral', subCategory: 'magnesium' };
    }
    
    // Creatine detection
    if (name.includes('creatine') || name.includes('kreatin')) {
      return { category: 'supplement', subCategory: 'creatine' };
    }
    
    // Omega-3 detection
    if (name.includes('omega') || name.includes('fish oil') || name.includes('fiskolja')) {
      return { category: 'supplement', subCategory: 'omega3' };
    }
    
    // BCAA detection
    if (name.includes('bcaa') || name.includes('amino')) {
      return { category: 'supplement', subCategory: 'amino_acids' };
    }
    
    // Default
    return { category: 'supplement', subCategory: 'other' };
  }
}