import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/authApi';

const storageKeys = {
  accessToken: 'vendorbridge.accessToken',
  refreshToken: 'vendorbridge.refreshToken',
  user: 'vendorbridge.user',
  session: 'vendorbridge.session',
};

const AuthContext = createContext(null);

const readJSON = (key) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const persistAuth = ({ accessToken, refreshToken, user, session }) => {
  if (accessToken) localStorage.setItem(storageKeys.accessToken, accessToken);
  if (refreshToken) localStorage.setItem(storageKeys.refreshToken, refreshToken);
  if (user) localStorage.setItem(storageKeys.user, JSON.stringify(user));
  if (session) localStorage.setItem(storageKeys.session, JSON.stringify(session));
};

const clearAuth = () => {
  Object.values(storageKeys).forEach((key) => localStorage.removeItem(key));
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => readJSON(storageKeys.user));
  const [session, setSession] = useState(() => readJSON(storageKeys.session));
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(storageKeys.accessToken));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem(storageKeys.refreshToken));
  const [loading, setLoading] = useState(true);

  const applyAuth = (payload) => {
    persistAuth(payload);
    setAccessToken(payload.accessToken);
    setRefreshToken(payload.refreshToken);
    setUser(payload.user);
    setSession(payload.session || null);
  };

  const login = async (credentials) => {
    const response = await authApi.login(credentials);
    applyAuth(response.data);
    return response.data;
  };

  const signup = async (payload) => {
    const response = await authApi.signup(payload);
    applyAuth(response.data);
    return response.data;
  };

  const refreshSession = async () => {
    const storedRefreshToken = localStorage.getItem(storageKeys.refreshToken);

    if (!storedRefreshToken) {
      return null;
    }

    const response = await authApi.refresh({ refreshToken: storedRefreshToken });
    const nextTokens = response.data;

    setAccessToken(nextTokens.accessToken);
    setRefreshToken(nextTokens.refreshToken);
    localStorage.setItem(storageKeys.accessToken, nextTokens.accessToken);
    localStorage.setItem(storageKeys.refreshToken, nextTokens.refreshToken);

    const profile = await authApi.me();
    setUser(profile.data);
    localStorage.setItem(storageKeys.user, JSON.stringify(profile.data));

    return nextTokens;
  };

  const bootstrap = async () => {
    try {
      const storedAccessToken = localStorage.getItem(storageKeys.accessToken);

      if (storedAccessToken) {
        const profile = await authApi.me();
        setUser(profile.data);
        return;
      }

      await refreshSession();
    } catch {
      clearAuth();
      setUser(null);
      setSession(null);
      setAccessToken(null);
      setRefreshToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    bootstrap();
  }, []);

  const logout = async () => {
    try {
      await authApi.logout({ refreshToken: localStorage.getItem(storageKeys.refreshToken) });
    } catch {
      // Ignore logout network errors and clear local state anyway.
    } finally {
      clearAuth();
      setUser(null);
      setSession(null);
      setAccessToken(null);
      setRefreshToken(null);
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem(storageKeys.user, JSON.stringify(updatedUser));
  };

  const value = useMemo(() => ({
    user,
    session,
    accessToken,
    refreshToken,
    loading,
    isAuthenticated: Boolean(user && accessToken),
    login,
    signup,
    logout,
    refreshSession,
    setAuth: applyAuth,
    updateUser,
  }), [user, session, accessToken, refreshToken, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
};