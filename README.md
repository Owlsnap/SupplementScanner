# SupplementScanner

A comprehensive supplement analysis platform targeting Swedish health-conscious consumers. SupplementScanner combines an AI-powered web encyclopedia with a mobile barcode scanner to provide detailed supplement information and analysis.

## 🎯 Project Goals

- **Educate consumers** about supplement ingredients and their effects
- **Simplify product analysis** through barcode scanning and AI-powered extraction
- **Provide comprehensive insights** with AI-generated deep dives on 30+ supplements
- **Target Swedish market** with localized supplement retailer integration

## 🏗️ Architecture

SupplementScanner consists of two main products:

### 1. Web Application (Primary Product)
- **Supplement encyclopedia** with AI-generated deep dives
- **Product analysis** and ingredient breakdown
- **Deployed to Railway** with CI/CD pipeline
- **Live at:** https://supplementscanner-production.up.railway.app

### 2. Mobile Application (Companion App)
- **Barcode scanner** for instant supplement analysis
- **Product history** and search functionality
- **Built with Expo/React Native** for cross-platform support

## 🚀 Tech Stack

### Backend
- **Node.js** with Express 5
- **OpenAI SDK** - supplement data extraction/normalization
- **Anthropic SDK** - encyclopedia deep dive generation
- **Puppeteer** - Swedish supplement retailer scraping
- **Supabase** - PostgreSQL database
- **Zod** - request/response validation
- **Rate limiting** - 100 req/15min general, 10 req/15min on ingestion

### Web Frontend
- **React 18** with TypeScript
- **Vite** build tool
- **React Router v7** for routing
- **Tailwind CSS v4** with dark mode support
- **Phosphor Icons** + Lucide React

### Mobile App
- **Expo SDK 54** / React Native 0.81
- **Expo Router v6** with file-based routing
- **expo-camera** for barcode scanning
- **AsyncStorage** for local data persistence
- **Custom fonts:** Manrope (headings) + Inter (body)

### Infrastructure
- **Railway** - hosting and deployment
- **Supabase** - production database
- **GitHub Actions** - CI/CD pipeline

## 📁 Project Structure

```
SuppScanner/
├── server.js                    # Express API server
├── src/                         # Web frontend
│   ├── components/
│   ├── pages/
│   ├── data/encyclopediaData.ts # 30 supplement definitions
│   └── services/
├── api/                         # API routes
│   ├── ingest/                  # Data ingestion endpoints
│   ├── product/                 # Product lookup
│   └── encyclopedia/            # AI-generated content
├── SuppScannerApp/              # Mobile app
│   ├── app/                     # Expo Router screens
│   ├── components/
│   └── services/
└── scripts/
    └── supabase-schema.sql      # Database schema
```

## 🔄 Data Flow

### Encyclopedia Generation
1. User requests supplement deep dive
2. Check Supabase cache (30-day TTL)
3. Generate with Anthropic API if cache miss
4. Cache and return structured content

### Barcode Scanning
1. Mobile app scans barcode
2. API extracts data from multiple sources:
   - OpenFoodFacts database
   - Swedish retailer scraping (Puppeteer)
   - AI normalization (OpenAI)
3. Store in Supabase database
4. Return structured product data

## 🛠️ Development

### Web/Backend Setup
```bash
cd SuppScanner/
npm install
npm run start:full    # Run both frontend and backend
```

### Mobile Setup
```bash
cd SuppScanner/SuppScannerApp/
npm install
npm start             # Start Expo dev server
```

### Available Commands

**Web/Backend:**
- `npm run dev` - Vite dev server (frontend only)
- `npm run server` - Express backend only
- `npm run build` - Production build
- `npm run lint` - ESLint
- `npm run format` - Prettier formatting

**Mobile:**
- `npm start` - Expo dev server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS

## 🌟 Key Features

- **AI-Powered Analysis**: Deep supplement insights using OpenAI and Anthropic
- **Barcode Scanning**: Instant product recognition and analysis
- **Swedish Market Focus**: Integration with local supplement retailers
- **Dark Mode Support**: Full theming with CSS variables
- **Cross-Platform**: Web app + mobile companion
- **Real-time Data**: Live product information and analysis

## 📊 Current Status

**State:** MVP - Encyclopedia and scan-to-result flow are working in production

**Target Market:** Swedish health-conscious consumers

## 🔧 Environment Setup

Copy `.env.example` to `.env.local` and configure:
- `OPENAI_API_KEY` - OpenAI API access
- `ANTHROPIC_API_KEY` - Anthropic API access
- `SUPABASE_URL` - Database URL
- `SUPABASE_ANON_KEY` - Public database key
- `SUPABASE_SERVICE_ROLE_KEY` - Admin database key

## 📱 Mobile Configuration

Set `EXPO_PUBLIC_API_URL` environment variable to point to your backend:
- Development: `http://localhost:3001`
- Production: Railway deployment URL

## 🤝 Contributing

1. Read `CLAUDE.md` for detailed development guidelines
2. Follow existing code conventions
3. Use TypeScript with proper typing
4. Test changes locally before submitting
5. Run linting and formatting before commits

## 📚 Documentation

- `CLAUDE.md` - Comprehensive development guide
- `docs/` - Additional project documentation
- `ROADMAP.md` - Feature roadmap and priorities

---

Built with ❤️ for the Swedish health community
