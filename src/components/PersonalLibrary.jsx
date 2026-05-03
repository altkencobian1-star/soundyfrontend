import { useState, useEffect } from 'react';
import { Music, Play, Trash2, Download, Upload, Search, Filter, Clock } from 'lucide-react';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import API_URL from '../utils/api';
import UploadMusic from './UploadMusic';

export default function PersonalLibrary() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const { playSong } = usePlayer();
  const { getAuthHeaders } = useAuth();

  useEffect(() => {
    fetchPersonalLibrary();
  }, []);

  const fetchPersonalLibrary = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/songs/personal`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setSongs(data.songs || []);
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch personal library');
      }
    } catch (err) {
      console.error('[PersonalLibrary] Error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySong = (song) => {
    console.log('[PersonalLibrary] Playing song:', song.title);
    playSong(song);
  };

  const handleUploadSuccess = (newSong) => {
    console.log('[PersonalLibrary] Upload success:', newSong);
    setSongs(prev => [newSong, ...prev]);
    setShowUpload(false);
  };

  const handleDeleteSong = async (songId) => {
    if (!confirm('Are you sure you want to delete this song?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/songs/${songId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setSongs(prev => prev.filter(song => song.id !== songId));
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete song');
      }
    } catch (err) {
      console.error('[PersonalLibrary] Delete error:', err);
      setError('Failed to delete song');
    }
  };

  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.album.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (showUpload) {
    return (
      <div className="personal-library">
        <div className="library-header">
          <button 
            className="back-button"
            onClick={() => setShowUpload(false)}
          >
            ← Back to Library
          </button>
          <h2>Upload Music</h2>
        </div>
        <UploadMusic onUploadSuccess={handleUploadSuccess} />
      </div>
    );
  }

  return (
    <div className="personal-library">
      <div className="library-header">
        <div className="header-content">
          <h2>Personal Library</h2>
          <p>Your uploaded music collection</p>
        </div>
        <button 
          className="upload-button"
          onClick={() => setShowUpload(true)}
        >
          <Upload size={20} />
          Upload Music
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span>{error}</span>
        </div>
      )}

      <div className="library-controls">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search your library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="library-stats">
          <span>{filteredSongs.length} songs</span>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <Music className="loading-icon" size={32} />
          <p>Loading your library...</p>
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="empty-state">
          <Music size={48} />
          <h3>No songs in your library</h3>
          <p>Upload some MP3 files to get started</p>
          <button 
            className="primary-button"
            onClick={() => setShowUpload(true)}
          >
            <Upload size={16} />
            Upload Your First Song
          </button>
        </div>
      ) : (
        <div className="songs-list">
          {filteredSongs.map((song) => (
            <div key={song.id} className="song-item">
              <div className="song-info">
                <div className="song-cover">
                  {song.cover_url ? (
                    <img src={song.cover_url} alt={song.title} />
                  ) : (
                    <Music size={24} />
                  )}
                </div>
                <div className="song-details">
                  <h4 className="song-title">{song.title}</h4>
                  <p className="song-artist">{song.artist}</p>
                  <p className="song-album">{song.album}</p>
                  {song.duration > 0 && (
                    <span className="song-duration">
                      <Clock size={12} />
                      {formatDuration(song.duration)}
                    </span>
                  )}
                </div>
              </div>
              <div className="song-actions">
                <button 
                  className="play-button"
                  onClick={() => handlePlaySong(song)}
                  title="Play song"
                >
                  <Play size={16} />
                </button>
                <button 
                  className="delete-button"
                  onClick={() => handleDeleteSong(song.id)}
                  title="Delete song"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .personal-library {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .library-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e5e7eb;
        }

        .header-content h2 {
          margin: 0 0 4px 0;
          color: #111827;
          font-size: 24px;
          font-weight: 700;
        }

        .header-content p {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }

        .back-button {
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          font-size: 14px;
          padding: 8px 12px;
          border-radius: 6px;
          transition: background 0.2s;
        }

        .back-button:hover {
          background: #f3f4f6;
        }

        .upload-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #6366f1;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }

        .upload-button:hover {
          background: #5558e3;
        }

        .error-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .library-controls {
          display: flex;
          gap: 16px;
          align-items: center;
          margin-bottom: 24px;
        }

        .search-bar {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 10px 12px;
        }

        .search-bar input {
          flex: 1;
          border: none;
          background: none;
          outline: none;
          font-size: 14px;
        }

        .search-bar input::placeholder {
          color: #9ca3af;
        }

        .library-stats {
          color: #6b7280;
          font-size: 14px;
          font-weight: 500;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 60px 20px;
          color: #6b7280;
        }

        .loading-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 60px 20px;
          text-align: center;
          color: #6b7280;
        }

        .empty-state h3 {
          margin: 0;
          color: #374151;
          font-size: 18px;
          font-weight: 600;
        }

        .empty-state p {
          margin: 0;
          font-size: 14px;
        }

        .primary-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #6366f1;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }

        .primary-button:hover {
          background: #5558e3;
        }

        .songs-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .song-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .song-item:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .song-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .song-cover {
          width: 48px;
          height: 48px;
          border-radius: 6px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .song-cover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .song-details {
          flex: 1;
        }

        .song-title {
          margin: 0 0 4px 0;
          color: #111827;
          font-size: 14px;
          font-weight: 600;
        }

        .song-artist {
          margin: 0 0 2px 0;
          color: #6b7280;
          font-size: 13px;
        }

        .song-album {
          margin: 0;
          color: #9ca3af;
          font-size: 12px;
        }

        .song-duration {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #9ca3af;
          font-size: 12px;
          margin-top: 4px;
        }

        .song-actions {
          display: flex;
          gap: 8px;
        }

        .play-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .play-button:hover {
          background: #5558e3;
        }

        .delete-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .delete-button:hover {
          background: #dc2626;
        }

        @media (max-width: 768px) {
          .personal-library {
            padding: 16px;
          }

          .library-header {
            flex-direction: column;
            gap: 16px;
            align-items: flex-start;
          }

          .library-controls {
            flex-direction: column;
            gap: 12px;
          }

          .song-item {
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }

          .song-actions {
            align-self: flex-end;
          }
        }
      `}</style>
    </div>
  );
}
