import React from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import PixelBorder from './PixelBorder';

const screenWidth = Dimensions.get('window').width;

interface CandyPriceChartProps {
  candyName: string;
  prices: number[];
  currentPeriod: number;
}

export default function CandyPriceChart({
  candyName,
  prices,
  currentPeriod,
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

  // If we don't have enough data, return placeholder
  if (relevantPrices.length < 2) {
    return (
      <PixelBorder
        borderColor="#00ff41"
        borderWidth={2}
        innerPadding={0}
        style={styles.chartWrapper}
      >
        <View style={styles.placeholderContainer}>
          <View style={styles.tickerHeader}>
            <Text style={styles.tickerSymbol}>{candyName.toUpperCase()}</Text>
            <Text style={styles.marketStatus}>INSUFFICIENT DATA</Text>
          </View>
          <View style={styles.placeholderChart}>
            <Image
              source={require('../../assets/images/emojis/chart.png')}
              style={styles.placeholderIcon}
            />
            <Text style={styles.noDataText}>Need more periods for chart</Text>
          </View>
        </View>
      </PixelBorder>
    );
  }

  const minPrice = Math.min(...relevantPrices);
  const maxPrice = Math.max(...relevantPrices);
  const currentPrice = relevantPrices[relevantPrices.length - 1];
  const previousPrice =
    relevantPrices.length > 1
      ? relevantPrices[relevantPrices.length - 2]
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

  return (
    <PixelBorder
      borderColor={getTrendColor()}
      borderWidth={3}
      innerPadding={0}
      style={[styles.chartWrapper, { shadowColor: getTrendColor() }]}
    >
      <View style={styles.chartContainer}>
        {/* Terminal Header */}
        <View style={styles.terminalHeader}>
          <View style={styles.tickerInfo}>
            <Text style={styles.tickerSymbol}>{candyName.toUpperCase()}</Text>
          </View>
          <Text style={styles.periodRange}>
            Period {startPeriod}-{currentPeriod}
          </Text>
        </View>

        {/* Price Display */}
        <View style={styles.priceDisplay}>
          <View style={styles.currentPriceRow}>
            <Text style={styles.currentPriceLabel}>CURRENT PRICE</Text>
            <Text
              style={[styles.currentPriceValue, { color: getTrendColor() }]}
            >
              ${currentPrice.toFixed(2)}
            </Text>
          </View>
          <View style={styles.changeDisplay}>
            <Text style={[styles.changeValue, { color: getTrendColor() }]}>
              {getTrendSymbol()} {priceChange >= 0 ? '+' : ''}$
              {Math.abs(priceChange).toFixed(2)}
            </Text>
            <Text style={[styles.changePercent, { color: getTrendColor() }]}>
              ({priceChangePercent >= 0 ? '+' : ''}
              {priceChangePercent.toFixed(2)}%)
            </Text>
          </View>
        </View>

        {/* Market Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>HIGH</Text>
            <Text style={styles.statValue}>${maxPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>LOW</Text>
            <Text style={styles.statValue}>${minPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Average</Text>
            <Text style={styles.statValue}>
              ${maxPrice / (currentPeriod - startPeriod).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Chart Terminal */}
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
            height={100}
            chartConfig={chartConfig}
            withVerticalLabels={false}
            // withHorizontalLabels={false}
            // withInnerLines={false}
            // withOuterLines={false}
            // withVerticalLines={false}
            style={styles.chart}
            fromZero={false}
            segments={0}
          />
        </PixelBorder>
      </View>
    </PixelBorder>
  );
}

const styles = StyleSheet.create({
  chartWrapper: {
    margin: 8,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  chartContainer: {
    backgroundColor: '#0f0f0f',
    padding: 12,
    borderRadius: 16,
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
    borderBottomColor: '#333333',
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
    color: '#00ff41',
    fontFamily: 'PixeloidMono',
    letterSpacing: 1,
  },
  marketStatus: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ff073a',
    fontFamily: 'PixeloidMono',
    backgroundColor: '#1a1a1a',
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
    borderBottomColor: '#333333',
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
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#333333',
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
    color: '#cccccc',
    fontFamily: 'PixeloidMono',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#1a1a1a',
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 10,
    color: '#00ff41',
    fontFamily: 'PixeloidMono',
    letterSpacing: 1,
  },
  chartInterval: {
    fontSize: 10,
    color: '#888888',
    fontFamily: 'PixeloidMono',
  },
  chart: {
    borderWidth: 2,
    alignSelf: 'center',
  },
  chartFooter: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#1a1a1a',
    marginTop: 8,
  },
  volumeText: {
    fontSize: 9,
    color: '#666666',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  placeholderChart: {
    height: 120,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#333333',
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
  noDataText: {
    fontSize: 12,
    color: '#888888',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
});
