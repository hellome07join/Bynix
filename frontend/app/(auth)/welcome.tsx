import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  Alert, 
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { API_URL } from '../../utils/api';

const { width, height } = Dimensions.get('window');

// Animated Background Particle
const FloatingParticle = ({ delay, startX, size }: { delay: number, startX: number, size: number }) => {
  const translateY = useRef(new Animated.Value(height + 50)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100,
            duration: 15000 + Math.random() * 5000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: (Math.random() - 0.5) * 100,
            duration: 15000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.6,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.delay(10000),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 3000,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.timing(translateY, {
          toValue: height + 50,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#00E55A',
        transform: [{ translateY }, { translateX }],
        opacity,
      }}
    />
  );
};

// Pulsing Ring Animation
const PulsingRing = ({ size, delay }: { size: number, delay: number }) => {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.5,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 0.8,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.5,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: '#00E55A',
        transform: [{ scale }],
        opacity,
      }}
    />
  );
};

export default function Welcome() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Hero button pulse
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(heroScale, {
          toValue: 1.02,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(heroScale, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const handleStartDemo = async () => {
    setIsLoading(true);
    try {
      const timestamp = Date.now();
      const demoEmail = `demo_${timestamp}@bynix.com`;
      const demoPassword = `demo_${timestamp}`;
      
      const signupResponse = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: demoEmail,
          password: demoPassword,
          name: 'Demo Trader'
        })
      });
      
      if (!signupResponse.ok) throw new Error('Failed to create demo account');
      
      const signupData = await signupResponse.json();
      
      await login(signupData.access_token, {
        user_id: signupData.user.user_id,
        email: signupData.user.email,
        name: signupData.user.name || 'Demo Trader',
        demo_balance: signupData.user.demo_balance || 10000,
        real_balance: signupData.user.real_balance || 0,
        bonus_balance: signupData.user.bonus_balance || 0,
        is_admin: false,
      });
      
      router.replace('/(tabs)/trade');
    } catch (error) {
      console.error('Demo account error:', error);
      Alert.alert('Error', 'Failed to create demo account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate particles
  const particles = Array.from({ length: 20 }, (_, i) => ({
    startX: Math.random() * width,
    delay: i * 800,
    size: 4 + Math.random() * 6,
  }));

  const assetCategories = [
    { name: 'Forex', icon: 'currency-usd', color: '#00E55A' },
    { name: 'Crypto', icon: 'bitcoin', color: '#F7931A' },
    { name: 'Stocks', icon: 'chart-line', color: '#4A90E2' },
    { name: 'Indices', icon: 'chart-bar', color: '#9B59B6' },
    { name: 'Commodities', icon: 'gold', color: '#FFD700' },
  ];

  const howItWorks = [
    { 
      icon: 'wallet-outline', 
      title: 'Deposit', 
      desc: 'Add funds instantly with crypto or local payment. Fast & secure.',
      gradient: ['#00E55A20', '#00E55A05']
    },
    { 
      icon: 'trending-up', 
      title: 'Trade', 
      desc: 'Trade 100+ assets with real-time charts and AI-powered signals.',
      gradient: ['#4A90E220', '#4A90E205']
    },
    { 
      icon: 'cash-outline', 
      title: 'Withdraw', 
      desc: 'Get your profits easily to your preferred payment method.',
      gradient: ['#FFB80020', '#FFB80005']
    },
  ];

  const stats = [
    { value: '$10', label: 'Min Deposit', color: '#00E55A' },
    { value: '$1', label: 'Min Trade', color: '#4A90E2' },
    { value: '0%', label: 'Commission', color: '#9B59B6' },
    { value: '24/7', label: 'Support', color: '#FFB800' },
  ];

  const brandLogos = ['apple', 'google', 'amazon', 'microsoft', 'facebook'];

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#0A0E17', '#0D1321', '#0A0E17']}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating Particles */}
      {particles.map((p, i) => (
        <FloatingParticle key={i} {...p} />
      ))}

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Ionicons name="trending-up" size={20} color="#0A0E17" />
            </View>
            <Text style={styles.logoText}>Bynix</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.loginBtn}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.loginBtnText}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.registerBtn}
              onPress={() => router.push('/(auth)/signup')}
            >
              <Text style={styles.registerBtnText}>Register</Text>
              <Ionicons name="chevron-forward" size={16} color="#00E55A" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          {/* Animated Background Elements */}
          <View style={styles.heroGlowContainer}>
            <PulsingRing size={200} delay={0} />
            <PulsingRing size={250} delay={500} />
            <PulsingRing size={300} delay={1000} />
          </View>

          {/* Phone Mockup */}
          <View style={styles.phoneMockup}>
            <LinearGradient
              colors={['#1A1F2E', '#0D1321']}
              style={styles.phoneScreen}
            >
              {/* Mini Chart */}
              <View style={styles.miniChart}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartPair}>BTC/USD</Text>
                  <Text style={styles.chartPrice}>$67,432.50</Text>
                </View>
                <View style={styles.chartBars}>
                  {[40, 60, 45, 70, 55, 80, 65, 90, 75, 85].map((h, i) => (
                    <View 
                      key={i} 
                      style={[
                        styles.chartBar, 
                        { height: h, backgroundColor: i % 2 === 0 ? '#00E55A' : '#FF4757' }
                      ]} 
                    />
                  ))}
                </View>
              </View>
              {/* Quick Actions */}
              <View style={styles.phoneActions}>
                <View style={[styles.phoneActionBtn, { backgroundColor: '#00E55A20' }]}>
                  <Ionicons name="arrow-up" size={14} color="#00E55A" />
                  <Text style={[styles.phoneActionText, { color: '#00E55A' }]}>UP</Text>
                </View>
                <View style={[styles.phoneActionBtn, { backgroundColor: '#FF475720' }]}>
                  <Ionicons name="arrow-down" size={14} color="#FF4757" />
                  <Text style={[styles.phoneActionText, { color: '#FF4757' }]}>DOWN</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Asset Tags Floating */}
          <View style={styles.assetTagsContainer}>
            {assetCategories.map((cat, i) => (
              <View 
                key={i} 
                style={[
                  styles.assetTag,
                  { 
                    left: 20 + (i % 3) * 100,
                    top: 80 + Math.floor(i / 3) * 50 + (i % 2) * 20,
                    borderColor: cat.color + '60'
                  }
                ]}
              >
                <MaterialCommunityIcons name={cat.icon as any} size={14} color={cat.color} />
                <Text style={[styles.assetTagText, { color: cat.color }]}>{cat.name}</Text>
              </View>
            ))}
          </View>

          {/* Hero Text */}
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroTitle}>
              <Text style={styles.heroTitleGreen}>Trade Smarter</Text>
              {'\n'}With Bynix
            </Text>
            <Text style={styles.heroSubtitle}>
              Experience the future of trading with AI-powered insights,{'\n'}
              real-time charts, and instant execution.
            </Text>
          </View>

          {/* CTA Button */}
          <Animated.View style={{ transform: [{ scale: heroScale }] }}>
            <TouchableOpacity 
              style={styles.ctaButton}
              onPress={handleStartDemo}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#00E55A', '#00C853']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#0A0E17" />
                ) : (
                  <>
                    <Text style={styles.ctaText}>Start Trading</Text>
                    <Ionicons name="arrow-forward" size={20} color="#0A0E17" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Brand Logos */}
          <View style={styles.brandSection}>
            <Text style={styles.brandTitle}>Trade popular assets</Text>
            <View style={styles.brandLogos}>
              {brandLogos.map((brand, i) => (
                <View key={i} style={styles.brandLogo}>
                  <FontAwesome5 name={brand} size={20} color="#666" />
                </View>
              ))}
              <View style={styles.brandMore}>
                <Text style={styles.brandMoreText}>+100</Text>
              </View>
            </View>
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          {howItWorks.map((item, i) => (
            <View key={i} style={styles.howItWorksCard}>
              <LinearGradient
                colors={item.gradient as [string, string]}
                style={styles.howItWorksGradient}
              >
                <View style={styles.howItWorksIcon}>
                  <Ionicons name={item.icon as any} size={24} color="#00E55A" />
                </View>
                <View style={styles.howItWorksContent}>
                  <Text style={styles.howItWorksTitle}>{item.title}</Text>
                  <Text style={styles.howItWorksDesc}>{item.desc}</Text>
                </View>
              </LinearGradient>
            </View>
          ))}
        </View>

        {/* Trust Section */}
        <View style={styles.trustSection}>
          <View style={styles.trustIcon}>
            <Ionicons name="shield-checkmark" size={32} color="#00E55A" />
          </View>
          <Text style={styles.trustTitle}>Trusted Platform</Text>
          <Text style={styles.trustDesc}>
            Join thousands of traders worldwide.{'\n'}
            Secure, fast, and reliable trading experience.
          </Text>
          <TouchableOpacity 
            style={styles.learnMoreBtn}
            onPress={() => router.push('/(auth)/signup')}
          >
            <Text style={styles.learnMoreText}>Create Account</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Global Trading Platform</Text>
          <View style={styles.statsGrid}>
            {stats.map((stat, i) => (
              <View key={i} style={styles.statCard}>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.statsSubtext}>
            Traders from 50+ countries trust Bynix
          </Text>
        </View>

        {/* World Map Section */}
        <View style={styles.worldSection}>
          <View style={styles.worldMap}>
            {/* Simplified dot pattern representing world map */}
            {Array.from({ length: 100 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.mapDot,
                  {
                    left: `${(i % 20) * 5}%`,
                    top: `${Math.floor(i / 20) * 20}%`,
                    opacity: Math.random() > 0.3 ? 0.3 : 0.1,
                  }
                ]}
              />
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLogo}>
            <View style={styles.logoIcon}>
              <Ionicons name="trending-up" size={16} color="#0A0E17" />
            </View>
            <Text style={styles.footerLogoText}>Bynix</Text>
          </View>
          <Text style={styles.footerDesc}>
            The next generation trading platform.{'\n'}
            Trade forex, crypto, stocks, and more.
          </Text>
          
          <View style={styles.footerLinks}>
            <View style={styles.footerLinkColumn}>
              <Text style={styles.footerLinkTitle}>Platform</Text>
              <Text style={styles.footerLink}>Trade</Text>
              <Text style={styles.footerLink}>Markets</Text>
              <Text style={styles.footerLink}>Education</Text>
            </View>
            <View style={styles.footerLinkColumn}>
              <Text style={styles.footerLinkTitle}>Company</Text>
              <Text style={styles.footerLink}>About</Text>
              <Text style={styles.footerLink}>Contact</Text>
              <Text style={styles.footerLink}>Support</Text>
            </View>
            <View style={styles.footerLinkColumn}>
              <Text style={styles.footerLinkTitle}>Legal</Text>
              <Text style={styles.footerLink}>Terms</Text>
              <Text style={styles.footerLink}>Privacy</Text>
              <Text style={styles.footerLink}>AML & KYC</Text>
            </View>
          </View>

          <View style={styles.footerDivider} />
          
          <Text style={styles.footerDisclaimer}>
            Trading involves significant risk. Only invest what you can afford to lose.
            Past performance is not indicative of future results.
          </Text>
          
          <Text style={styles.footerCopyright}>
            © 2024 Bynix. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E17',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#00E55A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loginBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#00E55A',
    borderRadius: 8,
  },
  registerBtnText: {
    color: '#00E55A',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },

  // Hero Section
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'center',
    minHeight: height * 0.75,
  },
  heroGlowContainer: {
    position: 'absolute',
    top: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneMockup: {
    width: width * 0.55,
    height: 280,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#1A1F2E',
    marginBottom: 20,
    shadowColor: '#00E55A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  phoneScreen: {
    flex: 1,
    padding: 15,
  },
  miniChart: {
    flex: 1,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  chartPair: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  chartPrice: {
    color: '#00E55A',
    fontSize: 12,
    fontWeight: '700',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
    paddingHorizontal: 5,
  },
  chartBar: {
    width: 12,
    borderRadius: 4,
  },
  phoneActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  phoneActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  phoneActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  assetTagsContainer: {
    position: 'absolute',
    top: 30,
    left: 0,
    right: 0,
    height: 200,
  },
  assetTag: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1F2E90',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  assetTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroTextContainer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 25,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 44,
  },
  heroTitleGreen: {
    color: '#00E55A',
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 15,
  },
  ctaButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#00E55A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 50,
    gap: 10,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A0E17',
  },
  brandSection: {
    marginTop: 40,
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 15,
  },
  brandLogos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  brandLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1F2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandMore: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1A1F2E',
    borderRadius: 15,
  },
  brandMoreText: {
    color: '#00E55A',
    fontSize: 13,
    fontWeight: '600',
  },

  // Section
  section: {
    paddingHorizontal: 20,
    marginTop: 50,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 25,
  },

  // How It Works
  howItWorksCard: {
    marginBottom: 15,
    borderRadius: 16,
    overflow: 'hidden',
  },
  howItWorksGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1A1F2E',
  },
  howItWorksIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#0A0E17',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  howItWorksContent: {
    flex: 1,
  },
  howItWorksTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  howItWorksDesc: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
  },

  // Trust Section
  trustSection: {
    marginTop: 50,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  trustIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#00E55A15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  trustTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  trustDesc: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  learnMoreBtn: {
    backgroundColor: '#00E55A',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  learnMoreText: {
    color: '#0A0E17',
    fontSize: 16,
    fontWeight: '700',
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#1A1F2E',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
  statsSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },

  // World Map
  worldSection: {
    marginTop: 40,
    height: 150,
    overflow: 'hidden',
  },
  worldMap: {
    flex: 1,
    position: 'relative',
  },
  mapDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00E55A',
  },

  // Footer
  footer: {
    marginTop: 50,
    paddingHorizontal: 20,
    paddingTop: 40,
    borderTopWidth: 1,
    borderTopColor: '#1A1F2E',
  },
  footerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  footerLogoText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  footerDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 30,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  footerLinkColumn: {
    flex: 1,
  },
  footerLinkTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  footerLink: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
  },
  footerDivider: {
    height: 1,
    backgroundColor: '#1A1F2E',
    marginBottom: 20,
  },
  footerDisclaimer: {
    fontSize: 11,
    color: '#555',
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  footerCopyright: {
    fontSize: 12,
    color: '#444',
    textAlign: 'center',
  },
});
