import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Line, Rect, Text as SvgText, Circle } from 'react-native-svg';
import { Candle } from '../utils/binanceService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 48;
const CHART_HEIGHT = 400;
const PADDING = 40;

interface CandlestickChartProps {
  candles: Candle[];
  currentPrice: number;
  tradeEntry?: {
    price: number;
    time: number;
    type: 'call' | 'put';
  };
  countdown?: number;
}

export default function CandlestickChart({ 
  candles, 
  currentPrice,
  tradeEntry,
  countdown 
}: CandlestickChartProps) {
  if (candles.length === 0) {
    return <View style={styles.container} />;
  }

  // Calculate price range
  const prices = candles.flatMap(c => [c.high, c.low]);
  const maxPrice = Math.max(...prices, currentPrice);
  const minPrice = Math.min(...prices, currentPrice);
  const priceRange = maxPrice - minPrice;
  const padding = priceRange * 0.1;
  
  const chartMaxPrice = maxPrice + padding;
  const chartMinPrice = minPrice - padding;
  const chartPriceRange = chartMaxPrice - chartMinPrice;

  // Calculate positions
  const candleWidth = (CHART_WIDTH - PADDING * 2) / candles.length;
  const wickWidth = 2;
  const bodyWidth = Math.max(candleWidth * 0.7, 6);

  const priceToY = (price: number) => {
    return PADDING + ((chartMaxPrice - price) / chartPriceRange) * (CHART_HEIGHT - PADDING * 2);
  };

  const timeToX = (index: number) => {
    return PADDING + (index * candleWidth) + candleWidth / 2;
  };

  // Entry price line position (if trade is active)
  const entryY = tradeEntry ? priceToY(tradeEntry.price) : null;
  const entryX = tradeEntry ? timeToX(Math.floor(candles.length * 0.4)) : null;

  // Current price position
  const currentPriceY = priceToY(currentPrice);

  return (
    <View style={styles.container}>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = PADDING + ratio * (CHART_HEIGHT - PADDING * 2);
          const price = chartMaxPrice - ratio * chartPriceRange;
          return (
            <React.Fragment key={`grid-${i}`}>
              <Line
                x1={PADDING}
                y1={y}
                x2={CHART_WIDTH - PADDING}
                y2={y}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              <SvgText
                x={CHART_WIDTH - PADDING + 5}
                y={y + 4}
                fill="#999"
                fontSize="10"
              >
                {price.toFixed(2)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Draw candles */}
        {candles.map((candle, index) => {
          const x = timeToX(index);
          const isGreen = candle.close >= candle.open;
          const color = isGreen ? '#00D7A3' : '#FF3B3B';
          
          const highY = priceToY(candle.high);
          const lowY = priceToY(candle.low);
          const openY = priceToY(candle.open);
          const closeY = priceToY(candle.close);
          
          const bodyTop = Math.min(openY, closeY);
          const bodyHeight = Math.abs(openY - closeY) || 1;

          return (
            <React.Fragment key={`candle-${index}`}>
              {/* Wick */}
              <Line
                x1={x}
                y1={highY}
                x2={x}
                y2={lowY}
                stroke={color}
                strokeWidth={wickWidth}
              />
              {/* Body */}
              <Rect
                x={x - bodyWidth / 2}
                y={bodyTop}
                width={bodyWidth}
                height={bodyHeight}
                fill={color}
              />
            </React.Fragment>
          );
        })}

        {/* Entry price line (dashed) */}
        {entryY !== null && entryX !== null && (
          <>
            <Line
              x1={PADDING}
              y1={entryY}
              x2={CHART_WIDTH - PADDING}
              y2={entryY}
              stroke="#FFD700"
              strokeWidth="2"
              strokeDasharray="8,4"
            />
            {/* Entry marker */}
            <Circle
              cx={entryX}
              cy={entryY}
              r="6"
              fill="#FFD700"
            />
            {/* Beginning of trade label */}
            <SvgText
              x={entryX + 10}
              y={entryY - 10}
              fill="#FFD700"
              fontSize="12"
              fontWeight="bold"
            >
              Entry
            </SvgText>
          </>
        )}

        {/* Current price indicator */}
        <Line
          x1={CHART_WIDTH - PADDING - 60}
          y1={currentPriceY}
          x2={CHART_WIDTH - PADDING}
          y2={currentPriceY}
          stroke="#00A8E8"
          strokeWidth="2"
        />
        <Rect
          x={CHART_WIDTH - PADDING - 60}
          y={currentPriceY - 12}
          width="55"
          height="24"
          fill="#00A8E8"
          rx="4"
        />
        <SvgText
          x={CHART_WIDTH - PADDING - 33}
          y={currentPriceY + 4}
          fill="#FFFFFF"
          fontSize="12"
          fontWeight="bold"
          textAnchor="middle"
        >
          {currentPrice.toFixed(2)}
        </SvgText>

        {/* Countdown timer on chart */}
        {countdown !== undefined && countdown > 0 && entryX !== null && (
          <>
            <Line
              x1={entryX}
              y1={PADDING}
              x2={entryX}
              y2={CHART_HEIGHT - PADDING}
              stroke="rgba(255,215,0,0.5)"
              strokeWidth="2"
              strokeDasharray="4,2"
            />
            <Rect
              x={entryX - 30}
              y={PADDING + 10}
              width="60"
              height="30"
              fill="rgba(255,215,0,0.9)"
              rx="8"
            />
            <SvgText
              x={entryX}
              y={PADDING + 30}
              fill="#0A0E27"
              fontSize="16"
              fontWeight="bold"
              textAnchor="middle"
            >
              00:{countdown.toString().padStart(2, '0')}
            </SvgText>
          </>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    backgroundColor: 'transparent',
  },
});