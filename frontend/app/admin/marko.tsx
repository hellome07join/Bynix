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
const SIDEBAR_WIDTH = 240;

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL 
  ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`
  : typeof window !== 'undefined' && window.location.origin.includes('preview.emergentagent.com')
    ? `${window.location.origin}/api`
    : 'http://localhost:8001/api';

// Menu Items
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
  { id: 'settings', label: 'Settings', icon: 'settings-outline', color: '#8E8E93' },
];

interface DashboardStats {
  total_deposits: number;
  total_withdrawals: number;
  total_users: number;
  total_trades: number;
  users_total_profit: number;
  users_total_loss: number;
  platform_revenue: number;
  active_users_today: number;
  pending_withdrawals: number;
  pending_deposits: number;
}

interface Affiliate {
  affiliate_id: string;
  email: string;
  affiliate_code: string;
  status: string;
  commission_type: string;
  commission_rate: number;
  cpa_amount: number;
  stats: any;
}

interface User {
  user_id: string;
  email: string;
  name: string;
  real_balance: number;
  demo_balance: number;
  is_verified: boolean;
  role?: string;
}

const ROLES = [
  { id: 'super_admin', name: 'Super Admin', color: '#FF3B30' },
  { id: 'financial_admin', name: 'Financial Admin', color: '#00D4AA' },
  { id: 'risk_manager', name: 'Risk Manager', color: '#FF9500' },
  { id: 'support_agent', name: 'Support Agent', color: '#007AFF' },
  { id: 'auditor', name: 'Auditor', color: '#8E8E93' },
  { id: 'affiliate_manager', name: 'Affiliate Manager', color: '#AF52DE' },
  { id: 'user', name: 'User', color: '#636366' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const { token } = useAuthStore();
  
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Data
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [activeTrades, setActiveTrades] = useState<any[]>([]);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [godMode, setGodMode] = useState<any>(null);
  
  // UI
  const [searchQuery, setSearchQuery] = useState('');
  const [payoutSlider, setPayoutSlider] = useState(100);
  const [winRateSlider, setWinRateSlider] = useState(100);
  
  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAffiliateModal, setShowAffiliateModal] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);

  // Fetch Dashboard Stats
  const fetchDashboardStats = useCallback(async () => {
    try {
      // Fetch multiple endpoints and combine
      const [statsRes, tradesRes, depositsRes, withdrawalsRes] = await Promise.all([
        fetch(`${API_URL}/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/trades?limit=1000`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/deposits`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/withdrawals`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      let stats: DashboardStats = {
        total_deposits: 0,
        total_withdrawals: 0,
        total_users: 0,
        total_trades: 0,
        users_total_profit: 0,
        users_total_loss: 0,
        platform_revenue: 0,
        active_users_today: 0,
        pending_withdrawals: 0,
        pending_deposits: 0
      };

      if (statsRes.ok) {
        const data = await statsRes.json();
        stats.total_users = data.total_users || 0;
        stats.total_trades = data.total_trades || 0;
        stats.total_deposits = data.total_deposits || 0;
        stats.pending_withdrawals = data.pending_withdrawals || 0;
        stats.pending_deposits = data.pending_deposits || 0;
        stats.active_users_today = data.active_users_today || 0;
      }

      if (tradesRes.ok) {
        const data = await tradesRes.json();
        const trades = data.trades || [];
        let profit = 0, loss = 0;
        trades.forEach((t: any) => {
          if (t.status === 'won') profit += (t.profit_loss || 0);
          if (t.status === 'lost') loss += Math.abs(t.profit_loss || 0);
        });
        stats.users_total_profit = profit;
        stats.users_total_loss = loss;
        stats.platform_revenue = loss - profit; // Platform earns when users lose
      }

      if (depositsRes.ok) {
        const data = await depositsRes.json();
        const deps = data.deposits || [];
        stats.total_deposits = deps.filter((d: any) => d.status === 'completed').reduce((sum: number, d: any) => sum + (d.amount_usd || 0), 0);
      }

      if (withdrawalsRes.ok) {
        const data = await withdrawalsRes.json();
        const wds = data.withdrawals || [];
        stats.total_withdrawals = wds.filter((w: any) => w.status === 'completed').reduce((sum: number, w: any) => sum + (w.amount || 0), 0);
        setWithdrawals(wds);
      }

      setDashboardStats(stats);
    } catch (e) {
      console.error('Dashboard stats error:', e);
    }
  }, [token]);

  const fetchGodMode = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/god-mode/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
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
      const res = await fetch(`${API_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) { console.error(e); }
  }, [token]);

  const fetchAffiliates = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/affiliates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAffiliates(data.affiliates || []);
      }
    } catch (e) { console.error(e); }
  }, [token]);

  const fetchTrades = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/trades/live`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveTrades(data.active_trades || []);
        setRecentTrades(data.recent_trades || []);
      }
    } catch (e) { console.error(e); }
  }, [token]);

  const fetchDeposits = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/deposits`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDeposits(data.deposits || []);
      }
    } catch (e) { console.error(e); }
  }, [token]);

  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/assets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
      }
    } catch (e) { console.error(e); }
  }, [token]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchDashboardStats(),
        fetchGodMode(),
        fetchUsers(),
        fetchAffiliates(),
        fetchTrades(),
        fetchDeposits(),
        fetchAssets()
      ]);
      setLoading(false);
    };
    init();
    
    const interval = setInterval(() => {
      fetchTrades();
      fetchDashboardStats();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Actions
  const toggleKillSwitch = async (enabled: boolean) => {
    try {
      await fetch(`${API_URL}/admin/god-mode/kill-switch`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      setGodMode((prev: any) => ({ ...prev, trading_enabled: enabled }));
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const toggleWithdrawals = async (enabled: boolean) => {
    try {
      await fetch(`${API_URL}/admin/god-mode/freeze-withdrawals`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      setGodMode((prev: any) => ({ ...prev, withdrawals_enabled: enabled }));
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const updateGlobalPayout = async () => {
    try {
      await fetch(`${API_URL}/admin/god-mode/global-payout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ modifier: payoutSlider })
      });
      Alert.alert('Success', `Payout: ${payoutSlider}%`);
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const updateGlobalWinRate = async () => {
    try {
      await fetch(`${API_URL}/admin/god-mode/global-win-rate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ modifier: winRateSlider })
      });
      Alert.alert('Success', `Win Rate: ${winRateSlider}%`);
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const overrideTrade = async (tradeId: string, result: 'win' | 'lose') => {
    try {
      await fetch(`${API_URL}/admin/trades/${tradeId}/override`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ result })
      });
      Alert.alert('Success', `Trade: ${result.toUpperCase()}`);
      fetchTrades();
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const approveAffiliate = async (id: string) => {
    try {
      await fetch(`${API_URL}/admin/affiliates/${id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchAffiliates();
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const approveWithdrawal = async (id: string) => {
    try {
      await fetch(`${API_URL}/admin/withdrawals/${id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchDashboardStats();
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const setUserRole = async (userId: string, role: string) => {
    try {
      await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      Alert.alert('Success', `Role: ${role}`);
      setShowUserModal(false);
      fetchUsers();
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const toggleAsset = async (assetId: string) => {
    try {
      await fetch(`${API_URL}/admin/assets/${assetId}/toggle`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchAssets();
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboardStats(), fetchGodMode(), fetchUsers(), fetchAffiliates(), fetchTrades(), fetchDeposits(), fetchAssets()]);
    setRefreshing(false);
  };

  const formatCurrency = (n: number) => {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <View style={[styles.sidebar, sidebarCollapsed && styles.sidebarCollapsed]}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>🔥 Bynix</Text>
          {!sidebarCollapsed && <Text style={styles.logoSubtext}>Admin Panel</Text>}
        </View>

        {/* Menu */}
        <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, activeMenu === item.id && styles.menuItemActive]}
              onPress={() => setActiveMenu(item.id)}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: activeMenu === item.id ? item.color : 'transparent' }]}>
                <Ionicons name={item.icon as any} size={20} color={activeMenu === item.id ? '#FFF' : '#8898AA'} />
              </View>
              {!sidebarCollapsed && (
                <Text style={[styles.menuLabel, activeMenu === item.id && styles.menuLabelActive]}>
                  {item.label}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#8898AA" />
          {!sidebarCollapsed && <Text style={styles.backText}>Exit Admin</Text>}
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSidebarCollapsed(!sidebarCollapsed)}>
            <Ionicons name="menu" size={24} color="#1A1F36" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{MENU_ITEMS.find(m => m.id === activeMenu)?.label || 'Dashboard'}</Text>
          <View style={styles.headerRight}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {/* DASHBOARD */}
          {activeMenu === 'dashboard' && dashboardStats && (
            <View style={styles.dashboardContent}>
              {/* Main Stats Row */}
              <View style={styles.mainStatsRow}>
                <View style={[styles.mainStatCard, { backgroundColor: '#635BFF' }]}>
                  <Ionicons name="wallet" size={28} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.mainStatValue}>{formatCurrency(dashboardStats.total_deposits)}</Text>
                  <Text style={styles.mainStatLabel}>Total Deposits</Text>
                </View>
                <View style={[styles.mainStatCard, { backgroundColor: '#FF6B6B' }]}>
                  <Ionicons name="arrow-up-circle" size={28} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.mainStatValue}>{formatCurrency(dashboardStats.total_withdrawals)}</Text>
                  <Text style={styles.mainStatLabel}>Total Withdrawals</Text>
                </View>
              </View>

              <View style={styles.mainStatsRow}>
                <View style={[styles.mainStatCard, { backgroundColor: '#00D4AA' }]}>
                  <Ionicons name="trending-up" size={28} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.mainStatValue}>{formatCurrency(dashboardStats.users_total_profit)}</Text>
                  <Text style={styles.mainStatLabel}>Users Profit</Text>
                </View>
                <View style={[styles.mainStatCard, { backgroundColor: '#FF9500' }]}>
                  <Ionicons name="trending-down" size={28} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.mainStatValue}>{formatCurrency(dashboardStats.users_total_loss)}</Text>
                  <Text style={styles.mainStatLabel}>Users Loss</Text>
                </View>
              </View>

              {/* Platform Revenue */}
              <View style={styles.revenueCard}>
                <View style={styles.revenueHeader}>
                  <Text style={styles.revenueTitle}>Platform Revenue</Text>
                  <View style={[styles.revenueBadge, { backgroundColor: dashboardStats.platform_revenue >= 0 ? '#E8F5E9' : '#FFEBEE' }]}>
                    <Text style={[styles.revenueBadgeText, { color: dashboardStats.platform_revenue >= 0 ? '#00D4AA' : '#FF3B30' }]}>
                      {dashboardStats.platform_revenue >= 0 ? 'PROFIT' : 'LOSS'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.revenueValue, { color: dashboardStats.platform_revenue >= 0 ? '#00D4AA' : '#FF3B30' }]}>
                  {dashboardStats.platform_revenue >= 0 ? '+' : ''}{formatCurrency(dashboardStats.platform_revenue)}
                </Text>
                <Text style={styles.revenueSubtext}>Net = User Losses - User Profits</Text>
              </View>

              {/* Quick Stats */}
              <View style={styles.quickStatsGrid}>
                <View style={styles.quickStatCard}>
                  <Ionicons name="people" size={24} color="#635BFF" />
                  <Text style={styles.quickStatValue}>{dashboardStats.total_users}</Text>
                  <Text style={styles.quickStatLabel}>Total Users</Text>
                </View>
                <View style={styles.quickStatCard}>
                  <Ionicons name="bar-chart" size={24} color="#00D4AA" />
                  <Text style={styles.quickStatValue}>{dashboardStats.total_trades}</Text>
                  <Text style={styles.quickStatLabel}>Total Trades</Text>
                </View>
                <View style={styles.quickStatCard}>
                  <Ionicons name="flash" size={24} color="#FF9500" />
                  <Text style={styles.quickStatValue}>{dashboardStats.active_users_today}</Text>
                  <Text style={styles.quickStatLabel}>Active Today</Text>
                </View>
                <View style={styles.quickStatCard}>
                  <Ionicons name="time" size={24} color="#FF3B30" />
                  <Text style={styles.quickStatValue}>{dashboardStats.pending_withdrawals}</Text>
                  <Text style={styles.quickStatLabel}>Pending W/D</Text>
                </View>
              </View>

              {/* Recent Activity */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Recent Trades</Text>
                {recentTrades.slice(0, 5).map((t, i) => (
                  <View key={i} style={styles.activityRow}>
                    <View style={[styles.activityIcon, { backgroundColor: t.status === 'won' ? '#E8F5E9' : '#FFEBEE' }]}>
                      <Ionicons name={t.status === 'won' ? 'checkmark' : 'close'} size={16} color={t.status === 'won' ? '#00D4AA' : '#FF3B30'} />
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityTitle}>{t.asset}</Text>
                      <Text style={styles.activitySubtitle}>{t.user_email?.split('@')[0]}</Text>
                    </View>
                    <Text style={[styles.activityAmount, { color: (t.profit_loss || 0) >= 0 ? '#00D4AA' : '#FF3B30' }]}>
                      {formatCurrency(t.profit_loss || 0)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* GOD MODE */}
          {activeMenu === 'god-mode' && (
            <View style={styles.pageContent}>
              <View style={styles.godModeGrid}>
                <View style={styles.godModeCard}>
                  <View style={styles.godModeHeader}>
                    <Ionicons name="power" size={24} color="#FF3B30" />
                    <Text style={styles.godModeTitle}>Kill Switch</Text>
                  </View>
                  <Text style={styles.godModeDesc}>Disable all trading instantly</Text>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchStatus}>{godMode?.trading_enabled ? 'ENABLED' : 'DISABLED'}</Text>
                    <Switch value={godMode?.trading_enabled} onValueChange={toggleKillSwitch} trackColor={{ false: '#FF3B30', true: '#00D4AA' }} />
                  </View>
                </View>

                <View style={styles.godModeCard}>
                  <View style={styles.godModeHeader}>
                    <Ionicons name="snow" size={24} color="#007AFF" />
                    <Text style={styles.godModeTitle}>Freeze Withdrawals</Text>
                  </View>
                  <Text style={styles.godModeDesc}>Block all withdrawal requests</Text>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchStatus}>{godMode?.withdrawals_enabled ? 'OPEN' : 'FROZEN'}</Text>
                    <Switch value={godMode?.withdrawals_enabled} onValueChange={toggleWithdrawals} trackColor={{ false: '#FF3B30', true: '#00D4AA' }} />
                  </View>
                </View>
              </View>

              <View style={styles.sliderCard}>
                <Text style={styles.sliderTitle}>Global Payout Modifier</Text>
                <Text style={styles.sliderValue}>{payoutSlider}%</Text>
                <View style={styles.sliderControls}>
                  <TouchableOpacity style={styles.sliderBtn} onPress={() => setPayoutSlider(Math.max(0, payoutSlider - 5))}>
                    <Ionicons name="remove" size={20} color="#FFF" />
                  </TouchableOpacity>
                  <View style={styles.sliderTrack}>
                    <View style={[styles.sliderFill, { width: `${payoutSlider / 2}%`, backgroundColor: '#635BFF' }]} />
                  </View>
                  <TouchableOpacity style={styles.sliderBtn} onPress={() => setPayoutSlider(Math.min(200, payoutSlider + 5))}>
                    <Ionicons name="add" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.applyBtn} onPress={updateGlobalPayout}>
                  <Text style={styles.applyBtnText}>Apply Changes</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.sliderCard}>
                <Text style={styles.sliderTitle}>Global Win Rate Modifier</Text>
                <Text style={styles.sliderValue}>{winRateSlider}%</Text>
                <View style={styles.sliderControls}>
                  <TouchableOpacity style={styles.sliderBtn} onPress={() => setWinRateSlider(Math.max(0, winRateSlider - 5))}>
                    <Ionicons name="remove" size={20} color="#FFF" />
                  </TouchableOpacity>
                  <View style={styles.sliderTrack}>
                    <View style={[styles.sliderFill, { width: `${winRateSlider / 2}%`, backgroundColor: '#FF9500' }]} />
                  </View>
                  <TouchableOpacity style={styles.sliderBtn} onPress={() => setWinRateSlider(Math.min(200, winRateSlider + 5))}>
                    <Ionicons name="add" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={[styles.applyBtn, { backgroundColor: '#FF9500' }]} onPress={updateGlobalWinRate}>
                  <Text style={styles.applyBtnText}>Apply Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* USERS */}
          {activeMenu === 'users' && (
            <View style={styles.pageContent}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#8898AA" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search users..."
                  placeholderTextColor="#8898AA"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              {filteredUsers.map((user) => (
                <TouchableOpacity key={user.user_id} style={styles.userCard} onPress={() => { setSelectedUser(user); setShowUserModal(true); }}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>{user.email?.[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.name || user.email?.split('@')[0]}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                  </View>
                  <View style={styles.userBalanceCol}>
                    <Text style={styles.userBalance}>{formatCurrency(user.real_balance)}</Text>
                    <Text style={styles.userBalanceLabel}>Balance</Text>
                  </View>
                  <View style={[styles.userRoleBadge, { backgroundColor: ROLES.find(r => r.id === user.role)?.color || '#636366' }]}>
                    <Text style={styles.userRoleText}>{user.role || 'user'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* TRADES */}
          {activeMenu === 'trades' && (
            <View style={styles.pageContent}>
              <Text style={styles.sectionTitle}>🔴 Active Trades ({activeTrades.length})</Text>
              {activeTrades.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-circle" size={48} color="#00D4AA" />
                  <Text style={styles.emptyText}>No active trades</Text>
                </View>
              ) : (
                activeTrades.map((trade) => (
                  <View key={trade.trade_id} style={styles.tradeCard}>
                    <View style={styles.tradeTop}>
                      <Text style={styles.tradeAsset}>{trade.asset}</Text>
                      <View style={[styles.directionBadge, { backgroundColor: trade.direction === 'up' ? '#00D4AA' : '#FF3B30' }]}>
                        <Ionicons name={trade.direction === 'up' ? 'arrow-up' : 'arrow-down'} size={14} color="#FFF" />
                        <Text style={styles.directionText}>{trade.direction?.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={styles.tradeAmount}>{formatCurrency(trade.amount)}</Text>
                    <Text style={styles.tradeUser}>{trade.user_email}</Text>
                    <View style={styles.tradeActions}>
                      <TouchableOpacity style={[styles.tradeBtn, { backgroundColor: '#00D4AA' }]} onPress={() => overrideTrade(trade.trade_id, 'win')}>
                        <Text style={styles.tradeBtnText}>FORCE WIN</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.tradeBtn, { backgroundColor: '#FF3B30' }]} onPress={() => overrideTrade(trade.trade_id, 'lose')}>
                        <Text style={styles.tradeBtnText}>FORCE LOSE</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}

              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>📊 Recent Trades</Text>
              {recentTrades.slice(0, 20).map((t, i) => (
                <View key={i} style={styles.recentTradeRow}>
                  <Text style={styles.recentAsset}>{t.asset}</Text>
                  <Text style={styles.recentAmount}>{formatCurrency(t.amount)}</Text>
                  <View style={[styles.statusPill, { backgroundColor: t.status === 'won' ? '#E8F5E9' : '#FFEBEE' }]}>
                    <Text style={[styles.statusPillText, { color: t.status === 'won' ? '#00D4AA' : '#FF3B30' }]}>{t.status}</Text>
                  </View>
                  <Text style={[styles.recentPL, { color: (t.profit_loss || 0) >= 0 ? '#00D4AA' : '#FF3B30' }]}>
                    {formatCurrency(t.profit_loss || 0)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* AFFILIATES */}
          {activeMenu === 'affiliates' && (
            <View style={styles.pageContent}>
              <Text style={styles.sectionTitle}>👥 Affiliates</Text>
              {affiliates.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color="#8898AA" />
                  <Text style={styles.emptyText}>No affiliates</Text>
                </View>
              ) : (
                affiliates.map((aff) => (
                  <View key={aff.affiliate_id} style={styles.affiliateCard}>
                    <View style={styles.affHeader}>
                      <View>
                        <Text style={styles.affEmail}>{aff.email}</Text>
                        <Text style={styles.affCode}>Code: {aff.affiliate_code}</Text>
                      </View>
                      <View style={[styles.affStatus, { backgroundColor: aff.status === 'active' ? '#E8F5E9' : '#FFF3E0' }]}>
                        <Text style={[styles.affStatusText, { color: aff.status === 'active' ? '#00D4AA' : '#FF9500' }]}>{aff.status}</Text>
                      </View>
                    </View>
                    <View style={styles.affStats}>
                      <View style={styles.affStatItem}>
                        <Text style={styles.affStatValue}>{aff.stats?.total_signups || 0}</Text>
                        <Text style={styles.affStatLabel}>Signups</Text>
                      </View>
                      <View style={styles.affStatItem}>
                        <Text style={styles.affStatValue}>{formatCurrency(aff.stats?.total_deposits || 0)}</Text>
                        <Text style={styles.affStatLabel}>Deposits</Text>
                      </View>
                      <View style={styles.affStatItem}>
                        <Text style={[styles.affStatValue, { color: '#00D4AA' }]}>{formatCurrency(aff.stats?.total_earnings || 0)}</Text>
                        <Text style={styles.affStatLabel}>Earned</Text>
                      </View>
                    </View>
                    {aff.status === 'pending' && (
                      <TouchableOpacity style={styles.approveAffBtn} onPress={() => approveAffiliate(aff.affiliate_id)}>
                        <Text style={styles.approveAffBtnText}>APPROVE</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </View>
          )}

          {/* WITHDRAWALS */}
          {activeMenu === 'withdrawals' && (
            <View style={styles.pageContent}>
              <Text style={styles.sectionTitle}>💸 Pending Withdrawals</Text>
              {withdrawals.filter(w => w.status === 'pending').length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-circle" size={48} color="#00D4AA" />
                  <Text style={styles.emptyText}>No pending withdrawals</Text>
                </View>
              ) : (
                withdrawals.filter(w => w.status === 'pending').map((w) => (
                  <View key={w.withdrawal_id} style={styles.withdrawalCard}>
                    <View style={styles.wdInfo}>
                      <Text style={styles.wdEmail}>{w.user_email}</Text>
                      <Text style={styles.wdAddress}>{w.wallet_address?.slice(0, 20)}...</Text>
                    </View>
                    <Text style={styles.wdAmount}>{formatCurrency(w.amount)}</Text>
                    <TouchableOpacity style={styles.wdApproveBtn} onPress={() => approveWithdrawal(w.withdrawal_id)}>
                      <Ionicons name="checkmark" size={20} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}

          {/* DEPOSITS */}
          {activeMenu === 'deposits' && (
            <View style={styles.pageContent}>
              <Text style={styles.sectionTitle}>💰 Recent Deposits</Text>
              {deposits.map((d, i) => (
                <View key={i} style={styles.depositRow}>
                  <View style={[styles.depositIcon, { backgroundColor: d.status === 'completed' ? '#E8F5E9' : '#FFF3E0' }]}>
                    <Ionicons name="card" size={18} color={d.status === 'completed' ? '#00D4AA' : '#FF9500'} />
                  </View>
                  <View style={styles.depositInfo}>
                    <Text style={styles.depositUser}>{d.user_id?.slice(0, 12)}...</Text>
                    <Text style={styles.depositType}>{d.payment_type}</Text>
                  </View>
                  <Text style={styles.depositAmount}>{formatCurrency(d.amount_usd)}</Text>
                  <View style={[styles.depositStatus, { backgroundColor: d.status === 'completed' ? '#E8F5E9' : '#FFF3E0' }]}>
                    <Text style={[styles.depositStatusText, { color: d.status === 'completed' ? '#00D4AA' : '#FF9500' }]}>{d.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ASSETS */}
          {activeMenu === 'assets' && (
            <View style={styles.pageContent}>
              <Text style={styles.sectionTitle}>📊 Trading Assets</Text>
              {assets.map((a) => (
                <View key={a.asset_id} style={styles.assetCard}>
                  <View style={styles.assetInfo}>
                    <Text style={styles.assetSymbol}>{a.symbol}</Text>
                    <Text style={styles.assetName}>{a.name}</Text>
                  </View>
                  <Text style={styles.assetPayout}>{a.payout_percentage}%</Text>
                  <Switch value={a.is_active} onValueChange={() => toggleAsset(a.asset_id)} trackColor={{ false: '#FF3B30', true: '#00D4AA' }} />
                </View>
              ))}
            </View>
          )}

          {/* ROLES */}
          {activeMenu === 'roles' && (
            <View style={styles.pageContent}>
              <Text style={styles.sectionTitle}>👑 Role Hierarchy</Text>
              <View style={styles.rolesGrid}>
                {ROLES.slice(0, -1).map((role) => (
                  <View key={role.id} style={[styles.roleCard, { borderLeftColor: role.color }]}>
                    <View style={[styles.roleIcon, { backgroundColor: role.color }]}>
                      <Ionicons name="shield" size={20} color="#FFF" />
                    </View>
                    <Text style={styles.roleName}>{role.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* SETTINGS */}
          {activeMenu === 'settings' && (
            <View style={styles.pageContent}>
              <Text style={styles.sectionTitle}>⚙️ Settings</Text>
              <View style={styles.emptyState}>
                <Ionicons name="settings" size={48} color="#8898AA" />
                <Text style={styles.emptyText}>Settings coming soon</Text>
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      {/* User Role Modal */}
      <Modal visible={showUserModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Role</Text>
              <TouchableOpacity onPress={() => setShowUserModal(false)}>
                <Ionicons name="close" size={24} color="#1A1F36" />
              </TouchableOpacity>
            </View>
            {selectedUser && (
              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalEmail}>{selectedUser.email}</Text>
                {ROLES.map((role) => (
                  <TouchableOpacity
                    key={role.id}
                    style={[styles.roleOption, { borderLeftColor: role.color }]}
                    onPress={() => setUserRole(selectedUser.user_id, role.id)}
                  >
                    <Text style={styles.roleOptionText}>{role.name}</Text>
                    {selectedUser.role === role.id && <Ionicons name="checkmark-circle" size={20} color="#00D4AA" />}
                  </TouchableOpacity>
                ))}
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
  
  // Sidebar
  sidebar: { width: SIDEBAR_WIDTH, backgroundColor: '#1A1F36', paddingTop: Platform.OS === 'ios' ? 50 : 30 },
  sidebarCollapsed: { width: 70 },
  logoContainer: { paddingHorizontal: 20, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: '#2D3448' },
  logoText: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  logoSubtext: { fontSize: 12, color: '#8898AA', marginTop: 2 },
  menuContainer: { flex: 1, paddingTop: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, marginHorizontal: 8, marginBottom: 4, borderRadius: 8 },
  menuItemActive: { backgroundColor: 'rgba(99, 91, 255, 0.15)' },
  menuIconContainer: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { marginLeft: 12, fontSize: 14, fontWeight: '500', color: '#8898AA' },
  menuLabelActive: { color: '#FFF' },
  backButton: { flexDirection: 'row', alignItems: 'center', padding: 20, borderTopWidth: 1, borderTopColor: '#2D3448' },
  backText: { marginLeft: 12, color: '#8898AA', fontSize: 14 },
  
  // Main Content
  mainContent: { flex: 1, backgroundColor: '#F6F9FC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 50 : 30, paddingBottom: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E6EBF1' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A1F36' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF3B30', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF', marginRight: 4 },
  liveText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  content: { flex: 1 },
  
  // Dashboard
  dashboardContent: { padding: 24 },
  mainStatsRow: { flexDirection: 'row', marginBottom: 16 },
  mainStatCard: { flex: 1, padding: 20, borderRadius: 16, marginHorizontal: 8 },
  mainStatValue: { fontSize: 28, fontWeight: '700', color: '#FFF', marginTop: 12 },
  mainStatLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  revenueCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, marginHorizontal: 8, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  revenueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  revenueTitle: { fontSize: 16, fontWeight: '600', color: '#1A1F36' },
  revenueBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  revenueBadgeText: { fontSize: 11, fontWeight: '700' },
  revenueValue: { fontSize: 42, fontWeight: '700', marginTop: 12 },
  revenueSubtext: { fontSize: 13, color: '#8898AA', marginTop: 8 },
  quickStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 0 },
  quickStatCard: { width: '23%', backgroundColor: '#FFF', borderRadius: 12, padding: 16, margin: '1%', alignItems: 'center' },
  quickStatValue: { fontSize: 24, fontWeight: '700', color: '#1A1F36', marginTop: 8 },
  quickStatLabel: { fontSize: 11, color: '#8898AA', marginTop: 4, textAlign: 'center' },
  sectionCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginTop: 16, marginHorizontal: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1F36', marginBottom: 16 },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F3F7' },
  activityIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  activityInfo: { flex: 1, marginLeft: 12 },
  activityTitle: { fontSize: 14, fontWeight: '600', color: '#1A1F36' },
  activitySubtitle: { fontSize: 12, color: '#8898AA', marginTop: 2 },
  activityAmount: { fontSize: 14, fontWeight: '700' },
  
  // Page Content
  pageContent: { padding: 24 },
  
  // God Mode
  godModeGrid: { flexDirection: 'row', marginBottom: 16 },
  godModeCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginHorizontal: 8 },
  godModeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  godModeTitle: { fontSize: 16, fontWeight: '700', color: '#1A1F36', marginLeft: 10 },
  godModeDesc: { fontSize: 13, color: '#8898AA', marginBottom: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchStatus: { fontSize: 14, fontWeight: '600', color: '#1A1F36' },
  sliderCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, marginHorizontal: 8, marginTop: 16 },
  sliderTitle: { fontSize: 16, fontWeight: '700', color: '#1A1F36' },
  sliderValue: { fontSize: 48, fontWeight: '700', color: '#1A1F36', textAlign: 'center', marginVertical: 16 },
  sliderControls: { flexDirection: 'row', alignItems: 'center' },
  sliderBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#635BFF', justifyContent: 'center', alignItems: 'center' },
  sliderTrack: { flex: 1, height: 8, backgroundColor: '#E6EBF1', borderRadius: 4, marginHorizontal: 16, overflow: 'hidden' },
  sliderFill: { height: '100%', borderRadius: 4 },
  applyBtn: { backgroundColor: '#635BFF', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  applyBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  
  // Users
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E6EBF1' },
  searchInput: { flex: 1, paddingVertical: 14, paddingHorizontal: 8, fontSize: 14, color: '#1A1F36' },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 8 },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#635BFF', justifyContent: 'center', alignItems: 'center' },
  userAvatarText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 14, fontWeight: '600', color: '#1A1F36' },
  userEmail: { fontSize: 12, color: '#8898AA', marginTop: 2 },
  userBalanceCol: { alignItems: 'flex-end', marginRight: 12 },
  userBalance: { fontSize: 16, fontWeight: '700', color: '#00D4AA' },
  userBalanceLabel: { fontSize: 10, color: '#8898AA' },
  userRoleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  userRoleText: { color: '#FFF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  
  // Trades
  emptyState: { alignItems: 'center', paddingVertical: 48, backgroundColor: '#FFF', borderRadius: 16 },
  emptyText: { color: '#8898AA', fontSize: 14, marginTop: 12 },
  tradeCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 12 },
  tradeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tradeAsset: { fontSize: 18, fontWeight: '700', color: '#1A1F36' },
  directionBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  directionText: { color: '#FFF', fontSize: 12, fontWeight: '700', marginLeft: 4 },
  tradeAmount: { fontSize: 28, fontWeight: '700', color: '#1A1F36', marginTop: 12 },
  tradeUser: { fontSize: 13, color: '#8898AA', marginTop: 4 },
  tradeActions: { flexDirection: 'row', marginTop: 16 },
  tradeBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginHorizontal: 4 },
  tradeBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  recentTradeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 14, borderRadius: 10, marginBottom: 6 },
  recentAsset: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1A1F36' },
  recentAmount: { fontSize: 14, fontWeight: '600', color: '#1A1F36', marginRight: 12 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 12 },
  statusPillText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  recentPL: { fontSize: 14, fontWeight: '700', minWidth: 70, textAlign: 'right' },
  
  // Affiliates
  affiliateCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 12 },
  affHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  affEmail: { fontSize: 15, fontWeight: '600', color: '#1A1F36' },
  affCode: { fontSize: 12, color: '#8898AA', marginTop: 4 },
  affStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  affStatusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  affStats: { flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F3F7' },
  affStatItem: { flex: 1, alignItems: 'center' },
  affStatValue: { fontSize: 18, fontWeight: '700', color: '#1A1F36' },
  affStatLabel: { fontSize: 11, color: '#8898AA', marginTop: 2 },
  approveAffBtn: { backgroundColor: '#00D4AA', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 16 },
  approveAffBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  
  // Withdrawals
  withdrawalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 8 },
  wdInfo: { flex: 1 },
  wdEmail: { fontSize: 14, fontWeight: '600', color: '#1A1F36' },
  wdAddress: { fontSize: 11, color: '#8898AA', marginTop: 2 },
  wdAmount: { fontSize: 18, fontWeight: '700', color: '#1A1F36', marginRight: 12 },
  wdApproveBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#00D4AA', justifyContent: 'center', alignItems: 'center' },
  
  // Deposits
  depositRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 14, borderRadius: 10, marginBottom: 6 },
  depositIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  depositInfo: { flex: 1, marginLeft: 12 },
  depositUser: { fontSize: 13, fontWeight: '600', color: '#1A1F36' },
  depositType: { fontSize: 11, color: '#8898AA', marginTop: 2 },
  depositAmount: { fontSize: 16, fontWeight: '700', color: '#1A1F36', marginRight: 12 },
  depositStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  depositStatusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  
  // Assets
  assetCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 8 },
  assetInfo: { flex: 1 },
  assetSymbol: { fontSize: 16, fontWeight: '700', color: '#1A1F36' },
  assetName: { fontSize: 12, color: '#8898AA', marginTop: 2 },
  assetPayout: { fontSize: 16, fontWeight: '700', color: '#635BFF', marginRight: 16 },
  
  // Roles
  rolesGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  roleCard: { width: '48%', backgroundColor: '#FFF', borderRadius: 12, padding: 20, margin: '1%', borderLeftWidth: 4, flexDirection: 'row', alignItems: 'center' },
  roleIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  roleName: { flex: 1, marginLeft: 12, fontSize: 14, fontWeight: '600', color: '#1A1F36' },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', borderRadius: 20, width: '90%', maxWidth: 400, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E6EBF1' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1F36' },
  modalBody: { padding: 20 },
  modalEmail: { fontSize: 16, fontWeight: '600', color: '#1A1F36', marginBottom: 20 },
  roleOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F6F9FC', padding: 16, borderRadius: 12, marginBottom: 8, borderLeftWidth: 4 },
  roleOptionText: { fontSize: 14, fontWeight: '600', color: '#1A1F36' },
});
