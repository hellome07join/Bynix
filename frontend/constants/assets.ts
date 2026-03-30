// Market Categories and Assets Configuration

export type MarketCategory = 'forex' | 'crypto' | 'stocks' | 'commodities';

export interface Asset {
  label: string;
  value: string;
  icon: string;
  payout: number;
  category: MarketCategory;
  apiSymbol: string;
}

export const MARKET_CATEGORIES = [
  { id: 'forex', label: 'Forex', icon: '💱' },
  { id: 'crypto', label: 'Crypto', icon: '₿' },
  { id: 'stocks', label: 'Stocks', icon: '📈' },
  { id: 'commodities', label: 'Commodities', icon: '🥇' },
];

// Demo Account Assets (Fewer, higher win rate - 90%)
export const DEMO_ASSETS: Asset[] = [
  // FOREX (5 pairs for demo)
  { label: 'EUR/USD OTC', value: 'EUR/USD OTC', icon: '🇪🇺🇺🇸', payout: 92, category: 'forex', apiSymbol: 'EURUSD' },
  { label: 'GBP/USD OTC', value: 'GBP/USD OTC', icon: '🇬🇧🇺🇸', payout: 90, category: 'forex', apiSymbol: 'GBPUSD' },
  { label: 'USD/JPY OTC', value: 'USD/JPY OTC', icon: '🇺🇸🇯🇵', payout: 88, category: 'forex', apiSymbol: 'USDJPY' },
  { label: 'AUD/USD OTC', value: 'AUD/USD OTC', icon: '🇦🇺🇺🇸', payout: 87, category: 'forex', apiSymbol: 'AUDUSD' },
  { label: 'EUR/GBP OTC', value: 'EUR/GBP OTC', icon: '🇪🇺🇬🇧', payout: 85, category: 'forex', apiSymbol: 'EURGBP' },
  
  // CRYPTO (5 coins for demo)
  { label: 'BTC/USD OTC', value: 'BTC/USD OTC', icon: '🪙', payout: 95, category: 'crypto', apiSymbol: 'BTCUSD' },
  { label: 'ETH/USD OTC', value: 'ETH/USD OTC', icon: '💎', payout: 93, category: 'crypto', apiSymbol: 'ETHUSD' },
  { label: 'BNB/USD OTC', value: 'BNB/USD OTC', icon: '🟡', payout: 91, category: 'crypto', apiSymbol: 'BNBUSD' },
  { label: 'XRP/USD OTC', value: 'XRP/USD OTC', icon: '💧', payout: 89, category: 'crypto', apiSymbol: 'XRPUSD' },
  { label: 'DOGE/USD OTC', value: 'DOGE/USD OTC', icon: '🐕', payout: 86, category: 'crypto', apiSymbol: 'DOGEUSD' },
  
  // STOCKS (5 stocks for demo)
  { label: 'Apple OTC', value: 'AAPL OTC', icon: '🍎', payout: 90, category: 'stocks', apiSymbol: 'AAPL' },
  { label: 'Tesla OTC', value: 'TSLA OTC', icon: '🚗', payout: 86, category: 'stocks', apiSymbol: 'TSLA' },
  { label: 'Google OTC', value: 'GOOGL OTC', icon: '🔍', payout: 88, category: 'stocks', apiSymbol: 'GOOGL' },
  { label: 'Amazon OTC', value: 'AMZN OTC', icon: '📦', payout: 87, category: 'stocks', apiSymbol: 'AMZN' },
  { label: 'Microsoft OTC', value: 'MSFT OTC', icon: '🪟', payout: 89, category: 'stocks', apiSymbol: 'MSFT' },
  
  // COMMODITIES (3 for demo)
  { label: 'Gold OTC', value: 'GOLD OTC', icon: '🥇', payout: 88, category: 'commodities', apiSymbol: 'XAUUSD' },
  { label: 'Silver OTC', value: 'SILVER OTC', icon: '🥈', payout: 86, category: 'commodities', apiSymbol: 'XAGUSD' },
  { label: 'Oil OTC', value: 'OIL OTC', icon: '🛢️', payout: 84, category: 'commodities', apiSymbol: 'USOIL' },
];

// Real Account Assets (More assets, different from demo - 40% win rate)
export const REAL_ASSETS: Asset[] = [
  // FOREX MARKETS (15 pairs - Different from demo)
  { label: 'USD/CHF OTC', value: 'USD/CHF OTC', icon: '🇺🇸🇨🇭', payout: 86, category: 'forex', apiSymbol: 'USDCHF' },
  { label: 'NZD/USD OTC', value: 'NZD/USD OTC', icon: '🇳🇿🇺🇸', payout: 84, category: 'forex', apiSymbol: 'NZDUSD' },
  { label: 'USD/CAD OTC', value: 'USD/CAD OTC', icon: '🇺🇸🇨🇦', payout: 83, category: 'forex', apiSymbol: 'USDCAD' },
  { label: 'EUR/JPY OTC', value: 'EUR/JPY OTC', icon: '🇪🇺🇯🇵', payout: 82, category: 'forex', apiSymbol: 'EURJPY' },
  { label: 'GBP/JPY OTC', value: 'GBP/JPY OTC', icon: '🇬🇧🇯🇵', payout: 81, category: 'forex', apiSymbol: 'GBPJPY' },
  { label: 'EUR/AUD OTC', value: 'EUR/AUD OTC', icon: '🇪🇺🇦🇺', payout: 80, category: 'forex', apiSymbol: 'EURAUD' },
  { label: 'EUR/CAD OTC', value: 'EUR/CAD OTC', icon: '🇪🇺🇨🇦', payout: 79, category: 'forex', apiSymbol: 'EURCAD' },
  { label: 'EUR/CHF OTC', value: 'EUR/CHF OTC', icon: '🇪🇺🇨🇭', payout: 78, category: 'forex', apiSymbol: 'EURCHF' },
  { label: 'GBP/AUD OTC', value: 'GBP/AUD OTC', icon: '🇬🇧🇦🇺', payout: 77, category: 'forex', apiSymbol: 'GBPAUD' },
  { label: 'GBP/CAD OTC', value: 'GBP/CAD OTC', icon: '🇬🇧🇨🇦', payout: 76, category: 'forex', apiSymbol: 'GBPCAD' },
  { label: 'AUD/JPY OTC', value: 'AUD/JPY OTC', icon: '🇦🇺🇯🇵', payout: 75, category: 'forex', apiSymbol: 'AUDJPY' },
  { label: 'CHF/JPY OTC', value: 'CHF/JPY OTC', icon: '🇨🇭🇯🇵', payout: 74, category: 'forex', apiSymbol: 'CHFJPY' },
  { label: 'CAD/JPY OTC', value: 'CAD/JPY OTC', icon: '🇨🇦🇯🇵', payout: 73, category: 'forex', apiSymbol: 'CADJPY' },
  { label: 'NZD/JPY OTC', value: 'NZD/JPY OTC', icon: '🇳🇿🇯🇵', payout: 72, category: 'forex', apiSymbol: 'NZDJPY' },
  { label: 'AUD/NZD OTC', value: 'AUD/NZD OTC', icon: '🇦🇺🇳🇿', payout: 71, category: 'forex', apiSymbol: 'AUDNZD' },
  
  // CRYPTOCURRENCY MARKETS (15 coins - Different from demo)
  { label: 'SOL/USD OTC', value: 'SOL/USD OTC', icon: '🟣', payout: 88, category: 'crypto', apiSymbol: 'SOLUSD' },
  { label: 'ADA/USD OTC', value: 'ADA/USD OTC', icon: '🔵', payout: 87, category: 'crypto', apiSymbol: 'ADAUSD' },
  { label: 'DOT/USD OTC', value: 'DOT/USD OTC', icon: '⚫', payout: 85, category: 'crypto', apiSymbol: 'DOTUSD' },
  { label: 'MATIC/USD OTC', value: 'MATIC/USD OTC', icon: '🟪', payout: 84, category: 'crypto', apiSymbol: 'MATICUSD' },
  { label: 'LTC/USD OTC', value: 'LTC/USD OTC', icon: '🪙', payout: 83, category: 'crypto', apiSymbol: 'LTCUSD' },
  { label: 'AVAX/USD OTC', value: 'AVAX/USD OTC', icon: '🔺', payout: 82, category: 'crypto', apiSymbol: 'AVAXUSD' },
  { label: 'LINK/USD OTC', value: 'LINK/USD OTC', icon: '🔗', payout: 81, category: 'crypto', apiSymbol: 'LINKUSD' },
  { label: 'UNI/USD OTC', value: 'UNI/USD OTC', icon: '🦄', payout: 80, category: 'crypto', apiSymbol: 'UNIUSD' },
  { label: 'ATOM/USD OTC', value: 'ATOM/USD OTC', icon: '⚛️', payout: 79, category: 'crypto', apiSymbol: 'ATOMUSD' },
  { label: 'XLM/USD OTC', value: 'XLM/USD OTC', icon: '⭐', payout: 78, category: 'crypto', apiSymbol: 'XLMUSD' },
  { label: 'ETC/USD OTC', value: 'ETC/USD OTC', icon: '💚', payout: 77, category: 'crypto', apiSymbol: 'ETCUSD' },
  { label: 'FIL/USD OTC', value: 'FIL/USD OTC', icon: '📁', payout: 76, category: 'crypto', apiSymbol: 'FILUSD' },
  { label: 'TRX/USD OTC', value: 'TRX/USD OTC', icon: '🔴', payout: 75, category: 'crypto', apiSymbol: 'TRXUSD' },
  { label: 'NEAR/USD OTC', value: 'NEAR/USD OTC', icon: '🌐', payout: 74, category: 'crypto', apiSymbol: 'NEARUSD' },
  { label: 'APT/USD OTC', value: 'APT/USD OTC', icon: '🅰️', payout: 73, category: 'crypto', apiSymbol: 'APTUSD' },
  
  // STOCK MARKETS (15 stocks - Different from demo)
  { label: 'Meta OTC', value: 'META OTC', icon: '🔵', payout: 85, category: 'stocks', apiSymbol: 'META' },
  { label: 'NVIDIA OTC', value: 'NVDA OTC', icon: '💚', payout: 84, category: 'stocks', apiSymbol: 'NVDA' },
  { label: 'Netflix OTC', value: 'NFLX OTC', icon: '🔴', payout: 83, category: 'stocks', apiSymbol: 'NFLX' },
  { label: 'AMD OTC', value: 'AMD OTC', icon: '🟥', payout: 82, category: 'stocks', apiSymbol: 'AMD' },
  { label: 'Intel OTC', value: 'INTC OTC', icon: '🔷', payout: 81, category: 'stocks', apiSymbol: 'INTC' },
  { label: 'Disney OTC', value: 'DIS OTC', icon: '🏰', payout: 80, category: 'stocks', apiSymbol: 'DIS' },
  { label: 'Nike OTC', value: 'NKE OTC', icon: '✔️', payout: 79, category: 'stocks', apiSymbol: 'NKE' },
  { label: 'Coca-Cola OTC', value: 'KO OTC', icon: '🥤', payout: 78, category: 'stocks', apiSymbol: 'KO' },
  { label: 'McDonald\'s OTC', value: 'MCD OTC', icon: '🍟', payout: 77, category: 'stocks', apiSymbol: 'MCD' },
  { label: 'Starbucks OTC', value: 'SBUX OTC', icon: '☕', payout: 76, category: 'stocks', apiSymbol: 'SBUX' },
  { label: 'Visa OTC', value: 'V OTC', icon: '💳', payout: 75, category: 'stocks', apiSymbol: 'V' },
  { label: 'Mastercard OTC', value: 'MA OTC', icon: '🟠', payout: 74, category: 'stocks', apiSymbol: 'MA' },
  { label: 'PayPal OTC', value: 'PYPL OTC', icon: '🅿️', payout: 73, category: 'stocks', apiSymbol: 'PYPL' },
  { label: 'Walmart OTC', value: 'WMT OTC', icon: '🛒', payout: 72, category: 'stocks', apiSymbol: 'WMT' },
  { label: 'JPMorgan OTC', value: 'JPM OTC', icon: '🏦', payout: 71, category: 'stocks', apiSymbol: 'JPM' },
  
  // COMMODITIES (7 for real)
  { label: 'Platinum OTC', value: 'PLATINUM OTC', icon: '⬜', payout: 82, category: 'commodities', apiSymbol: 'XPTUSD' },
  { label: 'Palladium OTC', value: 'PALLADIUM OTC', icon: '🔘', payout: 80, category: 'commodities', apiSymbol: 'XPDUSD' },
  { label: 'Natural Gas OTC', value: 'NATGAS OTC', icon: '🔥', payout: 78, category: 'commodities', apiSymbol: 'NATGAS' },
  { label: 'Copper OTC', value: 'COPPER OTC', icon: '🟠', payout: 76, category: 'commodities', apiSymbol: 'COPPER' },
  { label: 'Wheat OTC', value: 'WHEAT OTC', icon: '🌾', payout: 74, category: 'commodities', apiSymbol: 'WHEAT' },
  { label: 'Corn OTC', value: 'CORN OTC', icon: '🌽', payout: 72, category: 'commodities', apiSymbol: 'CORN' },
  { label: 'Coffee OTC', value: 'COFFEE OTC', icon: '☕', payout: 70, category: 'commodities', apiSymbol: 'COFFEE' },
];

// Combined for asset lookup
export const ALL_ASSETS: Asset[] = [...DEMO_ASSETS, ...REAL_ASSETS];

// Helper function to get assets based on account type
export const getAssetsForAccount = (accountType: 'demo' | 'real'): Asset[] => {
  return accountType === 'demo' ? DEMO_ASSETS : REAL_ASSETS;
};

// Get default asset for an account type - returns highest payout asset
export const getDefaultAssetForAccount = (accountType: 'demo' | 'real'): string => {
  const assets = accountType === 'demo' ? DEMO_ASSETS : REAL_ASSETS;
  
  // Find asset with highest payout
  let highestPayoutAsset = assets[0];
  for (const asset of assets) {
    if (asset.payout > highestPayoutAsset.payout) {
      highestPayoutAsset = asset;
    }
  }
  
  return highestPayoutAsset.value;
};
