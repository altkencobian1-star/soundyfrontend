// API Configuration - Temporary hardcoded URL to test
const API_URL = "https://soundybackend.onrender.com";
console.log('[API] Using hardcoded backend URL:', API_URL);

// Only log in browser environment
if (typeof window !== 'undefined') {
  console.log('[API] Using backend URL:', API_URL);
}

export default API_URL;

// Helper function for API calls with logging
export async function apiFetch(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  
  // Only log in browser
  if (typeof window !== 'undefined') {
    console.log(`[API] Fetching: ${options.method || 'GET'} ${url}`);
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (typeof window !== 'undefined') {
      console.log(`[API] Response: ${response.status} ${response.statusText}`);
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      if (typeof window !== 'undefined') {
        console.error(`[API] Error ${response.status}:`, errorText);
      }
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return response;
  } catch (error) {
    if (typeof window !== 'undefined') {
      console.error('[API] Fetch error:', error.message);
    }
    throw error;
  }
}
test
