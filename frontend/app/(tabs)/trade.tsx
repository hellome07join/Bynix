import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Pressable,
  TextInput,
  Alert,
  Dimensions,
  Modal,
  Animated,
  ScrollView,
  Switch,
  Image,
  Platform,
  ActivityIndicator,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState
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

// Extracted components
import { IndicatorModal, ToolsModal } from '../../components/trade';
import type { ActiveIndicators } from '../../components/trade';

// Constants
import { TIMEFRAMES, DURATIONS, TUTORIAL_STEPS } from '../../constants/tradeConfig';
import { 
  MarketCategory, 
  Asset, 
  MARKET_CATEGORIES, 
  DEMO_ASSETS, 
  REAL_ASSETS, 
  ALL_ASSETS,
  getAssetsForAccount,
  getDefaultAssetForAccount 
} from '../../constants/assets';

declare const window: any;

// Sound effects
const lossSound = require('../../assets/sounds/loss.mp3');
const winSound = require('../../assets/sounds/win.wav');

const { width, height } = Dimensions.get('window');

export default function Trade() {
  const router = useRouter();
  const { user, token, accountType, setAccountType, updateBalance, chartTimeframe, setChartTimeframe } = useAuthStore();
  
  // Local demo balance (for when user is not logged in)
  const [localDemoBalance, setLocalDemoBalance] = useState(10000);
  
  // Get actual balance (use local if no user)
  const demoBalance = user?.demo_balance ?? localDemoBalance;
  // For real account, use total_balance which includes deposit + bonus + profit
  const realBalance = user?.total_balance ?? user?.real_balance ?? 0;
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
  
  // Trading - use chartTimeframe from global store instead of local state
  const [amount, setAmount] = useState('100');
  const timeframe = chartTimeframe; // Use global store value
  const setTimeframe = setChartTimeframe; // Use global store setter
  const [duration, setDuration] = useState(60);
  
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [trendingAssets, setTrendingAssets] = useState<any[]>([]);
  const [apiPayouts, setApiPayouts] = useState<Record<string, number>>({});
  const [inactiveAssets, setInactiveAssets] = useState<Set<string>>(new Set());
  const [demoOnlyAssets, setDemoOnlyAssets] = useState<Set<string>>(new Set());
  const [isTradingEnabled, setIsTradingEnabled] = useState(true);
  const [dbAssets, setDbAssets] = useState<any[]>([]); // Assets from database
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
  const [horizontalLines, setHorizontalLines] = useState<{id: string, price: number, selected?: boolean}[]>([]);
  const [trendLines, setTrendLines] = useState<{id: string, startPrice: number, endPrice: number, startCandleIndex: number, endCandleIndex: number}[]>([]);
  const [trendLineStartPoint, setTrendLineStartPoint] = useState<{price: number, candleIndex: number} | null>(null);
  const [trendLinePreview, setTrendLinePreview] = useState<{startCandleIndex: number, startPrice: number, endCandleIndex: number, endPrice: number} | null>(null);
  const [chartDimensions, setChartDimensions] = useState({width: 0, height: 0});
  const [priceRange, setPriceRange] = useState({ min: 0, max: 0 });
  const chartContainerRef = useRef<View>(null);
  const [chartContainerLayout, setChartContainerLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [selectedTrendLineId, setSelectedTrendLineId] = useState<string | null>(null);
  const [draggingTrendLinePoint, setDraggingTrendLinePoint] = useState<'start' | 'end' | null>(null);
  const [showIndicatorModal, setShowIndicatorModal] = useState(false);
  
  // Indicators State
  const [activeIndicators, setActiveIndicators] = useState<{
    ma: boolean;
    bollingerBands: boolean;
    rsi: boolean;
    macd: boolean;
    stochastic: boolean;
  }>({
    ma: false,
    bollingerBands: false,
    rsi: false,
    macd: false,
    stochastic: false,
  });
  
  const [customMinutes, setCustomMinutes] = useState('1');
  const [customSeconds, setCustomSeconds] = useState('0');
  const [demoAddAmount, setDemoAddAmount] = useState('1000');
  
  // Insufficient Balance Modal State
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [insufficientMessage, setInsufficientMessage] = useState('');
  
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
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed' | null>(null);
  
  // TarsPay (bKash/Nagad) State
  const [depositMethod, setDepositMethod] = useState<'crypto' | 'ewallet'>('ewallet');
  const [selectedEwallet, setSelectedEwallet] = useState('bkash');
  const [ewalletPayUrl, setEwalletPayUrl] = useState<string | null>(null);
  const [ewalletOrderId, setEwalletOrderId] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState(120); // USD to BDT
  
  // Fetch exchange rate when deposit modal opens
  useEffect(() => {
    if (showDepositModal && depositMethod === 'ewallet') {
      fetch(`${API_URL}/tarspay/channels`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.exchange_rate?.usd_to_bdt) {
            setExchangeRate(data.exchange_rate.usd_to_bdt);
          }
        })
        .catch(err => console.log('Exchange rate fetch error:', err));
    }
  }, [showDepositModal, depositMethod]);
  
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
  
  // Verify Payment Function
  const verifyPayment = async () => {
    if (!paymentId) return;
    
    setIsVerifyingPayment(true);
    setPaymentStatus(null);
    
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/deposit/check/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      const data = await response.json();
      
      if (data.credited) {
        // Payment successful - update balance and redirect
        setPaymentStatus('success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Refresh user balance
        const meResponse = await fetch(`${API_URL}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (meResponse.ok) {
          const userData = await meResponse.json();
          setRealBalance(userData.real_balance || 0);
        }
        
        // Wait a bit to show success, then close and redirect
        setTimeout(() => {
          setShowDepositModal(false);
          setGeneratedAddress(null);
          setPaymentId(null);
          setPayAmount(null);
          setExpirationTime(null);
          setPaymentStatus(null);
          setAccountType('real'); // Switch to real account
          Alert.alert(
            '✅ Deposit Successful!', 
            `$${depositAmount} has been added to your real account.`,
            [{ text: 'Start Trading', style: 'default' }]
          );
        }, 2000);
      } else {
        // Payment not yet confirmed
        setPaymentStatus('failed');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setPaymentStatus('failed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsVerifyingPayment(false);
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

  // Fetch fresh trade history when modal opens
  useEffect(() => {
    if (showTradeHistory && token) {
      console.log('Trade history modal opened - fetching fresh data');
      fetchTradeHistory();
    }
  }, [showTradeHistory]);

  // Reset selected asset when account type changes to ensure it's valid for the new account
  // NOTE: Using a ref to track previous accountType to prevent infinite loops
  const prevAccountTypeRef = useRef(accountType);
  useEffect(() => {
    // Only run when accountType actually changes
    if (prevAccountTypeRef.current !== accountType) {
      prevAccountTypeRef.current = accountType;
      const validAssets = getAssetsForAccount(accountType);
      const isCurrentAssetValid = validAssets.some(a => a.value === selectedAsset);
      console.log(`Account type changed to: ${accountType}, current asset: ${selectedAsset}, valid: ${isCurrentAssetValid}`);
      if (!isCurrentAssetValid) {
        const newAsset = getDefaultAssetForAccount(accountType);
        console.log(`Resetting asset to: ${newAsset}`);
        setSelectedAsset(newAsset);
        setSelectedCategory('forex'); // Reset to default category
      }
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

  // Helper function to get icon for asset category
  const getCategoryIcon = (category: string, symbol: string) => {
    // Forex icons based on currency
    if (category === 'forex') {
      if (symbol?.includes('EUR')) return '🇪🇺';
      if (symbol?.includes('GBP')) return '🇬🇧';
      if (symbol?.includes('USD')) return '🇺🇸';
      if (symbol?.includes('JPY')) return '🇯🇵';
      if (symbol?.includes('AUD')) return '🇦🇺';
      if (symbol?.includes('NZD')) return '🇳🇿';
      if (symbol?.includes('CAD')) return '🇨🇦';
      if (symbol?.includes('CHF')) return '🇨🇭';
      return '💱';
    }
    // Crypto icons
    if (category === 'crypto') {
      if (symbol?.includes('BTC')) return '₿';
      if (symbol?.includes('ETH')) return 'Ξ';
      if (symbol?.includes('BNB')) return '🔶';
      if (symbol?.includes('XRP')) return '✕';
      if (symbol?.includes('DOGE')) return '🐕';
      if (symbol?.includes('SOL')) return '◎';
      if (symbol?.includes('ADA')) return '₳';
      return '🪙';
    }
    // Stock icons
    if (category === 'stocks') {
      if (symbol?.includes('AAPL')) return '🍎';
      if (symbol?.includes('TSLA')) return '⚡';
      if (symbol?.includes('GOOGL')) return '🔍';
      if (symbol?.includes('AMZN')) return '📦';
      if (symbol?.includes('MSFT')) return '🪟';
      if (symbol?.includes('META')) return '👤';
      if (symbol?.includes('NVDA')) return '🎮';
      if (symbol?.includes('NFLX')) return '🎬';
      return '📈';
    }
    // Commodities icons
    if (category === 'commodities') {
      if (symbol?.includes('XAU') || symbol?.includes('GOLD')) return '🥇';
      if (symbol?.includes('XAG') || symbol?.includes('SILVER')) return '🥈';
      if (symbol?.includes('OIL')) return '🛢️';
      if (symbol?.includes('GAS')) return '⛽';
      return '💎';
    }
    return '📊';
  };

  // Fetch trending assets
  const fetchTrendingAssets = async () => {
    try {
      const response = await fetch(`${API_URL}/market/trending?limit=10&days=7`);
      if (response.ok) {
        const data = await response.json();
        setTrendingAssets(data.trending || []);
      }
    } catch (error) {
      console.error('Error fetching trending assets:', error);
    }
  };

  // Fetch asset payouts from API (admin configured)
  const fetchAssetPayouts = async () => {
    try {
      // include_inactive=true to get ALL assets including disabled ones
      const response = await fetch(`${API_URL}/assets?include_inactive=true`);
      if (response.ok) {
        const assets = await response.json();
        const payoutMap: Record<string, number> = {};
        const inactiveSet = new Set<string>();
        const demoOnlySet = new Set<string>();
        
        // Convert database assets to format compatible with asset picker
        const formattedAssets = assets
          .filter((asset: any) => asset.is_active !== false)
          .map((asset: any) => ({
            value: asset.symbol + ' OTC',
            label: asset.name || asset.symbol + ' OTC',
            symbol: asset.symbol,
            payout: asset.payout_percentage || 85,
            category: asset.category || 'forex',
            icon: getCategoryIcon(asset.category, asset.symbol),
            demo_only: asset.demo_only || false, // Demo-only flag from API
          }));
        
        setDbAssets(formattedAssets);
        
        assets.forEach((asset: any) => {
          // Track demo-only assets
          if (asset.demo_only) {
            if (asset.symbol) {
              demoOnlySet.add(asset.symbol);
              demoOnlySet.add(asset.symbol + ' OTC');
              const noSlash = asset.symbol.replace('/', '');
              demoOnlySet.add(noSlash);
              demoOnlySet.add(noSlash + ' OTC');
            }
            if (asset.name) {
              demoOnlySet.add(asset.name);
            }
          }
          
          // Track inactive assets
          if (asset.is_active === false) {
            if (asset.symbol) {
              // Add multiple formats for matching
              inactiveSet.add(asset.symbol);           // "USD/CHF"
              inactiveSet.add(asset.symbol + ' OTC');  // "USD/CHF OTC"
              // Also add without slash for edge cases
              const noSlash = asset.symbol.replace('/', '');
              inactiveSet.add(noSlash);                // "USDCHF"
              inactiveSet.add(noSlash + ' OTC');       // "USDCHF OTC"
            }
            if (asset.name) {
              inactiveSet.add(asset.name);             // "USD/CHF OTC"
            }
          }
          
          if (asset.payout_percentage) {
            // Map by multiple formats to ensure matching
            // Database symbol: "NZD/USD", Frontend: "NZD/USD OTC"
            if (asset.symbol) {
              payoutMap[asset.symbol] = asset.payout_percentage;
              payoutMap[asset.symbol + ' OTC'] = asset.payout_percentage;
            }
            if (asset.name) {
              payoutMap[asset.name] = asset.payout_percentage;
            }
          }
        });
        
        setApiPayouts(payoutMap);
        setInactiveAssets(inactiveSet);
        setDemoOnlyAssets(demoOnlySet);
        console.log('Loaded', formattedAssets.length, 'assets from API, demo-only:', demoOnlySet.size);
      }
    } catch (error) {
      console.error('Error fetching asset payouts:', error);
    }
  };

  // Fetch platform trading status
  const fetchPlatformStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/platform/status`);
      if (response.ok) {
        const data = await response.json();
        setIsTradingEnabled(data.trading_enabled !== false);
      }
    } catch (error) {
      console.error('Error fetching platform status:', error);
    }
  };

  // Fetch trending assets on mount and when asset picker opens
  useEffect(() => {
    fetchTrendingAssets();
    fetchAssetPayouts();
    fetchPlatformStatus();
    const interval = setInterval(fetchTrendingAssets, 30000); // Refresh every 30 seconds
    const payoutInterval = setInterval(fetchAssetPayouts, 60000); // Refresh payouts every minute
    const statusInterval = setInterval(fetchPlatformStatus, 10000); // Check trading status every 10 seconds
    return () => {
      clearInterval(interval);
      clearInterval(payoutInterval);
      clearInterval(statusInterval);
    };
  }, []);

  useEffect(() => {
    if (showAssetPicker) {
      fetchTrendingAssets();
    }
  }, [showAssetPicker]);

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

  // Get assets - Demo mode shows ALL assets (with lock/unlock), Real mode shows only real assets
  const hardcodedAssets = getAssetsForAccount(accountType);
  const allAssets = [...getAssetsForAccount('real'), ...getAssetsForAccount('demo')];
  
  // Remove duplicates by value
  const uniqueAssets = allAssets.filter((asset, index, self) => 
    index === self.findIndex((a) => a.value === asset.value)
  );
  
  // Demo mode: Show ALL unique assets (with lock/unlock)
  // Real mode: Use dbAssets or hardcoded real assets
  const currentAssets = accountType === 'demo' 
    ? (dbAssets.length > 0 ? dbAssets : uniqueAssets)
    : (dbAssets.length > 0 ? dbAssets : hardcodedAssets);
  
  // Demo-only assets list (hardcoded for reliable switching)
  // Only these 6 Forex assets are unlocked in Demo mode
  const DEMO_ONLY_SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'NZDUSD', 'USDCAD'];
  
  // Check if asset is demo-only
  const checkIsDemoOnly = (asset: string) => {
    const cleanAsset = asset.toUpperCase().replace(/[\/\s]/g, '').replace('OTC', '');
    return DEMO_ONLY_SYMBOLS.some(symbol => cleanAsset.includes(symbol) || symbol.includes(cleanAsset));
  };
  
  // Auto-select valid asset when account type changes
  useEffect(() => {
    const isDemoOnlyAsset = checkIsDemoOnly(selectedAsset);
    
    console.log(`[ACCOUNT CHECK] accountType=${accountType}, selectedAsset=${selectedAsset}, isDemoOnly=${isDemoOnlyAsset}`);
    
    if (accountType === 'real' && isDemoOnlyAsset) {
      // Real account but demo-only asset selected - switch to EUR/JPY
      console.log('[ACCOUNT SWITCH] Real mode - switching to EUR/JPY OTC');
      setSelectedAsset('EUR/JPY OTC');
    } else if (accountType === 'demo' && !isDemoOnlyAsset) {
      // Demo account but real-only asset selected - switch to EUR/USD
      console.log('[ACCOUNT SWITCH] Demo mode - switching to EUR/USD OTC');
      setSelectedAsset('EUR/USD OTC');
    }
  }, [accountType, selectedAsset]);
  
  // Get current asset data
  const currentAsset = currentAssets.find(a => a.value === selectedAsset) || currentAssets[0];
  // Use API payout if available, otherwise fallback to hardcoded payout
  const payoutPercentage = apiPayouts[currentAsset?.value] || apiPayouts[currentAsset?.label] || currentAsset?.payout || 85;

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
    
    console.log(`Settling ${trades.length} trades simultaneously...`);
    
    // First, get exit price ONCE for all trades of same asset
    const exitPriceCache: {[key: string]: number} = {};
    
    // Pre-fetch exit prices for all unique assets
    for (const trade of trades) {
      const cleanSymbol = trade.asset.replace(' OTC', '').replace('/', '').toUpperCase();
      if (!exitPriceCache[cleanSymbol]) {
        try {
          let apiUrl = '';
          if (typeof window !== 'undefined') {
            const currentUrl = window.location.origin;
            if (currentUrl.includes('preview.emergentagent.com') || currentUrl.includes('ngrok')) {
              apiUrl = `${currentUrl}/api`;
            } else {
              apiUrl = `${currentUrl}/api`;
            }
          } else {
            apiUrl = '/api';
          }
          const response = await fetch(`${apiUrl}/chart/tick/${cleanSymbol}`, { method: 'POST' });
          if (response.ok) {
            const data = await response.json();
            if (data.new_tick && data.new_tick.close) {
              exitPriceCache[cleanSymbol] = data.new_tick.close;
              console.log(`Cached exit price for ${cleanSymbol}: ${exitPriceCache[cleanSymbol]}`);
            }
          }
        } catch (error) {
          console.error(`Failed to get exit price for ${cleanSymbol}:`, error);
        }
      }
    }
    
    // Settle each trade with cached exit price
    for (const trade of trades) {
      const cleanSymbol = trade.asset.replace(' OTC', '').replace('/', '').toUpperCase();
      const exitPrice = exitPriceCache[cleanSymbol] || currentPrice;
      
      console.log(`Settling trade ${trade.trade_id} with exit price: ${exitPrice}`);
      
      const result = await settleTradeWithCachedPrice(trade, exitPrice, false);
      if (result) {
        lastResult = result;
        if (result.won) {
          totalWon++;
        } else {
          totalLost++;
        }
      }
    }
    
    console.log(`Settlement complete: ${totalWon} won, ${totalLost} lost`);
    
    // Refresh user balance once after all trades settled
    if (token) {
      const { refreshUser } = useAuthStore.getState();
      await refreshUser();
    }
    
    // Refresh trade history after batch settlement
    fetchTradeHistory();
    
    // Show last result popup (or could show summary)
    if (lastResult) {
      setTradeResult(lastResult);
      showResultPopup();
    }
  };

  // Settle trade with pre-cached exit price
  const settleTradeWithCachedPrice = async (trade: ActiveTrade, exitPrice: number, shouldRefreshUser: boolean = true) => {
    if (!trade) return null;
    
    console.log(`settleTradeWithCachedPrice: trade_id=${trade.trade_id}, exit=${exitPrice}`);

    // TRADE SETTLEMENT - Get result from backend
    const entryPrice = trade.entry_price;
    let won: boolean = false;
    let profitLoss: number = -trade.amount;
    let finalExitPrice = exitPrice;
    
    if (token && trade.trade_id) {
      try {
        const result = await api.settleTrade(trade.trade_id, exitPrice, token);
        console.log(`Backend settlement result for ${trade.trade_id}:`, result);
        
        won = result.status === 'won';
        profitLoss = result.profit_loss;
        
        if (result.exit_price) {
          finalExitPrice = result.exit_price;
        }
        
        if (shouldRefreshUser) {
          const { refreshUser } = useAuthStore.getState();
          await refreshUser();
        }
        
      } catch (error: any) {
        console.error(`Error settling trade ${trade.trade_id}:`, error);
        // Check if trade was already settled
        if (error.message?.includes('already settled')) {
          console.log(`Trade ${trade.trade_id} was already settled, skipping`);
          return null;
        }
        // Fallback to price-based logic
        if (trade.type === 'call') {
          won = exitPrice > entryPrice;
        } else {
          won = exitPrice < entryPrice;
        }
        if (exitPrice === entryPrice) won = false;
        profitLoss = won ? trade.amount * (payoutPercentage / 100) : -trade.amount;
      }
    } else {
      // Not logged in - use local logic
      if (trade.type === 'call') {
        won = exitPrice > entryPrice;
      } else {
        won = exitPrice < entryPrice;
      }
      if (exitPrice === entryPrice) won = false;
      profitLoss = won ? trade.amount * (payoutPercentage / 100) : -trade.amount;
    }

    // Success or Error haptic feedback
    if (won) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    return {
      won,
      amount: trade.amount,
      profitLoss: profitLoss,
      entry_price: entryPrice,
      exit_price: finalExitPrice,
      type: trade.type,
      asset: trade.asset,
    };
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

    // Check if trading is enabled globally
    if (!isTradingEnabled) {
      Alert.alert('Trading Disabled', 'Trading is currently disabled by the platform administrator. Please try again later.');
      return;
    }

    if (cooldownRef.current) {
      Alert.alert('Please wait', 'Cooldown active');
      return;
    }

    const tradeAmount = parseFloat(amount);
    if (isNaN(tradeAmount) || tradeAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    // Debug log for balance check
    console.log('=== BALANCE CHECK ===');
    console.log('accountType:', accountType);
    console.log('user?.total_balance:', user?.total_balance);
    console.log('user?.real_balance:', user?.real_balance);
    console.log('currentBalance:', currentBalance);
    console.log('tradeAmount:', tradeAmount);
    console.log('tradeAmount > currentBalance:', tradeAmount > currentBalance);

    // Check balance - Show insufficient balance popup with deposit option
    if (tradeAmount > currentBalance) {
      console.log('>>> INSUFFICIENT BALANCE - Showing custom modal');
      setInsufficientMessage(`You have $${currentBalance.toFixed(2)} but trying to trade $${tradeAmount.toFixed(2)}.\n\nPlease deposit funds to continue trading.`);
      setShowInsufficientModal(true);
      return;
    }

    // Additional check for real account with 0 balance
    if (accountType === 'real' && currentBalance <= 0) {
      console.log('>>> ZERO BALANCE - Showing custom modal');
      setInsufficientMessage('Your account balance is $0.00.\n\nPlease deposit funds to start trading.');
      setShowInsufficientModal(true);
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
    
    // Calculate deduction from real_balance first, then bonus_balance
    const previousRealBalance = user?.real_balance || 0;
    const previousBonusBalance = user?.bonus_balance || 0;
    const previousTotalBalance = user?.total_balance || (previousRealBalance + previousBonusBalance);
    
    // Deduct from real_balance first, then bonus_balance
    let deductFromReal = Math.min(previousRealBalance, tradeAmount);
    let deductFromBonus = tradeAmount - deductFromReal;
    
    const newRealBalance = previousRealBalance - deductFromReal;
    const newBonusBalance = previousBonusBalance - deductFromBonus;
    const newTotalBalance = newRealBalance + newBonusBalance;
    
    // Deduct amount IMMEDIATELY when trade is placed
    if (user) {
      updateBalance(user.demo_balance || 10000, newRealBalance, newBonusBalance, newTotalBalance);
      console.log('>>> Balance deducted immediately:', { 
        deductFromReal, 
        deductFromBonus, 
        newRealBalance, 
        newBonusBalance, 
        newTotalBalance 
      });
    }
    
    try {
      console.log('Calling api.createTrade with:', {
        asset: selectedAsset,
        trade_type: type,
        direction: type === 'call' ? 'up' : 'down',
        amount: tradeAmount,
        duration,
        entry_price: currentPrice,
        account_type: accountType,
        payout_percentage: payoutPercentage,
      });
      const response = await api.createTrade({
        asset: selectedAsset,
        trade_type: type,
        direction: type === 'call' ? 'up' : 'down',
        amount: tradeAmount,
        duration,
        entry_price: currentPrice,
        account_type: accountType,
        payout_percentage: payoutPercentage,
      }, token);

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
      // Revert balance if API call failed
      if (user) {
        updateBalance(user.demo_balance || 10000, previousRealBalance, previousBonusBalance, previousTotalBalance);
        console.log('>>> Balance reverted due to API error');
      }
      Alert.alert('Trade Failed', error.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  // Settle a specific trade by ID
  const settleTradeById = async (tradeId: string, shouldRefreshUser: boolean = true) => {
    const trade = activeTrades.find(t => t.id === tradeId);
    if (!trade) return null;
    return await settleTradeWithData(trade, shouldRefreshUser);
  };

  // Settle trade with direct trade data (avoids stale state issues in batch settlement)
  const settleTradeWithData = async (trade: ActiveTrade, shouldRefreshUser: boolean = true) => {
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
            <Ionicons name="notifications" size={12} color="#888888" />
            <View style={styles.notifBadge} />
          </TouchableOpacity>

          {/* Premium Gold Deposit Button */}
          <TouchableOpacity 
            style={styles.depositButton3D}
            onPress={() => setShowDepositModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.depositButton3DInner}>
              <Ionicons name="gift" size={10} color="#1A1A1A" />
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
            size={10} 
            color="#FFFFFF" 
          />
          <Text style={[styles.balanceText, accountType === 'demo' ? styles.demoBalanceText : styles.realBalanceText]}>
            ${currentBalance.toFixed(2)}
          </Text>
          <Ionicons name="chevron-down" size={10} color="#FFFFFF" />
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
      <View 
        ref={chartContainerRef}
        style={styles.chartContainer}
        onLayout={(event) => {
          const { x, y, width, height } = event.nativeEvent.layout;
          setChartDimensions({ width, height });
          setChartContainerLayout({ x, y, width, height });
        }}
      >
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
            horizontalLines={horizontalLines}
            trendLines={trendLines}
            trendLinePreview={trendLinePreview}
            onPriceUpdate={(price) => setCurrentPrice(price)}
            onPriceRangeChange={(range) => setPriceRange(range)}
            onChartMove={(y: number, chartHeight: number, x?: number) => {
              // Only update preview when we have a start point and are in trendline mode
              if (selectedDrawTool === 'trendline' && trendLineStartPoint && x !== undefined) {
                const chartPaddingTop = 20;
                const chartPaddingBottom = 45;
                const effectiveChartHeight = chartHeight - chartPaddingTop - chartPaddingBottom;
                const adjustedY = y - chartPaddingTop;
                const priceRatio = Math.max(0, Math.min(1, adjustedY / effectiveChartHeight));
                const price = priceRange.max - (priceRatio * (priceRange.max - priceRange.min));
                
                const scale = 1;
                const candleWidth = 8 * scale;
                const candleGap = 4 * scale;
                const totalCandleWidth = candleWidth + candleGap;
                const chartWidth = chartDimensions.width || 390;
                const paddingRight = 80;
                const chartRightEdge = chartWidth - paddingRight;
                const candleIndex = Math.round((chartRightEdge - x) / totalCandleWidth);
                
                // Update preview
                setTrendLinePreview({
                  startCandleIndex: trendLineStartPoint.candleIndex,
                  startPrice: trendLineStartPoint.price,
                  endCandleIndex: candleIndex,
                  endPrice: price
                });
              }
            }}
            onChartClick={(y: number, chartHeight: number, x?: number) => {
              // Chart has padding - top: 20, bottom: 45 (for price axis)
              const chartPaddingTop = 20;
              const chartPaddingBottom = 45;
              const effectiveChartHeight = chartHeight - chartPaddingTop - chartPaddingBottom;
              
              // Adjust Y position for padding
              const adjustedY = y - chartPaddingTop;
              
              // Calculate price from Y position
              const priceRatio = Math.max(0, Math.min(1, adjustedY / effectiveChartHeight));
              const price = priceRange.max - (priceRatio * (priceRange.max - priceRange.min));
              
              // Handle horizontal line drawing
              if (selectedDrawTool === 'horizontal' && priceRange.max > priceRange.min) {
                console.log('Adding horizontal line from chart click:', { 
                  y, 
                  chartHeight, 
                  priceRange, 
                  price,
                  adjustedY,
                  priceRatio
                });
                
                // Only add line if price is valid
                if (!isNaN(price) && price > 0) {
                  const newLine = {
                    id: `line_${Date.now()}`,
                    price,
                    selected: false
                  };
                  setHorizontalLines(prev => [...prev, newLine]);
                  setSelectedDrawTool(null);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } else {
                  console.log('Invalid price calculated, not adding line');
                }
              } 
              // Handle trend line drawing - first click sets start, second click finalizes
              else if (selectedDrawTool === 'trendline' && priceRange.max > priceRange.min && x !== undefined) {
                const scale = 1;
                const candleWidth = 8 * scale;
                const candleGap = 4 * scale;
                const totalCandleWidth = candleWidth + candleGap;
                const chartWidth = chartDimensions.width || 390;
                const paddingRight = 80;
                const chartRightEdge = chartWidth - paddingRight;
                const candleIndex = Math.round((chartRightEdge - x) / totalCandleWidth);
                
                if (!trendLineStartPoint) {
                  // First click - set start point and start preview
                  console.log('Trend line start point:', { x, candleIndex, price });
                  setTrendLineStartPoint({ price, candleIndex });
                  setTrendLinePreview({
                    startCandleIndex: candleIndex,
                    startPrice: price,
                    endCandleIndex: candleIndex,
                    endPrice: price
                  });
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } else {
                  // Second click - finalize the trend line
                  console.log('Trend line end point:', { x, candleIndex, price });
                  const newTrendLine = {
                    id: `trend_${Date.now()}`,
                    startPrice: trendLineStartPoint.price,
                    endPrice: price,
                    startCandleIndex: trendLineStartPoint.candleIndex,
                    endCandleIndex: candleIndex
                  };
                  setTrendLines(prev => [...prev, newTrendLine]);
                  setTrendLineStartPoint(null);
                  setTrendLinePreview(null);
                  setSelectedDrawTool(null);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
              } else {
                // Deselect line when clicking elsewhere
                setSelectedLineId(null);
              }
            }}
            onLineSelect={(lineId: string | null) => {
              setSelectedLineId(lineId);
              if (lineId) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
            onLineMove={(lineId: string, newPrice: number) => {
              setHorizontalLines(prev => 
                prev.map(line => 
                  line.id === lineId ? { ...line, price: newPrice } : line
                )
              );
            }}
            onTrendLineSelect={(lineId: string | null, point?: 'start' | 'end' | null) => {
              setSelectedTrendLineId(lineId);
              setDraggingTrendLinePoint(point || null);
              // Deselect horizontal line when selecting trend line
              if (lineId) {
                setSelectedLineId(null);
              }
              if (lineId) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
            onTrendLineMove={(lineId: string, point: 'start' | 'end', newPrice: number, newCandleIndex: number) => {
              setTrendLines(prev => 
                prev.map(line => {
                  if (line.id !== lineId) return line;
                  if (point === 'start') {
                    return { ...line, startPrice: newPrice, startCandleIndex: newCandleIndex };
                  } else {
                    return { ...line, endPrice: newPrice, endCandleIndex: newCandleIndex };
                  }
                })
              );
            }}
            selectedLineId={selectedLineId}
            selectedTrendLineId={selectedTrendLineId}
            activeIndicators={activeIndicators}
            authToken={token}
          />
        </View>
        
        {/* Drawing Mode Indicator - Horizontal Line */}
        {selectedDrawTool === 'horizontal' && (
          <View style={{
            position: 'absolute',
            top: 10,
            left: 10,
            right: 10,
            backgroundColor: 'rgba(255, 184, 0, 0.9)',
            padding: 10,
            borderRadius: 8,
            zIndex: 200,
          }}>
            <Text style={{ color: '#0A0A0A', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
              Tap on chart to draw horizontal line
            </Text>
          </View>
        )}
        
        {/* Drawing Mode Indicator - Trend Line */}
        {selectedDrawTool === 'trendline' && (
          <View style={{
            position: 'absolute',
            top: 10,
            left: 10,
            right: 10,
            backgroundColor: 'rgba(0, 229, 90, 0.9)',
            padding: 10,
            borderRadius: 8,
            zIndex: 200,
          }}>
            <Text style={{ color: '#0A0A0A', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
              {trendLineStartPoint 
                ? 'Move to adjust, tap to complete' 
                : 'Tap to set start point'}
            </Text>
          </View>
        )}
        
        {/* Delete Button for Selected Line */}
        {selectedLineId && (
          <TouchableOpacity
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: [{ translateY: -20 }],
              backgroundColor: 'rgba(255, 59, 59, 0.95)',
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 8,
              zIndex: 250,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
            onPress={() => {
              setHorizontalLines(prev => prev.filter(line => line.id !== selectedLineId));
              setSelectedLineId(null);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }}
          >
            <Ionicons name="trash" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Delete</Text>
          </TouchableOpacity>
        )}
        
        {/* Delete Button for Selected Trend Line */}
        {selectedTrendLineId && (
          <TouchableOpacity
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: [{ translateY: -20 }],
              backgroundColor: 'rgba(255, 59, 59, 0.95)',
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 8,
              zIndex: 250,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
            onPress={() => {
              setTrendLines(prev => prev.filter(line => line.id !== selectedTrendLineId));
              setSelectedTrendLineId(null);
              setDraggingTrendLinePoint(null);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }}
          >
            <Ionicons name="trash" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Delete</Text>
          </TouchableOpacity>
        )}
        
        {/* User Chart Picture Overlay */}
        {user?.chart_picture && (
          <Image 
            source={{ uri: user.chart_picture }}
            style={styles.chartBackgroundOverlay}
            blurRadius={2}
          />
        )}
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

        {/* Asset Selection Button */}
        <TouchableOpacity 
          style={styles.marketSelectBtn}
          onPress={() => setShowAssetPicker(true)}
        >
          <Text style={styles.assetFlagIcon}>{currentAsset.icon}</Text>
          <Text style={styles.assetBtnText}>{currentAsset.label.split(' ')[0]}</Text>
          <Ionicons name="chevron-down" size={14} color="#FFB800" />
        </TouchableOpacity>
        
        {/* Indicator Button - Icon only */}
        <TouchableOpacity 
          style={styles.indicatorBtn}
          onPress={() => setShowIndicatorModal(true)}
        >
          <Ionicons name="analytics" size={18} color="#FFB800" />
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

        {/* Trading Disabled Banner */}
        {!isTradingEnabled && (
          <View style={styles.tradingDisabledBanner}>
            <Ionicons name="warning" size={18} color="#FF4444" />
            <Text style={styles.tradingDisabledText}>Trading is currently disabled</Text>
          </View>
        )}

        {/* Trade Buttons */}
        <View style={styles.tradeButtons}>
          <TouchableOpacity
            style={[styles.tradeBtn, styles.buyBtn, (loading || !isTradingEnabled) && styles.btnDisabled]}
            onPress={() => placeTrade('call')}
            disabled={loading || !isTradingEnabled}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
            <Text style={styles.tradeBtnText}>UP</Text>
            <Text style={styles.btnPayout}>{payoutPercentage}%</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tradeBtn, styles.sellBtn, (loading || !isTradingEnabled) && styles.btnDisabled]}
            onPress={() => placeTrade('put')}
            disabled={loading || !isTradingEnabled}
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
                <Ionicons name="close-circle" size={22} color="#666" />
              </TouchableOpacity>
            </View>
            
            {/* Trending Assets Section */}
            {trendingAssets.length > 0 && (
              <View style={styles.trendingSection}>
                <View style={styles.trendingSectionHeader}>
                  <Text style={styles.trendingSectionTitle}>🔥 Trending</Text>
                  <Text style={styles.trendingSectionSubtitle}>Top traded</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trendingScroll}>
                  {trendingAssets.slice(0, 5).map((item: any, idx: number) => {
                    // Check if this trending asset is locked for current account type
                    const isTrendingDemoOnly = checkIsDemoOnly(item.asset);
                    const isTrendingLocked = accountType === 'demo' ? !isTrendingDemoOnly : isTrendingDemoOnly;
                    
                    return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.trendingAssetCard,
                        idx === 0 && styles.trendingAssetCardTop,
                        selectedAsset === item.asset && styles.trendingAssetCardSelected,
                        isTrendingLocked && styles.trendingAssetCardLocked
                      ]}
                      onPress={() => {
                        if (isTrendingLocked) {
                          Alert.alert(
                            '🔒 Asset Locked',
                            accountType === 'demo' 
                              ? 'This asset is only available for real balance trading.\n\nSwitch to Real account to trade this asset.'
                              : 'This asset is only available for demo trading.\n\nSwitch to Demo account to trade this asset.',
                            [{ text: 'OK', style: 'default' }]
                          );
                          return;
                        }
                        setSelectedAsset(item.asset);
                        setShowAssetPicker(false);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }}
                    >
                      {isTrendingLocked && (
                        <View style={styles.trendingLockOverlay}>
                          <Ionicons name="lock-closed" size={14} color="#FF6B6B" />
                        </View>
                      )}
                      <View style={styles.trendingRankBadge}>
                        <Text style={styles.trendingRankText}>{idx + 1}</Text>
                      </View>
                      <Text style={[styles.trendingAssetName, isTrendingLocked && { opacity: 0.5 }]} numberOfLines={1}>{item.asset.replace(' OTC', '')}</Text>
                      <Text style={[styles.trendingAssetPayout, isTrendingLocked && { opacity: 0.5 }]}>{item.payout}%</Text>
                    </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
            
            {/* Search Bar */}
            <View style={styles.assetSearchBar}>
              <Ionicons name="search" size={18} color="#666" style={{marginRight: 8}} />
              <TextInput
                style={styles.assetSearchInput}
                placeholder="Search assets (e.g., usdchf, BTC, Gold)"
                placeholderTextColor="#666"
                value={assetSearchQuery}
                onChangeText={setAssetSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {assetSearchQuery !== '' && (
                <TouchableOpacity onPress={() => setAssetSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#666" />
                </TouchableOpacity>
              )}
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
            
            {/* Asset List - Sorted by Payout (Highest First) */}
            <ScrollView style={styles.assetList} showsVerticalScrollIndicator={false}>
              {currentAssets
                .filter(asset => {
                  // Category filter (skip if searching)
                  if (assetSearchQuery === '') {
                    return asset.category === selectedCategory;
                  }
                  return true; // Show all categories when searching
                })
                .filter(asset => !inactiveAssets.has(asset.value) && !inactiveAssets.has(asset.label))
                .filter(asset => {
                  // Flexible search matching
                  if (assetSearchQuery === '') return true;
                  
                  const query = assetSearchQuery.toLowerCase().replace(/[\s\/\-]/g, ''); // Remove spaces, slashes, dashes
                  const assetValue = (asset.value || '').toLowerCase().replace(/[\s\/\-]/g, '');
                  const assetLabel = (asset.label || '').toLowerCase().replace(/[\s\/\-]/g, '');
                  const assetSymbol = (asset.symbol || '').toLowerCase().replace(/[\s\/\-]/g, '');
                  
                  // Match against normalized strings
                  return assetValue.includes(query) || 
                         assetLabel.includes(query) || 
                         assetSymbol.includes(query) ||
                         // Also match original formats
                         (asset.value || '').toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
                         (asset.label || '').toLowerCase().includes(assetSearchQuery.toLowerCase());
                })
                .sort((a, b) => {
                  // Sort by payout percentage (highest first)
                  const payoutA = apiPayouts[a.value] || apiPayouts[a.label] || a.payout || 0;
                  const payoutB = apiPayouts[b.value] || apiPayouts[b.label] || b.payout || 0;
                  return payoutB - payoutA;
                })
                .filter((asset) => {
                  // Check if asset is demo-only using the correct function
                  const isDemoOnlyAsset = checkIsDemoOnly(asset.value);
                  
                  // Real account: Hide demo-only assets completely (they don't exist in real trading)
                  if (accountType === 'real' && isDemoOnlyAsset) {
                    return false;
                  }
                  
                  // Demo account: Show ALL assets (both demo-unlocked and real-locked)
                  return true;
                })
                .sort((a, b) => {
                  // For Demo account: Sort unlocked (demo-only) assets to TOP
                  if (accountType === 'demo') {
                    const aIsDemoOnly = checkIsDemoOnly(a.value);
                    const bIsDemoOnly = checkIsDemoOnly(b.value);
                    
                    // Unlocked (demo-only) assets first
                    if (aIsDemoOnly && !bIsDemoOnly) return -1;
                    if (!aIsDemoOnly && bIsDemoOnly) return 1;
                  }
                  return 0; // Keep payout sorting within same group
                })
                .map((asset) => {
                  // Check if asset is locked for current account type
                  const isDemoOnlyAsset = checkIsDemoOnly(asset.value);
                  
                  // Demo mode: Only demo-only assets are unlocked, rest locked
                  // Real mode: Demo-only assets are locked (shown with lock)
                  let isLocked = false;
                  let lockText = '';
                  
                  if (accountType === 'demo') {
                    isLocked = !isDemoOnlyAsset; // Lock if NOT demo-only
                    lockText = '🔒 Real Balance Only';
                  } else {
                    isLocked = isDemoOnlyAsset; // Lock if demo-only
                    lockText = '🔒 Demo Only';
                  }
                  
                  return (
                <TouchableOpacity
                  key={asset.value}
                  style={[
                    styles.assetOption,
                    selectedAsset === asset.value && styles.assetOptionSelected,
                    isLocked && styles.assetOptionLocked
                  ]}
                  onPress={() => {
                    if (isLocked) {
                      Alert.alert(
                        '🔒 Asset Locked',
                        accountType === 'demo' 
                          ? 'This asset is only available for real balance trading.\n\nSwitch to Real account to trade this asset.'
                          : 'This asset is only available for demo trading.\n\nSwitch to Demo account to trade this asset.',
                        [{ text: 'OK', style: 'default' }]
                      );
                      return;
                    }
                    setSelectedAsset(asset.value);
                    setShowAssetPicker(false);
                    setAssetSearchQuery('');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={[styles.assetOptionIcon, isLocked && { opacity: 0.5 }]}>{asset.icon}</Text>
                  <View style={styles.assetOptionInfo}>
                    <Text style={[styles.assetOptionText, isLocked && { color: '#666' }]}>{asset.label}</Text>
                    <Text style={[styles.assetOptionPayout, isLocked && { color: '#555' }]}>
                      {isLocked ? lockText : `Payout: ${apiPayouts[asset.value] || apiPayouts[asset.label] || asset.payout}%`}
                    </Text>
                  </View>
                  {isLocked ? (
                    <Ionicons name="lock-closed" size={18} color="#FF6B6B" />
                  ) : selectedAsset === asset.value ? (
                    <Ionicons name="checkmark-circle" size={18} color="#00E55A" />
                  ) : null}
                </TouchableOpacity>
                );
                })}
              
              {/* No results message */}
              {currentAssets.filter(asset => {
                if (assetSearchQuery === '') return asset.category === selectedCategory;
                const query = assetSearchQuery.toLowerCase().replace(/[\s\/\-]/g, '');
                const assetValue = (asset.value || '').toLowerCase().replace(/[\s\/\-]/g, '');
                const assetLabel = (asset.label || '').toLowerCase().replace(/[\s\/\-]/g, '');
                return assetValue.includes(query) || assetLabel.includes(query);
              }).length === 0 && assetSearchQuery !== '' && (
                <View style={styles.noSearchResults}>
                  <Ionicons name="search-outline" size={32} color="#666" />
                  <Text style={styles.noSearchResultsText}>No assets found for "{assetSearchQuery}"</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Insufficient Balance Modal */}
      <Modal visible={showInsufficientModal} transparent animationType="fade">
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: '#1A1F2E',
            borderRadius: 20,
            padding: 24,
            width: '100%',
            maxWidth: 340,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: 'rgba(255, 184, 0, 0.3)',
          }}>
            {/* Warning Icon */}
            <View style={{
              width: 70,
              height: 70,
              borderRadius: 35,
              backgroundColor: 'rgba(255, 184, 0, 0.15)',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Ionicons name="wallet-outline" size={36} color="#FFB800" />
            </View>
            
            <Text style={{
              color: '#FFB800',
              fontSize: 20,
              fontWeight: '700',
              marginBottom: 12,
              textAlign: 'center',
            }}>Insufficient Balance</Text>
            
            <Text style={{
              color: '#AAA',
              fontSize: 15,
              textAlign: 'center',
              lineHeight: 22,
              marginBottom: 24,
            }}>{insufficientMessage}</Text>
            
            {/* Buttons */}
            <View style={{ width: '100%', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowInsufficientModal(false);
                  setShowDepositModal(true);
                }}
                style={{
                  backgroundColor: '#00E55A',
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#0A1A0F', fontSize: 16, fontWeight: '700' }}>
                  Deposit Now
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => setShowInsufficientModal(false)}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#888', fontSize: 16, fontWeight: '600' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
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
                setEwalletPayUrl(null);
                setEwalletOrderId(null);
              }}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Payment Method Tabs */}
            <View style={depositModalStyles.methodTabs}>
              <TouchableOpacity 
                style={[depositModalStyles.methodTab, depositMethod === 'ewallet' && depositModalStyles.methodTabActive]}
                onPress={() => setDepositMethod('ewallet')}
              >
                <Text style={depositModalStyles.methodTabIcon}>🇧🇩</Text>
                <Text style={[depositModalStyles.methodTabText, depositMethod === 'ewallet' && depositModalStyles.methodTabTextActive]}>
                  bKash / Nagad
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[depositModalStyles.methodTab, depositMethod === 'crypto' && depositModalStyles.methodTabActive]}
                onPress={() => setDepositMethod('crypto')}
              >
                <Ionicons name="logo-bitcoin" size={16} color={depositMethod === 'crypto' ? '#FFB800' : '#888'} />
                <Text style={[depositModalStyles.methodTabText, depositMethod === 'crypto' && depositModalStyles.methodTabTextActive]}>
                  Crypto
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* eWallet (bKash/Nagad) Deposit */}
              {depositMethod === 'ewallet' && !ewalletPayUrl ? (
                <>
                  {/* Error Message */}
                  {depositError && (
                    <View style={depositModalStyles.errorBox}>
                      <Ionicons name="alert-circle" size={20} color="#FF3B3B" />
                      <Text style={depositModalStyles.errorText}>{depositError}</Text>
                    </View>
                  )}

                  {/* Amount Input */}
                  <Text style={depositModalStyles.label}>Enter Amount (USD)</Text>
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
                  <Text style={depositModalStyles.minimum}>
                    ≈ ৳{Math.round(parseFloat(depositAmount || '0') * exchangeRate)} BDT | Rate: $1 = ৳{exchangeRate.toFixed(2)}
                  </Text>

                  {/* Quick Amounts */}
                  <View style={depositModalStyles.quickAmounts}>
                    {['5', '10', '25', '50', '100'].map((amt) => (
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

                  {/* eWallet Selection */}
                  <Text style={depositModalStyles.label}>Select Wallet</Text>
                  <View style={depositModalStyles.ewalletOptions}>
                    <TouchableOpacity 
                      style={[depositModalStyles.ewalletOption, selectedEwallet === 'bkash' && depositModalStyles.ewalletOptionActive]}
                      onPress={() => setSelectedEwallet('bkash')}
                    >
                      <View style={[depositModalStyles.ewalletLogo, { backgroundColor: '#E2136E' }]}>
                        <Text style={depositModalStyles.ewalletLogoText}>b</Text>
                      </View>
                      <View style={depositModalStyles.ewalletInfo}>
                        <Text style={depositModalStyles.ewalletName}>bKash</Text>
                        <Text style={depositModalStyles.ewalletLimit}>৳100 - ৳30,000</Text>
                      </View>
                      {selectedEwallet === 'bkash' && <Ionicons name="checkmark-circle" size={20} color="#00E55A" />}
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[depositModalStyles.ewalletOption, selectedEwallet === 'nagad' && depositModalStyles.ewalletOptionActive]}
                      onPress={() => setSelectedEwallet('nagad')}
                    >
                      <View style={[depositModalStyles.ewalletLogo, { backgroundColor: '#F26522' }]}>
                        <Text style={depositModalStyles.ewalletLogoText}>N</Text>
                      </View>
                      <View style={depositModalStyles.ewalletInfo}>
                        <Text style={depositModalStyles.ewalletName}>Nagad</Text>
                        <Text style={depositModalStyles.ewalletLimit}>৳100 - ৳30,000</Text>
                      </View>
                      {selectedEwallet === 'nagad' && <Ionicons name="checkmark-circle" size={20} color="#00E55A" />}
                    </TouchableOpacity>
                  </View>

                  {/* Generate Button */}
                  <TouchableOpacity 
                    style={depositModalStyles.generateBtn}
                    onPress={async () => {
                      const amount = parseFloat(depositAmount);
                      if (amount < 1) {
                        Alert.alert('Invalid Amount', 'Minimum deposit is $1');
                        return;
                      }
                      
                      if (!token) {
                        Alert.alert('Login Required', 'Please login to make a deposit');
                        return;
                      }
                      
                      setIsGeneratingAddress(true);
                      setDepositError(null);
                      
                      try {
                        const response = await fetch(`${API_URL}/tarspay/deposit/create`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify({
                            amount: amount,
                            channel: selectedEwallet
                          })
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                          setEwalletPayUrl(data.pay_url);
                          setEwalletOrderId(data.order_id);
                          setPayAmount(data.amount_bdt?.toString());
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } else {
                          setDepositError(data.error || 'Failed to create payment');
                        }
                      } catch (error) {
                        console.error('TarsPay error:', error);
                        setDepositError('Network error. Please try again.');
                      } finally {
                        setIsGeneratingAddress(false);
                      }
                    }}
                    disabled={isGeneratingAddress}
                  >
                    {isGeneratingAddress ? (
                      <ActivityIndicator color="#0A0A0A" />
                    ) : (
                      <Text style={depositModalStyles.generateBtnText}>
                        Pay with {selectedEwallet === 'bkash' ? 'bKash' : 'Nagad'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : depositMethod === 'ewallet' && ewalletPayUrl ? (
                <>
                  {/* eWallet Payment URL Generated */}
                  <View style={depositModalStyles.addressSection}>
                    <View style={depositModalStyles.ewalletSuccessBox}>
                      <Ionicons name="checkmark-circle" size={40} color="#00E55A" />
                      <Text style={depositModalStyles.ewalletSuccessTitle}>Payment Link Ready!</Text>
                      <Text style={depositModalStyles.ewalletSuccessAmount}>৳{payAmount} BDT</Text>
                      <Text style={depositModalStyles.ewalletSuccessNote}>
                        Click the button below to complete payment via {selectedEwallet === 'bkash' ? 'bKash' : 'Nagad'}
                      </Text>
                    </View>

                    <TouchableOpacity 
                      style={[depositModalStyles.generateBtn, { backgroundColor: selectedEwallet === 'bkash' ? '#E2136E' : '#F26522' }]}
                      onPress={() => {
                        // Open payment URL in browser
                        if (ewalletPayUrl) {
                          import('expo-linking').then(Linking => {
                            Linking.openURL(ewalletPayUrl);
                          });
                        }
                      }}
                    >
                      <Text style={depositModalStyles.generateBtnText}>
                        Open {selectedEwallet === 'bkash' ? 'bKash' : 'Nagad'} Payment
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={depositModalStyles.confirmPaymentBtn}
                      onPress={async () => {
                        if (!ewalletOrderId) return;
                        
                        setIsVerifyingPayment(true);
                        
                        try {
                          const response = await fetch(`${API_URL}/tarspay/deposit/status/${ewalletOrderId}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                          });
                          
                          const data = await response.json();
                          
                          if (data.paid) {
                            setPaymentStatus('success');
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            
                            // Refresh balance
                            const meResponse = await fetch(`${API_URL}/auth/me`, {
                              headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (meResponse.ok) {
                              const userData = await meResponse.json();
                              setRealBalance(userData.real_balance || 0);
                            }
                            
                            setTimeout(() => {
                              setShowDepositModal(false);
                              setEwalletPayUrl(null);
                              setEwalletOrderId(null);
                              setPaymentStatus(null);
                              setAccountType('real');
                              Alert.alert('✅ Deposit Successful!', `Your deposit has been credited.`);
                            }, 2000);
                          } else {
                            setPaymentStatus('failed');
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                          }
                        } catch (error) {
                          setPaymentStatus('failed');
                        } finally {
                          setIsVerifyingPayment(false);
                        }
                      }}
                      disabled={isVerifyingPayment || paymentStatus === 'success'}
                    >
                      {isVerifyingPayment ? (
                        <>
                          <ActivityIndicator size="small" color="#0A0A0A" />
                          <Text style={depositModalStyles.confirmPaymentBtnText}>Checking...</Text>
                        </>
                      ) : paymentStatus === 'success' ? (
                        <>
                          <Ionicons name="checkmark-circle" size={18} color="#0A0A0A" />
                          <Text style={depositModalStyles.confirmPaymentBtnText}>Payment Confirmed!</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="refresh" size={18} color="#0A0A0A" />
                          <Text style={depositModalStyles.confirmPaymentBtnText}>I've Made Payment</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {paymentStatus === 'failed' && (
                      <View style={depositModalStyles.failedBox}>
                        <Ionicons name="close-circle" size={24} color="#FF3B3B" />
                        <Text style={depositModalStyles.failedText}>
                          Payment not confirmed yet. Please complete payment and try again.
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity 
                      style={depositModalStyles.doneBtn}
                      onPress={() => {
                        setEwalletPayUrl(null);
                        setEwalletOrderId(null);
                        setPaymentStatus(null);
                      }}
                    >
                      <Text style={depositModalStyles.doneBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : !generatedAddress ? (
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
                        size={120}
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

                    {/* Payment Status Messages */}
                    {paymentStatus === 'success' && (
                      <View style={depositModalStyles.successBox}>
                        <Ionicons name="checkmark-circle" size={24} color="#00E55A" />
                        <Text style={depositModalStyles.successText}>
                          Payment confirmed! ${depositAmount} has been added to your account.
                        </Text>
                      </View>
                    )}

                    {paymentStatus === 'failed' && (
                      <View style={depositModalStyles.failedBox}>
                        <Ionicons name="close-circle" size={24} color="#FF3B3B" />
                        <Text style={depositModalStyles.failedText}>
                          Payment not found. Please wait for blockchain confirmation or check your transaction.
                        </Text>
                      </View>
                    )}

                    {/* Payment Confirmed Button */}
                    <TouchableOpacity 
                      style={[
                        depositModalStyles.confirmPaymentBtn,
                        isVerifyingPayment && depositModalStyles.confirmPaymentBtnDisabled,
                        paymentStatus === 'success' && depositModalStyles.confirmPaymentBtnSuccess,
                      ]}
                      onPress={verifyPayment}
                      disabled={isVerifyingPayment || paymentStatus === 'success'}
                    >
                      {isVerifyingPayment ? (
                        <>
                          <ActivityIndicator size="small" color="#0A0A0A" />
                          <Text style={depositModalStyles.confirmPaymentBtnText}>Verifying Payment...</Text>
                        </>
                      ) : paymentStatus === 'success' ? (
                        <>
                          <Ionicons name="checkmark-circle" size={18} color="#0A0A0A" />
                          <Text style={depositModalStyles.confirmPaymentBtnText}>Payment Confirmed!</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="wallet" size={18} color="#0A0A0A" />
                          <Text style={depositModalStyles.confirmPaymentBtnText}>I've Made Payment</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={depositModalStyles.doneBtn}
                      onPress={() => {
                        setShowDepositModal(false);
                        setGeneratedAddress(null);
                        setPaymentId(null);
                        setPayAmount(null);
                        setExpirationTime(null);
                        setPaymentStatus(null);
                      }}
                    >
                      <Text style={depositModalStyles.doneBtnText}>Close</Text>
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
                <Ionicons name="close-circle" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Manual Time Input */}
            <View style={styles.timeInputSection}>
              <Text style={styles.timeInputLabel}>Custom Time (minutes : seconds)</Text>
              <View style={styles.timeInputRow}>
                {/* Minutes Input with Text Overlay */}
                <View style={styles.timeInputColumn}>
                  <View style={styles.timeInputBox}>
                    <Text style={styles.timeInputValue}>{customMinutes || '0'}</Text>
                  </View>
                  <View style={styles.timeInputButtons}>
                    <TouchableOpacity 
                      onPress={() => setCustomMinutes(String(Math.max(0, parseInt(customMinutes || '0') - 1)))}
                      style={styles.timeInputBtnMinus}
                    >
                      <Text style={styles.timeInputBtnMinusText}>−</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => setCustomMinutes(String(parseInt(customMinutes || '0') + 1))}
                      style={styles.timeInputBtnPlus}
                    >
                      <Text style={styles.timeInputBtnPlusText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.timeInputUnit}>min</Text>
                </View>
                
                <Text style={styles.timeInputColon}>:</Text>
                
                {/* Seconds Input with Text Overlay */}
                <View style={styles.timeInputColumn}>
                  <View style={styles.timeInputBox}>
                    <Text style={styles.timeInputValue}>{customSeconds || '0'}</Text>
                  </View>
                  <View style={styles.timeInputButtons}>
                    <TouchableOpacity 
                      onPress={() => setCustomSeconds(String(Math.max(0, Math.min(59, parseInt(customSeconds || '0') - 5))))}
                      style={styles.timeInputBtnMinus}
                    >
                      <Text style={styles.timeInputBtnMinusText}>−5</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => setCustomSeconds(String(Math.min(59, parseInt(customSeconds || '0') + 5)))}
                      style={styles.timeInputBtnPlus}
                    >
                      <Text style={styles.timeInputBtnPlusText}>+5</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.timeInputUnit}>sec</Text>
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

      {/* Tools Modal - Using extracted component */}
      <ToolsModal
        visible={showToolsModal}
        onClose={() => setShowToolsModal(false)}
        chartType={chartType}
        setChartType={setChartType}
        timeframe={timeframe}
        setTimeframe={setTimeframe}
        selectedDrawTool={selectedDrawTool}
        setSelectedDrawTool={setSelectedDrawTool}
        setTrendLineStartPoint={setTrendLineStartPoint}
        setHorizontalLines={setHorizontalLines}
        setTrendLines={setTrendLines}
      />

      {/* Indicator Modal - Using extracted component */}
      <IndicatorModal
        visible={showIndicatorModal}
        onClose={() => setShowIndicatorModal(false)}
        activeIndicators={activeIndicators}
        setActiveIndicators={setActiveIndicators}
      />

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
                <Ionicons name="close-circle" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Tab Switcher - Real / Demo */}
            <View style={styles.historyTabContainer}>
              <TouchableOpacity
                style={[styles.historyTab, historyTab === 'real' && styles.historyTabActive]}
                onPress={() => setHistoryTab('real')}
              >
                <Ionicons name="wallet" size={12} color={historyTab === 'real' ? '#00E55A' : '#666'} />
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
                <Ionicons name="school" size={12} color={historyTab === 'demo' ? '#FF3B3B' : '#666'} />
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
              size={22} 
              color={tradeResult.won ? '#0A1A0F' : '#FFFFFF'} 
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
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 6,
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
    borderRadius: 30,
    padding: 2,
    // Reduced glow for smaller logo
    boxShadow: '0 0 30px 10px rgba(0, 229, 90, 0.6), 0 0 50px 20px rgba(0, 229, 90, 0.3)',
    // Native shadow fallback
    shadowColor: '#00E55A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 30,
  },
  headerLogo: {
    width: 50,
    height: 50,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    maxWidth: '40%',
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
    borderRadius: 8,
    overflow: 'hidden',
    marginLeft: 2,
  },
  depositButton3DInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFA500',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  depositBonusBadge3D: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 1,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.3)',
  },
  depositBonusText3D: {
    color: '#1A1A1A',
    fontSize: 8,
    fontWeight: '900',
  },
  depositText3D: {
    color: '#1A1A1A',
    fontSize: 9,
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
    backgroundColor: '#0A0A0A',
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
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 2,
    borderWidth: 1,
    borderColor: '#00E55A',
  },
  balanceText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  notifButton: {
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 4,
    borderRadius: 6,
  },
  notifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
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
    position: 'relative',
    overflow: 'hidden',
  },
  chartBackgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.2,
    zIndex: 1,
  },
  chartBackgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.25,
    zIndex: 10,
    pointerEvents: 'none',
  },
  chartWrapper: {
    flex: 1,
    zIndex: 2,
    backgroundColor: 'transparent',
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
    paddingHorizontal: 4,
    paddingVertical: 3,
    backgroundColor: 'rgba(10, 26, 15, 0.95)',
    gap: 3,
  },
  toolsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.3)',
  },
  toolsBtnText: {
    color: '#FFB800',
    fontSize: 9,
    fontWeight: '700',
  },
  tradeHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.3)',
  },
  tradeHistoryBtnText: {
    color: '#FFB800',
    fontSize: 9,
    fontWeight: '700',
  },
  marketSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.3)',
  },
  assetBtnText: {
    color: '#FFB800',
    fontSize: 9,
    fontWeight: '600',
  },
  assetFlagIcon: {
    fontSize: 10,
    marginRight: 1,
  },
  indicatorBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.3)',
  },
  indicatorBtnText: {
    color: '#FFB800',
    fontSize: 10,
    fontWeight: '600',
  },
  indicatorList: {
    gap: 12,
  },
  indicatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  indicatorItemActive: {
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
    borderColor: 'rgba(0, 229, 90, 0.3)',
  },
  indicatorIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  indicatorInfo: {
    flex: 1,
  },
  indicatorName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  indicatorDesc: {
    color: '#888',
    fontSize: 11,
  },
  comingSoonBadge: {
    backgroundColor: 'rgba(255, 184, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    color: '#FFB800',
    fontSize: 10,
    fontWeight: '600',
    overflow: 'hidden',
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
    marginBottom: 12,
  },
  historySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  runningDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E55A',
  },
  historySectionTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tradeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 90, 0.3)',
  },
  tradeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tradeAsset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tradeAssetIcon: {
    fontSize: 16,
  },
  tradeAssetName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  directionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  directionUp: {
    backgroundColor: '#00E55A',
  },
  directionDown: {
    backgroundColor: '#FF3B3B',
  },
  directionText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  tradeCardBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tradeInfo: {
    width: '45%',
  },
  tradeInfoLabel: {
    color: '#666',
    fontSize: 9,
    marginBottom: 1,
  },
  tradeInfoValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  historyCardLeft: {
    flex: 1,
  },
  historyAsset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyAssetIcon: {
    fontSize: 14,
  },
  historyAssetName: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  historyTime: {
    color: '#666',
    fontSize: 9,
  },
  historyCardCenter: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  historyDirection: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  historyAmount: {
    color: '#888',
    fontSize: 9,
  },
  historyCardRight: {
    alignItems: 'flex-end',
  },
  historyProfit: {
    fontSize: 12,
    fontWeight: '800',
  },
  historyStatus: {
    fontSize: 9,
    fontWeight: '600',
  },
  historySummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#666',
    fontSize: 9,
    marginBottom: 2,
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  // History Tab Styles
  historyTabContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 6,
  },
  historyTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    gap: 4,
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
    fontSize: 10,
    fontWeight: '600',
  },
  historyTabTextActive: {
    color: '#00E55A',
  },
  historyTabTextActiveDemo: {
    color: '#FF3B3B',
  },
  historyTabBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 18,
    alignItems: 'center',
  },
  historyTabBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
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
    marginBottom: 10,
  },
  dateFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    marginRight: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dateFilterBtnActive: {
    backgroundColor: 'rgba(0, 229, 90, 0.15)',
    borderColor: '#00E55A',
  },
  dateFilterText: {
    color: '#888',
    fontSize: 10,
    fontWeight: '600',
  },
  dateFilterTextActive: {
    color: '#00E55A',
  },
  customDatePicker: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  customDateLabel: {
    color: '#888',
    fontSize: 10,
    marginBottom: 4,
  },
  customDateInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    padding: 10,
    color: '#FFFFFF',
    fontSize: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  applyDateBtn: {
    backgroundColor: '#00E55A',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
    marginTop: 2,
  },
  applyDateBtnText: {
    color: '#0A0A0A',
    fontSize: 12,
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
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 2,
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
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.3)',
  },
  setTimeText: {
    color: '#FFB800',
    fontSize: 10,
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
    marginBottom: 14,
  },
  timeInputLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  timeInputColumn: {
    alignItems: 'center',
    marginHorizontal: 4,
  },
  timeInputBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeInputValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  timeInputButtons: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 8,
  },
  timeInputBtnMinus: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  timeInputBtnMinusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  timeInputBtnPlus: {
    backgroundColor: 'rgba(0, 229, 90, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  timeInputBtnPlusText: {
    color: '#00E55A',
    fontSize: 14,
    fontWeight: '600',
  },
  timeInputUnit: {
    color: '#666',
    fontSize: 10,
    marginTop: 3,
  },
  timeInputColon: {
    color: '#555',
    fontSize: 24,
    fontWeight: '700',
    marginHorizontal: 6,
  },
  timeInputField: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    padding: 0,
    margin: 0,
    height: 32,
    minHeight: 32,
    minWidth: 50,
    backgroundColor: 'transparent',
  },
  timeUnitLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
  },
  timeSeparator: {
    color: '#666',
    fontSize: 22,
    fontWeight: '700',
    marginHorizontal: 8,
  },
  setCustomTimeBtn: {
    backgroundColor: '#00E55A',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  setCustomTimeBtnText: {
    color: '#0A1A0F',
    fontSize: 13,
    fontWeight: '700',
  },
  quickTimeLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  quickTimeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  quickTimeGridItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 50,
    alignItems: 'center',
  },
  quickTimeGridItemActive: {
    backgroundColor: 'rgba(0, 229, 90, 0.2)',
    borderColor: '#00E55A',
  },
  quickTimeGridText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '700',
  },
  quickTimeGridTextActive: {
    color: '#00E55A',
  },
  labelText: {
    color: '#999',
    fontSize: 9,
    marginBottom: 2,
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
    marginBottom: 2,
  },
  amountRow: {
    flexDirection: 'row',
    gap: 4,
  },
  amountInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dollarSign: {
    color: '#00E55A',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 3,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 6,
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 3,
  },
  quickButton: {
    backgroundColor: 'rgba(0, 229, 90, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  quickButtonText: {
    color: '#00E55A',
    fontSize: 9,
    fontWeight: '700',
  },
  profitPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
  },
  profitPreviewLabel: {
    color: '#999',
    fontSize: 10,
  },
  profitPreviewValue: {
    color: '#00E55A',
    fontSize: 14,
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
    gap: 8,
    marginBottom: 4,
  },
  tradeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
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
  tradingDisabledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 6,
  },
  tradingDisabledText: {
    color: '#FF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  tradeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  btnPayout: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 9,
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: height * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  categoryTabs: {
    flexDirection: 'row',
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 3,
  },
  categoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 3,
  },
  categoryTabActive: {
    backgroundColor: '#00E55A',
  },
  categoryTabIcon: {
    fontSize: 12,
  },
  categoryTabText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#888',
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
  },
  // Trending Assets Styles
  trendingSection: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  trendingSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  trendingSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  trendingSectionSubtitle: {
    fontSize: 9,
    color: '#555',
  },
  trendingScroll: {
    flexDirection: 'row',
  },
  trendingAssetCard: {
    backgroundColor: 'rgba(40, 45, 60, 0.95)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginRight: 6,
    width: 68,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(80, 80, 100, 0.4)',
  },
  trendingAssetCardTop: {
    backgroundColor: 'rgba(255, 120, 0, 0.18)',
    borderColor: 'rgba(255, 140, 0, 0.6)',
  },
  trendingAssetCardSelected: {
    backgroundColor: 'rgba(0, 229, 90, 0.15)',
    borderColor: 'rgba(0, 229, 90, 0.6)',
  },
  trendingAssetCardLocked: {
    backgroundColor: 'rgba(40, 45, 60, 0.5)',
    borderColor: 'rgba(255, 107, 107, 0.4)',
    opacity: 0.7,
  },
  trendingLockOverlay: {
    position: 'absolute',
    top: 2,
    right: 2,
    zIndex: 10,
  },
  trendingRankBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    backgroundColor: '#FF6B00',
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingRankText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '800',
  },
  trendingAssetName: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 1,
  },
  trendingAssetCategory: {
    fontSize: 7,
    color: '#00E55A',
    marginTop: 1,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  trendingAssetStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 3,
  },
  trendingAssetTrades: {
    fontSize: 7,
    color: '#888',
  },
  trendingAssetWinRate: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  trendingAssetPayout: {
    fontSize: 10,
    color: '#00E55A',
    marginTop: 3,
    fontWeight: '800',
  },
  assetSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  assetSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    padding: 0,
  },
  noSearchResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noSearchResultsText: {
    color: '#666',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  assetList: {
    maxHeight: 350,
  },
  assetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  assetOptionSelected: {
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
    borderColor: 'rgba(0, 229, 90, 0.3)',
  },
  assetOptionLocked: {
    backgroundColor: 'rgba(255, 100, 100, 0.05)',
    borderColor: 'rgba(255, 100, 100, 0.15)',
    opacity: 0.7,
  },
  assetOptionIcon: {
    fontSize: 18,
    marginRight: 10,
    width: 28,
    textAlign: 'center',
  },
  assetOptionInfo: {
    flex: 1,
  },
  assetOptionText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  assetOptionPayout: {
    fontSize: 10,
    color: '#00E55A',
    marginTop: 1,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
  },
  resultBadgeWin: {
    backgroundColor: '#00E55A',
    borderColor: '#00B847',
    shadowColor: '#00E55A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  resultBadgeLoss: {
    backgroundColor: '#FF3B3B',
    borderColor: '#CC2F2F',
    shadowColor: '#FF3B3B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  resultBadgeText: {
    fontSize: 16,
    fontWeight: '800',
  },
  resultTextWin: {
    color: '#0A1A0F',
  },
  resultTextLoss: {
    color: '#FFFFFF',
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
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  label: {
    color: '#888',
    fontSize: 10,
    marginBottom: 6,
    marginTop: 10,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D2818',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 90, 0.3)',
  },
  amountPrefix: {
    color: '#00E55A',
    fontSize: 20,
    fontWeight: '700',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    padding: 0,
  },
  minimum: {
    color: '#666',
    fontSize: 10,
    marginTop: 4,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  quickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
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
    fontSize: 11,
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
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  networkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  networkText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  networkDropdown: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  networkOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  networkOptionActive: {
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
  },
  networkOptionText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  noFees: {
    color: '#00E55A',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 10,
  },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  promoInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  promoQuickBtn: {
    backgroundColor: '#00E55A',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  promoQuickText: {
    color: '#0A0A0A',
    fontSize: 11,
    fontWeight: '700',
  },
  promoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(100, 100, 100, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    gap: 8,
  },
  promoInfoText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
  },
  generateBtn: {
    backgroundColor: '#00E55A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  generateBtnText: {
    color: '#0A0A0A',
    fontSize: 13,
    fontWeight: '700',
  },
  // Generated Address Styles
  addressSection: {
    alignItems: 'center',
    paddingTop: 10,
  },
  successIcon: {
    marginBottom: 12,
  },
  addressTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  addressNetwork: {
    color: '#00E55A',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 14,
  },
  addressBox: {
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
    borderRadius: 10,
    padding: 10,
    width: '100%',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 90, 0.3)',
  },
  addressText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00E55A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    marginBottom: 14,
  },
  copyBtnText: {
    color: '#0A0A0A',
    fontSize: 12,
    fontWeight: '700',
  },
  depositInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 10,
    width: '100%',
    marginBottom: 10,
  },
  depositInfoTitle: {
    color: '#888',
    fontSize: 11,
  },
  depositInfoAmount: {
    color: '#00E55A',
    fontSize: 14,
    fontWeight: '700',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    borderRadius: 8,
    padding: 10,
    width: '100%',
    marginBottom: 12,
    gap: 8,
  },
  warningText: {
    color: '#FFB800',
    fontSize: 10,
    flex: 1,
    lineHeight: 15,
  },
  doneBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  // Success/Failed Status Boxes
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 90, 0.15)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 90, 0.3)',
  },
  successText: {
    color: '#00E55A',
    fontSize: 11,
    flex: 1,
  },
  failedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 59, 0.15)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 59, 0.3)',
  },
  failedText: {
    color: '#FF3B3B',
    fontSize: 11,
    flex: 1,
  },
  // Confirm Payment Button
  confirmPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E55A',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
    marginBottom: 8,
  },
  confirmPaymentBtnDisabled: {
    opacity: 0.7,
  },
  confirmPaymentBtnSuccess: {
    backgroundColor: '#00E55A',
  },
  confirmPaymentBtnText: {
    color: '#0A0A0A',
    fontSize: 13,
    fontWeight: '700',
  },
  // Error Box
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 59, 0.15)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    gap: 8,
  },
  errorText: {
    color: '#FF3B3B',
    fontSize: 11,
    flex: 1,
  },
  // QR Code Section
  qrContainer: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 10,
    marginBottom: 8,
    alignSelf: 'center',
  },
  // Payment Info Cards
  paymentInfoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
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
    fontSize: 10,
  },
  paymentInfoValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  expiryText: {
    color: '#FFB800',
    fontWeight: '700',
    fontSize: 12,
  },
  addressLabel: {
    color: '#888',
    fontSize: 10,
    marginBottom: 6,
    marginTop: 6,
  },
  // Amount to Send Card
  amountToSendCard: {
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 90, 0.3)',
  },
  amountToSendLabel: {
    color: '#888',
    fontSize: 10,
    marginBottom: 4,
  },
  amountToSendValue: {
    color: '#00E55A',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  amountToSendUsd: {
    color: '#666',
    fontSize: 10,
  },
  // Payment Method Tabs
  methodTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
  },
  methodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  methodTabActive: {
    backgroundColor: '#0D2818',
  },
  methodTabIcon: {
    fontSize: 14,
  },
  methodTabText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
  },
  methodTabTextActive: {
    color: '#00E55A',
  },
  // eWallet Styles
  ewalletOptions: {
    gap: 8,
    marginTop: 8,
  },
  ewalletOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  ewalletOptionActive: {
    borderColor: '#00E55A',
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
  },
  ewalletLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  ewalletLogoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  ewalletInfo: {
    flex: 1,
  },
  ewalletName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  ewalletLimit: {
    color: '#888',
    fontSize: 10,
    marginTop: 2,
  },
  ewalletSuccessBox: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
    borderRadius: 12,
    marginBottom: 16,
  },
  ewalletSuccessTitle: {
    color: '#00E55A',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  ewalletSuccessAmount: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  ewalletSuccessNote: {
    color: '#888',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});
