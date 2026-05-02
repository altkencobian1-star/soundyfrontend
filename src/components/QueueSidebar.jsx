import { usePlayer } from '../contexts/PlayerContext';
import { X, Play, Pause, Music, Trash2, Clock } from 'lucide-react';
import { useState } from 'react';

function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function QueueSidebar() {
  const { 
    showQueue, toggleQueue, currentSong, queue, queueIndex, 
    isPlaying, playSong, togglePlay, recentSongs
  } = usePlayer();
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' or 'recent'

  if (!showQueue) return null;

  const upcomingSongs = queue.slice(queueIndex + 1);
  // Use recentSongs for the history log, filtered to exclude current song
  const recentlyPlayed = recentSongs.filter(s => s.id !== currentSong?.id);

  return (
    <div className="fixed right-0 top-0 bottom-20 w-96 bg-[#121212] z-[60] flex flex-col border-l border-[#282828] animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#282828]">
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab('queue')}
            className={`text-sm font-medium ${activeTab === 'queue' ? 'text-white' : 'text-[#b3b3b3] hover:text-white'}`}
          >
            Queue
          </button>
          <button 
            onClick={() => setActiveTab('recent')}
            className={`text-sm font-medium ${activeTab === 'recent' ? 'text-white' : 'text-[#b3b3b3] hover:text-white'}`}
          >
            Recently played
          </button>
        </div>
        <button 
          onClick={toggleQueue}
          className="text-[#b3b3b3] hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'queue' ? (
          <div>
            {/* Now Playing */}
            {currentSong && (
              <div className="px-4 py-3 bg-[#1a1a1a]">
                <p className="text-[#b3b3b3] text-xs font-medium mb-2">Now playing</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#282828] rounded flex items-center justify-center shrink-0">
                    {currentSong.cover_url ? (
                      <img src={currentSong.cover_url} alt="" className="w-full h-full rounded object-cover" />
                    ) : (
                      <Music className="w-5 h-5 text-[#b3b3b3]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{currentSong.title}</p>
                    <p className="text-xs text-[#b3b3b3] truncate">{currentSong.artist}</p>
                  </div>
                  <button 
                    onClick={togglePlay}
                    className="text-[#1db954] hover:scale-110 transition-transform"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Next from Queue */}
            {upcomingSongs.length > 0 && (
              <div className="px-4 py-3">
                <p className="text-[#b3b3b3] text-xs font-medium mb-2">Next from: Your Queue</p>
                {upcomingSongs.map((song, idx) => (
                  <div 
                    key={song.id}
                    onClick={() => playSong(song, queue)}
                    className="flex items-center gap-3 py-2 hover:bg-[#1a1a1a] rounded cursor-pointer group"
                  >
                    <div className="w-12 h-12 bg-[#282828] rounded flex items-center justify-center shrink-0">
                      {song.cover_url ? (
                        <img src={song.cover_url} alt="" className="w-full h-full rounded object-cover" />
                      ) : (
                        <Music className="w-5 h-5 text-[#b3b3b3]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate group-hover:text-[#1db954]">{song.title}</p>
                      <p className="text-xs text-[#b3b3b3] truncate">{song.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {upcomingSongs.length === 0 && currentSong && (
              <div className="px-4 py-8 text-center text-[#b3b3b3] text-sm">
                No songs in queue
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Recently Played */}
            {recentlyPlayed.length > 0 ? (
              <div className="px-4 py-3">
                {/* Clear History Button */}
                <div className="flex justify-end mb-3">
                  <button
                    onClick={() => {
                      localStorage.removeItem('soundy_recent');
                      window.location.reload(); // Simple refresh to clear state
                    }}
                    className="flex items-center gap-1 text-xs text-[#666] hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear History
                  </button>
                </div>
                {recentlyPlayed.map((song, idx) => (
                  <div 
                    key={`${song.id}-${song.playedAt}`}
                    onClick={() => playSong(song, queue)}
                    className="flex items-center gap-3 py-2 hover:bg-[#1a1a1a] rounded cursor-pointer group"
                  >
                    <div className="w-12 h-12 bg-[#282828] rounded flex items-center justify-center shrink-0">
                      {song.cover_url ? (
                        <img src={song.cover_url} alt="" className="w-full h-full rounded object-cover" />
                      ) : (
                        <Music className="w-5 h-5 text-[#b3b3b3]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate group-hover:text-[#1db954]">{song.title}</p>
                      <p className="text-xs text-[#b3b3b3] truncate">{song.artist}</p>
                    </div>
                    {/* Timestamp */}
                    <div className="flex items-center gap-1 text-[#666] text-xs">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(song.playedAt)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-[#b3b3b3] text-sm mb-2">No recently played songs</p>
                <p className="text-[#666] text-xs">
                  Songs you play from Home, Search, Favorites, or Downloads will appear here!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
