import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from './AuthContextObject';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get('/auth/me');
        if (response.status === 200 && response.data.success) {
          setUser(response.data.user);
          if (response.data.token) {
            localStorage.setItem('token', response.data.token);
          }
        } else {
          setUser(null);
          localStorage.removeItem('token');
        }
      } catch {
        setUser(null);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = (userData, token) => {
    setUser(userData);
    if (token) {
      localStorage.setItem('token', token);
    }
  };

  const logout = async (options = {}) => {
    const destination = options.to || '/login';

    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('token');
      navigate(destination, {
        replace: options.replace ?? false,
        state: options.state,
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
