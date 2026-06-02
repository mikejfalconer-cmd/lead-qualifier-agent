import React, { createContext, useContext, useState, useEffect } from 'react';
import { Client, clientsAPI } from '../lib/api';

interface AuthContextType {
  client: Client | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [client, setClient] = useState<Client | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('webhookToken');
    if (savedToken) {
      setToken(savedToken);
      verifyToken(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      setIsLoading(true);
      const response = await clientsAPI.getMe(token);
      setClient(response.data);
      setError(null);
    } catch (err) {
      console.error('Token verification failed:', err);
      setError('Invalid or expired token');
      localStorage.removeItem('webhookToken');
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await clientsAPI.getMe(token);
      setClient(response.data);
      setToken(token);
      localStorage.setItem('webhookToken', token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setClient(null);
    setToken(null);
    localStorage.removeItem('webhookToken');
  };

  return (
    <AuthContext.Provider value={{ client, token, isLoading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
