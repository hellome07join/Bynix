import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Line, Rect, Text as SvgText, Circle, Path } from 'react-native-svg';
import { Candle } from '../utils/binanceService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 32;
const CHART_HEIGHT = 320;
const PADDING = 45;

interface EnhancedCandlestickChartProps {
  candles: Candle[];
  currentPrice: number;
  tradeEntry?: {
    price: number;
    time: number;
    type: 'call' | 'put';
  };
  countdown?: number;
  tradeStartTime?: number;
  tradeEndTime?: number;
  isWinning?: boolean | null;
}

export default function EnhancedCandlestickChart({ 
  candles, 
  currentPrice,
  tradeEntry,
  countdown,
  tradeStartTime,
  tradeEndTime,
  isWinning
}: EnhancedCandlestickChartProps) {
  if (candles.length === 0) {
    return <View style={styles.container} />;
  }

  // Calculate price range
  const prices = candles.flatMap(c => [c.high, c.low]);
  const maxPrice = Math.max(...prices, currentPrice, tradeEntry?.price || 0);
  const minPrice = Math.min(...prices, currentPrice, tradeEntry?.price || 0);
  const priceRange = maxPrice - minPrice;
  const padding = priceRange * 0.15;
  
  const chartMaxPrice = maxPrice + padding;
  const chartMinPrice = minPrice - padding;
  const chartPriceRange = chartMaxPrice - chartMinPrice;

  // Calculate positions
  const candleWidth = (CHART_WIDTH - PADDING * 2) / candles.length;
  const wickWidth = 2;
  const bodyWidth = Math.max(candleWidth * 0.7, 5);

  const priceToY = (price: number) => {
    return PADDING + ((chartMaxPrice - price) / chartPriceRange) * (CHART_HEIGHT - PADDING * 2);
  };

  const timeToX = (index: number) => {
    return PADDING + (index * candleWidth) + candleWidth / 2;
  };

  // Entry price line position
  const entryY = tradeEntry ? priceToY(tradeEntry.price) : null;
  
  // Trade start/end vertical line positions
  const chartStartTime = candles[0].time;
  const chartEndTime = candles[candles.length - 1].time;
  const totalTimeRange = chartEndTime - chartStartTime;
  
  const tradeStartX = tradeStartTime 
    ? PADDING + ((tradeStartTime - chartStartTime) / totalTimeRange) * (CHART_WIDTH - PADDING * 2)
    : null;
  
  const tradeEndX = tradeEndTime 
    ? PADDING + ((tradeEndTime - chartStartTime) / totalTimeRange) * (CHART_WIDTH - PADDING * 2)
    : null;

  // Current price position
  const currentPriceY = priceToY(currentPrice);

  // Profit/Loss zone
  const showProfitLossZone = tradeEntry && isWinning !== null;
  const profitZoneY1 = tradeEntry ? priceToY(tradeEntry.price) : 0;
  const profitZoneY2 = currentPriceY;
  const zoneColor = isWinning ? 'rgba(0, 215, 163, 0.15)' : 'rgba(255, 59, 59, 0.15)';

  return (
    <View style={styles.container}>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        {/* Background grid lines */}
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
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              <SvgText
                x={CHART_WIDTH - PADDING + 5}
                y={y + 4}
                fill="#666"
                fontSize="10"
              >
                {price.toFixed(5)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Profit/Loss Zone Highlighting */}
        {showProfitLossZone && (
          <Rect
            x={PADDING}
            y={Math.min(profitZoneY1, profitZoneY2)}
            width={CHART_WIDTH - PADDING * 2}
            height={Math.abs(profitZoneY1 - profitZoneY2)}
            fill={zoneColor}
          />
        )}

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

        {/* Entry Price Line (Horizontal Dotted) */}
        {entryY !== null && (
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
            {/* Entry price label */}
            <Rect
              x={PADDING + 5}
              y={entryY - 12}
              width={85}
              height={20}
              fill="rgba(255, 215, 0, 0.9)"
              rx="4"
            />
            <SvgText
              x={PADDING + 10}
              y={entryY + 2}
              fill="#0A0E27"
              fontSize="11"
              fontWeight="bold"
            >
              Entry: ${tradeEntry?.price.toFixed(5)}
            </SvgText>
          </>
        )}

        {/* Trade Start Line (Vertical - Beginning of Trade) */}
        {tradeStartX !== null && (
          <>
            <Line
              x1={tradeStartX}
              y1={PADDING}
              x2={tradeStartX}
              y2={CHART_HEIGHT - PADDING}
              stroke="#00D7A3"
              strokeWidth="2"
              strokeDasharray="6,3"
              opacity="0.7"
            />
            {/* "Beginning of trade" label */}
            <Rect
              x={tradeStartX - 45}
              y={PADDING - 20}
              width={90}
              height={16}
              fill="rgba(0, 215, 163, 0.9)"
              rx="4"
            />
            <SvgText
              x={tradeStartX}
              y={PADDING - 8}
              fill="#0A0E27"
              fontSize="9"
              fontWeight="bold"
              textAnchor="middle"
            >
              Beginning
            </SvgText>
          </>
        )}

        {/* Trade End Line (Vertical - End of Trade) */}
        {tradeEndX !== null && tradeEndX !== tradeStartX && (
          <>
            <Line
              x1={tradeEndX}
              y1={PADDING}
              x2={tradeEndX}
              y2={CHART_HEIGHT - PADDING}
              stroke="#FF3B3B"
              strokeWidth="2"
              strokeDasharray="6,3"
              opacity="0.7"
            />
            {/* "End of trade" label */}
            <Rect
              x={tradeEndX - 25}
              y={PADDING - 20}
              width={50}
              height={16}
              fill="rgba(255, 59, 59, 0.9)"
              rx="4"
            />
            <SvgText
              x={tradeEndX}
              y={PADDING - 8}
              fill="#FFFFFF"
              fontSize="9"
              fontWeight="bold"
              textAnchor="middle"
            >
              End
            </SvgText>
          </>
        )}

        {/* Countdown Timer (Above Chart) */}
        {countdown !== undefined && countdown > 0 && tradeStartX !== null && (
          <>
            <Rect
              x={(tradeStartX + (tradeEndX || tradeStartX)) / 2 - 35}
              y={PADDING + 20}
              width={70}
              height={32}
              fill="rgba(255, 215, 0, 0.95)"
              rx="10"
            />
            <SvgText
              x={(tradeStartX + (tradeEndX || tradeStartX)) / 2}
              y={PADDING + 42}
              fill="#0A0E27"
              fontSize="18"
              fontWeight="bold"
              textAnchor="middle"
            >
              {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
            </SvgText>
          </>
        )}

        {/* Current Price Marker (Floating on Right) */}
        <Line
          x1={CHART_WIDTH - PADDING - 80}
          y1={currentPriceY}
          x2={CHART_WIDTH - PADDING}
          y2={currentPriceY}
          stroke="#00A8E8"
          strokeWidth="2"
        />
        <Rect
          x={CHART_WIDTH - PADDING - 75}
          y={currentPriceY - 14}
          width={70}
          height={28}
          fill="#00A8E8"
          rx="6"
        />
        <SvgText
          x={CHART_WIDTH - PADDING - 40}
          y={currentPriceY + 5}
          fill="#FFFFFF"
          fontSize="13"
          fontWeight="bold"
          textAnchor="middle"
        >
          ${currentPrice.toFixed(5)}
        </SvgText>

        {/* Trade Status Indicator (Win/Loss) */}
        {isWinning !== null && (
          <>
            <Rect
              x={PADDING + 10}
              y={CHART_HEIGHT - PADDING - 35}
              width={80}
              height={25}
              fill={isWinning ? 'rgba(0, 215, 163, 0.95)' : 'rgba(255, 59, 59, 0.95)'}
              rx="8"
            />
            <SvgText
              x={PADDING + 50}
              y={CHART_HEIGHT - PADDING - 18}
              fill="#FFFFFF"
              fontSize="13"
              fontWeight="bold"
              textAnchor="middle"
            >
              {isWinning ? 'WINNING' : 'LOSING'}
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
