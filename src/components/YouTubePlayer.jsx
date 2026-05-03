import { useEffect, useRef, useState } from 'react';

export default function YouTubePlayer({ videoId, onReady, onStateChange, onError }) {
  const playerRef = useRef(null);
  const [isAPIReady, setIsAPIReady] = useState(false);
  const [player, setPlayer] = useState(null);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        console.log('[YouTubePlayer] YouTube IFrame API ready');
        setIsAPIReady(true);
      };
    } else {
      setIsAPIReady(true);
    }

    return () => {
      if (window.onYouTubeIframeAPIReady) {
        window.onYouTubeIframeAPIReady = null;
      }
    };
  }, []);

  // Initialize player when API is ready and videoId changes
  useEffect(() => {
    if (isAPIReady && videoId && !player) {
      console.log('[YouTubePlayer] Initializing player for video:', videoId);
      
      const newPlayer = new window.YT.Player('youtube-player', {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          fs: 1,
          cc_load_policy: 0,
          iv_load_policy: 3,
          autohide: 1,
          theme: 'dark'
        },
        events: {
          onReady: (event) => {
            console.log('[YouTubePlayer] Player ready');
            setPlayer(event.target);
            if (onReady) onReady(event);
          },
          onStateChange: (event) => {
            console.log('[YouTubePlayer] State changed:', event.data);
            if (onStateChange) onStateChange(event);
          },
          onError: (event) => {
            console.error('[YouTubePlayer] Error:', event.data);
            if (onError) onError(event);
          }
        }
      });
    }

    return () => {
      if (player) {
        player.destroy();
        setPlayer(null);
      }
    };
  }, [isAPIReady, videoId, player, onReady, onStateChange, onError]);

  // Update video when videoId changes
  useEffect(() => {
    if (player && videoId) {
      console.log('[YouTubePlayer] Loading new video:', videoId);
      player.loadVideoById(videoId);
    }
  }, [videoId, player]);

  return (
    <div className="youtube-player-container">
      <div 
        id="youtube-player" 
        style={{
          width: '100%',
          height: '100%',
          minHeight: '390px',
          backgroundColor: '#000'
        }}
      />
    </div>
  );
}
