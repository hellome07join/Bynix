import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  demo_balance: number;
  real_balance: number;
  is_admin: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  accountType: 'demo' | 'real';
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setAccountType: (type: 'demo' | 'real') => void;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  loadAuth: () => Promise<void>;
  updateBalance: (demoBalance: number, realBalance: number) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  accountType: 'demo',
  isLoading: true,

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setAccountType: (type) => set({ accountType: type }),

  login: async (token, user) => {
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    set({ token, user, isLoading: false });
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    set({ user: null, token: null, accountType: 'demo' });
  },

  loadAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userStr = await AsyncStorage.getItem('user');
      
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ token, user, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load auth:', error);
      set({ isLoading: false });
    }
  },

  updateBalance: (demoBalance, realBalance) => {
    const { user } = get();
    if (user) {
      set({ user: { ...user, demo_balance: demoBalance, real_balance: realBalance } });
    }
  },
}));