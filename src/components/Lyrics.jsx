import { usePlayer } from '../contexts/PlayerContext';
import { X, Mic2, Music } from 'lucide-react';

export default function Lyrics() {
  const {
    currentSong, showLyrics, toggleLyrics, lyrics, lyricsLoading
  } = usePlayer();

  if (!showLyrics || !currentSong) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[80vh] bg-gradient-to-b from-[#1a1a2e] to-[#16213e] rounded-2xl shadow-2xl overflow-hidden border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1db954]/20 flex items-center justify-center">
              <Mic2 className="w-5 h-5 text-[#1db954]" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Lyrics</h2>
              <p className="text-xs text-[#b3b3b3]">
                {currentSong.title} by {currentSong.artist}
              </p>
            </div>
          </div>
          <button
            onClick={toggleLyrics}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Lyrics Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {lyricsLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-[#b3b3b3]">Loading lyrics...</p>
            </div>
          ) : (
            <div className="text-center">
              {/* Album Art Small */}
              <div className="w-24 h-24 mx-auto mb-6 rounded-lg overflow-hidden bg-[#2a2a2a] shadow-lg">
                {currentSong.cover_url ? (
                  <img 
                    src={currentSong.cover_url} 
                    alt={currentSong.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-10 h-10 text-[#666]" />
                  </div>
                )}
              </div>

              {/* Lyrics Text */}
              <div className="text-lg leading-relaxed text-white/90 whitespace-pre-line font-medium">
                {lyrics.split('\n').map((line, index) => (
                  <p 
                    key={index} 
                    className={`mb-2 transition-all duration-300 ${
                      line.startsWith('[') ? 'text-[#1db954] text-sm font-semibold mt-4' : 
                      line === '🎵' || line === '🎶' ? 'text-2xl my-2' :
                      line.startsWith('---') ? 'text-[#666] text-xs mt-6 pt-4 border-t border-white/10' :
                      'hover:text-white cursor-default'
                    }`}
                  >
                    {line}
                  </p>
                ))}
              </div>

              {/* Synced Lyrics Placeholder Note */}
              <div className="mt-8 p-4 bg-white/5 rounded-lg">
                <p className="text-xs text-[#666]">
                  💡 Connect to Genius API or Musixmatch for real-time synced lyrics
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-black/20 border-t border-white/5 flex items-center justify-between">
          <span className="text-xs text-[#666]">Soundy Lyrics</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#1db954] animate-pulse" />
            <span className="text-xs text-[#1db954]">Live</span>
          </div>
        </div>
      </div>
    </div>
  );
}
