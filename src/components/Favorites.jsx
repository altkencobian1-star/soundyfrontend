import { useState, useEffect } from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import API_URL from '../utils/api';
import { Heart, Play, Music } from 'lucide-react';

export default function Favorites({ navigate }) {
  const [songs, setSongs] = useState([]);
  const { playSong } = usePlayer();
  const { getAuthHeaders } = useAuth();

  useEffect(() => {
    fetch(`${API_URL}/api/songs/favorites/list`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => setSongs(data.songs || []))
      .catch(() => {});
  }, []);

  async function toggleFavorite(song) {
    await fetch(`${API_URL}/api/songs/favorite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ song }),
    });
    setSongs(prev => prev.filter(s => s.id !== song.id));
  }

  return (
    <div>
      <div className="flex items-end gap-6 mb-8">
        <div className="w-48 h-48 bg-gradient-to-br from-purple-700 to-spotify-card rounded-lg flex items-center justify-center shrink-0">
          <Heart className="w-16 h-16 text-white" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-spotify-light mb-1">Playlist</p>
          <h1 className="text-4xl font-bold mb-2">Liked Songs</h1>
          <p className="text-spotify-light text-sm">{songs.length} songs</p>
        </div>
      </div>

      {songs.length > 0 && (
        <button
          onClick={() => playSong(songs[0], songs)}
          className="w-12 h-12 bg-spotify-green rounded-full flex items-center justify-center mb-6 hover:scale-105 transition-transform"
        >
          <Play className="w-6 h-6 text-black ml-0.5" />
        </button>
      )}

      {songs.length === 0 ? (
        <div className="text-center py-20">
          <Heart className="w-16 h-16 text-spotify-light mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Songs you like will appear here</h2>
          <p className="text-spotify-light">Save songs by tapping the heart icon</p>
        </div>
      ) : (
        <div className="space-y-1">
          {songs.map((song, i) => (
            <div
              key={song.id}
              className="flex items-center gap-4 px-4 py-2 rounded-lg hover:bg-spotify-hover group cursor-pointer"
              onClick={() => playSong(song, songs)}
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
              <button
                onClick={e => { e.stopPropagation(); toggleFavorite(song); }}
                className="text-spotify-green hover:text-green-400"
              >
                <Heart className="w-4 h-4 fill-current" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
