import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

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
  console.log(
    `CandyPriceChart Debug - Candy: ${candyName}, CurrentPeriod: ${currentPeriod}, PricesLength: ${prices?.length}`
  );

  // Get last 10 periods of data
  const maxPeriods = 10;
  const startPeriod = Math.max(0, currentPeriod - maxPeriods + 1);
  const endPeriod = currentPeriod + 1;

  const relevantPrices = prices.slice(startPeriod, endPeriod);
  const periods = Array.from(
    { length: relevantPrices.length },
    (_, i) => startPeriod + i
  );

  console.log(
    `Chart Data - StartPeriod: ${startPeriod}, EndPeriod: ${endPeriod}, RelevantPrices: ${relevantPrices.length}`
  );

  // If we don't have enough data, return placeholder
  if (relevantPrices.length < 2) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.candyTitle}>{candyName}</Text>
        <View style={styles.placeholderChart}>
          <Text style={styles.placeholderText}>📊</Text>
          <Text style={styles.noDataText}>Need more periods for chart</Text>
        </View>
      </View>
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

  // Determine trend colors
  const getTrendColor = () => {
    if (priceChange > 0) return '#22c55e'; // Green for up
    if (priceChange < 0) return '#ef4444'; // Red for down
    return '#64748b'; // Gray for stable
  };

  const getTrendIcon = () => {
    if (priceChange > 0) return '📈';
    if (priceChange < 0) return '📉';
    return '➡️';
  };

  const chartConfig = {
    backgroundColor: '#fefaf5', // Warm paper background
    backgroundGradientFrom: '#fefaf5',
    backgroundGradientTo: '#fefaf5',
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(212, 165, 116, ${opacity})`, // Brown crayon color
    labelColor: (opacity = 1) => `rgba(107, 68, 35, ${opacity})`, // Dark brown
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#d4a574', // Brown crayon border
      fill: getTrendColor(),
    },
    propsForLabels: {
      fontSize: 10,
      fontFamily: 'CrayonPastel',
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
        strokeWidth: 3,
      },
    ],
  };

  return (
    <View style={styles.chartContainer}>
      <View style={styles.header}>
        <Text style={styles.candyTitle}>{candyName}</Text>
        <View style={styles.priceInfo}>
          <Text style={[styles.currentPrice, { color: getTrendColor() }]}>
            ${currentPrice.toFixed(2)}
          </Text>
          <Text style={[styles.priceChange, { color: getTrendColor() }]}>
            {getTrendIcon()} {priceChange >= 0 ? '+' : ''}$
            {priceChange.toFixed(2)} ({priceChangePercent.toFixed(1)}%)
          </Text>
        </View>
      </View>

      <LineChart
        data={data}
        width={screenWidth - 60} // Padding for container
        height={100}
        chartConfig={chartConfig}
        withVerticalLabels={false}
        withHorizontalLabels={false}
        bezier // Smooth curves
        style={styles.chart}
        withInnerLines={true}
        withOuterLines={true}
        withVerticalLines={true}
        fromZero={false} // Auto-scale to data range
        segments={4} // Number of horizontal grid lines
      />

      <View style={styles.footer}>
        <Text style={styles.rangeText}>
          Range: ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}
        </Text>
        <Text style={styles.periodText}>
          Periods {startPeriod} - {currentPeriod}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: '#fefaf5', // Warm paper background
    borderRadius: 20,
    padding: 16,
    margin: 8,
    borderWidth: 3,
    borderColor: '#d4a574', // Brown crayon border
    shadowColor: '#8b4513',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  candyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6b4423', // Dark brown
    fontFamily: 'CrayonPastel',
    flex: 1,
  },
  priceInfo: {
    alignItems: 'flex-end',
    flex: 1,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'CrayonPastel',
  },
  priceChange: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  chart: {
    borderRadius: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  rangeText: {
    fontSize: 11,
    color: '#8b5a3c',
    fontWeight: '500',
  },
  periodText: {
    fontSize: 11,
    color: '#8b5a3c',
    fontWeight: '500',
  },
  placeholderChart: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 32,
    marginBottom: 8,
  },
  noDataText: {
    fontSize: 14,
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
  },
});
