/**
 * OfflineContext - Manages offline downloads, playback, and library
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { 
  saveTrack, 
  getTrack, 
  hasTrack, 
  deleteTrack, 
  getAllTracks,
  getStorageStats as getIDBStorageStats 
} from '../utils/offlineStorage';
import API_URL from '../utils/api';

const OfflineContext = createContext(null);

export function OfflineProvider({ children }) {
  const { getAuthHeaders, token } = useAuth();
  
  // Offline State
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineLibrary, setOfflineLibrary] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [storageStats, setStorageStats] = useState({ totalSize: 0, fileCount: 0 });
  
  // Download State
  const [activeDownloads, setActiveDownloads] = useState(new Map());
  const [downloadProgress, setDownloadProgress] = useState({});
  
  // Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Load offline library from IndexedDB
   */
  const loadOfflineLibrary = useCallback(async () => {
    console.log('[OfflineContext] Loading offline library from IndexedDB...');
    setIsLoading(true);
    try {
      const metadata = await getAllTracks();
      console.log('[OfflineContext] Loaded from IndexedDB:', metadata.length, 'tracks');
      
      const tracks = metadata.map(m => ({
        id: m.id,
        dbTrackId: m.id,
        title: m.title,
        artist: m.artist,
        album: m.album || 'Unknown Album',
        duration: m.duration,
        cover_url: m.coverUrl || '/default-cover.png',
        source_type: 'downloaded',
        offlineAvailable: true,
        offlineSize: m.size,
        downloadedAt: m.downloadedAt
      }));
      
      setOfflineLibrary(tracks);
      
      const stats = await getIDBStorageStats();
      setStorageStats(stats);
      
      return tracks;
    } catch (err) {
      console.error('[OfflineContext] Load library error:', err);
      setOfflineLibrary([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadOfflineLibrary();
  }, [loadOfflineLibrary]);

  /**
   * Download a track for offline use
   */
  const downloadTrack = useCallback(async (track) => {
    const trackId = track.id;
    
    try {
      if (activeDownloads.has(trackId)) {
        return { alreadyDownloading: true };
      }
      
      const alreadyExists = await hasTrack(trackId);
      if (alreadyExists) {
        console.log('[OfflineContext] Track already in storage:', track.title);
        const existing = offlineLibrary.find(t => t.id === trackId);
        return { alreadyDownloaded: true, track: existing };
      }
      
      setActiveDownloads(prev => {
        const next = new Map(prev);
        next.set(trackId, { track, startTime: Date.now(), progress: 0 });
        return next;
      });
      
      console.log('[OfflineContext] Getting download URL for:', track.title);
      const response = await fetch(`${API_URL}/api/songs/download`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ song: track })
      });
      
      const data = await response.json();
      console.log('[OfflineContext] Download response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get download URL');
      }
      
      const audioUrl = data.localPath 
        ? `${API_URL}/api/songs/stream-by-path?path=${encodeURIComponent(data.localPath)}` 
        : data.song?.file_path;
        
      if (!audioUrl) {
        throw new Error('No audio URL available');
      }
      
      setDownloadProgress(prev => ({
        ...prev,
        [trackId]: { progress: 50, status: 'downloading', message: 'Fetching audio...' }
      }));
      
      const audioResponse = await fetch(audioUrl, { headers: getAuthHeaders() });
      if (!audioResponse.ok) {
        throw new Error('Failed to fetch audio file');
      }
      
      const audioBlob = await audioResponse.blob();
      console.log('[OfflineContext] Audio blob received:', audioBlob.size, 'bytes');
      
      setDownloadProgress(prev => ({
        ...prev,
        [trackId]: { progress: 75, status: 'saving', message: 'Saving to storage...' }
      }));
      
      const objectUrl = await saveTrack(trackId, audioBlob, {
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration,
        cover_url: track.cover_url,
        size: audioBlob.size
      });
      
      console.log('[OfflineContext] Audio saved to IndexedDB:', trackId);
      
      const downloadedTrack = {
        id: trackId,
        dbTrackId: trackId,
        title: track.title,
        artist: track.artist,
        album: track.album || 'Unknown Album',
        duration: track.duration,
        cover_url: track.cover_url || '/default-cover.png',
        source_type: 'downloaded',
        offlineAvailable: true,
        offlineSize: audioBlob.size,
        offlineSource: data.isFullSong ? 'youtube' : 'preview',
        objectUrl: objectUrl,
        downloadedAt: Date.now()
      };
      
      setOfflineLibrary(prev => [downloadedTrack, ...prev]);
      
      const stats = await getIDBStorageStats();
      setStorageStats(stats);
      
      setActiveDownloads(prev => {
        const next = new Map(prev);
        next.delete(trackId);
        return next;
      });
      
      setDownloadProgress(prev => {
        const next = { ...prev };
        delete next[trackId];
        return next;
      });
      
      console.log('[OfflineContext] Download complete:', track.title);
      return {
        success: true, 
        track: downloadedTrack,
        size: audioBlob.size,
        objectUrl
      };
    } catch (err) {
      console.error('[OfflineContext] Download error:', err);
      setActiveDownloads(prev => {
        const next = new Map(prev);
        next.delete(trackId);
        return next;
      });
      throw err;
    }
  }, [offlineLibrary, getAuthHeaders, activeDownloads]);

  /**
   * Check if track is downloaded
   */
  const isTrackDownloaded = useCallback(async (trackId) => {
    const inMemory = offlineLibrary.some(t => t.id === trackId);
    if (inMemory) return true;
    return await hasTrack(trackId);
  }, [offlineLibrary]);

  /**
   * Add track to offline library (used by Player after download)
   */
  const addToDownloads = useCallback((track) => {
    console.log('[OfflineContext] Adding track to downloads:', track.title);
    
    const trackData = {
      id: track.id,
      dbTrackId: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album || 'Unknown Album',
      duration: track.duration,
      cover_url: track.coverUrl || track.cover_url || '/default-cover.png',
      source_type: 'downloaded',
      offlineAvailable: true,
      offlineSize: track.size,
      downloadedAt: Date.now()
    };
    
    setOfflineLibrary(prev => {
      const exists = prev.some(t => t.id === track.id);
      if (exists) {
        return prev.map(t => t.id === track.id ? trackData : t);
      }
      return [...prev, trackData];
    });
    
    console.log('[OfflineContext] Track added to downloads');
  }, []);

  /**
   * Delete downloaded track
   */
  const deleteDownload = useCallback(async (trackId) => {
    try {
      console.log('[OfflineContext] Deleting track:', trackId);
      await deleteTrack(trackId);
      setOfflineLibrary(prev => prev.filter(t => t.id !== trackId));
      
      const stats = await getIDBStorageStats();
      setStorageStats(stats);
      
      console.log('[OfflineContext] Track deleted:', trackId);
      return { success: true };
    } catch (err) {
      console.error('[OfflineContext] Delete error:', err);
      throw err;
    }
  }, []);

  /**
   * Get offline stream URL
   */
  const getOfflineStreamUrl = useCallback(async (trackId) => {
    const track = offlineLibrary.find(t => t.id === trackId);
    if (track?.objectUrl) {
      console.log('[OfflineContext] Using cached object URL');
      return track.objectUrl;
    }
    
    const audioData = await getTrack(trackId);
    if (audioData?.objectUrl) {
      console.log('[OfflineContext] Using IndexedDB object URL');
      return audioData.objectUrl;
    }
    
    console.error('[OfflineContext] No offline audio found for:', trackId);
    return null;
  }, [offlineLibrary]);

  /**
   * Play track with offline fallback
   */
  const playTrackWithOffline = useCallback(async (track, options = {}) => {
    const { preferOffline = false, onPlay, onError } = options;
    const trackId = track.id || track.trackId;
    
    const offlineTrack = offlineLibrary.find(t => t.id === trackId);
    const useOffline = offlineTrack && (isOffline || preferOffline);
    
    if (useOffline) {
      try {
        const offlineUrl = await getOfflineStreamUrl(trackId);
        if (!offlineUrl) throw new Error('No offline audio available');
        
        if (onPlay) onPlay(offlineUrl, offlineTrack || track);
        return { source: 'offline', url: offlineUrl, track: offlineTrack || track };
      } catch (err) {
        if (!isOffline && track.previewUrl) {
          if (onPlay) onPlay(track.previewUrl, track);
          return { source: 'online', url: track.previewUrl, track };
        }
        if (onError) onError(err);
        return { error: err };
      }
    }
    
    if (isOffline) {
      return { error: 'No internet and track not available offline', availableOffline: false };
    }
    
    return { source: 'online', isOffline: false, useOnline: true };
  }, [isOffline, offlineLibrary, getOfflineStreamUrl]);

  /**
   * Get storage stats
   */
  const getStorageStats = useCallback(async () => {
    const stats = await getIDBStorageStats();
    setStorageStats(stats);
    return stats;
  }, []);

  /**
   * Cleanup storage
   */
  const cleanupStorage = useCallback(async () => {
    console.log('[OfflineContext] Cleanup not implemented');
    return { success: true };
  }, []);

  // Context value
  const value = {
    isOffline,
    offlineLibrary,
    isLoading,
    storageStats,
    activeDownloads,
    downloadProgress,
    downloadTrack,
    deleteDownload,
    isTrackDownloaded,
    addToDownloads,
    loadOfflineLibrary,
    getOfflineStreamUrl,
    playTrackWithOffline,
    getStorageStats,
    cleanupStorage
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
}
