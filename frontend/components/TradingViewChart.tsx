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
  const priceTickerRef = useRef<any>(null);
  
  // Convert symbol for TradingView
  const tvSymbol = symbol.replace(' OTC', '').replace('/', '');
  
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

  // Start price ticker on mount
  useEffect(() => {
    const basePrice = getBasePrice(symbol);
    setInternalPrice(basePrice);
    
    // Fake price ticker - updates every 500ms
    priceTickerRef.current = setInterval(() => {
      setInternalPrice(prev => {
        const volatility = prev * 0.0002; // 0.02% per tick
        const change = (Math.random() - 0.5) * volatility * 2;
        const newPrice = prev + change;
        return newPrice;
      });
    }, 500);
    
    return () => {
      if (priceTickerRef.current) {
        clearInterval(priceTickerRef.current);
      }
    };
  }, [symbol, getBasePrice]);

  // Call onPriceUpdate when price changes (separate effect to avoid render issues)
  useEffect(() => {
    if (onPriceUpdate) {
      onPriceUpdate(internalPrice);
    }
  }, [internalPrice]);

  // Map interval to TradingView format
  const getIntervalForTV = (int: string) => {
    const map: Record<string, string> = {
      '1m': '1',
      '5m': '5',
      '15m': '15',
      '1h': '60',
      '4h': '240',
      '1d': 'D',
    };
    return map[int] || '1';
  };

  const tvInterval = getIntervalForTV(interval);

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

  // TradingView widget HTML
  const getHtmlContent = () => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; background-color: #0A0E27; }
        .tradingview-widget-container { width: 100%; height: 100%; }
        #tradingview_chart { width: 100%; height: 100%; }
      </style>
    </head>
    <body>
      <div class="tradingview-widget-container">
        <div id="tradingview_chart"></div>
      </div>
      <script type="text/javascript" src="https://s3.tradingview.com/tv.js"></script>
      <script type="text/javascript">
        new TradingView.widget({
          "autosize": true,
          "symbol": "FX:${tvSymbol}",
          "interval": "${tvInterval}",
          "timezone": "Etc/UTC",
          "theme": "dark",
          "style": "1",
          "locale": "en",
          "toolbar_bg": "#0A0E27",
          "enable_publishing": false,
          "hide_top_toolbar": true,
          "hide_legend": false,
          "save_image": false,
          "hide_volume": true,
          "container_id": "tradingview_chart",
          "range": "12M",
          "allow_symbol_change": false,
          "disabled_features": [
            "header_widget",
            "left_toolbar",
            "timeframes_toolbar",
            "edit_buttons_in_legend",
            "context_menus",
            "control_bar",
            "border_around_the_chart"
          ],
          "enabled_features": [],
          "overrides": {
            "paneProperties.background": "#0A0E27",
            "paneProperties.backgroundType": "solid",
            "paneProperties.vertGridProperties.color": "rgba(255, 255, 255, 0.05)",
            "paneProperties.horzGridProperties.color": "rgba(255, 255, 255, 0.05)",
            "scalesProperties.textColor": "#888888",
            "mainSeriesProperties.candleStyle.upColor": "#00D7A3",
            "mainSeriesProperties.candleStyle.downColor": "#FF3B3B",
            "mainSeriesProperties.candleStyle.wickUpColor": "#00D7A3",
            "mainSeriesProperties.candleStyle.wickDownColor": "#FF3B3B",
            "mainSeriesProperties.candleStyle.borderUpColor": "#00D7A3",
            "mainSeriesProperties.candleStyle.borderDownColor": "#FF3B3B"
          }
        });
      </script>
    </body>
    </html>
  `;

  // Web platform rendering
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <div 
          style={{ 
            width: '100%', 
            height: '100%', 
            backgroundColor: '#0A0E27',
            position: 'relative'
          }}
        >
          <iframe
            srcDoc={getHtmlContent()}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: '#0A0E27',
            }}
            sandbox="allow-scripts allow-same-origin"
            onLoad={() => setIsLoading(false)}
          />
          
          {isLoading && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#0A0E27',
              zIndex: 10,
            }}>
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
                backgroundColor: tradeMarker.type === 'call' ? '#00D7A3' : '#FF3B3B',
                border: '2px solid #FFFFFF',
                boxShadow: `0 0 10px ${tradeMarker.type === 'call' ? '#00D7A3' : '#FF3B3B'}`,
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
              <div style={{
                marginTop: 4,
                backgroundColor: tradeMarker.type === 'call' ? '#00D7A3' : '#FF3B3B',
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
                <div style={{
                  marginTop: 2,
                  fontSize: 9,
                  fontWeight: 600,
                  color: isBullish ? '#00D7A3' : '#FF3B3B',
                }}>
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
          <Text style={styles.statusText}>● LIVE</Text>
        </View>
        
        <style>{`
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.8; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </View>
    );
  }

  // Native platform fallback
  return (
    <View style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00D7A3" />
        <Text style={styles.loadingText}>Loading Chart...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0E27',
  },
  loadingText: {
    color: '#00D7A3',
    fontSize: 14,
    marginTop: 12,
  },
  priceOverlay: {
    position: 'absolute',
    right: 8,
    top: 8,
    backgroundColor: 'rgba(0, 215, 163, 0.9)',
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
    backgroundColor: 'rgba(0, 215, 163, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    color: '#00D7A3',
    fontSize: 10,
    fontWeight: '600',
  },
});
