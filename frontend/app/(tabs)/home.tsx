import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { API_URL } from '../../utils/api';

export default function Home() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balanceData, setBalanceData] = useState({
    real_balance: 0,
    demo_balance: 10000,
    bonus_balance: 0,
    total_balance: 0
  });
  const [recentTrades, setRecentTrades] = useState([]);

  // Fetch user balance and recent trades
  const fetchDashboardData = async () => {
    if (!token) return;
    
    try {
      // Fetch user balance
      const balanceResponse = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (balanceResponse.ok) {
        const userData = await balanceResponse.json();
        setBalanceData({
          real_balance: userData.real_balance || 0,
          demo_balance: userData.demo_balance || 10000,
          bonus_balance: userData.bonus_balance || 0,
          total_balance: (userData.real_balance || 0) + (userData.demo_balance || 10000) + (userData.bonus_balance || 0)
        });
      }

      // Fetch recent trades
      const tradesResponse = await fetch(`${API_URL}/trades/history?limit=5`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (tradesResponse.ok) {
        const tradesData = await tradesResponse.json();
        setRecentTrades(tradesData.trades || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00E55A" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E55A" />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.full_name || 'Trader'}</Text>
        </View>
        <TouchableOpacity style={styles.notificationBtn}>
          <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Balance Cards */}
      <View style={styles.balanceSection}>
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Real Balance</Text>
            <Ionicons name="wallet" size={20} color="#00E55A" />
          </View>
          <Text style={styles.balanceAmount}>{formatCurrency(balanceData.real_balance)}</Text>
          <Text style={styles.balanceSubtext}>Available for withdrawal</Text>
        </View>

        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Demo Balance</Text>
            <Ionicons name="school" size={20} color="#FFB800" />
          </View>
          <Text style={styles.balanceAmount}>{formatCurrency(balanceData.demo_balance)}</Text>
          <Text style={styles.balanceSubtext}>Practice trading</Text>
        </View>

        {balanceData.bonus_balance > 0 && (
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceLabel}>Bonus Balance</Text>
              <Ionicons name="gift" size={20} color="#9B59B6" />
            </View>
            <Text style={styles.balanceAmount}>{formatCurrency(balanceData.bonus_balance)}</Text>
            <Text style={styles.balanceSubtext}>Trading only</Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: '#00E55A' }]}
          onPress={() => router.push('/(tabs)/trade')}
        >
          <Ionicons name="trending-up" size={24} color="#0A1A0F" />
          <Text style={[styles.actionBtnText, { color: '#0A1A0F' }]}>Trade</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: '#1E2A3B' }]}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Ionicons name="arrow-down-circle" size={24} color="#00E55A" />
          <Text style={styles.actionBtnText}>Deposit</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: '#1E2A3B' }]}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Ionicons name="arrow-up-circle" size={24} color="#FF3B3B" />
          <Text style={styles.actionBtnText}>Withdraw</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: '#1E2A3B' }]}
          onPress={() => router.push('/(tabs)/leaderboard')}
        >
          <Ionicons name="trophy" size={24} color="#FFD700" />
          <Text style={styles.actionBtnText}>Leaderboard</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Trades */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Trades</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {recentTrades.length > 0 ? (
          recentTrades.map((trade, index) => (
            <View key={trade.trade_id || index} style={styles.tradeItem}>
              <View style={styles.tradeLeft}>
                <View style={[
                  styles.tradeIcon,
                  { backgroundColor: trade.type === 'call' ? '#00E55A20' : '#FF3B3B20' }
                ]}>
                  <Ionicons 
                    name={trade.type === 'call' ? 'arrow-up' : 'arrow-down'} 
                    size={16} 
                    color={trade.type === 'call' ? '#00E55A' : '#FF3B3B'} 
                  />
                </View>
                <View>
                  <Text style={styles.tradeAsset}>{trade.asset}</Text>
                  <Text style={styles.tradeTime}>{trade.time_ago}</Text>
                </View>
              </View>
              <View style={styles.tradeRight}>
                <Text style={styles.tradeAmount}>${trade.amount}</Text>
                <Text style={[
                  styles.tradePnL,
                  { color: trade.profit_loss >= 0 ? '#00E55A' : '#FF3B3B' }
                ]}>
                  {trade.profit_loss >= 0 ? '+' : ''}${trade.profit_loss?.toFixed(2)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={48} color="#666" />
            <Text style={styles.emptyText}>No trades yet</Text>
            <Text style={styles.emptySubtext}>Start trading to see your history here</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1A0F',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A1A0F',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  welcomeText: {
    color: '#8A94A6',
    fontSize: 16,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E2A3B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  balanceCard: {
    backgroundColor: '#141B2D',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E2A3B',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    color: '#8A94A6',
    fontSize: 14,
    fontWeight: '600',
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  balanceSubtext: {
    color: '#8A94A6',
    fontSize: 12,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewAllText: {
    color: '#00E55A',
    fontSize: 14,
    fontWeight: '600',
  },
  tradeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#141B2D',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E2A3B',
  },
  tradeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tradeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tradeAsset: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tradeTime: {
    color: '#8A94A6',
    fontSize: 12,
  },
  tradeRight: {
    alignItems: 'flex-end',
  },
  tradeAmount: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tradePnL: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#8A94A6',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});