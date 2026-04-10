import React, { useState } from 'react';
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
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../utils/api';
import * as WebBrowser from 'expo-web-browser';

const { width } = Dimensions.get('window');

declare const window: any;

export default function Login() {
  const router = useRouter();
  const login = useAuthStore(state => state.login);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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
      const redirectUrl = Platform.OS === 'web' 
        ? window.location.origin + '/(tabs)/trade'
        : 'bynix://trade';
      
      // Use backend URL for OAuth flow
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || (Platform.OS === 'web' ? window.location.origin : '');
      const authUrl = `${backendUrl}/api/auth/google?redirect=${encodeURIComponent(redirectUrl)}`;
      
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
      if (Platform.OS === 'web') {
        window.alert(error.message || 'Google login failed');
      } else {
        Alert.alert('Google Login Failed', error.message);
      }
    }
  };

  const handleFacebookLogin = () => {
    if (Platform.OS === 'web') {
      window.alert('Facebook login coming soon!');
    } else {
      Alert.alert('Coming Soon', 'Facebook login will be available soon!');
    }
  };

  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={['#1A1A1A', '#0D0D0D', '#1A1A1A']}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative Corner Glow */}
      <View style={styles.cornerGlowTopLeft} />
      <View style={styles.cornerGlowBottomRight} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {/* Bynix Logo */}
              <Image 
                source={{ uri: 'https://customer-assets.emergentagent.com/job_bynix-markets/artifacts/fhiw6o6y_IMG_3122.png' }}
                style={{ width: 28, height: 28 }}
                resizeMode="contain"
              />
            </View>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => router.push('/(auth)/welcome')}
            >
              <Ionicons name="close" size={28} color="#888" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Greeting */}
            <Text style={styles.greeting}>Happy to see you</Text>
            <Text style={styles.title}>Welcome back</Text>

            {/* Email Input */}
            <Text style={styles.inputLabel}>Email or phone</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email or phone"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password Input */}
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={22} 
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
                colors={['#00E55A', '#00C94D']}
                style={styles.loginButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.loginButtonText}>Log in</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Footer Links */}
            <View style={styles.footerLinks}>
              <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                <Text style={styles.signUpText}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            {/* Promo Banner */}
            <View style={styles.promoBanner}>
              <LinearGradient
                colors={['#0A1A10', '#1A1A1A']}
                style={styles.promoBannerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.promoContent}>
                  <View style={styles.promoTextContainer}>
                    <Text style={styles.promoLabel}>YOUR TRADING PARTNER</Text>
                    <View style={styles.promoLogoRow}>
                      <Image 
                        source={{ uri: 'https://customer-assets.emergentagent.com/job_bynix-markets/artifacts/fhiw6o6y_IMG_3122.png' }}
                        style={styles.promoLogo}
                        resizeMode="contain"
                      />
                      <Text style={styles.promoLogoText}>Bynix</Text>
                    </View>
                  </View>
                  <View style={styles.promoIconContainer}>
                    <Ionicons name="trending-up" size={20} color="#00E55A" />
                  </View>
                </View>
              </LinearGradient>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  cornerGlowTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 150,
    height: 150,
    backgroundColor: '#00E55A',
    opacity: 0.05,
    borderBottomRightRadius: 150,
  },
  cornerGlowBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 200,
    height: 200,
    backgroundColor: '#00E55A',
    opacity: 0.03,
    borderTopLeftRadius: 200,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 55 : 35,
    paddingBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  decorIcon: {
    width: 32,
    height: 32,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingTop: 10,
  },
  greeting: {
    fontSize: 16,
    color: '#888',
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 30,
  },
  socialLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 15,
  },
  socialButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 25,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2A2A',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  socialIcon: {
    width: 20,
    height: 20,
  },
  facebookIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1877F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    color: '#666',
    marginHorizontal: 16,
    fontSize: 14,
  },
  inputLabel: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    marginBottom: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 16,
  },
  eyeButton: {
    padding: 8,
  },
  loginButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#00E55A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  loginButtonText: {
    color: '#0D0D0D',
    fontSize: 18,
    fontWeight: '700',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 30,
  },
  forgotPasswordText: {
    color: '#00E55A',
    fontSize: 15,
    fontWeight: '600',
  },
  signUpText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  promoBanner: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#00E55A30',
  },
  promoBannerGradient: {
    padding: 16,
  },
  promoContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promoTextContainer: {
    flex: 1,
  },
  promoLabel: {
    fontSize: 10,
    color: '#00E55A',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },
  promoLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  promoLogo: {
    width: 32,
    height: 32,
  },
  promoLogoText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  promoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00E55A20',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
