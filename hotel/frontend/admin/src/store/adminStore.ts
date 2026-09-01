import { create } from 'zustand';

interface AdminState {
  token: string | null;
  refreshToken: string | null;
  username: string;
  setToken: (token: string, refreshToken: string, username: string) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
  getValidToken: () => Promise<string | null>;
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export const useAdminStore = create<AdminState>((set, get) => ({
  token: localStorage.getItem('admin_token'),
  refreshToken: localStorage.getItem('admin_refresh_token'),
  username: localStorage.getItem('admin_username') || '',

  setToken: (token, refreshToken, username) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_refresh_token', refreshToken);
    localStorage.setItem('admin_username', username);
    set({ token, refreshToken, username });
  },

  setAccessToken: (token) => {
    localStorage.setItem('admin_token', token);
    set({ token });
  },

  logout: () => {
    const rt = get().refreshToken;
    if (rt) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${get().token}`,
        },
        body: JSON.stringify({ refresh_token: rt }),
      }).catch(() => {});
    }
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_username');
    set({ token: null, refreshToken: null, username: '' });
  },

  getValidToken: async () => {
    const { token, refreshToken, setAccessToken, logout } = get();
    if (!token) return null;
    if (!isTokenExpired(token)) return token;
    if (!refreshToken) {
      logout();
      return null;
    }

    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) throw new Error('Refresh failed');
      const data = await res.json();
      setAccessToken(data.access_token);
      return data.access_token;
    } catch {
      logout();
      return null;
    }
  },
}));
