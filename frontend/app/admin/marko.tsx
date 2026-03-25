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
  Alert,
  Platform,
  Switch,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = 220;

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL 
  ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`
  : typeof window !== 'undefined' && window.location.origin.includes('preview.emergentagent.com')
    ? `${window.location.origin}/api`
    : 'http://localhost:8001/api';

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid-outline', color: '#635BFF' },
  { id: 'god-mode', label: 'God Mode', icon: 'flash', color: '#FF3B30' },
  { id: 'users', label: 'Users', icon: 'people-outline', color: '#007AFF' },
  { id: 'trades', label: 'Live Trades', icon: 'trending-up', color: '#00D4AA' },
  { id: 'affiliates', label: 'Affiliates', icon: 'git-network-outline', color: '#AF52DE' },
  { id: 'withdrawals', label: 'Withdrawals', icon: 'wallet-outline', color: '#FF9500' },
  { id: 'deposits', label: 'Deposits', icon: 'card-outline', color: '#34C759' },
  { id: 'assets', label: 'Assets', icon: 'cube-outline', color: '#5856D6' },
  { id: 'roles', label: 'Roles', icon: 'shield-outline', color: '#FF2D55' },
];

interface UserFull {
  user_id: string;
  email: string;
  name: string;
  account_id: string;
  country: string;
  country_flag: string;
  account_status: string;
  is_verified: boolean;
  kyc_status: string;
  tier: string;
  role: string;
  balances: { real: number; demo: number; bonus: number; locked: number };
  trading_stats: { total_trades: number; won_trades: number; lost_trades: number; win_rate: number; net_profit: number };
  financial_stats: { total_deposited: number; total_withdrawn: number; net_deposit: number };
  risk_level: string;
  risk_score: number;
  is_shadow_banned: boolean;
  is_flagged: boolean;
  last_login: string;
  created_at: string;
}

interface UserProfile {
  user_id: string;
  email: string;
  name: string;
  account_id: string;
  country: string;
  account_status: string;
  kyc_status: string;
  tier: string;
  balances: any;
  trading_summary: any;
  financial_summary: any;
  risk_profile: any;
  admin_notes: any[];
  recent_trades: any[];
  recent_deposits: any[];
  recent_withdrawals: any[];
}

interface UserSegments {
  total: number;
  active: number;
  suspended: number;
  vip: number;
  verified: number;
  flagged: number;
  shadow_banned: number;
  new_users_7d: number;
}

const TIERS = [
  { id: 'standard', name: 'Standard', color: '#8E8E93' },
  { id: 'vip', name: 'VIP', color: '#FFD700' },
  { id: 'premium', name: 'Premium', color: '#FF2D55' },
];

const STATUSES = [
  { id: 'active', name: 'Active', color: '#00D4AA' },
  { id: 'suspended', name: 'Suspended', color: '#FF9500' },
  { id: 'restricted', name: 'Restricted', color: '#FF6B6B' },
  { id: 'banned', name: 'Banned', color: '#FF3B30' },
];

const ROLES = [
  { id: 'super_admin', name: 'Super Admin', color: '#FF3B30' },
  { id: 'financial_admin', name: 'Financial', color: '#00D4AA' },
  { id: 'risk_manager', name: 'Risk Mgr', color: '#FF9500' },
  { id: 'support_agent', name: 'Support', color: '#007AFF' },
  { id: 'user', name: 'User', color: '#636366' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const { token, user, loadAuth } = useAuthStore();
  
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      await loadAuth();
      setAuthChecked(true);
    };
    checkAuth();
  }, []);
  
  useEffect(() => {
    if (authChecked && !token) {
      router.replace('/');
    }
  }, [authChecked, token]);
  
  // Data
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [users, setUsers] = useState<UserFull[]>([]);
  const [userSegments, setUserSegments] = useState<UserSegments | null>(null);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [activeTrades, setActiveTrades] = useState<any[]>([]);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [godMode, setGodMode] = useState<any>(null);
  
  // User Management
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userModalTab, setUserModalTab] = useState('overview');
  
  // Forms
  const [balanceAdjustAmount, setBalanceAdjustAmount] = useState('');
  const [balanceAdjustType, setBalanceAdjustType] = useState('real');
  const [balanceAdjustOp, setBalanceAdjustOp] = useState('add');
  const [adminNote, setAdminNote] = useState('');
  const [payoutSlider, setPayoutSlider] = useState(100);
  const [winRateSlider, setWinRateSlider] = useState(100);

  // Fetch Functions
  const fetchDashboardStats = useCallback(async () => {
    try {
      const [statsRes, tradesRes, depositsRes, withdrawalsRes] = await Promise.all([
        fetch(`${API_URL}/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/trades?limit=1000`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/deposits`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/withdrawals`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      let stats: any = { total_deposits: 0, total_withdrawals: 0, total_users: 0, total_trades: 0, users_total_profit: 0, users_total_loss: 0, platform_revenue: 0, active_users_today: 0, pending_withdrawals: 0 };

      if (statsRes.ok) {
        const data = await statsRes.json();
        Object.assign(stats, data);
      }

      if (tradesRes.ok) {
        const data = await tradesRes.json();
        const trades = data.trades || [];
        let profit = 0, loss = 0;
        trades.forEach((t: any) => {
          if (t.status === 'won') profit += Math.abs(t.profit_loss || 0);
          if (t.status === 'lost') loss += Math.abs(t.profit_loss || 0);
        });
        stats.users_total_profit = profit;
        stats.users_total_loss = loss;
        stats.platform_revenue = loss - profit;
      }

      if (depositsRes.ok) {
        const data = await depositsRes.json();
        const deps = data.deposits || [];
        stats.total_deposits = deps.filter((d: any) => d.status === 'completed').reduce((sum: number, d: any) => sum + (d.amount_usd || 0), 0);
        setDeposits(deps);
      }

      if (withdrawalsRes.ok) {
        const data = await withdrawalsRes.json();
        setWithdrawals(data.withdrawals || []);
      }

      setDashboardStats(stats);
    } catch (e) { console.error(e); }
  }, [token]);

  const fetchGodMode = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/god-mode/status`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setGodMode(data);
        setPayoutSlider(data.global_payout_modifier || 100);
        setWinRateSlider(data.global_win_rate_modifier || 100);
      }
    } catch (e) { console.error(e); }
  }, [token]);

  const fetchUsers = useCallback(async () => {
    try {
      let url = `${API_URL}/admin/users/detailed?limit=100`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (userFilter === 'vip') url += '&segment=vip';
      if (userFilter === 'flagged') url += '&profit_status=profitable';
      if (userFilter === 'suspended') url += '&status=suspended';
      
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) { console.error(e); }
  }, [token, searchQuery, userFilter]);

  const fetchUserSegments = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/users/segments`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setUserSegments(await res.json());
    } catch (e) { console.error(e); }
  }, [token]);

  const fetchUserProfile = async (userId: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/full-profile`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setSelectedUser(data);
        setShowUserModal(true);
        setUserModalTab('overview');
      }
    } catch (e) { console.error(e); }
  };

  const fetchAffiliates = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/affiliates`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setAffiliates((await res.json()).affiliates || []);
    } catch (e) { console.error(e); }
  }, [token]);

  const fetchTrades = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/trades/live`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setActiveTrades(data.active_trades || []);
        setRecentTrades(data.recent_trades || []);
      }
    } catch (e) { console.error(e); }
  }, [token]);

  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/assets`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setAssets((await res.json()).assets || []);
    } catch (e) { console.error(e); }
  }, [token]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchDashboardStats(), fetchGodMode(), fetchUsers(), fetchUserSegments(), fetchAffiliates(), fetchTrades(), fetchAssets()]);
      setLoading(false);
    };
    init();
    const interval = setInterval(() => { fetchTrades(); fetchDashboardStats(); }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { fetchUsers(); }, [searchQuery, userFilter]);

  // Actions
  const toggleKillSwitch = async (enabled: boolean) => {
    await fetch(`${API_URL}/admin/god-mode/kill-switch`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    setGodMode((p: any) => ({ ...p, trading_enabled: enabled }));
  };

  const toggleWithdrawals = async (enabled: boolean) => {
    await fetch(`${API_URL}/admin/god-mode/freeze-withdrawals`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    setGodMode((p: any) => ({ ...p, withdrawals_enabled: enabled }));
  };

  const updateGlobalPayout = async () => {
    await fetch(`${API_URL}/admin/god-mode/global-payout`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ modifier: payoutSlider })
    });
    Alert.alert('Success', `Payout: ${payoutSlider}%`);
  };

  const updateGlobalWinRate = async () => {
    await fetch(`${API_URL}/admin/god-mode/global-win-rate`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ modifier: winRateSlider })
    });
    Alert.alert('Success', `Win Rate: ${winRateSlider}%`);
  };

  const updateUserStatus = async (userId: string, status: string) => {
    await fetch(`${API_URL}/admin/users/${userId}/status`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    Alert.alert('Success', `Status: ${status}`);
    fetchUserProfile(userId);
    fetchUsers();
  };

  const adjustUserBalance = async () => {
    if (!selectedUser || !balanceAdjustAmount) return;
    await fetch(`${API_URL}/admin/users/${selectedUser.user_id}/adjust-balance`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: parseFloat(balanceAdjustAmount), balance_type: balanceAdjustType, operation: balanceAdjustOp })
    });
    Alert.alert('Success', `Balance adjusted`);
    setBalanceAdjustAmount('');
    fetchUserProfile(selectedUser.user_id);
  };

  const lockWithdrawals = async (locked: boolean) => {
    if (!selectedUser) return;
    await fetch(`${API_URL}/admin/users/${selectedUser.user_id}/lock-withdrawals`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ locked })
    });
    Alert.alert('Success', locked ? 'Withdrawals locked' : 'Withdrawals unlocked');
    fetchUserProfile(selectedUser.user_id);
  };

  const setUserTier = async (tier: string) => {
    if (!selectedUser) return;
    await fetch(`${API_URL}/admin/users/${selectedUser.user_id}/tier`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier })
    });
    Alert.alert('Success', `Tier: ${tier}`);
    fetchUserProfile(selectedUser.user_id);
  };

  const addNote = async () => {
    if (!selectedUser || !adminNote) return;
    await fetch(`${API_URL}/admin/users/${selectedUser.user_id}/notes`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: adminNote })
    });
    Alert.alert('Success', 'Note added');
    setAdminNote('');
    fetchUserProfile(selectedUser.user_id);
  };

  const verifyKYC = async (status: string) => {
    if (!selectedUser) return;
    await fetch(`${API_URL}/admin/users/${selectedUser.user_id}/kyc/verify`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    Alert.alert('Success', `KYC: ${status}`);
    fetchUserProfile(selectedUser.user_id);
  };

  const forceLogout = async () => {
    if (!selectedUser) return;
    await fetch(`${API_URL}/admin/users/${selectedUser.user_id}/force-logout`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
    });
    Alert.alert('Success', 'User logged out');
  };

  const overrideTrade = async (tradeId: string, result: 'win' | 'lose') => {
    await fetch(`${API_URL}/admin/trades/${tradeId}/override`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ result })
    });
    Alert.alert('Success', `Trade: ${result.toUpperCase()}`);
    fetchTrades();
  };

  const approveAffiliate = async (id: string) => {
    await fetch(`${API_URL}/admin/affiliates/${id}/approve`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    fetchAffiliates();
  };

  const approveWithdrawal = async (id: string) => {
    await fetch(`${API_URL}/admin/withdrawals/${id}/approve`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    fetchDashboardStats();
  };

  const toggleAsset = async (id: string) => {
    await fetch(`${API_URL}/admin/assets/${id}/toggle`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    fetchAssets();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboardStats(), fetchGodMode(), fetchUsers(), fetchUserSegments(), fetchAffiliates(), fetchTrades(), fetchAssets()]);
    setRefreshing(false);
  };

  const formatCurrency = (n: number) => {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
    return `$${(n || 0).toFixed(2)}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#635BFF" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      <View style={styles.sidebar}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>🔥 Bynix</Text>
          <Text style={styles.logoSub}>Admin</Text>
        </View>
        <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity key={item.id} style={[styles.menuItem, activeMenu === item.id && styles.menuItemActive]} onPress={() => setActiveMenu(item.id)}>
              <View style={[styles.menuIcon, { backgroundColor: activeMenu === item.id ? item.color : 'transparent' }]}>
                <Ionicons name={item.icon as any} size={18} color={activeMenu === item.id ? '#FFF' : '#8898AA'} />
              </View>
              <Text style={[styles.menuLabel, activeMenu === item.id && styles.menuLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.exitBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color="#8898AA" />
          <Text style={styles.exitText}>Exit</Text>
        </TouchableOpacity>
      </View>

      {/* Main */}
      <View style={styles.main}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{MENU_ITEMS.find(m => m.id === activeMenu)?.label || 'Dashboard'}</Text>
          <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
        </View>

        <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {/* DASHBOARD */}
          {activeMenu === 'dashboard' && dashboardStats && (
            <View style={styles.page}>
              <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: '#635BFF' }]}>
                  <Ionicons name="wallet" size={24} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.statValue}>{formatCurrency(dashboardStats.total_deposits)}</Text>
                  <Text style={styles.statLabel}>Total Deposits</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#FF6B6B' }]}>
                  <Ionicons name="arrow-up-circle" size={24} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.statValue}>{formatCurrency(dashboardStats.total_withdrawals || 0)}</Text>
                  <Text style={styles.statLabel}>Total Withdrawals</Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: '#00D4AA' }]}>
                  <Ionicons name="trending-up" size={24} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.statValue}>{formatCurrency(dashboardStats.users_total_profit)}</Text>
                  <Text style={styles.statLabel}>Users Profit</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#FF9500' }]}>
                  <Ionicons name="trending-down" size={24} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.statValue}>{formatCurrency(dashboardStats.users_total_loss)}</Text>
                  <Text style={styles.statLabel}>Users Loss</Text>
                </View>
              </View>
              <View style={styles.revenueCard}>
                <Text style={styles.revenueTitle}>Platform Revenue</Text>
                <Text style={[styles.revenueValue, { color: dashboardStats.platform_revenue >= 0 ? '#00D4AA' : '#FF3B30' }]}>
                  {dashboardStats.platform_revenue >= 0 ? '+' : ''}{formatCurrency(dashboardStats.platform_revenue)}
                </Text>
              </View>
              <View style={styles.quickGrid}>
                <View style={styles.quickCard}><Text style={styles.quickValue}>{dashboardStats.total_users}</Text><Text style={styles.quickLabel}>Users</Text></View>
                <View style={styles.quickCard}><Text style={styles.quickValue}>{dashboardStats.total_trades}</Text><Text style={styles.quickLabel}>Trades</Text></View>
                <View style={styles.quickCard}><Text style={styles.quickValue}>{dashboardStats.active_users_today}</Text><Text style={styles.quickLabel}>Active</Text></View>
                <View style={styles.quickCard}><Text style={styles.quickValue}>{dashboardStats.pending_withdrawals}</Text><Text style={styles.quickLabel}>Pending</Text></View>
              </View>
            </View>
          )}

          {/* GOD MODE */}
          {activeMenu === 'god-mode' && (
            <View style={styles.page}>
              <View style={styles.godGrid}>
                <View style={styles.godCard}>
                  <Ionicons name="power" size={24} color="#FF3B30" />
                  <Text style={styles.godTitle}>Kill Switch</Text>
                  <Switch value={godMode?.trading_enabled} onValueChange={toggleKillSwitch} trackColor={{ false: '#FF3B30', true: '#00D4AA' }} />
                </View>
                <View style={styles.godCard}>
                  <Ionicons name="snow" size={24} color="#007AFF" />
                  <Text style={styles.godTitle}>Freeze W/D</Text>
                  <Switch value={godMode?.withdrawals_enabled} onValueChange={toggleWithdrawals} trackColor={{ false: '#FF3B30', true: '#00D4AA' }} />
                </View>
              </View>
              <View style={styles.sliderCard}>
                <Text style={styles.sliderTitle}>Global Payout</Text>
                <Text style={styles.sliderValue}>{payoutSlider}%</Text>
                <View style={styles.sliderRow}>
                  <TouchableOpacity style={styles.sliderBtn} onPress={() => setPayoutSlider(Math.max(0, payoutSlider - 5))}><Ionicons name="remove" size={18} color="#FFF" /></TouchableOpacity>
                  <View style={styles.sliderTrack}><View style={[styles.sliderFill, { width: `${payoutSlider / 2}%` }]} /></View>
                  <TouchableOpacity style={styles.sliderBtn} onPress={() => setPayoutSlider(Math.min(200, payoutSlider + 5))}><Ionicons name="add" size={18} color="#FFF" /></TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.applyBtn} onPress={updateGlobalPayout}><Text style={styles.applyText}>Apply</Text></TouchableOpacity>
              </View>
              <View style={styles.sliderCard}>
                <Text style={styles.sliderTitle}>Global Win Rate</Text>
                <Text style={styles.sliderValue}>{winRateSlider}%</Text>
                <View style={styles.sliderRow}>
                  <TouchableOpacity style={styles.sliderBtn} onPress={() => setWinRateSlider(Math.max(0, winRateSlider - 5))}><Ionicons name="remove" size={18} color="#FFF" /></TouchableOpacity>
                  <View style={styles.sliderTrack}><View style={[styles.sliderFill, { width: `${winRateSlider / 2}%`, backgroundColor: '#FF9500' }]} /></View>
                  <TouchableOpacity style={styles.sliderBtn} onPress={() => setWinRateSlider(Math.min(200, winRateSlider + 5))}><Ionicons name="add" size={18} color="#FFF" /></TouchableOpacity>
                </View>
                <TouchableOpacity style={[styles.applyBtn, { backgroundColor: '#FF9500' }]} onPress={updateGlobalWinRate}><Text style={styles.applyText}>Apply</Text></TouchableOpacity>
              </View>
            </View>
          )}

          {/* USERS - ADVANCED */}
          {activeMenu === 'users' && (
            <View style={styles.page}>
              {/* Segments */}
              <View style={styles.segmentRow}>
                <TouchableOpacity style={[styles.segmentBtn, userFilter === 'all' && styles.segmentActive]} onPress={() => setUserFilter('all')}>
                  <Text style={[styles.segmentValue, userFilter === 'all' && { color: '#FFF' }]}>{userSegments?.total || 0}</Text>
                  <Text style={[styles.segmentLabel, userFilter === 'all' && { color: 'rgba(255,255,255,0.7)' }]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.segmentBtn, userFilter === 'vip' && styles.segmentActive]} onPress={() => setUserFilter('vip')}>
                  <Text style={[styles.segmentValue, userFilter === 'vip' && { color: '#FFF' }]}>{userSegments?.vip || 0}</Text>
                  <Text style={[styles.segmentLabel, userFilter === 'vip' && { color: 'rgba(255,255,255,0.7)' }]}>VIP</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.segmentBtn, userFilter === 'flagged' && styles.segmentActive]} onPress={() => setUserFilter('flagged')}>
                  <Text style={[styles.segmentValue, userFilter === 'flagged' && { color: '#FFF' }]}>{userSegments?.flagged || 0}</Text>
                  <Text style={[styles.segmentLabel, userFilter === 'flagged' && { color: 'rgba(255,255,255,0.7)' }]}>Flagged</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.segmentBtn, userFilter === 'suspended' && styles.segmentActive]} onPress={() => setUserFilter('suspended')}>
                  <Text style={[styles.segmentValue, userFilter === 'suspended' && { color: '#FFF' }]}>{userSegments?.suspended || 0}</Text>
                  <Text style={[styles.segmentLabel, userFilter === 'suspended' && { color: 'rgba(255,255,255,0.7)' }]}>Suspended</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color="#8898AA" />
                <TextInput style={styles.searchInput} placeholder="Search by email, name, ID..." placeholderTextColor="#8898AA" value={searchQuery} onChangeText={setSearchQuery} />
              </View>
              {users.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="people-outline" size={48} color="#8898AA" />
                  <Text style={styles.emptyText}>No users found</Text>
                  <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
                </View>
              ) : (
                users.map((u) => (
                  <TouchableOpacity key={u.user_id} style={styles.userCard} onPress={() => fetchUserProfile(u.user_id)}>
                    <View style={styles.userAvatar}><Text style={styles.avatarText}>{u.email?.[0]?.toUpperCase()}</Text></View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{u.name || u.email?.split('@')[0]}</Text>
                      <Text style={styles.userEmail}>{u.email}</Text>
                      <View style={styles.userMeta}>
                        <Text style={styles.userCountry}>{u.country_flag} {u.country}</Text>
                        {u.is_flagged && <View style={styles.flagBadge}><Text style={styles.flagText}>⚠️</Text></View>}
                        {u.is_shadow_banned && <View style={styles.shadowBadge}><Text style={styles.shadowText}>👻</Text></View>}
                      </View>
                    </View>
                    <View style={styles.userStats}>
                      <Text style={styles.userBalance}>{formatCurrency(u.balances?.real || 0)}</Text>
                      <Text style={[styles.userPL, { color: (u.trading_stats?.net_profit || 0) >= 0 ? '#00D4AA' : '#FF3B30' }]}>
                        {(u.trading_stats?.net_profit || 0) >= 0 ? '+' : ''}{formatCurrency(u.trading_stats?.net_profit || 0)}
                      </Text>
                      <Text style={styles.userWinRate}>{u.trading_stats?.win_rate || 0}% WR</Text>
                    </View>
                    <View style={[styles.tierBadge, { backgroundColor: TIERS.find(t => t.id === u.tier)?.color || '#8E8E93' }]}>
                      <Text style={styles.tierText}>{u.tier || 'standard'}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* TRADES */}
          {activeMenu === 'trades' && (
            <View style={styles.page}>
              <Text style={styles.sectionTitle}>🔴 Active ({activeTrades.length})</Text>
              {activeTrades.length === 0 ? (
                <View style={styles.empty}><Ionicons name="checkmark-circle" size={40} color="#00D4AA" /><Text style={styles.emptyText}>No active trades</Text></View>
              ) : activeTrades.map((t) => (
                <View key={t.trade_id} style={styles.tradeCard}>
                  <View style={styles.tradeTop}><Text style={styles.tradeAsset}>{t.asset}</Text>
                    <View style={[styles.dirBadge, { backgroundColor: t.direction === 'up' ? '#00D4AA' : '#FF3B30' }]}><Text style={styles.dirText}>{t.direction?.toUpperCase()}</Text></View>
                  </View>
                  <Text style={styles.tradeAmount}>{formatCurrency(t.amount)}</Text>
                  <Text style={styles.tradeUser}>{t.user_email}</Text>
                  <View style={styles.tradeActions}>
                    <TouchableOpacity style={[styles.tradeBtn, { backgroundColor: '#00D4AA' }]} onPress={() => overrideTrade(t.trade_id, 'win')}><Text style={styles.tradeBtnText}>WIN</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.tradeBtn, { backgroundColor: '#FF3B30' }]} onPress={() => overrideTrade(t.trade_id, 'lose')}><Text style={styles.tradeBtnText}>LOSE</Text></TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* AFFILIATES */}
          {activeMenu === 'affiliates' && (
            <View style={styles.page}>
              {affiliates.map((a) => (
                <View key={a.affiliate_id} style={styles.affCard}>
                  <View style={styles.affHeader}><Text style={styles.affEmail}>{a.email}</Text>
                    <View style={[styles.affStatus, { backgroundColor: a.status === 'active' ? '#E8F5E9' : '#FFF3E0' }]}><Text style={{ color: a.status === 'active' ? '#00D4AA' : '#FF9500', fontSize: 10, fontWeight: '700' }}>{a.status}</Text></View>
                  </View>
                  <View style={styles.affStats}>
                    <View style={styles.affStatItem}><Text style={styles.affStatVal}>{a.stats?.total_signups || 0}</Text><Text style={styles.affStatLbl}>Signups</Text></View>
                    <View style={styles.affStatItem}><Text style={styles.affStatVal}>{formatCurrency(a.stats?.total_earnings || 0)}</Text><Text style={styles.affStatLbl}>Earned</Text></View>
                  </View>
                  {a.status === 'pending' && <TouchableOpacity style={styles.approveAffBtn} onPress={() => approveAffiliate(a.affiliate_id)}><Text style={styles.approveBtnText}>APPROVE</Text></TouchableOpacity>}
                </View>
              ))}
            </View>
          )}

          {/* WITHDRAWALS */}
          {activeMenu === 'withdrawals' && (
            <View style={styles.page}>
              {withdrawals.filter((w: any) => w.status === 'pending').map((w: any) => (
                <View key={w.withdrawal_id} style={styles.wdCard}>
                  <View style={styles.wdInfo}><Text style={styles.wdEmail}>{w.user_email}</Text><Text style={styles.wdAddr}>{w.wallet_address?.slice(0, 20)}...</Text></View>
                  <Text style={styles.wdAmount}>{formatCurrency(w.amount)}</Text>
                  <TouchableOpacity style={styles.wdApprove} onPress={() => approveWithdrawal(w.withdrawal_id)}><Ionicons name="checkmark" size={18} color="#FFF" /></TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* DEPOSITS */}
          {activeMenu === 'deposits' && (
            <View style={styles.page}>
              {deposits.map((d: any, i: number) => (
                <View key={i} style={styles.depRow}>
                  <View style={[styles.depIcon, { backgroundColor: d.status === 'completed' ? '#E8F5E9' : '#FFF3E0' }]}><Ionicons name="card" size={16} color={d.status === 'completed' ? '#00D4AA' : '#FF9500'} /></View>
                  <View style={styles.depInfo}><Text style={styles.depUser}>{d.user_id?.slice(0, 12)}...</Text><Text style={styles.depType}>{d.payment_type}</Text></View>
                  <Text style={styles.depAmount}>{formatCurrency(d.amount_usd)}</Text>
                  <View style={[styles.depStatus, { backgroundColor: d.status === 'completed' ? '#E8F5E9' : '#FFF3E0' }]}><Text style={{ color: d.status === 'completed' ? '#00D4AA' : '#FF9500', fontSize: 10, fontWeight: '600' }}>{d.status}</Text></View>
                </View>
              ))}
            </View>
          )}

          {/* ASSETS */}
          {activeMenu === 'assets' && (
            <View style={styles.page}>
              {assets.map((a: any) => (
                <View key={a.asset_id} style={styles.assetCard}>
                  <View style={styles.assetInfo}><Text style={styles.assetSymbol}>{a.symbol}</Text><Text style={styles.assetName}>{a.name}</Text></View>
                  <Text style={styles.assetPayout}>{a.payout_percentage}%</Text>
                  <Switch value={a.is_active} onValueChange={() => toggleAsset(a.asset_id)} trackColor={{ false: '#FF3B30', true: '#00D4AA' }} />
                </View>
              ))}
            </View>
          )}

          {/* ROLES */}
          {activeMenu === 'roles' && (
            <View style={styles.page}>
              <View style={styles.rolesGrid}>
                {ROLES.map((r) => (
                  <View key={r.id} style={[styles.roleCard, { borderLeftColor: r.color }]}>
                    <View style={[styles.roleIcon, { backgroundColor: r.color }]}><Ionicons name="shield" size={16} color="#FFF" /></View>
                    <Text style={styles.roleName}>{r.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      {/* USER DETAIL MODAL */}
      <Modal visible={showUserModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Profile</Text>
              <TouchableOpacity onPress={() => setShowUserModal(false)}><Ionicons name="close" size={24} color="#1A1F36" /></TouchableOpacity>
            </View>
            {selectedUser && (
              <ScrollView style={styles.modalBody}>
                {/* User Header */}
                <View style={styles.profileHeader}>
                  <View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{selectedUser.email?.[0]?.toUpperCase()}</Text></View>
                  <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{selectedUser.name || selectedUser.email?.split('@')[0]}</Text>
                    <Text style={styles.profileEmail}>{selectedUser.email}</Text>
                    <Text style={styles.profileId}>ID: {selectedUser.account_id}</Text>
                  </View>
                  <View style={[styles.profileStatus, { backgroundColor: STATUSES.find(s => s.id === selectedUser.account_status)?.color || '#00D4AA' }]}>
                    <Text style={styles.profileStatusText}>{selectedUser.account_status}</Text>
                  </View>
                </View>

                {/* Tabs */}
                <View style={styles.modalTabs}>
                  {['overview', 'financial', 'risk', 'actions'].map((tab) => (
                    <TouchableOpacity key={tab} style={[styles.modalTab, userModalTab === tab && styles.modalTabActive]} onPress={() => setUserModalTab(tab)}>
                      <Text style={[styles.modalTabText, userModalTab === tab && styles.modalTabTextActive]}>{tab.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Overview Tab */}
                {userModalTab === 'overview' && (
                  <View style={styles.tabContent}>
                    <View style={styles.balanceGrid}>
                      <View style={[styles.balanceCard, { backgroundColor: '#E8F5E9' }]}><Text style={styles.balanceLabel}>Real</Text><Text style={[styles.balanceValue, { color: '#00D4AA' }]}>{formatCurrency(selectedUser.balances?.real || 0)}</Text></View>
                      <View style={[styles.balanceCard, { backgroundColor: '#E3F2FD' }]}><Text style={styles.balanceLabel}>Demo</Text><Text style={[styles.balanceValue, { color: '#007AFF' }]}>{formatCurrency(selectedUser.balances?.demo || 0)}</Text></View>
                      <View style={[styles.balanceCard, { backgroundColor: '#FFF3E0' }]}><Text style={styles.balanceLabel}>Bonus</Text><Text style={[styles.balanceValue, { color: '#FF9500' }]}>{formatCurrency(selectedUser.balances?.bonus || 0)}</Text></View>
                    </View>
                    <View style={styles.statsSection}>
                      <Text style={styles.statsSectionTitle}>Trading Stats</Text>
                      <View style={styles.statsGrid}>
                        <View style={styles.statsItem}><Text style={styles.statsItemValue}>{selectedUser.trading_summary?.total_trades || 0}</Text><Text style={styles.statsItemLabel}>Trades</Text></View>
                        <View style={styles.statsItem}><Text style={styles.statsItemValue}>{selectedUser.trading_summary?.win_rate || 0}%</Text><Text style={styles.statsItemLabel}>Win Rate</Text></View>
                        <View style={styles.statsItem}><Text style={[styles.statsItemValue, { color: (selectedUser.trading_summary?.net_profit || 0) >= 0 ? '#00D4AA' : '#FF3B30' }]}>{formatCurrency(selectedUser.trading_summary?.net_profit || 0)}</Text><Text style={styles.statsItemLabel}>Net P/L</Text></View>
                      </View>
                    </View>
                  </View>
                )}

                {/* Financial Tab */}
                {userModalTab === 'financial' && (
                  <View style={styles.tabContent}>
                    <View style={styles.finSummary}>
                      <View style={styles.finItem}><Text style={styles.finLabel}>Deposited</Text><Text style={[styles.finValue, { color: '#00D4AA' }]}>{formatCurrency(selectedUser.financial_summary?.total_deposited || 0)}</Text></View>
                      <View style={styles.finItem}><Text style={styles.finLabel}>Withdrawn</Text><Text style={[styles.finValue, { color: '#FF6B6B' }]}>{formatCurrency(selectedUser.financial_summary?.total_withdrawn || 0)}</Text></View>
                      <View style={styles.finItem}><Text style={styles.finLabel}>Net</Text><Text style={styles.finValue}>{formatCurrency(selectedUser.financial_summary?.net_deposit || 0)}</Text></View>
                    </View>
                    <Text style={styles.sectionLabel}>Adjust Balance</Text>
                    <View style={styles.adjustRow}>
                      <View style={styles.adjustTypes}>
                        {['real', 'demo', 'bonus'].map((t) => (
                          <TouchableOpacity key={t} style={[styles.adjustTypeBtn, balanceAdjustType === t && styles.adjustTypeActive]} onPress={() => setBalanceAdjustType(t)}>
                            <Text style={[styles.adjustTypeText, balanceAdjustType === t && styles.adjustTypeTextActive]}>{t}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View style={styles.adjustOps}>
                        <TouchableOpacity style={[styles.adjustOpBtn, balanceAdjustOp === 'add' && styles.adjustOpActive]} onPress={() => setBalanceAdjustOp('add')}><Text style={styles.adjustOpText}>+</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.adjustOpBtn, balanceAdjustOp === 'remove' && styles.adjustOpActive]} onPress={() => setBalanceAdjustOp('remove')}><Text style={styles.adjustOpText}>-</Text></TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.adjustInputRow}>
                      <TextInput style={styles.adjustInput} placeholder="Amount" keyboardType="numeric" value={balanceAdjustAmount} onChangeText={setBalanceAdjustAmount} />
                      <TouchableOpacity style={styles.adjustBtn} onPress={adjustUserBalance}><Text style={styles.adjustBtnText}>Apply</Text></TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Risk Tab */}
                {userModalTab === 'risk' && (
                  <View style={styles.tabContent}>
                    <View style={styles.riskScore}>
                      <Text style={styles.riskLabel}>Risk Score</Text>
                      <View style={[styles.riskBadge, { backgroundColor: (selectedUser.risk_profile?.risk_score || 0) > 70 ? '#FF3B30' : (selectedUser.risk_profile?.risk_score || 0) > 40 ? '#FF9500' : '#00D4AA' }]}>
                        <Text style={styles.riskValue}>{selectedUser.risk_profile?.risk_score || 0}</Text>
                      </View>
                    </View>
                    <View style={styles.riskControls}>
                      <View style={styles.riskRow}><Text style={styles.riskRowLabel}>Win Rate Mod</Text><Text style={styles.riskRowValue}>{selectedUser.risk_profile?.win_rate_modifier || 100}%</Text></View>
                      <View style={styles.riskRow}><Text style={styles.riskRowLabel}>Payout Mod</Text><Text style={styles.riskRowValue}>{selectedUser.risk_profile?.payout_modifier || 100}%</Text></View>
                      <View style={styles.riskRow}><Text style={styles.riskRowLabel}>W/D Locked</Text><Switch value={selectedUser.risk_profile?.withdrawal_locked} onValueChange={(v) => lockWithdrawals(v)} /></View>
                      <View style={styles.riskRow}><Text style={styles.riskRowLabel}>Shadow Banned</Text><Text style={styles.riskRowValue}>{selectedUser.risk_profile?.is_shadow_banned ? '👻 Yes' : 'No'}</Text></View>
                    </View>
                    <Text style={styles.sectionLabel}>KYC: {selectedUser.kyc_status}</Text>
                    <View style={styles.kycActions}>
                      <TouchableOpacity style={[styles.kycBtn, { backgroundColor: '#00D4AA' }]} onPress={() => verifyKYC('verified')}><Text style={styles.kycBtnText}>Verify</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.kycBtn, { backgroundColor: '#FF3B30' }]} onPress={() => verifyKYC('rejected')}><Text style={styles.kycBtnText}>Reject</Text></TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Actions Tab */}
                {userModalTab === 'actions' && (
                  <View style={styles.tabContent}>
                    <Text style={styles.sectionLabel}>Account Status</Text>
                    <View style={styles.statusBtns}>
                      {STATUSES.map((s) => (
                        <TouchableOpacity key={s.id} style={[styles.statusBtn, { backgroundColor: s.color }]} onPress={() => updateUserStatus(selectedUser.user_id, s.id)}>
                          <Text style={styles.statusBtnText}>{s.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={styles.sectionLabel}>User Tier</Text>
                    <View style={styles.tierBtns}>
                      {TIERS.map((t) => (
                        <TouchableOpacity key={t.id} style={[styles.tierBtn, { backgroundColor: t.color }]} onPress={() => setUserTier(t.id)}>
                          <Text style={styles.tierBtnText}>{t.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={styles.sectionLabel}>Admin Notes</Text>
                    <TextInput style={styles.noteInput} placeholder="Add a note..." multiline value={adminNote} onChangeText={setAdminNote} />
                    <TouchableOpacity style={styles.noteBtn} onPress={addNote}><Text style={styles.noteBtnText}>Add Note</Text></TouchableOpacity>
                    {selectedUser.admin_notes?.map((n: any, i: number) => (
                      <View key={i} style={styles.noteItem}><Text style={styles.noteText}>{n.note}</Text></View>
                    ))}
                    <TouchableOpacity style={styles.logoutBtn} onPress={forceLogout}><Text style={styles.logoutBtnText}>Force Logout</Text></TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#F6F9FC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F6F9FC' },
  loadingText: { marginTop: 12, color: '#8898AA', fontSize: 14 },
  sidebar: { width: SIDEBAR_WIDTH, backgroundColor: '#1A1F36', paddingTop: Platform.OS === 'ios' ? 50 : 30 },
  logoBox: { paddingHorizontal: 16, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#2D3448' },
  logoText: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  logoSub: { fontSize: 11, color: '#8898AA' },
  menuList: { flex: 1, paddingTop: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, marginHorizontal: 8, marginBottom: 2, borderRadius: 8 },
  menuItemActive: { backgroundColor: 'rgba(99,91,255,0.15)' },
  menuIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { marginLeft: 10, fontSize: 13, fontWeight: '500', color: '#8898AA' },
  menuLabelActive: { color: '#FFF' },
  exitBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: '#2D3448' },
  exitText: { marginLeft: 8, color: '#8898AA', fontSize: 13 },
  main: { flex: 1, backgroundColor: '#F6F9FC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 50 : 30, paddingBottom: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E6EBF1' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1F36' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF3B30', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFF', marginRight: 4 },
  liveText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  content: { flex: 1 },
  page: { padding: 16 },
  statsRow: { flexDirection: 'row', marginBottom: 12 },
  statCard: { flex: 1, padding: 16, borderRadius: 12, marginHorizontal: 4 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#FFF', marginTop: 8 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  revenueCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginHorizontal: 4, marginBottom: 12 },
  revenueTitle: { fontSize: 14, fontWeight: '600', color: '#1A1F36' },
  revenueValue: { fontSize: 32, fontWeight: '700', marginTop: 8 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  quickCard: { width: '24%', backgroundColor: '#FFF', borderRadius: 10, padding: 12, margin: '0.5%', alignItems: 'center' },
  quickValue: { fontSize: 20, fontWeight: '700', color: '#1A1F36' },
  quickLabel: { fontSize: 10, color: '#8898AA', marginTop: 2 },
  godGrid: { flexDirection: 'row', marginBottom: 12 },
  godCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginHorizontal: 4, alignItems: 'center' },
  godTitle: { fontSize: 13, fontWeight: '600', color: '#1A1F36', marginVertical: 8 },
  sliderCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, marginHorizontal: 4 },
  sliderTitle: { fontSize: 14, fontWeight: '600', color: '#1A1F36' },
  sliderValue: { fontSize: 36, fontWeight: '700', color: '#1A1F36', textAlign: 'center', marginVertical: 12 },
  sliderRow: { flexDirection: 'row', alignItems: 'center' },
  sliderBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#635BFF', justifyContent: 'center', alignItems: 'center' },
  sliderTrack: { flex: 1, height: 6, backgroundColor: '#E6EBF1', borderRadius: 3, marginHorizontal: 12, overflow: 'hidden' },
  sliderFill: { height: '100%', backgroundColor: '#635BFF', borderRadius: 3 },
  applyBtn: { backgroundColor: '#635BFF', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  applyText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  segmentRow: { flexDirection: 'row', marginBottom: 12 },
  segmentBtn: { flex: 1, backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginHorizontal: 4, alignItems: 'center' },
  segmentActive: { backgroundColor: '#635BFF' },
  segmentValue: { fontSize: 20, fontWeight: '700', color: '#1A1F36' },
  segmentLabel: { fontSize: 10, color: '#8898AA', marginTop: 2 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E6EBF1' },
  searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 14, color: '#1A1F36' },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 8 },
  userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#635BFF', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  userInfo: { flex: 1, marginLeft: 10 },
  userName: { fontSize: 14, fontWeight: '600', color: '#1A1F36' },
  userEmail: { fontSize: 11, color: '#8898AA' },
  userMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  userCountry: { fontSize: 10, color: '#8898AA' },
  flagBadge: { marginLeft: 4 },
  flagText: { fontSize: 10 },
  shadowBadge: { marginLeft: 4 },
  shadowText: { fontSize: 10 },
  userStats: { alignItems: 'flex-end', marginRight: 8 },
  userBalance: { fontSize: 14, fontWeight: '700', color: '#1A1F36' },
  userPL: { fontSize: 11, fontWeight: '600' },
  userWinRate: { fontSize: 10, color: '#8898AA' },
  tierBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  tierText: { color: '#FFF', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1A1F36', marginBottom: 12 },
  empty: { alignItems: 'center', padding: 32, backgroundColor: '#FFF', borderRadius: 12 },
  emptyText: { color: '#8898AA', marginTop: 8, fontSize: 14, fontWeight: '600' },
  emptySubtext: { color: '#A3ACB9', marginTop: 4, fontSize: 12 },
  tradeCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 10 },
  tradeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tradeAsset: { fontSize: 16, fontWeight: '700', color: '#1A1F36' },
  dirBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  dirText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  tradeAmount: { fontSize: 24, fontWeight: '700', color: '#1A1F36', marginTop: 8 },
  tradeUser: { fontSize: 11, color: '#8898AA', marginTop: 2 },
  tradeActions: { flexDirection: 'row', marginTop: 12 },
  tradeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginHorizontal: 2 },
  tradeBtnText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  affCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 10 },
  affHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  affEmail: { fontSize: 14, fontWeight: '600', color: '#1A1F36' },
  affStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  affStats: { flexDirection: 'row', marginTop: 12 },
  affStatItem: { flex: 1, alignItems: 'center' },
  affStatVal: { fontSize: 16, fontWeight: '700', color: '#1A1F36' },
  affStatLbl: { fontSize: 10, color: '#8898AA' },
  approveAffBtn: { backgroundColor: '#00D4AA', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  approveBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  wdCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 8 },
  wdInfo: { flex: 1 },
  wdEmail: { fontSize: 13, fontWeight: '600', color: '#1A1F36' },
  wdAddr: { fontSize: 10, color: '#8898AA' },
  wdAmount: { fontSize: 16, fontWeight: '700', color: '#1A1F36', marginRight: 10 },
  wdApprove: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#00D4AA', justifyContent: 'center', alignItems: 'center' },
  depRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 10, marginBottom: 6 },
  depIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  depInfo: { flex: 1, marginLeft: 10 },
  depUser: { fontSize: 12, fontWeight: '600', color: '#1A1F36' },
  depType: { fontSize: 10, color: '#8898AA' },
  depAmount: { fontSize: 14, fontWeight: '700', color: '#1A1F36', marginRight: 10 },
  depStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  assetCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 6 },
  assetInfo: { flex: 1 },
  assetSymbol: { fontSize: 14, fontWeight: '700', color: '#1A1F36' },
  assetName: { fontSize: 11, color: '#8898AA' },
  assetPayout: { fontSize: 14, fontWeight: '700', color: '#635BFF', marginRight: 12 },
  rolesGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  roleCard: { width: '48%', backgroundColor: '#FFF', borderRadius: 10, padding: 14, margin: '1%', borderLeftWidth: 3, flexDirection: 'row', alignItems: 'center' },
  roleIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  roleName: { flex: 1, marginLeft: 10, fontSize: 12, fontWeight: '600', color: '#1A1F36' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', borderRadius: 16, width: '95%', maxWidth: 500, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E6EBF1' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1A1F36' },
  modalBody: { padding: 16 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  profileAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#635BFF', justifyContent: 'center', alignItems: 'center' },
  profileAvatarText: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  profileInfo: { flex: 1, marginLeft: 12 },
  profileName: { fontSize: 16, fontWeight: '700', color: '#1A1F36' },
  profileEmail: { fontSize: 12, color: '#8898AA' },
  profileId: { fontSize: 10, color: '#A3ACB9' },
  profileStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  profileStatusText: { color: '#FFF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  modalTabs: { flexDirection: 'row', marginBottom: 16, backgroundColor: '#F6F9FC', borderRadius: 8, padding: 4 },
  modalTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  modalTabActive: { backgroundColor: '#635BFF' },
  modalTabText: { fontSize: 10, fontWeight: '600', color: '#8898AA' },
  modalTabTextActive: { color: '#FFF' },
  tabContent: {},
  balanceGrid: { flexDirection: 'row', marginBottom: 16 },
  balanceCard: { flex: 1, padding: 12, borderRadius: 10, marginHorizontal: 4, alignItems: 'center' },
  balanceLabel: { fontSize: 10, color: '#8898AA' },
  balanceValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  statsSection: { marginBottom: 16 },
  statsSectionTitle: { fontSize: 13, fontWeight: '600', color: '#1A1F36', marginBottom: 8 },
  statsGrid: { flexDirection: 'row', backgroundColor: '#F6F9FC', borderRadius: 10, padding: 12 },
  statsItem: { flex: 1, alignItems: 'center' },
  statsItemValue: { fontSize: 16, fontWeight: '700', color: '#1A1F36' },
  statsItemLabel: { fontSize: 10, color: '#8898AA', marginTop: 2 },
  finSummary: { flexDirection: 'row', marginBottom: 16 },
  finItem: { flex: 1, alignItems: 'center' },
  finLabel: { fontSize: 10, color: '#8898AA' },
  finValue: { fontSize: 16, fontWeight: '700', color: '#1A1F36', marginTop: 2 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#1A1F36', marginBottom: 8, marginTop: 8 },
  adjustRow: { flexDirection: 'row', marginBottom: 8 },
  adjustTypes: { flex: 1, flexDirection: 'row' },
  adjustTypeBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#F6F9FC', marginRight: 4 },
  adjustTypeActive: { backgroundColor: '#635BFF' },
  adjustTypeText: { fontSize: 11, fontWeight: '600', color: '#8898AA' },
  adjustTypeTextActive: { color: '#FFF' },
  adjustOps: { flexDirection: 'row' },
  adjustOpBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F6F9FC', justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
  adjustOpActive: { backgroundColor: '#635BFF' },
  adjustOpText: { fontSize: 16, fontWeight: '700', color: '#1A1F36' },
  adjustInputRow: { flexDirection: 'row' },
  adjustInput: { flex: 1, backgroundColor: '#F6F9FC', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, fontSize: 14, marginRight: 8 },
  adjustBtn: { backgroundColor: '#635BFF', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, justifyContent: 'center' },
  adjustBtnText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  riskScore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  riskLabel: { fontSize: 14, fontWeight: '600', color: '#1A1F36' },
  riskBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  riskValue: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  riskControls: { backgroundColor: '#F6F9FC', borderRadius: 10, padding: 12, marginBottom: 16 },
  riskRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E6EBF1' },
  riskRowLabel: { fontSize: 12, color: '#1A1F36' },
  riskRowValue: { fontSize: 12, fontWeight: '600', color: '#635BFF' },
  kycActions: { flexDirection: 'row' },
  kycBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  kycBtnText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  statusBtns: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  statusBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, margin: 4 },
  statusBtnText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  tierBtns: { flexDirection: 'row', marginBottom: 16 },
  tierBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  tierBtnText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  noteInput: { backgroundColor: '#F6F9FC', borderRadius: 8, padding: 12, minHeight: 60, marginBottom: 8, textAlignVertical: 'top' },
  noteBtn: { backgroundColor: '#635BFF', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  noteBtnText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  noteItem: { backgroundColor: '#F6F9FC', borderRadius: 8, padding: 10, marginBottom: 6 },
  noteText: { fontSize: 12, color: '#1A1F36' },
  logoutBtn: { backgroundColor: '#FF3B30', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  logoutBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
});
