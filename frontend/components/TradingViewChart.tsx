import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Text, Platform, ActivityIndicator } from 'react-native';
import Constants from 'expo-constants';

// ============= SMOOTH CHART PHYSICS CONSTANTS =============
// Fine-tuned for Binolla-like smoothness

// Scroll Physics
const SCROLL_SENSITIVITY = 0.8;
const MOMENTUM_FRICTION = 0.97; // Higher = longer momentum (0.92 was too abrupt)
const MOMENTUM_MIN_VELOCITY = 0.1; // Lower threshold for smoother stop
const VELOCITY_MULTIPLIER = 20; // Better velocity tracking
const MAX_VELOCITY = 50; // Cap velocity for controlled feel

// Zoom Physics  
const ZOOM_EASING = 0.12; // Smooth zoom interpolation
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 5;

// Animation timing
const ANIMATION_LERP = 0.15; // Linear interpolation factor for smooth transitions

interface TradeMarker {
  id: string;
  entryPrice: number;
  type: 'call' | 'put';
  amount?: number;
  remainingTime?: number;
}

interface HorizontalLine {
  id?: string;
  price: number;
  color?: string;
  selected?: boolean;
}

interface TrendLine {
  id: string;
  startPrice: number;
  endPrice: number;
  startCandleIndex: number;  // Index relative to data, moves with scroll
  endCandleIndex: number;
  color?: string;
}

interface PriceRange {
  min: number;
  max: number;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface TradingViewChartProps {
  symbol: string;
  interval: string;
  theme?: 'dark' | 'light';
  currentPrice?: number;
  chartType?: 'candle' | 'line' | 'bar';
  tradeMarkers?: TradeMarker[];
  horizontalLines?: HorizontalLine[];
  trendLines?: TrendLine[];
  trendLinePreview?: { startCandleIndex: number; startPrice: number; endCandleIndex: number; endPrice: number } | null;
  onPriceUpdate?: (price: number) => void;
  onPriceRangeChange?: (range: PriceRange) => void;
  onChartClick?: (y: number, chartHeight: number, x?: number) => void;
  onChartMove?: (y: number, chartHeight: number, x?: number) => void;
  onLineSelect?: (lineId: string | null) => void;
  onLineMove?: (lineId: string, newPrice: number) => void;
  onTrendLineSelect?: (lineId: string | null, point?: 'start' | 'end' | null) => void;
  onTrendLineMove?: (lineId: string, point: 'start' | 'end', newPrice: number, newCandleIndex: number) => void;
  selectedLineId?: string | null;
  selectedTrendLineId?: string | null;
  activeIndicators?: {
    ma: boolean;
    bollingerBands: boolean;
    rsi: boolean;
    macd: boolean;
    stochastic: boolean;
  };
  authToken?: string | null;
}

// Get API URL from environment
const getApiUrl = () => {
  // Check if we're in a browser with a proper host
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // If running on preview URL, use it directly
    const currentUrl = window.location.origin;
    if (currentUrl.includes('preview.emergentagent.com') || currentUrl.includes('ngrok')) {
      return `${currentUrl}/api`;
    }
    // For localhost development, try to use backend URL env var
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
    if (backendUrl) {
      return `${backendUrl}/api`;
    }
  }
  // Native apps use the backend URL directly
  const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                     process.env.EXPO_PUBLIC_BACKEND_URL || '';
  return backendUrl ? `${backendUrl}/api` : '/api';
};

// Store base tick data globally to persist across re-renders
const baseTickDataStore: { [symbol: string]: CandleData[] } = {};

export default function TradingViewChart({ 
  symbol = 'EUR/USD OTC', 
  interval = '1m',
  theme = 'dark',
  currentPrice,
  chartType = 'candle',
  tradeMarkers = [],
  horizontalLines = [],
  trendLines = [],
  trendLinePreview = null,
  onPriceUpdate,
  onPriceRangeChange,
  onChartClick,
  onChartMove,
  onLineSelect,
  onLineMove,
  onTrendLineSelect,
  onTrendLineMove,
  selectedLineId,
  selectedTrendLineId,
  activeIndicators = { ma: false, bollingerBands: false, rsi: false, macd: false, stochastic: false },
  authToken
}: TradingViewChartProps) {
  // Use ref to track the stable interval value - prevents unwanted re-aggregation
  const intervalRef = useRef(interval);
  const [stableInterval, setStableInterval] = useState(interval);
  
  // Only update stableInterval when interval prop explicitly changes (user action via ToolsModal)
  useEffect(() => {
    if (interval !== intervalRef.current) {
      intervalRef.current = interval;
      setStableInterval(interval);
    }
  }, [interval]);
  
  // Track price range for horizontal lines
  const [priceRange, setPriceRange] = useState<PriceRange>({ min: 0, max: 0 });
  
  // Generate initial placeholder data synchronously for instant display
  const getInitialPlaceholderData = useCallback((sym: string): CandleData[] => {
    const basePrices: { [key: string]: number } = {
      'EUR/USD': 1.0850, 'EUR/USD OTC': 1.0850,
      'GBP/USD': 1.2650, 'GBP/USD OTC': 1.2650,
      'USD/JPY': 149.50, 'USD/JPY OTC': 149.50,
      'BTC/USD': 67500, 'BTC/USD OTC': 67500,
      'ETH/USD': 3500, 'ETH/USD OTC': 3500,
    };
    const basePrice = basePrices[sym] || 1.0850;
    const ticks: CandleData[] = [];
    const now = Date.now();
    
    let price = basePrice;
    for (let i = 300; i >= 0; i--) {
      const volatility = price * 0.00005;
      const open = price;
      const change = (Math.random() - 0.5) * volatility * 2;
      const close = open + change;
      const high = Math.max(open, close) + Math.abs((Math.random() - 0.5) * volatility);
      const low = Math.min(open, close) - Math.abs((Math.random() - 0.5) * volatility);
      ticks.push({
        time: Math.floor((now - i * 1000) / 1000),
        open, high, low, close,
      });
      price = close;
    }
    return ticks;
  }, []);

  const [isLoading, setIsLoading] = useState(false); // Start as false - show instant placeholder
  const [internalPrice, setInternalPrice] = useState(currentPrice || 1.0850);
  const [baseTickData, setBaseTickData] = useState<CandleData[]>(() => {
    // Check cache first, then generate placeholder
    if (baseTickDataStore[symbol] && baseTickDataStore[symbol].length > 0) {
      return baseTickDataStore[symbol];
    }
    return [];
  });
  const [error, setError] = useState<string | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [scale, setScale] = useState(1);  // Default scale
  const [targetScale, setTargetScale] = useState(1);
  const [targetScrollOffset, setTargetScrollOffset] = useState(0);
  const priceTickerRef = useRef<any>(null);
  const candleIntervalRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastCandleTimeRef = useRef<number>(Date.now());
  const dataInitializedRef = useRef(false);
  
  // Smooth scrolling and zoom refs
  const scrollVelocityRef = useRef(0);
  const lastScrollTimeRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const isPinchingRef = useRef(false);
  const initialPinchDistanceRef = useRef(0);
  const initialScaleRef = useRef(1);
  const lastPinchCenterRef = useRef({ x: 0, y: 0 });
  
  // Smooth scroll animation refs
  const scrollAnimationRef = useRef<number | null>(null);
  const targetScrollRef = useRef(0);
  
  // Smooth price animation refs
  const displayPriceRef = useRef(internalPrice);
  const targetPriceRef = useRef(internalPrice);
  const priceAnimationRef = useRef<number | null>(null);
  const [displayPrice, setDisplayPrice] = useState(internalPrice);
  
  // Line dragging refs
  const isDraggingLineRef = useRef(false);
  const dragStartYRef = useRef(0);
  const lastMouseXRef = useRef(0);
  const lastMouseYRef = useRef(0);
  const mouseDownTimeRef = useRef(0);
  const mouseDownPosRef = useRef({ x: 0, y: 0 });
  const actuallyDraggedRef = useRef(false);
  
  // Zoom constraints - use physics constants
  const MIN_SCALE = ZOOM_MIN;
  const MAX_SCALE = ZOOM_MAX;
  
  // Smooth animation for scale transitions with better easing
  useEffect(() => {
    let animFrame: number;
    let isAnimating = true;
    
    // Cubic ease-out for natural deceleration feel
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    
    const animate = () => {
      if (!isAnimating) return;
      
      // Smooth scale transition with cubic easing
      setScale(prev => {
        const diff = targetScale - prev;
        if (Math.abs(diff) < 0.0005) return targetScale;
        // Use physics constant for consistent feel
        const easedDiff = diff * ZOOM_EASING;
        return prev + easedDiff;
      });
      
      animFrame = requestAnimationFrame(animate);
    };
    
    animFrame = requestAnimationFrame(animate);
    
    return () => {
      isAnimating = false;
      cancelAnimationFrame(animFrame);
    };
  }, [targetScale]);
  
  // Smooth scroll animation with improved interpolation
  useEffect(() => {
    let animFrame: number;
    let isAnimating = true;
    
    const animate = () => {
      if (!isAnimating) return;
      
      setScrollOffset(prev => {
        const diff = targetScrollRef.current - prev;
        if (Math.abs(diff) < 0.3) return targetScrollRef.current;
        // Smoother interpolation factor
        return prev + diff * ANIMATION_LERP;
      });
      
      animFrame = requestAnimationFrame(animate);
    };
    
    animFrame = requestAnimationFrame(animate);
    
    return () => {
      isAnimating = false;
      cancelAnimationFrame(animFrame);
    };
  }, []);

  // Smooth price animation - interpolate to target price
  useEffect(() => {
    targetPriceRef.current = internalPrice;
    
    if (priceAnimationRef.current) {
      cancelAnimationFrame(priceAnimationRef.current);
    }
    
    const animatePrice = () => {
      const current = displayPriceRef.current;
      const target = targetPriceRef.current;
      const diff = target - current;
      
      // Smooth interpolation with easing (0.15 = faster, 0.05 = slower)
      const easingFactor = 0.12;
      
      if (Math.abs(diff) < 0.000001) {
        displayPriceRef.current = target;
        setDisplayPrice(target);
        return;
      }
      
      const newPrice = current + diff * easingFactor;
      displayPriceRef.current = newPrice;
      setDisplayPrice(newPrice);
      
      priceAnimationRef.current = requestAnimationFrame(animatePrice);
    };
    
    priceAnimationRef.current = requestAnimationFrame(animatePrice);
    
    return () => {
      if (priceAnimationRef.current) {
        cancelAnimationFrame(priceAnimationRef.current);
      }
    };
  }, [internalPrice]);
  
  // Convert symbol for API
  const apiSymbol = symbol.replace(' OTC', '').replace('/', '');
  
  // Get interval in seconds
  const getIntervalSeconds = useCallback((int: string): number => {
    switch(int) {
      case '1s': return 1;
      case '5s': return 5;
      case '15s': return 15;
      case '1m': return 60;
      case '5m': return 300;
      case '15m': return 900;
      case '1h': return 3600;
      case '4h': return 14400;
      case '1d': return 86400;
      default: return 60;
    }
  }, []);

  // Get base price based on asset
  const getBasePrice = useCallback((asset: string): number => {
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
    if (asset.includes('BTC')) return 67500;
    if (asset.includes('ETH')) return 3500;
    return 1.0850;
  }, []);

  // Fetch chart data from backend (synced across all devices) - NON-BLOCKING
  const fetchChartDataFromServer = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setIsLoading(true);
      const apiUrl = getApiUrl();
      // Clean symbol for API: remove OTC, replace / with empty, uppercase
      const cleanSymbol = symbol.replace(' OTC', '').replace('/', '').toUpperCase();
      
      console.log(`Fetching chart data from server for ${cleanSymbol}...`);
      const response = await fetch(`${apiUrl}/chart/data/${cleanSymbol}`);
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.ticks && data.ticks.length > 0) {
        console.log(`Loaded ${data.ticks.length} ticks from server for ${symbol}`);
        
        // Store in memory cache
        baseTickDataStore[symbol] = data.ticks;
        setBaseTickData(data.ticks);
        
        const lastTick = data.ticks[data.ticks.length - 1];
        setInternalPrice(lastTick.close);
        setIsLoading(false);
        return true;
      }
      
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('Failed to fetch chart data from server:', error);
      setIsLoading(false);
      return false;
    }
  }, [symbol]);

  // Generate fallback data if server fetch fails
  const generateFallbackData = useCallback(() => {
    const basePrice = getBasePrice(symbol);
    const ticks: CandleData[] = [];
    const now = Date.now();
    const tickIntervalMs = 1000;
    
    let price = basePrice;
    
    // Generate 120000 ticks for 2000 candles at 1m interval
    for (let i = 120000; i >= 0; i--) {
      const volatility = price * 0.00005;
      const open = price;
      const change = (Math.random() - 0.5) * volatility * 2;
      const close = open + change;
      const high = Math.max(open, close) + Math.abs((Math.random() - 0.5) * volatility);
      const low = Math.min(open, close) - Math.abs((Math.random() - 0.5) * volatility);
      
      ticks.push({
        time: Math.floor((now - i * tickIntervalMs) / 1000),
        open,
        high,
        low,
        close,
      });
      
      price = close;
    }
    
    baseTickDataStore[symbol] = ticks;
    setBaseTickData(ticks);
    setInternalPrice(price);
    setIsLoading(false);
    console.log(`Generated ${ticks.length} fallback ticks for ${symbol}`);
  }, [symbol, getBasePrice]);

  // Initialize chart data - INSTANT display, background fetch
  const initializeChartData = useCallback(async () => {
    // Check memory cache first - INSTANT
    if (baseTickDataStore[symbol] && baseTickDataStore[symbol].length > 0) {
      console.log(`Using memory cached data for ${symbol} - INSTANT`);
      setBaseTickData(baseTickDataStore[symbol]);
      const lastTick = baseTickDataStore[symbol][baseTickDataStore[symbol].length - 1];
      setInternalPrice(lastTick.close);
      setIsLoading(false);
      // Refresh from server in background (no loading state)
      fetchChartDataFromServer(false);
      return;
    }

    // Show instant placeholder immediately - generated synchronously
    const placeholderData = getInitialPlaceholderData(symbol);
    setBaseTickData(placeholderData);
    if (placeholderData.length > 0) {
      setInternalPrice(placeholderData[placeholderData.length - 1].close);
    }
    setIsLoading(false); // Don't show loading - show placeholder instead
    
    // Fetch real data in background
    const serverSuccess = await fetchChartDataFromServer(false);
    
    if (!serverSuccess) {
      // Generate more data if server fails
      console.log('Server fetch failed, generating local data');
      generateFallbackData();
    }
  }, [symbol, fetchChartDataFromServer, generateFallbackData, getInitialPlaceholderData]);

  // Aggregate base tick data into candles based on interval
  const aggregatedCandles = useMemo(() => {
    if (baseTickData.length === 0) return [];
    
    const intervalSeconds = getIntervalSeconds(stableInterval);
    const candles: CandleData[] = [];
    
    let currentCandle: CandleData | null = null;
    let candleStartTime = 0;
    
    // Debug: track aggregation
    let ticksProcessed = 0;
    
    for (const tick of baseTickData) {
      const tickCandleStart = Math.floor(tick.time / intervalSeconds) * intervalSeconds;
      ticksProcessed++;
      
      if (currentCandle === null || tickCandleStart !== candleStartTime) {
        // Start new candle
        if (currentCandle !== null) {
          candles.push(currentCandle);
        }
        candleStartTime = tickCandleStart;
        currentCandle = {
          time: tickCandleStart,
          open: tick.open,
          high: tick.high,
          low: tick.low,
          close: tick.close,
        };
      } else {
        // Update current candle
        currentCandle.high = Math.max(currentCandle.high, tick.high);
        currentCandle.low = Math.min(currentCandle.low, tick.low);
        currentCandle.close = tick.close;
      }
    }
    
    // Add the last candle
    if (currentCandle !== null) {
      candles.push(currentCandle);
    }
    
    // Debug log every 10 seconds
    if (candles.length > 0 && Math.random() < 0.1) {
      console.log(`[AGGREGATION] interval=${stableInterval}(${intervalSeconds}s), ticks=${ticksProcessed}, candles=${candles.length}`);
    }
    
    return candles;
  }, [baseTickData, stableInterval, getIntervalSeconds]);

  // Initialize data on mount or symbol change
  useEffect(() => {
    dataInitializedRef.current = false;
    initializeChartData();
  }, [symbol, initializeChartData]); // Only regenerate when symbol changes, NOT interval

  // Sync with server - fetch latest tick data every 500ms for smoother updates
  const syncWithServerRef = useRef<any>(null);
  
  useEffect(() => {
    const syncWithServer = async () => {
      try {
        const apiUrl = getApiUrl();
        const cleanSymbol = symbol.replace(' OTC', '').replace('/', '').toUpperCase();
        
        const headers: Record<string, string> = {};
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        const response = await fetch(`${apiUrl}/chart/tick/${cleanSymbol}`, {
          method: 'POST',
          headers
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.new_tick) {
            setBaseTickData(prevData => {
              if (prevData.length === 0) return prevData;
              
              const newData = [...prevData];
              const lastTick = prevData[prevData.length - 1];
              
              if (lastTick.time >= data.new_tick.time) {
                newData[newData.length - 1] = data.new_tick;
              } else {
                newData.push(data.new_tick);
                if (newData.length > 35000) {
                  newData.shift();
                }
              }
              
              baseTickDataStore[symbol] = newData;
              return newData;
            });
            
            setInternalPrice(data.new_tick.close);
          }
        }
      } catch (error) {
        // Silently fail - will retry on next interval
      }
    };

    // Sync with server immediately on mount
    syncWithServer();
    
    // Sync every 500ms for smoother updates (was 1000ms)
    syncWithServerRef.current = setInterval(syncWithServer, 500);
    
    return () => {
      if (syncWithServerRef.current) {
        clearInterval(syncWithServerRef.current);
      }
    };
  }, [symbol, authToken]);

  // Call onPriceUpdate when display price changes (smooth animated price)
  useEffect(() => {
    if (onPriceUpdate) {
      onPriceUpdate(displayPrice);
    }
  }, [displayPrice, onPriceUpdate]);

  // Draw chart on canvas with high-DPI (4K) quality
  const drawChart = useCallback(() => {
    if (Platform.OS !== 'web' || !canvasRef.current || aggregatedCandles.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // High-DPI / Retina / 4K support
    const dpr = window.devicePixelRatio || 2; // Default to 2x for crisp rendering
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    
    // Set canvas internal resolution to match device pixel ratio
    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      // Scale context to match DPR
      ctx.scale(dpr, dpr);
    }
    
    const width = displayWidth;
    const height = displayHeight;
    const padding = { top: 20, right: 60, bottom: 30, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Reset transform and clear canvas
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    // Enable image smoothing for crisp rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Clear canvas - Semi-transparent to show background image
    ctx.clearRect(0, 0, width, height);
    // Transparent background to show user's chart picture behind
    ctx.fillStyle = 'rgba(10, 10, 10, 0.7)';
    ctx.fillRect(0, 0, width, height);
    
    // Calculate visible candles
    const baseBarWidth = 10 * scale;
    const barSpacing = 2 * scale;
    const totalBarWidth = baseBarWidth + barSpacing;
    const visibleCandles = Math.floor(chartWidth / totalBarWidth);
    
    const scrollCandles = Math.floor(scrollOffset / totalBarWidth);
    const baseStartIndex = aggregatedCandles.length - visibleCandles;
    const startIndex = Math.max(0, Math.min(aggregatedCandles.length - visibleCandles, baseStartIndex - scrollCandles));
    const endIndex = Math.min(aggregatedCandles.length, startIndex + visibleCandles + 2);
    const visibleData = aggregatedCandles.slice(startIndex, endIndex);
    
    if (visibleData.length === 0) return;
    
    // Calculate price range
    let minPrice = Math.min(...visibleData.map(c => c.low));
    let maxPrice = Math.max(...visibleData.map(c => c.high));
    const priceRange = maxPrice - minPrice;
    const pricePadding = priceRange * 0.1;
    minPrice -= pricePadding;
    maxPrice += pricePadding;
    
    // Notify parent about price range change
    if (onPriceRangeChange) {
      onPriceRangeChange({ min: minPrice, max: maxPrice });
    }
    
    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
    
    // Draw candles
    visibleData.forEach((candle, i) => {
      const x = padding.left + i * totalBarWidth + 15;
      const isGreen = candle.close >= candle.open;
      const color = isGreen ? '#00E55A' : '#FF3B3B';
      
      const yOpen = padding.top + ((maxPrice - candle.open) / (maxPrice - minPrice)) * chartHeight;
      const yClose = padding.top + ((maxPrice - candle.close) / (maxPrice - minPrice)) * chartHeight;
      const yHigh = padding.top + ((maxPrice - candle.high) / (maxPrice - minPrice)) * chartHeight;
      const yLow = padding.top + ((maxPrice - candle.low) / (maxPrice - minPrice)) * chartHeight;
      
      if (chartType === 'line') {
        if (i === 0) {
          ctx.beginPath();
          ctx.moveTo(x + baseBarWidth / 2, yClose);
        } else {
          ctx.lineTo(x + baseBarWidth / 2, yClose);
        }
        if (i === visibleData.length - 1) {
          ctx.strokeStyle = '#00E55A';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      } else if (chartType === 'bar') {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, yOpen);
        ctx.lineTo(x + baseBarWidth / 2, yOpen);
        ctx.moveTo(x + baseBarWidth / 2, yHigh);
        ctx.lineTo(x + baseBarWidth / 2, yLow);
        ctx.moveTo(x + baseBarWidth / 2, yClose);
        ctx.lineTo(x + baseBarWidth, yClose);
        ctx.stroke();
      } else {
        // Candlestick
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + baseBarWidth / 2, yHigh);
        ctx.lineTo(x + baseBarWidth / 2, yLow);
        ctx.stroke();
        
        ctx.fillStyle = color;
        const bodyTop = Math.min(yOpen, yClose);
        const bodyHeight = Math.max(1, Math.abs(yClose - yOpen));
        ctx.fillRect(x, bodyTop, baseBarWidth, bodyHeight);
      }
    });
    
    // Draw price scale
    ctx.fillStyle = '#888';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const price = maxPrice - ((maxPrice - minPrice) / 5) * i;
      const y = padding.top + (chartHeight / 5) * i;
      ctx.fillText(price.toFixed(5), width - 5, y + 4);
    }
    
    // Draw current price line
    const currentPriceY = padding.top + ((maxPrice - internalPrice) / (maxPrice - minPrice)) * chartHeight;
    ctx.strokeStyle = '#00E55A';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left, currentPriceY);
    ctx.lineTo(width - padding.right, currentPriceY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw trade markers
    tradeMarkers.forEach((marker) => {
      const markerY = padding.top + ((maxPrice - marker.entryPrice) / (maxPrice - minPrice)) * chartHeight;
      const markerColor = marker.type === 'call' ? '#00E55A' : '#FF6B6B';
      
      // Horizontal line
      ctx.strokeStyle = markerColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, markerY);
      ctx.lineTo(width - padding.right, markerY);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Entry badge
      ctx.fillStyle = markerColor;
      ctx.beginPath();
      ctx.roundRect(10, markerY - 12, 60, 24, 6);
      ctx.fill();
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`${marker.type === 'call' ? '↑' : '↓'} ${marker.amount || 0}$`, 16, markerY + 4);
      
      // Countdown timer
      if (marker.remainingTime && marker.remainingTime > 0) {
        const mins = Math.floor(marker.remainingTime / 60).toString().padStart(2, '0');
        const secs = (marker.remainingTime % 60).toString().padStart(2, '0');
        
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.beginPath();
        ctx.roundRect(75, markerY - 12, 50, 24, 6);
        ctx.fill();
        
        ctx.strokeStyle = markerColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`${mins}:${secs}`, 82, markerY + 4);
      }
      
      // Position dot
      ctx.fillStyle = markerColor;
      ctx.beginPath();
      ctx.arc(width - padding.right - 10, markerY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    
    // Draw horizontal lines
    console.log('Drawing horizontal lines:', horizontalLines.length, 'minPrice:', minPrice, 'maxPrice:', maxPrice);
    horizontalLines.forEach((line, index) => {
      console.log('Line', index, 'price:', line.price, 'inRange:', line.price >= minPrice && line.price <= maxPrice);
      
      // Always draw line even if slightly out of range (with 20% buffer)
      const priceBuffer = (maxPrice - minPrice) * 0.2;
      if (line.price < minPrice - priceBuffer || line.price > maxPrice + priceBuffer) {
        console.log('Line out of range, skipping');
        return;
      }
      
      const lineY = padding.top + ((maxPrice - line.price) / (maxPrice - minPrice)) * chartHeight;
      console.log('Line Y position:', lineY);
      
      // Draw dashed line
      ctx.setLineDash([8, 4]);
      ctx.strokeStyle = line.color || '#FFB800';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(padding.left, lineY);
      ctx.lineTo(width - padding.right, lineY);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash
      
      // Price label on right - use fillRect instead of roundRect for compatibility
      const labelWidth = 70;
      const labelHeight = 20;
      const labelX = width - padding.right + 5;
      const labelY = lineY - 10;
      
      ctx.fillStyle = line.color || '#FFB800';
      ctx.beginPath();
      // Simple rectangle fallback if roundRect not supported
      if (ctx.roundRect) {
        ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 4);
      } else {
        ctx.rect(labelX, labelY, labelWidth, labelHeight);
      }
      ctx.fill();
      
      ctx.fillStyle = '#0A0A0A';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(line.price.toFixed(5), labelX + 5, lineY + 4);
    });
    
    // Draw trend lines
    console.log('Drawing trend lines:', trendLines.length, 'scrollOffset:', scrollOffset, 'scale:', scale);
    trendLines.forEach((line, index) => {
      // Calculate Y positions from prices
      const startY = padding.top + ((maxPrice - line.startPrice) / (maxPrice - minPrice)) * chartHeight;
      const endY = padding.top + ((maxPrice - line.endPrice) / (maxPrice - minPrice)) * chartHeight;
      
      // Calculate X positions from candle indices - accounting for scroll and scale
      // Candles are drawn from right to left, so we need to invert the calculation
      const candleWidth = 8 * scale;
      const candleGap = 4 * scale;
      const totalCandleWidth = candleWidth + candleGap;
      
      // Calculate X positions based on candle indices
      // Index 0 is the most recent candle (rightmost)
      const chartRightEdge = width - padding.right;
      const startX = chartRightEdge - (line.startCandleIndex * totalCandleWidth) + (scrollOffset * scale);
      const endX = chartRightEdge - (line.endCandleIndex * totalCandleWidth) + (scrollOffset * scale);
      
      console.log('Trend line', index, 'candleIndices:', { start: line.startCandleIndex, end: line.endCandleIndex }, 'positions:', { startX, endX, startY, endY });
      
      // Only draw if at least part of the line is visible
      const minX = Math.min(startX, endX);
      const maxX = Math.max(startX, endX);
      if (maxX < padding.left || minX > width - padding.right) {
        console.log('Trend line', index, 'is outside visible area');
        return; // Skip drawing if completely outside
      }
      
      const isSelected = line.id === selectedTrendLineId;
      
      // Draw the trend line
      ctx.strokeStyle = isSelected ? '#FFB800' : (line.color || '#00E55A');
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      
      // Draw circles at endpoints (larger when selected for easier dragging)
      const pointRadius = isSelected ? 8 : 4;
      ctx.fillStyle = isSelected ? '#FFB800' : (line.color || '#00E55A');
      
      if (startX >= padding.left && startX <= width - padding.right) {
        ctx.beginPath();
        ctx.arc(startX, startY, pointRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add inner circle for selected state
        if (isSelected) {
          ctx.fillStyle = '#0A0A0A';
          ctx.beginPath();
          ctx.arc(startX, startY, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (endX >= padding.left && endX <= width - padding.right) {
        ctx.fillStyle = isSelected ? '#FFB800' : (line.color || '#00E55A');
        ctx.beginPath();
        ctx.arc(endX, endY, pointRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add inner circle for selected state
        if (isSelected) {
          ctx.fillStyle = '#0A0A0A';
          ctx.beginPath();
          ctx.arc(endX, endY, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
    
    // Draw trend line preview (rubber band effect while drawing)
    if (trendLinePreview) {
      const startY = padding.top + ((maxPrice - trendLinePreview.startPrice) / (maxPrice - minPrice)) * chartHeight;
      const endY = padding.top + ((maxPrice - trendLinePreview.endPrice) / (maxPrice - minPrice)) * chartHeight;
      
      const candleWidth = 8 * scale;
      const candleGap = 4 * scale;
      const totalCandleWidth = candleWidth + candleGap;
      const chartRightEdge = width - padding.right;
      
      const startX = chartRightEdge - (trendLinePreview.startCandleIndex * totalCandleWidth) + (scrollOffset * scale);
      const endX = chartRightEdge - (trendLinePreview.endCandleIndex * totalCandleWidth) + (scrollOffset * scale);
      
      // Draw preview line with dashed style
      ctx.strokeStyle = '#00E55A';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw start point (filled)
      ctx.fillStyle = '#00E55A';
      ctx.beginPath();
      ctx.arc(startX, startY, 5, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw end point (hollow/ring)
      ctx.strokeStyle = '#00E55A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(endX, endY, 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // ============== INDICATOR DRAWING ==============
    
    // Helper function to calculate Simple Moving Average
    const calculateSMA = (data: CandleData[], period: number): (number | null)[] => {
      const result: (number | null)[] = [];
      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
          result.push(null);
        } else {
          let sum = 0;
          for (let j = 0; j < period; j++) {
            sum += data[i - j].close;
          }
          result.push(sum / period);
        }
      }
      return result;
    };
    
    // Helper function to calculate Standard Deviation
    const calculateStdDev = (data: CandleData[], period: number, sma: (number | null)[]): (number | null)[] => {
      const result: (number | null)[] = [];
      for (let i = 0; i < data.length; i++) {
        if (i < period - 1 || sma[i] === null) {
          result.push(null);
        } else {
          let sumSquares = 0;
          for (let j = 0; j < period; j++) {
            const diff = data[i - j].close - (sma[i] as number);
            sumSquares += diff * diff;
          }
          result.push(Math.sqrt(sumSquares / period));
        }
      }
      return result;
    };
    
    // Helper function to calculate RSI
    const calculateRSI = (data: CandleData[], period: number = 14): (number | null)[] => {
      const result: (number | null)[] = [];
      const gains: number[] = [];
      const losses: number[] = [];
      
      for (let i = 0; i < data.length; i++) {
        if (i === 0) {
          result.push(null);
          continue;
        }
        
        const change = data[i].close - data[i - 1].close;
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;
        
        gains.push(gain);
        losses.push(loss);
        
        if (i < period) {
          result.push(null);
        } else {
          let avgGain = 0;
          let avgLoss = 0;
          
          if (i === period) {
            // First RSI calculation - simple average
            for (let j = 0; j < period; j++) {
              avgGain += gains[j];
              avgLoss += losses[j];
            }
            avgGain /= period;
            avgLoss /= period;
          } else {
            // Subsequent - smoothed average
            const prevAvgGain = gains.slice(0, i - 1).reduce((a, b) => a + b, 0) / (i - 1);
            const prevAvgLoss = losses.slice(0, i - 1).reduce((a, b) => a + b, 0) / (i - 1);
            avgGain = (prevAvgGain * (period - 1) + gain) / period;
            avgLoss = (prevAvgLoss * (period - 1) + loss) / period;
          }
          
          if (avgLoss === 0) {
            result.push(100);
          } else {
            const rs = avgGain / avgLoss;
            result.push(100 - (100 / (1 + rs)));
          }
        }
      }
      return result;
    };
    
    // Helper function to calculate EMA
    const calculateEMA = (data: CandleData[], period: number): (number | null)[] => {
      const result: (number | null)[] = [];
      const multiplier = 2 / (period + 1);
      
      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
          result.push(null);
        } else if (i === period - 1) {
          // First EMA is SMA
          let sum = 0;
          for (let j = 0; j < period; j++) {
            sum += data[i - j].close;
          }
          result.push(sum / period);
        } else {
          const prevEMA = result[i - 1] as number;
          result.push((data[i].close - prevEMA) * multiplier + prevEMA);
        }
      }
      return result;
    };
    
    // Helper function to calculate MACD
    const calculateMACD = (data: CandleData[]): { macd: (number | null)[], signal: (number | null)[], histogram: (number | null)[] } => {
      const ema12 = calculateEMA(data, 12);
      const ema26 = calculateEMA(data, 26);
      const macdLine: (number | null)[] = [];
      
      for (let i = 0; i < data.length; i++) {
        if (ema12[i] === null || ema26[i] === null) {
          macdLine.push(null);
        } else {
          macdLine.push((ema12[i] as number) - (ema26[i] as number));
        }
      }
      
      // Signal line (9-period EMA of MACD)
      const signalLine: (number | null)[] = [];
      const signalPeriod = 9;
      const signalMultiplier = 2 / (signalPeriod + 1);
      
      let firstValidIndex = -1;
      for (let i = 0; i < macdLine.length; i++) {
        if (macdLine[i] !== null) {
          if (firstValidIndex === -1) firstValidIndex = i;
          
          const validCount = i - firstValidIndex;
          if (validCount < signalPeriod - 1) {
            signalLine.push(null);
          } else if (validCount === signalPeriod - 1) {
            let sum = 0;
            for (let j = 0; j < signalPeriod; j++) {
              sum += macdLine[i - j] as number;
            }
            signalLine.push(sum / signalPeriod);
          } else {
            const prevSignal = signalLine[i - 1] as number;
            signalLine.push(((macdLine[i] as number) - prevSignal) * signalMultiplier + prevSignal);
          }
        } else {
          signalLine.push(null);
        }
      }
      
      // Histogram
      const histogram: (number | null)[] = [];
      for (let i = 0; i < data.length; i++) {
        if (macdLine[i] === null || signalLine[i] === null) {
          histogram.push(null);
        } else {
          histogram.push((macdLine[i] as number) - (signalLine[i] as number));
        }
      }
      
      return { macd: macdLine, signal: signalLine, histogram };
    };
    
    // Helper function to calculate Stochastic
    const calculateStochastic = (data: CandleData[], kPeriod: number = 14, dPeriod: number = 3): { k: (number | null)[], d: (number | null)[] } => {
      const kLine: (number | null)[] = [];
      
      for (let i = 0; i < data.length; i++) {
        if (i < kPeriod - 1) {
          kLine.push(null);
        } else {
          let highestHigh = -Infinity;
          let lowestLow = Infinity;
          for (let j = 0; j < kPeriod; j++) {
            highestHigh = Math.max(highestHigh, data[i - j].high);
            lowestLow = Math.min(lowestLow, data[i - j].low);
          }
          
          if (highestHigh === lowestLow) {
            kLine.push(50);
          } else {
            kLine.push(((data[i].close - lowestLow) / (highestHigh - lowestLow)) * 100);
          }
        }
      }
      
      // %D is SMA of %K
      const dLine: (number | null)[] = [];
      for (let i = 0; i < kLine.length; i++) {
        if (kLine[i] === null || i < kPeriod - 1 + dPeriod - 1) {
          dLine.push(null);
        } else {
          let sum = 0;
          let count = 0;
          for (let j = 0; j < dPeriod; j++) {
            if (kLine[i - j] !== null) {
              sum += kLine[i - j] as number;
              count++;
            }
          }
          dLine.push(count > 0 ? sum / count : null);
        }
      }
      
      return { k: kLine, d: dLine };
    };
    
    // Get slice indices for visible data
    const visibleStartIdx = startIndex;
    const visibleEndIdx = endIndex;
    
    // Draw Moving Average (MA) indicator
    if (activeIndicators.ma) {
      const maPeriod = 20;
      const maValues = calculateSMA(aggregatedCandles, maPeriod);
      
      ctx.strokeStyle = '#00E55A';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      
      let started = false;
      for (let i = visibleStartIdx; i < visibleEndIdx; i++) {
        const displayIndex = i - visibleStartIdx;
        const x = padding.left + displayIndex * totalBarWidth + baseBarWidth / 2 + 15;
        const maValue = maValues[i];
        
        if (maValue !== null) {
          const y = padding.top + ((maxPrice - maValue) / (maxPrice - minPrice)) * chartHeight;
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
      
      // MA Label
      ctx.fillStyle = '#00E55A';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`MA(${maPeriod})`, padding.left + 5, padding.top + 15);
    }
    
    // Draw Bollinger Bands indicator
    if (activeIndicators.bollingerBands) {
      const bbPeriod = 20;
      const bbMultiplier = 2;
      const sma = calculateSMA(aggregatedCandles, bbPeriod);
      const stdDev = calculateStdDev(aggregatedCandles, bbPeriod, sma);
      
      // Upper band
      ctx.strokeStyle = '#FFB800';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      let startedUpper = false;
      for (let i = visibleStartIdx; i < visibleEndIdx; i++) {
        const displayIndex = i - visibleStartIdx;
        const x = padding.left + displayIndex * totalBarWidth + baseBarWidth / 2 + 15;
        if (sma[i] !== null && stdDev[i] !== null) {
          const upperValue = (sma[i] as number) + bbMultiplier * (stdDev[i] as number);
          const y = padding.top + ((maxPrice - upperValue) / (maxPrice - minPrice)) * chartHeight;
          if (!startedUpper) {
            ctx.moveTo(x, y);
            startedUpper = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
      
      // Middle band (SMA)
      ctx.strokeStyle = '#FFB800';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      let startedMiddle = false;
      for (let i = visibleStartIdx; i < visibleEndIdx; i++) {
        const displayIndex = i - visibleStartIdx;
        const x = padding.left + displayIndex * totalBarWidth + baseBarWidth / 2 + 15;
        if (sma[i] !== null) {
          const y = padding.top + ((maxPrice - (sma[i] as number)) / (maxPrice - minPrice)) * chartHeight;
          if (!startedMiddle) {
            ctx.moveTo(x, y);
            startedMiddle = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Lower band
      ctx.strokeStyle = '#FFB800';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let startedLower = false;
      for (let i = visibleStartIdx; i < visibleEndIdx; i++) {
        const displayIndex = i - visibleStartIdx;
        const x = padding.left + displayIndex * totalBarWidth + baseBarWidth / 2 + 15;
        if (sma[i] !== null && stdDev[i] !== null) {
          const lowerValue = (sma[i] as number) - bbMultiplier * (stdDev[i] as number);
          const y = padding.top + ((maxPrice - lowerValue) / (maxPrice - minPrice)) * chartHeight;
          if (!startedLower) {
            ctx.moveTo(x, y);
            startedLower = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
      
      // BB Label
      ctx.fillStyle = '#FFB800';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'left';
      const labelY = activeIndicators.ma ? padding.top + 30 : padding.top + 15;
      ctx.fillText(`BB(${bbPeriod}, ${bbMultiplier})`, padding.left + 5, labelY);
    }
    
    // Draw RSI indicator (in a sub-panel at the bottom)
    if (activeIndicators.rsi) {
      const rsiPeriod = 14;
      const rsiValues = calculateRSI(aggregatedCandles, rsiPeriod);
      
      // RSI panel dimensions
      const rsiPanelHeight = 60;
      const rsiPanelTop = height - padding.bottom - rsiPanelHeight - 5;
      const rsiPanelBottom = height - padding.bottom - 5;
      
      // Draw RSI panel background
      ctx.fillStyle = 'rgba(10, 26, 15, 0.9)';
      ctx.fillRect(padding.left, rsiPanelTop, chartWidth, rsiPanelHeight);
      
      // Draw RSI overbought/oversold lines
      ctx.strokeStyle = 'rgba(255, 107, 107, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      
      // Overbought (70)
      const overboughtY = rsiPanelTop + (1 - 70 / 100) * rsiPanelHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, overboughtY);
      ctx.lineTo(width - padding.right, overboughtY);
      ctx.stroke();
      
      // Oversold (30)
      const oversoldY = rsiPanelTop + (1 - 30 / 100) * rsiPanelHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, oversoldY);
      ctx.lineTo(width - padding.right, oversoldY);
      ctx.stroke();
      
      // Middle line (50)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      const middleY = rsiPanelTop + rsiPanelHeight / 2;
      ctx.beginPath();
      ctx.moveTo(padding.left, middleY);
      ctx.lineTo(width - padding.right, middleY);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw RSI line
      ctx.strokeStyle = '#FF6B6B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      let startedRSI = false;
      for (let i = visibleStartIdx; i < visibleEndIdx; i++) {
        const displayIndex = i - visibleStartIdx;
        const x = padding.left + displayIndex * totalBarWidth + baseBarWidth / 2 + 15;
        const rsiValue = rsiValues[i];
        
        if (rsiValue !== null) {
          const y = rsiPanelTop + (1 - rsiValue / 100) * rsiPanelHeight;
          if (!startedRSI) {
            ctx.moveTo(x, y);
            startedRSI = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
      
      // RSI Label
      ctx.fillStyle = '#FF6B6B';
      ctx.font = 'bold 9px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`RSI(${rsiPeriod})`, padding.left + 3, rsiPanelTop + 12);
      
      // RSI scale labels
      ctx.fillStyle = '#888';
      ctx.font = '8px Arial';
      ctx.textAlign = 'right';
      ctx.fillText('70', width - padding.right + 15, overboughtY + 3);
      ctx.fillText('30', width - padding.right + 15, oversoldY + 3);
    }
    
    // Draw MACD indicator (in a sub-panel)
    if (activeIndicators.macd) {
      const macdData = calculateMACD(aggregatedCandles);
      
      // MACD panel dimensions
      const macdPanelHeight = 60;
      const macdPanelTop = activeIndicators.rsi 
        ? height - padding.bottom - 60 - 5 - macdPanelHeight - 5
        : height - padding.bottom - macdPanelHeight - 5;
      
      // Draw MACD panel background
      ctx.fillStyle = 'rgba(10, 26, 15, 0.9)';
      ctx.fillRect(padding.left, macdPanelTop, chartWidth, macdPanelHeight);
      
      // Find MACD range for scaling
      let macdMin = Infinity, macdMax = -Infinity;
      for (let i = visibleStartIdx; i < visibleEndIdx; i++) {
        if (macdData.macd[i] !== null) {
          macdMin = Math.min(macdMin, macdData.macd[i] as number);
          macdMax = Math.max(macdMax, macdData.macd[i] as number);
        }
        if (macdData.signal[i] !== null) {
          macdMin = Math.min(macdMin, macdData.signal[i] as number);
          macdMax = Math.max(macdMax, macdData.signal[i] as number);
        }
        if (macdData.histogram[i] !== null) {
          macdMin = Math.min(macdMin, macdData.histogram[i] as number);
          macdMax = Math.max(macdMax, macdData.histogram[i] as number);
        }
      }
      
      const macdRange = macdMax - macdMin || 1;
      const macdPadding = macdRange * 0.1;
      macdMin -= macdPadding;
      macdMax += macdPadding;
      
      // Draw zero line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      const zeroY = macdPanelTop + ((macdMax - 0) / (macdMax - macdMin)) * macdPanelHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, zeroY);
      ctx.lineTo(width - padding.right, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw histogram bars
      for (let i = visibleStartIdx; i < visibleEndIdx; i++) {
        const displayIndex = i - visibleStartIdx;
        const x = padding.left + displayIndex * totalBarWidth + 15;
        const histValue = macdData.histogram[i];
        
        if (histValue !== null) {
          const barHeight = Math.abs((histValue / (macdMax - macdMin)) * macdPanelHeight);
          const barY = histValue >= 0 ? zeroY - barHeight : zeroY;
          ctx.fillStyle = histValue >= 0 ? 'rgba(0, 229, 90, 0.6)' : 'rgba(255, 59, 59, 0.6)';
          ctx.fillRect(x, barY, baseBarWidth * 0.6, barHeight);
        }
      }
      
      // Draw MACD line
      ctx.strokeStyle = '#9B59B6';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let startedMACD = false;
      for (let i = visibleStartIdx; i < visibleEndIdx; i++) {
        const displayIndex = i - visibleStartIdx;
        const x = padding.left + displayIndex * totalBarWidth + baseBarWidth / 2 + 15;
        const macdValue = macdData.macd[i];
        
        if (macdValue !== null) {
          const y = macdPanelTop + ((macdMax - macdValue) / (macdMax - macdMin)) * macdPanelHeight;
          if (!startedMACD) {
            ctx.moveTo(x, y);
            startedMACD = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
      
      // Draw Signal line
      ctx.strokeStyle = '#E67E22';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let startedSignal = false;
      for (let i = visibleStartIdx; i < visibleEndIdx; i++) {
        const displayIndex = i - visibleStartIdx;
        const x = padding.left + displayIndex * totalBarWidth + baseBarWidth / 2 + 15;
        const signalValue = macdData.signal[i];
        
        if (signalValue !== null) {
          const y = macdPanelTop + ((macdMax - signalValue) / (macdMax - macdMin)) * macdPanelHeight;
          if (!startedSignal) {
            ctx.moveTo(x, y);
            startedSignal = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
      
      // MACD Label
      ctx.fillStyle = '#9B59B6';
      ctx.font = 'bold 9px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('MACD(12,26,9)', padding.left + 3, macdPanelTop + 12);
    }
    
    // Draw Stochastic indicator (in a sub-panel)
    if (activeIndicators.stochastic) {
      const stochData = calculateStochastic(aggregatedCandles);
      
      // Stochastic panel dimensions
      const stochPanelHeight = 60;
      let stochPanelTop = height - padding.bottom - stochPanelHeight - 5;
      
      if (activeIndicators.rsi) stochPanelTop -= 65;
      if (activeIndicators.macd) stochPanelTop -= 65;
      
      // Draw Stochastic panel background
      ctx.fillStyle = 'rgba(10, 26, 15, 0.9)';
      ctx.fillRect(padding.left, stochPanelTop, chartWidth, stochPanelHeight);
      
      // Draw overbought/oversold lines
      ctx.strokeStyle = 'rgba(52, 152, 219, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      
      // Overbought (80)
      const overboughtY = stochPanelTop + (1 - 80 / 100) * stochPanelHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, overboughtY);
      ctx.lineTo(width - padding.right, overboughtY);
      ctx.stroke();
      
      // Oversold (20)
      const oversoldY = stochPanelTop + (1 - 20 / 100) * stochPanelHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, oversoldY);
      ctx.lineTo(width - padding.right, oversoldY);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw %K line
      ctx.strokeStyle = '#3498DB';
      ctx.lineWidth = 2;
      ctx.beginPath();
      let startedK = false;
      for (let i = visibleStartIdx; i < visibleEndIdx; i++) {
        const displayIndex = i - visibleStartIdx;
        const x = padding.left + displayIndex * totalBarWidth + baseBarWidth / 2 + 15;
        const kValue = stochData.k[i];
        
        if (kValue !== null) {
          const y = stochPanelTop + (1 - kValue / 100) * stochPanelHeight;
          if (!startedK) {
            ctx.moveTo(x, y);
            startedK = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
      
      // Draw %D line
      ctx.strokeStyle = '#E74C3C';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      let startedD = false;
      for (let i = visibleStartIdx; i < visibleEndIdx; i++) {
        const displayIndex = i - visibleStartIdx;
        const x = padding.left + displayIndex * totalBarWidth + baseBarWidth / 2 + 15;
        const dValue = stochData.d[i];
        
        if (dValue !== null) {
          const y = stochPanelTop + (1 - dValue / 100) * stochPanelHeight;
          if (!startedD) {
            ctx.moveTo(x, y);
            startedD = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Stochastic Label
      ctx.fillStyle = '#3498DB';
      ctx.font = 'bold 9px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('Stoch(14,3)', padding.left + 3, stochPanelTop + 12);
      
      // Scale labels
      ctx.fillStyle = '#888';
      ctx.font = '8px Arial';
      ctx.textAlign = 'right';
      ctx.fillText('80', width - padding.right + 15, overboughtY + 3);
      ctx.fillText('20', width - padding.right + 15, oversoldY + 3);
    }
    
    // ============== END INDICATOR DRAWING ==============
    
  }, [aggregatedCandles, chartType, internalPrice, scrollOffset, scale, tradeMarkers, horizontalLines, trendLines, trendLinePreview, selectedTrendLineId, activeIndicators]);

  // Redraw chart when data changes
  useEffect(() => {
    drawChart();
  }, [drawChart]);

  // Handle canvas resize for high-DPI rendering
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    const handleResize = () => {
      // Trigger re-render on resize
      drawChart();
    };
    
    window.addEventListener('resize', handleResize);
    
    // Initial draw after a small delay to ensure canvas is mounted
    const timer = setTimeout(drawChart, 100);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [drawChart]);

  // Web platform rendering with Canvas
  if (Platform.OS === 'web') {
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 390;
    const chartHeight = 400;
    
    // Inline style for zoom buttons (web only)
    const zoomButtonStyle: React.CSSProperties = {
      width: 22,
      height: 22,
      borderRadius: 4,
      backgroundColor: 'rgba(0, 229, 90, 0.15)',
      border: '1px solid rgba(0, 229, 90, 0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      userSelect: 'none',
      transition: 'background-color 0.2s',
    };
    
    return (
      <View style={styles.container}>
        <div 
          style={{ 
            width: '100%', 
            height: '100%', 
            backgroundColor: '#0A1A0F', 
            position: 'relative',
            touchAction: 'none',
            cursor: isDraggingRef.current ? 'grabbing' : 'grab',
            userSelect: 'none'
          }}
          onWheel={(e: any) => {
            e.preventDefault();
            // Mouse wheel zoom - works without modifier keys
            // Negative deltaY = scroll up = zoom in
            // Positive deltaY = scroll down = zoom out
            const zoomIntensity = 0.08;
            const delta = e.deltaY > 0 ? (1 - zoomIntensity) : (1 + zoomIntensity);
            
            setTargetScale(prev => {
              const newScale = prev * delta;
              return Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
            });
          }}
          onMouseDown={(e: any) => {
            e.preventDefault();
            isDraggingRef.current = true;
            const startX = e.clientX;
            const startOffset = scrollOffset;
            let lastX = startX;
            let lastTime = Date.now();
            
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
              animationFrameRef.current = null;
            }
            scrollVelocityRef.current = 0;
            
            const onMouseMove = (moveE: any) => {
              const currentX = moveE.clientX;
              const currentTime = Date.now();
              const diff = currentX - startX;
              const timeDiff = currentTime - lastTime;
              
              if (timeDiff > 0) {
                // Better velocity calculation with smoother tracking
                const rawVelocity = (currentX - lastX) / timeDiff * VELOCITY_MULTIPLIER;
                // Clamp velocity for controlled feel
                scrollVelocityRef.current = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, rawVelocity));
              }
              
              lastX = currentX;
              lastTime = currentTime;
              setScrollOffset(startOffset + diff * SCROLL_SENSITIVITY);
            };
            
            const onMouseUp = () => {
              isDraggingRef.current = false;
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
              
              // Physics-based momentum scrolling with natural deceleration
              const applyMomentum = () => {
                if (Math.abs(scrollVelocityRef.current) > MOMENTUM_MIN_VELOCITY) {
                  setScrollOffset(prev => {
                    const newOffset = prev + scrollVelocityRef.current;
                    // Smooth boundary with elastic feel
                    if (newOffset < 0) {
                      scrollVelocityRef.current *= 0.5; // Dampen at boundary
                      return 0;
                    }
                    return newOffset;
                  });
                  // Apply friction with slight easing curve
                  scrollVelocityRef.current *= MOMENTUM_FRICTION;
                  animationFrameRef.current = requestAnimationFrame(applyMomentum);
                } else {
                  scrollVelocityRef.current = 0;
                }
              };
              
              // Start momentum if velocity is significant
              if (Math.abs(scrollVelocityRef.current) > 0.3) {
                animationFrameRef.current = requestAnimationFrame(applyMomentum);
              }
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          }}
          onTouchStart={(e: any) => {
            // Handle both single touch (pan) and two-finger touch (pinch zoom)
            if (e.touches.length === 2) {
              // Pinch gesture start
              isPinchingRef.current = true;
              isDraggingRef.current = false;
              
              const touch1 = e.touches[0];
              const touch2 = e.touches[1];
              
              // Calculate initial distance between two fingers
              const dx = touch2.clientX - touch1.clientX;
              const dy = touch2.clientY - touch1.clientY;
              initialPinchDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
              initialScaleRef.current = scale;
              
              // Calculate pinch center
              lastPinchCenterRef.current = {
                x: (touch1.clientX + touch2.clientX) / 2,
                y: (touch1.clientY + touch2.clientY) / 2
              };
              
              if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
              }
              scrollVelocityRef.current = 0;
              
            } else if (e.touches.length === 1 && !isPinchingRef.current) {
              // Single finger pan
              isDraggingRef.current = true;
              const startX = e.touches[0].clientX;
              const startOffset = scrollOffset;
              let lastX = startX;
              let lastTime = Date.now();
              
              if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
              }
              scrollVelocityRef.current = 0;
              
              const onTouchMove = (moveE: any) => {
                moveE.preventDefault();
                
                if (moveE.touches.length === 2) {
                  // Transition to pinch
                  isPinchingRef.current = true;
                  isDraggingRef.current = false;
                  
                  const t1 = moveE.touches[0];
                  const t2 = moveE.touches[1];
                  const dx = t2.clientX - t1.clientX;
                  const dy = t2.clientY - t1.clientY;
                  initialPinchDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
                  initialScaleRef.current = scale;
                  
                  lastPinchCenterRef.current = {
                    x: (t1.clientX + t2.clientX) / 2,
                    y: (t1.clientY + t2.clientY) / 2
                  };
                  return;
                }
                
                if (moveE.touches.length === 1 && isDraggingRef.current) {
                  const currentX = moveE.touches[0].clientX;
                  const currentTime = Date.now();
                  const diff = currentX - startX;
                  const timeDiff = currentTime - lastTime;
                  
                  if (timeDiff > 0) {
                    // Better velocity calculation with smoother tracking
                    const rawVelocity = (currentX - lastX) / timeDiff * VELOCITY_MULTIPLIER;
                    // Clamp velocity for controlled feel
                    scrollVelocityRef.current = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, rawVelocity));
                  }
                  
                  lastX = currentX;
                  lastTime = currentTime;
                  setScrollOffset(startOffset + diff * SCROLL_SENSITIVITY);
                }
              };
              
              const onTouchEnd = () => {
                isDraggingRef.current = false;
                isPinchingRef.current = false;
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
                
                // Physics-based momentum scrolling for touch with natural deceleration
                const applyMomentum = () => {
                  if (Math.abs(scrollVelocityRef.current) > MOMENTUM_MIN_VELOCITY) {
                    setScrollOffset(prev => {
                      const newOffset = prev + scrollVelocityRef.current;
                      // Smooth boundary with elastic feel
                      if (newOffset < 0) {
                        scrollVelocityRef.current *= 0.5; // Dampen at boundary
                        return 0;
                      }
                      return newOffset;
                    });
                    // Apply friction with slight easing curve
                    scrollVelocityRef.current *= MOMENTUM_FRICTION;
                    animationFrameRef.current = requestAnimationFrame(applyMomentum);
                  } else {
                    scrollVelocityRef.current = 0;
                  }
                };
                
                // Start momentum if velocity is significant
                if (Math.abs(scrollVelocityRef.current) > 0.3) {
                  animationFrameRef.current = requestAnimationFrame(applyMomentum);
                }
              };
              
              document.addEventListener('touchmove', onTouchMove, { passive: false });
              document.addEventListener('touchend', onTouchEnd);
            }
          }}
          onTouchMove={(e: any) => {
            // Handle pinch zoom movement
            if (isPinchingRef.current && e.touches.length === 2) {
              e.preventDefault();
              
              const touch1 = e.touches[0];
              const touch2 = e.touches[1];
              
              // Calculate current distance
              const dx = touch2.clientX - touch1.clientX;
              const dy = touch2.clientY - touch1.clientY;
              const currentDistance = Math.sqrt(dx * dx + dy * dy);
              
              // Calculate scale factor
              if (initialPinchDistanceRef.current > 0) {
                const scaleFactor = currentDistance / initialPinchDistanceRef.current;
                const newScale = initialScaleRef.current * scaleFactor;
                
                // Apply with constraints
                setTargetScale(Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale)));
              }
            }
          }}
          onTouchEnd={(e: any) => {
            if (e.touches.length < 2) {
              isPinchingRef.current = false;
            }
            if (e.touches.length === 0) {
              isDraggingRef.current = false;
              isPinchingRef.current = false;
            }
          }}
          onClick={(e: any) => {
            // Only trigger chart click if it was actually a click (not drag)
            // Check if mouse moved less than 5 pixels during the click
            const timeDiff = Date.now() - mouseDownTimeRef.current;
            const distMoved = Math.sqrt(
              Math.pow(e.clientX - mouseDownPosRef.current.x, 2) + 
              Math.pow(e.clientY - mouseDownPosRef.current.y, 2)
            );
            
            const isRealClick = !actuallyDraggedRef.current && distMoved < 5 && timeDiff < 500;
            console.log('Click check:', { isRealClick, distMoved, timeDiff, actuallyDragged: actuallyDraggedRef.current });
            
            if (isRealClick) {
              const rect = e.currentTarget.getBoundingClientRect();
              const y = e.clientY - rect.top;
              const x = e.clientX - rect.left;
              const height = rect.height;
              const width = rect.width;
              
              // Check if clicked near a horizontal line (within 15px tolerance)
              const padding = { top: 20, bottom: 45, right: 80 };
              const chartHeight = height - padding.top - padding.bottom;
              
              // Get current min/max price from the canvas data attribute or calculate
              const canvas = canvasRef.current;
              let minPrice = 0, maxPrice = 0;
              
              // Calculate from visible candles
              if (aggregatedCandles.length > 0) {
                const visibleCandles = aggregatedCandles.slice(0, Math.floor(50 / scale));
                minPrice = Math.min(...visibleCandles.map(c => c.low)) * 0.9999;
                maxPrice = Math.max(...visibleCandles.map(c => c.high)) * 1.0001;
              }
              
              // Check each horizontal line for click proximity
              let clickedLineId: string | null = null;
              const tolerance = 15; // pixels
              
              for (const line of horizontalLines) {
                if (!line.id) continue;
                const lineY = padding.top + ((maxPrice - line.price) / (maxPrice - minPrice)) * chartHeight;
                if (Math.abs(y - lineY) <= tolerance) {
                  clickedLineId = line.id;
                  break;
                }
              }
              
              // Check trend lines for click proximity (endpoints or line itself)
              let clickedTrendLineId: string | null = null;
              let clickedPoint: 'start' | 'end' | null = null;
              const candleWidth = 8 * scale;
              const candleGap = 4 * scale;
              const totalCandleWidth = candleWidth + candleGap;
              const chartRightEdge = width - padding.right;
              
              console.log('Checking trend lines:', trendLines.length, 'click at:', { x, y });
              
              for (const line of trendLines) {
                const startY = padding.top + ((maxPrice - line.startPrice) / (maxPrice - minPrice)) * chartHeight;
                const endY = padding.top + ((maxPrice - line.endPrice) / (maxPrice - minPrice)) * chartHeight;
                const startX = chartRightEdge - (line.startCandleIndex * totalCandleWidth) + (scrollOffset * scale);
                const endX = chartRightEdge - (line.endCandleIndex * totalCandleWidth) + (scrollOffset * scale);
                
                console.log('Line positions:', { startX, startY, endX, endY, lineId: line.id });
                
                // Check if clicked on start endpoint
                const distToStart = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
                console.log('Distance to start:', distToStart);
                if (distToStart <= 20) {
                  clickedTrendLineId = line.id;
                  clickedPoint = 'start';
                  break;
                }
                
                // Check if clicked on end endpoint
                const distToEnd = Math.sqrt(Math.pow(x - endX, 2) + Math.pow(y - endY, 2));
                console.log('Distance to end:', distToEnd);
                if (distToEnd <= 20) {
                  clickedTrendLineId = line.id;
                  clickedPoint = 'end';
                  break;
                }
                
                // Check if clicked on the line itself (using point-to-line distance)
                const lineLength = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
                if (lineLength > 0) {
                  const t = Math.max(0, Math.min(1, ((x - startX) * (endX - startX) + (y - startY) * (endY - startY)) / (lineLength * lineLength)));
                  const nearestX = startX + t * (endX - startX);
                  const nearestY = startY + t * (endY - startY);
                  const distToLine = Math.sqrt(Math.pow(x - nearestX, 2) + Math.pow(y - nearestY, 2));
                  console.log('Distance to line:', distToLine, 'nearest point:', { nearestX, nearestY });
                  
                  // Use larger tolerance (25px) for easier selection
                  if (distToLine <= 25) {
                    clickedTrendLineId = line.id;
                    clickedPoint = null; // Line body clicked, not endpoint
                    break;
                  }
                }
              }
              
              if (clickedTrendLineId) {
                // Trend line was clicked
                console.log('Trend line clicked:', clickedTrendLineId, 'point:', clickedPoint);
                if (onTrendLineSelect) {
                  if (selectedTrendLineId === clickedTrendLineId && !clickedPoint) {
                    // Clicking on already selected line body deselects it
                    onTrendLineSelect(null, null);
                  } else {
                    onTrendLineSelect(clickedTrendLineId, clickedPoint);
                  }
                }
              } else if (clickedLineId) {
                // Horizontal line was clicked - select/deselect it
                console.log('Line clicked:', clickedLineId);
                if (onLineSelect) {
                  onLineSelect(selectedLineId === clickedLineId ? null : clickedLineId);
                }
                // Deselect trend line
                if (onTrendLineSelect) {
                  onTrendLineSelect(null, null);
                }
              } else if (onChartClick) {
                // No line clicked - trigger chart click for drawing
                console.log('Chart div clicked:', { x, y, height, clientY: e.clientY, rectTop: rect.top });
                onChartClick(y, height, x);
                // Deselect all lines
                if (onTrendLineSelect) {
                  onTrendLineSelect(null, null);
                }
              }
            }
            
            // Reset drag state
            actuallyDraggedRef.current = false;
          }}
          onMouseDown={(e: any) => {
            // Track mouse down time and position for click detection
            mouseDownTimeRef.current = Date.now();
            mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
            actuallyDraggedRef.current = false;
            
            // Check if clicking on a selected line for dragging
            if (selectedLineId && horizontalLines.length > 0) {
              const rect = e.currentTarget.getBoundingClientRect();
              const y = e.clientY - rect.top;
              const padding = { top: 20, bottom: 45 };
              const chartHeight = rect.height - padding.top - padding.bottom;
              
              // Get price range
              let minPrice = 0, maxPrice = 0;
              if (aggregatedCandles.length > 0) {
                const visibleCandles = aggregatedCandles.slice(0, Math.floor(50 / scale));
                minPrice = Math.min(...visibleCandles.map(c => c.low)) * 0.9999;
                maxPrice = Math.max(...visibleCandles.map(c => c.high)) * 1.0001;
              }
              
              // Find the selected line
              const selectedLine = horizontalLines.find(l => l.id === selectedLineId);
              if (selectedLine) {
                const lineY = padding.top + ((maxPrice - selectedLine.price) / (maxPrice - minPrice)) * chartHeight;
                // If clicking near the selected line, start dragging
                if (Math.abs(y - lineY) <= 20) {
                  e.preventDefault();
                  isDraggingLineRef.current = true;
                  dragStartYRef.current = y;
                  return;
                }
              }
            }
            
            // Original mouse down logic for panning
            isDraggingRef.current = true;
            lastMouseXRef.current = e.clientX;
            lastMouseYRef.current = e.clientY;
            e.preventDefault();
          }}
          onMouseMove={(e: any) => {
            // Handle line dragging
            if (isDraggingLineRef.current && selectedLineId && onLineMove) {
              const rect = e.currentTarget.getBoundingClientRect();
              const y = e.clientY - rect.top;
              const padding = { top: 20, bottom: 45 };
              const chartHeight = rect.height - padding.top - padding.bottom;
              
              // Get price range
              let minPrice = 0, maxPrice = 0;
              if (aggregatedCandles.length > 0) {
                const visibleCandles = aggregatedCandles.slice(0, Math.floor(50 / scale));
                minPrice = Math.min(...visibleCandles.map(c => c.low)) * 0.9999;
                maxPrice = Math.max(...visibleCandles.map(c => c.high)) * 1.0001;
              }
              
              // Calculate new price from Y position
              const adjustedY = y - padding.top;
              const priceRatio = Math.max(0, Math.min(1, adjustedY / chartHeight));
              const newPrice = maxPrice - (priceRatio * (maxPrice - minPrice));
              
              if (!isNaN(newPrice) && newPrice > 0) {
                onLineMove(selectedLineId, newPrice);
              }
              return;
            }
            
            // Original mouse move logic for panning
            if (isDraggingRef.current && !isPinchingRef.current) {
              const deltaX = e.clientX - lastMouseXRef.current;
              // Mark as actually dragged if moved more than 3 pixels
              if (Math.abs(deltaX) > 3) {
                actuallyDraggedRef.current = true;
              }
              setScrollOffset(prev => prev - deltaX * SCROLL_SENSITIVITY / scale);
              lastMouseXRef.current = e.clientX;
              lastMouseYRef.current = e.clientY;
            }
            
            // Call onChartMove for trend line preview
            if (onChartMove && !isDraggingRef.current) {
              const rect = e.currentTarget.getBoundingClientRect();
              const y = e.clientY - rect.top;
              const x = e.clientX - rect.left;
              const height = rect.height;
              onChartMove(y, height, x);
            }
          }}
          onMouseUp={() => {
            isDraggingRef.current = false;
            isDraggingLineRef.current = false;
          }}
          onMouseLeave={() => {
            isDraggingRef.current = false;
            isDraggingLineRef.current = false;
          }}
        >
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Text style={styles.loadingText}>Loading Chart...</Text>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              style={{ 
                width: '100%', 
                height: '100%',
                imageRendering: 'crisp-edges'
              }}
            />
          )}
        </div>
        
        {/* Current Price Overlay */}
        {internalPrice > 0 && (
          <View style={styles.priceOverlay}>
            <Text style={styles.priceText}>${internalPrice.toFixed(5)}</Text>
          </View>
        )}
        
        {/* Zoom Controls */}
        <View style={styles.zoomControls}>
          <div 
            style={zoomButtonStyle}
            onClick={() => setTargetScale(prev => Math.min(MAX_SCALE, prev * 1.3))}
          >
            <Text style={styles.zoomButtonText}>+</Text>
          </div>
          <View style={styles.zoomLevelContainer}>
            <Text style={styles.zoomLevelText}>{Math.round(scale * 100)}%</Text>
          </View>
          <div 
            style={zoomButtonStyle}
            onClick={() => setTargetScale(prev => Math.max(MIN_SCALE, prev / 1.3))}
          >
            <Text style={styles.zoomButtonText}>−</Text>
          </div>
          <div 
            style={{...zoomButtonStyle, marginTop: 4}}
            onClick={() => setTargetScale(1)}
          >
            <Text style={styles.zoomButtonText}>⟲</Text>
          </div>
        </View>
      </View>
    );
  }

  // Native platform fallback
  return (
    <View style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00E55A" />
        <Text style={styles.loadingText}>Loading Chart...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    color: '#00E55A',
    fontSize: 14,
    marginTop: 12,
  },
  priceOverlay: {
    position: 'absolute',
    right: 8,
    top: 8,
    backgroundColor: 'rgba(0, 229, 90, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  zoomControls: {
    position: 'absolute',
    left: 6,
    top: 6,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  zoomButtonText: {
    color: '#00E55A',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  zoomLevelContainer: {
    paddingVertical: 1,
    paddingHorizontal: 2,
  },
  zoomLevelText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 7,
    fontWeight: '600',
  },
});
