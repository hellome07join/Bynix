// Trade Configuration Constants

export const TIMEFRAMES = [
  { label: '1m', value: '1m', seconds: 60 },
  { label: '5m', value: '5m', seconds: 300 },
  { label: '15s', value: '15s', seconds: 15 },
  { label: '5s', value: '5s', seconds: 5 },
  { label: '1s', value: '1s', seconds: 1 },
];

export const DURATIONS = [
  { label: '5s', seconds: 5 },
  { label: '10s', seconds: 10 },
  { label: '30s', seconds: 30 },
  { label: '1m', seconds: 60 },
  { label: '2m', seconds: 120 },
  { label: '5m', seconds: 300 },
  { label: '10m', seconds: 600 },
  { label: '30m', seconds: 1800 },
  { label: '1h', seconds: 3600 },
];

// Onboarding Tutorial Steps
export const TUTORIAL_STEPS = [
  {
    id: 0,
    title: 'HOW TO TRADE?',
    description: 'Learn trading using a risk-free demo account with $10,000 balance. No deposit needed.',
    isIntro: true,
  },
  {
    id: 1,
    title: 'PRICE MOVEMENT CHART',
    description: 'This chart updates in real time to show price changes of your selected asset.',
  },
  {
    id: 2,
    title: 'YOUR GOAL',
    description: 'Your goal is to predict where the price will go next — UP or DOWN — based on the chart.',
  },
  {
    id: 3,
    title: 'TRADE SETTINGS',
    description: 'Set TIME (duration) and AMOUNT (investment). Higher amount = higher possible profit.',
  },
  {
    id: 4,
    title: 'YOUR PROFIT AND PLACING A TRADE',
    description: 'Estimate your possible profit and choose direction:\n«UP» if you expect the price to rise,\n«DOWN» if you expect it to fall.',
    isFinal: true,
  },
];
