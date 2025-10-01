# Deployment Instructions

## Frontend (React App) - Deploy to Vercel

### Prerequisites
- GitHub account
- Push your code to GitHub repository

### Steps:
1. **Commit and push your code**:
   ```bash
   git add .
   git commit -m "Ready for deployment with CookieBot integration"
   git push origin main
   ```

2. **Deploy to Vercel**:
   - Visit [vercel.com](https://vercel.com)
   - Sign up with GitHub
   - Click "New Project"
   - Import your repository
   - Vercel auto-detects Vite settings

3. **Add Environment Variables** in Vercel dashboard:
   - `VITE_COOKIEBOT_ID` = (will add after getting domain)

## Backend (Node.js API) - Deploy to Railway

### Steps:
1. **Create railway account**:
   - Visit [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy backend**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will detect Node.js

3. **Add Environment Variables** in Railway:
   - `OPENAI_API_KEY` = your OpenAI key
   - `PORT` = 3001

4. **Update frontend API calls**:
   - Replace `localhost:3001` with Railway domain
   - Example: `https://your-app.railway.app`

## Alternative Options

### Netlify (Frontend only)
- Similar to Vercel
- Good for static sites
- Easy GitHub integration

### Render (Full-stack)
- Can deploy both frontend and backend
- Free tier available
- Good for complete applications

### Heroku (Traditional)
- Supports full-stack apps
- More configuration needed
- Paid plans required now

## Recommended Stack:
- **Frontend**: Vercel (fast, free, great for React)
- **Backend**: Railway (easy Node.js deployment)

Would you like me to help with any specific deployment platform?