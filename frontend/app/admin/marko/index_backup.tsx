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
const BYNIX_LOGO = 'https://customer-assets.emergentagent.com/job_bynix-markets/artifacts/lgz5jvli_IMG_3255.png';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL 
  ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`
  : typeof window !== 'undefined' && window.location.origin.includes('preview.emergentagent.com')
    ? `${window.location.origin}/api`
    : 'http://localhost:8001/api';

// Bynix Light Theme Color Palette
const COLORS = {
  bg: '#F5F7FA',
  card: '#FFFFFF',
  cardHover: '#F0F2F5',
  border: '#E2E8F0',
  primary: '#00C853',
  primaryDark: '#00A844',
  accent: '#0099FF',
  danger: '#FF3B5C',
  warning: '#FF9500',
  purple: '#7C3AED',
  text: '#1A202C',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  success: '#00C853',
  glass: 'rgba(255, 255, 255, 0.95)',
  sidebar: '#1E293B',
  sidebarText: '#F8FAFC',
  sidebarHover: '#334155',
};

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Overview', icon: 'grid', gradient: ['#00E55A', '#00B847'] },
  { id: 'god-mode', label: 'God Mode', icon: 'flash', gradient: ['#FF3B5C', '#FF1744'] },
  { id: 'automation', label: 'Automation', icon: 'cog', gradient: ['#FFB800', '#FF9500'] },
  { id: 'market', label: 'Market Control', icon: 'pulse', gradient: ['#8B5CF6', '#7C3AED'] },
  { id: 'users', label: 'User Management', icon: 'people', gradient: ['#00D4FF', '#0099FF'] },
  { id: 'trades', label: 'Live Trades', icon: 'trending-up', gradient: ['#00E55A', '#00B847'] },
  { id: 'affiliates', label: 'Affiliates', icon: 'git-network', gradient: ['#8B5CF6', '#7C3AED'] },
  { id: 'withdrawals', label: 'Withdrawals', icon: 'wallet', gradient: ['#FF3B5C', '#FF1744'] },
  { id: 'deposits', label: 'Deposits', icon: 'card', gradient: ['#00E55A', '#00B847'] },
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

export default function AdminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, user, loadAuth, logout } = useAuthStore();
  
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Data states
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [users, setUsers] = useState<UserFull[]>([]);
  const [activeTrades, setActiveTrades] = useState<any[]>([]);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [godMode, setGodMode] = useState<any>(null);
  const [trendingAssets, setTrendingAssets] = useState<any[]>([]);
  const [allAssets, setAllAssets] = useState<any[]>([]);
  
  // God Mode
  const [payoutSlider, setPayoutSlider] = useState(100);
  const [winRateSlider, setWinRateSlider] = useState(100);
  
  // User Management
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userModalTab, setUserModalTab] = useState('overview');
  const [balanceAdjustAmount, setBalanceAdjustAmount] = useState('');
  const [balanceAdjustType, setBalanceAdjustType] = useState('real');
  const [balanceAdjustOp, setBalanceAdjustOp] = useState('add');
  
  // Market Control
  const [selectedAsset, setSelectedAsset] = useState('BTCUSD');
  const [priceForm, setPriceForm] = useState({ price: '65000', duration: '60' });
  const [spikeForm, setSpikeForm] = useState({ direction: 'up', percentage: '5' });
  
  // Automation
  const [automationRules, setAutomationRules] = useState<any[]>([]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    name: '',
    description: '',
    trigger_type: 'profit_threshold',
    trigger_value: '500',
    action_type: 'adjust_payout',
    action_value: '70',
  });
  
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

  // Fetch functions
  const fetchDashboardStats = useCallback(async () => {
    try {
      const [statsRes, tradesRes, depositsRes, withdrawalsRes] = await Promise.all([
        fetch(`${API_URL}/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/trades?limit=1000`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/deposits`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/withdrawals`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      let stats: any = { total_deposits: 0, total_withdrawals: 0, total_users: 0, total_trades: 0, users_total_profit: 0, users_total_loss: 0, platform_revenue: 0 };

      if (statsRes.ok) {
        const data = await statsRes.json();
        Object.assign(stats, data);
      }

      if (tradesRes.ok) {
        const data = await tradesRes.json();
        const trades = data.trades || [];
        setRecentTrades(trades.slice(0, 20));
        setActiveTrades(trades.filter((t: any) => t.status === 'pending'));
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
      const res = await fetch(`${API_URL}/admin/users/detailed?limit=100`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) { console.error(e); }
  }, [token]);

  const fetchTrendingAssets = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/market/trending?limit=10&days=7`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setTrendingAssets(data.trending || []);
      }
    } catch (e) { console.error(e); }
  }, [token]);

  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/assets`);
      if (res.ok) {
        const data = await res.json();
        setAllAssets(data.assets || []);
      }
    } catch (e) { console.error(e); }
  }, []);

  const fetchAutomationRules = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/automation/rules`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAutomationRules(data.rules || []);
      }
    } catch (e) { console.error(e); }
  }, [token]);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchDashboardStats(),
      fetchGodMode(),
      fetchUsers(),
      fetchTrendingAssets(),
      fetchAssets(),
      fetchAutomationRules(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    if (token) loadAllData();
  }, [token]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  // Action handlers
  const toggleGodModeFeature = async (feature: string) => {
    try {
      const newValue = !godMode?.[feature];
      await fetch(`${API_URL}/admin/god-mode/toggle`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature, enabled: newValue })
      });
      fetchGodMode();
    } catch (e) { console.error(e); }
  };

  const updateGlobalModifier = async (type: string, value: number) => {
    try {
      await fetch(`${API_URL}/admin/god-mode/${type}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      });
      fetchGodMode();
    } catch (e) { console.error(e); }
  };

  const injectPrice = async () => {
    try {
      await fetch(`${API_URL}/admin/market/inject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset: selectedAsset, price: parseFloat(priceForm.price), duration_seconds: parseInt(priceForm.duration) })
      });
      fetchTrendingAssets();
    } catch (e) { console.error(e); }
  };

  const triggerSpike = async () => {
    try {
      await fetch(`${API_URL}/admin/market/spike`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset: selectedAsset, direction: spikeForm.direction, percentage: parseFloat(spikeForm.percentage) })
      });
    } catch (e) { console.error(e); }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/profile`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setSelectedUser(data);
        setShowUserModal(true);
      }
    } catch (e) { console.error(e); }
  };

  const adjustBalance = async () => {
    if (!selectedUser || !balanceAdjustAmount) return;
    try {
      const amount = parseFloat(balanceAdjustAmount) * (balanceAdjustOp === 'add' ? 1 : -1);
      await fetch(`${API_URL}/admin/users/${selectedUser.user_id}/adjust-balance`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance_type: balanceAdjustType, amount, reason: 'Admin adjustment' })
      });
      setBalanceAdjustAmount('');
      fetchUserProfile(selectedUser.user_id);
      fetchUsers();
    } catch (e) { console.error(e); }
  };

  const approveWithdrawal = async (id: string) => {
    try {
      await fetch(`${API_URL}/admin/withdrawals/${id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchDashboardStats();
    } catch (e) { console.error(e); }
  };

  const createRule = async () => {
    try {
      await fetch(`${API_URL}/admin/automation/rules`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...ruleForm,
          trigger_value: parseFloat(ruleForm.trigger_value),
          action_value: parseFloat(ruleForm.action_value),
        })
      });
      setShowRuleModal(false);
      fetchAutomationRules();
    } catch (e) { console.error(e); }
  };

  const formatMoney = (n: number) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatK = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}K` : n.toString();

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <Image source={{ uri: BYNIX_LOGO }} style={styles.loadingLogo} resizeMode="contain" />
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
        <Text style={styles.loadingText}>Loading Admin Panel...</Text>
      </View>
    );
  }

  // Sidebar Component
  const Sidebar = () => (
    <View style={[styles.sidebar, sidebarCollapsed && styles.sidebarCollapsed]}>
      <View style={styles.sidebarHeader}>
        <Image source={{ uri: BYNIX_LOGO }} style={styles.sidebarLogo} resizeMode="contain" />
        {!sidebarCollapsed && <Text style={styles.sidebarTitle}>ADMIN</Text>}
      </View>
      
      <ScrollView style={styles.sidebarMenu} showsVerticalScrollIndicator={false}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.menuItem, activeMenu === item.id && styles.menuItemActive]}
            onPress={() => setActiveMenu(item.id)}
          >
            {activeMenu === item.id ? (
              <LinearGradient colors={item.gradient} style={styles.menuIconBg}>
                <Ionicons name={item.icon as any} size={18} color="#FFF" />
              </LinearGradient>
            ) : (
              <View style={styles.menuIconBgInactive}>
                <Ionicons name={item.icon as any} size={18} color={COLORS.textSecondary} />
              </View>
            )}
            {!sidebarCollapsed && (
              <Text style={[styles.menuLabel, activeMenu === item.id && styles.menuLabelActive]}>
                {item.label}
              </Text>
            )}
            {activeMenu === item.id && <View style={styles.menuActiveIndicator} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      <View style={styles.sidebarFooter}>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => { logout(); router.replace('/'); }}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          {!sidebarCollapsed && <Text style={styles.logoutText}>Logout</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  // Header Component
  const Header = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.menuToggle} onPress={() => setSidebarCollapsed(!sidebarCollapsed)}>
        <Ionicons name={sidebarCollapsed ? "menu" : "close"} size={24} color={COLORS.text} />
      </TouchableOpacity>
      
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>{MENU_ITEMS.find(m => m.id === activeMenu)?.label || 'Dashboard'}</Text>
      </View>
      
      <View style={styles.headerRight}>
        <View style={styles.adminBadge}>
          <Ionicons name="shield-checkmark" size={14} color={COLORS.primary} />
          <Text style={styles.adminBadgeText}>{user?.name || 'Admin'}</Text>
        </View>
      </View>
    </View>
  );

  // Stats Card Component
  const StatCard = ({ title, value, icon, gradient, subtitle }: any) => (
    <LinearGradient colors={gradient} style={styles.statCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <View style={styles.statCardContent}>
        <View style={styles.statIconWrap}>
          <Ionicons name={icon} size={24} color="rgba(255,255,255,0.9)" />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </LinearGradient>
  );

  // Glass Card Component
  const GlassCard = ({ children, style }: any) => (
    <View style={[styles.glassCard, style]}>{children}</View>
  );

  // Dashboard Content
  const DashboardContent = () => (
    <View style={styles.dashboardGrid}>
      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatCard 
          title="Platform Revenue" 
          value={formatMoney(dashboardStats?.platform_revenue || 0)} 
          icon="trending-up" 
          gradient={['#00E55A', '#00B847']}
          subtitle={dashboardStats?.platform_revenue >= 0 ? 'Profit' : 'Loss'}
        />
        <StatCard 
          title="Total Deposits" 
          value={formatMoney(dashboardStats?.total_deposits || 0)} 
          icon="card" 
          gradient={['#00D4FF', '#0099FF']}
        />
      </View>
      
      <View style={styles.statsRow}>
        <StatCard 
          title="Users Profit" 
          value={formatMoney(dashboardStats?.users_total_profit || 0)} 
          icon="arrow-up-circle" 
          gradient={['#FFB800', '#FF9500']}
        />
        <StatCard 
          title="Users Loss" 
          value={formatMoney(dashboardStats?.users_total_loss || 0)} 
          icon="arrow-down-circle" 
          gradient={['#FF3B5C', '#FF1744']}
        />
      </View>
      
      {/* Quick Stats */}
      <GlassCard style={styles.quickStatsCard}>
        <Text style={styles.cardTitle}>Quick Stats</Text>
        <View style={styles.quickStatsGrid}>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{dashboardStats?.total_users || 0}</Text>
            <Text style={styles.quickStatLabel}>Total Users</Text>
          </View>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{activeTrades.length}</Text>
            <Text style={styles.quickStatLabel}>Active Trades</Text>
          </View>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{withdrawals.filter(w => w.status === 'pending').length}</Text>
            <Text style={styles.quickStatLabel}>Pending WD</Text>
          </View>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{deposits.filter(d => d.status === 'pending').length}</Text>
            <Text style={styles.quickStatLabel}>Pending Dep</Text>
          </View>
        </View>
      </GlassCard>
      
      {/* Recent Activity */}
      <GlassCard>
        <Text style={styles.cardTitle}>Recent Trades</Text>
        {recentTrades.slice(0, 5).map((trade, i) => (
          <View key={i} style={styles.tradeRow}>
            <View style={[styles.tradeIcon, { backgroundColor: trade.status === 'won' ? COLORS.success + '20' : trade.status === 'lost' ? COLORS.danger + '20' : COLORS.warning + '20' }]}>
              <Ionicons 
                name={trade.direction === 'up' ? 'arrow-up' : 'arrow-down'} 
                size={16} 
                color={trade.status === 'won' ? COLORS.success : trade.status === 'lost' ? COLORS.danger : COLORS.warning} 
              />
            </View>
            <View style={styles.tradeInfo}>
              <Text style={styles.tradeAsset}>{trade.asset}</Text>
              <Text style={styles.tradeUser}>{trade.user_email?.split('@')[0] || 'User'}</Text>
            </View>
            <View style={styles.tradeAmount}>
              <Text style={[styles.tradeProfit, { color: trade.status === 'won' ? COLORS.success : trade.status === 'lost' ? COLORS.danger : COLORS.warning }]}>
                {trade.status === 'won' ? '+' : trade.status === 'lost' ? '-' : ''}{formatMoney(Math.abs(trade.profit_loss || trade.amount))}
              </Text>
              <Text style={styles.tradeStatus}>{trade.status}</Text>
            </View>
          </View>
        ))}
      </GlassCard>
    </View>
  );

  // God Mode Content
  const GodModeContent = () => (
    <View style={styles.contentPadding}>
      {/* Kill Switches */}
      <GlassCard>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="flash" size={20} color={COLORS.danger} />
            <Text style={styles.cardTitle}>Kill Switches</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: godMode?.trading_enabled ? COLORS.success + '20' : COLORS.danger + '20' }]}>
            <Text style={[styles.statusText, { color: godMode?.trading_enabled ? COLORS.success : COLORS.danger }]}>
              {godMode?.trading_enabled ? 'ACTIVE' : 'DISABLED'}
            </Text>
          </View>
        </View>
        
        <View style={styles.switchGrid}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Trading Enabled</Text>
              <Text style={styles.switchDesc}>Master switch for all trading</Text>
            </View>
            <Switch
              value={godMode?.trading_enabled ?? true}
              onValueChange={() => toggleGodModeFeature('trading_enabled')}
              trackColor={{ false: COLORS.border, true: COLORS.success + '50' }}
              thumbColor={godMode?.trading_enabled ? COLORS.success : COLORS.textMuted}
            />
          </View>
          
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Withdrawals Frozen</Text>
              <Text style={styles.switchDesc}>Block all withdrawal requests</Text>
            </View>
            <Switch
              value={godMode?.withdrawals_frozen ?? false}
              onValueChange={() => toggleGodModeFeature('withdrawals_frozen')}
              trackColor={{ false: COLORS.border, true: COLORS.danger + '50' }}
              thumbColor={godMode?.withdrawals_frozen ? COLORS.danger : COLORS.textMuted}
            />
          </View>
          
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Force All Losses</Text>
              <Text style={styles.switchDesc}>All trades will lose</Text>
            </View>
            <Switch
              value={godMode?.force_all_loss ?? false}
              onValueChange={() => toggleGodModeFeature('force_all_loss')}
              trackColor={{ false: COLORS.border, true: COLORS.danger + '50' }}
              thumbColor={godMode?.force_all_loss ? COLORS.danger : COLORS.textMuted}
            />
          </View>
        </View>
      </GlassCard>
      
      {/* Global Modifiers */}
      <GlassCard style={{ marginTop: 16 }}>
        <Text style={styles.cardTitle}>Global Modifiers</Text>
        
        <View style={styles.sliderSection}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>Payout Modifier</Text>
            <Text style={styles.sliderValue}>{payoutSlider}%</Text>
          </View>
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, { width: `${payoutSlider}%`, backgroundColor: COLORS.primary }]} />
          </View>
          <View style={styles.sliderBtns}>
            {[50, 75, 100, 125].map(v => (
              <TouchableOpacity 
                key={v} 
                style={[styles.sliderBtn, payoutSlider === v && styles.sliderBtnActive]}
                onPress={() => { setPayoutSlider(v); updateGlobalModifier('payout', v); }}
              >
                <Text style={[styles.sliderBtnText, payoutSlider === v && styles.sliderBtnTextActive]}>{v}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.sliderSection}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>Win Rate Modifier</Text>
            <Text style={styles.sliderValue}>{winRateSlider}%</Text>
          </View>
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, { width: `${winRateSlider}%`, backgroundColor: COLORS.accent }]} />
          </View>
          <View style={styles.sliderBtns}>
            {[25, 50, 75, 100].map(v => (
              <TouchableOpacity 
                key={v} 
                style={[styles.sliderBtn, winRateSlider === v && styles.sliderBtnActive]}
                onPress={() => { setWinRateSlider(v); updateGlobalModifier('win-rate', v); }}
              >
                <Text style={[styles.sliderBtnText, winRateSlider === v && styles.sliderBtnTextActive]}>{v}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </GlassCard>
    </View>
  );

  // Market Control Content
  const MarketControlContent = () => (
    <View style={styles.contentPadding}>
      {/* Trending Assets */}
      <GlassCard>
        <View style={styles.sectionHeader}>
          <Text style={styles.cardTitle}>Trending Assets</Text>
          <TouchableOpacity onPress={fetchTrendingAssets}>
            <Ionicons name="refresh" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trendingScroll}>
          {trendingAssets.map((asset, i) => (
            <TouchableOpacity 
              key={i} 
              style={[styles.trendingCard, selectedAsset === asset.asset && styles.trendingCardActive]}
              onPress={() => setSelectedAsset(asset.asset)}
            >
              <View style={styles.trendingRank}>
                <Text style={styles.trendingRankText}>#{i + 1}</Text>
              </View>
              <Text style={styles.trendingAsset}>{asset.asset}</Text>
              <Text style={styles.trendingTrades}>{asset.trade_count} trades</Text>
              <Text style={styles.trendingVolume}>{formatMoney(asset.total_volume)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </GlassCard>
      
      {/* All Assets */}
      <GlassCard style={{ marginTop: 16 }}>
        <Text style={styles.cardTitle}>Select Asset</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.assetScroll}>
          {allAssets.map((asset, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.assetChip, selectedAsset === asset.symbol && styles.assetChipActive]}
              onPress={() => setSelectedAsset(asset.symbol)}
            >
              <Text style={[styles.assetChipText, selectedAsset === asset.symbol && styles.assetChipTextActive]}>
                {asset.symbol}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <Text style={styles.selectedAssetLabel}>Selected: <Text style={styles.selectedAssetValue}>{selectedAsset}</Text></Text>
      </GlassCard>
      
      {/* Price Injection */}
      <GlassCard style={{ marginTop: 16 }}>
        <View style={styles.sectionHeader}>
          <Text style={styles.cardTitle}>Price Injection</Text>
          <View style={styles.dangerBadge}>
            <Ionicons name="warning" size={12} color={COLORS.warning} />
            <Text style={styles.dangerBadgeText}>Manual Override</Text>
          </View>
        </View>
        
        <View style={styles.formRow}>
          <TextInput
            style={[styles.formInput, { flex: 1 }]}
            placeholder="Price"
            placeholderTextColor={COLORS.textMuted}
            value={priceForm.price}
            onChangeText={(v) => setPriceForm({ ...priceForm, price: v })}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.formInput, { width: 80 }]}
            placeholder="Seconds"
            placeholderTextColor={COLORS.textMuted}
            value={priceForm.duration}
            onChangeText={(v) => setPriceForm({ ...priceForm, duration: v })}
            keyboardType="numeric"
          />
          <TouchableOpacity style={styles.injectBtn} onPress={injectPrice}>
            <Text style={styles.injectBtnText}>INJECT</Text>
          </TouchableOpacity>
        </View>
      </GlassCard>
      
      {/* Price Spike */}
      <GlassCard style={{ marginTop: 16 }}>
        <Text style={styles.cardTitle}>Trigger Price Spike</Text>
        
        <View style={styles.formRow}>
          <TouchableOpacity 
            style={[styles.directionBtn, spikeForm.direction === 'up' && styles.directionBtnUp]}
            onPress={() => setSpikeForm({ ...spikeForm, direction: 'up' })}
          >
            <Ionicons name="arrow-up" size={20} color={spikeForm.direction === 'up' ? '#FFF' : COLORS.success} />
            <Text style={[styles.directionBtnText, spikeForm.direction === 'up' && { color: '#FFF' }]}>UP</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.directionBtn, spikeForm.direction === 'down' && styles.directionBtnDown]}
            onPress={() => setSpikeForm({ ...spikeForm, direction: 'down' })}
          >
            <Ionicons name="arrow-down" size={20} color={spikeForm.direction === 'down' ? '#FFF' : COLORS.danger} />
            <Text style={[styles.directionBtnText, spikeForm.direction === 'down' && { color: '#FFF' }]}>DOWN</Text>
          </TouchableOpacity>
          
          <TextInput
            style={[styles.formInput, { width: 80 }]}
            placeholder="%"
            placeholderTextColor={COLORS.textMuted}
            value={spikeForm.percentage}
            onChangeText={(v) => setSpikeForm({ ...spikeForm, percentage: v })}
            keyboardType="numeric"
          />
          
          <TouchableOpacity style={styles.spikeBtn} onPress={triggerSpike}>
            <Text style={styles.spikeBtnText}>SPIKE</Text>
          </TouchableOpacity>
        </View>
      </GlassCard>
    </View>
  );

  // Users Content
  const UsersContent = () => {
    const filteredUsers = users.filter(u => 
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return (
      <View style={styles.contentPadding}>
        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        {/* Users List */}
        {filteredUsers.map((u, i) => (
          <TouchableOpacity key={i} style={styles.userCard} onPress={() => fetchUserProfile(u.user_id)}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>{u.name?.charAt(0) || 'U'}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{u.name || 'Unknown'}</Text>
              <Text style={styles.userEmail}>{u.email}</Text>
            </View>
            <View style={styles.userBalances}>
              <Text style={styles.userBalance}>{formatMoney(u.balances?.real || 0)}</Text>
              <Text style={styles.userBalanceLabel}>Real</Text>
            </View>
            <View style={[styles.userStatusBadge, { backgroundColor: u.account_status === 'active' ? COLORS.success + '20' : COLORS.danger + '20' }]}>
              <Text style={[styles.userStatusText, { color: u.account_status === 'active' ? COLORS.success : COLORS.danger }]}>
                {u.account_status}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Trades Content
  const TradesContent = () => (
    <View style={styles.contentPadding}>
      <GlassCard>
        <View style={styles.sectionHeader}>
          <Text style={styles.cardTitle}>Active Trades</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{activeTrades.length} Live</Text>
          </View>
        </View>
        
        {activeTrades.length === 0 ? (
          <Text style={styles.emptyText}>No active trades</Text>
        ) : (
          activeTrades.map((trade, i) => (
            <View key={i} style={styles.tradeRow}>
              <View style={[styles.tradeIcon, { backgroundColor: trade.direction === 'up' ? COLORS.success + '20' : COLORS.danger + '20' }]}>
                <Ionicons 
                  name={trade.direction === 'up' ? 'arrow-up' : 'arrow-down'} 
                  size={16} 
                  color={trade.direction === 'up' ? COLORS.success : COLORS.danger} 
                />
              </View>
              <View style={styles.tradeInfo}>
                <Text style={styles.tradeAsset}>{trade.asset}</Text>
                <Text style={styles.tradeUser}>{trade.user_email?.split('@')[0]}</Text>
              </View>
              <Text style={styles.tradeAmount}>{formatMoney(trade.amount)}</Text>
            </View>
          ))
        )}
      </GlassCard>
      
      <GlassCard style={{ marginTop: 16 }}>
        <Text style={styles.cardTitle}>Recent Trades</Text>
        {recentTrades.slice(0, 10).map((trade, i) => (
          <View key={i} style={styles.tradeRow}>
            <View style={[styles.tradeIcon, { backgroundColor: trade.status === 'won' ? COLORS.success + '20' : trade.status === 'lost' ? COLORS.danger + '20' : COLORS.warning + '20' }]}>
              <Ionicons 
                name={trade.status === 'won' ? 'checkmark' : trade.status === 'lost' ? 'close' : 'time'} 
                size={16} 
                color={trade.status === 'won' ? COLORS.success : trade.status === 'lost' ? COLORS.danger : COLORS.warning} 
              />
            </View>
            <View style={styles.tradeInfo}>
              <Text style={styles.tradeAsset}>{trade.asset}</Text>
              <Text style={styles.tradeUser}>{trade.user_email?.split('@')[0]}</Text>
            </View>
            <View style={styles.tradeAmount}>
              <Text style={[styles.tradeProfit, { color: trade.status === 'won' ? COLORS.success : COLORS.danger }]}>
                {trade.status === 'won' ? '+' : '-'}{formatMoney(Math.abs(trade.profit_loss || 0))}
              </Text>
            </View>
          </View>
        ))}
      </GlassCard>
    </View>
  );

  // Withdrawals Content
  const WithdrawalsContent = () => (
    <View style={styles.contentPadding}>
      <GlassCard>
        <View style={styles.sectionHeader}>
          <Text style={styles.cardTitle}>Pending Withdrawals</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{withdrawals.filter(w => w.status === 'pending').length}</Text>
          </View>
        </View>
        
        {withdrawals.filter(w => w.status === 'pending').map((wd, i) => (
          <View key={i} style={styles.withdrawalCard}>
            <View style={styles.withdrawalInfo}>
              <Text style={styles.withdrawalEmail}>{wd.user_email || 'User'}</Text>
              <Text style={styles.withdrawalAddress}>{wd.crypto_address?.slice(0, 20)}...</Text>
            </View>
            <Text style={styles.withdrawalAmount}>{formatMoney(wd.amount)}</Text>
            <TouchableOpacity style={styles.approveBtn} onPress={() => approveWithdrawal(wd.withdrawal_id || wd._id)}>
              <Ionicons name="checkmark" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        ))}
        
        {withdrawals.filter(w => w.status === 'pending').length === 0 && (
          <Text style={styles.emptyText}>No pending withdrawals</Text>
        )}
      </GlassCard>
    </View>
  );

  // Deposits Content
  const DepositsContent = () => (
    <View style={styles.contentPadding}>
      <GlassCard>
        <Text style={styles.cardTitle}>Recent Deposits</Text>
        
        {deposits.slice(0, 15).map((dep, i) => (
          <View key={i} style={styles.depositRow}>
            <View style={[styles.depositIcon, { backgroundColor: dep.status === 'completed' ? COLORS.success + '20' : COLORS.warning + '20' }]}>
              <Ionicons name="card" size={16} color={dep.status === 'completed' ? COLORS.success : COLORS.warning} />
            </View>
            <View style={styles.depositInfo}>
              <Text style={styles.depositUser}>{dep.user_email?.split('@')[0] || 'User'}</Text>
              <Text style={styles.depositDate}>{new Date(dep.created_at).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.depositAmount}>{formatMoney(dep.amount_usd || dep.amount)}</Text>
            <View style={[styles.depositStatusBadge, { backgroundColor: dep.status === 'completed' ? COLORS.success + '20' : COLORS.warning + '20' }]}>
              <Text style={[styles.depositStatusText, { color: dep.status === 'completed' ? COLORS.success : COLORS.warning }]}>
                {dep.status}
              </Text>
            </View>
          </View>
        ))}
      </GlassCard>
    </View>
  );

  // Affiliates Content
  const AffiliatesContent = () => (
    <View style={styles.contentPadding}>
      <GlassCard>
        <Text style={styles.cardTitle}>Affiliate Management</Text>
        <Text style={styles.emptyText}>Coming soon - Affiliate management panel</Text>
      </GlassCard>
    </View>
  );

  // Automation Content
  const AutomationContent = () => (
    <View style={styles.contentPadding}>
      <GlassCard>
        <View style={styles.sectionHeader}>
          <Text style={styles.cardTitle}>Automation Rules</Text>
          <TouchableOpacity style={styles.addRuleBtn} onPress={() => setShowRuleModal(true)}>
            <Ionicons name="add" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
        
        {automationRules.length === 0 ? (
          <Text style={styles.emptyText}>No automation rules configured</Text>
        ) : (
          automationRules.map((rule, i) => (
            <View key={i} style={[styles.ruleCard, !rule.is_active && styles.ruleCardInactive]}>
              <View style={styles.ruleHeader}>
                <Text style={styles.ruleName}>{rule.name}</Text>
                <Switch
                  value={rule.is_active}
                  trackColor={{ false: COLORS.border, true: COLORS.success + '50' }}
                  thumbColor={rule.is_active ? COLORS.success : COLORS.textMuted}
                />
              </View>
              <Text style={styles.ruleDesc}>{rule.description}</Text>
              <View style={styles.ruleDetails}>
                <Text style={styles.ruleDetail}>
                  Trigger: {rule.trigger_type} {rule.trigger_operator} {rule.trigger_value}
                </Text>
                <Text style={styles.ruleDetail}>
                  Action: {rule.action_type} → {rule.action_value}
                </Text>
              </View>
            </View>
          ))
        )}
      </GlassCard>
      
      {/* Rule Creation Modal */}
      <Modal visible={showRuleModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Automation Rule</Text>
              <TouchableOpacity onPress={() => setShowRuleModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Rule Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter rule name"
                placeholderTextColor={COLORS.textMuted}
                value={ruleForm.name}
                onChangeText={(v) => setRuleForm({ ...ruleForm, name: v })}
              />
              
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter description"
                placeholderTextColor={COLORS.textMuted}
                value={ruleForm.description}
                onChangeText={(v) => setRuleForm({ ...ruleForm, description: v })}
              />
              
              <Text style={styles.inputLabel}>Trigger Type</Text>
              <View style={styles.optionBtns}>
                {['profit_threshold', 'loss_threshold', 'win_streak', 'deposit_amount'].map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.optionBtn, ruleForm.trigger_type === t && styles.optionBtnActive]}
                    onPress={() => setRuleForm({ ...ruleForm, trigger_type: t })}
                  >
                    <Text style={[styles.optionBtnText, ruleForm.trigger_type === t && styles.optionBtnTextActive]}>
                      {t.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.inputLabel}>Trigger Value</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter value"
                placeholderTextColor={COLORS.textMuted}
                value={ruleForm.trigger_value}
                onChangeText={(v) => setRuleForm({ ...ruleForm, trigger_value: v })}
                keyboardType="numeric"
              />
              
              <Text style={styles.inputLabel}>Action Type</Text>
              <View style={styles.optionBtns}>
                {['adjust_payout', 'force_loss', 'shadow_ban', 'alert'].map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.optionBtn, ruleForm.action_type === t && styles.optionBtnActive]}
                    onPress={() => setRuleForm({ ...ruleForm, action_type: t })}
                  >
                    <Text style={[styles.optionBtnText, ruleForm.action_type === t && styles.optionBtnTextActive]}>
                      {t.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.inputLabel}>Action Value</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter value"
                placeholderTextColor={COLORS.textMuted}
                value={ruleForm.action_value}
                onChangeText={(v) => setRuleForm({ ...ruleForm, action_value: v })}
                keyboardType="numeric"
              />
              
              <TouchableOpacity style={styles.createRuleBtn} onPress={createRule}>
                <Text style={styles.createRuleBtnText}>Create Rule</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );

  // User Modal
  const UserModal = () => (
    <Modal visible={showUserModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.userModalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.userModalHeader}>
              <View style={styles.userModalAvatar}>
                <Text style={styles.userModalAvatarText}>{selectedUser?.name?.charAt(0) || 'U'}</Text>
              </View>
              <View>
                <Text style={styles.userModalName}>{selectedUser?.name}</Text>
                <Text style={styles.userModalEmail}>{selectedUser?.email}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setShowUserModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            {/* Balance Cards */}
            <View style={styles.balanceCards}>
              <View style={[styles.balanceCard, { backgroundColor: COLORS.success + '15' }]}>
                <Text style={styles.balanceCardLabel}>Real Balance</Text>
                <Text style={[styles.balanceCardValue, { color: COLORS.success }]}>
                  {formatMoney(selectedUser?.balances?.real || 0)}
                </Text>
              </View>
              <View style={[styles.balanceCard, { backgroundColor: COLORS.accent + '15' }]}>
                <Text style={styles.balanceCardLabel}>Demo Balance</Text>
                <Text style={[styles.balanceCardValue, { color: COLORS.accent }]}>
                  {formatMoney(selectedUser?.balances?.demo || 0)}
                </Text>
              </View>
            </View>
            
            {/* Balance Adjustment */}
            <View style={styles.adjustSection}>
              <Text style={styles.sectionLabel}>Adjust Balance</Text>
              <View style={styles.adjustTypeRow}>
                {['real', 'demo', 'bonus'].map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.adjustTypeBtn, balanceAdjustType === t && styles.adjustTypeBtnActive]}
                    onPress={() => setBalanceAdjustType(t)}
                  >
                    <Text style={[styles.adjustTypeBtnText, balanceAdjustType === t && styles.adjustTypeBtnTextActive]}>
                      {t.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <View style={styles.adjustInputRow}>
                <TouchableOpacity
                  style={[styles.adjustOpBtn, balanceAdjustOp === 'add' && styles.adjustOpBtnActive]}
                  onPress={() => setBalanceAdjustOp('add')}
                >
                  <Ionicons name="add" size={20} color={balanceAdjustOp === 'add' ? '#FFF' : COLORS.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.adjustOpBtn, balanceAdjustOp === 'subtract' && styles.adjustOpBtnActive]}
                  onPress={() => setBalanceAdjustOp('subtract')}
                >
                  <Ionicons name="remove" size={20} color={balanceAdjustOp === 'subtract' ? '#FFF' : COLORS.textSecondary} />
                </TouchableOpacity>
                <TextInput
                  style={styles.adjustInput}
                  placeholder="Amount"
                  placeholderTextColor={COLORS.textMuted}
                  value={balanceAdjustAmount}
                  onChangeText={setBalanceAdjustAmount}
                  keyboardType="numeric"
                />
                <TouchableOpacity style={styles.adjustSubmitBtn} onPress={adjustBalance}>
                  <Text style={styles.adjustSubmitBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Trading Stats */}
            <View style={styles.statsSection}>
              <Text style={styles.sectionLabel}>Trading Stats</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statItemValue}>{selectedUser?.trading_summary?.total_trades || 0}</Text>
                  <Text style={styles.statItemLabel}>Total Trades</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statItemValue, { color: COLORS.success }]}>{selectedUser?.trading_summary?.won || 0}</Text>
                  <Text style={styles.statItemLabel}>Won</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statItemValue, { color: COLORS.danger }]}>{selectedUser?.trading_summary?.lost || 0}</Text>
                  <Text style={styles.statItemLabel}>Lost</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statItemValue}>{(selectedUser?.trading_summary?.win_rate || 0).toFixed(1)}%</Text>
                  <Text style={styles.statItemLabel}>Win Rate</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Render content based on active menu
  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard': return <DashboardContent />;
      case 'god-mode': return <GodModeContent />;
      case 'market': return <MarketControlContent />;
      case 'users': return <UsersContent />;
      case 'trades': return <TradesContent />;
      case 'withdrawals': return <WithdrawalsContent />;
      case 'deposits': return <DepositsContent />;
      case 'affiliates': return <AffiliatesContent />;
      case 'automation': return <AutomationContent />;
      default: return <DashboardContent />;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Sidebar />
      
      <View style={[styles.mainContent, sidebarCollapsed && styles.mainContentExpanded]}>
        <Header />
        
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          {renderContent()}
        </ScrollView>
      </View>
      
      <UserModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.bg },
  
  // Loading
  loadingContainer: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  loadingLogo: { width: 150, height: 75 },
  loadingText: { color: COLORS.textSecondary, marginTop: 12, fontSize: 14 },
  
  // Sidebar - Keep dark for contrast
  sidebar: { width: 220, backgroundColor: COLORS.sidebar, borderRightWidth: 0 },
  sidebarCollapsed: { width: 70 },
  sidebarHeader: { padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.sidebarHover },
  sidebarLogo: { width: 100, height: 40 },
  sidebarTitle: { color: COLORS.primary, fontSize: 10, fontWeight: '700', marginTop: 4, letterSpacing: 2 },
  sidebarMenu: { flex: 1, paddingTop: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, marginHorizontal: 8, marginVertical: 2, borderRadius: 12, position: 'relative' },
  menuItemActive: { backgroundColor: COLORS.primary + '20' },
  menuIconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuIconBgInactive: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.sidebarHover, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { color: '#94A3B8', fontSize: 13, fontWeight: '500', marginLeft: 12 },
  menuLabelActive: { color: COLORS.sidebarText, fontWeight: '600' },
  menuActiveIndicator: { position: 'absolute', right: 0, top: '50%', marginTop: -10, width: 3, height: 20, backgroundColor: COLORS.primary, borderRadius: 2 },
  sidebarFooter: { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.sidebarHover },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  logoutText: { color: COLORS.danger, fontSize: 13, fontWeight: '600', marginLeft: 12 },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuToggle: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, marginLeft: 16 },
  headerTitle: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  adminBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary + '15', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  adminBadgeText: { color: COLORS.primary, fontSize: 12, fontWeight: '600', marginLeft: 6 },
  
  // Main Content
  mainContent: { flex: 1 },
  mainContentExpanded: { marginLeft: 0 },
  scrollView: { flex: 1 },
  contentPadding: { padding: 20 },
  
  // Glass Card
  glassCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  
  // Dashboard
  dashboardGrid: { padding: 20 },
  statsRow: { flexDirection: 'row', marginBottom: 16 },
  statCard: { flex: 1, marginHorizontal: 8, borderRadius: 16, overflow: 'hidden' },
  statCardContent: { padding: 20 },
  statIconWrap: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { color: '#FFF', fontSize: 24, fontWeight: '800' },
  statTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', marginTop: 4 },
  statSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 2 },
  
  // Quick Stats
  quickStatsCard: { marginTop: 8 },
  cardTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 16 },
  quickStatsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  quickStat: { alignItems: 'center' },
  quickStatValue: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  quickStatLabel: { color: COLORS.textSecondary, fontSize: 11, marginTop: 4 },
  
  // Trade Row
  tradeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tradeIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  tradeInfo: { flex: 1, marginLeft: 12 },
  tradeAsset: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  tradeUser: { color: COLORS.textSecondary, fontSize: 11 },
  tradeAmount: { alignItems: 'flex-end' },
  tradeProfit: { fontSize: 14, fontWeight: '700' },
  tradeStatus: { color: COLORS.textSecondary, fontSize: 10, textTransform: 'uppercase' },
  
  // God Mode
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: '700' },
  switchGrid: {},
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  switchInfo: { flex: 1 },
  switchLabel: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  switchDesc: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  
  // Sliders
  sliderSection: { marginTop: 20 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sliderLabel: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  sliderValue: { color: COLORS.primary, fontSize: 16, fontWeight: '700' },
  sliderTrack: { height: 6, backgroundColor: COLORS.border, borderRadius: 3 },
  sliderFill: { height: 6, borderRadius: 3 },
  sliderBtns: { flexDirection: 'row', marginTop: 12 },
  sliderBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: COLORS.border, borderRadius: 8, marginHorizontal: 4 },
  sliderBtnActive: { backgroundColor: COLORS.primary },
  sliderBtnText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  sliderBtnTextActive: { color: '#FFF' },
  
  // Market Control
  trendingScroll: { marginBottom: 12 },
  trendingCard: { backgroundColor: COLORS.cardHover, borderRadius: 12, padding: 16, marginRight: 12, minWidth: 120, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  trendingCardActive: { borderColor: COLORS.primary },
  trendingRank: { position: 'absolute', top: -8, right: 8, backgroundColor: COLORS.purple, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  trendingRankText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  trendingAsset: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginTop: 8 },
  trendingTrades: { color: COLORS.textSecondary, fontSize: 11, marginTop: 4 },
  trendingVolume: { color: COLORS.primary, fontSize: 12, fontWeight: '600', marginTop: 4 },
  assetScroll: { marginBottom: 12 },
  assetChip: { backgroundColor: COLORS.cardHover, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, marginRight: 8 },
  assetChipActive: { backgroundColor: COLORS.primary },
  assetChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  assetChipTextActive: { color: '#FFF' },
  selectedAssetLabel: { color: COLORS.textSecondary, fontSize: 12, marginTop: 8 },
  selectedAssetValue: { color: COLORS.primary, fontWeight: '700' },
  dangerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.warning + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  dangerBadgeText: { color: COLORS.warning, fontSize: 10, fontWeight: '600', marginLeft: 4 },
  formRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  formInput: { backgroundColor: COLORS.cardHover, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, color: COLORS.text, fontSize: 14, marginRight: 8 },
  injectBtn: { backgroundColor: COLORS.purple, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  injectBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  directionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardHover, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, marginRight: 8 },
  directionBtnUp: { backgroundColor: COLORS.success },
  directionBtnDown: { backgroundColor: COLORS.danger },
  directionBtnText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', marginLeft: 8 },
  spikeBtn: { backgroundColor: COLORS.danger, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  spikeBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  
  // Users
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, paddingVertical: 14, paddingHorizontal: 12, color: COLORS.text, fontSize: 14 },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  userAvatarText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  userEmail: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  userBalances: { alignItems: 'flex-end', marginRight: 12 },
  userBalance: { color: COLORS.success, fontSize: 14, fontWeight: '700' },
  userBalanceLabel: { color: COLORS.textSecondary, fontSize: 10 },
  userStatusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  userStatusText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  
  // Trades
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.success + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success, marginRight: 6 },
  liveText: { color: COLORS.success, fontSize: 11, fontWeight: '600' },
  emptyText: { color: COLORS.textSecondary, fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
  
  // Withdrawals
  countBadge: { backgroundColor: COLORS.danger, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  countBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  withdrawalCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  withdrawalInfo: { flex: 1 },
  withdrawalEmail: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  withdrawalAddress: { color: COLORS.textSecondary, fontSize: 10, marginTop: 2 },
  withdrawalAmount: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginRight: 16 },
  approveBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center' },
  
  // Deposits
  depositRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  depositIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  depositInfo: { flex: 1, marginLeft: 12 },
  depositUser: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  depositDate: { color: COLORS.textSecondary, fontSize: 10, marginTop: 2 },
  depositAmount: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginRight: 12 },
  depositStatusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  depositStatusText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  
  // Automation
  addRuleBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  ruleCard: { backgroundColor: COLORS.cardHover, borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: COLORS.success },
  ruleCardInactive: { borderLeftColor: COLORS.textMuted, opacity: 0.6 },
  ruleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ruleName: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  ruleDesc: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  ruleDetails: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  ruleDetail: { color: COLORS.textSecondary, fontSize: 11, marginBottom: 4 },
  
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.card, borderRadius: 20, width: '90%', maxWidth: 500, maxHeight: '80%' },
  userModalContent: { backgroundColor: COLORS.card, borderRadius: 20, width: '90%', maxWidth: 500, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  modalBody: { padding: 20 },
  inputLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  modalInput: { backgroundColor: COLORS.cardHover, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16, color: COLORS.text, fontSize: 14 },
  optionBtns: { flexDirection: 'row', flexWrap: 'wrap' },
  optionBtn: { backgroundColor: COLORS.cardHover, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, marginRight: 8, marginBottom: 8 },
  optionBtnActive: { backgroundColor: COLORS.primary },
  optionBtnText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  optionBtnTextActive: { color: '#FFF' },
  createRuleBtn: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  createRuleBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  
  // User Modal
  userModalHeader: { flexDirection: 'row', alignItems: 'center' },
  userModalAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  userModalAvatarText: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  userModalName: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  userModalEmail: { color: COLORS.textSecondary, fontSize: 12 },
  balanceCards: { flexDirection: 'row', marginBottom: 20 },
  balanceCard: { flex: 1, padding: 16, borderRadius: 12, marginHorizontal: 4 },
  balanceCardLabel: { color: COLORS.textSecondary, fontSize: 11 },
  balanceCardValue: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  adjustSection: { marginBottom: 20 },
  sectionLabel: { color: COLORS.text, fontSize: 14, fontWeight: '600', marginBottom: 12 },
  adjustTypeRow: { flexDirection: 'row', marginBottom: 12 },
  adjustTypeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: COLORS.cardHover, borderRadius: 8, marginHorizontal: 4 },
  adjustTypeBtnActive: { backgroundColor: COLORS.primary },
  adjustTypeBtnText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  adjustTypeBtnTextActive: { color: '#FFF' },
  adjustInputRow: { flexDirection: 'row', alignItems: 'center' },
  adjustOpBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.cardHover, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  adjustOpBtnActive: { backgroundColor: COLORS.primary },
  adjustInput: { flex: 1, backgroundColor: COLORS.cardHover, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, color: COLORS.text, fontSize: 14, marginRight: 8 },
  adjustSubmitBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  adjustSubmitBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  statsSection: { marginBottom: 20 },
  statsGrid: { flexDirection: 'row', backgroundColor: COLORS.cardHover, borderRadius: 12, padding: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statItemValue: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  statItemLabel: { color: COLORS.textSecondary, fontSize: 10, marginTop: 4 },
});
