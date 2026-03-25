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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../stores/authStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const [tradingEnabled, setTradingEnabled] = useState(true);
  const [godModeStatus, setGodModeStatus] = useState(null);
  
  // User Edit States
  const [editBalance, setEditBalance] = useState('');
  const [balanceOperation, setBalanceOperation] = useState('add'); // add, subtract, set
  const [balanceType, setBalanceType] = useState('real'); // real, demo, bonus
  
  // Live Trades
  const [liveTrades, setLiveTrades] = useState([]);

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
      
      // Fetch assets
      const assetsRes = await fetch(`${API_URL}/assets`, { headers });
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
      const interval = setInterval(fetchDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [token, fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
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
        user.user_id?.includes(userSearchQuery);
      
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

    const handleBanUser = async (userId, shouldBan) => {
      try {
        const response = await fetch(`${API_URL}/admin/users/${userId}/ban`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ banned: shouldBan })
        });
        
        if (response.ok) {
          fetchDashboardData();
          setShowUserModal(false);
        }
      } catch (error) {
        console.error('Ban user error:', error);
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
                    <Text style={styles.infoLabel}>User ID</Text>
                    <Text style={styles.infoValue}>{selectedUser?.user_id?.slice(0, 8)}...</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status</Text>
                    <View style={[styles.statusBadgeSmall, { backgroundColor: selectedUser?.is_verified ? COLORS.successLight : COLORS.warningLight }]}>
                      <Text style={[styles.statusBadgeText, { color: selectedUser?.is_verified ? COLORS.success : COLORS.warning }]}>
                        {selectedUser?.is_verified ? 'Verified' : 'Unverified'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>KYC Status</Text>
                    <Text style={styles.infoValue}>{selectedUser?.kyc_status || 'Not Submitted'}</Text>
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
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.warningLight }]}>
                      <Ionicons name="document-text" size={20} color={COLORS.warning} />
                      <Text style={[styles.actionBtnText, { color: COLORS.warning }]}>View KYC</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.infoLight }]}>
                      <Ionicons name="time" size={20} color={COLORS.info} />
                      <Text style={[styles.actionBtnText, { color: COLORS.info }]}>Trade History</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: selectedUser?.is_banned ? COLORS.successLight : COLORS.dangerLight }]}
                      onPress={() => handleBanUser(selectedUser?.user_id, !selectedUser?.is_banned)}
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
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.purpleLight }]}>
                      <Ionicons name="mail" size={20} color={COLORS.purple} />
                      <Text style={[styles.actionBtnText, { color: COLORS.purple }]}>Send Email</Text>
                    </TouchableOpacity>
                  </View>
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
          <Text style={[styles.miniStatValue, { color: COLORS.success }]}>{withdrawals.filter(w => w.status === 'completed').length}</Text>
          <Text style={styles.miniStatLabel}>Approved</Text>
        </View>
        <View style={styles.miniStat}>
          <Text style={[styles.miniStatValue, { color: COLORS.danger }]}>{withdrawals.filter(w => w.status === 'rejected').length}</Text>
          <Text style={styles.miniStatLabel}>Rejected</Text>
        </View>
      </View>

      {/* Withdrawals List */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Pending Requests</Text>
        
        {withdrawals.filter(w => w.status === 'pending').length > 0 ? (
          withdrawals.filter(w => w.status === 'pending').map((wd, index) => (
            <View key={wd.withdrawal_id || index} style={styles.withdrawalCard}>
              <View style={styles.withdrawalLeft}>
                <View style={[styles.withdrawalIcon, { backgroundColor: COLORS.warningLight }]}>
                  <Ionicons name="time" size={20} color={COLORS.warning} />
                </View>
                <View style={styles.withdrawalInfo}>
                  <Text style={styles.withdrawalEmail}>{wd.user_email || 'User'}</Text>
                  <Text style={styles.withdrawalAddress}>{wd.wallet_address?.slice(0, 20)}...</Text>
                  <Text style={styles.withdrawalDate}>{wd.created_at?.split('T')[0] || 'N/A'}</Text>
                </View>
              </View>
              <View style={styles.withdrawalRight}>
                <Text style={styles.withdrawalAmount}>${wd.amount?.toFixed(2) || 0}</Text>
                <View style={styles.withdrawalActions}>
                  <TouchableOpacity style={[styles.wdActionBtn, styles.wdApproveBtn]}>
                    <Ionicons name="checkmark" size={18} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.wdActionBtn, styles.wdRejectBtn]}>
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
    </ScrollView>
  );

  // AI Control Content
  const AIControlContent = () => (
    <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>AI Trading Automation</Text>
        <Text style={styles.pageSubtitle}>Control AI-powered trading system</Text>
      </View>

      {/* AI Status Card */}
      <View style={styles.aiStatusCard}>
        <LinearGradient colors={COLORS.gradient5} style={styles.aiStatusGradient}>
          <View style={styles.aiStatusContent}>
            <View style={styles.aiStatusLeft}>
              <View style={styles.aiIcon}>
                <Ionicons name="hardware-chip" size={32} color="#FFF" />
              </View>
              <View>
                <Text style={styles.aiStatusLabel}>AI System Status</Text>
                <Text style={styles.aiStatusValue}>ACTIVE</Text>
              </View>
            </View>
            <Switch
              value={true}
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
            <TouchableOpacity key={strategy.id} style={[styles.strategyCard, strategy.id === 'balanced' && styles.strategyCardActive]}>
              <View style={[styles.strategyIcon, { backgroundColor: strategy.color + '15' }]}>
                <Ionicons name={strategy.icon} size={24} color={strategy.color} />
              </View>
              <Text style={styles.strategyLabel}>{strategy.label}</Text>
              <Text style={styles.strategyDesc}>{strategy.desc}</Text>
              {strategy.id === 'balanced' && (
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
          <Text style={styles.controlValue}>45%</Text>
        </View>
        <View style={styles.sliderContainer}>
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, { width: '45%', backgroundColor: COLORS.primary }]} />
          </View>
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>0%</Text>
            <Text style={styles.sliderLabel}>50%</Text>
            <Text style={styles.sliderLabel}>100%</Text>
          </View>
        </View>
        <View style={styles.presetButtons}>
          {['25%', '35%', '45%', '55%', '65%'].map((preset) => (
            <TouchableOpacity 
              key={preset} 
              style={[styles.presetBtn, preset === '45%' && styles.presetBtnActive]}
            >
              <Text style={[styles.presetBtnText, preset === '45%' && styles.presetBtnTextActive]}>{preset}</Text>
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
              style={[styles.trendBtn, trend.id === 'sideways' && { backgroundColor: trend.color + '15', borderColor: trend.color }]}
            >
              <Ionicons name={trend.icon} size={20} color={trend.id === 'sideways' ? trend.color : COLORS.textMuted} />
              <Text style={[styles.trendBtnText, trend.id === 'sideways' && { color: trend.color }]}>{trend.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );

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
            <Text style={styles.sectionTitle}>Trading Assets ({tradingAssets.length})</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
              <Ionicons name="refresh" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {tradingAssets.slice(0, 20).map((asset, index) => (
            <View key={asset.asset_id || asset.symbol || index} style={styles.assetRow}>
              <View style={styles.assetLeft}>
                <View style={[styles.assetIcon, { backgroundColor: asset.is_active ? COLORS.primaryLight : COLORS.cardHover }]}>
                  <Text style={[styles.assetIconText, { color: asset.is_active ? COLORS.primary : COLORS.textMuted }]}>
                    {(asset.symbol || '').slice(0, 3)}
                  </Text>
                </View>
                <View>
                  <Text style={styles.assetSymbol}>{asset.symbol}</Text>
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
                <Text style={styles.assetPayout}>{asset.payout_percentage || 85}%</Text>
                <Text style={styles.assetPayoutLabel}>Tap to Edit</Text>
              </TouchableOpacity>
              <View style={styles.assetCategory}>
                <Text style={styles.assetCategoryText}>{asset.category || 'Other'}</Text>
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
          
          {tradingAssets.length > 20 && (
            <Text style={styles.moreAssetsText}>+ {tradingAssets.length - 20} more assets</Text>
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
          <Text style={[styles.liveStatValue, { color: COLORS.primary }]}>{liveTrades.length || recentTrades.length}</Text>
          <Text style={styles.liveStatLabel}>Active Trades</Text>
        </View>
        <View style={[styles.liveStatCard, { backgroundColor: COLORS.successLight }]}>
          <Text style={[styles.liveStatValue, { color: COLORS.success }]}>
            ${recentTrades.filter(t => t.direction === 'call').reduce((sum, t) => sum + (t.amount || 0), 0).toFixed(0)}
          </Text>
          <Text style={styles.liveStatLabel}>Call Volume</Text>
        </View>
        <View style={[styles.liveStatCard, { backgroundColor: COLORS.dangerLight }]}>
          <Text style={[styles.liveStatValue, { color: COLORS.danger }]}>
            ${recentTrades.filter(t => t.direction === 'put').reduce((sum, t) => sum + (t.amount || 0), 0).toFixed(0)}
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

        {(liveTrades.length > 0 ? liveTrades : recentTrades).map((trade, index) => (
          <View key={trade.trade_id || index} style={styles.liveTradeCard}>
            <View style={styles.liveTradeHeader}>
              <View style={styles.liveTradeUser}>
                <View style={styles.liveTradeAvatar}>
                  <Text style={styles.liveTradeAvatarText}>
                    {(trade.user_email || 'U')[0].toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.liveTradeEmail}>{trade.user_email || 'User'}</Text>
                  <Text style={styles.liveTradeAsset}>{trade.asset || 'BTCUSDT'}</Text>
                </View>
              </View>
              <View style={[
                styles.liveTradeDirection,
                { backgroundColor: trade.direction === 'call' ? COLORS.successLight : COLORS.dangerLight }
              ]}>
                <Ionicons 
                  name={trade.direction === 'call' ? 'arrow-up' : 'arrow-down'} 
                  size={16} 
                  color={trade.direction === 'call' ? COLORS.success : COLORS.danger} 
                />
                <Text style={[
                  styles.liveTradeDirectionText,
                  { color: trade.direction === 'call' ? COLORS.success : COLORS.danger }
                ]}>
                  {trade.direction?.toUpperCase() || 'CALL'}
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
                <Text style={styles.liveTradeValue}>95%</Text>
              </View>
            </View>

            <View style={styles.liveTradeActions}>
              <TouchableOpacity style={[styles.forceResultBtn, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="checkmark" size={16} color={COLORS.success} />
                <Text style={[styles.forceResultText, { color: COLORS.success }]}>Force Win</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.forceResultBtn, { backgroundColor: COLORS.dangerLight }]}>
                <Ionicons name="close" size={16} color={COLORS.danger} />
                <Text style={[styles.forceResultText, { color: COLORS.danger }]}>Force Loss</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.forceResultBtn, { backgroundColor: COLORS.warningLight }]}>
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
      case 'kyc':
        return <UsersContent />;
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
  const AnalyticsContent = () => (
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
            style={[styles.timeRangeBtn, range === '7D' && styles.timeRangeBtnActive]}
          >
            <Text style={[styles.timeRangeBtnText, range === '7D' && styles.timeRangeBtnTextActive]}>
              {range}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
            ${formatNumber(stats.totalDeposits)}
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
            ${formatNumber(stats.totalWithdrawals)}
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
            ${formatNumber(stats.platformProfit)}
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
        
        {recentUsers.slice(0, 5).map((user, index) => (
          <View key={user.user_id || index} style={styles.topUserRow}>
            <View style={styles.topUserRank}>
              <Text style={[styles.topUserRankText, index < 3 && { color: COLORS.warning }]}>
                #{index + 1}
              </Text>
            </View>
            <View style={[styles.userAvatar, { width: 36, height: 36, borderRadius: 18 }]}>
              <Text style={[styles.userAvatarText, { fontSize: 14 }]}>
                {(user.name || user.email || 'U')[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.topUserInfo}>
              <Text style={styles.topUserName}>{user.name || 'Unnamed'}</Text>
              <Text style={styles.topUserEmail}>{user.email}</Text>
            </View>
            <View style={styles.topUserStats}>
              <Text style={styles.topUserVolume}>${(user.real_balance || 0).toFixed(0)}</Text>
              <Text style={styles.topUserLabel}>Volume</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  // Deposits Content
  const DepositsContent = () => (
    <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Deposit Management</Text>
        <Text style={styles.pageSubtitle}>Monitor and manage user deposits</Text>
      </View>

      {/* Deposit Stats */}
      <View style={styles.depositStatsRow}>
        <View style={[styles.depositStatCard, { backgroundColor: COLORS.successLight }]}>
          <Ionicons name="checkmark-circle" size={28} color={COLORS.success} />
          <Text style={[styles.depositStatValue, { color: COLORS.success }]}>
            ${formatNumber(stats.totalDeposits)}
          </Text>
          <Text style={styles.depositStatLabel}>Total Deposits</Text>
        </View>
        <View style={[styles.depositStatCard, { backgroundColor: COLORS.warningLight }]}>
          <Ionicons name="time" size={28} color={COLORS.warning} />
          <Text style={[styles.depositStatValue, { color: COLORS.warning }]}>0</Text>
          <Text style={styles.depositStatLabel}>Pending</Text>
        </View>
        <View style={[styles.depositStatCard, { backgroundColor: COLORS.primaryLight }]}>
          <Ionicons name="today" size={28} color={COLORS.primary} />
          <Text style={[styles.depositStatValue, { color: COLORS.primary }]}>$0</Text>
          <Text style={styles.depositStatLabel}>Today</Text>
        </View>
      </View>

      {/* Deposit Methods */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Payment Methods</Text>
        {[
          { name: 'USDT TRC20', icon: '₮', color: '#26A17B', enabled: true, deposits: 45 },
          { name: 'Bitcoin', icon: '₿', color: '#F7931A', enabled: true, deposits: 23 },
          { name: 'Ethereum', icon: 'Ξ', color: '#627EEA', enabled: false, deposits: 12 },
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
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.emptyState}>
          <Ionicons name="wallet" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyStateText}>No recent deposits</Text>
        </View>
      </View>
    </ScrollView>
  );

  // Affiliates Content
  const AffiliatesContent = () => (
    <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Affiliate Management</Text>
        <Text style={styles.pageSubtitle}>Manage affiliate partners and commissions</Text>
      </View>

      {/* Affiliate Stats */}
      <View style={styles.affiliateStatsGrid}>
        <View style={[styles.affiliateStatCard, { borderLeftColor: COLORS.primary }]}>
          <Text style={styles.affiliateStatValue}>0</Text>
          <Text style={styles.affiliateStatLabel}>Total Affiliates</Text>
        </View>
        <View style={[styles.affiliateStatCard, { borderLeftColor: COLORS.success }]}>
          <Text style={styles.affiliateStatValue}>0</Text>
          <Text style={styles.affiliateStatLabel}>Active</Text>
        </View>
        <View style={[styles.affiliateStatCard, { borderLeftColor: COLORS.warning }]}>
          <Text style={styles.affiliateStatValue}>$0</Text>
          <Text style={styles.affiliateStatLabel}>Total Paid</Text>
        </View>
        <View style={[styles.affiliateStatCard, { borderLeftColor: COLORS.danger }]}>
          <Text style={styles.affiliateStatValue}>$0</Text>
          <Text style={styles.affiliateStatLabel}>Pending Payouts</Text>
        </View>
      </View>

      {/* Commission Settings */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Commission Settings</Text>
        <View style={styles.commissionRow}>
          <View style={styles.commissionInfo}>
            <Text style={styles.commissionLabel}>Revenue Share</Text>
            <Text style={styles.commissionDesc}>Percentage of trading losses</Text>
          </View>
          <View style={styles.commissionValue}>
            <Text style={styles.commissionValueText}>50%</Text>
          </View>
        </View>
        <View style={styles.commissionRow}>
          <View style={styles.commissionInfo}>
            <Text style={styles.commissionLabel}>Turnover Commission</Text>
            <Text style={styles.commissionDesc}>Percentage of trade volume</Text>
          </View>
          <View style={styles.commissionValue}>
            <Text style={styles.commissionValueText}>2%</Text>
          </View>
        </View>
        <View style={styles.commissionRow}>
          <View style={styles.commissionInfo}>
            <Text style={styles.commissionLabel}>CPA (Per FTD)</Text>
            <Text style={styles.commissionDesc}>Fixed amount per first deposit</Text>
          </View>
          <View style={styles.commissionValue}>
            <Text style={styles.commissionValueText}>$50</Text>
          </View>
        </View>
      </View>

      {/* Create Affiliate Button */}
      <TouchableOpacity style={styles.createAffiliateBtn}>
        <Ionicons name="add-circle" size={22} color="#FFF" />
        <Text style={styles.createAffiliateBtnText}>Create New Affiliate</Text>
      </TouchableOpacity>

      {/* Affiliates List */}
      <View style={[styles.sectionCard, { marginBottom: 40 }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Affiliate Partners</Text>
        </View>
        
        <View style={styles.emptyState}>
          <Ionicons name="git-network" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyStateText}>No affiliates yet</Text>
          <Text style={styles.emptyStateSubtext}>Create your first affiliate partner</Text>
        </View>
      </View>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  userModalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    overflow: 'hidden',
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
    backgroundColor: COLORS.card,
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
});
