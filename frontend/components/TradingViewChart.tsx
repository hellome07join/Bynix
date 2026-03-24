import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Text, Platform, ActivityIndicator } from 'react-native';
import Constants from 'expo-constants';

// Constants for chart interactions
const SCROLL_SENSITIVITY = 0.5;

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
  selectedLineId?: string | null;
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
  selectedLineId,
  authToken
}: TradingViewChartProps) {
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
  const [scale, setScale] = useState(1);
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
  
  // Line dragging refs
  const isDraggingLineRef = useRef(false);
  const dragStartYRef = useRef(0);
  const lastMouseXRef = useRef(0);
  const lastMouseYRef = useRef(0);
  const mouseDownTimeRef = useRef(0);
  const mouseDownPosRef = useRef({ x: 0, y: 0 });
  const actuallyDraggedRef = useRef(false);
  
  // Zoom constraints
  const MIN_SCALE = 0.3;
  const MAX_SCALE = 4;
  
  // Smooth animation for scale transitions
  useEffect(() => {
    let animFrame: number;
    let isAnimating = true;
    
    const animate = () => {
      if (!isAnimating) return;
      
      // Smooth scale transition with easing
      setScale(prev => {
        const diff = targetScale - prev;
        if (Math.abs(diff) < 0.001) return targetScale;
        return prev + diff * 0.2; // Smooth easing factor
      });
      
      animFrame = requestAnimationFrame(animate);
    };
    
    animFrame = requestAnimationFrame(animate);
    
    return () => {
      isAnimating = false;
      cancelAnimationFrame(animFrame);
    };
  }, [targetScale]);
  
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
    
    for (let i = 1800; i >= 0; i--) {
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
    
    const intervalSeconds = getIntervalSeconds(interval);
    const candles: CandleData[] = [];
    
    let currentCandle: CandleData | null = null;
    let candleStartTime = 0;
    
    for (const tick of baseTickData) {
      const tickCandleStart = Math.floor(tick.time / intervalSeconds) * intervalSeconds;
      
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
    
    return candles;
  }, [baseTickData, interval, getIntervalSeconds]);

  // Initialize data on mount or symbol change
  useEffect(() => {
    dataInitializedRef.current = false;
    initializeChartData();
  }, [symbol, initializeChartData]); // Only regenerate when symbol changes, NOT interval

  // Sync with server - fetch latest tick data every 2 seconds
  const syncWithServerRef = useRef<any>(null);
  useEffect(() => {
    const syncWithServer = async () => {
      try {
        const apiUrl = getApiUrl();
        const cleanSymbol = symbol.replace(' OTC', '').replace('/', '').toUpperCase();
        
        // Call server to add new tick and get updated data
        // Include auth token so server can bias price based on user's active trades
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
            // Replace/Add the tick from server - ensures all devices have identical data
            setBaseTickData(prevData => {
              if (prevData.length === 0) return prevData;
              
              const newData = [...prevData];
              const lastTick = prevData[prevData.length - 1];
              
              if (lastTick.time >= data.new_tick.time) {
                // Same second - replace last tick completely with server data
                newData[newData.length - 1] = data.new_tick;
              } else {
                // New second - add new tick from server
                newData.push(data.new_tick);
                if (newData.length > 35000) {
                  newData.shift();
                }
              }
              
              baseTickDataStore[symbol] = newData;
              return newData;
            });
            
            // Update displayed price from server
            setInternalPrice(data.new_tick.close);
          }
        }
      } catch (error) {
        // Silently fail - will retry on next interval
      }
    };

    // Sync with server immediately on mount
    syncWithServer();
    
    // Sync every 1 second for fast data refresh across all devices
    syncWithServerRef.current = setInterval(syncWithServer, 1000);
    
    return () => {
      if (syncWithServerRef.current) {
        clearInterval(syncWithServerRef.current);
      }
    };
  }, [symbol, authToken]);

  // Call onPriceUpdate when price changes
  useEffect(() => {
    if (onPriceUpdate) {
      onPriceUpdate(internalPrice);
    }
  }, [internalPrice, onPriceUpdate]);

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
      
      // Draw the trend line
      ctx.strokeStyle = line.color || '#00E55A';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      
      // Draw circles at endpoints (only if visible)
      ctx.fillStyle = line.color || '#00E55A';
      if (startX >= padding.left && startX <= width - padding.right) {
        ctx.beginPath();
        ctx.arc(startX, startY, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (endX >= padding.left && endX <= width - padding.right) {
        ctx.beginPath();
        ctx.arc(endX, endY, 4, 0, Math.PI * 2);
        ctx.fill();
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
    
  }, [aggregatedCandles, chartType, internalPrice, scrollOffset, scale, tradeMarkers, horizontalLines, trendLines, trendLinePreview]);

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
      width: 32,
      height: 32,
      borderRadius: 6,
      backgroundColor: 'rgba(0, 229, 90, 0.2)',
      border: '1px solid rgba(0, 229, 90, 0.4)',
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
                scrollVelocityRef.current = (currentX - lastX) / timeDiff * 16;
              }
              
              lastX = currentX;
              lastTime = currentTime;
              setScrollOffset(startOffset + diff);
            };
            
            const onMouseUp = () => {
              isDraggingRef.current = false;
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
              
              const applyMomentum = () => {
                if (Math.abs(scrollVelocityRef.current) > 0.5) {
                  setScrollOffset(prev => prev + scrollVelocityRef.current);
                  scrollVelocityRef.current *= 0.95;
                  animationFrameRef.current = requestAnimationFrame(applyMomentum);
                }
              };
              
              if (Math.abs(scrollVelocityRef.current) > 1) {
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
                    scrollVelocityRef.current = (currentX - lastX) / timeDiff * 16;
                  }
                  
                  lastX = currentX;
                  lastTime = currentTime;
                  setScrollOffset(startOffset + diff);
                }
              };
              
              const onTouchEnd = () => {
                isDraggingRef.current = false;
                isPinchingRef.current = false;
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
                
                const applyMomentum = () => {
                  if (Math.abs(scrollVelocityRef.current) > 0.5) {
                    setScrollOffset(prev => prev + scrollVelocityRef.current);
                    scrollVelocityRef.current *= 0.92;
                    animationFrameRef.current = requestAnimationFrame(applyMomentum);
                  }
                };
                
                if (Math.abs(scrollVelocityRef.current) > 1) {
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
              const height = rect.height;
              
              // Check if clicked near a horizontal line (within 15px tolerance)
              const padding = { top: 20, bottom: 45 };
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
              
              if (clickedLineId) {
                // Line was clicked - select/deselect it
                console.log('Line clicked:', clickedLineId);
                if (onLineSelect) {
                  onLineSelect(selectedLineId === clickedLineId ? null : clickedLineId);
                }
              } else if (onChartClick) {
                // No line clicked - trigger chart click for drawing
                const x = e.clientX - rect.left;
                console.log('Chart div clicked:', { x, y, height, clientY: e.clientY, rectTop: rect.top });
                onChartClick(y, height, x);
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
            style={{...zoomButtonStyle, marginTop: 8}}
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
    left: 8,
    top: 8,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  zoomButtonText: {
    color: '#00E55A',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  zoomLevelContainer: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  zoomLevelText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 9,
    fontWeight: '600',
  },
});
