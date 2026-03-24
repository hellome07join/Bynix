import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Switch,
  Image,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { fetchHistoricalCandles, Candle } from '../../utils/binanceService';
import EnhancedCandlestickChart from '../../components/EnhancedCandlestickChart';
import TradingViewChart from '../../components/TradingViewChart';
import AnimatedLoader from '../../components/AnimatedLoader';
import { api, API_URL } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';

declare const window: any;

// Sound effects
const lossSound = require('../../assets/sounds/loss.mp3');
const winSound = require('../../assets/sounds/win.wav');

const { width, height } = Dimensions.get('window');

// Onboarding Tutorial Steps
const TUTORIAL_STEPS = [
  {
    id: 0,
    title: 'HOW TO TRADE?',
    description: 'Learn trading using a risk-free demo account with $10,000 balance. No deposit needed.',
    isIntro: true,
  },
  {
    id: 1,
    title: 'PRICE MOVEMENT CHART',
    description: 'This chart updates in real time to show price changes of your selected asset.',
  },
  {
    id: 2,
    title: 'YOUR GOAL',
    description: 'Your goal is to predict where the price will go next — UP or DOWN — based on the chart.',
  },
  {
    id: 3,
    title: 'TRADE SETTINGS',
    description: 'Set TIME (duration) and AMOUNT (investment). Higher amount = higher possible profit.',
  },
  {
    id: 4,
    title: 'YOUR PROFIT AND PLACING A TRADE',
    description: 'Estimate your possible profit and choose direction:\n«UP» if you expect the price to rise,\n«DOWN» if you expect it to fall.',
    isFinal: true,
  },
];

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

// Market Categories
type MarketCategory = 'forex' | 'crypto' | 'stocks' | 'commodities';

interface Asset {
  label: string;
  value: string;
  icon: string;
  payout: number;
  category: MarketCategory;
  apiSymbol: string;
}

// Comprehensive Markets - Forex, Crypto, Stocks, Commodities
const MARKET_CATEGORIES = [
  { id: 'forex', label: 'Forex', icon: '💱' },
  { id: 'crypto', label: 'Crypto', icon: '₿' },
  { id: 'stocks', label: 'Stocks', icon: '📈' },
  { id: 'commodities', label: 'Commodities', icon: '🥇' },
];

// Demo Account Assets (Fewer, higher win rate - 90%)
const DEMO_ASSETS: Asset[] = [
  // FOREX (5 pairs for demo)
  { label: 'EUR/USD OTC', value: 'EUR/USD OTC', icon: '🇪🇺🇺🇸', payout: 92, category: 'forex', apiSymbol: 'EURUSD' },
  { label: 'GBP/USD OTC', value: 'GBP/USD OTC', icon: '🇬🇧🇺🇸', payout: 90, category: 'forex', apiSymbol: 'GBPUSD' },
  { label: 'USD/JPY OTC', value: 'USD/JPY OTC', icon: '🇺🇸🇯🇵', payout: 88, category: 'forex', apiSymbol: 'USDJPY' },
  { label: 'AUD/USD OTC', value: 'AUD/USD OTC', icon: '🇦🇺🇺🇸', payout: 87, category: 'forex', apiSymbol: 'AUDUSD' },
  { label: 'EUR/GBP OTC', value: 'EUR/GBP OTC', icon: '🇪🇺🇬🇧', payout: 85, category: 'forex', apiSymbol: 'EURGBP' },
  
  // CRYPTO (5 coins for demo)
  { label: 'BTC/USD OTC', value: 'BTC/USD OTC', icon: '₿', payout: 95, category: 'crypto', apiSymbol: 'BTCUSD' },
  { label: 'ETH/USD OTC', value: 'ETH/USD OTC', icon: 'Ξ', payout: 93, category: 'crypto', apiSymbol: 'ETHUSD' },
  { label: 'BNB/USD OTC', value: 'BNB/USD OTC', icon: '🔶', payout: 91, category: 'crypto', apiSymbol: 'BNBUSD' },
  { label: 'XRP/USD OTC', value: 'XRP/USD OTC', icon: '✕', payout: 89, category: 'crypto', apiSymbol: 'XRPUSD' },
  { label: 'DOGE/USD OTC', value: 'DOGE/USD OTC', icon: '🐕', payout: 86, category: 'crypto', apiSymbol: 'DOGEUSD' },
  
  // STOCKS (5 stocks for demo)
  { label: 'Apple OTC', value: 'AAPL OTC', icon: '🍎', payout: 90, category: 'stocks', apiSymbol: 'AAPL' },
  { label: 'Tesla OTC', value: 'TSLA OTC', icon: '🚗', payout: 86, category: 'stocks', apiSymbol: 'TSLA' },
  { label: 'Google OTC', value: 'GOOGL OTC', icon: '🔍', payout: 88, category: 'stocks', apiSymbol: 'GOOGL' },
  { label: 'Amazon OTC', value: 'AMZN OTC', icon: '📦', payout: 87, category: 'stocks', apiSymbol: 'AMZN' },
  { label: 'Microsoft OTC', value: 'MSFT OTC', icon: '🪟', payout: 89, category: 'stocks', apiSymbol: 'MSFT' },
  
  // COMMODITIES (3 for demo)
  { label: 'Gold OTC', value: 'GOLD OTC', icon: '🥇', payout: 88, category: 'commodities', apiSymbol: 'XAUUSD' },
  { label: 'Silver OTC', value: 'SILVER OTC', icon: '🥈', payout: 86, category: 'commodities', apiSymbol: 'XAGUSD' },
  { label: 'Oil OTC', value: 'OIL OTC', icon: '🛢️', payout: 84, category: 'commodities', apiSymbol: 'USOIL' },
];

// Real Account Assets (More assets, different from demo - 40% win rate)
const REAL_ASSETS: Asset[] = [
  // FOREX MARKETS (15 pairs - Different from demo)
  { label: 'USD/CHF OTC', value: 'USD/CHF OTC', icon: '🇺🇸🇨🇭', payout: 86, category: 'forex', apiSymbol: 'USDCHF' },
  { label: 'NZD/USD OTC', value: 'NZD/USD OTC', icon: '🇳🇿🇺🇸', payout: 84, category: 'forex', apiSymbol: 'NZDUSD' },
  { label: 'USD/CAD OTC', value: 'USD/CAD OTC', icon: '🇺🇸🇨🇦', payout: 83, category: 'forex', apiSymbol: 'USDCAD' },
  { label: 'EUR/JPY OTC', value: 'EUR/JPY OTC', icon: '🇪🇺🇯🇵', payout: 82, category: 'forex', apiSymbol: 'EURJPY' },
  { label: 'GBP/JPY OTC', value: 'GBP/JPY OTC', icon: '🇬🇧🇯🇵', payout: 81, category: 'forex', apiSymbol: 'GBPJPY' },
  { label: 'EUR/AUD OTC', value: 'EUR/AUD OTC', icon: '🇪🇺🇦🇺', payout: 80, category: 'forex', apiSymbol: 'EURAUD' },
  { label: 'EUR/CAD OTC', value: 'EUR/CAD OTC', icon: '🇪🇺🇨🇦', payout: 79, category: 'forex', apiSymbol: 'EURCAD' },
  { label: 'EUR/CHF OTC', value: 'EUR/CHF OTC', icon: '🇪🇺🇨🇭', payout: 78, category: 'forex', apiSymbol: 'EURCHF' },
  { label: 'GBP/AUD OTC', value: 'GBP/AUD OTC', icon: '🇬🇧🇦🇺', payout: 77, category: 'forex', apiSymbol: 'GBPAUD' },
  { label: 'GBP/CAD OTC', value: 'GBP/CAD OTC', icon: '🇬🇧🇨🇦', payout: 76, category: 'forex', apiSymbol: 'GBPCAD' },
  { label: 'AUD/JPY OTC', value: 'AUD/JPY OTC', icon: '🇦🇺🇯🇵', payout: 75, category: 'forex', apiSymbol: 'AUDJPY' },
  { label: 'CHF/JPY OTC', value: 'CHF/JPY OTC', icon: '🇨🇭🇯🇵', payout: 74, category: 'forex', apiSymbol: 'CHFJPY' },
  { label: 'CAD/JPY OTC', value: 'CAD/JPY OTC', icon: '🇨🇦🇯🇵', payout: 73, category: 'forex', apiSymbol: 'CADJPY' },
  { label: 'NZD/JPY OTC', value: 'NZD/JPY OTC', icon: '🇳🇿🇯🇵', payout: 72, category: 'forex', apiSymbol: 'NZDJPY' },
  { label: 'AUD/NZD OTC', value: 'AUD/NZD OTC', icon: '🇦🇺🇳🇿', payout: 71, category: 'forex', apiSymbol: 'AUDNZD' },
  
  // CRYPTOCURRENCY MARKETS (15 coins - Different from demo)
  { label: 'SOL/USD OTC', value: 'SOL/USD OTC', icon: '◎', payout: 88, category: 'crypto', apiSymbol: 'SOLUSD' },
  { label: 'ADA/USD OTC', value: 'ADA/USD OTC', icon: '₳', payout: 87, category: 'crypto', apiSymbol: 'ADAUSD' },
  { label: 'DOT/USD OTC', value: 'DOT/USD OTC', icon: '●', payout: 85, category: 'crypto', apiSymbol: 'DOTUSD' },
  { label: 'MATIC/USD OTC', value: 'MATIC/USD OTC', icon: '⬡', payout: 84, category: 'crypto', apiSymbol: 'MATICUSD' },
  { label: 'LTC/USD OTC', value: 'LTC/USD OTC', icon: 'Ł', payout: 83, category: 'crypto', apiSymbol: 'LTCUSD' },
  { label: 'AVAX/USD OTC', value: 'AVAX/USD OTC', icon: '🔺', payout: 82, category: 'crypto', apiSymbol: 'AVAXUSD' },
  { label: 'LINK/USD OTC', value: 'LINK/USD OTC', icon: '⬡', payout: 81, category: 'crypto', apiSymbol: 'LINKUSD' },
  { label: 'UNI/USD OTC', value: 'UNI/USD OTC', icon: '🦄', payout: 80, category: 'crypto', apiSymbol: 'UNIUSD' },
  { label: 'ATOM/USD OTC', value: 'ATOM/USD OTC', icon: '⚛', payout: 79, category: 'crypto', apiSymbol: 'ATOMUSD' },
  { label: 'XLM/USD OTC', value: 'XLM/USD OTC', icon: '✦', payout: 78, category: 'crypto', apiSymbol: 'XLMUSD' },
  { label: 'ETC/USD OTC', value: 'ETC/USD OTC', icon: 'Ξc', payout: 77, category: 'crypto', apiSymbol: 'ETCUSD' },
  { label: 'FIL/USD OTC', value: 'FIL/USD OTC', icon: '⬡', payout: 76, category: 'crypto', apiSymbol: 'FILUSD' },
  { label: 'TRX/USD OTC', value: 'TRX/USD OTC', icon: '◈', payout: 75, category: 'crypto', apiSymbol: 'TRXUSD' },
  { label: 'NEAR/USD OTC', value: 'NEAR/USD OTC', icon: 'Ⓝ', payout: 74, category: 'crypto', apiSymbol: 'NEARUSD' },
  { label: 'APT/USD OTC', value: 'APT/USD OTC', icon: '🅰', payout: 73, category: 'crypto', apiSymbol: 'APTUSD' },
  
  // STOCK MARKETS (15 stocks - Different from demo)
  { label: 'Meta OTC', value: 'META OTC', icon: '👤', payout: 85, category: 'stocks', apiSymbol: 'META' },
  { label: 'NVIDIA OTC', value: 'NVDA OTC', icon: '🎮', payout: 84, category: 'stocks', apiSymbol: 'NVDA' },
  { label: 'Netflix OTC', value: 'NFLX OTC', icon: '🎬', payout: 83, category: 'stocks', apiSymbol: 'NFLX' },
  { label: 'AMD OTC', value: 'AMD OTC', icon: '💻', payout: 82, category: 'stocks', apiSymbol: 'AMD' },
  { label: 'Intel OTC', value: 'INTC OTC', icon: '🔷', payout: 81, category: 'stocks', apiSymbol: 'INTC' },
  { label: 'Disney OTC', value: 'DIS OTC', icon: '🏰', payout: 80, category: 'stocks', apiSymbol: 'DIS' },
  { label: 'Nike OTC', value: 'NKE OTC', icon: '👟', payout: 79, category: 'stocks', apiSymbol: 'NKE' },
  { label: 'Coca-Cola OTC', value: 'KO OTC', icon: '🥤', payout: 78, category: 'stocks', apiSymbol: 'KO' },
  { label: 'McDonald\'s OTC', value: 'MCD OTC', icon: '🍔', payout: 77, category: 'stocks', apiSymbol: 'MCD' },
  { label: 'Starbucks OTC', value: 'SBUX OTC', icon: '☕', payout: 76, category: 'stocks', apiSymbol: 'SBUX' },
  { label: 'Visa OTC', value: 'V OTC', icon: '💳', payout: 75, category: 'stocks', apiSymbol: 'V' },
  { label: 'Mastercard OTC', value: 'MA OTC', icon: '💳', payout: 74, category: 'stocks', apiSymbol: 'MA' },
  { label: 'PayPal OTC', value: 'PYPL OTC', icon: '💸', payout: 73, category: 'stocks', apiSymbol: 'PYPL' },
  { label: 'Walmart OTC', value: 'WMT OTC', icon: '🛒', payout: 72, category: 'stocks', apiSymbol: 'WMT' },
  { label: 'JPMorgan OTC', value: 'JPM OTC', icon: '🏦', payout: 71, category: 'stocks', apiSymbol: 'JPM' },
  
  // COMMODITIES (7 for real)
  { label: 'Platinum OTC', value: 'PLATINUM OTC', icon: '⬜', payout: 82, category: 'commodities', apiSymbol: 'XPTUSD' },
  { label: 'Palladium OTC', value: 'PALLADIUM OTC', icon: '◻️', payout: 80, category: 'commodities', apiSymbol: 'XPDUSD' },
  { label: 'Natural Gas OTC', value: 'NATGAS OTC', icon: '🔥', payout: 78, category: 'commodities', apiSymbol: 'NATGAS' },
  { label: 'Copper OTC', value: 'COPPER OTC', icon: '🟤', payout: 76, category: 'commodities', apiSymbol: 'COPPER' },
  { label: 'Wheat OTC', value: 'WHEAT OTC', icon: '🌾', payout: 74, category: 'commodities', apiSymbol: 'WHEAT' },
  { label: 'Corn OTC', value: 'CORN OTC', icon: '🌽', payout: 72, category: 'commodities', apiSymbol: 'CORN' },
  { label: 'Coffee OTC', value: 'COFFEE OTC', icon: '☕', payout: 70, category: 'commodities', apiSymbol: 'COFFEE' },
];

// Combined for asset lookup (used in some utility functions)
const ALL_ASSETS: Asset[] = [...DEMO_ASSETS, ...REAL_ASSETS];

// Helper function to get assets based on account type
const getAssetsForAccount = (accountType: 'demo' | 'real'): Asset[] => {
  return accountType === 'demo' ? DEMO_ASSETS : REAL_ASSETS;
};

// Get default asset for an account type
const getDefaultAssetForAccount = (accountType: 'demo' | 'real'): string => {
  return accountType === 'demo' ? DEMO_ASSETS[0].value : REAL_ASSETS[0].value;
};

export default function Trade() {
  const router = useRouter();
  const { user, token, accountType, setAccountType, updateBalance } = useAuthStore();
  
  // Local demo balance (for when user is not logged in)
  const [localDemoBalance, setLocalDemoBalance] = useState(10000);
  
  // Get actual balance (use local if no user)
  const demoBalance = user?.demo_balance ?? localDemoBalance;
  const realBalance = user?.real_balance ?? 0;
  const currentBalance = accountType === 'demo' ? demoBalance : realBalance;
  
  // Onboarding Tutorial State
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showAccountChoice, setShowAccountChoice] = useState(false);
  
  // Market data - Initialize with first asset from current account type
  const [selectedAsset, setSelectedAsset] = useState(() => getDefaultAssetForAccount(accountType));
  const [selectedCategory, setSelectedCategory] = useState<MarketCategory>('forex');
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
  const [realTradeHistory, setRealTradeHistory] = useState<any[]>([]);
  const [demoTradeHistory, setDemoTradeHistory] = useState<any[]>([]);
  const [historyTab, setHistoryTab] = useState<'real' | 'demo'>('real');
  const [selectedTradeDetail, setSelectedTradeDetail] = useState<any>(null);
  const [showTradeDetail, setShowTradeDetail] = useState(false);
  const tradeDetailAnim = useRef(new Animated.Value(0)).current;
  const [historyPage, setHistoryPage] = useState(1);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<'24h' | '7d' | '30d' | 'custom'>('24h');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedDrawTool, setSelectedDrawTool] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'candle' | 'line' | 'bar'>('candle');
  const [customMinutes, setCustomMinutes] = useState('1');
  const [customSeconds, setCustomSeconds] = useState('0');
  const [demoAddAmount, setDemoAddAmount] = useState('1000');
  
  // Deposit Modal State
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('21');
  const [selectedNetwork, setSelectedNetwork] = useState('USDT (TRC20)');
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [generatedAddress, setGeneratedAddress] = useState<string | null>(null);
  const [isGeneratingAddress, setIsGeneratingAddress] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<string | null>(null);
  const [expirationTime, setExpirationTime] = useState<Date | null>(null);
  const [countdownText, setCountdownText] = useState('20:00');
  const [depositError, setDepositError] = useState<string | null>(null);
  
  // UTC Time and Candle Countdown
  const [utcTime, setUtcTime] = useState('');
  const [candleCountdown, setCandleCountdown] = useState(0);
  
  // Get candle duration in seconds based on timeframe
  const getCandleDuration = useCallback(() => {
    switch(timeframe) {
      case '1s': return 1;
      case '5s': return 5;
      case '15s': return 15;
      case '1m': return 60;
      case '5m': return 300;
      case '15m': return 900;
      case '1h': return 3600;
      default: return 60;
    }
  }, [timeframe]);
  
  // Update UTC time and candle countdown every second
  useEffect(() => {
    const updateTimeAndCountdown = () => {
      const now = new Date();
      
      // Format UTC time as HH:MM:SS
      const hours = now.getUTCHours().toString().padStart(2, '0');
      const minutes = now.getUTCMinutes().toString().padStart(2, '0');
      const seconds = now.getUTCSeconds().toString().padStart(2, '0');
      setUtcTime(`${hours}:${minutes}:${seconds}`);
      
      // Calculate candle countdown
      const candleDuration = getCandleDuration();
      const currentTimestamp = Math.floor(now.getTime() / 1000);
      const secondsIntoCandle = currentTimestamp % candleDuration;
      const secondsRemaining = candleDuration - secondsIntoCandle;
      setCandleCountdown(secondsRemaining);
    };
    
    updateTimeAndCountdown();
    const interval = setInterval(updateTimeAndCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [getCandleDuration]);
  
  // Payment expiration countdown
  useEffect(() => {
    if (!expirationTime || !generatedAddress) return;
    
    const updateCountdown = () => {
      const now = new Date();
      const diff = expirationTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        setCountdownText('EXPIRED');
        return;
      }
      
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setCountdownText(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [expirationTime, generatedAddress]);
  
  // Format countdown for display
  const formatCandleCountdown = () => {
    if (candleCountdown >= 60) {
      const mins = Math.floor(candleCountdown / 60);
      const secs = candleCountdown % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${candleCountdown}s`;
  };
  
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
  
  // Active trades - support multiple simultaneous trades
  interface ActiveTrade {
    id: string;
    trade_id?: string;
    type: 'call' | 'put';
    entry_price: number;
    amount: number;
    duration: number;
    startTime: number;
    endTime: number;
    countdown: number;
    asset: string;
  }
  
  const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>([]);
  
  // Trade result
  const [showResult, setShowResult] = useState(false);
  const [tradeResult, setTradeResult] = useState<any>(null);
  const resultAnim = useRef(new Animated.Value(0)).current;
  
  const wsRef = useRef<any>(null);
  const cooldownRef = useRef(false);

  // Get date range filter params
  const getDateRangeParams = () => {
    const now = new Date();
    let startDate: Date | null = null;
    
    switch (selectedDateRange) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        if (customStartDate) {
          startDate = new Date(customStartDate);
        }
        break;
    }
    
    let params = '';
    if (startDate) {
      params += `&start_date=${startDate.toISOString()}`;
    }
    if (selectedDateRange === 'custom' && customEndDate) {
      params += `&end_date=${new Date(customEndDate).toISOString()}`;
    }
    return params;
  };

  // Fetch trade history from backend - both real and demo with pagination
  const fetchTradeHistory = async (loadMore = false) => {
    if (!token) return;
    
    try {
      const page = loadMore ? historyPage + 1 : 1;
      const dateParams = getDateRangeParams();
      
      if (loadMore) {
        setLoadingMoreHistory(true);
      }
      
      // Fetch real account trades
      const realResponse = await fetch(`${API_URL}/trades/history?account_type=real&page=${page}&limit=20${dateParams}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (realResponse.ok) {
        const realData = await realResponse.json();
        if (loadMore) {
          setRealTradeHistory(prev => [...prev, ...(realData.trades || [])]);
        } else {
          setRealTradeHistory(realData.trades || []);
        }
        setHasMoreHistory((realData.trades || []).length >= 20);
      }
      
      // Fetch demo account trades
      const demoResponse = await fetch(`${API_URL}/trades/history?account_type=demo&page=${page}&limit=20${dateParams}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (demoResponse.ok) {
        const demoData = await demoResponse.json();
        if (loadMore) {
          setDemoTradeHistory(prev => [...prev, ...(demoData.trades || [])]);
        } else {
          setDemoTradeHistory(demoData.trades || []);
        }
      }
      
      if (loadMore) {
        setHistoryPage(page);
        setLoadingMoreHistory(false);
      } else {
        setHistoryPage(1);
      }
    } catch (error) {
      console.error('Error fetching trade history:', error);
      setLoadingMoreHistory(false);
    }
  };
  
  // Load more history
  const loadMoreHistory = () => {
    if (!loadingMoreHistory && hasMoreHistory) {
      fetchTradeHistory(true);
    }
  };
  
  // Apply date filter
  const applyDateFilter = () => {
    setShowDatePicker(false);
    setHistoryPage(1);
    fetchTradeHistory(false);
  };
  
  // Show trade detail with animation
  const showTradeDetailModal = (trade: any) => {
    setSelectedTradeDetail(trade);
    setShowTradeDetail(true);
    Animated.spring(tradeDetailAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };
  
  // Hide trade detail with animation
  const hideTradeDetailModal = () => {
    Animated.timing(tradeDetailAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowTradeDetail(false);
      setSelectedTradeDetail(null);
    });
  };
  
  // Format date for display
  const formatTradeDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  // Fetch trade history on mount, when trade settles, or when account type changes
  useEffect(() => {
    if (token) {
      fetchTradeHistory();
    }
  }, [token, accountType, selectedDateRange]);

  // Reset selected asset when account type changes to ensure it's valid for the new account
  useEffect(() => {
    const validAssets = getAssetsForAccount(accountType);
    const isCurrentAssetValid = validAssets.some(a => a.value === selectedAsset);
    console.log(`Account type changed to: ${accountType}, current asset: ${selectedAsset}, valid: ${isCurrentAssetValid}`);
    if (!isCurrentAssetValid) {
      // Reset to default asset for the new account type
      const newAsset = getDefaultAssetForAccount(accountType);
      console.log(`Resetting asset to: ${newAsset}`);
      setSelectedAsset(newAsset);
      setSelectedCategory('forex'); // Reset to default category
    }
  }, [accountType, selectedAsset]);

  // Check if user needs to see tutorial (new users)
  useEffect(() => {
    checkTutorialStatus();
  }, [token]);

  const checkTutorialStatus = async () => {
    try {
      // Check if user has seen tutorial
      const hasSeenTutorial = await AsyncStorage.getItem('hasSeenTradingTutorial');
      if (!hasSeenTutorial && token) {
        // New user - show tutorial
        setShowTutorial(true);
        setTutorialStep(0);
      }
    } catch (error) {
      console.error('Error checking tutorial status:', error);
    }
  };

  const completeTutorial = async () => {
    try {
      await AsyncStorage.setItem('hasSeenTradingTutorial', 'true');
      setShowTutorial(false);
      setTutorialStep(0);
      // Show account choice popup after tutorial
      setShowAccountChoice(true);
    } catch (error) {
      console.error('Error saving tutorial status:', error);
    }
  };

  const skipTutorial = async () => {
    await completeTutorial();
  };

  const selectDemoAccount = () => {
    setAccountType('demo');
    setShowAccountChoice(false);
  };

  const selectRealAccount = () => {
    setAccountType('real');
    setShowAccountChoice(false);
    // Navigate to wallet for deposit
    router.push('/wallet');
  };

  const nextTutorialStep = () => {
    if (tutorialStep < TUTORIAL_STEPS.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      completeTutorial();
    }
  };

  const prevTutorialStep = () => {
    if (tutorialStep > 0) {
      setTutorialStep(tutorialStep - 1);
    }
  };

  // Get assets for current account type
  const currentAssets = getAssetsForAccount(accountType);
  
  // Get current asset data
  const currentAsset = currentAssets.find(a => a.value === selectedAsset) || currentAssets[0];
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
    };
  }, [selectedAsset]);

  // Handle countdown for all active trades
  useEffect(() => {
    if (activeTrades.length === 0) return;
    
    const interval = setInterval(() => {
      setActiveTrades(prev => {
        const updated = prev.map(trade => ({
          ...trade,
          countdown: Math.max(0, trade.countdown - 1)
        }));
        
        // Find trades that need to be settled
        const tradesToSettle = updated.filter(trade => trade.countdown === 0);
        
        // Settle all completed trades sequentially
        if (tradesToSettle.length > 0) {
          settleMultipleTrades(tradesToSettle);
        }
        
        // Remove settled trades
        return updated.filter(trade => trade.countdown > 0);
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [activeTrades.length > 0]);

  // Settle multiple trades and refresh balance once at the end
  const settleMultipleTrades = async (trades: typeof activeTrades) => {
    let totalWon = 0;
    let totalLost = 0;
    let lastResult: any = null;
    
    for (const trade of trades) {
      const result = await settleTradeById(trade.id, false); // Don't refresh after each
      if (result) {
        lastResult = result;
        if (result.won) {
          totalWon++;
        } else {
          totalLost++;
        }
      }
    }
    
    // Refresh user balance once after all trades settled
    if (token) {
      const { refreshUser } = useAuthStore.getState();
      await refreshUser();
    }
    
    // Show last result popup (or could show summary)
    if (lastResult) {
      setTradeResult(lastResult);
      showResultPopup();
    }
  };

  const loadMarketData = async () => {
    setLoading(true);
    setConnectionStatus('live');
    
    // Generate initial price based on asset (fallback until WebSocket connects)
    const getBasePrice = (asset: string): number => {
      if (asset.includes('EUR/USD')) return 1.0850;
      if (asset.includes('GBP/USD')) return 1.2650;
      if (asset.includes('USD/JPY')) return 149.50;
      if (asset.includes('AUD/USD')) return 0.6550;
      if (asset.includes('USD/CHF')) return 0.8750;
      if (asset.includes('EUR/GBP')) return 0.8550;
      if (asset.includes('NZD/USD')) return 0.6150;
      if (asset.includes('USD/CAD')) return 1.3550;
      if (asset.includes('EUR/JPY')) return 162.50;
      if (asset.includes('GBP/JPY')) return 189.50;
      return 1.0850;
    };
    
    setCurrentPrice(getBasePrice(selectedAsset));
    setLoading(false);
    // Price updates now come from TradingViewChart component via onPriceUpdate callback
  };

  const placeTrade = async (type: 'call' | 'put') => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (cooldownRef.current) {
      Alert.alert('Please wait', 'Cooldown active');
      return;
    }

    const tradeAmount = parseFloat(amount);
    if (isNaN(tradeAmount) || tradeAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    // Check balance
    if (tradeAmount > currentBalance) {
      Alert.alert('Error', `Insufficient balance. You have $${currentBalance.toFixed(2)} but trying to trade $${tradeAmount}`);
      return;
    }

    // Additional check for real account with 0 balance
    if (accountType === 'real' && currentBalance <= 0) {
      Alert.alert('No Balance', 'Please deposit funds to your real account first');
      return;
    }

    // Cooldown - short to allow multiple trades
    cooldownRef.current = true;
    setTimeout(() => {
      cooldownRef.current = false;
    }, 500);

    const now = Date.now();
    const tradeId = `trade_${now}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('=== PLACE TRADE DEBUG ===');
    console.log('accountType:', accountType);
    console.log('token:', token ? 'EXISTS' : 'NULL');
    console.log('selectedAsset:', selectedAsset);
    console.log('tradeAmount:', tradeAmount);
    console.log('currentPrice:', currentPrice);

    // For demo mode, execute trade locally without API
    if (accountType === 'demo' || !token) {
      console.log('>>> DEMO MODE - Local execution');
      // Deduct amount from demo balance
      if (user) {
        const newDemoBalance = (user.demo_balance || 0) - tradeAmount;
        updateBalance(newDemoBalance, user.real_balance || 0);
      } else {
        setLocalDemoBalance(prev => prev - tradeAmount);
      }
      
      // Add new trade to the array
      const newTrade: ActiveTrade = {
        id: tradeId,
        trade_id: tradeId,
        type,
        amount: tradeAmount,
        entry_price: currentPrice,
        duration,
        startTime: now,
        endTime: now + duration * 1000,
        countdown: duration,
        asset: selectedAsset,
      };
      
      setActiveTrades(prev => [...prev, newTrade]);
      
      // Success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    // For real account with token, use API
    console.log('>>> REAL MODE - API call');
    try {
      console.log('Calling api.createTrade with:', {
        asset: selectedAsset,
        trade_type: type,
        amount: tradeAmount,
        duration,
        entry_price: currentPrice,
        account_type: accountType,
      });
      const response = await api.createTrade({
        asset: selectedAsset,
        trade_type: type,
        amount: tradeAmount,
        duration,
        entry_price: currentPrice,
        account_type: accountType,
      }, token);

      // Deduct amount from real balance
      if (user) {
        const newRealBalance = (user.real_balance || 0) - tradeAmount;
        updateBalance(user.demo_balance || 10000, newRealBalance);
      }

      // Add new trade to the array
      const newTrade: ActiveTrade = {
        id: tradeId,
        trade_id: response.trade_id,
        type,
        amount: tradeAmount,
        entry_price: currentPrice,
        duration,
        startTime: now,
        endTime: now + duration * 1000,
        countdown: duration,
        asset: selectedAsset,
      };
      
      setActiveTrades(prev => [...prev, newTrade]);
      
      // Success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert('Trade Failed', error.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  // Settle a specific trade by ID
  const settleTradeById = async (tradeId: string, shouldRefreshUser: boolean = true) => {
    const trade = activeTrades.find(t => t.id === tradeId);
    if (!trade) return null;

    // Get the OFFICIAL exit price from SERVER (synced across all devices)
    let exitPrice = currentPrice;
    try {
      const cleanSymbol = trade.asset.replace(' OTC', '').replace('/', '').toUpperCase();
      // Use proper API URL based on platform
      let apiUrl = '';
      if (typeof window !== 'undefined') {
        const currentUrl = window.location.origin;
        if (currentUrl.includes('preview.emergentagent.com') || currentUrl.includes('ngrok')) {
          apiUrl = `${currentUrl}/api`;
        } else if (currentUrl.includes('localhost:3000')) {
          // Development: use backend directly via preview URL
          apiUrl = 'https://bynix-markets.preview.emergentagent.com/api';
        } else {
          apiUrl = `${currentUrl}/api`;
        }
      } else {
        apiUrl = '/api';
      }
      console.log(`Fetching exit price from: ${apiUrl}/chart/tick/${cleanSymbol}`);
      const response = await fetch(`${apiUrl}/chart/tick/${cleanSymbol}`, { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        if (data.new_tick && data.new_tick.close) {
          exitPrice = data.new_tick.close;
          console.log(`Settlement using server price: ${exitPrice}`);
        }
      } else {
        console.log(`API returned status: ${response.status}`);
      }
    } catch (error) {
      console.log('Using local price for settlement:', exitPrice, error);
    }

    // TRADE SETTLEMENT - Get result from backend (uses controlled probabilities)
    const entryPrice = trade.entry_price;
    let won: boolean = false;
    let profitLoss: number = -trade.amount;
    let finalExitPrice = exitPrice;
    
    // For logged in users, let backend determine win/loss based on account type probabilities
    // Demo: 90% win rate, Real: 40% win rate
    if (token && trade.trade_id) {
      try {
        const result = await api.settleTrade(trade.trade_id, exitPrice, token);
        console.log(`Backend settlement result:`, result);
        
        // Use backend's decision
        won = result.status === 'won';
        profitLoss = result.profit_loss;
        
        // Use backend's adjusted exit price for display (matches the outcome)
        if (result.exit_price) {
          finalExitPrice = result.exit_price;
        }
        
        console.log(`Trade Settlement from Backend: Status=${result.status}, P/L=${profitLoss}, Exit Price=${finalExitPrice}`);
        
        // Refresh user balance from server after trade settles (unless skipped for batch settlement)
        if (shouldRefreshUser) {
          const { refreshUser } = useAuthStore.getState();
          await refreshUser();
        }
        
      } catch (error: any) {
        console.error('Error settling trade with backend:', error);
        // Fallback to price-based logic if API fails
        if (trade.type === 'call') {
          won = exitPrice > entryPrice;
        } else {
          won = exitPrice < entryPrice;
        }
        if (exitPrice === entryPrice) won = false;
        profitLoss = won ? trade.amount * (payoutPercentage / 100) : -trade.amount;
        
        // Update balance locally as fallback
        if (accountType === 'demo') {
          if (won && user) {
            const winnings = trade.amount + (trade.amount * payoutPercentage / 100);
            updateBalance((user.demo_balance || 0) + winnings, user.real_balance || 0);
          }
        } else if (accountType === 'real') {
          if (won && user) {
            const winnings = trade.amount + (trade.amount * payoutPercentage / 100);
            updateBalance(user.demo_balance || 10000, (user.real_balance || 0) + winnings);
          }
        }
      }
    } else {
      // Not logged in - use local demo balance with price-based logic
      if (trade.type === 'call') {
        won = exitPrice > entryPrice;
      } else {
        won = exitPrice < entryPrice;
      }
      if (exitPrice === entryPrice) won = false;
      profitLoss = won ? trade.amount * (payoutPercentage / 100) : -trade.amount;
      
      console.log(`Local Trade Settlement: Type=${trade.type}, Entry=${entryPrice}, Exit=${exitPrice}, Won=${won}`);
      
      // Update local demo balance
      if (won) {
        const winnings = trade.amount + (trade.amount * payoutPercentage / 100);
        setLocalDemoBalance(prev => prev + winnings);
      }
    }

    const tradeResultData = {
      won,
      profitLoss,
      entryPrice: trade.entry_price,
      exitPrice: finalExitPrice,
    };

    // Only show popup and sounds if not batch settling (shouldRefreshUser = true means single trade)
    if (shouldRefreshUser) {
      setTradeResult(tradeResultData);
      showResultPopup();
      
      // Result haptic and sound
      if (won) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Play win sound
        playWinSound();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        // Play loss sound
        playLossSound();
      }
    }
    
    // Refresh trade history
    fetchTradeHistory();
    
    return tradeResultData;
  };

  // Play win sound function
  const playWinSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(winSound);
      await sound.playAsync();
      // Unload after playing
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log('Error playing win sound:', error);
    }
  };

  // Play loss sound function
  const playLossSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(lossSound);
      await sound.playAsync();
      // Unload after playing
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log('Error playing loss sound:', error);
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

  // Deposit button animation
  const depositPulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    // Pulsing animation for deposit button
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(depositPulseAnim, {
          toValue: 1.08,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(depositPulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, []);

  // Show animated loader when loading
  if (loading) {
    return <AnimatedLoader message="Loading Market" />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* Left Side - Notification and Deposit */}
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.notifButton}
            onPress={() => router.push('/(tabs)/notifications')}
          >
            <Ionicons name="notifications" size={14} color="#888888" />
            <View style={styles.notifBadge} />
          </TouchableOpacity>

          {/* Premium Gold Deposit Button */}
          <TouchableOpacity 
            style={styles.depositButton3D}
            onPress={() => setShowDepositModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.depositButton3DInner}>
              <Ionicons name="gift" size={14} color="#1A1A1A" />
              <Text style={styles.depositBonusText3D}>200%</Text>
              <Text style={styles.depositText3D}>Deposit</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Logo - Absolute Center with Intense Green Glow */}
        <View style={styles.headerLogoContainer}>
          <View style={styles.logoGlowWrapper}>
            <Image 
              source={require('../../assets/images/bynix-logo.png')} 
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Right Side - Balance */}
        <TouchableOpacity 
          style={[styles.balanceButton, accountType === 'demo' ? styles.demoBalance : styles.realBalance]}
          onPress={() => setShowAccountPicker(true)}
        >
          <Ionicons 
            name={accountType === 'demo' ? 'school' : 'wallet'} 
            size={14} 
            color="#FFFFFF" 
          />
          <Text style={[styles.balanceText, accountType === 'demo' ? styles.demoBalanceText : styles.realBalanceText]}>
            ${currentBalance.toFixed(2)}
          </Text>
          <Ionicons name="chevron-down" size={12} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Candle Countdown & UTC Time - Below Header */}
      <View style={styles.timeInfoRow}>
        <View style={styles.candleCountdownBox}>
          <Ionicons name="timer-outline" size={14} color="#FFB800" />
          <Text style={styles.candleCountdownText}>{formatCandleCountdown()}</Text>
        </View>
        <Text style={styles.utcTimeText}>UTC {utcTime}</Text>
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
            chartType={chartType}
            tradeMarkers={activeTrades.map(trade => ({
              id: trade.id,
              entryPrice: trade.entry_price,
              type: trade.type,
              amount: trade.amount,
              remainingTime: trade.countdown
            }))}
            onPriceUpdate={(price) => setCurrentPrice(price)}
            authToken={token}
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
          <Ionicons name="time" size={16} color="#FFB800" />
          <Text style={styles.setTimeText}>{formatDuration(duration)}</Text>
          <Ionicons name="chevron-down" size={14} color="#FFB800" />
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
          <Ionicons name="time" size={16} color="#FFB800" />
          <Text style={styles.tradeHistoryBtnText}>Trade</Text>
          {activeTrades.length > 0 && (
            <View style={styles.runningBadge}>
              <Text style={styles.runningBadgeText}>{activeTrades.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Market Selection Button */}
        <TouchableOpacity 
          style={styles.marketSelectBtn}
          onPress={() => setShowAssetPicker(true)}
        >
          <Text style={styles.marketSelectIcon}>{currentAsset.icon}</Text>
          <Ionicons name="chevron-down" size={14} color="#FFB800" />
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
              />
            </View>
            <View style={styles.quickButtons}>
              {[10, 50, 100].map(val => (
                <TouchableOpacity 
                  key={val}
                  style={styles.quickButton}
                  onPress={() => setAmount(val.toString())}
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
            style={[styles.tradeBtn, styles.buyBtn, loading && styles.btnDisabled]}
            onPress={() => placeTrade('call')}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
            <Text style={styles.tradeBtnText}>UP</Text>
            <Text style={styles.btnPayout}>{payoutPercentage}%</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tradeBtn, styles.sellBtn, loading && styles.btnDisabled]}
            onPress={() => placeTrade('put')}
            disabled={loading}
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
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Market</Text>
              <TouchableOpacity onPress={() => setShowAssetPicker(false)}>
                <Ionicons name="close-circle" size={28} color="#666" />
              </TouchableOpacity>
            </View>
            
            {/* Category Tabs */}
            <View style={styles.categoryTabs}>
              {MARKET_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryTab,
                    selectedCategory === cat.id && styles.categoryTabActive
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat.id as MarketCategory);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={styles.categoryTabIcon}>{cat.icon}</Text>
                  <Text style={[
                    styles.categoryTabText,
                    selectedCategory === cat.id && styles.categoryTabTextActive
                  ]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Asset List */}
            <ScrollView style={styles.assetList} showsVerticalScrollIndicator={false}>
              {currentAssets.filter(asset => asset.category === selectedCategory).map((asset) => (
                <TouchableOpacity
                  key={asset.value}
                  style={[
                    styles.assetOption,
                    selectedAsset === asset.value && styles.assetOptionSelected
                  ]}
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
                    <Ionicons name="checkmark-circle" size={24} color="#00E55A" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Deposit Funds Modal */}
      <Modal visible={showDepositModal} transparent animationType="slide">
        <View style={depositModalStyles.overlay}>
          <View style={depositModalStyles.content}>
            {/* Header */}
            <View style={depositModalStyles.header}>
              <Text style={depositModalStyles.title}>Deposit Funds</Text>
              <TouchableOpacity onPress={() => {
                setShowDepositModal(false);
                setGeneratedAddress(null);
                setPaymentId(null);
                setPayAmount(null);
                setExpirationTime(null);
                setDepositError(null);
                setShowNetworkDropdown(false);
              }}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {!generatedAddress ? (
                <>
                  {/* Error Message */}
                  {depositError && (
                    <View style={depositModalStyles.errorBox}>
                      <Ionicons name="alert-circle" size={20} color="#FF3B3B" />
                      <Text style={depositModalStyles.errorText}>{depositError}</Text>
                    </View>
                  )}

                  {/* Amount Input */}
                  <Text style={depositModalStyles.label}>Enter Amount</Text>
                  <View style={depositModalStyles.amountBox}>
                    <Text style={depositModalStyles.amountPrefix}>$</Text>
                    <TextInput
                      style={depositModalStyles.amountInput}
                      value={depositAmount}
                      onChangeText={setDepositAmount}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#444"
                    />
                  </View>
                  <Text style={depositModalStyles.minimum}>Minimum deposit: $21</Text>

                  {/* Quick Amounts */}
                  <View style={depositModalStyles.quickAmounts}>
                    {['50', '100', '250', '500', '1000'].map((amt) => (
                      <TouchableOpacity
                        key={amt}
                        style={[depositModalStyles.quickBtn, depositAmount === amt && depositModalStyles.quickBtnActive]}
                        onPress={() => setDepositAmount(amt)}
                      >
                        <Text style={[depositModalStyles.quickBtnText, depositAmount === amt && depositModalStyles.quickBtnTextActive]}>
                          ${amt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Network Selection */}
                  <Text style={depositModalStyles.label}>Select Network</Text>
                  <TouchableOpacity 
                    style={depositModalStyles.networkSelect}
                    onPress={() => setShowNetworkDropdown(!showNetworkDropdown)}
                  >
                    <View style={depositModalStyles.networkLeft}>
                      <Ionicons name="link" size={18} color="#00E55A" />
                      <Text style={depositModalStyles.networkText}>{selectedNetwork}</Text>
                    </View>
                    <Ionicons name="chevron-down" size={20} color="#888" />
                  </TouchableOpacity>

                  {showNetworkDropdown && (
                    <View style={depositModalStyles.networkDropdown}>
                      {['USDT (TRC20)', 'USDT (ERC20)', 'BTC (Bitcoin)', 'ETH (Ethereum)', 'LTC (Litecoin)'].map((network) => (
                        <TouchableOpacity
                          key={network}
                          style={[depositModalStyles.networkOption, selectedNetwork === network && depositModalStyles.networkOptionActive]}
                          onPress={() => {
                            setSelectedNetwork(network);
                            setShowNetworkDropdown(false);
                          }}
                        >
                          <Text style={[depositModalStyles.networkOptionText, selectedNetwork === network && { color: '#00E55A' }]}>
                            {network}
                          </Text>
                          {selectedNetwork === network && <Ionicons name="checkmark" size={18} color="#00E55A" />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* No Fees Info */}
                  <Text style={depositModalStyles.noFees}>No fees - Pay exact amount only</Text>

                  {/* Promo Code */}
                  <Text style={depositModalStyles.label}>Promo Code (Optional)</Text>
                  <View style={depositModalStyles.promoRow}>
                    <TextInput
                      style={depositModalStyles.promoInput}
                      placeholder="Enter code"
                      placeholderTextColor="#444"
                      value={promoCode}
                      onChangeText={setPromoCode}
                    />
                    <TouchableOpacity 
                      style={depositModalStyles.promoQuickBtn}
                      onPress={() => setPromoCode('BYNIX')}
                    >
                      <Text style={depositModalStyles.promoQuickText}>BYNIX</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={depositModalStyles.promoQuickBtn}
                      onPress={() => setPromoCode('VIP50')}
                    >
                      <Text style={depositModalStyles.promoQuickText}>VIP50</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Promo Info Box */}
                  <View style={depositModalStyles.promoInfo}>
                    <Ionicons name="gift" size={20} color="#FFD700" />
                    <Text style={depositModalStyles.promoInfoText}>
                      BYNIX: 200% bonus ($100+) - New users only!
                    </Text>
                  </View>

                  {/* Generate Address Button */}
                  <TouchableOpacity 
                    style={depositModalStyles.generateBtn}
                    onPress={async () => {
                      if (parseFloat(depositAmount) < 21) {
                        Alert.alert('Invalid Amount', 'Minimum deposit is $21');
                        return;
                      }
                      
                      if (!token) {
                        Alert.alert('Login Required', 'Please login to make a deposit');
                        return;
                      }
                      
                      setIsGeneratingAddress(true);
                      setDepositError(null);
                      
                      try {
                        // Map network to API format
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
                            amount: parseFloat(depositAmount),
                            network: networkMap[selectedNetwork] || 'TRC20',
                            promo_code: promoCode || null
                          })
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                          setGeneratedAddress(data.pay_address);
                          setPaymentId(data.payment_id?.toString());
                          setPayAmount(data.pay_amount?.toString());
                          
                          // Set expiration time (20 minutes from now if not provided)
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
                      <Text style={depositModalStyles.generateBtnText}>Generate Deposit Address</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Generated Address View with QR Code */}
                  <View style={depositModalStyles.addressSection}>
                    {/* QR Code */}
                    <View style={depositModalStyles.qrContainer}>
                      <QRCode
                        value={generatedAddress || 'bitcoin:address'}
                        size={180}
                        backgroundColor="#FFFFFF"
                        color="#000000"
                      />
                    </View>
                    
                    {/* Payment Info Cards */}
                    <View style={depositModalStyles.paymentInfoCard}>
                      <View style={depositModalStyles.paymentInfoRow}>
                        <Text style={depositModalStyles.paymentInfoLabel}>Payment ID</Text>
                        <Text style={depositModalStyles.paymentInfoValue}>{paymentId || 'N/A'}</Text>
                      </View>
                    </View>
                    
                    <View style={depositModalStyles.paymentInfoCard}>
                      <View style={depositModalStyles.paymentInfoRow}>
                        <Text style={depositModalStyles.paymentInfoLabel}>Expires In</Text>
                        <Text style={[
                          depositModalStyles.paymentInfoValue, 
                          depositModalStyles.expiryText,
                          countdownText === 'EXPIRED' && { color: '#FF3B3B' }
                        ]}>
                          {countdownText}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Address */}
                    <Text style={depositModalStyles.addressLabel}>Deposit Address ({selectedNetwork})</Text>
                    <View style={depositModalStyles.addressBox}>
                      <Text style={depositModalStyles.addressText} selectable>{generatedAddress}</Text>
                    </View>
                    
                    <TouchableOpacity 
                      style={depositModalStyles.copyBtn}
                      onPress={() => {
                        Alert.alert('Copied!', 'Address copied to clipboard');
                      }}
                    >
                      <Ionicons name="copy" size={18} color="#0A0A0A" />
                      <Text style={depositModalStyles.copyBtnText}>Copy Address</Text>
                    </TouchableOpacity>

                    {/* Amount to Send */}
                    <View style={depositModalStyles.amountToSendCard}>
                      <Text style={depositModalStyles.amountToSendLabel}>Amount to Send</Text>
                      <Text style={depositModalStyles.amountToSendValue}>
                        {payAmount || depositAmount} {selectedNetwork.split(' ')[0]}
                      </Text>
                      <Text style={depositModalStyles.amountToSendUsd}>≈ ${depositAmount} USD</Text>
                    </View>

                    <View style={depositModalStyles.warningBox}>
                      <Ionicons name="warning" size={20} color="#FFB800" />
                      <Text style={depositModalStyles.warningText}>
                        Only send {selectedNetwork.split(' ')[0]} to this address. Sending any other asset may result in permanent loss. Payment expires in 20 minutes.
                      </Text>
                    </View>

                    <TouchableOpacity 
                      style={depositModalStyles.doneBtn}
                      onPress={() => {
                        setShowDepositModal(false);
                        setGeneratedAddress(null);
                        setPaymentId(null);
                        setPayAmount(null);
                        setExpirationTime(null);
                      }}
                    >
                      <Text style={depositModalStyles.doneBtnText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
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
                <Ionicons name="wallet" size={24} color="#00E55A" />
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountLabel}>Live Account</Text>
                <Text style={styles.accountBalance}>${realBalance.toFixed(2)}</Text>
              </View>
              {accountType === 'real' && (
                <Ionicons name="checkmark-circle" size={24} color="#00E55A" />
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

            {/* Chart Type Section */}
            <View style={styles.toolsSection}>
              <Text style={styles.toolsSectionTitle}>Chart Type</Text>
              <View style={styles.chartTypeGrid}>
                <TouchableOpacity
                  style={[styles.chartTypeItem, chartType === 'candle' && styles.chartTypeItemActive]}
                  onPress={() => {
                    setChartType('candle');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Ionicons name="bar-chart" size={24} color={chartType === 'candle' ? '#00E55A' : '#888'} />
                  <Text style={[styles.chartTypeText, chartType === 'candle' && styles.chartTypeTextActive]}>Candle</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.chartTypeItem, chartType === 'line' && styles.chartTypeItemActive]}
                  onPress={() => {
                    setChartType('line');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Ionicons name="analytics" size={24} color={chartType === 'line' ? '#00E55A' : '#888'} />
                  <Text style={[styles.chartTypeText, chartType === 'line' && styles.chartTypeTextActive]}>Line</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.chartTypeItem, chartType === 'bar' && styles.chartTypeItemActive]}
                  onPress={() => {
                    setChartType('bar');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Ionicons name="stats-chart" size={24} color={chartType === 'bar' ? '#00E55A' : '#888'} />
                  <Text style={[styles.chartTypeText, chartType === 'bar' && styles.chartTypeTextActive]}>Bar</Text>
                </TouchableOpacity>
              </View>
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
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Trade History</Text>
              <TouchableOpacity onPress={() => setShowTradeHistory(false)}>
                <Ionicons name="close-circle" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Tab Switcher - Real / Demo */}
            <View style={styles.historyTabContainer}>
              <TouchableOpacity
                style={[styles.historyTab, historyTab === 'real' && styles.historyTabActive]}
                onPress={() => setHistoryTab('real')}
              >
                <Ionicons name="wallet" size={16} color={historyTab === 'real' ? '#00E55A' : '#666'} />
                <Text style={[styles.historyTabText, historyTab === 'real' && styles.historyTabTextActive]}>
                  Real Account
                </Text>
                <View style={[styles.historyTabBadge, { backgroundColor: historyTab === 'real' ? '#00E55A' : '#333' }]}>
                  <Text style={styles.historyTabBadgeText}>{realTradeHistory.length}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.historyTab, historyTab === 'demo' && styles.historyTabActiveDemo]}
                onPress={() => setHistoryTab('demo')}
              >
                <Ionicons name="school" size={16} color={historyTab === 'demo' ? '#FF3B3B' : '#666'} />
                <Text style={[styles.historyTabText, historyTab === 'demo' && styles.historyTabTextActiveDemo]}>
                  Demo Account
                </Text>
                <View style={[styles.historyTabBadge, { backgroundColor: historyTab === 'demo' ? '#FF3B3B' : '#333' }]}>
                  <Text style={styles.historyTabBadgeText}>{demoTradeHistory.length}</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Date Range Filter */}
            <View style={styles.dateFilterContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.dateFilterBtn, selectedDateRange === '24h' && styles.dateFilterBtnActive]}
                  onPress={() => setSelectedDateRange('24h')}
                >
                  <Text style={[styles.dateFilterText, selectedDateRange === '24h' && styles.dateFilterTextActive]}>24H</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dateFilterBtn, selectedDateRange === '7d' && styles.dateFilterBtnActive]}
                  onPress={() => setSelectedDateRange('7d')}
                >
                  <Text style={[styles.dateFilterText, selectedDateRange === '7d' && styles.dateFilterTextActive]}>7D</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dateFilterBtn, selectedDateRange === '30d' && styles.dateFilterBtnActive]}
                  onPress={() => setSelectedDateRange('30d')}
                >
                  <Text style={[styles.dateFilterText, selectedDateRange === '30d' && styles.dateFilterTextActive]}>30D</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dateFilterBtn, selectedDateRange === 'custom' && styles.dateFilterBtnActive]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar" size={14} color={selectedDateRange === 'custom' ? '#00E55A' : '#888'} />
                  <Text style={[styles.dateFilterText, selectedDateRange === 'custom' && styles.dateFilterTextActive]}>Custom</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Custom Date Picker Modal */}
            {showDatePicker && (
              <View style={styles.customDatePicker}>
                <Text style={styles.customDateLabel}>Start Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.customDateInput}
                  placeholder="2025-01-01"
                  placeholderTextColor="#666"
                  value={customStartDate}
                  onChangeText={setCustomStartDate}
                />
                <Text style={styles.customDateLabel}>End Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.customDateInput}
                  placeholder="2025-12-31"
                  placeholderTextColor="#666"
                  value={customEndDate}
                  onChangeText={setCustomEndDate}
                />
                <TouchableOpacity style={styles.applyDateBtn} onPress={applyDateFilter}>
                  <Text style={styles.applyDateBtnText}>Apply Filter</Text>
                </TouchableOpacity>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Running Trades Section - Show ALL active trades */}
              {activeTrades.length > 0 && (
                <View style={styles.historySection}>
                  <View style={styles.historySectionHeader}>
                    <View style={styles.runningDot} />
                    <Text style={styles.historySectionTitle}>Running Trades ({activeTrades.length})</Text>
                  </View>
                  {activeTrades.map((trade) => {
                    const tradeAsset = ALL_ASSETS.find(a => a.value === trade.asset) || currentAsset;
                    
                    return (
                      <View key={trade.id} style={[styles.tradeCard, styles.tradeCardPending, { marginBottom: 10 }]}>
                        <View style={styles.tradeCardHeader}>
                          <View style={styles.tradeAsset}>
                            <Text style={styles.tradeAssetIcon}>{tradeAsset.icon}</Text>
                            <Text style={styles.tradeAssetName}>{trade.asset}</Text>
                          </View>
                          <View style={[styles.directionBadge, trade.type === 'call' ? styles.directionUp : styles.directionDown]}>
                            <Ionicons 
                              name={trade.type === 'call' ? 'arrow-up' : 'arrow-down'} 
                              size={12} 
                              color="#FFFFFF" 
                            />
                            <Text style={styles.directionText}>
                              {trade.type === 'call' ? 'UP' : 'DOWN'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.tradeCardBody}>
                          <View style={styles.tradeInfo}>
                            <Text style={styles.tradeInfoLabel}>Amount</Text>
                            <Text style={styles.tradeInfoValue}>${trade.amount}</Text>
                          </View>
                          <View style={styles.tradeInfo}>
                            <Text style={styles.tradeInfoLabel}>Time Left</Text>
                            <Text style={[styles.tradeInfoValue, { color: '#FFB800' }]}>{trade.countdown}s</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Previous Trades Section - Based on selected tab */}
              <View style={styles.historySection}>
                <Text style={styles.historySectionTitle}>
                  {historyTab === 'real' ? 'Real Account Trades' : 'Demo Account Trades'}
                </Text>
                
                {(historyTab === 'real' ? realTradeHistory : demoTradeHistory).length === 0 ? (
                  <View style={styles.emptyHistory}>
                    <Ionicons name="document-text-outline" size={48} color="#444" />
                    <Text style={styles.emptyHistoryText}>No trades yet</Text>
                  </View>
                ) : (
                  (historyTab === 'real' ? realTradeHistory : demoTradeHistory).map((trade, index) => (
                    <TouchableOpacity 
                      key={trade.trade_id || index} 
                      style={styles.historyCard}
                      onPress={() => showTradeDetailModal(trade)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.historyCardLeft}>
                        <View style={styles.historyAsset}>
                          <Text style={styles.historyAssetIcon}>
                            {trade.asset?.includes('EUR') ? '🇪🇺🇺🇸' : 
                             trade.asset?.includes('GBP') ? '🇬🇧🇺🇸' : 
                             trade.asset?.includes('JPY') ? '🇯🇵' : '💱'}
                          </Text>
                          <View>
                            <Text style={styles.historyAssetName}>{trade.asset || 'Unknown'}</Text>
                            <Text style={styles.historyTime}>
                              {trade.created_at ? formatTradeDate(trade.created_at) : trade.time_ago || 'just now'}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.historyCardCenter}>
                        <View style={[styles.historyDirection, trade.trade_type === 'call' ? styles.directionUp : styles.directionDown]}>
                          <Ionicons 
                            name={trade.trade_type === 'call' ? 'arrow-up' : 'arrow-down'} 
                            size={10} 
                            color="#FFFFFF" 
                          />
                        </View>
                        <Text style={styles.historyAmount}>${trade.amount}</Text>
                      </View>
                      <View style={styles.historyCardRight}>
                        <Text style={[
                          styles.historyProfit, 
                          trade.status === 'won' ? { color: '#00E55A' } : { color: '#FF3B3B' }
                        ]}>
                          {trade.profit_loss > 0 ? '+' : ''}${(trade.profit_loss || 0).toFixed(2)}
                        </Text>
                        <Text style={[
                          styles.historyStatus, 
                          trade.status === 'won' ? { color: '#00E55A' } : { color: '#FF3B3B' }
                        ]}>
                          {trade.status === 'won' ? 'Profit' : 'Loss'}
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color="#666" />
                      </View>
                    </TouchableOpacity>
                  ))
                )}
                
                {/* Load More Button */}
                {hasMoreHistory && (historyTab === 'real' ? realTradeHistory : demoTradeHistory).length >= 20 && (
                  <TouchableOpacity 
                    style={styles.loadMoreBtn}
                    onPress={loadMoreHistory}
                    disabled={loadingMoreHistory}
                  >
                    {loadingMoreHistory ? (
                      <Text style={styles.loadMoreText}>Loading...</Text>
                    ) : (
                      <>
                        <Ionicons name="refresh" size={16} color="#00E55A" />
                        <Text style={styles.loadMoreText}>Load More</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Summary Section */}
              <View style={styles.historySummary}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total</Text>
                  <Text style={styles.summaryValue}>
                    {(historyTab === 'real' ? realTradeHistory : demoTradeHistory).length}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Profit</Text>
                  <Text style={[styles.summaryValue, { color: '#00E55A' }]}>
                    {(historyTab === 'real' ? realTradeHistory : demoTradeHistory).filter(t => t.status === 'won').length}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Loss</Text>
                  <Text style={[styles.summaryValue, { color: '#FF3B3B' }]}>
                    {(historyTab === 'real' ? realTradeHistory : demoTradeHistory).filter(t => t.status === 'lost').length}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>P&L</Text>
                  <Text style={[styles.summaryValue, { 
                    color: (historyTab === 'real' ? realTradeHistory : demoTradeHistory).reduce((sum, t) => sum + (t.profit_loss || 0), 0) >= 0 ? '#00E55A' : '#FF3B3B' 
                  }]}>
                    ${(historyTab === 'real' ? realTradeHistory : demoTradeHistory).reduce((sum, t) => sum + (t.profit_loss || 0), 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
        
        {/* Trade Detail Slide Panel */}
        {showTradeDetail && selectedTradeDetail && (
          <Animated.View 
            style={[
              styles.tradeDetailPanel,
              {
                transform: [{
                  translateY: tradeDetailAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [400, 0],
                  })
                }],
                opacity: tradeDetailAnim,
              }
            ]}
          >
            <View style={styles.tradeDetailHeader}>
              <Text style={styles.tradeDetailTitle}>Trade Details</Text>
              <TouchableOpacity onPress={hideTradeDetailModal}>
                <Ionicons name="close-circle" size={28} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.tradeDetailContent}>
              {/* Asset Info */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Asset</Text>
                <Text style={styles.detailValue}>{selectedTradeDetail.asset}</Text>
              </View>
              
              {/* Direction */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Direction</Text>
                <View style={[styles.directionBadge, selectedTradeDetail.trade_type === 'call' ? styles.directionUp : styles.directionDown]}>
                  <Ionicons 
                    name={selectedTradeDetail.trade_type === 'call' ? 'arrow-up' : 'arrow-down'} 
                    size={12} 
                    color="#FFFFFF" 
                  />
                  <Text style={styles.directionText}>
                    {selectedTradeDetail.trade_type === 'call' ? 'UP' : 'DOWN'}
                  </Text>
                </View>
              </View>
              
              {/* Entry Point */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Entry Price</Text>
                <Text style={styles.detailValue}>${selectedTradeDetail.entry_price?.toFixed(5) || '0.00000'}</Text>
              </View>
              
              {/* Exit Point */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Exit Price</Text>
                <Text style={styles.detailValue}>${selectedTradeDetail.exit_price?.toFixed(5) || '0.00000'}</Text>
              </View>
              
              {/* Amount */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount</Text>
                <Text style={styles.detailValue}>${selectedTradeDetail.amount?.toFixed(2) || '0.00'}</Text>
              </View>
              
              {/* Result */}
              <View style={[styles.detailRow, styles.detailResultRow]}>
                <Text style={styles.detailLabel}>Result</Text>
                <View style={[
                  styles.detailResultBadge,
                  { backgroundColor: selectedTradeDetail.status === 'won' ? 'rgba(0, 229, 90, 0.2)' : 'rgba(255, 59, 59, 0.2)' }
                ]}>
                  <Ionicons 
                    name={selectedTradeDetail.status === 'won' ? 'checkmark-circle' : 'close-circle'} 
                    size={20} 
                    color={selectedTradeDetail.status === 'won' ? '#00E55A' : '#FF3B3B'} 
                  />
                  <Text style={[
                    styles.detailResultText,
                    { color: selectedTradeDetail.status === 'won' ? '#00E55A' : '#FF3B3B' }
                  ]}>
                    {selectedTradeDetail.profit_loss > 0 ? '+' : ''}${(selectedTradeDetail.profit_loss || 0).toFixed(2)}
                  </Text>
                </View>
              </View>
              
              {/* Date */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>
                  {selectedTradeDetail.created_at ? formatTradeDate(selectedTradeDetail.created_at) : 'N/A'}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}
      </Modal>

      {/* Trade Result Popup - Small Badge Style */}
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
          <View style={[styles.resultBadge, tradeResult.won ? styles.resultBadgeWin : styles.resultBadgeLoss]}>
            <Ionicons 
              name={tradeResult.won ? 'checkmark-circle' : 'close-circle'} 
              size={18} 
              color={tradeResult.won ? '#00E55A' : '#FF3B3B'} 
            />
            <Text style={[styles.resultBadgeText, tradeResult.won ? styles.resultTextWin : styles.resultTextLoss]}>
              {tradeResult.won ? 'Profit' : 'Loss'} {tradeResult.won ? '+' : '-'}${Math.abs(tradeResult.profitLoss).toFixed(2)}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Onboarding Tutorial Modal */}
      <Modal
        visible={showTutorial}
        transparent={true}
        animationType="fade"
        onRequestClose={skipTutorial}
      >
        <View style={tutorialStyles.overlay}>
          <View style={tutorialStyles.container}>
            {/* Close Button */}
            <TouchableOpacity style={tutorialStyles.closeBtn} onPress={skipTutorial}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>

            {/* Logo */}
            <Image 
              source={require('../../assets/images/bynix-logo.png')}
              style={tutorialStyles.logo}
              resizeMode="contain"
            />

            {/* Step Counter (for non-intro steps) */}
            {!TUTORIAL_STEPS[tutorialStep].isIntro && (
              <Text style={tutorialStyles.stepCounter}>
                {tutorialStep}/{TUTORIAL_STEPS.length - 1}
              </Text>
            )}

            {/* Title */}
            <Text style={tutorialStyles.title}>{TUTORIAL_STEPS[tutorialStep].title}</Text>

            {/* Description */}
            <Text style={tutorialStyles.description}>{TUTORIAL_STEPS[tutorialStep].description}</Text>

            {/* Highlight Circle - for specific steps */}
            {tutorialStep === 1 && (
              <View style={tutorialStyles.highlightArea}>
                <Ionicons name="trending-up" size={60} color="#00E55A" />
                <Text style={tutorialStyles.highlightText}>📈 Price Chart</Text>
              </View>
            )}
            {tutorialStep === 2 && (
              <View style={tutorialStyles.highlightArea}>
                <View style={tutorialStyles.upDownContainer}>
                  <View style={[tutorialStyles.directionBox, { backgroundColor: 'rgba(0, 229, 90, 0.2)' }]}>
                    <Ionicons name="arrow-up" size={40} color="#00E55A" />
                    <Text style={[tutorialStyles.directionText, { color: '#00E55A' }]}>UP</Text>
                  </View>
                  <View style={[tutorialStyles.directionBox, { backgroundColor: 'rgba(255, 59, 59, 0.2)' }]}>
                    <Ionicons name="arrow-down" size={40} color="#FF3B3B" />
                    <Text style={[tutorialStyles.directionText, { color: '#FF3B3B' }]}>DOWN</Text>
                  </View>
                </View>
              </View>
            )}
            {tutorialStep === 3 && (
              <View style={tutorialStyles.highlightArea}>
                <View style={tutorialStyles.settingsPreview}>
                  <View style={tutorialStyles.settingItem}>
                    <Ionicons name="time" size={24} color="#FFB800" />
                    <Text style={tutorialStyles.settingLabel}>TIME</Text>
                    <Text style={tutorialStyles.settingValue}>1m 00s</Text>
                  </View>
                  <View style={tutorialStyles.settingItem}>
                    <Ionicons name="cash" size={24} color="#00E55A" />
                    <Text style={tutorialStyles.settingLabel}>AMOUNT</Text>
                    <Text style={tutorialStyles.settingValue}>$100</Text>
                  </View>
                </View>
              </View>
            )}
            {tutorialStep === 4 && (
              <View style={tutorialStyles.highlightArea}>
                <View style={tutorialStyles.profitPreview}>
                  <Text style={tutorialStyles.profitLabel}>Possible Profit</Text>
                  <Text style={tutorialStyles.profitValue}>+$85.00</Text>
                </View>
                <View style={tutorialStyles.buttonsPreview}>
                  <View style={[tutorialStyles.tradeBtn, { backgroundColor: '#00E55A' }]}>
                    <Ionicons name="arrow-up" size={24} color="#000" />
                    <Text style={tutorialStyles.tradeBtnText}>UP</Text>
                  </View>
                  <View style={[tutorialStyles.tradeBtn, { backgroundColor: '#FF3B3B' }]}>
                    <Ionicons name="arrow-down" size={24} color="#FFF" />
                    <Text style={[tutorialStyles.tradeBtnText, { color: '#FFF' }]}>DOWN</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Navigation Buttons */}
            <View style={tutorialStyles.buttonRow}>
              {TUTORIAL_STEPS[tutorialStep].isIntro ? (
                <>
                  <TouchableOpacity style={tutorialStyles.skipBtn} onPress={skipTutorial}>
                    <Text style={tutorialStyles.skipBtnText}>Skip</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={tutorialStyles.continueBtn} onPress={nextTutorialStep}>
                    <Text style={tutorialStyles.continueBtnText}>Continue</Text>
                  </TouchableOpacity>
                </>
              ) : TUTORIAL_STEPS[tutorialStep].isFinal ? (
                <TouchableOpacity style={tutorialStyles.startTradingBtn} onPress={completeTutorial}>
                  <Text style={tutorialStyles.startTradingBtnText}>Start Trading</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity style={tutorialStyles.prevBtn} onPress={prevTutorialStep}>
                    <Ionicons name="chevron-back" size={20} color="#00E55A" />
                    <Text style={tutorialStyles.prevBtnText}>Previous</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={tutorialStyles.nextBtn} onPress={nextTutorialStep}>
                    <Text style={tutorialStyles.nextBtnText}>Next</Text>
                    <Ionicons name="chevron-forward" size={20} color="#000" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Account Choice Modal */}
      <Modal
        visible={showAccountChoice}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAccountChoice(false)}
      >
        <View style={accountChoiceStyles.overlay}>
          <ScrollView 
            contentContainerStyle={accountChoiceStyles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <Text style={accountChoiceStyles.header}>Choose your account</Text>

            {/* Demo Account Card */}
            <View style={accountChoiceStyles.card}>
              <View style={accountChoiceStyles.cardIcon}>
                <Ionicons name="paper-plane" size={32} color="#00E55A" />
              </View>
              <Text style={accountChoiceStyles.cardTitle}>Demo account</Text>
              <Text style={accountChoiceStyles.cardSubtitle}>
                Your demo account has a 10,000 $ balance
              </Text>
              
              <View style={accountChoiceStyles.benefitsList}>
                <View style={accountChoiceStyles.benefitRow}>
                  <Ionicons name="checkmark" size={16} color="#00E55A" />
                  <Text style={accountChoiceStyles.benefitText}>Practice trading without risk</Text>
                </View>
                <View style={accountChoiceStyles.benefitRow}>
                  <Ionicons name="checkmark" size={16} color="#00E55A" />
                  <Text style={accountChoiceStyles.benefitText}>Refill balance anytime</Text>
                </View>
                <View style={accountChoiceStyles.benefitRow}>
                  <Ionicons name="close" size={16} color="#FF6B6B" />
                  <Text style={accountChoiceStyles.benefitText}>Some assets are unavailable</Text>
                </View>
              </View>

              <Text style={accountChoiceStyles.tagText}>Without risk</Text>

              <TouchableOpacity style={accountChoiceStyles.demoBtn} onPress={selectDemoAccount}>
                <Text style={accountChoiceStyles.demoBtnText}>Trading on a demo account</Text>
              </TouchableOpacity>
            </View>

            {/* Real Account Card - Highlighted */}
            <View style={[accountChoiceStyles.card, accountChoiceStyles.cardHighlighted]}>
              <View style={accountChoiceStyles.cardIcon}>
                <Ionicons name="rocket" size={32} color="#00E55A" />
              </View>
              <Text style={accountChoiceStyles.cardTitle}>Real account</Text>
              <Text style={accountChoiceStyles.cardSubtitle}>
                Top up your account with the minimum amount and start earning
              </Text>
              
              <View style={accountChoiceStyles.benefitsList}>
                <View style={accountChoiceStyles.benefitRow}>
                  <Ionicons name="checkmark" size={16} color="#00E55A" />
                  <Text style={accountChoiceStyles.benefitText}>Minimum deposit — $25</Text>
                </View>
                <View style={accountChoiceStyles.benefitRow}>
                  <Ionicons name="checkmark" size={16} color="#00E55A" />
                  <Text style={accountChoiceStyles.benefitText}>Access more assets and features</Text>
                </View>
                <View style={accountChoiceStyles.benefitRow}>
                  <Ionicons name="checkmark" size={16} color="#00E55A" />
                  <Text style={accountChoiceStyles.benefitText}>Join tournaments and earn real money</Text>
                </View>
              </View>

              <View style={accountChoiceStyles.minDepositBadge}>
                <Text style={accountChoiceStyles.minDepositAmount}>25 $</Text>
                <Text style={accountChoiceStyles.minDepositLabel}>Minimum deposit</Text>
              </View>

              <TouchableOpacity style={accountChoiceStyles.realBtn} onPress={selectRealAccount}>
                <Text style={accountChoiceStyles.realBtnText}>Top up with 100 $</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1A0F',
  },
  // Promo Banner Styles - Overlay inside chart
  promoBanner: {
    alignSelf: 'center',
    width: '55%',
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  promoBannerOverlay: {
    position: 'absolute',
    top: 35,
    alignSelf: 'center',
    left: '22.5%',
    width: '55%',
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 100,
  },
  promoBannerTouchable: {
    backgroundColor: '#00A84D',
    paddingVertical: 8,
    paddingHorizontal: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  promoBannerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  promoBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  promoBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  promoBannerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  promoBannerHighlight: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  promoBannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  promoBannerPercent: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  promoBannerProgress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  promoBannerClose: {
    position: 'absolute',
    top: 2,
    right: 2,
    padding: 2,
    zIndex: 10,
  },
  // Time info overlay inside chart
  timeInfoRowOverlay: {
    position: 'absolute',
    top: 4,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: 'rgba(10, 26, 15, 0.98)',
    // Black shadow below header
    boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.8)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  headerLogoContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  logoGlowWrapper: {
    borderRadius: 50,
    padding: 5,
    // Very intense dark green glow - multiple layers
    boxShadow: '0 0 60px 25px rgba(0, 229, 90, 0.8), 0 0 100px 45px rgba(0, 229, 90, 0.5), 0 0 150px 70px rgba(0, 229, 90, 0.3), 0 0 200px 100px rgba(0, 100, 40, 0.2)',
    // Native shadow fallback
    shadowColor: '#00E55A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 60,
    elevation: 50,
  },
  headerLogo: {
    width: 80,
    height: 80,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 'auto',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  depositButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 90, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  depositButtonAnimated: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00E55A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
    shadowColor: '#00E55A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
  },
  // Premium Gold Deposit Button Styles
  depositButton3D: {
    borderRadius: 10,
    overflow: 'hidden',
    marginLeft: 4,
  },
  depositButton3DInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FFA500',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  depositBonusBadge3D: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    gap: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.3)',
  },
  depositBonusText3D: {
    color: '#1A1A1A',
    fontSize: 10,
    fontWeight: '900',
  },
  depositText3D: {
    color: '#1A1A1A',
    fontSize: 11,
    fontWeight: '800',
  },
  depositText: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 90, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  depositText: {
    color: '#00E55A',
    fontSize: 12,
    fontWeight: '700',
  },
  depositTextAnimated: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  timeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0A1A0F',
    gap: 12,
  },
  candleCountdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  candleCountdownText: {
    color: '#FFB800',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  utcTimeText: {
    color: '#AAAAAA',
    fontSize: 12,
    fontWeight: '500',
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
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1.5,
    borderColor: '#00E55A',
  },
  balanceText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  notifButton: {
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 6,
    borderRadius: 8,
  },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FF3B3B',
  },
  demoBalance: {
    backgroundColor: '#8B0000',
    borderColor: '#FF3B3B',
  },
  demoBalanceText: {
    color: '#FFFFFF',
  },
  realBalance: {
    backgroundColor: '#006400',
    borderColor: '#00E55A',
  },
  realBalanceText: {
    color: '#FFFFFF',
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
    borderColor: 'rgba(0, 229, 90, 0.3)',
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
  },
  accountIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 229, 90, 0.15)',
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
    color: '#00E55A',
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
    color: '#0A1A0F',
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
    backgroundColor: '#0A0A0A',
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
    backgroundColor: '#00E55A',
  },
  timeframeText: {
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
  },
  timeframeTextActive: {
    color: '#0A1A0F',
  },
  toolsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(10, 26, 15, 0.95)',
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
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.3)',
  },
  tradeHistoryBtnText: {
    color: '#FFB800',
    fontSize: 12,
    fontWeight: '700',
  },
  marketSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.3)',
  },
  marketSelectIcon: {
    fontSize: 16,
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
    color: '#0A1A0F',
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
    backgroundColor: '#00E55A',
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
    borderColor: 'rgba(0, 229, 90, 0.3)',
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
    backgroundColor: '#00E55A',
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
  // History Tab Styles
  historyTabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 10,
  },
  historyTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  historyTabActive: {
    backgroundColor: 'rgba(0, 229, 90, 0.15)',
    borderColor: '#00E55A',
  },
  historyTabActiveDemo: {
    backgroundColor: 'rgba(255, 59, 59, 0.15)',
    borderColor: '#FF3B3B',
  },
  historyTabText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
  historyTabTextActive: {
    color: '#00E55A',
  },
  historyTabTextActiveDemo: {
    color: '#FF3B3B',
  },
  historyTabBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  historyTabBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  // Trade Detail Panel Styles
  tradeDetailPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
  },
  tradeDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tradeDetailTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  tradeDetailContent: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  detailLabel: {
    color: '#888',
    fontSize: 14,
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  detailResultRow: {
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  detailResultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  detailResultText: {
    fontSize: 18,
    fontWeight: '800',
  },
  // Date Filter Styles
  dateFilterContainer: {
    marginBottom: 16,
  },
  dateFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    marginRight: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dateFilterBtnActive: {
    backgroundColor: 'rgba(0, 229, 90, 0.15)',
    borderColor: '#00E55A',
  },
  dateFilterText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  dateFilterTextActive: {
    color: '#00E55A',
  },
  customDatePicker: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  customDateLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 6,
  },
  customDateInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  applyDateBtn: {
    backgroundColor: '#00E55A',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  applyDateBtnText: {
    color: '#0A0A0A',
    fontSize: 14,
    fontWeight: '700',
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 90, 0.3)',
  },
  loadMoreText: {
    color: '#00E55A',
    fontSize: 14,
    fontWeight: '600',
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
  chartTypeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  chartTypeItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 6,
  },
  chartTypeItemActive: {
    backgroundColor: 'rgba(0, 229, 90, 0.15)',
    borderColor: '#00E55A',
  },
  chartTypeText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  chartTypeTextActive: {
    color: '#00E55A',
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
    backgroundColor: 'rgba(0, 229, 90, 0.2)',
    borderColor: '#00E55A',
  },
  candleTimeText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  candleTimeTextActive: {
    color: '#00E55A',
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
    backgroundColor: 'rgba(10, 26, 15, 0.98)',
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
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 90, 0.3)',
  },
  payoutLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
  },
  payoutValue: {
    color: '#00E55A',
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
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.3)',
  },
  setTimeText: {
    color: '#FFB800',
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
    backgroundColor: 'rgba(0, 229, 90, 0.2)',
    borderColor: '#00E55A',
  },
  quickTimeText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
  },
  quickTimeTextActive: {
    color: '#00E55A',
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
    backgroundColor: '#00E55A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  setCustomTimeBtnText: {
    color: '#0A1A0F',
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
    backgroundColor: 'rgba(0, 229, 90, 0.2)',
    borderColor: '#00E55A',
  },
  quickTimeGridText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '700',
  },
  quickTimeGridTextActive: {
    color: '#00E55A',
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
    backgroundColor: 'rgba(0, 229, 90, 0.2)',
    borderWidth: 1,
    borderColor: '#00E55A',
  },
  durationText: {
    color: '#999',
    fontSize: 11,
    fontWeight: '600',
  },
  durationTextActive: {
    color: '#00E55A',
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
    color: '#00E55A',
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
    backgroundColor: 'rgba(0, 229, 90, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  quickButtonText: {
    color: '#00E55A',
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
    color: '#00E55A',
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
    backgroundColor: '#00E55A',
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
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
    borderColor: '#00E55A',
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
    color: '#00E55A',
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
  categoryTabs: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 4,
  },
  categoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  categoryTabActive: {
    backgroundColor: '#00E55A',
  },
  categoryTabIcon: {
    fontSize: 16,
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
  },
  assetList: {
    maxHeight: 400,
  },
  assetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  assetOptionSelected: {
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
    borderColor: 'rgba(0, 229, 90, 0.3)',
  },
  assetOptionIcon: {
    fontSize: 24,
    marginRight: 12,
    width: 32,
    textAlign: 'center',
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
    color: '#00E55A',
    marginTop: 2,
  },
  resultPopup: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  resultBadgeWin: {
    backgroundColor: 'rgba(0, 229, 90, 0.15)',
    borderColor: 'rgba(0, 229, 90, 0.4)',
  },
  resultBadgeLoss: {
    backgroundColor: 'rgba(255, 59, 59, 0.15)',
    borderColor: 'rgba(255, 59, 59, 0.4)',
  },
  resultBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  resultTextWin: {
    color: '#00E55A',
  },
  resultTextLoss: {
    color: '#FF3B3B',
  },
  resultCard: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  resultWin: {
    backgroundColor: 'rgba(0, 229, 90, 0.95)',
  },
  resultLoss: {
    backgroundColor: 'rgba(255, 59, 59, 0.95)',
  },
  resultIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 16,
    letterSpacing: 1,
  },
  resultAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  resultPriceRow: {
    marginTop: 8,
    alignItems: 'center',
  },
  resultPriceText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
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
  tradeCardProfit: {
    borderColor: '#00E55A',
    borderWidth: 2,
  },
  tradeCardLoss: {
    borderColor: '#FF3B3B',
    borderWidth: 2,
  },
  tradeCardPending: {
    borderColor: '#FFB800',
    borderWidth: 2,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyHistoryText: {
    color: '#666',
    marginTop: 12,
    fontSize: 14,
  },
});

// Tutorial Styles
const tutorialStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#1A2633',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00E55A33',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 16,
  },
  stepCounter: {
    color: '#00E55A',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    color: '#AAA',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  highlightArea: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(0, 229, 90, 0.05)',
    borderRadius: 12,
  },
  highlightText: {
    color: '#00E55A',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  upDownContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  directionBox: {
    width: 80,
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  directionText: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  settingsPreview: {
    flexDirection: 'row',
    gap: 24,
  },
  settingItem: {
    alignItems: 'center',
    gap: 6,
  },
  settingLabel: {
    color: '#888',
    fontSize: 11,
  },
  settingValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  profitPreview: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profitLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  profitValue: {
    color: '#00E55A',
    fontSize: 28,
    fontWeight: '800',
  },
  buttonsPreview: {
    flexDirection: 'row',
    gap: 16,
  },
  tradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  tradeBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center',
  },
  skipBtnText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '600',
  },
  continueBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#00E55A',
    alignItems: 'center',
  },
  continueBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  prevBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#00E55A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  prevBtnText: {
    color: '#00E55A',
    fontSize: 15,
    fontWeight: '600',
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#00E55A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  nextBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  startTradingBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 10,
    backgroundColor: '#00E55A',
    alignItems: 'center',
  },
  startTradingBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },
});

// Account Choice Modal Styles
const accountChoiceStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#1A2633',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  cardHighlighted: {
    borderWidth: 2,
    borderColor: '#00E55A',
  },
  cardIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 229, 90, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardSubtitle: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  benefitsList: {
    width: '100%',
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  benefitText: {
    color: '#CCC',
    fontSize: 13,
  },
  tagText: {
    color: '#00E55A',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  demoBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center',
  },
  demoBtnText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  minDepositBadge: {
    alignItems: 'center',
    marginBottom: 16,
  },
  minDepositAmount: {
    color: '#00E55A',
    fontSize: 32,
    fontWeight: '800',
  },
  minDepositLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  realBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#00E55A',
    alignItems: 'center',
  },
  realBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
});

// Deposit Modal Styles
const depositModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#0F1428',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  label: {
    color: '#888',
    fontSize: 14,
    marginBottom: 10,
    marginTop: 16,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D2818',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 90, 0.3)',
  },
  amountPrefix: {
    color: '#00E55A',
    fontSize: 28,
    fontWeight: '700',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    padding: 0,
  },
  minimum: {
    color: '#666',
    fontSize: 12,
    marginTop: 8,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  quickBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'transparent',
  },
  quickBtnActive: {
    backgroundColor: '#0D2818',
    borderColor: '#00E55A',
  },
  quickBtnText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  quickBtnTextActive: {
    color: '#00E55A',
  },
  networkSelect: {
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
  networkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  networkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  networkDropdown: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  networkOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  networkOptionActive: {
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
  },
  networkOptionText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  noFees: {
    color: '#00E55A',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
  },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  promoInput: {
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
  promoQuickBtn: {
    backgroundColor: '#00E55A',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
  },
  promoQuickText: {
    color: '#0A0A0A',
    fontSize: 14,
    fontWeight: '700',
  },
  promoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(100, 100, 100, 0.3)',
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
    gap: 12,
  },
  promoInfoText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  generateBtn: {
    backgroundColor: '#00E55A',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 24,
  },
  generateBtnText: {
    color: '#0A0A0A',
    fontSize: 16,
    fontWeight: '700',
  },
  // Generated Address Styles
  addressSection: {
    alignItems: 'center',
    paddingTop: 20,
  },
  successIcon: {
    marginBottom: 20,
  },
  addressTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  addressNetwork: {
    color: '#00E55A',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 24,
  },
  addressBox: {
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 90, 0.3)',
  },
  addressText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00E55A',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginBottom: 24,
  },
  copyBtnText: {
    color: '#0A0A0A',
    fontSize: 15,
    fontWeight: '700',
  },
  depositInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 16,
    width: '100%',
    marginBottom: 16,
  },
  depositInfoTitle: {
    color: '#888',
    fontSize: 14,
  },
  depositInfoAmount: {
    color: '#00E55A',
    fontSize: 20,
    fontWeight: '700',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    borderRadius: 10,
    padding: 14,
    width: '100%',
    marginBottom: 20,
    gap: 12,
  },
  warningText: {
    color: '#FFB800',
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  doneBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Error Box
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 59, 0.15)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  errorText: {
    color: '#FF3B3B',
    fontSize: 13,
    flex: 1,
  },
  // QR Code Section
  qrContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    alignSelf: 'center',
  },
  // Payment Info Cards
  paymentInfoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  paymentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentInfoLabel: {
    color: '#888',
    fontSize: 13,
  },
  paymentInfoValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  expiryText: {
    color: '#FFB800',
    fontWeight: '700',
    fontSize: 16,
  },
  addressLabel: {
    color: '#888',
    fontSize: 13,
    marginBottom: 8,
    marginTop: 8,
  },
  // Amount to Send Card
  amountToSendCard: {
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 90, 0.3)',
  },
  amountToSendLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 6,
  },
  amountToSendValue: {
    color: '#00E55A',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  amountToSendUsd: {
    color: '#666',
    fontSize: 13,
  },
});
