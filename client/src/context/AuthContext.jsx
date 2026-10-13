import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize and verify session on initial app load
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const res = await api.get('/auth/me');
        if (res.data?.success && res.data?.user) {
          setUser(res.data.user);
          localStorage.setItem('flowforge_user', JSON.stringify(res.data.user));
        } else {
          setUser(null);
          localStorage.removeItem('flowforge_token');
          localStorage.removeItem('flowforge_user');
        }
      } catch (err) {
        setUser(null);
        localStorage.removeItem('flowforge_token');
        localStorage.removeItem('flowforge_user');
      } finally {
        setLoading(false);
      }
    };

    initializeSession();
  }, []);

  // Custom Registration
  const signUp = async ({ name, username, email, password, confirmPassword }) => {
    const res = await api.post('/auth/register', {
      name,
      username,
      email,
      password,
      confirmPassword,
    });

    if (res.data?.success) {
      const registeredUser = res.data.user;
      const token = res.data.token;
      if (token) {
        localStorage.setItem('flowforge_token', token);
      }
      localStorage.setItem('flowforge_user', JSON.stringify(registeredUser));
      setUser(registeredUser);
      return res.data;
    } else {
      throw new Error(res.data?.error || 'Registration failed');
    }
  };

  // Custom Sign In
  const signIn = async (identifier, password) => {
    const res = await api.post('/auth/login', {
      identifier,
      password,
    });

    if (res.data?.success) {
      const loggedInUser = res.data.user;
      const token = res.data.token;
      if (token) {
        localStorage.setItem('flowforge_token', token);
      }
      localStorage.setItem('flowforge_user', JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      return res.data;
    } else {
      throw new Error(res.data?.error || 'Sign in failed');
    }
  };

  // Password recovery request
  const forgotPassword = async (email) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  };

  // Reset password
  const resetPassword = async (token, password, confirmPassword) => {
    const res = await api.post('/auth/reset-password', {
      token,
      password,
      confirmPassword,
    });
    return res.data;
  };

  // Sign Out
  const signOut = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // quiet
    }
    setUser(null);
    localStorage.removeItem('flowforge_token');
    localStorage.removeItem('flowforge_user');
    localStorage.removeItem('flowforge_active_team_id');
    window.location.href = '/login';
  };

  // Refresh user state (e.g. after profile update)
  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.success && res.data?.user) {
        setUser(res.data.user);
        localStorage.setItem('flowforge_user', JSON.stringify(res.data.user));
      }
    } catch (e) {
      // quiet
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        forgotPassword,
        resetPassword,
        refreshUser,
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
