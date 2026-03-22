import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Text, Platform, ActivityIndicator } from 'react-native';

interface TradeMarker {
  id: string;
  entryPrice: number;
  type: 'call' | 'put';
  amount?: number;
  remainingTime?: number;
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
  onPriceUpdate?: (price: number) => void;
}

// Finage API Configuration
const FINAGE_API_KEY = 'API_KEY2fMV88KTKK8ELBC7H6LDHDNCAQPKEJXM';
const FINAGE_API_URL = 'https://api.finage.co.uk';

// Store base tick data globally to persist across re-renders
const baseTickDataStore: { [symbol: string]: CandleData[] } = {};

// LocalStorage key prefix
const STORAGE_KEY_PREFIX = 'bynix_chart_data_';

// Helper to save data to localStorage
const saveToLocalStorage = (symbol: string, data: CandleData[]) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      // Only save last 1800 ticks to keep storage size manageable
      const dataToSave = data.slice(-1800);
      localStorage.setItem(STORAGE_KEY_PREFIX + symbol.replace(/[^a-zA-Z0-9]/g, '_'), JSON.stringify(dataToSave));
    } catch (e) {
      console.warn('Failed to save chart data to localStorage:', e);
    }
  }
};

// Helper to load data from localStorage
const loadFromLocalStorage = (symbol: string): CandleData[] | null => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFIX + symbol.replace(/[^a-zA-Z0-9]/g, '_'));
      if (stored) {
        const data = JSON.parse(stored);
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch (e) {
      console.warn('Failed to load chart data from localStorage:', e);
    }
  }
  return null;
};

export default function TradingViewChart({ 
  symbol = 'EUR/USD OTC', 
  interval = '1m',
  theme = 'dark',
  currentPrice,
  chartType = 'candle',
  tradeMarkers = [],
  onPriceUpdate
}: TradingViewChartProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [internalPrice, setInternalPrice] = useState(currentPrice || 1.0850);
  const [baseTickData, setBaseTickData] = useState<CandleData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [scale, setScale] = useState(1);
  const priceTickerRef = useRef<any>(null);
  const candleIntervalRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastCandleTimeRef = useRef<number>(Date.now());
  const dataInitializedRef = useRef(false);
  
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

  // Generate initial tick data (1-second base data)
  const generateInitialData = useCallback(() => {
    // Check if we already have data in memory for this symbol
    if (baseTickDataStore[symbol] && baseTickDataStore[symbol].length > 0) {
      console.log(`Using memory cached data for ${symbol}`);
      setBaseTickData(baseTickDataStore[symbol]);
      const lastTick = baseTickDataStore[symbol][baseTickDataStore[symbol].length - 1];
      setInternalPrice(lastTick.close);
      setIsLoading(false);
      return;
    }

    // Check localStorage for persisted data
    const storedData = loadFromLocalStorage(symbol);
    if (storedData && storedData.length > 0) {
      console.log(`Loaded ${storedData.length} ticks from localStorage for ${symbol}`);
      
      // Update timestamps to be current (shift all times to now)
      const now = Math.floor(Date.now() / 1000);
      const lastStoredTime = storedData[storedData.length - 1].time;
      const timeDiff = now - lastStoredTime;
      
      const updatedData = storedData.map(tick => ({
        ...tick,
        time: tick.time + timeDiff
      }));
      
      baseTickDataStore[symbol] = updatedData;
      setBaseTickData(updatedData);
      const lastTick = updatedData[updatedData.length - 1];
      setInternalPrice(lastTick.close);
      setIsLoading(false);
      return;
    }

    // Generate new data if nothing exists
    const basePrice = getBasePrice(symbol);
    const ticks: CandleData[] = [];
    const now = Date.now();
    const tickIntervalMs = 1000; // 1 second base ticks
    
    let price = basePrice;
    
    // Generate 3600 ticks (1 hour of 1-second data)
    for (let i = 3600; i >= 0; i--) {
      const volatility = price * 0.00005; // Small volatility for 1-second ticks
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
    
    // Store in global cache and localStorage
    baseTickDataStore[symbol] = ticks;
    saveToLocalStorage(symbol, ticks);
    setBaseTickData(ticks);
    setInternalPrice(price);
    setIsLoading(false);
    console.log(`Generated ${ticks.length} base ticks for ${symbol}`);
  }, [symbol, getBasePrice]);

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
    generateInitialData();
  }, [symbol]); // Only regenerate when symbol changes, NOT interval

  // Real-time price updates - add new tick every second
  const saveCounterRef = useRef(0);
  useEffect(() => {
    priceTickerRef.current = setInterval(() => {
      setInternalPrice(prev => {
        const volatility = prev * 0.00008;
        const change = (Math.random() - 0.5) * volatility * 2;
        const newPrice = prev + change;
        return newPrice;
      });
      
      // Add new tick to base data
      setBaseTickData(prevData => {
        if (prevData.length === 0) return prevData;
        
        const now = Math.floor(Date.now() / 1000);
        const lastTick = prevData[prevData.length - 1];
        
        // Create new 1-second tick
        const newTick: CandleData = {
          time: now,
          open: lastTick.close,
          high: lastTick.close,
          low: lastTick.close,
          close: lastTick.close,
        };
        
        // Update the new tick with price movement
        setInternalPrice(currentPrice => {
          newTick.close = currentPrice;
          newTick.high = Math.max(newTick.open, currentPrice);
          newTick.low = Math.min(newTick.open, currentPrice);
          return currentPrice;
        });
        
        const newData = [...prevData, newTick];
        
        // Keep max 7200 ticks (2 hours of 1-second data)
        if (newData.length > 7200) {
          newData.shift();
        }
        
        // Update global cache
        baseTickDataStore[symbol] = newData;
        
        // Save to localStorage every 10 seconds
        saveCounterRef.current++;
        if (saveCounterRef.current >= 10) {
          saveCounterRef.current = 0;
          saveToLocalStorage(symbol, newData);
        }
        
        return newData;
      });
    }, 1000);
    
    return () => {
      if (priceTickerRef.current) {
        clearInterval(priceTickerRef.current);
      }
      // Save on unmount
      if (baseTickDataStore[symbol]) {
        saveToLocalStorage(symbol, baseTickDataStore[symbol]);
      }
    };
  }, [symbol]);

  // Update last tick with current price changes (faster updates for visual smoothness)
  useEffect(() => {
    const updateInterval = setInterval(() => {
      setBaseTickData(prevData => {
        if (prevData.length === 0) return prevData;
        
        const newData = [...prevData];
        const lastTick = { ...newData[newData.length - 1] };
        
        // Apply small price change
        const volatility = lastTick.close * 0.00003;
        const change = (Math.random() - 0.5) * volatility * 2;
        lastTick.close = lastTick.close + change;
        lastTick.high = Math.max(lastTick.high, lastTick.close);
        lastTick.low = Math.min(lastTick.low, lastTick.close);
        
        newData[newData.length - 1] = lastTick;
        
        // Update internal price
        setInternalPrice(lastTick.close);
        
        // Update global cache
        baseTickDataStore[symbol] = newData;
        
        return newData;
      });
    }, 200); // Update every 200ms for smooth animation
    
    return () => clearInterval(updateInterval);
  }, [symbol]);

  // Call onPriceUpdate when price changes
  useEffect(() => {
    if (onPriceUpdate) {
      onPriceUpdate(internalPrice);
    }
  }, [internalPrice, onPriceUpdate]);

  // Draw chart on canvas
  const drawChart = useCallback(() => {
    if (Platform.OS !== 'web' || !canvasRef.current || aggregatedCandles.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 20, right: 60, bottom: 30, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Clear canvas
    ctx.fillStyle = '#0A1A0F';
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
    
  }, [aggregatedCandles, chartType, internalPrice, scrollOffset, scale, tradeMarkers]);

  // Redraw chart when data changes
  useEffect(() => {
    drawChart();
  }, [drawChart]);

  // Web platform rendering with Canvas
  if (Platform.OS === 'web') {
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 390;
    const chartHeight = 400;
    
    return (
      <View style={styles.container}>
        <div 
          style={{ 
            width: '100%', 
            height: '100%', 
            backgroundColor: '#0A1A0F', 
            position: 'relative',
            touchAction: 'pan-x',
            cursor: 'grab'
          }}
          onWheel={(e: any) => {
            if (e.ctrlKey || e.metaKey) {
              const delta = e.deltaY > 0 ? 0.9 : 1.1;
              setScale(prev => Math.max(0.5, Math.min(3, prev * delta)));
            } else {
              setScrollOffset(prev => prev + e.deltaY * 0.5);
            }
          }}
          onMouseDown={(e: any) => {
            const startX = e.clientX;
            const startOffset = scrollOffset;
            
            const onMouseMove = (moveE: any) => {
              const diff = moveE.clientX - startX;
              setScrollOffset(startOffset + diff);
            };
            
            const onMouseUp = () => {
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          }}
          onTouchStart={(e: any) => {
            if (e.touches.length === 1) {
              const startX = e.touches[0].clientX;
              const startOffset = scrollOffset;
              
              const onTouchMove = (moveE: any) => {
                if (moveE.touches.length === 1) {
                  const diff = moveE.touches[0].clientX - startX;
                  setScrollOffset(startOffset + diff);
                }
              };
              
              const onTouchEnd = () => {
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
              };
              
              document.addEventListener('touchmove', onTouchMove, { passive: true });
              document.addEventListener('touchend', onTouchEnd);
            }
          }}
        >
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Text style={styles.loadingText}>Loading Chart...</Text>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              width={screenWidth}
              height={chartHeight}
              style={{ width: '100%', height: '100%' }}
            />
          )}
        </div>
        
        {/* Current Price Overlay */}
        {internalPrice > 0 && (
          <View style={styles.priceOverlay}>
            <Text style={styles.priceText}>${internalPrice.toFixed(5)}</Text>
          </View>
        )}
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
    backgroundColor: '#0A1A0F',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A1A0F',
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
});
