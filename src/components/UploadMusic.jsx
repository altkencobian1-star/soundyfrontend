import { useState } from 'react';
import { Upload, X, Music, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import API_URL from '../utils/api';

export default function UploadMusic({ onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const { getAuthHeaders } = useAuth();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file) => {
    // Validate file type
    if (!file.type.includes('audio/') && !file.name.endsWith('.mp3')) {
      setError('Please upload an MP3 file');
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      return;
    }

    setError('');
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('mp3', file);
    
    // Add metadata if available
    const title = file.name.replace('.mp3', '').replace(/_/g, ' ').replace(/-/g, ' ');
    formData.append('title', title);
    formData.append('artist', 'Unknown Artist');
    formData.append('album', 'Personal Library');

    try {
      const xhr = new XMLHttpRequest();
      
      // Progress tracking
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setProgress(percentComplete);
        }
      });

      xhr.open('POST', `${API_URL}/api/songs/upload`);
      xhr.setRequestHeader('Authorization', getAuthHeaders().Authorization);
      
      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          console.log('[Upload] Success:', response);
          setUploading(false);
          setProgress(0);
          
          if (onUploadSuccess) {
            onUploadSuccess(response.song);
          }
        } else {
          const error = JSON.parse(xhr.responseText);
          console.error('[Upload] Error:', error);
          setError(error.error || 'Upload failed');
          setUploading(false);
          setProgress(0);
        }
      };

      xhr.onerror = () => {
        console.error('[Upload] Network error');
        setError('Network error. Please try again.');
        setUploading(false);
        setProgress(0);
      };

      xhr.send(formData);

    } catch (err) {
      console.error('[Upload] Error:', err);
      setError('Upload failed. Please try again.');
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="upload-music-container">
      <div
        className={`upload-area ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="mp3-upload"
          accept=".mp3,audio/mpeg,audio/mp3"
          onChange={handleChange}
          disabled={uploading}
          style={{ display: 'none' }}
        />
        
        {!uploading ? (
          <label htmlFor="mp3-upload" className="upload-label">
            <div className="upload-content">
              <Upload className="upload-icon" size={48} />
              <h3>Upload MP3 File</h3>
              <p>Drag and drop your MP3 file here or click to browse</p>
              <span className="upload-hint">Maximum file size: 50MB</span>
            </div>
          </label>
        ) : (
          <div className="upload-progress">
            <div className="progress-content">
              <Music className="upload-icon" size={48} />
              <h3>Uploading...</h3>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="progress-text">{progress}%</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="upload-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <style jsx>{`
        .upload-music-container {
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
        }

        .upload-area {
          border: 2px dashed #ddd;
          border-radius: 12px;
          padding: 40px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: #fafafa;
        }

        .upload-area:hover {
          border-color: #6366f1;
          background: #f8f9ff;
        }

        .upload-area.drag-active {
          border-color: #6366f1;
          background: #f0f1ff;
          transform: scale(1.02);
        }

        .upload-area.uploading {
          border-color: #6366f1;
          background: #f0f1ff;
          cursor: not-allowed;
        }

        .upload-label {
          cursor: pointer;
          display: block;
        }

        .upload-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .upload-icon {
          color: #6366f1;
          opacity: 0.7;
        }

        .upload-content h3 {
          margin: 0;
          color: #333;
          font-size: 18px;
          font-weight: 600;
        }

        .upload-content p {
          margin: 0;
          color: #666;
          font-size: 14px;
        }

        .upload-hint {
          font-size: 12px;
          color: #999;
        }

        .upload-progress {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .progress-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          width: 100%;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #6366f1;
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 14px;
          color: #6366f1;
          font-weight: 600;
        }

        .upload-error {
          margin-top: 16px;
          padding: 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
      `}</style>
    </div>
  );
}
