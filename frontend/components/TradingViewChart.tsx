import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, Platform, ActivityIndicator } from 'react-native';

interface TradeMarker {
  entryPrice: number;
  type: 'call' | 'put';
}

interface TradingViewChartProps {
  symbol: string;
  interval: string;
  theme?: 'dark' | 'light';
  currentPrice?: number;
  tradeMarker?: TradeMarker | null;
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
  tradeMarker,
  onPriceUpdate
}: TradingViewChartProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [internalPrice, setInternalPrice] = useState(currentPrice || 1.0850);
  const [chartData, setChartData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const priceTickerRef = useRef<any>(null);
  
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
    return 1.0850;
  }, []);

  // Fetch historical candle data from Finage API
  const fetchHistoricalData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Calculate date range (last 7 days)
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 7);
      
      const formatDate = (date: Date) => date.toISOString().split('T')[0];
      
      // Map interval to Finage format
      const intervalMap: Record<string, { multiply: number; time: string }> = {
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
        // Transform to Lightweight Charts format
        const candles = data.results.map((item: any) => ({
          time: Math.floor(item.t / 1000), // Convert ms to seconds
          open: item.o,
          high: item.h,
          low: item.l,
          close: item.c,
        }));
        
        setChartData(candles);
        
        // Set initial price from last candle
        const lastCandle = candles[candles.length - 1];
        if (lastCandle) {
          setInternalPrice(lastCandle.close);
        }
        
        console.log(`Loaded ${candles.length} candles from Finage`);
      } else {
        // Fallback to generated data if API returns no results
        console.log('No data from API, using generated data');
        generateFallbackData();
      }
    } catch (err: any) {
      console.error('Finage API error:', err);
      setError(err.message);
      // Use fallback data on error
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
    const intervalMs = 60000; // 1 minute in ms
    
    let price = basePrice;
    
    for (let i = 500; i >= 0; i--) {
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
        
        // Update last candle
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

  // Determine bullish/bearish
  const isBullish = tradeMarker && internalPrice ? internalPrice > tradeMarker.entryPrice : null;
  
  // Calculate dot position
  const calculateDotPosition = useCallback(() => {
    if (!tradeMarker || !internalPrice) return 50;
    
    const priceDiff = internalPrice - tradeMarker.entryPrice;
    const percentChange = (priceDiff / tradeMarker.entryPrice) * 100;
    const basePosition = 50;
    const movement = percentChange * 200;
    const newPosition = basePosition - movement;
    
    return Math.max(15, Math.min(85, newPosition));
  }, [tradeMarker, internalPrice]);
  
  const dotPosition = calculateDotPosition();

  // Lightweight Charts HTML with Finage data
  const getHtmlContent = () => {
    const candleDataJson = JSON.stringify(chartData);
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script src="https://unpkg.com/lightweight-charts@4.1.0/dist/lightweight-charts.standalone.production.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background-color: #0A1A0F; }
    #chart { width: 100%; height: 100%; }
    .watermark { position: absolute; top: 10px; left: 10px; font-size: 11px; color: rgba(0, 229, 90, 0.6); font-weight: 600; z-index: 10; font-family: sans-serif; }
  </style>
</head>
<body>
  <div id="chart"></div>
  <div class="watermark">BYNIX • ${symbol}</div>
  <script>
    (function() {
      var chartContainer = document.getElementById('chart');
      var width = window.innerWidth || 400;
      var height = window.innerHeight || 400;
      
      var chart = LightweightCharts.createChart(chartContainer, {
        width: width,
        height: height,
        layout: { background: { type: 'solid', color: '#0A1A0F' }, textColor: '#888888' },
        grid: { vertLines: { color: 'rgba(255, 255, 255, 0.05)' }, horzLines: { color: 'rgba(255, 255, 255, 0.05)' } },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
        rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.1)', scaleMargins: { top: 0.1, bottom: 0.2 } },
        timeScale: { borderColor: 'rgba(255, 255, 255, 0.1)', timeVisible: true, secondsVisible: false },
        handleScroll: { vertTouchDrag: false }
      });

      var candlestickSeries = chart.addCandlestickSeries({
        upColor: '#00E55A',
        downColor: '#FF3B3B',
        borderDownColor: '#FF3B3B',
        borderUpColor: '#00E55A',
        wickDownColor: '#FF3B3B',
        wickUpColor: '#00E55A'
      });

      var data = ${candleDataJson};
      if (data && data.length > 0) {
        candlestickSeries.setData(data);
        chart.timeScale().fitContent();
        chart.timeScale().scrollToPosition(2, false);
      }

      window.addEventListener('resize', function() {
        chart.applyOptions({ width: window.innerWidth, height: window.innerHeight });
      });
    })();
  </script>
</body>
</html>`;
  };

  // Web platform rendering
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <div style={{ width: '100%', height: '100%', backgroundColor: '#0A1A0F', position: 'relative' }}>
          {chartData.length > 0 ? (
            <iframe
              srcDoc={getHtmlContent()}
              style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#0A1A0F' }}
              sandbox="allow-scripts allow-same-origin"
              onLoad={() => setIsLoading(false)}
            />
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#00E55A' }}>
              <Text style={styles.loadingText}>Loading Chart Data...</Text>
            </div>
          )}
          
          {isLoading && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A1A0F', zIndex: 10 }}>
              <Text style={styles.loadingText}>Loading Chart...</Text>
            </div>
          )}
          
          {/* Entry Position Marker */}
          {tradeMarker && (
            <div style={{
              position: 'absolute',
              right: 65,
              top: `${dotPosition}%`,
              transform: 'translateY(-50%)',
              transition: 'top 0.3s ease-out',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 100,
              pointerEvents: 'none',
            }}>
              <div style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                backgroundColor: tradeMarker.type === 'call' ? '#00E55A' : '#FF3B3B',
                border: '2px solid #FFFFFF',
                boxShadow: `0 0 10px ${tradeMarker.type === 'call' ? '#00E55A' : '#FF3B3B'}`,
              }} />
              <div style={{
                marginTop: 4,
                backgroundColor: tradeMarker.type === 'call' ? '#00E55A' : '#FF3B3B',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 700,
                color: '#FFFFFF',
                whiteSpace: 'nowrap',
              }}>
                {tradeMarker.type === 'call' ? '▲' : '▼'} ${tradeMarker.entryPrice.toFixed(5)}
              </div>
              {isBullish !== null && (
                <div style={{ marginTop: 2, fontSize: 9, fontWeight: 600, color: isBullish ? '#00E55A' : '#FF3B3B' }}>
                  {isBullish ? '📈 BULLISH' : '📉 BEARISH'}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Current Price Overlay */}
        {internalPrice > 0 && (
          <View style={styles.priceOverlay}>
            <Text style={styles.priceText}>${internalPrice.toFixed(5)}</Text>
          </View>
        )}
        
        {/* Live indicator */}
        <View style={styles.statusIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.statusText}>LIVE</Text>
        </View>
        
        {/* Error indicator */}
        {error && (
          <View style={styles.errorIndicator}>
            <Text style={styles.errorText}>Using offline data</Text>
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
  statusIndicator: {
    position: 'absolute',
    left: 8,
    top: 8,
    backgroundColor: 'rgba(0, 229, 90, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E55A',
  },
  statusText: {
    color: '#00E55A',
    fontSize: 10,
    fontWeight: '700',
  },
  errorIndicator: {
    position: 'absolute',
    left: 8,
    top: 32,
    backgroundColor: 'rgba(255, 184, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  errorText: {
    color: '#FFB800',
    fontSize: 9,
    fontWeight: '600',
  },
});
