// services/api.js
import { API_BASE_URL } from '../config/api.js';

export const supplementAPI = {
  // Scan barcode
  scanBarcode: async (barcode) => {
    const response = await fetch(`${API_BASE_URL}/api/ingest/barcode/${barcode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  },

  // Get supplement details
  getSupplement: async (barcode) => {
    const response = await fetch(`${API_BASE_URL}/api/product/${barcode}`);
    return response.json();
  },

  // Search supplements
  searchSupplements: async (query) => {
    const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
    return response.json();
  },

  // Get stats
  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/api/stats`);
    return response.json();
  }
};