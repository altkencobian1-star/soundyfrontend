import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { PlayerProvider } from './contexts/PlayerContext';
import { OfflineProvider } from './contexts/OfflineContext';
import './index.css';

// REBUILD TRIGGER: 2026-05-02-1430 - Force Vercel redeploy
// In production (Vercel), redirect /api calls to the backend tunnel URL
// NOTE: This runs only in browser, guarded by typeof window check
if (typeof window !== 'undefined') {
  const API_BASE = import.meta.env.VITE_API_URL || '';
  console.log('[Main] API_BASE from env:', API_BASE);
  
  if (API_BASE) {
    const originalFetch = window.fetch;
    window.fetch = (url, options) => {
      if (typeof url === 'string' && url.startsWith('/api')) {
        const fullUrl = API_BASE + url;
        console.log('[Main] Rewriting fetch:', url, '->', fullUrl);
        url = fullUrl;
      }
      return originalFetch(url, options);
    };
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <PlayerProvider>
        <OfflineProvider>
          <App />
        </OfflineProvider>
      </PlayerProvider>
    </AuthProvider>
  </React.StrictMode>
);
