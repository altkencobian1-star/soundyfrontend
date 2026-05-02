import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import API_URL from '../utils/api';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Heart, Download, Music, Shuffle, Repeat, Repeat1, List, Mic2, Minimize2, WifiOff
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { saveTrack, hasTrack } from '../utils/offlineStorage';

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function Player({ navigate }) {
  const {
    currentSong, isPlaying, isLoading, progress, duration, volume,
    togglePlay, seek, skipNext, skipPrev, changeVolume,
    isShuffle, repeatMode, toggleShuffle, toggleRepeat,
    toggleNowPlaying, toggleQueue, toggleMiniPlayer, toggleLyrics, showLyrics,
    isOffline
  } = usePlayer();
  const { addToDownloads } = useOffline();
  const { getAuthHeaders } = useAuth();
  const [isFav, setIsFav] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);

  useEffect(() => {
    if (!currentSong) return;
    // Check favorite status
    fetch(`${API_URL}/api/songs/favorites/list`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        const favs = data.songs || [];
        setIsFav(favs.some(s => {
          if (currentSong.source === 'itunes') return s.file_path === String(currentSong.id);
          return s.id === currentSong.id;
        }));
      })
      .catch(() => {});
    // Check download status from API
    fetch(`${API_URL}/api/songs/downloads/list`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        const dls = data.songs || [];
        setIsDownloaded(dls.some(s => {
          if (currentSong.source === 'itunes') return s.file_path === String(currentSong.id);
          return s.id === currentSong.id;
        }));
      })
      .catch(() => {});

    // Check if song is cached locally (works offline)
    const checkLocalCache = async () => {
      const cached = await hasTrack(currentSong.id);
      if (cached) setIsDownloaded(true);
    };
    checkLocalCache();
  }, [currentSong]);

  async function toggleFavorite() {
    if (!currentSong) return;
    const res = await fetch(`${API_URL}/api/songs/favorite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ song: currentSong }),
    });
    const data = await res.json();
    setIsFav(data.favorited);
  }

  async function downloadSong() {
    if (!currentSong) return;

    // First, get the download URL from backend
    const res = await fetch(`${API_URL}/api/songs/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ song: currentSong }),
    });
    const data = await res.json();

    if (data.downloaded) {
      setIsDownloaded(true);

      // Show user what they got
      if (data.isFullSong) {
        alert(`✅ "${currentSong.title}" downloaded as FULL song! You can now listen to the complete track offline.`);
      } else {
        alert(`⚠️ "${currentSong.title}" downloaded as 30-second preview only.\n\nTo get full songs, install yt-dlp:\nhttps://github.com/yt-dlp/yt-dlp#installation`);
      }

      // Cache the actual audio file for offline playback
      if (data.localPath) {
        // Fetch the audio file as blob and save to IndexedDB
        const streamUrl = `${API_URL}/api/songs/stream-by-path?path=${encodeURIComponent(data.localPath)}`;
        console.log('[Player] Downloading audio file:', streamUrl);
        
        const audioResponse = await fetch(streamUrl, { headers: getAuthHeaders() });
        const audioBlob = await audioResponse.blob();
        
        const songId = data.song?.id || currentSong.id;
        const savedUrl = await saveTrack(songId, audioBlob, {
          title: (data.song || currentSong).title,
          artist: (data.song || currentSong).artist,
          album: (data.song || currentSong).album,
          duration: (data.song || currentSong).duration,
          coverUrl: (data.song || currentSong).coverUrl || (data.song || currentSong).cover_url
        });
        
        console.log('[Player] Audio saved to IndexedDB:', songId, 'Size:', audioBlob.size);
        if (savedUrl) {
          console.log('[Player] Audio cached successfully for offline playback');
        }
        
        // Add to downloads context for offline access AFTER saving to IndexedDB
        const downloadedTrack = {
          id: songId,
          title: (data.song || currentSong).title,
          artist: (data.song || currentSong).artist,
          album: (data.song || currentSong).album,
          duration: (data.song || currentSong).duration,
          coverUrl: (data.song || currentSong).coverUrl || (data.song || currentSong).cover_url,
          size: audioBlob.size,
          isFullSong: data.isFullSong
        };
        addToDownloads(downloadedTrack);
        console.log('[Player] Added to downloads:', downloadedTrack.title);
      }
    }
  }

  if (!currentSong) {
    return (
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-[#181818] border-t border-[#282828] flex items-center justify-center z-50">
        <p className="text-[#b3b3b3] text-sm">Select a song to start playing</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-[#181818] border-t border-[#282828] px-4 flex items-center gap-4 z-50">
      {/* Left: Song Info */}
      <div className="flex items-center gap-3 w-72 min-w-0">
        <div
          className="w-14 h-14 bg-[#282828] rounded flex items-center justify-center shrink-0 cursor-pointer hover:bg-[#3e3e3e] transition-colors"
          onClick={toggleNowPlaying}
        >
          {currentSong.cover_url ? (
            <img src={currentSong.cover_url} alt="" className="w-full h-full rounded object-cover" />
          ) : (
            <Music className="w-6 h-6 text-[#b3b3b3]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate hover:underline cursor-pointer" onClick={toggleNowPlaying}>
            {currentSong.title}
          </p>
          <p className="text-xs text-[#b3b3b3] truncate">{currentSong.artist}</p>
        </div>
        <button onClick={toggleFavorite} className="shrink-0 text-[#b3b3b3] hover:text-white">
          <Heart className={`w-4 h-4 ${isFav ? 'text-[#1db954] fill-[#1db954]' : ''}`} />
        </button>
        <button onClick={downloadSong} className="shrink-0 text-[#b3b3b3] hover:text-white" title="Download for offline">
          <Download className={`w-4 h-4 ${isDownloaded ? 'text-[#1db954]' : ''}`} />
        </button>
      </div>

      {/* Center: Controls */}
      <div className="flex-1 flex flex-col items-center gap-1 max-w-2xl">
        <div className="flex items-center gap-5">
          <button onClick={toggleShuffle} className={`text-[#b3b3b3] hover:text-white ${isShuffle ? 'text-[#1db954]' : ''}`}>
            <Shuffle className="w-4 h-4" />
          </button>
          <button onClick={skipPrev} className="text-[#b3b3b3] hover:text-white">
            <SkipBack className="w-5 h-5" />
          </button>
          <button
            onClick={togglePlay}
            className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4 text-black" />
            ) : (
              <Play className="w-4 h-4 text-black ml-0.5" />
            )}
          </button>
          <button onClick={skipNext} className="text-[#b3b3b3] hover:text-white">
            <SkipForward className="w-5 h-5" />
          </button>
          <button onClick={toggleRepeat} className={`text-[#b3b3b3] hover:text-white ${repeatMode !== 'off' ? 'text-[#1db954]' : ''}`}>
            {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex items-center gap-2 w-full px-8">
          <span className="text-xs text-[#b3b3b3] w-10 text-right">{formatTime(progress)}</span>
          <input
            type="range" min={0} max={duration || 0} value={progress}
            onChange={e => seek(parseFloat(e.target.value))}
            className="flex-1 h-1 cursor-pointer accent-[#1db954]"
            style={{ background: `linear-gradient(to right, #1db954 ${duration ? (progress/duration)*100 : 0}%, #535353 ${duration ? (progress/duration)*100 : 0}%)` }}
          />
          <span className="text-xs text-[#b3b3b3] w-10">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Queue + Volume */}
      <div className="flex items-center gap-3 w-72 justify-end">
        {/* Offline Indicator */}
        {isOffline && (
          <div className="flex items-center gap-1 px-2 py-1 bg-red-500/20 rounded text-red-400 text-xs" title="Offline Mode">
            <WifiOff className="w-3 h-3" />
            <span>Offline</span>
          </div>
        )}
        <button
          onClick={toggleLyrics}
          className={`hover:text-white ${showLyrics ? 'text-[#1db954]' : 'text-[#b3b3b3]'}`}
          title="Lyrics"
        >
          <Mic2 className="w-4 h-4" />
        </button>
        <button onClick={toggleQueue} className="text-[#b3b3b3] hover:text-white">
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={toggleMiniPlayer}
          className="text-[#b3b3b3] hover:text-white"
          title="Mini Player"
        >
          <Minimize2 className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 w-32">
          <button onClick={() => changeVolume(volume > 0 ? 0 : 0.7)} className="text-[#b3b3b3] hover:text-white">
            {volume > 0 ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <input
            type="range" min={0} max={1} step={0.01} value={volume}
            onChange={e => changeVolume(parseFloat(e.target.value))}
            className="flex-1 h-1 cursor-pointer accent-[#1db954]"
            style={{ background: `linear-gradient(to right, #1db954 ${volume*100}%, #535353 ${volume*100}%)` }}
          />
        </div>
      </div>
    </div>
  );
}
