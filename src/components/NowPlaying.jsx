import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { X, Heart, Plus, Share, MoreHorizontal, Music } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function NowPlaying() {
  const { currentSong, showNowPlaying, toggleNowPlaying, queue, queueIndex } = usePlayer();
  const { getAuthHeaders } = useAuth();
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    if (!currentSong) return;
    fetch(`/api/songs/favorites/list`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        const favs = data.songs || [];
        setIsFav(favs.some(s => {
          if (currentSong.source === 'itunes') return s.file_path === String(currentSong.id);
          return s.id === currentSong.id;
        }));
      })
      .catch(() => {});
  }, [currentSong, getAuthHeaders]);

  async function toggleFavorite() {
    if (!currentSong) return;
    const res = await fetch(`/api/songs/favorite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ song: currentSong }),
    });
    const data = await res.json();
    setIsFav(data.favorited);
  }

  if (!showNowPlaying || !currentSong) return null;

  const playlistName = queue.length > 0 ? 'Your Queue' : 'Now Playing';

  return (
    <div className="fixed inset-0 bg-[#121212] z-[100] flex flex-col animate-in fade-in duration-300">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="text-[#b3b3b3] text-sm font-medium">{playlistName}</div>
        <button 
          onClick={toggleNowPlaying}
          className="w-8 h-8 flex items-center justify-center text-[#b3b3b3] hover:text-white hover:bg-[#282828] rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={toggleFavorite} className="text-[#b3b3b3] hover:text-white">
            <Heart className={`w-5 h-5 ${isFav ? 'text-[#1db954] fill-[#1db954]' : ''}`} />
          </button>
          <button className="text-[#b3b3b3] hover:text-white">
            <Plus className="w-5 h-5" />
          </button>
          <button className="text-[#b3b3b3] hover:text-white">
            <Share className="w-5 h-5" />
          </button>
          <button className="text-[#b3b3b3] hover:text-white">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-32">
        {/* Large Album Art */}
        <div className="w-full max-w-md aspect-square mb-8">
          {currentSong.cover_url ? (
            <img 
              src={currentSong.cover_url} 
              alt={currentSong.title}
              className="w-full h-full object-cover rounded-lg shadow-2xl"
            />
          ) : (
            <div className="w-full h-full bg-[#282828] rounded-lg flex items-center justify-center">
              <Music className="w-24 h-24 text-[#b3b3b3]" />
            </div>
          )}
        </div>

        {/* Song Info */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">{currentSong.title}</h1>
          <p className="text-[#b3b3b3] text-lg">{currentSong.artist}</p>
        </div>

        {/* About the Artist */}
        <div className="w-full max-w-2xl">
          <div className="bg-[#181818] rounded-lg p-6">
            <h2 className="text-white font-bold text-lg mb-3">About the artist</h2>
            <p className="text-[#b3b3b3] text-sm leading-relaxed">
              {currentSong.artist} is a musical artist. Discover more of their music in your library.
            </p>
          </div>
        </div>

        {/* Credits */}
        <div className="w-full max-w-2xl mt-4">
          <div className="bg-[#181818] rounded-lg p-6">
            <h2 className="text-white font-bold text-lg mb-3">Credits</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#b3b3b3]">Artist</span>
                <span className="text-white">{currentSong.artist}</span>
              </div>
              {currentSong.album && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#b3b3b3]">Album</span>
                  <span className="text-white">{currentSong.album}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
