import { useAuth } from '../contexts/AuthContext';
import { Home, Search, Library, Heart, Download, PlusCircle, LogOut, Music, HardDrive } from 'lucide-react';

export default function Sidebar({ page, navigate }) {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'playlists', label: 'Your Library', icon: Library },
    { id: 'favorites', label: 'Favorites', icon: Heart },
    { id: 'downloads', label: 'Downloads', icon: Download },
    { id: 'offline', label: 'Offline Library', icon: HardDrive },
  ];

  return (
    <aside className="w-64 bg-spotify-dark flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <Music className="w-8 h-8 text-spotify-green" />
        <span className="text-xl font-bold">Soundy</span>
      </div>

      {/* Nav */}
      <nav className="px-3 space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => navigate(id)}
            className={`w-full flex items-center gap-4 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              page === id ? 'bg-spotify-card text-white' : 'text-spotify-light hover:text-white hover:bg-spotify-hover'
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </button>
        ))}
      </nav>

      {/* Create playlist */}
      <div className="px-3 mt-6">
        <button
          onClick={() => navigate('playlists')}
          className="w-full flex items-center gap-3 px-3 py-2 text-spotify-light hover:text-white text-sm"
        >
          <PlusCircle className="w-5 h-5" />
          Create Playlist
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User */}
      <div className="p-4 border-t border-spotify-hover">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-spotify-green rounded-full flex items-center justify-center text-black font-bold text-sm">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.username}</p>
            <p className="text-xs text-spotify-light truncate">{user?.email}</p>
          </div>
          <button onClick={logout} className="text-spotify-light hover:text-white">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
