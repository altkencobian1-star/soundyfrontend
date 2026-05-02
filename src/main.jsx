  import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { PlayerProvider } from './contexts/PlayerContext';
import { OfflineProvider } from './contexts/OfflineContext';
import './index.css';

// In production (Vercel), redirect /api calls to the backend tunnel URL
const API_BASE = import.meta.env.VITE_API_URL || '';
if (API_BASE) {
  const originalFetch = window.fetch;
  window.fetch = (url, options) => {
    if (typeof url === 'string' && url.startsWith('/api')) {
      url = API_BASE + url;
    }
    return originalFetch(url, options);
  };
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
