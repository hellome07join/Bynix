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
interface GodModeStatus {
  trading_enabled: boolean;
  withdrawals_enabled: boolean;
  deposits_enabled: boolean;
  global_payout_modifier: number;
  global_win_rate_modifier: number;
  maintenance_mode: boolean;
}

interface LiveStats {
  live: {
    active_trades: number;
    active_users: number;
    pending_withdrawals: number;
    pending_deposits: number;
  };
  today: {
    total_trades: number;
    total_volume: number;
    platform_profit: number;
    total_deposits: number;
    total_withdrawals: number;
    net_flow: number;
  };
  god_mode: {
    trading_enabled: boolean;
    withdrawals_enabled: boolean;
    global_payout: number;
    global_win_rate: number;
  };
}

interface ActiveTrade {
  trade_id: string;
  user_id: string;
  user_email: string;
  asset: string;
  amount: number;
  direction: string;
  entry_price: number;
  payout_percentage: number;
  expiry_time: string;
  account_type: string;
}

interface RecentTrade {
  trade_id: string;
  user_email: string;
  asset: string;
  amount: number;
  direction: string;
  profit_loss: number;
  status: string;
}

interface UserRiskProfile {
  user_id: string;
  email: string;
  name: string;
  balances: { real: number; demo: number; bonus: number };
  trading_stats: {
    total_trades: number;
    won_trades: number;
    lost_trades: number;
    win_rate: number;
    total_volume: number;
    total_profit: number;
  };
  risk_controls: {
    win_rate_modifier: number;
    payout_modifier: number;
    is_shadow_banned: boolean;
    is_flagged: boolean;
    risk_level: string;
  };
  ai_risk_score: number;
}

interface User {
  user_id: string;
  email: string;
  name: string;
  real_balance: number;
  demo_balance: number;
  bonus_balance: number;
  is_verified: boolean;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { token } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState('god-mode');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [godMode, setGodMode] = useState<GodModeStatus | null>(null);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>([]);
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showUserRiskModal, setShowUserRiskModal] = useState(false);
  const [selectedUserRisk, setSelectedUserRisk] = useState<UserRiskProfile | null>(null);
  const [showTradeOverrideModal, setShowTradeOverrideModal] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<ActiveTrade | null>(null);
  
  // Form states
  const [payoutSlider, setPayoutSlider] = useState(100);
  const [winRateSlider, setWinRateSlider] = useState(100);
  const [userWinRate, setUserWinRate] = useState('100');
  const [userPayout, setUserPayout] = useState('100');

  // Fetch functions
  const fetchGodModeStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/admin/god-mode/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setGodMode(data);
        setPayoutSlider(data.global_payout_modifier);
        setWinRateSlider(data.global_win_rate_modifier);
      }
    } catch (error) {
      console.error('Error fetching god mode:', error);
    }
  }, [token]);

  const fetchLiveStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/admin/platform/live-stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLiveStats(data);
      }
    } catch (error) {
      console.error('Error fetching live stats:', error);
    }
  }, [token]);

  const fetchLiveTrades = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/admin/trades/live`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setActiveTrades(data.active_trades || []);
        setRecentTrades(data.recent_trades || []);
      }
    } catch (error) {
      console.error('Error fetching live trades:', error);
    }
  }, [token]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [token]);

  const fetchUserRiskProfile = async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}/risk-profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedUserRisk(data);
        setUserWinRate(data.risk_controls.win_rate_modifier?.toString() || '100');
        setUserPayout(data.risk_controls.payout_modifier?.toString() || '100');
        setShowUserRiskModal(true);
      }
    } catch (error) {
      console.error('Error fetching user risk:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchGodModeStatus(),
        fetchLiveStats(),
        fetchLiveTrades(),
        fetchUsers()
      ]);
      setLoading(false);
    };
    init();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchLiveStats();
      fetchLiveTrades();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [fetchGodModeStatus, fetchLiveStats, fetchLiveTrades, fetchUsers]);

  // God Mode Actions
  const toggleKillSwitch = async (enabled: boolean) => {
    try {
      const response = await fetch(`${API_URL}/admin/god-mode/kill-switch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled })
      });
      if (response.ok) {
        setGodMode(prev => prev ? { ...prev, trading_enabled: enabled } : null);
        Alert.alert('Success', enabled ? 'Trading ENABLED' : 'Trading DISABLED');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle kill switch');
    }
  };

  const toggleWithdrawals = async (enabled: boolean) => {
    try {
      const response = await fetch(`${API_URL}/admin/god-mode/freeze-withdrawals`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled })
      });
      if (response.ok) {
        setGodMode(prev => prev ? { ...prev, withdrawals_enabled: enabled } : null);
        Alert.alert('Success', enabled ? 'Withdrawals ENABLED' : 'Withdrawals FROZEN');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle withdrawals');
    }
  };

  const updateGlobalPayout = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/god-mode/global-payout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ modifier: payoutSlider })
      });
      if (response.ok) {
        Alert.alert('Success', `Global payout set to ${payoutSlider}%`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update payout');
    }
  };

  const updateGlobalWinRate = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/god-mode/global-win-rate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ modifier: winRateSlider })
      });
      if (response.ok) {
        Alert.alert('Success', `Global win rate set to ${winRateSlider}%`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update win rate');
    }
  };

  // Trade Actions
  const overrideTrade = async (tradeId: string, result: 'win' | 'lose') => {
    try {
      const response = await fetch(`${API_URL}/admin/trades/${tradeId}/override`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ result })
      });
      if (response.ok) {
        Alert.alert('Success', `Trade forced to ${result.toUpperCase()}`);
        setShowTradeOverrideModal(false);
        fetchLiveTrades();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to override trade');
    }
  };

  const cancelTrade = async (tradeId: string) => {
    try {
      const response = await fetch(`${API_URL}/admin/trades/${tradeId}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        Alert.alert('Success', 'Trade cancelled and refunded');
        setShowTradeOverrideModal(false);
        fetchLiveTrades();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel trade');
    }
  };

  // User Risk Actions
  const updateUserWinRate = async () => {
    if (!selectedUserRisk) return;
    try {
      const response = await fetch(`${API_URL}/admin/users/${selectedUserRisk.user_id}/win-rate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ modifier: parseFloat(userWinRate) })
      });
      if (response.ok) {
        Alert.alert('Success', `Win rate set to ${userWinRate}%`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update win rate');
    }
  };

  const updateUserPayout = async () => {
    if (!selectedUserRisk) return;
    try {
      const response = await fetch(`${API_URL}/admin/users/${selectedUserRisk.user_id}/payout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ modifier: parseFloat(userPayout) })
      });
      if (response.ok) {
        Alert.alert('Success', `Payout set to ${userPayout}%`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update payout');
    }
  };

  const toggleShadowBan = async (banned: boolean) => {
    if (!selectedUserRisk) return;
    try {
      const response = await fetch(`${API_URL}/admin/users/${selectedUserRisk.user_id}/shadow-ban`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ banned })
      });
      if (response.ok) {
        Alert.alert('Success', banned ? 'User shadow banned' : 'Shadow ban removed');
        setSelectedUserRisk(prev => prev ? { 
          ...prev, 
          risk_controls: { ...prev.risk_controls, is_shadow_banned: banned }
        } : null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update shadow ban');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchGodModeStatus(), fetchLiveStats(), fetchLiveTrades(), fetchUsers()]);
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

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

  const tabs = ['god-mode', 'trades', 'users', 'logs'];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>🔥 CONTROL CENTER</Text>
            <Text style={styles.headerSubtitle}>God Mode Active</Text>
          </View>
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
            <Text style={styles.liveStatValue}>{liveStats.live.active_trades}</Text>
            <Text style={styles.liveStatLabel}>Active</Text>
          </View>
          <View style={styles.liveStat}>
            <Text style={styles.liveStatValue}>{liveStats.live.active_users}</Text>
            <Text style={styles.liveStatLabel}>Users</Text>
          </View>
          <View style={styles.liveStat}>
            <Text style={[styles.liveStatValue, { color: liveStats.today.platform_profit >= 0 ? '#00D4AA' : '#FF3B30' }]}>
              {formatCurrency(liveStats.today.platform_profit)}
            </Text>
            <Text style={styles.liveStatLabel}>Today P/L</Text>
          </View>
          <View style={styles.liveStat}>
            <Text style={styles.liveStatValue}>{liveStats.live.pending_withdrawals}</Text>
            <Text style={styles.liveStatLabel}>Pending</Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScrollContainer}>
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
                  tab === 'trades' ? 'trending-up' :
                  tab === 'users' ? 'people' : 'list'
                } 
                size={18} 
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
        showsVerticalScrollIndicator={false}
      >
        {/* GOD MODE TAB */}
        {activeTab === 'god-mode' && (
          <View style={styles.godModeContainer}>
            {/* Kill Switch */}
            <View style={styles.controlCard}>
              <View style={styles.controlHeader}>
                <Ionicons name="power" size={24} color="#FF3B30" />
                <Text style={styles.controlTitle}>KILL SWITCH</Text>
              </View>
              <Text style={styles.controlDesc}>Instantly disable all trading platform-wide</Text>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Trading {godMode?.trading_enabled ? 'ENABLED' : 'DISABLED'}</Text>
                <Switch
                  value={godMode?.trading_enabled}
                  onValueChange={toggleKillSwitch}
                  trackColor={{ false: '#FF3B30', true: '#00D4AA' }}
                  thumbColor="#FFF"
                />
              </View>
            </View>

            {/* Freeze Withdrawals */}
            <View style={styles.controlCard}>
              <View style={styles.controlHeader}>
                <Ionicons name="snow" size={24} color="#007AFF" />
                <Text style={styles.controlTitle}>FREEZE WITHDRAWALS</Text>
              </View>
              <Text style={styles.controlDesc}>Block all withdrawal requests</Text>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Withdrawals {godMode?.withdrawals_enabled ? 'ENABLED' : 'FROZEN'}</Text>
                <Switch
                  value={godMode?.withdrawals_enabled}
                  onValueChange={toggleWithdrawals}
                  trackColor={{ false: '#FF3B30', true: '#00D4AA' }}
                  thumbColor="#FFF"
                />
              </View>
            </View>

            {/* Global Payout Slider */}
            <View style={styles.controlCard}>
              <View style={styles.controlHeader}>
                <Ionicons name="cash" size={24} color="#00D4AA" />
                <Text style={styles.controlTitle}>GLOBAL PAYOUT</Text>
              </View>
              <Text style={styles.controlDesc}>Adjust payout percentage for all trades</Text>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderValue}>{payoutSlider}%</Text>
                <View style={styles.sliderRow}>
                  <TouchableOpacity 
                    style={styles.sliderBtn}
                    onPress={() => setPayoutSlider(Math.max(0, payoutSlider - 10))}
                  >
                    <Ionicons name="remove" size={20} color="#FFF" />
                  </TouchableOpacity>
                  <View style={styles.sliderTrack}>
                    <View style={[styles.sliderFill, { width: `${payoutSlider / 2}%` }]} />
                  </View>
                  <TouchableOpacity 
                    style={styles.sliderBtn}
                    onPress={() => setPayoutSlider(Math.min(200, payoutSlider + 10))}
                  >
                    <Ionicons name="add" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.applyBtn} onPress={updateGlobalPayout}>
                  <Text style={styles.applyBtnText}>APPLY</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Global Win Rate Slider */}
            <View style={styles.controlCard}>
              <View style={styles.controlHeader}>
                <Ionicons name="trophy" size={24} color="#FF9500" />
                <Text style={styles.controlTitle}>GLOBAL WIN RATE</Text>
              </View>
              <Text style={styles.controlDesc}>Adjust platform win probability</Text>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderValue}>{winRateSlider}%</Text>
                <View style={styles.sliderRow}>
                  <TouchableOpacity 
                    style={styles.sliderBtn}
                    onPress={() => setWinRateSlider(Math.max(0, winRateSlider - 10))}
                  >
                    <Ionicons name="remove" size={20} color="#FFF" />
                  </TouchableOpacity>
                  <View style={styles.sliderTrack}>
                    <View style={[styles.sliderFill, { width: `${winRateSlider / 2}%`, backgroundColor: '#FF9500' }]} />
                  </View>
                  <TouchableOpacity 
                    style={styles.sliderBtn}
                    onPress={() => setWinRateSlider(Math.min(200, winRateSlider + 10))}
                  >
                    <Ionicons name="add" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={[styles.applyBtn, { backgroundColor: '#FF9500' }]} onPress={updateGlobalWinRate}>
                  <Text style={styles.applyBtnText}>APPLY</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* TRADES TAB */}
        {activeTab === 'trades' && (
          <View style={styles.tradesContainer}>
            {/* Active Trades */}
            <Text style={styles.sectionTitle}>🔴 ACTIVE TRADES ({activeTrades.length})</Text>
            {activeTrades.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle" size={40} color="#00D4AA" />
                <Text style={styles.emptyText}>No active trades</Text>
              </View>
            ) : (
              activeTrades.map((trade) => (
                <TouchableOpacity 
                  key={trade.trade_id} 
                  style={styles.tradeCard}
                  onPress={() => {
                    setSelectedTrade(trade);
                    setShowTradeOverrideModal(true);
                  }}
                >
                  <View style={styles.tradeHeader}>
                    <Text style={styles.tradeAsset}>{trade.asset}</Text>
                    <View style={[styles.directionBadge, { backgroundColor: trade.direction === 'up' ? '#00D4AA' : '#FF3B30' }]}>
                      <Ionicons name={trade.direction === 'up' ? 'arrow-up' : 'arrow-down'} size={14} color="#FFF" />
                      <Text style={styles.directionText}>{trade.direction.toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={styles.tradeDetails}>
                    <Text style={styles.tradeAmount}>{formatCurrency(trade.amount)}</Text>
                    <Text style={styles.tradeUser}>{trade.user_email}</Text>
                    <Text style={styles.tradePayout}>Payout: {trade.payout_percentage}%</Text>
                  </View>
                  <View style={styles.tradeActions}>
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: '#00D4AA' }]}
                      onPress={() => overrideTrade(trade.trade_id, 'win')}
                    >
                      <Text style={styles.actionBtnText}>WIN</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: '#FF3B30' }]}
                      onPress={() => overrideTrade(trade.trade_id, 'lose')}
                    >
                      <Text style={styles.actionBtnText}>LOSE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: '#8898AA' }]}
                      onPress={() => cancelTrade(trade.trade_id)}
                    >
                      <Text style={styles.actionBtnText}>CANCEL</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}

            {/* Recent Trades */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>📊 RECENT TRADES</Text>
            {recentTrades.slice(0, 10).map((trade) => (
              <View key={trade.trade_id} style={styles.recentTradeRow}>
                <View style={styles.recentTradeInfo}>
                  <Text style={styles.recentAsset}>{trade.asset}</Text>
                  <Text style={styles.recentUser}>{trade.user_email?.split('@')[0]}</Text>
                </View>
                <Text style={styles.recentAmount}>{formatCurrency(trade.amount)}</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: trade.status === 'won' ? '#E8F5E9' : trade.status === 'lost' ? '#FFEBEE' : '#FFF3E0' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: trade.status === 'won' ? '#00D4AA' : trade.status === 'lost' ? '#FF3B30' : '#FF9500' }
                  ]}>
                    {trade.status.toUpperCase()}
                  </Text>
                </View>
                <Text style={[
                  styles.recentPL,
                  { color: trade.profit_loss >= 0 ? '#00D4AA' : '#FF3B30' }
                ]}>
                  {trade.profit_loss >= 0 ? '+' : ''}{formatCurrency(trade.profit_loss)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <View style={styles.usersContainer}>
            <View style={styles.searchContainer}>
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
              <TouchableOpacity 
                key={user.user_id} 
                style={styles.userCard}
                onPress={() => fetchUserRiskProfile(user.user_id)}
              >
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.name || user.email?.split('@')[0]}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
                <View style={styles.userBalances}>
                  <Text style={styles.userBalance}>{formatCurrency(user.real_balance)}</Text>
                  <Text style={styles.userBalanceLabel}>Real</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#8898AA" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* LOGS TAB */}
        {activeTab === 'logs' && (
          <View style={styles.logsContainer}>
            <Text style={styles.sectionTitle}>📋 ADMIN ACTIVITY LOG</Text>
            <View style={styles.logPlaceholder}>
              <Ionicons name="document-text" size={40} color="#8898AA" />
              <Text style={styles.logPlaceholderText}>Activity logs will appear here</Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* User Risk Modal */}
      <Modal visible={showUserRiskModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚠️ USER RISK CONTROL</Text>
              <TouchableOpacity onPress={() => setShowUserRiskModal(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            {selectedUserRisk && (
              <ScrollView style={styles.modalBody}>
                {/* User Info */}
                <View style={styles.riskSection}>
                  <Text style={styles.riskEmail}>{selectedUserRisk.email}</Text>
                  <View style={styles.riskScoreContainer}>
                    <Text style={styles.riskScoreLabel}>AI Risk Score</Text>
                    <View style={[
                      styles.riskScoreBadge,
                      { backgroundColor: selectedUserRisk.ai_risk_score > 70 ? '#FF3B30' : selectedUserRisk.ai_risk_score > 40 ? '#FF9500' : '#00D4AA' }
                    ]}>
                      <Text style={styles.riskScoreValue}>{selectedUserRisk.ai_risk_score}</Text>
                    </View>
                  </View>
                </View>

                {/* Stats */}
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{selectedUserRisk.trading_stats.total_trades}</Text>
                    <Text style={styles.statLabel}>Trades</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{selectedUserRisk.trading_stats.win_rate}%</Text>
                    <Text style={styles.statLabel}>Win Rate</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: selectedUserRisk.trading_stats.total_profit >= 0 ? '#00D4AA' : '#FF3B30' }]}>
                      {formatCurrency(selectedUserRisk.trading_stats.total_profit)}
                    </Text>
                    <Text style={styles.statLabel}>Profit</Text>
                  </View>
                </View>

                {/* Win Rate Control */}
                <View style={styles.controlSection}>
                  <Text style={styles.controlLabel}>User Win Rate Modifier</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.controlInput}
                      value={userWinRate}
                      onChangeText={setUserWinRate}
                      keyboardType="numeric"
                    />
                    <Text style={styles.inputSuffix}>%</Text>
                    <TouchableOpacity style={styles.smallApplyBtn} onPress={updateUserWinRate}>
                      <Text style={styles.smallApplyText}>SET</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Payout Control */}
                <View style={styles.controlSection}>
                  <Text style={styles.controlLabel}>User Payout Modifier</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.controlInput}
                      value={userPayout}
                      onChangeText={setUserPayout}
                      keyboardType="numeric"
                    />
                    <Text style={styles.inputSuffix}>%</Text>
                    <TouchableOpacity style={styles.smallApplyBtn} onPress={updateUserPayout}>
                      <Text style={styles.smallApplyText}>SET</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Shadow Ban */}
                <View style={styles.controlSection}>
                  <Text style={styles.controlLabel}>Shadow Ban</Text>
                  <Text style={styles.controlDesc}>User won't know they're banned</Text>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>
                      {selectedUserRisk.risk_controls.is_shadow_banned ? 'BANNED' : 'NORMAL'}
                    </Text>
                    <Switch
                      value={selectedUserRisk.risk_controls.is_shadow_banned}
                      onValueChange={toggleShadowBan}
                      trackColor={{ false: '#00D4AA', true: '#FF3B30' }}
                      thumbColor="#FFF"
                    />
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D1117',
  },
  loadingText: {
    marginTop: 12,
    color: '#8898AA',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: '#161B22',
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF3B30',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8898AA',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
    marginRight: 4,
  },
  liveText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  liveStatsBar: {
    flexDirection: 'row',
    backgroundColor: '#161B22',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
  },
  liveStat: {
    flex: 1,
    alignItems: 'center',
  },
  liveStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  liveStatLabel: {
    fontSize: 10,
    color: '#8898AA',
    marginTop: 2,
  },
  tabScrollContainer: {
    backgroundColor: '#161B22',
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#21262D',
  },
  tabActive: {
    backgroundColor: '#FF3B30',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8898AA',
    marginLeft: 6,
  },
  tabTextActive: {
    color: '#FFF',
  },
  content: {
    flex: 1,
  },
  godModeContainer: {
    padding: 16,
  },
  controlCard: {
    backgroundColor: '#161B22',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  controlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  controlTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 8,
  },
  controlDesc: {
    fontSize: 12,
    color: '#8898AA',
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  sliderContainer: {
    alignItems: 'center',
  },
  sliderValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 16,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  sliderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#30363D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#30363D',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#00D4AA',
    borderRadius: 4,
  },
  applyBtn: {
    backgroundColor: '#00D4AA',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 16,
  },
  applyBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  tradesContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#161B22',
    borderRadius: 12,
  },
  emptyText: {
    color: '#8898AA',
    marginTop: 8,
  },
  tradeCard: {
    backgroundColor: '#161B22',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tradeAsset: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  directionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  directionText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  tradeDetails: {
    marginBottom: 12,
  },
  tradeAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
  },
  tradeUser: {
    fontSize: 12,
    color: '#8898AA',
    marginTop: 4,
  },
  tradePayout: {
    fontSize: 12,
    color: '#00D4AA',
    marginTop: 2,
  },
  tradeActions: {
    flexDirection: 'row',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  recentTradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B22',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  recentTradeInfo: {
    flex: 1,
  },
  recentAsset: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  recentUser: {
    fontSize: 11,
    color: '#8898AA',
  },
  recentAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  recentPL: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 60,
    textAlign: 'right',
  },
  usersContainer: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B22',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#FFF',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B22',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  userEmail: {
    fontSize: 12,
    color: '#8898AA',
    marginTop: 2,
  },
  userBalances: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  userBalance: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00D4AA',
  },
  userBalanceLabel: {
    fontSize: 10,
    color: '#8898AA',
  },
  logsContainer: {
    padding: 16,
  },
  logPlaceholder: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#161B22',
    borderRadius: 12,
  },
  logPlaceholderText: {
    color: '#8898AA',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#161B22',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF3B30',
  },
  modalBody: {
    padding: 20,
  },
  riskSection: {
    marginBottom: 20,
  },
  riskEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 12,
  },
  riskScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  riskScoreLabel: {
    fontSize: 14,
    color: '#8898AA',
  },
  riskScoreBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  riskScoreValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: '#21262D',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#8898AA',
    marginTop: 4,
  },
  controlSection: {
    marginBottom: 20,
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlInput: {
    flex: 1,
    backgroundColor: '#21262D',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#30363D',
  },
  inputSuffix: {
    fontSize: 16,
    color: '#8898AA',
    marginLeft: 8,
    marginRight: 12,
  },
  smallApplyBtn: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  smallApplyText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
