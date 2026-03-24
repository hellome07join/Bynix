import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../utils/api';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

// Animated Trading Candle Component
const AnimatedCandle = ({ delay, x, isGreen }: { delay: number, x: number, isGreen: boolean }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.3)).current;
  
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: isGreen ? -30 : 30,
            duration: 2000 + Math.random() * 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.6,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 0,
            duration: 2000 + Math.random() * 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const candleHeight = 40 + Math.random() * 60;
  const wickHeight = 10 + Math.random() * 20;

  return (
    <Animated.View
      style={[
        styles.candle,
        {
          left: x,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      {/* Upper wick */}
      <View style={[styles.wick, { height: wickHeight, backgroundColor: isGreen ? '#00E55A' : '#FF3B3B' }]} />
      {/* Candle body */}
      <View style={[
        styles.candleBody,
        { 
          height: candleHeight, 
          backgroundColor: isGreen ? '#00E55A' : '#FF3B3B',
        }
      ]} />
      {/* Lower wick */}
      <View style={[styles.wick, { height: wickHeight, backgroundColor: isGreen ? '#00E55A' : '#FF3B3B' }]} />
    </Animated.View>
  );
};

// Animated Price Line
const AnimatedPriceLine = () => {
  const translateX = useRef(new Animated.Value(-width)).current;
  
  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: width,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View style={[styles.priceLine, { transform: [{ translateX }] }]}>
      <LinearGradient
        colors={['transparent', '#00E55A', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.priceLineGradient}
      />
    </Animated.View>
  );
};

// Floating Numbers Animation
const FloatingNumber = ({ value, x, delay }: { value: string, x: number, delay: number }) => {
  const translateY = useRef(new Animated.Value(height)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100,
            duration: 6000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.4,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.delay(4000),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.timing(translateY, {
          toValue: height,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.Text
      style={[
        styles.floatingNumber,
        {
          left: x,
          transform: [{ translateY }],
          opacity,
          color: value.startsWith('+') ? '#00E55A' : '#FF3B3B',
        },
      ]}
    >
      {value}
    </Animated.Text>
  );
};

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
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadData();
    
    // Pulse animation for Start Trading button
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
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

  // Generate candles for background
  const candles = Array.from({ length: 20 }, (_, i) => ({
    x: (i * (width / 10)) - 20,
    delay: i * 200,
    isGreen: Math.random() > 0.4,
  }));

  // Generate floating numbers
  const floatingNumbers = [
    { value: '+92%', x: 30, delay: 0 },
    { value: '-15%', x: 120, delay: 2000 },
    { value: '+187%', x: 220, delay: 4000 },
    { value: '+45%', x: 320, delay: 1000 },
    { value: '-8%', x: 80, delay: 3000 },
    { value: '+256%', x: 280, delay: 5000 },
  ];

  return (
    <View style={styles.container}>
      {/* Animated Trading Background */}
      <View style={styles.animatedBackground}>
        {/* Grid lines */}
        <View style={styles.gridContainer}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={`h-${i}`} style={[styles.gridLineH, { top: (i + 1) * (height / 8) }]} />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={`v-${i}`} style={[styles.gridLineV, { left: (i + 1) * (width / 6) }]} />
          ))}
        </View>
        
        {/* Animated candles */}
        {candles.map((candle, i) => (
          <AnimatedCandle key={i} x={candle.x} delay={candle.delay} isGreen={candle.isGreen} />
        ))}
        
        {/* Price line animation */}
        <AnimatedPriceLine />
        
        {/* Floating profit numbers */}
        {floatingNumbers.map((num, i) => (
          <FloatingNumber key={i} value={num.value} x={num.x} delay={num.delay} />
        ))}
      </View>

      {/* Dark overlay gradient */}
      <LinearGradient
        colors={['rgba(10, 14, 39, 0.7)', 'rgba(10, 14, 39, 0.85)', 'rgba(10, 14, 39, 0.95)']}
        style={styles.overlay}
      />

      {/* Main Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E55A" />
        }
      >
        {/* Header with Start Trading */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome Back,</Text>
            <Text style={styles.name}>{user?.name || 'Trader'}</Text>
          </View>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={styles.startTradingBtn}
              onPress={() => router.push('/(tabs)/trade')}
            >
              <Ionicons name="rocket" size={16} color="#0A0E27" />
              <Text style={styles.startTradingText}>Start Trading</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Account Switch */}
        <View style={styles.accountContainer}>
          <View style={styles.accountSwitch}>
            <TouchableOpacity
              style={[styles.switchButton, accountType === 'demo' && styles.switchButtonActive]}
              onPress={() => setAccountType('demo')}
            >
              <Text style={[styles.switchText, accountType === 'demo' && styles.switchTextActive]}>
                Demo Account
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.switchButton, accountType === 'real' && styles.switchButtonActive]}
              onPress={() => setAccountType('real')}
            >
              <Text style={[styles.switchText, accountType === 'real' && styles.switchTextActive]}>
                Real Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance Card with Blur */}
        <View style={styles.balanceCardWrapper}>
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <View style={styles.balanceIconContainer}>
                <Ionicons name="wallet" size={24} color="#00E55A" />
              </View>
              <Text style={styles.balanceLabel}>
                {accountType === 'demo' ? 'Demo' : 'Real'} Balance
              </Text>
            </View>
            <Text style={styles.balanceAmount}>${balance?.toFixed(2) || '0.00'}</Text>
            <View style={styles.balanceActions}>
              <TouchableOpacity 
                style={styles.depositButton}
                onPress={() => router.push('/(tabs)/wallet')}
              >
                <Ionicons name="add" size={18} color="#0A0E27" />
                <Text style={styles.depositButtonText}>Deposit</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.withdrawButton}
                onPress={() => router.push('/(tabs)/wallet')}
              >
                <Ionicons name="arrow-down" size={18} color="#00E55A" />
                <Text style={styles.withdrawButtonText}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="bar-chart" size={20} color="#00E55A" />
            <Text style={styles.statValue}>{stats.total_trades}</Text>
            <Text style={styles.statLabel}>Total Trades</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={20} color="#00E55A" />
            <Text style={[styles.statValue, { color: '#00E55A' }]}>{stats.won_trades}</Text>
            <Text style={styles.statLabel}>Won</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="close-circle" size={20} color="#FF3B3B" />
            <Text style={[styles.statValue, { color: '#FF3B3B' }]}>{stats.lost_trades}</Text>
            <Text style={styles.statLabel}>Lost</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={20} color="#FFB800" />
            <Text style={[styles.statValue, { color: '#FFB800' }]}>
              {stats.win_rate.toFixed(0)}%
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
              <View style={styles.actionIconContainer}>
                <Ionicons name="trending-up" size={28} color="#00E55A" />
              </View>
              <Text style={styles.actionText}>Trade Now</Text>
              <Text style={styles.actionSubtext}>Start earning</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/wallet')}
            >
              <View style={styles.actionIconContainer}>
                <Ionicons name="wallet" size={28} color="#FFB800" />
              </View>
              <Text style={styles.actionText}>Wallet</Text>
              <Text style={styles.actionSubtext}>Manage funds</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/leaderboard')}
            >
              <View style={styles.actionIconContainer}>
                <Ionicons name="trophy" size={28} color="#9B59B6" />
              </View>
              <Text style={styles.actionText}>Rankings</Text>
              <Text style={styles.actionSubtext}>Top traders</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Trades */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Trades</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/trade')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {trades.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="layers-outline" size={48} color="#444" />
              <Text style={styles.emptyText}>No trades yet</Text>
              <Text style={styles.emptySubtext}>Start trading to see your history</Text>
              <TouchableOpacity 
                style={styles.emptyStartButton}
                onPress={() => router.push('/(tabs)/trade')}
              >
                <Ionicons name="flash" size={18} color="#0A0E27" />
                <Text style={styles.emptyStartText}>Make First Trade</Text>
              </TouchableOpacity>
            </View>
          ) : (
            trades.map((trade: any) => (
              <View key={trade.trade_id} style={styles.tradeItem}>
                <View style={styles.tradeLeft}>
                  <View style={[
                    styles.tradeTypeIcon,
                    trade.trade_type === 'call' ? styles.callIcon : styles.putIcon
                  ]}>
                    <Ionicons 
                      name={trade.trade_type === 'call' ? 'arrow-up' : 'arrow-down'} 
                      size={16} 
                      color="#FFFFFF" 
                    />
                  </View>
                  <View style={styles.tradeInfo}>
                    <Text style={styles.tradeAsset}>{trade.asset}</Text>
                    <Text style={styles.tradeTime}>
                      {new Date(trade.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.tradeRight}>
                  <Text style={[
                    styles.tradeProfit,
                    trade.profit_loss >= 0 ? styles.profit : styles.loss
                  ]}>
                    {trade.profit_loss >= 0 ? '+' : ''}${Math.abs(trade.profit_loss).toFixed(2)}
                  </Text>
                  <Text style={styles.tradeAmount}>${trade.amount.toFixed(2)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  animatedBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0, 229, 90, 0.05)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0, 229, 90, 0.05)',
  },
  candle: {
    position: 'absolute',
    top: '30%',
    alignItems: 'center',
  },
  wick: {
    width: 2,
    borderRadius: 1,
  },
  candleBody: {
    width: 12,
    borderRadius: 2,
    marginVertical: 1,
  },
  priceLine: {
    position: 'absolute',
    top: '45%',
    width: width * 2,
    height: 2,
  },
  priceLineGradient: {
    flex: 1,
    height: 2,
  },
  floatingNumber: {
    position: 'absolute',
    fontSize: 16,
    fontWeight: 'bold',
    opacity: 0.4,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  startTradingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00E55A',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    gap: 6,
    shadowColor: '#00E55A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  startTradingText: {
    color: '#0A0E27',
    fontSize: 14,
    fontWeight: 'bold',
  },
  accountContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  accountSwitch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 4,
  },
  switchButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  switchButtonActive: {
    backgroundColor: '#00E55A',
  },
  switchText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontWeight: '600',
  },
  switchTextActive: {
    color: '#0A0E27',
  },
  balanceCardWrapper: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  balanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 90, 0.2)',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 229, 90, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  depositButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#00E55A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  depositButtonText: {
    color: '#0A0E27',
    fontSize: 15,
    fontWeight: 'bold',
  },
  withdrawButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 229, 90, 0.15)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 90, 0.3)',
  },
  withdrawButtonText: {
    color: '#00E55A',
    fontSize: 15,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  seeAll: {
    fontSize: 14,
    color: '#00E55A',
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  actionSubtext: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
  },
  emptyStartButton: {
    flexDirection: 'row',
    backgroundColor: '#00E55A',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  emptyStartText: {
    color: '#0A0E27',
    fontWeight: 'bold',
    fontSize: 14,
  },
  tradeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
  },
  tradeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tradeTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  callIcon: {
    backgroundColor: '#00E55A',
  },
  putIcon: {
    backgroundColor: '#FF3B3B',
  },
  tradeInfo: {
    flex: 1,
  },
  tradeAsset: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  tradeTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  tradeRight: {
    alignItems: 'flex-end',
  },
  tradeProfit: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  tradeAmount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  profit: {
    color: '#00E55A',
  },
  loss: {
    color: '#FF3B3B',
  },
});
