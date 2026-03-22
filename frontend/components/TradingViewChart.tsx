import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, Platform, ActivityIndicator, PanResponder, Dimensions } from 'react-native';

interface TradeMarker {
  id: string;
  entryPrice: number;
  type: 'call' | 'put';
  amount?: number;
  remainingTime?: number;
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
  const [chartData, setChartData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [scale, setScale] = useState(1);
  const priceTickerRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Convert symbol for API (e.g., "EUR/USD OTC" -> "EURUSD")
  const apiSymbol = symbol.replace(' OTC', '').replace('/', '');
  
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

  // Fetch historical candle data from Finage API
  const fetchHistoricalData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 7);
      
      const formatDate = (date: Date) => date.toISOString().split('T')[0];
      
      const intervalMap: Record<string, { multiply: number; time: string }> = {
        '1s': { multiply: 1, time: 'minute' },
        '5s': { multiply: 1, time: 'minute' },
        '15s': { multiply: 1, time: 'minute' },
        '1m': { multiply: 1, time: 'minute' },
        '5m': { multiply: 5, time: 'minute' },
        '15m': { multiply: 15, time: 'minute' },
        '1h': { multiply: 1, time: 'hour' },
        '4h': { multiply: 4, time: 'hour' },
        '1d': { multiply: 1, time: 'day' },
      };
      
      const { multiply, time } = intervalMap[interval] || { multiply: 1, time: 'minute' };
      
      const url = `${FINAGE_API_URL}/agg/forex/${apiSymbol}/${multiply}/${time}/${formatDate(fromDate)}/${formatDate(toDate)}?apikey=${FINAGE_API_KEY}&limit=500&sort=asc`;
      
      console.log('Fetching Finage data:', url.replace(FINAGE_API_KEY, 'API_KEY***'));
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const candles = data.results.map((item: any) => ({
          time: Math.floor(item.t / 1000),
          open: item.o,
          high: item.h,
          low: item.l,
          close: item.c,
        }));
        
        setChartData(candles);
        
        const lastCandle = candles[candles.length - 1];
        if (lastCandle) {
          setInternalPrice(lastCandle.close);
        }
        
        console.log(`Loaded ${candles.length} candles from Finage`);
      } else {
        console.log('No data from API, using generated data');
        generateFallbackData();
      }
    } catch (err: any) {
      console.error('Finage API error:', err);
      setError(err.message);
      generateFallbackData();
    } finally {
      setIsLoading(false);
    }
  }, [apiSymbol, interval]);

  // Generate fallback candle data
  const generateFallbackData = useCallback(() => {
    const basePrice = getBasePrice(symbol);
    const candles = [];
    const now = Date.now();
    const intervalMs = 60000;
    
    let price = basePrice;
    
    for (let i = 200; i >= 0; i--) {
      const volatility = price * 0.001;
      const open = price;
      const change1 = (Math.random() - 0.5) * volatility * 2;
      const change2 = (Math.random() - 0.5) * volatility * 2;
      const change3 = (Math.random() - 0.5) * volatility * 2;
      
      const close = open + change1;
      const high = Math.max(open, close) + Math.abs(change2);
      const low = Math.min(open, close) - Math.abs(change3);
      
      candles.push({
        time: Math.floor((now - i * intervalMs) / 1000),
        open,
        high,
        low,
        close,
      });
      
      price = close;
    }
    
    setChartData(candles);
    setInternalPrice(price);
  }, [symbol, getBasePrice]);

  // Fetch data on mount and when symbol/interval changes
  useEffect(() => {
    fetchHistoricalData();
  }, [fetchHistoricalData]);

  // Real-time price updates with simulated tick
  useEffect(() => {
    priceTickerRef.current = setInterval(() => {
      setInternalPrice(prev => {
        const volatility = prev * 0.0002;
        const change = (Math.random() - 0.5) * volatility * 2;
        const newPrice = prev + change;
        
        setChartData(prevData => {
          if (prevData.length === 0) return prevData;
          const newData = [...prevData];
          const lastCandle = { ...newData[newData.length - 1] };
          lastCandle.close = newPrice;
          lastCandle.high = Math.max(lastCandle.high, newPrice);
          lastCandle.low = Math.min(lastCandle.low, newPrice);
          newData[newData.length - 1] = lastCandle;
          return newData;
        });
        
        return newPrice;
      });
    }, 500);
    
    return () => {
      if (priceTickerRef.current) {
        clearInterval(priceTickerRef.current);
      }
    };
  }, []);

  // Call onPriceUpdate when price changes
  useEffect(() => {
    if (onPriceUpdate) {
      onPriceUpdate(internalPrice);
    }
  }, [internalPrice]);

  // Calculate marker position
  const calculateMarkerPosition = useCallback((marker: TradeMarker, chartHeight: number, minPrice: number, maxPrice: number) => {
    const priceRange = maxPrice - minPrice;
    if (priceRange === 0) return chartHeight / 2;
    const position = chartHeight - ((marker.entryPrice - minPrice) / priceRange) * chartHeight;
    return Math.max(20, Math.min(chartHeight - 20, position));
  }, []);

  // Draw chart on canvas (Web only)
  const drawChart = useCallback(() => {
    if (Platform.OS !== 'web' || !canvasRef.current || chartData.length === 0) return;
    
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
    
    // Calculate visible candles based on scroll and scale
    const baseBarWidth = 10 * scale;
    const barSpacing = 2 * scale;
    const totalBarWidth = baseBarWidth + barSpacing;
    const visibleCandles = Math.floor(chartWidth / totalBarWidth);
    const startIndex = Math.max(0, chartData.length - visibleCandles + Math.floor(scrollOffset / totalBarWidth));
    const endIndex = Math.min(chartData.length, startIndex + visibleCandles + 2);
    const visibleData = chartData.slice(startIndex, endIndex);
    
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
      const x = padding.left + i * totalBarWidth + scrollOffset % totalBarWidth + 15;
      const isGreen = candle.close >= candle.open;
      const color = isGreen ? '#00E55A' : '#FF3B3B';
      
      const yOpen = padding.top + ((maxPrice - candle.open) / (maxPrice - minPrice)) * chartHeight;
      const yClose = padding.top + ((maxPrice - candle.close) / (maxPrice - minPrice)) * chartHeight;
      const yHigh = padding.top + ((maxPrice - candle.high) / (maxPrice - minPrice)) * chartHeight;
      const yLow = padding.top + ((maxPrice - candle.low) / (maxPrice - minPrice)) * chartHeight;
      
      // Draw wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + baseBarWidth / 2, yHigh);
      ctx.lineTo(x + baseBarWidth / 2, yLow);
      ctx.stroke();
      
      // Draw body
      ctx.fillStyle = color;
      const bodyTop = Math.min(yOpen, yClose);
      const bodyHeight = Math.max(1, Math.abs(yClose - yOpen));
      
      if (chartType === 'line') {
        // Line chart
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
        // Bar chart (OHLC)
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
        // Candle chart
        ctx.fillRect(x, bodyTop, baseBarWidth, bodyHeight);
      }
    });
    
    // Draw price scale on right
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
    
  }, [chartData, chartType, internalPrice, scrollOffset, scale, tradeMarkers]);

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
              // Zoom
              const delta = e.deltaY > 0 ? 0.9 : 1.1;
              setScale(prev => Math.max(0.5, Math.min(3, prev * delta)));
            } else {
              // Scroll
              setScrollOffset(prev => prev - e.deltaX - e.deltaY);
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
