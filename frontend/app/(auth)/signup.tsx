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
  Dimensions,
  Modal
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../stores/authStore';
import * as WebBrowser from 'expo-web-browser';

const { width, height } = Dimensions.get('window');

declare const window: any;

// Allowed countries for signup
const ALLOWED_COUNTRIES = [
  { name: 'India', flag: '🇮🇳', region: 'Asia' },
  { name: 'Bangladesh', flag: '🇧🇩', region: 'Asia' },
  { name: 'Malaysia', flag: '🇲🇾', region: 'Asia' },
  { name: 'Pakistan', flag: '🇵🇰', region: 'Asia' },
  { name: 'Thailand', flag: '🇹🇭', region: 'Asia' },
  { name: 'Philippines', flag: '🇵🇭', region: 'Asia' },
  { name: 'Vietnam', flag: '🇻🇳', region: 'Asia' },
  { name: 'Indonesia', flag: '🇮🇩', region: 'Asia' },
  { name: 'Uzbekistan', flag: '🇺🇿', region: 'Asia' },
  { name: 'South Africa', flag: '🇿🇦', region: 'Africa' },
  { name: 'Kenya', flag: '🇰🇪', region: 'Africa' },
  { name: 'Nigeria', flag: '🇳🇬', region: 'Africa' },
  { name: 'Brazil', flag: '🇧🇷', region: 'Latin America' },
  { name: 'Mexico', flag: '🇲🇽', region: 'Latin America' },
  { name: 'Argentina', flag: '🇦🇷', region: 'Latin America' },
];

export default function Signup() {
  const router = useRouter();
  const { ref: urlReferralCode } = useLocalSearchParams<{ ref?: string }>();
  const login = useAuthStore(state => state.login);
  
  // Screen states
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showOTPScreen, setShowOTPScreen] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<{name: string; flag: string; region: string} | null>(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  
  // OTP states
  const [otp, setOTP] = useState(['', '', '', '', '', '']);
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef<Array<TextInput | null>>([]);

  // Load referral code
  useEffect(() => {
    const loadReferralCode = async () => {
      if (urlReferralCode) {
        setReferralCode(urlReferralCode);
        return;
      }
      const storedCode = await AsyncStorage.getItem('pending_referral_code');
      if (storedCode) setReferralCode(storedCode);
    };
    loadReferralCode();
  }, [urlReferralCode]);

  // OTP Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleGoogleLogin = async () => {
    try {
      const redirectUrl = Platform.OS === 'web' 
        ? window.location.origin + '/(tabs)/trade'
        : 'bynix://trade';
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

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      if (Platform.OS === 'web') window.alert('Please fill all fields');
      else Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (!selectedCountry) {
      if (Platform.OS === 'web') window.alert('Please select your country');
      else Alert.alert('Error', 'Please select your country');
      return;
    }

    if (password !== confirmPassword) {
      if (Platform.OS === 'web') window.alert('Passwords do not match');
      else Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      if (Platform.OS === 'web') window.alert('Password must be at least 6 characters');
      else Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await api.signup({ 
        name, 
        email, 
        password,
        country: selectedCountry.name,
        country_flag: selectedCountry.flag,
        referred_by: referralCode || undefined,
      });
      
      if (response.requires_verification) {
        setShowOTPScreen(true);
        setResendCooldown(60);
        AsyncStorage.removeItem('pending_referral_code');
        if (Platform.OS === 'web') window.alert('Verification code sent to your email!');
        else Alert.alert('Success', 'Verification code sent to your email!');
      } else if (response.access_token) {
        AsyncStorage.removeItem('pending_referral_code');
        await login(response.access_token, response.user);
        router.replace('/(tabs)/trade');
      }
    } catch (error: any) {
      if (Platform.OS === 'web') window.alert(error.message || 'Could not create account');
      else Alert.alert('Signup Failed', error.message || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  // OTP handlers
  const handleOTPChange = (value: string, index: number) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOTP = [...otp];
      digits.forEach((digit, i) => {
        if (index + i < 6) newOTP[index + i] = digit;
      });
      setOTP(newOTP);
      const lastIndex = Math.min(index + digits.length, 5);
      otpInputRefs.current[lastIndex]?.focus();
    } else {
      const newOTP = [...otp];
      newOTP[index] = value;
      setOTP(newOTP);
      if (value && index < 5) otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOTPKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      if (Platform.OS === 'web') window.alert('Please enter 6-digit verification code');
      else Alert.alert('Error', 'Please enter 6-digit verification code');
      return;
    }

    setVerifyingOTP(true);
    try {
      const response = await api.verifyEmail({ email, otp: otpCode });
      if (response.access_token) {
        await login(response.access_token, response.user);
        router.replace('/(tabs)/trade');
      }
    } catch (error: any) {
      if (Platform.OS === 'web') window.alert(error.message || 'Invalid verification code');
      else Alert.alert('Verification Failed', error.message || 'Invalid verification code');
      setOTP(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } finally {
      setVerifyingOTP(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      await api.resendOTP({ email });
      setResendCooldown(60);
      if (Platform.OS === 'web') window.alert('New verification code sent!');
      else Alert.alert('Success', 'New verification code sent to your email!');
    } catch (error: any) {
      if (Platform.OS === 'web') window.alert(error.message || 'Failed to resend code');
      else Alert.alert('Error', error.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  // OTP Verification Screen
  if (showOTPScreen) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1A1A1A', '#0D0D0D', '#1A1A1A']} style={StyleSheet.absoluteFill} />
        
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          <ScrollView contentContainerStyle={styles.otpContent} showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={styles.otpBackBtn} onPress={() => { setShowOTPScreen(false); setOTP(['', '', '', '', '', '']); }}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.otpIconContainer}>
              <Ionicons name="mail" size={48} color="#FF8C00" />
            </View>

            <Text style={styles.otpTitle}>Verify Your Email</Text>
            <Text style={styles.otpSubtitle}>We've sent a 6-digit verification code to</Text>
            <Text style={styles.otpEmail}>{email}</Text>

            <View style={styles.otpInputContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => otpInputRefs.current[index] = ref}
                  style={[styles.otpInput, digit && styles.otpInputFilled]}
                  value={digit}
                  onChangeText={(value) => handleOTPChange(value, index)}
                  onKeyPress={(e) => handleOTPKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={6}
                  selectTextOnFocus
                />
              ))}
            </View>

            <TouchableOpacity style={[styles.verifyBtn, verifyingOTP && styles.verifyBtnDisabled]} onPress={handleVerifyOTP} disabled={verifyingOTP}>
              <LinearGradient colors={['#FF8C00', '#FF6B00']} style={styles.verifyBtnGradient}>
                {verifyingOTP ? <ActivityIndicator color="#FFF" /> : <Text style={styles.verifyBtnText}>Verify Email</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.otpResendContainer}>
              <Text style={styles.otpResendText}>Didn't receive the code? </Text>
              <TouchableOpacity onPress={handleResendOTP} disabled={resendCooldown > 0 || loading}>
                <Text style={[styles.otpResendLink, (resendCooldown > 0 || loading) && styles.otpResendLinkDisabled]}>
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // Email Form Screen
  if (showEmailForm) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1A1A1A', '#0D0D0D', '#1A1A1A']} style={StyleSheet.absoluteFill} />
        
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={() => setShowEmailForm(false)}>
                <Ionicons name="arrow-back" size={24} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeButton} onPress={() => router.push('/(auth)/welcome')}>
                <Ionicons name="close" size={28} color="#888" />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <Text style={styles.greeting}>Complete registration</Text>
              <Text style={styles.title}>Your details</Text>

              {/* Name Input */}
              <Text style={styles.inputLabel}>Full name</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#666"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Email Input */}
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#666"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Country Selector */}
              <Text style={styles.inputLabel}>Country</Text>
              <TouchableOpacity style={styles.inputContainer} onPress={() => setShowCountryPicker(true)}>
                <Text style={[styles.input, !selectedCountry && { color: '#666' }]}>
                  {selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : 'Select your country'}
                </Text>
                <Ionicons name="chevron-down" size={22} color="#FF8C00" />
              </TouchableOpacity>

              {/* Password Input */}
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Create a password"
                  placeholderTextColor="#666"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#FF8C00" />
                </TouchableOpacity>
              </View>

              {/* Confirm Password Input */}
              <Text style={styles.inputLabel}>Confirm password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm your password"
                  placeholderTextColor="#666"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#FF8C00" />
                </TouchableOpacity>
              </View>

              {/* Password Match Indicator */}
              {confirmPassword.length > 0 && (
                <View style={styles.matchRow}>
                  <Ionicons 
                    name={password === confirmPassword ? "checkmark-circle" : "close-circle"} 
                    size={16} 
                    color={password === confirmPassword ? "#00E55A" : "#FF4757"} 
                  />
                  <Text style={[styles.matchText, { color: password === confirmPassword ? "#00E55A" : "#FF4757" }]}>
                    {password === confirmPassword ? "Passwords match" : "Passwords do not match"}
                  </Text>
                </View>
              )}

              {/* Create Account Button */}
              <TouchableOpacity style={styles.actionButton} onPress={handleSignup} disabled={loading}>
                <LinearGradient colors={['#FF8C00', '#FF6B00']} style={styles.actionButtonGradient}>
                  {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.actionButtonText}>Create account</Text>}
                </LinearGradient>
              </TouchableOpacity>

              {/* Login Link */}
              <View style={styles.footerLinks}>
                <Text style={styles.footerText}>Already have an account?</Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                  <Text style={styles.loginLinkText}>Log in</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Country Picker Modal */}
        <Modal visible={showCountryPicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Country</Text>
                <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                  <Ionicons name="close" size={28} color="#888" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.restrictedNotice}>
                <Ionicons name="warning" size={16} color="#FF8C00" />
                <Text style={styles.restrictedText}>
                  Service not available in: US, Canada, EU, EEA, Russia, Hong Kong, Israel
                </Text>
              </View>

              <ScrollView style={styles.countryList}>
                {['Asia', 'Africa', 'Latin America'].map((region) => (
                  <View key={region}>
                    <Text style={styles.regionHeader}>{region}</Text>
                    {ALLOWED_COUNTRIES.filter(c => c.region === region).map((country) => (
                      <TouchableOpacity
                        key={country.name}
                        style={[styles.countryItem, selectedCountry?.name === country.name && styles.countryItemSelected]}
                        onPress={() => { setSelectedCountry(country); setShowCountryPicker(false); }}
                      >
                        <Text style={styles.countryFlag}>{country.flag}</Text>
                        <Text style={styles.countryName}>{country.name}</Text>
                        {selectedCountry?.name === country.name && <Ionicons name="checkmark-circle" size={20} color="#FF8C00" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Main Signup Screen (Initial Screen)
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1A1A1A', '#0D0D0D', '#1A1A1A']} style={StyleSheet.absoluteFill} />

      {/* Decorative Elements */}
      <View style={styles.cornerGlowTopLeft} />
      <View style={styles.cornerGlowBottomRight} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.decorIcon}>
              <Ionicons name="flame" size={20} color="#FF8C00" />
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={() => router.push('/(auth)/welcome')}>
              <Ionicons name="close" size={28} color="#888" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.greeting}>Get started now</Text>
            <Text style={styles.title}>Create an account</Text>

            {/* Social Login */}
            <Text style={styles.socialLabel}>Continue with</Text>
            
            <View style={styles.socialButtonsRow}>
              <TouchableOpacity style={styles.socialButton} onPress={handleGoogleLogin}>
                <Image source={{ uri: 'https://www.google.com/favicon.ico' }} style={styles.socialIcon} />
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialButton} onPress={handleFacebookLogin}>
                <View style={styles.facebookIcon}>
                  <FontAwesome name="facebook" size={20} color="#FFF" />
                </View>
                <Text style={styles.socialButtonText}>Facebook</Text>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Proceed with Email Button */}
            <TouchableOpacity style={styles.actionButton} onPress={() => setShowEmailForm(true)}>
              <LinearGradient colors={['#FF8C00', '#FF6B00']} style={styles.actionButtonGradient}>
                <Text style={styles.actionButtonText}>Proceed with email</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.footerLinks}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.loginLinkText}>Log in</Text>
              </TouchableOpacity>
            </View>

            {/* Promo Banner */}
            <View style={styles.promoBanner}>
              <LinearGradient colors={['#2A1A0A', '#1A1A1A']} style={styles.promoBannerGradient}>
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
                    <Ionicons name="bar-chart" size={20} color="#FF8C00" />
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Terms */}
            <Text style={styles.termsText}>
              By creating an account, you agree to and accept our{' '}
              <Text style={styles.termsLink} onPress={() => router.push('/(auth)/service-agreement')}>Terms & Conditions</Text>
              {' '}and{' '}
              <Text style={styles.termsLink} onPress={() => router.push('/(auth)/privacy-policy')}>Privacy Policy</Text>
            </Text>
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
    backgroundColor: '#FF8C00',
    opacity: 0.05,
    borderBottomRightRadius: 150,
  },
  cornerGlowBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 200,
    height: 200,
    backgroundColor: '#FF8C00',
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
  decorIcon: {
    width: 32,
    height: 32,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
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
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -10,
    marginBottom: 15,
    gap: 6,
  },
  matchText: {
    fontSize: 13,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
    gap: 8,
  },
  footerText: {
    color: '#888',
    fontSize: 15,
  },
  loginLinkText: {
    color: '#FF8C00',
    fontSize: 15,
    fontWeight: '700',
  },
  promoBanner: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FF8C0030',
    marginBottom: 20,
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
    color: '#FF8C00',
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
    backgroundColor: '#FF8C0020',
    justifyContent: 'center',
    alignItems: 'center',
  },
  termsText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: '#FF8C00',
    textDecorationLine: 'underline',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  restrictedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF8C0015',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  restrictedText: {
    flex: 1,
    color: '#FF8C00',
    fontSize: 12,
  },
  countryList: {
    maxHeight: 400,
  },
  regionHeader: {
    color: '#FF8C00',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 15,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  countryItemSelected: {
    backgroundColor: '#FF8C0015',
    borderRadius: 10,
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
  },
  // OTP Styles
  otpContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: 'center',
  },
  otpBackBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 55 : 35,
    left: 24,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF8C0020',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  otpTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 12,
  },
  otpSubtitle: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
  },
  otpEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF8C00',
    marginBottom: 32,
  },
  otpInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 32,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
    borderWidth: 2,
    borderColor: '#333',
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  otpInputFilled: {
    borderColor: '#FF8C00',
    backgroundColor: '#FF8C0015',
  },
  verifyBtn: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  verifyBtnDisabled: {
    opacity: 0.6,
  },
  verifyBtnGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  verifyBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  otpResendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  otpResendText: {
    color: '#888',
    fontSize: 14,
  },
  otpResendLink: {
    color: '#FF8C00',
    fontSize: 14,
    fontWeight: '600',
  },
  otpResendLinkDisabled: {
    color: '#666',
  },
});
