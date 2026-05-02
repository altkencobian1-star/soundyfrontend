  import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { PlayerProvider } from './contexts/PlayerContext';
import { OfflineProvider } from './contexts/OfflineContext';
import './index.css';

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
