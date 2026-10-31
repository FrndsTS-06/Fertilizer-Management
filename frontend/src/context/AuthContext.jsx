import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient, { tokenStorage } from '../services/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => tokenStorage.getToken());
  const [user, setUser] = useState(() => tokenStorage.getUser());
  const [loading, setLoading] = useState(true);

  // Logout handler
  const logout = useCallback(async () => {
    try {
      if (tokenStorage.getToken()) {
        await apiClient.post('/auth/logout').catch(() => {});
      }
    } finally {
      tokenStorage.clear();
      setToken(null);
      setUser(null);
    }
  }, []);

  // Verify stored token on startup
  useEffect(() => {
    let isMounted = true;

    async function verifyExistingSession() {
      const savedToken = tokenStorage.getToken();
      if (!savedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const res = await apiClient.get('/auth/me');
        if (isMounted) {
          if (res?.data?.user) {
            setUser(res.data.user);
            tokenStorage.setUser(res.data.user);
          }
        }
      } catch (err) {
        console.warn('Session verification error:', err.message);
        if (err.status === 401) {
          logout();
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    verifyExistingSession();

    // Listen for unauthorized 401 event dispatched by apiClient
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('fts:unauthorized', handleUnauthorized);
    return () => {
      isMounted = false;
      window.removeEventListener('fts:unauthorized', handleUnauthorized);
    };
  }, [logout]);

  // Login method
  const login = async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    if (res?.data?.token && res?.data?.user) {
      const { token: receivedToken, user: receivedUser } = res.data;
      tokenStorage.setToken(receivedToken);
      tokenStorage.setUser(receivedUser);
      setToken(receivedToken);
      setUser(receivedUser);
      return receivedUser;
    }
    throw new Error(res?.message || 'Invalid server login response');
  };

  const updateCurrentUser = (partialUser) => {
    setUser((prev) => {
      const updated = { ...prev, ...partialUser };
      tokenStorage.setUser(updated);
      return updated;
    });
  };

  const isAuthenticated = Boolean(token && user);
  const isAdmin = user?.role === 'ADMIN';

  const value = {
    user,
    token,
    isAuthenticated,
    isAdmin,
    loading,
    login,
    logout,
    updateCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;

