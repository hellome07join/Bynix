import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export const API_URL = `${BACKEND_URL}/api`;

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