/**
 * Audio Storage using IndexedDB
 * Stores actual audio files for offline playback
 */

const DB_NAME = 'SoundyAudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'audioFiles';
const META_STORE = 'audioMetadata';

// Initialize IndexedDB
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Store for audio blobs
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const audioStore = db.createObjectStore(STORE_NAME, { keyPath: 'trackId' });
        audioStore.createIndex('downloadedAt', 'downloadedAt', { unique: false });
      }
      
      // Store for metadata
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'trackId' });
      }
    };
  });
}

/**
 * Save audio file to IndexedDB
 * @param {string} trackId - Unique track identifier
 * @param {Blob} audioBlob - The audio file as Blob
 * @param {Object} metadata - Song metadata (title, artist, cover, etc.)
 * @returns {Promise<string>} - Object URL for immediate playback
 */
export async function saveAudioFile(trackId, audioBlob, metadata) {
  console.log('[AudioStorage] Saving audio:', trackId, 'Size:', audioBlob.size);
  
  try {
    const db = await initDB();
    
    // Create object URL for the blob
    const objectUrl = URL.createObjectURL(audioBlob);
    
    // Store the blob
    const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');
    const audioStore = tx.objectStore(STORE_NAME);
    const metaStore = tx.objectStore(META_STORE);
    
    // Save audio blob
    await new Promise((resolve, reject) => {
      const request = audioStore.put({
        trackId,
        blob: audioBlob,
        size: audioBlob.size,
        downloadedAt: Date.now()
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    // Save metadata
    await new Promise((resolve, reject) => {
      const request = metaStore.put({
        trackId,
        ...metadata,
        objectUrl,
        downloadedAt: Date.now()
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    console.log('[AudioStorage] Saved successfully:', trackId);
    return objectUrl;
  } catch (error) {
    console.error('[AudioStorage] Save failed:', error);
    throw error;
  }
}

/**
 * Get audio file from IndexedDB
 * @param {string} trackId 
 * @returns {Promise<{blob: Blob, metadata: Object, objectUrl: string} | null>}
 */
export async function getAudioFile(trackId) {
  console.log('[AudioStorage] Getting audio:', trackId);
  
  try {
    const db = await initDB();
    const tx = db.transaction([STORE_NAME, META_STORE], 'readonly');
    const audioStore = tx.objectStore(STORE_NAME);
    const metaStore = tx.objectStore(META_STORE);
    
    // Get blob
    const audioData = await new Promise((resolve, reject) => {
      const request = audioStore.get(trackId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    if (!audioData) {
      console.log('[AudioStorage] Audio not found:', trackId);
      return null;
    }
    
    // Get metadata
    const metadata = await new Promise((resolve, reject) => {
      const request = metaStore.get(trackId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    // Create fresh object URL
    const objectUrl = URL.createObjectURL(audioData.blob);
    
    console.log('[AudioStorage] Audio retrieved:', trackId, 'Size:', audioData.blob.size);
    return {
      blob: audioData.blob,
      metadata,
      objectUrl
    };
  } catch (error) {
    console.error('[AudioStorage] Get failed:', error);
    return null;
  }
}

/**
 * Check if audio exists in storage
 * @param {string} trackId 
 * @returns {Promise<boolean>}
 */
export async function hasAudioFile(trackId) {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    
    const result = await new Promise((resolve, reject) => {
      const request = store.get(trackId);
      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => reject(request.error);
    });
    
    return result;
  } catch (error) {
    console.error('[AudioStorage] Check failed:', error);
    return false;
  }
}

/**
 * Delete audio file from storage
 * @param {string} trackId 
 */
export async function deleteAudioFile(trackId) {
  console.log('[AudioStorage] Deleting:', trackId);
  
  try {
    const db = await initDB();
    const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');
    const audioStore = tx.objectStore(STORE_NAME);
    const metaStore = tx.objectStore(META_STORE);
    
    await Promise.all([
      new Promise((resolve, reject) => {
        const request = audioStore.delete(trackId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise((resolve, reject) => {
        const request = metaStore.delete(trackId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    ]);
    
    console.log('[AudioStorage] Deleted:', trackId);
  } catch (error) {
    console.error('[AudioStorage] Delete failed:', error);
    throw error;
  }
}

/**
 * Get all stored audio metadata
 * @returns {Promise<Array>}
 */
export async function getAllAudioMetadata() {
  console.log('[AudioStorage] Getting all metadata');
  
  try {
    const db = await initDB();
    const tx = db.transaction(META_STORE, 'readonly');
    const store = tx.objectStore(META_STORE);
    
    const result = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    console.log('[AudioStorage] Found', result.length, 'tracks');
    return result;
  } catch (error) {
    console.error('[AudioStorage] Get all failed:', error);
    return [];
  }
}

/**
 * Get storage stats
 * @returns {Promise<{count: number, totalSize: number}>}
 */
export async function getStorageStats() {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    
    const allFiles = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    const totalSize = allFiles.reduce((sum, file) => sum + (file.size || 0), 0);
    
    return {
      count: allFiles.length,
      totalSize
    };
  } catch (error) {
    console.error('[AudioStorage] Stats failed:', error);
    return { count: 0, totalSize: 0 };
  }
}

/**
 * Clear all audio storage
 */
export async function clearAllAudio() {
  console.log('[AudioStorage] Clearing all audio');
  
  try {
    const db = await initDB();
    const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');
    
    await Promise.all([
      new Promise((resolve, reject) => {
        const request = tx.objectStore(STORE_NAME).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise((resolve, reject) => {
        const request = tx.objectStore(META_STORE).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    ]);
    
    console.log('[AudioStorage] All audio cleared');
  } catch (error) {
    console.error('[AudioStorage] Clear failed:', error);
    throw error;
  }
}

// Export for debugging
window.audioStorage = {
  saveAudioFile,
  getAudioFile,
  hasAudioFile,
  deleteAudioFile,
  getAllAudioMetadata,
  getStorageStats,
  clearAllAudio
};

export default {
  saveAudioFile,
  getAudioFile,
  hasAudioFile,
  deleteAudioFile,
  getAllAudioMetadata,
  getStorageStats,
  clearAllAudio
};
