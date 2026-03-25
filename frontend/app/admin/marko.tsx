import React, { useState, useEffect } from 'react';
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

interface User {
  user_id: string;
  email: string;
  name: string;
  account_id: string;
  real_balance: number;
  demo_balance: number;
  bonus_balance: number;
  is_verified: boolean;
  is_admin: boolean;
  created_at: string;
  country?: string;
  country_flag?: string;
}

interface Trade {
  trade_id: string;
  user_id: string;
  asset: string;
  amount: number;
  direction: string;
  status: string;
  profit_loss: number;
  created_at: string;
}

interface Deposit {
  _id: string;
  user_id: string;
  amount_usd: number;
  status: string;
  payment_type: string;
  created_at: string;
}

interface Withdrawal {
  withdrawal_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  amount: number;
  method: string;
  wallet_address: string;
  status: string;
  created_at: string;
}

interface Asset {
  asset_id: string;
  symbol: string;
  name: string;
  category: string;
  payout_percentage: number;
  is_active: boolean;
  is_otc: boolean;
  min_amount: number;
  max_amount: number;
}

interface Stats {
  total_users: number;
  total_trades: number;
  total_volume: number;
  total_deposits: number;
  total_withdrawals: number;
  active_users_today: number;
  pending_withdrawals: number;
  pending_deposits: number;
}

interface Analytics {
  period: string;
  labels: string[];
  deposits: { data: number[]; total: number };
  withdrawals: { data: number[]; total: number };
  profit_loss: { data: number[]; total: number };
  summary: {
    net_revenue: number;
    total_deposits: number;
    total_withdrawals: number;
    platform_profit: number;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const { token } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'week' | 'month' | 'year'>('week');
  
  // Data states
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showManualDepositModal, setShowManualDepositModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  
  // Form states
  const [manualDeposit, setManualDeposit] = useState({ userId: '', amount: '', balanceType: 'real', note: '' });
  const [newAsset, setNewAsset] = useState({ symbol: '', name: '', category: 'forex', payout: '80', isOtc: false, minAmount: '1', maxAmount: '10000' });

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchAnalytics();
    }
  }, [analyticsPeriod]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchAnalytics(),
      fetchUsers(),
      fetchRecentTrades(),
      fetchDeposits(),
      fetchWithdrawals(),
      fetchAssets(),
    ]);
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/analytics?period=${analyticsPeriod}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchUsers = async () => {
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
  };

  const fetchRecentTrades = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/trades?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTrades(data.trades || []);
      }
    } catch (error) {
      console.error('Error fetching trades:', error);
    }
  };

  const fetchDeposits = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/deposits`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDeposits(data.deposits || []);
      }
    } catch (error) {
      console.error('Error fetching deposits:', error);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/withdrawals`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data.withdrawals || []);
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    }
  };

  const fetchAssets = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/assets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || []);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  const handleManualDeposit = async () => {
    if (!manualDeposit.userId || !manualDeposit.amount) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/admin/manual-deposit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: manualDeposit.userId,
          amount: parseFloat(manualDeposit.amount),
          balance_type: manualDeposit.balanceType,
          note: manualDeposit.note || 'Manual deposit by admin'
        })
      });
      
      if (response.ok) {
        Alert.alert('Success', `Added $${manualDeposit.amount} to user account`);
        setShowManualDepositModal(false);
        setManualDeposit({ userId: '', amount: '', balanceType: 'real', note: '' });
        fetchUsers();
        fetchDeposits();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to add deposit');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    }
  };

  const handleCreateAsset = async () => {
    if (!newAsset.symbol) {
      Alert.alert('Error', 'Symbol is required');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/admin/assets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol: newAsset.symbol.toUpperCase(),
          name: newAsset.name || newAsset.symbol,
          category: newAsset.category,
          payout_percentage: parseFloat(newAsset.payout),
          is_otc: newAsset.isOtc,
          min_amount: parseFloat(newAsset.minAmount),
          max_amount: parseFloat(newAsset.maxAmount)
        })
      });
      
      if (response.ok) {
        Alert.alert('Success', 'Asset created successfully');
        setShowAssetModal(false);
        setNewAsset({ symbol: '', name: '', category: 'forex', payout: '80', isOtc: false, minAmount: '1', maxAmount: '10000' });
        fetchAssets();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to create asset');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    }
  };

  const handleToggleAsset = async (assetId: string) => {
    try {
      const response = await fetch(`${API_URL}/admin/assets/${assetId}/toggle`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        fetchAssets();
      }
    } catch (error) {
      console.error('Error toggling asset:', error);
    }
  };

  const handleWithdrawalAction = async (withdrawalId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`${API_URL}/admin/withdrawals/${withdrawalId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'Admin action' })
      });
      
      if (response.ok) {
        Alert.alert('Success', `Withdrawal ${action}ed`);
        fetchWithdrawals();
        fetchUsers();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || `Failed to ${action} withdrawal`);
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.account_id?.includes(searchQuery) ||
    u.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Simple Bar Chart Component
  const SimpleBarChart = ({ data, labels, color, title }: { data: number[]; labels: string[]; color: string; title: string }) => {
    const maxValue = Math.max(...data, 1);
    const chartWidth = SCREEN_WIDTH - 80;
    const barWidth = Math.min(30, (chartWidth - 20) / Math.max(data.length, 1));
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <View style={styles.chartBars}>
          {data.length > 0 ? data.map((value, index) => (
            <View key={index} style={styles.barContainer}>
              <View style={[styles.bar, { 
                height: Math.max((value / maxValue) * 80, 4),
                backgroundColor: color,
                width: barWidth
              }]} />
              <Text style={styles.barLabel}>{labels[index] || ''}</Text>
            </View>
          )) : (
            <Text style={styles.noDataText}>No data available</Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#635BFF" />
        <Text style={styles.loadingText}>Loading Admin Dashboard...</Text>
      </View>
    );
  }

  const tabs = ['overview', 'users', 'trades', 'withdrawals', 'assets'];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1A1F36" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={20} color="#635BFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScrollContainer}>
        <View style={styles.tabContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <View style={styles.overviewContainer}>
            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={styles.actionBtn}
                onPress={() => setShowManualDepositModal(true)}
              >
                <Ionicons name="add-circle" size={20} color="#FFF" />
                <Text style={styles.actionBtnText}>Manual Deposit</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: '#00D4AA' }]}
                onPress={() => { setEditingAsset(null); setShowAssetModal(true); }}
              >
                <Ionicons name="cube" size={20} color="#FFF" />
                <Text style={styles.actionBtnText}>New Asset</Text>
              </TouchableOpacity>
            </View>

            {/* Period Selector */}
            <View style={styles.periodSelector}>
              {(['week', 'month', 'year'] as const).map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[styles.periodBtn, analyticsPeriod === period && styles.periodBtnActive]}
                  onPress={() => setAnalyticsPeriod(period)}
                >
                  <Text style={[styles.periodBtnText, analyticsPeriod === period && styles.periodBtnTextActive]}>
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Summary Cards */}
            {analytics && (
              <View style={styles.summaryCards}>
                <View style={[styles.summaryCard, { borderLeftColor: '#4CAF50' }]}>
                  <Text style={styles.summaryLabel}>Total Deposits</Text>
                  <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                    {formatCurrency(analytics.summary.total_deposits)}
                  </Text>
                </View>
                <View style={[styles.summaryCard, { borderLeftColor: '#F44336' }]}>
                  <Text style={styles.summaryLabel}>Total Withdrawals</Text>
                  <Text style={[styles.summaryValue, { color: '#F44336' }]}>
                    {formatCurrency(analytics.summary.total_withdrawals)}
                  </Text>
                </View>
                <View style={[styles.summaryCard, { borderLeftColor: '#635BFF' }]}>
                  <Text style={styles.summaryLabel}>Net Revenue</Text>
                  <Text style={[styles.summaryValue, { color: '#635BFF' }]}>
                    {formatCurrency(analytics.summary.net_revenue)}
                  </Text>
                </View>
                <View style={[styles.summaryCard, { borderLeftColor: '#FF9800' }]}>
                  <Text style={styles.summaryLabel}>Platform P/L</Text>
                  <Text style={[styles.summaryValue, { color: analytics.summary.platform_profit >= 0 ? '#4CAF50' : '#F44336' }]}>
                    {formatCurrency(analytics.summary.platform_profit)}
                  </Text>
                </View>
              </View>
            )}

            {/* Charts */}
            {analytics && (
              <View style={styles.chartsSection}>
                <SimpleBarChart
                  data={analytics.deposits.data}
                  labels={analytics.labels}
                  color="#4CAF50"
                  title="Deposits"
                />
                <SimpleBarChart
                  data={analytics.withdrawals.data}
                  labels={analytics.labels}
                  color="#F44336"
                  title="Withdrawals"
                />
                <SimpleBarChart
                  data={analytics.profit_loss.data}
                  labels={analytics.labels}
                  color="#635BFF"
                  title="Platform Profit/Loss"
                />
              </View>
            )}

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, styles.statCardPrimary]}>
                <Ionicons name="people" size={24} color="#635BFF" />
                <Text style={styles.statValue}>{stats?.total_users || 0}</Text>
                <Text style={styles.statLabel}>Total Users</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="trending-up" size={24} color="#00D4AA" />
                <Text style={styles.statValue}>{stats?.total_trades || 0}</Text>
                <Text style={styles.statLabel}>Total Trades</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="time" size={24} color="#FF9800" />
                <Text style={styles.statValue}>{stats?.pending_withdrawals || 0}</Text>
                <Text style={styles.statLabel}>Pending W/D</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="flash" size={24} color="#2196F3" />
                <Text style={styles.statValue}>{stats?.active_users_today || 0}</Text>
                <Text style={styles.statLabel}>Active Today</Text>
              </View>
            </View>
          </View>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <View style={styles.usersContainer}>
            {/* Search */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#8898AA" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by email, name, or ID..."
                placeholderTextColor="#8898AA"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Add Manual Deposit Button */}
            <TouchableOpacity 
              style={styles.addDepositBtn}
              onPress={() => setShowManualDepositModal(true)}
            >
              <Ionicons name="add-circle" size={20} color="#FFF" />
              <Text style={styles.addDepositBtnText}>Add Manual Deposit</Text>
            </TouchableOpacity>

            {/* Users List */}
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>User</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Balance</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Status</Text>
              </View>
              {filteredUsers.map((user, index) => (
                <TouchableOpacity
                  key={user.user_id || index}
                  style={styles.tableRow}
                  onPress={() => {
                    setSelectedUser(user);
                    setManualDeposit(prev => ({ ...prev, userId: user.user_id }));
                    setShowUserModal(true);
                  }}
                >
                  <View style={[styles.tableCell, { flex: 2 }]}>
                    <Text style={styles.userName}>{user.name || 'No Name'}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    <Text style={styles.userId}>ID: {user.account_id}</Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 1 }]}>
                    <Text style={styles.balanceReal}>{formatCurrency(user.real_balance)}</Text>
                    <Text style={styles.balanceDemo}>Demo: {formatCurrency(user.demo_balance)}</Text>
                    <Text style={styles.balanceBonus}>Bonus: {formatCurrency(user.bonus_balance)}</Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 1 }]}>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: user.is_verified ? '#E8F5E9' : '#FFF3E0' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: user.is_verified ? '#4CAF50' : '#FF9800' }
                      ]}>
                        {user.is_verified ? 'Verified' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Trades Tab */}
        {activeTab === 'trades' && (
          <View style={styles.tradesContainer}>
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Asset</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Amount</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Result</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>P/L</Text>
              </View>
              {trades.map((trade, index) => (
                <View key={trade.trade_id || index} style={styles.tableRow}>
                  <View style={[styles.tableCell, { flex: 1.5 }]}>
                    <Text style={styles.tradeAsset}>{trade.asset}</Text>
                    <Text style={styles.tradeDirection}>
                      {trade.direction === 'up' ? '📈 UP' : '📉 DOWN'}
                    </Text>
                  </View>
                  <Text style={[styles.tableCell, { flex: 1 }]}>
                    {formatCurrency(trade.amount)}
                  </Text>
                  <View style={[styles.tableCell, { flex: 1 }]}>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: trade.status === 'won' ? '#E8F5E9' : trade.status === 'lost' ? '#FFEBEE' : '#FFF3E0' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: trade.status === 'won' ? '#4CAF50' : trade.status === 'lost' ? '#F44336' : '#FF9800' }
                      ]}>
                        {trade.status?.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={[
                    styles.tableCell,
                    { flex: 1, color: trade.profit_loss >= 0 ? '#4CAF50' : '#F44336', fontWeight: '600' }
                  ]}>
                    {trade.profit_loss >= 0 ? '+' : ''}{formatCurrency(trade.profit_loss)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Withdrawals Tab */}
        {activeTab === 'withdrawals' && (
          <View style={styles.withdrawalsContainer}>
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>User</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Amount</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Status</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Action</Text>
              </View>
              {withdrawals.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="wallet-outline" size={40} color="#8898AA" />
                  <Text style={styles.emptyStateText}>No withdrawal requests</Text>
                </View>
              ) : (
                withdrawals.map((withdrawal, index) => (
                  <View key={withdrawal.withdrawal_id || index} style={styles.tableRow}>
                    <View style={[styles.tableCell, { flex: 1.5 }]}>
                      <Text style={styles.userName}>{withdrawal.user_name}</Text>
                      <Text style={styles.userEmail}>{withdrawal.user_email}</Text>
                      <Text style={styles.walletAddress} numberOfLines={1}>
                        {withdrawal.wallet_address?.slice(0, 15)}...
                      </Text>
                    </View>
                    <Text style={[styles.tableCell, { flex: 1, fontWeight: '600', color: '#1A1F36' }]}>
                      {formatCurrency(withdrawal.amount)}
                    </Text>
                    <View style={[styles.tableCell, { flex: 1 }]}>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: withdrawal.status === 'completed' ? '#E8F5E9' : withdrawal.status === 'rejected' ? '#FFEBEE' : '#FFF3E0' }
                      ]}>
                        <Text style={[
                          styles.statusText,
                          { color: withdrawal.status === 'completed' ? '#4CAF50' : withdrawal.status === 'rejected' ? '#F44336' : '#FF9800' }
                        ]}>
                          {withdrawal.status}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.tableCell, { flex: 1 }]}>
                      {withdrawal.status === 'pending' && (
                        <View style={styles.actionBtns}>
                          <TouchableOpacity 
                            style={styles.approveBtn}
                            onPress={() => handleWithdrawalAction(withdrawal.withdrawal_id, 'approve')}
                          >
                            <Ionicons name="checkmark" size={16} color="#FFF" />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.rejectBtn}
                            onPress={() => handleWithdrawalAction(withdrawal.withdrawal_id, 'reject')}
                          >
                            <Ionicons name="close" size={16} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* Assets Tab */}
        {activeTab === 'assets' && (
          <View style={styles.assetsContainer}>
            <TouchableOpacity 
              style={styles.addAssetBtn}
              onPress={() => { setEditingAsset(null); setShowAssetModal(true); }}
            >
              <Ionicons name="add-circle" size={20} color="#FFF" />
              <Text style={styles.addAssetBtnText}>Create New Asset</Text>
            </TouchableOpacity>

            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Asset</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Payout</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Type</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Status</Text>
              </View>
              {assets.map((asset, index) => (
                <View key={asset.asset_id || index} style={styles.tableRow}>
                  <View style={[styles.tableCell, { flex: 1.5 }]}>
                    <Text style={styles.assetSymbol}>{asset.symbol}</Text>
                    <Text style={styles.assetName}>{asset.name}</Text>
                    <Text style={styles.assetCategory}>{asset.category}</Text>
                  </View>
                  <Text style={[styles.tableCell, { flex: 1, fontWeight: '600', color: '#635BFF' }]}>
                    {asset.payout_percentage}%
                  </Text>
                  <View style={[styles.tableCell, { flex: 1 }]}>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: asset.is_otc ? '#E3F2FD' : '#F3E5F5' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: asset.is_otc ? '#2196F3' : '#9C27B0' }
                      ]}>
                        {asset.is_otc ? 'OTC' : 'Regular'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.tableCell, { flex: 1, alignItems: 'center' }]}>
                    <Switch
                      value={asset.is_active}
                      onValueChange={() => handleToggleAsset(asset.asset_id)}
                      trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
                      thumbColor={asset.is_active ? '#4CAF50' : '#9E9E9E'}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Manual Deposit Modal */}
      <Modal visible={showManualDepositModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manual Deposit</Text>
              <TouchableOpacity onPress={() => setShowManualDepositModal(false)}>
                <Ionicons name="close" size={24} color="#1A1F36" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>User ID *</Text>
              <TextInput
                style={styles.textInput}
                value={manualDeposit.userId}
                onChangeText={(text) => setManualDeposit(prev => ({ ...prev, userId: text }))}
                placeholder="Enter user ID"
                placeholderTextColor="#8898AA"
              />
              
              <Text style={styles.inputLabel}>Amount *</Text>
              <View style={styles.amountInputRow}>
                <Text style={styles.currencyPrefix}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={manualDeposit.amount}
                  onChangeText={(text) => setManualDeposit(prev => ({ ...prev, amount: text }))}
                  placeholder="0.00"
                  keyboardType="numeric"
                  placeholderTextColor="#8898AA"
                />
              </View>
              
              <Text style={styles.inputLabel}>Balance Type</Text>
              <View style={styles.balanceTypeRow}>
                {['real', 'demo', 'bonus'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.balanceTypeBtn, manualDeposit.balanceType === type && styles.balanceTypeBtnActive]}
                    onPress={() => setManualDeposit(prev => ({ ...prev, balanceType: type }))}
                  >
                    <Text style={[styles.balanceTypeBtnText, manualDeposit.balanceType === type && styles.balanceTypeBtnTextActive]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.inputLabel}>Note</Text>
              <TextInput
                style={[styles.textInput, { height: 80 }]}
                value={manualDeposit.note}
                onChangeText={(text) => setManualDeposit(prev => ({ ...prev, note: text }))}
                placeholder="Reason for deposit..."
                placeholderTextColor="#8898AA"
                multiline
              />
              
              <TouchableOpacity style={styles.submitBtn} onPress={handleManualDeposit}>
                <Text style={styles.submitBtnText}>Add Deposit</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Asset Modal */}
      <Modal visible={showAssetModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingAsset ? 'Edit Asset' : 'Create Asset'}</Text>
              <TouchableOpacity onPress={() => setShowAssetModal(false)}>
                <Ionicons name="close" size={24} color="#1A1F36" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Symbol *</Text>
              <TextInput
                style={styles.textInput}
                value={newAsset.symbol}
                onChangeText={(text) => setNewAsset(prev => ({ ...prev, symbol: text.toUpperCase() }))}
                placeholder="e.g., BTC/USD"
                placeholderTextColor="#8898AA"
                autoCapitalize="characters"
              />
              
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.textInput}
                value={newAsset.name}
                onChangeText={(text) => setNewAsset(prev => ({ ...prev, name: text }))}
                placeholder="e.g., Bitcoin"
                placeholderTextColor="#8898AA"
              />
              
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryRow}>
                {['forex', 'crypto', 'stocks', 'otc'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryBtn, newAsset.category === cat && styles.categoryBtnActive]}
                    onPress={() => setNewAsset(prev => ({ ...prev, category: cat, isOtc: cat === 'otc' }))}
                  >
                    <Text style={[styles.categoryBtnText, newAsset.category === cat && styles.categoryBtnTextActive]}>
                      {cat.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.inputLabel}>Payout Percentage</Text>
              <View style={styles.amountInputRow}>
                <TextInput
                  style={styles.amountInput}
                  value={newAsset.payout}
                  onChangeText={(text) => setNewAsset(prev => ({ ...prev, payout: text }))}
                  placeholder="80"
                  keyboardType="numeric"
                  placeholderTextColor="#8898AA"
                />
                <Text style={styles.currencySuffix}>%</Text>
              </View>
              
              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Min Amount</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newAsset.minAmount}
                    onChangeText={(text) => setNewAsset(prev => ({ ...prev, minAmount: text }))}
                    placeholder="1"
                    keyboardType="numeric"
                    placeholderTextColor="#8898AA"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Max Amount</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newAsset.maxAmount}
                    onChangeText={(text) => setNewAsset(prev => ({ ...prev, maxAmount: text }))}
                    placeholder="10000"
                    keyboardType="numeric"
                    placeholderTextColor="#8898AA"
                  />
                </View>
              </View>
              
              <View style={styles.otcToggleRow}>
                <Text style={styles.inputLabel}>OTC Asset</Text>
                <Switch
                  value={newAsset.isOtc}
                  onValueChange={(value) => setNewAsset(prev => ({ ...prev, isOtc: value }))}
                  trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
                  thumbColor={newAsset.isOtc ? '#4CAF50' : '#9E9E9E'}
                />
              </View>
              
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateAsset}>
                <Text style={styles.submitBtnText}>{editingAsset ? 'Update Asset' : 'Create Asset'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* User Detail Modal */}
      <Modal visible={showUserModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Details</Text>
              <TouchableOpacity onPress={() => setShowUserModal(false)}>
                <Ionicons name="close" size={24} color="#1A1F36" />
              </TouchableOpacity>
            </View>
            {selectedUser && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.userDetailCard}>
                  <View style={styles.userDetailRow}>
                    <Text style={styles.userDetailLabel}>Email</Text>
                    <Text style={styles.userDetailValue}>{selectedUser.email}</Text>
                  </View>
                  <View style={styles.userDetailRow}>
                    <Text style={styles.userDetailLabel}>Account ID</Text>
                    <Text style={styles.userDetailValue}>{selectedUser.account_id}</Text>
                  </View>
                  <View style={styles.userDetailRow}>
                    <Text style={styles.userDetailLabel}>User ID</Text>
                    <Text style={styles.userDetailValue} selectable>{selectedUser.user_id}</Text>
                  </View>
                </View>
                
                <View style={styles.balanceSection}>
                  <Text style={styles.sectionTitle}>Balances</Text>
                  <View style={styles.balanceCards}>
                    <View style={[styles.balanceCard, { backgroundColor: '#E8F5E9' }]}>
                      <Text style={styles.balanceCardLabel}>Real</Text>
                      <Text style={[styles.balanceCardValue, { color: '#4CAF50' }]}>
                        {formatCurrency(selectedUser.real_balance)}
                      </Text>
                    </View>
                    <View style={[styles.balanceCard, { backgroundColor: '#E3F2FD' }]}>
                      <Text style={styles.balanceCardLabel}>Demo</Text>
                      <Text style={[styles.balanceCardValue, { color: '#2196F3' }]}>
                        {formatCurrency(selectedUser.demo_balance)}
                      </Text>
                    </View>
                    <View style={[styles.balanceCard, { backgroundColor: '#FFF3E0' }]}>
                      <Text style={styles.balanceCardLabel}>Bonus</Text>
                      <Text style={[styles.balanceCardValue, { color: '#FF9800' }]}>
                        {formatCurrency(selectedUser.bonus_balance)}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.addDepositToUserBtn}
                  onPress={() => {
                    setShowUserModal(false);
                    setManualDeposit(prev => ({ ...prev, userId: selectedUser.user_id }));
                    setShowManualDepositModal(true);
                  }}
                >
                  <Ionicons name="add-circle" size={20} color="#FFF" />
                  <Text style={styles.addDepositToUserBtnText}>Add Manual Deposit</Text>
                </TouchableOpacity>
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
    backgroundColor: '#F6F9FC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F9FC',
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E6EBF1',
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
    color: '#1A1F36',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshBtn: {
    padding: 8,
  },
  tabScrollContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E6EBF1',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: '#635BFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8898AA',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  overviewContainer: {
    padding: 16,
  },
  quickActions: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#635BFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  actionBtnText: {
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 6,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  periodBtnActive: {
    backgroundColor: '#635BFF',
  },
  periodBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8898AA',
  },
  periodBtnTextActive: {
    color: '#FFFFFF',
  },
  summaryCards: {
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#8898AA',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  chartsSection: {
    marginBottom: 16,
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1F36',
    marginBottom: 12,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 100,
  },
  barContainer: {
    alignItems: 'center',
  },
  bar: {
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#8898AA',
    marginTop: 4,
  },
  noDataText: {
    color: '#8898AA',
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardPrimary: {
    borderLeftWidth: 4,
    borderLeftColor: '#635BFF',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1F36',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#8898AA',
    marginTop: 4,
  },
  usersContainer: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E6EBF1',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#1A1F36',
  },
  addDepositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#635BFF',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  addDepositBtnText: {
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 6,
  },
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F6F9FC',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EBF1',
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8898AA',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F3F7',
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 14,
    color: '#1A1F36',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1F36',
  },
  userEmail: {
    fontSize: 12,
    color: '#8898AA',
    marginTop: 2,
  },
  userId: {
    fontSize: 11,
    color: '#A3ACB9',
    marginTop: 2,
  },
  balanceReal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1F36',
  },
  balanceDemo: {
    fontSize: 11,
    color: '#8898AA',
    marginTop: 2,
  },
  balanceBonus: {
    fontSize: 11,
    color: '#FF9800',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tradesContainer: {
    padding: 16,
  },
  tradeAsset: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1F36',
  },
  tradeDirection: {
    fontSize: 12,
    color: '#8898AA',
    marginTop: 2,
  },
  withdrawalsContainer: {
    padding: 16,
  },
  walletAddress: {
    fontSize: 10,
    color: '#A3ACB9',
    marginTop: 2,
  },
  actionBtns: {
    flexDirection: 'row',
  },
  approveBtn: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  rejectBtn: {
    backgroundColor: '#F44336',
    padding: 8,
    borderRadius: 4,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#8898AA',
    marginTop: 8,
  },
  assetsContainer: {
    padding: 16,
  },
  addAssetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00D4AA',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  addAssetBtnText: {
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 6,
  },
  assetSymbol: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1F36',
  },
  assetName: {
    fontSize: 12,
    color: '#8898AA',
    marginTop: 2,
  },
  assetCategory: {
    fontSize: 11,
    color: '#A3ACB9',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EBF1',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1F36',
  },
  modalBody: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1F36',
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E6EBF1',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1A1F36',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6EBF1',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencyPrefix: {
    fontSize: 16,
    color: '#8898AA',
    marginRight: 4,
  },
  currencySuffix: {
    fontSize: 16,
    color: '#8898AA',
    marginLeft: 4,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A1F36',
  },
  balanceTypeRow: {
    flexDirection: 'row',
  },
  balanceTypeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F6F9FC',
    marginRight: 8,
  },
  balanceTypeBtnActive: {
    backgroundColor: '#635BFF',
  },
  balanceTypeBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8898AA',
  },
  balanceTypeBtnTextActive: {
    color: '#FFFFFF',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F6F9FC',
    marginRight: 8,
    marginBottom: 8,
  },
  categoryBtnActive: {
    backgroundColor: '#635BFF',
  },
  categoryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8898AA',
  },
  categoryBtnTextActive: {
    color: '#FFFFFF',
  },
  rowInputs: {
    flexDirection: 'row',
  },
  otcToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E6EBF1',
  },
  submitBtn: {
    backgroundColor: '#635BFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  userDetailCard: {
    backgroundColor: '#F6F9FC',
    borderRadius: 8,
    padding: 16,
  },
  userDetailRow: {
    marginBottom: 12,
  },
  userDetailLabel: {
    fontSize: 12,
    color: '#8898AA',
    marginBottom: 4,
  },
  userDetailValue: {
    fontSize: 14,
    color: '#1A1F36',
    fontWeight: '500',
  },
  balanceSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1F36',
    marginBottom: 12,
  },
  balanceCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  balanceCardLabel: {
    fontSize: 12,
    color: '#8898AA',
  },
  balanceCardValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  addDepositToUserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#635BFF',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 20,
  },
  addDepositToUserBtnText: {
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 6,
  },
});
