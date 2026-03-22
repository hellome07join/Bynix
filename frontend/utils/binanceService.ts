// Binance WebSocket service for real-time candlestick data
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Map our assets to Binance symbols
const ASSET_TO_BINANCE: { [key: string]: string } = {
  'BTC/USD': 'BTCUSDT',
  'ETH/USD': 'ETHUSDT',
  'EUR/USD': 'EURUSDT',
  'GBP/USD': 'GBPUSDT',
  'AAPL': 'BTCUSDT', // Use BTC as fallback for stocks
};

export class BinanceWebSocket {
  private ws: WebSocket | null = null;
  private symbol: string = 'BTCUSDT';
  private interval: string = '1m';
  private onCandleUpdate: ((candle: Candle) => void) | null = null;

  constructor(asset: string = 'BTC/USD', interval: string = '1m') {
    this.symbol = ASSET_TO_BINANCE[asset] || 'BTCUSDT';
    this.interval = interval;
  }

  connect(onCandleUpdate: (candle: Candle) => void) {
    this.onCandleUpdate = onCandleUpdate;
    
    // Binance WebSocket URL for candlestick data
    const wsUrl = `wss://stream.binance.com:9443/ws/${this.symbol.toLowerCase()}@kline_${this.interval}`;
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('Binance WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.k) {
          const kline = data.k;
          const candle: Candle = {
            time: kline.t,
            open: parseFloat(kline.o),
            high: parseFloat(kline.h),
            low: parseFloat(kline.l),
            close: parseFloat(kline.c),
            volume: parseFloat(kline.v),
          };
          
          if (this.onCandleUpdate) {
            this.onCandleUpdate(candle);
          }
        }
      } catch (error) {
        console.error('Error parsing Binance data:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('Binance WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('Binance WebSocket disconnected');
      // Auto-reconnect after 3 seconds
      setTimeout(() => {
        if (this.onCandleUpdate) {
          this.connect(this.onCandleUpdate);
        }
      }, 3000);
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  changeSymbol(asset: string) {
    this.disconnect();
    this.symbol = ASSET_TO_BINANCE[asset] || 'BTCUSDT';
    if (this.onCandleUpdate) {
      this.connect(this.onCandleUpdate);
    }
  }
}

// Fetch historical candles from backend proxy (CORS-safe)
export async function fetchHistoricalCandles(
  asset: string,
  interval: string = '1m',
  limit: number = 50
): Promise<Candle[]> {
  try {
    const symbol = ASSET_TO_BINANCE[asset] || 'BTCUSDT';
    
    // Use backend proxy instead of direct Binance API
    const url = `${API_BASE_URL}/api/binance/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    return data.map((kline: any[]) => ({
      time: kline[0],
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
    }));
  } catch (error) {
    console.error('Error fetching historical candles:', error);
    // Return fallback mock data
    return generateFallbackCandles(asset);
  }
}

// Generate fallback mock candles when API fails
function generateFallbackCandles(asset: string): Candle[] {
  const basePrice = asset.includes('BTC') ? 50000 : asset.includes('ETH') ? 3000 : 1.1;
  const candles: Candle[] = [];
  let currentPrice = basePrice;
  const now = Date.now();

  for (let i = 0; i < 50; i++) {
    const timestamp = now - (50 - i) * 60000;
    const change = (Math.random() - 0.5) * (basePrice * 0.02);
    currentPrice += change;
    
    const open = currentPrice;
    const close = currentPrice + (Math.random() - 0.5) * (basePrice * 0.01);
    const high = Math.max(open, close) + Math.random() * (basePrice * 0.005);
    const low = Math.min(open, close) - Math.random() * (basePrice * 0.005);
    
    candles.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume: Math.random() * 1000,
    });
  }

  return candles;
}