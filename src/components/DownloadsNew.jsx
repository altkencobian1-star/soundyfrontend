import { useState, useEffect } from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import { useOffline } from '../contexts/OfflineContext';
import { useAuth } from '../contexts/AuthContext';
import API_URL from '../utils/api';
import { Download, Play, Music, WifiOff, Loader2, X, AlertCircle } from 'lucide-react';
import { getOfflineSongs, getCacheInfo } from '../utils/offlineStorage';

export default function Downloads({ navigate }) {
  const [songs, setSongs] = useState([]);
  const [cacheInfo, setCacheInfo] = useState({ sizeFormatted: '0 B', count: 0 });
  const { playSong, isOffline } = usePlayer();
  const { getAuthHeaders } = useAuth();
  const { 
    offlineLibrary, 
    downloadProgress, 
    activeDownloads, 
    isTrackDownloaded,
    deleteDownload 
  } = useOffline();

  useEffect(() => {
    // Load offline songs from Cache API + localStorage
    const loadOfflineSongs = async () => {
      const offlineSongs = getOfflineSongs();
      console.log('Offline songs from storage:', offlineSongs);

      if (offlineSongs.length > 0) {
        setSongs(offlineSongs);
      }

      // Get cache info
      const info = await getCacheInfo();
      setCacheInfo(info);
    };

    loadOfflineSongs();

    // Also fetch from API when online to sync
    if (!isOffline) {
      fetch(`${API_URL}/api/songs/downloads/list`, { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
          if (data.songs?.length > 0 && songs.length === 0) {
            setSongs(data.songs);
          }
        })
        .catch(() => {});
    }
  }, [getAuthHeaders, isOffline]);

  // Format bytes to human readable
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get active downloads as array
  const activeDownloadsList = Array.from(activeDownloads.entries());

  return (
    <div>
      <div className="flex items-end gap-6 mb-8">
        <div className="w-48 h-48 bg-gradient-to-br from-blue-700 to-spotify-card rounded-lg flex items-center justify-center shrink-0">
          <Download className="w-16 h-16 text-white" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-spotify-light mb-1">Playlist</p>
          <h1 className="text-4xl font-bold mb-2">Downloads</h1>
          <p className="text-spotify-light text-sm">
            {offlineLibrary.length} songs available offline
            {cacheInfo.sizeFormatted !== '0 B' && ` (${cacheInfo.sizeFormatted})`}
            {isOffline && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/20 rounded text-red-400 text-xs">
                <WifiOff className="w-3 h-3" />
                Offline Mode
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Active Downloads Section */}
      {activeDownloadsList.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-spotify-green" />
            Downloading... ({activeDownloadsList.length} active)
          </h2>
          <div className="space-y-3">
            {activeDownloadsList.map(([trackId, download]) => {
              const progress = downloadProgress[trackId] || { progress: 0, status: 'starting' };
              return (
                <div key={trackId} className="bg-spotify-card rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-spotify-dark rounded flex items-center justify-center">
                      <Music className="w-5 h-5 text-spotify-light" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{download.track?.title || 'Unknown'}</p>
                      <p className="text-xs text-spotify-light truncate">
                        {download.track?.artist || 'Unknown Artist'}
                      </p>
                    </div>
                    <span className="text-xs text-spotify-light">
                      {progress.status === 'starting' ? 'Starting...' : 
                       progress.status === 'downloading' ? `${Math.round(progress.progress || 0)}%` : 
                       progress.status}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-spotify-dark rounded-full h-2 mb-2">
                    <div 
                      className="bg-spotify-green h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progress.progress || 0}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs text-spotify-light">
                    <span>
                      {progress.downloadedBytes && progress.totalBytes ? 
                        `${formatBytes(progress.downloadedBytes)} / ${formatBytes(progress.totalBytes)}` : 
                        ''}
                    </span>
                    <span>{progress.speed || ''}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Downloaded Songs */}
      {offlineLibrary.length > 0 && (
        <button
          onClick={() => playSong(offlineLibrary[0], offlineLibrary)}
          className="w-12 h-12 bg-spotify-green rounded-full flex items-center justify-center mb-6 hover:scale-105 transition-transform"
        >
          <Play className="w-6 h-6 text-black ml-0.5" />
        </button>
      )}

      {offlineLibrary.length === 0 && activeDownloadsList.length === 0 ? (
        <div className="text-center py-20">
          <Download className="w-16 h-16 text-spotify-light mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No downloads yet</h2>
          <p className="text-spotify-light mb-4">Download songs for offline listening</p>
          <button
            onClick={() => navigate('/search')}
            className="px-6 py-2 bg-spotify-green text-black font-medium rounded-full hover:scale-105 transition-transform"
          >
            Search Songs
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          {offlineLibrary.map((song, i) => (
            <div
              key={song.id}
              className="flex items-center gap-4 px-4 py-2 rounded-lg hover:bg-spotify-hover group cursor-pointer"
              onClick={() => {
                console.log('Downloaded song clicked:', song);
                playSong(song, offlineLibrary);
              }}
            >
              <span className="text-spotify-light text-sm w-6 text-right">{i + 1}</span>
              <div className="w-10 h-10 bg-spotify-card rounded flex items-center justify-center shrink-0 overflow-hidden">
                {song.cover_url ? (
                  <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                ) : (
                  <Music className="w-5 h-5 text-spotify-light" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{song.title}</p>
                <p className="text-xs text-spotify-light truncate">{song.artist}</p>
              </div>
              {/* Full song or preview badge */}
              {song.offlineSource === 'youtube' ? (
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">FULL</span>
              ) : song.offlineSource === 'jamendo' ? (
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">JAMENDO</span>
              ) : song.source_type === 'preview' ? (
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">30s</span>
              ) : null}
              {song.offlineSize && (
                <span className="text-xs text-spotify-light">{formatBytes(song.offlineSize)}</span>
              )}
              <Download className="w-4 h-4 text-spotify-green" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
