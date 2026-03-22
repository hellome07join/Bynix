import { CandleData } from '../stores/marketStore';

// Generate mock candlestick data
export function generateMockCandles(count: number = 30, basePrice: number = 50000): CandleData[] {
  const candles: CandleData[] = [];
  let currentPrice = basePrice;
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const timestamp = now - (count - i) * 60000; // 1 minute intervals
    
    // Random price movement
    const change = (Math.random() - 0.5) * (basePrice * 0.02); // ±2% movement
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
      value: close, // For chart rendering
    });
  }

  return candles;
}

// Generate new candle based on previous
export function generateNextCandle(prevCandle: CandleData): CandleData {
  const basePrice = prevCandle.close;
  const change = (Math.random() - 0.5) * (basePrice * 0.01);
  
  const open = prevCandle.close;
  const close = open + change;
  const high = Math.max(open, close) + Math.random() * (basePrice * 0.003);
  const low = Math.min(open, close) - Math.random() * (basePrice * 0.003);
  
  return {
    timestamp: Date.now(),
    open,
    high,
    low,
    close,
    value: close,
  };
}