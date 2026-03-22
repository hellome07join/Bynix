import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../utils/api';

export default function Wallet() {
  const { user, token, accountType } = useAuthStore();
  
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [depositAddress, setDepositAddress] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    if (!token) return;
    try {
      const data = await api.getTransactions(token);
      setTransactions(data);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      const response = await api.requestDeposit(amount, token!);
      setDepositAddress(response.crypto_address);
      Alert.alert('Success', 'Deposit address generated. Send crypto to this address.');
      loadTransactions();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!withdrawAddress) {
      Alert.alert('Error', 'Please enter withdrawal address');
      return;
    }

    if (user?.real_balance && amount > user.real_balance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    try {
      await api.requestWithdrawal(amount, withdrawAddress, token!);
      Alert.alert('Success', 'Withdrawal request submitted. Awaiting approval.');
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setWithdrawAddress('');
      loadTransactions();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const balance = accountType === 'demo' ? user?.demo_balance : user?.real_balance;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D7A3" />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Wallet</Text>
        <Text style={styles.subtitle}>{accountType === 'demo' ? 'Demo Account' : 'Real Account'}</Text>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceAmount}>${balance?.toFixed(2) || '0.00'}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setShowDepositModal(true)}
          disabled={accountType === 'demo'}
        >
          <Ionicons name="add-circle" size={24} color={accountType === 'demo' ? '#666' : '#00D7A3'} />
          <Text style={[styles.actionText, accountType === 'demo' && { opacity: 0.5 }]}>Deposit</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setShowWithdrawModal(true)}
          disabled={accountType === 'demo'}
        >
          <Ionicons name="remove-circle" size={24} color={accountType === 'demo' ? '#666' : '#FF3B3B'} />
          <Text style={[styles.actionText, accountType === 'demo' && { opacity: 0.5 }]}>Withdraw</Text>
        </TouchableOpacity>
      </View>

      {accountType === 'demo' && (
        <View style={styles.demoNotice}>
          <Ionicons name="information-circle" size={20} color="#00D7A3" />
          <Text style={styles.demoNoticeText}>
            Switch to Real Account to deposit or withdraw funds
          </Text>
        </View>
      )}

      {/* Transactions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>

        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#666" />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          transactions.map((txn: any) => (
            <View key={txn.transaction_id} style={styles.transactionItem}>
              <View style={styles.transactionIcon}>
                <Ionicons 
                  name={txn.type === 'deposit' ? 'arrow-down' : 'arrow-up'} 
                  size={20} 
                  color={txn.type === 'deposit' ? '#00D7A3' : '#FF3B3B'} 
                />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionType}>
                  {txn.type.charAt(0).toUpperCase() + txn.type.slice(1)}
                </Text>
                <Text style={styles.transactionDate}>
                  {new Date(txn.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.transactionRight}>
                <Text style={[styles.transactionAmount, txn.type === 'deposit' ? styles.deposit : styles.withdrawal]}>
                  {txn.type === 'deposit' ? '+' : '-'}${txn.amount.toFixed(2)}
                </Text>
                <View style={[styles.statusBadge, getStatusStyle(txn.status)]}>
                  <Text style={styles.statusText}>{txn.status}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Deposit Modal */}
      <Modal
        visible={showDepositModal}
        transparent
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

            {!depositAddress ? (
              <>
                <Text style={styles.modalLabel}>Enter Amount</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputPrefix}>$</Text>
                  <TextInput
                    style={styles.input}
                    value={depositAmount}
                    onChangeText={setDepositAmount}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor="#666"
                  />
                </View>

                <TouchableOpacity style={styles.submitButton} onPress={handleDeposit}>
                  <Text style={styles.submitButtonText}>Generate Deposit Address</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.qrContainer}>
                <Text style={styles.qrLabel}>Send crypto to this address:</Text>
                <View style={styles.qrCode}>
                  <QRCode value={depositAddress} size={200} />
                </View>
                <View style={styles.addressContainer}>
                  <Text style={styles.addressText}>{depositAddress}</Text>
                </View>
                <Text style={styles.qrNote}>Amount: ${depositAmount}</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Withdraw Modal */}
      <Modal
        visible={showWithdrawModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWithdrawModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Withdraw Funds</Text>
              <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Amount</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputPrefix}>$</Text>
              <TextInput
                style={styles.input}
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#666"
              />
            </View>

            <Text style={styles.modalLabel}>Wallet Address</Text>
            <TextInput
              style={styles.fullInput}
              value={withdrawAddress}
              onChangeText={setWithdrawAddress}
              placeholder="0x..."
              placeholderTextColor="#666"
            />

            <View style={styles.warningBox}>
              <Ionicons name="warning" size={20} color="#FF3B3B" />
              <Text style={styles.warningText}>
                Withdrawals require admin approval
              </Text>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleWithdraw}>
              <Text style={styles.submitButtonText}>Submit Withdrawal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'completed':
      return { backgroundColor: 'rgba(0, 215, 163, 0.2)' };
    case 'pending':
      return { backgroundColor: 'rgba(255, 165, 0, 0.2)' };
    case 'rejected':
      return { backgroundColor: 'rgba(255, 59, 59, 0.2)' };
    default:
      return { backgroundColor: 'rgba(255, 255, 255, 0.1)' };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  header: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.6,
    marginTop: 4,
  },
  balanceCard: {
    backgroundColor: 'rgba(0, 215, 163, 0.1)',
    marginHorizontal: 24,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#00D7A3',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.6,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#00D7A3',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  demoNotice: {
    flexDirection: 'row',
    marginHorizontal: 24,
    padding: 16,
    backgroundColor: 'rgba(0, 215, 163, 0.1)',
    borderRadius: 12,
    marginBottom: 24,
  },
  demoNoticeText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 12,
    flex: 1,
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#FFFFFF',
    opacity: 0.5,
    marginTop: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.5,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  deposit: {
    color: '#00D7A3',
  },
  withdrawal: {
    color: '#FF3B3B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#0F1428',
    borderRadius: 16,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputPrefix: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    paddingVertical: 16,
  },
  fullInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  submitButton: {
    backgroundColor: '#00D7A3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#0A0E27',
    fontSize: 16,
    fontWeight: 'bold',
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 24,
  },
  qrCode: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
  },
  addressContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
  },
  addressText: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
  },
  qrNote: {
    color: '#00D7A3',
    fontSize: 16,
    fontWeight: 'bold',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 59, 59, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  warningText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 12,
    flex: 1,
  },
});