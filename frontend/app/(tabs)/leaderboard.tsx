import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Demo users data with country flags
const DEMO_USERS = [
  { id: 1, name: 'Alexander K.', country: 'RU', flag: '🇷🇺', profit: 12847.50 },
  { id: 2, name: 'John Smith', country: 'US', flag: '🇺🇸', profit: 9823.00 },
  { id: 3, name: 'Hiroshi T.', country: 'JP', flag: '🇯🇵', profit: 8654.25 },
  { id: 4, name: 'Mohammed A.', country: 'AE', flag: '🇦🇪', profit: 7892.00 },
  { id: 5, name: 'Chen Wei', country: 'CN', flag: '🇨🇳', profit: 7456.75 },
  { id: 6, name: 'Maria Garcia', country: 'ES', flag: '🇪🇸', profit: 6987.50 },
  { id: 7, name: 'Hans Mueller', country: 'DE', flag: '🇩🇪', profit: 6543.00 },
  { id: 8, name: 'Sophie Martin', country: 'FR', flag: '🇫🇷', profit: 6234.25 },
  { id: 9, name: 'Raj Patel', country: 'IN', flag: '🇮🇳', profit: 5876.00 },
  { id: 10, name: 'James Wilson', country: 'GB', flag: '🇬🇧', profit: 5543.50 },
  { id: 11, name: 'Ana Silva', country: 'BR', flag: '🇧🇷', profit: 5234.00 },
  { id: 12, name: 'Kim Min-jun', country: 'KR', flag: '🇰🇷', profit: 4987.75 },
  { id: 13, name: 'Paolo Rossi', country: 'IT', flag: '🇮🇹', profit: 4765.00 },
  { id: 14, name: 'Oleksandr S.', country: 'UA', flag: '🇺🇦', profit: 4532.50 },
  { id: 15, name: 'Ahmed Hassan', country: 'EG', flag: '🇪🇬', profit: 4321.00 },
  { id: 16, name: 'Lisa Anderson', country: 'AU', flag: '🇦🇺', profit: 4123.25 },
  { id: 17, name: 'Carlos Lopez', country: 'MX', flag: '🇲🇽', profit: 3987.50 },
  { id: 18, name: 'Anna Kowalski', country: 'PL', flag: '🇵🇱', profit: 3765.00 },
  { id: 19, name: 'Yuki Tanaka', country: 'JP', flag: '🇯🇵', profit: 3543.75 },
  { id: 20, name: 'David Lee', country: 'SG', flag: '🇸🇬', profit: 3234.00 },
];

export default function Leaderboard() {
  const [users, setUsers] = useState(DEMO_USERS);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [nextRefresh, setNextRefresh] = useState(300); // 5 minutes in seconds

  // Function to randomize profits slightly to simulate live updates
  const updateLeaderboard = useCallback(() => {
    const updatedUsers = DEMO_USERS.map(user => ({
      ...user,
      profit: user.profit + (Math.random() - 0.3) * 500, // Random fluctuation
    })).sort((a, b) => b.profit - a.profit);
    
    setUsers(updatedUsers);
    setLastUpdated(new Date());
    setNextRefresh(300);
  }, []);

  // Auto refresh every 5 minutes
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      updateLeaderboard();
    }, 300000); // 5 minutes

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setNextRefresh(prev => (prev > 0 ? prev - 1 : 300));
    }, 1000);

    return () => {
      clearInterval(refreshInterval);
      clearInterval(countdownInterval);
    };
  }, [updateLeaderboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      updateLeaderboard();
      setRefreshing(false);
    }, 1000);
  }, [updateLeaderboard]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return { backgroundColor: 'rgba(255, 215, 0, 0.2)', borderColor: '#FFD700' };
    if (rank === 2) return { backgroundColor: 'rgba(192, 192, 192, 0.2)', borderColor: '#C0C0C0' };
    if (rank === 3) return { backgroundColor: 'rgba(205, 127, 50, 0.2)', borderColor: '#CD7F32' };
    return { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: 'transparent' };
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank.toString();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={styles.timerContainer}>
          <Ionicons name="time-outline" size={14} color="#00E55A" />
          <Text style={styles.timerText}>Next update: {formatTime(nextRefresh)}</Text>
        </View>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="trophy" size={20} color="#FFD700" />
        <Text style={styles.infoText}>Top 20 Traders (Last 24 Hours)</Text>
      </View>

      {/* Leaderboard List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00E55A"
            colors={['#00E55A']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {users.map((user, index) => {
          const rank = index + 1;
          const rankStyle = getRankStyle(rank);
          
          return (
            <View 
              key={user.id} 
              style={[styles.userCard, { backgroundColor: rankStyle.backgroundColor, borderColor: rankStyle.borderColor }]}
            >
              <View style={styles.rankContainer}>
                {rank <= 3 ? (
                  <Text style={styles.rankEmoji}>{getRankIcon(rank)}</Text>
                ) : (
                  <Text style={styles.rankNumber}>{rank}</Text>
                )}
              </View>
              
              <View style={styles.userInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.flag}>{user.flag}</Text>
                  <Text style={styles.userName}>{user.name}</Text>
                </View>
                <Text style={styles.country}>{user.country}</Text>
              </View>
              
              <View style={styles.profitContainer}>
                <Text style={styles.profitLabel}>Profit</Text>
                <Text style={styles.profitAmount}>+${user.profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              </View>
            </View>
          );
        })}
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1A0F',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: 'rgba(15, 20, 40, 0.95)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  timerText: {
    color: '#00E55A',
    fontSize: 12,
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)',
  },
  infoText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 100,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  rankContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankEmoji: {
    fontSize: 20,
  },
  rankNumber: {
    color: '#888',
    fontSize: 14,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flag: {
    fontSize: 16,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  country: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
  profitContainer: {
    alignItems: 'flex-end',
  },
  profitLabel: {
    color: '#666',
    fontSize: 10,
    marginBottom: 2,
  },
  profitAmount: {
    color: '#00E55A',
    fontSize: 14,
    fontWeight: '800',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    color: '#666',
    fontSize: 11,
  },
});
