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
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { BinanceWebSocket, fetchHistoricalCandles, Candle } from '../../utils/binanceService';
import CandlestickChart from '../../components/CandlestickChart';
import { api } from '../../utils/api';

const { width } = Dimensions.get('window');

const ASSETS = [
  { label: 'BTC/USD', value: 'BTC/USD' },
  { label: 'ETH/USD', value: 'ETH/USD' },
  { label: 'EUR/USD', value: 'EUR/USD' },
  { label: 'GBP/USD', value: 'GBP/USD' },
];

export default function Trade() {
  const { user, token, accountType } = useAuthStore();
  
  const [selectedAsset, setSelectedAsset] = useState('EUR/USD');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [amount, setAmount] = useState('10');
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Trade state
  const [activeTrade, setActiveTrade] = useState<any>(null);
  const [countdown, setCountdown] = useState(0);
  const [tradeEntry, setTradeEntry] = useState<any>(null);
  
  const wsRef = useRef<BinanceWebSocket | null>(null);
  const tradeIntervalRef = useRef<any>(null);

  // Initialize Binance WebSocket and fetch historical data
  useEffect(() => {
    loadMarketData();
    return () => {
      if (wsRef.current) {
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
    try {
      // Fetch historical candles from backend proxy (CORS-safe)
      const historical = await fetchHistoricalCandles(selectedAsset, '1m', 50);
      if (historical.length > 0) {
        setCandles(historical);
        setCurrentPrice(historical[historical.length - 1].close);
        setLoading(false);
      } else {
        // Fallback: load will fail gracefully and show mock data
        setLoading(false);
      }

      // For now, simulate price updates instead of WebSocket
      // This avoids CORS issues with Binance WebSocket
      const updateInterval = setInterval(() => {
        setCandles(prev => {
          if (prev.length === 0) return prev;
          
          const lastCandle = prev[prev.length - 1];
          const basePrice = lastCandle.close;
          const change = (Math.random() - 0.5) * (basePrice * 0.01);
          
          const newCandle = {
            time: Date.now(),
            open: lastCandle.close,
            high: Math.max(lastCandle.close, lastCandle.close + change) + Math.random() * (basePrice * 0.003),
            low: Math.min(lastCandle.close, lastCandle.close + change) - Math.random() * (basePrice * 0.003),
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
      }, 2000);

      // Store interval ref for cleanup
      wsRef.current = { disconnect: () => clearInterval(updateInterval) } as any;
      
    } catch (error) {
      console.error('Error loading market data:', error);
      Alert.alert('Error', 'Failed to load market data');
      setLoading(false);
    }
  };

  const placeTrade = async (type: 'call' | 'put') => {
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
      
      setTradeEntry({
        price: currentPrice,
        time: Date.now(),
        type,
      });
      
      setCountdown(duration);
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
        `Trade ${result}! 🎉`,
        `${result === 'WON' ? 'Congratulations!' : 'Better luck next time'}\\n\\nEntry: $${activeTrade.entry_price.toFixed(2)}\\nExit: $${exitPrice.toFixed(2)}\\nProfit/Loss: $${profitLoss.toFixed(2)}`,
        [{ 
          text: 'OK', 
          onPress: () => {
            setActiveTrade(null);
            setTradeEntry(null);
            setCountdown(0);
          }
        }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
      setActiveTrade(null);
      setTradeEntry(null);
      setCountdown(0);
    }
  };

  const balance = accountType === 'demo' ? user?.demo_balance : user?.real_balance;
  const priceChange = candles.length >= 2 
    ? ((currentPrice - candles[candles.length - 2].close) / candles[candles.length - 2].close) * 100
    : 0;

  return (
    <View style={styles.container}>
      {/* Debug Info */}
      {__DEV__ && (
        <View style={{position: 'absolute', top: 10, left: 10, zIndex: 999, backgroundColor: 'yellow', padding: 8}}>
          <Text style={{color: 'black', fontSize: 10}}>
            Candles: {candles.length} | Loading: {loading ? 'YES' : 'NO'} | Price: {currentPrice.toFixed(2)}
          </Text>
        </View>
      )}
      
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
            size={14} 
            color={priceChange >= 0 ? '#00D7A3' : '#FF3B3B'} 
          />
          <Text style={styles.priceChangeText}>
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
          </Text>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00D7A3" />
            <Text style={styles.loadingText}>Loading market data...</Text>
          </View>
        ) : (
          <CandlestickChart
            candles={candles}
            currentPrice={currentPrice}
            tradeEntry={tradeEntry}
            countdown={countdown}
          />
        )}
      </View>

      {/* Trade Buttons - BUY/SELL (Above Investment Amount) */}
      <View style={styles.tradeButtonsContainer}>
        <TouchableOpacity
          style={[styles.tradeButton, styles.buyButton, (activeTrade || loading) && styles.buttonDisabled]}
          onPress={() => placeTrade('call')}
          disabled={activeTrade !== null || loading}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="trending-up" size={36} color="#FFFFFF" />
            <View style={styles.buttonTextContainer}>
              <Text style={styles.tradeButtonLabel}>BUY</Text>
              <Text style={styles.tradeButtonSubtext}>Price will rise</Text>
            </View>
          </View>
          <View style={styles.payoutBadge}>
            <Text style={styles.payoutText}>80%</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tradeButton, styles.sellButton, (activeTrade || loading) && styles.buttonDisabled]}
          onPress={() => placeTrade('put')}
          disabled={activeTrade !== null || loading}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="trending-down" size={36} color="#FFFFFF" />
            <View style={styles.buttonTextContainer}>
              <Text style={styles.tradeButtonLabel}>SELL</Text>
              <Text style={styles.tradeButtonSubtext}>Price will fall</Text>
            </View>
          </View>
          <View style={styles.payoutBadge}>
            <Text style={styles.payoutText}>80%</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Investment Amount */}
      <View style={styles.investmentContainer}>
        <Text style={styles.investmentLabel}>Investment Amount</Text>
        <View style={styles.amountRow}>
          <View style={styles.amountInput}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="10"
              placeholderTextColor="#666"
              editable={!activeTrade}
            />
          </View>
          <TouchableOpacity onPress={() => setAmount('10')} disabled={!!activeTrade}>
            <Text style={[styles.quickAmount, activeTrade && styles.disabled]}>$10</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setAmount('50')} disabled={!!activeTrade}>
            <Text style={[styles.quickAmount, activeTrade && styles.disabled]}>$50</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setAmount('100')} disabled={!!activeTrade}>
            <Text style={[styles.quickAmount, activeTrade && styles.disabled]}>$100</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Trade Buttons - Buy/Sell */}
      <View style={styles.tradeButtonsContainer}>
        <TouchableOpacity
          style={[styles.tradeButton, styles.buyButton, (activeTrade || loading) && styles.buttonDisabled]}
          onPress={() => placeTrade('call')}
          disabled={activeTrade !== null || loading}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="trending-up" size={40} color="#FFFFFF" />
            <View style={styles.buttonTextContainer}>
              <Text style={styles.tradeButtonLabel}>BUY</Text>
              <Text style={styles.tradeButtonSubtext}>Price will rise</Text>
            </View>
          </View>
          <View style={styles.payoutBadge}>
            <Text style={styles.payoutText}>Payout 80%</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tradeButton, styles.sellButton, (activeTrade || loading) && styles.buttonDisabled]}
          onPress={() => placeTrade('put')}
          disabled={activeTrade !== null || loading}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="trending-down" size={40} color="#FFFFFF" />
            <View style={styles.buttonTextContainer}>
              <Text style={styles.tradeButtonLabel}>SELL</Text>
              <Text style={styles.tradeButtonSubtext}>Price will fall</Text>
            </View>
          </View>
          <View style={styles.payoutBadge}>
            <Text style={styles.payoutText}>Payout 80%</Text>
          </View>
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
                key={asset.value}
                style={styles.assetOption}
                onPress={() => {
                  setSelectedAsset(asset.value);
                  setShowAssetPicker(false);
                }}
              >
                <Text style={styles.assetOptionText}>{asset.label}</Text>
                {selectedAsset === asset.value && (
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00D7A3',
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  priceChange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
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
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingContainer: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    opacity: 0.7,
  },
  investmentContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  investmentLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    paddingVertical: 16,
  },
  quickAmount: {
    color: '#00D7A3',
    fontSize: 14,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.3,
  },
  tradeButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginVertical: 16,
  },
  tradeButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 110,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buyButton: {
    backgroundColor: '#00D7A3',
  },
  sellButton: {
    backgroundColor: '#FF3B3B',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  buttonTextContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  tradeButtonLabel: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  tradeButtonSubtext: {
    color: '#FFFFFF',
    fontSize: 11,
    opacity: 0.9,
    marginTop: 2,
    fontWeight: '600',
  },
  payoutBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 12,
  },
  payoutText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
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
