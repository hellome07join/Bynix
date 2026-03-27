import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { API_URL } from '../../utils/api';
import AnimatedLoader from '../../components/AnimatedLoader';

const { width } = Dimensions.get('window');

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
  picture?: string;
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

// Animated Fire Component for Background
const FireBackground = ({ size = 50 }: { size?: number }) => {
  const flameAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(flameAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(flameAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const scale = flameAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const opacity = flameAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  return (
    <Animated.View style={[{ transform: [{ scale }], opacity, position: 'absolute' }]}>
      <Text style={{ fontSize: size }}>🔥</Text>
    </Animated.View>
  );
};

// Bynix Logo Component
const BynixLogo = () => (
  <Image 
    source={require('../../assets/images/bynix-logo.png')}
    style={{ width: 90, height: 28, resizeMode: 'contain' }}
  />
);

// Compact Circular Podium Item
const CircularPodiumItem = ({ 
  trader, 
  rank, 
  onPress 
}: { 
  trader: LeaderboardUser | null; 
  rank: 1 | 2 | 3;
  onPress: () => void;
}) => {
  const isFirst = rank === 1;
  const isSecond = rank === 2;
  const isThird = rank === 3;
  
  // Circle colors based on rank
  const circleColors = isFirst 
    ? ['#FFD700', '#FFA500']
    : isSecond 
    ? ['#C0C0C0', '#8A8A8A']
    : ['#CD7F32', '#8B4513'];

  const borderColor = isFirst ? '#FFD700' : isSecond ? '#C0C0C0' : '#CD7F32';
  const circleSize = isFirst ? 60 : 48;

  if (!trader) {
    return (
      <View style={[circularStyles.itemContainer, isFirst && circularStyles.firstPlaceContainer]}>
        <View style={[circularStyles.circleAvatar, { width: circleSize, height: circleSize, borderColor, opacity: 0.3 }]}>
          <Ionicons name="person" size={20} color="#444" />
        </View>
        <Text style={circularStyles.emptyName}>-</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity 
      style={[circularStyles.itemContainer, isFirst && circularStyles.firstPlaceContainer]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Rank Badge */}
      <View style={[circularStyles.rankBadge, { backgroundColor: borderColor }]}>
        <Text style={circularStyles.rankText}>{rank}</Text>
        <Text style={circularStyles.rankSuffix}>{isFirst ? 'st' : isSecond ? 'nd' : 'rd'}</Text>
      </View>

      {/* Crown for 1st place */}
      {isFirst && (
        <View style={circularStyles.crownContainer}>
          <Text style={circularStyles.crownEmoji}>👑</Text>
        </View>
      )}

      {/* Circle Avatar with Fire Background */}
      <View style={circularStyles.avatarWrapper}>
        {/* Fire Behind */}
        <View style={circularStyles.fireContainer}>
          <FireBackground size={isFirst ? 45 : 35} />
        </View>
        
        {/* Circular Avatar */}
        <LinearGradient
          colors={circleColors}
          style={[circularStyles.circleAvatar, { width: circleSize, height: circleSize, borderColor }]}
        >
          {trader.picture ? (
            <Image source={{ uri: trader.picture }} style={{ width: '100%', height: '100%', borderRadius: circleSize/2 }} />
          ) : (
            <Text style={[circularStyles.avatarInitial, { fontSize: isFirst ? 24 : 18 }]}>
              {trader.name.charAt(0).toUpperCase()}
            </Text>
          )}
        </LinearGradient>
        
        {/* Country Flag on Avatar */}
        {trader.country_flag && (
          <View style={circularStyles.flagBadge}>
            <Text style={circularStyles.flagText}>{trader.country_flag}</Text>
          </View>
        )}
      </View>

      {/* Name */}
      <Text style={circularStyles.traderName} numberOfLines={1}>
        {trader.name}
      </Text>

      {/* Profit/Loss */}
      <View style={circularStyles.profitRow}>
        <Ionicons 
          name={trader.is_profit ? "trending-up" : "trending-down"} 
          size={10} 
          color={trader.is_profit ? "#00E55A" : "#FF3B3B"} 
        />
        <Text style={[circularStyles.profitText, { color: trader.is_profit ? "#00E55A" : "#FF3B3B" }]}>
          {trader.is_profit ? '+' : '-'}${Math.abs(trader.profit).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// Circular styles
const circularStyles = StyleSheet.create({
  itemContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  firstPlaceContainer: {
    marginBottom: 10,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 14,
    marginBottom: 4,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0A0E17',
  },
  rankSuffix: {
    fontSize: 8,
    fontWeight: '600',
    color: '#0A0E17',
    marginTop: -2,
  },
  crownContainer: {
    position: 'absolute',
    top: -8,
    zIndex: 10,
  },
  crownEmoji: {
    fontSize: 20,
  },
  avatarWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  fireContainer: {
    position: 'absolute',
    zIndex: -1,
  },
  circleAvatar: {
    borderRadius: 100,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarInitial: {
    fontWeight: '800',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  traderName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 4,
    maxWidth: 80,
    textAlign: 'center',
  },
  profitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  profitText: {
    fontSize: 10,
    fontWeight: '700',
  },
  emptyName: {
    fontSize: 11,
    color: '#444',
    marginTop: 6,
  },
  flagBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#0A0E17',
    borderRadius: 8,
    padding: 1,
  },
  flagText: {
    fontSize: 12,
  },
});

// Old PodiumCard - keeping for backward compatibility but not using
const PodiumCard = ({ 
  trader, 
  rank, 
  onPress 
}: { 
  trader: LeaderboardUser | null; 
  rank: 1 | 2 | 3;
  onPress: () => void;
}) => {
  const isFirst = rank === 1;
  const isSecond = rank === 2;
  const isThird = rank === 3;
  
  const cardStyle = isFirst 
    ? { backgroundColor: '#1A1A3E', borderColor: '#FFD700' }
    : isSecond 
    ? { backgroundColor: '#1A2A3E', borderColor: '#C0C0C0' }
    : { backgroundColor: '#2A1A1A', borderColor: '#CD7F32' };

  const wreathColor = isFirst ? '#FFD700' : isSecond ? '#C0C0C0' : '#CD7F32';

  if (!trader) {
    return (
      <View style={[styles.podiumCard, { opacity: 0.3 }, cardStyle, isFirst && styles.podiumCardFirst]}>
        <View style={styles.podiumEmptyAvatar}>
          <Ionicons name="person" size={30} color="#444" />
        </View>
        <Text style={styles.podiumEmptyText}>-</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity 
      style={[styles.podiumCard, cardStyle, isFirst && styles.podiumCardFirst]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Rank Badge with Wreath */}
      <View style={styles.wreathContainer}>
        <Text style={[styles.wreathText, { color: wreathColor }]}>
          {isFirst ? '🏆' : isSecond ? '🥈' : '🥉'}
        </Text>
        <View style={[styles.rankCircle, { backgroundColor: wreathColor }]}>
          <Text style={styles.rankCircleText}>{rank}</Text>
          {isFirst && <Text style={styles.rankSuffix}>st</Text>}
          {isSecond && <Text style={styles.rankSuffix}>nd</Text>}
          {isThird && <Text style={styles.rankSuffix}>rd</Text>}
        </View>
      </View>

      {/* Crown for 1st place */}
      {isFirst && (
        <View style={styles.crownContainer}>
          <Text style={styles.crownEmoji}>👑</Text>
        </View>
      )}

      {/* Avatar */}
      <View style={[styles.podiumAvatar, { borderColor: wreathColor }]}>
        {trader.picture ? (
          <Image source={{ uri: trader.picture }} style={styles.podiumAvatarImage} />
        ) : (
          <LinearGradient
            colors={isFirst ? ['#FFD700', '#FFA500'] : isSecond ? ['#C0C0C0', '#808080'] : ['#CD7F32', '#8B4513']}
            style={styles.podiumAvatarGradient}
          >
            <Text style={styles.podiumAvatarInitial}>
              {trader.name.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
        )}
      </View>

      {/* Fire Animation for Top 3 */}
      <View style={styles.fireContainer}>
        <FireAnimation size={isFirst ? 24 : 18} />
      </View>

      {/* Name */}
      <Text style={styles.podiumName} numberOfLines={1}>{trader.name}</Text>

      {/* Profit */}
      <View style={styles.podiumProfitContainer}>
        <Ionicons 
          name={trader.is_profit ? "trending-up" : "trending-down"} 
          size={14} 
          color={trader.is_profit ? "#00E55A" : "#FF3B3B"} 
        />
        <Text style={[styles.podiumProfit, { color: trader.is_profit ? "#00E55A" : "#FF3B3B" }]}>
          {trader.is_profit ? '+' : '-'}${Math.abs(trader.profit).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </Text>
      </View>
    </TouchableOpacity>
  );
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

  const formatProfit = (profit: number, isProfit: boolean) => {
    const absValue = Math.abs(profit);
    const formatted = `$${absValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return isProfit ? `+${formatted}` : `-${formatted}`;
  };

  // Get top 3 traders
  const top3 = leaderboard.slice(0, 3);
  const first = top3[0] || null;
  const second = top3[1] || null;
  const third = top3[2] || null;

  // Get rest of traders (4th onwards)
  const restOfTraders = leaderboard.slice(3, 20);

  if (loading) {
    return <AnimatedLoader message="Loading Leaderboard" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Bynix Logo */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <BynixLogo />
        <TouchableOpacity onPress={() => setShowInfoModal(true)} style={styles.infoBtn}>
          <Ionicons name="information-circle-outline" size={24} color="#888" />
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
        {/* Podium Section - Top 3 - Compact Circular Design */}
        <View style={styles.podiumSection}>
          <LinearGradient
            colors={['#0A1A2E', '#0A1A0F']}
            style={styles.podiumGradient}
          >
            {/* Compact Circular Podium Row */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end' }}>
              {/* 2nd Place - Left */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <CircularPodiumItem 
                  trader={second} 
                  rank={2}
                  onPress={() => second && fetchUserProfile(second.user_id)}
                />
              </View>
              
              {/* 1st Place - Center (Elevated) */}
              <View style={{ flex: 1.2, alignItems: 'center' }}>
                <CircularPodiumItem 
                  trader={first} 
                  rank={1}
                  onPress={() => first && fetchUserProfile(first.user_id)}
                />
              </View>
              
              {/* 3rd Place - Right */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <CircularPodiumItem 
                  trader={third} 
                  rank={3}
                  onPress={() => third && fetchUserProfile(third.user_id)}
                />
              </View>
            </View>
            
            {/* Leaderboard of the Day text */}
            <Text style={styles.leaderboardTitle}>Leaderboard of the Day</Text>
          </LinearGradient>
        </View>

        {/* User's Own Stats Section */}
        {token && myStats && (
          <View style={styles.myStatsSection}>
            <LinearGradient
              colors={['#1A2A1A', '#0A1A0F']}
              style={styles.myStatsGradient}
            >
              <View style={styles.myStatsHeader}>
                <Text style={styles.myStatsSectionTitle}>Your Performance</Text>
                <View style={styles.myRankBadge}>
                  <Text style={styles.myRankText}>#{myStats.position}</Text>
                </View>
              </View>
              
              <View style={styles.myStatsRow}>
                <View style={styles.myStatsAvatar}>
                  <Text style={styles.myStatsFlag}>{myStats.country_flag || '🌍'}</Text>
                </View>
                <View style={styles.myStatsInfo}>
                  <Text style={styles.myStatsName}>{myStats.name}</Text>
                  <Text style={styles.myStatsTrades}>{myStats.total_trades} trades • {myStats.win_rate.toFixed(0)}% win rate</Text>
                </View>
                <Text style={[
                  styles.myStatsProfit,
                  { color: myStats.profit >= 0 ? '#00E55A' : '#FF3B3B' }
                ]}>
                  {myStats.profit >= 0 ? '+' : ''}{formatProfit(myStats.profit, myStats.profit >= 0)}
                </Text>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* How it Works Section */}
        <View style={styles.howItWorksSection}>
          <Text style={styles.howItWorksTitle}>How it Works</Text>
          <View style={styles.howItWorksList}>
            <View style={styles.howItWorksItem}>
              <View style={styles.howItWorksDot} />
              <Text style={styles.howItWorksText}>Rankings based on last 24h profit</Text>
            </View>
            <View style={styles.howItWorksItem}>
              <View style={[styles.howItWorksDot, { backgroundColor: '#00E55A' }]} />
              <Text style={styles.howItWorksText}>Green = Profit, Red = Loss</Text>
            </View>
            <View style={styles.howItWorksItem}>
              <View style={styles.howItWorksDot} />
              <Text style={styles.howItWorksText}>Resets daily at midnight UTC</Text>
            </View>
          </View>
        </View>

        {/* Rest of Leaderboard List */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <View style={styles.listHeaderLine} />
            <Text style={styles.listHeaderText}>Rankings</Text>
            <View style={styles.listHeaderLine} />
          </View>

          {restOfTraders.length === 0 && leaderboard.length <= 3 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>More traders coming soon!</Text>
            </View>
          ) : (
            restOfTraders.map((trader) => (
              <TouchableOpacity 
                key={trader.user_id} 
                style={styles.listItem}
                onPress={() => fetchUserProfile(trader.user_id)}
                activeOpacity={0.7}
              >
                {/* Avatar with Country Flag */}
                <View style={styles.listAvatarContainer}>
                  <View style={styles.listAvatar}>
                    {trader.picture ? (
                      <Image source={{ uri: trader.picture }} style={styles.listAvatarImage} />
                    ) : (
                      <LinearGradient
                        colors={['#2A3A4A', '#1A2A3A']}
                        style={styles.listAvatarGradient}
                      >
                        <Text style={styles.listAvatarInitial}>
                          {trader.name.charAt(0).toUpperCase()}
                        </Text>
                      </LinearGradient>
                    )}
                  </View>
                  <Text style={styles.listFlag}>{trader.country_flag || '🌍'}</Text>
                </View>

                {/* User Info */}
                <View style={styles.listInfo}>
                  <Text style={styles.listName} numberOfLines={1}>{trader.name}</Text>
                  <View style={styles.listProfitRow}>
                    <Ionicons 
                      name={trader.is_profit ? "trending-up" : "trending-down"} 
                      size={12} 
                      color={trader.is_profit ? "#00E55A" : "#FF3B3B"} 
                    />
                    <Text style={[styles.listProfit, { color: trader.is_profit ? "#00E55A" : "#FF3B3B" }]}>
                      {formatProfit(trader.profit, trader.is_profit)}
                    </Text>
                  </View>
                </View>

                {/* Rank Circle */}
                <View style={styles.listRankCircle}>
                  <Text style={styles.listRankNumber}>{trader.rank}</Text>
                  <Text style={styles.listRankSuffix}>th</Text>
                </View>
              </TouchableOpacity>
            ))
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
    backgroundColor: '#0A0E17',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoBtn: {
    padding: 4,
  },
  content: {
    flex: 1,
  },

  // Podium Section
  podiumSection: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 16,
  },
  podiumGradient: {
    padding: 10,
    paddingTop: 8,
    paddingBottom: 10,
    borderRadius: 16,
  },
  leaderboardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },
  podiumRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  podiumCard: {
    width: 100,
    backgroundColor: '#1A2A3E',
    borderRadius: 14,
    padding: 8,
    paddingTop: 16,
    paddingBottom: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
    marginHorizontal: 4,
  },
  podiumCardFirst: {
    marginBottom: 20,
    paddingTop: 20,
    paddingBottom: 14,
    width: 110,
  },
  wreathContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  wreathText: {
    fontSize: 28,
  },
  rankCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -12,
    flexDirection: 'row',
  },
  rankCircleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0A0E17',
  },
  rankSuffix: {
    fontSize: 8,
    fontWeight: '600',
    color: '#0A0E17',
    marginTop: -4,
  },
  crownContainer: {
    position: 'absolute',
    top: -5,
    zIndex: 10,
  },
  crownEmoji: {
    fontSize: 24,
  },
  podiumAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  podiumAvatarImage: {
    width: '100%',
    height: '100%',
  },
  podiumAvatarGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumAvatarInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
  },
  fireContainer: {
    marginVertical: 4,
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  podiumProfitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  podiumProfit: {
    fontSize: 12,
    fontWeight: '700',
  },
  podiumEmptyAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1A1F2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  podiumEmptyText: {
    fontSize: 14,
    color: '#444',
  },

  // My Stats Section
  myStatsSection: {
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  myStatsGradient: {
    padding: 10,
  },
  myStatsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  myStatsSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00E55A',
  },
  myRankBadge: {
    backgroundColor: '#00E55A20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00E55A40',
  },
  myRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00E55A',
  },
  myStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  myStatsAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A1F2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  myStatsFlag: {
    fontSize: 24,
  },
  myStatsInfo: {
    flex: 1,
    marginLeft: 12,
  },
  myStatsName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  myStatsTrades: {
    fontSize: 10,
    color: '#888',
    marginTop: 1,
  },
  myStatsProfit: {
    fontSize: 14,
    fontWeight: '700',
  },

  // How it Works Section
  howItWorksSection: {
    marginHorizontal: 12,
    marginTop: 10,
    padding: 10,
    backgroundColor: '#0D1117',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1A1F2E',
  },
  howItWorksTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
    marginBottom: 6,
  },
  howItWorksList: {
    gap: 4,
  },
  howItWorksItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  howItWorksDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#00E55A',
  },
  howItWorksText: {
    fontSize: 10,
    color: '#666',
  },

  // List Section
  listSection: {
    marginHorizontal: 12,
    marginTop: 10,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  listHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1A1F2E',
  },
  listHeaderText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    marginHorizontal: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1117',
    borderRadius: 8,
    padding: 8,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#1A1F2E',
  },
  listAvatarContainer: {
    position: 'relative',
  },
  listAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
  },
  listAvatarImage: {
    width: '100%',
    height: '100%',
  },
  listAvatarGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listAvatarInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  listFlag: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    fontSize: 12,
    backgroundColor: '#0D1117',
    borderRadius: 6,
  },
  listInfo: {
    flex: 1,
    marginLeft: 10,
  },
  listName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listProfitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  listProfit: {
    fontSize: 11,
    fontWeight: '600',
  },
  listRankCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  listRankNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFD700',
  },
  listRankSuffix: {
    fontSize: 7,
    fontWeight: '600',
    color: '#FFD700',
    marginTop: -2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 12,
    color: '#666',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 12,
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

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 10,
  },
  infoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00E55A',
    marginTop: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#AAA',
    lineHeight: 20,
  },
  infoHighlight: {
    color: '#00E55A',
    fontWeight: '600',
  },
  modalCloseBtn: {
    backgroundColor: '#00E55A',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseBtnText: {
    color: '#0A0E17',
    fontSize: 14,
    fontWeight: '700',
  },

  // Profile Modal
  profileModalContent: {
    backgroundColor: '#1A1F2E',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    width: '90%',
    maxWidth: 320,
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
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 13,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profilePicContainer: {
    marginBottom: 12,
  },
  profilePic: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#00E55A',
  },
  profilePicPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#0A1A0F',
    borderWidth: 3,
    borderColor: '#00E55A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCountry: {
    fontSize: 13,
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
    padding: 14,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
  },
});
