import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

interface TradingViewChartProps {
  symbol: string;
  interval: string;
  theme?: 'dark' | 'light';
  currentPrice?: number;
}

export default function TradingViewChart({ 
  symbol = 'EURUSD', 
  interval = '1',
  theme = 'dark',
  currentPrice
}: TradingViewChartProps) {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Convert symbol format for TradingView (e.g., EUR/USD -> EURUSD)
  const tvSymbol = symbol.replace('/', '');
  
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

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        html, body {
          width: 100%;
          height: 100%;
          overflow: hidden;
          background-color: #0A0E27;
        }
        #tradingview_chart {
          width: 100%;
          height: 100%;
        }
        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
          color: #00D7A3;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div id="tradingview_chart">
        <div class="loading">Loading TradingView Chart...</div>
      </div>
      <script type="text/javascript" src="https://s3.tradingview.com/tv.js"></script>
      <script type="text/javascript">
        try {
          new TradingView.widget({
            "autosize": true,
            "symbol": "FX:${tvSymbol}",
            "interval": "${tvInterval}",
            "timezone": "Etc/UTC",
            "theme": "${theme}",
            "style": "1",
            "locale": "en",
            "enable_publishing": false,
            "hide_top_toolbar": true,
            "hide_legend": true,
            "save_image": false,
            "hide_volume": true,
            "backgroundColor": "#0A0E27",
            "gridColor": "rgba(255, 255, 255, 0.05)",
            "container_id": "tradingview_chart",
            "disabled_features": [
              "header_widget",
              "left_toolbar",
              "timeframes_toolbar",
              "edit_buttons_in_legend",
              "context_menus",
              "control_bar",
              "border_around_the_chart"
            ],
            "enabled_features": [
              "hide_last_na_study_output"
            ],
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
        } catch (e) {
          document.getElementById('tradingview_chart').innerHTML = '<div class="loading">Chart Error: ' + e.message + '</div>';
        }
      </script>
    </body>
    </html>
  `;

  // For web platform, use iframe
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <iframe
          src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=FX:${tvSymbol}&interval=${tvInterval}&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=0A0E27&studies=[]&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=0&showpopupbutton=0&studies_overrides={}&overrides={"paneProperties.background":"#0A0E27","paneProperties.vertGridProperties.color":"rgba(255,255,255,0.05)","paneProperties.horzGridProperties.color":"rgba(255,255,255,0.05)","mainSeriesProperties.candleStyle.upColor":"#00D7A3","mainSeriesProperties.candleStyle.downColor":"#FF3B3B"}&enabled_features=[]&disabled_features=["left_toolbar","header_widget","timeframes_toolbar","edit_buttons_in_legend","context_menus","control_bar","border_around_the_chart"]&locale=en`}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            backgroundColor: '#0A0E27',
          }}
          allowFullScreen
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

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
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
        onError={(syntheticEvent) => {
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
