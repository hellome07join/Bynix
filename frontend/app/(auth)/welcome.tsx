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
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.4,
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
        transform: [{ translateY }],
        opacity,
      }}
    />
  );
};

// Pulsing Ring Animation
const PulsingRing = ({ size, delay }: { size: number, delay: number }) => {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0.3)).current;

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
            toValue: 0.3,
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
        borderWidth: 1,
        borderColor: '#00E55A40',
        transform: [{ scale }],
        opacity,
      }}
    />
  );
};

// Animated Chart Line for Phone
const AnimatedChartLine = () => {
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: 10,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View style={[styles.chartLineContainer, { transform: [{ translateX }] }]}>
      <View style={styles.chartLine} />
    </Animated.View>
  );
};

export default function Welcome() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const heroScale = useRef(new Animated.Value(1)).current;
  const phoneRotate = useRef(new Animated.Value(0)).current;

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

    // Subtle phone float
    const phoneFloat = Animated.loop(
      Animated.sequence([
        Animated.timing(phoneRotate, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(phoneRotate, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    phoneFloat.start();
    return () => {
      pulse.stop();
      phoneFloat.stop();
    };
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
  const particles = Array.from({ length: 15 }, (_, i) => ({
    startX: Math.random() * width,
    delay: i * 1000,
    size: 3 + Math.random() * 5,
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
      desc: 'Add funds instantly with crypto or local payment.',
      gradient: ['#00E55A15', '#00E55A05']
    },
    { 
      icon: 'trending-up', 
      title: 'Trade', 
      desc: 'Trade 100+ assets with real-time charts.',
      gradient: ['#4A90E215', '#4A90E205']
    },
    { 
      icon: 'cash-outline', 
      title: 'Withdraw', 
      desc: 'Get your profits to your preferred method.',
      gradient: ['#FFB80015', '#FFB80005']
    },
  ];

  const stats = [
    { value: '$10', label: 'Min Deposit', color: '#00E55A' },
    { value: '$1', label: 'Min Trade', color: '#4A90E2' },
    { value: '0%', label: 'Commission', color: '#9B59B6' },
    { value: '24/7', label: 'Support', color: '#FFB800' },
  ];

  const phoneTranslateY = phoneRotate.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

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
              <Ionicons name="trending-up" size={18} color="#0A0E17" />
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
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Section with Phone */}
        <View style={styles.heroSection}>
          {/* Animated Rings */}
          <View style={styles.heroGlowContainer}>
            <PulsingRing size={180} delay={0} />
            <PulsingRing size={220} delay={400} />
            <PulsingRing size={260} delay={800} />
          </View>

          {/* App Rating Badge */}
          <View style={styles.appRatingBadge}>
            <Text style={styles.appRatingLabel}>APP RATING</Text>
            <Text style={styles.appRatingValue}>4.8</Text>
            <View style={styles.starsRow}>
              {[1,2,3,4,5].map((_, i) => (
                <Ionicons key={i} name="star" size={12} color="#FFD700" />
              ))}
            </View>
          </View>

          {/* Phone Mockup */}
          <Animated.View style={[styles.phoneMockupContainer, { transform: [{ translateY: phoneTranslateY }] }]}>
            {/* Phone Outer Frame (Silver/Space Gray) */}
            <View style={styles.phoneOuterFrame}>
              {/* Phone Inner Frame */}
              <View style={styles.phoneFrame}>
                {/* Side Buttons */}
                <View style={styles.phoneSideButtons}>
                  <View style={styles.phoneSideButton} />
                  <View style={[styles.phoneSideButton, { height: 40, marginTop: 10 }]} />
                  <View style={[styles.phoneSideButton, { height: 40, marginTop: 5 }]} />
                </View>
                
                {/* Screen */}
                <View style={styles.phoneScreen}>
                {/* Status Bar */}
                <View style={styles.phoneStatusBar}>
                  <Text style={styles.phoneTime}>9:41</Text>
                  <View style={styles.phoneDynamicIsland} />
                  <View style={styles.phoneStatusIcons}>
                    <Ionicons name="cellular" size={10} color="#FFF" />
                    <Ionicons name="wifi" size={10} color="#FFF" />
                    <Ionicons name="battery-full" size={10} color="#FFF" />
                  </View>
                </View>

                {/* Bynix App Header */}
                <View style={styles.bynixAppHeader}>
                  <View style={styles.depositBadge}>
                    <Ionicons name="gift" size={8} color="#000" />
                    <Text style={styles.depositBadgeText}>200% Deposit</Text>
                  </View>
                  <View style={styles.bynixLogoSmall}>
                    <View style={styles.bynixLogoRing}>
                      <Ionicons name="trending-up" size={12} color="#00E55A" />
                    </View>
                  </View>
                  <View style={styles.balanceBadge}>
                    <Ionicons name="wallet" size={8} color="#00E55A" />
                    <Text style={styles.balanceBadgeText}>$64,696.00</Text>
                  </View>
                </View>

                {/* Timer Row */}
                <View style={styles.timerRow}>
                  <View style={styles.timerBadge}>
                    <Ionicons name="time" size={8} color="#00E55A" />
                    <Text style={styles.timerText}>50s</Text>
                  </View>
                  <Text style={styles.utcText}>UTC 22:39:10</Text>
                  <Text style={styles.currentPrice}>$1.03855</Text>
                </View>

                {/* Chart Area with Candlesticks */}
                <View style={styles.chartArea}>
                  {/* Price levels on right */}
                  <View style={styles.priceLevels}>
                    <Text style={styles.priceLevel}>1.04083</Text>
                    <Text style={styles.priceLevel}>1.04019</Text>
                    <Text style={styles.priceLevel}>1.03956</Text>
                    <Text style={styles.priceLevel}>1.03892</Text>
                  </View>

                  {/* Grid lines */}
                  <View style={styles.chartGridLines}>
                    {[1,2,3,4].map((_, i) => (
                      <View key={i} style={styles.gridLineH} />
                    ))}
                  </View>

                  {/* Candlesticks - matching screenshot pattern */}
                  <View style={styles.candlestickChart}>
                    {[
                      { h: 45, green: false, top: 5 },
                      { h: 40, green: false, top: 10 },
                      { h: 35, green: false, top: 15 },
                      { h: 25, green: true, top: 25 },
                      { h: 20, green: false, top: 30 },
                      { h: 18, green: true, top: 35 },
                      { h: 15, green: false, top: 38 },
                      { h: 12, green: true, top: 45 },
                      { h: 15, green: false, top: 50 },
                      { h: 10, green: true, top: 55 },
                      { h: 12, green: false, top: 52 },
                      { h: 8, green: true, top: 58 },
                      { h: 18, green: false, top: 60 },
                    ].map((candle, i) => (
                      <View key={i} style={[styles.candleCol, { marginTop: candle.top }]}>
                        <View style={[styles.candleWickTop, { backgroundColor: candle.green ? '#00E55A' : '#FF4757' }]} />
                        <View style={[styles.candleBodyNew, { height: candle.h, backgroundColor: candle.green ? '#00E55A' : '#FF4757' }]} />
                        <View style={[styles.candleWickBot, { backgroundColor: candle.green ? '#00E55A' : '#FF4757' }]} />
                      </View>
                    ))}
                  </View>

                  {/* Entry line (dashed) */}
                  <View style={styles.entryLine} />
                </View>

                {/* Toolbar */}
                <View style={styles.toolbarRow}>
                  <View style={styles.toolbarItem}>
                    <Ionicons name="time-outline" size={10} color="#FFB800" />
                    <Text style={styles.toolbarText}>1m</Text>
                  </View>
                  <View style={styles.toolbarItem}>
                    <Ionicons name="build-outline" size={10} color="#FFB800" />
                    <Text style={styles.toolbarText}>Tools</Text>
                  </View>
                  <View style={styles.toolbarItem}>
                    <Ionicons name="swap-horizontal" size={10} color="#FFB800" />
                    <Text style={styles.toolbarText}>Trade</Text>
                  </View>
                  <View style={styles.toolbarItem}>
                    <Text style={styles.pairText}>USD/CHF</Text>
                  </View>
                </View>

                {/* Investment Section */}
                <View style={styles.investmentSection}>
                  <Text style={styles.investmentLabel}>Investment Amount</Text>
                  <View style={styles.investmentRow}>
                    <View style={styles.amountInput}>
                      <Text style={styles.amountText}>$ 100</Text>
                    </View>
                    <View style={styles.quickAmounts}>
                      <View style={styles.quickBtn}><Text style={styles.quickBtnText}>$10</Text></View>
                      <View style={styles.quickBtn}><Text style={styles.quickBtnText}>$50</Text></View>
                      <View style={[styles.quickBtn, styles.quickBtnActive]}><Text style={styles.quickBtnTextActive}>$100</Text></View>
                    </View>
                  </View>
                  <View style={styles.payoutRow}>
                    <Text style={styles.payoutLabel}>You will get:</Text>
                    <Text style={styles.payoutValue}>$195.00</Text>
                  </View>
                </View>

                {/* Trade Buttons */}
                <View style={styles.tradeButtonsRow}>
                  <View style={styles.upButton}>
                    <Ionicons name="arrow-up" size={12} color="#000" />
                    <Text style={styles.upButtonText}>UP</Text>
                    <Text style={styles.percentText}>95%</Text>
                  </View>
                  <View style={styles.downButton}>
                    <Ionicons name="arrow-down" size={12} color="#FFF" />
                    <Text style={styles.downButtonText}>DOWN</Text>
                    <Text style={styles.percentTextDown}>95%</Text>
                  </View>
                </View>

                {/* Bottom Navigation */}
                <View style={styles.bottomNav}>
                  <View style={styles.navItem}>
                    <Ionicons name="trending-up" size={12} color="#00E55A" />
                    <Text style={[styles.navText, { color: '#00E55A' }]}>Trade</Text>
                  </View>
                  <View style={styles.navItem}>
                    <Ionicons name="trophy-outline" size={12} color="#666" />
                    <Text style={styles.navText}>Leaderboard</Text>
                  </View>
                  <View style={styles.navItem}>
                    <Ionicons name="headset-outline" size={12} color="#666" />
                    <Text style={styles.navText}>Support</Text>
                  </View>
                  <View style={styles.navItem}>
                    <Ionicons name="person-outline" size={12} color="#666" />
                    <Text style={styles.navText}>Profile</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
          </Animated.View>

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

          {/* Asset Categories */}
          <View style={styles.assetCategoriesRow}>
            {assetCategories.map((cat, i) => (
              <View key={i} style={[styles.assetCategoryTag, { borderColor: cat.color + '50' }]}>
                <MaterialCommunityIcons name={cat.icon as any} size={12} color={cat.color} />
                <Text style={[styles.assetCategoryText, { color: cat.color }]}>{cat.name}</Text>
              </View>
            ))}
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
                  <Ionicons name={item.icon as any} size={22} color="#00E55A" />
                </View>
                <View style={styles.howItWorksContent}>
                  <Text style={styles.howItWorksTitle}>{item.title}</Text>
                  <Text style={styles.howItWorksDesc}>{item.desc}</Text>
                </View>
              </LinearGradient>
            </View>
          ))}
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
        </View>

        {/* Mobile App Section */}
        <View style={styles.mobileAppSection}>
          <View style={styles.mobileAppContent}>
            <Text style={styles.mobileAppTitle}>
              Mobile app is always{'\n'}at your fingertips
            </Text>
            <Text style={styles.mobileAppDesc}>
              Download our user-friendly trading app to your mobile device and start trading.
            </Text>
            <View style={styles.appStoreButtons}>
              <TouchableOpacity style={styles.appStoreBtn}>
                <Ionicons name="logo-google-playstore" size={20} color="#FFF" />
                <View>
                  <Text style={styles.appStoreLabelSmall}>GET IT ON</Text>
                  <Text style={styles.appStoreLabelBig}>Google Play</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.appStoreBtn, { backgroundColor: '#FFF' }]}>
                <Ionicons name="globe-outline" size={20} color="#000" />
                <View>
                  <Text style={[styles.appStoreLabelSmall, { color: '#666' }]}>Progressive</Text>
                  <Text style={[styles.appStoreLabelBig, { color: '#000' }]}>Web App</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {/* Logo */}
          <View style={styles.footerLogo}>
            <View style={[styles.logoIcon, { width: 28, height: 28 }]}>
              <Ionicons name="trending-up" size={14} color="#0A0E17" />
            </View>
            <Text style={styles.footerLogoText}>Bynix</Text>
          </View>

          {/* Social Links */}
          <View style={styles.socialLinks}>
            <TouchableOpacity style={styles.socialBtn}>
              <Ionicons name="logo-telegram" size={20} color="#00E55A" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn}>
              <Ionicons name="logo-twitter" size={20} color="#00E55A" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn}>
              <Ionicons name="logo-instagram" size={20} color="#00E55A" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn}>
              <Ionicons name="logo-facebook" size={20} color="#00E55A" />
            </TouchableOpacity>
          </View>

          {/* User Stats */}
          <View style={styles.userStatsRow}>
            <View style={styles.userStatItem}>
              <Ionicons name="people" size={16} color="#00E55A" />
              <Text style={styles.userStatText}>50K+ Active Traders</Text>
            </View>
          </View>

          {/* Regulations Section */}
          <View style={styles.regulationsSection}>
            <Text style={styles.regulationsTitle}>Regulations</Text>
            <TouchableOpacity><Text style={styles.regulationLink}>Privacy policy</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.regulationLink}>Service agreement</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.regulationLink}>Risk disclosure</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.regulationLink}>Rules of trading operations</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.regulationLink}>Non-trading operations regulations</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.regulationLink}>Payment policy</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.regulationLink}>AML & KYC Policy</Text></TouchableOpacity>
          </View>

          {/* Company Info */}
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>
              BYNIX TRADING LTD.
            </Text>
            <Text style={styles.companyAddress}>
              Address: 71-75 Shelton Street, Covent Garden, London, WC2H 9JQ, United Kingdom
            </Text>
          </View>

          {/* Country Restrictions */}
          <Text style={styles.countryRestrictions}>
            The website services are not available in certain countries, including USA, Canada, Hong Kong, EEA countries, Israel, Russia as well as for persons under 18 years of age.
          </Text>

          {/* Risk Warning */}
          <View style={styles.riskWarning}>
            <Text style={styles.riskWarningTitle}>Risk Warning:</Text>
            <Text style={styles.riskWarningText}>
              Trading Forex and Leveraged Financial Instruments involves significant risk and can result in the loss of your invested capital. You should not invest more than you can afford to lose and should ensure that you fully understand the risks involved. Trading leveraged products may not be suitable for all investors. Past performance is no guarantee of future results. Before trading, please take into consideration your level of experience, investment objectives and seek independent financial advice if necessary.
            </Text>
          </View>

          {/* Copyright */}
          <View style={styles.copyrightSection}>
            <Text style={styles.copyrightText}>
              BYNIX TRADING LTD is the owner of the bynix.com domain.
            </Text>
            <Text style={styles.copyrightText}>
              Copyright © 2024 Bynix. All rights reserved
            </Text>
          </View>
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
    paddingTop: Platform.OS === 'ios' ? 55 : 35,
    paddingBottom: 15,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#00E55A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loginBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  registerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#00E55A',
    borderRadius: 8,
  },
  registerBtnText: {
    color: '#0A0E17',
    fontSize: 14,
    fontWeight: '600',
  },

  // Hero Section
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
    alignItems: 'center',
  },
  heroGlowContainer: {
    position: 'absolute',
    top: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // App Rating Badge
  appRatingBadge: {
    position: 'absolute',
    top: 30,
    left: 20,
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    zIndex: 10,
  },
  appRatingLabel: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  appRatingValue: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '800',
    marginVertical: 2,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },

  // Phone Mockup
  phoneMockupContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  phoneOuterFrame: {
    width: width * 0.72,
    height: 520,
    backgroundColor: '#2C2C2E',
    borderRadius: 50,
    padding: 12,
    shadowColor: '#00E55A',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 35,
    elevation: 25,
    borderWidth: 5,
    borderColor: '#3D3D3F',
  },
  phoneFrame: {
    flex: 1,
    backgroundColor: '#0A0E17',
    borderRadius: 38,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 3,
    borderColor: '#1A1A1A',
  },
  phoneSideButtons: {
    position: 'absolute',
    left: -3,
    top: 80,
  },
  phoneSideButton: {
    width: 3,
    height: 25,
    backgroundColor: '#3A3A3C',
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  phoneScreen: {
    flex: 1,
    backgroundColor: '#0A0E17',
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#1C1C1E',
  },
  phoneStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  phoneTime: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  phoneDynamicIsland: {
    width: 80,
    height: 22,
    backgroundColor: '#000',
    borderRadius: 11,
  },
  phoneStatusIcons: {
    flexDirection: 'row',
    gap: 4,
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1F2E',
  },
  appHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00E55A20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E55A',
  },
  liveText: {
    color: '#00E55A',
    fontSize: 10,
    fontWeight: '700',
  },
  balanceText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  appHeaderRight: {
    flexDirection: 'row',
    gap: 8,
  },
  notificationBadge: {
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4757',
  },
  chartArea: {
    flex: 1,
    padding: 10,
    position: 'relative',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  chartPair: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  chartPrice: {
    color: '#00E55A',
    fontSize: 12,
    fontWeight: '700',
  },
  chartChange: {
    color: '#00E55A',
    fontSize: 10,
    backgroundColor: '#00E55A20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chartGrid: {
    position: 'absolute',
    top: 30,
    left: 10,
    right: 10,
    bottom: 10,
  },
  gridLine: {
    height: 1,
    backgroundColor: '#1A1F2E',
    marginVertical: 20,
  },
  candlestickContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
    paddingHorizontal: 5,
    marginTop: 10,
  },
  candleWrapper: {
    alignItems: 'center',
  },
  candleWick: {
    width: 1,
    height: 8,
  },
  candleBody: {
    width: 8,
    borderRadius: 2,
  },
  tradeLineContainer: {
    position: 'absolute',
    top: 40,
    left: 60,
    right: 30,
  },
  tradeStartLine: {
    position: 'absolute',
    left: 0,
    borderLeftWidth: 1,
    borderLeftColor: '#FFF',
    borderStyle: 'dashed',
    height: 80,
    paddingLeft: 4,
  },
  tradeEndLine: {
    position: 'absolute',
    right: 0,
    borderLeftWidth: 1,
    borderLeftColor: '#FFF',
    borderStyle: 'dashed',
    height: 80,
    paddingLeft: 4,
  },
  tradeLineLabel: {
    color: '#888',
    fontSize: 8,
  },
  tradeButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  tradeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  upBtn: {
    backgroundColor: '#00E55A',
  },
  downBtn: {
    backgroundColor: '#FF4757',
  },
  tradeBtnText: {
    color: '#0A0E17',
    fontSize: 12,
    fontWeight: '700',
  },
  chartLineContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
  },
  chartLine: {
    height: 2,
    backgroundColor: '#4A90E2',
  },

  // Bynix App Header Styles
  bynixAppHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#0D1117',
  },
  depositBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFB800',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  depositBadgeText: {
    color: '#000',
    fontSize: 7,
    fontWeight: '700',
  },
  bynixLogoSmall: {
    alignItems: 'center',
  },
  bynixLogoRing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00E55A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1F2E',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  balanceBadgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '600',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#0D1117',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00E55A20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  timerText: {
    color: '#00E55A',
    fontSize: 9,
    fontWeight: '700',
  },
  utcText: {
    color: '#666',
    fontSize: 8,
  },
  currentPrice: {
    color: '#00E55A',
    fontSize: 10,
    fontWeight: '700',
  },
  priceLevels: {
    position: 'absolute',
    right: 5,
    top: 5,
    bottom: 5,
    justifyContent: 'space-between',
  },
  priceLevel: {
    color: '#555',
    fontSize: 6,
    textAlign: 'right',
  },
  chartGridLines: {
    position: 'absolute',
    top: 10,
    left: 5,
    right: 35,
    bottom: 10,
  },
  gridLineH: {
    height: 1,
    backgroundColor: '#1A1F2E',
    marginVertical: 15,
  },
  candlestickChart: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingHorizontal: 5,
    paddingRight: 35,
    height: 80,
  },
  candleCol: {
    alignItems: 'center',
  },
  candleWickTop: {
    width: 1,
    height: 5,
  },
  candleBodyNew: {
    width: 5,
    borderRadius: 1,
  },
  candleWickBot: {
    width: 1,
    height: 5,
  },
  entryLine: {
    position: 'absolute',
    left: 10,
    right: 40,
    top: '50%',
    height: 1,
    backgroundColor: '#FFB800',
    borderStyle: 'dashed',
  },
  toolbarRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 4,
    backgroundColor: '#0D1117',
    borderTopWidth: 1,
    borderTopColor: '#1A1F2E',
  },
  toolbarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  toolbarText: {
    color: '#FFB800',
    fontSize: 7,
    fontWeight: '600',
  },
  pairText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '600',
  },
  investmentSection: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#0D1117',
  },
  investmentLabel: {
    color: '#888',
    fontSize: 7,
    marginBottom: 4,
  },
  investmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  amountInput: {
    flex: 1,
    backgroundColor: '#1A1F2E',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  amountText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 4,
  },
  quickBtn: {
    backgroundColor: '#1A1F2E',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  quickBtnActive: {
    backgroundColor: '#00E55A20',
    borderWidth: 1,
    borderColor: '#00E55A',
  },
  quickBtnText: {
    color: '#888',
    fontSize: 8,
    fontWeight: '600',
  },
  quickBtnTextActive: {
    color: '#00E55A',
    fontSize: 8,
    fontWeight: '600',
  },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  payoutLabel: {
    color: '#888',
    fontSize: 7,
  },
  payoutValue: {
    color: '#00E55A',
    fontSize: 9,
    fontWeight: '700',
  },
  tradeButtonsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  upButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E55A',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  upButtonText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
  },
  downButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4757',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  downButtonText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  percentText: {
    color: '#000',
    fontSize: 8,
    fontWeight: '600',
  },
  percentTextDown: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: '#0A0E17',
    borderTopWidth: 1,
    borderTopColor: '#1A1F2E',
  },
  navItem: {
    alignItems: 'center',
    gap: 2,
  },
  navText: {
    color: '#666',
    fontSize: 7,
  },

  // Hero Text
  heroTextContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 40,
  },
  heroTitleGreen: {
    color: '#00E55A',
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 12,
  },
  ctaButton: {
    borderRadius: 12,
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
    paddingVertical: 14,
    paddingHorizontal: 45,
    gap: 8,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A0E17',
  },

  // Asset Categories
  assetCategoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 25,
  },
  assetCategoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1F2E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  assetCategoryText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Section
  section: {
    paddingHorizontal: 20,
    marginTop: 40,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },

  // How It Works
  howItWorksCard: {
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  howItWorksGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1A1F2E',
  },
  howItWorksIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#0A0E17',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  howItWorksContent: {
    flex: 1,
  },
  howItWorksTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  howItWorksDesc: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
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
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },

  // Mobile App Section
  mobileAppSection: {
    marginTop: 40,
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: '#0D1321',
  },
  mobileAppContent: {
    alignItems: 'center',
  },
  mobileAppTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 12,
  },
  mobileAppDesc: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 25,
  },
  appStoreButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  appStoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  appStoreLabelSmall: {
    color: '#999',
    fontSize: 9,
    fontWeight: '500',
  },
  appStoreLabelBig: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Footer
  footer: {
    marginTop: 40,
    paddingHorizontal: 20,
    paddingTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#1A1F2E',
  },
  footerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  footerLogoText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  socialBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1F2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userStatsRow: {
    marginBottom: 25,
  },
  userStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userStatText: {
    color: '#00E55A',
    fontSize: 14,
    fontWeight: '600',
  },
  regulationsSection: {
    marginBottom: 25,
  },
  regulationsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  regulationLink: {
    color: '#888',
    fontSize: 14,
    marginBottom: 10,
  },
  companyInfo: {
    marginBottom: 20,
  },
  companyName: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 5,
  },
  companyAddress: {
    color: '#666',
    fontSize: 12,
    lineHeight: 18,
  },
  countryRestrictions: {
    color: '#666',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 20,
  },
  riskWarning: {
    marginBottom: 20,
  },
  riskWarningTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  riskWarningText: {
    color: '#555',
    fontSize: 11,
    lineHeight: 16,
  },
  copyrightSection: {
    borderTopWidth: 1,
    borderTopColor: '#1A1F2E',
    paddingTop: 20,
  },
  copyrightText: {
    color: '#444',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 5,
  },
});
