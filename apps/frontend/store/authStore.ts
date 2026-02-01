import { create } from 'zustand';
import { authApi } from '../lib/api';

interface User {
  id: string;
  email: string;
  emailVerified: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null,
  isLoading: false,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await authApi.login(email, password);
      const { accessToken, user } = response.data;
      
      localStorage.setItem('auth_token', accessToken);
      set({ 
        token: accessToken, 
        user, 
        isAuthenticated: true,
        isLoading: false 
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      await authApi.register(email, password);
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    set({ 
      user: null, 
      token: null, 
      isAuthenticated: false 
    });
  },

  loadUser: async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }

    set({ isLoading: true });
    try {
      const response = await authApi.getProfile();
      set({ 
        user: response.data, 
        isAuthenticated: true,
        isLoading: false 
      });
    } catch (error) {
      localStorage.removeItem('auth_token');
      set({ 
        user: null, 
        token: null, 
        isAuthenticated: false,
        isLoading: false 
      });
    }
  },
}));
