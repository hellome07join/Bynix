import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const AFFILIATE_LEVELS = [
  { level: 1, name: 'Starter', icon: 'person', color: '#3B82F6', deposits: '0-14', revenue: 50, turnover: 2 },
  { level: 2, name: 'Advanced', icon: 'person', color: '#3B82F6', deposits: '15-49', revenue: 55, turnover: 2.5 },
  { level: 3, name: 'Professional', icon: 'person', color: '#3B82F6', deposits: '50-99', revenue: 60, turnover: 3 },
  { level: 4, name: 'Expert', icon: 'star', color: '#A855F7', deposits: '100-199', revenue: 65, turnover: 3.5 },
  { level: 5, name: 'Master', icon: 'trophy', color: '#A855F7', deposits: '200-399', revenue: 70, turnover: 4 },
  { level: 6, name: 'Elite', icon: 'diamond', color: '#F59E0B', deposits: '400+', revenue: 80, turnover: 5 },
];

const FEATURES = [
  { icon: 'stats-chart', title: 'Detailed Statistics', desc: 'Track your campaigns with our advanced analytics dashboard. Monitor clicks, registrations, and earnings in real-time.' },
  { icon: 'flash', title: 'High Conversion Rates', desc: 'Our advertising team tests all landing pages and marketing materials for maximum effectiveness.' },
  { icon: 'globe', title: 'Wide Geographical Coverage', desc: 'Attract clients from anywhere in the world and work with the countries that suit your needs.' },
  { icon: 'cash', title: 'Weekly Payouts', desc: 'Get your earnings every week with multiple convenient payment methods including crypto.' },
];

const EARN_WITH_US = [
  { icon: 'globe-outline', title: 'Do you have a personal traffic source?', desc: 'Your website, forum, YouTube channel, social media account, or other sources of traffic.' },
  { icon: 'analytics-outline', title: 'Are you involved in traffic arbitrage?', desc: 'We work with all types of advertising networks and other means of traffic sources.' },
  { icon: 'school-outline', title: 'Do you provide services in trading?', desc: 'Training courses, trading webinars, trade signal services, financial consultations.' },
];

const OPPORTUNITIES = [
  { icon: 'gift', title: 'Personalized Offers', desc: 'Tailored deals for traffic arbitrage teams and market influencers to maximize your earnings.' },
  { icon: 'wallet', title: 'Traffic Spend Compensation', desc: 'Top performers can receive up to 100% reimbursement of their traffic spend.' },
  { icon: 'ribbon', title: 'Exclusive Bonuses', desc: 'Special bonuses and rewards for high-performing affiliates.' },
];

export default function AffiliateHomePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState({ traders: 65026410, partners: 368270, earned: 5264720 });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <View style={styles.logoIcon}>
              <Ionicons name="trending-up" size={20} color="#FFF" />
            </View>
            <View>
              <Text style={styles.logoText}>BYNIX</Text>
              <Text style={styles.logoSubtext}>AFFILIATE CENTER</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
            <Ionicons name="person" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>
            Bynix presents a lucrative and transparent affiliate program designed to boost your profitability
          </Text>
          <Text style={styles.heroDesc}>
            Lightweight, fast, and intuitive platform. Partner's commission is up to 80% on revenue and up to 5% on turnover. Weekly payouts. Loyal and responsive support service.
          </Text>
          <TouchableOpacity style={styles.tryNowBtn} onPress={() => router.push('/register')}>
            <Text style={styles.tryNowText}>TRY NOW</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.traders.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Active traders</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.partners.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Thriving partners</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#00E55A' }]}>{stats.earned.toLocaleString()} $</Text>
            <Text style={[styles.statLabel, { color: '#00E55A' }]}>Earned by our partners{'\n'}over the past week</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>WEEKLY PAYOUTS WITH CONVENIENT METHODS</Text>
          <View style={styles.paymentMethods}>
            <View style={styles.paymentItem}><Text style={styles.paymentText}>💳 VISA</Text></View>
            <View style={styles.paymentItem}><Text style={styles.paymentText}>₮ Tether</Text></View>
            <View style={styles.paymentItem}><Text style={styles.paymentText}>💰 Perfect Money</Text></View>
            <View style={styles.paymentItem}><Text style={styles.paymentText}>AND MORE</Text></View>
          </View>
        </View>

        {/* Anyone Can Earn Section */}
        <View style={styles.earnSection}>
          <Text style={styles.sectionTitle}>Anyone can earn with us</Text>
          {EARN_WITH_US.map((item, idx) => (
            <View key={idx} style={styles.earnCard}>
              <View style={styles.earnIcon}>
                <Ionicons name={item.icon as any} size={28} color="#3B82F6" />
              </View>
              <View style={styles.earnContent}>
                <Text style={styles.earnTitle}>{item.title}</Text>
                <Text style={styles.earnDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Easy and Profitable Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>It is easy and profitable to work with us!</Text>
          {FEATURES.map((item, idx) => (
            <View key={idx} style={styles.featureItem}>
              <View style={styles.featureIconWrap}>
                <Ionicons name={item.icon as any} size={22} color="#3B82F6" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{item.title}</Text>
                <Text style={styles.featureDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Affiliate Levels */}
        <View style={styles.levelsSection}>
          <Text style={styles.sectionTitle}>Enhanced Affiliate Level Cards</Text>
          <Text style={styles.levelsSubtitle}>
            Visually appealing cards that clearly outline the benefits and requirements of each level.
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.levelsScroll}>
            {AFFILIATE_LEVELS.map((level) => (
              <View key={level.level} style={styles.levelCard}>
                <Text style={styles.levelLabel}>LEVEL {level.level}</Text>
                <View style={styles.levelHeader}>
                  <View style={[styles.levelIconWrap, { backgroundColor: level.color }]}>
                    <Ionicons name={level.icon as any} size={18} color="#FFF" />
                  </View>
                  <Text style={styles.levelName}>{level.name}</Text>
                </View>
                
                <View style={styles.levelRow}>
                  <Text style={styles.levelRowLabel}>Deposits Required:</Text>
                  <Text style={styles.levelRowValue}>{level.deposits}</Text>
                </View>
                <View style={styles.levelProgress}>
                  <View style={[styles.levelProgressBar, { width: `${level.revenue}%`, backgroundColor: level.color }]} />
                </View>
                
                <View style={styles.levelRow}>
                  <Text style={styles.levelRowLabel}>Revenue Share:</Text>
                  <Text style={styles.levelRowValue}>{level.revenue}%</Text>
                </View>
                <View style={styles.levelProgress}>
                  <View style={[styles.levelProgressBar, { width: `${level.revenue}%`, backgroundColor: level.color }]} />
                </View>
                
                <View style={styles.levelRow}>
                  <Text style={styles.levelRowLabel}>Turnover Share:</Text>
                  <Text style={styles.levelRowValue}>{level.turnover}%</Text>
                </View>
                <View style={styles.levelProgress}>
                  <View style={[styles.levelProgressBar, { width: `${level.turnover * 20}%`, backgroundColor: level.color }]} />
                </View>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.joinBtn} onPress={() => router.push('/register')}>
            <Text style={styles.joinBtnText}>JOIN NOW</Text>
          </TouchableOpacity>
        </View>

        {/* Exclusive Opportunities */}
        <View style={styles.opportunitiesSection}>
          <Text style={styles.sectionTitleItalic}>Exclusive Opportunities for Our Partners</Text>
          <Text style={styles.opportunitiesSubtitle}>
            At Bynix, we go beyond standard affiliate programs by offering unique benefits to our partners.
          </Text>
          {OPPORTUNITIES.map((item, idx) => (
            <View key={idx} style={styles.opportunityCard}>
              <View style={styles.opportunityIcon}>
                <Ionicons name={item.icon as any} size={24} color="#00E55A" />
              </View>
              <View style={styles.opportunityContent}>
                <Text style={styles.opportunityTitle}>{item.title}</Text>
                <Text style={styles.opportunityDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Ready to Start Earning?</Text>
          <Text style={styles.ctaDesc}>Join thousands of successful affiliates and start earning today!</Text>
          <TouchableOpacity style={styles.startEarningBtn} onPress={() => router.push('/register')}>
            <Text style={styles.startEarningText}>START EARNING</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2024 Bynix Affiliate Program. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  logoSubtext: {
    fontSize: 8,
    color: '#E53935',
    fontWeight: '600',
    letterSpacing: 1,
  },
  loginBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hero: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 16,
  },
  heroDesc: {
    fontSize: 14,
    color: '#8898AA',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  tryNowBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 30,
  },
  tryNowText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 30,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    textDecorationLine: 'underline',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#8898AA',
    textAlign: 'center',
  },
  paymentSection: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  paymentTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 16,
  },
  paymentMethods: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  paymentItem: {
    marginHorizontal: 10,
    marginVertical: 4,
  },
  paymentText: {
    fontSize: 12,
    color: '#8898AA',
    fontWeight: '600',
  },
  earnSection: {
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  earnCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  earnIcon: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  earnContent: {
    flex: 1,
  },
  earnTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1F36',
    marginBottom: 4,
  },
  earnDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  featuresSection: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 24,
    paddingLeft: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  featureIconWrap: {
    marginRight: 12,
    marginTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    color: '#8898AA',
    lineHeight: 20,
  },
  levelsSection: {
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  levelsSubtitle: {
    fontSize: 13,
    color: '#8898AA',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  levelsScroll: {
    marginBottom: 24,
  },
  levelCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginRight: 16,
    width: 200,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  levelLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8898AA',
    marginBottom: 8,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  levelName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1F36',
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  levelRowLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  levelRowValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1F36',
  },
  levelProgress: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 12,
  },
  levelProgressBar: {
    height: 4,
    borderRadius: 2,
  },
  joinBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  joinBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  opportunitiesSection: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  sectionTitleItalic: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  opportunitiesSubtitle: {
    fontSize: 13,
    color: '#8898AA',
    textAlign: 'center',
    marginBottom: 24,
  },
  opportunityCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  opportunityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 229, 90, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  opportunityContent: {
    flex: 1,
  },
  opportunityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  opportunityDesc: {
    fontSize: 12,
    color: '#8898AA',
    lineHeight: 18,
  },
  ctaSection: {
    paddingVertical: 50,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 12,
  },
  ctaDesc: {
    fontSize: 14,
    color: '#8898AA',
    textAlign: 'center',
    marginBottom: 24,
  },
  startEarningBtn: {
    backgroundColor: '#00E55A',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 8,
  },
  startEarningText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },
  footer: {
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#6B7280',
  },
});
