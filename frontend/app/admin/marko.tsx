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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';

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

export default function AdminDashboard() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editBalance, setEditBalance] = useState('');
  const [editBalanceType, setEditBalanceType] = useState<'real' | 'demo' | 'bonus'>('real');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchUsers(),
      fetchRecentTrades(),
      fetchDeposits(),
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

  const updateUserBalance = async () => {
    if (!selectedUser || !editBalance) return;
    
    try {
      const response = await fetch(`${API_URL}/admin/users/${selectedUser.user_id}/balance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          balance_type: editBalanceType,
          amount: parseFloat(editBalance)
        })
      });
      
      if (response.ok) {
        Alert.alert('Success', 'Balance updated successfully');
        setShowUserModal(false);
        fetchUsers();
      } else {
        Alert.alert('Error', 'Failed to update balance');
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#635BFF" />
        <Text style={styles.loadingText}>Loading Admin Dashboard...</Text>
      </View>
    );
  }

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
      <View style={styles.tabContainer}>
        {['overview', 'users', 'trades', 'deposits'].map((tab) => (
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

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <View style={styles.overviewContainer}>
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
                <Ionicons name="cash" size={24} color="#FF6B6B" />
                <Text style={styles.statValue}>{formatCurrency(stats?.total_volume || 0)}</Text>
                <Text style={styles.statLabel}>Total Volume</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="download" size={24} color="#4CAF50" />
                <Text style={styles.statValue}>{formatCurrency(stats?.total_deposits || 0)}</Text>
                <Text style={styles.statLabel}>Total Deposits</Text>
              </View>
            </View>

            {/* Pending Actions */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Pending Actions</Text>
              <View style={styles.pendingRow}>
                <View style={styles.pendingItem}>
                  <View style={[styles.pendingBadge, { backgroundColor: '#FFF3E0' }]}>
                    <Text style={[styles.pendingCount, { color: '#FF9800' }]}>
                      {stats?.pending_withdrawals || 0}
                    </Text>
                  </View>
                  <Text style={styles.pendingLabel}>Pending Withdrawals</Text>
                </View>
                <View style={styles.pendingItem}>
                  <View style={[styles.pendingBadge, { backgroundColor: '#E3F2FD' }]}>
                    <Text style={[styles.pendingCount, { color: '#2196F3' }]}>
                      {stats?.pending_deposits || 0}
                    </Text>
                  </View>
                  <Text style={styles.pendingLabel}>Pending Deposits</Text>
                </View>
              </View>
            </View>

            {/* Recent Activity */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Recent Trades</Text>
              {trades.slice(0, 5).map((trade, index) => (
                <View key={trade.trade_id || index} style={styles.activityItem}>
                  <View style={[
                    styles.activityIcon,
                    { backgroundColor: trade.status === 'won' ? '#E8F5E9' : '#FFEBEE' }
                  ]}>
                    <Ionicons 
                      name={trade.direction === 'up' ? 'arrow-up' : 'arrow-down'} 
                      size={16} 
                      color={trade.status === 'won' ? '#4CAF50' : '#F44336'} 
                    />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle}>{trade.asset}</Text>
                    <Text style={styles.activitySubtitle}>
                      {formatCurrency(trade.amount)} • {trade.status}
                    </Text>
                  </View>
                  <Text style={[
                    styles.activityAmount,
                    { color: trade.profit_loss >= 0 ? '#4CAF50' : '#F44336' }
                  ]}>
                    {trade.profit_loss >= 0 ? '+' : ''}{formatCurrency(trade.profit_loss)}
                  </Text>
                </View>
              ))}
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
                    setEditBalance(user.real_balance?.toString() || '0');
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

        {/* Deposits Tab */}
        {activeTab === 'deposits' && (
          <View style={styles.depositsContainer}>
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>User</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Amount</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Type</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Status</Text>
              </View>
              {deposits.map((deposit, index) => (
                <View key={deposit._id || index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 1.5 }]} numberOfLines={1}>
                    {deposit.user_id?.slice(0, 15)}...
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1, fontWeight: '600' }]}>
                    {formatCurrency(deposit.amount_usd)}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>
                    {deposit.payment_type || 'crypto'}
                  </Text>
                  <View style={[styles.tableCell, { flex: 1 }]}>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: deposit.status === 'completed' ? '#E8F5E9' : '#FFF3E0' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: deposit.status === 'completed' ? '#4CAF50' : '#FF9800' }
                      ]}>
                        {deposit.status}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* User Edit Modal */}
      <Modal visible={showUserModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit User</Text>
              <TouchableOpacity onPress={() => setShowUserModal(false)}>
                <Ionicons name="close" size={24} color="#1A1F36" />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.userInfoSection}>
                  <Text style={styles.userInfoLabel}>Email</Text>
                  <Text style={styles.userInfoValue}>{selectedUser.email}</Text>
                </View>
                <View style={styles.userInfoSection}>
                  <Text style={styles.userInfoLabel}>Account ID</Text>
                  <Text style={styles.userInfoValue}>{selectedUser.account_id}</Text>
                </View>
                <View style={styles.userInfoSection}>
                  <Text style={styles.userInfoLabel}>Current Balances</Text>
                  <Text style={styles.userInfoValue}>
                    Real: {formatCurrency(selectedUser.real_balance)}{'\n'}
                    Demo: {formatCurrency(selectedUser.demo_balance)}{'\n'}
                    Bonus: {formatCurrency(selectedUser.bonus_balance)}
                  </Text>
                </View>

                <View style={styles.editSection}>
                  <Text style={styles.editLabel}>Update Balance</Text>
                  <View style={styles.balanceTypeRow}>
                    {['real', 'demo', 'bonus'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.balanceTypeBtn,
                          editBalanceType === type && styles.balanceTypeBtnActive
                        ]}
                        onPress={() => setEditBalanceType(type as any)}
                      >
                        <Text style={[
                          styles.balanceTypeBtnText,
                          editBalanceType === type && styles.balanceTypeBtnTextActive
                        ]}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.inputRow}>
                    <Text style={styles.inputPrefix}>$</Text>
                    <TextInput
                      style={styles.balanceInput}
                      value={editBalance}
                      onChangeText={setEditBalance}
                      keyboardType="numeric"
                      placeholder="Enter new balance"
                    />
                  </View>
                  <TouchableOpacity style={styles.updateBtn} onPress={updateUserBalance}>
                    <Text style={styles.updateBtnText}>Update Balance</Text>
                  </TouchableOpacity>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EBF1',
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
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1F36',
    marginBottom: 16,
  },
  pendingRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  pendingItem: {
    alignItems: 'center',
  },
  pendingBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingCount: {
    fontSize: 18,
    fontWeight: '700',
  },
  pendingLabel: {
    fontSize: 12,
    color: '#8898AA',
    marginTop: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F3F7',
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1F36',
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#8898AA',
    marginTop: 2,
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '600',
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
    marginBottom: 16,
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
  depositsContainer: {
    padding: 16,
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
    maxHeight: '80%',
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
  userInfoSection: {
    marginBottom: 16,
  },
  userInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8898AA',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  userInfoValue: {
    fontSize: 14,
    color: '#1A1F36',
  },
  editSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E6EBF1',
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1F36',
    marginBottom: 12,
  },
  balanceTypeRow: {
    flexDirection: 'row',
    marginBottom: 12,
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6EBF1',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputPrefix: {
    fontSize: 16,
    color: '#8898AA',
  },
  balanceInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#1A1F36',
  },
  updateBtn: {
    backgroundColor: '#635BFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  updateBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
