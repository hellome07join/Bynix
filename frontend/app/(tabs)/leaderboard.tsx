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
                        {trader.picture ? (
                          <Image 
                            source={{ uri: trader.picture }} 
                            style={styles.avatarImage}
                          />
                        ) : (
                          <Ionicons name="person" size={14} color="#00E55A" />
                        )}
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
    marginTop: 8,
    fontSize: 11,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backBtn: {
    padding: 2,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerLogo: {
    width: 36,
    height: 36,
  },
  headerTextContainer: {
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 9,
    color: '#888',
    marginTop: 1,
  },
  closeBtn: {
    padding: 2,
  },
  content: {
    flex: 1,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFB800',
    textAlign: 'center',
  },
  myStatsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1B2838',
    marginHorizontal: 12,
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  myStatsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countryFlag: {
    fontSize: 16,
  },
  myStatsName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  myStatsProfit: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00E55A',
  },
  myPositionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 6,
    gap: 6,
  },
  positionLabel: {
    fontSize: 10,
    color: '#888',
  },
  positionValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B2838',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 6,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.3)',
  },
  infoButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFB800',
  },
  leaderboardList: {
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  traderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  traderRowTopThree: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    marginHorizontal: -6,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  rankContainer: {
    width: 28,
    alignItems: 'center',
  },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  rankNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  flagAvatar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    fontSize: 14,
  },
  avatarCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,229,90,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -4,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  userName: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  vipStar: {
    marginLeft: 2,
  },
  profitAmount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00E55A',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingBottom: 60,
  },
  footerText: {
    fontSize: 10,
    color: '#666',
  },
  footerSubtext: {
    fontSize: 9,
    color: '#555',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    maxWidth: 320,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  infoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E55A',
    marginTop: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: '#AAA',
    lineHeight: 16,
  },
  infoHighlight: {
    color: '#00E55A',
    fontWeight: '600',
  },
  modalCloseBtn: {
    backgroundColor: '#00E55A',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  modalCloseBtnText: {
    color: '#0A1A0F',
    fontSize: 12,
    fontWeight: '700',
  },
  // User Profile Modal Styles
  profileModalContent: {
    backgroundColor: '#1B2838',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    width: '90%',
    maxWidth: 300,
  },
  profileCloseBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    padding: 2,
  },
  profileLoading: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  profilePicContainer: {
    marginBottom: 8,
  },
  profilePic: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#00E55A',
  },
  profilePicPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0A1A0F',
    borderWidth: 2,
    borderColor: '#00E55A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCountry: {
    fontSize: 11,
    color: '#888',
    marginBottom: 2,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  levelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  levelBadgeText: {
    fontSize: 8,
    fontWeight: '600',
  },
  statsGrid: {
    backgroundColor: '#0A1A0F',
    borderRadius: 10,
    padding: 10,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 9,
    color: '#666',
  },
});
