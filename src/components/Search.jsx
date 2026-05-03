import { useState } from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import { useOffline } from '../contexts/OfflineContext';
import { useAuth } from '../contexts/AuthContext';
import API_URL from '../utils/api';
import { Search as SearchIcon, Play, Music, X, Globe, HardDrive, Download, Check, WifiOff, Heart } from 'lucide-react';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchType, setSearchType] = useState('online'); // 'online' or 'local'
  const { playSong } = usePlayer();
  const { downloadTrack, isTrackDownloaded, isOffline, activeDownloads } = useOffline();
  const { getAuthHeaders } = useAuth();
  const [downloading, setDownloading] = useState({});
  const [favorites, setFavorites] = useState(new Set());

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      if (searchType === 'online') {
        // Use simple YouTube search for full songs
        let results = [];
        
        try {
          const youtubeUrl = `${API_URL}/api/songs/youtube-search/${encodeURIComponent(query.trim())}`;
          console.log('[Search] YouTube search for full songs:', youtubeUrl);
          const youtubeRes = await fetch(youtubeUrl, {
            headers: getAuthHeaders()
          });
          console.log('[Search] YouTube response status:', youtubeRes.status);
          
          if (youtubeRes.ok) {
            const youtubeData = await youtubeRes.json();
            console.log('[Search] YouTube search response:', youtubeData);
            
            if (youtubeData && youtubeData.songs && youtubeData.songs.length > 0) {
              results = youtubeData.songs.map(s => ({
                id: s.id,
                title: s.title,
                artist: s.artist || 'Unknown',
                album: s.album,
                duration: s.duration,
                file_path: s.file_path,
                cover_url: s.cover_url,
                source: s.source,
                previewUrl: s.previewUrl,
                youtube_id: s.youtube_id,
                full_song_available: s.full_song_available
              }));
              console.log('[Search] Using YouTube results (FULL SONGS):', results);
            }
          }
        } catch (error) {
          console.log('[Search] YouTube search failed, trying Spotify:', error.message);
          
          // Fallback to Spotify only
          try {
            const spotifyUrl = `${API_URL}/api/songs/spotify-search/${encodeURIComponent(query.trim())}`;
            console.log('[Search] Fallback to Spotify:', spotifyUrl);
            const spotifyRes = await fetch(spotifyUrl, {
              headers: getAuthHeaders()
            });
            
            if (spotifyRes.ok) {
              const spotifyData = await spotifyRes.json();
              if (spotifyData && spotifyData.songs && spotifyData.songs.length > 0) {
                results = spotifyData.songs.map(s => ({
                  ...s,
                  full_song_available: false
                }));
                console.log('[Search] Using Spotify fallback results:', results);
              }
            }
          } catch (fallbackError) {
            console.log('[Search] Spotify fallback also failed:', fallbackError.message);
          }
        }
        
        // Fallback to iTunes if YouTube failed
        if (results.length === 0) {
          const itunesUrl = `${API_URL}/api/songs/search-online/${encodeURIComponent(query.trim())}`;
          console.log('[Search] Fallback to iTunes:', itunesUrl);
          const itunesRes = await fetch(itunesUrl, {
            headers: getAuthHeaders()
          });
          console.log('[Search] iTunes response status:', itunesRes.status);
          
          if (itunesRes.ok) {
            const itunesData = await itunesRes.json();
            console.log('[Search] iTunes response data:', itunesData);
            results = (itunesData.songs || []).map(s => ({
              id: s.id,
              title: s.title,
              artist: s.artist,
              album: s.album,
              duration: s.duration,
              file_path: s.file_path,
              cover_url: s.cover_url || s.artworkUrl100,
              source: 'itunes',
              previewUrl: s.previewUrl
            }));
            console.log('[Search] Using iTunes results:', results);
          }
        }
        
        setResults(results);
        console.log('[Search] Final results count:', results.length);
      } else {
        const localSearchUrl = `${API_URL}/api/songs/search/${encodeURIComponent(query.trim())}`;
        console.log('[Search] Searching local:', localSearchUrl);
        const res = await fetch(localSearchUrl, {
          headers: getAuthHeaders()
        });
        console.log('[Search] Local response status:', res.status);
        const data = await res.json();
        console.log('[Search] Local response data:', data);
        const localResults = (data.songs || []).map(s => ({ ...s, source: 'local' }));
        console.log('[Search] Local results count:', localResults.length);
        setResults(localResults);
      }
      setSearched(true);
    } catch (error) {
      console.error('[Search] Search error:', error);
      setResults([]);
      setSearched(true);
    } finally {
      setSearching(false);
    }
  }

  function formatDuration(seconds) {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  async function handleFavorite(song) {
    try {
      const res = await fetch('/api/songs/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ song }),
      });
      const data = await res.json();
      if (data.favorited) {
        setFavorites(prev => new Set(prev).add(song.id));
      } else {
        setFavorites(prev => { const n = new Set(prev); n.delete(song.id); return n; });
      }
    } catch (err) {
      console.error('Favorite failed:', err);
    }
  }

  async function handleDownload(song) {
    if (isTrackDownloaded(song.id) || downloading[song.id]) return;
    
    setDownloading(prev => ({ ...prev, [song.id]: true }));
    
    try {
      const result = await downloadTrack(song);
      if (result.alreadyDownloaded) {
        alert(`"${song.title}" is already in your offline library!`);
      } else if (result.success) {
        alert(`✓ "${song.title}" downloaded for offline playback!`);
      }
    } catch (err) {
      console.error('Download failed:', err);
      alert(`Failed to download "${song.title}". Please try again.`);
    } finally {
      setDownloading(prev => ({ ...prev, [song.id]: false }));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Search</h1>
        {isOffline && (
          <div className="flex items-center gap-2 text-orange-400 bg-orange-400/10 px-3 py-1 rounded-full text-sm">
            <WifiOff className="w-4 h-4" />
            <span>Offline Mode</span>
          </div>
        )}
      </div>

      {/* Search Type Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSearchType('online')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            searchType === 'online' ? 'bg-spotify-green text-black' : 'bg-spotify-card text-spotify-light hover:text-white'
          }`}
        >
          <Globe className="w-4 h-4" />
          Online
        </button>
        <button
          onClick={() => setSearchType('local')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            searchType === 'local' ? 'bg-spotify-green text-black' : 'bg-spotify-card text-spotify-light hover:text-white'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          My Music
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative mb-8 max-w-xl">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-spotify-light" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={searchType === 'online' ? 'Search any song, artist, or album...' : 'Search your uploaded music...'}
          className="w-full pl-12 pr-10 py-3 bg-spotify-card rounded-full text-white placeholder-spotify-light focus:outline-none focus:ring-2 focus:ring-spotify-green"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setResults([]); setSearched(false); }}
            className="absolute right-4 top-1/2 -translate-y-1/2"
          >
            <X className="w-4 h-4 text-spotify-light hover:text-white" />
          </button>
        )}
      </form>

      {/* Searching indicator */}
      {searching && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-3 border-spotify-green border-t-transparent rounded-full" />
          <span className="ml-3 text-spotify-light">Searching...</span>
        </div>
      )}

      {/* Results */}
      {!searching && searched && results.length === 0 ? (
        <div className="text-center py-20">
          <SearchIcon className="w-16 h-16 text-spotify-light mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No results found</h2>
          <p className="text-spotify-light">Try different keywords</p>
        </div>
      ) : !searching && results.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold mb-4">
            {searchType === 'online' ? '🎧 Online Results' : '💾 Your Music'}
            {searchType === 'online' && <span className="text-spotify-light text-sm font-normal ml-2">(Full songs via YouTube)</span>}
          </h2>
          <div className="space-y-1">
            {results.map((song, i) => (
              <div
                key={song.id}
                className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-spotify-hover group cursor-pointer"
                onClick={() => playSong(song, results)}
              >
                <span className="text-spotify-light text-sm w-6 text-right">{i + 1}</span>
                <div className="w-12 h-12 bg-spotify-card rounded flex items-center justify-center shrink-0 overflow-hidden">
                  {song.cover_url ? (
                    <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                  ) : (
                    <Music className="w-6 h-6 text-spotify-light" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{song.title}</p>
                  <p className="text-xs text-spotify-light truncate">{song.artist} {song.album ? `· ${song.album}` : ''}</p>
                </div>
                <span className="text-xs text-spotify-light">{formatDuration(song.duration)}</span>
                {song.source === 'youtube' && (
                  <span className="text-[10px] bg-red-600 px-2 py-0.5 rounded text-white">YouTube</span>
                )}
                {song.source === 'itunes' && (
                  <span className="text-[10px] bg-spotify-card px-2 py-0.5 rounded text-spotify-light">PREVIEW</span>
                )}
                
                {/* Favorite Button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleFavorite(song); }}
                  className={`opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full hover:bg-spotify-card ${
                    favorites.has(song.id) ? 'text-spotify-green' : 'text-spotify-light'
                  }`}
                  title={favorites.has(song.id) ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart className={`w-4 h-4 ${favorites.has(song.id) ? 'fill-current' : ''}`} />
                </button>

                {/* Download Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(song);
                  }}
                  disabled={downloading[song.id] || activeDownloads.has(song.id)}
                  className={`opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full hover:bg-spotify-card ${
                    isTrackDownloaded(song.id) ? 'text-spotify-green' : 'text-spotify-light'
                  } ${downloading[song.id] || activeDownloads.has(song.id) ? 'animate-pulse' : ''}`}
                  title={isTrackDownloaded(song.id) ? 'Downloaded' : 'Download for offline'}
                >
                  {isTrackDownloaded(song.id) ? (
                    <Check className="w-4 h-4" />
                  ) : downloading[song.id] || activeDownloads.has(song.id) ? (
                    <Download className="w-4 h-4 animate-bounce" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </button>
                
                <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-5 h-5 text-spotify-green" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : !searching && !searched ? (
        <div className="text-center py-20">
          <SearchIcon className="w-16 h-16 text-spotify-light mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Search for music</h2>
          <p className="text-spotify-light">Find your favorite songs, artists, and albums</p>
        </div>
      ) : null}
    </div>
  );
}
