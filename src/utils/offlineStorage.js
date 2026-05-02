/**
 * Offline Storage using IndexedDB
 * Stores actual audio blobs for true offline playback
 */

const DB_NAME = 'SoundyOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'tracks';

// Initialize IndexedDB
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('[OfflineStorage] Failed to open IndexedDB');
      reject(request.error);
    };
    
    request.onsuccess = () => {
      console.log('[OfflineStorage] IndexedDB opened successfully');
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      console.log('[OfflineStorage] Creating/upgrading object store');
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('downloadedAt', 'downloadedAt', { unique: false });
        console.log('[OfflineStorage] Object store "tracks" created');
      }
    };
  });
}

/**
 * Save track with audio blob to IndexedDB
 * @param {string} id - Track ID
 * @param {Blob} audioBlob - Audio file as Blob
 * @param {Object} metadata - Track metadata
 * @returns {Promise<string>} - Object URL for playback
 */
export async function saveTrack(id, audioBlob, metadata) {
  console.log('[OfflineStorage] Saving track:', id, 'Size:', audioBlob?.size || 0);
  
  if (!audioBlob || audioBlob.size === 0) {
    throw new Error('Invalid audio blob');
  }
  
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    // Create object URL for immediate playback
    const objectUrl = URL.createObjectURL(audioBlob);
    
    const trackData = {
      id,
      audioBlob,
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.album,
      duration: metadata.duration,
      coverUrl: metadata.coverUrl,
      size: audioBlob.size,
      objectUrl,
      downloadedAt: Date.now()
    };
    
    await new Promise((resolve, reject) => {
      const request = store.put(trackData);
      request.onsuccess = () => {
        console.log('[OfflineStorage] Track saved successfully:', id);
        resolve();
      };
      request.onerror = () => {
        console.error('[OfflineStorage] Failed to save track:', request.error);
        reject(request.error);
      };
    });
    
    return objectUrl;
  } catch (error) {
    console.error('[OfflineStorage] Save error:', error);
    throw error;
  }
}

/**
 * Get track from IndexedDB
 * @param {string} id 
 * @returns {Promise<{blob: Blob, metadata: Object, objectUrl: string} | null>}
 */
export async function getTrack(id) {
  console.log('[OfflineStorage] Getting track:', id);
  
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    
    const result = await new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    if (!result) {
      console.log('[OfflineStorage] Track not found:', id);
      return null;
    }
    
    // Create fresh object URL
    const objectUrl = URL.createObjectURL(result.audioBlob);
    
    console.log('[OfflineStorage] Track retrieved:', id, 'Size:', result.audioBlob.size);
    return {
      blob: result.audioBlob,
      metadata: {
        id: result.id,
        title: result.title,
        artist: result.artist,
        album: result.album,
        duration: result.duration,
        coverUrl: result.coverUrl,
        size: result.size,
        downloadedAt: result.downloadedAt
      },
      objectUrl
    };
  } catch (error) {
    console.error('[OfflineStorage] Get error:', error);
    return null;
  }
}

/**
 * Check if track exists
 * @param {string} id 
 * @returns {Promise<boolean>}
 */
export async function hasTrack(id) {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    
    const result = await new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => reject(request.error);
    });
    
    return result;
  } catch (error) {
    console.error('[OfflineStorage] Check error:', error);
    return false;
  }
}

/**
 * Get all tracks metadata
 * @returns {Promise<Array>}
 */
export async function getAllTracks() {
  console.log('[OfflineStorage] Getting all tracks');
  
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    
    const results = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    // Return metadata only (without blobs for performance)
    const tracks = results.map(r => ({
      id: r.id,
      title: r.title,
      artist: r.artist,
      album: r.album,
      duration: r.duration,
      coverUrl: r.coverUrl,
      size: r.size,
      downloadedAt: r.downloadedAt,
      hasBlob: !!r.audioBlob
    }));
    
    console.log('[OfflineStorage] Found', tracks.length, 'tracks');
    return tracks;
  } catch (error) {
    console.error('[OfflineStorage] Get all error:', error);
    return [];
  }
}

/**
 * Delete track from storage
 * @param {string} id 
 */
export async function deleteTrack(id) {
  console.log('[OfflineStorage] Deleting track:', id);
  
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    await new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    console.log('[OfflineStorage] Track deleted:', id);
  } catch (error) {
    console.error('[OfflineStorage] Delete error:', error);
    throw error;
  }
}

/**
 * Get storage stats
 * @returns {Promise<{count: number, totalSize: number}>}
 */
export async function getStorageStats() {
  try {
    const tracks = await getAllTracks();
    const totalSize = tracks.reduce((sum, t) => sum + (t.size || 0), 0);
    
    return {
      count: tracks.length,
      totalSize
    };
  } catch (error) {
    console.error('[OfflineStorage] Stats error:', error);
    return { count: 0, totalSize: 0 };
  }
}

/**
 * Clear all tracks
 */
export async function clearAllTracks() {
  console.log('[OfflineStorage] Clearing all tracks');
  
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    await new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    console.log('[OfflineStorage] All tracks cleared');
  } catch (error) {
    console.error('[OfflineStorage] Clear error:', error);
    throw error;
  }
}

// Debug helper
window.offlineStorage = {
  saveTrack,
  getTrack,
  hasTrack,
  deleteTrack,
  getAllTracks,
  getStorageStats,
  clearAllTracks
};

export default {
  saveTrack,
  getTrack,
  hasTrack,
  deleteTrack,
  getAllTracks,
  getStorageStats,
  clearAllTracks
};
