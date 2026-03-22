import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Platform } from 'react-native';

// Conditionally import WebView only for native platforms
let WebView: any = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

interface TradeEntry {
  price: number;
  type: 'call' | 'put';
  time: number;
}

interface TradingViewChartProps {
  symbol: string;
  interval: string;
  theme?: 'dark' | 'light';
  currentPrice?: number;
  tradeEntry?: TradeEntry | null;
}

export default function TradingViewChart({ 
  symbol = 'EURUSD', 
  interval = '1',
  theme = 'dark',
  currentPrice,
  tradeEntry
}: TradingViewChartProps) {
  const webViewRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [chartHeight, setChartHeight] = useState(0);

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

  // Calculate entry line position (as percentage from top)
  const getEntryLinePosition = () => {
    if (!tradeEntry || !currentPrice) return null;
    
    // Approximate calculation - we'll show the line at a relative position
    // This is a simplified approach since we can't access TradingView's internal scale
    const priceDiff = ((currentPrice - tradeEntry.price) / tradeEntry.price) * 100;
    // Map the price difference to a visual position (center = 50%)
    const position = 50 - (priceDiff * 500); // Amplify for visibility
    return Math.max(10, Math.min(90, position)); // Clamp between 10-90%
  };

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

  const entryLinePosition = getEntryLinePosition();

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
          
          {/* Trade Entry Horizontal Line - Web */}
          {tradeEntry && (
            <div style={{
              position: 'absolute',
              left: 0,
              right: 60,
              top: `${entryLinePosition}%`,
              height: 2,
              backgroundColor: tradeEntry.type === 'call' ? '#00D7A3' : '#FF3B3B',
              zIndex: 100,
              pointerEvents: 'none',
            }}>
              <div style={{
                position: 'absolute',
                right: 0,
                top: -10,
                backgroundColor: tradeEntry.type === 'call' ? '#00D7A3' : '#FF3B3B',
                padding: '2px 8px',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <span style={{ color: '#FFFFFF', fontSize: 11, fontWeight: 700 }}>
                  {tradeEntry.type === 'call' ? '▲' : '▼'} Entry ${tradeEntry.price.toFixed(5)}
                </span>
              </div>
            </div>
          )}
        </div>
        {/* Current Price Overlay */}
        {currentPrice && (
          <View style={styles.priceOverlay}>
            <Text style={styles.priceText}>${currentPrice.toFixed(5)}</Text>
          </View>
        )}
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
      
      {/* Trade Entry Horizontal Line - Native */}
      {tradeEntry && entryLinePosition && (
        <View style={[
          styles.entryLine,
          { 
            top: `${entryLinePosition}%`,
            backgroundColor: tradeEntry.type === 'call' ? '#00D7A3' : '#FF3B3B',
          }
        ]}>
          <View style={[
            styles.entryLabel,
            { backgroundColor: tradeEntry.type === 'call' ? '#00D7A3' : '#FF3B3B' }
          ]}>
            <Text style={styles.entryLabelText}>
              {tradeEntry.type === 'call' ? '▲' : '▼'} Entry ${tradeEntry.price.toFixed(5)}
            </Text>
          </View>
        </View>
      )}
      
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
  entryLine: {
    position: 'absolute',
    left: 0,
    right: 60,
    height: 2,
    zIndex: 100,
  },
  entryLabel: {
    position: 'absolute',
    right: 0,
    top: -10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  entryLabelText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
