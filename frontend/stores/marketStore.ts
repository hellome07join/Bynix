import { create } from 'zustand';

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  value?: number;
}

interface MarketState {
  currentPrice: number;
  candleData: CandleData[];
  selectedAsset: string;
  setCurrentPrice: (price: number) => void;
  setCandleData: (data: CandleData[]) => void;
  setSelectedAsset: (asset: string) => void;
  addCandle: (candle: CandleData) => void;
}

export const useMarketStore = create<MarketState>((set, get) => ({
  currentPrice: 50000,
  candleData: [],
  selectedAsset: 'BTC/USD',

  setCurrentPrice: (price) => set({ currentPrice: price }),
  setCandleData: (data) => set({ candleData: data }),
  setSelectedAsset: (asset) => set({ selectedAsset: asset }),
  
  addCandle: (candle) => {
    const { candleData } = get();
    const newData = [...candleData, candle];
    // Keep last 50 candles
    if (newData.length > 50) {
      newData.shift();
    }
    set({ candleData: newData });
  },
}));