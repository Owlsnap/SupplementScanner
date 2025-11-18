import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Simple API is running!' });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  console.log('🧪 Test endpoint hit');
  res.json({ success: true, message: 'API is working!', timestamp: new Date().toISOString() });
});

// Simple extraction endpoint - just return mock data for now
app.post('/api/extract-product', async (req, res) => {
  console.log('🎯 POST /api/extract-product - Request received');
  console.log('📦 Body:', req.body);
  
  const { url } = req.body;

  if (!url) {
    console.log('❌ No URL provided in request');
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  console.log('🔍 Mock extracting from:', url);

  // Return mock data for now
  setTimeout(() => {
    res.json({
      success: true,
      name: "Mock Magnesium Bisglycinate",
      price: "299",
      quantity: "90",
      unit: "kapslar",
      activeIngredient: "magnesium bisglycinate",
      dosagePerUnit: "400mg",
      servingSize: "1",
      servingsPerContainer: "90"
    });
  }, 1000);
});

app.listen(PORT, () => {
  console.log(`🚀 Simple API running on http://localhost:${PORT}`);
  console.log(`📝 OpenAI API Key loaded: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
});