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
  Dimensions
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

export default function Login() {
  const router = useRouter();
  const login = useAuthStore(state => state.login);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Animations
  const logoScale = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo entrance animation
    Animated.spring(logoScale, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Form fade in
    Animated.timing(formOpacity, {
      toValue: 1,
      duration: 800,
      delay: 300,
      useNativeDriver: true,
    }).start();

    // Glow animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
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

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#0A1A0F', '#0D2818', '#0A1A0F']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Animated glow effects */}
      <Animated.View 
        style={[
          styles.glowOrb,
          styles.glowOrb1,
          {
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.6],
            }),
          }
        ]} 
      />
      <Animated.View 
        style={[
          styles.glowOrb,
          styles.glowOrb2,
          {
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.4, 0.2],
            }),
          }
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
              <Ionicons name="arrow-back" size={20} color="#00E55A" />
            </View>
          </TouchableOpacity>

          {/* Logo Section with 3D effect */}
          <Animated.View 
            style={[
              styles.logoContainer,
              { transform: [{ scale: logoScale }] }
            ]}
          >
            <View style={styles.logo3DWrapper}>
              <View style={styles.logoGlow} />
              <View style={styles.logoInner}>
                <Image 
                  source={require('../../assets/images/bynix-logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={styles.logoText}>BYNIX</Text>
            <Text style={styles.logoSubtext}>Smart Trading Platform</Text>
          </Animated.View>

          {/* Form Section */}
          <Animated.View style={[styles.formContainer, { opacity: formOpacity }]}>
            <View style={styles.formCard}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Login to continue trading</Text>

              {/* Email Input - 3D Style */}
              <View style={styles.inputWrapper}>
                <View style={styles.input3D}>
                  <View style={styles.inputInner}>
                    <Ionicons name="mail" size={20} color="#00E55A" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email"
                      placeholderTextColor="#666"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              </View>

              {/* Password Input - 3D Style */}
              <View style={styles.inputWrapper}>
                <View style={styles.input3D}>
                  <View style={styles.inputInner}>
                    <Ionicons name="lock-closed" size={20} color="#00E55A" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor="#666"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons 
                        name={showPassword ? "eye" : "eye-off"} 
                        size={20} 
                        color="#00E55A" 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Login Button - 3D Neon */}
              <TouchableOpacity 
                style={styles.loginButton3D}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                <View style={styles.loginButtonInner}>
                  {loading ? (
                    <ActivityIndicator color="#0A1A0F" />
                  ) : (
                    <>
                      <Ionicons name="log-in" size={20} color="#0A1A0F" />
                      <Text style={styles.loginButtonText}>Login</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Button - Glass Effect */}
              <TouchableOpacity 
                style={styles.googleButton3D}
                onPress={handleGoogleLogin}
                activeOpacity={0.8}
              >
                <View style={styles.googleButtonInner}>
                  <Ionicons name="logo-google" size={20} color="#FFFFFF" />
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </View>
              </TouchableOpacity>

              {/* Sign Up Link */}
              <TouchableOpacity 
                onPress={() => router.push('/(auth)/signup')}
                style={styles.signupLink}
              >
                <Text style={styles.signupLinkText}>
                  Don't have an account? <Text style={styles.signupLinkBold}>Sign Up</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1A0F',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  glowOrb: {
    position: 'absolute',
    borderRadius: 200,
  },
  glowOrb1: {
    width: 300,
    height: 300,
    backgroundColor: '#00E55A',
    top: -100,
    right: -100,
    opacity: 0.15,
    shadowColor: '#00E55A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 100,
  },
  glowOrb2: {
    width: 250,
    height: 250,
    backgroundColor: '#00E55A',
    bottom: 100,
    left: -100,
    opacity: 0.1,
    shadowColor: '#00E55A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 80,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  backButton: {
    marginTop: 40,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 90, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo3DWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  logoGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#00E55A',
    opacity: 0.2,
    top: -10,
    left: -10,
    shadowColor: '#00E55A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
  },
  logoInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#0A1A0F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#00E55A',
    shadowColor: '#00E55A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  logoImage: {
    width: 70,
    height: 70,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#00E55A',
    letterSpacing: 8,
    textShadowColor: 'rgba(0, 229, 90, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  logoSubtext: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.6,
    letterSpacing: 2,
    marginTop: 4,
  },
  formContainer: {
    flex: 1,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 90, 0.1)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.6,
    marginBottom: 30,
    textAlign: 'center',
  },
  inputWrapper: {
    marginBottom: 16,
  },
  input3D: {
    borderRadius: 16,
    backgroundColor: '#0A1A0F',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 90, 0.3)',
    shadowColor: '#00E55A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 14,
  },
  loginButton3D: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#00E55A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  loginButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E55A',
    paddingVertical: 16,
    gap: 8,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  loginButtonText: {
    color: '#0A1A0F',
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0, 229, 90, 0.2)',
  },
  dividerText: {
    color: '#00E55A',
    opacity: 0.6,
    marginHorizontal: 16,
    fontSize: 12,
  },
  googleButton3D: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  googleButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 14,
    gap: 10,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  signupLink: {
    alignItems: 'center',
    marginTop: 24,
  },
  signupLinkText: {
    color: '#FFFFFF',
    opacity: 0.6,
    fontSize: 14,
  },
  signupLinkBold: {
    color: '#00E55A',
    fontWeight: 'bold',
  },
});
