import { createContext, useContext } from 'react';
import { PlayerProvider, usePlayer } from '../contexts/PlayerContext';

/**
 * MusicPlayerContext
 *
 * Global music player state exposed to the entire app.
 *
 * Provided values:
 *   currentSong     — { id, title, artist, url, cover_url, source, ... } | null
 *   isPlaying       — boolean
 *   isLoading       — boolean
 *   progress        — number (seconds elapsed)
 *   duration        — number (total seconds)
 *   volume          — number (0–1)
 *   queue           — Song[]
 *   queueIndex      — number (index of currentSong in queue)
 *
 * Actions:
 *   playSong(song, songList?)  — set currentSong and start playback; optionally seed the queue
 *   togglePlayPause()          — toggle between play and pause
 *   playNext()                 — advance to the next song in the queue
 *   playPrev()                 — go back (or restart) in the queue
 *   seek(time)                 — seek to a specific second
 *   changeVolume(v)            — set volume (0–1)
 */
const MusicPlayerContext = createContext(null);

/**
 * Inner wrapper — must live *inside* PlayerProvider so it can call usePlayer().
 */
function MusicPlayerContextWrapper({ children }) {
  const player = usePlayer();

  const value = {
    // ── State ──────────────────────────────────────────────────────────────
    currentSong: player.currentSong,   // { id, title, artist, url, ... } | null
    isPlaying:   player.isPlaying,     // boolean
    isLoading:   player.isLoading,     // boolean
    progress:    player.progress,      // seconds elapsed
    duration:    player.duration,      // total seconds
    volume:      player.volume,        // 0–1
    queue:       player.queue,         // Song[]
    queueIndex:  player.queueIndex,    // current position in queue
    isShuffle:   player.isShuffle,     // boolean
    repeatMode:  player.repeatMode,    // 'off' | 'all' | 'one'
    showLyrics:  player.showLyrics,    // boolean
    isMiniPlayer: player.isMiniPlayer, // boolean
    showNowPlaying: player.showNowPlaying, // boolean
    showQueue:   player.showQueue,     // boolean

    // ── Actions ────────────────────────────────────────────────────────────
    /** Set currentSong and begin playback. Optionally pass a songList to seed the queue. */
    playSong:        player.playSong,

    /** Toggle between play and pause for the current song. */
    togglePlayPause: player.togglePlay,

    /** Advance to the next song in the queue. */
    playNext:        player.skipNext,

    /** Go back to the previous song (or restart if >3 s in). */
    playPrev:        player.skipPrev,

    /** Seek to a position in seconds. */
    seek:            player.seek,

    /** Set the playback volume (0–1). */
    changeVolume:    player.changeVolume,

    /** Toggle shuffle mode. */
    toggleShuffle:   player.toggleShuffle,

    /** Cycle through repeat modes: off → all → one → off. */
    toggleRepeat:    player.toggleRepeat,

    /** Toggle lyrics panel visibility. */
    toggleLyrics:    player.toggleLyrics,

    /** Toggle mini-player mode. */
    toggleMiniPlayer: player.toggleMiniPlayer,

    /** Toggle full-screen now playing view. */
    toggleNowPlaying: player.toggleNowPlaying,

    /** Toggle queue sidebar. */
    toggleQueue: player.toggleQueue,
  };

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
    </MusicPlayerContext.Provider>
  );
}

/**
 * MusicPlayerProvider
 *
 * Wrap the app (or a subtree) with this to make the music player context
 * available to all descendants.
 *
 * Usage (main.jsx):
 *   <MusicPlayerProvider>
 *     <App />
 *   </MusicPlayerProvider>
 */
export function MusicPlayerProvider({ children }) {
  return (
    <PlayerProvider>
      <MusicPlayerContextWrapper>
        {children}
      </MusicPlayerContextWrapper>
    </PlayerProvider>
  );
}

/**
 * useMusicPlayer
 *
 * Hook to consume the MusicPlayerContext.
 * Must be used within a <MusicPlayerProvider>.
 *
 * @returns {{ currentSong, isPlaying, isLoading, progress, duration, volume,
 *             queue, queueIndex, playSong, togglePlayPause, playNext, playPrev,
 *             seek, changeVolume }}
 */
export function useMusicPlayer() {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) {
    throw new Error('useMusicPlayer must be used within a <MusicPlayerProvider>');
  }
  return ctx;
}
