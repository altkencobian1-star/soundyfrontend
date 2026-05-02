import { useState, useEffect } from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { importFiles } from '../utils/audioImport';
import { Play, Pause, Music, Upload, Volume2, Clock } from 'lucide-react';

export default function Home({ navigate }) {
  const [songs, setSongs] = useState([]);
  const [localSongs, setLocalSongs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const { playSong, currentSong, isPlaying, togglePlay, recentSongs } = usePlayer();
  const { getAuthHeaders } = useAuth();

  // Fetch local uploaded songs
  useEffect(() => {
    fetch('/api/songs')
      .then(res => res.json())
      .then(data => setLocalSongs(data.songs || []))
      .catch(() => {});
  }, []);

  // Fetch featured iTunes songs for immediate playback
  useEffect(() => {
    fetch('/api/songs/featured')
      .then(res => res.json())
      .then(data => setSongs(data.songs || []))
      .catch(() => {});
  }, []);

  async function handleUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      const results = await importFiles(Array.from(files));
      const successCount = results.filter(r => !r.error).length;
      if (successCount > 0 && navigate) {
        navigate('offline');
      }
    } catch (err) {
      console.error('Import failed:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  const isCurrentSong = (song) => currentSong?.id === song.id;

  const allSongs = [...localSongs, ...songs];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Good evening</h1>
        <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-[#1db954] hover:bg-[#1ed760] text-black font-medium rounded-full text-sm transition-colors">
          <Upload className="w-4 h-4" />
          {uploading ? 'Uploading...' : 'Upload Music'}
          <input type="file" accept="audio/*" multiple onChange={handleUpload} className="hidden" />
        </label>
      </div>

      {/* Recently Played */}
      {recentSongs.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-spotify-light" />
            <h2 className="text-lg font-semibold">Recently Played</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {recentSongs.slice(0, 10).map(song => (
              <div
                key={song.id}
                className="flex-shrink-0 w-40 bg-[#181818] hover:bg-[#282828] p-3 rounded-lg transition-all duration-200 group cursor-pointer"
                onClick={() => playSong(song, recentSongs)}
              >
                <div className="aspect-square bg-[#282828] rounded-md mb-2 flex items-center justify-center overflow-hidden relative">
                  {song.cover_url ? (
                    <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                  ) : (
                    <Music className="w-8 h-8 text-[#b3b3b3]" />
                  )}
                  <button
                    className="absolute bottom-1 right-1 w-8 h-8 bg-[#1db954] rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); playSong(song, recentSongs); }}
                  >
                    <Play className="w-4 h-4 text-black ml-0.5" />
                  </button>
                </div>
                <p className="text-sm font-medium truncate">{song.title}</p>
                <p className="text-xs text-[#b3b3b3] truncate">{song.artist}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Songs Grid */}
      {allSongs.length === 0 ? (
        <div className="text-center py-20">
          <Music className="w-16 h-16 text-[#b3b3b3] mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Loading music...</h2>
          <p className="text-[#b3b3b3]">Fetching songs from iTunes</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {allSongs.map(song => (
            <div
              key={song.id}
              className={`bg-[#181818] hover:bg-[#282828] p-4 rounded-lg transition-all duration-200 group cursor-pointer ${isCurrentSong(song) ? 'bg-[#282828]' : ''}`}
              onClick={() => {
                if (isCurrentSong(song)) {
                  togglePlay();
                } else {
                  playSong(song, allSongs);
                }
              }}
            >
              <div className="relative mb-4">
                <div className="aspect-square bg-[#282828] rounded-md shadow-lg flex items-center justify-center overflow-hidden">
                  {song.cover_url ? (
                    <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                  ) : (
                    <Music className="w-12 h-12 text-[#b3b3b3]" />
                  )}
                </div>
                {/* Play/Pause Button */}
                <button
                  className={`absolute bottom-2 right-2 w-12 h-12 bg-[#1db954] rounded-full flex items-center justify-center shadow-xl transition-all duration-200 ${
                    isCurrentSong(song) && isPlaying
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isCurrentSong(song)) {
                      togglePlay();
                    } else {
                      playSong(song, allSongs);
                    }
                  }}
                >
                  {isCurrentSong(song) && isPlaying ? (
                    <Pause className="w-5 h-5 text-black" />
                  ) : (
                    <Play className="w-5 h-5 text-black ml-0.5" />
                  )}
                </button>
                {/* Playing Indicator */}
                {isCurrentSong(song) && isPlaying && (
                  <div className="absolute bottom-2 left-2 flex items-end gap-0.5 h-4">
                    <div className="w-1 bg-[#1db954] rounded-full animate-pulse" style={{ height: '100%', animationDelay: '0ms' }} />
                    <div className="w-1 bg-[#1db954] rounded-full animate-pulse" style={{ height: '60%', animationDelay: '150ms' }} />
                    <div className="w-1 bg-[#1db954] rounded-full animate-pulse" style={{ height: '80%', animationDelay: '300ms' }} />
                    <div className="w-1 bg-[#1db954] rounded-full animate-pulse" style={{ height: '40%', animationDelay: '450ms' }} />
                  </div>
                )}
              </div>
              <p className={`font-medium text-sm truncate mb-1 ${isCurrentSong(song) ? 'text-[#1db954]' : 'text-white'}`}>
                {song.title}
              </p>
              <p className="text-xs text-[#b3b3b3] truncate">{song.artist || 'Unknown'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
