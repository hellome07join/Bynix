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
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, FontAwesome } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { API_URL, api } from '../../utils/api';
import * as WebBrowser from 'expo-web-browser';

declare const window: any;

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
  
  // Sidebar modal states
  const [showLoginSidebar, setShowLoginSidebar] = useState(false);
  const [showSignupSidebar, setShowSignupSidebar] = useState(false);
  const sidebarSlide = useRef(new Animated.Value(width)).current;
  
  // Login form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup form states
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<{name: string; flag: string; restricted?: boolean} | null>(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  
  // OTP verification states
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef<any[]>([]);

  // OTP Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // All 195 countries with restricted flag
  const ALL_COUNTRIES = [
    { name: 'Afghanistan', flag: '🇦🇫', restricted: false },
    { name: 'Albania', flag: '🇦🇱', restricted: false },
    { name: 'Algeria', flag: '🇩🇿', restricted: false },
    { name: 'Andorra', flag: '🇦🇩', restricted: false },
    { name: 'Angola', flag: '🇦🇴', restricted: false },
    { name: 'Antigua and Barbuda', flag: '🇦🇬', restricted: false },
    { name: 'Argentina', flag: '🇦🇷', restricted: false },
    { name: 'Armenia', flag: '🇦🇲', restricted: false },
    { name: 'Australia', flag: '🇦🇺', restricted: false },
    { name: 'Austria', flag: '🇦🇹', restricted: true }, // EEA
    { name: 'Azerbaijan', flag: '🇦🇿', restricted: false },
    { name: 'Bahamas', flag: '🇧🇸', restricted: false },
    { name: 'Bahrain', flag: '🇧🇭', restricted: false },
    { name: 'Bangladesh', flag: '🇧🇩', restricted: false },
    { name: 'Barbados', flag: '🇧🇧', restricted: false },
    { name: 'Belarus', flag: '🇧🇾', restricted: false },
    { name: 'Belgium', flag: '🇧🇪', restricted: true }, // EEA
    { name: 'Belize', flag: '🇧🇿', restricted: false },
    { name: 'Benin', flag: '🇧🇯', restricted: false },
    { name: 'Bhutan', flag: '🇧🇹', restricted: false },
    { name: 'Bolivia', flag: '🇧🇴', restricted: false },
    { name: 'Bosnia and Herzegovina', flag: '🇧🇦', restricted: false },
    { name: 'Botswana', flag: '🇧🇼', restricted: false },
    { name: 'Brazil', flag: '🇧🇷', restricted: false },
    { name: 'Brunei', flag: '🇧🇳', restricted: false },
    { name: 'Bulgaria', flag: '🇧🇬', restricted: true }, // EEA
    { name: 'Burkina Faso', flag: '🇧🇫', restricted: false },
    { name: 'Burundi', flag: '🇧🇮', restricted: false },
    { name: 'Cambodia', flag: '🇰🇭', restricted: false },
    { name: 'Cameroon', flag: '🇨🇲', restricted: false },
    { name: 'Canada', flag: '🇨🇦', restricted: true }, // Restricted
    { name: 'Cape Verde', flag: '🇨🇻', restricted: false },
    { name: 'Central African Republic', flag: '🇨🇫', restricted: false },
    { name: 'Chad', flag: '🇹🇩', restricted: false },
    { name: 'Chile', flag: '🇨🇱', restricted: false },
    { name: 'China', flag: '🇨🇳', restricted: false },
    { name: 'Colombia', flag: '🇨🇴', restricted: false },
    { name: 'Comoros', flag: '🇰🇲', restricted: false },
    { name: 'Congo', flag: '🇨🇬', restricted: false },
    { name: 'Costa Rica', flag: '🇨🇷', restricted: false },
    { name: 'Croatia', flag: '🇭🇷', restricted: true }, // EEA
    { name: 'Cuba', flag: '🇨🇺', restricted: false },
    { name: 'Cyprus', flag: '🇨🇾', restricted: true }, // EEA
    { name: 'Czech Republic', flag: '🇨🇿', restricted: true }, // EEA
    { name: 'Denmark', flag: '🇩🇰', restricted: true }, // EEA
    { name: 'Djibouti', flag: '🇩🇯', restricted: false },
    { name: 'Dominica', flag: '🇩🇲', restricted: false },
    { name: 'Dominican Republic', flag: '🇩🇴', restricted: false },
    { name: 'DR Congo', flag: '🇨🇩', restricted: false },
    { name: 'East Timor', flag: '🇹🇱', restricted: false },
    { name: 'Ecuador', flag: '🇪🇨', restricted: false },
    { name: 'Egypt', flag: '🇪🇬', restricted: false },
    { name: 'El Salvador', flag: '🇸🇻', restricted: false },
    { name: 'Equatorial Guinea', flag: '🇬🇶', restricted: false },
    { name: 'Eritrea', flag: '🇪🇷', restricted: false },
    { name: 'Estonia', flag: '🇪🇪', restricted: true }, // EEA
    { name: 'Eswatini', flag: '🇸🇿', restricted: false },
    { name: 'Ethiopia', flag: '🇪🇹', restricted: false },
    { name: 'Fiji', flag: '🇫🇯', restricted: false },
    { name: 'Finland', flag: '🇫🇮', restricted: true }, // EEA
    { name: 'France', flag: '🇫🇷', restricted: true }, // EEA
    { name: 'Gabon', flag: '🇬🇦', restricted: false },
    { name: 'Gambia', flag: '🇬🇲', restricted: false },
    { name: 'Georgia', flag: '🇬🇪', restricted: false },
    { name: 'Germany', flag: '🇩🇪', restricted: true }, // EEA
    { name: 'Ghana', flag: '🇬🇭', restricted: false },
    { name: 'Greece', flag: '🇬🇷', restricted: true }, // EEA
    { name: 'Grenada', flag: '🇬🇩', restricted: false },
    { name: 'Guatemala', flag: '🇬🇹', restricted: false },
    { name: 'Guinea', flag: '🇬🇳', restricted: false },
    { name: 'Guinea-Bissau', flag: '🇬🇼', restricted: false },
    { name: 'Guyana', flag: '🇬🇾', restricted: false },
    { name: 'Haiti', flag: '🇭🇹', restricted: false },
    { name: 'Honduras', flag: '🇭🇳', restricted: false },
    { name: 'Hong Kong', flag: '🇭🇰', restricted: true }, // Restricted
    { name: 'Hungary', flag: '🇭🇺', restricted: true }, // EEA
    { name: 'Iceland', flag: '🇮🇸', restricted: true }, // EEA
    { name: 'India', flag: '🇮🇳', restricted: false },
    { name: 'Indonesia', flag: '🇮🇩', restricted: false },
    { name: 'Iran', flag: '🇮🇷', restricted: false },
    { name: 'Iraq', flag: '🇮🇶', restricted: false },
    { name: 'Ireland', flag: '🇮🇪', restricted: true }, // EEA
    { name: 'Israel', flag: '🇮🇱', restricted: true }, // Restricted
    { name: 'Italy', flag: '🇮🇹', restricted: true }, // EEA
    { name: 'Ivory Coast', flag: '🇨🇮', restricted: false },
    { name: 'Jamaica', flag: '🇯🇲', restricted: false },
    { name: 'Japan', flag: '🇯🇵', restricted: false },
    { name: 'Jordan', flag: '🇯🇴', restricted: false },
    { name: 'Kazakhstan', flag: '🇰🇿', restricted: false },
    { name: 'Kenya', flag: '🇰🇪', restricted: false },
    { name: 'Kiribati', flag: '🇰🇮', restricted: false },
    { name: 'Kosovo', flag: '🇽🇰', restricted: false },
    { name: 'Kuwait', flag: '🇰🇼', restricted: false },
    { name: 'Kyrgyzstan', flag: '🇰🇬', restricted: false },
    { name: 'Laos', flag: '🇱🇦', restricted: false },
    { name: 'Latvia', flag: '🇱🇻', restricted: true }, // EEA
    { name: 'Lebanon', flag: '🇱🇧', restricted: false },
    { name: 'Lesotho', flag: '🇱🇸', restricted: false },
    { name: 'Liberia', flag: '🇱🇷', restricted: false },
    { name: 'Libya', flag: '🇱🇾', restricted: false },
    { name: 'Liechtenstein', flag: '🇱🇮', restricted: true }, // EEA
    { name: 'Lithuania', flag: '🇱🇹', restricted: true }, // EEA
    { name: 'Luxembourg', flag: '🇱🇺', restricted: true }, // EEA
    { name: 'Madagascar', flag: '🇲🇬', restricted: false },
    { name: 'Malawi', flag: '🇲🇼', restricted: false },
    { name: 'Malaysia', flag: '🇲🇾', restricted: false },
    { name: 'Maldives', flag: '🇲🇻', restricted: false },
    { name: 'Mali', flag: '🇲🇱', restricted: false },
    { name: 'Malta', flag: '🇲🇹', restricted: true }, // EEA
    { name: 'Marshall Islands', flag: '🇲🇭', restricted: false },
    { name: 'Mauritania', flag: '🇲🇷', restricted: false },
    { name: 'Mauritius', flag: '🇲🇺', restricted: false },
    { name: 'Mexico', flag: '🇲🇽', restricted: false },
    { name: 'Micronesia', flag: '🇫🇲', restricted: false },
    { name: 'Moldova', flag: '🇲🇩', restricted: false },
    { name: 'Monaco', flag: '🇲🇨', restricted: false },
    { name: 'Mongolia', flag: '🇲🇳', restricted: false },
    { name: 'Montenegro', flag: '🇲🇪', restricted: false },
    { name: 'Morocco', flag: '🇲🇦', restricted: false },
    { name: 'Mozambique', flag: '🇲🇿', restricted: false },
    { name: 'Myanmar', flag: '🇲🇲', restricted: false },
    { name: 'Namibia', flag: '🇳🇦', restricted: false },
    { name: 'Nauru', flag: '🇳🇷', restricted: false },
    { name: 'Nepal', flag: '🇳🇵', restricted: false },
    { name: 'Netherlands', flag: '🇳🇱', restricted: true }, // EEA
    { name: 'New Zealand', flag: '🇳🇿', restricted: false },
    { name: 'Nicaragua', flag: '🇳🇮', restricted: false },
    { name: 'Niger', flag: '🇳🇪', restricted: false },
    { name: 'Nigeria', flag: '🇳🇬', restricted: false },
    { name: 'North Korea', flag: '🇰🇵', restricted: false },
    { name: 'North Macedonia', flag: '🇲🇰', restricted: false },
    { name: 'Norway', flag: '🇳🇴', restricted: true }, // EEA
    { name: 'Oman', flag: '🇴🇲', restricted: false },
    { name: 'Pakistan', flag: '🇵🇰', restricted: false },
    { name: 'Palau', flag: '🇵🇼', restricted: false },
    { name: 'Palestine', flag: '🇵🇸', restricted: false },
    { name: 'Panama', flag: '🇵🇦', restricted: false },
    { name: 'Papua New Guinea', flag: '🇵🇬', restricted: false },
    { name: 'Paraguay', flag: '🇵🇾', restricted: false },
    { name: 'Peru', flag: '🇵🇪', restricted: false },
    { name: 'Philippines', flag: '🇵🇭', restricted: false },
    { name: 'Poland', flag: '🇵🇱', restricted: true }, // EEA
    { name: 'Portugal', flag: '🇵🇹', restricted: true }, // EEA
    { name: 'Qatar', flag: '🇶🇦', restricted: false },
    { name: 'Romania', flag: '🇷🇴', restricted: true }, // EEA
    { name: 'Russia', flag: '🇷🇺', restricted: true }, // Restricted
    { name: 'Rwanda', flag: '🇷🇼', restricted: false },
    { name: 'Saint Kitts and Nevis', flag: '🇰🇳', restricted: false },
    { name: 'Saint Lucia', flag: '🇱🇨', restricted: false },
    { name: 'Saint Vincent', flag: '🇻🇨', restricted: false },
    { name: 'Samoa', flag: '🇼🇸', restricted: false },
    { name: 'San Marino', flag: '🇸🇲', restricted: false },
    { name: 'Sao Tome and Principe', flag: '🇸🇹', restricted: false },
    { name: 'Saudi Arabia', flag: '🇸🇦', restricted: false },
    { name: 'Senegal', flag: '🇸🇳', restricted: false },
    { name: 'Serbia', flag: '🇷🇸', restricted: false },
    { name: 'Seychelles', flag: '🇸🇨', restricted: false },
    { name: 'Sierra Leone', flag: '🇸🇱', restricted: false },
    { name: 'Singapore', flag: '🇸🇬', restricted: false },
    { name: 'Slovakia', flag: '🇸🇰', restricted: true }, // EEA
    { name: 'Slovenia', flag: '🇸🇮', restricted: true }, // EEA
    { name: 'Solomon Islands', flag: '🇸🇧', restricted: false },
    { name: 'Somalia', flag: '🇸🇴', restricted: false },
    { name: 'South Africa', flag: '🇿🇦', restricted: false },
    { name: 'South Korea', flag: '🇰🇷', restricted: false },
    { name: 'South Sudan', flag: '🇸🇸', restricted: false },
    { name: 'Spain', flag: '🇪🇸', restricted: true }, // EEA
    { name: 'Sri Lanka', flag: '🇱🇰', restricted: false },
    { name: 'Sudan', flag: '🇸🇩', restricted: false },
    { name: 'Suriname', flag: '🇸🇷', restricted: false },
    { name: 'Sweden', flag: '🇸🇪', restricted: true }, // EEA
    { name: 'Switzerland', flag: '🇨🇭', restricted: false },
    { name: 'Syria', flag: '🇸🇾', restricted: false },
    { name: 'Taiwan', flag: '🇹🇼', restricted: false },
    { name: 'Tajikistan', flag: '🇹🇯', restricted: false },
    { name: 'Tanzania', flag: '🇹🇿', restricted: false },
    { name: 'Thailand', flag: '🇹🇭', restricted: false },
    { name: 'Togo', flag: '🇹🇬', restricted: false },
    { name: 'Tonga', flag: '🇹🇴', restricted: false },
    { name: 'Trinidad and Tobago', flag: '🇹🇹', restricted: false },
    { name: 'Tunisia', flag: '🇹🇳', restricted: false },
    { name: 'Turkey', flag: '🇹🇷', restricted: false },
    { name: 'Turkmenistan', flag: '🇹🇲', restricted: false },
    { name: 'Tuvalu', flag: '🇹🇻', restricted: false },
    { name: 'Uganda', flag: '🇺🇬', restricted: false },
    { name: 'Ukraine', flag: '🇺🇦', restricted: false },
    { name: 'United Arab Emirates', flag: '🇦🇪', restricted: false },
    { name: 'United Kingdom', flag: '🇬🇧', restricted: false },
    { name: 'United States', flag: '🇺🇸', restricted: true }, // Restricted
    { name: 'Uruguay', flag: '🇺🇾', restricted: false },
    { name: 'Uzbekistan', flag: '🇺🇿', restricted: false },
    { name: 'Vanuatu', flag: '🇻🇺', restricted: false },
    { name: 'Vatican City', flag: '🇻🇦', restricted: false },
    { name: 'Venezuela', flag: '🇻🇪', restricted: false },
    { name: 'Vietnam', flag: '🇻🇳', restricted: false },
    { name: 'Yemen', flag: '🇾🇪', restricted: false },
    { name: 'Zambia', flag: '🇿🇲', restricted: false },
    { name: 'Zimbabwe', flag: '🇿🇼', restricted: false },
  ];

  // Get available (non-restricted) countries count
  const availableCountriesCount = ALL_COUNTRIES.filter(c => !c.restricted).length;

  // Open sidebar with animation
  const openSidebar = (type: 'login' | 'signup') => {
    if (type === 'login') {
      setShowLoginSidebar(true);
    } else {
      setShowSignupSidebar(true);
    }
    Animated.spring(sidebarSlide, {
      toValue: 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  };

  // Close sidebar with animation
  const closeSidebar = () => {
    Animated.timing(sidebarSlide, {
      toValue: width,
      duration: 250,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start(() => {
      setShowLoginSidebar(false);
      setShowSignupSidebar(false);
      sidebarSlide.setValue(width);
    });
  };

  // Handle login
  const handleSidebarLogin = async () => {
    if (!loginEmail || !loginPassword) {
      if (Platform.OS === 'web') window.alert('Please fill all fields');
      else Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setLoginLoading(true);
    try {
      const response = await api.login({ email: loginEmail, password: loginPassword });
      await login(response.access_token, response.user);
      closeSidebar();
      router.replace('/(tabs)/trade');
    } catch (error: any) {
      if (Platform.OS === 'web') window.alert(error.message || 'Invalid credentials');
      else Alert.alert('Login Failed', error.message || 'Invalid credentials');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Google login
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
          closeSidebar();
          router.replace('/(tabs)/trade');
        }
      }
    } catch (error: any) {
      if (Platform.OS === 'web') window.alert(error.message || 'Google login failed');
      else Alert.alert('Google Login Failed', error.message);
    }
  };

  const handleFacebookLogin = () => {
    if (Platform.OS === 'web') window.alert('Facebook login coming soon!');
    else Alert.alert('Coming Soon', 'Facebook login will be available soon!');
  };

  // Handle sidebar signup
  const handleSidebarSignup = async () => {
    if (!signupEmail || !signupPassword || !signupConfirmPassword) {
      if (Platform.OS === 'web') window.alert('Please fill all fields');
      else Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (!selectedCountry) {
      if (Platform.OS === 'web') window.alert('Please select your country');
      else Alert.alert('Error', 'Please select your country');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      if (Platform.OS === 'web') window.alert('Passwords do not match');
      else Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (signupPassword.length < 6) {
      if (Platform.OS === 'web') window.alert('Password must be at least 6 characters');
      else Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setSignupLoading(true);
    try {
      const response = await api.signup({ 
        name: signupEmail.split('@')[0], // Use email prefix as name
        email: signupEmail, 
        password: signupPassword,
        country: selectedCountry.name,
        country_flag: selectedCountry.flag,
      });
      
      if (response.requires_verification) {
        // Show OTP verification within sidebar
        setShowOTPVerification(true);
        setResendCooldown(60);
      } else if (response.access_token) {
        await login(response.access_token, response.user);
        closeSidebar();
        router.replace('/(tabs)/trade');
      }
    } catch (error: any) {
      if (Platform.OS === 'web') window.alert(error.message || 'Could not create account');
      else Alert.alert('Signup Failed', error.message || 'Could not create account');
    } finally {
      setSignupLoading(false);
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
      setOtp(newOTP);
      const lastIndex = Math.min(index + digits.length, 5);
      otpInputRefs.current[lastIndex]?.focus();
    } else {
      const newOTP = [...otp];
      newOTP[index] = value;
      setOtp(newOTP);
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
      const response = await api.verifyEmail({ email: signupEmail, otp: otpCode });
      if (response.access_token) {
        await login(response.access_token, response.user);
        closeSidebar();
        resetSignupForm();
        router.replace('/(tabs)/trade');
      }
    } catch (error: any) {
      if (Platform.OS === 'web') window.alert(error.message || 'Invalid verification code');
      else Alert.alert('Verification Failed', error.message || 'Invalid verification code');
      setOtp(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } finally {
      setVerifyingOTP(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setSignupLoading(true);
    try {
      await api.resendOTP({ email: signupEmail });
      setResendCooldown(60);
      if (Platform.OS === 'web') window.alert('New verification code sent!');
      else Alert.alert('Success', 'New verification code sent to your email!');
    } catch (error: any) {
      if (Platform.OS === 'web') window.alert(error.message || 'Failed to resend code');
      else Alert.alert('Error', error.message || 'Failed to resend code');
    } finally {
      setSignupLoading(false);
    }
  };

  const resetSignupForm = () => {
    setSignupEmail('');
    setSignupPassword('');
    setSignupConfirmPassword('');
    setSelectedCountry(null);
    setShowOTPVerification(false);
    setOtp(['', '', '', '', '', '']);
  };

  const handleBackFromOTP = () => {
    setShowOTPVerification(false);
    setOtp(['', '', '', '', '', '']);
  };

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
            <Image 
              source={{ uri: 'https://customer-assets.emergentagent.com/job_bynix-markets/artifacts/fhiw6o6y_IMG_3122.png' }}
              style={styles.headerLogoImage}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>Bynix</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.loginBtn}
              onPress={() => openSidebar('login')}
            >
              <Text style={styles.loginBtnText}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.registerBtn}
              onPress={() => openSidebar('signup')}
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

          {/* Phone Mockup Section - Matching Reference Design */}
          <View style={styles.phoneMockupSection}>
            
            {/* Floating Bynix Logo Icon - Top Left */}
            <Animated.View style={[styles.floatingBynixLogo, { transform: [{ translateY: phoneTranslateY }] }]}>
              <LinearGradient
                colors={['#FFFFFF', '#E8F4FD']}
                style={styles.bynixLogoGradient}
              >
                <View style={styles.bynixLogoInner}>
                  <Ionicons name="bar-chart" size={24} color="#4A90E2" />
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Floating Asset Badges - Left Side */}
            <View style={styles.floatingBadgesLeft}>
              {[
                { name: 'Stocks', delay: 0 },
                { name: 'Indices', delay: 100 },
                { name: 'Metals', delay: 200 },
                { name: 'Commodities', delay: 300 },
                { name: 'ETF', delay: 400 },
              ].map((item, index) => (
                <Animated.View 
                  key={index} 
                  style={[
                    styles.floatingBadge,
                    { transform: [{ translateY: phoneTranslateY }] }
                  ]}
                >
                  <LinearGradient
                    colors={['#4A90E2', '#2E7BD6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.floatingBadgeGradient}
                  >
                    <Text style={styles.floatingBadgeText}>{item.name}</Text>
                  </LinearGradient>
                </Animated.View>
              ))}
            </View>

            {/* Floating Company Logos */}
            {/* Tesla Logo - Top */}
            <Animated.View style={[styles.floatingCompanyLogo, styles.teslaPosition, { transform: [{ translateY: phoneTranslateY }] }]}>
              <View style={[styles.companyLogoCircle, { backgroundColor: '#E82127' }]}>
                <Text style={styles.companyLogoText}>T</Text>
              </View>
            </Animated.View>

            {/* Facebook Logo - Right Top */}
            <Animated.View style={[styles.floatingCompanyLogo, styles.facebookPosition, { transform: [{ translateY: phoneTranslateY }] }]}>
              <View style={[styles.companyLogoCircle, { backgroundColor: '#1877F2' }]}>
                <FontAwesome5 name="facebook-f" size={14} color="#FFF" />
              </View>
            </Animated.View>

            {/* Apple Logo - Right Middle */}
            <Animated.View style={[styles.floatingCompanyLogo, styles.applePosition, { transform: [{ translateY: phoneTranslateY }] }]}>
              <View style={[styles.companyLogoCircle, { backgroundColor: '#A2AAAD' }]}>
                <Ionicons name="logo-apple" size={16} color="#FFF" />
              </View>
            </Animated.View>

            {/* IBM Logo - Bottom Right */}
            <Animated.View style={[styles.floatingCompanyLogo, styles.ibmPosition, { transform: [{ translateY: phoneTranslateY }] }]}>
              <View style={[styles.companyLogoCircle, { backgroundColor: '#054ADA' }]}>
                <Text style={[styles.companyLogoText, { fontSize: 9, fontWeight: '800' }]}>IBM</Text>
              </View>
            </Animated.View>

            {/* Google Logo - Bottom Left */}
            <Animated.View style={[styles.floatingCompanyLogo, styles.googlePosition, { transform: [{ translateY: phoneTranslateY }] }]}>
              <View style={[styles.companyLogoCircle, { backgroundColor: '#4285F4' }]}>
                <Text style={[styles.companyLogoText, { color: '#FFF', fontWeight: '700' }]}>G</Text>
              </View>
            </Animated.View>

            {/* Netflix Logo - Hidden (next to Indices) */}
            <Animated.View style={[styles.floatingCompanyLogo, styles.netflixPosition, { transform: [{ translateY: phoneTranslateY }] }]}>
              <View style={[styles.companyLogoCircle, { backgroundColor: '#E50914' }]}>
                <Text style={[styles.companyLogoText, { fontWeight: '800' }]}>N</Text>
              </View>
            </Animated.View>

            {/* Phone Mockup - iPhone with Screenshot */}
            <Animated.View style={[styles.phoneMockupContainer, { transform: [{ translateY: phoneTranslateY }, { perspective: 1000 }, { rotateY: '-8deg' }, { rotateX: '2deg' }] }]}>
              {/* Phone Outer Frame (Titanium) */}
              <View style={styles.phoneOuterFrame}>
                {/* Phone Inner Frame */}
                <View style={styles.phoneFrame}>
                  {/* Power Button (Right side) */}
                  <View style={styles.phonePowerButton} />
                  
                  {/* Volume Buttons (Left side) */}
                  <View style={styles.phoneVolumeButtons}>
                    <View style={styles.phoneVolumeBtn} />
                    <View style={[styles.phoneVolumeBtn, { marginTop: 8 }]} />
                  </View>

                  {/* Screen with Trading UI */}
                  <View style={styles.phoneScreenNew}>
                    {/* Dynamic Island */}
                    <View style={styles.dynamicIsland}>
                      <View style={styles.dynamicIslandPill} />
                    </View>

                    {/* Trading UI Content */}
                    <View style={styles.tradingUIContent}>
                      {/* Balance Header */}
                      <View style={styles.mockBalanceHeader}>
                        <View style={styles.mockBalanceBox}>
                          <Text style={styles.mockBalanceAmount}>$1,420.00</Text>
                          <Text style={styles.mockBalanceLabel}>balance</Text>
                        </View>
                        <TouchableOpacity style={styles.mockDepositBtn}>
                          <Text style={styles.mockDepositText}>Deposit</Text>
                        </TouchableOpacity>
                        <View style={styles.mockMenuIcon}>
                          <Ionicons name="menu" size={18} color="#888" />
                        </View>
                      </View>

                      {/* Asset Pair */}
                      <View style={styles.mockAssetRow}>
                        <View style={styles.mockAssetIcon}>
                          <Text style={styles.mockAssetIconText}>T</Text>
                        </View>
                        <View>
                          <Text style={styles.mockAssetName}>Tesla</Text>
                          <Text style={styles.mockAssetTime}>09:10:00 PM</Text>
                        </View>
                      </View>

                      {/* Chart Area with Gradient */}
                      <View style={styles.mockChartArea}>
                        <LinearGradient
                          colors={['#0A3D62', '#0A0E17']}
                          style={styles.mockChartGradient}
                        >
                          {/* Simulated chart line */}
                          <View style={styles.mockChartLine} />
                        </LinearGradient>
                      </View>
                    </View>

                    {/* Home Indicator */}
                    <View style={styles.homeIndicator} />
                  </View>
                </View>
              </View>

              {/* Glow Effect */}
              <View style={styles.phoneGlow} />
            </Animated.View>

            {/* Floating Asset List Card - Right Side */}
            <Animated.View style={[styles.floatingAssetListCard, { transform: [{ translateY: phoneTranslateY }] }]}>
              <View style={styles.assetListHeader}>
                <Text style={styles.assetListTitle}>Asset list</Text>
                <Ionicons name="close" size={16} color="#888" />
              </View>
              
              <View style={styles.assetListFilter}>
                <Text style={styles.assetListFilterText}>All</Text>
                <Ionicons name="chevron-down" size={12} color="#888" />
              </View>

              <View style={styles.assetListSearch}>
                <Ionicons name="search" size={12} color="#666" />
                <Text style={styles.assetListSearchText}>Search</Text>
              </View>

              {/* Asset Items */}
              {[
                { icon: 'T', name: 'Tesla', change: '-0.01%', payout: '85%', color: '#E82127', positive: false },
                { icon: '🍎', name: 'Apple', change: '-0.01%', payout: '77%', color: '#A2AAAD', positive: false },
                { icon: 'IBM', name: 'IBM', change: '-0.57%', payout: '75%', color: '#054ADA', positive: false },
                { icon: 'G', name: 'Google', change: '-0.12%', payout: '77%', color: '#4285F4', positive: false },
                { icon: 'N', name: 'Netflix', change: '-0.06%', payout: '79%', color: '#E50914', positive: false },
                { icon: 'f', name: 'Facebook (META)', change: '+1.13%', payout: '76%', color: '#1877F2', positive: true },
              ].map((asset, index) => (
                <View key={index} style={styles.assetListItem}>
                  <View style={[styles.assetListIcon, { backgroundColor: asset.color }]}>
                    <Text style={styles.assetListIconText}>{asset.icon}</Text>
                  </View>
                  <Text style={styles.assetListName}>{asset.name}</Text>
                  <Text style={[styles.assetListChange, { color: asset.positive ? '#00E55A' : '#FF4757' }]}>
                    {asset.change}
                  </Text>
                  <Text style={styles.assetListPayout}>{asset.payout}</Text>
                </View>
              ))}
            </Animated.View>

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
            <Image 
              source={{ uri: 'https://customer-assets.emergentagent.com/job_bynix-markets/artifacts/fhiw6o6y_IMG_3122.png' }}
              style={styles.footerLogoImage}
              resizeMode="contain"
            />
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
            <TouchableOpacity onPress={() => router.push('/(auth)/privacy-policy')}>
              <Text style={styles.regulationLink}>Privacy policy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(auth)/service-agreement')}>
              <Text style={styles.regulationLink}>Service agreement</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(auth)/risk-disclosure')}>
              <Text style={styles.regulationLink}>Risk disclosure</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(auth)/trading-rules')}>
              <Text style={styles.regulationLink}>Rules of trading operations</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(auth)/non-trading-rules')}>
              <Text style={styles.regulationLink}>Non-trading operations regulations</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(auth)/payment-policy')}>
              <Text style={styles.regulationLink}>Payment policy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(auth)/aml-kyc-policy')}>
              <Text style={styles.regulationLink}>AML & KYC Policy</Text>
            </TouchableOpacity>
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

      {/* Login Sidebar Modal */}
      <Modal visible={showLoginSidebar} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={closeSidebar} activeOpacity={1} />
          <Animated.View style={[styles.sidebarContainer, { transform: [{ translateX: sidebarSlide }] }]}>
            
            <ScrollView contentContainerStyle={styles.sidebarContent} showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.sidebarHeader}>
                <Image 
                  source={{ uri: 'https://customer-assets.emergentagent.com/job_bynix-markets/artifacts/fhiw6o6y_IMG_3122.png' }}
                  style={{ width: 28, height: 28 }}
                  resizeMode="contain"
                />
                <TouchableOpacity style={styles.sidebarCloseBtn} onPress={closeSidebar}>
                  <Ionicons name="close" size={22} color="#888" />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <Text style={styles.sidebarGreeting}>Happy to see you</Text>
              <Text style={styles.sidebarTitle}>Welcome back</Text>

              {/* Social Login */}
              <Text style={styles.socialLabel}>Log in with</Text>
              <View style={styles.socialButtonsRow}>
                <TouchableOpacity style={[styles.socialButton, { flex: 1 }]} onPress={handleGoogleLogin}>
                  <Image source={{ uri: 'https://www.google.com/favicon.ico' }} style={styles.socialIcon} />
                  <Text style={styles.socialButtonText}>Google</Text>
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={styles.sidebarDivider}>
                <View style={styles.sidebarDividerLine} />
                <Text style={styles.sidebarDividerText}>or</Text>
                <View style={styles.sidebarDividerLine} />
              </View>

              {/* Email Input */}
              <Text style={styles.sidebarInputLabel}>Email or phone</Text>
              <View style={styles.sidebarInputContainer}>
                <TextInput
                  style={styles.sidebarInput}
                  placeholder="Email or phone"
                  placeholderTextColor="#555"
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Password Input */}
              <Text style={styles.sidebarInputLabel}>Password</Text>
              <View style={styles.sidebarInputContainer}>
                <TextInput
                  style={styles.sidebarInput}
                  placeholder="Password"
                  placeholderTextColor="#555"
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  secureTextEntry={!showLoginPassword}
                />
                <TouchableOpacity onPress={() => setShowLoginPassword(!showLoginPassword)}>
                  <Ionicons name={showLoginPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#00E55A" />
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity style={styles.sidebarActionBtn} onPress={handleSidebarLogin} disabled={loginLoading}>
                <LinearGradient colors={['#00E55A', '#00C94D']} style={styles.sidebarActionBtnGradient}>
                  {loginLoading ? <ActivityIndicator color="#0D0D0D" /> : <Text style={styles.sidebarActionBtnText}>Log in</Text>}
                </LinearGradient>
              </TouchableOpacity>

              {/* Footer Links */}
              <View style={styles.sidebarFooterLinks}>
                <TouchableOpacity onPress={() => { closeSidebar(); router.push('/(auth)/forgot-password'); }}>
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { closeSidebar(); setTimeout(() => openSidebar('signup'), 300); }}>
                  <Text style={styles.signUpLinkText}>Sign Up</Text>
                </TouchableOpacity>
              </View>

              {/* Promo Banner */}
              <View style={styles.promoBanner}>
                <LinearGradient colors={['#0A1A10', '#0D0D0D']} style={styles.promoBannerGradient}>
                  <View style={styles.promoContent}>
                    <View style={styles.promoTextContainer}>
                      <Text style={styles.promoLabel}>YOUR TRADING PARTNER</Text>
                      <View style={styles.promoLogoRow}>
                        <Image source={{ uri: 'https://customer-assets.emergentagent.com/job_bynix-markets/artifacts/fhiw6o6y_IMG_3122.png' }} style={styles.promoLogo} resizeMode="contain" />
                        <Text style={styles.promoLogoText}>Bynix</Text>
                      </View>
                    </View>
                    <View style={styles.promoIconContainer}>
                      <Ionicons name="trending-up" size={18} color="#00E55A" />
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Signup Sidebar Modal */}
      <Modal visible={showSignupSidebar} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => { closeSidebar(); resetSignupForm(); }} activeOpacity={1} />
          <Animated.View style={[styles.sidebarContainer, { transform: [{ translateX: sidebarSlide }] }]}>
            
            <ScrollView contentContainerStyle={styles.sidebarContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Header */}
              <View style={styles.sidebarHeader}>
                {showOTPVerification ? (
                  <TouchableOpacity style={styles.sidebarBackBtn} onPress={handleBackFromOTP}>
                    <Ionicons name="arrow-back" size={22} color="#FFF" />
                  </TouchableOpacity>
                ) : (
                  <Image 
                    source={{ uri: 'https://customer-assets.emergentagent.com/job_bynix-markets/artifacts/fhiw6o6y_IMG_3122.png' }}
                    style={{ width: 28, height: 28 }}
                    resizeMode="contain"
                  />
                )}
                <TouchableOpacity style={styles.sidebarCloseBtn} onPress={() => { closeSidebar(); resetSignupForm(); }}>
                  <Ionicons name="close" size={22} color="#888" />
                </TouchableOpacity>
              </View>

              {showOTPVerification ? (
                /* OTP Verification UI */
                <>
                  {/* Email Icon */}
                  <View style={styles.otpIconContainer}>
                    <Ionicons name="mail" size={36} color="#00E55A" />
                  </View>

                  <Text style={styles.sidebarGreeting}>Check your email</Text>
                  <Text style={styles.sidebarTitle}>Verify your email</Text>
                  
                  <Text style={styles.otpSubtitle}>We've sent a 6-digit code to</Text>
                  <Text style={styles.otpEmailText}>{signupEmail}</Text>

                  {/* OTP Input Boxes */}
                  <View style={styles.otpInputRow}>
                    {otp.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={(ref) => otpInputRefs.current[index] = ref}
                        style={[styles.otpBox, digit && styles.otpBoxFilled]}
                        value={digit}
                        onChangeText={(value) => handleOTPChange(value, index)}
                        onKeyPress={(e) => handleOTPKeyPress(e, index)}
                        keyboardType="number-pad"
                        maxLength={6}
                        selectTextOnFocus
                      />
                    ))}
                  </View>

                  {/* Verify Button */}
                  <TouchableOpacity style={styles.sidebarActionBtn} onPress={handleVerifyOTP} disabled={verifyingOTP}>
                    <LinearGradient colors={['#00E55A', '#00C94D']} style={styles.sidebarActionBtnGradient}>
                      {verifyingOTP ? <ActivityIndicator color="#0D0D0D" /> : <Text style={styles.sidebarActionBtnText}>Verify email</Text>}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Resend Code */}
                  <View style={styles.resendContainer}>
                    <Text style={styles.resendText}>Didn't receive the code? </Text>
                    <TouchableOpacity onPress={handleResendOTP} disabled={resendCooldown > 0 || signupLoading}>
                      <Text style={[styles.resendLink, (resendCooldown > 0 || signupLoading) && styles.resendLinkDisabled]}>
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Back to Login */}
                  <View style={styles.sidebarFooterLinksCenter}>
                    <Text style={styles.footerText}>Already have an account?</Text>
                    <TouchableOpacity onPress={() => { closeSidebar(); resetSignupForm(); setTimeout(() => openSidebar('login'), 300); }}>
                      <Text style={styles.loginLinkText}>Log in</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                /* Signup Form UI */
                <>
                  {/* Content */}
                  <Text style={styles.sidebarGreeting}>Get started now</Text>
                  <Text style={styles.sidebarTitle}>Create an account</Text>

                  {/* Social Login */}
                  <Text style={styles.socialLabel}>Continue with</Text>
                  <View style={styles.socialButtonsRow}>
                    <TouchableOpacity style={[styles.socialButton, { flex: 1 }]} onPress={handleGoogleLogin}>
                      <Image source={{ uri: 'https://www.google.com/favicon.ico' }} style={styles.socialIcon} />
                      <Text style={styles.socialButtonText}>Google</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Divider */}
                  <View style={styles.sidebarDivider}>
                    <View style={styles.sidebarDividerLine} />
                    <Text style={styles.sidebarDividerText}>or</Text>
                    <View style={styles.sidebarDividerLine} />
                  </View>

                  {/* Email Input */}
                  <View style={styles.sidebarInputContainer}>
                    <TextInput
                      style={styles.sidebarInput}
                      placeholder="Enter your email"
                      placeholderTextColor="#555"
                      value={signupEmail}
                      onChangeText={setSignupEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  {/* Country Selector */}
                  <TouchableOpacity style={styles.sidebarInputContainer} onPress={() => setShowCountryPicker(true)}>
                    <Text style={[styles.sidebarInput, !selectedCountry && { color: '#555' }]}>
                      {selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : 'Select your country'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#00E55A" />
                  </TouchableOpacity>

                  {/* Password Input */}
                  <View style={styles.sidebarInputContainer}>
                    <TextInput
                      style={styles.sidebarInput}
                      placeholder="Create a password"
                      placeholderTextColor="#555"
                      value={signupPassword}
                      onChangeText={setSignupPassword}
                      secureTextEntry={!showSignupPassword}
                    />
                    <TouchableOpacity onPress={() => setShowSignupPassword(!showSignupPassword)}>
                      <Ionicons name={showSignupPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#00E55A" />
                    </TouchableOpacity>
                  </View>

                  {/* Confirm Password Input */}
                  <View style={styles.sidebarInputContainer}>
                    <TextInput
                      style={styles.sidebarInput}
                      placeholder="Confirm your password"
                      placeholderTextColor="#555"
                      value={signupConfirmPassword}
                      onChangeText={setSignupConfirmPassword}
                      secureTextEntry={!showSignupConfirmPassword}
                    />
                    <TouchableOpacity onPress={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}>
                      <Ionicons name={showSignupConfirmPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#00E55A" />
                    </TouchableOpacity>
                  </View>

                  {/* Password Match Indicator */}
                  {signupConfirmPassword.length > 0 && (
                    <View style={styles.matchRow}>
                      <Ionicons 
                        name={signupPassword === signupConfirmPassword ? "checkmark-circle" : "close-circle"} 
                        size={14} 
                        color={signupPassword === signupConfirmPassword ? "#00E55A" : "#FF4757"} 
                      />
                      <Text style={[styles.matchText, { color: signupPassword === signupConfirmPassword ? "#00E55A" : "#FF4757" }]}>
                        {signupPassword === signupConfirmPassword ? "Passwords match" : "Passwords don't match"}
                      </Text>
                    </View>
                  )}

                  {/* Create Account Button */}
                  <TouchableOpacity style={styles.sidebarActionBtn} onPress={handleSidebarSignup} disabled={signupLoading}>
                    <LinearGradient colors={['#00E55A', '#00C94D']} style={styles.sidebarActionBtnGradient}>
                      {signupLoading ? <ActivityIndicator color="#0D0D0D" /> : <Text style={styles.sidebarActionBtnText}>Create account</Text>}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Footer Links */}
                  <View style={styles.sidebarFooterLinksCenter}>
                    <Text style={styles.footerText}>Already have an account?</Text>
                    <TouchableOpacity onPress={() => { closeSidebar(); setTimeout(() => openSidebar('login'), 300); }}>
                      <Text style={styles.loginLinkText}>Log in</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Terms */}
                  <Text style={styles.termsText}>
                    By creating an account, you agree to our{' '}
                    <Text style={styles.termsLink} onPress={() => router.push('/(auth)/service-agreement')}>Terms</Text>
                    {' '}and{' '}
                    <Text style={styles.termsLink} onPress={() => router.push('/(auth)/privacy-policy')}>Privacy Policy</Text>
                  </Text>
                </>
              )}
            </ScrollView>
          </Animated.View>
        </View>

        {/* Country Picker Modal */}
        <Modal visible={showCountryPicker} transparent animationType="slide">
          <View style={styles.countryModalOverlay}>
            <View style={styles.countryModalContent}>
              <View style={styles.countryModalHeader}>
                <View>
                  <Text style={styles.countryModalTitle}>Select Country</Text>
                  <Text style={styles.countryCount}>{ALL_COUNTRIES.length} countries • {availableCountriesCount} available</Text>
                </View>
                <TouchableOpacity onPress={() => { setShowCountryPicker(false); setCountrySearch(''); }}>
                  <Ionicons name="close" size={24} color="#888" />
                </TouchableOpacity>
              </View>

              {/* Search Input */}
              <View style={styles.countrySearchContainer}>
                <Ionicons name="search" size={18} color="#666" />
                <TextInput
                  style={styles.countrySearchInput}
                  placeholder="Search country..."
                  placeholderTextColor="#555"
                  value={countrySearch}
                  onChangeText={setCountrySearch}
                  autoCapitalize="none"
                />
                {countrySearch.length > 0 && (
                  <TouchableOpacity onPress={() => setCountrySearch('')}>
                    <Ionicons name="close-circle" size={18} color="#666" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Restricted Notice */}
              <View style={styles.restrictedNotice}>
                <Ionicons name="information-circle" size={16} color="#FF6B6B" />
                <Text style={styles.restrictedNoticeText}>
                  Service unavailable in: USA, Canada, Hong Kong, EEA, Israel, Russia
                </Text>
              </View>
              
              <ScrollView style={styles.countryList} showsVerticalScrollIndicator={false}>
                {ALL_COUNTRIES
                  .filter(country => country.name.toLowerCase().includes(countrySearch.toLowerCase()))
                  .map((country, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.countryItem, 
                      selectedCountry?.name === country.name && styles.countryItemSelected,
                      country.restricted && styles.countryItemRestricted
                    ]}
                    onPress={() => {
                      if (country.restricted) {
                        if (Platform.OS === 'web') {
                          window.alert(`Sorry, our services are not available in ${country.name}. This includes USA, Canada, Hong Kong, EEA countries, Israel, and Russia.`);
                        } else {
                          Alert.alert('Restricted Region', `Sorry, our services are not available in ${country.name}. This includes USA, Canada, Hong Kong, EEA countries, Israel, and Russia.`);
                        }
                        return;
                      }
                      setSelectedCountry(country); 
                      setShowCountryPicker(false); 
                      setCountrySearch('');
                    }}
                  >
                    <Text style={styles.countryFlag}>{country.flag}</Text>
                    <Text style={[styles.countryName, country.restricted && styles.countryNameRestricted]}>
                      {country.name}
                    </Text>
                    {country.restricted ? (
                      <View style={styles.restrictedBadge}>
                        <Text style={styles.restrictedBadgeText}>Restricted</Text>
                      </View>
                    ) : selectedCountry?.name === country.name ? (
                      <Ionicons name="checkmark-circle" size={18} color="#00E55A" />
                    ) : null}
                  </TouchableOpacity>
                ))}
                {ALL_COUNTRIES.filter(country => country.name.toLowerCase().includes(countrySearch.toLowerCase())).length === 0 && (
                  <View style={styles.noResultsContainer}>
                    <Ionicons name="search-outline" size={40} color="#444" />
                    <Text style={styles.noResultsText}>No countries found</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </Modal>
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
  headerLogoImage: {
    width: 36,
    height: 36,
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

  // Phone Mockup Section
  phoneMockupSection: {
    width: '100%',
    height: 550,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  // Floating Bynix Logo
  floatingBynixLogo: {
    position: 'absolute',
    top: 30,
    left: 10,
    zIndex: 20,
  },
  bynixLogoGradient: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  bynixLogoInner: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#EDF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Floating Asset Badges
  floatingBadgesLeft: {
    position: 'absolute',
    left: -10,
    top: 120,
    zIndex: 15,
    gap: 10,
  },
  floatingBadge: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  floatingBadgeGradient: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  floatingBadgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Floating Company Logos
  floatingCompanyLogo: {
    position: 'absolute',
    zIndex: 15,
  },
  companyLogoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  companyLogoText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  teslaPosition: {
    top: 0,
    left: '45%',
    marginLeft: -18,
  },
  facebookPosition: {
    top: 50,
    right: 10,
  },
  applePosition: {
    top: 180,
    right: -5,
  },
  ibmPosition: {
    bottom: 60,
    right: 0,
  },
  googlePosition: {
    bottom: 20,
    left: 30,
  },
  netflixPosition: {
    top: 230,
    left: 100,
  },

  // Floating Asset List Card
  floatingAssetListCard: {
    position: 'absolute',
    right: -20,
    top: 100,
    width: 180,
    backgroundColor: 'rgba(30, 35, 50, 0.95)',
    borderRadius: 16,
    padding: 12,
    zIndex: 20,
    borderWidth: 1,
    borderColor: '#2A3040',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  assetListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  assetListTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  assetListFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1F2E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
    gap: 4,
  },
  assetListFilterText: {
    color: '#888',
    fontSize: 11,
  },
  assetListSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1F2E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
    gap: 6,
  },
  assetListSearchText: {
    color: '#666',
    fontSize: 11,
  },
  assetListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#252A3A',
  },
  assetListIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  assetListIconText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
  assetListName: {
    flex: 1,
    color: '#FFF',
    fontSize: 10,
    fontWeight: '500',
  },
  assetListChange: {
    fontSize: 9,
    fontWeight: '600',
    marginRight: 6,
  },
  assetListPayout: {
    color: '#888',
    fontSize: 9,
  },

  // Phone Mockup
  phoneMockupContainer: {
    zIndex: 10,
  },

  // Trading UI Content inside phone
  tradingUIContent: {
    flex: 1,
    backgroundColor: '#0A0E17',
    paddingTop: 50,
  },
  mockBalanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  mockBalanceBox: {
    backgroundColor: '#1A1F2E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  mockBalanceAmount: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  mockBalanceLabel: {
    color: '#888',
    fontSize: 9,
  },
  mockDepositBtn: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  mockDepositText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  mockMenuIcon: {
    marginLeft: 'auto',
  },
  mockAssetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  mockAssetIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E82127',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockAssetIconText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  mockAssetName: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  mockAssetTime: {
    color: '#888',
    fontSize: 10,
  },
  mockChartArea: {
    flex: 1,
    margin: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mockChartGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockChartLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: '#4A90E2',
    borderRadius: 1,
  },
  phoneOuterFrame: {
    width: width * 0.75,
    height: 550,
    backgroundColor: '#1C1C1E',
    borderRadius: 55,
    padding: 8,
    shadowColor: '#00E55A',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 30,
    borderWidth: 4,
    borderColor: '#4A4A4C',
  },
  phoneFrame: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 48,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#2C2C2E',
  },
  phonePowerButton: {
    position: 'absolute',
    right: -4,
    top: 130,
    width: 4,
    height: 90,
    backgroundColor: '#4A4A4C',
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  phoneVolumeButtons: {
    position: 'absolute',
    left: -4,
    top: 100,
  },
  phoneVolumeBtn: {
    width: 4,
    height: 50,
    backgroundColor: '#4A4A4C',
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  phoneScreenNew: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 45,
    overflow: 'hidden',
    position: 'relative',
  },
  dynamicIsland: {
    position: 'absolute',
    top: 12,
    left: '50%',
    marginLeft: -60,
    width: 120,
    height: 35,
    backgroundColor: '#000',
    borderRadius: 20,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dynamicIslandPill: {
    width: 100,
    height: 28,
    backgroundColor: '#1C1C1E',
    borderRadius: 15,
  },
  screenshotImage: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 8,
    left: '50%',
    marginLeft: -65,
    width: 130,
    height: 5,
    backgroundColor: '#FFF',
    borderRadius: 3,
    opacity: 0.6,
  },
  phoneGlow: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    bottom: -50,
    borderRadius: 100,
    backgroundColor: '#00E55A',
    opacity: 0.08,
    zIndex: -1,
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
  footerLogoImage: {
    width: 32,
    height: 32,
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

  // Sidebar Modal Styles
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sidebarContainer: {
    width: width > 500 ? 380 : width * 0.85,
    maxWidth: 400,
    backgroundColor: '#0D0D0D',
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 25,
  },
  sidebarContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 16,
  },
  decorIcon: {
    width: 28,
    height: 28,
  },
  sidebarCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A1F2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarGreeting: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  sidebarTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  socialLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
  },
  socialButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1F2E',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  socialIcon: {
    width: 18,
    height: 18,
  },
  facebookIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1877F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sidebarDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  sidebarDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#252A3A',
  },
  sidebarDividerText: {
    color: '#555',
    marginHorizontal: 12,
    fontSize: 13,
  },
  sidebarInputLabel: {
    fontSize: 13,
    color: '#AAA',
    fontWeight: '500',
    marginBottom: 8,
  },
  sidebarInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1F2E',
    borderRadius: 10,
    marginBottom: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  sidebarInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    paddingVertical: 14,
  },
  sidebarActionBtn: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 6,
  },
  sidebarActionBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  sidebarActionBtnText: {
    color: '#0D0D0D',
    fontSize: 16,
    fontWeight: '700',
  },
  sidebarFooterLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 20,
  },
  sidebarFooterLinksCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
    gap: 6,
  },
  forgotPasswordText: {
    color: '#00E55A',
    fontSize: 14,
    fontWeight: '600',
  },
  signUpLinkText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footerText: {
    color: '#888',
    fontSize: 14,
  },
  loginLinkText: {
    color: '#00E55A',
    fontSize: 14,
    fontWeight: '700',
  },
  promoBanner: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#00E55A30',
    marginBottom: 16,
  },
  promoBannerGradient: {
    padding: 14,
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
    fontSize: 9,
    color: '#00E55A',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 6,
  },
  promoLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  promoLogo: {
    width: 28,
    height: 28,
  },
  promoLogoText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  promoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00E55A20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  termsText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#00E55A',
  },

  // Password match indicator
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -8,
    marginBottom: 12,
    gap: 5,
  },
  matchText: {
    fontSize: 12,
  },

  // OTP Verification Styles
  sidebarBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A1F2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#00E55A20',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  otpSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  otpEmailText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00E55A',
    textAlign: 'center',
    marginBottom: 24,
  },
  otpInputRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#1A1F2E',
    borderWidth: 2,
    borderColor: '#252A3A',
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: '#00E55A',
    backgroundColor: '#00E55A15',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  resendText: {
    color: '#888',
    fontSize: 14,
  },
  resendLink: {
    color: '#00E55A',
    fontSize: 14,
    fontWeight: '600',
  },
  resendLinkDisabled: {
    color: '#555',
  },

  // Country Picker Modal
  countryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  countryModalContent: {
    backgroundColor: '#0D0D0D',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  countryModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  countryModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  countryCount: {
    fontSize: 12,
    color: '#00E55A',
    marginTop: 4,
  },
  countrySearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1F2E',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  countrySearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    paddingVertical: 12,
    marginLeft: 8,
  },
  countryList: {
    maxHeight: 350,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1F2E',
  },
  countryItemSelected: {
    backgroundColor: '#00E55A15',
    borderRadius: 8,
  },
  countryItemRestricted: {
    opacity: 0.5,
  },
  countryFlag: {
    fontSize: 22,
    marginRight: 12,
  },
  countryName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
  },
  countryNameRestricted: {
    color: '#888',
  },
  restrictedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B15',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8,
  },
  restrictedNoticeText: {
    flex: 1,
    color: '#FF6B6B',
    fontSize: 11,
  },
  restrictedBadge: {
    backgroundColor: '#FF6B6B20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  restrictedBadgeText: {
    color: '#FF6B6B',
    fontSize: 10,
    fontWeight: '600',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    color: '#666',
    fontSize: 14,
    marginTop: 12,
  },
});
