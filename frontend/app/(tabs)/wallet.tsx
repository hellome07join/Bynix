import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { API_URL, apiRequest } from '../../utils/api';
import * as Clipboard from 'expo-clipboard';

interface DepositResponse {
  success: boolean;
  payment_id?: number;
  pay_address?: string;
  pay_amount?: number;
  pay_currency?: string;
  network?: string;
  expiration_estimate_date?: string;
  error?: string;
}

interface DepositRecord {
  transaction_id: string;
  payment_id: number;
  amount: number;
  pay_amount: number;
  pay_address: string;
  network: string;
  status: string;
  created_at: string;
}

export default function WalletScreen() {
  const router = useRouter();
  const { user, token, refreshUser } = useAuthStore();
  
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('25');
  const [minAmount, setMinAmount] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [depositHistory, setDepositHistory] = useState<DepositRecord[]>([]);
  
  // Current deposit info
  const [currentDeposit, setCurrentDeposit] = useState<DepositResponse | null>(null);
  
  const realBalance = user?.real_balance || 0;

  useEffect(() => {
    loadDepositHistory();
    loadMinAmount();
  }, []);
  
  const loadMinAmount = async () => {
    try {
      const response = await fetch(`${API_URL}/deposit/min-amount`);
      if (response.ok) {
        const data = await response.json();
        setMinAmount(Math.ceil(data.min_amount));
        setDepositAmount(String(Math.ceil(data.min_amount)));
      }
    } catch (error) {
      console.error('Error loading min amount:', error);
    }
  };

  const loadDepositHistory = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_URL}/deposit/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setDepositHistory(data.deposits || []);
      }
    } catch (error) {
      console.error('Error loading deposit history:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDepositHistory();
    await refreshUser();
    setRefreshing(false);
  };

  const handleGenerateAddress = async () => {
    // Check if user is logged in
    if (!token) {
      Alert.alert('Login Required', 'Please login to deposit funds', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/(auth)/login') }
      ]);
      return;
    }
    
    const amount = parseFloat(depositAmount);
    
    if (isNaN(amount) || amount < minAmount) {
      Alert.alert('Invalid Amount', `Minimum deposit amount is $${minAmount}`);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/deposit/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });

      const data: DepositResponse = await response.json();

      if (data.success && data.pay_address) {
        setCurrentDeposit(data);
        setShowDepositModal(false);
        setShowAddressModal(true);
        loadDepositHistory();
      } else {
        Alert.alert('Error', data.error || 'Failed to generate deposit address');
      }
    } catch (error) {
      console.error('Error creating deposit:', error);
      Alert.alert('Error', 'Failed to create deposit. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'Address copied to clipboard');
  };

  const checkPaymentStatus = async () => {
    if (!currentDeposit?.payment_id) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/deposit/check/${currentDeposit.payment_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.credited) {
          // Balance was credited - refresh user data
          if (Platform.OS === 'web') {
            window.alert(`Deposit credited! $${data.actually_paid} has been added to your balance.`);
          } else {
            Alert.alert('Success', `Deposit credited! $${data.actually_paid} has been added to your balance.`);
          }
          setShowAddressModal(false);
          setCurrentDeposit(null);
          await refreshUser();
          await loadDepositHistory();
        } else if (data.status === 'waiting') {
          if (Platform.OS === 'web') {
            window.alert('Waiting for payment. Please send the exact amount to the address.');
          } else {
            Alert.alert('Pending', 'Waiting for payment. Please send the exact amount to the address.');
          }
        } else if (data.status === 'confirming') {
          if (Platform.OS === 'web') {
            window.alert('Payment received! Waiting for blockchain confirmations.');
          } else {
            Alert.alert('Confirming', 'Payment received! Waiting for blockchain confirmations.');
          }
        } else {
          if (Platform.OS === 'web') {
            window.alert(`Payment status: ${data.status}`);
          } else {
            Alert.alert('Status', `Payment status: ${data.status}`);
          }
        }
      }
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'finished':
        return '#00E55A';
      case 'pending':
      case 'waiting':
        return '#FFB800';
      case 'failed':
      case 'expired':
        return '#FF3B3B';
      default:
        return '#888888';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E55A" />
        }
      >
        {/* Account Type Label */}
        <Text style={styles.accountLabel}>Real Account</Text>

        {/* Balance Card */}
        <LinearGradient
          colors={['#0D1B2A', '#1B3A4B']}
          style={styles.balanceCard}
        >
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>${realBalance.toFixed(2)}</Text>
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.depositBtn}
              onPress={() => setShowDepositModal(true)}
            >
              <Ionicons name="add-circle" size={20} color="#0A1A0F" />
              <Text style={styles.depositBtnText}>Deposit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.withdrawBtn}>
              <Ionicons name="arrow-up-circle" size={20} color="#00E55A" />
              <Text style={styles.withdrawBtnText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Transaction History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          
          {depositHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color="#444444" />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          ) : (
            depositHistory.map((deposit, index) => (
              <View key={deposit.transaction_id || index} style={styles.transactionItem}>
                <View style={styles.transactionIcon}>
                  <Ionicons 
                    name={deposit.status === 'completed' ? 'checkmark-circle' : 'time'} 
                    size={24} 
                    color={getStatusColor(deposit.status)} 
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionType}>Deposit</Text>
                  <Text style={styles.transactionDate}>
                    {new Date(deposit.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.transactionAmount}>
                  <Text style={[styles.amountText, { color: '#00E55A' }]}>
                    +${deposit.amount.toFixed(2)}
                  </Text>
                  <Text style={[styles.statusText, { color: getStatusColor(deposit.status) }]}>
                    {deposit.status}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Deposit Amount Modal */}
      <Modal
        visible={showDepositModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDepositModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Deposit Funds</Text>
              <TouchableOpacity onPress={() => setShowDepositModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Enter Amount</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                value={depositAmount}
                onChangeText={setDepositAmount}
                keyboardType="numeric"
                placeholder={String(minAmount)}
                placeholderTextColor="#666666"
              />
            </View>
            
            <Text style={styles.minAmountText}>Minimum deposit: ${minAmount} (USDT TRC20)</Text>

            {/* Quick Amount Buttons */}
            <View style={styles.quickAmounts}>
              {['25', '50', '100', '250', '500', '1000'].map((amt) => (
                <TouchableOpacity 
                  key={amt}
                  style={[
                    styles.quickAmountBtn,
                    depositAmount === amt && styles.quickAmountBtnActive
                  ]}
                  onPress={() => setDepositAmount(amt)}
                >
                  <Text style={[
                    styles.quickAmountText,
                    depositAmount === amt && styles.quickAmountTextActive
                  ]}>
                    ${amt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.generateBtn, isLoading && styles.generateBtnDisabled]}
              onPress={handleGenerateAddress}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#0A1A0F" />
              ) : (
                <Text style={styles.generateBtnText}>Generate Deposit Address</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Deposit Address Modal */}
      <Modal
        visible={showAddressModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Deposit USDT</Text>
              <TouchableOpacity onPress={() => setShowAddressModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {currentDeposit && (
              <>
                {/* Network Info */}
                <View style={styles.networkBadge}>
                  <Ionicons name="link" size={16} color="#00E55A" />
                  <Text style={styles.networkText}>{currentDeposit.network || 'TRC20'} Network</Text>
                </View>

                {/* Amount to Send */}
                <View style={styles.depositInfoBox}>
                  <Text style={styles.depositInfoLabel}>Amount to Send</Text>
                  <View style={styles.amountRow}>
                    <Text style={styles.depositInfoValue}>
                      {currentDeposit.pay_amount?.toFixed(6)} {currentDeposit.pay_currency}
                    </Text>
                    <TouchableOpacity 
                      onPress={() => copyToClipboard(currentDeposit.pay_amount?.toFixed(6) || '')}
                      style={styles.copyBtn}
                    >
                      <Ionicons name="copy-outline" size={18} color="#00E55A" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.usdValue}>≈ ${depositAmount} USD</Text>
                </View>

                {/* Deposit Address */}
                <View style={styles.depositInfoBox}>
                  <Text style={styles.depositInfoLabel}>Deposit Address</Text>
                  <View style={styles.addressContainer}>
                    <Text style={styles.addressText} numberOfLines={2}>
                      {currentDeposit.pay_address}
                    </Text>
                    <TouchableOpacity 
                      onPress={() => copyToClipboard(currentDeposit.pay_address || '')}
                      style={styles.copyBtn}
                    >
                      <Ionicons name="copy-outline" size={18} color="#00E55A" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Warning */}
                <View style={styles.warningBox}>
                  <Ionicons name="warning" size={20} color="#FFB800" />
                  <Text style={styles.warningText}>
                    Send only USDT on {currentDeposit.network || 'TRC20'} network to this address. 
                    Sending other cryptocurrencies may result in permanent loss.
                  </Text>
                </View>

                {/* Check Status Button */}
                <TouchableOpacity
                  style={styles.checkStatusBtn}
                  onPress={checkPaymentStatus}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#0A1A0F" />
                  ) : (
                    <>
                      <Ionicons name="refresh" size={20} color="#0A1A0F" />
                      <Text style={styles.checkStatusText}>Check Payment Status</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Payment ID */}
                <Text style={styles.paymentId}>Payment ID: {currentDeposit.payment_id}</Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1A0F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  accountLabel: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 12,
  },
  balanceCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#00E55A',
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: '700',
    color: '#00E55A',
    textAlign: 'center',
    marginVertical: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  depositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00E55A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  depositBtnText: {
    color: '#0A1A0F',
    fontWeight: '700',
    fontSize: 14,
  },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00E55A',
    gap: 8,
  },
  withdrawBtnText: {
    color: '#00E55A',
    fontWeight: '700',
    fontSize: 14,
  },
  historySection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: '#666666',
    marginTop: 12,
    fontSize: 14,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  transactionDate: {
    color: '#888888',
    fontSize: 12,
    marginTop: 2,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontWeight: '700',
    fontSize: 14,
  },
  statusText: {
    fontSize: 12,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1F3D',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inputLabel: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A1A0F',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  currencySymbol: {
    fontSize: 24,
    color: '#888888',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    color: '#FFFFFF',
    paddingVertical: 16,
  },
  minAmountText: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 16,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  quickAmountBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#0A1A0F',
  },
  quickAmountBtnActive: {
    borderColor: '#00E55A',
    backgroundColor: 'rgba(0,215,163,0.1)',
  },
  quickAmountText: {
    color: '#888888',
    fontSize: 14,
  },
  quickAmountTextActive: {
    color: '#00E55A',
  },
  generateBtn: {
    backgroundColor: '#00E55A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  generateBtnDisabled: {
    opacity: 0.6,
  },
  generateBtnText: {
    color: '#0A1A0F',
    fontWeight: '700',
    fontSize: 16,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,215,163,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 16,
  },
  networkText: {
    color: '#00E55A',
    fontSize: 12,
    fontWeight: '600',
  },
  depositInfoBox: {
    backgroundColor: '#0A1A0F',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  depositInfoLabel: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  depositInfoValue: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
    flex: 1,
  },
  usdValue: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressText: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
    marginRight: 12,
  },
  copyBtn: {
    padding: 8,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,184,0,0.1)',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    color: '#FFB800',
    fontSize: 12,
    lineHeight: 18,
  },
  checkStatusBtn: {
    flexDirection: 'row',
    backgroundColor: '#00E55A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checkStatusText: {
    color: '#0A1A0F',
    fontWeight: '700',
    fontSize: 16,
  },
  paymentId: {
    color: '#666666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
});
