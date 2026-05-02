import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { usePlayer } from './contexts/PlayerContext';
import Sidebar from './components/Sidebar';
import Player from './components/Player';
import MiniPlayer from './components/MiniPlayer';
import NowPlaying from './components/NowPlaying';
import QueueSidebar from './components/QueueSidebar';
import Lyrics from './components/Lyrics';
import Home from './components/Home';
import Search from './components/Search';
import Playlists from './components/Playlists';
import Favorites from './components/Favorites';
import Downloads from './components/Downloads';
import OfflineLibrary from './components/OfflineLibrary';
import AuthPage from './components/AuthPage';

export default function App() {
  const { user, loading } = useAuth();
  const { isMiniPlayer } = usePlayer();
  const [page, setPage] = useState('home');
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-spotify-darker">
        <div className="animate-spin w-12 h-12 border-4 border-spotify-green border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  function navigate(pageName, data = null) {
    setPage(pageName);
    setSelectedPlaylist(pageName === 'playlists' ? data : null);
  }

  const pages = {
    home: <Home navigate={navigate} />,
    search: <Search />,
    playlists: <Playlists selectedPlaylist={selectedPlaylist} navigate={navigate} />,
    favorites: <Favorites navigate={navigate} />,
    downloads: <Downloads navigate={navigate} />,
    offline: <OfflineLibrary />,
  };

  return (
    <div className="h-screen flex flex-col bg-spotify-darker">
      {/* Hidden YouTube IFrame Player container */}
      <div id="yt-player-container" style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        <div id="yt-player-iframe"></div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar page={page} navigate={navigate} />
        <main className="flex-1 overflow-y-auto p-6">
          {pages[page] || <Home navigate={navigate} />}
        </main>
      </div>
      {isMiniPlayer ? <MiniPlayer /> : <Player navigate={navigate} />}
      <NowPlaying />
      <QueueSidebar />
      <Lyrics />
    </div>
  );
}
