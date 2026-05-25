'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface User {
  id: number;
  name: string;
  phone: string;
  email?: string;
  role: 'admin' | 'customer' | 'supplier' | 'driver';
  supplierType?: 'commercial' | 'residential' | 'commercial_residential' | null;
  supplierId?: number;
  canViewBilling?: boolean;
  profilePhoto?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signup: (
    name: string,
    phone: string,
    email: string | undefined,
    role: string,
    password: string,
    supplierType?: 'commercial' | 'residential' | 'commercial_residential'
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      fetchUser(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async (authToken: string) => {
    try {
      const response = await api.get<{ user: User }>('/auth/me');
      if (response.success && response.data) {
        setUser(response.data.user);
        setToken(authToken);
      } else {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (phone: string, password: string) => {
    try {
      const response = await api.post<{ user: User; token: string }>('/auth/login', {
        phone,
        password,
      });

      if (response.success && response.data) {
        setUser(response.data.user);
        setToken(response.data.token);
        localStorage.setItem('token', response.data.token);
        
        // Refresh user to get latest profile photo
        try {
          const refreshResponse = await api.get<{ user: User }>('/auth/me');
          if (refreshResponse.success && refreshResponse.data) {
            setUser(refreshResponse.data.user);
          }
        } catch {}
        
        return { success: true };
      } else {
        return { success: false, message: response.message || 'Login failed' };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Login failed',
      };
    }
  };

  const signup = async (
    name: string,
    phone: string,
    email: string | undefined,
    role: string,
    password: string,
    supplierType?: 'commercial' | 'residential' | 'commercial_residential'
  ) => {
    try {
      const response = await api.post<{ user: User; token: string }>('/auth/signup', {
        name,
        phone,
        email,
        role,
        password,
        supplierType,
      });

      if (response.success && response.data) {
        setUser(response.data.user);
        setToken(response.data.token);
        localStorage.setItem('token', response.data.token);
        
        // Refresh user to get latest profile photo
        try {
          const refreshResponse = await api.get<{ user: User }>('/auth/me');
          if (refreshResponse.success && refreshResponse.data) {
            setUser(refreshResponse.data.user);
          }
        } catch {}
        
        return { success: true };
      } else {
        return { success: false, message: response.message || 'Signup failed' };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Signup failed',
      };
    }
  };

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const response = await api.get<{ user: User }>('/auth/me');
      if (response.success && response.data) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, [token]);

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
