# Swedish Supplement Scraper Architecture

## 📁 Directory Structure

```
/src/scraper/
├── scraper.js                    # Main orchestrator class
├── sites/                       # Site-specific configuration files
│   ├── tillskottsbolaget.json   # Tillskottsbolaget.se rules
│   ├── proteinbolaget.json      # Proteinbolaget.se rules  
│   ├── gymgrossisten.json       # Gymgrossisten.com rules
│   ├── tyngre.json              # Tyngre.se rules
│   └── bodylab.json             # Bodylab.se rules
└── extractors/                  # Specialized extraction modules
    ├── priceExtractor.js        # Price & currency extraction
    ├── ingredientExtractor.js   # Supplement info & dosage
    └── dosageExtractor.js       # Quantity & serving extraction
```

## 🎯 Key Benefits

### 1. **Centralized Configuration**
- All site-specific rules in JSON files
- Easy to add new sites without code changes
- Clear separation of logic and configuration

### 2. **Modular Extractors**
- Specialized classes for different data types
- Reusable AI prompt generation
- Consistent validation across sites

### 3. **Maintainability** 
- Single source of truth for site rules
- Easy debugging of site-specific issues
- Version control for extraction rules

### 4. **Scalability**
- Add new sites by creating JSON config
- Extend extractors for new data types
- Plugin-like architecture for features

## 🔧 Usage Examples

### Basic Site Configuration
```javascript
import { SwedishSupplementScraper } from './scraper/scraper.js';

const scraper = new SwedishSupplementScraper();
const config = scraper.getSiteConfig('https://tillskottsbolaget.se/product');
// Returns tillskottsbolaget.json configuration
```

### Generate AI Prompt
```javascript
const { prompt, siteConfig } = scraper.generateExtractionPrompt(url);
// Returns site-specific AI instructions
```

### Validate Extraction Results
```javascript
const validation = scraper.validateExtraction(extractedData, url);
if (validation.isValid) {
  console.log('Clean data:', validation.cleanedData);
} else {
  console.log('Errors:', validation.errors);
}
```

## 📋 Site Configuration Schema

Each site JSON file contains:

```json
{
  "siteName": "Human readable name",
  "domain": "example.com", 
  "selectors": {
    "price": ["CSS selectors for price elements"],
    "quantity": ["CSS selectors for quantity"],
    "info": ["CSS selectors for supplement info"],
    "name": ["CSS selectors for product name"]
  },
  "pricePattern": "Regex pattern for price extraction",
  "instructions": {
    "price": "Site-specific price extraction rules",
    "quantity": "Site-specific quantity rules"
  },
  "swedishTerms": {
    "dosageIndicators": ["Swedish dosage terms"],
    "units": ["Swedish unit terms"],
    "sections": ["Swedish section names to target"]
  },
  "waitTime": 2000,
  "targetSections": ["Playwright selectors for key sections"]
}
```

## 🚀 Migration Benefits

### Before (scattered instructions)
- AI prompts hardcoded in multiple files
- Site rules mixed with business logic  
- Difficult to maintain and update
- Inconsistent extraction patterns

### After (organized structure)
- ✅ All AI instructions centralized
- ✅ Site-specific rules in JSON configs
- ✅ Modular, testable extractors
- ✅ Easy to add new sites
- ✅ Consistent validation patterns
- ✅ Clear separation of concerns

## 🔄 Integration Points

### With Server.js
Replace the `getSiteSpecificRules()` function with:
```javascript
import { SwedishSupplementScraper } from './src/scraper/scraper.js';
const scraper = new SwedishSupplementScraper();
const { prompt } = scraper.generateExtractionPrompt(url);
```

### With API Endpoints
Replace hardcoded prompts with:
```javascript
const scraper = new SwedishSupplementScraper();
const browserConfig = scraper.getBrowserConfig(url);
const { prompt } = scraper.generateExtractionPrompt(url);
```

## 🎨 Future Enhancements

1. **Dynamic Site Discovery**: Auto-detect new supplement sites
2. **Machine Learning**: Learn from extraction successes/failures  
3. **A/B Testing**: Test different prompts for accuracy
4. **Performance Monitoring**: Track extraction success rates
5. **Site Health Checks**: Monitor for layout changes

## 📊 Supported Sites

Currently configured for:
- ✅ Tillskottsbolaget.se - Complete configuration
- ✅ Proteinbolaget.se - Complete configuration  
- ✅ Gymgrossisten.com - Complete configuration
- ✅ Tyngre.se - Complete configuration
- ✅ Bodylab.se - Complete configuration

Easy to add: Any new Swedish supplement retailer!