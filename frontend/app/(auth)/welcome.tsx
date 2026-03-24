import React, { useEffect, useRef } from 'react';
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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { API_URL } from '../../utils/api';

const { width, height } = Dimensions.get('window');

// Animated Trading Candle Component
const AnimatedCandle = ({ delay, x, isGreen, baseTop }: { delay: number, x: number, isGreen: boolean, baseTop: number }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.4)).current;
  
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: isGreen ? -25 : 25,
            duration: 2000 + Math.random() * 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.7,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 0,
            duration: 2000 + Math.random() * 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.4,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const candleHeight = 30 + Math.random() * 50;
  const wickHeight = 8 + Math.random() * 15;

  return (
    <Animated.View
      style={[
        styles.candle,
        {
          left: x,
          top: baseTop,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={[styles.wick, { height: wickHeight, backgroundColor: isGreen ? '#00E55A' : '#FF3B3B' }]} />
      <View style={[
        styles.candleBody,
        { 
          height: candleHeight, 
          backgroundColor: isGreen ? '#00E55A' : '#FF3B3B',
        }
      ]} />
      <View style={[styles.wick, { height: wickHeight, backgroundColor: isGreen ? '#00E55A' : '#FF3B3B' }]} />
    </Animated.View>
  );
};

// Animated Price Line
const AnimatedPriceLine = ({ top }: { top: number }) => {
  const translateX = useRef(new Animated.Value(-width)).current;
  
  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: width * 2,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View style={[styles.priceLine, { top, transform: [{ translateX }] }]}>
      <LinearGradient
        colors={['transparent', '#FFB800', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.priceLineGradient}
      />
    </Animated.View>
  );
};

// Floating Numbers
const FloatingNumber = ({ value, x, delay, color }: { value: string, x: number, delay: number, color: string }) => {
  const translateY = useRef(new Animated.Value(height)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -50,
            duration: 8000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.5,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.delay(5000),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.timing(translateY, {
          toValue: height,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.Text
      style={[
        styles.floatingNumber,
        { left: x, transform: [{ translateY }], opacity, color },
      ]}
    >
      {value}
    </Animated.Text>
  );
};

// Pulsing Glow Effect
const PulsingGlow = () => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.3,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.6,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View style={[styles.pulsingGlow, { transform: [{ scale }], opacity }]} />
  );
};

export default function Welcome() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [isLoading, setIsLoading] = React.useState(false);
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation for Start Trading button
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 1.03,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 1200,
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
          name: 'Demo User'
        })
      });
      
      if (!signupResponse.ok) throw new Error('Failed to create demo account');
      
      const signupData = await signupResponse.json();
      const otp = signupData.otp;
      
      const verifyResponse = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoEmail, otp: otp })
      });
      
      if (!verifyResponse.ok) throw new Error('Failed to verify demo account');
      
      const data = await verifyResponse.json();
      
      const meResponse = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${data.access_token}` }
      });
      
      const userData = await meResponse.json();
      
      await login(data.access_token, {
        user_id: userData.user_id,
        email: userData.email,
        name: userData.name || 'Demo User',
        demo_balance: userData.demo_balance || 10000,
        real_balance: userData.real_balance || 0,
        bonus_balance: userData.bonus_balance || 0,
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

  // Generate candles
  const candles = Array.from({ length: 25 }, (_, i) => ({
    x: (i * (width / 12)) - 10,
    delay: i * 150,
    isGreen: Math.random() > 0.45,
    baseTop: 150 + Math.random() * 300,
  }));

  // Floating numbers
  const floatingNumbers = [
    { value: '+92%', x: 30, delay: 0, color: '#00E55A' },
    { value: '-18%', x: 280, delay: 2500, color: '#FF3B3B' },
    { value: '+156%', x: 150, delay: 5000, color: '#00E55A' },
    { value: '+45%', x: 320, delay: 1500, color: '#00E55A' },
    { value: '-8%', x: 60, delay: 4000, color: '#FF3B3B' },
    { value: '+234%', x: 220, delay: 6500, color: '#FFB800' },
  ];

  return (
    <View style={styles.container}>
      {/* Animated Trading Background */}
      <View style={styles.animatedBackground}>
        {/* Grid lines */}
        <View style={styles.gridContainer}>
          {Array.from({ length: 10 }).map((_, i) => (
            <View key={`h-${i}`} style={[styles.gridLineH, { top: (i + 1) * (height / 10) }]} />
          ))}
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={`v-${i}`} style={[styles.gridLineV, { left: (i + 1) * (width / 8) }]} />
          ))}
        </View>
        
        {/* Pulsing glow */}
        <PulsingGlow />
        
        {/* Animated candles */}
        {candles.map((candle, i) => (
          <AnimatedCandle 
            key={i} 
            x={candle.x} 
            delay={candle.delay} 
            isGreen={candle.isGreen}
            baseTop={candle.baseTop}
          />
        ))}
        
        {/* Price lines */}
        <AnimatedPriceLine top={height * 0.35} />
        <AnimatedPriceLine top={height * 0.55} />
        
        {/* Floating profit numbers */}
        {floatingNumbers.map((num, i) => (
          <FloatingNumber key={i} value={num.value} x={num.x} delay={num.delay} color={num.color} />
        ))}
      </View>

      {/* Dark blur overlay */}
      <LinearGradient
        colors={[
          'rgba(10, 14, 39, 0.75)',
          'rgba(10, 14, 39, 0.85)',
          'rgba(10, 14, 39, 0.92)',
          'rgba(10, 14, 39, 0.98)',
        ]}
        style={styles.overlay}
      />

      {/* Main Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Logo and Start Trading Button */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/images/bynix-logo.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          
          {/* Golden Start Trading Button - Right Side */}
          <Animated.View style={[styles.startTradingWrapper, { transform: [{ scale: buttonScale }] }]}>
            <TouchableOpacity
              style={styles.startTradingBtn}
              onPress={handleStartDemo}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#FFD700', '#FFB800', '#FF9500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.startTradingGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#0A0E27" size="small" />
                ) : (
                  <>
                    <Ionicons name="rocket" size={16} color="#0A0E27" />
                    <Text style={styles.startTradingText}>Start Trading</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Big Logo Section */}
        <View style={styles.bigLogoSection}>
          <Image 
            source={require('../../assets/images/bynix-logo.png')} 
            style={styles.bigLogoImage}
            resizeMode="contain"
          />
          <Text style={styles.heroDescription}>
            Trade forex, crypto, stocks & commodities with up to 95% profit per trade
          </Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>$10K</Text>
            <Text style={styles.statLabel}>Demo Balance</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>95%</Text>
            <Text style={styles.statLabel}>Max Profit</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>50+</Text>
            <Text style={styles.statLabel}>Assets</Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureRow}>
            <View style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(0, 229, 90, 0.15)' }]}>
                <Ionicons name="trending-up" size={24} color="#00E55A" />
              </View>
              <Text style={styles.featureTitle}>Real-time</Text>
              <Text style={styles.featureDesc}>Live market data</Text>
            </View>
            <View style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(255, 184, 0, 0.15)' }]}>
                <Ionicons name="shield-checkmark" size={24} color="#FFB800" />
              </View>
              <Text style={styles.featureTitle}>Secure</Text>
              <Text style={styles.featureDesc}>Protected funds</Text>
            </View>
          </View>
          <View style={styles.featureRow}>
            <View style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(155, 89, 182, 0.15)' }]}>
                <Ionicons name="analytics" size={24} color="#9B59B6" />
              </View>
              <Text style={styles.featureTitle}>Analytics</Text>
              <Text style={styles.featureDesc}>5 Indicators</Text>
            </View>
            <View style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(52, 152, 219, 0.15)' }]}>
                <Ionicons name="flash" size={24} color="#3498DB" />
              </View>
              <Text style={styles.featureTitle}>Fast</Text>
              <Text style={styles.featureDesc}>Instant trades</Text>
            </View>
          </View>
        </View>

        {/* Demo Button - Large */}
        <TouchableOpacity 
          style={styles.demoButton}
          onPress={handleStartDemo}
          disabled={isLoading}
        >
          <LinearGradient
            colors={['#FFD700', '#FFB800', '#FF9500']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.demoButtonGradient}
          >
            {isLoading ? (
              <ActivityIndicator color="#0A0E27" />
            ) : (
              <>
                <Ionicons name="gift" size={22} color="#0A0E27" />
                <Text style={styles.demoButtonText}>Get $10,000 Demo Account</Text>
                <Ionicons name="arrow-forward" size={20} color="#0A0E27" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Auth Buttons */}
        <View style={styles.authContainer}>
          <TouchableOpacity 
            style={styles.createAccountBtn}
            onPress={() => router.push('/(auth)/signup')}
          >
            <Text style={styles.createAccountText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.loginBtn}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.loginText}>Already have an account? </Text>
            <Text style={styles.loginTextBold}>Login</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  animatedBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0, 229, 90, 0.06)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0, 229, 90, 0.06)',
  },
  pulsingGlow: {
    position: 'absolute',
    top: height * 0.3,
    left: width * 0.3,
    width: width * 0.4,
    height: width * 0.4,
    borderRadius: width * 0.2,
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
  },
  candle: {
    position: 'absolute',
    alignItems: 'center',
  },
  wick: {
    width: 2,
    borderRadius: 1,
  },
  candleBody: {
    width: 10,
    borderRadius: 2,
    marginVertical: 1,
  },
  priceLine: {
    position: 'absolute',
    width: width * 3,
    height: 2,
  },
  priceLineGradient: {
    flex: 1,
    height: 2,
  },
  floatingNumber: {
    position: 'absolute',
    fontSize: 18,
    fontWeight: 'bold',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 55,
    marginBottom: 20,
  },
  logoContainer: {
    flex: 1,
  },
  logoImage: {
    width: 85,
    height: 32,
  },
  bigLogoSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10,
  },
  bigLogoImage: {
    width: width - 40,
    height: 170,
    marginBottom: 16,
  },
  heroDescription: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  startTradingWrapper: {
    marginTop: 5,
  },
  startTradingBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  startTradingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 6,
  },
  startTradingText: {
    color: '#0A0E27',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFB800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  featuresContainer: {
    marginBottom: 24,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 12,
  },
  featureCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  demoButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  demoButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  demoButtonText: {
    color: '#0A0E27',
    fontSize: 17,
    fontWeight: 'bold',
  },
  authContainer: {
    gap: 12,
  },
  createAccountBtn: {
    backgroundColor: '#00E55A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createAccountText: {
    color: '#0A0E27',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  loginText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  loginTextBold: {
    color: '#00E55A',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
