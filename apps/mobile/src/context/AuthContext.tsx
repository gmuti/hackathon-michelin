import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../config/api';

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  role: string;
  bio: string | null;
  avatar: string | null;
  cuisinePreferences: string[];
  dietaryRestrictions: string[];
};

type AuthContextType = {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  register: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = '@mm_token';
const USER_KEY = '@mm_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]).then(([[, storedToken], [, storedUser]]) => {
      if (storedToken) setToken(storedToken);
      if (storedUser) setUser(JSON.parse(storedUser));
      setIsLoading(false);
    });
  }, []);

  const persist = async (t: string, u: AuthUser) => {
    await AsyncStorage.multiSet([[TOKEN_KEY, t], [USER_KEY, JSON.stringify(u)]]);
    setToken(t);
    setUser(u);
  };

  const login = async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: AuthUser }>('/auth/login', { email, password });
    if (res.error) return { error: res.error };
    await persist(res.data.token, res.data.user);
    return { error: null };
  };

  const register = async (email: string, password: string, username: string) => {
    const res = await api.post<{ token: string; user: AuthUser }>('/auth/register', { email, password, username });
    if (res.error) return { error: res.error };
    await persist(res.data.token, res.data.user);
    return { error: null };
  };

  const logout = async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    setToken(null);
    setUser(null);
  };

  const updateUser = async (updates: Partial<AuthUser>) => {
    if (!user || !token) return;
    const res = await api.patch<AuthUser>('/users/me', updates, token);
    if (res.error) return;
    const updated = { ...user, ...res.data };
    setUser(updated);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
