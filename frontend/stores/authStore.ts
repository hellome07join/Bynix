import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../utils/api';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  chart_picture?: string;
  demo_balance: number;
  real_balance: number;
  bonus_balance: number;
  total_balance?: number;
  withdrawable_balance?: number;
  is_admin: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  accountType: 'demo' | 'real';
  isLoading: boolean;
  chartTimeframe: string;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setAccountType: (type: 'demo' | 'real') => void;
  setChartTimeframe: (timeframe: string) => void;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  loadAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateBalance: (demoBalance: number, realBalance: number, bonusBalance?: number, totalBalance?: number) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  accountType: 'real',
  isLoading: true,
  chartTimeframe: '1m',

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setAccountType: (type) => set({ accountType: type }),
  setChartTimeframe: (timeframe) => {
    set({ chartTimeframe: timeframe });
    // Also save to AsyncStorage
    AsyncStorage.setItem('chart_timeframe', timeframe).catch(console.error);
  },

  login: async (token, user) => {
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    set({ token, user, isLoading: false, accountType: 'real' });
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    set({ user: null, token: null, accountType: 'real' });
  },

  loadAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userStr = await AsyncStorage.getItem('user');
      const savedTimeframe = await AsyncStorage.getItem('chart_timeframe');
      
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ 
          token, 
          user, 
          isLoading: false, 
          accountType: 'real',
          chartTimeframe: savedTimeframe || '1m'
        });
        
        // Also refresh from server to get latest balance
        const { refreshUser } = get();
        await refreshUser();
      } else {
        set({ 
          isLoading: false, 
          accountType: 'real',
          chartTimeframe: savedTimeframe || '1m'
        });
      }
    } catch (error) {
      console.error('Failed to load auth:', error);
      set({ isLoading: false });
    }
  },
  
  refreshUser: async () => {
    const { token } = get();
    if (!token) return;
    
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        const updatedUser = {
          user_id: userData.user_id,
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
          chart_picture: userData.chart_picture,
          demo_balance: userData.demo_balance || 10000,
          real_balance: userData.real_balance || 0,
          bonus_balance: userData.bonus_balance || 0,
          total_balance: userData.total_balance || 0,
          withdrawable_balance: userData.withdrawable_balance || 0,
          is_admin: userData.is_admin || false,
        };
        set({ user: updatedUser });
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  },

  updateBalance: async (demoBalance, realBalance, bonusBalance?, totalBalance?) => {
    const { user } = get();
    if (user) {
      const newBonusBalance = bonusBalance !== undefined ? bonusBalance : user.bonus_balance;
      const calculatedTotalBalance = totalBalance !== undefined ? totalBalance : (realBalance + newBonusBalance);
      const updatedUser = { 
        ...user, 
        demo_balance: demoBalance, 
        real_balance: realBalance,
        bonus_balance: newBonusBalance,
        total_balance: calculatedTotalBalance,
      };
      set({ user: updatedUser });
      // Persist to AsyncStorage
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    }
  },
}));