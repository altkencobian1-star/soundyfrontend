import { useState, useEffect, useRef } from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import { importFiles, getImportedSongs, getOfflineSongForPlayback, deleteTrack } from '../utils/audioImport';
import { getStorageStats } from '../utils/offlineStorage';
import { Music, Play, Trash2, HardDrive, WifiOff, RefreshCw, Headphones, Plus, Heart } from 'lucide-react';

export default function OfflineLibrary() {
  const { playSong } = usePlayer();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState({});
  const [favorites, setFavorites] = useState(new Set());
  const [storageInfo, setStorageInfo] = useState({ count: 0, totalSize: 0 });
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadLibrary();
  }, []);

  async function loadLibrary() {
    setLoading(true);
    try {
      const imported = await getImportedSongs();
      setSongs(imported);
      const stats = await getStorageStats();
      setStorageInfo(stats);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImporting(true);
    try {
      const results = await importFiles(Array.from(files));
      const successCount = results.filter(r => !r.error).length;
      const failCount = results.filter(r => r.error).length;

      if (successCount > 0) {
        await loadLibrary();
      }
      if (failCount > 0) {
        alert(`${failCount} file(s) failed to import.`);
      }
    } catch (err) {
      console.error('Import error:', err);
      alert('Import failed: ' + err.message);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  async function handlePlay(track) {
    try {
      const song = await getOfflineSongForPlayback(track.id);
      if (song) {
        playSong(song, songs);
      } else {
        alert('Song file not found. It may have been removed.');
        await loadLibrary();
      }
    } catch (err) {
      console.error('Play error:', err);
    }
  }

  async function handleDelete(track) {
    if (!confirm(`Delete "${track.title}"?`)) return;
    setDeleting(prev => ({ ...prev, [track.id]: true }));
    try {
      await deleteTrack(track.id);
      setSongs(prev => prev.filter(s => s.id !== track.id));
      const stats = await getStorageStats();
      setStorageInfo(stats);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleting(prev => ({ ...prev, [track.id]: false }));
    }
  }

  function handleFavorite(song) {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(song.id)) next.delete(song.id);
      else next.add(song.id);
      return next;
    });
  }

  function formatDuration(seconds) {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <HardDrive className="w-8 h-8 text-spotify-green" />
          <div>
            <h1 className="text-3xl font-bold">Offline Library</h1>
            <p className="text-spotify-light text-sm">
              {songs.length} songs · {formatSize(storageInfo.totalSize)} used
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadLibrary}
            className="p-2 rounded-full hover:bg-spotify-card transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-spotify-green hover:bg-spotify-green/90 text-black font-medium rounded-full text-sm transition-colors">
            <Plus className="w-4 h-4" />
            {importing ? 'Importing...' : 'Import Music'}
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              multiple
              onChange={handleImport}
              disabled={importing}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-spotify-green" />
          <span className="ml-3 text-spotify-light">Loading offline library...</span>
        </div>
      ) : songs.length === 0 ? (
        <div className="text-center py-20">
          <HardDrive className="w-16 h-16 text-spotify-light mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No offline songs</h2>
          <p className="text-spotify-light mb-6">
            Import MP3, M4A, WAV, or FLAC files from your device
          </p>
          <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-spotify-green hover:bg-spotify-green/90 text-black font-medium rounded-full text-sm transition-colors">
            <Plus className="w-5 h-5" />
            Import Music
            <input
              type="file"
              accept="audio/*"
              multiple
              onChange={handleImport}
              disabled={importing}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-1">
          {songs.map((track, i) => (
            <div
              key={track.id}
              className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-spotify-hover group cursor-pointer"
              onClick={() => handlePlay(track)}
            >
              {/* Number / Play */}
              <span className="text-spotify-light text-sm w-6 text-right group-hover:hidden">{i + 1}</span>
              <Play className="w-5 h-5 text-spotify-green hidden group-hover:block shrink-0" />

              {/* Cover */}
              <div className="w-12 h-12 bg-spotify-card rounded flex items-center justify-center shrink-0 overflow-hidden">
                {track.cover_url ? (
                  <img
                    src={track.cover_url}
                    alt={track.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <Music className="w-6 h-6 text-spotify-light" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{track.title}</p>
                <p className="text-xs text-spotify-light truncate">
                  {track.artist} {track.album ? `· ${track.album}` : ''}
                </p>
              </div>

              {/* Duration */}
              <span className="text-xs text-spotify-light">
                {formatDuration(track.duration)}
              </span>

              {/* Size */}
              <span className="text-xs text-spotify-light">
                {formatSize(track.size)}
              </span>

              {/* Offline Badge */}
              <span className="flex items-center gap-1 text-xs text-spotify-green bg-spotify-green/10 px-2 py-1 rounded">
                <Headphones className="w-3 h-3" />
                OFFLINE
              </span>

              {/* Favorite */}
              <button
                onClick={(e) => { e.stopPropagation(); handleFavorite(track); }}
                className={`p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                  favorites.has(track.id) ? 'text-spotify-green' : 'text-spotify-light hover:text-white'
                }`}
              >
                <Heart className={`w-4 h-4 ${favorites.has(track.id) ? 'fill-current' : ''}`} />
              </button>

              {/* Delete */}
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(track); }}
                disabled={deleting[track.id]}
                className="p-2 rounded-full hover:bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete"
              >
                <Trash2 className={`w-4 h-4 ${deleting[track.id] ? 'animate-pulse' : ''}`} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {songs.length > 0 && (
        <div className="mt-8 p-4 bg-spotify-card rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-spotify-light">
              <strong>{songs.length}</strong> songs · <strong>{formatSize(storageInfo.totalSize)}</strong> stored
            </span>
            <p className="text-spotify-light">Works fully offline — no network needed</p>
          </div>
        </div>
      )}
    </div>
  );
}
