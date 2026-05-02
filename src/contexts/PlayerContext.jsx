import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useOffline } from './OfflineContext';
import { getTrack } from '../utils/offlineStorage';
import API_URL from '../utils/api';

const PlayerContext = createContext(null);

// Load YouTube IFrame API script once
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

export function PlayerProvider({ children }) {
  const { token, getAuthHeaders } = useAuth();
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [videoId, setVideoId] = useState(null);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off', 'all', 'one'
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyrics, setLyrics] = useState('');
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [recentSongs, setRecentSongs] = useState(() => {
    // Load from localStorage on init
    try {
      return JSON.parse(localStorage.getItem('soundy_recent') || '[]');
    } catch { return []; }
  });
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [downloadedSongs, setDownloadedSongs] = useState(() => {
    // Load from localStorage on init for offline support
    try {
      return JSON.parse(localStorage.getItem('soundy_downloads') || '[]');
    } catch { return []; }
  });

  const playerRef = useRef(null);
  const playerContainerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const audioRef = useRef(new Audio()); // fallback for local files

  // Start progress tracking
  function startProgressTracking() {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      const player = playerRef.current;
      if (player && typeof player.getCurrentTime === 'function' && typeof player.getDuration === 'function') {
        setProgress(player.getCurrentTime());
        setDuration(player.getDuration());
      }
    }, 500);
  }

  function stopProgressTracking() {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }

  // Create YouTube player
  function createYTPlayer(vid, startPlaying = false) {
    console.log('Creating YouTube player for video:', vid, 'startPlaying:', startPlaying);
    if (!vid) {
      console.error('No videoId provided to createYTPlayer');
      return;
    }
    // Destroy existing player
    if (playerRef.current) {
      console.log('Destroying existing YouTube player');
      try { playerRef.current.destroy(); } catch {}
      playerRef.current = null;
    }

    const container = document.getElementById('yt-player-container');
    console.log('YouTube container found:', !!container);
    if (!container) {
      console.error('YouTube player container not found!');
      return;
    }

    console.log('YouTube API ready state:', ytApiReady);
    onYTReady(() => {
      console.log('YouTube API ready, creating player...');
      playerRef.current = new window.YT.Player('yt-player-iframe', {
        videoId: vid,
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
            if (startPlaying) event.target.playVideo();
            setIsLoading(false);
            startProgressTracking();
          },
          onStateChange: (event) => {
            const state = event.data;
            // YT.PlayerState: ENDED=0, PLAYING=1, PAUSED=2, BUFFERING=3, CUED=5
            if (state === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              setIsLoading(false);
              startProgressTracking();
            } else if (state === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            } else if (state === window.YT.PlayerState.BUFFERING) {
              setIsLoading(true);
            } else if (state === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
              stopProgressTracking();
              skipNextRef.current();
            }
          },
          onError: () => {
            setIsLoading(false);
            console.error('YouTube player error');
          },
        },
      });
    });
  }

  // Use refs for callbacks that need latest state
  const skipNextRef = useRef(null);

  // Add song to recent history (like a log)
  const addToRecent = useCallback((song) => {
    setRecentSongs(prev => {
      // Remove if already exists (to move to top)
      const filtered = prev.filter(s => s.id !== song.id);
      // Add to beginning with timestamp
      const updated = [{ ...song, playedAt: Date.now() }, ...filtered].slice(0, 50); // Keep last 50
      // Save to localStorage
      localStorage.setItem('soundy_recent', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Add song to downloads (called after successful download)
  const addToDownloads = useCallback((song) => {
    setDownloadedSongs(prev => {
      // Remove if already exists
      const filtered = prev.filter(s => s.id !== song.id);
      // Add to beginning
      const updated = [song, ...filtered];
      // Save to localStorage
      localStorage.setItem('soundy_downloads', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const playSong = useCallback(async (song, songList = []) => {
    if (!song) return;
    console.log('[Player] Playing song:', song.title, 'ID:', song.id);
    setCurrentSong(song);
    setIsPlaying(true);
    setProgress(0);
    setIsLoading(true);
    stopProgressTracking();

    // Add to recent history
    addToRecent(song);

    if (songList.length > 0) {
      setQueue(songList);
      const idx = songList.findIndex(s => s.id === song.id);
      setQueueIndex(idx >= 0 ? idx : 0);
    }

    // Check if song is available offline (downloaded)
    console.log('Playing song:', song.title, 'ID:', song.id, 'file_path:', song.file_path);
    console.log('Downloaded songs count:', downloadedSongs.length);

    const downloadedSong = downloadedSongs.find(s => {
      // Match by ID
      if (String(s.id) === String(song.id)) {
        console.log('Found downloaded song by ID:', s.id, 'file_path:', s.file_path);
        return true;
      }
      // Match by file_path (handle both full paths and relative paths)
      if (s.file_path && song.file_path) {
        const sPath = s.file_path.replace(/\\/g, '/');
        const songPath = song.file_path.replace(/\\/g, '/');
        const match = sPath === songPath || sPath.endsWith(songPath) || songPath.endsWith(sPath);
        if (match) console.log('Found downloaded song by path:', s.file_path);
        return match;
      }
      // Match by title + artist (for iTunes songs that get a new DB id after download)
      if (s.title === song.title && s.artist === song.artist) {
        console.log('Found downloaded song by title+artist:', s.title, s.artist);
        return true;
      }
      return false;
    });

    // Has local file if the downloaded song has a physical file path
    const hasLocalFile = downloadedSong?.file_path &&
      (downloadedSong.file_path.includes('downloaded-') ||
       downloadedSong.file_path.includes('audio-storage') ||
       downloadedSong.file_path.startsWith('/audio/') ||
       downloadedSong.file_path.includes('full-') ||
       downloadedSong.file_path.endsWith('.mp3') ||
       downloadedSong.file_path.endsWith('.m4a') ||
       downloadedSong.source === 'downloaded');

    console.log('Has local file:', hasLocalFile, 'Downloaded song:', downloadedSong);

    // Get audio element reference (used for both online and offline playback)
    const audio = audioRef.current;

    // Direct blob URL from offline import (fastest path)
    if (song.localBlobUrl || song.objectUrl) {
      console.log('[Player] Playing from local blob URL');
      setVideoId(null);
      if (playerRef.current) { try { playerRef.current.destroy(); } catch {} playerRef.current = null; }
      audio.src = song.localBlobUrl || song.objectUrl;
      audio.load();
      audio.onerror = (e) => {
        console.error('Audio error:', e, audio.error);
        setIsLoading(false);
        setIsPlaying(false);
      };
      audio.play().catch((err) => {
        console.error('Audio play failed:', err);
        setIsLoading(false);
        setIsPlaying(false);
      });
      startAudioProgressTracking();
      return;
    }

    // Check IndexedDB for offline audio blob
    const offlineTrack = await getTrack(song.id);
    if (offlineTrack?.objectUrl) {
      console.log('[Player] Playing from IndexedDB offline storage');
      setVideoId(null);
      if (playerRef.current) { try { playerRef.current.destroy(); } catch {} playerRef.current = null; }
      audio.src = offlineTrack.objectUrl;
      audio.load();
      audio.onerror = (e) => {
        console.error('Audio error:', e, audio.error);
        setIsLoading(false);
        setIsPlaying(false);
      };
      audio.play().catch((err) => {
        console.error('Audio play failed:', err);
        setIsLoading(false);
        setIsPlaying(false);
      });
      startAudioProgressTracking();
      return;
    }

    // ONLINE MODE - check if we have a downloaded version first
    if (hasLocalFile) {
      // Use the downloaded local file even when online (faster, no streaming needed)
      console.log('Using downloaded local file for playback');
      setVideoId(null);
      if (playerRef.current) { try { playerRef.current.destroy(); } catch {} playerRef.current = null; }
      const streamUrl = `${API_URL}/api/songs/stream-by-path?path=${encodeURIComponent(downloadedSong.file_path)}`;
      console.log('Stream URL:', streamUrl);
      audio.src = streamUrl;
      audio.load();
      audio.onerror = (e) => {
        console.error('Audio error:', e, audio.error);
        setIsLoading(false);
        setIsPlaying(false);
      };
      audio.play().catch((err) => {
        console.error('Audio play failed:', err);
        setIsLoading(false);
        setIsPlaying(false);
      });
      startAudioProgressTracking();
      return;
    }

    // ONLINE MODE - YouTube songs (from Invidious search) - play directly via iframe
    if (song.source === 'youtube' || song.youtubeId) {
      const ytId = song.youtubeId || (song.id && song.id.startsWith('youtube_') ? song.id.replace('youtube_', '') : null);
      if (ytId) {
        console.log('[Player] Playing YouTube video directly:', ytId);
        setVideoId(ytId);
        createYTPlayer(ytId, true);
        startAudioProgressTracking();
        return;
      }
    }

    // ONLINE MODE - For online (iTunes) songs that aren't downloaded
    if (song.source === 'itunes') {
      // Search YouTube for full song via backend
      console.log('[Player] Searching YouTube for full song:', song.title, song.artist);
      
      try {
        const searchResponse = await fetch(`${API_URL}/api/search/youtube?q=${encodeURIComponent(song.title + ' ' + song.artist + ' audio')}`, {
          headers: getAuthHeaders()
        });
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          console.log('[Player] YouTube search result:', searchData);
          
          if (searchData.songs && searchData.songs.length > 0) {
            const ytId = searchData.songs[0].youtubeId;
            console.log('[Player] Playing YouTube video:', ytId);
            
            // Play via YouTube player
            setVideoId(ytId);
            createYTPlayer(ytId, true);
            startAudioProgressTracking();
            return;
          }
        }
        
        // Fallback to preview if YouTube search fails
        console.log('[Player] YouTube not available, falling back to preview');
        if (song.previewUrl) {
          setVideoId(null);
          if (playerRef.current) { try { playerRef.current.destroy(); } catch {} playerRef.current = null; }
          audio.src = song.previewUrl;
          audio.play().catch(() => {});
          startAudioProgressTracking();
        } else {
          setIsLoading(false);
          setIsPlaying(false);
        }
      } catch (err) {
        console.error('[Player] YouTube search failed:', err);
        // Fallback to preview
        if (song.previewUrl) {
          setVideoId(null);
          if (playerRef.current) { try { playerRef.current.destroy(); } catch {} playerRef.current = null; }
          audio.src = song.previewUrl;
          audio.play().catch(() => {});
          startAudioProgressTracking();
        } else {
          setIsLoading(false);
          setIsPlaying(false);
        }
      }
      return;
    }

    // For local songs (no source or source !== 'itunes'), use /api/songs/:id/stream
    setVideoId(null);
    if (playerRef.current) { try { playerRef.current.destroy(); } catch {} playerRef.current = null; }
    const streamUrl = `${API_URL}/api/songs/${song.id}/stream`;
    audio.src = streamUrl;
    audio.load();
    audio.play().catch((err) => {
      console.error('Audio play failed:', err);
      setIsLoading(false);
      setIsPlaying(false);
    });
    startAudioProgressTracking();
  }, [isOffline, downloadedSongs]);

  // Audio progress tracking for local/preview fallback
  function startAudioProgressTracking() {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    const audio = audioRef.current;
    progressIntervalRef.current = setInterval(() => {
      if (audio && !audio.paused) {
        setProgress(audio.currentTime);
        setDuration(audio.duration || 0);
      }
    }, 500);

    audio.onended = () => {
      setIsPlaying(false);
      stopProgressTracking();
      skipNextRef.current?.();
    };
    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    audio.onwaiting = () => {
      setIsLoading(true);
    };
    audio.oncanplay = () => {
      setIsLoading(false);
    };
    audio.onerror = () => {
      setIsLoading(false);
      setIsPlaying(false);
      console.error('Audio playback error');
    };
  }

  const togglePlay = useCallback(() => {
    if (!currentSong) return;
    const player = playerRef.current;
    if (player && typeof player.getPlayerState === 'function') {
      const state = player.getPlayerState();
      if (state === window.YT.PlayerState.PLAYING) {
        player.pauseVideo();
        setIsPlaying(false);
      } else {
        player.playVideo();
        setIsPlaying(true);
      }
    } else {
      const audio = audioRef.current;
      if (audio.paused) {
        audio.play().catch(() => {});
        setIsPlaying(true);
      } else {
        audio.pause();
        setIsPlaying(false);
      }
    }
  }, [currentSong]);

  const seek = useCallback((time) => {
    const player = playerRef.current;
    if (player && typeof player.seekTo === 'function') {
      player.seekTo(time, true);
      setProgress(time);
    } else {
      const audio = audioRef.current;
      audio.currentTime = time;
      setProgress(time);
    }
  }, []);

  const skipNext = useCallback(() => {
    if (queue.length === 0) return;
    
    if (repeatMode === 'one') {
      playSong(currentSong, queue);
      return;
    }
    
    let nextIdx;
    if (isShuffle) {
      // Pick a random song that's not the current one
      const availableIndices = queue.map((_, i) => i).filter(i => i !== queueIndex);
      if (availableIndices.length === 0) return;
      nextIdx = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    } else {
      nextIdx = queueIndex + 1;
      if (nextIdx >= queue.length) {
        if (repeatMode === 'all') {
          nextIdx = 0;
        } else {
          return; // Stop at end
        }
      }
    }
    playSong(queue[nextIdx], queue);
  }, [queue, queueIndex, playSong, isShuffle, repeatMode, currentSong]);

  const skipPrev = useCallback(() => {
    const player = playerRef.current;
    const currentTime = player && typeof player.getCurrentTime === 'function'
      ? player.getCurrentTime()
      : audioRef.current.currentTime;

    if (currentTime > 3) {
      if (player && typeof player.seekTo === 'function') {
        player.seekTo(0, true);
      } else {
        audioRef.current.currentTime = 0;
      }
      setProgress(0);
      return;
    }
    if (queueIndex <= 0) return;
    const prevIdx = queueIndex - 1;
    playSong(queue[prevIdx], queue);
  }, [queue, queueIndex, playSong]);

  const changeVolume = useCallback((v) => {
    setVolume(v);
    const player = playerRef.current;
    if (player && typeof player.setVolume === 'function') {
      player.setVolume(Math.round(v * 100));
    } else {
      audioRef.current.volume = v;
    }
  }, []);

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

  const toggleLyrics = useCallback(() => {
    setShowLyrics(prev => !prev);
  }, []);

  // Fetch lyrics for current song
  const fetchLyrics = useCallback(async (song) => {
    if (!song) return;
    setLyricsLoading(true);
    try {
      // Try to fetch from backend lyrics endpoint
      const res = await fetch(`${API_URL}/api/songs/lyrics/${encodeURIComponent(song.title)}/${encodeURIComponent(song.artist)}`);
      if (res.ok) {
        const data = await res.json();
        setLyrics(data.lyrics || 'Lyrics not available for this song.');
      } else {
        // Fallback: Generate placeholder lyrics based on song info
        setLyrics(`🎵 ${song.title} by ${song.artist}\n\n[Verse 1]\nPlaying the melody of your heart...\nRhythms flowing through the night...\n\n[Chorus]\n${song.title} echoing in my mind...\nMusic is the language we all understand...\n\n[Verse 2]\nNotes dancing in the air...\nEvery beat takes me there...\n\n[Outro]\n🎶 La la la...\n\n---\nNote: Connect to a lyrics API like Genius or Musixmatch for real lyrics.`);
      }
    } catch (err) {
      setLyrics('Lyrics not available. Try again later.');
    } finally {
      setLyricsLoading(false);
    }
  }, []);

  // Auto-fetch lyrics when song changes
  useEffect(() => {
    if (currentSong && showLyrics) {
      fetchLyrics(currentSong);
    }
  }, [currentSong, showLyrics, fetchLyrics]);

  const toggleMiniPlayer = useCallback(() => {
    setIsMiniPlayer(prev => !prev);
  }, []);

  const toggleNowPlaying = useCallback(() => {
    setShowNowPlaying(prev => !prev);
  }, []);

  const toggleQueue = useCallback(() => {
    setShowQueue(prev => !prev);
  }, []);

  // Keep skipNext ref updated
  useEffect(() => {
    skipNextRef.current = skipNext;
  }, [skipNext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopProgressTracking();
      if (playerRef.current) { try { playerRef.current.destroy(); } catch {} }
    };
  }, []);

  // Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load downloaded songs for offline playback
  useEffect(() => {
    const loadDownloadedSongs = async () => {
      if (!token) return; // Need auth to load downloads
      try {
        // Load from both download systems with auth headers
        const headers = getAuthHeaders();
        const [songsRes, offlineRes] = await Promise.allSettled([
          fetch(`${API_URL}/api/songs/downloads/list`, { headers }),
          fetch(`${API_URL}/api/offline/downloads`, { headers })
        ]);

        let allDownloaded = [];

        // From /api/songs/downloads/list
        if (songsRes.status === 'fulfilled' && songsRes.value.ok) {
          const data = await songsRes.value.json();
          if (data.songs) allDownloaded.push(...data.songs);
        }

        // From /api/offline/downloads
        if (offlineRes.status === 'fulfilled' && offlineRes.value.ok) {
          const data = await offlineRes.value.json();
          if (data.downloads) {
            const offlineTracks = data.downloads.map(d => ({
              id: d.id,
              title: d.title,
              artist: d.artist,
              album: d.album || '',
              duration: d.duration || 0,
              cover_url: d.cover_url || '',
              file_path: d.file_path || '',
              source: 'downloaded',
              previewUrl: '',
            }));
            // Merge - don't duplicate by id
            const existingIds = new Set(allDownloaded.map(s => String(s.id)));
            offlineTracks.forEach(t => {
              if (!existingIds.has(String(t.id))) {
                allDownloaded.push(t);
              }
            });
          }
        }

        if (allDownloaded.length > 0) {
          setDownloadedSongs(allDownloaded);
          localStorage.setItem('soundy_downloads', JSON.stringify(allDownloaded));
        }
      } catch (err) {
        console.error('Failed to load downloaded songs:', err);
        // If fetch fails, we already have data from localStorage (set in useState init)
      }
    };

    loadDownloadedSongs();
    // Refresh every 30 seconds when online
    const interval = setInterval(() => {
      if (!isOffline && token) loadDownloadedSongs();
    }, 30000);
    return () => clearInterval(interval);
  }, [isOffline, token]);

  return (
    <PlayerContext.Provider value={{
      currentSong, isPlaying, isLoading, progress, duration, volume,
      queue, queueIndex, videoId, isShuffle, repeatMode, showLyrics, lyrics, lyricsLoading, isMiniPlayer,
      showNowPlaying, showQueue, recentSongs, isOffline, downloadedSongs,
      playSong, togglePlay, seek, skipNext, skipPrev, changeVolume,
      toggleShuffle, toggleRepeat, toggleLyrics, toggleMiniPlayer,
      toggleNowPlaying, toggleQueue, addToDownloads
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
