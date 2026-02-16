IMPORTANT CONTEXT – TWO COMPLETELY SEPARATE PROJECTS

There are two independent codebases:

PROJECT A (WEB – CURRENT CODEBASE SUPPSCANNER):
Current role: Uses AI + scraping to extract product data and display on frontend
NEW ROLE: Will become the BACKEND + DATA INGESTION ENGINE for the mobile app
STATUS: Must NOT be converted into a mobile app and NO need to update the frontend

PROJECT B (MOBILE – NEW IN A DIFFERENT DIRECTORY):
Name: SupplementScannerApp
Type: React Native + Expo
Current role: Barcode scanning app
NEW ROLE: Will become the USER-FACING MOBILE CLIENT
STATUS: Will be further updated in its own directory

You are ONLY allowed to modify Project A in this task.
DO NOT generate any React Native, Expo, or mobile code.
DO NOT suggest turning Project A into a mobile app.
Project A = backend/brain ONLY.
Project B = frontend ONLY.


1. Goal

    The end goal is a mobile app where a user scans the barcode of a supplement and receives a quality, dosage, and cost analysis of the product.

    Currently, I have a working web app (supplementscanner.io) that performs AI-powered web scraping when a product URL is provided.

    Because web scraping is messy and hard to scale, I now want to repurpose supplementscanner.io into a structured data ingestion + validation tool for a new database that the mobile app will use.

    This repurposed system will act as:

    • A data extractor
    • A validator
    • A data cleaner
    • A database builder
    • An internal API

    The web app is no longer just a comparison tool — it becomes my internal data engine.

2. New Architecture (High Level)

    Architecture:

    [ Phone Camera / Barcode Scan ]
             ↓
     SupplementScannerApp (React Native / Expo)
             ↓
        API request (barcode / URL / manual)
             ↓
   supplementscanner.io (Data Ingestion + AI + DB)
             ↓
    /data/supplements.json (later: real DB)


    This current project will act as:
        Data processor

        Data cleaner

        Data validator

        Temporary database (JSON)

        Future API layer

3. Required Schema (Very Important)

    - You must implement Zod schemas for structured validity.
    Example:
        SupplementSchema = {
            barcode: string | null,

            productName: string,
            brand: string,

            category: "supplement" | "vitamin" | "herb",
            subCategory: string,

            form: "capsule" | "tablet" | "powder" | "liquid" | "gummy" | "other",

            servingsPerContainer: number | null,

            servingSize: {
                amount: number | null,
                unit: "g" | "mg" | "mcg" | "IU" | "ml" | "capsule" | "tablet" | "scoop"
            },

            ingredients: [
                {
                name: string,
                dosage: number | null,
                unit: "g" | "mg" | "mcg" | "IU" | "%" | null,
                isStandardized?: boolean, // very important for herbs
                standardizedTo?: string | null, // e.g. "5% withanolides"
                }
            ],

            price: {
                value: number | null,
                currency: string | null,
                pricePerServing: number | null
            },

            quality: {
                underDosed: boolean | null,
                overDosed: boolean | null,
                fillerRisk: boolean | null,
                bioavailability: "low" | "medium" | "high" | null
            },

            meta: {
                source: "openfoodfacts" | "ai" | "user" | "combined",
                verified: boolean,
                lastUpdated: string
            }
        }

    - New Master Category System
    App will work with 3 main product families:
    type Category = "supplement" | "vitamin" | "herb"

    and subcategories:
        type SubCategory =
        | "protein"
        | "preworkout"
        | "intra-workout"
        | "post-workout"
        | "nootropic"
        | "adaptogen"
        | "multivitamin"
        | "single-vitamin"
        | "mineral"
        | "sleep"
        | "stress"
        | "joint"
        | "immunity"
        | "gut"
        | "hormonal"
        | "other"
    
    Example:

    Ashwagandha → category: "herb", subCategory: "adaptogen"

    Vitamin D3 → category: "vitamin", subCategory: "single-vitamin"

    Creatine → category: "supplement", subCategory: "performance"

    - Add category-specific schemas such as:

    PreWorkoutSchema
    PreWorkout = {
    caffeine: { mg: number | null, present: boolean },
    betaAlanine: { mg: number | null, present: boolean },
    lCitrulline: { mg: number | null, present: boolean },
    lArginine: { mg: number | null, present: boolean },
    lTyrosine: { mg: number | null, present: boolean },
    taurine: { mg: number | null, present: boolean },
    theanine: { mg: number | null, present: boolean },
    creatine: { mg: number | null, present: boolean },
    }
    These schemas must be automatically filled using:

    ✅ OpenFoodFacts
    ✅ AI extraction fallback
    ✅ User input

    - Herb Support
    For herbs like ashwagandha, milk thistle, ginkgo, etc., Claude must extract:

    Standardization (e.g. “5% withanolides”)

    Part used (root, leaf, seed)

    Extract ratio (10:1, 20:1 etc if present)

    So add a HerbSchema:
    HerbSchema = {
        plantName: string,
        plantPart: "root" | "leaf" | "seed" | "bark" | "whole" | "unknown",

        extractType: "powder" | "extract" | "tincture" | "oil" | "unknown",

        extractRatio: string | null, // e.g. "10:1"
        standardization: string | null // e.g. "5% withanolides"
    }
    attach this when category === "herb"

    - Quality Analysis (neutral but powerful)
        Neutral guidance, compare to common dosage ranges and notify user:
            ✅ Within common range
            ⚠️ Under-dosed
            ⚠️ Extremely high dosage
        No claims, just compare to common usage ranges and proven dosage for efficiency
        
        Here’s your rule system:
        DO NOT provide medical advice
        ONLY compare to evidence-based common dosage ranges



4. Data Flow Requirements

    You should implement:

    A. Barcode-first flow

    If barcode is provided:

    Request https://world.openfoodfacts.org/api/v0/product/{barcode}.json

    If found → Normalize

    If missing critical fields → Trigger AI supplemental extraction

    B. URL-based flow

    If a product URL is provided:

    Scrape HTML

    Use AI to extract

    Normalize to schema

    C. Manual override

    Allow UI fields to correct:

    Dosage

    Ingredients

    Serving size

    Category

    Price

    Then:

    ✅ Validate with Zod
    ✅ Save to local database.json
    ✅ Mark as verified

5. File Structure Required
    /data
        supplements.json

    /services
        openFoodFacts.ts
        aiExtractor.ts
        dataNormalizer.ts
        dbService.ts

    /schemas
        supplement.schema.ts
        preworkout.schema.ts
        protein.schema.ts

    /utils
        ingredientParser.ts
        unitConverter.ts

7. End Result (for this phase)

    With this project as the central brain of SupplementScanner and my other project SupplementScannerApp(React Native/Expo) as the main app i should be able to:

    • Input barcode
    • Input URL
    • Or input manual data
    → Receive a validated standardized JSON output
    → Saved to json database
    → Returned to both web UI and mobile app

8. What to actually BUILD


    Must implement:

    ✅ /ingest/barcode/:code → fetch + normalize + store
    ✅ /ingest/url → scrape + AI + normalize + store
    ✅ /ingest/manual → user data + normalize + store
    ✅ /products/:barcode → fetch from database

    ✅ Save to:
        /src/data/sampleData.json

    ✅ Deduplicate by barcode or name+brand

    ✅ Log source per field:
    sourceMap: {
        ingredients: "ai",
        servingSize: "openfoodfacts",
        price: "user"
    }

    9. This system means:

    Every scan improves your app

    Every correction improves your database

    Every product becomes “sticky”

    This is not just an app.
    This is a proprietary supplement intelligence database.