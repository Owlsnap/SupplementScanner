// Sample supplement data for testing the new features
// You can copy-paste these into the app to see the analysis in action

export const sampleSupplements = [
  {
    name: "Magnesium Bisglycinate 400mg - 120 capsules",
    price: "299",
    quantity: "120",
    unit: "capsules",
    url: "https://example.com/magnesium-bisglycinate"
  },
  {
    name: "Magnesium Oxide 500mg - 100 tablets", 
    price: "89",
    quantity: "100", 
    unit: "tablets",
    url: "https://example.com/magnesium-oxide"
  },
  {
    name: "Whey Protein Isolate - 2kg powder",
    price: "699",
    quantity: "2000",
    unit: "g", 
    url: "https://example.com/whey-isolate"
  },
  {
    name: "Whey Protein Concentrate - 1kg powder",
    price: "399",
    quantity: "1000",
    unit: "g",
    url: "https://example.com/whey-concentrate"
  },
  {
    name: "Vitamin D3 2000 IU - 365 capsules",
    price: "199",
    quantity: "365", 
    unit: "capsules",
    url: "https://example.com/vitamin-d3"
  }
];

// Instructions for testing:
// 1. Open the app at http://localhost:5173/
// 2. Add new products using the sample data above
// 3. Watch as the AI analysis components automatically detect supplement types
// 4. Explore the new features:
//    - Nutrient Cost Analysis: See cost per mg of active ingredients
//    - Supplement Recommendations: Get personalized suggestions for health goals
//    - Ingredient Quality Comparison: Compare magnesium bisglycinate vs oxide
// 5. Try the AI extraction with real Swedish supplement URLs