import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Determine API URL based on environment
const getApiUrl = (): string => {
  // Production: bynix.io domain (web browser)
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.origin.includes('bynix.io')) {
    return 'https://api.bynix.io/api';
  }
  
  // Use environment variable if available
  const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;
  if (backendUrl) {
    return `${backendUrl}/api`;
  }
  
  // Preview/development environments
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.location.origin.includes('preview.emergentagent.com') || window.location.origin.includes('ngrok')) {
      return `${window.location.origin}/api`;
    }
  }
  
  return 'http://localhost:8001/api';
};

export const API_URL = getApiUrl();

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  token?: string | null;
}

export async function apiRequest(endpoint: string, options: RequestOptions = {}) {
  const { method = 'GET', headers = {}, body, token } = options;

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (token) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`,
    };
  }

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || error.message || 'Request failed');
  }

  return response.json();
}

export const api = {
  // Auth
  signup: (data: any) => apiRequest('/auth/signup', { method: 'POST', body: data }),
  verifyOTP: (data: any) => apiRequest('/auth/verify-otp', { method: 'POST', body: data }),
  verifyEmail: (data: { email: string; otp: string }) => apiRequest('/auth/verify-email', { method: 'POST', body: data }),
  resendOTP: (data: { email: string }) => apiRequest('/auth/resend-otp', { method: 'POST', body: data }),
  login: (data: any) => apiRequest('/auth/login', { method: 'POST', body: data }),
  getMe: (token: string) => apiRequest('/auth/me', { token }),
  googleSession: (sessionId: string) => apiRequest('/auth/google/session', { 
    headers: { 'X-Session-ID': sessionId } 
  }),
  
  // Trading
  getAssets: () => apiRequest('/assets'),
  createTrade: (data: any, token: string) => apiRequest('/trades', { method: 'POST', body: data, token }),
  getTrades: (token: string) => apiRequest('/trades', { token }),
  getTradeStats: (token: string) => apiRequest('/trades/stats', { token }),
  settleTrade: (tradeId: string, exitPrice: number, token: string) => 
    apiRequest(`/trades/${tradeId}/settle`, { method: 'POST', body: { exit_price: exitPrice }, token }),
  
  // Wallet
  requestDeposit: (amount: number, token: string) => 
    apiRequest('/wallet/deposit', { method: 'POST', body: { amount }, token }),
  requestWithdrawal: (amount: number, address: string, token: string) => 
    apiRequest('/wallet/withdraw', { method: 'POST', body: { amount, crypto_address: address }, token }),
  getTransactions: (token: string) => apiRequest('/wallet/transactions', { token }),
};