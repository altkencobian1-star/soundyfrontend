import { usePlayer } from '../contexts/PlayerContext';
import { Play, Pause, SkipBack, SkipForward, Maximize2, Music, Mic2 } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function MiniPlayer() {
  const {
    currentSong, isPlaying, isLoading, progress, duration,
    togglePlay, skipNext, skipPrev,
    toggleMiniPlayer, toggleLyrics, showLyrics
  } = usePlayer();
  
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const playerRef = useRef(null);

  if (!currentSong) return null;

  const handleMouseDown = (e) => {
    if (e.target.closest('button')) return; // Don't drag when clicking buttons
    setIsDragging(true);
    setHasDragged(false);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    setHasDragged(true);
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle click on the container - toggle to full player if not dragging
  const handleClick = (e) => {
    if (e.target.closest('button')) return; // Don't toggle when clicking buttons
    if (hasDragged) return; // Don't toggle if we were dragging
    toggleMiniPlayer();
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={playerRef}
      className="fixed z-[100] bg-[#1a1a1a] rounded-xl shadow-2xl border border-[#2a2a2a] overflow-hidden cursor-move select-none"
      style={{
        left: position.x,
        top: position.y,
        width: '280px',
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      {/* Album Art - NOT clickable, only draggable */}
      <div className="relative w-full h-36 bg-[#2a2a2a]">
        {currentSong.cover_url ? (
          <img 
            src={currentSong.cover_url} 
            alt={currentSong.title}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-12 h-12 text-[#666]" />
          </div>
        )}
        
        {/* Overlay with buttons */}
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); toggleLyrics(); }}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${showLyrics ? 'bg-[#1db954] text-black' : 'bg-black/60 text-white hover:bg-black/80'}`}
            title="Toggle Lyrics"
          >
            <Mic2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); toggleMiniPlayer(); }}
            className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            title="Expand Player"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Time overlay on album art */}
        <div className="absolute bottom-2 left-2 bg-black/60 rounded-full px-2 py-1 text-xs text-white font-medium">
          {formatTime(progress)} / {formatTime(duration)}
        </div>
      </div>

      {/* Info & Controls */}
      <div className="p-3">
        {/* Song Info */}
        <div className="mb-2 min-w-0">
          <p className="font-medium text-sm text-white truncate">
            {currentSong.title}
          </p>
          <p className="text-xs text-[#b3b3b3] truncate">
            {currentSong.artist}
          </p>
        </div>

        {/* Time Progress Bar */}
        <div className="mb-3">
          <div className="h-1 bg-[#333] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#1db954] rounded-full transition-all duration-300"
              style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-[#666]">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); skipPrev(); }}
            className="w-8 h-8 flex items-center justify-center text-[#b3b3b3] hover:text-white transition-colors"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          
          <button
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 text-black" />
            ) : (
              <Play className="w-5 h-5 text-black ml-0.5" />
            )}
          </button>
          
          <button
            onClick={(e) => { e.stopPropagation(); skipNext(); }}
            className="w-8 h-8 flex items-center justify-center text-[#b3b3b3] hover:text-white transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Drag Handle Indicator */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#444] rounded-full opacity-50" />
    </div>
  );
}
