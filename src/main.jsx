import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { PlayerProvider } from './contexts/PlayerContext';
import { OfflineProvider } from './contexts/OfflineContext';
import './index.css';

// REBUILD TRIGGER: 2026-05-02-1200 - Fix API URL conflicts
// API calls now use centralized API_URL from utils/api.js
// No fetch override needed - all components use proper API URLs

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
