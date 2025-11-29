// Enhanced supplement extraction schema for structured AI parsing
export const supplementExtractionSchema = {
  "productName": "",
  "servingSize": "", // e.g., "20 g", "1 scoop"
  "servingsPerContainer": "", // e.g., "20", "30"
  "ingredients": {
    "caffeine": {
      "isIncluded": false,
      "dosage_mg": null,
      "sources": [] // e.g., ["caffeine anhydrous", "caffshock"]
    },
    "beta_alanine": {
      "isIncluded": false,
      "dosage_mg": null,
      "sources": []
    },
    "l_citrulline": {
      "isIncluded": false,
      "dosage_mg": null,
      "form": null, // "citrulline malate", "l-citrulline"
      "sources": []
    },
    "l_arginine": {
      "isIncluded": false,
      "dosage_mg": null,
      "sources": []
    },
    "l_theanine": {
      "isIncluded": false,
      "dosage_mg": null,
      "sources": []
    },
    "l_tyrosine": {
      "isIncluded": false,
      "dosage_mg": null,
      "form": null, // "l-tyrosine", "n-acetyl l-tyrosine"
      "sources": []
    },
    "creatine_monohydrate": {
      "isIncluded": false,
      "dosage_mg": null,
      "sources": []
    },
    "taurine": {
      "isIncluded": false,
      "dosage_mg": null,
      "sources": []
    },
    "betaine_anhydrous": {
      "isIncluded": false,
      "dosage_mg": null,
      "sources": []
    },
    "nitrosigine": {
      "isIncluded": false,
      "dosage_mg": null,
      "sources": []
    },
    "agmatine_sulfate": {
      "isIncluded": false,
      "dosage_mg": null,
      "sources": []
    },
    "choline_bitartrate": {
      "isIncluded": false,
      "dosage_mg": null,
      "sources": []
    },
    "green_tea_extract": {
      "isIncluded": false,
      "dosage_mg": null,
      "caffeine_content_mg": null,
      "sources": []
    },
    "black_pepper_extract": {
      "isIncluded": false,
      "dosage_mg": null,
      "piperine_content_percentage": null,
      "sources": []
    }
  },
  "unrecognizedIngredients": [
    // Array of ingredients that don't match the known schema
    // {
    //   "name": "Zynamine®",
    //   "dosage_mg": 160,
    //   "description": "Unknown proprietary blend"
    // }
  ],
  "totalCaffeineContent_mg": null, // Calculated from all caffeine sources
  "extractionMetadata": {
    "tableFound": false,
    "ingredientListFound": false,
    "servingSizeFound": false,
    "confidence": 0.0 // 0.0 - 1.0
  }
};

// Swedish to English ingredient mapping
export const swedishIngredientMapping = {
  "koffein": "caffeine",
  "beta-alanin": "beta_alanine",
  "citrullinmalat": "l_citrulline",
  "l-citrullin": "l_citrulline",
  "l-arginin": "l_arginine",
  "l-teanin": "l_theanine",
  "l-tyrosin": "l_tyrosine",
  "n-acetyl l-tyrosin": "l_tyrosine",
  "kreatin monohydrat": "creatine_monohydrate",
  "taurin": "taurine",
  "betain anhydrous": "betaine_anhydrous",
  "kolinbitartrat": "choline_bitartrate",
  "grönt-te extrakt": "green_tea_extract",
  "svartpepparextrakt": "black_pepper_extract",
  "piper nigrum": "black_pepper_extract"
};

// Dosage analysis thresholds for structured data
export const dosageThresholds = {
  "caffeine": {
    "low": 100,
    "optimal_min": 150,
    "optimal_max": 300,
    "high": 400,
    "excessive": 600,
    "unit": "mg"
  },
  "beta_alanine": {
    "low": 1500,
    "optimal_min": 3000,
    "optimal_max": 5000,
    "high": 6000,
    "excessive": 8000,
    "unit": "mg"
  },
  "l_citrulline": {
    "low": 4000,
    "optimal_min": 6000,
    "optimal_max": 8000,
    "high": 10000,
    "excessive": 12000,
    "unit": "mg"
  },
  "l_tyrosine": {
    "low": 500,
    "optimal_min": 500,
    "optimal_max": 2000,
    "high": 3000,
    "excessive": 4000,
    "unit": "mg"
  },
  "creatine_monohydrate": {
    "low": 3000,
    "optimal_min": 5000,
    "optimal_max": 5000,
    "high": 10000,
    "excessive": 15000,
    "unit": "mg"
  },
  "taurine": {
    "low": 500,
    "optimal_min": 1000,
    "optimal_max": 3000,
    "high": 4000,
    "excessive": 6000,
    "unit": "mg"
  },
  "l_theanine": {
    "low": 50,
    "optimal_min": 100,
    "optimal_max": 200,
    "high": 300,
    "excessive": 400,
    "unit": "mg"
  }
};