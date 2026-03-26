import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { API_URL } from '../../utils/api';
import * as ImagePicker from 'expo-image-picker';
import AnimatedLoader from '../../components/AnimatedLoader';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';

declare const window: any;

const TABS = ['Overview', 'Finance', 'Security', 'KYC', 'Activity', 'Settings'];

// Countries with flags
const COUNTRIES_WITH_FLAGS = [
  { name: 'Bangladesh', flag: '🇧🇩' },
  { name: 'India', flag: '🇮🇳' },
  { name: 'United States', flag: '🇺🇸' },
  { name: 'United Kingdom', flag: '🇬🇧' },
  { name: 'Canada', flag: '🇨🇦' },
  { name: 'Australia', flag: '🇦🇺' },
  { name: 'Germany', flag: '🇩🇪' },
  { name: 'France', flag: '🇫🇷' },
  { name: 'Japan', flag: '🇯🇵' },
  { name: 'Brazil', flag: '🇧🇷' },
  { name: 'Nepal', flag: '🇳🇵' },
  { name: 'Pakistan', flag: '🇵🇰' },
  { name: 'Russia', flag: '🇷🇺' },
  { name: 'China', flag: '🇨🇳' },
  { name: 'South Korea', flag: '🇰🇷' },
  { name: 'Indonesia', flag: '🇮🇩' },
  { name: 'Thailand', flag: '🇹🇭' },
  { name: 'Vietnam', flag: '🇻🇳' },
  { name: 'Philippines', flag: '🇵🇭' },
  { name: 'Malaysia', flag: '🇲🇾' },
  { name: 'Singapore', flag: '🇸🇬' },
  { name: 'UAE', flag: '🇦🇪' },
  { name: 'Saudi Arabia', flag: '🇸🇦' },
  { name: 'Turkey', flag: '🇹🇷' },
  { name: 'Nigeria', flag: '🇳🇬' },
  { name: 'South Africa', flag: '🇿🇦' },
  { name: 'Egypt', flag: '🇪🇬' },
  { name: 'Mexico', flag: '🇲🇽' },
  { name: 'Argentina', flag: '🇦🇷' },
  { name: 'Colombia', flag: '🇨🇴' },
];

// Mock user data
const MOCK_USER_DATA = {
  fullName: 'Demo User',
  email: 'demo@bynix.com',
  phone: '-',
  country: 'United States',
  countryFlag: '🇺🇸',
  address: '-',
  dateOfBirth: '-',
  accountId: '10000001',
  referralCode: 'BYNIX2025',
  joinedDate: '22/03/2025',
  lastLogin: {
    time: new Date().toLocaleString(),
    ip: '192.168.1.xxx',
  },
  nickname: '',
  isEmailVerified: false,
  tier: 'Bronze',
  nextTier: 'Silver',
  tierProgress: 0,
  tierTarget: 5000,
  stats: {
    totalTrades: 0,
    winRate: 0,
    volume: 0,
    netPnL: 0,
  },
};

export default function Profile() {
  const router = useRouter();
  const { user, logout, token } = useAuthStore();
  const [activeTab, setActiveTab] = useState('Overview');
  const [userData, setUserData] = useState(MOCK_USER_DATA);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
  const [nickname, setNickname] = useState(userData.nickname);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');
  
  // Activity State
  const [activitySubTab, setActivitySubTab] = useState('Login History');
  
  // Finance State
  const [financeSubTab, setFinanceSubTab] = useState('Overview');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transactionSummary, setTransactionSummary] = useState({
    total_deposits: 0,
    total_deposit_amount: 0,
    total_withdrawals: 0,
    total_withdrawal_amount: 0
  });
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [depositAmount, setDepositAmount] = useState('21');
  const [withdrawAmount, setWithdrawAmount] = useState('100');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState('USDT');
  const [selectedNetwork, setSelectedNetwork] = useState('USDT (TRC20)');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [isProcessingWithdraw, setIsProcessingWithdraw] = useState(false);
  
  // KYC Upload State for locked withdrawals
  const [showKycUploadModal, setShowKycUploadModal] = useState(false);
  const [selectedLockedTx, setSelectedLockedTx] = useState<any>(null);
  const [kycUploadImage, setKycUploadImage] = useState<string | null>(null);
  const [isUploadingKyc, setIsUploadingKyc] = useState(false);
  const [hasLockedWithdrawal, setHasLockedWithdrawal] = useState(false);
  
  // Deposit Payment States
  const [generatedAddress, setGeneratedAddress] = useState<string | null>(null);
  const [isGeneratingAddress, setIsGeneratingAddress] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<string | null>(null);
  const [expirationTime, setExpirationTime] = useState<Date | null>(null);
  const [countdownText, setCountdownText] = useState('20:00');
  const [depositError, setDepositError] = useState<string | null>(null);
  
  // Settings State
  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    tradeAlerts: true,
    depositUpdates: true,
    withdrawalUpdates: true,
    securityAlerts: true,
  });
  const [kycStep, setKycStep] = useState(1);
  const [kycData, setKycData] = useState({
    fullName: '',
    nationality: '',
    dateOfBirth: '',
    idType: '',
    idNumber: '',
  });
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showCountrySelectModal, setShowCountrySelectModal] = useState(false);
  const [showIdTypePicker, setShowIdTypePicker] = useState(false);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [isSubmittingKyc, setIsSubmittingKyc] = useState(false);
  const [kycStatus, setKycStatus] = useState<any>(null);
  const [showKycRequiredModal, setShowKycRequiredModal] = useState(false);
  const [kycCountdown, setKycCountdown] = useState<number | null>(null);
  const [isStartingDiditKyc, setIsStartingDiditKyc] = useState(false);
  
  // Password Change State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // 2FA State
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');

  // Fetch profile stats from backend
  const fetchProfileStats = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/profile/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const stats = await response.json();
        setUserData(prev => ({
          ...prev,
          stats: {
            totalTrades: stats.total_trades || 0,
            winRate: stats.win_rate || 0,
            volume: stats.volume || 0,
            netPnL: stats.net_pnl || 0,
          },
          tierProgress: stats.volume || 0,
          accountId: stats.account_id || prev.accountId,
          nickname: stats.nickname || '',
          country: stats.country || prev.country,
          countryFlag: stats.country_flag || prev.countryFlag,
          isEmailVerified: stats.is_verified || false,
        }));
        // Also update nickname state for the modal
        if (stats.nickname) {
          setNickname(stats.nickname);
        }
      }
    } catch (error) {
      console.error('Error fetching profile stats:', error);
    }
  }, [token]);

  // Fetch stats on mount
  useEffect(() => {
    fetchProfileStats();
    fetchKycStatus();
    fetchNotificationSettings();
  }, [fetchProfileStats]);

  // Countdown timer for deposit expiration
  useEffect(() => {
    if (!expirationTime) return;
    
    const interval = setInterval(() => {
      const now = new Date();
      const diff = expirationTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        setCountdownText('EXPIRED');
        clearInterval(interval);
        return;
      }
      
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setCountdownText(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [expirationTime]);

  // Fetch notification settings
  const fetchNotificationSettings = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/profile/notification-settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setNotificationSettings(data.settings);
        }
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    }
  }, [token]);

  // Fetch KYC status
  const fetchKycStatus = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/kyc/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setKycStatus(data);
        
        // Update KYC step based on status
        if (data.status === 'verified') {
          setKycStep(3); // Verified step
        } else if (data.status === 'rejected') {
          setKycStep(2); // Stay on document step with rejection message
        }
      }
    } catch (error) {
      console.error('Error fetching KYC status:', error);
    }
  }, [token]);

  // Countdown timer for auto-verification
  useEffect(() => {
    if (kycCountdown === null || kycCountdown <= 0) return;

    const timer = setInterval(() => {
      setKycCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          // Refresh KYC status when countdown ends
          fetchKycStatus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [kycCountdown, fetchKycStatus]);

  // Pick image for document upload
  const pickImage = async (side: 'front' | 'back') => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload documents.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        if (side === 'front') {
          setFrontImage(result.assets[0].base64);
        } else {
          setBackImage(result.assets[0].base64);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Submit KYC documents
  const submitKycDocuments = async () => {
    if (!token) {
      Alert.alert('Error', 'Please login first');
      return;
    }

    if (!frontImage) {
      Alert.alert('Missing Document', 'Please upload the front side of your ID');
      return;
    }

    setIsSubmittingKyc(true);

    try {
      const response = await fetch(`${API_URL}/kyc/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: kycData.fullName,
          nationality: kycData.nationality,
          date_of_birth: kycData.dateOfBirth,
          id_type: kycData.idType,
          id_number: kycData.idNumber,
          front_image_base64: frontImage,
          back_image_base64: backImage,
        }),
      });

      const data = await response.json();
      console.log('KYC Response:', data);
      
      setKycStatus(data);
      
      if (data.status === 'verified' && data.success) {
        // INSTANT VERIFIED!
        if (Platform.OS === 'web') {
          window.alert(`KYC Verified! ✅\n\nYour ${kycData.idType} from ${data.ai_result?.country || kycData.nationality} has been verified successfully!`);
        } else {
          Alert.alert(
            'KYC Verified! ✅',
            `Your ${kycData.idType} from ${data.ai_result?.country || kycData.nationality} has been verified successfully!`,
            [{ text: 'OK' }]
          );
        }
        setKycStep(3); // Go directly to verified step
      } else if (data.status === 'rejected' || data.success === false) {
        // INSTANT REJECTED
        const reason = data.ai_result?.reason || data.message || 'Your document could not be verified.';
        if (Platform.OS === 'web') {
          window.alert(`Verification Failed ❌\n\n${reason}\n\nPlease try again with a clear photo of a valid ID.`);
        } else {
          Alert.alert(
            'Verification Failed ❌',
            `${reason}\n\nPlease try again with a clear photo of a valid ID.`,
            [{ text: 'Try Again' }]
          );
        }
        // Stay on step 2 to retry
        setFrontImage(null);
        setBackImage(null);
      } else if (data.status === 'error') {
        // ERROR occurred
        if (Platform.OS === 'web') {
          window.alert(`Error: ${data.message || 'Something went wrong. Please try again.'}`);
        } else {
          Alert.alert('Error', data.message || 'Something went wrong. Please try again.');
        }
      } else {
        // Unknown status
        if (Platform.OS === 'web') {
          window.alert(`Unexpected response. Please try again.`);
        } else {
          Alert.alert('Error', 'Unexpected response. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error submitting KYC:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to submit documents. Please check your connection and try again.');
      } else {
        Alert.alert('Error', 'Failed to submit documents. Please check your connection and try again.');
      }
    } finally {
      setIsSubmittingKyc(false);
    }
  };

  // Format countdown time
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out?');
      if (confirmed) {
        logout();
        router.replace('/(auth)/welcome');
      }
    } else {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Sign Out', 
            style: 'destructive',
            onPress: () => {
              logout();
              router.replace('/(auth)/welcome');
            }
          },
        ]
      );
    }
  };

  const handleSendVerificationCode = async () => {
    if (!token) {
      if (Platform.OS === 'web') {
        window.alert('Please login first');
      } else {
        Alert.alert('Error', 'Please login first');
      }
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/send-verification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        if (Platform.OS === 'web') {
          window.alert('A verification code has been sent to your email.');
        } else {
          Alert.alert('Success', 'A verification code has been sent to your email.');
        }
      } else {
        const data = await response.json();
        if (Platform.OS === 'web') {
          window.alert(data.detail || 'Failed to send verification code');
        } else {
          Alert.alert('Error', data.detail || 'Failed to send verification code');
        }
      }
    } catch (error) {
      console.error('Error sending verification code:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to send verification code. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to send verification code. Please try again.');
      }
    }
  };

  // Handle profile photo upload
  const handlePhotoUpload = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        if (Platform.OS === 'web') {
          window.alert('Please allow access to your photo library to upload a profile photo.');
        } else {
          Alert.alert('Permission Required', 'Please allow access to your photo library to upload a profile photo.');
        }
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        // Upload to backend
        const response = await fetch(`${API_URL}/profile/photo`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            photo_base64: result.assets[0].base64,
          }),
        });

        if (response.ok) {
          if (Platform.OS === 'web') {
            window.alert('Profile photo updated successfully!');
          } else {
            Alert.alert('Success', 'Profile photo updated successfully!');
          }
          // Refresh user data
          const { refreshUser } = useAuthStore.getState();
          await refreshUser();
        } else {
          const data = await response.json();
          if (Platform.OS === 'web') {
            window.alert(data.detail || 'Failed to upload photo');
          } else {
            Alert.alert('Error', data.detail || 'Failed to upload photo');
          }
        }
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to upload photo. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to upload photo. Please try again.');
      }
    }
  };

  const saveNickname = async () => {
    if (!token) {
      if (Platform.OS === 'web') {
        window.alert('Please login first');
      } else {
        Alert.alert('Error', 'Please login first');
      }
      return;
    }

    if (nickname.length < 3 || nickname.length > 20) {
      if (Platform.OS === 'web') {
        window.alert('Nickname must be 3-20 characters');
      } else {
        Alert.alert('Invalid Nickname', 'Nickname must be 3-20 characters');
      }
      return;
    }

    try {
      const response = await fetch(`${API_URL}/profile/nickname?nickname=${encodeURIComponent(nickname)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setUserData(prev => ({ ...prev, nickname }));
        setShowNicknameModal(false);
        if (Platform.OS === 'web') {
          window.alert('Nickname updated successfully!');
        } else {
          Alert.alert('Success', 'Nickname updated successfully!');
        }
      } else {
        const data = await response.json();
        if (Platform.OS === 'web') {
          window.alert(data.detail || 'Failed to update nickname');
        } else {
          Alert.alert('Error', data.detail || 'Failed to update nickname');
        }
      }
    } catch (error) {
      console.error('Error updating nickname:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to update nickname');
      } else {
        Alert.alert('Error', 'Failed to update nickname');
      }
    }
  };

  // Save country selection
  const saveCountry = async (countryName: string, countryFlag: string) => {
    if (!token) {
      if (Platform.OS === 'web') {
        window.alert('Please login first');
      } else {
        Alert.alert('Error', 'Please login first');
      }
      return;
    }

    try {
      const response = await fetch(`${API_URL}/profile/country?country=${encodeURIComponent(countryName)}&country_flag=${encodeURIComponent(countryFlag)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setUserData(prev => ({ ...prev, country: countryName, countryFlag: countryFlag }));
        setShowCountrySelectModal(false);
        if (Platform.OS === 'web') {
          window.alert('Country updated successfully!');
        } else {
          Alert.alert('Success', 'Country updated successfully!');
        }
      } else {
        const data = await response.json();
        if (Platform.OS === 'web') {
          window.alert(data.detail || 'Failed to update country');
        } else {
          Alert.alert('Error', data.detail || 'Failed to update country');
        }
      }
    } catch (error) {
      console.error('Error updating country:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to update country');
      } else {
        Alert.alert('Error', 'Failed to update country');
      }
    }
  };

  // Change password function
  const handleChangePassword = async () => {
    if (!token) {
      if (Platform.OS === 'web') {
        window.alert('Please login first');
      } else {
        Alert.alert('Error', 'Please login first');
      }
      return;
    }

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      if (Platform.OS === 'web') {
        window.alert('Please fill all fields');
      } else {
        Alert.alert('Error', 'Please fill all fields');
      }
      return;
    }

    if (newPassword !== confirmNewPassword) {
      if (Platform.OS === 'web') {
        window.alert('New passwords do not match');
      } else {
        Alert.alert('Error', 'New passwords do not match');
      }
      return;
    }

    if (newPassword.length < 6) {
      if (Platform.OS === 'web') {
        window.alert('Password must be at least 6 characters');
      } else {
        Alert.alert('Error', 'Password must be at least 6 characters');
      }
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch(`${API_URL}/profile/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (response.ok) {
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        if (Platform.OS === 'web') {
          window.alert('Password changed successfully!');
        } else {
          Alert.alert('Success', 'Password changed successfully!');
        }
      } else {
        const data = await response.json();
        if (Platform.OS === 'web') {
          window.alert(data.detail || 'Failed to change password');
        } else {
          Alert.alert('Error', data.detail || 'Failed to change password');
        }
      }
    } catch (error) {
      console.error('Error changing password:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to change password');
      } else {
        Alert.alert('Error', 'Failed to change password');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Toggle 2FA function
  const handleToggle2FA = async () => {
    if (!token) {
      if (Platform.OS === 'web') {
        window.alert('Please login first');
      } else {
        Alert.alert('Error', 'Please login first');
      }
      return;
    }

    try {
      const response = await fetch(`${API_URL}/profile/toggle-2fa`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enable: !is2FAEnabled,
        }),
      });

      if (response.ok) {
        setIs2FAEnabled(!is2FAEnabled);
        setShow2FAModal(false);
        if (Platform.OS === 'web') {
          window.alert(is2FAEnabled ? '2FA disabled successfully!' : '2FA enabled successfully!');
        } else {
          Alert.alert('Success', is2FAEnabled ? '2FA disabled successfully!' : '2FA enabled successfully!');
        }
      } else {
        const data = await response.json();
        if (Platform.OS === 'web') {
          window.alert(data.detail || 'Failed to update 2FA');
        } else {
          Alert.alert('Error', data.detail || 'Failed to update 2FA');
        }
      }
    } catch (error) {
      console.error('Error toggling 2FA:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to update 2FA');
      } else {
        Alert.alert('Error', 'Failed to update 2FA');
      }
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Bronze': return '#CD7F32';
      case 'Silver': return '#C0C0C0';
      case 'Gold': return '#FFD700';
      case 'Platinum': return '#E5E4E2';
      default: return '#CD7F32';
    }
  };

  const renderOverviewTab = () => (
    <>
      {/* Email Verification Banner */}
      {!userData.isEmailVerified && (
        <View style={styles.verificationBanner}>
          <View style={styles.verificationIcon}>
            <Ionicons name="warning" size={24} color="#FFB800" />
          </View>
          <View style={styles.verificationContent}>
            <Text style={styles.verificationTitle}>Email Verification Required</Text>
            <Text style={styles.verificationSubtitle}>Verify your email to unlock all features.</Text>
            <TouchableOpacity style={styles.sendCodeBtn} onPress={handleSendVerificationCode}>
              <Ionicons name="send" size={16} color="#0A1A0F" />
              <Text style={styles.sendCodeText}>Send Code</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* User Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.full_name || userData.fullName || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity style={styles.cameraIcon} onPress={handlePhotoUpload}>
            <Ionicons name="camera" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.profileInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{userData.nickname || user?.full_name || userData.fullName}</Text>
            <View style={[styles.tierBadge, { backgroundColor: getTierColor(userData.tier) + '30' }]}>
              <Ionicons name="trophy" size={12} color={getTierColor(userData.tier)} />
              <Text style={[styles.tierText, { color: getTierColor(userData.tier) }]}>{userData.tier}</Text>
            </View>
          </View>
          <View style={styles.emailRow}>
            <Text style={styles.userEmail}>{user?.email || userData.email}</Text>
            {userData.isEmailVerified ? (
              <Ionicons name="checkmark-circle" size={16} color="#00E55A" style={{ marginLeft: 4 }} />
            ) : (
              <View style={styles.unverifiedDot} />
            )}
            {/* KYC Badge */}
            {kycStatus?.status === 'approved' && (
              <View style={styles.kycBadge}>
                <Text style={styles.kycBadgeText}>KYC</Text>
                <Ionicons name="checkmark-circle" size={14} color="#00BFFF" />
              </View>
            )}
          </View>
          <Text style={styles.userId}>ID: {userData.accountId}</Text>
        </View>
      </View>

      {/* Tier Progress */}
      <View style={styles.tierProgress}>
        <View style={styles.tierLabels}>
          <Text style={[styles.tierLabel, { color: getTierColor(userData.tier) }]}>{userData.tier}</Text>
          <Text style={[styles.tierLabel, { color: getTierColor(userData.nextTier) }]}>{userData.nextTier}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(userData.tierProgress / userData.tierTarget) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>${userData.tierProgress.toLocaleString()} to {userData.nextTier}</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons name="bar-chart" size={16} color="#00E55A" />
            <Text style={styles.statLabel}>TOTAL TRADES</Text>
          </View>
          <Text style={styles.statValue}>{userData.stats.totalTrades}</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons name="trophy" size={16} color="#FFD700" />
            <Text style={styles.statLabel}>WIN RATE</Text>
          </View>
          <Text style={[styles.statValue, { color: '#00E55A' }]}>{userData.stats.winRate.toFixed(1)}%</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons name="trending-up" size={16} color="#00E55A" />
            <Text style={styles.statLabel}>VOLUME</Text>
          </View>
          <Text style={[styles.statValue, { color: '#FF3B3B' }]}>${userData.stats.volume.toLocaleString()}</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons name="cash" size={16} color="#00E55A" />
            <Text style={styles.statLabel}>NET P&L</Text>
          </View>
          <Text style={[styles.statValue, { color: userData.stats.netPnL >= 0 ? '#00E55A' : '#FF3B3B' }]}>
            ${userData.stats.netPnL.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Nickname Section */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="at" size={18} color="#00E55A" />
            <Text style={styles.sectionTitle}>Nickname</Text>
            <View style={styles.leaderboardTag}>
              <Text style={styles.leaderboardTagText}>Leaderboard</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => setShowNicknameModal(true)}>
            <Ionicons name="create-outline" size={16} color="#00E55A" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionValue}>
          {userData.nickname || '— Set a nickname to display on the leaderboard'}
        </Text>
      </View>

      {/* Personal Info Section */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="person" size={18} color="#FFB800" />
            <Text style={styles.sectionTitle}>Personal Info</Text>
          </View>
        </View>
        
        <View style={styles.infoList}>
          <InfoRow icon="calendar-outline" label="JOINED" value={userData.joinedDate} iconColor="#00E55A" />
        </View>
      </View>

      {/* Last Login Section */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="shield-checkmark" size={18} color="#9B59B6" />
            <Text style={styles.sectionTitle}>Last Login</Text>
          </View>
          <View style={styles.secureTag}>
            <View style={styles.secureDot} />
            <Text style={styles.secureText}>Secure</Text>
          </View>
        </View>
        
        <View style={styles.infoList}>
          <InfoRow icon="time" label="TIME" value={userData.lastLogin.time} iconColor="#00E55A" />
          <InfoRow icon="wifi" label="IP ADDRESS" value={userData.lastLogin.ip} iconColor="#FF6B6B" />
        </View>
      </View>
    </>
  );

  const renderSecurityTab = () => (
    <>
      {/* Security Level Section */}
      <View style={styles.sectionCard}>
        <View style={styles.securityHeader}>
          <Text style={styles.securityTitle}>Security Level</Text>
          <Text style={styles.securitySubtitle}>Strengthen your account security</Text>
        </View>

        {/* Password Row */}
        <View style={styles.securityRow}>
          <View style={[styles.securityIcon, { backgroundColor: 'rgba(255, 184, 0, 0.15)' }]}>
            <Ionicons name="lock-closed" size={20} color="#FFB800" />
          </View>
          <View style={styles.securityInfo}>
            <View style={styles.securityLabelRow}>
              <Text style={styles.securityLabel}>Password</Text>
              <View style={[styles.statusBadge, { backgroundColor: 'rgba(0, 229, 90, 0.2)' }]}>
                <Text style={[styles.statusText, { color: '#00E55A' }]}>Set</Text>
              </View>
            </View>
            <Text style={styles.securityDetail}>Last changed: Unknown</Text>
          </View>
          <TouchableOpacity 
            style={styles.securityBtn}
            onPress={() => setShowPasswordModal(true)}
          >
            <Text style={styles.securityBtnText}>Change</Text>
          </TouchableOpacity>
        </View>

        {/* 2FA Row */}
        <View style={[styles.securityRow, { borderBottomWidth: 0 }]}>
          <View style={[styles.securityIcon, { backgroundColor: 'rgba(255, 184, 0, 0.15)' }]}>
            <Ionicons name="shield-checkmark" size={20} color="#FFB800" />
          </View>
          <View style={styles.securityInfo}>
            <View style={styles.securityLabelRow}>
              <Text style={styles.securityLabel}>2FA</Text>
              <View style={[styles.statusBadge, { backgroundColor: is2FAEnabled ? 'rgba(0, 229, 90, 0.2)' : 'rgba(255, 59, 59, 0.2)' }]}>
                <Text style={[styles.statusText, { color: is2FAEnabled ? '#00E55A' : '#FF3B3B' }]}>{is2FAEnabled ? 'On' : 'Off'}</Text>
              </View>
            </View>
            <Text style={styles.securityDetail}>{is2FAEnabled ? 'Enabled — Extra security active' : 'Disabled — Enable for extra security'}</Text>
          </View>
          <TouchableOpacity 
            style={styles.securityBtn}
            onPress={() => setShow2FAModal(true)}
          >
            <Text style={styles.securityBtnText}>{is2FAEnabled ? 'Disable' : 'Enable'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Session Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sessionTitle}>Active Session</Text>
        
        <View style={styles.sessionRow}>
          <View style={[styles.securityIcon, { backgroundColor: 'rgba(0, 229, 90, 0.15)' }]}>
            <Ionicons name="desktop-outline" size={20} color="#00E55A" />
          </View>
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionDevice}>Safari / macOS</Text>
            <Text style={styles.sessionDetail}>192.168.1.xxx · Online</Text>
          </View>
          <View style={styles.onlineDot} />
        </View>
      </View>
    </>
  );

  const renderKYCTab = () => {
    const COUNTRIES = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Japan', 'India', 'Brazil', 'Nepal', 'Bangladesh', 'Pakistan'];
    const ID_TYPES = ['Passport', 'National ID Card', 'Driver\'s License', 'Residence Permit'];

    // Function to start Didit KYC
    const startDiditKyc = async () => {
      console.log('=== START DIDIT KYC ===');
      setIsStartingDiditKyc(true);
      
      // Check if token exists
      if (!token) {
        console.log('ERROR: No authentication token found');
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Error: Please login again to verify your identity.');
        } else {
          Alert.alert('Error', 'Please login again to verify your identity.');
        }
        setIsStartingDiditKyc(false);
        return;
      }
      
      try {
        console.log('Making API request to:', `${API_URL}/kyc/didit/start`);
        
        const response = await fetch(`${API_URL}/kyc/didit/start`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('API Response:', JSON.stringify(data, null, 2));
        
        if (!response.ok) {
          console.log('API Error:', data);
          const errorMsg = data.detail || data.message || 'Failed to start verification';
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.alert('Error: ' + errorMsg);
          } else {
            Alert.alert('Error', errorMsg);
          }
          setIsStartingDiditKyc(false);
          return;
        }
        
        if (data.verification_url) {
          console.log('Opening verification URL:', data.verification_url);
          
          // Open URL based on platform
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            // For web, use window.open
            const newWindow = window.open(data.verification_url, '_blank');
            if (newWindow) {
              window.alert('KYC Verification Started!\n\nPlease complete the verification in the new tab.\nOnce done, return here and refresh to check your status.');
            } else {
              // Popup was blocked
              window.alert('Popup blocked! Please allow popups for this site.\n\nOr copy this URL and open in new tab:\n' + data.verification_url);
            }
          } else {
            // For mobile, use Linking
            try {
              await Linking.openURL(data.verification_url);
              Alert.alert(
                'KYC Verification Started',
                'Please complete the verification in the browser. Once done, return to the app and refresh to check your status.',
                [{ text: 'OK', style: 'default' }]
              );
            } catch (linkError) {
              console.error('Linking error:', linkError);
              Alert.alert('Open This URL', data.verification_url, [{ text: 'OK', style: 'default' }]);
            }
          }
        } else if (data.status === 'verified') {
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.alert('Already Verified! Your KYC is already verified.');
          } else {
            Alert.alert('Already Verified', 'Your KYC is already verified!');
          }
          fetchKycStatus();
        } else {
          console.log('Unexpected response:', data);
          const errMsg = data.message || 'Unexpected response from server';
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.alert('Error: ' + errMsg);
          } else {
            Alert.alert('Error', errMsg);
          }
        }
      } catch (error: any) {
        console.error('Didit KYC error:', error);
        const errMsg = `Could not start KYC verification: ${error.message || 'Unknown error'}`;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Error: ' + errMsg);
        } else {
          Alert.alert('Error', errMsg);
        }
      } finally {
        setIsStartingDiditKyc(false);
      }
      console.log('=== END DIDIT KYC ===');
    };

    // If KYC is already verified
    if (kycStatus?.status === 'verified' || kycStatus?.status === 'approved') {
      return (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <View style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: 'rgba(0, 229, 90, 0.15)',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20
          }}>
            <Ionicons name="checkmark-circle" size={60} color="#00E55A" />
          </View>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 10 }}>
            KYC Verified ✓
          </Text>
          <Text style={{ fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 20 }}>
            Your identity has been successfully verified. You have full access to all features.
          </Text>
          <View style={{
            backgroundColor: 'rgba(0, 229, 90, 0.1)',
            padding: 16,
            borderRadius: 12,
            width: '100%'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="person" size={18} color="#00E55A" />
              <Text style={{ color: '#FFFFFF', marginLeft: 10 }}>
                {kycStatus?.ai_result?.full_name || kycStatus?.full_name || user?.name || 'Verified User'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="calendar" size={18} color="#00E55A" />
              <Text style={{ color: '#888', marginLeft: 10, fontSize: 12 }}>
                Verified on {kycStatus?.verified_at ? new Date(kycStatus.verified_at).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    // If KYC is pending
    if (kycStatus?.status === 'pending') {
      return (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <View style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: 'rgba(255, 184, 0, 0.15)',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20
          }}>
            <Ionicons name="time" size={60} color="#FFB800" />
          </View>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 10 }}>
            Verification Pending
          </Text>
          <Text style={{ fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 20 }}>
            Your documents are being reviewed. This usually takes a few minutes.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#FFB800',
              paddingVertical: 14,
              paddingHorizontal: 30,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center'
            }}
            onPress={fetchKycStatus}
          >
            <Ionicons name="refresh" size={20} color="#0A0A0A" />
            <Text style={{ color: '#0A0A0A', fontWeight: '600', marginLeft: 8 }}>Check Status</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Main KYC Start Screen with Didit Option
    return (
      <View style={{ padding: 16 }}>
        {/* Header */}
        <View style={styles.kycHeader}>
          <Text style={styles.kycTitle}>Identity Verification</Text>
          <Text style={styles.kycSubtitle}>Verify your identity to unlock withdrawals</Text>
        </View>

        {/* Didit Verification Card - Primary Option */}
        <View style={{
          backgroundColor: '#1A1A1A',
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
          borderWidth: 2,
          borderColor: '#FFB800'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{
              width: 50,
              height: 50,
              borderRadius: 12,
              backgroundColor: 'rgba(255, 184, 0, 0.15)',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Ionicons name="shield-checkmark" size={28} color="#FFB800" />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>Quick Verification</Text>
              <Text style={{ color: '#888', fontSize: 12 }}>Powered by Didit.me</Text>
            </View>
            <View style={{
              backgroundColor: '#FFB800',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6
            }}>
              <Text style={{ color: '#0A0A0A', fontSize: 10, fontWeight: '700' }}>RECOMMENDED</Text>
            </View>
          </View>

          <Text style={{ color: '#AAA', fontSize: 13, lineHeight: 20, marginBottom: 16 }}>
            Complete verification in under 2 minutes with our trusted partner. Simply take a selfie and photo of your ID.
          </Text>

          {/* Benefits */}
          <View style={{ marginBottom: 20 }}>
            {[
              { icon: 'flash', text: 'Instant verification' },
              { icon: 'shield-checkmark', text: 'Bank-level security' },
              { icon: 'globe', text: '190+ countries supported' },
            ].map((item, index) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name={item.icon as any} size={16} color="#00E55A" />
                <Text style={{ color: '#CCC', fontSize: 13, marginLeft: 10 }}>{item.text}</Text>
              </View>
            ))}
          </View>

          {/* Start Verification Button */}
          <TouchableOpacity
            style={{
              backgroundColor: '#FFB800',
              paddingVertical: 16,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onPress={startDiditKyc}
            disabled={isStartingDiditKyc}
          >
            {isStartingDiditKyc ? (
              <ActivityIndicator color="#0A0A0A" />
            ) : (
              <>
                <Ionicons name="arrow-forward-circle" size={22} color="#0A0A0A" />
                <Text style={{ color: '#0A0A0A', fontWeight: '700', fontSize: 16, marginLeft: 8 }}>
                  Start Verification
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Requirements Info */}
        <View style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 12,
          padding: 16
        }}>
          <Text style={{ color: '#FFB800', fontSize: 14, fontWeight: '600', marginBottom: 12 }}>
            📋 What you'll need:
          </Text>
          {[
            'Valid government-issued ID (Passport, National ID, or Driver\'s License)',
            'A device with a camera for selfie verification',
            'Good lighting conditions',
          ].map((item, index) => (
            <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
              <Text style={{ color: '#00E55A', marginRight: 8 }}>•</Text>
              <Text style={{ color: '#888', fontSize: 13, flex: 1 }}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };
  // Fetch transactions
  const fetchTransactions = async () => {
    if (!token) return;
    setLoadingTransactions(true);
    try {
      const response = await fetch(`${API_URL}/wallet/transactions`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
        if (data.summary) {
          setTransactionSummary(data.summary);
        }
        // Check if any withdrawal is locked
        const lockedTx = (data.transactions || []).find((tx: any) => tx.status === 'locked' && tx.type === 'withdrawal');
        setHasLockedWithdrawal(!!lockedTx);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
    setLoadingTransactions(false);
  };

  // Pick KYC document image
  const pickKycDocument = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setKycUploadImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Upload KYC document for locked withdrawal
  const uploadKycDocument = async () => {
    if (!kycUploadImage || !selectedLockedTx || !token) {
      Alert.alert('Error', 'Please select a document image');
      return;
    }

    setIsUploadingKyc(true);
    try {
      const response = await fetch(`${API_URL}/withdraw/upload-kyc/${selectedLockedTx.transaction_id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          document_url: kycUploadImage,
          document_type: selectedLockedTx.kyc_requirement || 'Bank Statement'
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        Alert.alert('Success', 'Document uploaded successfully! Awaiting admin review.');
        setShowKycUploadModal(false);
        setKycUploadImage(null);
        setSelectedLockedTx(null);
        fetchTransactions(); // Refresh
      } else {
        Alert.alert('Error', data.detail || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Upload KYC error:', error);
      Alert.alert('Error', 'Failed to upload document');
    }
    setIsUploadingKyc(false);
  };

  // Open KYC upload modal for locked transaction
  const openKycUploadModal = (tx: any) => {
    setSelectedLockedTx(tx);
    setKycUploadImage(null);
    setShowKycUploadModal(true);
  };

  // Fetch transactions when Finance tab Overview is active
  useEffect(() => {
    if (activeTab === 'Finance' && financeSubTab === 'Overview' && token) {
      fetchTransactions();
    }
  }, [activeTab, financeSubTab, token]);

  const renderFinanceTab = () => {
    const CRYPTO_OPTIONS = [
      { id: 'USDT', name: 'Tether (USDT)', icon: '💵', network: 'TRC20' },
      { id: 'BTC', name: 'Bitcoin', icon: '₿', network: 'Bitcoin' },
      { id: 'ETH', name: 'Ethereum', icon: 'Ξ', network: 'ERC20' },
      { id: 'LTC', name: 'Litecoin', icon: 'Ł', network: 'Litecoin' },
    ];

    return (
      <>
        {/* Sub Tabs - Only Overview */}
        <View style={styles.financeSubTabs}>
          <TouchableOpacity
            style={[styles.financeSubTab, styles.financeSubTabActive, { flex: 1 }]}
            onPress={() => setFinanceSubTab('Overview')}
          >
            <Ionicons name="stats-chart" size={18} color="#00E55A" />
            <Text style={[styles.financeSubTabText, styles.financeSubTabTextActive]}>Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.financeSubTab, { flex: 1 }]}
            onPress={() => setShowDepositModal(true)}
          >
            <Ionicons name="arrow-down-circle" size={18} color="#666" />
            <Text style={styles.financeSubTabText}>Deposit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.financeSubTab, { flex: 1 }]}
            onPress={() => {
              // Check KYC status before allowing withdrawal
              if (kycStatus?.status !== 'verified' && kycStatus?.status !== 'approved') {
                setShowKycRequiredModal(true);
              } else {
                setShowWithdrawModal(true);
              }
            }}
          >
            <Ionicons name="arrow-up-circle" size={18} color="#666" />
            <Text style={styles.financeSubTabText}>Withdraw</Text>
          </TouchableOpacity>
        </View>

        {/* Overview Section - Shows Summary and All Transactions */}
        <View style={styles.financeSection}>
          {/* Summary Stats Cards */}
          <View style={styles.financeSummaryRow}>
            {/* Total Deposits Card */}
            <View style={[styles.financeSummaryCard, { borderLeftColor: '#00E55A' }]}>
              <View style={styles.financeSummaryIconBox}>
                <Ionicons name="arrow-down-circle" size={28} color="#00E55A" />
              </View>
              <View style={styles.financeSummaryInfo}>
                <Text style={styles.financeSummaryLabel}>Total Deposits</Text>
                <Text style={[styles.financeSummaryAmount, { color: '#00E55A' }]}>
                  ${transactionSummary.total_deposit_amount.toFixed(2)}
                </Text>
                <Text style={styles.financeSummaryCount}>
                  {transactionSummary.total_deposits} {transactionSummary.total_deposits === 1 ? 'Transaction' : 'Transactions'}
                </Text>
              </View>
            </View>

            {/* Total Withdrawals Card */}
            <View style={[styles.financeSummaryCard, { borderLeftColor: '#FF3B3B' }]}>
              <View style={styles.financeSummaryIconBox}>
                <Ionicons name="arrow-up-circle" size={28} color="#FF3B3B" />
              </View>
              <View style={styles.financeSummaryInfo}>
                <Text style={styles.financeSummaryLabel}>Total Withdrawals</Text>
                <Text style={[styles.financeSummaryAmount, { color: '#FF3B3B' }]}>
                  ${transactionSummary.total_withdrawal_amount.toFixed(2)}
                </Text>
                <Text style={styles.financeSummaryCount}>
                  {transactionSummary.total_withdrawals} {transactionSummary.total_withdrawals === 1 ? 'Transaction' : 'Transactions'}
                </Text>
              </View>
            </View>
          </View>

          {/* All Transactions Section */}
          <View style={styles.financeHistoryHeader}>
            <View style={styles.financeHistoryTitleRow}>
              <Ionicons name="time" size={20} color="#00E55A" />
              <Text style={styles.financeHistoryTitle}>Transactions</Text>
            </View>
            </View>

            {/* Table Header */}
            <View style={styles.txTableHeader}>
              <Text style={styles.txTableHeaderText}>Transaction ID</Text>
              <Text style={styles.txTableHeaderText}>Amount</Text>
            </View>

            {loadingTransactions ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00E55A" />
              </View>
            ) : transactions.length === 0 ? (
              <View style={styles.emptyTransactions}>
                <Ionicons name="document-text-outline" size={48} color="#444" />
                <Text style={styles.emptyTransactionsText}>No transactions yet</Text>
                <Text style={styles.emptyTransactionsSubtext}>
                  Make your first deposit to start trading
                </Text>
              </View>
            ) : (
              transactions.map((tx, index) => (
                <View key={tx.transaction_id || index} style={styles.txRow}>
                  {/* Left Side - ID, Date, Status */}
                  <View style={styles.txLeftCol}>
                    <Text style={styles.txId}>{tx.transaction_id || tx.payment_id || `TXN${index + 1}`}</Text>
                    <Text style={styles.txDateTime}>
                      {tx.created_at ? new Date(tx.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      }) + ', ' + new Date(tx.created_at).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      }) : 'N/A'}
                    </Text>
                    <View style={[
                      styles.txStatusBadge,
                      { backgroundColor: 
                        (tx.status === 'completed' || tx.status === 'confirmed' || tx.status === 'finished' || tx.status === 'credited') ? 'rgba(0,229,90,0.15)' : 
                        (tx.status === 'pending' || tx.status === 'waiting') ? 'rgba(255,184,0,0.15)' : 
                        tx.status === 'locked' ? 'rgba(139,92,246,0.15)' :
                        tx.status === 'expired' ? 'rgba(128,128,128,0.15)' :
                        'rgba(255,59,59,0.15)' 
                      }
                    ]}>
                      <View style={[
                        styles.txStatusDot,
                        { backgroundColor: 
                          (tx.status === 'completed' || tx.status === 'confirmed' || tx.status === 'finished' || tx.status === 'credited') ? '#00E55A' : 
                          (tx.status === 'pending' || tx.status === 'waiting') ? '#FFB800' : 
                          tx.status === 'locked' ? '#8B5CF6' :
                          tx.status === 'expired' ? '#808080' :
                          '#FF3B3B' 
                        }
                      ]} />
                      <Text style={[
                        styles.txStatusText,
                        { color: 
                          (tx.status === 'completed' || tx.status === 'confirmed' || tx.status === 'finished' || tx.status === 'credited') ? '#00E55A' : 
                          (tx.status === 'pending' || tx.status === 'waiting') ? '#FFB800' : 
                          tx.status === 'locked' ? '#8B5CF6' :
                          tx.status === 'expired' ? '#808080' :
                          '#FF3B3B' 
                        }
                      ]}>
                        {(tx.status === 'completed' || tx.status === 'confirmed' || tx.status === 'finished' || tx.status === 'credited') ? 'Success' : 
                         (tx.status === 'pending' || tx.status === 'waiting') ? 'Pending' : 
                         tx.status === 'locked' ? 'KYC Required' :
                         tx.status === 'rejected' ? 'Rejected' :
                         tx.status === 'expired' ? 'Expired' : 'Failed'}
                      </Text>
                    </View>
                    {/* Upload Document Button for Locked Withdrawals */}
                    {tx.status === 'locked' && tx.type === 'withdrawal' && !tx.kyc_submitted && (
                      <TouchableOpacity 
                        style={styles.kycUploadBtn}
                        onPress={() => openKycUploadModal(tx)}
                      >
                        <Ionicons name="cloud-upload" size={14} color="#FFF" />
                        <Text style={styles.kycUploadBtnText}>Upload Doc</Text>
                      </TouchableOpacity>
                    )}
                    {tx.status === 'locked' && tx.type === 'withdrawal' && tx.kyc_submitted && (
                      <View style={[styles.kycUploadBtn, { backgroundColor: '#FFB800' }]}>
                        <Ionicons name="time" size={14} color="#FFF" />
                        <Text style={styles.kycUploadBtnText}>Under Review</Text>
                      </View>
                    )}
                  </View>
                  
                  {/* Right Side - Amount, Method, Type */}
                  <View style={styles.txRightCol}>
                    <Text style={[
                      styles.txAmount,
                      { color: tx.type === 'deposit' ? '#00E55A' : '#FF3B3B' }
                    ]}>
                      {tx.type === 'deposit' ? '+' : '-'}${tx.amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </Text>
                    <Text style={styles.txMethod}>
                      {tx.currency || 'USDT'} {tx.network ? `(${tx.network})` : '(TRC20)'}
                    </Text>
                    <Text style={[
                      styles.txType,
                      { color: tx.type === 'deposit' ? '#00E55A' : '#FF3B3B' }
                    ]}>
                      {tx.type === 'deposit' ? 'Deposit' : 'Withdraw'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
      </>
    );
  };

  const renderActivityTab = () => {
    const LOGIN_HISTORY = [
      { id: 1, device: 'Safari / macOS', ip: '202.166.206.20', location: 'Nepal', date: '22/03/2026 14:42' },
      { id: 2, device: 'Chrome / Windows', ip: '192.168.1.100', location: 'United States', date: '21/03/2026 10:15' },
      { id: 3, device: 'Mobile App / iOS', ip: '10.0.0.50', location: 'Germany', date: '20/03/2026 18:30' },
    ];

    const ACTIVITY_LOG = [
      { id: 1, action: 'Password Changed', time: '22/03/2026 14:30', icon: 'key' },
      { id: 2, action: 'Profile Updated', time: '21/03/2026 09:45', icon: 'person' },
      { id: 3, action: 'Trade Placed - EUR/USD', time: '20/03/2026 16:20', icon: 'trending-up' },
    ];

    return (
      <>
        {/* Sub Tabs */}
        <View style={styles.activitySubTabs}>
          <TouchableOpacity
            style={[styles.activitySubTab, activitySubTab === 'Login History' && styles.activitySubTabActive]}
            onPress={() => setActivitySubTab('Login History')}
          >
            <Text style={[styles.activitySubTabText, activitySubTab === 'Login History' && styles.activitySubTabTextActive]}>
              Login History
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.activitySubTab, activitySubTab === 'Activity Log' && styles.activitySubTabActive]}
            onPress={() => setActivitySubTab('Activity Log')}
          >
            <Text style={[styles.activitySubTabText, activitySubTab === 'Activity Log' && styles.activitySubTabTextActive]}>
              Activity Log
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activitySubTab === 'Login History' ? (
          <View style={styles.activityList}>
            {LOGIN_HISTORY.map((item) => (
              <View key={item.id} style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  <Ionicons name="log-in" size={20} color="#00E55A" />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityDevice}>{item.device}</Text>
                  <Text style={styles.activityDetail}>{item.ip} · {item.location}</Text>
                </View>
                <Text style={styles.activityDate}>{item.date}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.activityList}>
            {ACTIVITY_LOG.map((item) => (
              <View key={item.id} style={styles.activityItem}>
                <View style={[styles.activityIcon, { backgroundColor: 'rgba(255, 184, 0, 0.15)' }]}>
                  <Ionicons name={item.icon as any} size={20} color="#FFB800" />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityDevice}>{item.action}</Text>
                </View>
                <Text style={styles.activityDate}>{item.time}</Text>
              </View>
            ))}
          </View>
        )}
      </>
    );
  };

  const renderSettingsTab = () => {
    const toggleSetting = async (key: keyof typeof notificationSettings) => {
      const newValue = !notificationSettings[key];
      setNotificationSettings(prev => ({ ...prev, [key]: newValue }));
      
      // Save to backend
      try {
        const response = await fetch(`${API_URL}/profile/notification-settings`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            setting: key,
            enabled: newValue,
          }),
        });
        
        if (response.ok) {
          // Success - setting saved
        } else {
          // Revert on error
          setNotificationSettings(prev => ({ ...prev, [key]: !newValue }));
          if (Platform.OS === 'web') {
            window.alert('Failed to update setting');
          } else {
            Alert.alert('Error', 'Failed to update setting');
          }
        }
      } catch (error) {
        // Revert on error
        setNotificationSettings(prev => ({ ...prev, [key]: !newValue }));
        console.error('Error updating setting:', error);
      }
    };

    const handleDeleteAccount = () => {
      if (Platform.OS === 'web') {
        const confirmed = window.confirm('Are you sure you want to delete your account? This action cannot be undone.');
        if (confirmed) {
          submitDeleteRequest();
        }
      } else {
        Alert.alert(
          'Delete Account',
          'Are you sure you want to delete your account? This action cannot be undone.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Delete', 
              style: 'destructive',
              onPress: submitDeleteRequest
            },
          ]
        );
      }
    };

    const submitDeleteRequest = async () => {
      try {
        const response = await fetch(`${API_URL}/profile/delete-request`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          if (Platform.OS === 'web') {
            window.alert('Your account deletion request has been submitted. We will process it within 24-48 hours.');
          } else {
            Alert.alert('Request Sent', 'Your account deletion request has been submitted. We will process it within 24-48 hours.');
          }
        } else {
          const data = await response.json();
          if (Platform.OS === 'web') {
            window.alert(data.detail || 'Failed to submit deletion request');
          } else {
            Alert.alert('Error', data.detail || 'Failed to submit deletion request');
          }
        }
      } catch (error) {
        console.error('Error submitting deletion request:', error);
        if (Platform.OS === 'web') {
          window.alert('Failed to submit deletion request');
        } else {
          Alert.alert('Error', 'Failed to submit deletion request');
        }
      }
    };

    return (
      <>
        {/* Chart Background Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.settingsSectionTitle}>Chart Background</Text>
          <Text style={styles.settingsSectionSubtitle}>Customize your trading chart appearance</Text>

          {/* Current Chart Picture */}
          <View style={styles.chartPictureContainer}>
            {user?.chart_picture ? (
              <Image 
                source={{ uri: user.chart_picture }} 
                style={styles.chartPicturePreview}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.chartPicturePlaceholder}>
                <Ionicons name="image-outline" size={40} color="#444" />
                <Text style={styles.chartPicturePlaceholderText}>No chart background set</Text>
              </View>
            )}
          </View>

          {/* Upload/Change Button */}
          <TouchableOpacity 
            style={styles.chartPictureUploadBtn}
            onPress={async () => {
              try {
                const ImagePicker = await import('expo-image-picker');
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true,
                  aspect: [16, 9],
                  quality: 0.7,
                  base64: true,
                });

                if (!result.canceled && result.assets[0].base64) {
                  console.log('Image selected, uploading...');
                  
                  const response = await fetch(`${API_URL}/profile/chart-picture`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      photo_base64: result.assets[0].base64,
                    }),
                  });

                  console.log('Upload response status:', response.status);
                  
                  if (response.ok) {
                    const data = await response.json();
                    console.log('Upload success:', data);
                    
                    // Refresh user data from server
                    const { refreshUser } = useAuthStore.getState();
                    await refreshUser();
                    
                    Alert.alert('Success', 'Chart background updated!');
                  } else {
                    const errorData = await response.text();
                    console.error('Upload failed:', errorData);
                    Alert.alert('Error', 'Failed to upload image');
                  }
                }
              } catch (error) {
                console.error('Error uploading chart picture:', error);
                Alert.alert('Error', 'Failed to upload image');
              }
            }}
          >
            <Ionicons name="cloud-upload" size={20} color="#0A0A0A" />
            <Text style={styles.chartPictureUploadBtnText}>
              {user?.chart_picture ? 'Change Background' : 'Upload Background'}
            </Text>
          </TouchableOpacity>

          {/* Remove Button */}
          {user?.chart_picture && (
            <TouchableOpacity 
              style={styles.chartPictureRemoveBtn}
              onPress={async () => {
                try {
                  const response = await fetch(`${API_URL}/profile/chart-picture`, {
                    method: 'DELETE',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                    },
                  });

                  if (response.ok) {
                    // Refresh user data from server
                    const { refreshUser } = useAuthStore.getState();
                    await refreshUser();
                    
                    Alert.alert('Success', 'Chart background removed');
                  }
                } catch (error) {
                  console.error('Error removing chart picture:', error);
                }
              }}
            >
              <Ionicons name="trash-outline" size={18} color="#FF3B3B" />
              <Text style={styles.chartPictureRemoveBtnText}>Remove Background</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notifications Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.settingsSectionTitle}>Notifications</Text>
          <Text style={styles.settingsSectionSubtitle}>Manage how you receive notifications</Text>

          {/* Email Notifications */}
          <View style={styles.settingsRow}>
            <View style={[styles.settingsIcon, { backgroundColor: 'rgba(155, 89, 182, 0.15)' }]}>
              <Ionicons name="mail" size={18} color="#9B59B6" />
            </View>
            <View style={styles.settingsInfo}>
              <Text style={styles.settingsLabel}>Email Notifications</Text>
              <Text style={styles.settingsDetail}>Receive updates via email</Text>
            </View>
            <TouchableOpacity 
              style={[styles.toggleBtn, notificationSettings.email && styles.toggleBtnActive]}
              onPress={() => toggleSetting('email')}
            >
              <View style={[styles.toggleCircle, notificationSettings.email && styles.toggleCircleActive]} />
            </TouchableOpacity>
          </View>

          {/* Trade Alerts */}
          <View style={styles.settingsRow}>
            <View style={[styles.settingsIcon, { backgroundColor: 'rgba(0, 229, 90, 0.15)' }]}>
              <Ionicons name="trending-up" size={18} color="#00E55A" />
            </View>
            <View style={styles.settingsInfo}>
              <Text style={styles.settingsLabel}>Trade Alerts</Text>
              <Text style={styles.settingsDetail}>Trade result notifications</Text>
            </View>
            <TouchableOpacity 
              style={[styles.toggleBtn, notificationSettings.tradeAlerts && styles.toggleBtnActive]}
              onPress={() => toggleSetting('tradeAlerts')}
            >
              <View style={[styles.toggleCircle, notificationSettings.tradeAlerts && styles.toggleCircleActive]} />
            </TouchableOpacity>
          </View>

          {/* Deposit Updates */}
          <View style={styles.settingsRow}>
            <View style={[styles.settingsIcon, { backgroundColor: 'rgba(255, 184, 0, 0.15)' }]}>
              <Ionicons name="arrow-down" size={18} color="#FFB800" />
            </View>
            <View style={styles.settingsInfo}>
              <Text style={styles.settingsLabel}>Deposit Updates</Text>
              <Text style={styles.settingsDetail}>Deposit status alerts</Text>
            </View>
            <TouchableOpacity 
              style={[styles.toggleBtn, notificationSettings.depositUpdates && styles.toggleBtnActive]}
              onPress={() => toggleSetting('depositUpdates')}
            >
              <View style={[styles.toggleCircle, notificationSettings.depositUpdates && styles.toggleCircleActive]} />
            </TouchableOpacity>
          </View>

          {/* Withdrawal Updates */}
          <View style={styles.settingsRow}>
            <View style={[styles.settingsIcon, { backgroundColor: 'rgba(0, 229, 90, 0.15)' }]}>
              <Ionicons name="arrow-up" size={18} color="#00E55A" />
            </View>
            <View style={styles.settingsInfo}>
              <Text style={styles.settingsLabel}>Withdrawal Updates</Text>
              <Text style={styles.settingsDetail}>Withdrawal status alerts</Text>
            </View>
            <TouchableOpacity 
              style={[styles.toggleBtn, notificationSettings.withdrawalUpdates && styles.toggleBtnActive]}
              onPress={() => toggleSetting('withdrawalUpdates')}
            >
              <View style={[styles.toggleCircle, notificationSettings.withdrawalUpdates && styles.toggleCircleActive]} />
            </TouchableOpacity>
          </View>

          {/* Security Alerts */}
          <View style={[styles.settingsRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.settingsIcon, { backgroundColor: 'rgba(255, 184, 0, 0.15)' }]}>
              <Ionicons name="shield" size={18} color="#FFB800" />
            </View>
            <View style={styles.settingsInfo}>
              <Text style={styles.settingsLabel}>Security Alerts</Text>
              <Text style={styles.settingsDetail}>Login and security alerts</Text>
            </View>
            <TouchableOpacity 
              style={[styles.toggleBtn, notificationSettings.securityAlerts && styles.toggleBtnActive]}
              onPress={() => toggleSetting('securityAlerts')}
            >
              <View style={[styles.toggleCircle, notificationSettings.securityAlerts && styles.toggleCircleActive]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
          <Text style={styles.dangerZoneSubtitle}>Once deleted, all data is permanently removed.</Text>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
            <Ionicons name="trash" size={18} color="#FF3B3B" />
            <Text style={styles.deleteBtnText}>Request Account Deletion</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Overview': return renderOverviewTab();
      case 'Finance': return renderFinanceTab();
      case 'Security': return renderSecurityTab();
      case 'KYC': return renderKYCTab();
      case 'Activity': return renderActivityTab();
      case 'Settings': return renderSettingsTab();
      default: return renderOverviewTab();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color="#FF3B3B" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Ionicons 
                name={
                  tab === 'Overview' ? 'person' :
                  tab === 'Finance' ? 'wallet' :
                  tab === 'Security' ? 'shield' :
                  tab === 'KYC' ? 'card' :
                  tab === 'Activity' ? 'time' : 'settings'
                } 
                size={16} 
                color={activeTab === tab ? '#00E55A' : '#666'} 
              />
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderTabContent()}
      </ScrollView>

      {/* Deposit Funds Modal */}
      <Modal visible={showDepositModal} transparent animationType="slide">
        <View style={styles.depositModalOverlay}>
          <View style={styles.depositModalContent}>
            {/* Header */}
            <View style={styles.depositModalHeader}>
              <Text style={styles.depositModalTitle}>Deposit Funds</Text>
              <TouchableOpacity onPress={() => {
                setShowDepositModal(false);
                setGeneratedAddress(null);
                setPaymentId(null);
                setDepositError(null);
              }}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {!generatedAddress ? (
                <>
                  {/* Amount Input */}
                  <Text style={styles.depositLabel}>Enter Amount</Text>
                  <View style={styles.depositAmountBox}>
                    <Text style={styles.depositAmountPrefix}>$</Text>
                    <TextInput
                      style={styles.depositAmountInput}
                      value={depositAmount}
                      onChangeText={setDepositAmount}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#444"
                    />
                  </View>
                  <Text style={styles.depositMinimum}>Minimum deposit: $21</Text>

                  {/* Quick Amounts */}
                  <View style={styles.depositQuickAmounts}>
                    {['50', '100', '250', '500', '1000'].map((amt) => (
                      <TouchableOpacity
                        key={amt}
                        style={[styles.depositQuickBtn, depositAmount === amt && styles.depositQuickBtnActive]}
                        onPress={() => setDepositAmount(amt)}
                      >
                        <Text style={[styles.depositQuickBtnText, depositAmount === amt && styles.depositQuickBtnTextActive]}>
                          ${amt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Network Selection */}
                  <Text style={styles.depositLabel}>Select Network</Text>
                  <TouchableOpacity 
                    style={styles.depositNetworkSelect}
                    onPress={() => setShowNetworkDropdown(!showNetworkDropdown)}
                  >
                    <View style={styles.depositNetworkLeft}>
                      <Ionicons name="link" size={18} color="#00E55A" />
                      <Text style={styles.depositNetworkText}>{selectedNetwork}</Text>
                    </View>
                    <Ionicons name="chevron-down" size={20} color="#888" />
                  </TouchableOpacity>

                  {showNetworkDropdown && (
                    <View style={styles.depositNetworkDropdown}>
                      {['USDT (TRC20)', 'USDT (ERC20)', 'BTC (Bitcoin)', 'ETH (Ethereum)', 'LTC (Litecoin)'].map((network) => (
                        <TouchableOpacity
                          key={network}
                          style={[styles.depositNetworkOption, selectedNetwork === network && styles.depositNetworkOptionActive]}
                          onPress={() => {
                            setSelectedNetwork(network);
                            setShowNetworkDropdown(false);
                          }}
                        >
                          <Text style={[styles.depositNetworkOptionText, selectedNetwork === network && { color: '#00E55A' }]}>
                            {network}
                          </Text>
                          {selectedNetwork === network && <Ionicons name="checkmark" size={18} color="#00E55A" />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* No Fees Info */}
                  <Text style={styles.depositNoFees}>No fees - Pay exact amount only</Text>

                  {/* Promo Code */}
                  <Text style={styles.depositLabel}>Promo Code (Optional)</Text>
                  <View style={styles.depositPromoRow}>
                    <TextInput
                      style={styles.depositPromoInput}
                      placeholder="Enter code"
                      placeholderTextColor="#444"
                      value={promoCode}
                      onChangeText={setPromoCode}
                    />
                    <TouchableOpacity 
                      style={styles.depositPromoQuickBtn}
                      onPress={() => {
                        setPromoCode('BYNIX');
                        setAppliedPromo('BYNIX');
                      }}
                    >
                      <Text style={styles.depositPromoQuickText}>BYNIX</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Error Message */}
                  {depositError && (
                    <View style={{ backgroundColor: 'rgba(255,59,59,0.15)', padding: 12, borderRadius: 8, marginTop: 12 }}>
                      <Text style={{ color: '#FF3B3B', fontSize: 13 }}>{depositError}</Text>
                    </View>
                  )}

                  {/* Generate Address Button */}
                  <TouchableOpacity 
                    style={[styles.depositGenerateBtn, isGeneratingAddress && { opacity: 0.7 }]}
                    onPress={async () => {
                      const amount = parseFloat(depositAmount);
                      if (isNaN(amount) || amount < 21) {
                        setDepositError('Minimum deposit amount is $21');
                        return;
                      }
                      
                      if (!token) {
                        Alert.alert('Login Required', 'Please login to make a deposit');
                        return;
                      }
                      
                      setIsGeneratingAddress(true);
                      setDepositError(null);
                      
                      try {
                        const networkMap: { [key: string]: string } = {
                          'USDT (TRC20)': 'TRC20',
                          'USDT (ERC20)': 'ERC20',
                          'BTC (Bitcoin)': 'BTC',
                          'ETH (Ethereum)': 'ETH',
                          'LTC (Litecoin)': 'LTC'
                        };
                        
                        const response = await fetch(`${API_URL}/deposit/create`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify({
                            amount: amount,
                            network: networkMap[selectedNetwork] || 'TRC20',
                            promo_code: promoCode || null
                          })
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                          setGeneratedAddress(data.pay_address);
                          setPaymentId(data.payment_id?.toString());
                          setPayAmount(data.pay_amount?.toString());
                          
                          if (data.expiration_estimate_date) {
                            setExpirationTime(new Date(data.expiration_estimate_date));
                          } else {
                            const expiry = new Date();
                            expiry.setMinutes(expiry.getMinutes() + 20);
                            setExpirationTime(expiry);
                          }
                        } else {
                          setDepositError(data.error || data.detail || 'Failed to create deposit');
                        }
                      } catch (error: any) {
                        console.error('Deposit error:', error);
                        setDepositError(error.message || 'Network error. Please try again.');
                      }
                      
                      setIsGeneratingAddress(false);
                    }}
                    disabled={isGeneratingAddress}
                  >
                    {isGeneratingAddress ? (
                      <ActivityIndicator size="small" color="#0A0A0A" />
                    ) : (
                      <Text style={styles.depositGenerateBtnText}>Generate Deposit Address</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Generated Address View with QR Code */}
                  <View style={{ alignItems: 'center', marginTop: 16 }}>
                    {/* QR Code */}
                    <View style={{ backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 20 }}>
                      <QRCode
                        value={generatedAddress || 'bitcoin:address'}
                        size={180}
                        backgroundColor="#FFFFFF"
                        color="#000000"
                      />
                    </View>
                    
                    {/* Payment Info */}
                    <View style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                      <Text style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>Payment ID</Text>
                      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>{paymentId || 'N/A'}</Text>
                    </View>
                    
                    <View style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                      <Text style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>Expires In</Text>
                      <Text style={{ color: countdownText === 'EXPIRED' ? '#FF3B3B' : '#00E55A', fontSize: 16, fontWeight: '700' }}>{countdownText}</Text>
                    </View>
                    
                    <View style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                      <Text style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>Send exactly</Text>
                      <Text style={{ color: '#00E55A', fontSize: 18, fontWeight: '700' }}>{payAmount} USDT</Text>
                    </View>
                    
                    {/* Address Box */}
                    <View style={{ width: '100%', backgroundColor: 'rgba(0,229,90,0.1)', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(0,229,90,0.3)' }}>
                      <Text style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>Deposit Address ({selectedNetwork})</Text>
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }} selectable>{generatedAddress}</Text>
                    </View>
                    
                    {/* Copy Button */}
                    <TouchableOpacity 
                      style={{ backgroundColor: '#00E55A', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, width: '100%', alignItems: 'center' }}
                      onPress={async () => {
                        if (generatedAddress) {
                          await Clipboard.setStringAsync(generatedAddress);
                          Alert.alert('Copied!', 'Address copied to clipboard');
                        }
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="copy" size={18} color="#0A0A0A" />
                        <Text style={{ color: '#0A0A0A', fontSize: 16, fontWeight: '700' }}>Copy Address</Text>
                      </View>
                    </TouchableOpacity>
                    
                    {/* New Deposit Button */}
                    <TouchableOpacity 
                      style={{ marginTop: 12, paddingVertical: 12 }}
                      onPress={() => {
                        setGeneratedAddress(null);
                        setPaymentId(null);
                        setPayAmount(null);
                        setExpirationTime(null);
                      }}
                    >
                      <Text style={{ color: '#888', fontSize: 14 }}>Create New Deposit</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* KYC Required Modal - Shows when user tries to withdraw without KYC */}
      <Modal visible={showKycRequiredModal} transparent animationType="fade">
        <View style={styles.withdrawModalOverlay}>
          <View style={[styles.withdrawModalContent, { maxHeight: 450, justifyContent: 'center' }]}>
            {/* Close Button */}
            <TouchableOpacity 
              onPress={() => setShowKycRequiredModal(false)} 
              style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}
            >
              <Ionicons name="close" size={24} color="#888" />
            </TouchableOpacity>

            {/* Icon */}
            <View style={{ alignItems: 'center', marginTop: 20 }}>
              <View style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: 'rgba(255, 184, 0, 0.15)',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 20
              }}>
                <Ionicons name="shield-checkmark" size={40} color="#FFB800" />
              </View>
              
              <Text style={{ fontSize: 22, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', marginBottom: 12 }}>
                KYC Verification Required
              </Text>
              
              <Text style={{ fontSize: 14, color: '#888', textAlign: 'center', paddingHorizontal: 20, lineHeight: 22, marginBottom: 30 }}>
                To ensure the security of your funds and comply with regulations, please verify your identity before making withdrawals.
              </Text>

              {/* KYC Status Info */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 59, 59, 0.1)',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 10,
                marginBottom: 30
              }}>
                <Ionicons name="information-circle" size={20} color="#FF3B3B" />
                <Text style={{ color: '#FF3B3B', marginLeft: 8, fontSize: 13 }}>
                  {kycStatus?.status === 'pending' 
                    ? 'Your KYC is under review. Please wait for approval.'
                    : kycStatus?.status === 'rejected'
                    ? 'Your KYC was rejected. Please re-submit documents.'
                    : 'Your KYC is not verified yet.'}
                </Text>
              </View>

              {/* Verify KYC Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#FFB800',
                  paddingVertical: 16,
                  paddingHorizontal: 40,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  width: '90%'
                }}
                onPress={() => {
                  setShowKycRequiredModal(false);
                  setActiveTab('KYC');
                }}
              >
                <Ionicons name="shield-checkmark" size={20} color="#0A0A0A" />
                <Text style={{ color: '#0A0A0A', fontWeight: '700', fontSize: 16, marginLeft: 10, flex: 1, textAlign: 'center' }}>
                  {kycStatus?.status === 'pending' ? 'View KYC Status' : 'Verify KYC Now'}
                </Text>
              </TouchableOpacity>

              {/* Later Button */}
              <TouchableOpacity
                style={{ marginTop: 15, paddingVertical: 10 }}
                onPress={() => setShowKycRequiredModal(false)}
              >
                <Text style={{ color: '#666', fontSize: 14 }}>I'll do it later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Withdraw Funds Modal - Modern Design */}
      <Modal visible={showWithdrawModal} transparent animationType="slide">
        <View style={styles.withdrawModalOverlay}>
          <View style={styles.withdrawModalContent}>
            {/* Header */}
            <View style={styles.withdrawModalHeader}>
              <TouchableOpacity onPress={() => {
                setShowWithdrawModal(false);
                setWithdrawAmount('');
                setWithdrawAddress('');
              }} style={styles.withdrawBackBtn}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.withdrawModalTitle}>Withdraw Funds</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.withdrawScrollView}>
              {/* Balance Card */}
              <View style={styles.withdrawBalanceCardNew}>
                <View style={styles.withdrawBalanceIconWrap}>
                  <Ionicons name="wallet" size={28} color="#00E55A" />
                </View>
                <Text style={styles.withdrawBalanceLabelNew}>Available Balance</Text>
                <Text style={styles.withdrawBalanceValueNew}>
                  ${(user?.withdrawable_balance || user?.real_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                <Text style={styles.withdrawMinText}>Minimum withdrawal: $10</Text>
              </View>

              {/* Locked Withdrawal Warning */}
              {hasLockedWithdrawal && (
                <View style={[styles.withdrawBonusCard, { backgroundColor: 'rgba(139,92,246,0.15)', borderColor: '#8B5CF6' }]}>
                  <Ionicons name="lock-closed" size={20} color="#8B5CF6" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.withdrawBonusText, { color: '#8B5CF6' }]}>
                      You have a locked withdrawal pending KYC verification.
                    </Text>
                    <Text style={[styles.withdrawBonusText, { color: '#8B5CF6', fontSize: 11, marginTop: 4 }]}>
                      Please upload the required document before creating new requests.
                    </Text>
                  </View>
                </View>
              )}

              {/* Bonus Warning */}
              {(user?.bonus_balance || 0) > 0 && (
                <View style={styles.withdrawBonusCard}>
                  <Ionicons name="alert-circle" size={20} color="#FFB800" />
                  <Text style={styles.withdrawBonusText}>
                    Bonus (${user?.bonus_balance?.toFixed(2)}) cannot be withdrawn
                  </Text>
                </View>
              )}

              {/* Amount Section */}
              <View style={styles.withdrawFormCard}>
                <Text style={styles.withdrawFormLabel}>Withdrawal Amount</Text>
                <View style={styles.withdrawAmountInputWrap}>
                  <Text style={styles.withdrawCurrencySign}>$</Text>
                  <TextInput
                    style={styles.withdrawAmountInputField}
                    value={withdrawAmount}
                    onChangeText={setWithdrawAmount}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#555"
                  />
                </View>

                {/* Quick Amount Buttons */}
                <View style={styles.withdrawQuickRow}>
                  {['50', '100', '250', '500', 'MAX'].map((amt) => (
                    <TouchableOpacity
                      key={amt}
                      style={[
                        styles.withdrawQuickBtnNew,
                        withdrawAmount === (amt === 'MAX' ? String(user?.withdrawable_balance || 0) : amt) && styles.withdrawQuickBtnNewActive
                      ]}
                      onPress={() => {
                        if (amt === 'MAX') {
                          setWithdrawAmount(String(user?.withdrawable_balance || user?.real_balance || 0));
                        } else {
                          setWithdrawAmount(amt);
                        }
                      }}
                    >
                      <Text style={[
                        styles.withdrawQuickBtnNewText,
                        withdrawAmount === (amt === 'MAX' ? String(user?.withdrawable_balance || 0) : amt) && styles.withdrawQuickBtnNewTextActive
                      ]}>
                        {amt === 'MAX' ? 'MAX' : `$${amt}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Payment Method Card */}
              <View style={styles.withdrawFormCard}>
                <Text style={styles.withdrawFormLabel}>Payment Method</Text>
                <View style={styles.withdrawPaymentCard}>
                  <View style={styles.withdrawPaymentIcon}>
                    <Text style={styles.withdrawUsdtSymbol}>₮</Text>
                  </View>
                  <View style={styles.withdrawPaymentInfo}>
                    <Text style={styles.withdrawPaymentTitle}>USDT TRC20</Text>
                    <Text style={styles.withdrawPaymentSubtitle}>Tether on TRON Network</Text>
                  </View>
                  <View style={styles.withdrawPaymentCheck}>
                    <Ionicons name="checkmark-circle" size={24} color="#00E55A" />
                  </View>
                </View>
              </View>

              {/* Wallet Address Card */}
              <View style={styles.withdrawFormCard}>
                <Text style={styles.withdrawFormLabel}>USDT TRC20 Wallet Address</Text>
                <View style={styles.withdrawAddressInputWrap}>
                  <Ionicons name="wallet-outline" size={20} color="#888" style={{ marginRight: 12 }} />
                  <TextInput
                    style={styles.withdrawAddressInputField}
                    placeholder="Enter your TRC20 address (starts with T)"
                    placeholderTextColor="#555"
                    value={withdrawAddress}
                    onChangeText={setWithdrawAddress}
                    autoCapitalize="none"
                  />
                </View>
                <Text style={styles.withdrawAddressNote}>
                  <Ionicons name="information-circle-outline" size={14} color="#888" /> Double-check your address. Wrong address = lost funds.
                </Text>
              </View>

              {/* Fee Summary */}
              <View style={styles.withdrawSummaryCard}>
                <View style={styles.withdrawSummaryRow}>
                  <Text style={styles.withdrawSummaryLabel}>Network Fee</Text>
                  <Text style={styles.withdrawSummaryValue}>$1.00</Text>
                </View>
                <View style={styles.withdrawSummaryDivider} />
                <View style={styles.withdrawSummaryRow}>
                  <Text style={styles.withdrawSummaryLabel}>You'll Receive</Text>
                  <Text style={styles.withdrawSummaryValueBig}>
                    ${Math.max(0, (parseFloat(withdrawAmount) || 0) - 1).toFixed(2)} USDT
                  </Text>
                </View>
              </View>

              {/* Warning Box */}
              <View style={styles.withdrawWarningBox}>
                <Ionicons name="time-outline" size={18} color="#FFB800" />
                <Text style={styles.withdrawWarningText}>
                  Processing time: 1-24 hours. Large withdrawals may require additional verification.
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.withdrawSubmitBtnNew,
                  (!withdrawAmount || !withdrawAddress || parseFloat(withdrawAmount) < 10 || isProcessingWithdraw) && styles.withdrawSubmitBtnDisabled
                ]}
                onPress={() => {
                  const amount = parseFloat(withdrawAmount);
                  const withdrawable = user?.withdrawable_balance || user?.real_balance || 0;
                  
                  if (amount < 10) {
                    Alert.alert('Invalid Amount', 'Minimum withdrawal is $10');
                    return;
                  }
                  if (!withdrawAddress || withdrawAddress.length < 20 || !withdrawAddress.startsWith('T')) {
                    Alert.alert('Invalid Address', 'Please enter a valid TRC20 wallet address (starts with T)');
                    return;
                  }
                  if (amount > withdrawable) {
                    Alert.alert('Insufficient Balance', `You can only withdraw up to $${withdrawable.toFixed(2)}`);
                    return;
                  }
                  
                  setIsProcessingWithdraw(true);
                  
                  (async () => {
                    try {
                      const response = await fetch(`${API_URL}/wallet/withdraw`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          amount: amount,
                          crypto_address: withdrawAddress
                        })
                      });
                      
                      const data = await response.json();
                      
                      if (response.ok) {
                        setShowWithdrawModal(false);
                        setWithdrawAmount('');
                        setWithdrawAddress('');
                        
                        const { refreshUser } = useAuthStore.getState();
                        if (refreshUser) refreshUser();
                        fetchTransactions();
                        
                        Alert.alert(
                          'Withdrawal Submitted!',
                          `Amount: $${amount.toFixed(2)}\nYou'll receive: $${(amount - 1).toFixed(2)} USDT\n\nTransaction ID: ${data.transaction_id}\n\nCheck your transaction history for status updates.`,
                          [{ text: 'OK' }]
                        );
                      } else {
                        Alert.alert('Withdrawal Failed', data.detail || 'Unable to process withdrawal');
                      }
                    } catch (error) {
                      console.error('Withdrawal error:', error);
                      Alert.alert('Error', 'Failed to submit withdrawal request. Please try again.');
                    } finally {
                      setIsProcessingWithdraw(false);
                    }
                  })();
                }}
                disabled={!withdrawAmount || !withdrawAddress || parseFloat(withdrawAmount) < 10 || isProcessingWithdraw || hasLockedWithdrawal}
              >
                {isProcessingWithdraw ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="arrow-up-circle" size={22} color="#FFFFFF" />
                    <Text style={styles.withdrawSubmitBtnText}>Withdraw Now</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* KYC Document Upload Modal */}
      <Modal visible={showKycUploadModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload KYC Document</Text>
              <TouchableOpacity onPress={() => {
                setShowKycUploadModal(false);
                setKycUploadImage(null);
                setSelectedLockedTx(null);
              }}>
                <Ionicons name="close-circle" size={28} color="#FF3B3B" />
              </TouchableOpacity>
            </View>
            
            {selectedLockedTx && (
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.modalSubtitle, { color: '#8B5CF6', fontWeight: '600' }]}>
                  Required: {selectedLockedTx.kyc_requirement || 'Bank Statement'}
                </Text>
                <Text style={[styles.modalSubtitle, { fontSize: 12, marginTop: 4 }]}>
                  For withdrawal of ${selectedLockedTx.amount?.toFixed(2)}
                </Text>
              </View>
            )}
            
            {/* Upload Area */}
            <TouchableOpacity 
              style={[styles.kycUploadArea, kycUploadImage && { borderColor: '#00E55A' }]}
              onPress={pickKycDocument}
            >
              {kycUploadImage ? (
                <Image 
                  source={{ uri: kycUploadImage }} 
                  style={{ width: '100%', height: 200, borderRadius: 12 }}
                  resizeMode="contain"
                />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={48} color="#8B5CF6" />
                  <Text style={styles.kycUploadAreaText}>Tap to select document image</Text>
                  <Text style={[styles.kycUploadAreaText, { fontSize: 11, color: '#666' }]}>
                    Supported: JPG, PNG
                  </Text>
                </>
              )}
            </TouchableOpacity>
            
            {kycUploadImage && (
              <TouchableOpacity 
                style={{ alignItems: 'center', marginTop: 8 }}
                onPress={() => setKycUploadImage(null)}
              >
                <Text style={{ color: '#FF3B3B', fontSize: 12 }}>Remove & Choose Different</Text>
              </TouchableOpacity>
            )}
            
            {/* Submit Button */}
            <TouchableOpacity 
              style={[
                styles.saveBtn, 
                { backgroundColor: kycUploadImage ? '#8B5CF6' : '#444', marginTop: 20 }
              ]}
              onPress={uploadKycDocument}
              disabled={!kycUploadImage || isUploadingKyc}
            >
              {isUploadingKyc ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Submit Document</Text>
              )}
            </TouchableOpacity>
            
            <Text style={{ color: '#888', fontSize: 11, textAlign: 'center', marginTop: 12 }}>
              Your document will be reviewed by admin within 24 hours
            </Text>
          </View>
        </View>
      </Modal>

      {/* Nickname Modal */}
      <Modal visible={showNicknameModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Nickname</Text>
              <TouchableOpacity onPress={() => setShowNicknameModal(false)}>
                <Ionicons name="close-circle" size={28} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>This name will be displayed on the leaderboard</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter nickname"
              placeholderTextColor="#666"
              value={nickname}
              onChangeText={setNickname}
              maxLength={20}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveNickname}>
              <Text style={styles.saveBtnText}>Save Nickname</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Country Select Modal */}
      <Modal visible={showCountrySelectModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '70%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountrySelectModal(false)}>
                <Ionicons name="close-circle" size={28} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>This will be shown on the leaderboard</Text>
            <ScrollView style={styles.countryList}>
              {COUNTRIES_WITH_FLAGS.map((country) => (
                <TouchableOpacity
                  key={country.name}
                  style={[
                    styles.countryItem,
                    userData.country === country.name && styles.countryItemSelected
                  ]}
                  onPress={() => saveCountry(country.name, country.flag)}
                >
                  <Text style={styles.countryFlag}>{country.flag}</Text>
                  <Text style={styles.countryName}>{country.name}</Text>
                  {userData.country === country.name && (
                    <Ionicons name="checkmark-circle" size={20} color="#00E55A" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Personal Info Modal */}
      <Modal visible={showPersonalInfoModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Personal Info</Text>
              <TouchableOpacity onPress={() => setShowPersonalInfoModal(false)}>
                <Ionicons name="close-circle" size={28} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Update your profile information</Text>
            <ScrollView style={styles.modalScroll}>
              <EditableField label="Full Name" value={userData.fullName} />
              <EditableField label="Phone" value={userData.phone} />
              <EditableField label="Country" value={userData.country} />
              <EditableField label="Address" value={userData.address} />
              <EditableField label="Date of Birth" value={userData.dateOfBirth} />
            </ScrollView>
            <TouchableOpacity 
              style={styles.saveBtn} 
              onPress={() => {
                setShowPersonalInfoModal(false);
                Alert.alert('Success', 'Profile updated successfully!');
              }}
            >
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Password Change Modal */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => {
                setShowPasswordModal(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
              }}>
                <Ionicons name="close-circle" size={28} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Enter your current and new password</Text>
            
            <View style={styles.passwordInputContainer}>
              <Ionicons name="lock-closed-outline" size={18} color="#00E55A" />
              <TextInput
                style={styles.passwordInput}
                placeholder="Current Password"
                placeholderTextColor="#666"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.passwordInputContainer}>
              <Ionicons name="key-outline" size={18} color="#00E55A" />
              <TextInput
                style={styles.passwordInput}
                placeholder="New Password"
                placeholderTextColor="#666"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.passwordInputContainer}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#00E55A" />
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm New Password"
                placeholderTextColor="#666"
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity 
              style={styles.saveBtn} 
              onPress={handleChangePassword}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <ActivityIndicator color="#0A1A0F" />
              ) : (
                <Text style={styles.saveBtnText}>Change Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2FA Modal */}
      <Modal visible={show2FAModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{is2FAEnabled ? 'Disable 2FA' : 'Enable 2FA'}</Text>
              <TouchableOpacity onPress={() => setShow2FAModal(false)}>
                <Ionicons name="close-circle" size={28} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.twoFAInfo}>
              <Ionicons name="shield-checkmark" size={48} color="#FFB800" />
              <Text style={styles.twoFATitle}>Two-Factor Authentication</Text>
              <Text style={styles.twoFADescription}>
                {is2FAEnabled 
                  ? 'Disabling 2FA will make your account less secure. Are you sure you want to continue?'
                  : 'Add an extra layer of security to your account by enabling two-factor authentication.'}
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.saveBtn, is2FAEnabled && styles.disableBtn]} 
              onPress={handleToggle2FA}
            >
              <Text style={styles.saveBtnText}>{is2FAEnabled ? 'Disable 2FA' : 'Enable 2FA'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={() => setShow2FAModal(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Helper Components
const InfoRow = ({ icon, label, value, iconColor = '#00E55A', showEdit = false }: { icon: string; label: string; value: string; iconColor?: string; showEdit?: boolean }) => (
  <View style={styles.infoRow}>
    <View style={[styles.infoIcon, { backgroundColor: iconColor + '20' }]}>
      <Ionicons name={icon as any} size={16} color={iconColor} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
    {showEdit ? (
      <Ionicons name="create-outline" size={16} color="#00E55A" />
    ) : (
      <Ionicons name="chevron-forward" size={16} color="#444" />
    )}
  </View>
);

const EditableField = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.editableField}>
    <Text style={styles.editableLabel}>{label}</Text>
    <TextInput
      style={styles.editableInput}
      defaultValue={value === '-' ? '' : value}
      placeholder={`Enter ${label.toLowerCase()}`}
      placeholderTextColor="#666"
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1A0F',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 45,
    paddingBottom: 8,
    backgroundColor: 'rgba(15, 20, 40, 0.95)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 59, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 59, 0.3)',
  },
  signOutText: {
    color: '#FF3B3B',
    fontSize: 10,
    fontWeight: '600',
  },
  tabsContainer: {
    backgroundColor: 'rgba(15, 20, 40, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabsContent: {
    paddingHorizontal: 8,
    gap: 2,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#00E55A',
  },
  tabText: {
    color: '#666',
    fontSize: 11,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#00E55A',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 10,
    paddingBottom: 80,
  },
  verificationBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.3)',
  },
  verificationIcon: {
    marginRight: 8,
  },
  verificationContent: {
    flex: 1,
  },
  verificationTitle: {
    color: '#FFB800',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 1,
  },
  verificationSubtitle: {
    color: '#999',
    fontSize: 10,
    marginBottom: 6,
  },
  sendCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFB800',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 4,
  },
  sendCodeText: {
    color: '#0A1A0F',
    fontSize: 11,
    fontWeight: '700',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 10,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFB800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0A1A0F',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#666',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0A1A0F',
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  tierText: {
    fontSize: 9,
    fontWeight: '700',
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userEmail: {
    color: '#999',
    fontSize: 10,
  },
  unverifiedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF3B3B',
    marginLeft: 3,
  },
  kycBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 191, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 6,
    gap: 3,
  },
  kycBadgeText: {
    color: '#00BFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  userId: {
    color: '#666',
    fontSize: 10,
    marginTop: 2,
  },
  tierProgress: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tierLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tierLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  progressBar: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2.5,
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00E55A',
    borderRadius: 2.5,
  },
  progressText: {
    color: '#666',
    fontSize: 9,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  statCard: {
    width: '48.5%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  statLabel: {
    color: '#666',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  leaderboardTag: {
    backgroundColor: 'rgba(0, 229, 90, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  leaderboardTagText: {
    color: '#00E55A',
    fontSize: 8,
    fontWeight: '600',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
  },
  editBtnText: {
    color: '#00E55A',
    fontSize: 10,
    fontWeight: '600',
  },
  sectionValue: {
    color: '#666',
    fontSize: 11,
  },
  secureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  secureDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#00E55A',
  },
  secureText: {
    color: '#00E55A',
    fontSize: 9,
    fontWeight: '600',
  },
  infoList: {
    gap: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: '#666',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  comingSoon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  comingSoonTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  comingSoonText: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0A1A0F',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 14,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#666',
    fontSize: 11,
    marginBottom: 12,
  },
  countryList: {
    maxHeight: 300,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  countryItemSelected: {
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
    borderRadius: 6,
  },
  countryFlag: {
    fontSize: 18,
    marginRight: 10,
  },
  countryName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 10,
    color: '#FFFFFF',
    fontSize: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalScroll: {
    maxHeight: 250,
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: '#00E55A',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  editableField: {
    marginBottom: 10,
  },
  editableLabel: {
    color: '#666',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  editableInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 10,
    color: '#FFFFFF',
    fontSize: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  // Security Tab Styles
  securityHeader: {
    marginBottom: 12,
  },
  securityTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  securitySubtitle: {
    color: '#666',
    fontSize: 10,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  securityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  securityInfo: {
    flex: 1,
  },
  securityLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  securityLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 8,
    fontWeight: '700',
  },
  securityDetail: {
    color: '#666',
    fontSize: 10,
  },
  securityBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FFB800',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  securityBtnText: {
    color: '#FFB800',
    fontSize: 10,
    fontWeight: '700',
  },
  sessionTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDevice: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 1,
  },
  sessionDetail: {
    color: '#666',
    fontSize: 10,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00E55A',
  },
  // KYC Tab Styles
  kycHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  kycTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  kycSubtitle: {
    color: '#666',
    fontSize: 10,
  },
  kycSteps: {
    marginBottom: 10,
  },
  stepsScroll: {
    paddingHorizontal: 2,
    gap: 6,
  },
  stepItem: {
    alignItems: 'center',
    width: 60,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  stepCircleActive: {
    backgroundColor: '#FFB800',
    borderColor: '#FFB800',
  },
  stepCircleCompleted: {
    backgroundColor: '#00E55A',
    borderColor: '#00E55A',
  },
  stepTitle: {
    color: '#666',
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  stepTitleActive: {
    color: '#FFB800',
  },
  stepTitleCompleted: {
    color: '#00E55A',
  },
  stepLine: {
    position: 'absolute',
    left: -15,
    top: 16,
    width: 15,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  stepLineActive: {
    backgroundColor: '#FFB800',
  },
  stepLineCompleted: {
    backgroundColor: '#00E55A',
  },
  stepSubtitle: {
    color: '#444',
    fontSize: 7,
    textAlign: 'center',
  },
  kycFormCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  kycFormHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 10,
  },
  kycFormIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFB800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kycFormTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  kycFormSubtitle: {
    color: '#666',
    fontSize: 10,
    flexShrink: 1,
  },
  kycField: {
    marginBottom: 12,
  },
  kycFieldLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  kycFieldLabelText: {
    color: '#888',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  kycInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  kycSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  kycSelectText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  kycSelectPlaceholder: {
    color: '#666',
  },
  kycNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(155, 89, 182, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  kycNoticeText: {
    color: '#999',
    fontSize: 10,
    flex: 1,
    lineHeight: 15,
  },
  kycContinueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFB800',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
  },
  kycContinueBtnText: {
    color: '#0A1A0F',
    fontSize: 12,
    fontWeight: '700',
  },
  uploadArea: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderStyle: 'dashed',
    paddingVertical: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadText: {
    color: '#666',
    fontSize: 11,
  },
  pickerList: {
    maxHeight: 250,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  pickerItemText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  // Activity Tab Styles
  activitySubTabs: {
    flexDirection: 'row',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  activitySubTab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 6,
  },
  activitySubTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#FFB800',
  },
  activitySubTabText: {
    color: '#666',
    fontSize: 11,
    fontWeight: '600',
  },
  activitySubTabTextActive: {
    color: '#FFB800',
  },
  activityList: {
    gap: 6,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 229, 90, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  activityInfo: {
    flex: 1,
  },
  activityDevice: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 1,
  },
  activityDetail: {
    color: '#666',
    fontSize: 10,
  },
  activityDate: {
    color: '#888',
    fontSize: 9,
  },
  // Settings Tab Styles
  settingsSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingsSectionTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  settingsSectionSubtitle: {
    color: '#666',
    fontSize: 10,
    marginBottom: 12,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  settingsInfo: {
    flex: 1,
  },
  settingsLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 1,
  },
  settingsDetail: {
    color: '#666',
    fontSize: 10,
  },
  toggleBtn: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleBtnActive: {
    backgroundColor: '#FFB800',
  },
  toggleCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#666',
  },
  toggleCircleActive: {
    backgroundColor: '#0A1A0F',
    alignSelf: 'flex-end',
  },
  dangerZone: {
    backgroundColor: 'rgba(255, 59, 59, 0.05)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 59, 0.2)',
  },
  dangerZoneTitle: {
    color: '#FF3B3B',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  dangerZoneSubtitle: {
    color: '#888',
    fontSize: 10,
    marginBottom: 12,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF3B3B',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  deleteBtnText: {
    color: '#FF3B3B',
    fontSize: 11,
    fontWeight: '700',
  },
  reviewStatusCard: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    borderRadius: 10,
    marginBottom: 14,
  },
  reviewTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  reviewText: {
    color: '#AAA',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 6,
  },
  reviewChecklist: {
    gap: 8,
  },
  reviewCheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 10,
    borderRadius: 8,
  },
  reviewCheckText: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  uploadAreaWithImage: {
    padding: 0,
    overflow: 'hidden',
  },
  uploadedImage: {
    width: '100%',
    height: 140,
    borderRadius: 10,
  },
  uploadedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  uploadedText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
  },
  kycContinueBtnDisabled: {
    opacity: 0.5,
  },
  countdownContainer: {
    marginTop: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 90, 0.2)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
  },
  countdownLabel: {
    color: '#AAAAAA',
    fontSize: 12,
    marginBottom: 8,
  },
  countdownTimer: {
    color: '#00E55A',
    fontSize: 36,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  aiResultBox: {
    marginTop: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 10,
    width: '100%',
  },
  aiResultLabel: {
    color: '#888',
    fontSize: 11,
    marginTop: 8,
  },
  aiResultValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Password Change Modal Styles
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 90, 0.05)',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 90, 0.2)',
    gap: 10,
  },
  passwordInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 14,
  },
  // 2FA Modal Styles
  twoFAInfo: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  twoFATitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  twoFADescription: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  disableBtn: {
    backgroundColor: '#FF3B3B',
  },
  // Finance Tab Styles
  financeBalanceCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  financeBalanceCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  financeBalanceLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  financeBalanceValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  financeSubTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  financeSubTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  financeSubTabActive: {
    backgroundColor: 'rgba(0, 229, 90, 0.15)',
  },
  financeSubTabText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
  },
  financeSubTabTextActive: {
    color: '#00E55A',
  },
  financeSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  financeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  financeSectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  financeSummaryRow: {
    gap: 12,
    marginBottom: 16,
  },
  financeSummaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  financeSummaryIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  financeSummaryInfo: {
    flex: 1,
  },
  financeSummaryLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  financeSummaryAmount: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  financeSummaryCount: {
    color: '#666',
    fontSize: 11,
  },
  financeQuickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  financeQuickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  financeQuickBtnText: {
    color: '#0A0A0A',
    fontSize: 14,
    fontWeight: '700',
  },
  financeHistoryHeader: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  financeHistoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  financeHistoryTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  financeHistorySubtitle: {
    color: '#666',
    fontSize: 12,
  },
  financeInputLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  financeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  financeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E55A',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 20,
    gap: 8,
  },
  financeBtnText: {
    color: '#0A0A0A',
    fontSize: 15,
    fontWeight: '700',
  },
  cryptoOptions: {
    marginBottom: 8,
  },
  cryptoOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 14,
    marginRight: 10,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cryptoOptionActive: {
    backgroundColor: 'rgba(0, 229, 90, 0.15)',
    borderColor: '#00E55A',
  },
  cryptoIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  cryptoName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  cryptoNetwork: {
    color: '#666',
    fontSize: 10,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  quickAmount: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickAmountActive: {
    backgroundColor: '#00E55A',
    borderColor: '#00E55A',
  },
  quickAmountText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  bonusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    gap: 10,
  },
  bonusText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  availableBalance: {
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  availableBalanceLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  availableBalanceValue: {
    color: '#00E55A',
    fontSize: 28,
    fontWeight: '800',
  },
  withdrawInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  withdrawInfoText: {
    color: '#888',
    fontSize: 11,
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTransactionsText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyTransactionsSubtext: {
    color: '#444',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionType: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  transactionDate: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  transactionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  transactionStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  // New Transaction Table Styles
  txTableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  txTableHeaderText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  txLeftCol: {
    flex: 1,
  },
  txRightCol: {
    alignItems: 'flex-end',
  },
  txId: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  txDateTime: {
    color: '#888',
    fontSize: 13,
    marginBottom: 4,
  },
  txStatus: {
    fontSize: 13,
    fontWeight: '600',
  },
  txStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 5,
    alignSelf: 'flex-start',
  },
  txStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  txStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  txMethod: {
    color: '#888',
    fontSize: 13,
    marginBottom: 2,
  },
  txType: {
    color: '#888',
    fontSize: 13,
  },
  // Deposit Bonus Button
  depositBonusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: '#E6C200',
  },
  depositBonusBtnText: {
    color: '#0A0A0A',
    fontSize: 15,
    fontWeight: '800',
  },
  // Deposit Modal Styles
  depositModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  depositModalContent: {
    backgroundColor: '#0F1428',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  depositModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  depositModalTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  depositLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 10,
    marginTop: 16,
  },
  depositAmountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D2818',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 90, 0.3)',
  },
  depositAmountPrefix: {
    color: '#00E55A',
    fontSize: 28,
    fontWeight: '700',
    marginRight: 8,
  },
  depositAmountInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    padding: 0,
  },
  depositMinimum: {
    color: '#666',
    fontSize: 12,
    marginTop: 8,
  },
  depositQuickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  depositQuickBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'transparent',
  },
  depositQuickBtnActive: {
    backgroundColor: '#0D2818',
    borderColor: '#00E55A',
  },
  depositQuickBtnText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  depositQuickBtnTextActive: {
    color: '#00E55A',
  },
  depositNetworkSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  depositNetworkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  depositNetworkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  depositNetworkDropdown: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  depositNetworkOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  depositNetworkOptionActive: {
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
  },
  depositNetworkOptionText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  depositNoFees: {
    color: '#00E55A',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
  },
  depositPromoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  depositPromoInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  depositPromoQuickBtn: {
    backgroundColor: '#00E55A',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
  },
  depositPromoQuickText: {
    color: '#0A0A0A',
    fontSize: 14,
    fontWeight: '700',
  },
  depositPromoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(100, 100, 100, 0.3)',
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
    gap: 12,
  },
  depositPromoInfoText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  depositGenerateBtn: {
    backgroundColor: '#00E55A',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 24,
  },
  depositGenerateBtnText: {
    color: '#0A0A0A',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelBtnText: {
    color: '#888',
    fontSize: 14,
  },
  // Withdraw Modal Styles
  withdrawModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  withdrawModalContent: {
    backgroundColor: '#0A0F1C',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingBottom: 40,
    maxHeight: '95%',
  },
  withdrawModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  withdrawBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  withdrawModalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  withdrawScrollView: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  withdrawBalanceCardNew: {
    backgroundColor: 'linear-gradient(135deg, rgba(0,229,90,0.15) 0%, rgba(0,229,90,0.05) 100%)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,229,90,0.25)',
  },
  withdrawBalanceIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,229,90,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  withdrawBalanceLabelNew: {
    color: '#888',
    fontSize: 14,
    marginBottom: 6,
  },
  withdrawBalanceValueNew: {
    color: '#00E55A',
    fontSize: 36,
    fontWeight: '800',
  },
  withdrawMinText: {
    color: '#666',
    fontSize: 12,
    marginTop: 8,
  },
  withdrawBonusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,184,0,0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.25)',
  },
  withdrawBonusText: {
    color: '#FFB800',
    fontSize: 13,
    marginLeft: 10,
    flex: 1,
  },
  withdrawFormCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  withdrawFormLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 14,
  },
  withdrawAmountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  withdrawCurrencySign: {
    color: '#00E55A',
    fontSize: 28,
    fontWeight: '700',
    marginRight: 10,
  },
  withdrawAmountInputField: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    paddingVertical: 16,
  },
  withdrawQuickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  withdrawQuickBtnNew: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  withdrawQuickBtnNewActive: {
    backgroundColor: 'rgba(0,229,90,0.15)',
    borderColor: '#00E55A',
  },
  withdrawQuickBtnNewText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  withdrawQuickBtnNewTextActive: {
    color: '#00E55A',
  },
  withdrawPaymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,229,90,0.08)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,229,90,0.2)',
  },
  withdrawPaymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#26A17B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  withdrawUsdtSymbol: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  withdrawPaymentInfo: {
    flex: 1,
    marginLeft: 14,
  },
  withdrawPaymentTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  withdrawPaymentSubtitle: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  withdrawPaymentCheck: {
    marginLeft: 10,
  },
  withdrawAddressInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  withdrawAddressInputField: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  withdrawAddressNote: {
    color: '#888',
    fontSize: 12,
    marginTop: 10,
    lineHeight: 18,
  },
  withdrawSummaryCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  withdrawSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  withdrawSummaryLabel: {
    color: '#888',
    fontSize: 14,
  },
  withdrawSummaryValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  withdrawSummaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 14,
  },
  withdrawSummaryValueBig: {
    color: '#00E55A',
    fontSize: 18,
    fontWeight: '700',
  },
  withdrawWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,184,0,0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.2)',
  },
  withdrawWarningText: {
    color: '#FFB800',
    fontSize: 12,
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
  },
  withdrawSubmitBtnNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E55A',
    borderRadius: 16,
    paddingVertical: 18,
    marginBottom: 20,
  },
  withdrawSubmitBtnDisabled: {
    opacity: 0.4,
  },
  withdrawSubmitBtnText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 10,
  },
  withdrawReceiveValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  withdrawInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 14,
    marginTop: 20,
    gap: 10,
  },
  withdrawInfoBoxText: {
    color: '#888',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  withdrawRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B3B',
    borderRadius: 12,
    paddingVertical: 18,
    marginTop: 24,
    gap: 10,
  },
  withdrawRequestBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // New Withdraw Modal Styles (Reference Design)
  withdrawSectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  withdrawAccountRow: {
    paddingVertical: 12,
  },
  withdrawAccountLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 6,
  },
  withdrawAccountValue: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
  },
  withdrawAccountValueBold: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
  },
  withdrawDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 8,
  },
  withdrawBonusWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 10,
  },
  withdrawBonusWarningText: {
    color: '#FFB800',
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  withdrawInputGroup: {
    marginTop: 16,
  },
  withdrawInputLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
  },
  withdrawAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  withdrawAmountInputNew: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    padding: 16,
  },
  withdrawAmountCurrency: {
    color: '#888',
    fontSize: 14,
    paddingRight: 16,
  },
  withdrawPaymentSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  withdrawPaymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  withdrawUsdtIcon: {
    fontSize: 20,
    color: '#26A17B',
  },
  withdrawPaymentText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  withdrawPurseInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  withdrawNetworkSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  withdrawNetworkText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  withdrawConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A3FF',
    borderRadius: 10,
    paddingVertical: 18,
    marginTop: 24,
    gap: 10,
  },
  withdrawConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Chart Picture Styles
  chartPictureContainer: {
    marginVertical: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chartPicturePreview: {
    width: '100%',
    height: 150,
    backgroundColor: '#0A0A0A',
  },
  chartPicturePlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  chartPicturePlaceholderText: {
    color: '#666',
    fontSize: 13,
  },
  chartPictureUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E55A',
    borderRadius: 10,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 10,
  },
  chartPictureUploadBtnText: {
    color: '#0A0A0A',
    fontSize: 14,
    fontWeight: '700',
  },
  chartPictureRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 59, 59, 0.15)',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 59, 0.3)',
  },
  chartPictureRemoveBtnText: {
    color: '#FF3B3B',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // KYC Upload Styles
  kycUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    gap: 4,
  },
  kycUploadBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  kycUploadArea: {
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    minHeight: 180,
  },
  kycUploadAreaText: {
    color: '#888',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});
