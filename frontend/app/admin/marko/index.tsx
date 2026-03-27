import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Switch,
  Dimensions,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../stores/authStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BYNIX_LOGO = null; // Using text logo instead

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL 
  ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`
  : typeof window !== 'undefined' && window.location.origin.includes('preview.emergentagent.com')
    ? `${window.location.origin}/api`
    : 'http://localhost:8001/api';

// Professional Light Theme Colors
const COLORS = {
  // Backgrounds
  bg: '#F8FAFC',
  bgSecondary: '#EFF6FF',
  card: '#FFFFFF',
  cardHover: '#F1F5F9',
  
  // Sidebar - Dark for contrast
  sidebar: '#0F172A',
  sidebarHover: '#1E293B',
  sidebarActive: '#3B82F6',
  sidebarText: '#94A3B8',
  sidebarTextActive: '#FFFFFF',
  
  // Primary Colors
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  primaryLight: '#DBEAFE',
  
  // Status Colors
  success: '#10B981',
  successLight: '#D1FAE5',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  info: '#06B6D4',
  infoLight: '#CFFAFE',
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
  
  // Text Colors
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textLight: '#CBD5E1',
  
  // Border & Divider
  border: '#E2E8F0',
  divider: '#F1F5F9',
  
  // Gradients
  gradient1: ['#3B82F6', '#2563EB'],
  gradient2: ['#10B981', '#059669'],
  gradient3: ['#F59E0B', '#D97706'],
  gradient4: ['#EF4444', '#DC2626'],
  gradient5: ['#8B5CF6', '#7C3AED'],
};

// Menu Items with icons
const MENU_ITEMS = [
  { id: 'overview', label: 'Overview', icon: 'grid-outline', section: 'main' },
  { id: 'analytics', label: 'Analytics', icon: 'stats-chart-outline', section: 'main' },
  { id: 'users', label: 'User Management', icon: 'people-outline', section: 'management' },
  { id: 'kyc', label: 'KYC Requests', icon: 'shield-checkmark-outline', section: 'management', badge: 5 },
  { id: 'trading', label: 'Trading Control', icon: 'trending-up-outline', section: 'trading' },
  { id: 'ai-control', label: 'AI Automation', icon: 'hardware-chip-outline', section: 'trading' },
  { id: 'live-trades', label: 'Live Trades', icon: 'pulse-outline', section: 'trading', live: true },
  { id: 'deposits', label: 'Deposits', icon: 'arrow-down-circle-outline', section: 'finance' },
  { id: 'withdrawals', label: 'Withdrawals', icon: 'arrow-up-circle-outline', section: 'finance', badge: 3 },
  { id: 'affiliates', label: 'Affiliates', icon: 'git-network-outline', section: 'partners' },
  { id: 'staff', label: 'Staff Management', icon: 'briefcase-outline', section: 'admin' },
  { id: 'settings', label: 'Settings', icon: 'settings-outline', section: 'admin' },
];

const MENU_SECTIONS = {
  main: 'Dashboard',
  management: 'Management',
  trading: 'Trading',
  finance: 'Finance',
  partners: 'Partners',
  admin: 'Administration',
};

export default function AdminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, logout, loadAuth } = useAuthStore();
  
  // States
  const [authChecked, setAuthChecked] = useState(false);
  const [activeMenu, setActiveMenu] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data States
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    platformProfit: 0,
    activeTrades: 0,
    pendingKYC: 0,
    pendingWithdrawals: 0,
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentTrades, setRecentTrades] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  
  // Phase 2 States
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('all'); // all, verified, unverified, banned
  
  // Trading Control States
  const [tradingAssets, setTradingAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [globalWinRate, setGlobalWinRate] = useState(45);
  const [demoWinRate, setDemoWinRate] = useState(65); // Demo balance win rate
  const [tradingEnabled, setTradingEnabled] = useState(true);
  const [godModeStatus, setGodModeStatus] = useState(null);
  
  // User Edit States
  const [editBalance, setEditBalance] = useState('');
  const [balanceOperation, setBalanceOperation] = useState('add'); // add, subtract, set
  const [balanceType, setBalanceType] = useState('real'); // real, demo, bonus
  
  // Live Trades
  const [liveTrades, setLiveTrades] = useState([]);
  
  // Deposits
  const [deposits, setDeposits] = useState<any[]>([]);
  const [depositsStats, setDepositsStats] = useState({
    totalAmount: 0,
    pendingCount: 0,
    todayAmount: 0
  });

  // Withdrawal User Modal
  const [showWithdrawalUserModal, setShowWithdrawalUserModal] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);
  const [withdrawalUserStats, setWithdrawalUserStats] = useState<any>({
    totalDeposit: 0,
    totalWithdraw: 0,
    totalProfit: 0,
    profitRate: 0,
    totalBalance: 0,
    totalTrades: 0,
    wonTrades: 0
  });
  const [showKycModal, setShowKycModal] = useState(false);
  const [kycRequirement, setKycRequirement] = useState('');

  // KYC Submissions
  const [showKycSubmissionsModal, setShowKycSubmissionsModal] = useState(false);
  const [kycSubmissions, setKycSubmissions] = useState<any[]>([]);
  const [kycSubmissionsCount, setKycSubmissionsCount] = useState(0);
  const [loadingKycSubmissions, setLoadingKycSubmissions] = useState(false);
  const [selectedKycDocument, setSelectedKycDocument] = useState<any>(null);

  // Promo Codes States
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState({
    code: '',
    bonus_type: 'percentage',
    bonus_value: '',
    min_deposit: '',
    max_bonus: '',
    usage_limit: '',
    expires_days: ''
  });
  const [promoLoading, setPromoLoading] = useState(false);

  // Affiliate Levels Configuration - Matching Affiliate Dashboard
  const AFFILIATE_LEVELS = [
    { id: 'starter', name: 'Starter', icon: 'star-outline', color: '#6B7280', minFTDs: 0 },
    { id: 'advanced', name: 'Advanced', icon: 'star', color: '#3B82F6', minFTDs: 15 },
    { id: 'professional', name: 'Professional', icon: 'star', color: '#8B5CF6', minFTDs: 50 },
    { id: 'expert', name: 'Expert', icon: 'diamond', color: '#EC4899', minFTDs: 100 },
    { id: 'master', name: 'Master', icon: 'trophy', color: '#F59E0B', minFTDs: 200 },
    { id: 'guru', name: 'Guru', icon: 'trophy', color: '#EF4444', minFTDs: 400 },
    { id: 'legend', name: 'Legend', icon: 'trophy', color: '#FCD34D', minFTDs: 700 },
  ];

  // Affiliate States
  const [affiliateStats, setAffiliateStats] = useState<any>({
    total_affiliates: 0,
    active_affiliates: 0,
    total_paid: 0,
    pending_payouts: 0,
    commission_settings: {
      levels: {
        starter: { revenue_share: 50, turnover_commission: 2 },
        advanced: { revenue_share: 55, turnover_commission: 2.5 },
        professional: { revenue_share: 60, turnover_commission: 3 },
        expert: { revenue_share: 65, turnover_commission: 3.5 },
        master: { revenue_share: 70, turnover_commission: 4 },
        guru: { revenue_share: 75, turnover_commission: 4.5 },
        legend: { revenue_share: 85, turnover_commission: 5.5 },
      }
    }
  });
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [showCreateAffiliateModal, setShowCreateAffiliateModal] = useState(false);
  const [showEditAffiliateModal, setShowEditAffiliateModal] = useState(false);
  const [showEditSettingsModal, setShowEditSettingsModal] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<any>(null);
  const [newAffiliate, setNewAffiliate] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    level: 'starter',
    commission_rate: 50,
    turnover_rate: 2
  });
  const [editSettings, setEditSettings] = useState({
    levels: {
      starter: { revenue_share: 50, turnover_commission: 2 },
      advanced: { revenue_share: 55, turnover_commission: 2.5 },
      professional: { revenue_share: 60, turnover_commission: 3 },
      expert: { revenue_share: 65, turnover_commission: 3.5 },
      master: { revenue_share: 70, turnover_commission: 4 },
      guru: { revenue_share: 75, turnover_commission: 4.5 },
      legend: { revenue_share: 85, turnover_commission: 5.5 },
    }
  });
  const [affiliateLoading, setAffiliateLoading] = useState(false);
  const [affiliateSubTab, setAffiliateSubTab] = useState('list'); // list, leaderboard, payouts, fraud, chat
  const [affiliateSearch, setAffiliateSearch] = useState('');
  const [topAffiliates, setTopAffiliates] = useState<any>({ top_by_earnings: [], top_by_referrals: [], top_by_ftds: [] });
  const [affiliatePayouts, setAffiliatePayouts] = useState<any[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<any[]>([]);
  const [supportChats, setSupportChats] = useState<any[]>([]);
  const [showAffiliateProfileModal, setShowAffiliateProfileModal] = useState(false);
  const [affiliateProfile, setAffiliateProfile] = useState<any>(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState({ type: 'add', amount: 0, reason: '' });
  const [payoutSettings, setPayoutSettings] = useState({ hold_period_days: 7, min_payout: 50, negative_balance_carryover: true });

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      await loadAuth();
      setAuthChecked(true);
    };
    checkAuth();
  }, []);
  
  useEffect(() => {
    if (authChecked && !token) {
      router.replace('/admin/marko/daddy');
    }
  }, [authChecked, token]);

  // Fetch data
  const fetchDashboardData = useCallback(async () => {
    if (!token) return;
    
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // Fetch stats
      const statsRes = await fetch(`${API_URL}/admin/stats`, { headers });
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats({
          totalUsers: data.total_users || 0,
          activeUsers: data.active_users || 0,
          totalDeposits: data.total_deposits || 0,
          totalWithdrawals: data.total_withdrawals || 0,
          platformProfit: data.platform_profit || 0,
          activeTrades: data.active_trades || 0,
          pendingKYC: data.pending_kyc || 0,
          pendingWithdrawals: data.pending_withdrawals || 0,
        });
      }
      
      // Fetch users
      const usersRes = await fetch(`${API_URL}/admin/users?limit=5`, { headers });
      if (usersRes.ok) {
        const data = await usersRes.json();
        setRecentUsers(data.users || []);
      }
      
      // Fetch trades
      const tradesRes = await fetch(`${API_URL}/admin/trades?limit=10`, { headers });
      if (tradesRes.ok) {
        const data = await tradesRes.json();
        setRecentTrades(data.trades || []);
      }
      
      // Fetch withdrawals
      const wdRes = await fetch(`${API_URL}/admin/withdrawals`, { headers });
      if (wdRes.ok) {
        const data = await wdRes.json();
        setWithdrawals(data.withdrawals || []);
      }
      
      // Fetch all users for User Management
      const allUsersRes = await fetch(`${API_URL}/admin/users?limit=100`, { headers });
      if (allUsersRes.ok) {
        const data = await allUsersRes.json();
        setAllUsers(data.users || []);
      }
      
      // Fetch assets (use admin endpoint to get ALL including inactive)
      const assetsRes = await fetch(`${API_URL}/admin/assets`, { headers });
      if (assetsRes.ok) {
        const data = await assetsRes.json();
        setTradingAssets(data.assets || data || []);
      }
      
      // Fetch God Mode status
      const godModeRes = await fetch(`${API_URL}/admin/god-mode/status`, { headers });
      if (godModeRes.ok) {
        const data = await godModeRes.json();
        setGodModeStatus(data);
        if (data.global_win_rate) setGlobalWinRate(data.global_win_rate);
      }
      
      // Fetch live trades
      const liveTradesRes = await fetch(`${API_URL}/admin/trades?limit=50&status=active`, { headers });
      if (liveTradesRes.ok) {
        const data = await liveTradesRes.json();
        setLiveTrades(data.trades || []);
      }
      
      // Fetch deposits
      const depositsRes = await fetch(`${API_URL}/admin/deposits`, { headers });
      if (depositsRes.ok) {
        const data = await depositsRes.json();
        const depositsList = data.deposits || [];
        setDeposits(depositsList);
        
        // Calculate deposits stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const totalAmount = depositsList
          .filter((d: any) => d.status === 'completed' || d.status === 'confirmed' || d.status === 'credited')
          .reduce((sum: number, d: any) => sum + (d.amount_usd || 0), 0);
        
        const pendingCount = depositsList
          .filter((d: any) => d.status === 'pending' || d.status === 'waiting')
          .length;
        
        const todayAmount = depositsList
          .filter((d: any) => {
            const createdAt = new Date(d.created_at);
            return createdAt >= today && (d.status === 'completed' || d.status === 'confirmed' || d.status === 'credited');
          })
          .reduce((sum: number, d: any) => sum + (d.amount_usd || 0), 0);
        
        setDepositsStats({
          totalAmount,
          pendingCount,
          todayAmount
        });
      }
      
      // Fetch KYC submissions data
      const kycRes = await fetch(`${API_URL}/admin/kyc-submissions`, { headers });
      if (kycRes.ok) {
        const data = await kycRes.json();
        setKycSubmissions(data.submissions || []);
        setKycSubmissionsCount(data.count || 0);
      }
      
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchDashboardData();
      fetchPromoCodes();
      const interval = setInterval(fetchDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [token, fetchDashboardData]);

  // Affiliate Data Fetcher
  const fetchAffiliateData = useCallback(async () => {
    try {
      const adminToken = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('adminToken') || await AsyncStorage.getItem('userToken');
      
      // Fetch stats
      const statsRes = await fetch(`${API_URL}/admin/affiliates/stats`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setAffiliateStats(statsData);
        setEditSettings(statsData.commission_settings || {
          levels: {
            starter: { revenue_share: 50, turnover_commission: 2 },
            advanced: { revenue_share: 55, turnover_commission: 2.5 },
            professional: { revenue_share: 60, turnover_commission: 3 },
            expert: { revenue_share: 65, turnover_commission: 3.5 },
            master: { revenue_share: 70, turnover_commission: 4 },
            guru: { revenue_share: 75, turnover_commission: 4.5 },
            legend: { revenue_share: 85, turnover_commission: 5.5 },
          }
        });
      }
      
      // Fetch affiliates list with search
      const searchParam = affiliateSearch ? `&search=${encodeURIComponent(affiliateSearch)}` : '';
      const affRes = await fetch(`${API_URL}/admin/affiliates/list?limit=50${searchParam}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (affRes.ok) {
        const affData = await affRes.json();
        setAffiliates(affData.affiliates || []);
      }
      
      // Fetch top affiliates
      const topRes = await fetch(`${API_URL}/admin/affiliates/top?limit=10`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (topRes.ok) {
        const topData = await topRes.json();
        setTopAffiliates(topData);
      }
      
      // Fetch payouts
      const payoutsRes = await fetch(`${API_URL}/admin/affiliates/payouts`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (payoutsRes.ok) {
        const payoutsData = await payoutsRes.json();
        setAffiliatePayouts(payoutsData.payouts || []);
        if (payoutsData.settings) {
          setPayoutSettings(payoutsData.settings);
        }
      }
      
      // Fetch fraud alerts
      const fraudRes = await fetch(`${API_URL}/admin/affiliates/fraud-alerts?limit=50`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (fraudRes.ok) {
        const fraudData = await fraudRes.json();
        setFraudAlerts(fraudData.alerts || []);
      }
      
      // Fetch support chats
      const chatsRes = await fetch(`${API_URL}/admin/affiliates/support-chats`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (chatsRes.ok) {
        const chatsData = await chatsRes.json();
        setSupportChats(chatsData.chats || []);
      }
    } catch (error) {
      console.error('Error fetching affiliate data:', error);
    }
  }, [affiliateSearch]);

  useEffect(() => {
    if (activeMenu === 'affiliates') {
      fetchAffiliateData();
    }
  }, [activeMenu, fetchAffiliateData]);

  // Fetch affiliate profile
  const fetchAffiliateProfile = async (affiliateId: string) => {
    setAffiliateLoading(true);
    try {
      const adminToken = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('adminToken') || await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/admin/affiliates/${affiliateId}/profile`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAffiliateProfile(data);
        setShowAffiliateProfileModal(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch affiliate profile');
    } finally {
      setAffiliateLoading(false);
    }
  };

  // Handle commission adjustment
  const handleCommissionAdjustment = async (affiliateId?: string, amount?: number, type?: string) => {
    const affId = affiliateId || selectedAffiliate?.affiliate_id;
    const adjAmount = amount || adjustmentData.amount;
    const adjType = type || adjustmentData.type;
    
    if (!affId) return;
    setAffiliateLoading(true);
    try {
      const adminToken = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('adminToken') || await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/admin/affiliates/${affId}/commission-adjustment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: adjType,
          amount: adjAmount,
          reason: adjustmentData.reason || `Manual ${adjType} by admin`
        })
      });
      if (res.ok) {
        Alert.alert('Success', `Commission ${adjType}ed successfully`);
        setShowAdjustmentModal(false);
        setAdjustmentData({ type: 'add', amount: 0, reason: '' });
        if (selectedAffiliate) {
          setSelectedAffiliate({...selectedAffiliate, _adjustmentAmount: ''});
        }
        fetchAffiliateData();
      } else {
        Alert.alert('Error', 'Failed to adjust commission');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to adjust commission');
    } finally {
      setAffiliateLoading(false);
    }
  };

  // Handle affiliate password change
  const handleAffiliatePasswordChange = async (affiliateId: string, newPassword: string) => {
    if (!affiliateId || !newPassword) return;
    setAffiliateLoading(true);
    try {
      const adminToken = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('adminToken') || await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/admin/affiliates/${affiliateId}/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ new_password: newPassword })
      });
      if (res.ok) {
        Alert.alert('Success', 'Password changed successfully');
        if (selectedAffiliate) {
          setSelectedAffiliate({...selectedAffiliate, _newPassword: ''});
        }
      } else {
        Alert.alert('Error', 'Failed to change password');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to change password');
    } finally {
      setAffiliateLoading(false);
    }
  };

  // Process payout
  const handleProcessPayout = async (payoutId: string, action: string) => {
    try {
      const adminToken = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('adminToken') || await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/admin/affiliates/payouts/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ payout_id: payoutId, action })
      });
      if (res.ok) {
        Alert.alert('Success', `Payout ${action}ed`);
        fetchAffiliateData();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process payout');
    }
  };

  // Resolve fraud alert
  const handleResolveFraudAlert = async (alertId: string, action: string) => {
    try {
      const adminToken = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('adminToken') || await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/admin/affiliates/fraud-alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, notes: '' })
      });
      if (res.ok) {
        Alert.alert('Success', 'Alert resolved');
        fetchAffiliateData();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to resolve alert');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Trade Action Handlers
  const handleForceWin = async (tradeId: string) => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_URL}/admin/trades/${tradeId}/override`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ result: 'win' })
      });
      
      if (response.ok) {
        const data = await response.json();
        Alert.alert('Success', `Trade forced to WIN. Profit: $${data.profit_loss?.toFixed(2) || 0}`);
        fetchDashboardData(); // Refresh trades list
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to force win');
      }
    } catch (error) {
      console.error('Force win error:', error);
      Alert.alert('Error', 'Failed to force win');
    }
  };

  const handleForceLoss = async (tradeId: string) => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_URL}/admin/trades/${tradeId}/override`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ result: 'lose' })
      });
      
      if (response.ok) {
        const data = await response.json();
        Alert.alert('Success', `Trade forced to LOSS. Loss: $${Math.abs(data.profit_loss || 0).toFixed(2)}`);
        fetchDashboardData(); // Refresh trades list
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to force loss');
      }
    } catch (error) {
      console.error('Force loss error:', error);
      Alert.alert('Error', 'Failed to force loss');
    }
  };

  const handleCloseTrade = async (tradeId: string) => {
    if (!token) return;
    
    Alert.alert(
      'Confirm Close',
      'Are you sure you want to cancel this trade and refund the user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Trade',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/admin/trades/${tradeId}/cancel`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (response.ok) {
                Alert.alert('Success', 'Trade cancelled and user refunded');
                fetchDashboardData(); // Refresh trades list
              } else {
                const error = await response.json();
                Alert.alert('Error', error.detail || 'Failed to close trade');
              }
            } catch (error) {
              console.error('Close trade error:', error);
              Alert.alert('Error', 'Failed to close trade');
            }
          }
        }
      ]
    );
  };

  // Withdrawal Action Handlers
  const handleApproveWithdrawal = async (withdrawalId: string, userEmail: string, amount: number) => {
    console.log('[APPROVE] Called with:', withdrawalId, userEmail, amount);
    
    if (!token) {
      if (Platform.OS === 'web') {
        window.alert('Error: Not authenticated');
      } else {
        Alert.alert('Error', 'Not authenticated');
      }
      return;
    }
    
    if (!withdrawalId) {
      if (Platform.OS === 'web') {
        window.alert('Error: Invalid withdrawal ID');
      } else {
        Alert.alert('Error', 'Invalid withdrawal ID');
      }
      return;
    }
    
    // Directly call API without confirmation for better reliability
    try {
      console.log('[APPROVE] Making API call for:', withdrawalId);
      const response = await fetch(`${API_URL}/admin/withdrawals/${withdrawalId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      console.log('[APPROVE] Response:', data);
      
      if (response.ok) {
        if (Platform.OS === 'web') {
          window.alert(`Success: Withdrawal of $${amount?.toFixed(2) || 0} approved successfully`);
        } else {
          Alert.alert('Success', `Withdrawal of $${amount?.toFixed(2) || 0} approved successfully`);
        }
        fetchDashboardData(); // Refresh data
      } else {
        if (Platform.OS === 'web') {
          window.alert(`Error: ${data.detail || 'Failed to approve withdrawal'}`);
        } else {
          Alert.alert('Error', data.detail || 'Failed to approve withdrawal');
        }
      }
    } catch (error) {
      console.error('Approve withdrawal error:', error);
      if (Platform.OS === 'web') {
        window.alert('Error: Failed to approve withdrawal');
      } else {
        Alert.alert('Error', 'Failed to approve withdrawal');
      }
    }
  };

  const handleRejectWithdrawal = async (withdrawalId: string, userEmail: string, amount: number) => {
    console.log('[REJECT] Called with:', withdrawalId, userEmail, amount);
    
    if (!token) {
      if (Platform.OS === 'web') {
        window.alert('Error: Not authenticated');
      } else {
        Alert.alert('Error', 'Not authenticated');
      }
      return;
    }
    
    if (!withdrawalId) {
      if (Platform.OS === 'web') {
        window.alert('Error: Invalid withdrawal ID');
      } else {
        Alert.alert('Error', 'Invalid withdrawal ID');
      }
      return;
    }
    
    // Directly call API without confirmation for better reliability
    try {
      console.log('[REJECT] Making API call for:', withdrawalId);
      const response = await fetch(`${API_URL}/admin/withdrawals/${withdrawalId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'Rejected by admin' })
      });
      
      const data = await response.json();
      console.log('[REJECT] Response:', data);
      
      if (response.ok) {
        if (Platform.OS === 'web') {
          window.alert(`Success: Withdrawal rejected and $${amount?.toFixed(2) || 0} refunded to user`);
        } else {
          Alert.alert('Success', `Withdrawal rejected and $${amount?.toFixed(2) || 0} refunded to user`);
        }
        fetchDashboardData(); // Refresh data
      } else {
        if (Platform.OS === 'web') {
          window.alert(`Error: ${data.detail || 'Failed to reject withdrawal'}`);
        } else {
          Alert.alert('Error', data.detail || 'Failed to reject withdrawal');
        }
      }
    } catch (error) {
      console.error('Reject withdrawal error:', error);
      if (Platform.OS === 'web') {
        window.alert('Error: Failed to reject withdrawal');
      } else {
        Alert.alert('Error', 'Failed to reject withdrawal');
      }
    }
  };

  // Fetch user stats for withdrawal review
  const fetchWithdrawalUserStats = async (userId: string, withdrawal: any) => {
    if (!token) {
      Alert.alert('Error', 'Not authenticated');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/admin/withdrawals/${userId}/user-stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWithdrawalUserStats(data);
        setSelectedWithdrawal(withdrawal);
        setShowWithdrawalUserModal(true);
      } else {
        if (Platform.OS === 'web') {
          window.alert('Error: Failed to fetch user stats');
        } else {
          Alert.alert('Error', 'Failed to fetch user stats');
        }
      }
    } catch (error) {
      console.error('Fetch user stats error:', error);
      if (Platform.OS === 'web') {
        window.alert('Error: Failed to fetch user stats');
      } else {
        Alert.alert('Error', 'Failed to fetch user stats');
      }
    }
  };

  // Lock withdrawal with KYC requirement
  const handleLockWithdrawal = async (withdrawalId: string, kycType: string) => {
    if (!token) {
      if (Platform.OS === 'web') {
        window.alert('Error: Not authenticated');
      } else {
        Alert.alert('Error', 'Not authenticated');
      }
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/admin/withdrawals/${withdrawalId}/lock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          kyc_requirement: kycType,
          reason: `Additional KYC required: ${kycType}`
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (Platform.OS === 'web') {
          window.alert(`Success: Withdrawal locked. User must submit: ${kycType}`);
        } else {
          Alert.alert('Success', `Withdrawal locked. User must submit: ${kycType}`);
        }
        setShowKycModal(false);
        setShowWithdrawalUserModal(false);
        fetchDashboardData(); // Refresh data
      } else {
        if (Platform.OS === 'web') {
          window.alert(`Error: ${data.detail || 'Failed to lock withdrawal'}`);
        } else {
          Alert.alert('Error', data.detail || 'Failed to lock withdrawal');
        }
      }
    } catch (error) {
      console.error('Lock withdrawal error:', error);
      if (Platform.OS === 'web') {
        window.alert('Error: Failed to lock withdrawal');
      } else {
        Alert.alert('Error', 'Failed to lock withdrawal');
      }
    }
  };

  // Unlock withdrawal
  const handleUnlockWithdrawal = async (withdrawalId: string) => {
    if (!token) {
      if (Platform.OS === 'web') {
        window.alert('Error: Not authenticated');
      } else {
        Alert.alert('Error', 'Not authenticated');
      }
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/admin/withdrawals/${withdrawalId}/unlock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (Platform.OS === 'web') {
          window.alert('Success: Withdrawal unlocked and moved back to pending');
        } else {
          Alert.alert('Success', 'Withdrawal unlocked and moved back to pending');
        }
        fetchDashboardData(); // Refresh data
      } else {
        if (Platform.OS === 'web') {
          window.alert(`Error: ${data.detail || 'Failed to unlock withdrawal'}`);
        } else {
          Alert.alert('Error', data.detail || 'Failed to unlock withdrawal');
        }
      }
    } catch (error) {
      console.error('Unlock withdrawal error:', error);
      if (Platform.OS === 'web') {
        window.alert('Error: Failed to unlock withdrawal');
      } else {
        Alert.alert('Error', 'Failed to unlock withdrawal');
      }
    }
  };

  // Fetch KYC Submissions
  const fetchKycSubmissions = async (showModal = true) => {
    if (!token) return;
    
    setLoadingKycSubmissions(true);
    try {
      const response = await fetch(`${API_URL}/admin/kyc-submissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setKycSubmissions(data.submissions || []);
        setKycSubmissionsCount(data.count || 0);
        if (showModal) {
          setShowKycSubmissionsModal(true);
        }
      } else {
        if (showModal) {
          if (Platform.OS === 'web') {
            window.alert('Error: Failed to fetch KYC submissions');
          } else {
            Alert.alert('Error', 'Failed to fetch KYC submissions');
          }
        }
      }
    } catch (error) {
      console.error('Fetch KYC submissions error:', error);
      if (showModal) {
        if (Platform.OS === 'web') {
          window.alert('Error: Failed to fetch KYC submissions');
        } else {
          Alert.alert('Error', 'Failed to fetch KYC submissions');
        }
      }
    }
    setLoadingKycSubmissions(false);
  };

  // Approve KYC (move to pending)
  const handleApproveKyc = async (withdrawalId: string, userEmail: string) => {
    if (!token) {
      if (Platform.OS === 'web') {
        window.alert('Error: Not authenticated');
      } else {
        Alert.alert('Error', 'Not authenticated');
      }
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/admin/withdrawals/${withdrawalId}/approve-kyc`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (Platform.OS === 'web') {
          window.alert('Success: KYC approved! Withdrawal moved to pending for final approval.');
        } else {
          Alert.alert('Success', 'KYC approved! Withdrawal moved to pending for final approval.');
        }
        setShowKycSubmissionsModal(false);
        setSelectedKycDocument(null);
        fetchDashboardData();
        fetchKycSubmissions(false); // Refresh count
      } else {
        if (Platform.OS === 'web') {
          window.alert(`Error: ${data.detail || 'Failed to approve KYC'}`);
        } else {
          Alert.alert('Error', data.detail || 'Failed to approve KYC');
        }
      }
    } catch (error) {
      console.error('Approve KYC error:', error);
      if (Platform.OS === 'web') {
        window.alert('Error: Failed to approve KYC');
      } else {
        Alert.alert('Error', 'Failed to approve KYC');
      }
    }
  };

  // ============= PROMO CODE FUNCTIONS =============
  
  // Fetch Promo Codes
  const fetchPromoCodes = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_URL}/admin/promo-codes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPromoCodes(data.promo_codes || []);
      }
    } catch (error) {
      console.error('Fetch promo codes error:', error);
    }
  };

  // Create Promo Code
  const handleCreatePromoCode = async () => {
    if (!token) return;
    
    if (!newPromoCode.code || !newPromoCode.bonus_value) {
      if (Platform.OS === 'web') {
        window.alert('Error: Code and bonus value are required');
      } else {
        Alert.alert('Error', 'Code and bonus value are required');
      }
      return;
    }
    
    setPromoLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/promo-codes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: newPromoCode.code,
          bonus_type: newPromoCode.bonus_type,
          bonus_value: parseFloat(newPromoCode.bonus_value) || 0,
          min_deposit: parseFloat(newPromoCode.min_deposit) || 0,
          max_bonus: parseFloat(newPromoCode.max_bonus) || 0,
          usage_limit: parseInt(newPromoCode.usage_limit) || 0,
          expires_days: parseInt(newPromoCode.expires_days) || 0
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (Platform.OS === 'web') {
          window.alert(`Success: Promo code "${newPromoCode.code}" created!`);
        } else {
          Alert.alert('Success', `Promo code "${newPromoCode.code}" created!`);
        }
        setShowPromoModal(false);
        setNewPromoCode({
          code: '',
          bonus_type: 'percentage',
          bonus_value: '',
          min_deposit: '',
          max_bonus: '',
          usage_limit: '',
          expires_days: ''
        });
        fetchPromoCodes();
      } else {
        if (Platform.OS === 'web') {
          window.alert(`Error: ${data.detail || 'Failed to create promo code'}`);
        } else {
          Alert.alert('Error', data.detail || 'Failed to create promo code');
        }
      }
    } catch (error) {
      console.error('Create promo code error:', error);
      if (Platform.OS === 'web') {
        window.alert('Error: Failed to create promo code');
      } else {
        Alert.alert('Error', 'Failed to create promo code');
      }
    }
    setPromoLoading(false);
  };

  // Toggle Promo Code
  const handleTogglePromoCode = async (code: string) => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_URL}/admin/promo-codes/${code}/toggle`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        fetchPromoCodes();
      }
    } catch (error) {
      console.error('Toggle promo code error:', error);
    }
  };

  // Delete Promo Code
  const handleDeletePromoCode = async (code: string) => {
    if (!token) return;
    
    const confirmed = Platform.OS === 'web' 
      ? window.confirm(`Delete promo code "${code}"?`)
      : true; // For native, you'd use Alert.alert with buttons
    
    if (!confirmed) return;
    
    try {
      const response = await fetch(`${API_URL}/admin/promo-codes/${code}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        if (Platform.OS === 'web') {
          window.alert('Promo code deleted');
        } else {
          Alert.alert('Success', 'Promo code deleted');
        }
        fetchPromoCodes();
      }
    } catch (error) {
      console.error('Delete promo code error:', error);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  };

  // Loading Screen
  if (!authChecked || loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <View style={styles.textLogoLarge}>
          <Text style={styles.textLogoTextLarge}>BYNIX</Text>
        </View>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 24 }} />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  // Stat Card Component
  const StatCard = ({ icon, title, value, subtitle, gradient, trend }) => (
    <View style={styles.statCard}>
      <LinearGradient colors={gradient} style={styles.statCardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.statCardContent}>
          <View style={styles.statCardHeader}>
            <View style={styles.statIconWrap}>
              <Ionicons name={icon} size={22} color="#FFF" />
            </View>
            {trend && (
              <View style={[styles.trendBadge, trend > 0 ? styles.trendUp : styles.trendDown]}>
                <Ionicons name={trend > 0 ? 'arrow-up' : 'arrow-down'} size={12} color="#FFF" />
                <Text style={styles.trendText}>{Math.abs(trend)}%</Text>
              </View>
            )}
          </View>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
          {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
        </View>
      </LinearGradient>
    </View>
  );

  // Quick Action Button
  const QuickAction = ({ icon, label, color, onPress }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  // Overview Content
  const OverviewContent = () => (
    <ScrollView 
      style={styles.contentScroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome Header */}
      <View style={styles.welcomeSection}>
        <View>
          <Text style={styles.welcomeText}>Welcome back, Admin</Text>
          <Text style={styles.welcomeSubtext}>Here's what's happening with your platform today.</Text>
        </View>
        <TouchableOpacity style={styles.exportBtn}>
          <Ionicons name="download-outline" size={18} color={COLORS.primary} />
          <Text style={styles.exportBtnText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard
            icon="people"
            title="Total Users"
            value={formatNumber(stats.totalUsers)}
            subtitle={`${stats.activeUsers} active now`}
            gradient={COLORS.gradient1}
            trend={12}
          />
          <StatCard
            icon="wallet"
            title="Total Deposits"
            value={formatCurrency(stats.totalDeposits)}
            subtitle="This month"
            gradient={COLORS.gradient2}
            trend={8}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            icon="trending-up"
            title="Platform Profit"
            value={formatCurrency(stats.platformProfit)}
            subtitle="Net earnings"
            gradient={COLORS.gradient5}
            trend={23}
          />
          <StatCard
            icon="flash"
            title="Active Trades"
            value={formatNumber(stats.activeTrades)}
            subtitle="Real-time"
            gradient={COLORS.gradient3}
          />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <QuickAction icon="person-add" label="Add User" color={COLORS.primary} onPress={() => setActiveMenu('users')} />
          <QuickAction icon="shield-checkmark" label="Verify KYC" color={COLORS.success} onPress={() => setActiveMenu('kyc')} />
          <QuickAction icon="cash" label="Withdrawals" color={COLORS.warning} onPress={() => setActiveMenu('withdrawals')} />
          <QuickAction icon="hardware-chip" label="AI Control" color={COLORS.purple} onPress={() => setActiveMenu('ai-control')} />
        </View>
      </View>

      {/* Pending Actions */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pending Actions</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.pendingGrid}>
          <View style={styles.pendingItem}>
            <View style={[styles.pendingIcon, { backgroundColor: COLORS.warningLight }]}>
              <Ionicons name="time" size={20} color={COLORS.warning} />
            </View>
            <View style={styles.pendingInfo}>
              <Text style={styles.pendingValue}>{withdrawals.filter(w => w.status === 'pending').length}</Text>
              <Text style={styles.pendingLabel}>Pending Withdrawals</Text>
            </View>
          </View>
          <View style={styles.pendingItem}>
            <View style={[styles.pendingIcon, { backgroundColor: COLORS.infoLight }]}>
              <Ionicons name="document-text" size={20} color={COLORS.info} />
            </View>
            <View style={styles.pendingInfo}>
              <Text style={styles.pendingValue}>{stats.pendingKYC}</Text>
              <Text style={styles.pendingLabel}>KYC Requests</Text>
            </View>
          </View>
          <View style={styles.pendingItem}>
            <View style={[styles.pendingIcon, { backgroundColor: COLORS.successLight }]}>
              <Ionicons name="card" size={20} color={COLORS.success} />
            </View>
            <View style={styles.pendingInfo}>
              <Text style={styles.pendingValue}>0</Text>
              <Text style={styles.pendingLabel}>Pending Deposits</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Recent Trades */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Recent Trades</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setActiveMenu('live-trades')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {recentTrades.length > 0 ? (
          recentTrades.slice(0, 5).map((trade, index) => (
            <View key={trade.trade_id || index} style={styles.tradeRow}>
              <View style={[styles.tradeIcon, { backgroundColor: trade.direction === 'call' ? COLORS.successLight : COLORS.dangerLight }]}>
                <Ionicons 
                  name={trade.direction === 'call' ? 'arrow-up' : 'arrow-down'} 
                  size={16} 
                  color={trade.direction === 'call' ? COLORS.success : COLORS.danger} 
                />
              </View>
              <View style={styles.tradeInfo}>
                <Text style={styles.tradeAsset}>{trade.asset || 'BTCUSDT'}</Text>
                <Text style={styles.tradeUser}>{trade.user_email || 'User'}</Text>
              </View>
              <View style={styles.tradeAmount}>
                <Text style={styles.tradeAmountValue}>${trade.amount || 0}</Text>
                <Text style={[
                  styles.tradeResult,
                  { color: trade.result === 'win' ? COLORS.success : trade.result === 'loss' ? COLORS.danger : COLORS.textMuted }
                ]}>
                  {trade.result === 'win' ? '+' : trade.result === 'loss' ? '-' : ''}{trade.profit ? `$${Math.abs(trade.profit).toFixed(0)}` : 'Pending'}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No recent trades</Text>
        )}
      </View>

      {/* Recent Users */}
      <View style={[styles.sectionCard, { marginBottom: 40 }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Users</Text>
          <TouchableOpacity onPress={() => setActiveMenu('users')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {recentUsers.length > 0 ? (
          recentUsers.map((user, index) => (
            <View key={user.user_id || index} style={styles.userRow}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>{(user.name || user.email || 'U')[0].toUpperCase()}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name || 'Unnamed'}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
              <View style={styles.userBalance}>
                <Text style={styles.userBalanceValue}>${(user.real_balance || 0).toFixed(0)}</Text>
                <Text style={styles.userBalanceLabel}>Balance</Text>
              </View>
              <View style={[styles.userStatusDot, { backgroundColor: user.is_verified ? COLORS.success : COLORS.warning }]} />
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No users found</Text>
        )}
      </View>
    </ScrollView>
  );

  // User Management Content - Enhanced
  const UsersContent = () => {
    // Filter users based on search and filter
    const filteredUsers = allUsers.filter(user => {
      const matchesSearch = !userSearchQuery || 
        user.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        user.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        user.user_id?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        user.account_id?.toString().includes(userSearchQuery);
      
      const matchesFilter = userFilter === 'all' ||
        (userFilter === 'verified' && user.is_verified) ||
        (userFilter === 'unverified' && !user.is_verified) ||
        (userFilter === 'banned' && user.is_banned);
      
      return matchesSearch && matchesFilter;
    });

    const handleUserPress = (user) => {
      setSelectedUser(user);
      setEditBalance('');
      setBalanceOperation('add');
      setBalanceType('real');
      setShowUserModal(true);
    };

    const handleBalanceUpdate = async () => {
      if (!selectedUser || !editBalance) return;
      
      try {
        const amount = parseFloat(editBalance);
        const response = await fetch(`${API_URL}/admin/users/${selectedUser.user_id}/balance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            operation: balanceOperation,
            balance_type: balanceType,
            amount: amount
          })
        });
        
        if (response.ok) {
          fetchDashboardData();
          setShowUserModal(false);
          alert('Balance updated successfully!');
        } else {
          alert('Failed to update balance');
        }
      } catch (error) {
        console.error('Balance update error:', error);
        alert('Error updating balance');
      }
    };

    const handleBanUser = async (userId: string, shouldBan: boolean) => {
      try {
        const response = await fetch(`${API_URL}/admin/users/${userId}/ban`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            banned: shouldBan,
            reason: 'This account is suspended for violation of company rules'
          })
        });
        
        if (response.ok) {
          const successMsg = shouldBan ? 'User banned successfully' : 'User unbanned successfully';
          if (Platform.OS === 'web') {
            window.alert(successMsg);
          } else {
            Alert.alert('Success', successMsg);
          }
          fetchDashboardData();
          setShowUserModal(false);
        } else {
          const errorMsg = 'Failed to update user ban status';
          if (Platform.OS === 'web') {
            window.alert(errorMsg);
          } else {
            Alert.alert('Error', errorMsg);
          }
        }
      } catch (error) {
        console.error('Ban user error:', error);
        const errorMsg = 'Failed to update user ban status';
        if (Platform.OS === 'web') {
          window.alert(errorMsg);
        } else {
          Alert.alert('Error', errorMsg);
        }
      }
    };

    const handleDeleteUser = async (userId: string) => {
      try {
        const response = await fetch(`${API_URL}/admin/users/${userId}/delete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ reason: 'This account has been deleted by the owner' })
        });
        
        if (response.ok) {
          const successMsg = 'User deleted successfully';
          if (Platform.OS === 'web') {
            window.alert(successMsg);
          } else {
            Alert.alert('Success', successMsg);
          }
          fetchDashboardData();
          setShowUserModal(false);
        } else {
          const errorMsg = 'Failed to delete user';
          if (Platform.OS === 'web') {
            window.alert(errorMsg);
          } else {
            Alert.alert('Error', errorMsg);
          }
        }
      } catch (error) {
        console.error('Delete user error:', error);
        const errorMsg = 'Failed to delete user';
        if (Platform.OS === 'web') {
          window.alert(errorMsg);
        } else {
          Alert.alert('Error', errorMsg);
        }
      }
    };

    return (
      <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>User Management</Text>
          <Text style={styles.pageSubtitle}>Manage all platform users, KYC, and balances</Text>
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users by email, name, or ID..."
              placeholderTextColor={COLORS.textMuted}
              value={userSearchQuery}
              onChangeText={setUserSearchQuery}
            />
            {userSearchQuery ? (
              <TouchableOpacity onPress={() => setUserSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          {[
            { id: 'all', label: 'All Users', count: allUsers.length },
            { id: 'verified', label: 'Verified', count: allUsers.filter(u => u.is_verified).length },
            { id: 'unverified', label: 'Unverified', count: allUsers.filter(u => !u.is_verified).length },
            { id: 'banned', label: 'Banned', count: allUsers.filter(u => u.is_banned).length },
          ].map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.filterTab, userFilter === tab.id && styles.filterTabActive]}
              onPress={() => setUserFilter(tab.id)}
            >
              <Text style={[styles.filterTabText, userFilter === tab.id && styles.filterTabTextActive]}>
                {tab.label}
              </Text>
              <View style={[styles.filterTabBadge, userFilter === tab.id && styles.filterTabBadgeActive]}>
                <Text style={[styles.filterTabBadgeText, userFilter === tab.id && styles.filterTabBadgeTextActive]}>
                  {tab.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* User Stats */}
        <View style={styles.miniStatsRow}>
          <View style={styles.miniStat}>
            <Text style={styles.miniStatValue}>{stats.totalUsers}</Text>
            <Text style={styles.miniStatLabel}>Total</Text>
          </View>
          <View style={styles.miniStat}>
            <Text style={[styles.miniStatValue, { color: COLORS.success }]}>{stats.activeUsers}</Text>
            <Text style={styles.miniStatLabel}>Active</Text>
          </View>
          <View style={styles.miniStat}>
            <Text style={[styles.miniStatValue, { color: COLORS.warning }]}>{stats.pendingKYC}</Text>
            <Text style={styles.miniStatLabel}>Pending KYC</Text>
          </View>
          <View style={styles.miniStat}>
            <Text style={[styles.miniStatValue, { color: COLORS.danger }]}>
              {allUsers.filter(u => u.is_banned).length}
            </Text>
            <Text style={styles.miniStatLabel}>Banned</Text>
          </View>
        </View>

        {/* Users List */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Users ({filteredUsers.length})</Text>
          </View>
          
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user, index) => (
              <TouchableOpacity 
                key={user.user_id || index} 
                style={styles.userCard}
                onPress={() => handleUserPress(user)}
              >
                <View style={styles.userCardLeft}>
                  <View style={[styles.userAvatar, { backgroundColor: user.is_banned ? COLORS.danger : COLORS.primary }]}>
                    <Text style={styles.userAvatarText}>{(user.name || user.email || 'U')[0].toUpperCase()}</Text>
                  </View>
                  <View style={styles.userCardInfo}>
                    <Text style={styles.userCardName}>{user.name || 'Unnamed User'}</Text>
                    <Text style={styles.userCardEmail}>{user.email}</Text>
                    <View style={styles.userCardTags}>
                      <View style={[styles.userTag, { backgroundColor: user.is_verified ? COLORS.successLight : COLORS.warningLight }]}>
                        <Text style={[styles.userTagText, { color: user.is_verified ? COLORS.success : COLORS.warning }]}>
                          {user.is_verified ? 'Verified' : 'Unverified'}
                        </Text>
                      </View>
                      {user.is_banned && (
                        <View style={[styles.userTag, { backgroundColor: COLORS.dangerLight, marginLeft: 6 }]}>
                          <Text style={[styles.userTagText, { color: COLORS.danger }]}>Banned</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                <View style={styles.userCardRight}>
                  <Text style={styles.userCardBalance}>${(user.real_balance || 0).toFixed(2)}</Text>
                  <Text style={styles.userCardBalanceLabel}>Real Balance</Text>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} style={{ marginTop: 8 }} />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyStateText}>No users found</Text>
            </View>
          )}
        </View>

        {/* User Detail Modal */}
        <Modal visible={showUserModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.userModalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <View style={[styles.modalAvatar, { backgroundColor: selectedUser?.is_banned ? COLORS.danger : COLORS.primary }]}>
                    <Text style={styles.modalAvatarText}>
                      {(selectedUser?.name || selectedUser?.email || 'U')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.modalUserName}>{selectedUser?.name || 'Unnamed User'}</Text>
                    <Text style={styles.modalUserEmail}>{selectedUser?.email}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setShowUserModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Balance Cards */}
                <View style={styles.balanceCardsRow}>
                  <View style={[styles.balanceCardModal, { backgroundColor: COLORS.successLight }]}>
                    <Text style={styles.balanceCardLabel}>Real Balance</Text>
                    <Text style={[styles.balanceCardValue, { color: COLORS.success }]}>
                      ${(selectedUser?.real_balance || 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={[styles.balanceCardModal, { backgroundColor: COLORS.primaryLight }]}>
                    <Text style={styles.balanceCardLabel}>Demo Balance</Text>
                    <Text style={[styles.balanceCardValue, { color: COLORS.primary }]}>
                      ${(selectedUser?.demo_balance || 0).toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* User Info */}
                <View style={styles.userInfoSection}>
                  <Text style={styles.sectionTitleSmall}>User Information</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Account ID</Text>
                    <Text style={styles.infoValue}>{selectedUser?.account_id || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>User ID</Text>
                    <Text style={[styles.infoValue, { fontSize: 11 }]}>{selectedUser?.user_id}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status</Text>
                    <View style={[styles.statusBadgeSmall, { backgroundColor: selectedUser?.is_banned ? COLORS.dangerLight : selectedUser?.is_verified ? COLORS.successLight : COLORS.warningLight }]}>
                      <Text style={[styles.statusBadgeText, { color: selectedUser?.is_banned ? COLORS.danger : selectedUser?.is_verified ? COLORS.success : COLORS.warning }]}>
                        {selectedUser?.is_banned ? 'Banned' : selectedUser?.is_verified ? 'Verified' : 'Unverified'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>KYC Status</Text>
                    <Text style={[styles.infoValue, { 
                      color: selectedUser?.kyc_status === 'verified' ? '#00C853' : 
                             selectedUser?.kyc_status === 'pending' ? '#FF9800' :
                             selectedUser?.kyc_status === 'rejected' ? '#F44336' : '#666'
                    }]}>
                      {selectedUser?.kyc_status === 'verified' ? 'Verified ✓' :
                       selectedUser?.kyc_status === 'pending' ? 'Pending' :
                       selectedUser?.kyc_status === 'rejected' ? 'Rejected' :
                       selectedUser?.kyc_verified ? 'Verified ✓' : 'Not Submitted'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Joined</Text>
                    <Text style={styles.infoValue}>
                      {selectedUser?.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : 'N/A'}
                    </Text>
                  </View>
                </View>

                {/* Balance Adjustment */}
                <View style={styles.adjustBalanceSection}>
                  <Text style={styles.sectionTitleSmall}>Adjust Balance</Text>
                  
                  {/* Balance Type Selection */}
                  <View style={styles.optionRow}>
                    {['real', 'demo', 'bonus'].map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[styles.optionBtn, balanceType === type && styles.optionBtnActive]}
                        onPress={() => setBalanceType(type)}
                      >
                        <Text style={[styles.optionBtnText, balanceType === type && styles.optionBtnTextActive]}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Operation Selection */}
                  <View style={styles.optionRow}>
                    {[
                      { id: 'add', label: 'Add', icon: 'add-circle' },
                      { id: 'subtract', label: 'Subtract', icon: 'remove-circle' },
                      { id: 'set', label: 'Set', icon: 'create' }
                    ].map(op => (
                      <TouchableOpacity
                        key={op.id}
                        style={[styles.operationBtn, balanceOperation === op.id && styles.operationBtnActive]}
                        onPress={() => setBalanceOperation(op.id)}
                      >
                        <Ionicons 
                          name={op.icon} 
                          size={18} 
                          color={balanceOperation === op.id ? '#FFF' : COLORS.textSecondary} 
                        />
                        <Text style={[styles.operationBtnText, balanceOperation === op.id && styles.operationBtnTextActive]}>
                          {op.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Amount Input */}
                  <View style={styles.amountInputRow}>
                    <View style={styles.amountInputWrapper}>
                      <Text style={styles.currencyPrefix}>$</Text>
                      <TextInput
                        style={styles.amountInput}
                        placeholder="0.00"
                        placeholderTextColor={COLORS.textMuted}
                        value={editBalance}
                        onChangeText={setEditBalance}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <TouchableOpacity 
                      style={[styles.applyBtn, !editBalance && styles.applyBtnDisabled]}
                      onPress={handleBalanceUpdate}
                      disabled={!editBalance}
                    >
                      <Text style={styles.applyBtnText}>Apply</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtonsSection}>
                  <Text style={styles.sectionTitleSmall}>Actions</Text>
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: COLORS.warningLight }]}
                      onPress={() => {
                        const status = selectedUser?.kyc_status === 'approved' ? 
                          'KYC Verified ✓' : 
                          selectedUser?.kyc_status === 'pending' ? 
                          'KYC Pending Review' : 
                          'No KYC Submitted';
                        if (Platform.OS === 'web') {
                          window.alert(`KYC Status: ${status}`);
                        } else {
                          Alert.alert('KYC Status', status);
                        }
                      }}
                    >
                      <Ionicons name="document-text" size={20} color={COLORS.warning} />
                      <Text style={[styles.actionBtnText, { color: COLORS.warning }]}>View KYC</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: COLORS.infoLight }]}
                      onPress={async () => {
                        try {
                          const response = await fetch(`${API_URL}/admin/users/${selectedUser?.user_id}/trades?limit=20`, {
                            headers: headers
                          });
                          if (response.ok) {
                            const data = await response.json();
                            const trades = data.trades || [];
                            const summary = trades.length > 0 
                              ? `Last ${trades.length} trades:\n${trades.slice(0, 5).map((t: any) => 
                                  `${t.asset} - ${t.trade_type.toUpperCase()} - $${t.amount} - ${t.status}`
                                ).join('\n')}`
                              : 'No trade history';
                            if (Platform.OS === 'web') {
                              window.alert(summary);
                            } else {
                              Alert.alert('Trade History', summary);
                            }
                          } else {
                            if (Platform.OS === 'web') {
                              window.alert('Failed to fetch trade history');
                            } else {
                              Alert.alert('Error', 'Failed to fetch trade history');
                            }
                          }
                        } catch (error) {
                          if (Platform.OS === 'web') {
                            window.alert('Failed to fetch trade history');
                          } else {
                            Alert.alert('Error', 'Failed to fetch trade history');
                          }
                        }
                      }}
                    >
                      <Ionicons name="time" size={20} color={COLORS.info} />
                      <Text style={[styles.actionBtnText, { color: COLORS.info }]}>Trade History</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: selectedUser?.is_banned ? COLORS.successLight : COLORS.dangerLight }]}
                      onPress={async () => {
                        const shouldBan = !selectedUser?.is_banned;
                        const action = shouldBan ? 'ban' : 'unban';
                        const message = shouldBan ? 
                          'This will suspend the user. They will see: "This account is suspended for violation of company rules"' :
                          'Are you sure you want to unban this user?';
                        
                        if (Platform.OS === 'web') {
                          if (window.confirm(message)) {
                            await handleBanUser(selectedUser?.user_id, shouldBan);
                          }
                        } else {
                          Alert.alert(
                            shouldBan ? 'Ban User' : 'Unban User',
                            message,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: action.charAt(0).toUpperCase() + action.slice(1), style: 'destructive', onPress: () => handleBanUser(selectedUser?.user_id, shouldBan) }
                            ]
                          );
                        }
                      }}
                    >
                      <Ionicons 
                        name={selectedUser?.is_banned ? 'checkmark-circle' : 'ban'} 
                        size={20} 
                        color={selectedUser?.is_banned ? COLORS.success : COLORS.danger} 
                      />
                      <Text style={[styles.actionBtnText, { color: selectedUser?.is_banned ? COLORS.success : COLORS.danger }]}>
                        {selectedUser?.is_banned ? 'Unban User' : 'Ban User'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: COLORS.purpleLight }]}
                      onPress={() => {
                        const msg = `Email feature coming soon.\n\nUser email: ${selectedUser?.email}`;
                        if (Platform.OS === 'web') {
                          window.alert(msg);
                        } else {
                          Alert.alert('Send Email', msg);
                        }
                      }}
                    >
                      <Ionicons name="mail" size={20} color={COLORS.purple} />
                      <Text style={[styles.actionBtnText, { color: COLORS.purple }]}>Send Email</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {/* Delete User Button */}
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: '#2a0000', marginTop: 12, width: '100%' }]}
                    onPress={async () => {
                      const message = 'Are you sure you want to delete this user? They will see: "This account has been deleted by the owner" when trying to login.';
                      
                      if (Platform.OS === 'web') {
                        if (window.confirm(message)) {
                          await handleDeleteUser(selectedUser?.user_id);
                        }
                      } else {
                        Alert.alert(
                          '⚠️ Delete User',
                          message,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => handleDeleteUser(selectedUser?.user_id) }
                          ]
                        );
                      }
                    }}
                  >
                    <Ionicons name="trash" size={20} color="#ff4444" />
                    <Text style={[styles.actionBtnText, { color: '#ff4444' }]}>Delete User</Text>
                  </TouchableOpacity>
                  
                  {/* Unban User Button - Only shows when user is banned */}
                  {selectedUser?.is_banned && (
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: COLORS.successLight, marginTop: 12, width: '100%' }]}
                      onPress={async () => {
                        const message = 'Are you sure you want to unban this user? They will be able to login again.';
                        
                        if (Platform.OS === 'web') {
                          if (window.confirm(message)) {
                            await handleBanUser(selectedUser?.user_id, false);
                          }
                        } else {
                          Alert.alert(
                            '✅ Unban User',
                            message,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Unban', onPress: () => handleBanUser(selectedUser?.user_id, false) }
                            ]
                          );
                        }
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                      <Text style={[styles.actionBtnText, { color: COLORS.success }]}>Unban User</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  };

  // Withdrawals Content
  const WithdrawalsContent = () => (
    <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Withdrawal Requests</Text>
        <Text style={styles.pageSubtitle}>Manage pending withdrawal requests</Text>
      </View>

      {/* Withdrawal Stats */}
      <View style={styles.miniStatsRow}>
        <View style={styles.miniStat}>
          <Text style={[styles.miniStatValue, { color: COLORS.warning }]}>{withdrawals.filter(w => w.status === 'pending').length}</Text>
          <Text style={styles.miniStatLabel}>Pending</Text>
        </View>
        <View style={styles.miniStat}>
          <Text style={[styles.miniStatValue, { color: COLORS.purple }]}>{withdrawals.filter(w => w.status === 'locked').length}</Text>
          <Text style={styles.miniStatLabel}>Locked</Text>
        </View>
        <View style={styles.miniStat}>
          <Text style={[styles.miniStatValue, { color: COLORS.success }]}>{withdrawals.filter(w => w.status === 'completed').length}</Text>
          <Text style={styles.miniStatLabel}>Approved</Text>
        </View>
        <View style={styles.miniStat}>
          <Text style={[styles.miniStatValue, { color: COLORS.danger }]}>{withdrawals.filter(w => w.status === 'rejected').length}</Text>
          <Text style={styles.miniStatLabel}>Rejected</Text>
        </View>
      </View>

      {/* KYC Submitted Button */}
      <TouchableOpacity 
        style={styles.kycSubmittedBtn}
        onPress={fetchKycSubmissions}
        disabled={loadingKycSubmissions}
      >
        <View style={styles.kycSubmittedBtnLeft}>
          <View style={[styles.kycSubmittedIcon, { backgroundColor: 'rgba(0, 229, 90, 0.15)' }]}>
            <Ionicons name="document-text" size={22} color={COLORS.success} />
          </View>
          <View>
            <Text style={styles.kycSubmittedBtnTitle}>KYC Documents Submitted</Text>
            <Text style={styles.kycSubmittedBtnSubtitle}>Click to review submitted documents</Text>
          </View>
        </View>
        <View style={styles.kycSubmittedBtnRight}>
          {loadingKycSubmissions ? (
            <ActivityIndicator size="small" color={COLORS.success} />
          ) : (
            <>
              <Text style={styles.kycSubmittedCount}>{kycSubmissionsCount}</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
            </>
          )}
        </View>
      </TouchableOpacity>

      {/* Pending Withdrawals List */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Pending Requests</Text>
        
        {withdrawals.filter(w => w.status === 'pending').length > 0 ? (
          withdrawals.filter(w => w.status === 'pending').map((wd, index) => (
            <View key={wd.withdrawal_id || index} style={styles.withdrawalCard}>
              <TouchableOpacity 
                style={styles.withdrawalLeft}
                onPress={() => fetchWithdrawalUserStats(wd.user_id, wd)}
              >
                <View style={[styles.withdrawalIcon, { backgroundColor: COLORS.warningLight }]}>
                  <Ionicons name="person" size={20} color={COLORS.warning} />
                </View>
                <View style={styles.withdrawalInfo}>
                  <Text style={[styles.withdrawalEmail, { color: COLORS.primary }]}>{wd.user_email || 'User'}</Text>
                  <Text style={styles.withdrawalAddress} numberOfLines={1}>
                    {wd.wallet_address ? `${wd.wallet_address.slice(0, 12)}...${wd.wallet_address.slice(-8)}` : 'No address'}
                  </Text>
                  <Text style={styles.withdrawalDate}>{wd.created_at?.split(' ')[0] || 'N/A'}</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.withdrawalRight}>
                <Text style={styles.withdrawalAmount}>${wd.amount?.toFixed(2) || 0}</Text>
                <View style={styles.withdrawalActions}>
                  <TouchableOpacity 
                    style={[styles.wdActionBtn, styles.wdApproveBtn]}
                    onPress={() => handleApproveWithdrawal(wd.withdrawal_id, wd.user_email || 'User', wd.amount || 0)}
                  >
                    <Ionicons name="checkmark" size={18} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.wdActionBtn, styles.wdRejectBtn]}
                    onPress={() => handleRejectWithdrawal(wd.withdrawal_id, wd.user_email || 'User', wd.amount || 0)}
                  >
                    <Ionicons name="close" size={18} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
            <Text style={styles.emptyStateText}>No pending withdrawals</Text>
          </View>
        )}
      </View>

      {/* Locked Withdrawals List */}
      {withdrawals.filter(w => w.status === 'locked').length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Locked (Awaiting KYC)</Text>
          
          {withdrawals.filter(w => w.status === 'locked').map((wd, index) => (
            <View key={wd.withdrawal_id || index} style={styles.withdrawalCard}>
              <TouchableOpacity 
                style={styles.withdrawalLeft}
                onPress={() => fetchWithdrawalUserStats(wd.user_id, wd)}
              >
                <View style={[styles.withdrawalIcon, { backgroundColor: wd.kyc_submitted ? COLORS.successLight : COLORS.purpleLight }]}>
                  <Ionicons name={wd.kyc_submitted ? "document-text" : "lock-closed"} size={20} color={wd.kyc_submitted ? COLORS.success : COLORS.purple} />
                </View>
                <View style={styles.withdrawalInfo}>
                  <Text style={[styles.withdrawalEmail, { color: COLORS.primary }]}>{wd.user_email || 'User'}</Text>
                  <Text style={[styles.withdrawalAddress, { color: wd.kyc_submitted ? COLORS.success : COLORS.purple }]} numberOfLines={1}>
                    {wd.kyc_submitted ? '✓ Document Submitted' : `KYC Required: ${wd.kyc_requirement || 'Bank Statement'}`}
                  </Text>
                  <Text style={styles.withdrawalDate}>{wd.created_at?.split(' ')[0] || 'N/A'}</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.withdrawalRight}>
                <Text style={styles.withdrawalAmount}>${wd.amount?.toFixed(2) || 0}</Text>
                <View style={styles.withdrawalActions}>
                  {/* Unlock Button */}
                  <TouchableOpacity 
                    style={[styles.wdActionBtn, { backgroundColor: COLORS.info }]}
                    onPress={() => handleUnlockWithdrawal(wd.withdrawal_id)}
                  >
                    <Ionicons name="lock-open" size={18} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.wdActionBtn, styles.wdApproveBtn]}
                    onPress={() => handleApproveWithdrawal(wd.withdrawal_id, wd.user_email || 'User', wd.amount || 0)}
                  >
                    <Ionicons name="checkmark" size={18} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.wdActionBtn, styles.wdRejectBtn]}
                    onPress={() => handleRejectWithdrawal(wd.withdrawal_id, wd.user_email || 'User', wd.amount || 0)}
                  >
                    <Ionicons name="close" size={18} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Withdrawal User Stats Modal */}
      <Modal
        visible={showWithdrawalUserModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWithdrawalUserModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowWithdrawalUserModal(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            style={[styles.modalContent, { maxHeight: '85%' }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Profile</Text>
              <TouchableOpacity 
                onPress={() => setShowWithdrawalUserModal(false)}
                style={{ padding: 8, marginRight: -8 }}
              >
                <Ionicons name="close-circle" size={28} color={COLORS.danger} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* User Info */}
              <View style={styles.userProfileHeader}>
                <View style={[styles.userAvatar, { width: 60, height: 60, borderRadius: 30 }]}>
                  <Text style={[styles.userAvatarText, { fontSize: 24 }]}>
                    {(withdrawalUserStats.name || withdrawalUserStats.email || 'U')[0].toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.userProfileName}>{withdrawalUserStats.name || 'User'}</Text>
                <Text style={styles.userProfileEmail}>{withdrawalUserStats.email}</Text>
                <View style={[styles.kycBadge, { backgroundColor: withdrawalUserStats.kyc_verified ? COLORS.successLight : COLORS.warningLight }]}>
                  <Ionicons 
                    name={withdrawalUserStats.kyc_verified ? "shield-checkmark" : "shield"} 
                    size={14} 
                    color={withdrawalUserStats.kyc_verified ? COLORS.success : COLORS.warning} 
                  />
                  <Text style={[styles.kycBadgeText, { color: withdrawalUserStats.kyc_verified ? COLORS.success : COLORS.warning }]}>
                    {withdrawalUserStats.kyc_verified ? 'KYC Verified' : 'KYC Pending'}
                  </Text>
                </View>
              </View>

              {/* Withdrawal Info */}
              {selectedWithdrawal && (
                <View style={styles.wdInfoCard}>
                  <Text style={styles.wdInfoTitle}>Withdrawal Request</Text>
                  <View style={styles.wdInfoRow}>
                    <Text style={styles.wdInfoLabel}>Amount:</Text>
                    <Text style={[styles.wdInfoValue, { color: COLORS.danger }]}>${selectedWithdrawal.amount?.toFixed(2)}</Text>
                  </View>
                  <View style={styles.wdInfoRow}>
                    <Text style={styles.wdInfoLabel}>Wallet:</Text>
                    <TouchableOpacity 
                      style={{ flex: 1 }}
                      onPress={() => {
                        if (selectedWithdrawal.wallet_address) {
                          Alert.alert('Wallet Address Copied', selectedWithdrawal.wallet_address);
                        }
                      }}
                    >
                      <Text style={[styles.wdInfoValue, { color: COLORS.primary }]} numberOfLines={1}>
                        {selectedWithdrawal.wallet_address || 'N/A'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.wdInfoRow}>
                    <Text style={styles.wdInfoLabel}>Status:</Text>
                    <View style={[styles.statusBadge, { 
                      backgroundColor: selectedWithdrawal.status === 'pending' ? COLORS.warningLight : 
                        selectedWithdrawal.status === 'locked' ? COLORS.purpleLight : COLORS.successLight 
                    }]}>
                      <Text style={[styles.statusBadgeText, { 
                        color: selectedWithdrawal.status === 'pending' ? COLORS.warning : 
                          selectedWithdrawal.status === 'locked' ? COLORS.purple : COLORS.success 
                      }]}>
                        {selectedWithdrawal.status?.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* User Stats Grid */}
              <View style={styles.userStatsGrid}>
                <View style={styles.userStatCard}>
                  <Ionicons name="arrow-down-circle" size={24} color={COLORS.success} />
                  <Text style={styles.userStatValue}>${withdrawalUserStats.total_deposit?.toFixed(2) || '0.00'}</Text>
                  <Text style={styles.userStatLabel}>Total Deposit</Text>
                </View>
                <View style={styles.userStatCard}>
                  <Ionicons name="arrow-up-circle" size={24} color={COLORS.danger} />
                  <Text style={styles.userStatValue}>${withdrawalUserStats.total_withdraw?.toFixed(2) || '0.00'}</Text>
                  <Text style={styles.userStatLabel}>Total Withdraw</Text>
                </View>
                <View style={styles.userStatCard}>
                  <Ionicons name="trending-up" size={24} color={COLORS.primary} />
                  <Text style={[styles.userStatValue, { color: withdrawalUserStats.total_profit >= 0 ? COLORS.success : COLORS.danger }]}>
                    ${withdrawalUserStats.total_profit?.toFixed(2) || '0.00'}
                  </Text>
                  <Text style={styles.userStatLabel}>Total Profit</Text>
                </View>
                <View style={styles.userStatCard}>
                  <Ionicons name="analytics" size={24} color={COLORS.purple} />
                  <Text style={styles.userStatValue}>{withdrawalUserStats.profit_rate?.toFixed(1) || '0'}%</Text>
                  <Text style={styles.userStatLabel}>Win Rate</Text>
                </View>
                <View style={styles.userStatCard}>
                  <Ionicons name="wallet" size={24} color={COLORS.info} />
                  <Text style={styles.userStatValue}>${withdrawalUserStats.total_balance?.toFixed(2) || '0.00'}</Text>
                  <Text style={styles.userStatLabel}>Current Balance</Text>
                </View>
                <View style={styles.userStatCard}>
                  <Ionicons name="swap-horizontal" size={24} color={COLORS.textSecondary} />
                  <Text style={styles.userStatValue}>{withdrawalUserStats.total_trades || 0}</Text>
                  <Text style={styles.userStatLabel}>Total Trades</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.wdActionButtons}>
                <TouchableOpacity 
                  style={[styles.wdMainActionBtn, { backgroundColor: COLORS.success }]}
                  onPress={() => {
                    setShowWithdrawalUserModal(false);
                    handleApproveWithdrawal(selectedWithdrawal?.withdrawal_id, selectedWithdrawal?.user_email, selectedWithdrawal?.amount);
                  }}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                  <Text style={styles.wdMainActionBtnText}>Approve</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.wdMainActionBtn, { backgroundColor: COLORS.danger }]}
                  onPress={() => {
                    setShowWithdrawalUserModal(false);
                    handleRejectWithdrawal(selectedWithdrawal?.withdrawal_id, selectedWithdrawal?.user_email, selectedWithdrawal?.amount);
                  }}
                >
                  <Ionicons name="close-circle" size={20} color="#FFF" />
                  <Text style={styles.wdMainActionBtnText}>Reject</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.wdMainActionBtn, { backgroundColor: COLORS.purple }]}
                  onPress={() => setShowKycModal(true)}
                >
                  <Ionicons name="lock-closed" size={20} color="#FFF" />
                  <Text style={styles.wdMainActionBtnText}>Lock (KYC)</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* KYC Requirement Selection Modal */}
      <Modal
        visible={showKycModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowKycModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowKycModal(false)}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={[styles.modalContent, { maxWidth: 380, padding: 20 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select KYC Requirement</Text>
              <TouchableOpacity 
                onPress={() => setShowKycModal(false)}
                style={{ padding: 8, marginRight: -8 }}
              >
                <Ionicons name="close-circle" size={28} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.kycModalDesc}>
              User will be required to submit additional verification document to unlock this withdrawal.
            </Text>

            <View style={styles.kycOptions}>
              {[
                { id: 'Bank Statement', icon: 'document-text', desc: 'Last 3 months bank statement' },
                { id: 'ID Card', icon: 'card', desc: 'Government issued ID' },
                { id: 'Selfie with ID', icon: 'camera', desc: 'Photo holding ID card' },
                { id: 'Proof of Address', icon: 'home', desc: 'Utility bill or bank letter' },
                { id: 'Source of Funds', icon: 'cash', desc: 'Document showing income source' },
              ].map((option) => (
                <TouchableOpacity 
                  key={option.id}
                  style={styles.kycOptionCard}
                  onPress={() => {
                    handleLockWithdrawal(selectedWithdrawal?.withdrawal_id, option.id);
                  }}
                >
                  <View style={[styles.kycOptionIcon, { backgroundColor: COLORS.purpleLight }]}>
                    <Ionicons name={option.icon as any} size={24} color={COLORS.purple} />
                  </View>
                  <View style={styles.kycOptionInfo}>
                    <Text style={styles.kycOptionTitle}>{option.id}</Text>
                    <Text style={styles.kycOptionDesc}>{option.desc}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Cancel Button */}
            <TouchableOpacity 
              style={styles.kycCancelBtn}
              onPress={() => setShowKycModal(false)}
            >
              <Text style={styles.kycCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* KYC Submissions Modal */}
      <Modal
        visible={showKycSubmissionsModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowKycSubmissionsModal(false);
          setSelectedKycDocument(null);
        }}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowKycSubmissionsModal(false);
            setSelectedKycDocument(null);
          }}
        >
          <TouchableOpacity 
            activeOpacity={1}
            style={[styles.modalContent, { maxHeight: '90%', maxWidth: 600 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>KYC Documents Submitted</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowKycSubmissionsModal(false);
                  setSelectedKycDocument(null);
                }}
                style={{ padding: 8, marginRight: -8 }}
              >
                <Ionicons name="close-circle" size={28} color={COLORS.danger} />
              </TouchableOpacity>
            </View>

            {selectedKycDocument ? (
              /* Document Preview */
              <ScrollView showsVerticalScrollIndicator={false}>
                <TouchableOpacity 
                  style={styles.kycBackBtn}
                  onPress={() => setSelectedKycDocument(null)}
                >
                  <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
                  <Text style={styles.kycBackBtnText}>Back to list</Text>
                </TouchableOpacity>
                
                <View style={styles.kycDocPreviewHeader}>
                  <Text style={styles.kycDocPreviewTitle}>{selectedKycDocument.user_email}</Text>
                  <Text style={styles.kycDocPreviewSubtitle}>
                    {selectedKycDocument.kyc_requirement} • ${selectedKycDocument.amount?.toFixed(2)}
                  </Text>
                </View>
                
                {/* User Verified Profile Info */}
                <View style={styles.kycVerifiedInfoCard}>
                  <View style={styles.kycVerifiedInfoHeader}>
                    <Ionicons name="shield-checkmark" size={20} color={selectedKycDocument.kyc_verified ? COLORS.success : COLORS.warning} />
                    <Text style={styles.kycVerifiedInfoTitle}>
                      {selectedKycDocument.kyc_verified ? 'Verified Profile' : 'Profile Info'}
                    </Text>
                  </View>
                  <View style={styles.kycVerifiedInfoRow}>
                    <Text style={styles.kycVerifiedInfoLabel}>Name:</Text>
                    <Text style={styles.kycVerifiedInfoValue}>
                      {selectedKycDocument.verified_name || selectedKycDocument.user_name || 'Not provided'}
                    </Text>
                  </View>
                  <View style={styles.kycVerifiedInfoRow}>
                    <Text style={styles.kycVerifiedInfoLabel}>ID Number:</Text>
                    <Text style={styles.kycVerifiedInfoValue}>
                      {selectedKycDocument.verified_id || 'Not provided'}
                    </Text>
                  </View>
                  <View style={styles.kycVerifiedInfoRow}>
                    <Text style={styles.kycVerifiedInfoLabel}>Wallet:</Text>
                    <Text style={[styles.kycVerifiedInfoValue, { fontSize: 11 }]} numberOfLines={1}>
                      {selectedKycDocument.wallet_address || 'Not provided'}
                    </Text>
                  </View>
                </View>
                
                {selectedKycDocument.kyc_document_url && (
                  <View style={styles.kycDocImageContainer}>
                    <Text style={styles.kycDocImageLabel}>Submitted Document:</Text>
                    <Image 
                      source={{ uri: selectedKycDocument.kyc_document_url }}
                      style={styles.kycDocImage}
                      resizeMode="contain"
                    />
                  </View>
                )}
                
                <View style={styles.kycDocActions}>
                  <TouchableOpacity 
                    style={[styles.kycDocActionBtn, { backgroundColor: COLORS.success }]}
                    onPress={() => {
                      handleApproveKyc(
                        selectedKycDocument.transaction_id, 
                        selectedKycDocument.user_email
                      );
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    <Text style={styles.kycDocActionBtnText}>Approve KYC</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.kycDocActionBtn, { backgroundColor: COLORS.danger }]}
                    onPress={() => {
                      handleRejectWithdrawal(
                        selectedKycDocument.transaction_id, 
                        selectedKycDocument.user_email, 
                        selectedKycDocument.amount
                      );
                      setShowKycSubmissionsModal(false);
                      setSelectedKycDocument(null);
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color="#FFF" />
                    <Text style={styles.kycDocActionBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              /* Submissions List */
              <ScrollView showsVerticalScrollIndicator={false}>
                {kycSubmissions.length > 0 ? (
                  kycSubmissions.map((sub, index) => (
                    <TouchableOpacity 
                      key={sub.transaction_id || index}
                      style={styles.kycSubmissionCard}
                      onPress={() => setSelectedKycDocument(sub)}
                    >
                      <View style={[styles.kycSubmissionIcon, { backgroundColor: COLORS.successLight }]}>
                        <Ionicons name="document-text" size={24} color={COLORS.success} />
                      </View>
                      <View style={styles.kycSubmissionInfo}>
                        <Text style={styles.kycSubmissionEmail}>{sub.user_email}</Text>
                        <Text style={styles.kycSubmissionDetails}>
                          {sub.kyc_requirement} • ${sub.amount?.toFixed(2)}
                        </Text>
                        <Text style={styles.kycSubmissionDate}>
                          Submitted: {sub.kyc_submitted_at?.split('T')[0] || 'N/A'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="document-outline" size={48} color={COLORS.textMuted} />
                    <Text style={styles.emptyStateText}>No KYC documents submitted yet</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );

  // AI Control Content - FULLY FUNCTIONAL
  const AIControlContent = () => {
    const [aiEnabled, setAiEnabled] = useState(godModeStatus?.ai_enabled !== false);
    const [selectedStrategy, setSelectedStrategy] = useState(godModeStatus?.ai_strategy || 'balanced');
    const [winRate, setWinRate] = useState(godModeStatus?.ai_win_rate || 45);
    const [demoWinRateLocal, setDemoWinRateLocal] = useState(godModeStatus?.demo_win_rate || 65);
    const [marketTrend, setMarketTrend] = useState(godModeStatus?.ai_market_trend || 'sideways');
    const [updating, setUpdating] = useState(false);
    
    // Auth headers using token from parent scope
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    // Update local state when godModeStatus changes
    useEffect(() => {
      if (godModeStatus) {
        setAiEnabled(godModeStatus.ai_enabled !== false);
        setSelectedStrategy(godModeStatus.ai_strategy || 'balanced');
        setWinRate(godModeStatus.ai_win_rate || 45);
        setDemoWinRateLocal(godModeStatus.demo_win_rate || 65);
        setMarketTrend(godModeStatus.ai_market_trend || 'sideways');
      }
    }, [godModeStatus]);

    const handleToggleAI = async (enabled: boolean) => {
      try {
        setUpdating(true);
        const response = await fetch(`${API_URL}/admin/ai/toggle`, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({ enabled })
        });
        if (response.ok) {
          setAiEnabled(enabled);
          Alert.alert('Success', `AI System ${enabled ? 'activated' : 'deactivated'}`);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to toggle AI system');
      } finally {
        setUpdating(false);
      }
    };

    const handleSetStrategy = async (strategy: string) => {
      try {
        setUpdating(true);
        const response = await fetch(`${API_URL}/admin/ai/strategy`, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({ strategy })
        });
        if (response.ok) {
          const data = await response.json();
          setSelectedStrategy(strategy);
          setWinRate(data.ai_win_rate);
          Alert.alert('Success', `Strategy set to ${strategy.charAt(0).toUpperCase() + strategy.slice(1)}`);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to set strategy');
      } finally {
        setUpdating(false);
      }
    };

    const handleSetWinRate = async (rate: number) => {
      try {
        setUpdating(true);
        const response = await fetch(`${API_URL}/admin/ai/win-rate`, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({ win_rate: rate })
        });
        if (response.ok) {
          setWinRate(rate);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to set win rate');
      } finally {
        setUpdating(false);
      }
    };

    const handleSetDemoWinRate = async (rate: number) => {
      try {
        setUpdating(true);
        const response = await fetch(`${API_URL}/admin/ai/demo-win-rate`, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({ win_rate: rate })
        });
        if (response.ok) {
          setDemoWinRateLocal(rate);
          setDemoWinRate(rate);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to set demo win rate');
      } finally {
        setUpdating(false);
      }
    };

    const handleSetDemoStrategy = async (strategy: string, rate: number) => {
      try {
        setUpdating(true);
        const response = await fetch(`${API_URL}/admin/ai/demo-strategy`, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({ strategy })
        });
        if (response.ok) {
          const data = await response.json();
          setDemoWinRateLocal(data.demo_win_rate);
          setDemoWinRate(data.demo_win_rate);
          Alert.alert('✅ Demo Strategy Updated', `Set to ${strategy.charAt(0).toUpperCase() + strategy.slice(1)} (${data.demo_win_rate}% win rate)`);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to set demo strategy');
      } finally {
        setUpdating(false);
      }
    };

    const handleSetMarketTrend = async (trend: string) => {
      try {
        setUpdating(true);
        const response = await fetch(`${API_URL}/admin/ai/market-trend`, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({ trend })
        });
        if (response.ok) {
          setMarketTrend(trend);
          Alert.alert('Success', `Market trend set to ${trend.charAt(0).toUpperCase() + trend.slice(1)}`);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to set market trend');
      } finally {
        setUpdating(false);
      }
    };

    return (
    <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>AI Trading Automation</Text>
        <Text style={styles.pageSubtitle}>Control AI-powered trading system</Text>
      </View>

      {/* AI Status Card */}
      <View style={styles.aiStatusCard}>
        <LinearGradient 
          colors={aiEnabled ? COLORS.gradient5 : ['#666', '#444']} 
          style={styles.aiStatusGradient}
        >
          <View style={styles.aiStatusContent}>
            <View style={styles.aiStatusLeft}>
              <View style={styles.aiIcon}>
                <Ionicons name="hardware-chip" size={32} color="#FFF" />
              </View>
              <View>
                <Text style={styles.aiStatusLabel}>AI System Status</Text>
                <Text style={styles.aiStatusValue}>{aiEnabled ? 'ACTIVE' : 'INACTIVE'}</Text>
              </View>
            </View>
            <Switch
              value={aiEnabled}
              onValueChange={handleToggleAI}
              disabled={updating}
              trackColor={{ false: 'rgba(255,255,255,0.3)', true: 'rgba(255,255,255,0.5)' }}
              thumbColor="#FFF"
            />
          </View>
        </LinearGradient>
      </View>

      {/* Strategy Presets */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Strategy Presets</Text>
        <View style={styles.strategyGrid}>
          {[
            { id: 'conservative', label: 'Conservative', desc: 'Lower risk, stable returns', icon: 'shield', color: COLORS.success },
            { id: 'balanced', label: 'Balanced', desc: 'Moderate risk/reward', icon: 'options', color: COLORS.primary },
            { id: 'aggressive', label: 'Aggressive', desc: 'Higher risk, max profits', icon: 'flash', color: COLORS.danger },
          ].map((strategy) => (
            <TouchableOpacity 
              key={strategy.id} 
              style={[styles.strategyCard, selectedStrategy === strategy.id && styles.strategyCardActive]}
              onPress={() => handleSetStrategy(strategy.id)}
              disabled={updating}
            >
              <View style={[styles.strategyIcon, { backgroundColor: strategy.color + '15' }]}>
                <Ionicons name={strategy.icon} size={24} color={strategy.color} />
              </View>
              <Text style={styles.strategyLabel}>{strategy.label}</Text>
              <Text style={styles.strategyDesc}>{strategy.desc}</Text>
              {selectedStrategy === strategy.id && (
                <View style={styles.activeIndicator}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Win Rate Control */}
      <View style={styles.sectionCard}>
        <View style={styles.controlHeader}>
          <Text style={styles.sectionTitle}>Win Rate Control</Text>
          <Text style={styles.controlValue}>{winRate}%</Text>
        </View>
        <View style={styles.sliderContainer}>
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, { width: `${winRate}%`, backgroundColor: COLORS.primary }]} />
          </View>
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>0%</Text>
            <Text style={styles.sliderLabel}>50%</Text>
            <Text style={styles.sliderLabel}>100%</Text>
          </View>
        </View>
        <View style={styles.presetButtons}>
          {[25, 35, 45, 55, 65, 100].map((preset) => (
            <TouchableOpacity 
              key={preset} 
              style={[styles.presetBtn, winRate === preset && styles.presetBtnActive]}
              onPress={() => handleSetWinRate(preset)}
              disabled={updating}
            >
              <Text style={[styles.presetBtnText, winRate === preset && styles.presetBtnTextActive]}>{preset}%</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Demo Balance Win Rate Control */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionCardHeader}>
          <View style={[styles.sectionCardIcon, { backgroundColor: 'rgba(255, 184, 0, 0.15)' }]}>
            <Ionicons name="game-controller" size={20} color={COLORS.warning} />
          </View>
          <Text style={styles.sectionTitle}>Demo Balance Win Rate</Text>
        </View>
        
        {/* Demo Strategy Presets - Like Real Balance */}
        <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>Strategy Preset (Quick Select)</Text>
        <View style={styles.strategyGrid}>
          {[
            { id: 'realistic', label: 'Realistic', desc: '55% wins - Feels natural', icon: 'analytics', color: '#64748b', rate: 55 },
            { id: 'encouraging', label: 'Encouraging', desc: '70% wins - Builds confidence', icon: 'thumbs-up', color: COLORS.warning, rate: 70 },
            { id: 'generous', label: 'Generous', desc: '85% wins - Very positive', icon: 'gift', color: COLORS.success, rate: 85 },
            { id: 'vip', label: 'VIP', desc: '95% wins - Almost always', icon: 'diamond', color: COLORS.primary, rate: 95 },
          ].map((strategy) => (
            <TouchableOpacity 
              key={strategy.id} 
              style={[
                styles.strategyCard, 
                demoWinRateLocal === strategy.rate && styles.strategyCardActive,
                { borderColor: demoWinRateLocal === strategy.rate ? COLORS.warning : 'rgba(255,255,255,0.1)' }
              ]}
              onPress={() => handleSetDemoStrategy(strategy.id, strategy.rate)}
              disabled={updating}
            >
              <View style={[styles.strategyIcon, { backgroundColor: strategy.color + '15' }]}>
                <Ionicons name={strategy.icon as any} size={24} color={strategy.color} />
              </View>
              <Text style={styles.strategyLabel}>{strategy.label}</Text>
              <Text style={styles.strategyDesc}>{strategy.desc}</Text>
              {demoWinRateLocal === strategy.rate && (
                <View style={styles.activeIndicator}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.warning} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.winRateContainer}>
          <View style={styles.winRateCircle}>
            <Text style={[styles.winRateValue, { color: COLORS.warning }]}>{demoWinRateLocal}%</Text>
            <Text style={styles.winRateLabel}>Demo Win</Text>
          </View>
          <View style={styles.winRateInfo}>
            <Text style={styles.winRateInfoText}>
              Demo account win rate. Higher rates encourage users to deposit real money.
            </Text>
            <View style={styles.winRateBadge}>
              <Ionicons name="information-circle" size={14} color={COLORS.warning} />
              <Text style={[styles.winRateBadgeText, { color: COLORS.warning }]}>
                Recommended: 70-85%
              </Text>
            </View>
          </View>
        </View>
        
        {/* Custom Win Rate Buttons */}
        <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 12, marginBottom: 8 }}>Or set custom rate:</Text>
        <View style={styles.presetButtons}>
          {[50, 60, 70, 80, 90, 95].map((preset) => (
            <TouchableOpacity 
              key={preset} 
              style={[styles.presetBtn, demoWinRateLocal === preset && { backgroundColor: COLORS.warning + '20', borderColor: COLORS.warning }]}
              onPress={() => handleSetDemoWinRate(preset)}
              disabled={updating}
            >
              <Text style={[styles.presetBtnText, demoWinRateLocal === preset && { color: COLORS.warning }]}>{preset}%</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Market Trend */}
      <View style={[styles.sectionCard, { marginBottom: 40 }]}>
        <Text style={styles.sectionTitle}>Market Trend Simulation</Text>
        <View style={styles.trendButtons}>
          {[
            { id: 'bullish', label: 'Bullish', icon: 'trending-up', color: COLORS.success },
            { id: 'sideways', label: 'Sideways', icon: 'swap-horizontal', color: COLORS.warning },
            { id: 'bearish', label: 'Bearish', icon: 'trending-down', color: COLORS.danger },
          ].map((trend) => (
            <TouchableOpacity 
              key={trend.id} 
              style={[
                styles.trendBtn, 
                marketTrend === trend.id && { backgroundColor: trend.color + '15', borderColor: trend.color }
              ]}
              onPress={() => handleSetMarketTrend(trend.id)}
              disabled={updating}
            >
              <Ionicons name={trend.icon} size={20} color={marketTrend === trend.id ? trend.color : COLORS.textMuted} />
              <Text style={[styles.trendBtnText, marketTrend === trend.id && { color: trend.color }]}>{trend.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
    );
  };

  // Placeholder content for other menus
  const PlaceholderContent = ({ title }) => (
    <View style={styles.placeholderContainer}>
      <Ionicons name="construct" size={64} color={COLORS.textMuted} />
      <Text style={styles.placeholderTitle}>{title}</Text>
      <Text style={styles.placeholderText}>This section is under development</Text>
    </View>
  );

  // Trading Control Content - FULLY FUNCTIONAL
  const TradingControlContent = () => {
    const [localGlobalPayout, setLocalGlobalPayout] = useState(85);
    const [updatingAsset, setUpdatingAsset] = useState(null);
    const [showPayoutModal, setShowPayoutModal] = useState(false);
    const [editingAsset, setEditingAsset] = useState(null);
    const [newPayout, setNewPayout] = useState('');
    const [assetSearchQuery, setAssetSearchQuery] = useState('');
    const [selectedAssetCategory, setSelectedAssetCategory] = useState('all');

    // Filter assets based on search and category
    const filteredAssets = tradingAssets.filter(asset => {
      const matchesSearch = assetSearchQuery === '' || 
        (asset.symbol || '').toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
        (asset.name || '').toLowerCase().includes(assetSearchQuery.toLowerCase());
      const matchesCategory = selectedAssetCategory === 'all' || asset.category === selectedAssetCategory;
      return matchesSearch && matchesCategory;
    });

    // Toggle Global Trading
    const handleToggleTrading = async (enabled) => {
      try {
        const response = await fetch(`${API_URL}/admin/trading/toggle`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ enabled })
        });
        
        if (response.ok) {
          setTradingEnabled(enabled);
          alert(enabled ? 'Trading Enabled!' : 'Trading Disabled!');
        }
      } catch (error) {
        console.error('Toggle trading error:', error);
        alert('Failed to toggle trading');
      }
    };

    // Toggle Asset Status
    const handleToggleAsset = async (asset, newStatus) => {
      setUpdatingAsset(asset.asset_id || asset.symbol);
      try {
        const response = await fetch(`${API_URL}/admin/assets/${asset.asset_id || asset.symbol}/toggle`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ is_active: newStatus })
        });
        
        if (response.ok) {
          // Update local state
          setTradingAssets(prev => prev.map(a => 
            (a.asset_id === asset.asset_id || a.symbol === asset.symbol) 
              ? { ...a, is_active: newStatus } 
              : a
          ));
        }
      } catch (error) {
        console.error('Toggle asset error:', error);
      }
      setUpdatingAsset(null);
    };

    // Update Asset Payout
    const handleUpdatePayout = async () => {
      if (!editingAsset || !newPayout) return;
      
      try {
        const response = await fetch(`${API_URL}/admin/assets/${editingAsset.asset_id || editingAsset.symbol}/payout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ payout_percentage: parseFloat(newPayout) })
        });
        
        if (response.ok) {
          setTradingAssets(prev => prev.map(a => 
            (a.asset_id === editingAsset.asset_id || a.symbol === editingAsset.symbol) 
              ? { ...a, payout_percentage: parseFloat(newPayout) } 
              : a
          ));
          setShowPayoutModal(false);
          setEditingAsset(null);
          setNewPayout('');
          alert('Payout updated!');
        }
      } catch (error) {
        console.error('Update payout error:', error);
        alert('Failed to update payout');
      }
    };

    // Set Global Payout
    const handleGlobalPayout = async (payout) => {
      try {
        const response = await fetch(`${API_URL}/admin/global-payout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ payout_percentage: payout })
        });
        
        if (response.ok) {
          setLocalGlobalPayout(payout);
          setTradingAssets(prev => prev.map(a => ({ ...a, payout_percentage: payout })));
          alert(`Global payout set to ${payout}%`);
        }
      } catch (error) {
        console.error('Global payout error:', error);
      }
    };

    // Update Global Win Rate
    const handleWinRateChange = async (rate) => {
      try {
        const response = await fetch(`${API_URL}/admin/god-mode/global-win-rate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ modifier: rate })
        });
        
        if (response.ok) {
          setGlobalWinRate(rate);
        }
      } catch (error) {
        console.error('Win rate error:', error);
      }
    };

    return (
      <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Trading Control</Text>
          <Text style={styles.pageSubtitle}>Manage trading assets and platform controls</Text>
        </View>

        {/* Global Trading Toggle */}
        <View style={styles.globalToggleCard}>
          <LinearGradient 
            colors={tradingEnabled ? COLORS.gradient2 : COLORS.gradient4} 
            style={styles.globalToggleGradient}
          >
            <View style={styles.globalToggleContent}>
              <View style={styles.globalToggleLeft}>
                <Ionicons name={tradingEnabled ? 'play-circle' : 'pause-circle'} size={40} color="#FFF" />
                <View style={{marginLeft: 16}}>
                  <Text style={styles.globalToggleLabel}>Global Trading</Text>
                  <Text style={styles.globalToggleStatus}>{tradingEnabled ? 'ENABLED' : 'DISABLED'}</Text>
                </View>
              </View>
              <Switch
                value={tradingEnabled}
                onValueChange={handleToggleTrading}
                trackColor={{ false: 'rgba(255,255,255,0.3)', true: 'rgba(255,255,255,0.5)' }}
                thumbColor="#FFF"
              />
            </View>
          </LinearGradient>
        </View>

        {/* Quick Controls */}
        <View style={styles.quickControlsGrid}>
          <TouchableOpacity style={[styles.quickControlCard, { backgroundColor: COLORS.primaryLight }]}>
            <Ionicons name="flash" size={24} color={COLORS.primary} />
            <Text style={styles.quickControlValue}>50ms</Text>
            <Text style={styles.quickControlLabel}>Execution Delay</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.quickControlCard, { backgroundColor: COLORS.warningLight }]}
            onPress={() => {
              const rates = [35, 40, 45, 50, 55, 60];
              const currentIndex = rates.indexOf(globalWinRate);
              const nextRate = rates[(currentIndex + 1) % rates.length];
              handleWinRateChange(nextRate);
            }}
          >
            <Ionicons name="trending-up" size={24} color={COLORS.warning} />
            <Text style={styles.quickControlValue}>{globalWinRate}%</Text>
            <Text style={styles.quickControlLabel}>Global Win Rate (Tap)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickControlCard, { backgroundColor: COLORS.dangerLight }]}>
            <Ionicons name="wallet" size={24} color={COLORS.danger} />
            <Text style={styles.quickControlValue}>$10K</Text>
            <Text style={styles.quickControlLabel}>Profit Cap</Text>
          </TouchableOpacity>
        </View>

        {/* Trading Assets - Now from API */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trading Assets ({filteredAssets.length}/{tradingAssets.length})</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
              <Ionicons name="refresh" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.assetSearchContainer}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} style={{marginRight: 8}} />
            <TextInput
              style={styles.assetSearchInput}
              placeholder="Search assets..."
              placeholderTextColor={COLORS.textMuted}
              value={assetSearchQuery}
              onChangeText={setAssetSearchQuery}
            />
            {assetSearchQuery !== '' && (
              <TouchableOpacity onPress={() => setAssetSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.assetCategoryFilter}>
            {['all', 'forex', 'crypto', 'stocks', 'commodities'].map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.assetCategoryBtn,
                  selectedAssetCategory === cat && styles.assetCategoryBtnActive
                ]}
                onPress={() => setSelectedAssetCategory(cat)}
              >
                <Text style={[
                  styles.assetCategoryBtnText,
                  selectedAssetCategory === cat && styles.assetCategoryBtnTextActive
                ]}>
                  {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Assets List - Show ALL filtered assets */}
          {filteredAssets.map((asset, index) => (
            <View key={asset.asset_id || asset.symbol || index} style={[
              styles.assetRow,
              !asset.is_active && styles.assetRowDisabled
            ]}>
              <View style={styles.assetLeft}>
                <View style={[styles.assetIcon, { backgroundColor: asset.is_active ? COLORS.primaryLight : COLORS.cardHover }]}>
                  <Text style={[styles.assetIconText, { color: asset.is_active ? COLORS.primary : COLORS.textMuted }]}>
                    {(asset.symbol || '').slice(0, 3)}
                  </Text>
                </View>
                <View>
                  <Text style={[styles.assetSymbol, !asset.is_active && {color: COLORS.textMuted}]}>{asset.symbol}</Text>
                  <Text style={styles.assetName}>{asset.name}</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.assetMiddle}
                onPress={() => {
                  setEditingAsset(asset);
                  setNewPayout(String(asset.payout_percentage || 85));
                  setShowPayoutModal(true);
                }}
              >
                <Text style={[styles.assetPayout, !asset.is_active && {color: COLORS.textMuted}]}>{asset.payout_percentage || 85}%</Text>
                <Text style={styles.assetPayoutLabel}>Tap to Edit</Text>
              </TouchableOpacity>
              <View style={[styles.assetCategory, !asset.is_active && {backgroundColor: COLORS.cardHover}]}>
                <Text style={[styles.assetCategoryText, !asset.is_active && {color: COLORS.textMuted}]}>{asset.category || 'Other'}</Text>
              </View>
              <Switch
                value={asset.is_active !== false}
                onValueChange={(val) => handleToggleAsset(asset, val)}
                trackColor={{ false: COLORS.border, true: COLORS.success }}
                thumbColor="#FFF"
                disabled={updatingAsset === (asset.asset_id || asset.symbol)}
              />
            </View>
          ))}
          
          {filteredAssets.length === 0 && (
            <View style={styles.noAssetsFound}>
              <Ionicons name="search-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.noAssetsText}>No assets found</Text>
            </View>
          )}
        </View>

        {/* Global Payout Control */}
        <View style={[styles.sectionCard, { marginBottom: 20 }]}>
          <Text style={styles.sectionTitle}>Global Payout Control</Text>
          <Text style={styles.payoutDesc}>Set payout for ALL assets at once</Text>
          
          <View style={styles.payoutSlider}>
            <View style={styles.payoutSliderTrack}>
              <View style={[styles.payoutSliderFill, { width: `${localGlobalPayout}%` }]} />
            </View>
            <View style={styles.payoutSliderLabels}>
              <Text style={styles.payoutSliderLabel}>50%</Text>
              <Text style={styles.payoutSliderValue}>{localGlobalPayout}%</Text>
              <Text style={styles.payoutSliderLabel}>100%</Text>
            </View>
          </View>
          
          <View style={styles.payoutPresets}>
            {[60, 70, 80, 85, 90, 95].map(payout => (
              <TouchableOpacity 
                key={payout}
                style={[styles.payoutPresetBtn, localGlobalPayout === payout && styles.payoutPresetBtnActive]}
                onPress={() => handleGlobalPayout(payout)}
              >
                <Text style={[styles.payoutPresetText, localGlobalPayout === payout && styles.payoutPresetTextActive]}>
                  {payout}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Win Rate Presets */}
        <View style={[styles.sectionCard, { marginBottom: 40 }]}>
          <Text style={styles.sectionTitle}>Win Rate Presets</Text>
          <View style={styles.winRatePresets}>
            {[
              { rate: 35, label: 'Very Low', color: COLORS.danger },
              { rate: 45, label: 'Low', color: COLORS.warning },
              { rate: 50, label: 'Balanced', color: COLORS.primary },
              { rate: 55, label: 'Moderate', color: COLORS.info },
              { rate: 65, label: 'High', color: COLORS.success },
            ].map(preset => (
              <TouchableOpacity 
                key={preset.rate}
                style={[
                  styles.winRatePresetBtn, 
                  globalWinRate === preset.rate && { backgroundColor: preset.color + '20', borderColor: preset.color }
                ]}
                onPress={() => handleWinRateChange(preset.rate)}
              >
                <Text style={[
                  styles.winRatePresetValue, 
                  globalWinRate === preset.rate && { color: preset.color }
                ]}>
                  {preset.rate}%
                </Text>
                <Text style={[
                  styles.winRatePresetLabel,
                  globalWinRate === preset.rate && { color: preset.color }
                ]}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Payout Edit Modal */}
        <Modal visible={showPayoutModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.payoutModalContent}>
              <Text style={styles.payoutModalTitle}>Edit Payout</Text>
              <Text style={styles.payoutModalAsset}>{editingAsset?.symbol}</Text>
              
              <View style={styles.payoutInputRow}>
                <TextInput
                  style={styles.payoutInput}
                  value={newPayout}
                  onChangeText={setNewPayout}
                  keyboardType="decimal-pad"
                  placeholder="85"
                />
                <Text style={styles.payoutInputSuffix}>%</Text>
              </View>
              
              <View style={styles.payoutModalActions}>
                <TouchableOpacity 
                  style={styles.payoutModalCancel}
                  onPress={() => {
                    setShowPayoutModal(false);
                    setEditingAsset(null);
                  }}
                >
                  <Text style={styles.payoutModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.payoutModalSave}
                  onPress={handleUpdatePayout}
                >
                  <Text style={styles.payoutModalSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  };

  // Live Trades Content
  const LiveTradesContent = () => (
    <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderLeft}>
          <Text style={styles.pageTitle}>Live Trades</Text>
          <View style={styles.liveBadgeLarge}>
            <View style={styles.liveDotLarge} />
            <Text style={styles.liveBadgeLargeText}>LIVE</Text>
          </View>
        </View>
        <Text style={styles.pageSubtitle}>Monitor and control active trades in real-time</Text>
      </View>

      {/* Live Stats */}
      <View style={styles.liveStatsRow}>
        <View style={[styles.liveStatCard, { backgroundColor: COLORS.primaryLight }]}>
          <Text style={[styles.liveStatValue, { color: COLORS.primary }]}>{liveTrades.length}</Text>
          <Text style={styles.liveStatLabel}>Active Trades</Text>
        </View>
        <View style={[styles.liveStatCard, { backgroundColor: COLORS.successLight }]}>
          <Text style={[styles.liveStatValue, { color: COLORS.success }]}>
            ${liveTrades.filter(t => t.direction === 'up' || t.trade_type === 'call').reduce((sum, t) => sum + (t.amount || 0), 0).toFixed(0)}
          </Text>
          <Text style={styles.liveStatLabel}>Call Volume</Text>
        </View>
        <View style={[styles.liveStatCard, { backgroundColor: COLORS.dangerLight }]}>
          <Text style={[styles.liveStatValue, { color: COLORS.danger }]}>
            ${liveTrades.filter(t => t.direction === 'down' || t.trade_type === 'put').reduce((sum, t) => sum + (t.amount || 0), 0).toFixed(0)}
          </Text>
          <Text style={styles.liveStatLabel}>Put Volume</Text>
        </View>
      </View>

      {/* Live Trades List */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Trades</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
            <Ionicons name="refresh" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {liveTrades.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Ionicons name="pulse-outline" size={48} color={COLORS.textLight} />
            <Text style={{ color: COLORS.textLight, marginTop: 10 }}>No active trades</Text>
          </View>
        ) : liveTrades.map((trade, index) => (
          <View key={trade.trade_id || index} style={styles.liveTradeCard}>
            <View style={styles.liveTradeHeader}>
              <View style={styles.liveTradeUser}>
                <View style={styles.liveTradeAvatar}>
                  <Text style={styles.liveTradeAvatarText}>
                    {(trade.user_name || 'U')[0].toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.liveTradeEmail}>{trade.user_name || 'Unknown User'}</Text>
                  <Text style={styles.liveTradeAsset}>{trade.asset || 'Unknown'}</Text>
                </View>
              </View>
              <View style={[
                styles.liveTradeDirection,
                { backgroundColor: (trade.direction === 'up' || trade.trade_type === 'call') ? COLORS.successLight : COLORS.dangerLight }
              ]}>
                <Ionicons 
                  name={(trade.direction === 'up' || trade.trade_type === 'call') ? 'arrow-up' : 'arrow-down'} 
                  size={16} 
                  color={(trade.direction === 'up' || trade.trade_type === 'call') ? COLORS.success : COLORS.danger} 
                />
                <Text style={[
                  styles.liveTradeDirectionText,
                  { color: (trade.direction === 'up' || trade.trade_type === 'call') ? COLORS.success : COLORS.danger }
                ]}>
                  {trade.trade_type?.toUpperCase() || (trade.direction === 'up' ? 'CALL' : 'PUT')}
                </Text>
              </View>
            </View>

            <View style={styles.liveTradeBody}>
              <View style={styles.liveTradeInfo}>
                <Text style={styles.liveTradeLabel}>Amount</Text>
                <Text style={styles.liveTradeValue}>${trade.amount || 0}</Text>
              </View>
              <View style={styles.liveTradeInfo}>
                <Text style={styles.liveTradeLabel}>Duration</Text>
                <Text style={styles.liveTradeValue}>{trade.duration || 60}s</Text>
              </View>
              <View style={styles.liveTradeInfo}>
                <Text style={styles.liveTradeLabel}>Payout</Text>
                <Text style={styles.liveTradeValue}>{trade.payout_percentage || 95}%</Text>
              </View>
              <View style={styles.liveTradeInfo}>
                <Text style={styles.liveTradeLabel}>Account</Text>
                <Text style={[styles.liveTradeValue, { color: trade.account_type === 'real' ? COLORS.success : COLORS.warning }]}>
                  {trade.account_type?.toUpperCase() || 'DEMO'}
                </Text>
              </View>
            </View>

            <View style={styles.liveTradeActions}>
              <TouchableOpacity 
                style={[styles.forceResultBtn, { backgroundColor: COLORS.successLight }]}
                onPress={() => handleForceWin(trade.trade_id)}
              >
                <Ionicons name="checkmark" size={16} color={COLORS.success} />
                <Text style={[styles.forceResultText, { color: COLORS.success }]}>Force Win</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.forceResultBtn, { backgroundColor: COLORS.dangerLight }]}
                onPress={() => handleForceLoss(trade.trade_id)}
              >
                <Ionicons name="close" size={16} color={COLORS.danger} />
                <Text style={[styles.forceResultText, { color: COLORS.danger }]}>Force Loss</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.forceResultBtn, { backgroundColor: COLORS.warningLight }]}
                onPress={() => handleCloseTrade(trade.trade_id)}
              >
                <Ionicons name="stop" size={16} color={COLORS.warning} />
                <Text style={[styles.forceResultText, { color: COLORS.warning }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {(liveTrades.length === 0 && recentTrades.length === 0) && (
          <View style={styles.emptyState}>
            <Ionicons name="pulse" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyStateText}>No active trades</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  // Render main content based on active menu
  const renderContent = () => {
    switch (activeMenu) {
      case 'overview':
        return <OverviewContent />;
      case 'users':
        return <UsersContent />;
      case 'kyc':
        return <KYCContent />;
      case 'withdrawals':
        return <WithdrawalsContent />;
      case 'ai-control':
        return <AIControlContent />;
      case 'trading':
        return <TradingControlContent />;
      case 'live-trades':
        return <LiveTradesContent />;
      case 'analytics':
        return <AnalyticsContent />;
      case 'deposits':
        return <DepositsContent />;
      case 'affiliates':
        return <AffiliatesContent />;
      case 'staff':
        return <StaffContent />;
      case 'settings':
        return <SettingsContent />;
      default:
        return <PlaceholderContent title={MENU_ITEMS.find(m => m.id === activeMenu)?.label || 'Section'} />;
    }
  };

  // Analytics Dashboard Content
  const AnalyticsContent = () => {
    const [selectedPeriod, setSelectedPeriod] = useState('7D');
    const [analyticsStats, setAnalyticsStats] = useState(stats);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);
    const [topTraders, setTopTraders] = useState<any[]>([]);

    const fetchAnalyticsData = async (period: string) => {
      try {
        setLoadingAnalytics(true);
        const periodMap: {[key: string]: string} = {
          '24H': '24h',
          '7D': '7d',
          '30D': '30d',
          '90D': '90d',
          'ALL': 'all'
        };
        
        // Fetch stats
        const response = await fetch(`${API_URL}/admin/stats?period=${periodMap[period]}`, {
          headers: headers
        });
        
        if (response.ok) {
          const data = await response.json();
          setAnalyticsStats({
            ...stats,
            totalDeposits: data.total_deposits || 0,
            totalWithdrawals: data.total_withdrawals || 0,
            platformProfit: data.platform_profit || 0,
            totalUsers: data.total_users || 0,
            totalTrades: data.total_trades || 0,
            totalVolume: data.total_volume || 0,
          });
        }

        // Fetch top traders
        const tradersResponse = await fetch(`${API_URL}/admin/top-traders?period=${periodMap[period]}&limit=5`, {
          headers: headers
        });
        
        if (tradersResponse.ok) {
          const tradersData = await tradersResponse.json();
          setTopTraders(tradersData.top_traders || []);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoadingAnalytics(false);
      }
    };

    const handlePeriodChange = (period: string) => {
      setSelectedPeriod(period);
      fetchAnalyticsData(period);
    };

    useEffect(() => {
      fetchAnalyticsData(selectedPeriod);
    }, []);

    return (
    <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Analytics Dashboard</Text>
        <Text style={styles.pageSubtitle}>Platform performance and insights</Text>
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeSelector}>
        {['24H', '7D', '30D', '90D', 'ALL'].map(range => (
          <TouchableOpacity 
            key={range}
            style={[styles.timeRangeBtn, range === selectedPeriod && styles.timeRangeBtnActive]}
            onPress={() => handlePeriodChange(range)}
          >
            <Text style={[styles.timeRangeBtnText, range === selectedPeriod && styles.timeRangeBtnTextActive]}>
              {range}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loadingAnalytics && (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={{ color: '#666', marginTop: 8 }}>Loading {selectedPeriod} data...</Text>
        </View>
      )}

      {/* Revenue Overview */}
      <View style={styles.analyticsGrid}>
        <View style={[styles.analyticsCard, { backgroundColor: COLORS.successLight }]}>
          <View style={styles.analyticsCardHeader}>
            <Ionicons name="arrow-down-circle" size={24} color={COLORS.success} />
            <View style={styles.analyticsTrend}>
              <Ionicons name="trending-up" size={14} color={COLORS.success} />
              <Text style={[styles.analyticsTrendText, { color: COLORS.success }]}>+18%</Text>
            </View>
          </View>
          <Text style={[styles.analyticsValue, { color: COLORS.success }]}>
            ${formatNumber(analyticsStats.totalDeposits)}
          </Text>
          <Text style={styles.analyticsLabel}>Total Deposits</Text>
        </View>

        <View style={[styles.analyticsCard, { backgroundColor: COLORS.dangerLight }]}>
          <View style={styles.analyticsCardHeader}>
            <Ionicons name="arrow-up-circle" size={24} color={COLORS.danger} />
            <View style={styles.analyticsTrend}>
              <Ionicons name="trending-down" size={14} color={COLORS.danger} />
              <Text style={[styles.analyticsTrendText, { color: COLORS.danger }]}>-5%</Text>
            </View>
          </View>
          <Text style={[styles.analyticsValue, { color: COLORS.danger }]}>
            ${formatNumber(analyticsStats.totalWithdrawals)}
          </Text>
          <Text style={styles.analyticsLabel}>Total Withdrawals</Text>
        </View>
      </View>

      <View style={styles.analyticsGrid}>
        <View style={[styles.analyticsCard, { backgroundColor: COLORS.primaryLight }]}>
          <View style={styles.analyticsCardHeader}>
            <Ionicons name="cash" size={24} color={COLORS.primary} />
            <View style={styles.analyticsTrend}>
              <Ionicons name="trending-up" size={14} color={COLORS.success} />
              <Text style={[styles.analyticsTrendText, { color: COLORS.success }]}>+32%</Text>
            </View>
          </View>
          <Text style={[styles.analyticsValue, { color: COLORS.primary }]}>
            ${formatNumber(analyticsStats.platformProfit)}
          </Text>
          <Text style={styles.analyticsLabel}>Net Profit</Text>
        </View>

        <View style={[styles.analyticsCard, { backgroundColor: COLORS.purpleLight }]}>
          <View style={styles.analyticsCardHeader}>
            <Ionicons name="people" size={24} color={COLORS.purple} />
            <View style={styles.analyticsTrend}>
              <Ionicons name="trending-up" size={14} color={COLORS.success} />
              <Text style={[styles.analyticsTrendText, { color: COLORS.success }]}>+12%</Text>
            </View>
          </View>
          <Text style={[styles.analyticsValue, { color: COLORS.purple }]}>
            {stats.totalUsers}
          </Text>
          <Text style={styles.analyticsLabel}>Total Users</Text>
        </View>
      </View>

      {/* Chart Placeholder */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Revenue Overview</Text>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.legendText}>Deposits</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.danger }]} />
              <Text style={styles.legendText}>Withdrawals</Text>
            </View>
          </View>
        </View>
        <View style={styles.chartPlaceholder}>
          <View style={styles.chartBars}>
            {[65, 45, 80, 55, 70, 90, 75].map((height, index) => (
              <View key={index} style={styles.chartBarGroup}>
                <View style={[styles.chartBar, { height: height, backgroundColor: COLORS.success }]} />
                <View style={[styles.chartBar, { height: height * 0.6, backgroundColor: COLORS.danger, marginLeft: 4 }]} />
              </View>
            ))}
          </View>
          <View style={styles.chartLabels}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <Text key={day} style={styles.chartLabel}>{day}</Text>
            ))}
          </View>
        </View>
      </View>

      {/* Trading Stats */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Trading Statistics</Text>
        <View style={styles.tradingStatsGrid}>
          <View style={styles.tradingStatItem}>
            <Text style={styles.tradingStatValue}>{stats.activeTrades}</Text>
            <Text style={styles.tradingStatLabel}>Total Trades</Text>
          </View>
          <View style={styles.tradingStatItem}>
            <Text style={[styles.tradingStatValue, { color: COLORS.success }]}>52%</Text>
            <Text style={styles.tradingStatLabel}>Win Rate</Text>
          </View>
          <View style={styles.tradingStatItem}>
            <Text style={[styles.tradingStatValue, { color: COLORS.primary }]}>$25.50</Text>
            <Text style={styles.tradingStatLabel}>Avg Trade</Text>
          </View>
          <View style={styles.tradingStatItem}>
            <Text style={[styles.tradingStatValue, { color: COLORS.danger }]}>$12.5K</Text>
            <Text style={styles.tradingStatLabel}>Users P&L</Text>
          </View>
        </View>
      </View>

      {/* Top Users */}
      <View style={[styles.sectionCard, { marginBottom: 40 }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Traders</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {topTraders.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: '#666' }}>No trading activity in this period</Text>
          </View>
        ) : (
          topTraders.map((trader, index) => (
            <View key={trader.user_id || index} style={styles.topUserRow}>
              <View style={styles.topUserRank}>
                <Text style={[styles.topUserRankText, index < 3 && { color: COLORS.warning }]}>
                  #{index + 1}
                </Text>
              </View>
              <View style={[styles.userAvatar, { width: 36, height: 36, borderRadius: 18 }]}>
                <Text style={[styles.userAvatarText, { fontSize: 14 }]}>
                  {(trader.name || trader.email || 'U')[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.topUserInfo}>
                <Text style={styles.topUserName}>{trader.name || 'Unnamed'}</Text>
                <Text style={styles.topUserEmail}>{trader.email}</Text>
              </View>
              <View style={styles.topUserStats}>
                <Text style={styles.topUserVolume}>${formatNumber(trader.total_volume)}</Text>
                <Text style={styles.topUserLabel}>Volume</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
    );
  };

  // KYC Requests Content
  const KYCContent = () => {
    const [localKycData, setLocalKycData] = useState(kycSubmissions);
    const [selectedKyc, setSelectedKyc] = useState<any>(null);
    const [showKycModal, setShowKycModal] = useState(false);

    const handleApproveKyc = async (transactionId: string) => {
      try {
        const response = await fetch(`${API_URL}/admin/withdrawals/${transactionId}/approve-kyc`, {
          method: 'POST',
          headers: headers,
        });
        
        if (response.ok) {
          if (Platform.OS === 'web') {
            window.alert('KYC approved successfully');
          } else {
            Alert.alert('Success', 'KYC approved successfully');
          }
          fetchDashboardData();
          setShowKycModal(false);
        } else {
          if (Platform.OS === 'web') {
            window.alert('Failed to approve KYC');
          } else {
            Alert.alert('Error', 'Failed to approve KYC');
          }
        }
      } catch (error) {
        if (Platform.OS === 'web') {
          window.alert('Failed to approve KYC');
        } else {
          Alert.alert('Error', 'Failed to approve KYC');
        }
      }
    };

    const handleRejectKyc = async (transactionId: string) => {
      try {
        const response = await fetch(`${API_URL}/admin/withdrawals/${transactionId}/reject`, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({ reason: 'KYC documents rejected' })
        });
        
        if (response.ok) {
          if (Platform.OS === 'web') {
            window.alert('KYC rejected successfully');
          } else {
            Alert.alert('Success', 'KYC rejected successfully');
          }
          fetchDashboardData();
          setShowKycModal(false);
        } else {
          if (Platform.OS === 'web') {
            window.alert('Failed to reject KYC');
          } else {
            Alert.alert('Error', 'Failed to reject KYC');
          }
        }
      } catch (error) {
        if (Platform.OS === 'web') {
          window.alert('Failed to reject KYC');
        } else {
          Alert.alert('Error', 'Failed to reject KYC');
        }
      }
    };

    return (
      <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>KYC Requests</Text>
          <Text style={styles.pageSubtitle}>Manage user identity verification submissions</Text>
        </View>

        {/* Stats Cards - Using depositStatsRow style for consistent layout */}
        <View style={styles.kycStatsRow}>
          <View style={styles.kycStatCard}>
            <View style={[styles.kycStatIconWrap, { backgroundColor: COLORS.warningLight }]}>
              <Ionicons name="time" size={24} color={COLORS.warning} />
            </View>
            <Text style={[styles.kycStatNumber, { color: COLORS.warning }]}>{kycSubmissions.length}</Text>
            <Text style={styles.kycStatLabel}>Pending Review</Text>
          </View>
          <View style={styles.kycStatCard}>
            <View style={[styles.kycStatIconWrap, { backgroundColor: COLORS.successLight }]}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            </View>
            <Text style={[styles.kycStatNumber, { color: COLORS.success }]}>0</Text>
            <Text style={styles.kycStatLabel}>Approved Today</Text>
          </View>
          <View style={styles.kycStatCard}>
            <View style={[styles.kycStatIconWrap, { backgroundColor: COLORS.dangerLight }]}>
              <Ionicons name="close-circle" size={24} color={COLORS.danger} />
            </View>
            <Text style={[styles.kycStatNumber, { color: COLORS.danger }]}>0</Text>
            <Text style={styles.kycStatLabel}>Rejected</Text>
          </View>
        </View>

        {/* KYC Submissions List */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending KYC Submissions</Text>
            <TouchableOpacity onPress={fetchDashboardData}>
              <Ionicons name="refresh" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          
          {kycSubmissions.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Ionicons name="document-text-outline" size={48} color="#666" />
              <Text style={{ color: '#666', marginTop: 12, fontSize: 16 }}>No pending KYC submissions</Text>
              <Text style={{ color: '#888', marginTop: 4, fontSize: 12 }}>New submissions will appear here</Text>
            </View>
          ) : (
            kycSubmissions.map((submission, index) => (
              <TouchableOpacity 
                key={submission.withdrawal_id || index}
                style={styles.kycRow}
                onPress={() => {
                  setSelectedKyc(submission);
                  setShowKycModal(true);
                }}
              >
                <View style={styles.kycUserInfo}>
                  <View style={[styles.userAvatar, { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryLight }]}>
                    <Text style={[styles.userAvatarText, { color: COLORS.primary }]}>
                      {(submission.user_name || submission.user_email || 'U')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.kycUserName}>{submission.user_name || 'Unknown User'}</Text>
                    <Text style={styles.kycUserEmail}>{submission.user_email}</Text>
                    <Text style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
                      Account ID: {submission.user_verified_id || 'N/A'}
                    </Text>
                  </View>
                </View>
                <View style={styles.kycAmountInfo}>
                  <Text style={styles.kycAmount}>${submission.amount?.toFixed(2) || '0.00'}</Text>
                  <Text style={styles.kycAmountLabel}>Withdrawal</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: COLORS.warningLight }]}>
                  <Text style={[styles.statusBadgeText, { color: COLORS.warning }]}>Review</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* KYC Detail Modal */}
        <Modal
          visible={showKycModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowKycModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '90%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>KYC Document Review</Text>
                <TouchableOpacity onPress={() => setShowKycModal(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              {selectedKyc && (
                <ScrollView style={{ flex: 1 }}>
                  {/* User Info */}
                  <View style={{ padding: 16, backgroundColor: '#f8f9fa', borderRadius: 8, marginBottom: 16 }}>
                    <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8 }}>User Information</Text>
                    <Text style={{ color: '#666', marginBottom: 4 }}>Name: {selectedKyc.user_name || 'N/A'}</Text>
                    <Text style={{ color: '#666', marginBottom: 4 }}>Email: {selectedKyc.user_email}</Text>
                    <Text style={{ color: '#666', marginBottom: 4 }}>Account ID: {selectedKyc.user_verified_id || 'N/A'}</Text>
                    <Text style={{ color: '#666' }}>Withdrawal Amount: ${selectedKyc.amount?.toFixed(2) || '0.00'}</Text>
                  </View>

                  {/* Document Preview */}
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8 }}>
                      Submitted Document ({selectedKyc.kyc_document_type || selectedKyc.kyc_requirement || 'Unknown'})
                    </Text>
                    {selectedKyc.kyc_document_url ? (
                      <Image 
                        source={{ uri: selectedKyc.kyc_document_url }}
                        style={{ width: '100%', height: 300, borderRadius: 8, backgroundColor: '#eee' }}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={{ padding: 40, alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 8 }}>
                        <Ionicons name="document-outline" size={48} color="#999" />
                        <Text style={{ color: '#999', marginTop: 8 }}>No document uploaded</Text>
                      </View>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity 
                      style={{ flex: 1, backgroundColor: COLORS.success, padding: 14, borderRadius: 8, alignItems: 'center' }}
                      onPress={() => handleApproveKyc(selectedKyc.transaction_id)}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: '600', marginTop: 4 }}>Approve KYC</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={{ flex: 1, backgroundColor: COLORS.danger, padding: 14, borderRadius: 8, alignItems: 'center' }}
                      onPress={() => handleRejectKyc(selectedKyc.transaction_id)}
                    >
                      <Ionicons name="close-circle" size={20} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: '600', marginTop: 4 }}>Reject KYC</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  };

  // Deposits Content
  const DepositsContent = () => (
    <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Deposit Management</Text>
        <Text style={styles.pageSubtitle}>Monitor deposits, manage promo codes & bonuses</Text>
      </View>

      {/* Deposit Stats */}
      <View style={styles.depositStatsRow}>
        <View style={[styles.depositStatCard, { backgroundColor: COLORS.successLight }]}>
          <Ionicons name="checkmark-circle" size={28} color={COLORS.success} />
          <Text style={[styles.depositStatValue, { color: COLORS.success }]}>
            ${formatNumber(depositsStats.totalAmount)}
          </Text>
          <Text style={styles.depositStatLabel}>Total Deposits</Text>
        </View>
        <View style={[styles.depositStatCard, { backgroundColor: COLORS.warningLight }]}>
          <Ionicons name="time" size={28} color={COLORS.warning} />
          <Text style={[styles.depositStatValue, { color: COLORS.warning }]}>{depositsStats.pendingCount}</Text>
          <Text style={styles.depositStatLabel}>Pending</Text>
        </View>
        <View style={[styles.depositStatCard, { backgroundColor: COLORS.primaryLight }]}>
          <Ionicons name="today" size={28} color={COLORS.primary} />
          <Text style={[styles.depositStatValue, { color: COLORS.primary }]}>${formatNumber(depositsStats.todayAmount)}</Text>
          <Text style={styles.depositStatLabel}>Today</Text>
        </View>
      </View>

      {/* Payment Gateway Info */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Payment Gateway</Text>
          <View style={[styles.statusBadge, { backgroundColor: COLORS.successLight }]}>
            <Text style={[styles.statusBadgeText, { color: COLORS.success }]}>Active</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f0f9ff', borderRadius: 12 }}>
          <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#0066FF', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>NP</Text>
          </View>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.text }}>NOWPayments</Text>
            <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>Crypto payment gateway for deposits</Text>
          </View>
          <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
        </View>
      </View>

      {/* Promo Codes Management */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Promo Codes & Bonuses</Text>
          <TouchableOpacity 
            style={{ backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}
            onPress={() => setShowPromoModal(true)}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '600', marginLeft: 4 }}>Create</Text>
          </TouchableOpacity>
        </View>

        {promoCodes.length === 0 ? (
          <View style={{ padding: 30, alignItems: 'center' }}>
            <Ionicons name="pricetag-outline" size={48} color={COLORS.textMuted} />
            <Text style={{ color: COLORS.textSecondary, marginTop: 12, fontSize: 14 }}>No promo codes yet</Text>
            <Text style={{ color: COLORS.textMuted, marginTop: 4, fontSize: 12 }}>Create your first promo code to offer deposit bonuses</Text>
          </View>
        ) : (
          promoCodes.map((promo, index) => (
            <View key={promo.code} style={{ padding: 16, borderBottomWidth: index < promoCodes.length - 1 ? 1 : 0, borderBottomColor: COLORS.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ backgroundColor: COLORS.purpleLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                      <Text style={{ color: COLORS.purple, fontWeight: '700', fontSize: 14 }}>{promo.code}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: promo.is_active ? COLORS.successLight : COLORS.dangerLight, marginLeft: 8 }]}>
                      <Text style={[styles.statusBadgeText, { color: promo.is_active ? COLORS.success : COLORS.danger }]}>
                        {promo.is_active ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ color: COLORS.text, fontSize: 14 }}>
                      {promo.bonus_type === 'percentage' ? `${promo.bonus_value}% Bonus` : `$${promo.bonus_value} Fixed Bonus`}
                      {promo.max_bonus > 0 ? ` (Max $${promo.max_bonus})` : ''}
                    </Text>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
                      Min deposit: ${promo.min_deposit} • Used: {promo.usage_count}/{promo.usage_limit || '∞'}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity 
                    style={{ padding: 8 }}
                    onPress={() => handleTogglePromoCode(promo.code)}
                  >
                    <Ionicons name={promo.is_active ? 'pause-circle' : 'play-circle'} size={24} color={promo.is_active ? COLORS.warning : COLORS.success} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ padding: 8 }}
                    onPress={() => handleDeletePromoCode(promo.code)}
                  >
                    <Ionicons name="trash-outline" size={22} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Payment Methods */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Supported Cryptocurrencies</Text>
        {[
          { name: 'USDT TRC20', icon: '₮', color: '#26A17B', enabled: true, deposits: deposits.filter(d => d.payment_type === 'usdt' || d.payment_type === 'crypto').length },
          { name: 'Bitcoin', icon: '₿', color: '#F7931A', enabled: true, deposits: deposits.filter(d => d.payment_type === 'btc' || d.payment_type === 'bitcoin').length },
          { name: 'Ethereum', icon: 'Ξ', color: '#627EEA', enabled: true, deposits: deposits.filter(d => d.payment_type === 'eth' || d.payment_type === 'ethereum').length },
          { name: 'Litecoin', icon: 'Ł', color: '#345D9D', enabled: true, deposits: 0 },
        ].map((method, index) => (
          <View key={method.name} style={styles.paymentMethodRow}>
            <View style={styles.paymentMethodLeft}>
              <View style={[styles.paymentMethodIcon, { backgroundColor: method.color + '20' }]}>
                <Text style={[styles.paymentMethodIconText, { color: method.color }]}>{method.icon}</Text>
              </View>
              <View>
                <Text style={styles.paymentMethodName}>{method.name}</Text>
                <Text style={styles.paymentMethodDeposits}>{method.deposits} deposits</Text>
              </View>
            </View>
            <Switch
              value={method.enabled}
              trackColor={{ false: COLORS.border, true: COLORS.success }}
              thumbColor="#FFF"
            />
          </View>
        ))}
      </View>

      {/* Recent Deposits */}
      <View style={[styles.sectionCard, { marginBottom: 40 }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Deposits</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Text style={styles.viewAllText}>Refresh</Text>
          </TouchableOpacity>
        </View>
        
        {deposits.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="wallet" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyStateText}>No recent deposits</Text>
          </View>
        ) : (
          deposits.slice(0, 10).map((deposit, index) => (
            <View key={deposit._id || index} style={styles.depositRow}>
              <View style={styles.depositLeft}>
                <View style={[styles.depositIcon, { 
                  backgroundColor: deposit.status === 'completed' || deposit.status === 'confirmed' || deposit.status === 'credited'
                    ? COLORS.successLight 
                    : deposit.status === 'pending' || deposit.status === 'waiting'
                    ? COLORS.warningLight
                    : deposit.status === 'expired'
                    ? '#E5E5E5'
                    : COLORS.dangerLight
                }]}>
                  <Ionicons 
                    name={
                      deposit.status === 'completed' || deposit.status === 'confirmed' || deposit.status === 'credited'
                        ? 'checkmark-circle' 
                        : deposit.status === 'pending' || deposit.status === 'waiting'
                        ? 'time'
                        : deposit.status === 'expired'
                        ? 'hourglass'
                        : 'close-circle'
                    } 
                    size={20} 
                    color={
                      deposit.status === 'completed' || deposit.status === 'confirmed' || deposit.status === 'credited'
                        ? COLORS.success 
                        : deposit.status === 'pending' || deposit.status === 'waiting'
                        ? COLORS.warning
                        : deposit.status === 'expired'
                        ? '#808080'
                        : COLORS.danger
                    } 
                  />
                </View>
                <View>
                  <Text style={styles.depositUser}>{deposit.user_id?.substring(0, 15) || 'Unknown'}...</Text>
                  <Text style={styles.depositDate}>
                    {deposit.created_at ? new Date(deposit.created_at).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
              </View>
              <View style={styles.depositRight}>
                <Text style={[styles.depositAmount, { color: COLORS.success }]}>
                  +${(deposit.amount_usd || 0).toFixed(2)}
                </Text>
                <Text style={[styles.depositStatus, { 
                  color: deposit.status === 'completed' || deposit.status === 'confirmed' || deposit.status === 'credited'
                    ? COLORS.success 
                    : deposit.status === 'pending' || deposit.status === 'waiting'
                    ? COLORS.warning
                    : deposit.status === 'expired'
                    ? '#808080'
                    : COLORS.danger
                }]}>
                  {(deposit.status === 'completed' || deposit.status === 'credited') ? 'COMPLETED' : 
                   deposit.status === 'expired' ? 'EXPIRED' : 
                   deposit.status?.toUpperCase() || 'UNKNOWN'}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Create Promo Code Modal */}
      <Modal
        visible={showPromoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPromoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Promo Code</Text>
              <TouchableOpacity onPress={() => setShowPromoModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              {/* Code Input */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>Promo Code *</Text>
              <TextInput
                style={[styles.input, { marginBottom: 16 }]}
                placeholder="e.g., WELCOME50"
                placeholderTextColor={COLORS.textMuted}
                value={newPromoCode.code}
                onChangeText={(text) => setNewPromoCode({...newPromoCode, code: text.toUpperCase()})}
                autoCapitalize="characters"
              />

              {/* Bonus Type */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>Bonus Type</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: newPromoCode.bonus_type === 'percentage' ? COLORS.primary : COLORS.border,
                    backgroundColor: newPromoCode.bonus_type === 'percentage' ? COLORS.primaryLight : '#fff',
                    alignItems: 'center'
                  }}
                  onPress={() => setNewPromoCode({...newPromoCode, bonus_type: 'percentage'})}
                >
                  <Text style={{ fontWeight: '600', color: newPromoCode.bonus_type === 'percentage' ? COLORS.primary : COLORS.text }}>
                    Percentage %
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: newPromoCode.bonus_type === 'fixed' ? COLORS.primary : COLORS.border,
                    backgroundColor: newPromoCode.bonus_type === 'fixed' ? COLORS.primaryLight : '#fff',
                    alignItems: 'center'
                  }}
                  onPress={() => setNewPromoCode({...newPromoCode, bonus_type: 'fixed'})}
                >
                  <Text style={{ fontWeight: '600', color: newPromoCode.bonus_type === 'fixed' ? COLORS.primary : COLORS.text }}>
                    Fixed Amount $
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Bonus Value */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>
                Bonus Value {newPromoCode.bonus_type === 'percentage' ? '(%)' : '($)'} *
              </Text>
              <TextInput
                style={[styles.input, { marginBottom: 16 }]}
                placeholder={newPromoCode.bonus_type === 'percentage' ? "e.g., 50" : "e.g., 100"}
                placeholderTextColor={COLORS.textMuted}
                value={newPromoCode.bonus_value}
                onChangeText={(text) => setNewPromoCode({...newPromoCode, bonus_value: text})}
                keyboardType="numeric"
              />

              {/* Min Deposit */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>Minimum Deposit ($)</Text>
              <TextInput
                style={[styles.input, { marginBottom: 16 }]}
                placeholder="e.g., 100 (0 = no minimum)"
                placeholderTextColor={COLORS.textMuted}
                value={newPromoCode.min_deposit}
                onChangeText={(text) => setNewPromoCode({...newPromoCode, min_deposit: text})}
                keyboardType="numeric"
              />

              {/* Max Bonus (for percentage) */}
              {newPromoCode.bonus_type === 'percentage' && (
                <>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>Maximum Bonus ($)</Text>
                  <TextInput
                    style={[styles.input, { marginBottom: 16 }]}
                    placeholder="e.g., 500 (0 = unlimited)"
                    placeholderTextColor={COLORS.textMuted}
                    value={newPromoCode.max_bonus}
                    onChangeText={(text) => setNewPromoCode({...newPromoCode, max_bonus: text})}
                    keyboardType="numeric"
                  />
                </>
              )}

              {/* Usage Limit */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>Usage Limit</Text>
              <TextInput
                style={[styles.input, { marginBottom: 16 }]}
                placeholder="e.g., 100 (0 = unlimited)"
                placeholderTextColor={COLORS.textMuted}
                value={newPromoCode.usage_limit}
                onChangeText={(text) => setNewPromoCode({...newPromoCode, usage_limit: text})}
                keyboardType="numeric"
              />

              {/* Expires In */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>Expires In (Days)</Text>
              <TextInput
                style={[styles.input, { marginBottom: 24 }]}
                placeholder="e.g., 30 (0 = never expires)"
                placeholderTextColor={COLORS.textMuted}
                value={newPromoCode.expires_days}
                onChangeText={(text) => setNewPromoCode({...newPromoCode, expires_days: text})}
                keyboardType="numeric"
              />

              {/* Create Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: COLORS.primary,
                  padding: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  marginBottom: 20
                }}
                onPress={handleCreatePromoCode}
                disabled={promoLoading}
              >
                {promoLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Create Promo Code</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );

  // Affiliates Content - Handler Functions
  const handleCreateAffiliate = async () => {
    if (!newAffiliate.name || !newAffiliate.email) {
      Alert.alert('Error', 'Name and email are required');
      return;
    }
    
    setAffiliateLoading(true);
    try {
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('adminToken') || await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/admin/affiliates/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAffiliate)
      });
      
      if (res.ok) {
        const data = await res.json();
        Alert.alert('Success', `Affiliate created!\nRef Code: ${data.affiliate.ref_code}`);
        setShowCreateAffiliateModal(false);
        setNewAffiliate({
          name: '',
          email: '',
          phone: '',
          company: '',
          commission_rate: 50,
          turnover_rate: 2,
          cpa_amount: 50
        });
        fetchAffiliateData();
      } else {
        const error = await res.json();
        Alert.alert('Error', error.detail || 'Failed to create affiliate');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create affiliate');
    } finally {
      setAffiliateLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    setAffiliateLoading(true);
    try {
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('adminToken') || await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/admin/affiliates/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editSettings)
      });
      
      if (res.ok) {
        Alert.alert('Success', 'Commission settings updated');
        setShowEditSettingsModal(false);
        fetchAffiliateData();
      } else {
        Alert.alert('Error', 'Failed to update settings');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update settings');
    } finally {
      setAffiliateLoading(false);
    }
  };

  const handleDeleteAffiliate = async (affiliateId: string) => {
    if (!affiliateId) {
      console.log('No affiliate ID provided');
      return;
    }
    
    try {
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('adminToken') || await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/admin/affiliates/${affiliateId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        if (Platform.OS === 'web') {
          window.alert('Affiliate deleted successfully');
        } else {
          Alert.alert('Success', 'Affiliate deleted');
        }
        fetchAffiliateData();
      } else {
        if (Platform.OS === 'web') {
          window.alert('Failed to delete affiliate');
        } else {
          Alert.alert('Error', 'Failed to delete affiliate');
        }
      }
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert('Failed to delete affiliate');
      } else {
        Alert.alert('Error', 'Failed to delete affiliate');
      }
    }
  };

  const handleUpdateAffiliate = async () => {
    if (!selectedAffiliate) return;
    
    const affId = selectedAffiliate.affiliate_id || selectedAffiliate._id;
    if (!affId) {
      if (Platform.OS === 'web') {
        window.alert('Invalid affiliate ID');
      } else {
        Alert.alert('Error', 'Invalid affiliate ID');
      }
      return;
    }
    
    setAffiliateLoading(true);
    try {
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('adminToken') || await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/admin/affiliates/${affId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: selectedAffiliate.name,
          email: selectedAffiliate.email,
          telegram: selectedAffiliate.telegram,
          phone: selectedAffiliate.phone,
          status: selectedAffiliate.status,
          is_active: selectedAffiliate.is_active,
          commission_rate: selectedAffiliate.commission_rate,
          turnover_rate: selectedAffiliate.turnover_rate,
        })
      });
      
      if (res.ok) {
        if (Platform.OS === 'web') {
          window.alert('Affiliate updated successfully');
        } else {
          Alert.alert('Success', 'Affiliate updated');
        }
        setShowEditAffiliateModal(false);
        setSelectedAffiliate(null);
        fetchAffiliateData();
      } else {
        if (Platform.OS === 'web') {
          window.alert('Failed to update affiliate');
        } else {
          Alert.alert('Error', 'Failed to update affiliate');
        }
      }
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert('Failed to update affiliate');
      } else {
        Alert.alert('Error', 'Failed to update affiliate');
      }
    } finally {
      setAffiliateLoading(false);
    }
  };

  const AffiliatesContent = () => (
    <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Affiliate Management</Text>
        <Text style={styles.pageSubtitle}>Manage affiliate partners and commissions</Text>
      </View>

      {/* Affiliate Stats */}
      <View style={styles.affiliateStatsGrid}>
        <View style={[styles.affiliateStatCard, { borderLeftColor: COLORS.primary }]}>
          <Text style={styles.affiliateStatValue}>{affiliateStats.total_affiliates}</Text>
          <Text style={styles.affiliateStatLabel}>Total Affiliates</Text>
        </View>
        <View style={[styles.affiliateStatCard, { borderLeftColor: COLORS.success }]}>
          <Text style={styles.affiliateStatValue}>{affiliateStats.active_affiliates}</Text>
          <Text style={styles.affiliateStatLabel}>Active</Text>
        </View>
        <View style={[styles.affiliateStatCard, { borderLeftColor: COLORS.warning }]}>
          <Text style={styles.affiliateStatValue}>${affiliateStats.total_paid?.toLocaleString() || 0}</Text>
          <Text style={styles.affiliateStatLabel}>Total Paid</Text>
        </View>
        <View style={[styles.affiliateStatCard, { borderLeftColor: COLORS.danger }]}>
          <Text style={styles.affiliateStatValue}>${affiliateStats.pending_payouts?.toLocaleString() || 0}</Text>
          <Text style={styles.affiliateStatLabel}>Pending Payouts</Text>
        </View>
      </View>

      {/* Sub Tabs */}
      <View style={styles.affiliateSubTabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.affiliateSubTabs}>
          {[
            { id: 'list', label: 'All Affiliates', icon: 'people' },
            { id: 'leaderboard', label: 'Leaderboard', icon: 'trophy' },
            { id: 'withdrawals', label: 'Withdrawals', icon: 'wallet' },
            { id: 'fraud', label: 'Fraud Control', icon: 'shield-checkmark' },
            { id: 'chat', label: 'Support Chat', icon: 'chatbubbles' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.affiliateSubTab, affiliateSubTab === tab.id && styles.affiliateSubTabActive]}
              onPress={() => setAffiliateSubTab(tab.id)}
            >
              <Ionicons 
                name={tab.icon as any} 
                size={16} 
                color={affiliateSubTab === tab.id ? COLORS.primary : COLORS.textMuted} 
              />
              <Text style={[styles.affiliateSubTabText, affiliateSubTab === tab.id && styles.affiliateSubTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* Action Buttons - Right side of tabs */}
        <View style={styles.affiliateActionBtnsRow}>
          {/* Create New Affiliate Button */}
          <TouchableOpacity 
            style={styles.createAffiliateBtnSmall}
            onPress={() => setShowCreateAffiliateModal(true)}
          >
            <Ionicons name="add-circle" size={18} color="#FFF" />
            <Text style={styles.createAffiliateBtnSmallText}>New Affiliate</Text>
          </TouchableOpacity>
          
          {/* Edit Levels Button */}
          <TouchableOpacity 
            style={styles.editLevelsBtn}
            onPress={() => setShowEditSettingsModal(true)}
          >
            <Ionicons name="settings-outline" size={18} color={COLORS.primary} />
            <Text style={styles.editLevelsBtnText}>Edit Levels</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      {affiliateSubTab === 'list' && (
        <View style={styles.affiliateSearchBar}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.affiliateSearchInput}
            placeholder="Search by UID, Email, or Link ID..."
            placeholderTextColor={COLORS.textMuted}
            value={affiliateSearch}
            onChangeText={setAffiliateSearch}
            onSubmitEditing={fetchAffiliateData}
          />
          {affiliateSearch ? (
            <TouchableOpacity onPress={() => { setAffiliateSearch(''); fetchAffiliateData(); }}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* Tab Content */}
      {affiliateSubTab === 'list' && (
        <>
          {/* Affiliates List */}
          <View style={[styles.sectionCard, { marginBottom: 20 }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Affiliate Partners ({affiliates.length})</Text>
            </View>
        
        {affiliates.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="git-network" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyStateText}>No affiliates yet</Text>
            <Text style={styles.emptyStateSubtext}>Create your first affiliate partner</Text>
          </View>
        ) : (
          affiliates.map((aff, index) => (
            <TouchableOpacity 
              key={aff.affiliate_id || index} 
              style={styles.affiliateItem}
              onPress={() => {
                setSelectedAffiliate(aff);
                setShowEditAffiliateModal(true);
              }}
            >
              <View style={styles.affiliateItemLeft}>
                <View style={[styles.affiliateAvatar, { backgroundColor: COLORS.primary + '20' }]}>
                  <Text style={styles.affiliateAvatarText}>{aff.name?.charAt(0) || 'A'}</Text>
                </View>
                <View style={styles.affiliateInfo}>
                  <Text style={styles.affiliateName}>{aff.name}</Text>
                  <Text style={styles.affiliateEmail}>{aff.email}</Text>
                  <Text style={styles.affiliateCode}>Code: {aff.ref_code}</Text>
                </View>
              </View>
              <View style={styles.affiliateItemRight}>
                <View style={[styles.affiliateStatusBadge, { backgroundColor: (aff.status === 'active' || aff.is_active) ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                  <Text style={[styles.affiliateStatusText, { color: (aff.status === 'active' || aff.is_active) ? COLORS.success : COLORS.warning }]}>
                    {(aff.status === 'active' || aff.is_active) ? 'Active' : 'Suspended'}
                  </Text>
                </View>
                <View style={styles.affiliateStats}>
                  <Text style={styles.affiliateStatSmall}>Referrals: {aff.total_signups || aff.total_referrals || 0}</Text>
                  <Text style={styles.affiliateStatSmall}>FTDs: {aff.total_ftds || 0}</Text>
                  <Text style={styles.affiliateStatSmall}>Earnings: ${(aff.total_earnings || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.affiliateActions}>
                  <TouchableOpacity 
                    style={styles.affiliateActionBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      setSelectedAffiliate(aff);
                      setShowEditAffiliateModal(true);
                    }}
                  >
                    <Ionicons name="pencil" size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.affiliateActionBtn, { marginLeft: 8 }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteAffiliate(aff.affiliate_id);
                    }}
                  >
                    <Ionicons name="trash" size={16} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
        </>
      )}

      {/* Leaderboard Tab */}
      {affiliateSubTab === 'leaderboard' && (
        <View style={[styles.sectionCard, { marginBottom: 20 }]}>
          <Text style={styles.sectionTitle}>🏆 Top Affiliates by Earnings</Text>
          {topAffiliates.top_by_earnings?.length > 0 ? (
            topAffiliates.top_by_earnings.map((aff: any, index: number) => (
              <TouchableOpacity 
                key={aff.affiliate_id} 
                style={styles.topAffiliateItem}
                onPress={() => fetchAffiliateProfile(aff.affiliate_id)}
              >
                <View style={styles.topAffiliateRank}>
                  <Text style={styles.topAffiliateRankText}>#{index + 1}</Text>
                </View>
                <View style={styles.topAffiliateInfo}>
                  <Text style={styles.topAffiliateName}>{aff.name}</Text>
                  <Text style={styles.topAffiliateStats}>{aff.total_referrals || 0} refs • {aff.total_ftds || 0} FTDs</Text>
                </View>
                <Text style={styles.topAffiliateEarnings}>${(aff.total_earnings || 0).toLocaleString()}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyStateText}>No affiliates yet</Text>
          )}
        </View>
      )}

      {/* Payouts Tab */}
      {affiliateSubTab === 'withdrawals' && (
        <>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Withdrawal Settings</Text>
            </View>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>Hold Period</Text>
              <Text style={styles.commissionValueText}>{payoutSettings.hold_period_days} days</Text>
            </View>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>Min Withdrawal</Text>
              <Text style={styles.commissionValueText}>${payoutSettings.min_payout}</Text>
            </View>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>Negative Carryover</Text>
              <Text style={styles.commissionValueText}>{payoutSettings.negative_balance_carryover ? 'Yes' : 'No'}</Text>
            </View>
          </View>

          <View style={[styles.sectionCard, { marginBottom: 20 }]}>
            <Text style={styles.sectionTitle}>💸 Pending Withdrawals ({affiliatePayouts.filter((p: any) => p.status === 'pending').length})</Text>
            {affiliatePayouts.length > 0 ? (
              affiliatePayouts.map((payout: any) => (
                <View key={payout._id} style={styles.payoutItem}>
                  <View style={styles.payoutInfo}>
                    <Text style={styles.payoutName}>{payout.affiliate_name || 'Unknown'}</Text>
                    <Text style={styles.payoutEmail}>{payout.affiliate_email}</Text>
                    <Text style={styles.payoutCode}>ID: {payout.affiliate_ref_code}</Text>
                    <Text style={styles.payoutAmount}>${(payout.amount || 0).toLocaleString()}</Text>
                    <Text style={styles.payoutMethod}>{payout.payment_method} - {payout.wallet_address?.substring(0, 20)}...</Text>
                    <View style={[styles.payoutStatusBadge, { backgroundColor: payout.status === 'pending' ? COLORS.warningLight : payout.status === 'approved' ? COLORS.successLight : COLORS.dangerLight }]}>
                      <Text style={[styles.payoutStatusText, { color: payout.status === 'pending' ? COLORS.warning : payout.status === 'approved' ? COLORS.success : COLORS.danger }]}>{payout.status}</Text>
                    </View>
                  </View>
                  {payout.status === 'pending' && (
                    <View style={styles.payoutActions}>
                      <TouchableOpacity 
                        style={[styles.payoutBtn, { backgroundColor: COLORS.success }]}
                        onPress={() => handleProcessPayout(payout._id, 'approve')}
                      >
                        <Text style={styles.payoutBtnText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.payoutBtn, { backgroundColor: COLORS.danger }]}
                        onPress={() => handleProcessPayout(payout._id, 'reject')}
                      >
                        <Text style={styles.payoutBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="wallet-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyStateText}>No withdrawal requests</Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* Fraud Control Tab */}
      {affiliateSubTab === 'fraud' && (
        <View style={[styles.sectionCard, { marginBottom: 20 }]}>
          <Text style={styles.sectionTitle}>🛡️ Fraud Alerts ({fraudAlerts.filter((a: any) => !a.resolved).length} active)</Text>
          {fraudAlerts.length > 0 ? (
            fraudAlerts.map((alert: any) => (
              <View key={alert._id} style={[styles.fraudAlertItem, { borderLeftColor: alert.severity === 'high' ? COLORS.danger : alert.severity === 'medium' ? COLORS.warning : COLORS.success }]}>
                <View style={styles.fraudAlertHeader}>
                  <Text style={styles.fraudAlertType}>{alert.type?.replace('_', ' ').toUpperCase()}</Text>
                  <View style={[styles.fraudSeverityBadge, { backgroundColor: alert.severity === 'high' ? COLORS.danger + '20' : alert.severity === 'medium' ? COLORS.warning + '20' : COLORS.success + '20' }]}>
                    <Text style={[styles.fraudSeverityText, { color: alert.severity === 'high' ? COLORS.danger : alert.severity === 'medium' ? COLORS.warning : COLORS.success }]}>{alert.severity}</Text>
                  </View>
                </View>
                <Text style={styles.fraudAlertMessage}>{alert.message}</Text>
                <Text style={styles.fraudAlertAffiliate}>Affiliate: {alert.affiliate_name}</Text>
                {!alert.resolved && (
                  <View style={styles.fraudAlertActions}>
                    <TouchableOpacity 
                      style={[styles.fraudBtn, { backgroundColor: COLORS.success }]}
                      onPress={() => handleResolveFraudAlert(alert._id, 'dismiss')}
                    >
                      <Text style={styles.fraudBtnText}>Dismiss</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.fraudBtn, { backgroundColor: COLORS.danger }]}
                      onPress={() => handleResolveFraudAlert(alert._id, 'ban_affiliate')}
                    >
                      <Text style={styles.fraudBtnText}>Ban Affiliate</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="shield-checkmark" size={48} color={COLORS.success} />
              <Text style={styles.emptyStateText}>No fraud alerts</Text>
            </View>
          )}
        </View>
      )}

      {/* Support Chat Tab */}
      {affiliateSubTab === 'chat' && (
        <View style={[styles.sectionCard, { marginBottom: 20 }]}>
          <Text style={styles.sectionTitle}>💬 Support Chats ({supportChats.filter((c: any) => c.unread_count > 0).length} unread)</Text>
          {supportChats.length > 0 ? (
            supportChats.map((chat: any) => (
              <TouchableOpacity key={chat._id} style={styles.chatItem}>
                <View style={styles.chatInfo}>
                  <Text style={styles.chatName}>{chat.affiliate_name}</Text>
                  <Text style={styles.chatLastMessage} numberOfLines={1}>{chat.last_message}</Text>
                </View>
                {chat.unread_count > 0 && (
                  <View style={styles.chatUnreadBadge}>
                    <Text style={styles.chatUnreadText}>{chat.unread_count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyStateText}>No support chats</Text>
            </View>
          )}
        </View>
      )}

      {/* Create Affiliate Modal */}
      <Modal visible={showCreateAffiliateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Affiliate</Text>
              <TouchableOpacity onPress={() => setShowCreateAffiliateModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Affiliate name"
                placeholderTextColor={COLORS.textMuted}
                value={newAffiliate.name}
                onChangeText={(text) => setNewAffiliate({...newAffiliate, name: text})}
              />
              
              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Email address"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                value={newAffiliate.email}
                onChangeText={(text) => setNewAffiliate({...newAffiliate, email: text})}
              />
              
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Phone number"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                value={newAffiliate.phone}
                onChangeText={(text) => setNewAffiliate({...newAffiliate, phone: text})}
              />
              
              <Text style={styles.inputLabel}>Company</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Company name"
                placeholderTextColor={COLORS.textMuted}
                value={newAffiliate.company}
                onChangeText={(text) => setNewAffiliate({...newAffiliate, company: text})}
              />
              
              <Text style={styles.inputLabel}>Affiliate Level</Text>
              <View style={styles.levelSelectorContainer}>
                {AFFILIATE_LEVELS.map((level) => {
                  const isSelected = newAffiliate.level === level.id;
                  const levelSettings = editSettings.levels?.[level.id as keyof typeof editSettings.levels];
                  
                  // Get icon for level
                  const getIcon = () => {
                    switch(level.icon) {
                      case 'star-outline': return 'star-outline';
                      case 'star': return 'star';
                      case 'diamond': return 'diamond';
                      case 'trophy': return 'trophy';
                      default: return 'star';
                    }
                  };
                  
                  return (
                    <TouchableOpacity
                      key={level.id}
                      style={[
                        styles.levelSelectorOption,
                        isSelected && { borderColor: level.color, backgroundColor: level.color + '15' }
                      ]}
                      onPress={() => setNewAffiliate({
                        ...newAffiliate, 
                        level: level.id,
                        commission_rate: levelSettings?.revenue_share || 50,
                        turnover_rate: levelSettings?.turnover_commission || 2
                      })}
                    >
                      <View style={[styles.levelIconSmall, { backgroundColor: level.color + '20' }]}>
                        <Ionicons name={getIcon() as any} size={16} color={level.color} />
                      </View>
                      <Text style={[styles.levelSelectorName, { color: level.color }]}>
                        {level.name}
                      </Text>
                      <Text style={styles.levelSelectorFTDs}>
                        {level.minFTDs}+ FTDs
                      </Text>
                      <Text style={styles.levelSelectorRates}>
                        {levelSettings?.revenue_share || 50}% / {levelSettings?.turnover_commission || 2}% TO
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={18} color={COLORS.success} style={{ position: 'absolute', top: 4, right: 4 }} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              
              <View style={styles.selectedLevelInfo}>
                <Ionicons name="information-circle" size={16} color={COLORS.info} />
                <Text style={styles.selectedLevelInfoText}>
                  Selected: {AFFILIATE_LEVELS.find(l => l.id === newAffiliate.level)?.name || 'Starter'} - 
                  Revenue Share: {newAffiliate.commission_rate}%, Turnover: {newAffiliate.turnover_rate}%
                </Text>
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => setShowCreateAffiliateModal(false)}
              >
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={handleCreateAffiliate}
                disabled={affiliateLoading}
              >
                {affiliateLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.modalBtnPrimaryText}>Create Affiliate</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Settings Modal - Level Based */}
      <Modal visible={showEditSettingsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%', width: '95%', maxWidth: 600 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Affiliate Levels</Text>
              <TouchableOpacity onPress={() => setShowEditSettingsModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Level Display List - Same as main page design */}
              <View style={styles.levelListContainer}>
                {AFFILIATE_LEVELS.map((level, index) => {
                  const levelSettings = editSettings.levels?.[level.id as keyof typeof editSettings.levels] || 
                    { revenue_share: 50, turnover_commission: 2 };
                  const isFirst = index === 0;
                  
                  // Get icon based on level
                  const getIcon = () => {
                    switch(level.icon) {
                      case 'star-outline': return 'star-outline';
                      case 'star': return 'star';
                      case 'diamond': return 'diamond';
                      case 'trophy': return 'trophy';
                      default: return 'star';
                    }
                  };
                  
                  return (
                    <View key={level.id}>
                      {/* Level Display Row */}
                      <View 
                        style={[
                          styles.levelListItem,
                          isFirst && styles.levelListItemCurrent
                        ]}
                      >
                        <View style={styles.levelListLeft}>
                          <View style={[styles.levelIconCircle, { backgroundColor: level.color + '20' }]}>
                            <Ionicons name={getIcon() as any} size={20} color={level.color} />
                          </View>
                          <View style={styles.levelListInfo}>
                            <Text style={[styles.levelListName, { color: isFirst ? COLORS.success : COLORS.text }]}>
                              {level.name}
                            </Text>
                            <Text style={styles.levelListFTDs}>{level.minFTDs}+ FTDs</Text>
                          </View>
                        </View>
                        <View style={styles.levelListRight}>
                          {isFirst && (
                            <Text style={styles.levelCurrentLabel}>CURRENT</Text>
                          )}
                          <Text style={[styles.levelListRevShare, { color: level.color }]}>
                            {levelSettings.revenue_share}%
                          </Text>
                          <Text style={styles.levelListTurnover}>
                            {levelSettings.turnover_commission}% TO
                          </Text>
                        </View>
                      </View>
                      
                      {/* Editable Inputs Row - Below each level */}
                      <View style={styles.levelEditRowCompact}>
                        <View style={styles.levelEditInputCompact}>
                          <Text style={styles.levelEditLabelCompact}>Rev Share</Text>
                          <View style={styles.inputWithSuffix}>
                            <TextInput
                              style={styles.levelEditInputFieldCompact}
                              placeholder="50"
                              placeholderTextColor={COLORS.textMuted}
                              keyboardType="numeric"
                              value={String(levelSettings.revenue_share)}
                              onChangeText={(text) => setEditSettings({
                                ...editSettings,
                                levels: {
                                  ...editSettings.levels,
                                  [level.id]: {
                                    ...editSettings.levels?.[level.id as keyof typeof editSettings.levels],
                                    revenue_share: Number(text) || 0
                                  }
                                }
                              })}
                            />
                            <Text style={styles.inputSuffix}>%</Text>
                          </View>
                        </View>
                        <View style={styles.levelEditInputCompact}>
                          <Text style={styles.levelEditLabelCompact}>Turnover</Text>
                          <View style={styles.inputWithSuffix}>
                            <TextInput
                              style={styles.levelEditInputFieldCompact}
                              placeholder="2"
                              placeholderTextColor={COLORS.textMuted}
                              keyboardType="numeric"
                              value={String(levelSettings.turnover_commission)}
                              onChangeText={(text) => setEditSettings({
                                ...editSettings,
                                levels: {
                                  ...editSettings.levels,
                                  [level.id]: {
                                    ...editSettings.levels?.[level.id as keyof typeof editSettings.levels],
                                    turnover_commission: Number(text) || 0
                                  }
                                }
                              })}
                            />
                            <Text style={styles.inputSuffix}>%</Text>
                          </View>
                        </View>
                        <View style={styles.levelEditInputCompact}>
                          <Text style={styles.levelEditLabelCompact}>Min FTDs</Text>
                          <View style={[styles.inputWithSuffix, { backgroundColor: COLORS.bgSecondary }]}>
                            <Text style={styles.levelMinFTDsDisplay}>{level.minFTDs}+</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
              
              {/* Info Text */}
              <View style={[styles.levelInfoBox, { marginTop: 16, marginBottom: 8 }]}>
                <Ionicons name="information-circle" size={16} color={COLORS.info} />
                <Text style={styles.levelInfoText}>
                  Affiliates automatically upgrade to higher levels based on total FTDs (First Time Deposits)
                </Text>
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => setShowEditSettingsModal(false)}
              >
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={handleUpdateSettings}
                disabled={affiliateLoading}
              >
                {affiliateLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.modalBtnPrimaryText}>Save Settings</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Affiliate Modal - Comprehensive Profile */}
      <Modal visible={showEditAffiliateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 700, maxHeight: '95%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Affiliate Profile</Text>
              <TouchableOpacity onPress={() => setShowEditAffiliateModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            {selectedAffiliate && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Affiliate ID & Basic Info Header */}
                <View style={styles.affProfileHeader}>
                  <View style={styles.affProfileAvatar}>
                    <Text style={styles.affProfileAvatarText}>{selectedAffiliate.name?.charAt(0) || 'A'}</Text>
                  </View>
                  <View style={styles.affProfileInfo}>
                    <Text style={styles.affProfileName}>{selectedAffiliate.name}</Text>
                    <View style={styles.affIdBadge}>
                      <Text style={styles.affIdText}>ID: {selectedAffiliate.ref_code || selectedAffiliate.affiliate_code || 'N/A'}</Text>
                    </View>
                    <Text style={styles.affProfileEmail}>{selectedAffiliate.email}</Text>
                  </View>
                  <View style={[styles.affStatusBadgeLarge, { backgroundColor: (selectedAffiliate.status === 'active' || selectedAffiliate.is_active) ? COLORS.successLight : COLORS.dangerLight }]}>
                    <Text style={[styles.affStatusTextLarge, { color: (selectedAffiliate.status === 'active' || selectedAffiliate.is_active) ? COLORS.success : COLORS.danger }]}>
                      {(selectedAffiliate.status === 'active' || selectedAffiliate.is_active) ? 'Active' : 'Suspended'}
                    </Text>
                  </View>
                </View>

                {/* Financial Stats Cards */}
                <View style={styles.affFinancialRow}>
                  <View style={[styles.affFinancialCard, { borderLeftColor: COLORS.success }]}>
                    <Text style={styles.affFinancialLabel}>Total Earnings</Text>
                    <Text style={[styles.affFinancialValue, { color: COLORS.success }]}>${(selectedAffiliate.total_earnings || 0).toLocaleString()}</Text>
                  </View>
                  <View style={[styles.affFinancialCard, { borderLeftColor: COLORS.primary }]}>
                    <Text style={styles.affFinancialLabel}>Current Balance</Text>
                    <Text style={[styles.affFinancialValue, { color: COLORS.primary }]}>${(selectedAffiliate.balance || 0).toLocaleString()}</Text>
                  </View>
                  <View style={[styles.affFinancialCard, { borderLeftColor: COLORS.warning }]}>
                    <Text style={styles.affFinancialLabel}>Total Withdrawn</Text>
                    <Text style={[styles.affFinancialValue, { color: COLORS.warning }]}>${((selectedAffiliate.total_earnings || 0) - (selectedAffiliate.balance || 0)).toLocaleString()}</Text>
                  </View>
                </View>

                {/* Stats Row */}
                <View style={styles.affStatsRow}>
                  <View style={styles.affStatBox}>
                    <Ionicons name="people" size={20} color={COLORS.primary} />
                    <Text style={styles.affStatValue}>{selectedAffiliate.total_signups || selectedAffiliate.total_registrations || 0}</Text>
                    <Text style={styles.affStatLabel}>Referrals</Text>
                  </View>
                  <View style={styles.affStatBox}>
                    <Ionicons name="wallet" size={20} color={COLORS.success} />
                    <Text style={styles.affStatValue}>{selectedAffiliate.total_ftds || 0}</Text>
                    <Text style={styles.affStatLabel}>FTDs</Text>
                  </View>
                  <View style={styles.affStatBox}>
                    <Ionicons name="link" size={20} color={COLORS.info} />
                    <Text style={styles.affStatValue}>{selectedAffiliate.total_clicks || 0}</Text>
                    <Text style={styles.affStatLabel}>Link Clicks</Text>
                  </View>
                  <View style={styles.affStatBox}>
                    <Ionicons name="shield" size={20} color={(selectedAffiliate.fraud_score || 0) > 50 ? COLORS.danger : COLORS.success} />
                    <Text style={[styles.affStatValue, { color: (selectedAffiliate.fraud_score || 0) > 50 ? COLORS.danger : COLORS.success }]}>
                      {selectedAffiliate.fraud_score || 0}%
                    </Text>
                    <Text style={styles.affStatLabel}>Fraud Score</Text>
                  </View>
                </View>

                {/* Contact Details Section */}
                <View style={styles.affSection}>
                  <Text style={styles.affSectionTitle}>📞 Contact Details</Text>
                  <View style={styles.affDetailRow}>
                    <Text style={styles.affDetailLabel}>Telegram:</Text>
                    <Text style={styles.affDetailValue}>{selectedAffiliate.telegram || 'Not provided'}</Text>
                  </View>
                  <View style={styles.affDetailRow}>
                    <Text style={styles.affDetailLabel}>Phone:</Text>
                    <Text style={styles.affDetailValue}>{selectedAffiliate.phone || 'Not provided'}</Text>
                  </View>
                  <View style={styles.affDetailRow}>
                    <Text style={styles.affDetailLabel}>Company:</Text>
                    <Text style={styles.affDetailValue}>{selectedAffiliate.company || 'Not provided'}</Text>
                  </View>
                </View>

                {/* Withdrawal Wallet Details */}
                <View style={styles.affSection}>
                  <Text style={styles.affSectionTitle}>💳 Withdrawal Wallet</Text>
                  <View style={styles.affDetailRow}>
                    <Text style={styles.affDetailLabel}>USDT (TRC20):</Text>
                    <Text style={styles.affDetailValue} numberOfLines={1}>{selectedAffiliate.usdt_trc20_address || 'Not set'}</Text>
                  </View>
                  <View style={styles.affDetailRow}>
                    <Text style={styles.affDetailLabel}>BTC:</Text>
                    <Text style={styles.affDetailValue} numberOfLines={1}>{selectedAffiliate.btc_address || 'Not set'}</Text>
                  </View>
                </View>

                {/* Referral Link */}
                <View style={styles.affSection}>
                  <Text style={styles.affSectionTitle}>🔗 Referral Links</Text>
                  <View style={styles.affLinkBox}>
                    <Text style={styles.affLinkText} numberOfLines={1}>
                      {`https://bynix.com/ref/${selectedAffiliate.ref_code || selectedAffiliate.affiliate_code || 'N/A'}`}
                    </Text>
                    <TouchableOpacity style={styles.affCopyBtn}>
                      <Ionicons name="copy" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Commission Credit/Debit Section */}
                <View style={styles.affSection}>
                  <Text style={styles.affSectionTitle}>💰 Commission Adjustment</Text>
                  <View style={styles.affAdjustmentRow}>
                    <View style={styles.affAdjustmentInput}>
                      <Text style={styles.affAdjustmentLabel}>Amount ($)</Text>
                      <TextInput
                        style={styles.affAdjustmentField}
                        keyboardType="numeric"
                        placeholder="0.00"
                        placeholderTextColor={COLORS.textMuted}
                        value={selectedAffiliate._adjustmentAmount || ''}
                        onChangeText={(text) => setSelectedAffiliate({...selectedAffiliate, _adjustmentAmount: text})}
                      />
                    </View>
                    <TouchableOpacity 
                      style={[styles.affAdjustmentBtn, { backgroundColor: COLORS.success }]}
                      onPress={async () => {
                        const amount = parseFloat(selectedAffiliate._adjustmentAmount || '0');
                        if (amount > 0) {
                          const affId = selectedAffiliate.affiliate_id || selectedAffiliate._id;
                          if (Platform.OS === 'web') {
                            if (window.confirm(`Credit $${amount} to ${selectedAffiliate.name}?`)) {
                              await handleCommissionAdjustment(affId, amount, 'credit');
                            }
                          } else {
                            Alert.alert('Credit Commission', `Credit $${amount} to ${selectedAffiliate.name}?`, [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Confirm', onPress: () => handleCommissionAdjustment(affId, amount, 'credit') }
                            ]);
                          }
                        } else {
                          if (Platform.OS === 'web') {
                            window.alert('Please enter an amount greater than 0');
                          } else {
                            Alert.alert('Error', 'Please enter an amount greater than 0');
                          }
                        }
                      }}
                    >
                      <Ionicons name="add" size={18} color="#FFF" />
                      <Text style={styles.affAdjustmentBtnText}>Credit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.affAdjustmentBtn, { backgroundColor: COLORS.danger }]}
                      onPress={async () => {
                        const amount = parseFloat(selectedAffiliate._adjustmentAmount || '0');
                        if (amount > 0) {
                          const affId = selectedAffiliate.affiliate_id || selectedAffiliate._id;
                          if (Platform.OS === 'web') {
                            if (window.confirm(`Debit $${amount} from ${selectedAffiliate.name}?`)) {
                              await handleCommissionAdjustment(affId, amount, 'debit');
                            }
                          } else {
                            Alert.alert('Debit Commission', `Debit $${amount} from ${selectedAffiliate.name}?`, [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Confirm', onPress: () => handleCommissionAdjustment(affId, amount, 'debit') }
                            ]);
                          }
                        } else {
                          if (Platform.OS === 'web') {
                            window.alert('Please enter an amount greater than 0');
                          } else {
                            Alert.alert('Error', 'Please enter an amount greater than 0');
                          }
                        }
                      }}
                    >
                      <Ionicons name="remove" size={18} color="#FFF" />
                      <Text style={styles.affAdjustmentBtnText}>Debit</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Edit Profile Fields */}
                <View style={styles.affSection}>
                  <Text style={styles.affSectionTitle}>✏️ Edit Profile</Text>
                  
                  <Text style={styles.inputLabel}>Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={selectedAffiliate.name}
                    onChangeText={(text) => setSelectedAffiliate({...selectedAffiliate, name: text})}
                  />
                  
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={selectedAffiliate.email}
                    keyboardType="email-address"
                    onChangeText={(text) => setSelectedAffiliate({...selectedAffiliate, email: text})}
                  />
                  
                  <Text style={styles.inputLabel}>Telegram ID</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={selectedAffiliate.telegram || ''}
                    placeholder="@username"
                    placeholderTextColor={COLORS.textMuted}
                    onChangeText={(text) => setSelectedAffiliate({...selectedAffiliate, telegram: text})}
                  />
                  
                  <Text style={styles.inputLabel}>Status</Text>
                  <View style={styles.statusToggle}>
                    <TouchableOpacity 
                      style={[styles.statusOption, (selectedAffiliate.status === 'active' || selectedAffiliate.is_active) && styles.statusOptionActive]}
                      onPress={() => setSelectedAffiliate({...selectedAffiliate, status: 'active', is_active: true})}
                    >
                      <Text style={[styles.statusOptionText, (selectedAffiliate.status === 'active' || selectedAffiliate.is_active) && styles.statusOptionTextActive]}>Active</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.statusOption, (selectedAffiliate.status === 'suspended' || selectedAffiliate.is_active === false) && styles.statusOptionSuspended]}
                      onPress={() => setSelectedAffiliate({...selectedAffiliate, status: 'suspended', is_active: false})}
                    >
                      <Text style={[styles.statusOptionText, (selectedAffiliate.status === 'suspended' || selectedAffiliate.is_active === false) && styles.statusOptionTextSuspended]}>Suspended</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={styles.inputLabel}>Revenue Share (%)</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={String(selectedAffiliate.commission_rate || 50)}
                    onChangeText={(text) => setSelectedAffiliate({...selectedAffiliate, commission_rate: Number(text) || 0})}
                  />
                  
                  <Text style={styles.inputLabel}>Turnover Rate (%)</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={String(selectedAffiliate.turnover_rate || 2)}
                    onChangeText={(text) => setSelectedAffiliate({...selectedAffiliate, turnover_rate: Number(text) || 0})}
                  />
                </View>

                {/* Password Change Section */}
                <View style={styles.affSection}>
                  <Text style={styles.affSectionTitle}>🔐 Change Password</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter new password"
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry
                    value={selectedAffiliate._newPassword || ''}
                    onChangeText={(text) => setSelectedAffiliate({...selectedAffiliate, _newPassword: text})}
                  />
                  <TouchableOpacity 
                    style={[styles.affChangePasswordBtn, !selectedAffiliate._newPassword && { opacity: 0.5 }]}
                    disabled={!selectedAffiliate._newPassword}
                    onPress={async () => {
                      if (selectedAffiliate._newPassword && selectedAffiliate._newPassword.length >= 6) {
                        const affId = selectedAffiliate.affiliate_id || selectedAffiliate._id;
                        if (Platform.OS === 'web') {
                          if (window.confirm('Are you sure you want to change this affiliate\'s password?')) {
                            await handleAffiliatePasswordChange(affId, selectedAffiliate._newPassword);
                          }
                        } else {
                          Alert.alert('Change Password', 'Are you sure you want to change this affiliate\'s password?', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Confirm', onPress: () => handleAffiliatePasswordChange(affId, selectedAffiliate._newPassword) }
                          ]);
                        }
                      } else {
                        if (Platform.OS === 'web') {
                          window.alert('Password must be at least 6 characters');
                        } else {
                          Alert.alert('Error', 'Password must be at least 6 characters');
                        }
                      }
                    }}
                  >
                    <Ionicons name="key" size={16} color="#FFF" />
                    <Text style={styles.affChangePasswordBtnText}>Update Password</Text>
                  </TouchableOpacity>
                </View>

                {/* Referral Clients List */}
                <View style={styles.affSection}>
                  <Text style={styles.affSectionTitle}>👥 Referred Clients ({selectedAffiliate.referred_clients?.length || 0})</Text>
                  {selectedAffiliate.referred_clients && selectedAffiliate.referred_clients.length > 0 ? (
                    selectedAffiliate.referred_clients.slice(0, 10).map((client: any, index: number) => (
                      <View key={index} style={styles.affClientRow}>
                        <View style={styles.affClientAvatar}>
                          <Text style={styles.affClientAvatarText}>{client.name?.charAt(0) || 'U'}</Text>
                        </View>
                        <View style={styles.affClientInfo}>
                          <Text style={styles.affClientName}>{client.name || client.email}</Text>
                          <Text style={styles.affClientEmail}>{client.email}</Text>
                        </View>
                        <View style={styles.affClientStats}>
                          <Text style={styles.affClientDeposit}>${client.total_deposits || 0}</Text>
                          <Text style={styles.affClientDate}>{client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'}</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.affEmptyClients}>
                      <Ionicons name="people-outline" size={32} color={COLORS.textMuted} />
                      <Text style={styles.affEmptyClientsText}>No referred clients yet</Text>
                    </View>
                  )}
                </View>

                {/* Danger Zone */}
                <View style={[styles.affSection, { borderColor: COLORS.danger, backgroundColor: COLORS.dangerLight }]}>
                  <Text style={[styles.affSectionTitle, { color: COLORS.danger }]}>⚠️ Danger Zone</Text>
                  <TouchableOpacity 
                    style={styles.affDangerBtn}
                    onPress={async () => {
                      const affId = selectedAffiliate.affiliate_id || selectedAffiliate._id;
                      if (Platform.OS === 'web') {
                        if (window.confirm(`Are you sure you want to permanently delete ${selectedAffiliate.name}? This cannot be undone.`)) {
                          await handleDeleteAffiliate(affId);
                          setShowEditAffiliateModal(false);
                        }
                      } else {
                        Alert.alert('Delete Affiliate', `Are you sure you want to permanently delete ${selectedAffiliate.name}? This cannot be undone.`, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: async () => {
                            await handleDeleteAffiliate(affId);
                            setShowEditAffiliateModal(false);
                          }}
                        ]);
                      }
                    }}
                  >
                    <Ionicons name="trash" size={18} color={COLORS.danger} />
                    <Text style={styles.affDangerBtnText}>Delete Affiliate Account</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => {
                  setSelectedAffiliate(null);
                  setShowEditAffiliateModal(false);
                }}
              >
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={handleUpdateAffiliate}
                disabled={affiliateLoading}
              >
                {affiliateLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.modalBtnPrimaryText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );

  // Staff Content
  const StaffContent = () => (
    <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Staff Management</Text>
        <Text style={styles.pageSubtitle}>Manage admin roles and permissions</Text>
      </View>

      {/* Staff Stats */}
      <View style={styles.staffStatsRow}>
        <View style={[styles.staffStatCard, { backgroundColor: COLORS.primaryLight }]}>
          <Ionicons name="shield" size={24} color={COLORS.primary} />
          <Text style={[styles.staffStatValue, { color: COLORS.primary }]}>1</Text>
          <Text style={styles.staffStatLabel}>Super Admins</Text>
        </View>
        <View style={[styles.staffStatCard, { backgroundColor: COLORS.successLight }]}>
          <Ionicons name="people" size={24} color={COLORS.success} />
          <Text style={[styles.staffStatValue, { color: COLORS.success }]}>0</Text>
          <Text style={styles.staffStatLabel}>Managers</Text>
        </View>
        <View style={[styles.staffStatCard, { backgroundColor: COLORS.warningLight }]}>
          <Ionicons name="headset" size={24} color={COLORS.warning} />
          <Text style={[styles.staffStatValue, { color: COLORS.warning }]}>0</Text>
          <Text style={styles.staffStatLabel}>Support</Text>
        </View>
      </View>

      {/* Roles */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Role Permissions</Text>
        {[
          { role: 'Super Admin', permissions: 'Full Access', color: COLORS.primary },
          { role: 'Manager', permissions: 'User & Trading Control', color: COLORS.success },
          { role: 'Support', permissions: 'User Support Only', color: COLORS.warning },
          { role: 'Finance', permissions: 'Payments Only', color: COLORS.purple },
        ].map(item => (
          <View key={item.role} style={styles.roleRow}>
            <View style={[styles.roleDot, { backgroundColor: item.color }]} />
            <View style={styles.roleInfo}>
              <Text style={styles.roleName}>{item.role}</Text>
              <Text style={styles.rolePermissions}>{item.permissions}</Text>
            </View>
            <TouchableOpacity style={styles.editRoleBtn}>
              <Ionicons name="create-outline" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Add Staff Button */}
      <TouchableOpacity style={styles.addStaffBtn}>
        <Ionicons name="person-add" size={20} color="#FFF" />
        <Text style={styles.addStaffBtnText}>Add Staff Member</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // Settings Content
  const SettingsContent = () => (
    <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Settings</Text>
        <Text style={styles.pageSubtitle}>Platform configuration</Text>
      </View>

      {/* General Settings */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>General</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="globe-outline" size={22} color={COLORS.primary} />
            <Text style={styles.settingLabel}>Platform Name</Text>
          </View>
          <Text style={styles.settingValue}>Bynix</Text>
        </View>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="mail-outline" size={22} color={COLORS.primary} />
            <Text style={styles.settingLabel}>Support Email</Text>
          </View>
          <Text style={styles.settingValue}>support@bynix.io</Text>
        </View>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="time-outline" size={22} color={COLORS.primary} />
            <Text style={styles.settingLabel}>Timezone</Text>
          </View>
          <Text style={styles.settingValue}>UTC+0</Text>
        </View>
      </View>

      {/* Security Settings */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Security</Text>
        
        <View style={styles.settingToggleRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="finger-print-outline" size={22} color={COLORS.success} />
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>2FA Required</Text>
              <Text style={styles.settingDesc}>Require 2FA for all admin logins</Text>
            </View>
          </View>
          <Switch
            value={true}
            trackColor={{ false: COLORS.border, true: COLORS.success }}
            thumbColor="#FFF"
          />
        </View>
        
        <View style={styles.settingToggleRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="location-outline" size={22} color={COLORS.warning} />
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>IP Whitelist</Text>
              <Text style={styles.settingDesc}>Only allow specific IPs</Text>
            </View>
          </View>
          <Switch
            value={false}
            trackColor={{ false: COLORS.border, true: COLORS.success }}
            thumbColor="#FFF"
          />
        </View>
        
        <View style={styles.settingToggleRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="document-text-outline" size={22} color={COLORS.info} />
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>Audit Logs</Text>
              <Text style={styles.settingDesc}>Track all admin activities</Text>
            </View>
          </View>
          <Switch
            value={true}
            trackColor={{ false: COLORS.border, true: COLORS.success }}
            thumbColor="#FFF"
          />
        </View>
      </View>

      {/* Trading Settings */}
      <View style={[styles.sectionCard, { marginBottom: 40 }]}>
        <Text style={styles.sectionTitle}>Trading</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="cash-outline" size={22} color={COLORS.success} />
            <Text style={styles.settingLabel}>Min Trade Amount</Text>
          </View>
          <Text style={styles.settingValue}>$1</Text>
        </View>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="trending-up-outline" size={22} color={COLORS.danger} />
            <Text style={styles.settingLabel}>Max Trade Amount</Text>
          </View>
          <Text style={styles.settingValue}>$10,000</Text>
        </View>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="timer-outline" size={22} color={COLORS.warning} />
            <Text style={styles.settingLabel}>Min Duration</Text>
          </View>
          <Text style={styles.settingValue}>30 seconds</Text>
        </View>
      </View>
    </ScrollView>
  );

  // Render sidebar menu items grouped by section
  const renderMenuItems = () => {
    const sections = {};
    MENU_ITEMS.forEach(item => {
      if (!sections[item.section]) sections[item.section] = [];
      sections[item.section].push(item);
    });

    return Object.entries(sections).map(([section, items]) => (
      <View key={section} style={styles.menuSection}>
        {!sidebarCollapsed && (
          <Text style={styles.menuSectionTitle}>{MENU_SECTIONS[section]}</Text>
        )}
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.menuItem, activeMenu === item.id && styles.menuItemActive]}
            onPress={() => setActiveMenu(item.id)}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons 
                name={item.icon} 
                size={20} 
                color={activeMenu === item.id ? COLORS.sidebarTextActive : COLORS.sidebarText} 
              />
              {!sidebarCollapsed && (
                <Text style={[styles.menuLabel, activeMenu === item.id && styles.menuLabelActive]}>
                  {item.label}
                </Text>
              )}
            </View>
            {!sidebarCollapsed && item.badge && (
              <View style={styles.menuBadge}>
                <Text style={styles.menuBadgeText}>{item.badge}</Text>
              </View>
            )}
            {!sidebarCollapsed && item.live && (
              <View style={styles.menuLiveDot} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    ));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Sidebar */}
      <View style={[styles.sidebar, sidebarCollapsed && styles.sidebarCollapsed]}>
        {/* Logo */}
        <View style={styles.sidebarHeader}>
          <View style={styles.textLogo}>
            <Text style={styles.textLogoText}>BYNIX</Text>
          </View>
          {!sidebarCollapsed && <Text style={styles.sidebarTitle}>ADMIN</Text>}
        </View>

        {/* Menu */}
        <ScrollView style={styles.sidebarMenu} showsVerticalScrollIndicator={false}>
          {renderMenuItems()}
        </ScrollView>

        {/* Footer */}
        <View style={styles.sidebarFooter}>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => { logout(); router.replace('/'); }}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
            {!sidebarCollapsed && <Text style={styles.logoutText}>Logout</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.menuToggle} onPress={() => setSidebarCollapsed(!sidebarCollapsed)}>
            <Ionicons name={sidebarCollapsed ? 'menu' : 'menu-outline'} size={24} color={COLORS.text} />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{MENU_ITEMS.find(m => m.id === activeMenu)?.label || 'Dashboard'}</Text>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIconBtn}>
              <Ionicons name="notifications-outline" size={22} color={COLORS.textSecondary} />
              <View style={styles.notifDot} />
            </TouchableOpacity>
            <View style={styles.adminAvatar}>
              <Text style={styles.adminAvatarText}>A</Text>
            </View>
          </View>
        </View>

        {/* Content */}
        {renderContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    width: 120,
    height: 60,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 16,
  },

  // Sidebar
  sidebar: {
    width: 260,
    backgroundColor: COLORS.sidebar,
    borderRightWidth: 0,
  },
  sidebarCollapsed: {
    width: 70,
  },
  sidebarHeader: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.sidebarHover,
  },
  sidebarLogo: {
    width: 80,
    height: 35,
  },
  sidebarTitle: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    marginTop: 6,
  },
  sidebarMenu: {
    flex: 1,
    paddingTop: 8,
  },
  menuSection: {
    marginBottom: 8,
  },
  menuSectionTitle: {
    color: COLORS.sidebarText,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    marginVertical: 2,
    borderRadius: 10,
  },
  menuItemActive: {
    backgroundColor: COLORS.sidebarActive,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuLabel: {
    color: COLORS.sidebarText,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
  },
  menuLabelActive: {
    color: COLORS.sidebarTextActive,
    fontWeight: '600',
  },
  menuBadge: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  menuBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  menuLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  sidebarFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.sidebarHover,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
  },

  // Text Logo Styles
  textLogo: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  textLogoText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  textLogoLarge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  textLogoTextLarge: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 3,
  },

  // Main Content
  mainContent: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuToggle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.cardHover,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
  },
  adminAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminAvatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  contentScroll: {
    flex: 1,
    padding: 24,
  },

  // Welcome Section
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '700',
  },
  welcomeSubtext: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  exportBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Stats Grid
  statsGrid: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statCardGradient: {
    padding: 20,
  },
  statCardContent: {},
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendUp: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  trendDown: {
    backgroundColor: 'rgba(239,68,68,0.3)',
  },
  trendText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 2,
  },
  statValue: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '800',
  },
  statTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  statSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginTop: 2,
  },

  // Section Card
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  viewAllText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },

  // Pending Grid
  pendingGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pendingIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pendingInfo: {},
  pendingValue: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  pendingLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },

  // Live Badge
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: 6,
  },
  liveText: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '700',
  },

  // Trade Row
  tradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  tradeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tradeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  tradeAsset: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  tradeUser: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  tradeAmount: {
    alignItems: 'flex-end',
  },
  tradeAmountValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  tradeResult: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },

  // User Row
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  userEmail: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  userBalance: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  userBalanceValue: {
    color: COLORS.success,
    fontSize: 14,
    fontWeight: '700',
  },
  userBalanceLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  userStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Empty State
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 12,
  },
  
  // Input Style
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
  },

  // Page Header
  pageHeader: {
    marginBottom: 24,
  },
  pageTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '700',
  },
  pageSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    color: COLORS.text,
    fontSize: 14,
  },
  filterBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Mini Stats
  miniStatsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  miniStat: {
    flex: 1,
    alignItems: 'center',
  },
  miniStatValue: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  miniStatLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
  },

  // User Card
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.cardHover,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  userCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userCardInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userCardName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  userCardEmail: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  userCardTags: {
    flexDirection: 'row',
    marginTop: 8,
  },
  userTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  userTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  userCardRight: {
    alignItems: 'flex-end',
  },
  userCardBalance: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  userCardBalanceLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
  },

  // Withdrawal Card
  withdrawalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  withdrawalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  withdrawalIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  withdrawalInfo: {
    marginLeft: 12,
    flex: 1,
  },
  withdrawalEmail: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  withdrawalAddress: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  withdrawalDate: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 4,
  },
  withdrawalRight: {
    alignItems: 'flex-end',
  },
  withdrawalAmount: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  withdrawalActions: {
    flexDirection: 'row',
  },
  wdActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  wdApproveBtn: {
    backgroundColor: COLORS.success,
  },
  wdRejectBtn: {
    backgroundColor: COLORS.danger,
  },

  // AI Control
  aiStatusCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  aiStatusGradient: {
    padding: 24,
  },
  aiStatusContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  aiStatusLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  aiStatusValue: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
  },

  // Strategy Grid
  strategyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  strategyCard: {
    flex: 1,
    backgroundColor: COLORS.cardHover,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 6,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  strategyCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  strategyIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  strategyLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  strategyDesc: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },

  // Control Header
  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlValue: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: '800',
  },

  // Slider
  sliderContainer: {
    marginBottom: 16,
  },
  sliderTrack: {
    height: 8,
    backgroundColor: COLORS.divider,
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderFill: {
    height: 8,
    borderRadius: 4,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  presetButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  presetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.cardHover,
  },
  presetBtnActive: {
    backgroundColor: COLORS.primary,
  },
  presetBtnText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  presetBtnTextActive: {
    color: '#FFF',
  },

  // Trend Buttons
  trendButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trendBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.cardHover,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  trendBtnText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Placeholder
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  placeholderTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  placeholderText: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 8,
  },

  // Phase 2 Styles - User Management Enhanced
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#FFF',
  },
  filterTabBadge: {
    backgroundColor: COLORS.cardHover,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  filterTabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterTabBadgeText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  filterTabBadgeTextActive: {
    color: '#FFF',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  userModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalAvatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  modalUserName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  modalUserEmail: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  modalBody: {
    padding: 20,
  },
  balanceCardsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  balanceCardModal: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 6,
    alignItems: 'center',
  },
  balanceCardLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  balanceCardValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  userInfoSection: {
    backgroundColor: COLORS.cardHover,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitleSmall: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  infoValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  statusBadgeSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  adjustBalanceSection: {
    backgroundColor: COLORS.cardHover,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionBtnActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  optionBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  optionBtnTextActive: {
    color: COLORS.primary,
  },
  operationBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  operationBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  operationBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  operationBtnTextActive: {
    color: '#FFF',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 12,
  },
  currencyPrefix: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
  },
  applyBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
  },
  applyBtnDisabled: {
    opacity: 0.5,
  },
  applyBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  actionButtonsSection: {
    marginBottom: 20,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Trading Control Styles
  globalToggleCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  globalToggleGradient: {
    padding: 24,
  },
  globalToggleContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  globalToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  globalToggleLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  globalToggleStatus: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
  },
  quickControlsGrid: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  quickControlCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 6,
    alignItems: 'center',
  },
  quickControlValue: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 8,
  },
  quickControlLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  addAssetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addAssetBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  assetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  assetIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  assetIconText: {
    fontSize: 12,
    fontWeight: '700',
  },
  assetSymbol: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  assetName: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  assetMiddle: {
    alignItems: 'center',
    marginRight: 16,
  },
  assetPayout: {
    color: COLORS.success,
    fontSize: 16,
    fontWeight: '700',
  },
  assetPayoutLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  assetCategory: {
    backgroundColor: COLORS.cardHover,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 12,
  },
  assetCategoryText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  payoutDesc: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 16,
  },
  payoutSlider: {
    marginTop: 8,
  },
  payoutSliderTrack: {
    height: 8,
    backgroundColor: COLORS.divider,
    borderRadius: 4,
    overflow: 'hidden',
  },
  payoutSliderFill: {
    height: 8,
    backgroundColor: COLORS.success,
    borderRadius: 4,
  },
  payoutSliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  payoutSliderLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  payoutSliderValue: {
    color: COLORS.success,
    fontSize: 16,
    fontWeight: '700',
  },

  // Live Trades Styles
  pageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 12,
  },
  liveDotLarge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginRight: 6,
  },
  liveBadgeLargeText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: '700',
  },
  liveStatsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  liveStatCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 6,
    alignItems: 'center',
  },
  liveStatValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  liveStatLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveTradeCard: {
    backgroundColor: COLORS.cardHover,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  liveTradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveTradeUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveTradeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  liveTradeAvatarText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  liveTradeEmail: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  liveTradeAsset: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  liveTradeDirection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  liveTradeDirectionText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  liveTradeBody: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  liveTradeInfo: {
    alignItems: 'center',
  },
  liveTradeLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginBottom: 4,
  },
  liveTradeValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  liveTradeActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  forceResultBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  forceResultText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Phase 3 - Analytics Styles
  timeRangeSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeRangeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  timeRangeBtnActive: {
    backgroundColor: COLORS.primary,
  },
  timeRangeBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  timeRangeBtnTextActive: {
    color: '#FFF',
  },
  analyticsGrid: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  analyticsCard: {
    flex: 1,
    padding: 18,
    borderRadius: 16,
    marginHorizontal: 6,
  },
  analyticsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  analyticsTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  analyticsTrendText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 2,
  },
  analyticsValue: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  analyticsLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  chartLegend: {
    flexDirection: 'row',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  chartPlaceholder: {
    height: 160,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 130,
  },
  chartBarGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  chartBar: {
    width: 16,
    borderRadius: 4,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  chartLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  tradingStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tradingStatItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  tradingStatValue: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
  },
  tradingStatLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 4,
  },
  topUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  topUserRank: {
    width: 30,
  },
  topUserRankText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  topUserInfo: {
    flex: 1,
    marginLeft: 10,
  },
  topUserName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  topUserEmail: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  topUserStats: {
    alignItems: 'flex-end',
  },
  topUserVolume: {
    color: COLORS.success,
    fontSize: 14,
    fontWeight: '700',
  },
  topUserLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
  },

  // Deposits Styles
  depositStatsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  depositStatCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    marginHorizontal: 6,
    alignItems: 'center',
  },
  depositStatValue: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  depositStatLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentMethodIconText: {
    fontSize: 20,
    fontWeight: '700',
  },
  paymentMethodName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  paymentMethodDeposits: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  
  // Deposit Row Styles
  depositRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  depositLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  depositIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  depositUser: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  depositDate: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  depositRight: {
    alignItems: 'flex-end',
  },
  depositAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  depositStatus: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  // Affiliates Styles
  affiliateStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  affiliateStatCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: '1%',
    borderLeftWidth: 4,
  },
  affiliateStatValue: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '800',
  },
  affiliateStatLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  commissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  commissionInfo: {
    flex: 1,
  },
  commissionLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  commissionDesc: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  commissionValue: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  commissionValueText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  createAffiliateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  createAffiliateBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  emptyStateSubtext: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  editSettingsBtn: {
    padding: 8,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
  },
  affiliateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 14,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  affiliateItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  affiliateAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  affiliateAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  affiliateInfo: {
    marginLeft: 12,
    flex: 1,
  },
  affiliateName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  affiliateEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  affiliateCode: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 4,
    fontWeight: '600',
  },
  affiliateItemRight: {
    alignItems: 'flex-end',
  },
  affiliateStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  affiliateStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  affiliateStats: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  affiliateStatSmall: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  affiliateActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  affiliateActionBtn: {
    padding: 8,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusToggle: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusOptionActive: {
    backgroundColor: COLORS.success + '20',
    borderColor: COLORS.success,
  },
  statusOptionSuspended: {
    backgroundColor: COLORS.danger + '20',
    borderColor: COLORS.danger,
  },
  statusOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  statusOptionTextActive: {
    color: COLORS.success,
  },
  statusOptionTextSuspended: {
    color: COLORS.danger,
  },

  // Affiliate Sub Tabs & New Features
  affiliateSubTabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  affiliateSubTabs: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    flex: 1,
  },
  affiliateSubTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  affiliateSubTabActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  affiliateSubTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginLeft: 6,
  },
  affiliateSubTabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  affiliateActionBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createAffiliateBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: COLORS.success,
  },
  createAffiliateBtnSmallText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 6,
  },
  editLevelsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginLeft: 8,
  },
  editLevelsBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 6,
  },
  affiliateSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  affiliateSearchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    marginLeft: 8,
    marginRight: 8,
  },
  topAffiliateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topAffiliateRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topAffiliateRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  topAffiliateInfo: {
    flex: 1,
  },
  topAffiliateName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  topAffiliateStats: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  topAffiliateEarnings: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.success,
  },
  payoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  payoutInfo: {
    flex: 1,
  },
  payoutName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  payoutAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.success,
    marginTop: 2,
  },
  payoutStatus: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  payoutActions: {
    flexDirection: 'row',
    gap: 8,
  },
  payoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  payoutBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  fraudAlertItem: {
    padding: 14,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  fraudAlertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fraudAlertType: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  fraudSeverityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  fraudSeverityText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  fraudAlertMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  fraudAlertAffiliate: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  fraudAlertActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  fraudBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  fraudBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  chatLastMessage: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  chatUnreadBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatUnreadText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Staff Styles
  staffStatsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  staffStatCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 6,
    alignItems: 'center',
  },
  staffStatValue: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8,
  },
  staffStatLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  roleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  rolePermissions: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  editRoleBtn: {
    padding: 8,
  },
  addStaffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  addStaffBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },

  // Settings Styles
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
  },
  settingValue: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  settingToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  settingTextWrap: {
    marginLeft: 12,
    flex: 1,
  },
  settingDesc: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },

  // Payout Modal Styles
  payoutModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  payoutModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  payoutModalAsset: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 24,
  },
  payoutInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 16,
    padding: 16,
  },
  payoutInput: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    width: 120,
    padding: 0,
  },
  payoutInputSuffix: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginLeft: 4,
  },
  payoutModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  payoutModalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.cardHover,
    alignItems: 'center',
  },
  payoutModalCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  payoutModalSave: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  payoutModalSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },

  // Asset Search & Filter Styles
  assetSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  assetSearchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    padding: 0,
  },
  assetCategoryFilter: {
    marginBottom: 16,
    flexGrow: 0,
  },
  assetCategoryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.bgSecondary,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  assetCategoryBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  assetCategoryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  assetCategoryBtnTextActive: {
    color: '#FFF',
  },
  assetRowDisabled: {
    opacity: 0.6,
    backgroundColor: COLORS.cardHover,
  },
  noAssetsFound: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noAssetsText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 12,
  },
  
  // Withdrawal User Stats Modal Styles
  userProfileHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 16,
  },
  userProfileName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 12,
  },
  userProfileEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  kycBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
  },
  kycBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  wdInfoCard: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  wdInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  wdInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  wdInfoLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  wdInfoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  userStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  userStatCard: {
    width: '47%',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  userStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
  },
  userStatLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  wdActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  wdMainActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  wdMainActionBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  kycModalDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  kycOptions: {
    gap: 12,
  },
  kycOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  kycOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  kycOptionInfo: {
    flex: 1,
  },
  kycOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  kycOptionDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  kycCancelBtn: {
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  kycCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  
  // KYC Submitted Button Styles
  kycSubmittedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 90, 0.2)',
  },
  kycSubmittedBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  kycSubmittedIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kycSubmittedBtnTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  kycSubmittedBtnSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  kycSubmittedBtnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kycSubmittedCount: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.success,
  },
  
  // KYC Submission Card
  kycSubmissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  kycSubmissionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  kycSubmissionInfo: {
    flex: 1,
  },
  kycSubmissionEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  kycSubmissionDetails: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  kycSubmissionDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  
  // KYC Document Preview
  kycBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  kycBackBtnText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  kycDocPreviewHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  kycDocPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  kycDocPreviewSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  kycDocImageContainer: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
    minHeight: 300,
  },
  kycDocImage: {
    width: '100%',
    height: 400,
    borderRadius: 8,
  },
  kycDocActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  kycDocActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  kycDocActionBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // KYC Verified Info Card
  kycVerifiedInfoCard: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  kycVerifiedInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  kycVerifiedInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  kycVerifiedInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  kycVerifiedInfoLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  kycVerifiedInfoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  kycDocImageLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  // KYC Content Page Styles - Stats
  kycStatsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  kycStatCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  kycStatIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  kycStatNumber: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  kycStatLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  // KYC Content Page Styles - List
  kycRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  kycUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  kycUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  kycUserEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  kycAmountInfo: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  kycAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  kycAmountLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  
  // Level-based Commission Styles
  levelCommissionTable: {
    marginTop: 8,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  levelCommissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  levelCommissionHeader: {
    backgroundColor: COLORS.bgSecondary,
  },
  levelCommissionCell: {
    flex: 1,
    alignItems: 'center',
  },
  levelCommissionHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  levelCommissionValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  levelCommissionMinRefs: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  levelInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 10,
    backgroundColor: COLORS.infoLight,
    borderRadius: 8,
    gap: 8,
  },
  levelInfoText: {
    fontSize: 12,
    color: COLORS.info,
    flex: 1,
  },
  
  // Level Edit Modal Styles
  levelEditSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  levelEditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  levelBadgeLarge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 2,
  },
  levelBadgeLargeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  levelMinRefsText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  levelEditInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  levelEditInputContainer: {
    flex: 1,
  },
  levelEditInputLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  levelEditInput: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  
  // Level Selector Styles (Create Affiliate Modal)
  levelSelectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  levelSelectorOption: {
    width: '48%',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    position: 'relative',
  },
  levelSelectorBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 6,
  },
  levelSelectorBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  levelSelectorRates: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  selectedLevelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: COLORS.infoLight,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  selectedLevelInfoText: {
    fontSize: 11,
    color: COLORS.info,
    flex: 1,
  },
  
  // New Level List Styles - Matching Affiliate Dashboard
  levelListContainer: {
    marginTop: 8,
  },
  levelListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  levelListItemCurrent: {
    backgroundColor: COLORS.successLight,
    borderRadius: 12,
    marginBottom: 4,
    borderBottomWidth: 0,
  },
  levelListLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  levelIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  levelListInfo: {
    flex: 1,
  },
  levelListName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  levelListFTDs: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  levelListRight: {
    alignItems: 'flex-end',
  },
  levelCurrentLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.success,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  levelListRevShare: {
    fontSize: 20,
    fontWeight: '800',
  },
  levelListTurnover: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  
  // Level Icon Small (Create Modal)
  levelIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  levelSelectorName: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  levelSelectorFTDs: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  
  // Compact Level Edit Styles (Modal)
  levelEditRowCompact: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.bgSecondary + '50',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  levelEditInputCompact: {
    flex: 1,
  },
  levelEditLabelCompact: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  inputWithSuffix: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  levelEditInputFieldCompact: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    padding: 0,
  },
  inputSuffix: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginLeft: 4,
  },
  levelMinFTDsDisplay: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  
  // Comprehensive Affiliate Profile Modal Styles
  affProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 16,
  },
  affProfileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  affProfileAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
  },
  affProfileInfo: {
    flex: 1,
  },
  affProfileName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  affIdBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  affIdText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  affProfileEmail: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  affStatusBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  affStatusTextLarge: {
    fontSize: 12,
    fontWeight: '700',
  },
  affFinancialRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  affFinancialCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
  },
  affFinancialLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  affFinancialValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  affStatsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  affStatBox: {
    flex: 1,
    alignItems: 'center',
  },
  affStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginVertical: 4,
  },
  affStatLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  affSection: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  affSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  affDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  affDetailLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  affDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    maxWidth: '60%',
  },
  affLinkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 8,
    padding: 12,
  },
  affLinkText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  affCopyBtn: {
    padding: 8,
    marginLeft: 8,
  },
  affAdjustmentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  affAdjustmentInput: {
    flex: 1,
  },
  affAdjustmentLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  affAdjustmentField: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  affAdjustmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 4,
  },
  affAdjustmentBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  affChangePasswordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.warning,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  affChangePasswordBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  affClientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  affClientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  affClientAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  affClientInfo: {
    flex: 1,
  },
  affClientName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  affClientEmail: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  affClientStats: {
    alignItems: 'flex-end',
  },
  affClientDeposit: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.success,
  },
  affClientDate: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  affEmptyClients: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  affEmptyClientsText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  affDangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.danger,
    gap: 8,
  },
  affDangerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.danger,
  },
});
