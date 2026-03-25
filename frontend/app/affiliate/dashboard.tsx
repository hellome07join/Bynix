import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../utils/api';

const { width } = Dimensions.get('window');
const BYNIX_LOGO_URL = 'https://customer-assets.emergentagent.com/job_bynix-markets/artifacts/lgz5jvli_IMG_3255.png';

// Sidebar Menu Items
const MENU_ITEMS = [
  { id: 'dashboard', icon: 'grid', label: 'Dashboard' },
  { id: 'statistics', icon: 'stats-chart', label: 'Statistics' },
  { id: 'links', icon: 'link', label: 'Links' },
  { id: 'promo', icon: 'flag', label: 'Promo materials' },
  { id: 'promocodes', icon: 'pricetag', label: 'Promocodes' },
  { id: 'postback', icon: 'code-slash', label: 'Postback' },
  { id: 'top10', icon: 'trending-up', label: 'TOP10 Partners' },
  { id: 'telegram', icon: 'chatbubbles', label: 'Telegram bot', badge: 'NEW' },
  { id: 'support', icon: 'headset', label: 'Support' },
  { id: 'programs', icon: 'briefcase', label: 'Affiliate programs' },
  { id: 'subaffiliate', icon: 'people', label: 'Sub-Affiliate' },
];

// Affiliate Levels Data
const AFFILIATE_LEVELS = [
  { level: 1, name: 'Starter', min_ftds: 0, max_ftds: 14, revenue: 50, turnover: 2.0 },
  { level: 2, name: 'Advanced', min_ftds: 15, max_ftds: 49, revenue: 55, turnover: 2.5 },
  { level: 3, name: 'Professional', min_ftds: 50, max_ftds: 99, revenue: 60, turnover: 3.0 },
  { level: 4, name: 'Expert', min_ftds: 100, max_ftds: 199, revenue: 65, turnover: 3.5 },
  { level: 5, name: 'Master', min_ftds: 200, max_ftds: 399, revenue: 70, turnover: 4.0 },
  { level: 6, name: 'Guru', min_ftds: 400, max_ftds: 699, revenue: 75, turnover: 4.5 },
  { level: 7, name: 'Legend', min_ftds: 700, max_ftds: 999999, revenue: 85, turnover: 5.5 },
];

// Fast Links
const FAST_LINKS = [
  { id: 'promo', icon: 'flag', label: 'Promo Materials', color: '#FEF3C7', iconColor: '#F59E0B' },
  { id: 'links', icon: 'link', label: 'Links', color: '#EDE9FE', iconColor: '#8B5CF6' },
  { id: 'faq', icon: 'help-circle', label: 'FAQ', color: '#FEE2E2', iconColor: '#EF4444' },
  { id: 'telegram', icon: 'chatbubbles', label: 'Telegram bot', color: '#DBEAFE', iconColor: '#3B82F6' },
];

export default function AffiliateDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showProfile, setShowProfile] = useState(false);
  const [showLevels, setShowLevels] = useState(false);
  
  // Data states
  const [affiliate, setAffiliate] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [statisticsData, setStatisticsData] = useState<any>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [top10, setTop10] = useState<any[]>([]);
  const [promoMaterials, setPromoMaterials] = useState<any[]>([]);
  
  // Date range for statistics
  const [statsDays, setStatsDays] = useState(7);

  const getToken = async () => {
    return await AsyncStorage.getItem('affiliate_token');
  };

  const fetchDashboard = async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/affiliate/login');
        return;
      }
      
      const response = await fetch(`${API_URL}/affiliate/dashboard?days=${statsDays}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.status === 401) {
        await AsyncStorage.removeItem('affiliate_token');
        router.replace('/affiliate/login');
        return;
      }
      
      const data = await response.json();
      setDashboardData(data);
      setAffiliate(data.affiliate);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    }
  };

  const fetchStatistics = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/affiliate/statistics?days=${statsDays}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setStatisticsData(data);
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    }
  };

  const fetchLinks = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/affiliate/links`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setLinks(data.links || []);
    } catch (err) {
      console.error('Failed to fetch links:', err);
    }
  };

  const fetchTop10 = async () => {
    try {
      const response = await fetch(`${API_URL}/affiliate/top10`);
      const data = await response.json();
      setTop10(data.top_affiliates || []);
    } catch (err) {
      console.error('Failed to fetch top10:', err);
    }
  };

  const fetchPromoMaterials = async () => {
    try {
      const response = await fetch(`${API_URL}/affiliate/promo-materials`);
      const data = await response.json();
      setPromoMaterials(data.materials || []);
    } catch (err) {
      console.error('Failed to fetch promo materials:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      fetchDashboard(),
      fetchStatistics(),
      fetchLinks(),
      fetchTop10(),
      fetchPromoMaterials()
    ]);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, [statsDays]);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('affiliate_token');
    await AsyncStorage.removeItem('affiliate_data');
    router.replace('/affiliate/login');
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getCurrentLevel = () => {
    if (!affiliate) return AFFILIATE_LEVELS[0];
    const ftds = affiliate.total_ftds || 0;
    return AFFILIATE_LEVELS.find(l => ftds >= l.min_ftds && ftds <= l.max_ftds) || AFFILIATE_LEVELS[0];
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#00E55A" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  // Sidebar Component
  const Sidebar = () => (
    <View style={[styles.sidebar, { paddingTop: insets.top + 10 }]}>
      {/* Logo */}
      <View style={styles.sidebarLogo}>
        <Image source={{ uri: BYNIX_LOGO_URL }} style={styles.sidebarLogoImage} resizeMode="contain" />
      </View>
      
      {/* Menu Items */}
      <ScrollView style={styles.sidebarMenu} showsVerticalScrollIndicator={false}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.menuItem, activeTab === item.id && styles.menuItemActive]}
            onPress={() => { setActiveTab(item.id); setSidebarOpen(false); }}
          >
            <Ionicons name={item.icon as any} size={22} color={activeTab === item.id ? '#00E55A' : '#8898AA'} />
            <Text style={[styles.menuLabel, activeTab === item.id && styles.menuLabelActive]}>{item.label}</Text>
            {item.badge && (
              <View style={styles.menuBadge}>
                <Text style={styles.menuBadgeText}>{item.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Bottom Links */}
      <View style={styles.sidebarBottom}>
        <TouchableOpacity style={styles.sidebarBottomItem}>
          <Text style={styles.sidebarBottomText}>Affiliate agreement</Text>
        </TouchableOpacity>
        <View style={styles.languageSelector}>
          <Ionicons name="globe-outline" size={18} color="#8898AA" />
          <Text style={styles.languageText}>EN</Text>
          <Ionicons name="chevron-down" size={16} color="#8898AA" />
        </View>
      </View>
    </View>
  );

  // Header Component
  const Header = () => (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <View style={styles.headerLeft}>
        <Image source={{ uri: BYNIX_LOGO_URL }} style={styles.headerLogo} resizeMode="contain" />
      </View>
      
      <View style={styles.headerRight}>
        {/* Tier Badge */}
        <TouchableOpacity style={styles.tierBadge} onPress={() => setShowLevels(!showLevels)}>
          <Ionicons name="flash" size={14} color="#00E55A" />
          <Text style={styles.tierBadgeText}>{affiliate?.level || 1}</Text>
        </TouchableOpacity>
        
        {/* Profile Dropdown */}
        <TouchableOpacity style={styles.profileBtn} onPress={() => setShowProfile(!showProfile)}>
          <Text style={styles.profileInitials}>
            {affiliate?.name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2) || 'AF'}
          </Text>
          <Ionicons name={showProfile ? "chevron-up" : "chevron-down"} size={16} color="#3B82F6" />
        </TouchableOpacity>
      </View>
      
      {/* Mobile Menu Button */}
      <TouchableOpacity style={styles.menuBtn} onPress={() => setSidebarOpen(true)}>
        <Ionicons name="menu" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  // Profile Dropdown
  const ProfileDropdown = () => (
    <View style={styles.profileDropdown}>
      <View style={styles.profileDropdownHeader}>
        <Text style={styles.profileEmail}>{affiliate?.email}</Text>
        <Text style={styles.profileId}>ID: {affiliate?.affiliate_id?.slice(0, 8)}</Text>
      </View>
      <TouchableOpacity style={styles.profileDropdownItem}>
        <Ionicons name="person-outline" size={18} color="#6B7280" />
        <Text style={styles.profileDropdownText}>My Account</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.profileDropdownItem} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#6B7280" />
        <Text style={styles.profileDropdownText}>Sign Out</Text>
      </TouchableOpacity>
      <View style={styles.profileDropdownDivider} />
      <TouchableOpacity style={styles.profileDropdownItem}>
        <Ionicons name="logo-telegram" size={18} color="#0088CC" />
        <Text style={[styles.profileDropdownText, { color: '#0088CC' }]}>@bynix_support</Text>
      </TouchableOpacity>
    </View>
  );

  // Levels Modal
  const LevelsModal = () => {
    const currentLevel = getCurrentLevel();
    return (
      <View style={styles.levelsModal}>
        <View style={styles.levelsModalHeader}>
          <Text style={styles.levelsModalTitle}>Affiliate Levels</Text>
          <Text style={styles.levelsModalSubtitle}>Increase the number of deposits and get more profit with us!</Text>
        </View>
        
        <View style={styles.levelsTable}>
          <View style={styles.levelsTableHeader}>
            <Text style={[styles.levelsTableCell, styles.levelsTableHeaderText, { flex: 1.5 }]}>Name</Text>
            <Text style={[styles.levelsTableCell, styles.levelsTableHeaderText]}>Revenue</Text>
            <Text style={[styles.levelsTableCell, styles.levelsTableHeaderText]}>Turnover</Text>
            <Text style={[styles.levelsTableCell, styles.levelsTableHeaderText]}>Deposits</Text>
          </View>
          
          {AFFILIATE_LEVELS.map((level) => (
            <View 
              key={level.level} 
              style={[
                styles.levelsTableRow,
                level.level === currentLevel.level && styles.levelsTableRowActive
              ]}
            >
              {level.level === currentLevel.level && (
                <Text style={styles.yourPositionLabel}>YOUR POSITION:</Text>
              )}
              <Text style={[styles.levelsTableCell, { flex: 1.5, color: level.level === currentLevel.level ? '#3B82F6' : '#1F2937' }]}>
                Level {level.level}
              </Text>
              <Text style={[styles.levelsTableCell, { color: '#1F2937' }]}>{level.revenue}</Text>
              <Text style={[styles.levelsTableCell, { color: '#1F2937' }]}>{level.turnover}</Text>
              <Text style={[styles.levelsTableCell, { color: '#9CA3AF' }]}>
                {level.min_ftds}-{level.max_ftds > 999 ? level.min_ftds + '+' : level.max_ftds}
              </Text>
            </View>
          ))}
        </View>
        
        {affiliate && (
          <View style={styles.depositsProgress}>
            <LinearGradient colors={['#00E55A', '#00C94D']} style={[styles.depositsProgressBar, { width: `${Math.min((affiliate.total_ftds / 700) * 100, 100)}%` }]} />
            <Text style={styles.depositsProgressText}>{affiliate.total_ftds} DEPOSITS</Text>
          </View>
        )}
      </View>
    );
  };

  // Dashboard Content
  const DashboardContent = () => (
    <View style={styles.content}>
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Your balance</Text>
        <Text style={styles.balanceAmount}>{formatMoney(affiliate?.balance || 0)}</Text>
        
        <TouchableOpacity style={styles.withdrawBtn}>
          <LinearGradient colors={['#00E55A', '#00C94D']} style={styles.withdrawBtnGradient}>
            <Text style={styles.withdrawBtnText}>Go to Withdrawal</Text>
            <Ionicons name="arrow-forward" size={18} color="#000" />
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.totalEarnings}>
          <Text style={styles.totalEarningsLabel}>Earnings for all time</Text>
          <Text style={styles.totalEarningsAmount}>{formatMoney(affiliate?.total_earnings || 0)}</Text>
        </View>
      </View>
      
      {/* Fast Links */}
      <View style={styles.fastLinksSection}>
        <Text style={styles.sectionTitle}>Fast Links</Text>
        <View style={styles.fastLinksGrid}>
          {FAST_LINKS.map((link) => (
            <TouchableOpacity 
              key={link.id} 
              style={[styles.fastLinkCard, { backgroundColor: link.color }]}
              onPress={() => setActiveTab(link.id)}
            >
              <Ionicons name={link.icon as any} size={28} color={link.iconColor} />
              <Text style={[styles.fastLinkLabel, { color: link.iconColor }]}>{link.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Stats Summary */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Period Statistics ({statsDays} days)</Text>
        
        <View style={styles.statCardsRow}>
          <View style={[styles.statCard, styles.statCardDark]}>
            <Ionicons name="card-outline" size={24} color="#FFF" />
            <Text style={styles.statCardValue}>{formatMoney(dashboardData?.period_stats?.deposits || 0)}</Text>
            <Text style={styles.statCardLabel}>{dashboardData?.period_stats?.ftds || 0} deposits</Text>
          </View>
        </View>
        
        <View style={styles.statCardsGrid}>
          <View style={styles.statCardLight}>
            <Ionicons name="wallet-outline" size={24} color="#8B5CF6" />
            <Text style={styles.statCardLightValue}>{formatMoney(dashboardData?.period_stats?.earnings || 0)}</Text>
            <Text style={styles.statCardLightLabel}>{dashboardData?.period_stats?.ftds || 0} FTD's</Text>
          </View>
          
          <View style={styles.statCardLight}>
            <Ionicons name="hand-left-outline" size={24} color="#F59E0B" />
            <Text style={styles.statCardLightValue}>{dashboardData?.period_stats?.clicks || 0}</Text>
            <Text style={styles.statCardLightLabel}>Clicks</Text>
          </View>
          
          <View style={styles.statCardLight}>
            <Ionicons name="people-outline" size={24} color="#3B82F6" />
            <Text style={styles.statCardLightValue}>{dashboardData?.period_stats?.registrations || 0}</Text>
            <Text style={styles.statCardLightLabel}>Registrations</Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.viewAllStats} onPress={() => setActiveTab('statistics')}>
          <Text style={styles.viewAllStatsText}>View all statistics</Text>
          <Ionicons name="arrow-forward" size={16} color="#3B82F6" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Statistics Content
  const StatisticsContent = () => (
    <View style={styles.content}>
      <View style={styles.statsHeader}>
        <Text style={styles.pageTitle}>Statistics</Text>
        
        {/* Date Range Selector */}
        <View style={styles.dateRangeSelector}>
          {[7, 14, 30].map((days) => (
            <TouchableOpacity
              key={days}
              style={[styles.dateRangeBtn, statsDays === days && styles.dateRangeBtnActive]}
              onPress={() => setStatsDays(days)}
            >
              <Text style={[styles.dateRangeBtnText, statsDays === days && styles.dateRangeBtnTextActive]}>
                {days === 7 ? 'Week' : days === 14 ? '2 Weeks' : 'Month'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Stats Cards */}
      <View style={styles.statsGridFull}>
        <View style={[styles.statCardFull, styles.statCardDark]}>
          <Ionicons name="card-outline" size={28} color="#FFF" />
          <View>
            <Text style={styles.statCardFullValue}>{formatMoney(statisticsData?.totals?.deposits || 0)}</Text>
            <Text style={styles.statCardFullLabel}>{statisticsData?.totals?.ftds || 0} deposits</Text>
          </View>
        </View>
        
        <View style={styles.statCardFull}>
          <Ionicons name="wallet-outline" size={28} color="#8B5CF6" />
          <View>
            <Text style={[styles.statCardFullValue, { color: '#1F2937' }]}>{formatMoney((statisticsData?.totals?.ftds || 0) * 50)}</Text>
            <Text style={[styles.statCardFullLabel, { color: '#8B5CF6' }]}>{statisticsData?.totals?.ftds || 0} FTD's</Text>
          </View>
        </View>
        
        <View style={styles.statCardFull}>
          <Ionicons name="hand-left-outline" size={28} color="#F59E0B" />
          <View>
            <Text style={[styles.statCardFullValue, { color: '#1F2937' }]}>{statisticsData?.totals?.clicks || 0}</Text>
            <Text style={[styles.statCardFullLabel, { color: '#F59E0B' }]}>Clicks</Text>
          </View>
        </View>
        
        <View style={styles.statCardFull}>
          <Ionicons name="people-outline" size={28} color="#3B82F6" />
          <View>
            <Text style={[styles.statCardFullValue, { color: '#1F2937' }]}>{statisticsData?.totals?.registrations || 0}</Text>
            <Text style={[styles.statCardFullLabel, { color: '#3B82F6' }]}>Registrations</Text>
          </View>
        </View>
      </View>
      
      {/* Chart Section */}
      <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>Clicks / Registrations / FTD Chart</Text>
        <Text style={styles.chartSubtitle}>For all links</Text>
        
        {/* Simple bar representation */}
        <View style={styles.chartContainer}>
          {statisticsData?.daily_stats?.map((day: any, index: number) => (
            <View key={index} style={styles.chartBar}>
              <View style={[styles.chartBarInner, { height: Math.max(day.clicks * 2, 5), backgroundColor: '#F59E0B' }]} />
              <View style={[styles.chartBarInner, { height: Math.max(day.registrations * 5, 3), backgroundColor: '#3B82F6' }]} />
              <View style={[styles.chartBarInner, { height: Math.max(day.ftds * 10, 2), backgroundColor: '#00E55A' }]} />
              <Text style={styles.chartBarLabel}>{day.date.slice(5)}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.chartLegend}>
          <View style={styles.chartLegendItem}>
            <View style={[styles.chartLegendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.chartLegendText}>Clicks</Text>
          </View>
          <View style={styles.chartLegendItem}>
            <View style={[styles.chartLegendDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.chartLegendText}>Registrations</Text>
          </View>
          <View style={styles.chartLegendItem}>
            <View style={[styles.chartLegendDot, { backgroundColor: '#00E55A' }]} />
            <Text style={styles.chartLegendText}>FTDs</Text>
          </View>
        </View>
      </View>
    </View>
  );

  // Links Content
  const LinksContent = () => (
    <View style={styles.content}>
      <View style={styles.linksHeader}>
        <Text style={styles.pageTitle}>Your Links</Text>
        <TouchableOpacity style={styles.addLinkBtn}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addLinkBtnText}>Create Link</Text>
        </TouchableOpacity>
      </View>
      
      {links.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="link-outline" size={48} color="#8898AA" />
          <Text style={styles.emptyStateText}>No links yet</Text>
          <Text style={styles.emptyStateSubtext}>Create your first affiliate link to start tracking</Text>
        </View>
      ) : (
        links.map((link) => (
          <View key={link.link_id} style={styles.linkCard}>
            <View style={styles.linkCardHeader}>
              <Text style={styles.linkName}>{link.name}</Text>
              <TouchableOpacity style={styles.copyBtn}>
                <Ionicons name="copy-outline" size={18} color="#3B82F6" />
              </TouchableOpacity>
            </View>
            <Text style={styles.linkCode}>bynix.com/r/{link.code}</Text>
            <View style={styles.linkStats}>
              <View style={styles.linkStat}>
                <Text style={styles.linkStatValue}>{link.clicks || 0}</Text>
                <Text style={styles.linkStatLabel}>Clicks</Text>
              </View>
              <View style={styles.linkStat}>
                <Text style={styles.linkStatValue}>{link.registrations || 0}</Text>
                <Text style={styles.linkStatLabel}>Regs</Text>
              </View>
              <View style={styles.linkStat}>
                <Text style={styles.linkStatValue}>{link.ftds || 0}</Text>
                <Text style={styles.linkStatLabel}>FTDs</Text>
              </View>
              <View style={styles.linkStat}>
                <Text style={styles.linkStatValue}>{formatMoney(link.deposits || 0)}</Text>
                <Text style={styles.linkStatLabel}>Deposits</Text>
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );

  // TOP 10 Content
  const Top10Content = () => (
    <View style={styles.content}>
      <Text style={styles.pageTitle}>TOP 10 Partners</Text>
      <Text style={styles.pageSubtitle}>Monthly leaderboard</Text>
      
      {top10.map((partner, index) => (
        <View key={index} style={[styles.top10Card, index < 3 && styles.top10CardTop]}>
          <View style={styles.top10Rank}>
            {index < 3 ? (
              <Ionicons name="trophy" size={24} color={index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'} />
            ) : (
              <Text style={styles.top10RankText}>{partner.rank}</Text>
            )}
          </View>
          <View style={styles.top10Info}>
            <Text style={styles.top10Name}>{partner.name}</Text>
            <Text style={styles.top10Level}>Level {partner.level}</Text>
          </View>
          <View style={styles.top10Earnings}>
            <Text style={styles.top10EarningsValue}>{formatMoney(partner.total_earnings)}</Text>
            <Text style={styles.top10EarningsLabel}>{partner.total_ftds} FTDs</Text>
          </View>
        </View>
      ))}
    </View>
  );

  // Promo Materials Content
  const PromoContent = () => (
    <View style={styles.content}>
      <Text style={styles.pageTitle}>Promo Materials</Text>
      <Text style={styles.pageSubtitle}>Banners and landing pages for your campaigns</Text>
      
      {promoMaterials.map((material) => (
        <View key={material.material_id} style={styles.promoCard}>
          <View style={styles.promoPreview}>
            <Image source={{ uri: material.preview_url }} style={styles.promoImage} resizeMode="contain" />
          </View>
          <View style={styles.promoInfo}>
            <Text style={styles.promoName}>{material.name}</Text>
            <Text style={styles.promoSize}>{material.size || material.type}</Text>
          </View>
          <TouchableOpacity style={styles.promoDownloadBtn}>
            <Ionicons name="download-outline" size={20} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  // Support Content
  const SupportContent = () => (
    <View style={styles.content}>
      <Text style={styles.pageTitle}>Support</Text>
      
      <View style={styles.supportCard}>
        <Ionicons name="chatbubbles-outline" size={48} color="#3B82F6" />
        <Text style={styles.supportTitle}>Need Help?</Text>
        <Text style={styles.supportText}>Our affiliate managers are available 24/7</Text>
        
        <TouchableOpacity style={styles.telegramSupportBtn}>
          <Ionicons name="logo-telegram" size={24} color="#FFF" />
          <Text style={styles.telegramSupportText}>Contact via Telegram</Text>
        </TouchableOpacity>
        
        <Text style={styles.supportEmail}>or email: affiliate@bynix.com</Text>
      </View>
    </View>
  );

  // Render active tab content
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardContent />;
      case 'statistics': return <StatisticsContent />;
      case 'links': return <LinksContent />;
      case 'top10': return <Top10Content />;
      case 'promo': return <PromoContent />;
      case 'support': return <SupportContent />;
      default: return <DashboardContent />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <TouchableOpacity 
          style={styles.sidebarOverlay} 
          activeOpacity={1}
          onPress={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      {sidebarOpen && <Sidebar />}
      
      {/* Main Content */}
      <View style={styles.main}>
        <Header />
        
        {/* Sub Header with balance */}
        <View style={styles.subHeader}>
          <View>
            <Text style={styles.balanceSmall}>{formatMoney(affiliate?.balance || 0)}</Text>
            <Text style={styles.volRevText}>
              Vol: {formatMoney(dashboardData?.period_stats?.deposits || 0)} / Rev: {formatMoney(dashboardData?.period_stats?.earnings || 0)}
            </Text>
          </View>
        </View>
        
        {/* Profile Dropdown */}
        {showProfile && <ProfileDropdown />}
        
        {/* Levels Modal */}
        {showLevels && <LevelsModal />}
        
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E55A" />}
        >
          {renderContent()}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loadingContainer: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#8898AA', marginTop: 12 },
  
  // Sidebar
  sidebar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 280, backgroundColor: '#1A1F36', zIndex: 100, paddingHorizontal: 16 },
  sidebarOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99 },
  sidebarLogo: { paddingVertical: 20, alignItems: 'center' },
  sidebarLogoImage: { width: 140, height: 60 },
  sidebarMenu: { flex: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 8, marginBottom: 4 },
  menuItemActive: { backgroundColor: 'rgba(0, 229, 90, 0.1)' },
  menuLabel: { color: '#8898AA', fontSize: 15, marginLeft: 14, flex: 1 },
  menuLabelActive: { color: '#00E55A' },
  menuBadge: { backgroundColor: '#00E55A', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  menuBadgeText: { color: '#000', fontSize: 10, fontWeight: '700' },
  sidebarBottom: { paddingVertical: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  sidebarBottomItem: { paddingVertical: 10 },
  sidebarBottomText: { color: '#8898AA', fontSize: 13 },
  languageSelector: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  languageText: { color: '#8898AA', marginLeft: 8, marginRight: 4 },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10, backgroundColor: '#1A1F36' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: { width: 100, height: 40 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  tierBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 229, 90, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 10 },
  tierBadgeText: { color: '#00E55A', fontWeight: '700', marginLeft: 4 },
  profileBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0E7FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  profileInitials: { color: '#3B82F6', fontWeight: '700', marginRight: 4 },
  menuBtn: { padding: 8 },
  
  // Sub Header
  subHeader: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  balanceSmall: { fontSize: 24, fontWeight: '800', color: '#1F2937' },
  volRevText: { fontSize: 12, color: '#00E55A', marginTop: 2 },
  
  // Profile Dropdown
  profileDropdown: { position: 'absolute', top: 120, right: 16, backgroundColor: '#FFF', borderRadius: 12, padding: 16, width: 250, zIndex: 50, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
  profileDropdownHeader: { paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 8 },
  profileEmail: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  profileId: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  profileDropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  profileDropdownText: { fontSize: 14, color: '#6B7280', marginLeft: 10 },
  profileDropdownDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 8 },
  
  // Levels Modal
  levelsModal: { position: 'absolute', top: 120, left: 16, right: 16, backgroundColor: '#FFF', borderRadius: 16, padding: 20, zIndex: 50, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
  levelsModalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  levelsModalTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  levelsModalSubtitle: { fontSize: 13, color: '#6B7280', marginLeft: 12, flex: 1 },
  levelsTable: { marginBottom: 16 },
  levelsTableHeader: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  levelsTableHeaderText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
  levelsTableRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  levelsTableRowActive: { backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: 8, position: 'relative', paddingTop: 24 },
  levelsTableCell: { flex: 1, fontSize: 14 },
  yourPositionLabel: { position: 'absolute', top: 4, left: 8, fontSize: 10, color: '#9CA3AF', fontWeight: '600' },
  depositsProgress: { height: 32, backgroundColor: '#E5E7EB', borderRadius: 16, overflow: 'hidden', justifyContent: 'center' },
  depositsProgressBar: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 16 },
  depositsProgressText: { textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#1F2937' },
  
  // Main Content
  main: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  
  // Balance Card
  balanceCard: { backgroundColor: '#1A1F36', borderRadius: 16, padding: 20, marginBottom: 20 },
  balanceLabel: { color: '#8898AA', fontSize: 14, marginBottom: 4 },
  balanceAmount: { color: '#FFF', fontSize: 32, fontWeight: '800', marginBottom: 16 },
  withdrawBtn: { borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  withdrawBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  withdrawBtnText: { color: '#000', fontSize: 16, fontWeight: '700', marginRight: 8 },
  totalEarnings: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 14 },
  totalEarningsLabel: { color: '#8898AA', fontSize: 12 },
  totalEarningsAmount: { color: '#FFF', fontSize: 20, fontWeight: '700', marginTop: 4 },
  
  // Fast Links
  fastLinksSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  fastLinksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  fastLinkCard: { width: (width - 44) / 2, padding: 16, borderRadius: 16, alignItems: 'center' },
  fastLinkLabel: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  
  // Stats Section
  statsSection: { marginBottom: 20 },
  statCardsRow: { marginBottom: 12 },
  statCard: { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' },
  statCardDark: { backgroundColor: '#1A1F36' },
  statCardValue: { color: '#FFF', fontSize: 24, fontWeight: '800', marginLeft: 12 },
  statCardLabel: { color: '#8898AA', fontSize: 12, marginLeft: 12 },
  statCardsGrid: { flexDirection: 'row', gap: 12 },
  statCardLight: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 14, alignItems: 'center' },
  statCardLightValue: { fontSize: 20, fontWeight: '800', color: '#1F2937', marginTop: 8 },
  statCardLightLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  viewAllStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  viewAllStatsText: { color: '#3B82F6', fontWeight: '600', marginRight: 4 },
  
  // Statistics Page
  statsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1F2937' },
  pageSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  dateRangeSelector: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 8, padding: 4 },
  dateRangeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  dateRangeBtnActive: { backgroundColor: '#1F2937' },
  dateRangeBtnText: { color: '#6B7280', fontSize: 12, fontWeight: '600' },
  dateRangeBtnTextActive: { color: '#FFF' },
  statsGridFull: { gap: 12 },
  statCardFull: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' },
  statCardFullValue: { fontSize: 24, fontWeight: '800', color: '#FFF', marginLeft: 12 },
  statCardFullLabel: { fontSize: 12, color: '#8898AA', marginLeft: 12 },
  
  // Chart
  chartSection: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginTop: 16 },
  chartTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  chartSubtitle: { fontSize: 12, color: '#9CA3AF', marginBottom: 16 },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 120, marginBottom: 16 },
  chartBar: { alignItems: 'center', width: 30 },
  chartBarInner: { width: 8, borderRadius: 4, marginBottom: 2 },
  chartBarLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },
  chartLegend: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  chartLegendItem: { flexDirection: 'row', alignItems: 'center' },
  chartLegendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  chartLegendText: { fontSize: 12, color: '#6B7280' },
  
  // Links Page
  linksHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  addLinkBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#00E55A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addLinkBtnText: { color: '#000', fontWeight: '600', marginLeft: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyStateText: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginTop: 16 },
  emptyStateSubtext: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  linkCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12 },
  linkCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linkName: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  copyBtn: { padding: 4 },
  linkCode: { fontSize: 14, color: '#3B82F6', marginTop: 4, marginBottom: 12 },
  linkStats: { flexDirection: 'row', justifyContent: 'space-between' },
  linkStat: { alignItems: 'center' },
  linkStatValue: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  linkStatLabel: { fontSize: 11, color: '#9CA3AF' },
  
  // TOP 10
  top10Card: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  top10CardTop: { borderWidth: 1, borderColor: '#FFD700' },
  top10Rank: { width: 40, alignItems: 'center' },
  top10RankText: { fontSize: 16, fontWeight: '700', color: '#9CA3AF' },
  top10Info: { flex: 1, marginLeft: 12 },
  top10Name: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  top10Level: { fontSize: 12, color: '#9CA3AF' },
  top10Earnings: { alignItems: 'flex-end' },
  top10EarningsValue: { fontSize: 16, fontWeight: '700', color: '#00E55A' },
  top10EarningsLabel: { fontSize: 11, color: '#9CA3AF' },
  
  // Promo Materials
  promoCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  promoPreview: { width: 80, height: 50, backgroundColor: '#F3F4F6', borderRadius: 8, overflow: 'hidden' },
  promoImage: { width: '100%', height: '100%' },
  promoInfo: { flex: 1, marginLeft: 12 },
  promoName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  promoSize: { fontSize: 12, color: '#9CA3AF' },
  promoDownloadBtn: { padding: 8 },
  
  // Support
  supportCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 30, alignItems: 'center' },
  supportTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginTop: 16 },
  supportText: { fontSize: 14, color: '#6B7280', marginTop: 8, marginBottom: 24 },
  telegramSupportBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0088CC', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  telegramSupportText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginLeft: 10 },
  supportEmail: { fontSize: 13, color: '#9CA3AF', marginTop: 16 },
});
