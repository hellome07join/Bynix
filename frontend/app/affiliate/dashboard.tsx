import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Dimensions, ActivityIndicator, RefreshControl, TextInput, Modal, Pressable, Alert, Platform, KeyboardAvoidingView, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { API_URL } from '../../utils/api';

const { width } = Dimensions.get('window');
const BYNIX_LOGO = 'https://customer-assets.emergentagent.com/job_bynix-markets/artifacts/f2jhd9vy_IMG_3258.png';

// Light Theme Color Palette
const COLORS = {
  bg: '#F5F7FA',
  card: '#FFFFFF',
  cardDark: '#1A2235',
  cardLight: '#F8FAFC',
  border: '#E2E8F0',
  primary: '#00C853',
  primaryLight: '#E8F5E9',
  primaryDark: '#00A843',
  accent: '#2196F3',
  accentLight: '#E3F2FD',
  gold: '#FFC107',
  goldLight: '#FFF8E1',
  danger: '#F44336',
  dangerLight: '#FFEBEE',
  warning: '#FF9800',
  warningLight: '#FFF3E0',
  purple: '#7C3AED',
  purpleLight: '#EDE9FE',
  text: '#1A202C',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  white: '#FFFFFF',
};

// Affiliate Levels
const LEVELS = [
  { level: 1, name: 'Starter', minFtds: 0, revenue: 50, turnover: 2.0, color: '#6B7280', icon: 'star-outline' },
  { level: 2, name: 'Advanced', minFtds: 15, revenue: 55, turnover: 2.5, color: '#3B82F6', icon: 'star-half' },
  { level: 3, name: 'Professional', minFtds: 50, revenue: 60, turnover: 3.0, color: '#8B5CF6', icon: 'star' },
  { level: 4, name: 'Expert', minFtds: 100, revenue: 65, turnover: 3.5, color: '#EC4899', icon: 'diamond-outline' },
  { level: 5, name: 'Master', minFtds: 200, revenue: 70, turnover: 4.0, color: '#F59E0B', icon: 'diamond' },
  { level: 6, name: 'Guru', minFtds: 400, revenue: 75, turnover: 4.5, color: '#EF4444', icon: 'trophy-outline' },
  { level: 7, name: 'Legend', minFtds: 700, revenue: 85, turnover: 5.5, color: '#FFD700', icon: 'trophy' },
];

// Navigation Items
const NAV_ITEMS = [
  { id: 'home', icon: 'home', label: 'Dashboard' },
  { id: 'stats', icon: 'bar-chart', label: 'Statistics' },
  { id: 'links', icon: 'link', label: 'Links' },
  { id: 'promo', icon: 'image', label: 'Promo' },
  { id: 'top10', icon: 'podium', label: 'TOP 10' },
  { id: 'support', icon: 'headset', label: 'Support' },
];

export default function AffiliateDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLevelsModal, setShowLevelsModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  
  // Data
  const [affiliate, setAffiliate] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [statisticsData, setStatisticsData] = useState<any>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [top10, setTop10] = useState<any[]>([]);
  const [promoMaterials, setPromoMaterials] = useState<any[]>([]);
  const [statsPeriod, setStatsPeriod] = useState(7);
  
  // Forms
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  
  // Links Page States
  const [showNewLinkModal, setShowNewLinkModal] = useState(false);
  const [newLinkForm, setNewLinkForm] = useState({
    linkType: 'main_page',
    affiliateProgram: 'revenue_sharing',
    comment: '',
  });
  
  // Toast State
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  
  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 2500);
  };

  const LINK_TYPES = [
    { value: 'main_page', label: 'Main page' },
    { value: 'register', label: 'Register link' },
    { value: 'android', label: 'Android link' },
    { value: 'quick_entry', label: 'Quick entry into the platform' },
  ];

  const AFFILIATE_PROGRAMS = [
    { value: 'revenue_sharing', label: 'Revenue Sharing' },
    { value: 'turnover_sharing', label: 'Turnover Sharing' },
  ];

  const getToken = async () => await AsyncStorage.getItem('affiliate_token');

  const fetchDashboard = async () => {
    try {
      const token = await getToken();
      if (!token) { router.replace('/affiliate/login'); return; }
      
      const res = await fetch(`${API_URL}/affiliate/dashboard?days=${statsPeriod}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) { await AsyncStorage.removeItem('affiliate_token'); router.replace('/affiliate/login'); return; }
      const data = await res.json();
      setDashboardData(data);
      setAffiliate(data.affiliate);
    } catch (e) { console.error(e); }
  };

  const fetchStatistics = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/affiliate/statistics?days=${statsPeriod}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setStatisticsData(data);
    } catch (e) { console.error(e); }
  };

  const fetchLinks = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/affiliate/links`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setLinks(data.links || []);
    } catch (e) { console.error(e); }
  };

  const fetchTop10 = async () => {
    try {
      const res = await fetch(`${API_URL}/affiliate/top10`);
      const data = await res.json();
      setTop10(data.top_affiliates || []);
    } catch (e) { console.error(e); }
  };

  const fetchPromo = async () => {
    try {
      const res = await fetch(`${API_URL}/affiliate/promo-materials`);
      const data = await res.json();
      setPromoMaterials(data.materials || []);
    } catch (e) { console.error(e); }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchDashboard(), fetchStatistics(), fetchLinks(), fetchTop10(), fetchPromo()]);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [statsPeriod]);

  const onRefresh = async () => { setRefreshing(true); await loadAll(); setRefreshing(false); };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('affiliate_token');
    router.replace('/affiliate/login');
  };

  const formatMoney = (n: number) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getCurrentLevel = () => {
    const ftds = affiliate?.total_ftds || 0;
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (ftds >= LEVELS[i].minFtds) return LEVELS[i];
    }
    return LEVELS[0];
  };

  const getNextLevel = () => {
    const current = getCurrentLevel();
    const idx = LEVELS.findIndex(l => l.level === current.level);
    return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <Image source={{ uri: BYNIX_LOGO }} style={styles.loadingLogo} resizeMode="contain" />
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 24 }} />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  const currentLevel = getCurrentLevel();
  const nextLevel = getNextLevel();

  // Header Component
  const Header = () => (
    <View style={styles.header}>
      <Image source={{ uri: BYNIX_LOGO }} style={styles.headerLogo} resizeMode="contain" />
      
      <View style={styles.headerRight}>
        {/* Level Badge */}
        <TouchableOpacity style={[styles.levelBadge, { backgroundColor: currentLevel.color + '15', borderColor: currentLevel.color }]} onPress={() => setShowLevelsModal(true)}>
          <Ionicons name={currentLevel.icon as any} size={14} color={currentLevel.color} />
          <Text style={[styles.levelBadgeText, { color: currentLevel.color }]}>{currentLevel.name}</Text>
        </TouchableOpacity>
        
        {/* Profile Button */}
        <TouchableOpacity 
          style={styles.profileBtn} 
          onPress={() => setShowProfileMenu(!showProfileMenu)}
          activeOpacity={0.7}
        >
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.profileAvatar}>
            <Text style={styles.profileInitial}>{affiliate?.name?.charAt(0) || 'A'}</Text>
          </LinearGradient>
          <Ionicons name={showProfileMenu ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Profile Dropdown Component (Separate for better z-index handling)
  const ProfileDropdown = () => {
    if (!showProfileMenu) return null;
    
    return (
      <Pressable style={styles.dropdownOverlay} onPress={() => setShowProfileMenu(false)}>
        <View style={styles.profileDropdown}>
          <View style={styles.profileDropdownHeader}>
            <View style={styles.profileDropdownAvatarWrap}>
              <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.profileDropdownAvatar}>
                <Text style={styles.profileDropdownInitial}>{affiliate?.name?.charAt(0) || 'A'}</Text>
              </LinearGradient>
            </View>
            <Text style={styles.profileName}>{affiliate?.name}</Text>
            <Text style={styles.profileEmail}>{affiliate?.email}</Text>
            <View style={styles.profileIdBadge}>
              <Text style={styles.profileId}>ID: {affiliate?.ref_code}</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.profileMenuItem} onPress={() => setShowProfileMenu(false)}>
            <View style={[styles.profileMenuIconWrap, { backgroundColor: COLORS.accentLight }]}>
              <Ionicons name="person-outline" size={16} color={COLORS.accent} />
            </View>
            <Text style={styles.profileMenuText}>My Account</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.profileMenuItem} onPress={() => setShowProfileMenu(false)}>
            <View style={[styles.profileMenuIconWrap, { backgroundColor: COLORS.purpleLight }]}>
              <Ionicons name="settings-outline" size={16} color={COLORS.purple} />
            </View>
            <Text style={styles.profileMenuText}>Settings</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.profileMenuItem} onPress={() => setShowProfileMenu(false)}>
            <View style={[styles.profileMenuIconWrap, { backgroundColor: COLORS.warningLight }]}>
              <Ionicons name="help-circle-outline" size={16} color={COLORS.warning} />
            </View>
            <Text style={styles.profileMenuText}>Help Center</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
          
          <View style={styles.profileDivider} />
          
          <TouchableOpacity style={styles.profileMenuItem} onPress={handleLogout}>
            <View style={[styles.profileMenuIconWrap, { backgroundColor: COLORS.dangerLight }]}>
              <Ionicons name="log-out-outline" size={16} color={COLORS.danger} />
            </View>
            <Text style={[styles.profileMenuText, { color: COLORS.danger }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    );
  };

  // Bottom Navigation
  const BottomNav = () => (
    <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8 }]}>
      {NAV_ITEMS.map((item) => (
        <TouchableOpacity 
          key={item.id} 
          style={[styles.navItem, activeTab === item.id && styles.navItemActive]}
          onPress={() => setActiveTab(item.id)}
        >
          <View style={[styles.navIconWrap, activeTab === item.id && styles.navIconWrapActive]}>
            <Ionicons name={item.icon as any} size={22} color={activeTab === item.id ? COLORS.primary : COLORS.textMuted} />
          </View>
          <Text style={[styles.navLabel, activeTab === item.id && styles.navLabelActive]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Dashboard Home Content
  const HomeContent = () => (
    <View style={styles.content}>
      {/* Balance Card */}
      <LinearGradient colors={['#1A2235', '#141B2D']} style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <TouchableOpacity onPress={() => setShowWithdrawModal(true)}>
            <View style={styles.withdrawBtn}>
              <Ionicons name="wallet-outline" size={16} color={COLORS.primary} />
              <Text style={styles.withdrawBtnText}>Withdraw</Text>
            </View>
          </TouchableOpacity>
        </View>
        <Text style={styles.balanceAmount}>{formatMoney(affiliate?.balance || 0)}</Text>
        
        <View style={styles.balanceFooter}>
          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatLabel}>All Time Earnings</Text>
            <Text style={styles.balanceStatValue}>{formatMoney(affiliate?.total_earnings || 0)}</Text>
          </View>
          <View style={styles.balanceStatDivider} />
          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatLabel}>Commission Rate</Text>
            <Text style={[styles.balanceStatValue, { color: COLORS.primary }]}>{currentLevel.revenue}%</Text>
          </View>
        </View>
      </LinearGradient>
      
      {/* Commission Structure Info */}
      <View style={styles.commissionInfoCard}>
        <View style={styles.commissionHeader}>
          <Ionicons name="information-circle" size={22} color={COLORS.primary} />
          <Text style={styles.commissionTitle}>Your Commission Structure</Text>
        </View>
        
        <View style={styles.commissionModels}>
          {/* Revenue Share */}
          <View style={styles.commissionModel}>
            <View style={[styles.commissionModelIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="trending-down" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.commissionModelInfo}>
              <Text style={styles.commissionModelName}>Revenue Share</Text>
              <Text style={styles.commissionModelDesc}>Earn {currentLevel.revenue}% when users lose trades</Text>
            </View>
            <Text style={styles.commissionModelRate}>{currentLevel.revenue}%</Text>
          </View>
          
          {/* Turnover */}
          <View style={styles.commissionModel}>
            <View style={[styles.commissionModelIcon, { backgroundColor: COLORS.accentLight }]}>
              <Ionicons name="repeat" size={18} color={COLORS.accent} />
            </View>
            <View style={styles.commissionModelInfo}>
              <Text style={styles.commissionModelName}>Turnover Share</Text>
              <Text style={styles.commissionModelDesc}>Earn {currentLevel.turnover}% on all trade volume</Text>
            </View>
            <Text style={styles.commissionModelRate}>{currentLevel.turnover}%</Text>
          </View>
        </View>
        
        {/* Example Box */}
        <View style={styles.exampleBox}>
          <Text style={styles.exampleTitle}>Example at Level {currentLevel.level} ({currentLevel.name})</Text>
          <View style={styles.exampleRow}>
            <Text style={styles.exampleLabel}>User loses $100 trade:</Text>
            <Text style={styles.exampleValue}>You earn ${(100 * currentLevel.revenue / 100).toFixed(2)} (RevShare)</Text>
          </View>
          <View style={styles.exampleRow}>
            <Text style={styles.exampleLabel}>User trades $100 (any result):</Text>
            <Text style={styles.exampleValue}>You earn ${(100 * currentLevel.turnover / 100).toFixed(2)} (Turnover)</Text>
          </View>
        </View>
      </View>
      
      {/* Level Progress */}
      {nextLevel && (
        <View style={styles.levelProgressCard}>
          <View style={styles.levelProgressHeader}>
            <Text style={styles.levelProgressTitle}>Level Progress</Text>
            <Text style={styles.levelProgressCurrent}>{currentLevel.name} → {nextLevel.name}</Text>
          </View>
          <View style={styles.levelProgressBar}>
            <LinearGradient 
              colors={[currentLevel.color, nextLevel.color]} 
              start={{ x: 0, y: 0 }} 
              end={{ x: 1, y: 0 }}
              style={[styles.levelProgressFill, { width: `${Math.min(((affiliate?.total_ftds || 0) / nextLevel.minFtds) * 100, 100)}%` }]} 
            />
          </View>
          <Text style={styles.levelProgressText}>
            {affiliate?.total_ftds || 0} / {nextLevel.minFtds} FTDs to unlock {nextLevel.revenue}% commission
          </Text>
        </View>
      )}
      
      {/* Quick Stats */}
      <Text style={styles.sectionTitle}>Performance ({statsPeriod} Days)</Text>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderLeftColor: COLORS.primary }]}>
          <Ionicons name="card-outline" size={24} color={COLORS.primary} />
          <Text style={styles.statValue}>{formatMoney(dashboardData?.period_stats?.deposits || 0)}</Text>
          <Text style={styles.statLabel}>Deposits</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: COLORS.accent }]}>
          <Ionicons name="people-outline" size={24} color={COLORS.accent} />
          <Text style={styles.statValue}>{dashboardData?.period_stats?.ftds || 0}</Text>
          <Text style={styles.statLabel}>FTDs</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: COLORS.warning }]}>
          <Ionicons name="hand-left-outline" size={24} color={COLORS.warning} />
          <Text style={styles.statValue}>{dashboardData?.period_stats?.clicks || 0}</Text>
          <Text style={styles.statLabel}>Clicks</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: COLORS.purple }]}>
          <Ionicons name="person-add-outline" size={24} color={COLORS.purple} />
          <Text style={styles.statValue}>{dashboardData?.period_stats?.registrations || 0}</Text>
          <Text style={styles.statLabel}>Registrations</Text>
        </View>
      </View>
      
      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity style={styles.quickActionCard} onPress={() => setActiveTab('links')}>
          <LinearGradient colors={[COLORS.primary + '20', 'transparent']} style={styles.quickActionGradient}>
            <Ionicons name="link" size={28} color={COLORS.primary} />
          </LinearGradient>
          <Text style={styles.quickActionLabel}>Get Links</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionCard} onPress={() => setActiveTab('promo')}>
          <LinearGradient colors={[COLORS.accent + '20', 'transparent']} style={styles.quickActionGradient}>
            <Ionicons name="image" size={28} color={COLORS.accent} />
          </LinearGradient>
          <Text style={styles.quickActionLabel}>Promo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionCard} onPress={() => setActiveTab('stats')}>
          <LinearGradient colors={[COLORS.purple + '20', 'transparent']} style={styles.quickActionGradient}>
            <Ionicons name="stats-chart" size={28} color={COLORS.purple} />
          </LinearGradient>
          <Text style={styles.quickActionLabel}>Reports</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionCard}>
          <LinearGradient colors={[COLORS.warning + '20', 'transparent']} style={styles.quickActionGradient}>
            <Ionicons name="chatbubbles" size={28} color={COLORS.warning} />
          </LinearGradient>
          <Text style={styles.quickActionLabel}>Telegram</Text>
        </TouchableOpacity>
      </View>
      
      {/* Referral Link */}
      <View style={styles.refLinkCard}>
        <Text style={styles.refLinkLabel}>Your Referral Link</Text>
        <View style={styles.refLinkBox}>
          <Text style={styles.refLinkText} numberOfLines={1}>bynix.io/r/{affiliate?.ref_code}</Text>
          <TouchableOpacity style={styles.copyBtn}>
            <Ionicons name="copy-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Statistics Content
  const StatsContent = () => (
    <View style={styles.content}>
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {[7, 14, 30].map((days) => (
          <TouchableOpacity
            key={days}
            style={[styles.periodBtn, statsPeriod === days && styles.periodBtnActive]}
            onPress={() => setStatsPeriod(days)}
          >
            <Text style={[styles.periodBtnText, statsPeriod === days && styles.periodBtnTextActive]}>
              {days === 7 ? 'Week' : days === 14 ? '2 Weeks' : 'Month'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Stats Overview */}
      <View style={styles.statsOverviewCard}>
        <View style={styles.statsOverviewItem}>
          <Text style={styles.statsOverviewValue}>{formatMoney(statisticsData?.totals?.deposits || 0)}</Text>
          <Text style={styles.statsOverviewLabel}>Total Deposits</Text>
        </View>
        <View style={styles.statsOverviewDivider} />
        <View style={styles.statsOverviewItem}>
          <Text style={styles.statsOverviewValue}>{statisticsData?.totals?.ftds || 0}</Text>
          <Text style={styles.statsOverviewLabel}>Total FTDs</Text>
        </View>
      </View>
      
      {/* Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Activity Chart</Text>
        <View style={styles.chartContainer}>
          {statisticsData?.daily_stats?.slice(-7).map((day: any, i: number) => (
            <View key={i} style={styles.chartColumn}>
              <View style={styles.chartBars}>
                <View style={[styles.chartBar, { height: Math.max(day.clicks * 1.5, 4), backgroundColor: COLORS.warning }]} />
                <View style={[styles.chartBar, { height: Math.max(day.registrations * 3, 4), backgroundColor: COLORS.accent }]} />
                <View style={[styles.chartBar, { height: Math.max(day.ftds * 6, 4), backgroundColor: COLORS.primary }]} />
              </View>
              <Text style={styles.chartLabel}>{day.date?.slice(5)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} /><Text style={styles.legendText}>Clicks</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.accent }]} /><Text style={styles.legendText}>Regs</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} /><Text style={styles.legendText}>FTDs</Text></View>
        </View>
      </View>
      
      {/* Detailed Stats */}
      <View style={styles.detailedStatsGrid}>
        <View style={styles.detailedStatCard}>
          <Ionicons name="hand-left" size={20} color={COLORS.warning} />
          <Text style={styles.detailedStatValue}>{statisticsData?.totals?.clicks || 0}</Text>
          <Text style={styles.detailedStatLabel}>Clicks</Text>
        </View>
        <View style={styles.detailedStatCard}>
          <Ionicons name="person-add" size={20} color={COLORS.accent} />
          <Text style={styles.detailedStatValue}>{statisticsData?.totals?.registrations || 0}</Text>
          <Text style={styles.detailedStatLabel}>Registrations</Text>
        </View>
        <View style={styles.detailedStatCard}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
          <Text style={styles.detailedStatValue}>{statisticsData?.totals?.ftds || 0}</Text>
          <Text style={styles.detailedStatLabel}>FTDs</Text>
        </View>
      </View>
    </View>
  );

  // Links Content - Full Featured
  const LinksContent = () => {
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    
    const copyToClipboard = async (linkCode: string) => {
      try {
        const fullLink = `https://bynix.io/r/${linkCode}`;
        await Clipboard.setStringAsync(fullLink);
        setCopiedCode(linkCode);
        showToast('Link copied to clipboard!');
        setTimeout(() => setCopiedCode(null), 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
        showToast('Failed to copy link');
      }
    };
    
    const createNewLink = async () => {
      Keyboard.dismiss();
      try {
        const token = await getToken();
        if (!token) {
          showToast('Please login again');
          return;
        }
        const res = await fetch(`${API_URL}/affiliate/links`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `${LINK_TYPES.find(t => t.value === newLinkForm.linkType)?.label || 'New Link'}`,
            campaign: newLinkForm.linkType,
            program: newLinkForm.affiliateProgram,
            comment: newLinkForm.comment,
          })
        });
        if (res.ok) {
          setShowNewLinkModal(false);
          setNewLinkForm({ linkType: 'main_page', affiliateProgram: 'revenue_sharing', comment: '' });
          showToast('Link created successfully!');
          fetchLinks();
        } else {
          const errData = await res.json().catch(() => ({}));
          showToast(errData.detail || 'Failed to create link');
        }
      } catch (e) { 
        console.error('Create link error:', e); 
        showToast('Error creating link');
      }
    };
    
    const deleteLink = async (linkCode: string) => {
      Alert.alert(
        'Delete Link',
        `Are you sure you want to delete link #${linkCode}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: async () => {
              try {
                const token = await getToken();
                const res = await fetch(`${API_URL}/affiliate/links/${linkCode}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${token}` },
                });
                if (res.ok) {
                  showToast('Link deleted');
                  fetchLinks();
                } else {
                  showToast('Failed to delete link');
                }
              } catch (e) {
                console.error('Delete error:', e);
                showToast('Error deleting link');
              }
            }
          }
        ]
      );
    };

    const getProgramBadge = (program: string) => {
      if (program === 'turnover_sharing' || program === 'turnover') {
        return { label: 'Turnover', color: COLORS.accent, bg: COLORS.accentLight };
      }
      return { label: 'RevShare', color: COLORS.primary, bg: COLORS.primaryLight };
    };

    return (
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.linksPageHeader}>
          <View>
            <Text style={styles.linksPageTitle}>Your Links</Text>
            <Text style={styles.linksPageCount}>{links.length > 0 ? `1-${links.length} of ${links.length}` : '0 links'}</Text>
          </View>
          <TouchableOpacity style={styles.newLinkBtn} onPress={() => setShowNewLinkModal(true)}>
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.newLinkBtnText}>Create</Text>
          </TouchableOpacity>
        </View>
        
        {/* Info Box */}
        <View style={styles.linksInfoBox}>
          <View style={styles.infoIconWrap}>
            <Ionicons name="information-circle" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.infoTextWrap}>
            <Text style={styles.infoTitle}>About Your Affiliate Links</Text>
            <Text style={styles.infoText}>
              This section contains the links you can use to attract referrals. We provide links for two affiliate models – <Text style={styles.infoHighlight}>Revenue Share</Text> or <Text style={styles.infoHighlight}>Turnover Share</Text>.
            </Text>
            <Text style={styles.infoText}>
              You can create additional links for different traffic sources to track activity in the <Text style={styles.infoHighlight}>Statistics</Text> section.
            </Text>
          </View>
        </View>
        
        {/* Links List */}
        {links.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="link-outline" size={56} color={COLORS.textMuted} />
            <Text style={styles.emptyStateTitle}>No Links Yet</Text>
            <Text style={styles.emptyStateText}>Create your first link to start tracking referrals</Text>
            <TouchableOpacity style={styles.emptyCreateBtn} onPress={() => setShowNewLinkModal(true)}>
              <Text style={styles.emptyCreateBtnText}>Create First Link</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.linksListContainer}>
            {links.map((link, i) => {
              const programInfo = getProgramBadge(link.program || 'revenue_sharing');
              const isCopied = copiedCode === link.code;
              return (
                <View key={i} style={styles.linkCardNew}>
                  {/* Link Header with Program Badge and Delete */}
                  <View style={styles.linkCardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={styles.linkCodeBadge}>
                        <Text style={styles.linkCodeText}>#{link.code}</Text>
                      </View>
                      <View style={[styles.programBadge, { backgroundColor: programInfo.bg }]}>
                        <Text style={[styles.programBadgeText, { color: programInfo.color }]}>{programInfo.label}</Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={styles.deleteBtn}
                      onPress={() => deleteLink(link.code)}
                    >
                      <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Link URL - Domain: bynix.io with Copy */}
                  <View style={styles.linkUrlContainer}>
                    <Text style={styles.linkUrlLabel}>Referral Link</Text>
                    <TouchableOpacity 
                      style={[styles.linkUrlBoxNew, isCopied && styles.linkUrlBoxCopied]} 
                      onPress={() => copyToClipboard(link.code)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.linkUrlTextNew} numberOfLines={1} selectable>
                        bynix.io/r/{link.code}
                      </Text>
                      <View style={[styles.copyBtnNew, isCopied && styles.copyBtnCopied]}>
                        <Ionicons 
                          name={isCopied ? "checkmark" : "copy-outline"} 
                          size={18} 
                          color={isCopied ? COLORS.white : COLORS.primary} 
                        />
                      </View>
                    </TouchableOpacity>
                    {isCopied && <Text style={styles.copiedText}>Link copied!</Text>}
                  </View>
                  
                  {/* Link Type & Comment Row */}
                  <View style={styles.linkMetaRow}>
                    <View style={styles.linkMetaItem}>
                      <Ionicons name="pricetag-outline" size={14} color={COLORS.textMuted} />
                      <Text style={styles.linkMetaText}>{link.name || 'Default Link'}</Text>
                    </View>
                  </View>
                  
                  {/* Comment Section - Always Show */}
                  <View style={styles.commentSection}>
                    <Ionicons name="chatbubble-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.commentText} numberOfLines={2}>
                      {link.comment || 'No comment added'}
                    </Text>
                  </View>
                  
                  {/* Stats Row */}
                  <View style={styles.linkStatsRow}>
                    <View style={styles.linkStatBox}>
                      <Text style={styles.linkStatNum}>{link.clicks || 0}</Text>
                      <Text style={styles.linkStatName}>Clicks</Text>
                    </View>
                    <View style={styles.linkStatBox}>
                      <Text style={styles.linkStatNum}>{link.registrations || 0}</Text>
                      <Text style={styles.linkStatName}>Regs</Text>
                    </View>
                    <View style={styles.linkStatBox}>
                      <Text style={styles.linkStatNum}>{link.ftds || 0}</Text>
                      <Text style={styles.linkStatName}>FTDs</Text>
                    </View>
                    <View style={styles.linkStatBox}>
                      <Text style={styles.linkStatNum}>${link.deposits || 0}</Text>
                      <Text style={styles.linkStatName}>Deposits</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        
        {/* New Link Modal - Simple Fixed Design */}
        <Modal 
          visible={showNewLinkModal} 
          transparent 
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => { setShowNewLinkModal(false); }}
        >
          <Pressable 
            style={styles.modalOverlayFixed} 
            onPress={() => { Keyboard.dismiss(); setShowNewLinkModal(false); }}
          >
            <Pressable style={styles.modalContentFixed} onPress={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <View style={styles.modalHeaderRow}>
                <Text style={styles.newLinkModalTitle}>New Link</Text>
                <Pressable onPress={() => setShowNewLinkModal(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </Pressable>
              </View>
              
              {/* Link Type - Horizontal Chips */}
              <Text style={styles.inputLabel}>Link Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScrollView}>
                <View style={styles.chipContainer}>
                  {LINK_TYPES.map((type) => (
                    <Pressable 
                      key={type.value} 
                      style={[styles.chip, newLinkForm.linkType === type.value && styles.chipActive]}
                      onPress={() => setNewLinkForm({...newLinkForm, linkType: type.value})}
                    >
                      <Text style={[styles.chipText, newLinkForm.linkType === type.value && styles.chipTextActive]}>
                        {type.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              
              {/* Affiliate Program - Toggle Style */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>Affiliate Program</Text>
              <View style={styles.programToggle}>
                {AFFILIATE_PROGRAMS.map((prog) => (
                  <Pressable 
                    key={prog.value} 
                    style={[styles.programToggleBtn, newLinkForm.affiliateProgram === prog.value && styles.programToggleBtnActive]}
                    onPress={() => setNewLinkForm({...newLinkForm, affiliateProgram: prog.value})}
                  >
                    <Text style={[styles.programToggleText, newLinkForm.affiliateProgram === prog.value && styles.programToggleTextActive]}>
                      {prog.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              
              {/* Comment Input */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>Comment</Text>
              <TextInput
                style={styles.commentInputSimple}
                placeholder="Optional note..."
                placeholderTextColor={COLORS.textMuted}
                value={newLinkForm.comment}
                onChangeText={(text) => setNewLinkForm({...newLinkForm, comment: text})}
              />
              
              {/* Buttons */}
              <View style={styles.modalButtons}>
                <Pressable style={styles.cancelBtn} onPress={() => setShowNewLinkModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={createNewLink}>
                  <Text style={styles.saveBtnText}>Create</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    );
  };

  // Promo Content
  const PromoContent = () => (
    <View style={styles.content}>
      <Text style={styles.sectionTitle}>Promo Materials</Text>
      <Text style={styles.sectionSubtitle}>Download banners and landing pages</Text>
      
      {promoMaterials.map((material, i) => (
        <View key={i} style={styles.promoCard}>
          <View style={styles.promoPreview}>
            <Image source={{ uri: material.preview_url }} style={styles.promoImage} resizeMode="cover" />
          </View>
          <View style={styles.promoInfo}>
            <Text style={styles.promoName}>{material.name}</Text>
            <Text style={styles.promoSize}>{material.size || material.type}</Text>
          </View>
          <TouchableOpacity style={styles.promoDownloadBtn}>
            <Ionicons name="download-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  // Top 10 Content
  const Top10Content = () => (
    <View style={styles.content}>
      <Text style={styles.sectionTitle}>TOP 10 Partners</Text>
      <Text style={styles.sectionSubtitle}>Monthly leaderboard</Text>
      
      {top10.map((partner, i) => (
        <View key={i} style={[styles.top10Card, i < 3 && styles.top10CardTop]}>
          <View style={[styles.top10Rank, { backgroundColor: i === 0 ? COLORS.gold : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : COLORS.cardLight }]}>
            {i < 3 ? <Ionicons name="trophy" size={16} color="#FFF" /> : <Text style={styles.top10RankText}>{i + 1}</Text>}
          </View>
          <View style={styles.top10Info}>
            <Text style={styles.top10Name}>{partner.name}</Text>
            <Text style={styles.top10Level}>Level {partner.level}</Text>
          </View>
          <View style={styles.top10Stats}>
            <Text style={styles.top10Earnings}>{formatMoney(partner.total_earnings)}</Text>
            <Text style={styles.top10Ftds}>{partner.total_ftds} FTDs</Text>
          </View>
        </View>
      ))}
    </View>
  );

  // Support Content
  const SupportContent = () => (
    <View style={styles.content}>
      <View style={styles.supportCard}>
        <Ionicons name="headset-outline" size={56} color={COLORS.primary} />
        <Text style={styles.supportTitle}>Need Help?</Text>
        <Text style={styles.supportText}>Our affiliate managers are available 24/7</Text>
        
        <TouchableOpacity style={styles.telegramBtn}>
          <Ionicons name="logo-telegram" size={24} color="#FFF" />
          <Text style={styles.telegramBtnText}>Contact via Telegram</Text>
        </TouchableOpacity>
        
        <Text style={styles.supportEmail}>affiliate@bynix.com</Text>
      </View>
    </View>
  );

  // Levels Modal
  const LevelsModal = () => (
    <Modal visible={showLevelsModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.levelsModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Affiliate Levels</Text>
            <TouchableOpacity onPress={() => setShowLevelsModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <Text style={styles.levelsSubtitle}>Get more FTDs to unlock higher commission rates!</Text>
            
            {LEVELS.map((level, i) => (
              <View key={i} style={[styles.levelRow, currentLevel.level === level.level && styles.levelRowActive]}>
                {currentLevel.level === level.level && <Text style={styles.levelRowBadge}>CURRENT</Text>}
                <View style={styles.levelRowLeft}>
                  <View style={[styles.levelIcon, { backgroundColor: level.color + '20' }]}>
                    <Ionicons name={level.icon as any} size={20} color={level.color} />
                  </View>
                  <View>
                    <Text style={styles.levelName}>{level.name}</Text>
                    <Text style={styles.levelFtds}>{level.minFtds}+ FTDs</Text>
                  </View>
                </View>
                <View style={styles.levelRowRight}>
                  <Text style={[styles.levelRevenue, { color: level.color }]}>{level.revenue}%</Text>
                  <Text style={styles.levelTurnover}>{level.turnover}% TO</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Render content
  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <HomeContent />;
      case 'stats': return <StatsContent />;
      case 'links': return <LinksContent />;
      case 'promo': return <PromoContent />;
      case 'top10': return <Top10Content />;
      case 'support': return <SupportContent />;
      default: return <HomeContent />;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header />
      <ProfileDropdown />
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {renderContent()}
      </ScrollView>
      
      <BottomNav />
      <LevelsModal />
      
      {/* Toast Notification */}
      {toast.visible && (
        <View style={styles.toastContainer}>
          <View style={styles.toast}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: { flex: 1, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' },
  loadingLogo: { width: 160, height: 80 },
  loadingText: { color: COLORS.textSecondary, marginTop: 16, fontSize: 14 },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerLogo: { width: 100, height: 40 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  levelBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, marginRight: 12 },
  levelBadgeText: { fontSize: 11, fontWeight: '700', marginLeft: 4 },
  profileBtn: { flexDirection: 'row', alignItems: 'center', paddingLeft: 8 },
  profileAvatar: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  profileInitial: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  
  // Profile Dropdown - Fixed positioning
  dropdownOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 },
  profileDropdown: { position: 'absolute', top: 70, right: 16, backgroundColor: COLORS.white, borderRadius: 20, padding: 20, width: 260, zIndex: 1001, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 20 },
  profileDropdownHeader: { alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 12 },
  profileDropdownAvatarWrap: { marginBottom: 12 },
  profileDropdownAvatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  profileDropdownInitial: { color: '#FFF', fontSize: 22, fontWeight: '700' },
  profileName: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  profileEmail: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },
  profileIdBadge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  profileId: { color: COLORS.primary, fontSize: 11, fontWeight: '600' },
  profileMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  profileMenuIconWrap: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  profileMenuText: { color: COLORS.text, fontSize: 14, fontWeight: '500', marginLeft: 12, flex: 1 },
  profileDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  
  // Bottom Nav
  bottomNav: { flexDirection: 'row', backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8 },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  navItemActive: {},
  navIconWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  navIconWrapActive: { backgroundColor: COLORS.primaryLight },
  navLabel: { color: COLORS.textMuted, fontSize: 10, marginTop: 4, fontWeight: '500' },
  navLabelActive: { color: COLORS.primary, fontWeight: '600' },
  
  // Content
  scrollView: { flex: 1 },
  content: { padding: 20 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginBottom: 16 },
  sectionSubtitle: { color: COLORS.textSecondary, fontSize: 13, marginTop: -12, marginBottom: 16 },
  
  // Balance Card - Dark theme for contrast
  balanceCard: { borderRadius: 20, padding: 24, marginBottom: 20 },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' },
  withdrawBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryLight, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24 },
  withdrawBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '700', marginLeft: 6 },
  balanceAmount: { color: '#FFFFFF', fontSize: 42, fontWeight: '800', marginVertical: 8 },
  balanceFooter: { flexDirection: 'row', marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' },
  balanceStat: { flex: 1 },
  balanceStatLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  balanceStatValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginTop: 6 },
  balanceStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 16 },
  
  // Level Progress
  levelProgressCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  levelProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  levelProgressTitle: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  levelProgressCurrent: { color: COLORS.textSecondary, fontSize: 12 },
  levelProgressBar: { height: 8, backgroundColor: COLORS.cardLight, borderRadius: 4, overflow: 'hidden' },
  levelProgressFill: { height: 8, borderRadius: 4 },
  levelProgressText: { color: COLORS.textMuted, fontSize: 11, marginTop: 8 },
  
  // Commission Info Card
  commissionInfoCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  commissionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  commissionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginLeft: 10 },
  commissionModels: { marginBottom: 16 },
  commissionModel: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  commissionModelIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  commissionModelInfo: { flex: 1, marginLeft: 14 },
  commissionModelName: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  commissionModelDesc: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  commissionModelRate: { color: COLORS.primary, fontSize: 18, fontWeight: '800' },
  exampleBox: { backgroundColor: COLORS.cardLight, borderRadius: 12, padding: 16 },
  exampleTitle: { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 12 },
  exampleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  exampleLabel: { color: COLORS.textSecondary, fontSize: 12 },
  exampleValue: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  
  // Stats Grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, marginBottom: 20 },
  statCard: { width: '48%', backgroundColor: COLORS.white, borderRadius: 16, padding: 16, margin: '1%', borderLeftWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  statValue: { color: COLORS.text, fontSize: 20, fontWeight: '800', marginTop: 12 },
  statLabel: { color: COLORS.textSecondary, fontSize: 11, marginTop: 4 },
  
  // Quick Actions
  quickActionsGrid: { flexDirection: 'row', marginBottom: 20 },
  quickActionCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginHorizontal: 4, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  quickActionGradient: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickActionLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  
  // Ref Link
  refLinkCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  refLinkLabel: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 12 },
  refLinkBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardLight, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  refLinkText: { flex: 1, color: COLORS.text, fontSize: 14, fontWeight: '500' },
  copyBtn: { padding: 4 },
  
  // Period Selector
  periodSelector: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 12, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  periodBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  periodBtnActive: { backgroundColor: COLORS.primary },
  periodBtnText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  periodBtnTextActive: { color: '#FFF' },
  
  // Stats Overview
  statsOverviewCard: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 16, padding: 24, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  statsOverviewItem: { flex: 1, alignItems: 'center' },
  statsOverviewValue: { color: COLORS.text, fontSize: 24, fontWeight: '800' },
  statsOverviewLabel: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  statsOverviewDivider: { width: 1, backgroundColor: COLORS.border },
  
  // Chart
  chartCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  chartTitle: { color: COLORS.text, fontSize: 14, fontWeight: '600', marginBottom: 20 },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 120 },
  chartColumn: { alignItems: 'center' },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end' },
  chartBar: { width: 8, borderRadius: 4, marginHorizontal: 1 },
  chartLabel: { color: COLORS.textMuted, fontSize: 9, marginTop: 8 },
  chartLegend: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { color: COLORS.textSecondary, fontSize: 11 },
  
  // Detailed Stats
  detailedStatsGrid: { flexDirection: 'row' },
  detailedStatCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginHorizontal: 4, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  detailedStatValue: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginTop: 8 },
  detailedStatLabel: { color: COLORS.textSecondary, fontSize: 10, marginTop: 4 },
  
  // Links - New Design
  linksHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  createLinkBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  createLinkBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600', marginLeft: 6 },
  emptyState: { alignItems: 'center', paddingVertical: 48, backgroundColor: COLORS.white, borderRadius: 16, marginTop: 16 },
  emptyStateTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptyStateText: { color: COLORS.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
  emptyCreateBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 24 },
  emptyCreateBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  linkCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  linkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linkName: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  linkUrl: { color: COLORS.primary, fontSize: 13, marginTop: 8, marginBottom: 16 },
  linkStats: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  linkStatItem: { alignItems: 'center' },
  linkStatValue: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  linkStatLabel: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  
  // Links Page - Full Featured
  linksPageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  linksPageTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  linksPageCount: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  newLinkBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  newLinkBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700', marginLeft: 6 },
  
  // Info Box
  linksInfoBox: { backgroundColor: COLORS.primaryLight, borderRadius: 16, padding: 20, marginBottom: 20, flexDirection: 'row', borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  infoIconWrap: { marginRight: 16 },
  infoTextWrap: { flex: 1 },
  infoTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  infoText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 4 },
  infoHighlight: { color: COLORS.primary, fontWeight: '600' },
  
  // Links List Container
  linksListContainer: { marginTop: 8 },
  
  // Link Card New Design
  linkCardNew: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  linkCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  linkCodeBadge: { backgroundColor: COLORS.cardLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  linkCodeText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  programBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  programBadgeText: { fontSize: 12, fontWeight: '700' },
  deleteBtn: { padding: 8, borderRadius: 8, backgroundColor: COLORS.dangerLight },
  
  // Link URL Container
  linkUrlContainer: { marginBottom: 14 },
  linkUrlLabel: { fontSize: 11, color: COLORS.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  linkUrlBoxNew: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardLight, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10 },
  linkUrlBoxCopied: { backgroundColor: COLORS.primaryLight, borderWidth: 1, borderColor: COLORS.primary },
  linkUrlTextNew: { flex: 1, fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  copyBtnNew: { padding: 8, borderRadius: 8, backgroundColor: COLORS.white },
  copyBtnCopied: { backgroundColor: COLORS.primary },
  copiedText: { color: COLORS.primary, fontSize: 11, marginTop: 6, fontWeight: '600' },
  
  // Link Meta Row
  linkMetaRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  linkMetaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 4 },
  linkMetaText: { fontSize: 12, color: COLORS.textSecondary, marginLeft: 6 },
  
  // Comment Section
  commentSection: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.cardLight, padding: 12, borderRadius: 10, marginBottom: 14 },
  commentText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, marginLeft: 8, fontStyle: 'italic' },
  
  // Link Stats Row
  linkStatsRow: { flexDirection: 'row', paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border },
  linkStatBox: { flex: 1, alignItems: 'center' },
  linkStatNum: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  linkStatName: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  
  // Links Table
  linksTable: { backgroundColor: COLORS.white, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  tableHeader: { flexDirection: 'row', backgroundColor: COLORS.cardLight, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tableHeaderCell: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'center' },
  linkIdText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  linkUrlBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardLight, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  linkUrlText: { fontSize: 12, color: COLORS.primary, flex: 1, marginRight: 8 },
  linkTypeLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 6 },
  miniStats: { alignItems: 'center' },
  miniStatValue: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  miniStatLabel: { fontSize: 10, color: COLORS.textMuted },
  
  // New Link Modal - Fixed Center
  modalOverlayFixed: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContentFixed: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20, width: '100%', maxWidth: 400 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  newLinkModalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  modalCloseBtn: { padding: 4 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  
  // Chip Style for Link Type
  chipScrollView: { marginBottom: 4 },
  chipContainer: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: COLORS.cardLight, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  chipTextActive: { color: COLORS.white },
  
  // Program Toggle
  programToggle: { flexDirection: 'row', gap: 10 },
  programToggleBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.cardLight, borderWidth: 1, borderColor: COLORS.border },
  programToggleBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  programToggleText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  programToggleTextActive: { color: COLORS.white },
  
  // Comment Input Simple
  commentInputSimple: { backgroundColor: COLORS.cardLight, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  
  // Modal Buttons
  modalButtons: { flexDirection: 'row', marginTop: 20, gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 10, backgroundColor: COLORS.cardLight },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  saveBtn: { flex: 1.2, paddingVertical: 14, alignItems: 'center', borderRadius: 10, backgroundColor: COLORS.primary },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  
  // Promo
  promoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 12, padding: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  promoPreview: { width: 80, height: 50, borderRadius: 8, overflow: 'hidden', backgroundColor: COLORS.cardLight },
  promoImage: { width: '100%', height: '100%' },
  promoInfo: { flex: 1, marginLeft: 16 },
  promoName: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  promoSize: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  promoDownloadBtn: { padding: 8 },
  
  // Top 10
  top10Card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  top10CardTop: { borderWidth: 1, borderColor: COLORS.gold },
  top10Rank: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  top10RankText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '700' },
  top10Info: { flex: 1, marginLeft: 16 },
  top10Name: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  top10Level: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  top10Stats: { alignItems: 'flex-end' },
  top10Earnings: { color: COLORS.primary, fontSize: 15, fontWeight: '700' },
  top10Ftds: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  
  // Support
  supportCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 40, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  supportTitle: { color: COLORS.text, fontSize: 22, fontWeight: '700', marginTop: 20 },
  supportText: { color: COLORS.textSecondary, fontSize: 14, marginTop: 8, marginBottom: 32 },
  telegramBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0088CC', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16 },
  telegramBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginLeft: 12 },
  supportEmail: { color: COLORS.textMuted, fontSize: 13, marginTop: 20 },
  
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1 },
  levelsModalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  modalBody: { padding: 20 },
  levelsSubtitle: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 20 },
  levelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, position: 'relative' },
  levelRowActive: { backgroundColor: COLORS.primaryLight, marginHorizontal: -20, paddingHorizontal: 20, borderRadius: 12 },
  levelRowBadge: { position: 'absolute', top: 4, right: 0, color: COLORS.primary, fontSize: 9, fontWeight: '700' },
  levelRowLeft: { flexDirection: 'row', alignItems: 'center' },
  levelIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  levelName: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  levelFtds: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  levelRowRight: { alignItems: 'flex-end' },
  levelRevenue: { fontSize: 18, fontWeight: '800' },
  levelTurnover: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  
  // Toast
  toastContainer: { position: 'absolute', top: 100, left: 0, right: 0, alignItems: 'center', zIndex: 9999 },
  toast: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
  toastText: { color: COLORS.white, fontSize: 14, fontWeight: '600', marginLeft: 10 },
});
