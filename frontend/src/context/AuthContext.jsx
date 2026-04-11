import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, logout as apiLogout, logoutAll as apiLogoutAll } from '../api/auth';
import { clearSession } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionActive, setSessionActive] = useState(false);

  const saveSession = useCallback((data) => {
    if (data.user) {
      setUser(data.user);
    }
    setSessionActive(true);
  }, []);

  const fetchMe = useCallback(async () => {
    try {
      const data = await getMe();
      setUser(data.user || data);
      setSessionActive(true);
    } catch {
      clearSession();
      setUser(null);
      setSessionActive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const logout = useCallback(async () => {
    try {
      await apiLogout({});
    } catch (_) {}
    clearSession();
    setUser(null);
    setSessionActive(false);
  }, []);

  const logoutAll = useCallback(async () => {
    try {
      await apiLogoutAll();
    } catch (_) {}
    clearSession();
    setUser(null);
    setSessionActive(false);
  }, []);

  const value = {
    user,
    token: sessionActive ? 'cookie-session' : null,
    loading,
    isAuthenticated: sessionActive && !!user,
    saveSession,
    logout,
    logoutAll,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
