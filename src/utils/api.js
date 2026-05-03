// API Configuration - Hardcoded for production to avoid env issues - V4
const API_URL = "https://soundybackend.onrender.com";

// Debug log
if (typeof window !== 'undefined') {
  console.log('[API] Using backend URL:', API_URL);
}

export default API_URL;
