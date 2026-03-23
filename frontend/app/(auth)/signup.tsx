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
  Easing,
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

declare const window: any;

// Allowed countries for signup
const ALLOWED_COUNTRIES = [
  // Asia
  { name: 'India', flag: '🇮🇳', region: 'Asia' },
  { name: 'Bangladesh', flag: '🇧🇩', region: 'Asia' },
  { name: 'Malaysia', flag: '🇲🇾', region: 'Asia' },
  { name: 'Pakistan', flag: '🇵🇰', region: 'Asia' },
  { name: 'Thailand', flag: '🇹🇭', region: 'Asia' },
  { name: 'Philippines', flag: '🇵🇭', region: 'Asia' },
  { name: 'Vietnam', flag: '🇻🇳', region: 'Asia' },
  { name: 'Indonesia', flag: '🇮🇩', region: 'Asia' },
  { name: 'Uzbekistan', flag: '🇺🇿', region: 'Asia' },
  // Africa
  { name: 'South Africa', flag: '🇿🇦', region: 'Africa' },
  { name: 'Kenya', flag: '🇰🇪', region: 'Africa' },
  { name: 'Nigeria', flag: '🇳🇬', region: 'Africa' },
  // Latin America
  { name: 'Brazil', flag: '🇧🇷', region: 'Latin America' },
  { name: 'Mexico', flag: '🇲🇽', region: 'Latin America' },
  { name: 'Argentina', flag: '🇦🇷', region: 'Latin America' },
];

const RESTRICTED_COUNTRIES = [
  'United States', 'Canada', 'European Union (EU)', 'European Economic Area (EEA)',
  'Russia', 'Hong Kong', 'Israel'
];

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

// Data Stream Component - New animated element
const DataStream = ({ delay, left }: { delay: number; left: number }) => {
  const animValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(animValue, {
          toValue: 1,
          duration: 1500,
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
        styles.dataStream,
        {
          left,
          opacity: animValue.interpolate({
            inputRange: [0, 0.3, 0.7, 1],
            outputRange: [0, 0.8, 0.8, 0],
          }),
          transform: [{
            translateY: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [-50, height + 50],
            }),
          }],
        },
      ]}
    />
  );
};

export default function Signup() {
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<{name: string; flag: string; region: string} | null>(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Animations
  const logoRotate = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0)).current;
  const formSlide = useRef(new Animated.Value(50)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const scanLine = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glitchAnim = useRef(new Animated.Value(0)).current;
  const hexagonRotate = useRef(new Animated.Value(0)).current;

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

    // Hexagon counter-rotation
    Animated.loop(
      Animated.timing(hexagonRotate, {
        toValue: 1,
        duration: 15000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

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
          toValue: 1.15,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
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

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      if (Platform.OS === 'web') {
        window.alert('Please fill all fields');
      } else {
        Alert.alert('Error', 'Please fill all fields');
      }
      return;
    }

    if (!selectedCountry) {
      if (Platform.OS === 'web') {
        window.alert('Please select your country');
      } else {
        Alert.alert('Error', 'Please select your country');
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
      const response = await api.signup({ 
        name, 
        email, 
        password,
        country: selectedCountry.name,
        country_flag: selectedCountry.flag,
      });
      
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

  const spin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const counterSpin = hexagonRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  // Password strength indicator
  const getPasswordStrength = () => {
    if (password.length === 0) return { level: 0, text: '', color: '#333' };
    if (password.length < 6) return { level: 1, text: 'WEAK', color: '#FF4444' };
    if (password.length < 10) return { level: 2, text: 'MEDIUM', color: '#FFAA00' };
    return { level: 3, text: 'STRONG', color: '#00E55A' };
  };

  const passwordStrength = getPasswordStrength();

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

      {/* Data Streams */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <DataStream key={`ds-${i}`} delay={i * 250} left={(width / 6) * i + 20} />
      ))}

      {/* Floating Particles */}
      {[...Array(12)].map((_, i) => (
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
            {/* Outer Hexagon Ring */}
            <Animated.View 
              style={[
                styles.hexagonRing,
                { transform: [{ rotate: counterSpin }, { scale: logoScale }] }
              ]}
            >
              <View style={styles.hexagonBorder} />
            </Animated.View>

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
            <Animated.View style={[styles.pulseRing2, { transform: [{ scale: pulseAnim }], opacity: 0.4 }]} />

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
                <Text style={styles.statusText}>NEW USER</Text>
              </View>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, styles.statusPending]} />
                <Text style={styles.statusText}>REGISTRATION</Text>
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
              <Text style={styles.formTitle}>CREATE ACCOUNT</Text>
              <View style={styles.titleUnderline} />

              {/* Name Input */}
              <View style={[
                styles.inputContainer,
                focusedInput === 'name' && styles.inputFocused
              ]}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="person-outline" size={18} color="#00E55A" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="ENTER FULL NAME"
                  placeholderTextColor="#444"
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocusedInput('name')}
                  onBlur={() => setFocusedInput(null)}
                />
                {name.length > 0 && (
                  <Ionicons name="checkmark-circle" size={18} color="#00E55A" />
                )}
              </View>

              {/* Email Input */}
              <View style={[
                styles.inputContainer,
                focusedInput === 'email' && styles.inputFocused
              ]}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="mail-outline" size={18} color="#00E55A" />
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
                {email.includes('@') && email.includes('.') && (
                  <Ionicons name="checkmark-circle" size={18} color="#00E55A" />
                )}
              </View>

              {/* Country Selector */}
              <TouchableOpacity 
                style={[
                  styles.inputContainer,
                  styles.countrySelector,
                  focusedInput === 'country' && styles.inputFocused
                ]}
                onPress={() => setShowCountryPicker(true)}
              >
                <View style={styles.inputIconContainer}>
                  <Ionicons name="globe-outline" size={18} color="#00E55A" />
                </View>
                <Text style={[
                  styles.input,
                  styles.countrySelectorText,
                  !selectedCountry && { color: '#444' }
                ]}>
                  {selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : 'SELECT COUNTRY'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#00E55A" />
              </TouchableOpacity>

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

              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBars}>
                    {[1, 2, 3].map((level) => (
                      <View 
                        key={level}
                        style={[
                          styles.strengthBar,
                          { backgroundColor: level <= passwordStrength.level ? passwordStrength.color : '#222' }
                        ]} 
                      />
                    ))}
                  </View>
                  <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                    {passwordStrength.text}
                  </Text>
                </View>
              )}

              {/* Confirm Password Input */}
              <View style={[
                styles.inputContainer,
                focusedInput === 'confirm' && styles.inputFocused
              ]}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#00E55A" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="CONFIRM PASSWORD"
                  placeholderTextColor="#444"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  onFocus={() => setFocusedInput('confirm')}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Ionicons 
                    name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                    size={18} 
                    color="#00E55A" 
                  />
                </TouchableOpacity>
              </View>

              {/* Password Match Indicator */}
              {confirmPassword.length > 0 && (
                <View style={styles.matchContainer}>
                  <Ionicons 
                    name={password === confirmPassword ? "checkmark-circle" : "close-circle"} 
                    size={14} 
                    color={password === confirmPassword ? "#00E55A" : "#FF4444"} 
                  />
                  <Text style={[
                    styles.matchText,
                    { color: password === confirmPassword ? "#00E55A" : "#FF4444" }
                  ]}>
                    {password === confirmPassword ? "PASSWORDS MATCH" : "PASSWORDS DO NOT MATCH"}
                  </Text>
                </View>
              )}

              {/* Signup Button */}
              <TouchableOpacity 
                style={styles.signupButton}
                onPress={handleSignup}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#00E55A', '#00B347']}
                  style={styles.signupButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <>
                      <Ionicons name="rocket" size={18} color="#000" />
                      <Text style={styles.signupButtonText}>INITIATE REGISTRATION</Text>
                    </>
                  )}
                </LinearGradient>
                <View style={styles.buttonCorner} />
                <View style={[styles.buttonCorner, styles.buttonCornerBR]} />
              </TouchableOpacity>

              {/* Bonus Badge */}
              <View style={styles.bonusBadge}>
                <LinearGradient
                  colors={['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.05)']}
                  style={styles.bonusGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="gift" size={16} color="#FFD700" />
                  <Text style={styles.bonusText}>200% BONUS ON FIRST DEPOSIT</Text>
                  <View style={styles.bonusPulse} />
                </LinearGradient>
              </View>

              {/* Login Link */}
              <TouchableOpacity 
                onPress={() => router.push('/(auth)/login')}
                style={styles.loginLink}
              >
                <Text style={styles.loginLinkText}>
                  EXISTING USER? <Text style={styles.loginLinkBold}>ACCESS TERMINAL</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Footer */}
          <Text style={styles.footerText}>v2.0.0 | ENCRYPTED CONNECTION</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country Picker Modal */}
      <Modal visible={showCountryPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>SELECT COUNTRY</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <Ionicons name="close-circle" size={28} color="#666" />
              </TouchableOpacity>
            </View>
            
            {/* Restricted Notice */}
            <View style={styles.restrictedNotice}>
              <Ionicons name="warning" size={16} color="#FF6B6B" />
              <Text style={styles.restrictedText}>
                Service not available in: US, Canada, EU, EEA, Russia, Hong Kong, Israel
              </Text>
            </View>

            <ScrollView style={styles.countryList}>
              {/* Asia */}
              <Text style={styles.regionHeader}>ASIA</Text>
              {ALLOWED_COUNTRIES.filter(c => c.region === 'Asia').map((country) => (
                <TouchableOpacity
                  key={country.name}
                  style={[
                    styles.countryItem,
                    selectedCountry?.name === country.name && styles.countryItemSelected
                  ]}
                  onPress={() => {
                    setSelectedCountry(country);
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={styles.countryFlag}>{country.flag}</Text>
                  <Text style={styles.countryName}>{country.name}</Text>
                  {selectedCountry?.name === country.name && (
                    <Ionicons name="checkmark-circle" size={20} color="#00E55A" />
                  )}
                </TouchableOpacity>
              ))}

              {/* Africa */}
              <Text style={styles.regionHeader}>AFRICA</Text>
              {ALLOWED_COUNTRIES.filter(c => c.region === 'Africa').map((country) => (
                <TouchableOpacity
                  key={country.name}
                  style={[
                    styles.countryItem,
                    selectedCountry?.name === country.name && styles.countryItemSelected
                  ]}
                  onPress={() => {
                    setSelectedCountry(country);
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={styles.countryFlag}>{country.flag}</Text>
                  <Text style={styles.countryName}>{country.name}</Text>
                  {selectedCountry?.name === country.name && (
                    <Ionicons name="checkmark-circle" size={20} color="#00E55A" />
                  )}
                </TouchableOpacity>
              ))}

              {/* Latin America */}
              <Text style={styles.regionHeader}>LATIN AMERICA</Text>
              {ALLOWED_COUNTRIES.filter(c => c.region === 'Latin America').map((country) => (
                <TouchableOpacity
                  key={country.name}
                  style={[
                    styles.countryItem,
                    selectedCountry?.name === country.name && styles.countryItemSelected
                  ]}
                  onPress={() => {
                    setSelectedCountry(country);
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={styles.countryFlag}>{country.flag}</Text>
                  <Text style={styles.countryName}>{country.name}</Text>
                  {selectedCountry?.name === country.name && (
                    <Ionicons name="checkmark-circle" size={20} color="#00E55A" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  dataStream: {
    position: 'absolute',
    width: 2,
    height: 30,
    backgroundColor: '#00E55A',
    borderRadius: 1,
    shadowColor: '#00E55A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
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
    marginBottom: 20,
    height: 180,
    justifyContent: 'center',
  },
  hexagonRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hexagonBorder: {
    width: 150,
    height: 150,
    borderWidth: 1,
    borderColor: '#00E55A33',
    borderRadius: 75,
    borderStyle: 'dashed',
  },
  logoRingOuter: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ringGradient: {
    flex: 1,
    borderRadius: 65,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
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
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#00E55A',
    opacity: 0.1,
  },
  logoImage: {
    width: 55,
    height: 55,
  },
  pulseRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    borderColor: '#00E55A',
    opacity: 0.3,
  },
  pulseRing2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: '#00E55A',
  },
  logoText: {
    marginTop: 15,
    fontSize: 32,
    fontWeight: '900',
    color: '#00E55A',
    letterSpacing: 10,
    textShadowColor: '#00E55A',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  logoSubtext: {
    fontSize: 9,
    color: '#00E55A',
    opacity: 0.6,
    letterSpacing: 4,
    marginTop: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  statusRow: {
    flexDirection: 'row',
    marginTop: 10,
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
  statusPending: {
    backgroundColor: '#FFAA00',
    shadowColor: '#FFAA00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  statusText: {
    fontSize: 8,
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
    padding: 20,
  },
  formTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00E55A',
    letterSpacing: 4,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  titleUnderline: {
    height: 1,
    backgroundColor: '#00E55A',
    marginTop: 10,
    marginBottom: 20,
    opacity: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 90, 0.05)',
    borderRadius: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#00E55A33',
    paddingHorizontal: 12,
  },
  inputFocused: {
    borderColor: '#00E55A',
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
    shadowColor: '#00E55A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  inputIconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    color: '#00E55A',
    fontSize: 13,
    paddingVertical: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: -6,
    paddingHorizontal: 4,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  strengthBar: {
    height: 3,
    flex: 1,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
    marginLeft: 10,
  },
  matchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: -6,
    paddingHorizontal: 4,
    gap: 6,
  },
  matchText: {
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  signupButton: {
    marginTop: 4,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  signupButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  signupButtonText: {
    color: '#000',
    fontSize: 13,
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
  bonusBadge: {
    marginTop: 16,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  bonusGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  bonusText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  bonusPulse: {
    position: 'absolute',
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  loginLinkText: {
    color: '#666',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  loginLinkBold: {
    color: '#00E55A',
    fontWeight: 'bold',
  },
  footerText: {
    textAlign: 'center',
    color: '#333',
    fontSize: 9,
    marginTop: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 2,
  },
  countrySelector: {
    justifyContent: 'space-between',
  },
  countrySelectorText: {
    flex: 1,
    paddingVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0A1A0F',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#00E55A33',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00E55A',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  restrictedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    gap: 8,
  },
  restrictedText: {
    flex: 1,
    color: '#FF6B6B',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  countryList: {
    maxHeight: 400,
  },
  regionHeader: {
    color: '#00E55A',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 12,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    opacity: 0.7,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 229, 90, 0.1)',
  },
  countryItemSelected: {
    backgroundColor: 'rgba(0, 229, 90, 0.15)',
    borderRadius: 8,
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
