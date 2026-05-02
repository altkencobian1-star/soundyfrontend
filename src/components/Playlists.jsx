import { useState, useEffect } from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { PlusCircle, Play, Music, Trash2, ListMusic } from 'lucide-react';

export default function Playlists({ selectedPlaylist, navigate }) {
  const [playlists, setPlaylists] = useState([]);
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const { playSong } = usePlayer();
  const { getAuthHeaders } = useAuth();

  useEffect(() => {
    loadPlaylists();
  }, []);

  useEffect(() => {
    if (selectedPlaylist) loadPlaylistSongs(selectedPlaylist.id);
  }, [selectedPlaylist]);

  async function loadPlaylists() {
    const res = await fetch('/api/playlists', { headers: getAuthHeaders() });
    const data = await res.json();
    setPlaylists(data.playlists || []);
  }

  async function loadPlaylistSongs(id) {
    const res = await fetch(`/api/playlists/${id}`, { headers: getAuthHeaders() });
    const data = await res.json();
    setPlaylistSongs(data.songs || []);
  }

  async function createPlaylist(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ name: newName, description: newDesc }),
    });
    const data = await res.json();
    if (res.ok) {
      setPlaylists(prev => [data.playlist, ...prev]);
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
    }
  }

  async function deletePlaylist(id) {
    await fetch(`/api/playlists/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    setPlaylists(prev => prev.filter(p => p.id !== id));
    if (selectedPlaylist?.id === id) navigate('playlists');
  }

  async function removeSong(songId) {
    await fetch(`/api/playlists/${selectedPlaylist.id}/songs/${songId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    setPlaylistSongs(prev => prev.filter(s => s.id !== songId));
  }

  // Playlist detail view
  if (selectedPlaylist) {
    return (
      <div>
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('playlists', null)} className="text-spotify-light hover:text-white text-sm">
            &larr; Back to playlists
          </button>
        </div>

        <div className="flex items-end gap-6 mb-8">
          <div className="w-48 h-48 bg-spotify-card rounded-lg flex items-center justify-center shrink-0">
            <ListMusic className="w-16 h-16 text-spotify-light" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-spotify-light mb-1">Playlist</p>
            <h1 className="text-4xl font-bold mb-2">{selectedPlaylist.name}</h1>
            <p className="text-spotify-light text-sm">{playlistSongs.length} songs</p>
          </div>
        </div>

        {playlistSongs.length > 0 && (
          <button
            onClick={() => playSong(playlistSongs[0], playlistSongs)}
            className="w-12 h-12 bg-spotify-green rounded-full flex items-center justify-center mb-6 hover:scale-105 transition-transform"
          >
            <Play className="w-6 h-6 text-black ml-0.5" />
          </button>
        )}

        {playlistSongs.length === 0 ? (
          <div className="text-center py-16">
            <Music className="w-12 h-12 text-spotify-light mx-auto mb-3" />
            <p className="text-spotify-light">This playlist is empty</p>
          </div>
        ) : (
          <div className="space-y-1">
            {playlistSongs.map((song, i) => (
              <div
                key={song.id}
                className="flex items-center gap-4 px-4 py-2 rounded-lg hover:bg-spotify-hover group cursor-pointer"
                onClick={() => playSong(song, playlistSongs)}
              >
                <span className="text-spotify-light text-sm w-6 text-right">{i + 1}</span>
                <div className="w-10 h-10 bg-spotify-card rounded flex items-center justify-center shrink-0">
                  <Music className="w-5 h-5 text-spotify-light" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{song.title}</p>
                  <p className="text-xs text-spotify-light truncate">{song.artist}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); removeSong(song.id); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4 text-spotify-light hover:text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Playlist list view
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Your Library</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-spotify-card hover:bg-spotify-hover rounded-full text-sm font-medium transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Create Playlist
        </button>
      </div>

      {/* Create playlist modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-spotify-dark rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create Playlist</h2>
            <form onSubmit={createPlaylist} className="space-y-4">
              <input
                type="text"
                placeholder="Playlist name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full px-4 py-3 bg-spotify-card rounded-lg text-white placeholder-spotify-light focus:outline-none focus:ring-2 focus:ring-spotify-green"
                required
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                className="w-full px-4 py-3 bg-spotify-card rounded-lg text-white placeholder-spotify-light focus:outline-none focus:ring-2 focus:ring-spotify-green"
              />
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-6 py-2 text-spotify-light hover:text-white font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-spotify-green hover:bg-green-400 text-black font-bold rounded-full text-sm"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Playlists grid */}
      {playlists.length === 0 ? (
        <div className="text-center py-20">
          <ListMusic className="w-16 h-16 text-spotify-light mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Create your first playlist</h2>
          <p className="text-spotify-light">It's easy, we'll help you</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {playlists.map(pl => (
            <div
              key={pl.id}
              className="bg-spotify-card hover:bg-spotify-hover p-4 rounded-lg transition-colors group cursor-pointer"
              onClick={() => navigate('playlist', { id: pl.id, name: pl.name })}
            >
              <div className="aspect-square bg-spotify-hover rounded flex items-center justify-center mb-3">
                <ListMusic className="w-12 h-12 text-spotify-light" />
              </div>
              <p className="font-medium text-sm truncate">{pl.name}</p>
              <p className="text-xs text-spotify-light">{pl.song_count} songs</p>
              <button
                onClick={e => { e.stopPropagation(); deletePlaylist(pl.id); }}
                className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4 text-spotify-light hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
