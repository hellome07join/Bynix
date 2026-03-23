import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { API_URL } from '../../utils/api';
import AnimatedLoader from '../../components/AnimatedLoader';

interface LeaderboardUser {
  rank: number;
  user_id: string;
  name: string;
  country: string;
  country_flag: string;
  profit: number;
  is_profit: boolean;
  total_trades: number;
  win_rate: number;
  volume: number;
}

interface MyStats {
  user_id: string;
  name: string;
  country_flag?: string;
  profit: number;
  total_trades: number;
  win_rate: number;
  volume: number;
  position: string;
}

interface UserProfile {
  user_id: string;
  name: string;
  country: string;
  country_flag: string;
  picture: string | null;
  account_level: string;
  level_color: string;
  trades_count: number;
  profitable_trades: number;
  trades_profit: number;
  average_profit: number;
  min_trade_amount: number;
  max_trade_amount: number;
}

// Country flag mapping
const COUNTRY_FLAGS: { [key: string]: string } = {
  'Bangladesh': '🇧🇩',
  'India': '🇮🇳',
  'United States': '🇺🇸',
  'United Kingdom': '🇬🇧',
  'Germany': '🇩🇪',
  'Japan': '🇯🇵',
  'China': '🇨🇳',
  'Russia': '🇷🇺',
  'Brazil': '🇧🇷',
  'France': '🇫🇷',
  'Pakistan': '🇵🇰',
  'Nepal': '🇳🇵',
  'UAE': '🇦🇪',
  'Saudi Arabia': '🇸🇦',
  'Turkey': '🇹🇷',
  'Indonesia': '🇮🇩',
  'Malaysia': '🇲🇾',
  'Singapore': '🇸🇬',
  'Australia': '🇦🇺',
  'Canada': '🇨🇦',
};

export default function Leaderboard() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [myStats, setMyStats] = useState<MyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/leaderboard`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  }, []);

  const fetchMyStats = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/leaderboard/my-stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMyStats(data);
      }
    } catch (error) {
      console.error('Error fetching my stats:', error);
    }
  }, [token]);

  const fetchUserProfile = async (userId: string) => {
    setLoadingProfile(true);
    setShowUserProfileModal(true);
    
    try {
      const response = await fetch(`${API_URL}/leaderboard/user/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedUserProfile(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchLeaderboard(), fetchMyStats()]);
      setLoading(false);
    };

    loadData();

    // Auto refresh every 60 seconds
    const interval = setInterval(() => {
      fetchLeaderboard();
      fetchMyStats();
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchLeaderboard, fetchMyStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchLeaderboard(), fetchMyStats()]);
    setRefreshing(false);
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { bg: '#FFD700', text: '#0A1A0F' };
    if (rank === 2) return { bg: '#C0C0C0', text: '#0A1A0F' };
    if (rank === 3) return { bg: '#CD7F32', text: '#FFFFFF' };
    return { bg: 'transparent', text: '#888' };
  };

  const formatProfit = (profit: number, isProfit: boolean) => {
    const absValue = Math.abs(profit);
    const formatted = `$${absValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return isProfit ? `+${formatted}` : `-${formatted}`;
  };

  if (loading) {
    return <AnimatedLoader message="Loading Leaderboard" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Image 
          source={require('../../assets/images/bynix-logo.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00E55A"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Leader Board of the Day Title - RIGHT AFTER HEADER */}
        <View style={styles.sectionTitleContainer}>
          <Ionicons name="trophy" size={24} color="#FFB800" />
          <Text style={styles.sectionTitle}>Leader Board of the Day</Text>
        </View>

        {/* My Stats Card - User ID/Name and Profit/Loss */}
        {token && myStats && (
          <View style={styles.myStatsCard}>
            <View style={styles.myStatsLeft}>
              <Text style={styles.countryFlag}>{myStats.country_flag || '🌍'}</Text>
              <Text style={styles.myStatsName}>{myStats.name}</Text>
            </View>
            <Text style={[
              styles.myStatsProfit,
              { color: myStats.profit >= 0 ? '#00E55A' : '#FF3B3B' }
            ]}>
              {myStats.profit >= 0 ? '+' : '-'}${Math.abs(myStats.profit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        )}

        {/* My Position/Ranking */}
        {token && myStats && (
          <View style={styles.myPositionRow}>
            <Text style={styles.positionLabel}>Your Ranking:</Text>
            <Text style={styles.positionValue}>#{myStats.position}</Text>
          </View>
        )}

        {/* How Rating Works */}
        <TouchableOpacity 
          style={styles.infoButton}
          onPress={() => setShowInfoModal(true)}
        >
          <Ionicons name="podium" size={20} color="#FFB800" />
          <Text style={styles.infoButtonText}>How does this rating work?</Text>
        </TouchableOpacity>

        {/* Leaderboard List - Top 20 */}
        <View style={styles.leaderboardList}>
          {leaderboard.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={48} color="#444" />
              <Text style={styles.emptyText}>No traders yet today</Text>
              <Text style={styles.emptySubtext}>Start trading to appear on the leaderboard!</Text>
            </View>
          ) : (
            leaderboard.slice(0, 20).map((trader) => {
              const rankStyle = getRankBadge(trader.rank);
              const isTopThree = trader.rank <= 3;

              return (
                <TouchableOpacity 
                  key={trader.user_id} 
                  style={[
                    styles.traderRow,
                    isTopThree && styles.traderRowTopThree,
                  ]}
                  onPress={() => fetchUserProfile(trader.user_id)}
                  activeOpacity={0.7}
                >
                  {/* Rank */}
                  <View style={styles.rankContainer}>
                    {isTopThree ? (
                      <View style={[styles.rankBadge, { backgroundColor: rankStyle.bg }]}>
                        <Text style={[styles.rankBadgeText, { color: rankStyle.text }]}>
                          {trader.rank}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.rankNumber}>{trader.rank}</Text>
                    )}
                  </View>

                  {/* User Info */}
                  <View style={styles.userInfo}>
                    <View style={styles.flagAvatar}>
                      <Text style={styles.flag}>{trader.country_flag || '🌍'}</Text>
                      <View style={styles.avatarCircle}>
                        <Ionicons name="person" size={14} color="#00E55A" />
                      </View>
                    </View>
                    <Text style={styles.userName} numberOfLines={1}>{trader.name}</Text>
                    {trader.win_rate >= 70 && (
                      <Ionicons name="star" size={14} color="#FFD700" style={styles.vipStar} />
                    )}
                  </View>

                  {/* Profit */}
                  <Text style={[
                    styles.profitAmount,
                    { color: trader.is_profit ? '#00E55A' : '#FF3B3B' }
                  ]}>
                    {formatProfit(trader.profit, trader.is_profit)}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Text>
          <Text style={styles.footerSubtext}>
            Rankings based on last 24 hours profit
          </Text>
        </View>
      </ScrollView>

      {/* Info Modal */}
      <Modal
        visible={showInfoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="trophy" size={28} color="#FFD700" />
              <Text style={styles.modalTitle}>Leaderboard Ranking</Text>
            </View>

            <View style={styles.infoItem}>
              <View style={styles.infoDot} />
              <Text style={styles.infoText}>
                Rankings are based on <Text style={styles.infoHighlight}>total profit/loss</Text> earned in the last 24 hours.
              </Text>
            </View>

            <View style={styles.infoItem}>
              <View style={[styles.infoDot, { backgroundColor: '#00E55A' }]} />
              <Text style={styles.infoText}>
                <Text style={{ color: '#00E55A', fontWeight: '600' }}>Green (+)</Text> = Profit, <Text style={{ color: '#FF3B3B', fontWeight: '600' }}>Red (-)</Text> = Loss
              </Text>
            </View>

            <View style={styles.infoItem}>
              <View style={styles.infoDot} />
              <Text style={styles.infoText}>
                <Text style={styles.infoHighlight}>Star badge ⭐</Text> indicates traders with 70%+ win rate.
              </Text>
            </View>

            <View style={styles.infoItem}>
              <View style={styles.infoDot} />
              <Text style={styles.infoText}>
                Rankings <Text style={styles.infoHighlight}>reset daily</Text> at midnight UTC.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowInfoModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* User Profile Modal */}
      <Modal
        visible={showUserProfileModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUserProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.profileModalContent}>
            {/* Close Button */}
            <TouchableOpacity 
              style={styles.profileCloseBtn}
              onPress={() => setShowUserProfileModal(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>

            {loadingProfile ? (
              <View style={styles.profileLoading}>
                <ActivityIndicator size="large" color="#00E55A" />
                <Text style={styles.loadingText}>Loading profile...</Text>
              </View>
            ) : selectedUserProfile && (
              <>
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                  {/* Profile Picture */}
                  <View style={styles.profilePicContainer}>
                    {selectedUserProfile.picture ? (
                      <Image 
                        source={{ uri: selectedUserProfile.picture }}
                        style={styles.profilePic}
                      />
                    ) : (
                      <View style={styles.profilePicPlaceholder}>
                        <Ionicons name="person" size={40} color="#00E55A" />
                      </View>
                    )}
                  </View>

                  {/* Country and Name */}
                  <Text style={styles.profileCountry}>{selectedUserProfile.country}</Text>
                  <View style={styles.profileNameRow}>
                    <Text style={styles.profileName}>{selectedUserProfile.name}</Text>
                    <View style={[styles.levelBadge, { backgroundColor: selectedUserProfile.level_color + '30', borderColor: selectedUserProfile.level_color }]}>
                      <Text style={[styles.levelBadgeText, { color: selectedUserProfile.level_color }]}>
                        {selectedUserProfile.account_level}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                  {/* Row 1 */}
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{selectedUserProfile.trades_count}</Text>
                      <Text style={styles.statLabel}>Trades count</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{selectedUserProfile.profitable_trades}</Text>
                      <Text style={styles.statLabel}>Profitable trades</Text>
                    </View>
                  </View>

                  {/* Row 2 */}
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: selectedUserProfile.trades_profit >= 0 ? '#00E55A' : '#FF3B3B' }]}>
                        ${selectedUserProfile.trades_profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Text>
                      <Text style={styles.statLabel}>Trades profit</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: selectedUserProfile.average_profit >= 0 ? '#00E55A' : '#FF3B3B' }]}>
                        ${selectedUserProfile.average_profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Text>
                      <Text style={styles.statLabel}>Average profit</Text>
                    </View>
                  </View>

                  {/* Row 3 */}
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>
                        ${selectedUserProfile.min_trade_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Text>
                      <Text style={styles.statLabel}>Min trade amount</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>
                        ${selectedUserProfile.max_trade_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Text>
                      <Text style={styles.statLabel}>Max trade amount</Text>
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backBtn: {
    padding: 4,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogo: {
    width: 60,
    height: 60,
  },
  headerTextContainer: {
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFB800',
    textAlign: 'center',
  },
  myStatsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1B2838',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  myStatsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  countryFlag: {
    fontSize: 24,
  },
  myStatsName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  myStatsProfit: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00E55A',
  },
  myPositionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  positionLabel: {
    fontSize: 14,
    color: '#888',
  },
  positionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B2838',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.3)',
  },
  infoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFB800',
  },
  leaderboardList: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#888',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  traderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  traderRowTopThree: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  rankContainer: {
    width: 36,
    alignItems: 'center',
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadgeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  flagAvatar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    fontSize: 18,
  },
  avatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,229,90,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -6,
  },
  userName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  vipStar: {
    marginLeft: 4,
  },
  profitAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00E55A',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingBottom: 100,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
  },
  footerSubtext: {
    fontSize: 11,
    color: '#555',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  infoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00E55A',
    marginTop: 6,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#AAA',
    lineHeight: 22,
  },
  infoHighlight: {
    color: '#00E55A',
    fontWeight: '600',
  },
  modalCloseBtn: {
    backgroundColor: '#00E55A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseBtnText: {
    color: '#0A1A0F',
    fontSize: 16,
    fontWeight: '700',
  },
  // User Profile Modal Styles
  profileModalContent: {
    backgroundColor: '#1B2838',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    width: '90%',
    maxWidth: 360,
  },
  profileCloseBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
    padding: 4,
  },
  profileLoading: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePicContainer: {
    marginBottom: 12,
  },
  profilePic: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#00E55A',
  },
  profilePicPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0A1A0F',
    borderWidth: 3,
    borderColor: '#00E55A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCountry: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statsGrid: {
    backgroundColor: '#0A1A0F',
    borderRadius: 12,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
  },
});
