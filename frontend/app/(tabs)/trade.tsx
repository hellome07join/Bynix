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
  { label: '30s', seconds: 30 },
  { label: '1m', seconds: 60 },
  { label: '5m', seconds: 300 },
];

const ASSETS = [
  { label: 'EUR/USD', value: 'EUR/USD', icon: '🇪🇺🇺🇸', payout: 81 },
  { label: 'BTC/USD', value: 'BTC/USD', icon: '₿', payout: 85 },
  { label: 'ETH/USD', value: 'ETH/USD', icon: 'Ξ', payout: 83 },
  { label: 'GBP/USD', value: 'GBP/USD', icon: '🇬🇧🇺🇸', payout: 80 },
];

export default function Trade() {
  const router = useRouter();
  const { user, token, accountType } = useAuthStore();
  
  // Market data
  const [selectedAsset, setSelectedAsset] = useState('EUR/USD');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState(1.09);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'live' | 'reconnecting'>('live');
  
  // Trading
  const [amount, setAmount] = useState('100');
  const [timeframe, setTimeframe] = useState('1m');
  const [duration, setDuration] = useState(60);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [pendingTradeMode, setPendingTradeMode] = useState(false);
  
  // Active trade
  const [activeTrade, setActiveTrade] = useState<any>(null);
  const [countdown, setCountdown] = useState(0);
  const [tradeEntry, setTradeEntry] = useState<any>(null);
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
    setConnectionStatus('reconnecting');
    try {
      const historical = await fetchHistoricalCandles(selectedAsset, '1m', 50);
      if (historical.length > 0) {
        setCandles(historical);
        setCurrentPrice(historical[historical.length - 1].close);
        setConnectionStatus('live');
      }
      setLoading(false);

      // Simulate real-time updates
      const updateInterval = setInterval(() => {
        setCandles(prev => {
          if (prev.length === 0) return prev;
          
          const lastCandle = prev[prev.length - 1];
          const basePrice = lastCandle.close;
          const change = (Math.random() - 0.5) * (basePrice * 0.005);
          
          const newCandle = {
            time: Date.now(),
            open: lastCandle.close,
            high: Math.max(lastCandle.close, lastCandle.close + change) + Math.random() * (basePrice * 0.002),
            low: Math.min(lastCandle.close, lastCandle.close + change) - Math.random() * (basePrice * 0.002),
            close: lastCandle.close + change,
            volume: Math.random() * 1000,
          };
          
          const updated = [...prev, newCandle];
          if (updated.length > 50) {
            updated.shift();
          }
          
          setCurrentPrice(newCandle.close);
          return updated;
        });
      }, 1000);

      wsRef.current = { disconnect: () => clearInterval(updateInterval) };
      
    } catch (error) {
      console.error('Error loading market data:', error);
      setLoading(false);
      setConnectionStatus('reconnecting');
    }
  };

  const placeTrade = async (type: 'call' | 'put') => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (cooldownRef.current) {
      Alert.alert('Please wait', 'Cooldown active');
      return;
    }

    if (!token) {
      Alert.alert('Error', 'Please login to trade');
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

    const balance = accountType === 'demo' ? user?.demo_balance : user?.real_balance;
    if (balance && tradeAmount > balance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    // Cooldown
    cooldownRef.current = true;
    setTimeout(() => {
      cooldownRef.current = false;
    }, 2000);

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
      
      setTradeEntry({
        price: currentPrice,
        time: now,
        type,
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
    if (!activeTrade || !token) return;

    try {
      const exitPrice = currentPrice;
      await api.settleTrade(activeTrade.trade_id, exitPrice, token);

      const won = activeTrade.type === 'call' 
        ? exitPrice > activeTrade.entry_price 
        : exitPrice < activeTrade.entry_price;

      const profitLoss = won ? activeTrade.amount * (payoutPercentage / 100) : -activeTrade.amount;

      setTradeResult({
        won,
        profitLoss,
        entryPrice: activeTrade.entry_price,
        exitPrice,
      });

      showResultPopup();
      
      // Result haptic
      if (won) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      
      setActiveTrade(null);
      setTradeEntry(null);
      setCountdown(0);
      setTradeStartTime(0);
      setTradeEndTime(0);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
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
  const priceChange = candles.length >= 2 
    ? ((currentPrice - candles[candles.length - 2].close) / candles[candles.length - 2].close) * 100
    : 0;
  
  // Determine if currently winning
  const isWinning = activeTrade 
    ? (activeTrade.type === 'call' ? currentPrice > activeTrade.entry_price : currentPrice < activeTrade.entry_price)
    : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* Deposit Button */}
        <TouchableOpacity 
          style={styles.depositButton}
          onPress={() => router.push('/(tabs)/wallet')}
        >
          <Ionicons name="add-circle" size={20} color="#00D7A3" />
          <Text style={styles.depositText}>Deposit</Text>
        </TouchableOpacity>

        {/* Center - Asset & Price */}
        <View style={styles.centerSection}>
          <TouchableOpacity 
            style={styles.assetButton}
            onPress={() => setShowAssetPicker(true)}
          >
            <Text style={styles.assetIcon}>{currentAsset.icon}</Text>
            <Text style={styles.assetText}>{selectedAsset}</Text>
            <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.priceDisplay}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <Text style={styles.currentPrice}>${currentPrice.toFixed(5)}</Text>
            <View style={[styles.priceChangeBadge, priceChange >= 0 ? styles.priceUp : styles.priceDown]}>
              <Ionicons 
                name={priceChange >= 0 ? 'arrow-up' : 'arrow-down'} 
                size={10} 
                color={priceChange >= 0 ? '#00D7A3' : '#FF3B3B'} 
              />
              <Text style={styles.priceChangeText}>
                {Math.abs(priceChange).toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Right - Balance & Notifications */}
        <View style={styles.rightSection}>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications" size={20} color="#FFFFFF" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
          <View style={styles.balanceChip}>
            <Text style={styles.balanceValue}>${balance?.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartWrapper}>
        {loading ? (
          <View style={styles.chartLoading}>
            <Text style={styles.loadingText}>Loading chart...</Text>
          </View>
        ) : (
          <EnhancedCandlestickChart
            candles={candles}
            currentPrice={currentPrice}
            tradeEntry={tradeEntry}
            countdown={countdown}
            tradeStartTime={tradeStartTime}
            tradeEndTime={tradeEndTime}
            isWinning={isWinning}
          />
        )}
      </View>

      {/* Timeframe Selector */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.timeframeScroll}
        contentContainerStyle={styles.timeframeContent}
      >
        {TIMEFRAMES.map((tf) => (
          <TouchableOpacity
            key={tf.value}
            style={[styles.timeframeChip, timeframe === tf.value && styles.timeframeActive]}
            onPress={() => setTimeframe(tf.value)}
          >
            <Text style={[styles.timeframeText, timeframe === tf.value && styles.timeframeTextActive]}>
              {tf.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Trading Panel */}
      <ScrollView style={styles.tradingPanel}>
        {/* Payout Display */}
        <View style={styles.payoutDisplay}>
          <Text style={styles.payoutLabel}>Payout</Text>
          <Text style={styles.payoutValue}>{payoutPercentage}%</Text>
        </View>

        {/* Duration Selector */}
        <View style={styles.durationRow}>
          <Text style={styles.labelText}>Duration</Text>
          <View style={styles.durationButtons}>
            {DURATIONS.map((d) => (
              <TouchableOpacity
                key={d.label}
                style={[styles.durationChip, duration === d.seconds && styles.durationActive]}
                onPress={() => setDuration(d.seconds)}
              >
                <Text style={[styles.durationText, duration === d.seconds && styles.durationTextActive]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

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

        {/* Pending Trade Toggle */}
        <View style={styles.pendingTradeRow}>
          <Text style={styles.pendingTradeLabel}>Pending Trade</Text>
          <Switch
            value={pendingTradeMode}
            onValueChange={setPendingTradeMode}
            trackColor={{ false: '#3e3e3e', true: '#00D7A3' }}
            thumbColor={pendingTradeMode ? '#FFFFFF' : '#f4f3f4'}
          />
        </View>

        {/* Trade Buttons */}
        <View style={styles.tradeButtons}>
          <TouchableOpacity
            style={[styles.tradeBtn, styles.buyBtn, (activeTrade || loading) && styles.btnDisabled]}
            onPress={() => placeTrade('call')}
            disabled={!!activeTrade || loading}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-up-circle" size={28} color="#FFFFFF" />
            <Text style={styles.tradeBtnText}>UP</Text>
            <Text style={styles.payoutLabel}>{payoutPercentage}%</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tradeBtn, styles.sellBtn, (activeTrade || loading) && styles.btnDisabled]}
            onPress={() => placeTrade('put')}
            disabled={!!activeTrade || loading}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-down-circle" size={28} color="#FFFFFF" />
            <Text style={styles.tradeBtnText}>DOWN</Text>
            <Text style={styles.payoutLabel}>{payoutPercentage}%</Text>
          </TouchableOpacity>
        </View>

        {/* Active Trade Info */}
        {activeTrade && (
          <View style={[styles.activeTradeBox, isWinning ? styles.tradeWinning : styles.tradeLosing]}>
            <View style={styles.tradeInfoRow}>
              <Text style={styles.tradeInfoLabel}>Entry</Text>
              <Text style={styles.tradeInfoValue}>${activeTrade.entry_price.toFixed(5)}</Text>
            </View>
            <View style={styles.tradeInfoRow}>
              <Text style={styles.tradeInfoLabel}>Current</Text>
              <Text style={styles.tradeInfoValue}>${currentPrice.toFixed(5)}</Text>
            </View>
            <View style={styles.tradeInfoRow}>
              <Text style={styles.tradeInfoLabel}>Status</Text>
              <Text style={[styles.statusText, isWinning ? styles.statusWin : styles.statusLoss]}>
                {isWinning ? 'WINNING' : 'LOSING'}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

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
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: 'rgba(15, 20, 40, 0.95)',
  },
  depositButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 215, 163, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  depositText: {
    color: '#00D7A3',
    fontSize: 13,
    fontWeight: '700',
  },
  centerSection: {
    alignItems: 'center',
    flex: 1,
  },
  assetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    marginBottom: 6,
  },
  assetIcon: {
    fontSize: 16,
  },
  assetText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  priceDisplay: {
    alignItems: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00D7A3',
    marginRight: 4,
  },
  liveText: {
    color: '#00D7A3',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  priceChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 3,
  },
  priceChangeText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 3,
  },
  priceUp: {
    backgroundColor: 'rgba(0, 215, 163, 0.2)',
    color: '#00D7A3',
  },
  priceDown: {
    backgroundColor: 'rgba(255, 59, 59, 0.2)',
    color: '#FF3B3B',
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 8,
  },
  notificationButton: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B3B',
  },
  balanceChip: {
    backgroundColor: 'rgba(0, 215, 163, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  balanceValue: {
    color: '#00D7A3',
    fontSize: 13,
    fontWeight: '700',
  },
  chartWrapper: {
    height: 320,
    marginBottom: 8,
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
  tradingPanel: {
    flex: 1,
    paddingHorizontal: 16,
  },
  payoutDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 215, 163, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
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
    marginBottom: 16,
  },
  labelText: {
    color: '#999',
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '500',
  },
  durationButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
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
    fontSize: 13,
    fontWeight: '600',
  },
  durationTextActive: {
    color: '#00D7A3',
  },
  amountSection: {
    marginBottom: 16,
  },
  amountRow: {
    flexDirection: 'row',
    gap: 8,
  },
  amountInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dollarSign: {
    color: '#00D7A3',
    fontSize: 20,
    fontWeight: '700',
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 12,
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  quickButton: {
    backgroundColor: 'rgba(0, 215, 163, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  quickButtonText: {
    color: '#00D7A3',
    fontSize: 12,
    fontWeight: '700',
  },
  profitPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  profitPreviewLabel: {
    color: '#999',
    fontSize: 13,
  },
  profitPreviewValue: {
    color: '#00D7A3',
    fontSize: 20,
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
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 1,
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
