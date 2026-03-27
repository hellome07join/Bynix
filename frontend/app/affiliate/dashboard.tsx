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
  const [showMyAccountModal, setShowMyAccountModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHelpCenterModal, setShowHelpCenterModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  
  // Settings states
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [usdtAddress, setUsdtAddress] = useState('');
  const [isEditingUsdtAddress, setIsEditingUsdtAddress] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Withdrawal states
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([]);
  const [isLoadingWithdrawals, setIsLoadingWithdrawals] = useState(false);
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  
  // Data
  const [affiliate, setAffiliate] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [statisticsData, setStatisticsData] = useState<any>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [top10, setTop10] = useState<any[]>([]);
  const [promoMaterials, setPromoMaterials] = useState<any[]>([]);
  const [statsPeriod, setStatsPeriod] = useState(7);
  const [statsViewTab, setStatsViewTab] = useState<'dates' | 'traders' | 'links' | 'countries'>('dates');
  const [statsPage, setStatsPage] = useState(1);
  const STATS_PER_PAGE = 10;
  
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
  
  // Handle name update
  const handleSaveName = async () => {
    if (!editedName.trim()) {
      showToast('Name cannot be empty');
      return;
    }
    
    setIsSavingName(true);
    try {
      const token = await AsyncStorage.getItem('affiliate_token');
      const response = await fetch(`${API_URL}/affiliate/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: editedName.trim() })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local affiliate state
        setAffiliate((prev: any) => ({ ...prev, name: editedName.trim() }));
        setIsEditingName(false);
        showToast('Name updated successfully!');
        
        // Refresh TOP 10 leaderboard to show new name
        const top10Res = await fetch(`${API_URL}/affiliate/top10`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const top10Data = await top10Res.json();
        if (top10Data.top10) setTop10(top10Data.top10);
      } else {
        showToast(data.detail || 'Failed to update name');
      }
    } catch (error) {
      console.error('Error updating name:', error);
      showToast('Failed to update name');
    } finally {
      setIsSavingName(false);
    }
  };
  
  // Start editing name
  const startEditingName = () => {
    setEditedName(affiliate?.name || '');
    setIsEditingName(true);
  };
  
  // Cancel editing name
  const cancelEditingName = () => {
    setIsEditingName(false);
    setEditedName('');
  };
  
  // Load affiliate settings when settings modal opens
  const loadAffiliateSettings = async () => {
    try {
      const token = await AsyncStorage.getItem('affiliate_token');
      const response = await fetch(`${API_URL}/affiliate/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setEmailNotifications(data.settings.email_notifications ?? true);
        setPushNotifications(data.settings.push_notifications ?? true);
        setUsdtAddress(data.settings.usdt_trc20_address || '');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };
  
  // Toggle notification setting
  const toggleNotificationSetting = async (type: 'email' | 'push') => {
    const token = await AsyncStorage.getItem('affiliate_token');
    const newValue = type === 'email' ? !emailNotifications : !pushNotifications;
    
    // Update UI immediately
    if (type === 'email') setEmailNotifications(newValue);
    else setPushNotifications(newValue);
    
    try {
      const response = await fetch(`${API_URL}/affiliate/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          [type === 'email' ? 'email_notifications' : 'push_notifications']: newValue
        })
      });
      const data = await response.json();
      if (data.success) {
        showToast(`${type === 'email' ? 'Email' : 'Push'} notifications ${newValue ? 'enabled' : 'disabled'}`);
      }
    } catch (error) {
      // Revert on error
      if (type === 'email') setEmailNotifications(!newValue);
      else setPushNotifications(!newValue);
      showToast('Failed to update setting');
    }
  };
  
  // Save USDT TRC20 address
  const saveUsdtAddress = async () => {
    if (usdtAddress && !usdtAddress.startsWith('T')) {
      showToast('Invalid TRC20 address format (must start with T)');
      return;
    }
    
    setIsSavingSettings(true);
    try {
      const token = await AsyncStorage.getItem('affiliate_token');
      const response = await fetch(`${API_URL}/affiliate/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ usdt_trc20_address: usdtAddress })
      });
      const data = await response.json();
      if (data.success) {
        setIsEditingUsdtAddress(false);
        showToast('USDT TRC20 address saved successfully!');
      } else {
        showToast(data.detail || 'Failed to save address');
      }
    } catch (error) {
      showToast('Failed to save address');
    } finally {
      setIsSavingSettings(false);
    }
  };
  
  // Change password
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Please fill all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters');
      return;
    }
    
    setIsChangingPassword(true);
    try {
      const token = await AsyncStorage.getItem('affiliate_token');
      const response = await fetch(`${API_URL}/affiliate/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });
      const data = await response.json();
      if (data.success) {
        setShowChangePasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showToast('Password changed successfully!');
      } else {
        showToast(data.detail || 'Failed to change password');
      }
    } catch (error) {
      showToast('Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };
  
  // Load withdrawal history
  const loadWithdrawalHistory = async () => {
    setIsLoadingWithdrawals(true);
    try {
      const token = await AsyncStorage.getItem('affiliate_token');
      const response = await fetch(`${API_URL}/affiliate/withdrawals`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.withdrawals) {
        setWithdrawalHistory(data.withdrawals);
      }
    } catch (error) {
      console.error('Error loading withdrawals:', error);
    } finally {
      setIsLoadingWithdrawals(false);
    }
  };
  
  // Submit withdrawal request
  const handleWithdrawal = async () => {
    const amount = parseFloat(withdrawAmount);
    
    if (!amount || amount <= 0) {
      showToast('Please enter a valid amount');
      return;
    }
    
    if (amount < 50) {
      showToast('Minimum withdrawal is $50');
      return;
    }
    
    if (amount > (affiliate?.balance || 0)) {
      showToast('Insufficient balance');
      return;
    }
    
    if (!usdtAddress) {
      showToast('Please set your USDT TRC20 address in Settings first');
      return;
    }
    
    setIsSubmittingWithdrawal(true);
    try {
      const token = await AsyncStorage.getItem('affiliate_token');
      const response = await fetch(`${API_URL}/affiliate/withdrawal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: amount,
          wallet_address: usdtAddress,
          payment_method: 'USDT_TRC20'
        })
      });
      const data = await response.json();
      
      if (data.success) {
        showToast('Withdrawal request submitted successfully!');
        setWithdrawAmount('');
        // Update balance locally
        setAffiliate((prev: any) => ({ ...prev, balance: (prev?.balance || 0) - amount }));
        // Reload withdrawal history
        loadWithdrawalHistory();
      } else {
        showToast(data.detail || 'Withdrawal failed');
      }
    } catch (error) {
      showToast('Failed to submit withdrawal');
    } finally {
      setIsSubmittingWithdrawal(false);
    }
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
    
    const handleMyAccount = () => {
      setShowProfileMenu(false);
      setShowMyAccountModal(true);
    };
    
    const handleSettings = () => {
      setShowProfileMenu(false);
      setShowSettingsModal(true);
    };
    
    const handleHelpCenter = () => {
      setShowProfileMenu(false);
      setShowHelpCenterModal(true);
    };
    
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
              <Text style={styles.profileId}>ID: {affiliate?.ref_code || links?.[0]?.code || 'BYN00000'}</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.profileMenuItem} onPress={handleMyAccount}>
            <View style={[styles.profileMenuIconWrap, { backgroundColor: COLORS.accentLight }]}>
              <Ionicons name="person-outline" size={16} color={COLORS.accent} />
            </View>
            <Text style={styles.profileMenuText}>My Account</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.profileMenuItem} onPress={handleSettings}>
            <View style={[styles.profileMenuIconWrap, { backgroundColor: COLORS.purpleLight }]}>
              <Ionicons name="settings-outline" size={16} color={COLORS.purple} />
            </View>
            <Text style={styles.profileMenuText}>Settings</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.profileMenuItem} onPress={handleHelpCenter}>
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
      {/* Balance Cards - Available + Hold */}
      <View style={styles.balanceCardsContainer}>
        {/* Available Balance Card */}
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
        
        {/* Hold Balance Card */}
        <View style={styles.holdBalanceCard}>
          <View style={styles.holdBalanceHeader}>
            <View style={styles.holdBalanceIconContainer}>
              <Ionicons name="time-outline" size={20} color="#FFA500" />
            </View>
            <View style={styles.holdBalanceInfo}>
              <Text style={styles.holdBalanceLabel}>Hold Balance</Text>
              <Text style={styles.holdBalanceAmount}>{formatMoney(affiliate?.hold_balance || 0)}</Text>
            </View>
          </View>
          <View style={styles.holdBalanceFooter}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.holdBalanceRelease}>Released every Monday 6 AM (SGT)</Text>
          </View>
          <View style={styles.holdBalanceNote}>
            <Text style={styles.holdBalanceNoteText}>
              New commissions are held until next Monday payout
            </Text>
          </View>
        </View>
      </View>
      
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
          <Text style={styles.refLinkText} numberOfLines={1}>bynix-markets.preview.emergentagent.com?ref={affiliate?.ref_code}</Text>
          <TouchableOpacity style={styles.copyBtn}>
            <Ionicons name="copy-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Statistics Content
  const StatsContent = () => {
    const STATS_TABS = [
      { key: 'dates', label: 'Dates', icon: 'calendar-outline' },
      { key: 'traders', label: 'Traders', icon: 'people-outline' },
      { key: 'links', label: 'Links', icon: 'link-outline' },
      { key: 'countries', label: 'Countries', icon: 'globe-outline' },
    ];
    
    // Search state for Trader ID
    const [traderSearchQuery, setTraderSearchQuery] = React.useState('');
    const [searchedTrader, setSearchedTrader] = React.useState<any>(null);
    const [isSearching, setIsSearching] = React.useState(false);
    
    // Sample data - will be replaced with real API data
    const datesData = statisticsData?.daily_stats || [];
    const tradersData = statisticsData?.traders || [];
    const linksData = links || [];
    const countriesData = statisticsData?.countries || [];
    
    // Get paginated data
    const getPaginatedData = (data: any[]) => {
      const start = (statsPage - 1) * STATS_PER_PAGE;
      return data.slice(start, start + STATS_PER_PAGE);
    };
    
    const getTotalPages = (data: any[]) => Math.ceil(data.length / STATS_PER_PAGE);
    
    // Search trader by ID
    const handleTraderSearch = () => {
      if (!traderSearchQuery.trim()) {
        setSearchedTrader(null);
        return;
      }
      
      setIsSearching(true);
      
      console.log('[Affiliate] Searching for trader:', traderSearchQuery);
      console.log('[Affiliate] tradersData count:', tradersData.length);
      console.log('[Affiliate] tradersData IDs:', tradersData.map((t: any) => t.id || t.display_id));
      
      // Search in traders data - exact match for ID
      const searchTerm = traderSearchQuery.trim();
      const found = tradersData.find((t: any) => {
        const id = t.id?.toString() || '';
        const displayId = t.display_id?.toString() || '';
        const userId = t.user_id?.toString() || '';
        
        return id === searchTerm || 
               displayId === searchTerm || 
               id.includes(searchTerm) ||
               displayId.includes(searchTerm) ||
               userId.includes(searchTerm);
      });
      
      console.log('[Affiliate] Search result:', found ? found.id : 'NOT FOUND');
      
      if (found) {
        setSearchedTrader(found);
      } else {
        // Create a mock searched trader result for demo
        setSearchedTrader({
          user_id: traderSearchQuery,
          country_flag: '🌍',
          created_at: new Date().toISOString().slice(0, 10),
          link_type: 'revenue',
          link_code: 'BYN001',
          balance: 0,
          deposits_count: 0,
          deposits_sum: 0,
          bonuses: 0,
          withdrawals: 0,
          turnover: 0,
          turnover_clear: 0,
          pnl: 0,
          pnl_clear: 0,
          vol_share: 0,
          rev_share: 0,
          not_found: true
        });
      }
      
      setIsSearching(false);
    };
    
    // Clear search
    const clearTraderSearch = () => {
      setTraderSearchQuery('');
      setSearchedTrader(null);
    };
    
    // Render Dates Tab
    const renderDatesTab = () => (
      <View style={styles.statsTableContainer}>
        {/* Table Header */}
        <View style={styles.statsTableHeader}>
          <Text style={[styles.statsTableHeaderText, { flex: 1.2 }]}>DATE</Text>
          <Text style={[styles.statsTableHeaderText, { flex: 0.8 }]}>CLICKS</Text>
          <Text style={[styles.statsTableHeaderText, { flex: 1 }]}>REGS</Text>
          <Text style={[styles.statsTableHeaderText, { flex: 0.8 }]}>FTD</Text>
        </View>
        
        {/* Table Rows */}
        {datesData.length === 0 ? (
          <View style={styles.statsEmptyRow}>
            <Ionicons name="analytics-outline" size={32} color={COLORS.textMuted} />
            <Text style={styles.statsEmptyText}>No data for this period</Text>
          </View>
        ) : (
          getPaginatedData(datesData).map((day: any, i: number) => {
            const regPercent = day.clicks > 0 ? ((day.registrations / day.clicks) * 100).toFixed(1) : '0';
            return (
              <View key={i} style={[styles.statsTableRow, i % 2 === 0 && styles.statsTableRowAlt]}>
                <Text style={[styles.statsTableCell, { flex: 1.2 }]}>{day.date || '-'}</Text>
                <Text style={[styles.statsTableCell, { flex: 0.8 }]}>{day.clicks || 0}</Text>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.statsTableCell}>{day.registrations || 0}</Text>
                  <Text style={styles.statsTablePercent}>({regPercent}%)</Text>
                </View>
                <Text style={[styles.statsTableCell, { flex: 0.8, color: COLORS.primary }]}>{day.ftds || 0}</Text>
              </View>
            );
          })
        )}
      </View>
    );
    
    // Render Traders Tab - Complete detailed view with all user stats
    const renderTradersTab = () => {
      // Get affiliate's commission rates based on level
      const currentLevelData = LEVELS.find(l => l.level === (affiliate?.level || 1)) || LEVELS[0];
      const revenueRate = currentLevelData.revenue;
      const turnoverRate = currentLevelData.turnover;
      
      // Render single trader detail card
      const renderTraderDetailCard = (trader: any) => {
        const linkType = trader.link_type || 'revenue';
        const isRevenue = linkType === 'revenue' || linkType === 'revenue_sharing';
        const commRate = isRevenue ? revenueRate : turnoverRate;
        const volShare = !isRevenue ? ((trader.turnover || 0) * turnoverRate / 100) : 0;
        const userPnL = trader.pnl || 0;
        const revShare = isRevenue ? (-userPnL * revenueRate / 100) : 0;
        
        return (
          <View style={styles.traderDetailCard}>
            {/* Header with User ID and Flag */}
            <View style={styles.traderDetailHeader}>
              <View style={styles.traderIdRow}>
                <Text style={styles.traderDetailFlag}>{trader.flag || trader.country_flag || '🌍'}</Text>
                <Text style={styles.traderDetailId}>ID: {trader.id || trader.display_id || trader.user_id}</Text>
              </View>
              <TouchableOpacity onPress={clearTraderSearch} style={styles.closeSearchBtn}>
                <Ionicons name="close-circle" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            
            {trader.not_found && (
              <View style={styles.traderNotFoundBanner}>
                <Ionicons name="information-circle" size={18} color={COLORS.warning} />
                <Text style={styles.traderNotFoundText}>Trader not found in your referrals</Text>
              </View>
            )}
            
            {/* Detail Rows */}
            <View style={styles.traderDetailGrid}>
              {/* Row 1 */}
              <View style={styles.traderDetailRow}>
                <View style={styles.traderDetailItem}>
                  <Text style={styles.traderDetailLabel}>REG DATE</Text>
                  <Text style={styles.traderDetailValue}>{trader.date || trader.created_at?.slice(0, 10) || '-'}</Text>
                </View>
                <View style={styles.traderDetailItem}>
                  <Text style={styles.traderDetailLabel}>LINK TYPE</Text>
                  <View style={[
                    styles.linkTypeBadgeLarge,
                    { backgroundColor: isRevenue ? COLORS.primaryLight : COLORS.accentLight }
                  ]}>
                    <Text style={[
                      styles.linkTypeBadgeTextLarge,
                      { color: isRevenue ? COLORS.primary : COLORS.accent }
                    ]}>
                      {isRevenue ? 'Revenue' : 'Turnover'}
                    </Text>
                  </View>
                </View>
                <View style={styles.traderDetailItem}>
                  <Text style={styles.traderDetailLabel}>COMMISSION</Text>
                  <Text style={[styles.traderDetailValue, { color: COLORS.primary, fontWeight: '700' }]}>{commRate}%</Text>
                </View>
              </View>
              
              {/* Row 2 */}
              <View style={styles.traderDetailRow}>
                <View style={styles.traderDetailItem}>
                  <Text style={styles.traderDetailLabel}>LINK ID</Text>
                  <Text style={[styles.traderDetailValue, { color: COLORS.accent }]}>#{trader.linkId || trader.link_code || trader.link_id || '-'}</Text>
                </View>
                <View style={styles.traderDetailItem}>
                  <Text style={styles.traderDetailLabel}>BALANCE</Text>
                  <Text style={[styles.traderDetailValue, { color: COLORS.primary }]}>${(trader.balance || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.traderDetailItem}>
                  <Text style={styles.traderDetailLabel}>DEPOSITS</Text>
                  <Text style={styles.traderDetailValue}>{trader.deposits_count || 0}x</Text>
                </View>
              </View>
              
              {/* Row 3 */}
              <View style={styles.traderDetailRow}>
                <View style={styles.traderDetailItem}>
                  <Text style={styles.traderDetailLabel}>DEPOSITS SUM</Text>
                  <Text style={styles.traderDetailValue}>${(trader.deposits_sum || trader.deposits || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.traderDetailItem}>
                  <Text style={styles.traderDetailLabel}>BONUSES</Text>
                  <Text style={styles.traderDetailValue}>${(trader.bonuses || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.traderDetailItem}>
                  <Text style={styles.traderDetailLabel}>WITHDRAWALS</Text>
                  <Text style={styles.traderDetailValue}>${(trader.withdrawals || 0).toFixed(2)}</Text>
                </View>
              </View>
              
              {/* Row 4 */}
              <View style={styles.traderDetailRow}>
                <View style={styles.traderDetailItem}>
                  <Text style={styles.traderDetailLabel}>TURNOVER ALL</Text>
                  <Text style={styles.traderDetailValue}>${(trader.turnover || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.traderDetailItem}>
                  <Text style={styles.traderDetailLabel}>TURNOVER CLR</Text>
                  <Text style={[styles.traderDetailValue, { color: COLORS.textMuted }]}>
                    {trader.turnover_clear ? `$${trader.turnover_clear.toFixed(2)}` : '-'}
                  </Text>
                </View>
              </View>
              
              {/* Row 5 */}
              <View style={styles.traderDetailRow}>
                <View style={styles.traderDetailItem}>
                  <Text style={styles.traderDetailLabel}>P/L ALL</Text>
                  <Text style={[styles.traderDetailValue, { color: userPnL >= 0 ? COLORS.primary : COLORS.danger }]}>
                    ${userPnL.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.traderDetailItem}>
                  <Text style={styles.traderDetailLabel}>P/L CLEAR</Text>
                  <Text style={[styles.traderDetailValue, { color: COLORS.textMuted }]}>
                    {trader.pnl_clear ? `$${trader.pnl_clear.toFixed(2)}` : '-'}
                  </Text>
                </View>
              </View>
              
              {/* Commission Row - Highlighted */}
              <View style={styles.traderCommissionRow}>
                <View style={styles.traderCommissionItem}>
                  <Text style={styles.traderCommissionLabel}>VOL SHARE</Text>
                  <Text style={[styles.traderCommissionValue, { color: volShare > 0 ? COLORS.primary : COLORS.textMuted }]}>
                    {!isRevenue && volShare > 0 ? `$${volShare.toFixed(2)}` : '$ 0.00'}
                  </Text>
                  <Text style={styles.traderCommissionNote}>
                    {!isRevenue ? 'From Turnover' : 'N/A (Revenue Link)'}
                  </Text>
                </View>
                <View style={styles.traderCommissionItem}>
                  <Text style={styles.traderCommissionLabel}>REV SHARE</Text>
                  <Text style={[styles.traderCommissionValue, { 
                    color: revShare >= 0 ? COLORS.primary : COLORS.danger,
                    fontWeight: '700'
                  }]}>
                    {isRevenue ? `${revShare >= 0 ? '' : '-'}$${Math.abs(revShare).toFixed(2)}` : '$ 0.00'}
                  </Text>
                  <Text style={styles.traderCommissionNote}>
                    {isRevenue ? (revShare < 0 ? 'User Profit (You Lose)' : 'User Loss (You Earn)') : 'N/A (Turnover Link)'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
      };
      
      return (
        <View>
          {/* Search Bar */}
          <View style={styles.traderSearchContainer}>
            <View style={styles.traderSearchBar}>
              <Ionicons name="search" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.traderSearchInput}
                placeholder="Search Trader ID (e.g., 10000003)"
                placeholderTextColor={COLORS.textMuted}
                value={traderSearchQuery}
                onChangeText={setTraderSearchQuery}
                keyboardType="number-pad"
                onSubmitEditing={handleTraderSearch}
              />
              {traderSearchQuery ? (
                <TouchableOpacity onPress={clearTraderSearch}>
                  <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity style={styles.traderSearchBtn} onPress={handleTraderSearch}>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {/* Search Result Card */}
          {searchedTrader && renderTraderDetailCard(searchedTrader)}
          
          {/* Traders Table - Only show when not searching */}
          {!searchedTrader && (
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.horizontalScroll}>
              <View style={styles.wideTableWrapperTradersNew}>
                {/* Table Header - Complete columns as per user request */}
                <View style={styles.wideTableHeader}>
                  <Text style={[styles.statsTableHeaderText, styles.colUserId]}>USER ID</Text>
                  <Text style={[styles.statsTableHeaderText, styles.colDate]}>REG DATE</Text>
                  <Text style={[styles.statsTableHeaderText, styles.colLinkType]}>LINK TYPE</Text>
                  <Text style={[styles.statsTableHeaderText, styles.colSmallNum]}>COMM %</Text>
                  <Text style={[styles.statsTableHeaderText, styles.colLinkId]}>LINK ID</Text>
                  <Text style={[styles.statsTableHeaderText, styles.colMoney]}>BALANCE</Text>
                  <Text style={[styles.statsTableHeaderText, styles.colSmallNum]}>DEPS</Text>
                  <Text style={[styles.statsTableHeaderText, styles.colMoney]}>DEPS SUM</Text>
                  <Text style={[styles.statsTableHeaderText, styles.colMoney]}>BONUSES</Text>
                  <Text style={[styles.statsTableHeaderText, styles.colMoney]}>WITHDRAW</Text>
                  <Text style={[styles.statsTableHeaderText, styles.colMoney]}>TURNOVER ALL</Text>
                  <Text style={[styles.statsTableHeaderText, styles.colMoney]}>TURNOVER CLR</Text>
                  <Text style={[styles.statsTableHeaderText, styles.colMoney]}>P/L ALL</Text>
                  <Text style={[styles.statsTableHeaderText, styles.colMoney]}>P/L CLEAR</Text>
                  <Text style={[styles.statsTableHeaderText, styles.colMoney]}>VOL SHARE</Text>
                  <Text style={[styles.statsTableHeaderText, styles.colMoney]}>REV SHARE</Text>
                </View>
            
            {/* Table Rows - Show empty state if no data */}
            {tradersData.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
                <Text style={{ color: COLORS.textMuted, marginTop: 12, fontSize: 14 }}>No referred traders yet</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4 }}>
                  Share your affiliate link to start earning commissions
                </Text>
              </View>
            ) : (
              getPaginatedData(tradersData).map((trader: any, i: number) => {
                const linkType = trader.link_type || 'revenue';
                const isRevenue = linkType === 'revenue' || linkType === 'revenue_sharing';
                const commRate = isRevenue ? revenueRate : turnoverRate;
                
                // Calculate Volume Share (only for turnover links)
                const volShare = !isRevenue ? ((trader.turnover || 0) * turnoverRate / 100) : 0;
                
                // Calculate Revenue Share (only for revenue links)
                // If user profits, affiliate loses (negative), if user loses, affiliate gains (positive)
                const userPnL = trader.pnl || 0;
                const revShare = isRevenue ? (-userPnL * revenueRate / 100) : 0;
                
                return (
                  <View key={i} style={[styles.wideTableRow, i % 2 === 0 && styles.statsTableRowAlt]}>
                    {/* User ID with Country Flag */}
                    <View style={[styles.colUserId, { flexDirection: 'row', alignItems: 'center' }]}>
                      <Text style={styles.traderFlag}>{trader.flag || trader.country_flag || '🌍'}</Text>
                      <Text style={[styles.statsTableCell, { color: COLORS.primary, fontWeight: '600' }]}>
                        {trader.id || trader.display_id || trader.user_id || `1000000${i + 1}`}
                      </Text>
                    </View>
                    
                    {/* Registration Date */}
                    <Text style={[styles.statsTableCell, styles.colDate]}>
                      {trader.date || trader.created_at?.slice(0, 10) || '-'}
                    </Text>
                    
                    {/* Link Type Badge */}
                    <View style={styles.colLinkType}>
                      <View style={[
                        styles.linkTypeBadge, 
                        { backgroundColor: isRevenue ? COLORS.primaryLight : COLORS.accentLight }
                      ]}>
                        <Text style={[
                          styles.linkTypeBadgeText,
                          { color: isRevenue ? COLORS.primary : COLORS.accent }
                        ]}>
                          {trader.type || (isRevenue ? 'Revenue' : 'Turnover')}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Commission % */}
                    <Text style={[styles.statsTableCell, styles.colSmallNum, { fontWeight: '600' }]}>
                      {commRate}%
                    </Text>
                    
                    {/* Link ID */}
                    <Text style={[styles.statsTableCell, styles.colLinkId, { color: COLORS.accent }]}>
                      #{trader.linkId || trader.link_code || '-'}
                    </Text>
                    
                    {/* Current Balance */}
                    <Text style={[styles.statsTableCell, styles.colMoney, { color: COLORS.primary }]}>
                      ${(trader.balance || 0).toFixed(2)}
                    </Text>
                    
                    {/* Deposits Count */}
                    <Text style={[styles.statsTableCell, styles.colSmallNum]}>
                      {trader.deposits_count || 0}
                    </Text>
                    
                    {/* Deposits Sum */}
                    <Text style={[styles.statsTableCell, styles.colMoney]}>
                      ${(trader.total_deposited || trader.deposits_sum || trader.deposits || 0).toFixed(2)}
                    </Text>
                    
                    {/* Bonuses */}
                    <Text style={[styles.statsTableCell, styles.colMoney]}>
                      ${(trader.bonuses || 0).toFixed(2)}
                    </Text>
                    
                    {/* Withdrawals */}
                    <Text style={[styles.statsTableCell, styles.colMoney]}>
                      ${(trader.withdrawals || 0).toFixed(2)}
                    </Text>
                    
                    {/* Turnover All */}
                    <Text style={[styles.statsTableCell, styles.colMoney]}>
                      ${(trader.turnover || 0).toFixed(2)}
                    </Text>
                    
                    {/* Turnover Clear */}
                    <Text style={[styles.statsTableCell, styles.colMoney, { color: COLORS.textMuted }]}>
                      {trader.turnover_clear ? `$${trader.turnover_clear.toFixed(2)}` : '-'}
                    </Text>
                    
                    {/* P/L All */}
                    <Text style={[styles.statsTableCell, styles.colMoney, { 
                      color: userPnL >= 0 ? COLORS.primary : COLORS.danger 
                    }]}>
                      ${userPnL.toFixed(2)}
                    </Text>
                    
                    {/* P/L Clear */}
                    <Text style={[styles.statsTableCell, styles.colMoney, { color: COLORS.textMuted }]}>
                      {trader.pnl_clear ? `$${trader.pnl_clear.toFixed(2)}` : '-'}
                    </Text>
                    
                    {/* Volume Share - Only for turnover links */}
                    <Text style={[styles.statsTableCell, styles.colMoney, { 
                      color: volShare > 0 ? COLORS.primary : COLORS.textMuted 
                    }]}>
                      {!isRevenue && volShare > 0 ? `$${volShare.toFixed(2)}` : '$ 0.00'}
                    </Text>
                    
                    {/* Revenue Share - Only for revenue links, negative if user profits */}
                    <Text style={[styles.statsTableCell, styles.colMoney, { 
                      color: revShare >= 0 ? COLORS.primary : COLORS.danger,
                      fontWeight: '600'
                    }]}>
                      {isRevenue ? `${revShare >= 0 ? '' : '-'}$${Math.abs(revShare).toFixed(2)}` : '$ 0.00'}
                    </Text>
                  </View>
                );
              })
            )}
              </View>
            </ScrollView>
          )}
        </View>
      );
    };
    
    // Render Links Tab
    const renderLinksTab = () => (
      <View style={styles.statsTableContainer}>
        {/* Table Header */}
        <View style={styles.statsTableHeader}>
          <Text style={[styles.statsTableHeaderText, { flex: 1.2 }]}>LINK</Text>
          <Text style={[styles.statsTableHeaderText, { flex: 0.8 }]}>CLICKS</Text>
          <Text style={[styles.statsTableHeaderText, { flex: 1 }]}>REGS</Text>
          <Text style={[styles.statsTableHeaderText, { flex: 0.8 }]}>FTD</Text>
        </View>
        
        {/* Table Rows */}
        {linksData.length === 0 ? (
          <View style={styles.statsEmptyRow}>
            <Ionicons name="link-outline" size={32} color={COLORS.textMuted} />
            <Text style={styles.statsEmptyText}>No links created</Text>
          </View>
        ) : (
          getPaginatedData(linksData).map((link: any, i: number) => {
            const regPercent = link.clicks > 0 ? ((link.registrations / link.clicks) * 100).toFixed(1) : '0';
            const ftdPercent = link.registrations > 0 ? ((link.ftds / link.registrations) * 100).toFixed(1) : '0';
            return (
              <View key={i} style={[styles.statsTableRow, i % 2 === 0 && styles.statsTableRowAlt]}>
                <View style={{ flex: 1.2 }}>
                  <Text style={styles.linkCodeCell}>#{link.code}</Text>
                  <Text style={styles.linkNameCell}>{link.name || '-'}</Text>
                </View>
                <Text style={[styles.statsTableCell, { flex: 0.8 }]}>{link.clicks || 0}</Text>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.statsTableCell}>{link.registrations || 0}</Text>
                  <Text style={styles.statsTablePercent}>({regPercent}%)</Text>
                </View>
                <View style={{ flex: 0.8, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.statsTableCell, { color: COLORS.primary }]}>{link.ftds || 0}</Text>
                  <Text style={styles.statsTablePercent}>({ftdPercent}%)</Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    );
    
    // Render Countries Tab - Horizontally Scrollable with All Columns (Matching Quotex Partner Design)
    const renderCountriesTab = () => {
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.horizontalScroll}>
          <View style={styles.wideTableWrapperCountries}>
            {/* Table Header - Matching Screenshot */}
            <View style={styles.wideTableHeader}>
              <Text style={[styles.statsTableHeaderText, styles.colCountry]}>COUNTRY</Text>
              <Text style={[styles.statsTableHeaderText, styles.colSmall]}>CLICKS</Text>
              <Text style={[styles.statsTableHeaderText, styles.colRegs]}>REGISTRATIONS</Text>
              <Text style={[styles.statsTableHeaderText, styles.colSmall]}>FTD</Text>
              <Text style={[styles.statsTableHeaderText, styles.colMoney]}>FTD SUM</Text>
              <Text style={[styles.statsTableHeaderText, styles.colSmall]}>DEPOSITS</Text>
              <Text style={[styles.statsTableHeaderText, styles.colMoney]}>DEPOSITS SUM</Text>
              <Text style={[styles.statsTableHeaderText, styles.colMoney]}>BONUSES</Text>
              <Text style={[styles.statsTableHeaderText, styles.colMoney]}>WITHDRAWALS</Text>
              <Text style={[styles.statsTableHeaderText, styles.colSmall]}>TRADERS</Text>
              <Text style={[styles.statsTableHeaderText, styles.colTurnover]}>TURNOVER ALL</Text>
              <Text style={[styles.statsTableHeaderText, styles.colMoney]}>P/L ALL</Text>
              <Text style={[styles.statsTableHeaderText, styles.colMoney]}>VOL SHARE</Text>
              <Text style={[styles.statsTableHeaderText, styles.colMoney]}>REV SHARE</Text>
            </View>
            
            {/* Table Rows - Show empty state inside table if no data */}
            {countriesData.length === 0 ? (
              <>
                {/* Sample rows like Quotex Partner shows */}
                {[
                  { flag: '🇦🇫', name: 'Afghanistan' },
                  { flag: '🇦🇱', name: 'Albania' },
                  { flag: '🇩🇿', name: 'Algeria' },
                  { flag: '🇦🇸', name: 'American Samoa' },
                  { flag: '🇦🇴', name: 'Angola' },
                ].map((country, i) => (
                  <View key={i} style={[styles.wideTableRow, i % 2 === 0 && styles.statsTableRowAlt]}>
                    <View style={[styles.colCountry, { flexDirection: 'row', alignItems: 'center' }]}>
                      <Text style={styles.countryFlag}>{country.flag}</Text>
                      <Text style={styles.countryName}>{country.name}</Text>
                    </View>
                    <Text style={[styles.statsTableCell, styles.colSmall]}>0</Text>
                    <Text style={[styles.statsTableCell, styles.colRegs]}>0</Text>
                    <Text style={[styles.statsTableCell, styles.colSmall]}>0</Text>
                    <Text style={[styles.statsTableCell, styles.colMoney]}>$ 0.00</Text>
                    <Text style={[styles.statsTableCell, styles.colSmall]}>0</Text>
                    <Text style={[styles.statsTableCell, styles.colMoney]}>$ 0.00</Text>
                    <Text style={[styles.statsTableCell, styles.colMoney]}>$ 0.00</Text>
                    <Text style={[styles.statsTableCell, styles.colMoney]}>$ 0.00</Text>
                    <Text style={[styles.statsTableCell, styles.colSmall]}>0</Text>
                    <Text style={[styles.statsTableCell, styles.colTurnover]}>$ 0.00 ($ 0.00)</Text>
                    <Text style={[styles.statsTableCell, styles.colMoney]}>$ 0.00 ($ 0.00)</Text>
                    <Text style={[styles.statsTableCell, styles.colMoney]}>$ 0.00</Text>
                    <Text style={[styles.statsTableCell, styles.colMoney]}>$ 0.00</Text>
                  </View>
                ))}
              </>
            ) : (
              getPaginatedData(countriesData).map((country: any, i: number) => {
                const regPercent = country.clicks > 0 ? ((country.registrations / country.clicks) * 100).toFixed(2) : '0';
                const ftdPercent = country.registrations > 0 ? ((country.ftds / country.registrations) * 100).toFixed(2) : '0';
                return (
                  <View key={i} style={[styles.wideTableRow, i % 2 === 0 && styles.statsTableRowAlt]}>
                    <View style={[styles.colCountry, { flexDirection: 'row', alignItems: 'center' }]}>
                      <Text style={styles.countryFlag}>{country.flag || '🌍'}</Text>
                      <Text style={styles.countryName}>{country.name || 'Unknown'}</Text>
                    </View>
                    <Text style={[styles.statsTableCell, styles.colSmall]}>{country.clicks || 0}</Text>
                    <View style={[styles.colRegs, { flexDirection: 'row', alignItems: 'center' }]}>
                      <Text style={styles.statsTableCell}>{country.registrations || 0}</Text>
                      <Text style={styles.statsTablePercent}> ({regPercent}%)</Text>
                    </View>
                    <View style={[styles.colSmall, { flexDirection: 'row', alignItems: 'center' }]}>
                      <Text style={styles.statsTableCell}>{country.ftds || 0}</Text>
                      <Text style={styles.statsTablePercent}> ({ftdPercent}%)</Text>
                    </View>
                    <Text style={[styles.statsTableCell, styles.colMoney]}>${(country.ftd_sum || 0).toFixed(2)}</Text>
                    <Text style={[styles.statsTableCell, styles.colSmall]}>{country.deposits_count || 0}</Text>
                    <Text style={[styles.statsTableCell, styles.colMoney]}>${(country.deposits_sum || 0).toFixed(2)}</Text>
                    <Text style={[styles.statsTableCell, styles.colMoney]}>${(country.bonuses || 0).toFixed(2)}</Text>
                    <Text style={[styles.statsTableCell, styles.colMoney]}>${(country.withdrawals || 0).toFixed(2)}</Text>
                    <Text style={[styles.statsTableCell, styles.colSmall]}>{country.traders || 0}</Text>
                    <View style={[styles.colTurnover, { flexDirection: 'row' }]}>
                      <Text style={styles.statsTableCell}>${(country.turnover || 0).toFixed(2)}</Text>
                      <Text style={[styles.statsTablePercent, { color: COLORS.textMuted }]}> (${(country.turnover_clear || 0).toFixed(2)})</Text>
                    </View>
                    <View style={[styles.colMoney, { flexDirection: 'row' }]}>
                      <Text style={[styles.statsTableCell, { color: (country.pnl || 0) >= 0 ? COLORS.text : COLORS.danger }]}>
                        ${(country.pnl || 0).toFixed(2)}
                      </Text>
                      <Text style={[styles.statsTablePercent, { color: COLORS.textMuted }]}> (${(country.pnl_clear || 0).toFixed(2)})</Text>
                    </View>
                    <Text style={[styles.statsTableCell, styles.colMoney]}>${(country.vol_share || 0).toFixed(2)}</Text>
                    <Text style={[styles.statsTableCell, styles.colMoney]}>${(country.rev_share || 0).toFixed(2)}</Text>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      );
    };
    
    // Get current data length for pagination
    const getCurrentDataLength = () => {
      switch (statsViewTab) {
        case 'dates': return datesData.length;
        case 'traders': return tradersData.length;
        case 'links': return linksData.length;
        case 'countries': return countriesData.length;
        default: return 0;
      }
    };
    
    return (
      <View style={styles.content}>
        {/* Period Selector */}
        <View style={styles.statsPeriodRow}>
          <View style={styles.periodSelector}>
            {[7, 14, 30].map((days) => (
              <TouchableOpacity
                key={days}
                style={[styles.periodBtn, statsPeriod === days && styles.periodBtnActive]}
                onPress={() => { setStatsPeriod(days); setStatsPage(1); }}
              >
                <Text style={[styles.periodBtnText, statsPeriod === days && styles.periodBtnTextActive]}>
                  {days === 7 ? '7D' : days === 14 ? '14D' : '30D'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="filter-outline" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
        
        {/* Stats Overview Cards */}
        <View style={styles.statsOverviewRow}>
          <View style={styles.statsOverviewMiniCard}>
            <Text style={styles.statsOverviewMiniValue}>{statisticsData?.totals?.clicks || 0}</Text>
            <Text style={styles.statsOverviewMiniLabel}>Clicks</Text>
          </View>
          <View style={styles.statsOverviewMiniCard}>
            <Text style={styles.statsOverviewMiniValue}>{statisticsData?.totals?.registrations || 0}</Text>
            <Text style={styles.statsOverviewMiniLabel}>Regs</Text>
          </View>
          <View style={styles.statsOverviewMiniCard}>
            <Text style={[styles.statsOverviewMiniValue, { color: COLORS.primary }]}>{statisticsData?.totals?.ftds || 0}</Text>
            <Text style={styles.statsOverviewMiniLabel}>FTDs</Text>
          </View>
          <View style={styles.statsOverviewMiniCard}>
            <Text style={[styles.statsOverviewMiniValue, { color: COLORS.accent }]}>{formatMoney(statisticsData?.totals?.deposits || 0)}</Text>
            <Text style={styles.statsOverviewMiniLabel}>Deps</Text>
          </View>
        </View>
        
        {/* View Tabs */}
        <View style={styles.statsViewTabs}>
          {STATS_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.statsViewTab, statsViewTab === tab.key && styles.statsViewTabActive]}
              onPress={() => { setStatsViewTab(tab.key as any); setStatsPage(1); }}
            >
              <Ionicons 
                name={tab.icon as any} 
                size={16} 
                color={statsViewTab === tab.key ? COLORS.primary : COLORS.textMuted} 
              />
              <Text style={[styles.statsViewTabText, statsViewTab === tab.key && styles.statsViewTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Tab Content */}
        <View style={styles.statsTabContent}>
          {statsViewTab === 'dates' && renderDatesTab()}
          {statsViewTab === 'traders' && renderTradersTab()}
          {statsViewTab === 'links' && renderLinksTab()}
          {statsViewTab === 'countries' && renderCountriesTab()}
        </View>
        
        {/* Pagination */}
        {getCurrentDataLength() > STATS_PER_PAGE && (
          <View style={styles.statsPagination}>
            <Text style={styles.paginationInfo}>
              {(statsPage - 1) * STATS_PER_PAGE + 1}-{Math.min(statsPage * STATS_PER_PAGE, getCurrentDataLength())} of {getCurrentDataLength()}
            </Text>
            <View style={styles.paginationBtns}>
              <TouchableOpacity 
                style={[styles.paginationBtn, statsPage === 1 && styles.paginationBtnDisabled]}
                onPress={() => statsPage > 1 && setStatsPage(statsPage - 1)}
                disabled={statsPage === 1}
              >
                <Ionicons name="chevron-back" size={18} color={statsPage === 1 ? COLORS.textMuted : COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.paginationPage}>{statsPage}</Text>
              <TouchableOpacity 
                style={[styles.paginationBtn, statsPage >= getTotalPages(getCurrentDataLength() ? [1] : []) && styles.paginationBtnDisabled]}
                onPress={() => statsPage < getTotalPages([...Array(getCurrentDataLength())]) && setStatsPage(statsPage + 1)}
                disabled={statsPage >= getTotalPages([...Array(getCurrentDataLength())])}
              >
                <Ionicons name="chevron-forward" size={18} color={statsPage >= getTotalPages([...Array(getCurrentDataLength())]) ? COLORS.textMuted : COLORS.text} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Links Content - Full Featured
  const LinksContent = () => {
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    
    const copyToClipboard = async (linkCode: string) => {
      try {
        const fullLink = `https://bynix-markets.preview.emergentagent.com?ref=${linkCode}`;
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
      // For web, use confirm dialog; for native, use Alert
      const confirmDelete = Platform.OS === 'web' 
        ? window.confirm(`Are you sure you want to delete link #${linkCode}?`)
        : await new Promise<boolean>((resolve) => {
            Alert.alert(
              'Delete Link',
              `Are you sure you want to delete link #${linkCode}?`,
              [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Delete', style: 'destructive', onPress: () => resolve(true) }
              ]
            );
          });
      
      if (!confirmDelete) return;
      
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
                  
                  {/* Link URL - Emergent Preview with Copy */}
                  <View style={styles.linkUrlContainer}>
                    <Text style={styles.linkUrlLabel}>Referral Link</Text>
                    <TouchableOpacity 
                      style={[styles.linkUrlBoxNew, isCopied && styles.linkUrlBoxCopied]} 
                      onPress={() => copyToClipboard(link.code)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.linkUrlTextNew} numberOfLines={1} selectable>
                        bynix-markets.preview.emergentagent.com?ref={link.code}
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
  // Promo Content with Landing Pages
  const PromoContent = () => {
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [selectedLanding, setSelectedLanding] = useState<any>(null);
    const [codeCopied, setCodeCopied] = useState(false);
    
    // Get affiliate's first link code for tracking
    const affiliateRefCode = links && links.length > 0 ? links[0].code : (affiliate?.ref_code || 'YOURCODE');
    const trackingUrl = `https://bynix-markets.preview.emergentagent.com?ref=${affiliateRefCode}`;
    
    // Landing Page Templates - Professional Dark Blue Design
    const landingPages = [
      {
        id: 'pro-trader',
        name: 'Pro Trader Landing',
        description: 'Dark blue gradient with trading stats & features',
        preview: '📈',
        color: '#1a1a2e',
      },
      {
        id: 'premium-account',
        name: 'Premium Account Landing',
        description: 'Account showcase with profit targets & features',
        preview: '💎',
        color: '#2d1b69',
      },
      {
        id: 'global-stats',
        name: 'Global Stats Landing',
        description: 'Worldwide earnings & trust indicators',
        preview: '🌍',
        color: '#0d47a1',
      }
    ];
    
    // Bynix Logo SVG (Green S with gradient)
    const bynixLogoSVG = `<svg width="60" height="60" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#10B981"/>
          <stop offset="100%" style="stop-color:#059669"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="45" fill="url(#logoGradient)"/>
      <path d="M35 35 Q50 35 50 50 Q50 65 65 65" stroke="white" stroke-width="8" fill="none" stroke-linecap="round"/>
      <circle cx="35" cy="35" r="6" fill="white"/>
      <circle cx="65" cy="65" r="6" fill="white"/>
    </svg>`;
    
    // Generate landing page HTML code - Professional Design
    const generateLandingCode = (landingId: string) => {
      if (landingId === 'pro-trader') {
        return `<!-- Bynix Affiliate Landing Page - Pro Trader -->
<!-- Affiliate Code: ${affiliateRefCode} -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bynix - Built by Traders, For Traders</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #2d1b69 100%); color: #fff; min-height: 100vh; }
    .promo-bar { background: linear-gradient(90deg, #6366f1, #8b5cf6); padding: 12px; text-align: center; font-size: 14px; font-weight: 500; }
    .promo-bar span { color: #fbbf24; font-weight: 700; }
    .container { max-width: 480px; margin: 0 auto; padding: 40px 24px; text-align: center; }
    .logo { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 32px; }
    .logo svg { width: 50px; height: 50px; }
    .logo-text { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
    .badge { display: inline-block; background: rgba(99,102,241,0.2); border: 1px solid rgba(99,102,241,0.4); padding: 8px 20px; border-radius: 50px; font-size: 13px; color: #a5b4fc; margin-bottom: 24px; }
    h1 { font-size: 42px; font-weight: 800; line-height: 1.1; margin-bottom: 24px; background: linear-gradient(135deg, #fff 0%, #c4b5fd 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .arrow { color: #10B981; font-size: 32px; }
    .features { display: flex; justify-content: center; gap: 16px; margin: 32px 0; flex-wrap: wrap; }
    .feature { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 16px 20px; border-radius: 16px; min-width: 100px; }
    .feature-icon { font-size: 20px; margin-bottom: 6px; }
    .feature-label { font-size: 11px; color: #94a3b8; }
    .feature-value { font-size: 14px; font-weight: 700; color: #fff; }
    .subtitle { color: #94a3b8; font-size: 16px; margin-bottom: 24px; }
    .buttons { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .btn-primary { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #fff; padding: 16px 32px; border-radius: 50px; font-size: 16px; font-weight: 700; text-decoration: none; transition: all 0.3s; border: none; cursor: pointer; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 40px rgba(99,102,241,0.4); }
    .btn-secondary { background: transparent; color: #fff; padding: 16px 32px; border-radius: 50px; font-size: 16px; font-weight: 600; text-decoration: none; border: 2px solid rgba(255,255,255,0.3); }
    .stats { margin-top: 48px; padding-top: 32px; border-top: 1px solid rgba(255,255,255,0.1); }
    .stats-value { font-size: 36px; font-weight: 800; color: #10B981; }
    .stats-label { font-size: 14px; color: #94a3b8; margin-top: 4px; }
    .trust { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 16px; color: #fbbf24; font-size: 13px; }
  </style>
</head>
<body>
  <div class="promo-bar">🎉 Start trading today! Use code <span>BYNIX20</span> for 20% bonus on first deposit!</div>
  
  <div class="container">
    <div class="logo">
      ${bynixLogoSVG}
      <span class="logo-text">BYNIX</span>
    </div>
    
    <div class="badge">⭕ Zero Hidden Fees</div>
    
    <h1>Built by traders<br><span class="arrow">→</span> for traders</h1>
    
    <div class="features">
      <div class="feature">
        <div class="feature-icon">💰</div>
        <div class="feature-label">Trade Up to</div>
        <div class="feature-value">$1 Million</div>
      </div>
      <div class="feature">
        <div class="feature-icon">📊</div>
        <div class="feature-label">Starting at</div>
        <div class="feature-value">Just $10</div>
      </div>
      <div class="feature">
        <div class="feature-icon">📈</div>
        <div class="feature-label">Up to</div>
        <div class="feature-value">95% Profit</div>
      </div>
    </div>
    
    <p class="subtitle">Join 500,000+ traders worldwide on the most trusted trading platform.</p>
    
    <div class="buttons">
      <a href="${trackingUrl}" class="btn-primary" id="signup-btn">Start Trading Now</a>
      <a href="${trackingUrl}" class="btn-secondary">Learn More</a>
    </div>
    
    <div class="stats">
      <div class="stats-value">$50M+</div>
      <div class="stats-label">PAID OUT TO TRADERS WORLDWIDE</div>
      <div class="trust">⭐ Rated 4.9/5 by 10,000+ traders</div>
    </div>
  </div>
  
  <script>
    (function() {
      var refCode = '${affiliateRefCode}';
      document.querySelectorAll('a').forEach(function(link) {
        link.addEventListener('click', function() {
          console.log('Bynix Affiliate Click: ' + refCode);
        });
      });
    })();
  </script>
</body>
</html>`;
      } else if (landingId === 'premium-account') {
        return `<!-- Bynix Affiliate Landing Page - Premium Account -->
<!-- Affiliate Code: ${affiliateRefCode} -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bynix Premium - Your Trading Journey Starts Here</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: linear-gradient(180deg, #0f0f23 0%, #1e1b4b 100%); color: #fff; min-height: 100vh; }
    .container { max-width: 480px; margin: 0 auto; padding: 40px 24px; }
    .logo { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 32px; }
    .logo svg { width: 45px; height: 45px; }
    .logo-text { font-size: 24px; font-weight: 800; }
    .section-title { text-align: center; font-size: 28px; font-weight: 800; color: #c4b5fd; margin-bottom: 32px; }
    .steps { display: flex; justify-content: space-between; margin-bottom: 40px; position: relative; }
    .steps::before { content: ''; position: absolute; top: 50%; left: 15%; right: 15%; height: 2px; background: linear-gradient(90deg, #6366f1, #8b5cf6); transform: translateY(-50%); }
    .step { text-align: center; flex: 1; position: relative; z-index: 1; }
    .step-title { font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 4px; }
    .step-desc { font-size: 11px; color: #94a3b8; line-height: 1.4; }
    .step-arrow { color: #8b5cf6; font-size: 20px; position: absolute; right: -10px; top: 10px; }
    .main-card { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-radius: 24px; padding: 32px 24px; text-align: center; border: 1px solid rgba(139,92,246,0.3); }
    .main-title { font-size: 32px; font-weight: 800; margin-bottom: 8px; }
    .main-subtitle { font-size: 16px; color: #94a3b8; margin-bottom: 24px; }
    .highlight { color: #10B981; }
    .account-options { display: flex; gap: 8px; justify-content: center; margin-bottom: 20px; flex-wrap: wrap; }
    .account-btn { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 10px 16px; border-radius: 20px; font-size: 13px; color: #fff; cursor: pointer; transition: all 0.2s; }
    .account-btn.active { background: #6366f1; border-color: #6366f1; }
    .price { font-size: 48px; font-weight: 800; color: #fff; margin: 20px 0 8px; }
    .price-label { color: #94a3b8; font-size: 14px; margin-bottom: 24px; }
    .cta-btn { display: block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #fff; padding: 18px; border-radius: 14px; font-size: 18px; font-weight: 700; text-decoration: none; transition: all 0.3s; }
    .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 40px rgba(16,185,129,0.4); }
    .features-list { margin-top: 32px; text-align: left; }
    .feature-row { display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .feature-label { color: #c4b5fd; font-size: 14px; font-weight: 600; }
    .feature-value { color: #fff; font-size: 14px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      ${bynixLogoSVG}
      <span class="logo-text">BYNIX</span>
    </div>
    
    <h2 class="section-title">How it works?</h2>
    
    <div class="steps">
      <div class="step">
        <div class="step-title">Create Account</div>
        <div class="step-desc">Sign up in 60 seconds</div>
        <span class="step-arrow">»</span>
      </div>
      <div class="step">
        <div class="step-title">Start Trading</div>
        <div class="step-desc">Trade with up to 95% profit</div>
        <span class="step-arrow">»</span>
      </div>
      <div class="step">
        <div class="step-title">Withdraw</div>
        <div class="step-desc">Instant withdrawals 24/7</div>
      </div>
    </div>
    
    <div class="main-card">
      <h1 class="main-title">Your Journey<br>Starts Here!</h1>
      <p class="main-subtitle">From beginners to experts, traders from 195+ countries trust Bynix.</p>
      
      <div class="account-options">
        <button class="account-btn">$10</button>
        <button class="account-btn">$50</button>
        <button class="account-btn active">$100</button>
        <button class="account-btn">$500</button>
        <button class="account-btn">$1000</button>
      </div>
      
      <div class="price">$100</div>
      <div class="price-label">Minimum Deposit • <span class="highlight">+50% Bonus</span></div>
      
      <a href="${trackingUrl}" class="cta-btn" id="signup-btn">Open Account Now →</a>
      
      <div class="features-list">
        <div class="feature-row">
          <span class="feature-label">Profit Rate</span>
          <span class="feature-value">Up to 95%</span>
        </div>
        <div class="feature-row">
          <span class="feature-label">Min Trade</span>
          <span class="feature-value">$1</span>
        </div>
        <div class="feature-row">
          <span class="feature-label">Withdrawal</span>
          <span class="feature-value">Instant</span>
        </div>
        <div class="feature-row">
          <span class="feature-label">Assets</span>
          <span class="feature-value">100+ pairs</span>
        </div>
        <div class="feature-row">
          <span class="feature-label">Support</span>
          <span class="feature-value">24/7</span>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    (function() {
      var refCode = '${affiliateRefCode}';
      document.getElementById('signup-btn').addEventListener('click', function() {
        console.log('Bynix Affiliate Click: ' + refCode);
      });
      document.querySelectorAll('.account-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          document.querySelectorAll('.account-btn').forEach(function(b) { b.classList.remove('active'); });
          this.classList.add('active');
        });
      });
    })();
  </script>
</body>
</html>`;
      } else {
        return `<!-- Bynix Affiliate Landing Page - Global Stats -->
<!-- Affiliate Code: ${affiliateRefCode} -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bynix - Trusted by Traders Worldwide</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: linear-gradient(180deg, #0a0a1a 0%, #1e3a5f 50%, #3b82f6 100%); color: #fff; min-height: 100vh; }
    .container { max-width: 480px; margin: 0 auto; padding: 40px 24px; text-align: center; }
    .logo { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 40px; }
    .logo svg { width: 50px; height: 50px; }
    .logo-text { font-size: 28px; font-weight: 800; }
    .globe-section { position: relative; margin: 32px 0; }
    .globe-bg { width: 200px; height: 200px; margin: 0 auto; background: radial-gradient(circle, #3b82f6 0%, #1e40af 50%, transparent 70%); border-radius: 50%; display: flex; align-items: center; justify-content: center; animation: pulse 3s infinite; }
    @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.8; } }
    .globe-icon { font-size: 80px; }
    .main-stat { margin: 32px 0; }
    .main-stat-value { font-size: 48px; font-weight: 800; background: linear-gradient(135deg, #10B981 0%, #6ee7b7 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .main-stat-label { font-size: 16px; color: #fff; font-weight: 600; margin-top: 8px; }
    .subtitle { color: #94a3b8; font-size: 15px; margin-bottom: 32px; }
    .country-stats { display: flex; gap: 12px; justify-content: center; margin: 32px 0; overflow-x: auto; padding: 8px 0; }
    .country-card { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 16px; padding: 16px 20px; min-width: 140px; backdrop-filter: blur(10px); }
    .country-flag { font-size: 24px; margin-bottom: 8px; }
    .country-name { font-size: 12px; color: #94a3b8; margin-bottom: 4px; }
    .country-amount { font-size: 20px; font-weight: 700; color: #10B981; }
    .cta-section { margin-top: 40px; }
    .cta-btn { display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #fff; padding: 18px 48px; border-radius: 50px; font-size: 18px; font-weight: 700; text-decoration: none; transition: all 0.3s; box-shadow: 0 8px 32px rgba(16,185,129,0.4); }
    .cta-btn:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(16,185,129,0.5); }
    .trust-badges { display: flex; justify-content: center; gap: 24px; margin-top: 32px; flex-wrap: wrap; }
    .trust-badge { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #94a3b8; }
    .trust-icon { font-size: 18px; }
    .platforms { margin-top: 48px; padding-top: 32px; border-top: 1px solid rgba(255,255,255,0.1); }
    .platforms-title { font-size: 18px; font-weight: 700; margin-bottom: 20px; }
    .platform-logos { display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; }
    .platform-logo { width: 48px; height: 48px; background: rgba(255,255,255,0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      ${bynixLogoSVG}
      <span class="logo-text">BYNIX</span>
    </div>
    
    <div class="globe-section">
      <div class="globe-bg">
        <span class="globe-icon">🌍</span>
      </div>
    </div>
    
    <div class="main-stat">
      <div class="main-stat-value">$50M+</div>
      <div class="main-stat-label">Earned by Traders Globally at Bynix</div>
    </div>
    
    <p class="subtitle">Quick and reliable. Zero hidden fees. Instant withdrawals.</p>
    
    <div class="country-stats">
      <div class="country-card">
        <div class="country-flag">🇧🇩</div>
        <div class="country-name">Bangladesh</div>
        <div class="country-amount">$2.5M</div>
      </div>
      <div class="country-card">
        <div class="country-flag">🇮🇳</div>
        <div class="country-name">India</div>
        <div class="country-amount">$8.2M</div>
      </div>
      <div class="country-card">
        <div class="country-flag">🇳🇬</div>
        <div class="country-name">Nigeria</div>
        <div class="country-amount">$4.1M</div>
      </div>
    </div>
    
    <div class="cta-section">
      <a href="${trackingUrl}" class="cta-btn" id="signup-btn">Join 500K+ Traders →</a>
    </div>
    
    <div class="trust-badges">
      <div class="trust-badge"><span class="trust-icon">✅</span> Regulated</div>
      <div class="trust-badge"><span class="trust-icon">⚡</span> Instant Payouts</div>
      <div class="trust-badge"><span class="trust-icon">🔒</span> Secure</div>
    </div>
    
    <div class="platforms">
      <div class="platforms-title">Trade on All Devices</div>
      <div class="platform-logos">
        <div class="platform-logo">📱</div>
        <div class="platform-logo">💻</div>
        <div class="platform-logo">🖥️</div>
        <div class="platform-logo">⌚</div>
      </div>
    </div>
  </div>
  
  <script>
    (function() {
      var refCode = '${affiliateRefCode}';
      document.getElementById('signup-btn').addEventListener('click', function() {
        console.log('Bynix Affiliate Click: ' + refCode);
      });
    })();
  </script>
</body>
</html>`;
      }
    };
    
    const handleGetCode = (landing: any) => {
      setSelectedLanding(landing);
      setShowCodeModal(true);
      setCodeCopied(false);
    };
    
    const copyCode = async () => {
      if (!selectedLanding) return;
      try {
        const code = generateLandingCode(selectedLanding.id);
        await Clipboard.setStringAsync(code);
        setCodeCopied(true);
        showToast('Landing page code copied!');
        setTimeout(() => setCodeCopied(false), 3000);
      } catch (error) {
        showToast('Failed to copy code');
      }
    };
    
    return (
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Promo Materials</Text>
        <Text style={styles.sectionSubtitle}>Download banners and landing pages</Text>
        
        {/* Existing Banner Materials */}
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
        
        {/* Landing Pages Section */}
        <View style={styles.landingSection}>
          <Text style={styles.landingSectionTitle}>Embeddable Landing Pages</Text>
          <Text style={styles.landingSectionSubtitle}>
            Copy HTML code and add to your website. All signups will be tracked to your affiliate account.
          </Text>
          
          {landingPages.map((landing, i) => (
            <View key={i} style={styles.landingCard}>
              <View style={[styles.landingPreview, { backgroundColor: landing.color }]}>
                <Text style={styles.landingPreviewEmoji}>{landing.preview}</Text>
              </View>
              <View style={styles.landingInfo}>
                <Text style={styles.landingName}>{landing.name}</Text>
                <Text style={styles.landingDesc}>{landing.description}</Text>
                <View style={styles.landingMeta}>
                  <Ionicons name="code-slash" size={12} color={COLORS.textMuted} />
                  <Text style={styles.landingMetaText}>HTML • Tracking Enabled</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.getCodeBtn}
                onPress={() => handleGetCode(landing)}
              >
                <Ionicons name="code" size={16} color="#fff" />
                <Text style={styles.getCodeBtnText}>Get Code</Text>
              </TouchableOpacity>
            </View>
          ))}
          
          {/* Tracking Info */}
          <View style={styles.trackingInfoBox}>
            <Ionicons name="link" size={20} color={COLORS.primary} />
            <View style={styles.trackingInfoText}>
              <Text style={styles.trackingInfoTitle}>Your Tracking Code: {affiliateRefCode}</Text>
              <Text style={styles.trackingInfoDesc}>
                All landing pages include your affiliate code. Users who sign up will be credited to your account.
              </Text>
            </View>
          </View>
        </View>
        
        {/* Code Modal */}
        <Modal visible={showCodeModal} transparent animationType="slide">
          <View style={styles.codeModalOverlay}>
            <TouchableOpacity style={styles.codeModalBackdrop} onPress={() => setShowCodeModal(false)} />
            <View style={styles.codeModalContent}>
              <View style={styles.codeModalHeader}>
                <Text style={styles.codeModalTitle}>
                  {selectedLanding?.name || 'Landing Page'} Code
                </Text>
                <TouchableOpacity onPress={() => setShowCodeModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.codeModalBody}>
                <Text style={styles.codeModalInstructions}>
                  Copy this HTML code and paste it into your website. Your affiliate tracking code ({affiliateRefCode}) is already embedded.
                </Text>
                
                <View style={styles.codePreviewBox}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                    <Text style={styles.codePreviewText}>
                      {selectedLanding ? generateLandingCode(selectedLanding.id).slice(0, 500) + '...' : ''}
                    </Text>
                  </ScrollView>
                </View>
                
                <View style={styles.codeFeatures}>
                  <View style={styles.codeFeatureItem}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                    <Text style={styles.codeFeatureText}>Responsive design</Text>
                  </View>
                  <View style={styles.codeFeatureItem}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                    <Text style={styles.codeFeatureText}>Affiliate tracking included</Text>
                  </View>
                  <View style={styles.codeFeatureItem}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                    <Text style={styles.codeFeatureText}>Ready to use - no editing needed</Text>
                  </View>
                </View>
              </ScrollView>
              
              <View style={styles.codeModalFooter}>
                <TouchableOpacity 
                  style={[styles.copyCodeBtn, codeCopied && styles.copyCodeBtnCopied]}
                  onPress={copyCode}
                >
                  <Ionicons name={codeCopied ? "checkmark" : "copy"} size={20} color="#fff" />
                  <Text style={styles.copyCodeBtnText}>
                    {codeCopied ? 'Copied!' : 'Copy Full HTML Code'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  // Top 10 Content
  const Top10Content = () => {
    // Check if current affiliate is in top 10
    const currentAffiliateInTop10 = top10.findIndex(p => p.affiliate_id === affiliate?.affiliate_id);
    const isInTop10 = currentAffiliateInTop10 !== -1;
    
    // Get current affiliate's rank if not in top 10
    const currentAffiliateRank = isInTop10 ? currentAffiliateInTop10 + 1 : (top10.length + 1);
    
    return (
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>TOP 10 Partners</Text>
        <Text style={styles.sectionSubtitle}>Monthly leaderboard - Highest commission earners</Text>
        
        {/* Column Headers */}
        <View style={styles.top10Header}>
          <Text style={[styles.top10HeaderText, { width: 40 }]}>#</Text>
          <Text style={[styles.top10HeaderText, { flex: 1 }]}>PARTNER</Text>
          <Text style={[styles.top10HeaderText, { width: 50 }]}>FTDs</Text>
          <Text style={[styles.top10HeaderText, { width: 45 }]}>REGS</Text>
          <Text style={[styles.top10HeaderText, { width: 50 }]}>DEPS</Text>
          <Text style={[styles.top10HeaderText, { width: 70 }]}>DEP SUM</Text>
          <Text style={[styles.top10HeaderText, { width: 80, textAlign: 'right' }]}>COMMISSION</Text>
        </View>
        
        {/* TOP 10 List */}
        {top10.length === 0 ? (
          <View style={styles.top10Empty}>
            <Ionicons name="trophy-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.top10EmptyText}>No affiliates yet this month</Text>
          </View>
        ) : (
          top10.slice(0, 10).map((partner, i) => (
            <View key={i} style={[
              styles.top10CardNew, 
              i < 3 && styles.top10CardTop,
              partner.affiliate_id === affiliate?.affiliate_id && styles.top10CardSelf
            ]}>
              {/* Rank */}
              <View style={[
                styles.top10RankNew, 
                { backgroundColor: i === 0 ? COLORS.gold : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : COLORS.cardLight }
              ]}>
                {i < 3 ? (
                  <Ionicons name="trophy" size={14} color="#FFF" />
                ) : (
                  <Text style={styles.top10RankTextNew}>{i + 1}</Text>
                )}
              </View>
              
              {/* Partner Info */}
              <View style={styles.top10InfoNew}>
                <Text style={styles.top10NameNew}>{partner.name || `A***e`}</Text>
                <Text style={styles.top10LevelNew}>Level {partner.level || 1}</Text>
              </View>
              
              {/* FTDs */}
              <Text style={styles.top10StatValue}>{partner.total_ftds || 0}</Text>
              
              {/* Registrations */}
              <Text style={styles.top10StatValueSmall}>{partner.total_registrations || partner.registrations || 0}</Text>
              
              {/* Deposit Count */}
              <Text style={styles.top10StatValueSmall}>{partner.deposit_count || partner.deposits_count || 0}</Text>
              
              {/* Deposit Sum */}
              <Text style={styles.top10DepSum}>${(partner.deposit_sum || partner.deposits_sum || 0).toFixed(0)}</Text>
              
              {/* Commission */}
              <View style={styles.top10CommissionBox}>
                <Text style={styles.top10CommissionValue}>{formatMoney(partner.total_earnings || partner.commission || 0)}</Text>
              </View>
            </View>
          ))
        )}
        
        {/* Current Affiliate Rank (if not in TOP 10) */}
        {!isInTop10 && affiliate && (
          <View style={styles.yourRankSection}>
            <Text style={styles.yourRankTitle}>Your Ranking</Text>
            <View style={[styles.top10CardNew, styles.top10CardSelf]}>
              {/* Rank */}
              <View style={[styles.top10RankNew, { backgroundColor: COLORS.primaryLight }]}>
                <Text style={[styles.top10RankTextNew, { color: COLORS.primary }]}>{currentAffiliateRank}+</Text>
              </View>
              
              {/* Partner Info */}
              <View style={styles.top10InfoNew}>
                <Text style={styles.top10NameNew}>{affiliate.name || 'You'}</Text>
                <Text style={styles.top10LevelNew}>Level {affiliate.level || 1}</Text>
              </View>
              
              {/* FTDs */}
              <Text style={styles.top10StatValue}>{dashboardData?.ftds || affiliate.total_ftds || 0}</Text>
              
              {/* Registrations */}
              <Text style={styles.top10StatValueSmall}>{dashboardData?.registrations || 0}</Text>
              
              {/* Deposit Count */}
              <Text style={styles.top10StatValueSmall}>{dashboardData?.deposits_count || 0}</Text>
              
              {/* Deposit Sum */}
              <Text style={styles.top10DepSum}>${(dashboardData?.total_deposits || 0).toFixed(0)}</Text>
              
              {/* Commission */}
              <View style={styles.top10CommissionBox}>
                <Text style={styles.top10CommissionValue}>{formatMoney(affiliate.total_earnings || dashboardData?.commission || 0)}</Text>
              </View>
            </View>
            <Text style={styles.yourRankNote}>Keep earning to climb the leaderboard!</Text>
          </View>
        )}
      </View>
    );
  };

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
      
      {/* My Account Modal */}
      <Modal visible={showMyAccountModal} transparent animationType="slide">
        <View style={styles.fullModalOverlay}>
          <View style={styles.fullModalContent}>
            <View style={styles.fullModalHeader}>
              <TouchableOpacity onPress={() => setShowMyAccountModal(false)} style={styles.modalBackBtn}>
                <Ionicons name="arrow-back" size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.fullModalTitle}>My Account</Text>
              <View style={{ width: 24 }} />
            </View>
            
            <ScrollView style={styles.fullModalBody}>
              {/* Profile Header */}
              <View style={styles.accountProfileSection}>
                <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.accountAvatar}>
                  <Text style={styles.accountAvatarText}>{affiliate?.name?.charAt(0) || 'A'}</Text>
                </LinearGradient>
                <Text style={styles.accountName}>{affiliate?.name || 'Affiliate'}</Text>
                <Text style={styles.accountEmail}>{affiliate?.email}</Text>
                <View style={styles.accountIdBadge}>
                  <Text style={styles.accountIdText}>ID: {affiliate?.ref_code || links?.[0]?.code || 'BYN00000'}</Text>
                </View>
              </View>
              
              {/* Account Info */}
              <View style={styles.accountInfoCard}>
                <Text style={styles.accountInfoTitle}>Account Information</Text>
                
                {/* Editable Full Name Row */}
                <View style={styles.accountInfoRowEditable}>
                  <Text style={styles.accountInfoLabel}>Full Name</Text>
                  {isEditingName ? (
                    <View style={styles.nameEditContainer}>
                      <TextInput
                        style={styles.nameEditInput}
                        value={editedName}
                        onChangeText={setEditedName}
                        placeholder="Enter your name"
                        placeholderTextColor={COLORS.textMuted}
                        autoFocus
                      />
                      <View style={styles.nameEditButtons}>
                        <TouchableOpacity 
                          style={styles.nameEditCancelBtn} 
                          onPress={cancelEditingName}
                          disabled={isSavingName}
                        >
                          <Ionicons name="close" size={18} color={COLORS.danger} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.nameEditSaveBtn} 
                          onPress={handleSaveName}
                          disabled={isSavingName}
                        >
                          {isSavingName ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Ionicons name="checkmark" size={18} color="#fff" />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.nameDisplayContainer}>
                      <Text style={styles.accountInfoValue}>{affiliate?.name || 'N/A'}</Text>
                      <TouchableOpacity style={styles.nameEditBtn} onPress={startEditingName}>
                        <Ionicons name="pencil" size={16} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                
                <View style={styles.nameEditHint}>
                  <Ionicons name="information-circle-outline" size={14} color={COLORS.textMuted} />
                  <Text style={styles.nameEditHintText}>This name will appear on the TOP 10 Leaderboard</Text>
                </View>
                
                <View style={styles.accountInfoRow}>
                  <Text style={styles.accountInfoLabel}>Email</Text>
                  <Text style={styles.accountInfoValue}>{affiliate?.email || 'N/A'}</Text>
                </View>
                
                <View style={styles.accountInfoRow}>
                  <Text style={styles.accountInfoLabel}>Affiliate ID</Text>
                  <Text style={styles.accountInfoValue}>{affiliate?.ref_code || links?.[0]?.code || 'N/A'}</Text>
                </View>
                
                <View style={styles.accountInfoRow}>
                  <Text style={styles.accountInfoLabel}>Level</Text>
                  <Text style={[styles.accountInfoValue, { color: COLORS.primary }]}>
                    {LEVELS.find(l => l.level === (affiliate?.level || 1))?.name || 'Starter'}
                  </Text>
                </View>
                
                <View style={styles.accountInfoRow}>
                  <Text style={styles.accountInfoLabel}>Member Since</Text>
                  <Text style={styles.accountInfoValue}>
                    {affiliate?.created_at ? new Date(affiliate.created_at).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
              </View>
              
              {/* Stats Overview */}
              <View style={styles.accountStatsCard}>
                <Text style={styles.accountInfoTitle}>Performance Overview</Text>
                
                <View style={styles.accountStatsGrid}>
                  <View style={styles.accountStatItem}>
                    <Text style={styles.accountStatValue}>{formatMoney(affiliate?.total_earnings || 0)}</Text>
                    <Text style={styles.accountStatLabel}>Total Earnings</Text>
                  </View>
                  <View style={styles.accountStatItem}>
                    <Text style={styles.accountStatValue}>{affiliate?.total_ftds || 0}</Text>
                    <Text style={styles.accountStatLabel}>Total FTDs</Text>
                  </View>
                  <View style={styles.accountStatItem}>
                    <Text style={styles.accountStatValue}>{dashboardData?.registrations || 0}</Text>
                    <Text style={styles.accountStatLabel}>Registrations</Text>
                  </View>
                  <View style={styles.accountStatItem}>
                    <Text style={styles.accountStatValue}>{links?.length || 0}</Text>
                    <Text style={styles.accountStatLabel}>Active Links</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Settings Modal */}
      <Modal visible={showSettingsModal} transparent animationType="slide" onShow={loadAffiliateSettings}>
        <View style={styles.fullModalOverlay}>
          <View style={styles.fullModalContent}>
            <View style={styles.fullModalHeader}>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)} style={styles.modalBackBtn}>
                <Ionicons name="arrow-back" size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.fullModalTitle}>Settings</Text>
              <View style={{ width: 24 }} />
            </View>
            
            <ScrollView style={styles.fullModalBody}>
              {/* Notification Settings */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Notifications</Text>
                
                <TouchableOpacity style={styles.settingsRow} onPress={() => toggleNotificationSetting('email')}>
                  <View style={styles.settingsRowLeft}>
                    <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
                    <View style={styles.settingsRowText}>
                      <Text style={styles.settingsRowTitle}>Email Notifications</Text>
                      <Text style={styles.settingsRowDesc}>Receive updates via email</Text>
                    </View>
                  </View>
                  <View style={[styles.toggleTrack, { backgroundColor: emailNotifications ? COLORS.primary : COLORS.border }]}>
                    <View style={[styles.toggleThumb, emailNotifications ? { right: 2 } : { left: 2 }]} />
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.settingsRow} onPress={() => toggleNotificationSetting('push')}>
                  <View style={styles.settingsRowLeft}>
                    <Ionicons name="notifications-outline" size={20} color={COLORS.accent} />
                    <View style={styles.settingsRowText}>
                      <Text style={styles.settingsRowTitle}>Push Notifications</Text>
                      <Text style={styles.settingsRowDesc}>Get instant alerts</Text>
                    </View>
                  </View>
                  <View style={[styles.toggleTrack, { backgroundColor: pushNotifications ? COLORS.primary : COLORS.border }]}>
                    <View style={[styles.toggleThumb, pushNotifications ? { right: 2 } : { left: 2 }]} />
                  </View>
                </TouchableOpacity>
              </View>
              
              {/* Withdrawal Settings */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Withdrawal</Text>
                
                <View style={styles.withdrawalCard}>
                  <View style={styles.withdrawalHeader}>
                    <Ionicons name="logo-usd" size={24} color={COLORS.primary} />
                    <Text style={styles.withdrawalTitle}>USDT TRC20 Address</Text>
                  </View>
                  <Text style={styles.withdrawalDesc}>Enter your USDT TRC20 wallet address to receive commission withdrawals</Text>
                  
                  {isEditingUsdtAddress ? (
                    <View style={styles.usdtEditContainer}>
                      <TextInput
                        style={styles.usdtInput}
                        value={usdtAddress}
                        onChangeText={setUsdtAddress}
                        placeholder="TRC20 Address (starts with T)"
                        placeholderTextColor={COLORS.textMuted}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <View style={styles.usdtEditButtons}>
                        <TouchableOpacity 
                          style={styles.usdtCancelBtn} 
                          onPress={() => setIsEditingUsdtAddress(false)}
                        >
                          <Text style={styles.usdtCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.usdtSaveBtn} 
                          onPress={saveUsdtAddress}
                          disabled={isSavingSettings}
                        >
                          {isSavingSettings ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.usdtSaveText}>Save Address</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.usdtDisplayBox} onPress={() => setIsEditingUsdtAddress(true)}>
                      {usdtAddress ? (
                        <Text style={styles.usdtAddressText} numberOfLines={1}>{usdtAddress}</Text>
                      ) : (
                        <Text style={styles.usdtPlaceholder}>Tap to add USDT TRC20 address</Text>
                      )}
                      <Ionicons name="pencil" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              {/* Security Settings */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Security</Text>
                
                <TouchableOpacity style={styles.settingsRow} onPress={() => setShowChangePasswordModal(true)}>
                  <View style={styles.settingsRowLeft}>
                    <Ionicons name="lock-closed-outline" size={20} color={COLORS.danger} />
                    <View style={styles.settingsRowText}>
                      <Text style={styles.settingsRowTitle}>Change Password</Text>
                      <Text style={styles.settingsRowDesc}>Update your password</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.settingsRow} onPress={() => setShow2FAModal(true)}>
                  <View style={styles.settingsRowLeft}>
                    <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
                    <View style={styles.settingsRowText}>
                      <Text style={styles.settingsRowTitle}>Two-Factor Auth</Text>
                      <Text style={styles.settingsRowDesc}>Enhanced security</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Change Password Modal */}
      <Modal visible={showChangePasswordModal} transparent animationType="slide">
        <View style={styles.fullModalOverlay}>
          <View style={styles.fullModalContent}>
            <View style={styles.fullModalHeader}>
              <TouchableOpacity onPress={() => {
                setShowChangePasswordModal(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }} style={styles.modalBackBtn}>
                <Ionicons name="arrow-back" size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.fullModalTitle}>Change Password</Text>
              <View style={{ width: 24 }} />
            </View>
            
            <View style={styles.fullModalBody}>
              <View style={styles.passwordFormSection}>
                <Text style={styles.passwordInputLabel}>Current Password</Text>
                <TextInput
                  style={styles.passwordInput}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry
                />
                
                <Text style={styles.passwordInputLabel}>New Password</Text>
                <TextInput
                  style={styles.passwordInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry
                />
                
                <Text style={styles.passwordInputLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry
                />
                
                <TouchableOpacity 
                  style={styles.changePasswordBtn} 
                  onPress={handleChangePassword}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.changePasswordBtnText}>Change Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* 2FA Modal */}
      <Modal visible={show2FAModal} transparent animationType="slide">
        <View style={styles.fullModalOverlay}>
          <View style={styles.fullModalContent}>
            <View style={styles.fullModalHeader}>
              <TouchableOpacity onPress={() => setShow2FAModal(false)} style={styles.modalBackBtn}>
                <Ionicons name="arrow-back" size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.fullModalTitle}>Two-Factor Authentication</Text>
              <View style={{ width: 24 }} />
            </View>
            
            <View style={styles.fullModalBody}>
              <View style={styles.twoFASection}>
                <View style={styles.twoFAIconWrap}>
                  <Ionicons name="shield-checkmark" size={64} color={COLORS.primary} />
                </View>
                <Text style={styles.twoFATitle}>Secure Your Account</Text>
                <Text style={styles.twoFADesc}>
                  Two-factor authentication adds an extra layer of security to your account by requiring a verification code in addition to your password.
                </Text>
                
                <View style={styles.twoFAStatus}>
                  <Ionicons name="close-circle" size={20} color={COLORS.danger} />
                  <Text style={styles.twoFAStatusText}>2FA is currently disabled</Text>
                </View>
                
                <TouchableOpacity style={styles.twoFAEnableBtn}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#fff" />
                  <Text style={styles.twoFAEnableBtnText}>Enable 2FA</Text>
                </TouchableOpacity>
                
                <Text style={styles.twoFANote}>
                  You'll need a 2FA app like Google Authenticator or Authy to enable this feature.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Help Center Modal */}
      <Modal visible={showHelpCenterModal} transparent animationType="slide">
        <View style={styles.fullModalOverlay}>
          <View style={styles.fullModalContent}>
            <View style={styles.fullModalHeader}>
              <TouchableOpacity onPress={() => setShowHelpCenterModal(false)} style={styles.modalBackBtn}>
                <Ionicons name="arrow-back" size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.fullModalTitle}>Help Center</Text>
              <View style={{ width: 24 }} />
            </View>
            
            <ScrollView style={styles.fullModalBody}>
              {/* Search */}
              <View style={styles.helpSearchBox}>
                <Ionicons name="search" size={20} color={COLORS.textMuted} />
                <TextInput 
                  style={styles.helpSearchInput}
                  placeholder="Search for help..."
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              
              {/* FAQ Categories */}
              <View style={styles.helpSection}>
                <Text style={styles.helpSectionTitle}>Frequently Asked Questions</Text>
                
                <TouchableOpacity style={styles.helpFaqItem}>
                  <View style={[styles.helpFaqIcon, { backgroundColor: COLORS.primaryLight }]}>
                    <Ionicons name="cash-outline" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.helpFaqText}>
                    <Text style={styles.helpFaqTitle}>How do commissions work?</Text>
                    <Text style={styles.helpFaqDesc}>Learn about RevShare & Turnover models</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.helpFaqItem}>
                  <View style={[styles.helpFaqIcon, { backgroundColor: COLORS.accentLight }]}>
                    <Ionicons name="wallet-outline" size={20} color={COLORS.accent} />
                  </View>
                  <View style={styles.helpFaqText}>
                    <Text style={styles.helpFaqTitle}>When can I withdraw?</Text>
                    <Text style={styles.helpFaqDesc}>Withdrawal rules and minimum amounts</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.helpFaqItem}>
                  <View style={[styles.helpFaqIcon, { backgroundColor: COLORS.warningLight }]}>
                    <Ionicons name="trending-up-outline" size={20} color={COLORS.warning} />
                  </View>
                  <View style={styles.helpFaqText}>
                    <Text style={styles.helpFaqTitle}>How to level up?</Text>
                    <Text style={styles.helpFaqDesc}>Requirements for each affiliate level</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.helpFaqItem}>
                  <View style={[styles.helpFaqIcon, { backgroundColor: COLORS.purpleLight }]}>
                    <Ionicons name="link-outline" size={20} color={COLORS.purple} />
                  </View>
                  <View style={styles.helpFaqText}>
                    <Text style={styles.helpFaqTitle}>Creating referral links</Text>
                    <Text style={styles.helpFaqDesc}>Set up and track your links</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
              
              {/* Contact Support */}
              <View style={styles.helpSection}>
                <Text style={styles.helpSectionTitle}>Need More Help?</Text>
                
                <View style={styles.helpContactCard}>
                  <Ionicons name="headset" size={32} color={COLORS.primary} />
                  <Text style={styles.helpContactTitle}>Contact Support</Text>
                  <Text style={styles.helpContactDesc}>Our team is available 24/7 to assist you</Text>
                  <TouchableOpacity style={styles.helpContactBtn}>
                    <Ionicons name="chatbubbles-outline" size={18} color="#fff" />
                    <Text style={styles.helpContactBtnText}>Start Chat</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.helpContactMethods}>
                  <TouchableOpacity style={styles.helpContactMethod}>
                    <Ionicons name="mail-outline" size={20} color={COLORS.accent} />
                    <Text style={styles.helpContactMethodText}>Email Support</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.helpContactMethod}>
                    <Ionicons name="logo-telegram" size={20} color={COLORS.accent} />
                    <Text style={styles.helpContactMethodText}>Telegram</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Withdraw Modal */}
      <Modal visible={showWithdrawModal} transparent animationType="slide" onShow={() => { loadWithdrawalHistory(); loadAffiliateSettings(); }}>
        <View style={styles.fullModalOverlay}>
          <View style={styles.fullModalContent}>
            <View style={styles.fullModalHeader}>
              <TouchableOpacity onPress={() => setShowWithdrawModal(false)} style={styles.modalBackBtn}>
                <Ionicons name="arrow-back" size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.fullModalTitle}>Withdraw</Text>
              <View style={{ width: 24 }} />
            </View>
            
            <ScrollView style={styles.fullModalBody}>
              {/* Available Balance */}
              <View style={styles.withdrawBalanceCard}>
                <Text style={styles.withdrawBalanceLabel}>Available Balance</Text>
                <Text style={styles.withdrawBalanceValue}>{formatMoney(affiliate?.balance || 0)}</Text>
                <Text style={styles.withdrawMinNote}>Minimum withdrawal: $50</Text>
              </View>
              
              {/* Withdrawal Form */}
              <View style={styles.withdrawFormSection}>
                <Text style={styles.withdrawFormTitle}>Withdraw Amount</Text>
                
                {/* Amount Input */}
                <View style={styles.withdrawAmountInputWrap}>
                  <Text style={styles.withdrawCurrency}>$</Text>
                  <TextInput
                    style={styles.withdrawAmountInput}
                    value={withdrawAmount}
                    onChangeText={setWithdrawAmount}
                    placeholder="0.00"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
                
                {/* Quick Amount Buttons */}
                <View style={styles.withdrawQuickAmounts}>
                  {['50', '100', '250', '500'].map((amt) => (
                    <TouchableOpacity 
                      key={amt} 
                      style={[
                        styles.withdrawQuickAmountBtn,
                        withdrawAmount === amt && styles.withdrawQuickAmountBtnActive
                      ]}
                      onPress={() => setWithdrawAmount(amt)}
                    >
                      <Text style={[
                        styles.withdrawQuickAmountText,
                        withdrawAmount === amt && styles.withdrawQuickAmountTextActive
                      ]}>${amt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                {/* Wallet Address */}
                <Text style={styles.withdrawFormTitle}>Withdrawal Wallet</Text>
                <View style={styles.withdrawWalletCard}>
                  <View style={styles.withdrawWalletHeader}>
                    <Ionicons name="logo-usd" size={24} color={COLORS.primary} />
                    <View style={styles.withdrawWalletInfo}>
                      <Text style={styles.withdrawWalletType}>USDT TRC20</Text>
                      {usdtAddress ? (
                        <Text style={styles.withdrawWalletAddress} numberOfLines={1}>{usdtAddress}</Text>
                      ) : (
                        <Text style={styles.withdrawWalletNoAddress}>No address set</Text>
                      )}
                    </View>
                    {!usdtAddress && (
                      <TouchableOpacity 
                        style={styles.withdrawSetAddressBtn}
                        onPress={() => { setShowWithdrawModal(false); setShowSettingsModal(true); }}
                      >
                        <Text style={styles.withdrawSetAddressText}>Set Address</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {usdtAddress && (
                    <View style={styles.withdrawWalletSelected}>
                      <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                      <Text style={styles.withdrawWalletSelectedText}>Selected for withdrawal</Text>
                    </View>
                  )}
                </View>
                
                {/* Submit Button */}
                <TouchableOpacity 
                  style={[
                    styles.withdrawSubmitBtn,
                    (!withdrawAmount || !usdtAddress || isSubmittingWithdrawal) && styles.withdrawSubmitBtnDisabled
                  ]}
                  onPress={handleWithdrawal}
                  disabled={!withdrawAmount || !usdtAddress || isSubmittingWithdrawal}
                >
                  {isSubmittingWithdrawal ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="wallet-outline" size={20} color="#fff" />
                      <Text style={styles.withdrawSubmitText}>Withdraw Now</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              
              {/* Withdrawal History */}
              <View style={styles.withdrawHistorySection}>
                <Text style={styles.withdrawHistoryTitle}>Withdrawal History</Text>
                
                {isLoadingWithdrawals ? (
                  <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 20 }} />
                ) : withdrawalHistory.length === 0 ? (
                  <View style={styles.withdrawHistoryEmpty}>
                    <Ionicons name="wallet-outline" size={40} color={COLORS.textMuted} />
                    <Text style={styles.withdrawHistoryEmptyText}>No withdrawals yet</Text>
                  </View>
                ) : (
                  withdrawalHistory.map((withdrawal, index) => (
                    <View key={index} style={styles.withdrawHistoryItem}>
                      <View style={styles.withdrawHistoryLeft}>
                        <View style={[
                          styles.withdrawHistoryIcon,
                          { backgroundColor: 
                            withdrawal.status === 'completed' ? COLORS.primaryLight :
                            withdrawal.status === 'pending' ? COLORS.warningLight :
                            COLORS.dangerLight
                          }
                        ]}>
                          <Ionicons 
                            name={
                              withdrawal.status === 'completed' ? 'checkmark-circle' :
                              withdrawal.status === 'pending' ? 'time' :
                              'close-circle'
                            } 
                            size={18} 
                            color={
                              withdrawal.status === 'completed' ? COLORS.primary :
                              withdrawal.status === 'pending' ? COLORS.warning :
                              COLORS.danger
                            } 
                          />
                        </View>
                        <View>
                          <Text style={styles.withdrawHistoryAmount}>{formatMoney(withdrawal.amount)}</Text>
                          <Text style={styles.withdrawHistoryWallet} numberOfLines={1}>
                            {withdrawal.wallet_address?.slice(0, 8)}...{withdrawal.wallet_address?.slice(-6)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.withdrawHistoryRight}>
                        <Text style={[
                          styles.withdrawHistoryStatus,
                          { color: 
                            withdrawal.status === 'completed' ? COLORS.primary :
                            withdrawal.status === 'pending' ? COLORS.warning :
                            COLORS.danger
                          }
                        ]}>
                          {withdrawal.status?.charAt(0).toUpperCase() + withdrawal.status?.slice(1)}
                        </Text>
                        <Text style={styles.withdrawHistoryDate}>
                          {new Date(withdrawal.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
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
  
  // Balance Cards Container
  balanceCardsContainer: { marginBottom: 0 },
  
  // Balance Card - Dark theme for contrast
  balanceCard: { borderRadius: 20, padding: 24, marginBottom: 12 },
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
  
  // Hold Balance Card - Orange theme
  holdBalanceCard: { backgroundColor: '#FFF8E7', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#FFE4B5' },
  holdBalanceHeader: { flexDirection: 'row', alignItems: 'center' },
  holdBalanceIconContainer: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFF0D4', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  holdBalanceInfo: { flex: 1 },
  holdBalanceLabel: { color: '#B8860B', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  holdBalanceAmount: { color: '#8B4513', fontSize: 28, fontWeight: '800', marginTop: 2 },
  holdBalanceFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#FFE4B5' },
  holdBalanceRelease: { color: '#B8860B', fontSize: 12, marginLeft: 6 },
  holdBalanceNote: { backgroundColor: '#FFF0D4', borderRadius: 8, padding: 10, marginTop: 10 },
  holdBalanceNoteText: { color: '#B8860B', fontSize: 11, textAlign: 'center', fontStyle: 'italic' },
  
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
  
  // TOP 10 New Styles
  top10Header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, backgroundColor: COLORS.cardLight, borderRadius: 8, marginBottom: 12 },
  top10HeaderText: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' },
  top10Empty: { alignItems: 'center', paddingVertical: 40 },
  top10EmptyText: { fontSize: 14, color: COLORS.textMuted, marginTop: 12 },
  top10CardNew: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 8, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  top10CardSelf: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  top10RankNew: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  top10RankTextNew: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  top10InfoNew: { flex: 1, minWidth: 70 },
  top10NameNew: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  top10LevelNew: { fontSize: 9, color: COLORS.textMuted, marginTop: 1 },
  top10StatValue: { width: 50, fontSize: 12, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  top10StatValueSmall: { width: 45, fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
  top10DepSum: { width: 70, fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
  top10CommissionBox: { width: 80, alignItems: 'flex-end' },
  top10CommissionValue: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  yourRankSection: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  yourRankTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  yourRankNote: { fontSize: 11, color: COLORS.textMuted, marginTop: 8, textAlign: 'center', fontStyle: 'italic' },
  
  // Support
  supportCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 40, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  supportTitle: { color: COLORS.text, fontSize: 22, fontWeight: '700', marginTop: 20 },
  supportText: { color: COLORS.textSecondary, fontSize: 14, marginTop: 8, marginBottom: 32 },
  
  // Landing Pages Section
  landingSection: { marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: COLORS.border },
  landingSectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  landingSectionSubtitle: { fontSize: 12, color: COLORS.textMuted, marginBottom: 16, lineHeight: 18 },
  landingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  landingPreview: { width: 56, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  landingPreviewEmoji: { fontSize: 24 },
  landingInfo: { flex: 1, marginLeft: 14 },
  landingName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  landingDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  landingMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  landingMetaText: { fontSize: 10, color: COLORS.textMuted, marginLeft: 4 },
  getCodeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  getCodeBtnText: { fontSize: 11, fontWeight: '600', color: '#fff', marginLeft: 4 },
  trackingInfoBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.primaryLight, borderRadius: 12, padding: 14, marginTop: 8, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  trackingInfoText: { flex: 1, marginLeft: 12 },
  trackingInfoTitle: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  trackingInfoDesc: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4, lineHeight: 16 },
  
  // Code Modal
  codeModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  codeModalBackdrop: { flex: 1 },
  codeModalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  codeModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  codeModalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  codeModalBody: { padding: 20 },
  codeModalInstructions: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 16 },
  codePreviewBox: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, maxHeight: 150 },
  codePreviewText: { fontSize: 10, color: '#10B981', fontFamily: 'monospace' },
  codeFeatures: { marginTop: 20 },
  codeFeatureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  codeFeatureText: { fontSize: 13, color: COLORS.text, marginLeft: 10 },
  codeModalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: COLORS.border },
  copyCodeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 14 },
  copyCodeBtnCopied: { backgroundColor: COLORS.accent },
  copyCodeBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', marginLeft: 8 },
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
  
  // ===== NEW STATS PAGE STYLES =====
  // Stats Period Row
  statsPeriodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  filterBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.cardLight, justifyContent: 'center', alignItems: 'center' },
  
  // Stats Overview Row
  statsOverviewRow: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  statsOverviewMiniCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statsOverviewMiniValue: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  statsOverviewMiniLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  
  // Stats View Tabs
  statsViewTabs: { flexDirection: 'row', backgroundColor: COLORS.cardLight, borderRadius: 12, padding: 4, marginBottom: 16 },
  statsViewTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 4 },
  statsViewTabActive: { backgroundColor: COLORS.white },
  statsViewTabText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  statsViewTabTextActive: { color: COLORS.primary, fontWeight: '600' },
  
  // Stats Tab Content
  statsTabContent: { backgroundColor: COLORS.white, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  
  // Stats Table
  statsTableContainer: { },
  statsTableHeader: { flexDirection: 'row', backgroundColor: COLORS.cardLight, paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  statsTableHeaderText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' },
  statsTableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  statsTableRowAlt: { backgroundColor: COLORS.cardLight + '40' },
  statsTableCell: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  statsTablePercent: { fontSize: 10, color: COLORS.textMuted, marginLeft: 2 },
  statsEmptyRow: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  statsEmptyText: { color: COLORS.textMuted, fontSize: 13, marginTop: 12 },
  
  // Trader Info Cell
  traderInfo: { flexDirection: 'row', alignItems: 'center' },
  traderFlag: { fontSize: 18, marginRight: 8 },
  traderIdText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  traderDateText: { fontSize: 10, color: COLORS.textMuted },
  
  // Link Cell
  linkCodeCell: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  linkNameCell: { fontSize: 10, color: COLORS.textMuted },
  
  // Country Cell
  countryFlag: { fontSize: 20, marginRight: 8 },
  countryName: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  
  // Pagination
  statsPagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 4 },
  paginationInfo: { fontSize: 12, color: COLORS.textMuted },
  paginationBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paginationBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.cardLight, justifyContent: 'center', alignItems: 'center' },
  paginationBtnDisabled: { opacity: 0.4 },
  paginationPage: { fontSize: 14, fontWeight: '600', color: COLORS.text, paddingHorizontal: 8 },
  
  // Wide Table Styles (Horizontal Scroll)
  horizontalScroll: { marginHorizontal: -16 },
  wideTableWrapper: { minWidth: 900, paddingHorizontal: 16 },
  wideTableWrapperTraders: { minWidth: 700, paddingHorizontal: 16 },
  wideTableWrapperTradersNew: { minWidth: 1600, paddingHorizontal: 16 },
  wideTableWrapperCountries: { minWidth: 1400, paddingHorizontal: 16 },
  wideTableHeader: { flexDirection: 'row', backgroundColor: COLORS.cardLight, paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  wideTableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  
  // Column Widths - Updated for full Traders view
  colTrader: { width: 130 },
  colCountry: { width: 160 },
  colSmall: { width: 70, textAlign: 'center' },
  colMedium: { width: 90 },
  colRegs: { width: 120 },
  colMoney: { width: 90, textAlign: 'right' },
  colTurnover: { width: 130, textAlign: 'right' },
  
  // New columns for Traders tab
  colUserId: { width: 130 },
  colDate: { width: 90 },
  colLinkType: { width: 85, alignItems: 'center', justifyContent: 'center' },
  colSmallNum: { width: 65, textAlign: 'center' },
  colLinkId: { width: 80 },
  
  // Trader flag style
  traderFlag: { fontSize: 16, marginRight: 6 },
  
  // Link Type Badge
  linkTypeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  linkTypeBadgeText: { fontSize: 10, fontWeight: '600' },
  
  // Trader Search Styles
  traderSearchContainer: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  traderSearchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardLight, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border },
  traderSearchInput: { flex: 1, fontSize: 14, color: COLORS.text, paddingVertical: 12, marginLeft: 8 },
  traderSearchBtn: { width: 44, height: 44, backgroundColor: COLORS.primary, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  
  // Trader Detail Card Styles
  traderDetailCard: { backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.primary + '30', marginBottom: 16, overflow: 'hidden' },
  traderDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.primaryLight, padding: 16 },
  traderIdRow: { flexDirection: 'row', alignItems: 'center' },
  traderDetailFlag: { fontSize: 28, marginRight: 12 },
  traderDetailId: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  closeSearchBtn: { padding: 4 },
  traderNotFoundBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.warning + '20', paddingVertical: 8, paddingHorizontal: 16, gap: 8 },
  traderNotFoundText: { fontSize: 12, color: COLORS.warning, fontWeight: '500' },
  traderDetailGrid: { padding: 16 },
  traderDetailRow: { flexDirection: 'row', marginBottom: 16, gap: 12 },
  traderDetailItem: { flex: 1 },
  traderDetailLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  traderDetailValue: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  linkTypeBadgeLarge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
  linkTypeBadgeTextLarge: { fontSize: 12, fontWeight: '700' },
  traderCommissionRow: { flexDirection: 'row', marginTop: 8, gap: 12, backgroundColor: COLORS.cardLight, borderRadius: 12, padding: 16 },
  traderCommissionItem: { flex: 1, alignItems: 'center' },
  traderCommissionLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginBottom: 4 },
  traderCommissionValue: { fontSize: 18, fontWeight: '700' },
  traderCommissionNote: { fontSize: 9, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },
  
  // Full Screen Modal Styles
  fullModalOverlay: { flex: 1, backgroundColor: COLORS.bg },
  fullModalContent: { flex: 1, backgroundColor: COLORS.white },
  fullModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalBackBtn: { padding: 4 },
  fullModalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  fullModalBody: { flex: 1, padding: 20 },
  
  // My Account Styles
  accountProfileSection: { alignItems: 'center', paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 20 },
  accountAvatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  accountAvatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  accountName: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  accountEmail: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
  accountIdBadge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, marginTop: 12 },
  accountIdText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  accountInfoCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  accountInfoTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  accountInfoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  accountInfoRowEditable: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  accountInfoLabel: { fontSize: 14, color: COLORS.textMuted },
  accountInfoValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  
  // Name Edit Styles
  nameDisplayContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  nameEditBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  nameEditContainer: { marginTop: 8 },
  nameEditInput: { backgroundColor: COLORS.cardLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.primary },
  nameEditButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  nameEditCancelBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.dangerLight, justifyContent: 'center', alignItems: 'center' },
  nameEditSaveBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  nameEditHint: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 8, paddingHorizontal: 8, gap: 6 },
  nameEditHintText: { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic' },
  accountStatsCard: { backgroundColor: COLORS.primaryLight, borderRadius: 16, padding: 20 },
  accountStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  accountStatItem: { width: '50%', paddingVertical: 12 },
  accountStatValue: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  accountStatLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  
  // Settings Styles
  settingsSection: { marginBottom: 24 },
  settingsSectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.white, paddingVertical: 16, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  settingsRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingsRowText: { marginLeft: 12, flex: 1 },
  settingsRowTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  settingsRowDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  settingsToggle: { marginLeft: 8 },
  toggleTrack: { width: 44, height: 24, borderRadius: 12, justifyContent: 'center', position: 'relative' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', position: 'absolute' },
  
  // Withdrawal/USDT Address Styles
  withdrawalCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  withdrawalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  withdrawalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginLeft: 10 },
  withdrawalDesc: { fontSize: 12, color: COLORS.textMuted, lineHeight: 18, marginBottom: 16 },
  usdtDisplayBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.cardLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.border },
  usdtAddressText: { fontSize: 13, color: COLORS.text, fontFamily: 'monospace', flex: 1, marginRight: 10 },
  usdtPlaceholder: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic' },
  usdtEditContainer: { marginTop: 4 },
  usdtInput: { backgroundColor: COLORS.cardLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: COLORS.text, borderWidth: 1, borderColor: COLORS.primary, fontFamily: 'monospace' },
  usdtEditButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  usdtCancelBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  usdtCancelText: { fontSize: 14, color: COLORS.textMuted },
  usdtSaveBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: COLORS.primary },
  usdtSaveText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  
  // Password Change Styles
  passwordFormSection: { paddingVertical: 20 },
  passwordInputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8, marginTop: 16 },
  passwordInput: { backgroundColor: COLORS.cardLight, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  changePasswordBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 32 },
  changePasswordBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  
  // 2FA Styles
  twoFASection: { alignItems: 'center', paddingVertical: 24 },
  twoFAIconWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  twoFATitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  twoFADesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20, marginBottom: 24 },
  twoFAStatus: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.dangerLight, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, marginBottom: 24 },
  twoFAStatusText: { fontSize: 13, color: COLORS.danger, marginLeft: 8, fontWeight: '500' },
  twoFAEnableBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 24 },
  twoFAEnableBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', marginLeft: 10 },
  twoFANote: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 20, paddingHorizontal: 20 },
  
  // Help Center Styles
  helpSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardLight, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 24 },
  helpSearchInput: { flex: 1, marginLeft: 12, fontSize: 14, color: COLORS.text },
  helpSection: { marginBottom: 24 },
  helpSectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  helpFaqItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  helpFaqIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  helpFaqText: { flex: 1, marginLeft: 14 },
  helpFaqTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  helpFaqDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  helpContactCard: { backgroundColor: COLORS.primaryLight, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16 },
  helpContactTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 12 },
  helpContactDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  helpContactBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24, marginTop: 16 },
  helpContactBtnText: { fontSize: 14, fontWeight: '700', color: '#fff', marginLeft: 8 },
  helpContactMethods: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  helpContactMethod: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  helpContactMethodText: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginLeft: 8 },

  // Withdraw Modal Styles
  withdrawBalanceCard: { backgroundColor: COLORS.primaryLight, borderRadius: 16, padding: 20, marginBottom: 24, alignItems: 'center' },
  withdrawBalanceLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },
  withdrawBalanceValue: { fontSize: 36, fontWeight: '700', color: COLORS.primary },
  withdrawMinNote: { fontSize: 12, color: COLORS.textMuted, marginTop: 8 },
  withdrawFormSection: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  withdrawFormTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  withdrawAmountInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardLight, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  withdrawCurrency: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginRight: 8 },
  withdrawAmountInput: { flex: 1, fontSize: 28, fontWeight: '700', color: COLORS.text, paddingVertical: 16 },
  withdrawQuickAmounts: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  withdrawQuickAmountBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.cardLight, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  withdrawQuickAmountBtnActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  withdrawQuickAmountText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  withdrawQuickAmountTextActive: { color: COLORS.primary },
  withdrawWalletCard: { backgroundColor: COLORS.cardLight, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 24 },
  withdrawWalletHeader: { flexDirection: 'row', alignItems: 'center' },
  withdrawWalletInfo: { flex: 1, marginLeft: 12 },
  withdrawWalletType: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  withdrawWalletAddress: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, fontFamily: 'monospace' },
  withdrawWalletNoAddress: { fontSize: 12, color: COLORS.danger, marginTop: 2 },
  withdrawSetAddressBtn: { backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  withdrawSetAddressText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  withdrawWalletSelected: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  withdrawWalletSelectedText: { fontSize: 12, color: COLORS.primary, marginLeft: 6, fontWeight: '500' },
  withdrawSubmitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 18, borderRadius: 14 },
  withdrawSubmitBtnDisabled: { opacity: 0.5 },
  withdrawSubmitText: { fontSize: 16, fontWeight: '700', color: '#fff', marginLeft: 10 },
  withdrawHistorySection: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  withdrawHistoryTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  withdrawHistoryEmpty: { alignItems: 'center', paddingVertical: 32 },
  withdrawHistoryEmptyText: { fontSize: 14, color: COLORS.textMuted, marginTop: 12 },
  withdrawHistoryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  withdrawHistoryIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  withdrawHistoryInfo: { flex: 1 },
  withdrawHistoryAmount: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  withdrawHistoryDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  withdrawHistoryStatus: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize', textAlign: 'right' },
  withdrawHistoryStatusText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  withdrawHistoryLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  withdrawHistoryRight: { alignItems: 'flex-end' },
  withdrawHistoryWallet: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
});
