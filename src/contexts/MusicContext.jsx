/**
 * MusicContext - Full-featured music streaming context
 * Handles: Search, Playback (YouTube/Jamendo/Upload), Queue, Library, History
 */

import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import API_URL from '../utils/api';

const MusicContext = createContext(null);

// YouTube IFrame API loader
let ytApiLoaded = false;
let ytApiReady = false;
const ytApiCallbacks = [];

function loadYouTubeAPI() {
  if (ytApiLoaded) return;
  ytApiLoaded = true;
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
  window.onYouTubeIframeAPIReady = () => {
    ytApiReady = true;
    ytApiCallbacks.forEach(cb => cb());
    ytApiCallbacks.length = 0;
  };
}

function onYTReady(cb) {
  if (ytApiReady) { cb(); return; }
  ytApiCallbacks.push(cb);
}

loadYouTubeAPI();

export function MusicProvider({ children }) {
  // Player State
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isLoading, setIsLoading] = useState(false);
  
  // Stream State
  const [streamSource, setStreamSource] = useState(null); // { type: 'youtube'|'jamendo'|'upload', url, embedUrl }
  const [streamError, setStreamError] = useState(null);
  
  // Queue & History
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [playHistory, setPlayHistory] = useState([]);
  
  // Playback Settings
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off', 'all', 'one'
  
  // UI State
  const [showQueue, setShowQueue] = useState(false);
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  
  // Refs
  const audioRef = useRef(new Audio());
  const playerRef = useRef(null); // YouTube player
  const progressIntervalRef = useRef(null);
  const skipNextRef = useRef(null);

  // ============ PROGRESS TRACKING ============
  const startProgressTracking = useCallback(() => {
    stopProgressTracking();
    progressIntervalRef.current = setInterval(() => {
      if (streamSource?.type === 'youtube' && playerRef.current) {
        try {
          const currentTime = playerRef.current.getCurrentTime?.() || 0;
          const dur = playerRef.current.getDuration?.() || 0;
          setProgress(currentTime);
          if (dur > 0) setDuration(dur);
        } catch {}
      } else if (streamSource?.type === 'jamendo' || streamSource?.type === 'upload') {
        const audio = audioRef.current;
        setProgress(audio.currentTime);
        if (audio.duration > 0) setDuration(audio.duration);
      }
    }, 1000);
  }, [streamSource]);

  const stopProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // ============ YOUTUBE PLAYER ============
  const createYouTubePlayer = useCallback((videoId, startPlaying = false) => {
    if (!videoId) return;
    
    // Destroy existing player
    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch {}
      playerRef.current = null;
    }

    onYTReady(() => {
      playerRef.current = new window.YT.Player('yt-player-iframe', {
        videoId: videoId,
        height: '1',
        width: '1',
        playerVars: {
          autoplay: startPlaying ? 1 : 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
        },
        events: {
          onReady: (event) => {
            event.target.setVolume(Math.round(volume * 100));
            if (startPlaying) {
              event.target.playVideo();
            }
            setIsLoading(false);
            startProgressTracking();
          },
          onStateChange: (event) => {
            const state = event.data;
            if (state === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              setIsLoading(false);
              startProgressTracking();
            } else if (state === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            } else if (state === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
              stopProgressTracking();
              if (repeatMode === 'one') {
                event.target.playVideo();
              } else {
                skipNextRef.current?.();
              }
            } else if (state === window.YT.PlayerState.BUFFERING) {
              setIsLoading(true);
            }
          },
          onError: (event) => {
            console.error('YouTube player error:', event.data);
            setStreamError('YouTube playback failed');
            setIsLoading(false);
            setIsPlaying(false);
          }
        }
      });
    });
  }, [volume, startProgressTracking, stopProgressTracking, repeatMode]);

  // ============ AUDIO PLAYER (Jamendo/Upload) ============
  const setupAudioPlayer = useCallback((url, startPlaying = false) => {
    const audio = audioRef.current;
    
    // Reset
    audio.pause();
    audio.src = '';
    
    // Set up new source
    audio.src = url;
    audio.volume = volume;
    
    // Event handlers
    audio.oncanplay = () => {
      setIsLoading(false);
      setDuration(audio.duration);
      if (startPlaying) {
        audio.play().catch(err => {
          console.error('Audio play error:', err);
          setStreamError('Audio playback failed');
        });
      }
    };
    
    audio.onplay = () => {
      setIsPlaying(true);
      startProgressTracking();
    };
    
    audio.onpause = () => {
      setIsPlaying(false);
    };
    
    audio.onended = () => {
      setIsPlaying(false);
      stopProgressTracking();
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else {
        skipNextRef.current?.();
      }
    };
    
    audio.onerror = (e) => {
      console.error('Audio error:', e, audio.error);
      setStreamError('Audio stream failed');
      setIsLoading(false);
      setIsPlaying(false);
    };
    
    // Load
    audio.load();
    setIsLoading(true);
  }, [volume, startProgressTracking, stopProgressTracking, repeatMode]);

  // ============ MAIN PLAY FUNCTION ============
  const playTrack = useCallback(async (track, trackList = []) => {
    if (!track) return;
    
    console.log('[MusicContext] Playing track:', track.title, 'by', track.artist);
    
    setCurrentTrack(track);
    setIsPlaying(true);
    setProgress(0);
    setDuration(track.duration || 0);
    setIsLoading(true);
    setStreamError(null);
    stopProgressTracking();

    // Add to history
    addToHistory(track);

    // Set up queue
    if (trackList.length > 0) {
      setQueue(trackList);
      const idx = trackList.findIndex(t => t.id === track.id);
      setQueueIndex(idx >= 0 ? idx : 0);
    }

    // Resolve stream source
    try {
      const response = await fetch(`${API_URL}/api/music/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.stream) {
        console.error('[MusicContext] Stream resolution failed:', data.error);
        setStreamError(data.error || 'No playable source found');
        setIsLoading(false);
        setIsPlaying(false);
        return;
      }

      const stream = data.stream;
      console.log('[MusicContext] Stream resolved:', stream.type, stream.url);
      
      setStreamSource(stream);
      
      // Set up appropriate player based on source type
      if (stream.type === 'youtube') {
        createYouTubePlayer(stream.embed_url || stream.videoId, true);
      } else if (stream.type === 'jamendo' || stream.type === 'upload' || stream.type === 'preview') {
        // Stop YouTube if playing
        if (playerRef.current) {
          try { playerRef.current.stopVideo(); } catch {}
        }
        setupAudioPlayer(stream.url, true);
      }
      
    } catch (err) {
      console.error('[MusicContext] Play error:', err);
      setStreamError('Failed to start playback');
      setIsLoading(false);
      setIsPlaying(false);
    }
  }, [createYouTubePlayer, setupAudioPlayer, stopProgressTracking]);

  // ============ PLAYBACK CONTROLS ============
  const togglePlay = useCallback(() => {
    if (!streamSource) return;
    
    if (streamSource.type === 'youtube' && playerRef.current) {
      const state = playerRef.current.getPlayerState?.();
      if (state === window.YT.PlayerState.PLAYING) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        playerRef.current.playVideo();
        setIsPlaying(true);
      }
    } else {
      const audio = audioRef.current;
      if (audio.paused) {
        audio.play();
        setIsPlaying(true);
      } else {
        audio.pause();
        setIsPlaying(false);
      }
    }
  }, [streamSource]);

  const seek = useCallback((seconds) => {
    if (!streamSource) return;
    
    if (streamSource.type === 'youtube' && playerRef.current) {
      playerRef.current.seekTo?.(seconds, true);
    } else {
      audioRef.current.currentTime = seconds;
    }
    setProgress(seconds);
  }, [streamSource]);

  const changeVolume = useCallback((newVolume) => {
    setVolume(newVolume);
    
    if (streamSource?.type === 'youtube' && playerRef.current) {
      playerRef.current.setVolume?.(Math.round(newVolume * 100));
    } else {
      audioRef.current.volume = newVolume;
    }
  }, [streamSource]);

  // ============ SKIP CONTROLS ============
  const skipNext = useCallback(() => {
    if (queue.length === 0) return;
    
    let nextIndex;
    if (isShuffle) {
      const available = queue.map((_, i) => i).filter(i => i !== queueIndex);
      if (available.length === 0) return;
      nextIndex = available[Math.floor(Math.random() * available.length)];
    } else {
      nextIndex = queueIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeatMode === 'all') {
          nextIndex = 0;
        } else {
          return;
        }
      }
    }
    
    setQueueIndex(nextIndex);
    playTrack(queue[nextIndex], queue);
  }, [queue, queueIndex, isShuffle, repeatMode, playTrack]);

  const skipPrev = useCallback(() => {
    if (!streamSource) return;
    
    // If more than 3 seconds in, restart current track
    if (progress > 3) {
      seek(0);
      return;
    }
    
    if (queue.length === 0 || queueIndex <= 0) return;
    
    const prevIndex = queueIndex - 1;
    setQueueIndex(prevIndex);
    playTrack(queue[prevIndex], queue);
  }, [queue, queueIndex, progress, seek, streamSource, playTrack]);

  // Update skipNext ref
  useEffect(() => {
    skipNextRef.current = skipNext;
  }, [skipNext]);

  // ============ QUEUE MANAGEMENT ============
  const addToQueue = useCallback((track) => {
    setQueue(prev => [...prev, track]);
  }, []);

  const removeFromQueue = useCallback((index) => {
    setQueue(prev => {
      const newQueue = [...prev];
      newQueue.splice(index, 1);
      if (index < queueIndex) {
        setQueueIndex(queueIndex - 1);
      } else if (index === queueIndex && newQueue.length > 0) {
        playTrack(newQueue[Math.min(queueIndex, newQueue.length - 1)], newQueue);
      }
      return newQueue;
    });
  }, [queueIndex, playTrack]);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setQueueIndex(-1);
  }, []);

  // ============ HISTORY ============
  const addToHistory = useCallback((track) => {
    setPlayHistory(prev => {
      // Remove if already exists (move to top)
      const filtered = prev.filter(t => t.id !== track.id);
      return [track, ...filtered].slice(0, 100); // Keep last 100
    });
  }, []);

  const clearHistory = useCallback(() => {
    setPlayHistory([]);
  }, []);

  // ============ TOGGLES ============
  const toggleShuffle = useCallback(() => {
    setIsShuffle(prev => !prev);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const toggleQueue = useCallback(() => {
    setShowQueue(prev => !prev);
  }, []);

  const toggleNowPlaying = useCallback(() => {
    setShowNowPlaying(prev => !prev);
  }, []);

  // ============ SEARCH ============
  const searchMusic = useCallback(async (query, options = {}) => {
    try {
      const response = await fetch(`${API_URL}/api/music/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, ...options })
      });
      
      const data = await response.json();
      return data.results || [];
    } catch (err) {
      console.error('[MusicContext] Search error:', err);
      return [];
    }
  }, []);

  // ============ LIBRARY ============
  const saveToLibrary = useCallback(async (track) => {
    try {
      const response = await fetch(`${API_URL}/api/music/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ track })
      });
      
      return response.ok;
    } catch (err) {
      console.error('[MusicContext] Save error:', err);
      return false;
    }
  }, []);

  const getLibrary = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/music/library`, {
        credentials: 'include'
      });
      
      const data = await response.json();
      return data.tracks || [];
    } catch (err) {
      console.error('[MusicContext] Library error:', err);
      return [];
    }
  }, []);

  // ============ CLEANUP ============
  useEffect(() => {
    return () => {
      stopProgressTracking();
      audioRef.current.pause();
      audioRef.current.src = '';
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
      }
    };
  }, [stopProgressTracking]);

  // ============ CONTEXT VALUE ============
  const value = {
    // Player State
    currentTrack,
    isPlaying,
    isLoading,
    progress,
    duration,
    volume,
    streamSource,
    streamError,
    
    // Queue & History
    queue,
    queueIndex,
    playHistory,
    
    // Settings
    isShuffle,
    repeatMode,
    showQueue,
    showNowPlaying,
    
    // Controls
    playTrack,
    togglePlay,
    seek,
    skipNext,
    skipPrev,
    changeVolume,
    
    // Queue
    addToQueue,
    removeFromQueue,
    clearQueue,
    toggleQueue,
    
    // History
    clearHistory,
    toggleNowPlaying,
    
    // Settings
    toggleShuffle,
    toggleRepeat,
    
    // Search
    searchMusic,
    
    // Library
    saveToLibrary,
    getLibrary
  };

  return (
    <MusicContext.Provider value={value}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within MusicProvider');
  }
  return context;
}
