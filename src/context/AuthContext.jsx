import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, getStoredToken, setStoredToken } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => getStoredToken());
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Helper to sync server-persisted user preferences to browser caches
  const syncUserPreferences = (userData) => {
    if (!userData) return;
    if (userData.gemini_api_key) {
      localStorage.setItem('gemini_free_api_key', userData.gemini_api_key);
    }
    if (userData.gemini_preferred_model) {
      localStorage.setItem('gemini_preferred_model', userData.gemini_preferred_model);
    }
    if (userData.dark_mode !== undefined && userData.dark_mode !== null) {
      localStorage.setItem('retail_dark_mode', userData.dark_mode ? 'true' : 'false');
    }
  };

  // Validate session on app launch
  useEffect(() => {
    const initAuth = async () => {
      const stored = getStoredToken();
      if (!stored) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await authApi.getMe();
        if (data.user) {
          setUser(data.user);
          syncUserPreferences(data.user);
        } else {
          setStoredToken(null);
          setToken(null);
        }
      } catch (err) {
        // If server is unreachable or token expired
        console.warn('Auth verification skipped or failed:', err.message);
        if (err.status === 401) {
          setStoredToken(null);
          setToken(null);
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const res = await authApi.login(email, password);
      setStoredToken(res.token);
      setToken(res.token);
      setUser(res.user);
      syncUserPreferences(res.user);
      return res.user;
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (formData) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const res = await authApi.register(formData);
      setStoredToken(res.token);
      setToken(res.token);
      setUser(res.user);
      syncUserPreferences(res.user);
      return res.user;
    } catch (err) {
      setAuthError(err.message || 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsDemo = async () => {
    return login('demo@retailstore.com', 'demo1234');
  };

  const logout = () => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
  };

  const updateUserProfile = async (fields) => {
    try {
      const res = await authApi.updateProfile(fields);
      if (res.user) {
        setUser(res.user);
        syncUserPreferences(res.user);
      }
      return res.user;
    } catch (err) {
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        authError,
        login,
        register,
        loginAsDemo,
        logout,
        updateUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
