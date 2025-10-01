# CookieBot Setup Guide

## 🍪 GDPR Cookie Compliance with CookieBot

Your SuppScanner now includes full GDPR-compliant cookie management powered by CookieBot.

### Setup Instructions

1. **Get CookieBot Account** (Free tier available)
   - Visit [cookiebot.com](https://www.cookiebot.com)
   - Create free account (up to 100 pages)
   - Add your domain: `localhost:5173` (for development)

2. **Configure Your Domain ID**
   - Copy your CookieBot Domain ID from the dashboard
   - Update `.env.local`:
   ```bash
   VITE_COOKIEBOT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

3. **Test the Implementation**
   - Restart your dev server: `npm run dev`
   - Visit your site - you should see the cookie banner
   - Test "Accept All", "Reject All", and "Settings" buttons

### Features Included

✅ **Professional Cookie Banner**
- Matches your app's dark theme design
- Mobile-responsive layout
- Clear privacy messaging

✅ **GDPR Compliance**
- Proper consent collection
- Cookie categorization
- Opt-out functionality

✅ **Fallback System**
- Works without CookieBot (local storage fallback)
- Progressive enhancement approach

✅ **User Experience**
- Non-intrusive banner placement
- Quick accept/reject options
- Detailed preferences modal

### Cookie Categories Managed

- **Essential**: Required for site functionality
- **Analytics**: Usage tracking and improvements
- **Marketing**: Future advertising features

### Production Deployment

For production, update your CookieBot domain settings to include:
- Your production domain (e.g., `supplementscanner.com`)
- Remove `localhost` entries

### Customization

The banner design matches your app's style:
- Dark theme with glassmorphism effects
- Neon green accent colors
- Lucide React icons
- Mobile-optimized responsive design

All cookie banner styling is in `src/components/CookieBanner.jsx` and can be customized to match any design changes.