// config/api.js
// API URL is configured via environment variables
// For development: set EXPO_PUBLIC_API_URL in .env file to your computer's local IP
// For production: set EXPO_PUBLIC_API_URL to your production API URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export { API_BASE_URL };
