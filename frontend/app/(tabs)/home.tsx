import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../utils/api';

const { width } = Dimensions.get('window');

export default function Home() {
  const router = useRouter();
  const { user, token, accountType, setAccountType } = useAuthStore();
  
  const [trades, setTrades] = useState([]);
  const [stats, setStats] = useState({
    total_trades: 0,
    won_trades: 0,
    lost_trades: 0,
    total_profit: 0,
    win_rate: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!token) return;
    
    try {
      const [tradesData, statsData] = await Promise.all([
        api.getTrades(token),
        api.getTradeStats(token),
      ]);
      setTrades(tradesData.slice(0, 5));
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const balance = accountType === 'demo' ? user?.demo_balance : user?.real_balance;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D7A3" />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome Back,</Text>
          <Text style={styles.name}>{user?.name}</Text>
        </View>
        <View style={styles.accountSwitch}>
          <TouchableOpacity
            style={[styles.switchButton, accountType === 'demo' && styles.switchButtonActive]}
            onPress={() => setAccountType('demo')}
          >
            <Text style={[styles.switchText, accountType === 'demo' && styles.switchTextActive]}>
              Demo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.switchButton, accountType === 'real' && styles.switchButtonActive]}
            onPress={() => setAccountType('real')}
          >
            <Text style={[styles.switchText, accountType === 'real' && styles.switchTextActive]}>
              Real
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>{accountType === 'demo' ? 'Demo' : 'Real'} Balance</Text>
        <Text style={styles.balanceAmount}>${balance?.toFixed(2) || '0.00'}</Text>
        <TouchableOpacity 
          style={styles.depositButton}
          onPress={() => router.push('/(tabs)/wallet')}
        >
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.depositButtonText}>Deposit</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total_trades}</Text>
          <Text style={styles.statLabel}>Total Trades</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#00D7A3' }]}>{stats.won_trades}</Text>
          <Text style={styles.statLabel}>Won</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#FF3B3B' }]}>{stats.lost_trades}</Text>
          <Text style={styles.statLabel}>Lost</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, stats.total_profit >= 0 ? { color: '#00D7A3' } : { color: '#FF3B3B' }]}>
            {stats.win_rate.toFixed(1)}%
          </Text>
          <Text style={styles.statLabel}>Win Rate</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/trade')}
          >
            <Ionicons name="trending-up" size={32} color="#00D7A3" />
            <Text style={styles.actionText}>Trade Now</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/wallet')}
          >
            <Ionicons name="wallet" size={32} color="#00D7A3" />
            <Text style={styles.actionText}>Wallet</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Trades */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Trades</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {trades.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="file-tray-outline" size={48} color="#666" />
            <Text style={styles.emptyText}>No trades yet</Text>
            <TouchableOpacity 
              style={styles.startTradingButton}
              onPress={() => router.push('/(tabs)/trade')}
            >
              <Text style={styles.startTradingText}>Start Trading</Text>
            </TouchableOpacity>
          </View>
        ) : (
          trades.map((trade: any) => (
            <View key={trade.trade_id} style={styles.tradeItem}>
              <View style={styles.tradeInfo}>
                <Text style={styles.tradeAsset}>{trade.asset}</Text>
                <Text style={styles.tradeTime}>
                  {new Date(trade.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.tradeRight}>
                <Text style={[
                  styles.tradeType,
                  trade.trade_type === 'call' ? styles.callType : styles.putType
                ]}>
                  {trade.trade_type.toUpperCase()}
                </Text>
                <Text style={[
                  styles.tradeProfit,
                  trade.profit_loss >= 0 ? styles.profit : styles.loss
                ]}>
                  {trade.profit_loss >= 0 ? '+' : ''}{trade.profit_loss.toFixed(2)}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
  },
  greeting: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.6,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  accountSwitch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 4,
  },
  switchButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  switchButtonActive: {
    backgroundColor: '#00D7A3',
  },
  switchText: {
    color: '#FFFFFF',
    opacity: 0.5,
    fontSize: 14,
    fontWeight: '600',
  },
  switchTextActive: {
    color: '#0A0E27',
    opacity: 1,
  },
  balanceCard: {
    backgroundColor: 'rgba(0, 215, 163, 0.1)',
    marginHorizontal: 24,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#00D7A3',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.6,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#00D7A3',
    marginBottom: 16,
  },
  depositButton: {
    flexDirection: 'row',
    backgroundColor: '#00D7A3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  depositButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.6,
  },
  section: {
    padding: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  seeAll: {
    fontSize: 14,
    color: '#00D7A3',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#FFFFFF',
    opacity: 0.5,
    marginTop: 16,
    marginBottom: 24,
  },
  startTradingButton: {
    backgroundColor: '#00D7A3',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  startTradingText: {
    color: '#0A0E27',
    fontWeight: 'bold',
  },
  tradeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  tradeInfo: {
    flex: 1,
  },
  tradeAsset: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  tradeTime: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.5,
  },
  tradeRight: {
    alignItems: 'flex-end',
  },
  tradeType: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  callType: {
    color: '#00D7A3',
    backgroundColor: 'rgba(0, 215, 163, 0.2)',
  },
  putType: {
    color: '#FF3B3B',
    backgroundColor: 'rgba(255, 59, 59, 0.2)',
  },
  tradeProfit: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  profit: {
    color: '#00D7A3',
  },
  loss: {
    color: '#FF3B3B',
  },
});
