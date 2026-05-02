import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Music, LogIn, UserPlus } from 'lucide-react';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ username: '', email: '', password: '' });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        await register(form.username, form.email, form.password);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-spotify-darker">
      <div className="w-full max-w-md p-8">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Music className="w-10 h-10 text-spotify-green" />
          <h1 className="text-4xl font-bold">Soundy</h1>
        </div>

        <div className="bg-spotify-dark rounded-xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold mb-6 text-center">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <input
                type="text"
                placeholder="Username"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                className="w-full px-4 py-3 bg-spotify-card rounded-lg text-white placeholder-spotify-light focus:outline-none focus:ring-2 focus:ring-spotify-green"
                required
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 bg-spotify-card rounded-lg text-white placeholder-spotify-light focus:outline-none focus:ring-2 focus:ring-spotify-green"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-3 bg-spotify-card rounded-lg text-white placeholder-spotify-light focus:outline-none focus:ring-2 focus:ring-spotify-green"
              required
              minLength={6}
            />
            <button
              type="submit"
              className="w-full py-3 bg-spotify-green hover:bg-green-400 text-black font-bold rounded-full transition-colors flex items-center justify-center gap-2"
            >
              {isLogin ? <><LogIn className="w-5 h-5" /> Sign In</> : <><UserPlus className="w-5 h-5" /> Sign Up</>}
            </button>
          </form>

          <p className="text-center mt-6 text-spotify-light">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-spotify-green hover:underline font-medium"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
