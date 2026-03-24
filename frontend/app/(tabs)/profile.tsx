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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { API_URL } from '../../utils/api';
import * as ImagePicker from 'expo-image-picker';
import AnimatedLoader from '../../components/AnimatedLoader';

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
  const [kycCountdown, setKycCountdown] = useState<number | null>(null);
  
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
        router.replace('/');
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
              router.replace('/');
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

    const KYC_STEPS = [
      { id: 1, title: 'Personal Info', subtitle: 'Basic details', icon: 'card' },
      { id: 2, title: 'Document', subtitle: 'ID upload', icon: 'document' },
      { id: 3, title: 'Verified', subtitle: 'Complete', icon: 'checkmark-circle' },
    ];

    const handleContinueToStep2 = () => {
      // Validate step 1 fields
      if (!kycData.fullName || !kycData.nationality || !kycData.idType || !kycData.idNumber) {
        Alert.alert('Missing Information', 'Please fill in all required fields.');
        return;
      }
      setKycStep(2);
    };

    const getStepStatus = (stepId: number) => {
      if (stepId < kycStep) return 'completed';
      if (stepId === kycStep) return 'active';
      return 'pending';
    };

    return (
      <>
        {/* Identity Verification Header */}
        <View style={styles.kycHeader}>
          <Text style={styles.kycTitle}>Identity Verification</Text>
          <Text style={styles.kycSubtitle}>Complete all steps to unlock full access</Text>
        </View>

        {/* Progress Steps */}
        <View style={styles.kycSteps}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepsScroll}>
            {KYC_STEPS.map((step, index) => {
              const status = getStepStatus(step.id);
              return (
                <View key={step.id} style={styles.stepItem}>
                  {/* Connection Line */}
                  {index > 0 && (
                    <View style={[
                      styles.stepLine,
                      status !== 'pending' && styles.stepLineActive,
                      getStepStatus(step.id - 1) === 'completed' && styles.stepLineCompleted,
                    ]} />
                  )}
                  <View style={[
                    styles.stepCircle,
                    status === 'active' && styles.stepCircleActive,
                    status === 'completed' && styles.stepCircleCompleted,
                  ]}>
                    {status === 'completed' ? (
                      <Ionicons name="checkmark" size={18} color="#0A1A0F" />
                    ) : (
                      <Ionicons name={step.icon as any} size={18} color={status === 'active' ? '#0A1A0F' : '#666'} />
                    )}
                  </View>
                  <Text style={[
                    styles.stepTitle, 
                    status === 'active' && styles.stepTitleActive,
                    status === 'completed' && styles.stepTitleCompleted,
                  ]}>
                    {step.title}
                  </Text>
                  <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Step 1: Personal Information Form */}
        {kycStep === 1 && (
          <View style={styles.kycFormCard}>
            <View style={styles.kycFormHeader}>
              <View style={styles.kycFormIcon}>
                <Ionicons name="card" size={18} color="#0A1A0F" />
              </View>
              <View>
                <Text style={styles.kycFormTitle}>Step 1: Personal Information</Text>
                <Text style={styles.kycFormSubtitle}>Enter your details exactly as they appear on your ID</Text>
              </View>
            </View>

            {/* Full Name */}
            <View style={styles.kycField}>
              <View style={styles.kycFieldLabel}>
                <Ionicons name="person" size={14} color="#FFB800" />
                <Text style={styles.kycFieldLabelText}>FULL NAME (AS ON ID)</Text>
              </View>
              <TextInput
                style={styles.kycInput}
                placeholder="e.g. John Michael Smith"
                placeholderTextColor="#666"
                value={kycData.fullName}
                onChangeText={(text) => setKycData(prev => ({ ...prev, fullName: text }))}
              />
            </View>

            {/* Nationality/Country */}
            <View style={styles.kycField}>
              <View style={styles.kycFieldLabel}>
                <Ionicons name="globe" size={14} color="#FFB800" />
                <Text style={styles.kycFieldLabelText}>NATIONALITY / COUNTRY</Text>
              </View>
              <TouchableOpacity 
                style={styles.kycSelect}
                onPress={() => setShowCountryPicker(true)}
              >
                <Text style={[styles.kycSelectText, !kycData.nationality && styles.kycSelectPlaceholder]}>
                  {kycData.nationality || 'Search country...'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Date of Birth */}
            <View style={styles.kycField}>
              <View style={styles.kycFieldLabel}>
                <Ionicons name="calendar" size={14} color="#FFB800" />
                <Text style={styles.kycFieldLabelText}>DATE OF BIRTH</Text>
              </View>
              <TextInput
                style={styles.kycInput}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#666"
                value={kycData.dateOfBirth}
                onChangeText={(text) => setKycData(prev => ({ ...prev, dateOfBirth: text }))}
              />
            </View>

            {/* ID Document Type */}
            <View style={styles.kycField}>
              <View style={styles.kycFieldLabel}>
                <Ionicons name="card" size={14} color="#FFB800" />
                <Text style={styles.kycFieldLabelText}>ID DOCUMENT TYPE</Text>
              </View>
              <TouchableOpacity 
                style={styles.kycSelect}
                onPress={() => setShowIdTypePicker(true)}
              >
                <Text style={[styles.kycSelectText, !kycData.idType && styles.kycSelectPlaceholder]}>
                  {kycData.idType || 'Select ID type...'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#666" />
              </TouchableOpacity>
            </View>

            {/* ID Number */}
            <View style={styles.kycField}>
              <View style={styles.kycFieldLabel}>
                <Ionicons name="keypad" size={14} color="#FFB800" />
                <Text style={styles.kycFieldLabelText}>ID NUMBER</Text>
              </View>
              <TextInput
                style={styles.kycInput}
                placeholder="Enter your ID number"
                placeholderTextColor="#666"
                value={kycData.idNumber}
                onChangeText={(text) => setKycData(prev => ({ ...prev, idNumber: text }))}
              />
            </View>

            {/* Security Notice */}
            <View style={styles.kycNotice}>
              <Ionicons name="shield-checkmark" size={18} color="#9B59B6" />
              <Text style={styles.kycNoticeText}>
                Your information is encrypted and securely stored. We only use it for identity verification purposes.
              </Text>
            </View>

            {/* Continue Button */}
            <TouchableOpacity 
              style={styles.kycContinueBtn}
              onPress={handleContinueToStep2}
            >
              <Ionicons name="arrow-forward" size={18} color="#0A1A0F" />
              <Text style={styles.kycContinueBtnText}>Continue to Document Upload</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Document Upload */}
        {kycStep === 2 && (
          <View style={styles.kycFormCard}>
            <View style={styles.kycFormHeader}>
              <View style={styles.kycFormIcon}>
                <Ionicons name="document" size={18} color="#0A1A0F" />
              </View>
              <View>
                <Text style={styles.kycFormTitle}>Step 2: Upload Government ID</Text>
                <Text style={styles.kycFormSubtitle}>{kycData.idType || 'National ID'} — Front & Back</Text>
              </View>
            </View>

            {/* AI Verification Notice */}
            <View style={[styles.kycNotice, { backgroundColor: 'rgba(0, 229, 90, 0.1)', borderColor: 'rgba(0, 229, 90, 0.3)' }]}>
              <Ionicons name="sparkles" size={18} color="#00E55A" />
              <Text style={[styles.kycNoticeText, { color: '#00E55A' }]}>
                AI-Powered Verification: Your documents will be verified instantly by AI. If approved, your account will be verified in 5 minutes!
              </Text>
            </View>

            {/* Front Side Upload */}
            <View style={styles.kycField}>
              <View style={styles.kycFieldLabel}>
                <Ionicons name="card" size={14} color="#FFB800" />
                <Text style={styles.kycFieldLabelText}>FRONT SIDE *</Text>
              </View>
              <TouchableOpacity 
                style={[styles.uploadArea, frontImage && styles.uploadAreaWithImage]}
                onPress={() => pickImage('front')}
              >
                {frontImage ? (
                  <>
                    <Image 
                      source={{ uri: `data:image/jpeg;base64,${frontImage}` }}
                      style={styles.uploadedImage}
                      resizeMode="cover"
                    />
                    <View style={styles.uploadedOverlay}>
                      <Ionicons name="checkmark-circle" size={32} color="#00E55A" />
                      <Text style={styles.uploadedText}>Tap to change</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.uploadIconWrapper}>
                      <Ionicons name="camera" size={28} color="#666" />
                    </View>
                    <Text style={styles.uploadText}>Tap to upload front side</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Back Side Upload */}
            <View style={styles.kycField}>
              <View style={styles.kycFieldLabel}>
                <Ionicons name="card-outline" size={14} color="#FFB800" />
                <Text style={styles.kycFieldLabelText}>BACK SIDE (Optional)</Text>
              </View>
              <TouchableOpacity 
                style={[styles.uploadArea, backImage && styles.uploadAreaWithImage]}
                onPress={() => pickImage('back')}
              >
                {backImage ? (
                  <>
                    <Image 
                      source={{ uri: `data:image/jpeg;base64,${backImage}` }}
                      style={styles.uploadedImage}
                      resizeMode="cover"
                    />
                    <View style={styles.uploadedOverlay}>
                      <Ionicons name="checkmark-circle" size={32} color="#00E55A" />
                      <Text style={styles.uploadedText}>Tap to change</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.uploadIconWrapper}>
                      <Ionicons name="camera" size={28} color="#666" />
                    </View>
                    <Text style={styles.uploadText}>Tap to upload back side</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              style={[
                styles.kycContinueBtn,
                (!frontImage || isSubmittingKyc) && styles.kycContinueBtnDisabled
              ]}
              onPress={submitKycDocuments}
              disabled={!frontImage || isSubmittingKyc}
            >
              {isSubmittingKyc ? (
                <>
                  <ActivityIndicator color="#0A1A0F" size="small" />
                  <Text style={styles.kycContinueBtnText}>Verifying...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={18} color="#0A1A0F" />
                  <Text style={styles.kycContinueBtnText}>Submit for Verification</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: Verified */}
        {kycStep === 3 && (
          <View style={styles.kycFormCard}>
            <View style={styles.kycFormHeader}>
              <View style={[styles.kycFormIcon, { backgroundColor: '#00E55A' }]}>
                <Ionicons name="checkmark-circle" size={18} color="#0A1A0F" />
              </View>
              <View>
                <Text style={styles.kycFormTitle}>Verified!</Text>
                <Text style={styles.kycFormSubtitle}>Your identity has been confirmed</Text>
              </View>
            </View>

            <View style={[styles.reviewStatusCard, { backgroundColor: 'rgba(0, 229, 90, 0.1)' }]}>
              <Ionicons name="shield-checkmark" size={64} color="#00E55A" />
              <Text style={[styles.reviewTitle, { color: '#00E55A' }]}>KYC Complete</Text>
              <Text style={styles.reviewText}>
                Congratulations! Your account is now fully verified. You have access to all features.
              </Text>
              
              {kycStatus?.ai_result && (
                <View style={styles.aiResultBox}>
                  <Text style={styles.aiResultLabel}>Document Type:</Text>
                  <Text style={styles.aiResultValue}>{kycStatus.ai_result.document_type}</Text>
                  <Text style={styles.aiResultLabel}>Country:</Text>
                  <Text style={styles.aiResultValue}>{kycStatus.ai_result.country}</Text>
                </View>
              )}
            </View>

            <View style={styles.reviewChecklist}>
              <View style={styles.reviewCheckItem}>
                <Ionicons name="checkmark-circle" size={20} color="#00E55A" />
                <Text style={styles.reviewCheckText}>Personal information verified</Text>
              </View>
              <View style={styles.reviewCheckItem}>
                <Ionicons name="checkmark-circle" size={20} color="#00E55A" />
                <Text style={styles.reviewCheckText}>ID documents verified by AI</Text>
              </View>
              <View style={styles.reviewCheckItem}>
                <Ionicons name="checkmark-circle" size={20} color="#00E55A" />
                <Text style={styles.reviewCheckText}>Account fully verified</Text>
              </View>
            </View>
          </View>
        )}

        {/* Country Picker Modal */}
        <Modal visible={showCountryPicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Country</Text>
                <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                  <Ionicons name="close-circle" size={28} color="#666" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerList}>
                {COUNTRIES.map((country) => (
                  <TouchableOpacity
                    key={country}
                    style={styles.pickerItem}
                    onPress={() => {
                      setKycData(prev => ({ ...prev, nationality: country }));
                      setShowCountryPicker(false);
                    }}
                  >
                    <Text style={styles.pickerItemText}>{country}</Text>
                    {kycData.nationality === country && (
                      <Ionicons name="checkmark" size={20} color="#00E55A" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ID Type Picker Modal */}
        <Modal visible={showIdTypePicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select ID Type</Text>
                <TouchableOpacity onPress={() => setShowIdTypePicker(false)}>
                  <Ionicons name="close-circle" size={28} color="#666" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerList}>
                {ID_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={styles.pickerItem}
                    onPress={() => {
                      setKycData(prev => ({ ...prev, idType: type }));
                      setShowIdTypePicker(false);
                    }}
                  >
                    <Text style={styles.pickerItemText}>{type}</Text>
                    {kycData.idType === type && (
                      <Ionicons name="checkmark" size={20} color="#00E55A" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </>
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
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
    setLoadingTransactions(false);
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
            onPress={() => setShowWithdrawModal(true)}
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
                    <Text style={styles.txId}>{tx.transaction_id || `TXN${index + 1}`}</Text>
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
                    <Text style={[
                      styles.txStatus,
                      { color: tx.status === 'completed' ? '#00E55A' : 
                        tx.status === 'pending' ? '#FFB800' : '#FF3B3B' }
                    ]}>
                      {tx.status === 'completed' ? 'Successed' : 
                       tx.status === 'pending' ? 'Pending' : 'Failed'}
                    </Text>
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
                      {tx.currency || 'USDT'} {tx.network ? `(${tx.network})` : '(TRC-20)'}
                    </Text>
                    <Text style={styles.txType}>
                      {tx.type === 'deposit' ? 'Deposit' : 'Payout'}
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
              <TouchableOpacity onPress={() => setShowDepositModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
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
                <TouchableOpacity 
                  style={styles.depositPromoQuickBtn}
                  onPress={() => {
                    setPromoCode('VIP50');
                    setAppliedPromo('VIP50');
                  }}
                >
                  <Text style={styles.depositPromoQuickText}>VIP50</Text>
                </TouchableOpacity>
              </View>

              {/* Promo Info Box */}
              <View style={styles.depositPromoInfo}>
                <Ionicons name="gift" size={20} color="#FFD700" />
                <Text style={styles.depositPromoInfoText}>
                  BYNIX: 200% bonus ($100+) - New users only!
                </Text>
              </View>

              {/* Generate Address Button */}
              <TouchableOpacity 
                style={styles.depositGenerateBtn}
                onPress={() => {
                  setShowDepositModal(false);
                  router.push('/(tabs)/wallet');
                }}
              >
                <Text style={styles.depositGenerateBtnText}>Generate Deposit Address</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Withdraw Funds Modal */}
      <Modal visible={showWithdrawModal} transparent animationType="slide">
        <View style={styles.withdrawModalOverlay}>
          <View style={styles.withdrawModalContent}>
            {/* Header */}
            <View style={styles.withdrawModalHeader}>
              <Text style={styles.withdrawModalTitle}>Withdraw</Text>
              <TouchableOpacity onPress={() => {
                setShowWithdrawModal(false);
                setWithdrawAmount('10');
                setWithdrawAddress('');
              }}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Account Section */}
              <Text style={styles.withdrawSectionTitle}>Account:</Text>
              
              {/* In the account */}
              <View style={styles.withdrawAccountRow}>
                <Text style={styles.withdrawAccountLabel}>In the account:</Text>
                <Text style={styles.withdrawAccountValue}>
                  {(user?.total_balance || user?.real_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                </Text>
              </View>
              
              {/* Divider */}
              <View style={styles.withdrawDivider} />
              
              {/* Available for withdrawal */}
              <View style={styles.withdrawAccountRow}>
                <Text style={styles.withdrawAccountLabel}>Available for withdrawal:</Text>
                <Text style={styles.withdrawAccountValueBold}>
                  {(user?.withdrawable_balance || user?.real_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                </Text>
              </View>

              {/* Bonus Warning */}
              {(user?.bonus_balance || 0) > 0 && (
                <View style={styles.withdrawBonusWarning}>
                  <Ionicons name="warning" size={16} color="#FFB800" />
                  <Text style={styles.withdrawBonusWarningText}>
                    Bonus balance (${user?.bonus_balance?.toFixed(2)}) is not withdrawable. Withdrawing will forfeit your bonus.
                  </Text>
                </View>
              )}

              {/* Withdrawal Section */}
              <Text style={[styles.withdrawSectionTitle, { marginTop: 24 }]}>Withdrawal:</Text>
              
              {/* Amount Input */}
              <View style={styles.withdrawInputGroup}>
                <Text style={styles.withdrawInputLabel}>Amount</Text>
                <View style={styles.withdrawAmountRow}>
                  <TextInput
                    style={styles.withdrawAmountInputNew}
                    value={withdrawAmount}
                    onChangeText={setWithdrawAmount}
                    keyboardType="numeric"
                    placeholder="10"
                    placeholderTextColor="#666"
                  />
                  <Text style={styles.withdrawAmountCurrency}>USD</Text>
                </View>
              </View>

              {/* Payment Method */}
              <View style={styles.withdrawInputGroup}>
                <Text style={styles.withdrawInputLabel}>Payment method</Text>
                <TouchableOpacity style={styles.withdrawPaymentSelect}>
                  <View style={styles.withdrawPaymentLeft}>
                    <Text style={styles.withdrawUsdtIcon}>₮</Text>
                    <Text style={styles.withdrawPaymentText}>USDT</Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color="#888" />
                </TouchableOpacity>
              </View>

              {/* Purse (Wallet Address) */}
              <View style={styles.withdrawInputGroup}>
                <Text style={styles.withdrawInputLabel}>Purse</Text>
                <TextInput
                  style={styles.withdrawPurseInput}
                  placeholder="Enter your wallet address"
                  placeholderTextColor="#666"
                  value={withdrawAddress}
                  onChangeText={setWithdrawAddress}
                />
              </View>

              {/* Network */}
              <View style={styles.withdrawInputGroup}>
                <Text style={styles.withdrawInputLabel}>Network</Text>
                <TouchableOpacity style={styles.withdrawNetworkSelect}>
                  <Text style={styles.withdrawNetworkText}>TRC20</Text>
                  <Ionicons name="chevron-down" size={20} color="#888" />
                </TouchableOpacity>
              </View>

              {/* Confirm Button */}
              <TouchableOpacity 
                style={styles.withdrawConfirmBtn}
                onPress={() => {
                  const amount = parseFloat(withdrawAmount);
                  const withdrawable = user?.withdrawable_balance || user?.real_balance || 0;
                  
                  if (amount < 10) {
                    Alert.alert('Invalid Amount', 'Minimum withdrawal is $10');
                    return;
                  }
                  if (!withdrawAddress || withdrawAddress.length < 20) {
                    Alert.alert('Invalid Address', 'Please enter a valid wallet address');
                    return;
                  }
                  if (amount > withdrawable) {
                    Alert.alert('Insufficient Balance', `You can only withdraw up to $${withdrawable.toFixed(2)}`);
                    return;
                  }
                  
                  setIsProcessingWithdraw(true);
                  
                  // Show processing popup
                  setTimeout(() => {
                    setIsProcessingWithdraw(false);
                    setShowWithdrawModal(false);
                    setWithdrawAmount('10');
                    setWithdrawAddress('');
                    
                    Alert.alert(
                      'Withdrawal Request Submitted',
                      'Your withdrawal request is being processed.\n\nProcessing time: 24-72 hours.\n\nYou can track the status in your transaction history.',
                      [{ text: 'OK' }]
                    );
                  }, 1500);
                }}
                disabled={isProcessingWithdraw}
              >
                {isProcessingWithdraw ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.withdrawConfirmBtnText}>Confirm</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
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
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: 'rgba(15, 20, 40, 0.95)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 59, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 59, 0.3)',
  },
  signOutText: {
    color: '#FF3B3B',
    fontSize: 13,
    fontWeight: '600',
  },
  tabsContainer: {
    backgroundColor: 'rgba(15, 20, 40, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabsContent: {
    paddingHorizontal: 12,
    gap: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#00E55A',
  },
  tabText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#00E55A',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 12,
    paddingBottom: 100,
  },
  verificationBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.3)',
  },
  verificationIcon: {
    marginRight: 12,
  },
  verificationContent: {
    flex: 1,
  },
  verificationTitle: {
    color: '#FFB800',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  verificationSubtitle: {
    color: '#999',
    fontSize: 12,
    marginBottom: 10,
  },
  sendCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFB800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  sendCodeText: {
    color: '#0A1A0F',
    fontSize: 13,
    fontWeight: '700',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFB800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0A1A0F',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#666',
    width: 24,
    height: 24,
    borderRadius: 12,
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
    gap: 8,
    marginBottom: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  tierText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userEmail: {
    color: '#999',
    fontSize: 13,
  },
  unverifiedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B3B',
    marginLeft: 4,
  },
  kycBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 191, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
    gap: 4,
  },
  kycBadgeText: {
    color: '#00BFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  userId: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  tierProgress: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tierLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tierLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00E55A',
    borderRadius: 3,
  },
  progressText: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    width: '48.5%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statLabel: {
    color: '#666',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  leaderboardTag: {
    backgroundColor: 'rgba(0, 229, 90, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  leaderboardTagText: {
    color: '#00E55A',
    fontSize: 10,
    fontWeight: '600',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  editBtnText: {
    color: '#00E55A',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionValue: {
    color: '#666',
    fontSize: 13,
  },
  secureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  secureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E55A',
  },
  secureText: {
    color: '#00E55A',
    fontSize: 11,
    fontWeight: '600',
  },
  infoList: {
    gap: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: '#666',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  comingSoon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  comingSoonTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  comingSoonText: {
    color: '#666',
    fontSize: 13,
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#666',
    fontSize: 13,
    marginBottom: 16,
  },
  countryList: {
    maxHeight: 400,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  countryItemSelected: {
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
    borderRadius: 8,
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
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalScroll: {
    maxHeight: 300,
    marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: '#00E55A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  editableField: {
    marginBottom: 14,
  },
  editableLabel: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  editableInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  // Security Tab Styles
  securityHeader: {
    marginBottom: 16,
  },
  securityTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  securitySubtitle: {
    color: '#666',
    fontSize: 12,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  securityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  securityInfo: {
    flex: 1,
  },
  securityLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  securityLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  securityDetail: {
    color: '#666',
    fontSize: 12,
  },
  securityBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FFB800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  securityBtnText: {
    color: '#FFB800',
    fontSize: 12,
    fontWeight: '700',
  },
  sessionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
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
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  sessionDetail: {
    color: '#666',
    fontSize: 12,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00E55A',
  },
  // KYC Tab Styles
  kycHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  kycTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  kycSubtitle: {
    color: '#666',
    fontSize: 13,
  },
  kycSteps: {
    marginBottom: 12,
  },
  stepsScroll: {
    paddingHorizontal: 4,
    gap: 8,
  },
  stepItem: {
    alignItems: 'center',
    width: 70,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
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
    fontSize: 10,
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
    left: -20,
    top: 20,
    width: 20,
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
    fontSize: 9,
    textAlign: 'center',
  },
  kycFormCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  kycFormHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  kycFormIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFB800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kycFormTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  kycFormSubtitle: {
    color: '#666',
    fontSize: 12,
    flexShrink: 1,
  },
  kycField: {
    marginBottom: 16,
  },
  kycFieldLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  kycFieldLabelText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  kycInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  kycSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  kycSelectText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  kycSelectPlaceholder: {
    color: '#666',
  },
  kycNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(155, 89, 182, 0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  kycNoticeText: {
    color: '#999',
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  kycContinueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFB800',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  kycContinueBtnText: {
    color: '#0A1A0F',
    fontSize: 15,
    fontWeight: '700',
  },
  uploadArea: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderStyle: 'dashed',
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadText: {
    color: '#666',
    fontSize: 14,
  },
  pickerList: {
    maxHeight: 300,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  pickerItemText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  // Activity Tab Styles
  activitySubTabs: {
    flexDirection: 'row',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  activitySubTab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  activitySubTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#FFB800',
  },
  activitySubTabText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  activitySubTabTextActive: {
    color: '#FFB800',
  },
  activityList: {
    gap: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 229, 90, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityDevice: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  activityDetail: {
    color: '#666',
    fontSize: 12,
  },
  activityDate: {
    color: '#888',
    fontSize: 11,
  },
  // Settings Tab Styles
  settingsSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingsSectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  settingsSectionSubtitle: {
    color: '#666',
    fontSize: 12,
    marginBottom: 16,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingsInfo: {
    flex: 1,
  },
  settingsLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingsDetail: {
    color: '#666',
    fontSize: 12,
  },
  toggleBtn: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleBtnActive: {
    backgroundColor: '#FFB800',
  },
  toggleCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#666',
  },
  toggleCircleActive: {
    backgroundColor: '#0A1A0F',
    alignSelf: 'flex-end',
  },
  dangerZone: {
    backgroundColor: 'rgba(255, 59, 59, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 59, 0.2)',
  },
  dangerZoneTitle: {
    color: '#FF3B3B',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  dangerZoneSubtitle: {
    color: '#888',
    fontSize: 12,
    marginBottom: 16,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF3B3B',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  deleteBtnText: {
    color: '#FF3B3B',
    fontSize: 14,
    fontWeight: '700',
  },
  reviewStatusCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    borderRadius: 12,
    marginBottom: 20,
  },
  reviewTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 12,
  },
  reviewText: {
    color: '#AAA',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  reviewChecklist: {
    gap: 12,
  },
  reviewCheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 14,
    borderRadius: 10,
  },
  reviewCheckText: {
    color: '#FFFFFF',
    fontSize: 14,
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  withdrawModalContent: {
    backgroundColor: '#0F1428',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  withdrawModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  withdrawModalTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  withdrawBalanceCard: {
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 90, 0.3)',
  },
  withdrawBalanceLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  withdrawBalanceValue: {
    color: '#00E55A',
    fontSize: 32,
    fontWeight: '800',
  },
  withdrawLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 10,
    marginTop: 16,
  },
  withdrawAmountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 59, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 59, 0.3)',
  },
  withdrawAmountPrefix: {
    color: '#FF3B3B',
    fontSize: 28,
    fontWeight: '700',
    marginRight: 8,
  },
  withdrawAmountInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    padding: 0,
  },
  withdrawQuickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  withdrawQuickBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'transparent',
  },
  withdrawQuickBtnActive: {
    backgroundColor: 'rgba(255, 59, 59, 0.2)',
    borderColor: '#FF3B3B',
  },
  withdrawQuickBtnText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  withdrawQuickBtnTextActive: {
    color: '#FF3B3B',
  },
  withdrawAddressInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  withdrawFeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  withdrawFeeLabel: {
    color: '#888',
    fontSize: 14,
  },
  withdrawFeeValue: {
    color: '#00E55A',
    fontSize: 14,
    fontWeight: '700',
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
});
