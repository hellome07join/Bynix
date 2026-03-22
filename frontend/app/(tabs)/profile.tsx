import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';

const TABS = ['Overview', 'Security', 'KYC', 'Activity', 'Settings'];

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
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('Overview');
  const [userData, setUserData] = useState(MOCK_USER_DATA);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
  const [nickname, setNickname] = useState(userData.nickname);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');
  
  // KYC State
  const [kycStep, setKycStep] = useState(1);
  const [kycData, setKycData] = useState({
    fullName: '',
    nationality: '',
    dateOfBirth: '',
    idType: '',
    idNumber: '',
  });
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showIdTypePicker, setShowIdTypePicker] = useState(false);

  const handleSignOut = () => {
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
  };

  const handleSendVerificationCode = () => {
    Alert.alert('Verification Code', 'A verification code has been sent to your email.');
  };

  const saveNickname = () => {
    setUserData(prev => ({ ...prev, nickname }));
    setShowNicknameModal(false);
    Alert.alert('Success', 'Nickname updated successfully!');
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
              <Ionicons name="send" size={16} color="#0A0E27" />
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
          <TouchableOpacity style={styles.cameraIcon}>
            <Ionicons name="camera" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.profileInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{user?.full_name || userData.fullName}</Text>
            <View style={[styles.tierBadge, { backgroundColor: getTierColor(userData.tier) + '30' }]}>
              <Ionicons name="trophy" size={12} color={getTierColor(userData.tier)} />
              <Text style={[styles.tierText, { color: getTierColor(userData.tier) }]}>{userData.tier}</Text>
            </View>
          </View>
          <View style={styles.emailRow}>
            <Text style={styles.userEmail}>{user?.email || userData.email}</Text>
            {!userData.isEmailVerified && (
              <View style={styles.unverifiedDot} />
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
            <Ionicons name="bar-chart" size={16} color="#00D7A3" />
            <Text style={styles.statLabel}>TOTAL TRADES</Text>
          </View>
          <Text style={styles.statValue}>{userData.stats.totalTrades}</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons name="trophy" size={16} color="#FFD700" />
            <Text style={styles.statLabel}>WIN RATE</Text>
          </View>
          <Text style={[styles.statValue, { color: '#00D7A3' }]}>{userData.stats.winRate.toFixed(1)}%</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons name="trending-up" size={16} color="#00D7A3" />
            <Text style={styles.statLabel}>VOLUME</Text>
          </View>
          <Text style={[styles.statValue, { color: '#FF3B3B' }]}>${userData.stats.volume.toLocaleString()}</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons name="cash" size={16} color="#00D7A3" />
            <Text style={styles.statLabel}>NET P&L</Text>
          </View>
          <Text style={[styles.statValue, { color: userData.stats.netPnL >= 0 ? '#00D7A3' : '#FF3B3B' }]}>
            ${userData.stats.netPnL.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Nickname Section */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="at" size={18} color="#00D7A3" />
            <Text style={styles.sectionTitle}>Nickname</Text>
            <View style={styles.leaderboardTag}>
              <Text style={styles.leaderboardTagText}>Leaderboard</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => setShowNicknameModal(true)}>
            <Ionicons name="create-outline" size={16} color="#00D7A3" />
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
          <TouchableOpacity style={styles.editBtn} onPress={() => setShowPersonalInfoModal(true)}>
            <Ionicons name="create-outline" size={16} color="#00D7A3" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoList}>
          <InfoRow icon="person" label="FULL NAME" value={user?.full_name || userData.fullName} />
          <InfoRow icon="mail" label="EMAIL" value={user?.email || userData.email} iconColor="#9B59B6" />
          <InfoRow icon="call" label="PHONE" value={userData.phone} iconColor="#00D7A3" />
          <InfoRow icon="globe" label="COUNTRY" value={`${userData.countryFlag} ${userData.country}`} iconColor="#FF6B6B" />
          <InfoRow icon="location" label="ADDRESS" value={userData.address} iconColor="#FF3B3B" />
          <InfoRow icon="calendar" label="DATE OF BIRTH" value={userData.dateOfBirth} iconColor="#9B59B6" />
          <InfoRow icon="finger-print" label="ACCOUNT ID" value={userData.accountId} iconColor="#FFB800" />
          <InfoRow icon="link" label="REFERRAL CODE" value={userData.referralCode || '—'} iconColor="#00D7A3" />
          <InfoRow icon="calendar-outline" label="JOINED" value={userData.joinedDate} iconColor="#00D7A3" />
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
          <InfoRow icon="time" label="TIME" value={userData.lastLogin.time} iconColor="#00D7A3" />
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
              <View style={[styles.statusBadge, { backgroundColor: 'rgba(0, 215, 163, 0.2)' }]}>
                <Text style={[styles.statusText, { color: '#00D7A3' }]}>Set</Text>
              </View>
            </View>
            <Text style={styles.securityDetail}>Last changed: Unknown</Text>
          </View>
          <TouchableOpacity 
            style={styles.securityBtn}
            onPress={() => Alert.alert('Change Password', 'Password change feature coming soon!')}
          >
            <Text style={styles.securityBtnText}>Change</Text>
          </TouchableOpacity>
        </View>

        {/* 2FA Row */}
        <View style={styles.securityRow}>
          <View style={[styles.securityIcon, { backgroundColor: 'rgba(255, 184, 0, 0.15)' }]}>
            <Ionicons name="shield-checkmark" size={20} color="#FFB800" />
          </View>
          <View style={styles.securityInfo}>
            <View style={styles.securityLabelRow}>
              <Text style={styles.securityLabel}>2FA</Text>
              <View style={[styles.statusBadge, { backgroundColor: 'rgba(255, 59, 59, 0.2)' }]}>
                <Text style={[styles.statusText, { color: '#FF3B3B' }]}>Off</Text>
              </View>
            </View>
            <Text style={styles.securityDetail}>Disabled — Enable for extra security</Text>
          </View>
          <TouchableOpacity 
            style={styles.securityBtn}
            onPress={() => Alert.alert('Enable 2FA', '2FA authentication feature coming soon!')}
          >
            <Text style={styles.securityBtnText}>Enable</Text>
          </TouchableOpacity>
        </View>

        {/* Email Row */}
        <View style={[styles.securityRow, { borderBottomWidth: 0 }]}>
          <View style={[styles.securityIcon, { backgroundColor: 'rgba(0, 215, 163, 0.15)' }]}>
            <Ionicons name="mail" size={20} color="#00D7A3" />
          </View>
          <View style={styles.securityInfo}>
            <View style={styles.securityLabelRow}>
              <Text style={styles.securityLabel}>Email</Text>
              <View style={[styles.statusBadge, { backgroundColor: 'rgba(0, 215, 163, 0.2)' }]}>
                <Text style={[styles.statusText, { color: '#00D7A3' }]}>Verified</Text>
              </View>
            </View>
            <Text style={styles.securityDetail}>{user?.email || userData.email}</Text>
          </View>
        </View>
      </View>

      {/* Active Session Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sessionTitle}>Active Session</Text>
        
        <View style={styles.sessionRow}>
          <View style={[styles.securityIcon, { backgroundColor: 'rgba(0, 215, 163, 0.15)' }]}>
            <Ionicons name="desktop-outline" size={20} color="#00D7A3" />
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
      { id: 3, title: 'Face Verify', subtitle: 'Selfie check', icon: 'camera' },
      { id: 4, title: 'Review', subtitle: 'Final submit', icon: 'paper-plane' },
      { id: 5, title: 'Verified', subtitle: 'Complete', icon: 'checkmark-circle' },
    ];

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
            {KYC_STEPS.map((step, index) => (
              <View key={step.id} style={styles.stepItem}>
                <View style={[
                  styles.stepCircle,
                  kycStep === step.id && styles.stepCircleActive,
                  kycStep > step.id && styles.stepCircleCompleted,
                ]}>
                  <Ionicons 
                    name={step.icon as any} 
                    size={18} 
                    color={kycStep >= step.id ? '#0A0E27' : '#666'} 
                  />
                </View>
                <Text style={[styles.stepTitle, kycStep === step.id && styles.stepTitleActive]}>
                  {step.title}
                </Text>
                <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Step 1: Personal Information Form */}
        <View style={styles.kycFormCard}>
          <View style={styles.kycFormHeader}>
            <View style={styles.kycFormIcon}>
              <Ionicons name="card" size={18} color="#0A0E27" />
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
            onPress={() => Alert.alert('KYC', 'Document upload feature coming soon!')}
          >
            <Ionicons name="arrow-forward" size={18} color="#0A0E27" />
            <Text style={styles.kycContinueBtnText}>Continue to Document Upload</Text>
          </TouchableOpacity>
        </View>

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
                      <Ionicons name="checkmark" size={20} color="#00D7A3" />
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
                      <Ionicons name="checkmark" size={20} color="#00D7A3" />
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

  const renderActivityTab = () => (
    <View style={styles.comingSoon}>
      <Ionicons name="time" size={64} color="#666" />
      <Text style={styles.comingSoonTitle}>Activity Log</Text>
      <Text style={styles.comingSoonText}>View your recent account activities and login history.</Text>
    </View>
  );

  const renderSettingsTab = () => (
    <View style={styles.comingSoon}>
      <Ionicons name="settings" size={64} color="#666" />
      <Text style={styles.comingSoonTitle}>Settings</Text>
      <Text style={styles.comingSoonText}>Manage notifications, preferences, and app settings.</Text>
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Overview': return renderOverviewTab();
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
                  tab === 'Security' ? 'shield' :
                  tab === 'KYC' ? 'card' :
                  tab === 'Activity' ? 'time' : 'settings'
                } 
                size={16} 
                color={activeTab === tab ? '#00D7A3' : '#666'} 
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
    </View>
  );
}

// Helper Components
const InfoRow = ({ icon, label, value, iconColor = '#00D7A3' }: { icon: string; label: string; value: string; iconColor?: string }) => (
  <View style={styles.infoRow}>
    <View style={[styles.infoIcon, { backgroundColor: iconColor + '20' }]}>
      <Ionicons name={icon as any} size={16} color={iconColor} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color="#444" />
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
    backgroundColor: '#0A0E27',
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
    borderBottomColor: '#00D7A3',
  },
  tabText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#00D7A3',
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
    color: '#0A0E27',
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
    color: '#0A0E27',
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
    borderColor: '#0A0E27',
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
    backgroundColor: '#00D7A3',
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
    backgroundColor: 'rgba(0, 215, 163, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  leaderboardTagText: {
    color: '#00D7A3',
    fontSize: 10,
    fontWeight: '600',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 215, 163, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  editBtnText: {
    color: '#00D7A3',
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
    backgroundColor: 'rgba(0, 215, 163, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  secureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00D7A3',
  },
  secureText: {
    color: '#00D7A3',
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
    backgroundColor: '#0F1428',
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
    backgroundColor: '#00D7A3',
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
    backgroundColor: '#00D7A3',
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
    backgroundColor: '#00D7A3',
    borderColor: '#00D7A3',
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
    color: '#0A0E27',
    fontSize: 15,
    fontWeight: '700',
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
});
