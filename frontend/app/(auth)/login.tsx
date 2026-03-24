import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
  Easing
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../utils/api';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

const { width, height } = Dimensions.get('window');
const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

declare const window: any;

// Animated Grid Line Component
const GridLine = ({ delay, horizontal }: { delay: number; horizontal?: boolean }) => {
  const animValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(animValue, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.gridLine,
        horizontal ? styles.gridLineHorizontal : styles.gridLineVertical,
        {
          opacity: animValue.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0.6, 0],
          }),
          transform: horizontal 
            ? [{ translateX: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [-width, width],
              })}]
            : [{ translateY: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [-height, height],
              })}],
        },
      ]}
    />
  );
};

// Floating Particle Component
const FloatingParticle = ({ delay, size, x }: { delay: number; size: number; x: number }) => {
  const animValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(animValue, {
          toValue: 1,
          duration: 4000 + Math.random() * 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          left: x,
          opacity: animValue.interpolate({
            inputRange: [0, 0.2, 0.8, 1],
            outputRange: [0, 1, 1, 0],
          }),
          transform: [{
            translateY: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [height, -100],
            }),
          }],
        },
      ]}
    />
  );
};

export default function Login() {
  const router = useRouter();
  const login = useAuthStore(state => state.login);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Animations
  const logoRotate = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0)).current;
  const formSlide = useRef(new Animated.Value(50)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const scanLine = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glitchAnim = useRef(new Animated.Value(0)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo animations
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 10000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ),
    ]).start();

    // Form entrance
    Animated.parallel([
      Animated.timing(formSlide, {
        toValue: 0,
        duration: 800,
        delay: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 800,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Scan line animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(scanLine, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Border animation
    Animated.loop(
      Animated.timing(borderAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    ).start();

    // Random glitch effect
    const glitchInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(glitchAnim, {
          toValue: 1,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(glitchAnim, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();
    }, 3000 + Math.random() * 2000);

    return () => clearInterval(glitchInterval);
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      if (Platform.OS === 'web') {
        window.alert('Please fill all fields');
      } else {
        Alert.alert('Error', 'Please fill all fields');
      }
      return;
    }

    setLoading(true);
    try {
      const response = await api.login({ email, password });
      await login(response.access_token, response.user);
      router.replace('/(tabs)/trade');
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(error.message || 'Invalid credentials');
      } else {
        Alert.alert('Login Failed', error.message || 'Invalid credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const redirectUrl = window.location.origin + '/(tabs)/trade';
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      
      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const sessionId = url.hash.split('session_id=')[1];
        
        if (sessionId) {
          const response = await api.googleSession(sessionId);
          await login(response.session_token, response.user);
          router.replace('/(tabs)/trade');
        }
      }
    } catch (error: any) {
      Alert.alert('Google Login Failed', error.message);
    }
  };

  const spin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Animated Background */}
      <LinearGradient
        colors={['#000000', '#0a0a0a', '#001a0d', '#000000']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Animated Grid Lines */}
      {[0, 1, 2, 3, 4].map((i) => (
        <GridLine key={`v-${i}`} delay={i * 400} />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <GridLine key={`h-${i}`} delay={i * 500} horizontal />
      ))}

      {/* Floating Particles */}
      {[...Array(15)].map((_, i) => (
        <FloatingParticle 
          key={i} 
          delay={i * 300} 
          size={2 + Math.random() * 4}
          x={Math.random() * width}
        />
      ))}

      {/* Scan Line Effect */}
      <Animated.View
        style={[
          styles.scanLine,
          {
            transform: [{
              translateY: scanLine.interpolate({
                inputRange: [0, 1],
                outputRange: [0, height],
              }),
            }],
          },
        ]}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <View style={styles.backButtonInner}>
              <Ionicons name="chevron-back" size={24} color="#00E55A" />
            </View>
          </TouchableOpacity>

          {/* Futuristic Logo Section */}
          <View style={styles.logoSection}>
            {/* Rotating Ring */}
            <Animated.View 
              style={[
                styles.logoRingOuter,
                { transform: [{ rotate: spin }, { scale: logoScale }] }
              ]}
            >
              <LinearGradient
                colors={['#00E55A', 'transparent', '#00E55A']}
                style={styles.ringGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            </Animated.View>
            
            {/* Logo Container */}
            <Animated.View 
              style={[
                styles.logoContainer,
                { 
                  transform: [
                    { scale: logoScale },
                    { translateX: glitchAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 3],
                    })},
                  ] 
                }
              ]}
            >
              <View style={styles.logoInnerGlow} />
              <Image 
                source={require('../../assets/images/bynix-logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Pulsing Rings */}
            <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
            <Animated.View style={[styles.pulseRing2, { transform: [{ scale: pulseAnim }], opacity: 0.5 }]} />

            {/* Logo Text with Glitch */}
            <Animated.Text 
              style={[
                styles.logoText,
                {
                  transform: [{
                    translateX: glitchAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -2],
                    }),
                  }],
                },
              ]}
            >
              BYNIX
            </Animated.Text>
            <Text style={styles.logoSubtext}>[ NEURAL TRADING SYSTEM ]</Text>
            
            {/* Status Indicators */}
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, styles.statusActive]} />
                <Text style={styles.statusText}>SYSTEM ONLINE</Text>
              </View>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, styles.statusActive]} />
                <Text style={styles.statusText}>SECURE</Text>
              </View>
            </View>
          </View>

          {/* Form Card */}
          <Animated.View 
            style={[
              styles.formCard,
              {
                opacity: formOpacity,
                transform: [{ translateY: formSlide }],
              },
            ]}
          >
            {/* Card Border Animation */}
            <View style={styles.cardBorderContainer}>
              <LinearGradient
                colors={['#00E55A', '#00E55A00', '#00E55A00', '#00E55A']}
                style={styles.cardBorderGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            </View>

            <View style={styles.formInner}>
              <Text style={styles.formTitle}>AUTHENTICATION</Text>
              <View style={styles.titleUnderline} />

              {/* Email Input */}
              <View style={[
                styles.inputContainer,
                focusedInput === 'email' && styles.inputFocused
              ]}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="person-outline" size={18} color="#00E55A" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="ENTER EMAIL"
                  placeholderTextColor="#444"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                />
                {email.length > 0 && (
                  <Ionicons name="checkmark-circle" size={18} color="#00E55A" />
                )}
              </View>

              {/* Password Input */}
              <View style={[
                styles.inputContainer,
                focusedInput === 'password' && styles.inputFocused
              ]}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="lock-closed-outline" size={18} color="#00E55A" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="ENTER PASSWORD"
                  placeholderTextColor="#444"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons 
                    name={showPassword ? "eye-outline" : "eye-off-outline"} 
                    size={18} 
                    color="#00E55A" 
                  />
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity 
                style={styles.loginButton}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#00E55A', '#00B347']}
                  style={styles.loginButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <>
                      <Text style={styles.loginButtonText}>INITIATE LOGIN</Text>
                      <Ionicons name="arrow-forward" size={20} color="#000" />
                    </>
                  )}
                </LinearGradient>
                <View style={styles.buttonCorner} />
                <View style={[styles.buttonCorner, styles.buttonCornerBR]} />
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Button */}
              <TouchableOpacity 
                style={styles.googleButton}
                onPress={handleGoogleLogin}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-google" size={18} color="#00E55A" />
                <Text style={styles.googleButtonText}>CONNECT WITH GOOGLE</Text>
              </TouchableOpacity>

              {/* Sign Up Link */}
              <TouchableOpacity 
                onPress={() => router.push('/(auth)/signup')}
                style={styles.signupLink}
              >
                <Text style={styles.signupLinkText}>
                  NEW USER? <Text style={styles.signupLinkBold}>CREATE ACCOUNT</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Footer */}
          <Text style={styles.footerText}>v2.0.0 | ENCRYPTED CONNECTION</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: '#00E55A',
  },
  gridLineVertical: {
    width: 1,
    height: '100%',
    left: '20%',
  },
  gridLineHorizontal: {
    width: '100%',
    height: 1,
    top: '30%',
  },
  particle: {
    position: 'absolute',
    backgroundColor: '#00E55A',
    borderRadius: 10,
    shadowColor: '#00E55A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#00E55A',
    opacity: 0.3,
    shadowColor: '#00E55A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  backButton: {
    marginTop: 40,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  backButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
    borderWidth: 1,
    borderColor: '#00E55A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
    height: 200,
    justifyContent: 'center',
  },
  logoRingOuter: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: 'transparent',
    borderStyle: 'dashed',
  },
  ringGradient: {
    flex: 1,
    borderRadius: 70,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00E55A',
    shadowColor: '#00E55A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
    zIndex: 10,
  },
  logoInnerGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00E55A',
    opacity: 0.1,
  },
  logoImage: {
    width: 60,
    height: 60,
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: '#00E55A',
    opacity: 0.3,
  },
  pulseRing2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: '#00E55A',
  },
  logoText: {
    marginTop: 20,
    fontSize: 36,
    fontWeight: '900',
    color: '#00E55A',
    letterSpacing: 12,
    textShadowColor: '#00E55A',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  logoSubtext: {
    fontSize: 10,
    color: '#00E55A',
    opacity: 0.6,
    letterSpacing: 4,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  statusRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 20,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusActive: {
    backgroundColor: '#00E55A',
    shadowColor: '#00E55A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  statusText: {
    fontSize: 9,
    color: '#00E55A',
    opacity: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  formCard: {
    backgroundColor: 'rgba(0, 20, 10, 0.8)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#00E55A33',
    overflow: 'hidden',
  },
  cardBorderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardBorderGradient: {
    flex: 1,
    opacity: 0.3,
  },
  formInner: {
    padding: 24,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00E55A',
    letterSpacing: 4,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  titleUnderline: {
    height: 1,
    backgroundColor: '#00E55A',
    marginTop: 12,
    marginBottom: 24,
    opacity: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 90, 0.3)',
    paddingHorizontal: 14,
  },
  inputFocused: {
    borderColor: '#00E55A',
    backgroundColor: 'rgba(0, 229, 90, 0.12)',
    shadowColor: '#00E55A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  inputIconContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    paddingVertical: 14,
    fontWeight: '500',
  },
  loginButton: {
    marginTop: 8,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  loginButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  buttonCorner: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 10,
    height: 10,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#000',
  },
  buttonCornerBR: {
    top: undefined,
    left: undefined,
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#00E55A',
    opacity: 0.2,
  },
  dividerText: {
    color: '#00E55A',
    opacity: 0.4,
    marginHorizontal: 16,
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 2,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#00E55A33',
    gap: 10,
  },
  googleButtonText: {
    color: '#00E55A',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  signupLink: {
    alignItems: 'center',
    marginTop: 20,
  },
  signupLinkText: {
    color: '#666',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  signupLinkBold: {
    color: '#00E55A',
    fontWeight: 'bold',
  },
  footerText: {
    textAlign: 'center',
    color: '#333',
    fontSize: 9,
    marginTop: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 2,
  },
});
