import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  Modal,
  Animated,
  ScrollView,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { fetchHistoricalCandles, Candle } from '../../utils/binanceService';
import EnhancedCandlestickChart from '../../components/EnhancedCandlestickChart';
import TradingViewChart from '../../components/TradingViewChart';
import { api } from '../../utils/api';

const { width, height } = Dimensions.get('window');

const TIMEFRAMES = [
  { label: '1s', value: '1s', seconds: 1 },
  { label: '5s', value: '5s', seconds: 5 },
  { label: '15s', value: '15s', seconds: 15 },
  { label: '1m', value: '1m', seconds: 60 },
  { label: '5m', value: '5m', seconds: 300 },
];

const DURATIONS = [
  { label: '5s', seconds: 5 },
  { label: '10s', seconds: 10 },
  { label: '30s', seconds: 30 },
  { label: '1m', seconds: 60 },
  { label: '2m', seconds: 120 },
  { label: '5m', seconds: 300 },
  { label: '10m', seconds: 600 },
  { label: '30m', seconds: 1800 },
  { label: '1h', seconds: 3600 },
];

// OTC Markets Only - No Real Markets
const ASSETS = [
  { label: 'EUR/USD OTC', value: 'EUR/USD OTC', icon: '🇪🇺🇺🇸', payout: 92 },
  { label: 'GBP/USD OTC', value: 'GBP/USD OTC', icon: '🇬🇧🇺🇸', payout: 90 },
  { label: 'USD/JPY OTC', value: 'USD/JPY OTC', icon: '🇺🇸🇯🇵', payout: 88 },
  { label: 'AUD/USD OTC', value: 'AUD/USD OTC', icon: '🇦🇺🇺🇸', payout: 87 },
  { label: 'USD/CHF OTC', value: 'USD/CHF OTC', icon: '🇺🇸🇨🇭', payout: 86 },
  { label: 'EUR/GBP OTC', value: 'EUR/GBP OTC', icon: '🇪🇺🇬🇧', payout: 85 },
  { label: 'NZD/USD OTC', value: 'NZD/USD OTC', icon: '🇳🇿🇺🇸', payout: 84 },
  { label: 'USD/CAD OTC', value: 'USD/CAD OTC', icon: '🇺🇸🇨🇦', payout: 83 },
  { label: 'EUR/JPY OTC', value: 'EUR/JPY OTC', icon: '🇪🇺🇯🇵', payout: 82 },
  { label: 'GBP/JPY OTC', value: 'GBP/JPY OTC', icon: '🇬🇧🇯🇵', payout: 81 },
];

export default function Trade() {
  const router = useRouter();
  const { user, token, accountType, setAccountType, updateBalance } = useAuthStore();
  
  // Local demo balance (for when user is not logged in)
  const [localDemoBalance, setLocalDemoBalance] = useState(10000);
  
  // Get actual balance (use local if no user)
  const demoBalance = user?.demo_balance ?? localDemoBalance;
  const realBalance = user?.real_balance ?? 0;
  const currentBalance = accountType === 'demo' ? demoBalance : realBalance;
  
  // Market data
  const [selectedAsset, setSelectedAsset] = useState('EUR/USD OTC');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState(1.09);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'live' | 'reconnecting'>('live');
  
  // Trading
  const [amount, setAmount] = useState('100');
  const [timeframe, setTimeframe] = useState('1m');
  const [duration, setDuration] = useState(60);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [showTradeHistory, setShowTradeHistory] = useState(false);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [selectedDrawTool, setSelectedDrawTool] = useState<string | null>(null);
  const [customMinutes, setCustomMinutes] = useState('1');
  const [customSeconds, setCustomSeconds] = useState('0');
  const [demoAddAmount, setDemoAddAmount] = useState('1000');
  
  // Function to add demo balance
  const addDemoBalance = (amount: number) => {
    if (user) {
      const newDemoBalance = (user.demo_balance || 0) + amount;
      updateBalance(newDemoBalance, user.real_balance || 0);
    } else {
      setLocalDemoBalance(prev => prev + amount);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };
  
  // Format duration for display
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };
  
  // Set custom time from modal
  const setCustomTime = () => {
    const mins = parseInt(customMinutes) || 0;
    const secs = parseInt(customSeconds) || 0;
    const totalSeconds = mins * 60 + secs;
    if (totalSeconds >= 5 && totalSeconds <= 86400) {
      setDuration(totalSeconds);
      setShowTimePicker(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Alert.alert('Invalid Time', 'Trade time must be between 5 seconds and 24 hours.');
    }
  };
  
  // Active trade
  const [activeTrade, setActiveTrade] = useState<any>(null);
  const [countdown, setCountdown] = useState(0);
  const [tradeStartTime, setTradeStartTime] = useState(0);
  const [tradeEndTime, setTradeEndTime] = useState(0);
  
  // Trade result
  const [showResult, setShowResult] = useState(false);
  const [tradeResult, setTradeResult] = useState<any>(null);
  const resultAnim = useRef(new Animated.Value(0)).current;
  
  const wsRef = useRef<any>(null);
  const tradeIntervalRef = useRef<any>(null);
  const cooldownRef = useRef(false);

  // Get current asset data
  const currentAsset = ASSETS.find(a => a.value === selectedAsset) || ASSETS[0];
  const payoutPercentage = currentAsset.payout;
  
  // Calculate potential profit
  const tradeAmount = parseFloat(amount) || 0;
  const potentialProfit = tradeAmount + (tradeAmount * payoutPercentage / 100);

  // Load market data
  useEffect(() => {
    loadMarketData();
    return () => {
      if (wsRef.current?.disconnect) {
        wsRef.current.disconnect();
      }
      if (tradeIntervalRef.current) {
        clearInterval(tradeIntervalRef.current);
      }
    };
  }, [selectedAsset]);

  // Handle countdown
  useEffect(() => {
    if (activeTrade && countdown > 0) {
      tradeIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            settleTrade();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (tradeIntervalRef.current) {
        clearInterval(tradeIntervalRef.current);
      }
    };
  }, [activeTrade, countdown]);

  const loadMarketData = async () => {
    setLoading(true);
    setConnectionStatus('live');
    
    // Generate fake initial price based on asset
    const getBasePrice = (asset: string): number => {
      if (asset.includes('EUR/USD')) return 1.0850 + (Math.random() - 0.5) * 0.02;
      if (asset.includes('GBP/USD')) return 1.2650 + (Math.random() - 0.5) * 0.02;
      if (asset.includes('USD/JPY')) return 149.50 + (Math.random() - 0.5) * 2;
      if (asset.includes('AUD/USD')) return 0.6550 + (Math.random() - 0.5) * 0.01;
      if (asset.includes('USD/CHF')) return 0.8750 + (Math.random() - 0.5) * 0.01;
      if (asset.includes('EUR/GBP')) return 0.8550 + (Math.random() - 0.5) * 0.01;
      if (asset.includes('NZD/USD')) return 0.6150 + (Math.random() - 0.5) * 0.01;
      if (asset.includes('USD/CAD')) return 1.3550 + (Math.random() - 0.5) * 0.02;
      if (asset.includes('EUR/JPY')) return 162.50 + (Math.random() - 0.5) * 2;
      if (asset.includes('GBP/JPY')) return 189.50 + (Math.random() - 0.5) * 2;
      return 1.0850;
    };
    
    const basePrice = getBasePrice(selectedAsset);
    setCurrentPrice(basePrice);
    setLoading(false);

    // FAKE PRICE TICKER - Updates every 500ms for realistic movement
    const priceTickerInterval = setInterval(() => {
      setCurrentPrice(prev => {
        // Random walk with slight bias for natural movement
        const volatility = prev * 0.0002; // 0.02% volatility per tick
        const change = (Math.random() - 0.5) * volatility * 2;
        const newPrice = prev + change;
        return newPrice;
      });
    }, 500);

    wsRef.current = { disconnect: () => clearInterval(priceTickerInterval) };
  };

  const placeTrade = async (type: 'call' | 'put') => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (cooldownRef.current) {
      Alert.alert('Please wait', 'Cooldown active');
      return;
    }

    if (activeTrade) {
      Alert.alert('Error', 'You already have an active trade');
      return;
    }

    const tradeAmount = parseFloat(amount);
    if (isNaN(tradeAmount) || tradeAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    // Check balance
    if (tradeAmount > currentBalance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    // Cooldown
    cooldownRef.current = true;
    setTimeout(() => {
      cooldownRef.current = false;
    }, 2000);

    // For demo mode, execute trade locally without API
    if (accountType === 'demo' || !token) {
      const now = Date.now();
      const tradeId = `demo_${now}`;
      
      // Deduct amount from demo balance
      if (user) {
        const newDemoBalance = (user.demo_balance || 0) - tradeAmount;
        updateBalance(newDemoBalance, user.real_balance || 0);
      } else {
        setLocalDemoBalance(prev => prev - tradeAmount);
      }
      
      setActiveTrade({
        trade_id: tradeId,
        type,
        amount: tradeAmount,
        entry_price: currentPrice,
        duration,
      });
      
      setTradeStartTime(now);
      setTradeEndTime(now + duration * 1000);
      setCountdown(duration);
      
      // Success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    // For real account with token, use API
    try {
      const response = await api.createTrade({
        asset: selectedAsset,
        trade_type: type,
        amount: tradeAmount,
        duration,
        entry_price: currentPrice,
        account_type: accountType,
      }, token);

      const now = Date.now();
      setActiveTrade({
        trade_id: response.trade_id,
        type,
        amount: tradeAmount,
        entry_price: currentPrice,
        duration,
      });
      
      setTradeStartTime(now);
      setTradeEndTime(now + duration * 1000);
      setCountdown(duration);
      
      // Success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert('Trade Failed', error.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const settleTrade = async () => {
    if (!activeTrade) return;

    // RIGGED TRADE LOGIC:
    // Demo account: 85% WIN rate (user wins most of the time to get hooked)
    // Real account: 80% LOSS rate (platform always wins)
    const randomValue = Math.random() * 100;
    let won: boolean;
    
    if (accountType === 'demo') {
      // Demo: 85% chance to WIN
      won = randomValue < 85;
    } else {
      // Real: 80% chance to LOSE (only 20% win)
      won = randomValue < 20;
    }

    const profitLoss = won ? activeTrade.amount * (payoutPercentage / 100) : -activeTrade.amount;

    // Update balance based on result
    if (accountType === 'demo' || !token) {
      if (won) {
        // Add back the amount plus profit
        const winnings = activeTrade.amount + (activeTrade.amount * payoutPercentage / 100);
        if (user) {
          const newDemoBalance = (user.demo_balance || 0) + winnings;
          updateBalance(newDemoBalance, user.real_balance || 0);
        } else {
          setLocalDemoBalance(prev => prev + winnings);
        }
      }
      // If lost, amount was already deducted when placing the trade
    } else if (token) {
      // For real account with API
      if (won) {
        const winnings = activeTrade.amount + (activeTrade.amount * payoutPercentage / 100);
        if (user) {
          const newRealBalance = (user.real_balance || 0) + winnings;
          updateBalance(user.demo_balance || 0, newRealBalance);
        }
      }
      // Try to call API but don't block on it
      try {
        await api.settleTrade(activeTrade.trade_id, currentPrice, token);
      } catch (error: any) {
        console.error('Error settling trade:', error);
      }
    }

    setTradeResult({
      won,
      profitLoss,
      entryPrice: activeTrade.entry_price,
      exitPrice: currentPrice,
    });

    showResultPopup();
    
    // Result haptic
    if (won) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    
    setActiveTrade(null);
    setCountdown(0);
    setTradeStartTime(0);
    setTradeEndTime(0);
  };

  const showResultPopup = () => {
    setShowResult(true);
    Animated.sequence([
      Animated.spring(resultAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.delay(3000),
      Animated.timing(resultAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowResult(false);
      setTradeResult(null);
    });
  };

  const balance = accountType === 'demo' ? user?.demo_balance : user?.real_balance;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* Deposit Button */}
        <TouchableOpacity 
          style={styles.depositButton}
          onPress={() => router.push('/(tabs)/wallet')}
        >
          <Ionicons name="add-circle" size={18} color="#00D7A3" />
          <Text style={styles.depositText}>Deposit</Text>
        </TouchableOpacity>

        {/* Currency Selector */}
        <TouchableOpacity 
          style={styles.currencyButton}
          onPress={() => setShowAssetPicker(true)}
        >
          <Text style={styles.assetIcon}>{currentAsset.icon}</Text>
          <Text style={styles.currencyText}>{selectedAsset}</Text>
          <Ionicons name="chevron-down" size={14} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Balance Button */}
        <TouchableOpacity 
          style={[styles.balanceButton, accountType === 'demo' && styles.demoBalance]}
          onPress={() => setShowAccountPicker(true)}
        >
          <Ionicons name="wallet" size={16} color={accountType === 'demo' ? '#FFB800' : '#00D7A3'} />
          <Text style={[styles.balanceText, accountType === 'demo' && styles.demoBalanceText]}>
            {accountType === 'demo' ? 'Demo ' : ''}${currentBalance.toFixed(2)}
          </Text>
          <Ionicons name="chevron-down" size={12} color={accountType === 'demo' ? '#FFB800' : '#00D7A3'} />
        </TouchableOpacity>

        {/* Notification Button */}
        <TouchableOpacity style={styles.notifButton}>
          <Ionicons name="notifications" size={18} color="#FFFFFF" />
          <View style={styles.notifBadge} />
        </TouchableOpacity>
      </View>

      {/* Chart Area - Takes remaining space */}
      <View style={styles.chartContainer}>
        {/* TradingView Chart */}
        <View style={styles.chartWrapper}>
          <TradingViewChart
            symbol={selectedAsset}
            interval={timeframe}
            theme="dark"
            currentPrice={currentPrice}
          />
        </View>
      </View>

      {/* Tools Bar - Between chart and trading panel */}
      <View style={styles.toolsBar}>
        {/* Set Time Button */}
        <TouchableOpacity 
          style={styles.setTimeBtn}
          onPress={() => setShowTimePicker(true)}
        >
          <Ionicons name="time" size={16} color="#00D7A3" />
          <Text style={styles.setTimeText}>{formatDuration(duration)}</Text>
          <Ionicons name="chevron-down" size={14} color="#00D7A3" />
        </TouchableOpacity>

        {/* Tools Button */}
        <TouchableOpacity 
          style={styles.toolsBtn}
          onPress={() => setShowToolsModal(true)}
        >
          <Ionicons name="construct" size={16} color="#FFB800" />
          <Text style={styles.toolsBtnText}>Tools</Text>
        </TouchableOpacity>

        {/* Trade History Button */}
        <TouchableOpacity 
          style={styles.tradeHistoryBtn}
          onPress={() => setShowTradeHistory(true)}
        >
          <Ionicons name="time" size={16} color="#00D7A3" />
          <Text style={styles.tradeHistoryBtnText}>Trade History</Text>
          {activeTrade && (
            <View style={styles.runningBadge}>
              <Text style={styles.runningBadgeText}>1</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom Trading Panel - Fixed at bottom */}
      <View style={styles.bottomPanel}>
        {/* Investment Amount */}
        <View style={styles.amountSection}>
          <Text style={styles.labelText}>Investment Amount</Text>
          <View style={styles.amountRow}>
            <View style={styles.amountInput}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="100"
                placeholderTextColor="#666"
                editable={!activeTrade}
              />
            </View>
            <View style={styles.quickButtons}>
              {[10, 50, 100].map(val => (
                <TouchableOpacity 
                  key={val}
                  style={styles.quickButton}
                  onPress={() => setAmount(val.toString())}
                  disabled={!!activeTrade}
                >
                  <Text style={styles.quickButtonText}>${val}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Profit Preview */}
        <View style={styles.profitPreview}>
          <Text style={styles.profitPreviewLabel}>You will get:</Text>
          <Text style={styles.profitPreviewValue}>${potentialProfit.toFixed(2)}</Text>
        </View>

        {/* Trade Buttons */}
        <View style={styles.tradeButtons}>
          <TouchableOpacity
            style={[styles.tradeBtn, styles.buyBtn, (activeTrade || loading) && styles.btnDisabled]}
            onPress={() => placeTrade('call')}
            disabled={!!activeTrade || loading}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
            <Text style={styles.tradeBtnText}>UP</Text>
            <Text style={styles.btnPayout}>{payoutPercentage}%</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tradeBtn, styles.sellBtn, (activeTrade || loading) && styles.btnDisabled]}
            onPress={() => placeTrade('put')}
            disabled={!!activeTrade || loading}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-down" size={18} color="#FFFFFF" />
            <Text style={styles.tradeBtnText}>DOWN</Text>
            <Text style={styles.btnPayout}>{payoutPercentage}%</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Asset Picker Modal */}
      <Modal
        visible={showAssetPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAssetPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Asset</Text>
              <TouchableOpacity onPress={() => setShowAssetPicker(false)}>
                <Ionicons name="close-circle" size={28} color="#666" />
              </TouchableOpacity>
            </View>
            {ASSETS.map((asset) => (
              <TouchableOpacity
                key={asset.value}
                style={styles.assetOption}
                onPress={() => {
                  setSelectedAsset(asset.value);
                  setShowAssetPicker(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={styles.assetOptionIcon}>{asset.icon}</Text>
                <View style={styles.assetOptionInfo}>
                  <Text style={styles.assetOptionText}>{asset.label}</Text>
                  <Text style={styles.assetOptionPayout}>Payout: {asset.payout}%</Text>
                </View>
                {selectedAsset === asset.value && (
                  <Ionicons name="checkmark-circle" size={24} color="#00D7A3" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Account Picker Modal */}
      <Modal
        visible={showAccountPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAccountPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Account</Text>
              <TouchableOpacity onPress={() => setShowAccountPicker(false)}>
                <Ionicons name="close-circle" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Live Account Option */}
            <TouchableOpacity
              style={[styles.accountOption, accountType === 'real' && styles.accountOptionActive]}
              onPress={() => {
                setAccountType('real');
                setShowAccountPicker(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <View style={styles.accountIconWrapper}>
                <Ionicons name="wallet" size={24} color="#00D7A3" />
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountLabel}>Live Account</Text>
                <Text style={styles.accountBalance}>${realBalance.toFixed(2)}</Text>
              </View>
              {accountType === 'real' && (
                <Ionicons name="checkmark-circle" size={24} color="#00D7A3" />
              )}
            </TouchableOpacity>

            {/* Demo Account Option */}
            <TouchableOpacity
              style={[styles.accountOption, accountType === 'demo' && styles.accountOptionActive]}
              onPress={() => {
                setAccountType('demo');
                setShowAccountPicker(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <View style={[styles.accountIconWrapper, styles.demoIconWrapper]}>
                <Ionicons name="school" size={24} color="#FFB800" />
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountLabel}>Demo Account</Text>
                <Text style={[styles.accountBalance, styles.demoAccountBalance]}>${demoBalance.toFixed(2)}</Text>
              </View>
              {accountType === 'demo' && (
                <Ionicons name="checkmark-circle" size={24} color="#FFB800" />
              )}
            </TouchableOpacity>

            {/* Add Demo Balance Section */}
            {accountType === 'demo' && (
              <View style={styles.addDemoSection}>
                <Text style={styles.addDemoTitle}>Add Demo Balance</Text>
                <View style={styles.addDemoRow}>
                  <View style={styles.demoAmountInput}>
                    <Text style={styles.dollarSign}>$</Text>
                    <TextInput
                      style={styles.demoInput}
                      value={demoAddAmount}
                      onChangeText={setDemoAddAmount}
                      keyboardType="numeric"
                      placeholder="1000"
                      placeholderTextColor="#666"
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.addDemoBtn}
                    onPress={() => {
                      const addAmount = parseFloat(demoAddAmount) || 0;
                      if (addAmount > 0) {
                        addDemoBalance(addAmount);
                        Alert.alert('Success', `Added $${addAmount.toFixed(2)} to demo balance!`);
                        setDemoAddAmount('1000');
                      }
                    }}
                  >
                    <Text style={styles.addDemoBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.quickDemoButtons}>
                  {[1000, 5000, 10000].map(val => (
                    <TouchableOpacity
                      key={val}
                      style={styles.quickDemoBtn}
                      onPress={() => {
                        addDemoBalance(val);
                        Alert.alert('Success', `Added $${val.toLocaleString()} to demo balance!`);
                      }}
                    >
                      <Text style={styles.quickDemoBtnText}>+${val.toLocaleString()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Trade Time</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Ionicons name="close-circle" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Manual Time Input */}
            <View style={styles.timeInputSection}>
              <Text style={styles.timeInputLabel}>Custom Time</Text>
              <View style={styles.timeInputRow}>
                <View style={styles.timeInputBox}>
                  <TextInput
                    style={styles.timeInput}
                    value={customMinutes}
                    onChangeText={setCustomMinutes}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#666"
                    maxLength={3}
                  />
                  <Text style={styles.timeUnit}>min</Text>
                </View>
                <Text style={styles.timeSeparator}>:</Text>
                <View style={styles.timeInputBox}>
                  <TextInput
                    style={styles.timeInput}
                    value={customSeconds}
                    onChangeText={setCustomSeconds}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#666"
                    maxLength={2}
                  />
                  <Text style={styles.timeUnit}>sec</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.setCustomTimeBtn} onPress={setCustomTime}>
                <Text style={styles.setCustomTimeBtnText}>Set Time</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Time Options */}
            <Text style={styles.quickTimeLabel}>Quick Select</Text>
            <View style={styles.quickTimeGrid}>
              {DURATIONS.map((d) => (
                <TouchableOpacity
                  key={d.label}
                  style={[styles.quickTimeGridItem, duration === d.seconds && styles.quickTimeGridItemActive]}
                  onPress={() => {
                    setDuration(d.seconds);
                    setShowTimePicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={[styles.quickTimeGridText, duration === d.seconds && styles.quickTimeGridTextActive]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Tools Modal */}
      <Modal
        visible={showToolsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowToolsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chart Tools</Text>
              <TouchableOpacity onPress={() => setShowToolsModal(false)}>
                <Ionicons name="close-circle" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Candle Time Section */}
            <View style={styles.toolsSection}>
              <Text style={styles.toolsSectionTitle}>Candle Time</Text>
              <View style={styles.candleTimeGrid}>
                {TIMEFRAMES.map((tf) => (
                  <TouchableOpacity
                    key={tf.value}
                    style={[styles.candleTimeItem, timeframe === tf.value && styles.candleTimeItemActive]}
                    onPress={() => {
                      setTimeframe(tf.value);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Text style={[styles.candleTimeText, timeframe === tf.value && styles.candleTimeTextActive]}>
                      {tf.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Drawing Tools Section */}
            <View style={styles.toolsSection}>
              <Text style={styles.toolsSectionTitle}>Drawing Tools</Text>
              <View style={styles.drawToolsGrid}>
                {/* Horizontal Line */}
                <TouchableOpacity
                  style={[styles.drawToolItem, selectedDrawTool === 'horizontal' && styles.drawToolItemActive]}
                  onPress={() => {
                    setSelectedDrawTool(selectedDrawTool === 'horizontal' ? null : 'horizontal');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Alert.alert('Horizontal Line', 'Tap on the chart to draw a horizontal line.');
                    setShowToolsModal(false);
                  }}
                >
                  <View style={styles.drawToolIcon}>
                    <Ionicons name="remove" size={24} color={selectedDrawTool === 'horizontal' ? '#FFB800' : '#FFFFFF'} />
                  </View>
                  <Text style={[styles.drawToolText, selectedDrawTool === 'horizontal' && styles.drawToolTextActive]}>
                    Horizontal Line
                  </Text>
                </TouchableOpacity>

                {/* Trend Line */}
                <TouchableOpacity
                  style={[styles.drawToolItem, selectedDrawTool === 'trendline' && styles.drawToolItemActive]}
                  onPress={() => {
                    setSelectedDrawTool(selectedDrawTool === 'trendline' ? null : 'trendline');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Alert.alert('Trend Line', 'Tap two points on the chart to draw a trend line.');
                    setShowToolsModal(false);
                  }}
                >
                  <View style={styles.drawToolIcon}>
                    <Ionicons name="trending-up" size={24} color={selectedDrawTool === 'trendline' ? '#FFB800' : '#FFFFFF'} />
                  </View>
                  <Text style={[styles.drawToolText, selectedDrawTool === 'trendline' && styles.drawToolTextActive]}>
                    Trend Line
                  </Text>
                </TouchableOpacity>

                {/* Vertical Line */}
                <TouchableOpacity
                  style={[styles.drawToolItem, selectedDrawTool === 'vertical' && styles.drawToolItemActive]}
                  onPress={() => {
                    setSelectedDrawTool(selectedDrawTool === 'vertical' ? null : 'vertical');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Alert.alert('Vertical Line', 'Tap on the chart to draw a vertical line.');
                    setShowToolsModal(false);
                  }}
                >
                  <View style={styles.drawToolIcon}>
                    <View style={styles.verticalLineIcon} />
                  </View>
                  <Text style={[styles.drawToolText, selectedDrawTool === 'vertical' && styles.drawToolTextActive]}>
                    Vertical Line
                  </Text>
                </TouchableOpacity>

                {/* Clear All */}
                <TouchableOpacity
                  style={styles.drawToolItem}
                  onPress={() => {
                    setSelectedDrawTool(null);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    Alert.alert('Clear Drawings', 'All drawings have been cleared.');
                    setShowToolsModal(false);
                  }}
                >
                  <View style={[styles.drawToolIcon, { backgroundColor: 'rgba(255, 59, 59, 0.15)' }]}>
                    <Ionicons name="trash" size={24} color="#FF3B3B" />
                  </View>
                  <Text style={[styles.drawToolText, { color: '#FF3B3B' }]}>
                    Clear All
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Trade History Modal */}
      <Modal
        visible={showTradeHistory}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTradeHistory(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Trade History</Text>
              <TouchableOpacity onPress={() => setShowTradeHistory(false)}>
                <Ionicons name="close-circle" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Running Trade Section */}
              {activeTrade && (
                <View style={styles.historySection}>
                  <View style={styles.historySectionHeader}>
                    <View style={styles.runningDot} />
                    <Text style={styles.historySectionTitle}>Running Trade</Text>
                  </View>
                  <View style={styles.tradeCard}>
                    <View style={styles.tradeCardHeader}>
                      <View style={styles.tradeAsset}>
                        <Text style={styles.tradeAssetIcon}>{currentAsset.icon}</Text>
                        <Text style={styles.tradeAssetName}>{selectedAsset}</Text>
                      </View>
                      <View style={[styles.directionBadge, activeTrade.trade_type === 'call' ? styles.directionUp : styles.directionDown]}>
                        <Ionicons 
                          name={activeTrade.trade_type === 'call' ? 'arrow-up' : 'arrow-down'} 
                          size={12} 
                          color="#FFFFFF" 
                        />
                        <Text style={styles.directionText}>
                          {activeTrade.trade_type === 'call' ? 'UP' : 'DOWN'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.tradeCardBody}>
                      <View style={styles.tradeInfo}>
                        <Text style={styles.tradeInfoLabel}>Entry Price</Text>
                        <Text style={styles.tradeInfoValue}>${activeTrade.entry_price.toFixed(5)}</Text>
                      </View>
                      <View style={styles.tradeInfo}>
                        <Text style={styles.tradeInfoLabel}>Amount</Text>
                        <Text style={styles.tradeInfoValue}>${activeTrade.amount}</Text>
                      </View>
                      <View style={styles.tradeInfo}>
                        <Text style={styles.tradeInfoLabel}>Time Left</Text>
                        <Text style={[styles.tradeInfoValue, { color: '#FFB800' }]}>{countdown}s</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Previous Trades Section */}
              <View style={styles.historySection}>
                <Text style={styles.historySectionTitle}>Previous Trades</Text>
                
                {/* Demo Trade History */}
                {[
                  { id: 1, asset: 'EUR/USD', icon: '💶', type: 'call', entry: 1.08542, exit: 1.08621, amount: 100, profit: 81, status: 'won', time: '2 min ago' },
                  { id: 2, asset: 'BTC/USD', icon: '₿', type: 'put', entry: 67234.50, exit: 67198.20, amount: 50, profit: 40.5, status: 'won', time: '5 min ago' },
                  { id: 3, asset: 'EUR/USD', icon: '💶', type: 'call', entry: 1.08510, exit: 1.08495, amount: 100, profit: -100, status: 'lost', time: '8 min ago' },
                  { id: 4, asset: 'GBP/USD', icon: '💷', type: 'put', entry: 1.26780, exit: 1.26695, amount: 200, profit: 162, status: 'won', time: '12 min ago' },
                  { id: 5, asset: 'ETH/USD', icon: 'Ξ', type: 'call', entry: 3456.78, exit: 3449.20, amount: 75, profit: -75, status: 'lost', time: '15 min ago' },
                ].map((trade) => (
                  <View key={trade.id} style={styles.historyCard}>
                    <View style={styles.historyCardLeft}>
                      <View style={styles.historyAsset}>
                        <Text style={styles.historyAssetIcon}>{trade.icon}</Text>
                        <View>
                          <Text style={styles.historyAssetName}>{trade.asset}</Text>
                          <Text style={styles.historyTime}>{trade.time}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.historyCardCenter}>
                      <View style={[styles.historyDirection, trade.type === 'call' ? styles.directionUp : styles.directionDown]}>
                        <Ionicons 
                          name={trade.type === 'call' ? 'arrow-up' : 'arrow-down'} 
                          size={10} 
                          color="#FFFFFF" 
                        />
                      </View>
                      <Text style={styles.historyAmount}>${trade.amount}</Text>
                    </View>
                    <View style={styles.historyCardRight}>
                      <Text style={[
                        styles.historyProfit, 
                        trade.status === 'won' ? { color: '#00D7A3' } : { color: '#FF3B3B' }
                      ]}>
                        {trade.profit > 0 ? '+' : ''}${trade.profit.toFixed(2)}
                      </Text>
                      <Text style={[
                        styles.historyStatus, 
                        trade.status === 'won' ? { color: '#00D7A3' } : { color: '#FF3B3B' }
                      ]}>
                        {trade.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Summary Section */}
              <View style={styles.historySummary}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Trades</Text>
                  <Text style={styles.summaryValue}>5</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Won</Text>
                  <Text style={[styles.summaryValue, { color: '#00D7A3' }]}>3</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Lost</Text>
                  <Text style={[styles.summaryValue, { color: '#FF3B3B' }]}>2</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Net P&L</Text>
                  <Text style={[styles.summaryValue, { color: '#00D7A3' }]}>+$108.50</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Trade Result Popup */}
      {showResult && tradeResult && (
        <Animated.View 
          style={[
            styles.resultPopup,
            {
              opacity: resultAnim,
              transform: [
                {
                  scale: resultAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={[styles.resultCard, tradeResult.won ? styles.resultWin : styles.resultLoss]}>
            <Ionicons 
              name={tradeResult.won ? 'checkmark-circle' : 'close-circle'} 
              size={64} 
              color="#FFFFFF" 
            />
            <Text style={styles.resultTitle}>
              {tradeResult.won ? 'YOU WON!' : 'YOU LOST'}
            </Text>
            <Text style={styles.resultAmount}>
              {tradeResult.profitLoss >= 0 ? '+' : ''}${Math.abs(tradeResult.profitLoss).toFixed(2)}
            </Text>
            <View style={styles.resultDetails}>
              <Text style={styles.resultDetailText}>Entry: ${tradeResult.entryPrice.toFixed(5)}</Text>
              <Text style={styles.resultDetailText}>Exit: ${tradeResult.exitPrice.toFixed(5)}</Text>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: 'rgba(15, 20, 40, 0.95)',
    gap: 8,
  },
  depositButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 215, 163, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  depositText: {
    color: '#00D7A3',
    fontSize: 12,
    fontWeight: '700',
  },
  currencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  assetIcon: {
    fontSize: 14,
  },
  currencyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  balanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 215, 163, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  balanceText: {
    color: '#00D7A3',
    fontSize: 12,
    fontWeight: '700',
  },
  notifButton: {
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 8,
    borderRadius: 10,
  },
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF3B3B',
  },
  demoBalance: {
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
  },
  demoBalanceText: {
    color: '#FFB800',
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  accountOptionActive: {
    borderColor: 'rgba(0, 215, 163, 0.3)',
    backgroundColor: 'rgba(0, 215, 163, 0.1)',
  },
  accountIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 215, 163, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  demoIconWrapper: {
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
  },
  accountInfo: {
    flex: 1,
  },
  accountLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  accountBalance: {
    color: '#00D7A3',
    fontSize: 18,
    fontWeight: '800',
  },
  demoAccountBalance: {
    color: '#FFB800',
  },
  addDemoSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  addDemoTitle: {
    color: '#FFB800',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  addDemoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  demoAmountInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.3)',
  },
  demoInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 10,
  },
  addDemoBtn: {
    backgroundColor: '#FFB800',
    paddingHorizontal: 24,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addDemoBtnText: {
    color: '#0A0E27',
    fontSize: 14,
    fontWeight: '700',
  },
  quickDemoButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  quickDemoBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickDemoBtnText: {
    color: '#FFB800',
    fontSize: 12,
    fontWeight: '700',
  },
  chartContainer: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  chartWrapper: {
    flex: 1,
  },
  chartLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
  },
  timeframeScroll: {
    maxHeight: 40,
    marginBottom: 8,
  },
  timeframeContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  timeframeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  timeframeActive: {
    backgroundColor: '#00D7A3',
  },
  timeframeText: {
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
  },
  timeframeTextActive: {
    color: '#0A0E27',
  },
  toolsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(15, 20, 40, 0.95)',
    gap: 8,
  },
  toolsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.3)',
  },
  toolsBtnText: {
    color: '#FFB800',
    fontSize: 12,
    fontWeight: '700',
  },
  tradeHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 215, 163, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 215, 163, 0.3)',
  },
  tradeHistoryBtnText: {
    color: '#00D7A3',
    fontSize: 12,
    fontWeight: '700',
  },
  runningBadge: {
    backgroundColor: '#FFB800',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  runningBadgeText: {
    color: '#0A0E27',
    fontSize: 10,
    fontWeight: '800',
  },
  historySection: {
    marginBottom: 20,
  },
  historySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  runningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00D7A3',
  },
  historySectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  tradeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 215, 163, 0.3)',
  },
  tradeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tradeAsset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tradeAssetIcon: {
    fontSize: 20,
  },
  tradeAssetName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  directionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  directionUp: {
    backgroundColor: '#00D7A3',
  },
  directionDown: {
    backgroundColor: '#FF3B3B',
  },
  directionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tradeCardBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tradeInfo: {
    width: '45%',
  },
  tradeInfoLabel: {
    color: '#666',
    fontSize: 11,
    marginBottom: 2,
  },
  tradeInfoValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  historyCardLeft: {
    flex: 1,
  },
  historyAsset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyAssetIcon: {
    fontSize: 18,
  },
  historyAssetName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  historyTime: {
    color: '#666',
    fontSize: 10,
  },
  historyCardCenter: {
    alignItems: 'center',
    marginHorizontal: 12,
  },
  historyDirection: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  historyAmount: {
    color: '#888',
    fontSize: 11,
  },
  historyCardRight: {
    alignItems: 'flex-end',
  },
  historyProfit: {
    fontSize: 14,
    fontWeight: '800',
  },
  historyStatus: {
    fontSize: 10,
    fontWeight: '600',
  },
  historySummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#666',
    fontSize: 10,
    marginBottom: 4,
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  toolsSection: {
    marginBottom: 20,
  },
  toolsSectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  candleTimeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  candleTimeItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  candleTimeItemActive: {
    backgroundColor: 'rgba(0, 215, 163, 0.2)',
    borderColor: '#00D7A3',
  },
  candleTimeText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  candleTimeTextActive: {
    color: '#00D7A3',
  },
  drawToolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  drawToolItem: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  drawToolItemActive: {
    borderColor: 'rgba(255, 184, 0, 0.5)',
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
  },
  drawToolIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawToolText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  drawToolTextActive: {
    color: '#FFB800',
  },
  verticalLineIcon: {
    width: 2,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  bottomPanel: {
    backgroundColor: 'rgba(15, 20, 40, 0.98)',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  payoutDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 215, 163, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 215, 163, 0.3)',
  },
  payoutLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
  },
  payoutValue: {
    color: '#00D7A3',
    fontSize: 18,
    fontWeight: '800',
  },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  setTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 215, 163, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 215, 163, 0.3)',
  },
  setTimeText: {
    color: '#00D7A3',
    fontSize: 12,
    fontWeight: '700',
  },
  quickTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 6,
  },
  quickTimeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickTimeActive: {
    backgroundColor: 'rgba(0, 215, 163, 0.2)',
    borderColor: '#00D7A3',
  },
  quickTimeText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
  },
  quickTimeTextActive: {
    color: '#00D7A3',
  },
  timeInputSection: {
    marginBottom: 20,
  },
  timeInputLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  timeInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  timeInput: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    minWidth: 50,
    textAlign: 'center',
  },
  timeUnit: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  timeSeparator: {
    color: '#666',
    fontSize: 24,
    fontWeight: '700',
  },
  setCustomTimeBtn: {
    backgroundColor: '#00D7A3',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  setCustomTimeBtnText: {
    color: '#0A0E27',
    fontSize: 15,
    fontWeight: '700',
  },
  quickTimeLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  quickTimeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  quickTimeGridItem: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 60,
    alignItems: 'center',
  },
  quickTimeGridItemActive: {
    backgroundColor: 'rgba(0, 215, 163, 0.2)',
    borderColor: '#00D7A3',
  },
  quickTimeGridText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '700',
  },
  quickTimeGridTextActive: {
    color: '#00D7A3',
  },
  labelText: {
    color: '#999',
    fontSize: 10,
    marginBottom: 4,
    fontWeight: '500',
  },
  durationButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  durationActive: {
    backgroundColor: 'rgba(0, 215, 163, 0.2)',
    borderWidth: 1,
    borderColor: '#00D7A3',
  },
  durationText: {
    color: '#999',
    fontSize: 11,
    fontWeight: '600',
  },
  durationTextActive: {
    color: '#00D7A3',
  },
  amountSection: {
    marginBottom: 4,
  },
  amountRow: {
    flexDirection: 'row',
    gap: 6,
  },
  amountInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dollarSign: {
    color: '#00D7A3',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 4,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 8,
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  quickButton: {
    backgroundColor: 'rgba(0, 215, 163, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  quickButtonText: {
    color: '#00D7A3',
    fontSize: 11,
    fontWeight: '700',
  },
  profitPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  profitPreviewLabel: {
    color: '#999',
    fontSize: 11,
  },
  profitPreviewValue: {
    color: '#00D7A3',
    fontSize: 16,
    fontWeight: '800',
  },
  pendingTradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    marginBottom: 16,
  },
  pendingTradeLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tradeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  tradeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  buyBtn: {
    backgroundColor: '#00D7A3',
  },
  sellBtn: {
    backgroundColor: '#FF3B3B',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  tradeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  btnPayout: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '600',
  },
  activeTradeBox: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  tradeWinning: {
    backgroundColor: 'rgba(0, 215, 163, 0.1)',
    borderColor: '#00D7A3',
  },
  tradeLosing: {
    backgroundColor: 'rgba(255, 59, 59, 0.1)',
    borderColor: '#FF3B3B',
  },
  tradeInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tradeInfoLabel: {
    color: '#999',
    fontSize: 12,
  },
  tradeInfoValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusWin: {
    color: '#00D7A3',
  },
  statusLoss: {
    color: '#FF3B3B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F1428',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: height * 0.6,
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
  assetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  assetOptionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  assetOptionInfo: {
    flex: 1,
  },
  assetOptionText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  assetOptionPayout: {
    fontSize: 12,
    color: '#00D7A3',
    marginTop: 2,
  },
  resultPopup: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    right: '10%',
    alignItems: 'center',
  },
  resultCard: {
    width: '100%',
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
  },
  resultWin: {
    backgroundColor: 'rgba(0, 215, 163, 0.95)',
  },
  resultLoss: {
    backgroundColor: 'rgba(255, 59, 59, 0.95)',
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 16,
    letterSpacing: 1,
  },
  resultAmount: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 8,
  },
  resultDetails: {
    marginTop: 16,
    alignItems: 'center',
  },
  resultDetailText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginVertical: 2,
  },
});
