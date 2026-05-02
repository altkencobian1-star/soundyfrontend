import { createContext, useContext, useState, useEffect } from 'react';
import API_URL from './utils/api';

const AuthContext = createContext(null);

const API = `${API_URL}/api/auth`;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('soundy_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.text())
        .then(text => {
          try {
            const data = JSON.parse(text);
            if (data.user) setUser(data.user);
            else throw new Error('No user');
          } catch {
            localStorage.removeItem('soundy_token');
            setToken(null);
          }
        })
        .catch(() => {
          localStorage.removeItem('soundy_token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  async function login(email, password) {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Server error - no response. Is the backend running on port 5000?');
    }
    if (!res.ok) throw new Error(data?.error || 'Login failed');
    localStorage.setItem('soundy_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }

  async function register(username, email, password) {
    const res = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Server error - no response. Is the backend running on port 5000?');
    }
    if (!res.ok) throw new Error(data?.error || 'Registration failed');
    localStorage.setItem('soundy_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }

  function logout() {
    localStorage.removeItem('soundy_token');
    setToken(null);
    setUser(null);
  }

  function getAuthHeaders() {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, getAuthHeaders }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
