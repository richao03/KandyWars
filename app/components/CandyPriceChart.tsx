import React from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { getCandyDefinition } from '../../src/constants/candyRegistry';
import colors from '../../src/constants/colors';
import { formatCurrency } from '../../src/utils/priceUtils';
import PixelBorder from './PixelBorder';

const screenWidth = Dimensions.get('window').width;

interface CandyPriceChartProps {
  candyName: string;
  prices: number[];
  currentPeriod: number;
  expanded: boolean;
  onToggle: () => void;
}

function CandyPriceChart({
  candyName,
  prices,
  currentPeriod,
  expanded,
  onToggle,
}: CandyPriceChartProps) {
  // Get last 10 periods of data
  const maxPeriods = 10;
  const startPeriod = Math.max(0, currentPeriod - maxPeriods + 1);
  const endPeriod = currentPeriod + 1;

  const relevantPrices = prices.slice(startPeriod, endPeriod);
  const periods = Array.from(
    { length: relevantPrices.length },
    (_, i) => startPeriod + i
  );

  const hasChartData = relevantPrices.length >= 2;
  const currentPrice = relevantPrices[relevantPrices.length - 1] ?? 0;
  const previousPrice =
    relevantPrices.length > 1
      ? relevantPrices[relevantPrices.length - 2]
      : currentPrice;
  const minPrice = relevantPrices.length
    ? Math.min(...relevantPrices)
    : currentPrice;
  const maxPrice = relevantPrices.length
    ? Math.max(...relevantPrices)
    : currentPrice;
  const averagePrice = relevantPrices.length
    ? relevantPrices.reduce((sum, price) => sum + price, 0) /
      relevantPrices.length
    : currentPrice;
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent =
    previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0;

  // Stock market colors
  const getTrendColor = () => {
    if (priceChange > 0) return '#00ff41'; // Matrix green for gains
    if (priceChange < 0) return '#ff073a'; // Red for losses
    return '#cccccc'; // Gray for neutral
  };

  const getTrendSymbol = () => {
    if (priceChange > 0) return '▲';
    if (priceChange < 0) return '▼';
    return '●';
  };

  const chartConfig = {
    backgroundColor: '#0a0a0a',
    backgroundGradientFrom: '#0a0a0a',
    backgroundGradientTo: '#1a1a1a',
    decimalPlaces: 2,
    color: (opacity = 1) =>
      getTrendColor() +
      Math.floor(opacity * 255)
        .toString(16)
        .padStart(2, '0'),
    labelColor: (opacity = 1) => `rgba(204, 204, 204, ${opacity})`,
    style: {
      borderRadius: 0,
    },
    propsForDots: {
      r: '3',
      strokeWidth: '1',
      stroke: getTrendColor(),
      fill: getTrendColor(),
    },
    propsForLabels: {
      fontSize: 10,
      fontFamily: 'PixeloidMono',
    },
  };

  const data = {
    labels: periods.map(String),
    datasets: [
      {
        data: relevantPrices,
        color: (opacity = 1) =>
          getTrendColor() +
          Math.floor(opacity * 255)
            .toString(16)
            .padStart(2, '0'),
        strokeWidth: 2,
      },
    ],
  };

  const candyDefinition = getCandyDefinition(candyName);
  const sizeLabel = candyDefinition?.size.toUpperCase() || 'CANDY';
  const typeLabel = candyDefinition?.types
    .map((type) => type.replace('_', ' '))
    .join(' · ')
    .toUpperCase();
  const trendColor = getTrendColor();
  const isDrop = priceChange < 0;
  const tickerSymbol = candyName
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 3)
    .toUpperCase();

  return (
    <PixelBorder
      borderColor={trendColor}
      borderWidth={3}
      innerPadding={0}
      style={[styles.chartWrapper, { shadowColor: trendColor }]}
    >
      <View style={styles.cardContainer}>
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${candyName}, current price $${formatCurrency(currentPrice)}, ${isDrop ? 'down' : priceChange > 0 ? 'up' : 'unchanged'} ${formatCurrency(Math.abs(priceChangePercent))} percent`}
          style={({ pressed }) => [
            styles.strip,
            pressed && styles.stripPressed,
          ]}
        >
          <View style={[styles.tickerTile, { borderColor: trendColor }]}>
            <View style={styles.tickerScanline} />
            <Text style={[styles.tickerCode, { color: trendColor }]}>
              {tickerSymbol}
            </Text>
            <Text style={styles.tickerFeed}>LIVE</Text>
            <Text style={[styles.trendGlyph, { color: trendColor }]}>
              {getTrendSymbol()}
            </Text>
          </View>
          <View style={styles.stripCopy}>
            <Text
              style={styles.stripName}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {candyName.toUpperCase()}
            </Text>
            <Text style={styles.stripMeta} numberOfLines={1}>
              {sizeLabel}
              {typeLabel ? ` · ${typeLabel}` : ''}
            </Text>
          </View>
          <View style={styles.stripPrice}>
            <Text style={[styles.stripCurrentPrice, { color: trendColor }]}>
              ${formatCurrency(currentPrice)}
            </Text>
            <Text style={[styles.stripChange, { color: trendColor }]}>
              {getTrendSymbol()} {priceChange >= 0 ? '+' : ''}
              {formatCurrency(priceChangePercent)}%
            </Text>
          </View>
          <Text style={[styles.chevron, expanded && styles.chevronExpanded]}>
            ›
          </Text>
        </Pressable>

        {expanded && (
          <View style={styles.chartContainer}>
            <View style={styles.terminalHeader}>
              <Text style={styles.periodRange}>
                PERIOD {startPeriod}–{currentPeriod}
              </Text>
              <Text style={[styles.absoluteChange, { color: trendColor }]}>
                {priceChange >= 0 ? '+' : '-'}$
                {formatCurrency(Math.abs(priceChange))}
              </Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>HIGH</Text>
                <Text style={styles.statValue}>
                  ${formatCurrency(maxPrice)}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>LOW</Text>
                <Text style={styles.statValue}>
                  ${formatCurrency(minPrice)}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>AVERAGE</Text>
                <Text style={styles.statValue}>
                  ${formatCurrency(averagePrice)}
                </Text>
              </View>
            </View>

            {hasChartData ? (
              <PixelBorder
                borderColor="#333333"
                borderWidth={1}
                backgroundColor="#0a0a0a"
                innerPadding={4}
                style={styles.chartTerminal}
              >
                <LineChart
                  data={data}
                  width={screenWidth - 60}
                  height={120}
                  chartConfig={chartConfig}
                  withVerticalLabels={false}
                  style={styles.chart}
                  fromZero={false}
                  segments={3}
                />
              </PixelBorder>
            ) : (
              <View style={styles.placeholderChart}>
                <Text style={styles.noSignalText}>[ NO SIGNAL ]</Text>
                <Text style={styles.noDataText}>
                  Need another period for the full chart
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </PixelBorder>
  );
}

const styles = StyleSheet.create({
  chartWrapper: {
    marginHorizontal: 10,
    marginVertical: 5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardContainer: {
    backgroundColor: '#0f0f0f',
  },
  strip: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#151515',
  },
  stripPressed: {
    opacity: 0.78,
  },
  tickerTile: {
    width: 84,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#080d0a',
    borderRightWidth: 1,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  tickerScanline: {
    position: 'absolute',
    left: 7,
    right: 7,
    top: 17,
    height: 1,
    backgroundColor: 'rgba(0,255,65,0.18)',
    shadowColor: '#00ff41',
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  tickerCode: {
    fontSize: 21,
    lineHeight: 24,
    fontWeight: '900',
    fontFamily: 'PixeloidMono',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,255,65,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  tickerFeed: {
    marginTop: 3,
    fontSize: 7,
    color: '#6b7280',
    fontFamily: 'PixeloidMono',
    letterSpacing: 2,
  },
  trendGlyph: {
    position: 'absolute',
    right: 5,
    bottom: 3,
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'PixeloidMono',
  },
  stripCopy: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  stripName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#d1fae5',
    fontFamily: 'PixeloidMono',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  stripMeta: {
    fontSize: 8,
    color: '#9ca3af',
    fontFamily: 'PixeloidMono',
    textTransform: 'uppercase',
  },
  stripPrice: {
    minWidth: 90,
    paddingVertical: 11,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  stripCurrentPrice: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
    marginBottom: 5,
  },
  stripChange: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
  },
  chevron: {
    width: 30,
    alignSelf: 'center',
    color: '#d4af37',
    fontSize: 20,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    transform: [{ rotate: '0deg' }],
  },
  chevronExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  chartContainer: {
    backgroundColor: '#0f0f0f',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  placeholderContainer: {
    backgroundColor: '#0f0f0f',
    padding: 16,
  },
  terminalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray.dark,
  },
  absoluteChange: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
  },
  tickerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tickerSymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.green.neon,
    fontFamily: 'PixeloidMono',
    letterSpacing: 1,
  },
  marketStatus: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ff073a',
    fontFamily: 'PixeloidMono',
    backgroundColor: colors.darkGray1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  periodRange: {
    fontSize: 12,
    color: '#888888',
    fontFamily: 'PixeloidMono',
  },
  priceDisplay: {
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray.dark,
  },
  currentPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  currentPriceLabel: {
    fontSize: 16,
    color: '#888888',
    fontFamily: 'PixeloidMono',
    marginBottom: 4,
    letterSpacing: 1,
  },
  currentPriceValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
    marginBottom: 4,
  },
  changeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  changeValue: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
  },
  changePercent: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 8,
    backgroundColor: colors.darkGray1,
    borderRadius: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.gray.dark,
  },
  statLabel: {
    fontSize: 10,
    color: '#888888',
    fontFamily: 'PixeloidMono',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray.border,
    fontFamily: 'PixeloidMono',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.darkGray1,
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 10,
    color: colors.green.neon,
    fontFamily: 'PixeloidMono',
    letterSpacing: 1,
  },
  chartInterval: {
    fontSize: 10,
    color: '#888888',
    fontFamily: 'PixeloidMono',
  },
  chartTerminal: {
    marginHorizontal: 0,
  },
  chart: {
    borderWidth: 2,
    alignSelf: 'center',
  },
  chartFooter: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.darkGray1,
    marginTop: 8,
  },
  volumeText: {
    fontSize: 9,
    color: colors.gray.medium,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  placeholderChart: {
    height: 120,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.darkGray1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.gray.dark,
    marginTop: 12,
  },
  placeholderText: {
    fontSize: 32,
    marginBottom: 8,
  },
  placeholderIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  noSignalText: {
    marginBottom: 8,
    color: '#00ff41',
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    letterSpacing: 2,
  },
  noDataText: {
    fontSize: 12,
    color: '#888888',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
});

export default CandyPriceChart;
