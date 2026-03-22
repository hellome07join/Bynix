import React, { useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Platform } from 'react-native';

// Conditionally import WebView only for native platforms
let WebView: any = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

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
}

export default function TradingViewChart({ 
  symbol = 'EURUSD', 
  interval = '1',
  theme = 'dark',
  currentPrice,
  tradeMarker
}: TradingViewChartProps) {
  const webViewRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Convert symbol format for TradingView OTC (e.g., EUR/USD OTC -> EURUSD)
  const tvSymbol = symbol.replace(' OTC', '').replace('/', '');
  
  // Map interval to TradingView format
  const getIntervalForTV = (int: string) => {
    const map: Record<string, string> = {
      '1s': '1S',
      '5s': '5S',
      '15s': '15S',
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

  // TradingView widget HTML with 1000 candles range
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
            "border_around_the_chart",
            "header_symbol_search",
            "header_settings",
            "header_compare",
            "header_undo_redo",
            "header_screenshot",
            "header_fullscreen_button"
          ],
          "enabled_features": [],
          "overrides": {
            "paneProperties.background": "#0A0E27",
            "paneProperties.backgroundType": "solid",
            "paneProperties.vertGridProperties.color": "rgba(255, 255, 255, 0.05)",
            "paneProperties.horzGridProperties.color": "rgba(255, 255, 255, 0.05)",
            "scalesProperties.textColor": "#888888",
            "scalesProperties.backgroundColor": "#0A0E27",
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

  // Determine if market is bullish or bearish from entry
  const isBullish = tradeMarker && currentPrice ? currentPrice > tradeMarker.entryPrice : null;

  // For web platform, render iframe directly
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
            ref={iframeRef as any}
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
            }}>
              <Text style={styles.loadingText}>Loading Chart...</Text>
            </div>
          )}
          
          {/* Entry Position Marker - Dot on right side of chart */}
          {tradeMarker && (
            <div style={{
              position: 'absolute',
              right: 65,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 100,
              pointerEvents: 'none',
            }}>
              {/* Entry dot with pulse animation */}
              <div style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                backgroundColor: tradeMarker.type === 'call' ? '#00D7A3' : '#FF3B3B',
                border: '2px solid #FFFFFF',
                boxShadow: `0 0 10px ${tradeMarker.type === 'call' ? '#00D7A3' : '#FF3B3B'}`,
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
              {/* Entry price label */}
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
              {/* Bullish/Bearish indicator */}
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
        {currentPrice && (
          <View style={styles.priceOverlay}>
            <Text style={styles.priceText}>${currentPrice.toFixed(5)}</Text>
          </View>
        )}
        {/* Add CSS animation for pulse */}
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

  // For native platforms, use WebView
  if (!WebView) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Chart...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: getHtmlContent() }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        mixedContentMode="always"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        onLoadEnd={() => setIsLoading(false)}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00D7A3" />
            <Text style={styles.loadingText}>Loading TradingView...</Text>
          </View>
        )}
        onError={(syntheticEvent: any) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error:', nativeEvent);
        }}
      />
      {/* Current Price Overlay */}
      {currentPrice && (
        <View style={styles.priceOverlay}>
          <Text style={styles.priceText}>${currentPrice.toFixed(5)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
});
