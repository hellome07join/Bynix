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
import { api } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

declare const window: any;

export default function Signup() {
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      if (Platform.OS === 'web') {
        window.alert('Please fill all fields');
      } else {
        Alert.alert('Error', 'Please fill all fields');
      }
      return;
    }

    if (password !== confirmPassword) {
      if (Platform.OS === 'web') {
        window.alert('Passwords do not match');
      } else {
        Alert.alert('Error', 'Passwords do not match');
      }
      return;
    }

    if (password.length < 6) {
      if (Platform.OS === 'web') {
        window.alert('Password must be at least 6 characters');
      } else {
        Alert.alert('Error', 'Password must be at least 6 characters');
      }
      return;
    }

    setLoading(true);
    try {
      const response = await api.signup({ name, email, password });
      
      await AsyncStorage.setItem('signup_email', email);
      await AsyncStorage.setItem('dev_otp', response.otp);
      
      if (Platform.OS === 'web') {
        window.alert(`Verification code sent to your email. (DEV: ${response.otp})`);
        router.push('/(auth)/verify-otp');
      } else {
        Alert.alert(
          'Success', 
          `Verification code sent to your email. (DEV: ${response.otp})`,
          [{ text: 'OK', onPress: () => router.push('/(auth)/verify-otp') }]
        );
      }
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(error.message || 'Could not create account');
      } else {
        Alert.alert('Signup Failed', error.message || 'Could not create account');
      }
    } finally {
      setLoading(false);
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
            <Text style={styles.logoSubtext}>Start Your Trading Journey</Text>
          </Animated.View>

          {/* Form Section */}
          <Animated.View style={[styles.formContainer, { opacity: formOpacity }]}>
            <View style={styles.formCard}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join thousands of traders worldwide</Text>

              {/* Name Input - 3D Style */}
              <View style={styles.inputWrapper}>
                <View style={styles.input3D}>
                  <View style={styles.inputInner}>
                    <Ionicons name="person" size={20} color="#00E55A" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Full Name"
                      placeholderTextColor="#666"
                      value={name}
                      onChangeText={setName}
                    />
                  </View>
                </View>
              </View>

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

              {/* Confirm Password Input - 3D Style */}
              <View style={styles.inputWrapper}>
                <View style={styles.input3D}>
                  <View style={styles.inputInner}>
                    <Ionicons name="shield-checkmark" size={20} color="#00E55A" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm Password"
                      placeholderTextColor="#666"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showPassword}
                    />
                  </View>
                </View>
              </View>

              {/* Signup Button - 3D Neon */}
              <TouchableOpacity 
                style={styles.signupButton3D}
                onPress={handleSignup}
                disabled={loading}
                activeOpacity={0.8}
              >
                <View style={styles.signupButtonInner}>
                  {loading ? (
                    <ActivityIndicator color="#0A1A0F" />
                  ) : (
                    <>
                      <Ionicons name="rocket" size={20} color="#0A1A0F" />
                      <Text style={styles.signupButtonText}>Create Account</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>

              {/* Bonus Info */}
              <View style={styles.bonusInfo}>
                <Ionicons name="gift" size={16} color="#FFD700" />
                <Text style={styles.bonusText}>Get $10,000 demo balance + 200% first deposit bonus!</Text>
              </View>

              {/* Login Link */}
              <TouchableOpacity 
                onPress={() => router.push('/(auth)/login')}
                style={styles.loginLink}
              >
                <Text style={styles.loginLinkText}>
                  Already have an account? <Text style={styles.loginLinkBold}>Login</Text>
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
    left: -100,
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
    bottom: 50,
    right: -100,
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
    marginBottom: 20,
  },
  logo3DWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  logoGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#00E55A',
    opacity: 0.2,
    top: -8,
    left: -8,
    shadowColor: '#00E55A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 25,
  },
  logoInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
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
    width: 56,
    height: 56,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#00E55A',
    letterSpacing: 6,
    textShadowColor: 'rgba(0, 229, 90, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  logoSubtext: {
    fontSize: 11,
    color: '#FFFFFF',
    opacity: 0.6,
    letterSpacing: 1,
    marginTop: 4,
  },
  formContainer: {
    flex: 1,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 90, 0.1)',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.6,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputWrapper: {
    marginBottom: 14,
  },
  input3D: {
    borderRadius: 14,
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
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    paddingVertical: 12,
  },
  signupButton3D: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#00E55A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  signupButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E55A',
    paddingVertical: 14,
    gap: 8,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  signupButtonText: {
    color: '#0A1A0F',
    fontSize: 17,
    fontWeight: 'bold',
  },
  bonusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  bonusText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 20,
  },
  loginLinkText: {
    color: '#FFFFFF',
    opacity: 0.6,
    fontSize: 14,
  },
  loginLinkBold: {
    color: '#00E55A',
    fontWeight: 'bold',
  },
});
