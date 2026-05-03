import { useState } from 'react';
import { Link, Plus, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import API_URL from '../utils/api';

export default function AddYouTubeSong({ onAddSuccess }) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { getAuthHeaders } = useAuth();

  const extractYouTubeId = (url) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    const videoId = extractYouTubeId(youtubeUrl);
    if (!videoId) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    if (!title.trim() || !artist.trim()) {
      setError('Please enter both title and artist');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/songs/add-youtube`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          youtube_url: youtubeUrl,
          video_id: videoId,
          title: title.trim(),
          artist: artist.trim(),
          album: 'YouTube'
        })
      });

      const data = await response.json();

      if (response.ok) {
        console.log('[AddYouTube] Success:', data);
        setSuccess(true);
        setYoutubeUrl('');
        setTitle('');
        setArtist('');
        
        if (onAddSuccess) {
          onAddSuccess(data.song);
        }
        
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error || 'Failed to add YouTube song');
      }
    } catch (err) {
      console.error('[AddYouTube] Error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-youtube-song">
      <div className="add-header">
        <Link size={20} />
        <h3>Add YouTube Song</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="add-form">
        <div className="form-group">
          <label>YouTube URL</label>
          <input
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              placeholder="Song title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Artist</label>
            <input
              type="text"
              placeholder="Artist name"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              required
            />
          </div>
        </div>

        <button type="submit" className="add-button" disabled={loading}>
          {loading ? (
            <span>Adding...</span>
          ) : (
            <>
              <Plus size={16} />
              Add Full Song
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="error-message">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="success-message">
          <Check size={16} />
          <span>Full song added to your library!</span>
        </div>
      )}

      <div className="info-message">
        <p>
          <strong>Legal Notice:</strong> Only add YouTube videos you have the right to use. 
          This feature allows you to add full songs to your personal library.
        </p>
      </div>

      <style jsx>{`
        .add-youtube-song {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .add-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          color: #6366f1;
        }

        .add-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .add-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .form-group input {
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .add-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #6366f1;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .add-button:hover:not(:disabled) {
          background: #5558e3;
        }

        .add-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          border-radius: 8px;
          font-size: 14px;
        }

        .success-message {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #16a34a;
          border-radius: 8px;
          font-size: 14px;
        }

        .info-message {
          padding: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 12px;
          color: #64748b;
        }

        .info-message p {
          margin: 0;
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
