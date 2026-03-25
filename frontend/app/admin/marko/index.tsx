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
const BYNIX_LOGO = 'https://i.imgur.com/YmJwNPH.png';

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
        <Image source={{ uri: BYNIX_LOGO }} style={styles.loadingLogo} resizeMode="contain" />
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

  // User Management Content
  const UsersContent = () => (
    <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>User Management</Text>
        <Text style={styles.pageSubtitle}>Manage all platform users</Text>
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users by email, name, or ID..."
            placeholderTextColor={COLORS.textMuted}
          />
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <Ionicons name="filter" size={20} color={COLORS.primary} />
        </TouchableOpacity>
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
          <Text style={[styles.miniStatValue, { color: COLORS.danger }]}>0</Text>
          <Text style={styles.miniStatLabel}>Banned</Text>
        </View>
      </View>

      {/* Users List */}
      <View style={styles.sectionCard}>
        {recentUsers.map((user, index) => (
          <TouchableOpacity key={user.user_id || index} style={styles.userCard}>
            <View style={styles.userCardLeft}>
              <View style={[styles.userAvatar, { backgroundColor: COLORS.primary }]}>
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
                </View>
              </View>
            </View>
            <View style={styles.userCardRight}>
              <Text style={styles.userCardBalance}>${(user.real_balance || 0).toFixed(2)}</Text>
              <Text style={styles.userCardBalanceLabel}>Real Balance</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} style={{ marginTop: 8 }} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

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
      default:
        return <PlaceholderContent title={MENU_ITEMS.find(m => m.id === activeMenu)?.label || 'Section'} />;
    }
  };

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
          <Image source={{ uri: BYNIX_LOGO }} style={styles.sidebarLogo} resizeMode="contain" />
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
});
