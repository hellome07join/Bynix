import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const AFFILIATE_LEVELS = [
  { level: 1, name: 'Starter', icon: 'person', color: '#3B82F6', deposits: '0-14', revenue: 50, turnover: 2 },
  { level: 2, name: 'Advanced', icon: 'person', color: '#3B82F6', deposits: '15-49', revenue: 55, turnover: 2.5 },
  { level: 3, name: 'Professional', icon: 'person', color: '#3B82F6', deposits: '50-99', revenue: 60, turnover: 3 },
  { level: 4, name: 'Expert', icon: 'star', color: '#A855F7', deposits: '100-199', revenue: 65, turnover: 3.5 },
  { level: 5, name: 'Master', icon: 'trophy', color: '#F59E0B', deposits: '200-399', revenue: 70, turnover: 4 },
  { level: 6, name: 'Guru', icon: 'medal', color: '#EF4444', deposits: '400-699', revenue: 75, turnover: 4.5 },
  { level: 7, name: 'Legend', icon: 'diamond', color: '#F59E0B', deposits: '700+', revenue: 80, turnover: 5 },
];

const OPPORTUNITIES = [
  { icon: 'rocket', color: '#3B82F6', title: 'Personalized Offers', desc: 'Tailored deals for traffic arbitrage teams and market influencers to maximize your earnings.' },
  { icon: 'cash', color: '#10B981', title: 'Traffic Spend Compensation', desc: 'Eligible top performers can receive up to 100% reimbursement of their traffic spend, unlocking higher ROI and growth opportunities.' },
  { icon: 'trophy', color: '#F59E0B', title: 'Lucrative Competitions', desc: 'Participate in contests with cash prizes up to $500,000, rewarding top-performing affiliates.' },
  { icon: 'trending-up', color: '#F97316', title: 'Proven Track Record', desc: 'Join a network with over 218,000 affiliates generating more than $5.38 million in weekly commissions.' },
];

const REVIEWS = [
  { name: 'Aditi', country: 'India', flag: '🇮🇳', color: '#E0F7FA', review: "I didn't expect much from support at first, but Bynix changed that. Whenever I had questions or needed creatives, my manager actually helped. Payments are always on time, and the bonus system motivates you to grow.", tags: ['#DedicatedManager', '#HighCommissions', '#TrustedPlatform'] },
  { name: 'Nelson', country: 'Nigeria', flag: '🇳🇬', color: '#E8F5E9', review: "Most networks don't care about African GEOs, but Bynix works here. The payments and updates are quick. I'm running campaigns in multiple languages. It's like I'm building a business long-term.", tags: ['#LocalPayments', '#GlobalReach'] },
  { name: 'Maria', country: 'Brazil', flag: '🇧🇷', color: '#FFF3E0', review: "The commission rates are incredible! I've been with other programs before but Bynix pays the best. My manager helped me optimize my campaigns for better conversions.", tags: ['#BestRates', '#GreatSupport'] },
];

const HOW_IT_WORKS = [
  { icon: 'link', color: '#3B82F6', title: 'Acquire your affiliate link', desc: 'Register an account in our system and receive a unique link through which you can earn your commission.' },
  { icon: 'people', color: '#10B981', title: 'Invite new traders', desc: 'Place advertisements to attract maximum traffic.' },
  { icon: 'cash', color: '#00E55A', title: 'Earn a percentage of the profits!', desc: 'Revenue share is up to 80%!' },
];

// Bynix Logo Component
const BynixLogo = ({ size = 'normal' }: { size?: 'normal' | 'large' }) => (
  <View style={[styles.logoContainer, size === 'large' && styles.logoLarge]}>
    <View style={[styles.logoIconBox, size === 'large' && styles.logoIconBoxLarge]}>
      <Text style={[styles.logoIconText, size === 'large' && styles.logoIconTextLarge]}>₿</Text>
    </View>
    <View>
      <Text style={[styles.logoText, size === 'large' && styles.logoTextLarge]}>BYNIX</Text>
      {size === 'normal' && <Text style={styles.logoSubtext}>AFFILIATE CENTER</Text>}
    </View>
  </View>
);

export default function AffiliateHomePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState({ traders: 65026410, partners: 368270, earned: 5264720 });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <BynixLogo />
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

        {/* Affiliate Levels - New Design */}
        <View style={styles.levelsSection}>
          <Text style={styles.sectionTitle}>Enhanced Affiliate Level Cards</Text>
          <Text style={styles.levelsSubtitle}>
            To make the affiliate levels more engaging and informative, we can design visually appealing cards that clearly outline the benefits and requirements of each level.
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
                  <View style={[styles.levelProgressBar, { width: `${Math.min(level.revenue, 100)}%`, backgroundColor: level.color }]} />
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
              <View style={[styles.opportunityIcon, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </View>
              <View style={styles.opportunityContent}>
                <Text style={styles.opportunityTitle}>{item.title}</Text>
                <Text style={styles.opportunityDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
          <Text style={styles.opportunityFooter}>
            These exclusive opportunities are designed to provide our partners with unparalleled support and incentives. By joining Bynix, you're aligning with a program that values and rewards your efforts.
          </Text>
          <TouchableOpacity style={styles.partnerBtn} onPress={() => router.push('/register')}>
            <Text style={styles.partnerBtnText}>BECOME A PARTNER</Text>
          </TouchableOpacity>
        </View>

        {/* Partner Reviews */}
        <View style={styles.reviewsSection}>
          <Text style={styles.sectionTitle}>Partner reviews</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewsScroll}>
            {REVIEWS.map((review, idx) => (
              <View key={idx} style={[styles.reviewCard, { backgroundColor: review.color }]}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAvatar}>
                    <Ionicons name="person" size={28} color="#3B82F6" />
                  </View>
                  <View>
                    <Text style={styles.reviewName}>{review.name}</Text>
                    <Text style={styles.reviewCountry}>{review.flag} {review.country}</Text>
                  </View>
                </View>
                <Text style={styles.reviewText}>{review.review}</Text>
                <View style={styles.reviewTags}>
                  {review.tags.map((tag, i) => (
                    <View key={i} style={styles.reviewTag}>
                      <Text style={styles.reviewTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* How Collaboration Works */}
        <View style={styles.howItWorksSection}>
          <Text style={styles.howItWorksTitle}>How collaboration with us works:</Text>
          <View style={styles.stepsContainer}>
            {HOW_IT_WORKS.map((step, idx) => (
              <View key={idx} style={styles.stepItem}>
                <View style={styles.stepLine}>
                  <View style={[styles.stepDot, { backgroundColor: step.color }]}>
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                  </View>
                  {idx < HOW_IT_WORKS.length - 1 && <View style={styles.stepConnector} />}
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.partnerBtn} onPress={() => router.push('/register')}>
            <Text style={styles.partnerBtnText}>BECOME A PARTNER</Text>
          </TouchableOpacity>
        </View>

        {/* Support Contact */}
        <View style={styles.supportSection}>
          <Text style={styles.supportTitle}>Do you have any remaining questions?{'\n'}Contact our support service to get the answers you need!</Text>
          <TouchableOpacity style={styles.telegramBtn}>
            <Ionicons name="send" size={20} color="#FFF" />
            <Text style={styles.telegramText}>@bynix_affiliate</Text>
          </TouchableOpacity>
        </View>

        {/* Registration Form */}
        <View style={styles.registrationSection}>
          <View style={styles.registrationCard}>
            <View style={styles.regLogoWrap}>
              <BynixLogo size="large" />
            </View>
            <Text style={styles.registrationTitle}>Registration</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity style={styles.termsRow} onPress={() => setAcceptTerms(!acceptTerms)}>
              <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
                {acceptTerms && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </View>
              <Text style={styles.termsText}>I accept the <Text style={styles.termsLink}>Terms and Conditions</Text>.</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.registerBtn}>
              <Text style={styles.registerBtnText}>Register</Text>
            </TouchableOpacity>
            <View style={styles.signInRow}>
              <Text style={styles.signInText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.signInLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerCopyright}>© Bynix 2026. All right reserved</Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity><Text style={styles.footerLink}>Affiliate agreement</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.footerLink}>Registration</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/login')}><Text style={styles.footerLink}>Sign In</Text></TouchableOpacity>
          </View>
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
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoLarge: {
    justifyContent: 'center',
  },
  logoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoIconBoxLarge: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  logoIconText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  logoIconTextLarge: {
    fontSize: 26,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  logoTextLarge: {
    fontSize: 24,
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
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 30,
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
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    textDecorationLine: 'underline',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#8898AA',
    textAlign: 'center',
  },
  paymentSection: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  paymentTitle: {
    fontSize: 11,
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
    fontSize: 11,
    color: '#8898AA',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 16,
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
    backgroundColor: '#0D1321',
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
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
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
  opportunityFooter: {
    fontSize: 13,
    color: '#8898AA',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 24,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  partnerBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  partnerBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  reviewsSection: {
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  reviewsScroll: {
    marginTop: 8,
  },
  reviewCard: {
    borderRadius: 16,
    padding: 20,
    marginRight: 16,
    width: 280,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reviewName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1F36',
  },
  reviewCountry: {
    fontSize: 12,
    color: '#6B7280',
  },
  reviewText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  reviewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  reviewTag: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  reviewTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  howItWorksSection: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#0D1321',
  },
  howItWorksTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 24,
  },
  stepsContainer: {
    marginBottom: 24,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  stepLine: {
    width: 40,
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepConnector: {
    width: 2,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 4,
  },
  stepContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 24,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 13,
    color: '#8898AA',
    lineHeight: 20,
  },
  supportSection: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 26,
  },
  telegramBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0088CC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
  },
  telegramText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
    textDecorationLine: 'underline',
  },
  registrationSection: {
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  registrationCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
  },
  regLogoWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  registrationTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1F36',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1A1F36',
    marginBottom: 16,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  termsText: {
    fontSize: 14,
    color: '#6B7280',
  },
  termsLink: {
    color: '#3B82F6',
  },
  registerBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  registerBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  signInRow: {
    alignItems: 'center',
  },
  signInText: {
    fontSize: 14,
    color: '#6B7280',
  },
  signInLink: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  footerCopyright: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  footerLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  footerLink: {
    fontSize: 13,
    color: '#8898AA',
    marginHorizontal: 12,
    marginVertical: 4,
  },
});
