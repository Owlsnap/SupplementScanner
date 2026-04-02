# SupplementScanner Mobile App

React Native mobile app for scanning supplement barcodes and analyzing quality, dosage, and cost.

## Features

- 📸 Barcode scanning using device camera
- 🔍 Product lookup via OpenFoodFacts database
- 🧪 Quality analysis (underdosed/overdosed ingredients)
- 💊 Bioavailability scoring
- 💰 Price per serving calculation
- ✏️ Manual product entry for missing items

## Prerequisites

- Node.js 18+
- Expo Go app on your mobile device ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- Backend server running (see `../SuppScanner/README.md`)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure API URL

The app needs to know where your backend API is running. Create/edit the `.env` file:

```bash
# .env
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3001
```

**Finding your local IP address:**

- **Windows:** Open Command Prompt and run `ipconfig`, look for "IPv4 Address"
- **Mac:** Open Terminal and run `ifconfig | grep "inet "`, look for your network IP
- **Linux:** Run `ip addr show`

**Example:**
```
EXPO_PUBLIC_API_URL=http://192.168.1.100:3001
```

**Important:**
- Do NOT use `localhost` or `127.0.0.1` - these won't work from your mobile device
- Your phone and computer must be on the same WiFi network
- Make sure your firewall allows connections on port 3001

### 3. Start the development server

```bash
npm start
```

This will:
1. Start the Expo development server
2. Show a QR code in your terminal
3. Open Metro bundler in your browser (optional)

### 4. Open on your device

1. Open the **Expo Go** app on your phone
2. Scan the QR code from your terminal
3. Wait for the app to load

## Usage

### Scanning a Barcode

1. Open the app
2. Tap the "Scanner" tab
3. Point camera at a supplement barcode
4. App will automatically detect and process the barcode
5. View product details, ingredients, and quality analysis

### Manual Entry

If a product isn't found:
1. The app will prompt you to add it manually
2. Fill in product details (name, brand, ingredients, etc.)
3. Save to database
4. Quality analysis runs automatically

## Project Structure

```
SuppScannerApp/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation
│   ├── scanner.tsx        # Barcode scanner screen
│   ├── product/[barcode].tsx  # Product details screen
│   └── manual-add.tsx     # Manual entry screen
├── src/
│   ├── config/
│   │   └── api.js         # API configuration (reads from .env)
│   └── services/
│       └── api.js         # API client
├── schemas/
│   └── product.ts         # TypeScript schemas (aligned with backend)
└── .env                   # Environment variables (API URL)
```

## Screens

### Scanner Screen
- Uses device camera to scan barcodes
- Shows scan result and processing status
- Auto-navigates to product details

### Product Details
- Displays product information
- Shows ingredient list with dosages
- Quality analysis (underdosed/overdosed/bioavailability)
- Price per serving
- Edit/update options

### Manual Add
- Form for entering product data
- Ingredient management
- Auto-saves to database
- Runs quality analysis

## API Integration

The app communicates with the backend API:

```typescript
// Example API calls
GET  ${API_BASE_URL}/api/health
POST ${API_BASE_URL}/api/ingest/barcode/:barcode
GET  ${API_BASE_URL}/api/product/:barcode
POST ${API_BASE_URL}/api/ingest/manual
```

All API calls use the `API_BASE_URL` from `.env`.

## Troubleshooting

### "Network request failed"
- **Check backend is running:** Navigate to `http://YOUR_IP:3001/api/health` in a browser
- **Verify .env file:** Make sure `EXPO_PUBLIC_API_URL` has your correct local IP
- **Same WiFi network:** Phone and computer must be on the same network
- **Firewall:** Check that port 3001 isn't blocked
- **Restart Expo:** After changing `.env`, restart the dev server (`npm start`)

### Camera not working
- **Permissions:** App will request camera permission on first use
- **iOS:** Check Settings → Privacy → Camera → Expo Go
- **Android:** Check Settings → Apps → Expo Go → Permissions

### Barcode not scanning
- **Good lighting:** Ensure barcode is well-lit
- **Steady hand:** Hold camera steady for 1-2 seconds
- **Supported formats:** EAN-13, UPC-A, and other common formats
- **Try manual entry:** If scanning fails, use manual add screen

### "Product not found"
This is expected! Not all products are in OpenFoodFacts database.
- Use the manual entry screen to add missing products
- Data will be saved to the backend database
- Future scans will find it

## Development

### Adding new screens
This project uses [Expo Router](https://docs.expo.dev/router/introduction/) (file-based routing).

Add a new file in `app/` to create a new route:
```
app/settings.tsx → /settings
app/history.tsx  → /history
```

### Modifying API calls
Edit `src/services/api.js` for API integration changes.

### Schema changes
Update `schemas/product.ts` and keep aligned with backend schema at `../SuppScanner/src/schemas/supplementSchema.ts`.

## Testing

### Test on physical device
1. Ensure backend is running
2. Update `.env` with correct IP
3. Run `npm start`
4. Scan QR with Expo Go
5. Test barcode scanning with real products

### Test endpoints directly
```bash
# Health check
curl http://YOUR_IP:3001/api/health

# Get product
curl http://YOUR_IP:3001/api/product/7350123456789
```

## Building for Production

### Development build
```bash
npx expo install expo-dev-client
npx eas build --profile development --platform ios
```

### Production build
```bash
# iOS
npx eas build --platform ios

# Android
npx eas build --platform android
```

See [Expo documentation](https://docs.expo.dev/build/introduction/) for more details.

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_API_URL` | Backend API URL | `http://192.168.1.100:3001` |

All variables prefixed with `EXPO_PUBLIC_` are accessible in the app via `process.env`.

## Learn More

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/)

## License

MIT
