import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';
import { useAuthStore } from '../../stores/authStore';
import { useMarketStore, CandleData } from '../../stores/marketStore';
import { generateMockCandles, generateNextCandle } from '../../utils/mockData';
import { api } from '../../utils/api';

const { width, height } = Dimensions.get('window');

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h'];
const ASSETS = ['BTC/USD', 'ETH/USD', 'EUR/USD', 'GBP/USD', 'AAPL'];

export default function Trade() {
  const { user, token, accountType } = useAuthStore();
  const { currentPrice, candleData, selectedAsset, setCurrentPrice, setCandleData, setSelectedAsset, addCandle } = useMarketStore();
  
  const [timeframe, setTimeframe] = useState('1m');
  const [amount, setAmount] = useState('10');
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [activeTrade, setActiveTrade] = useState<any>(null);
  const [countdown, setCountdown] = useState(0);
  
  const priceIntervalRef = useRef<any>(null);
  const tradeIntervalRef = useRef<any>(null);

  useEffect(() => {
    // Initialize mock data
    const initialCandles = generateMockCandles(30, 50000);
    setCandleData(initialCandles);
    setCurrentPrice(initialCandles[initialCandles.length - 1].close);

    // Simulate price updates every 2 seconds
    priceIntervalRef.current = setInterval(() => {
      const lastCandle = candleData.length > 0 
        ? candleData[candleData.length - 1] 
        : initialCandles[initialCandles.length - 1];
      
      const newCandle = generateNextCandle(lastCandle);
      addCandle(newCandle);
      setCurrentPrice(newCandle.close);
    }, 2000);

    return () => {
      if (priceIntervalRef.current) clearInterval(priceIntervalRef.current);
      if (tradeIntervalRef.current) clearInterval(tradeIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    // Handle active trade countdown
    if (activeTrade && countdown > 0) {
      tradeIntervalRef.current = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (activeTrade && countdown === 0) {
      settleTrade();
    }

    return () => {
      if (tradeIntervalRef.current) clearTimeout(tradeIntervalRef.current);
    };
  }, [countdown, activeTrade]);

  const placeTrade = async (type: 'call' | 'put') => {
    if (!token) {
      Alert.alert('Error', 'Please login to trade');
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

    try {
      const duration = 60; // 1 minute
      const response = await api.createTrade({
        asset: selectedAsset,
        trade_type: type,
        amount: tradeAmount,
        duration,
        entry_price: currentPrice,
        account_type: accountType,
      }, token);

      setActiveTrade({
        trade_id: response.trade_id,
        type,
        amount: tradeAmount,
        entry_price: currentPrice,
        duration,
      });
      setCountdown(duration);

      Alert.alert('Trade Placed', `${type.toUpperCase()} trade for $${tradeAmount}`);
    } catch (error: any) {
      Alert.alert('Trade Failed', error.message);
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

      const result = won ? 'WON' : 'LOST';
      const profitLoss = won ? activeTrade.amount * 0.8 : -activeTrade.amount;

      Alert.alert(
        `Trade ${result}`,
        `Profit/Loss: $${profitLoss.toFixed(2)}`,
        [{ text: 'OK', onPress: () => {
          setActiveTrade(null);
          setCountdown(0);
          // Reload user data to update balance
        }}]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const chartData = candleData.map(c => ({
    value: c.close,
    dataPointText: c.close.toFixed(2),
  }));

  const balance = accountType === 'demo' ? user?.demo_balance : user?.real_balance;
  const priceChange = candleData.length >= 2 
    ? candleData[candleData.length - 1].close - candleData[candleData.length - 2].close 
    : 0;
  const priceChangePercent = candleData.length >= 2
    ? (priceChange / candleData[candleData.length - 2].close) * 100
    : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.assetSelector}
          onPress={() => setShowAssetPicker(true)}
        >
          <Text style={styles.assetText}>{selectedAsset}</Text>
          <Ionicons name="chevron-down" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <Text style={styles.balanceValue}>${balance?.toFixed(2) || '0.00'}</Text>
        </View>
      </View>

      {/* Price Display */}
      <View style={styles.priceContainer}>
        <Text style={styles.currentPrice}>${currentPrice.toFixed(2)}</Text>
        <View style={[styles.priceChange, priceChange >= 0 ? styles.priceUp : styles.priceDown]}>
          <Ionicons 
            name={priceChange >= 0 ? 'trending-up' : 'trending-down'} 
            size={16} 
            color={priceChange >= 0 ? '#00D7A3' : '#FF3B3B'} 
          />
          <Text style={[styles.priceChangeText, priceChange >= 0 ? styles.priceUp : styles.priceDown]}>
            {priceChange >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%
          </Text>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        {chartData.length > 0 && (
          <LineChart
            data={chartData}
            width={width - 48}
            height={220}
            spacing={8}
            initialSpacing={0}
            color="#00D7A3"
            thickness={2}
            hideDataPoints
            hideRules
            hideYAxisText
            hideAxesAndRules
            curved
            startFillColor="rgba(0, 215, 163, 0.3)"
            endFillColor="rgba(0, 215, 163, 0.05)"
            startOpacity={0.9}
            endOpacity={0.2}
            backgroundColor="transparent"
            noOfSections={4}
            yAxisColor="rgba(255, 255, 255, 0.1)"
            xAxisColor="rgba(255, 255, 255, 0.1)"
          />
        )}
      </View>

      {/* Timeframe Selector */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.timeframeContainer}
        contentContainerStyle={styles.timeframeContent}
      >
        {TIMEFRAMES.map((tf) => (
          <TouchableOpacity
            key={tf}
            style={[styles.timeframeButton, timeframe === tf && styles.timeframeButtonActive]}
            onPress={() => setTimeframe(tf)}
          >
            <Text style={[styles.timeframeText, timeframe === tf && styles.timeframeTextActive]}>
              {tf}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Active Trade */}
      {activeTrade && (
        <View style={styles.activeTradeContainer}>
          <View style={styles.activeTradeHeader}>
            <Text style={styles.activeTradeTitle}>Active Trade</Text>
            <View style={styles.countdownBadge}>
              <Ionicons name="time" size={16} color="#FFFFFF" />
              <Text style={styles.countdownText}>{countdown}s</Text>
            </View>
          </View>
          <View style={styles.activeTradeDetails}>
            <Text style={styles.activeTradeLabel}>Entry: ${activeTrade.entry_price.toFixed(2)}</Text>
            <Text style={styles.activeTradeLabel}>Current: ${currentPrice.toFixed(2)}</Text>
            <Text style={[
              styles.activeTradeType,
              activeTrade.type === 'call' ? styles.callActive : styles.putActive
            ]}>
              {activeTrade.type.toUpperCase()}
            </Text>
          </View>
        </View>
      )}

      {/* Trade Input */}
      <View style={styles.tradeInputContainer}>
        <Text style={styles.tradeInputLabel}>Investment Amount</Text>
        <View style={styles.amountInputContainer}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor="#666"
          />
          <View style={styles.quickAmounts}>
            <TouchableOpacity onPress={() => setAmount('10')}>
              <Text style={styles.quickAmount}>$10</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAmount('50')}>
              <Text style={styles.quickAmount}>$50</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAmount('100')}>
              <Text style={styles.quickAmount}>$100</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Trade Buttons */}
      <View style={styles.tradeButtonsContainer}>
        <TouchableOpacity
          style={[styles.tradeButton, styles.upButton]}
          onPress={() => placeTrade('call')}
          disabled={activeTrade !== null}
        >
          <Ionicons name="arrow-up" size={24} color="#FFFFFF" />
          <Text style={styles.tradeButtonText}>UP</Text>
          <Text style={styles.payoutText}>80% payout</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tradeButton, styles.downButton]}
          onPress={() => placeTrade('put')}
          disabled={activeTrade !== null}
        >
          <Ionicons name="arrow-down" size={24} color="#FFFFFF" />
          <Text style={styles.tradeButtonText}>DOWN</Text>
          <Text style={styles.payoutText}>80% payout</Text>
        </TouchableOpacity>
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
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            {ASSETS.map((asset) => (
              <TouchableOpacity
                key={asset}
                style={styles.assetOption}
                onPress={() => {
                  setSelectedAsset(asset);
                  setShowAssetPicker(false);
                  // Regenerate chart data for new asset
                  const basePrice = asset.includes('BTC') ? 50000 : asset.includes('ETH') ? 3000 : 1.1;
                  const newCandles = generateMockCandles(30, basePrice);
                  setCandleData(newCandles);
                  setCurrentPrice(newCandles[newCandles.length - 1].close);
                }}
              >
                <Text style={styles.assetOptionText}>{asset}</Text>
                {selectedAsset === asset && (
                  <Ionicons name="checkmark" size={24} color="#00D7A3" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
  },
  assetSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  assetText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.6,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00D7A3',
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  currentPrice: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  priceChange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceChangeText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  priceUp: {
    color: '#00D7A3',
    backgroundColor: 'rgba(0, 215, 163, 0.2)',
  },
  priceDown: {
    color: '#FF3B3B',
    backgroundColor: 'rgba(255, 59, 59, 0.2)',
  },
  chartContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  timeframeContainer: {
    marginBottom: 16,
  },
  timeframeContent: {
    paddingHorizontal: 24,
    gap: 8,
  },
  timeframeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  timeframeButtonActive: {
    backgroundColor: '#00D7A3',
  },
  timeframeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.6,
  },
  timeframeTextActive: {
    color: '#0A0E27',
    opacity: 1,
  },
  activeTradeContainer: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    backgroundColor: 'rgba(0, 215, 163, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00D7A3',
  },
  activeTradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activeTradeTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00D7A3',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countdownText: {
    color: '#0A0E27',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  activeTradeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeTradeLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.8,
  },
  activeTradeType: {
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  callActive: {
    color: '#00D7A3',
    backgroundColor: 'rgba(0, 215, 163, 0.2)',
  },
  putActive: {
    color: '#FF3B3B',
    backgroundColor: 'rgba(255, 59, 59, 0.2)',
  },
  tradeInputContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  tradeInputLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 12,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  currencySymbol: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    paddingVertical: 16,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAmount: {
    color: '#00D7A3',
    fontSize: 12,
    fontWeight: '600',
  },
  tradeButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 16,
    marginTop: 'auto',
    marginBottom: 24,
  },
  tradeButton: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upButton: {
    backgroundColor: '#00D7A3',
  },
  downButton: {
    backgroundColor: '#FF3B3B',
  },
  tradeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  payoutText: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.8,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  assetOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  assetOptionText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
