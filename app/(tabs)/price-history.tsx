// app/(tabs)/price-history.tsx
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import colors from '../../src/constants/colors';
import { getCandyDefinition } from '../../src/constants/candyRegistry';
import { useGame } from '../../src/hooks/useGame';
import { useSeed } from '../../src/hooks/useSeed';
import { useAppSelector } from '../../src/store/hooks';
import {
  selectMediumCandiesUnlocked,
  selectBigCandiesUnlocked,
} from '../../src/store/slices/gameSlice';
import CandyPriceChart from '../components/CandyPriceChart';

type SizeFilter = 'all' | 'small' | 'medium' | 'big';
const SIZE_FILTERS: { id: SizeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'big', label: 'Big' },
];

// Memoized chart component to prevent unnecessary re-renders
const MemoizedCandyPriceChart = React.memo(CandyPriceChart);

export default function PriceHistory() {
  const { periodCount } = useGame();
  const { gameData } = useSeed();
  const [isTabFocused, setIsTabFocused] = useState(false);
  const mediumUnlocked = useAppSelector(selectMediumCandiesUnlocked);
  const bigUnlocked = useAppSelector(selectBigCandiesUnlocked);
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('all');
  const [expandedCandy, setExpandedCandy] = useState<string | null>(null);

  const candyNames = useMemo(
    () =>
      Object.keys(gameData.candyPrices || {}).filter((name) => {
        const def = getCandyDefinition(name);
        if (!def) return true;
        if (def.size === 'medium' && !mediumUnlocked) return false;
        if (def.size === 'big' && !bigUnlocked) return false;
        if (sizeFilter !== 'all' && def.size !== sizeFilter) return false;
        return true;
      }),
    [gameData.candyPrices, mediumUnlocked, bigUnlocked, sizeFilter]
  );

  // Only render charts when this tab is focused
  useFocusEffect(
    useCallback(() => {
      setIsTabFocused(true);
      return () => setIsTabFocused(false);
    }, [])
  );

  const renderChart = useCallback(
    ({ item: candyName }: { item: string }) => (
      <MemoizedCandyPriceChart
        candyName={candyName}
        prices={gameData.candyPrices?.[candyName] || []}
        currentPeriod={periodCount}
        expanded={expandedCandy === candyName}
        onToggle={() =>
          setExpandedCandy((current) =>
            current === candyName ? null : candyName
          )
        }
      />
    ),
    [expandedCandy, gameData.candyPrices, periodCount]
  );

  const keyExtractor = useCallback((item: string) => item, []);

  const marketStats = useMemo(() => {
    let up = 0;
    let down = 0;
    let flat = 0;
    candyNames.forEach((name) => {
      const prices = gameData.candyPrices?.[name] || [];
      const current = prices[periodCount] ?? 0;
      const previous = prices[Math.max(0, periodCount - 1)] ?? current;
      if (current > previous) up += 1;
      else if (current < previous) down += 1;
      else flat += 1;
    });
    return { up, down, flat };
  }, [candyNames, gameData.candyPrices, periodCount]);

  if (!isTabFocused) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>CONNECTING TO EXCHANGE...</Text>
        </View>
      </View>
    );
  }

  const filterChips = (
    <View style={styles.chipRow}>
      {SIZE_FILTERS.map((f) => {
        const isActive = sizeFilter === f.id;
        return (
          <Pressable
            key={f.id}
            onPress={() => setSizeFilter(f.id)}
            style={[styles.chip, isActive && styles.chipActive]}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const exchangeHeader = (
    <View style={styles.exchangeHeader}>
      <View>
        <Text style={styles.exchangeEyebrow}>
          CANDY EXCHANGE // P{periodCount}
        </Text>
        <Text style={styles.exchangeTitle}>MARKET SIGNALS</Text>
      </View>
      <View style={styles.marketPulse}>
        <Text style={styles.pulseUp}>▲{marketStats.up}</Text>
        <Text style={styles.pulseDown}>▼{marketStats.down}</Text>
        <Text style={styles.pulseFlat}>●{marketStats.flat}</Text>
      </View>
    </View>
  );

  if (candyNames.length === 0) {
    return (
      <View style={styles.container}>
        {exchangeHeader}
        {filterChips}
        <View style={styles.noDataContainer}>
          <View style={styles.noDataTitleRow}>
            <Text style={styles.noDataTitle}>[ NO MARKET DATA ]</Text>
          </View>
          <Text style={styles.noDataText}>
            Visit the market to begin intercepting price signals.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {exchangeHeader}
      {filterChips}
      <FlatList
        data={candyNames}
        renderItem={renderChart}
        keyExtractor={keyExtractor}
        extraData={expandedCandy}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        initialNumToRender={3}
        windowSize={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkGray1, // Warm paper background
  },
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 6,
    gap: 6,
  },
  chip: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#285c36',
    backgroundColor: '#0a120d',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: '#12351d',
    borderColor: '#00ff41',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#63866d',
    fontFamily: 'PixeloidMono',
  },
  chipTextActive: {
    color: '#00ff41',
    textShadowColor: 'rgba(0,255,65,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  exchangeHeader: {
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#285c36',
    backgroundColor: '#080d0a',
  },
  exchangeEyebrow: {
    color: '#63866d',
    fontSize: 8,
    fontFamily: 'PixeloidMono',
    letterSpacing: 1,
  },
  exchangeTitle: {
    marginTop: 3,
    color: '#00ff41',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,255,65,0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  marketPulse: {
    flexDirection: 'row',
    gap: 8,
  },
  pulseUp: {
    color: '#00ff41',
    fontSize: 10,
    fontFamily: 'PixeloidMono',
  },
  pulseDown: {
    color: '#ff073a',
    fontSize: 10,
    fontFamily: 'PixeloidMono',
  },
  pulseFlat: {
    color: '#888',
    fontSize: 10,
    fontFamily: 'PixeloidMono',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  noDataTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00ff41',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 16,
  },
  noDataTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noDataText: {
    fontSize: 16,
    color: '#63866d',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#00ff41',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
});
