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

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL 
  ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`
  : typeof window !== 'undefined' && window.location.origin.includes('preview.emergentagent.com')
    ? `${window.location.origin}/api`
    : 'http://localhost:8001/api';

// Interfaces
interface Affiliate {
  affiliate_id: string;
  email: string;
  affiliate_code: string;
  referral_link: string;
  status: string;
  commission_type: string;
  commission_rate: number;
  cpa_amount: number;
  tier: number;
  stats: {
    total_clicks: number;
    total_signups: number;
    total_deposits: number;
    total_earnings: number;
    pending_earnings: number;
    paid_earnings: number;
  };
  created_at: string;
}

interface AffiliatePayout {
  payout_id: string;
  affiliate_email: string;
  amount: number;
  payment_method: string;
  wallet_address: string;
  status: string;
  created_at: string;
}

interface AffiliateStats {
  total_affiliates: number;
  active_affiliates: number;
  pending_affiliates: number;
  total_referrals: number;
  total_commissions_paid: number;
  pending_payouts: number;
}

interface GodModeStatus {
  trading_enabled: boolean;
  withdrawals_enabled: boolean;
  global_payout_modifier: number;
  global_win_rate_modifier: number;
}

interface LiveStats {
  live: { active_trades: number; active_users: number; pending_withdrawals: number };
  today: { platform_profit: number; total_volume: number };
}

interface User {
  user_id: string;
  email: string;
  name: string;
  real_balance: number;
  role?: string;
}

const ROLES = [
  { id: 'super_admin', name: 'Super Admin', color: '#FF3B30', icon: 'shield' },
  { id: 'financial_admin', name: 'Financial Admin', color: '#00D4AA', icon: 'cash' },
  { id: 'risk_manager', name: 'Risk Manager', color: '#FF9500', icon: 'warning' },
  { id: 'support_agent', name: 'Support Agent', color: '#007AFF', icon: 'headset' },
  { id: 'auditor', name: 'Auditor', color: '#8E8E93', icon: 'eye' },
  { id: 'affiliate_manager', name: 'Affiliate Manager', color: '#AF52DE', icon: 'people' },
  { id: 'user', name: 'Regular User', color: '#636366', icon: 'person' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const { token } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState('god-mode');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [godMode, setGodMode] = useState<GodModeStatus | null>(null);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [affiliateStats, setAffiliateStats] = useState<AffiliateStats | null>(null);
  const [affiliatePayouts, setAffiliatePayouts] = useState<AffiliatePayout[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTrades, setActiveTrades] = useState<any[]>([]);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  
  // UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [payoutSlider, setPayoutSlider] = useState(100);
  const [winRateSlider, setWinRateSlider] = useState(100);
  
  // Modals
  const [showAffiliateModal, setShowAffiliateModal] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [affiliateFilter, setAffiliateFilter] = useState('all');

  // Fetch functions
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

  const fetchLiveStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/platform/live-stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setLiveStats(await res.json());
    } catch (e) { console.error(e); }
  }, [token]);

  const fetchAffiliates = useCallback(async () => {
    try {
      const url = affiliateFilter === 'all' 
        ? `${API_URL}/admin/affiliates`
        : `${API_URL}/admin/affiliates?status=${affiliateFilter}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAffiliates(data.affiliates || []);
      }
    } catch (e) { console.error(e); }
  }, [token, affiliateFilter]);

  const fetchAffiliateStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/affiliates/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setAffiliateStats(await res.json());
    } catch (e) { console.error(e); }
  }, [token]);

  const fetchAffiliatePayouts = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/affiliates/payouts?status=pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAffiliatePayouts(data.payouts || []);
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

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchGodMode(),
        fetchLiveStats(),
        fetchAffiliates(),
        fetchAffiliateStats(),
        fetchAffiliatePayouts(),
        fetchUsers(),
        fetchTrades()
      ]);
      setLoading(false);
    };
    init();
    
    const interval = setInterval(() => {
      fetchLiveStats();
      fetchTrades();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchAffiliates();
  }, [affiliateFilter]);

  // Actions
  const toggleKillSwitch = async (enabled: boolean) => {
    try {
      await fetch(`${API_URL}/admin/god-mode/kill-switch`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      setGodMode(prev => prev ? { ...prev, trading_enabled: enabled } : null);
      Alert.alert('Success', enabled ? 'Trading ENABLED' : 'Trading DISABLED');
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const toggleWithdrawals = async (enabled: boolean) => {
    try {
      await fetch(`${API_URL}/admin/god-mode/freeze-withdrawals`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      setGodMode(prev => prev ? { ...prev, withdrawals_enabled: enabled } : null);
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const updateGlobalPayout = async () => {
    try {
      await fetch(`${API_URL}/admin/god-mode/global-payout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ modifier: payoutSlider })
      });
      Alert.alert('Success', `Global payout: ${payoutSlider}%`);
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const updateGlobalWinRate = async () => {
    try {
      await fetch(`${API_URL}/admin/god-mode/global-win-rate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ modifier: winRateSlider })
      });
      Alert.alert('Success', `Global win rate: ${winRateSlider}%`);
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const approveAffiliate = async (affiliateId: string) => {
    try {
      await fetch(`${API_URL}/admin/affiliates/${affiliateId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      Alert.alert('Success', 'Affiliate approved');
      fetchAffiliates();
      fetchAffiliateStats();
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const suspendAffiliate = async (affiliateId: string) => {
    try {
      await fetch(`${API_URL}/admin/affiliates/${affiliateId}/suspend`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Admin action' })
      });
      Alert.alert('Success', 'Affiliate suspended');
      fetchAffiliates();
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const updateAffiliateCommission = async (affiliateId: string, rate: number, type: string, cpa: number) => {
    try {
      await fetch(`${API_URL}/admin/affiliates/${affiliateId}/commission`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ commission_rate: rate, commission_type: type, cpa_amount: cpa })
      });
      Alert.alert('Success', 'Commission updated');
      setShowAffiliateModal(false);
      fetchAffiliates();
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const approvePayout = async (payoutId: string) => {
    try {
      await fetch(`${API_URL}/admin/affiliates/payouts/${payoutId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      Alert.alert('Success', 'Payout approved');
      fetchAffiliatePayouts();
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const rejectPayout = async (payoutId: string) => {
    try {
      await fetch(`${API_URL}/admin/affiliates/payouts/${payoutId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Rejected by admin' })
      });
      Alert.alert('Success', 'Payout rejected');
      fetchAffiliatePayouts();
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const setUserRole = async (userId: string, role: string) => {
    try {
      await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      Alert.alert('Success', `Role set to ${role}`);
      setShowRoleModal(false);
      fetchUsers();
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const overrideTrade = async (tradeId: string, result: 'win' | 'lose') => {
    try {
      await fetch(`${API_URL}/admin/trades/${tradeId}/override`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ result })
      });
      Alert.alert('Success', `Trade forced to ${result.toUpperCase()}`);
      fetchTrades();
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchGodMode(), fetchLiveStats(), fetchAffiliates(), fetchAffiliateStats(), fetchAffiliatePayouts(), fetchUsers(), fetchTrades()]);
    setRefreshing(false);
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n || 0);

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF3B30" />
        <Text style={styles.loadingText}>Loading Control Center...</Text>
      </View>
    );
  }

  const tabs = ['god-mode', 'affiliates', 'trades', 'roles', 'logs'];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🔥 CONTROL CENTER</Text>
        </View>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Live Stats Bar */}
      {liveStats && (
        <View style={styles.liveStatsBar}>
          <View style={styles.liveStat}>
            <Text style={styles.liveStatValue}>{liveStats.live?.active_trades || 0}</Text>
            <Text style={styles.liveStatLabel}>Active</Text>
          </View>
          <View style={styles.liveStat}>
            <Text style={styles.liveStatValue}>{liveStats.live?.active_users || 0}</Text>
            <Text style={styles.liveStatLabel}>Users</Text>
          </View>
          <View style={styles.liveStat}>
            <Text style={[styles.liveStatValue, { color: (liveStats.today?.platform_profit || 0) >= 0 ? '#00D4AA' : '#FF3B30' }]}>
              {formatCurrency(liveStats.today?.platform_profit || 0)}
            </Text>
            <Text style={styles.liveStatLabel}>Profit</Text>
          </View>
          <View style={styles.liveStat}>
            <Text style={styles.liveStatValue}>{affiliateStats?.active_affiliates || 0}</Text>
            <Text style={styles.liveStatLabel}>Affiliates</Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
        <View style={styles.tabContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Ionicons 
                name={
                  tab === 'god-mode' ? 'flash' :
                  tab === 'affiliates' ? 'people' :
                  tab === 'trades' ? 'trending-up' :
                  tab === 'roles' ? 'shield' : 'list'
                } 
                size={16} 
                color={activeTab === tab ? '#FFF' : '#8898AA'} 
              />
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'god-mode' ? 'GOD MODE' : tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* GOD MODE TAB */}
        {activeTab === 'god-mode' && (
          <View style={styles.tabContent}>
            {/* Kill Switch */}
            <View style={styles.controlCard}>
              <View style={styles.controlHeader}>
                <Ionicons name="power" size={24} color="#FF3B30" />
                <Text style={styles.controlTitle}>KILL SWITCH</Text>
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Trading {godMode?.trading_enabled ? 'ON' : 'OFF'}</Text>
                <Switch
                  value={godMode?.trading_enabled}
                  onValueChange={toggleKillSwitch}
                  trackColor={{ false: '#FF3B30', true: '#00D4AA' }}
                />
              </View>
            </View>

            {/* Freeze Withdrawals */}
            <View style={styles.controlCard}>
              <View style={styles.controlHeader}>
                <Ionicons name="snow" size={24} color="#007AFF" />
                <Text style={styles.controlTitle}>FREEZE WITHDRAWALS</Text>
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>{godMode?.withdrawals_enabled ? 'Enabled' : 'Frozen'}</Text>
                <Switch
                  value={godMode?.withdrawals_enabled}
                  onValueChange={toggleWithdrawals}
                  trackColor={{ false: '#FF3B30', true: '#00D4AA' }}
                />
              </View>
            </View>

            {/* Global Payout */}
            <View style={styles.controlCard}>
              <View style={styles.controlHeader}>
                <Ionicons name="cash" size={24} color="#00D4AA" />
                <Text style={styles.controlTitle}>GLOBAL PAYOUT</Text>
              </View>
              <Text style={styles.sliderValue}>{payoutSlider}%</Text>
              <View style={styles.sliderRow}>
                <TouchableOpacity style={styles.sliderBtn} onPress={() => setPayoutSlider(Math.max(0, payoutSlider - 10))}>
                  <Ionicons name="remove" size={20} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.sliderTrack}>
                  <View style={[styles.sliderFill, { width: `${payoutSlider / 2}%` }]} />
                </View>
                <TouchableOpacity style={styles.sliderBtn} onPress={() => setPayoutSlider(Math.min(200, payoutSlider + 10))}>
                  <Ionicons name="add" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.applyBtn} onPress={updateGlobalPayout}>
                <Text style={styles.applyBtnText}>APPLY</Text>
              </TouchableOpacity>
            </View>

            {/* Global Win Rate */}
            <View style={styles.controlCard}>
              <View style={styles.controlHeader}>
                <Ionicons name="trophy" size={24} color="#FF9500" />
                <Text style={styles.controlTitle}>GLOBAL WIN RATE</Text>
              </View>
              <Text style={styles.sliderValue}>{winRateSlider}%</Text>
              <View style={styles.sliderRow}>
                <TouchableOpacity style={styles.sliderBtn} onPress={() => setWinRateSlider(Math.max(0, winRateSlider - 10))}>
                  <Ionicons name="remove" size={20} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.sliderTrack}>
                  <View style={[styles.sliderFill, { width: `${winRateSlider / 2}%`, backgroundColor: '#FF9500' }]} />
                </View>
                <TouchableOpacity style={styles.sliderBtn} onPress={() => setWinRateSlider(Math.min(200, winRateSlider + 10))}>
                  <Ionicons name="add" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={[styles.applyBtn, { backgroundColor: '#FF9500' }]} onPress={updateGlobalWinRate}>
                <Text style={styles.applyBtnText}>APPLY</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* AFFILIATES TAB */}
        {activeTab === 'affiliates' && (
          <View style={styles.tabContent}>
            {/* Stats Cards */}
            {affiliateStats && (
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { borderLeftColor: '#00D4AA' }]}>
                  <Text style={styles.statValue}>{affiliateStats.total_affiliates}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={[styles.statCard, { borderLeftColor: '#007AFF' }]}>
                  <Text style={styles.statValue}>{affiliateStats.active_affiliates}</Text>
                  <Text style={styles.statLabel}>Active</Text>
                </View>
                <View style={[styles.statCard, { borderLeftColor: '#FF9500' }]}>
                  <Text style={styles.statValue}>{affiliateStats.pending_affiliates}</Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
                <View style={[styles.statCard, { borderLeftColor: '#AF52DE' }]}>
                  <Text style={styles.statValue}>{affiliateStats.total_referrals}</Text>
                  <Text style={styles.statLabel}>Referrals</Text>
                </View>
              </View>
            )}

            {/* Filter Buttons */}
            <View style={styles.filterRow}>
              {['all', 'active', 'pending', 'suspended'].map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterBtn, affiliateFilter === f && styles.filterBtnActive]}
                  onPress={() => setAffiliateFilter(f)}
                >
                  <Text style={[styles.filterBtnText, affiliateFilter === f && styles.filterBtnTextActive]}>
                    {f.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Pending Payouts */}
            {affiliatePayouts.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>💸 PENDING PAYOUTS ({affiliatePayouts.length})</Text>
                {affiliatePayouts.map((p) => (
                  <View key={p.payout_id} style={styles.payoutCard}>
                    <View style={styles.payoutInfo}>
                      <Text style={styles.payoutEmail}>{p.affiliate_email}</Text>
                      <Text style={styles.payoutAmount}>{formatCurrency(p.amount)}</Text>
                      <Text style={styles.payoutMethod}>{p.payment_method} • {p.wallet_address?.slice(0, 12)}...</Text>
                    </View>
                    <View style={styles.payoutActions}>
                      <TouchableOpacity style={styles.approveBtn} onPress={() => approvePayout(p.payout_id)}>
                        <Ionicons name="checkmark" size={18} color="#FFF" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectPayout(p.payout_id)}>
                        <Ionicons name="close" size={18} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Affiliates List */}
            <Text style={styles.sectionTitle}>👥 AFFILIATES</Text>
            {affiliates.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={40} color="#8898AA" />
                <Text style={styles.emptyText}>No affiliates found</Text>
              </View>
            ) : (
              affiliates.map((aff) => (
                <TouchableOpacity
                  key={aff.affiliate_id}
                  style={styles.affiliateCard}
                  onPress={() => { setSelectedAffiliate(aff); setShowAffiliateModal(true); }}
                >
                  <View style={styles.affiliateHeader}>
                    <View>
                      <Text style={styles.affiliateEmail}>{aff.email}</Text>
                      <Text style={styles.affiliateCode}>Code: {aff.affiliate_code}</Text>
                    </View>
                    <View style={[styles.statusBadge, { 
                      backgroundColor: aff.status === 'active' ? '#E8F5E9' : aff.status === 'pending' ? '#FFF3E0' : '#FFEBEE' 
                    }]}>
                      <Text style={[styles.statusText, {
                        color: aff.status === 'active' ? '#00D4AA' : aff.status === 'pending' ? '#FF9500' : '#FF3B30'
                      }]}>{aff.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={styles.affiliateStats}>
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
                    <View style={styles.affStatItem}>
                      <Text style={styles.affStatValue}>{aff.commission_rate}%</Text>
                      <Text style={styles.affStatLabel}>Rate</Text>
                    </View>
                  </View>
                  {aff.status === 'pending' && (
                    <View style={styles.affiliateActions}>
                      <TouchableOpacity style={styles.approveAffBtn} onPress={() => approveAffiliate(aff.affiliate_id)}>
                        <Text style={styles.actionBtnText}>APPROVE</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.rejectAffBtn} onPress={() => suspendAffiliate(aff.affiliate_id)}>
                        <Text style={styles.actionBtnText}>REJECT</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* TRADES TAB */}
        {activeTab === 'trades' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>🔴 ACTIVE TRADES ({activeTrades.length})</Text>
            {activeTrades.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle" size={40} color="#00D4AA" />
                <Text style={styles.emptyText}>No active trades</Text>
              </View>
            ) : (
              activeTrades.map((trade) => (
                <View key={trade.trade_id} style={styles.tradeCard}>
                  <View style={styles.tradeHeader}>
                    <Text style={styles.tradeAsset}>{trade.asset}</Text>
                    <View style={[styles.directionBadge, { backgroundColor: trade.direction === 'up' ? '#00D4AA' : '#FF3B30' }]}>
                      <Text style={styles.directionText}>{trade.direction?.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.tradeAmount}>{formatCurrency(trade.amount)}</Text>
                  <Text style={styles.tradeUser}>{trade.user_email}</Text>
                  <View style={styles.tradeActions}>
                    <TouchableOpacity style={[styles.tradeBtn, { backgroundColor: '#00D4AA' }]} onPress={() => overrideTrade(trade.trade_id, 'win')}>
                      <Text style={styles.tradeBtnText}>WIN</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tradeBtn, { backgroundColor: '#FF3B30' }]} onPress={() => overrideTrade(trade.trade_id, 'lose')}>
                      <Text style={styles.tradeBtnText}>LOSE</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>📊 RECENT TRADES</Text>
            {recentTrades.slice(0, 15).map((t) => (
              <View key={t.trade_id} style={styles.recentRow}>
                <Text style={styles.recentAsset}>{t.asset}</Text>
                <Text style={styles.recentAmount}>{formatCurrency(t.amount)}</Text>
                <View style={[styles.miniStatus, { backgroundColor: t.status === 'won' ? '#E8F5E9' : '#FFEBEE' }]}>
                  <Text style={{ color: t.status === 'won' ? '#00D4AA' : '#FF3B30', fontSize: 10, fontWeight: '700' }}>
                    {t.status?.toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.recentPL, { color: (t.profit_loss || 0) >= 0 ? '#00D4AA' : '#FF3B30' }]}>
                  {formatCurrency(t.profit_loss || 0)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ROLES TAB */}
        {activeTab === 'roles' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>👑 ROLE HIERARCHY</Text>
            <View style={styles.rolesGrid}>
              {ROLES.slice(0, -1).map((role) => (
                <View key={role.id} style={[styles.roleCard, { borderLeftColor: role.color }]}>
                  <Ionicons name={role.icon as any} size={24} color={role.color} />
                  <Text style={styles.roleName}>{role.name}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>👥 ASSIGN ROLES</Text>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color="#8898AA" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search users..."
                placeholderTextColor="#8898AA"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            {filteredUsers.slice(0, 20).map((user) => (
              <TouchableOpacity
                key={user.user_id}
                style={styles.userRow}
                onPress={() => { setSelectedUser(user); setShowRoleModal(true); }}
              >
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.name || user.email?.split('@')[0]}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: ROLES.find(r => r.id === user.role)?.color || '#636366' }]}>
                  <Text style={styles.roleBadgeText}>{user.role || 'user'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* LOGS TAB */}
        {activeTab === 'logs' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>📋 ADMIN LOGS</Text>
            <View style={styles.emptyState}>
              <Ionicons name="document-text" size={40} color="#8898AA" />
              <Text style={styles.emptyText}>Activity logs will appear here</Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Affiliate Detail Modal */}
      <Modal visible={showAffiliateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Affiliate Settings</Text>
              <TouchableOpacity onPress={() => setShowAffiliateModal(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            {selectedAffiliate && (
              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalEmail}>{selectedAffiliate.email}</Text>
                <Text style={styles.modalCode}>Code: {selectedAffiliate.affiliate_code}</Text>
                
                <View style={styles.commissionSection}>
                  <Text style={styles.commLabel}>Commission Type</Text>
                  <View style={styles.commTypes}>
                    {['cpa', 'revenue_share', 'hybrid'].map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.commTypeBtn, selectedAffiliate.commission_type === t && styles.commTypeBtnActive]}
                        onPress={() => setSelectedAffiliate({ ...selectedAffiliate, commission_type: t })}
                      >
                        <Text style={[styles.commTypeText, selectedAffiliate.commission_type === t && styles.commTypeTextActive]}>
                          {t.toUpperCase().replace('_', ' ')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Commission Rate (%)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={selectedAffiliate.commission_rate.toString()}
                    onChangeText={(v) => setSelectedAffiliate({ ...selectedAffiliate, commission_rate: parseFloat(v) || 0 })}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>CPA Amount ($)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={selectedAffiliate.cpa_amount.toString()}
                    onChangeText={(v) => setSelectedAffiliate({ ...selectedAffiliate, cpa_amount: parseFloat(v) || 0 })}
                    keyboardType="numeric"
                  />
                </View>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={() => updateAffiliateCommission(
                    selectedAffiliate.affiliate_id,
                    selectedAffiliate.commission_rate,
                    selectedAffiliate.commission_type,
                    selectedAffiliate.cpa_amount
                  )}
                >
                  <Text style={styles.saveBtnText}>SAVE CHANGES</Text>
                </TouchableOpacity>

                {selectedAffiliate.status === 'active' && (
                  <TouchableOpacity
                    style={styles.suspendBtn}
                    onPress={() => { suspendAffiliate(selectedAffiliate.affiliate_id); setShowAffiliateModal(false); }}
                  >
                    <Text style={styles.suspendBtnText}>SUSPEND AFFILIATE</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Role Assignment Modal */}
      <Modal visible={showRoleModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Role</Text>
              <TouchableOpacity onPress={() => setShowRoleModal(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            {selectedUser && (
              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalEmail}>{selectedUser.email}</Text>
                <Text style={styles.modalSubtext}>Select a role to assign</Text>
                
                {ROLES.map((role) => (
                  <TouchableOpacity
                    key={role.id}
                    style={[styles.roleOption, { borderLeftColor: role.color }]}
                    onPress={() => setUserRole(selectedUser.user_id, role.id)}
                  >
                    <Ionicons name={role.icon as any} size={24} color={role.color} />
                    <Text style={styles.roleOptionText}>{role.name}</Text>
                    {selectedUser.role === role.id && (
                      <Ionicons name="checkmark-circle" size={20} color="#00D4AA" />
                    )}
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
  container: { flex: 1, backgroundColor: '#0D1117' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D1117' },
  loadingText: { marginTop: 12, color: '#8898AA', fontSize: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 12, backgroundColor: '#161B22', borderBottomWidth: 1, borderBottomColor: '#30363D' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FF3B30' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF3B30', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF', marginRight: 4 },
  liveText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  liveStatsBar: { flexDirection: 'row', backgroundColor: '#161B22', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#30363D' },
  liveStat: { flex: 1, alignItems: 'center' },
  liveStatValue: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  liveStatLabel: { fontSize: 9, color: '#8898AA', marginTop: 2 },
  tabScroll: { backgroundColor: '#161B22', borderBottomWidth: 1, borderBottomColor: '#30363D' },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, marginRight: 6, borderRadius: 16, backgroundColor: '#21262D' },
  tabActive: { backgroundColor: '#FF3B30' },
  tabText: { fontSize: 11, fontWeight: '600', color: '#8898AA', marginLeft: 4 },
  tabTextActive: { color: '#FFF' },
  content: { flex: 1 },
  tabContent: { padding: 16 },
  controlCard: { backgroundColor: '#161B22', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#30363D' },
  controlHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  controlTitle: { fontSize: 14, fontWeight: '700', color: '#FFF', marginLeft: 8 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { fontSize: 14, fontWeight: '500', color: '#FFF' },
  sliderValue: { fontSize: 28, fontWeight: '700', color: '#FFF', textAlign: 'center', marginBottom: 12 },
  sliderRow: { flexDirection: 'row', alignItems: 'center' },
  sliderBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#30363D', justifyContent: 'center', alignItems: 'center' },
  sliderTrack: { flex: 1, height: 6, backgroundColor: '#30363D', borderRadius: 3, marginHorizontal: 12, overflow: 'hidden' },
  sliderFill: { height: '100%', backgroundColor: '#00D4AA', borderRadius: 3 },
  applyBtn: { backgroundColor: '#00D4AA', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8, alignSelf: 'center', marginTop: 12 },
  applyBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, marginHorizontal: -4 },
  statCard: { width: '48%', backgroundColor: '#161B22', borderRadius: 8, padding: 12, margin: 4, borderLeftWidth: 3 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  statLabel: { fontSize: 11, color: '#8898AA', marginTop: 2 },
  filterRow: { flexDirection: 'row', marginBottom: 16 },
  filterBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#21262D', marginRight: 8 },
  filterBtnActive: { backgroundColor: '#AF52DE' },
  filterBtnText: { fontSize: 11, fontWeight: '600', color: '#8898AA' },
  filterBtnTextActive: { color: '#FFF' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#FFF', marginBottom: 12 },
  payoutCard: { flexDirection: 'row', backgroundColor: '#161B22', borderRadius: 10, padding: 12, marginBottom: 8, alignItems: 'center' },
  payoutInfo: { flex: 1 },
  payoutEmail: { fontSize: 13, fontWeight: '600', color: '#FFF' },
  payoutAmount: { fontSize: 18, fontWeight: '700', color: '#00D4AA', marginTop: 2 },
  payoutMethod: { fontSize: 11, color: '#8898AA', marginTop: 2 },
  payoutActions: { flexDirection: 'row' },
  approveBtn: { backgroundColor: '#00D4AA', padding: 10, borderRadius: 8, marginRight: 6 },
  rejectBtn: { backgroundColor: '#FF3B30', padding: 10, borderRadius: 8 },
  affiliateCard: { backgroundColor: '#161B22', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#30363D' },
  affiliateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  affiliateEmail: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  affiliateCode: { fontSize: 11, color: '#8898AA', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '700' },
  affiliateStats: { flexDirection: 'row', marginBottom: 10 },
  affStatItem: { flex: 1, alignItems: 'center' },
  affStatValue: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  affStatLabel: { fontSize: 9, color: '#8898AA', marginTop: 1 },
  affiliateActions: { flexDirection: 'row', marginTop: 8 },
  approveAffBtn: { flex: 1, backgroundColor: '#00D4AA', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginRight: 6 },
  rejectAffBtn: { flex: 1, backgroundColor: '#FF3B30', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', padding: 30, backgroundColor: '#161B22', borderRadius: 12 },
  emptyText: { color: '#8898AA', marginTop: 8 },
  tradeCard: { backgroundColor: '#161B22', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#30363D' },
  tradeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tradeAsset: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  directionBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  directionText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  tradeAmount: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  tradeUser: { fontSize: 11, color: '#8898AA', marginTop: 4 },
  tradeActions: { flexDirection: 'row', marginTop: 12 },
  tradeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  tradeBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  recentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B22', padding: 10, borderRadius: 8, marginBottom: 6 },
  recentAsset: { flex: 1, fontSize: 13, fontWeight: '600', color: '#FFF' },
  recentAmount: { fontSize: 13, fontWeight: '600', color: '#FFF', marginRight: 10 },
  miniStatus: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 10 },
  recentPL: { fontSize: 13, fontWeight: '700', minWidth: 60, textAlign: 'right' },
  rolesGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  roleCard: { width: '48%', backgroundColor: '#161B22', borderRadius: 10, padding: 14, margin: 4, borderLeftWidth: 3, alignItems: 'center' },
  roleName: { fontSize: 12, fontWeight: '600', color: '#FFF', marginTop: 8, textAlign: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B22', borderRadius: 8, paddingHorizontal: 12, marginBottom: 12, borderWidth: 1, borderColor: '#30363D' },
  searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14, color: '#FFF' },
  userRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B22', padding: 12, borderRadius: 10, marginBottom: 8 },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  userEmail: { fontSize: 11, color: '#8898AA', marginTop: 2 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#161B22', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#30363D' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  modalBody: { padding: 16 },
  modalEmail: { fontSize: 16, fontWeight: '600', color: '#FFF', marginBottom: 4 },
  modalCode: { fontSize: 12, color: '#8898AA', marginBottom: 16 },
  modalSubtext: { fontSize: 12, color: '#8898AA', marginBottom: 16 },
  commissionSection: { marginBottom: 16 },
  commLabel: { fontSize: 13, fontWeight: '600', color: '#FFF', marginBottom: 8 },
  commTypes: { flexDirection: 'row' },
  commTypeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#21262D', alignItems: 'center', marginHorizontal: 2 },
  commTypeBtnActive: { backgroundColor: '#AF52DE' },
  commTypeText: { color: '#8898AA', fontSize: 10, fontWeight: '600' },
  commTypeTextActive: { color: '#FFF' },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#FFF', marginBottom: 6 },
  textInput: { backgroundColor: '#21262D', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, fontSize: 14, color: '#FFF', borderWidth: 1, borderColor: '#30363D' },
  saveBtn: { backgroundColor: '#00D4AA', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  suspendBtn: { backgroundColor: '#FF3B30', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  suspendBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  roleOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#21262D', padding: 14, borderRadius: 10, marginBottom: 8, borderLeftWidth: 3 },
  roleOptionText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#FFF', marginLeft: 12 },
});
