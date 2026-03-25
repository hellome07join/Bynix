import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

// Bynix Official Logo
const BYNIX_LOGO_URL = 'https://customer-assets.emergentagent.com/job_bynix-markets/artifacts/lgz5jvli_IMG_3255.png';

const { width } = Dimensions.get('window');

const AFFILIATE_LEVELS = [
  { level: 1, name: 'Starter', icon: 'leaf', color: '#10B981', gradient: ['#10B981', '#059669'], deposits: '0-14', revenue: 50, turnover: 2 },
  { level: 2, name: 'Advanced', icon: 'flash', color: '#3B82F6', gradient: ['#3B82F6', '#2563EB'], deposits: '15-49', revenue: 55, turnover: 2.5 },
  { level: 3, name: 'Professional', icon: 'briefcase', color: '#8B5CF6', gradient: ['#8B5CF6', '#7C3AED'], deposits: '50-99', revenue: 60, turnover: 3 },
  { level: 4, name: 'Expert', icon: 'star', color: '#EC4899', gradient: ['#EC4899', '#DB2777'], deposits: '100-199', revenue: 65, turnover: 3.5 },
  { level: 5, name: 'Master', icon: 'medal', color: '#F59E0B', gradient: ['#F59E0B', '#D97706'], deposits: '200-399', revenue: 70, turnover: 4 },
  { level: 6, name: 'Guru', icon: 'flame', color: '#EF4444', gradient: ['#EF4444', '#DC2626'], deposits: '400-699', revenue: 75, turnover: 4.5 },
  { level: 7, name: 'Legend', icon: 'diamond', color: '#FFD700', gradient: ['#FFD700', '#FFA500'], deposits: '700+', revenue: 85, turnover: 5.5 },
];

const OPPORTUNITIES = [
  { icon: 'gift', gradient: ['#FF6B6B', '#EE5A5A'], title: 'Custom Deals', desc: 'Get personalized commission structures based on your performance and traffic quality.' },
  { icon: 'wallet', gradient: ['#4ECDC4', '#45B7AA'], title: 'Ad Budget Refund', desc: 'Top affiliates receive up to 100% reimbursement on advertising costs.' },
  { icon: 'trophy', gradient: ['#FFE66D', '#FFD93D'], title: '$500K Contests', desc: 'Monthly competitions with massive prize pools for top performers.' },
  { icon: 'rocket', gradient: ['#A855F7', '#9333EA'], title: 'VIP Support', desc: 'Dedicated account manager and priority support for all partners.' },
];

const REVIEWS = [
  { name: 'Rahul K.', country: 'India', flag: '🇮🇳', rating: 5, review: "Best affiliate program I've joined. The support team is incredible and payments are always on time. Made $12K last month!", avatar: 'RK' },
  { name: 'Ahmed M.', country: 'UAE', flag: '🇦🇪', rating: 5, review: "The conversion rates are amazing. My manager helped optimize my campaigns and doubled my earnings in 2 weeks.", avatar: 'AM' },
  { name: 'Sofia L.', country: 'Brazil', flag: '🇧🇷', rating: 5, review: "Finally a program that actually pays well! The dashboard is super easy to use and tracking is real-time.", avatar: 'SL' },
  { name: 'David O.', country: 'Nigeria', flag: '🇳🇬', rating: 5, review: "They support African GEOs which most don't. Crypto payouts make it easy to receive commissions anywhere.", avatar: 'DO' },
];

const STEPS = [
  { num: '01', title: 'Create Account', desc: 'Sign up in 30 seconds and get your unique affiliate link instantly.', icon: 'person-add' },
  { num: '02', title: 'Share & Promote', desc: 'Use our marketing materials or create your own content to attract traders.', icon: 'share-social' },
  { num: '03', title: 'Earn Commissions', desc: 'Get paid up to 80% revenue share weekly via crypto or bank transfer.', icon: 'cash' },
];

// Bynix Logo Component with actual logo image
const BynixLogo = ({ size = 'normal' }: { size?: 'normal' | 'large' }) => {
  const logoSize = size === 'large' ? { width: 180, height: 90 } : { width: 140, height: 70 };
  return (
    <View style={[styles.logoContainer, size === 'large' && styles.logoLarge]}>
      <Image 
        source={{ uri: BYNIX_LOGO_URL }} 
        style={logoSize}
        resizeMode="contain"
      />
    </View>
  );
};

export default function AffiliateHomePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats] = useState({ traders: 65026410, partners: 368270, earned: 5264720 });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <BynixLogo />
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/affiliate/login')}>
            <Ionicons name="log-in-outline" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <LinearGradient colors={['#0A0E1A', '#1A1F36']} style={styles.hero}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>🔥 EARN UP TO 85% COMMISSION</Text>
          </View>
          <Text style={styles.heroTitle}>Turn Your Traffic Into{'\n'}<Text style={styles.heroHighlight}>Passive Income</Text></Text>
          <Text style={styles.heroDesc}>
            Join 368K+ partners earning millions weekly. No limits, instant tracking, weekly payouts.
          </Text>
          <TouchableOpacity style={styles.heroBtn} onPress={() => router.push('/affiliate/login')}>
            <LinearGradient colors={['#00E55A', '#00C94D']} style={styles.heroBtnGradient}>
              <Text style={styles.heroBtnText}>START EARNING NOW</Text>
              <Ionicons name="arrow-forward" size={20} color="#000" />
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{(stats.traders / 1000000).toFixed(1)}M+</Text>
            <Text style={styles.statLabel}>Active Traders</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{(stats.partners / 1000).toFixed(0)}K+</Text>
            <Text style={styles.statLabel}>Partners</Text>
          </View>
          <View style={[styles.statCard, styles.statCardHighlight]}>
            <Text style={[styles.statNum, { color: '#00E55A' }]}>${(stats.earned / 1000000).toFixed(2)}M</Text>
            <Text style={[styles.statLabel, { color: '#00E55A' }]}>Paid Weekly</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>PAYOUT OPTIONS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.paymentScroll}>
            {['BTC', 'USDT', 'ETH', 'VISA', 'Bank', 'PayPal'].map((method, idx) => (
              <View key={idx} style={styles.paymentChip}>
                <Text style={styles.paymentChipText}>{method}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Affiliate Levels - Unique Bynix Design */}
        <View style={styles.levelsSection}>
          <Text style={styles.sectionTitle}>Commission Tiers</Text>
          <Text style={styles.sectionSubtitle}>Level up by bringing more depositing traders</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.levelsScroll}>
            {AFFILIATE_LEVELS.map((level) => (
              <View key={level.level} style={styles.levelCard}>
                <LinearGradient colors={level.gradient} style={styles.levelBadge}>
                  <Ionicons name={level.icon as any} size={20} color="#FFF" />
                </LinearGradient>
                <Text style={styles.levelName}>{level.name}</Text>
                <Text style={styles.levelTier}>TIER {level.level}</Text>
                
                <View style={styles.levelStats}>
                  <View style={styles.levelStatRow}>
                    <Text style={styles.levelStatLabel}>Deposits</Text>
                    <Text style={styles.levelStatValue}>{level.deposits}</Text>
                  </View>
                  <View style={styles.levelStatRow}>
                    <Text style={styles.levelStatLabel}>Revenue</Text>
                    <Text style={[styles.levelStatValue, { color: '#00E55A' }]}>{level.revenue}%</Text>
                  </View>
                  <View style={styles.levelStatRow}>
                    <Text style={styles.levelStatLabel}>Turnover</Text>
                    <Text style={[styles.levelStatValue, { color: '#3B82F6' }]}>{level.turnover}%</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Why Join Bynix - Unique Cards */}
        <View style={styles.opportunitiesSection}>
          <Text style={styles.sectionTitleLight}>Why Partners Choose Bynix</Text>
          <View style={styles.opGrid}>
            {OPPORTUNITIES.map((item, idx) => (
              <View key={idx} style={styles.opCard}>
                <LinearGradient colors={item.gradient} style={styles.opIconWrap}>
                  <Ionicons name={item.icon as any} size={24} color="#FFF" />
                </LinearGradient>
                <Text style={styles.opTitle}>{item.title}</Text>
                <Text style={styles.opDesc}>{item.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Partner Reviews - Unique Style */}
        <View style={styles.reviewsSection}>
          <Text style={styles.sectionTitle}>Partner Success Stories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewsScroll}>
            {REVIEWS.map((review, idx) => (
              <View key={idx} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>{review.avatar}</Text>
                  </View>
                  <View style={styles.reviewInfo}>
                    <Text style={styles.reviewName}>{review.name}</Text>
                    <Text style={styles.reviewCountry}>{review.flag} {review.country}</Text>
                  </View>
                  <View style={styles.reviewRating}>
                    {[...Array(review.rating)].map((_, i) => (
                      <Ionicons key={i} name="star" size={12} color="#FFD700" />
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewText}>"{review.review}"</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* How It Works - Unique Timeline */}
        <View style={styles.stepsSection}>
          <Text style={styles.sectionTitleLight}>How It Works</Text>
          {STEPS.map((step, idx) => (
            <View key={idx} style={styles.stepItem}>
              <View style={styles.stepLeft}>
                <LinearGradient colors={['#00E55A', '#00C94D']} style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{step.num}</Text>
                </LinearGradient>
                {idx < STEPS.length - 1 && <View style={styles.stepLine} />}
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepIconWrap}>
                  <Ionicons name={step.icon as any} size={22} color="#00E55A" />
                </View>
                <View style={styles.stepTextWrap}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Support Section */}
        <View style={styles.supportSection}>
          <View style={styles.supportCard}>
            <Ionicons name="headset" size={40} color="#3B82F6" />
            <Text style={styles.supportTitle}>Need Help?</Text>
            <Text style={styles.supportDesc}>Our affiliate managers are available 24/7</Text>
            <TouchableOpacity style={styles.telegramBtn}>
              <Ionicons name="paper-plane" size={18} color="#FFF" />
              <Text style={styles.telegramBtnText}>@bynix_support</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Registration Form - Unique Design */}
        <View style={styles.registerSection}>
          <LinearGradient colors={['#1A1F36', '#0D1321']} style={styles.registerCard}>
            <BynixLogo size="large" />
            <Text style={styles.registerTitle}>Join Now</Text>
            <Text style={styles.registerSubtitle}>Start earning in minutes</Text>
            
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={20} color="#8898AA" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="#6B7280"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />
            </View>
            
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={20} color="#8898AA" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#6B7280"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
            
            <TouchableOpacity style={styles.termsRow} onPress={() => setAcceptTerms(!acceptTerms)}>
              <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
                {acceptTerms && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </View>
              <Text style={styles.termsText}>I agree to the <Text style={styles.termsLink}>Terms & Conditions</Text></Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.registerBtn}>
              <LinearGradient colors={['#00E55A', '#00C94D']} style={styles.registerBtnGradient}>
                <Text style={styles.registerBtnText}>CREATE ACCOUNT</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.signInRow} onPress={() => router.push('/login')}>
              <Text style={styles.signInText}>Already a partner? <Text style={styles.signInLink}>Sign In</Text></Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <BynixLogo />
          <View style={styles.footerLinks}>
            <TouchableOpacity><Text style={styles.footerLink}>Terms</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.footerLink}>Privacy</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.footerLink}>FAQ</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.footerLink}>Contact</Text></TouchableOpacity>
          </View>
          <Text style={styles.footerCopyright}>© 2026 Bynix. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E1A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoLarge: { justifyContent: 'center' },
  logoIconBox: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  logoIconBoxLarge: { width: 52, height: 52, borderRadius: 14 },
  logoIconText: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  logoIconTextLarge: { fontSize: 28 },
  logoText: { fontSize: 20, fontWeight: '900', color: '#FFF', letterSpacing: 1 },
  logoTextLarge: { fontSize: 26 },
  logoSubtext: { fontSize: 9, color: '#FF4136', fontWeight: '700', letterSpacing: 2 },
  loginBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  
  hero: { paddingHorizontal: 20, paddingVertical: 40, alignItems: 'center' },
  heroBadge: { backgroundColor: 'rgba(255, 65, 54, 0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 20 },
  heroBadgeText: { color: '#FF6B6B', fontSize: 12, fontWeight: '700' },
  heroTitle: { fontSize: 32, fontWeight: '900', color: '#FFF', textAlign: 'center', lineHeight: 40, marginBottom: 16 },
  heroHighlight: { color: '#00E55A' },
  heroDesc: { fontSize: 15, color: '#8898AA', textAlign: 'center', lineHeight: 24, marginBottom: 28, paddingHorizontal: 10 },
  heroBtn: { overflow: 'hidden', borderRadius: 14 },
  heroBtnGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 16 },
  heroBtnText: { color: '#000', fontSize: 16, fontWeight: '800', marginRight: 8 },
  
  statsSection: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 20, gap: 10 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, alignItems: 'center' },
  statCardHighlight: { backgroundColor: 'rgba(0, 229, 90, 0.1)', borderWidth: 1, borderColor: 'rgba(0, 229, 90, 0.3)' },
  statNum: { fontSize: 22, fontWeight: '900', color: '#FFF', marginBottom: 4 },
  statLabel: { fontSize: 10, color: '#8898AA', fontWeight: '600' },
  
  paymentSection: { paddingVertical: 20, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  paymentTitle: { fontSize: 11, fontWeight: '700', color: '#8898AA', textAlign: 'center', letterSpacing: 2, marginBottom: 12 },
  paymentScroll: { paddingHorizontal: 20 },
  paymentChip: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10 },
  paymentChipText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  
  levelsSection: { paddingVertical: 40, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 24, fontWeight: '900', color: '#FFF', textAlign: 'center', marginBottom: 8 },
  sectionSubtitle: { fontSize: 14, color: '#8898AA', textAlign: 'center', marginBottom: 24 },
  levelsScroll: { marginBottom: 8 },
  levelCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, marginRight: 14, width: 160, alignItems: 'center' },
  levelBadge: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  levelName: { fontSize: 18, fontWeight: '800', color: '#FFF', marginBottom: 2 },
  levelTier: { fontSize: 10, color: '#8898AA', fontWeight: '700', letterSpacing: 1, marginBottom: 16 },
  levelStats: { width: '100%' },
  levelStatRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  levelStatLabel: { fontSize: 12, color: '#8898AA' },
  levelStatValue: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  
  opportunitiesSection: { paddingVertical: 40, paddingHorizontal: 20, backgroundColor: '#FFF' },
  sectionTitleLight: { fontSize: 24, fontWeight: '900', color: '#1A1F36', textAlign: 'center', marginBottom: 24 },
  opGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  opCard: { width: '48%', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginBottom: 14 },
  opIconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  opTitle: { fontSize: 15, fontWeight: '700', color: '#1A1F36', marginBottom: 6 },
  opDesc: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
  
  reviewsSection: { paddingVertical: 40, paddingHorizontal: 20 },
  reviewsScroll: { marginTop: 8 },
  reviewCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 18, marginRight: 14, width: 280 },
  reviewTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  reviewAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  reviewAvatarText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  reviewInfo: { flex: 1 },
  reviewName: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  reviewCountry: { fontSize: 12, color: '#8898AA' },
  reviewRating: { flexDirection: 'row' },
  reviewText: { fontSize: 13, color: '#C9D1D9', lineHeight: 20, fontStyle: 'italic' },
  
  stepsSection: { paddingVertical: 40, paddingHorizontal: 20, backgroundColor: '#FFF' },
  stepItem: { flexDirection: 'row', marginBottom: 8 },
  stepLeft: { width: 50, alignItems: 'center' },
  stepNum: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  stepNumText: { color: '#000', fontSize: 12, fontWeight: '800' },
  stepLine: { width: 2, height: 60, backgroundColor: '#E5E7EB', marginTop: 8 },
  stepContent: { flex: 1, flexDirection: 'row', paddingLeft: 12, paddingBottom: 24 },
  stepIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(0, 229, 90, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  stepTextWrap: { flex: 1 },
  stepTitle: { fontSize: 16, fontWeight: '700', color: '#1A1F36', marginBottom: 4 },
  stepDesc: { fontSize: 13, color: '#6B7280', lineHeight: 20 },
  
  supportSection: { paddingVertical: 40, paddingHorizontal: 20 },
  supportCard: { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 20, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.2)' },
  supportTitle: { fontSize: 20, fontWeight: '800', color: '#FFF', marginTop: 16, marginBottom: 8 },
  supportDesc: { fontSize: 14, color: '#8898AA', marginBottom: 20 },
  telegramBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0088CC', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  telegramBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', marginLeft: 10 },
  
  registerSection: { paddingVertical: 40, paddingHorizontal: 20 },
  registerCard: { borderRadius: 24, padding: 28, alignItems: 'center' },
  registerTitle: { fontSize: 28, fontWeight: '900', color: '#FFF', marginTop: 20, marginBottom: 4 },
  registerSubtitle: { fontSize: 14, color: '#8898AA', marginBottom: 28 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, marginBottom: 14, width: '100%' },
  inputIcon: { paddingLeft: 16 },
  input: { flex: 1, paddingVertical: 16, paddingHorizontal: 12, fontSize: 15, color: '#FFF' },
  termsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, alignSelf: 'flex-start' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#6B7280', marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#00E55A', borderColor: '#00E55A' },
  termsText: { fontSize: 13, color: '#8898AA' },
  termsLink: { color: '#3B82F6' },
  registerBtn: { width: '100%', overflow: 'hidden', borderRadius: 14, marginBottom: 16 },
  registerBtnGradient: { paddingVertical: 18, alignItems: 'center' },
  registerBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },
  signInRow: { alignItems: 'center' },
  signInText: { fontSize: 14, color: '#8898AA' },
  signInLink: { color: '#00E55A', fontWeight: '700' },
  
  footer: { paddingVertical: 32, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  footerLinks: { flexDirection: 'row', marginTop: 20, marginBottom: 16 },
  footerLink: { fontSize: 14, color: '#8898AA', marginHorizontal: 12 },
  footerCopyright: { fontSize: 12, color: '#6B7280' },
});
