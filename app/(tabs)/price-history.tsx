// app/(tabs)/price-history.tsx
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import colors from '../../src/constants/colors';
import { getCandyDefinition } from '../../src/constants/candyRegistry';
import { useGame } from '../../src/hooks/useGame';
import { useSeed } from '../../src/hooks/useSeed';
import { useAppSelector } from '../../src/store/hooks';
import { selectMediumCandiesUnlocked, selectBigCandiesUnlocked } from '../../src/store/slices/gameSlice';
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

  const candyNames = useMemo(
    () => Object.keys(gameData.candyPrices || {}).filter((name) => {
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

  const renderChart = useCallback(({ item: candyName }: { item: string }) => (
    <MemoizedCandyPriceChart
      candyName={candyName}
      prices={gameData.candyPrices[candyName] || []}
      currentPeriod={periodCount}
    />
  ), [gameData.candyPrices, periodCount]);

  const keyExtractor = useCallback((item: string) => item, []);

  if (!isTabFocused) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading charts...</Text>
        </View>
      </View>
    );
  }

  if (candyNames.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.noDataContainer}>
          <View style={styles.noDataTitleRow}>
            <Image
              source={require('../../assets/images/emojis/chart.png')}
              style={styles.noDataTitleIcon}
            />
            <Text style={styles.noDataTitle}>No Price Data Yet</Text>
          </View>
          <Text style={styles.noDataText}>
            Visit the market to start tracking candy prices across periods!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
      <FlatList
        data={candyNames}
        renderItem={renderChart}
        keyExtractor={keyExtractor}
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
    paddingTop: 8,
    paddingBottom: 4,
    gap: 6,
  },
  chip: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#d4a574',
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: '#d4a574',
    borderColor: colors.brown.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brown.primary,
    fontFamily: 'PixeloidMono',
  },
  chipTextActive: {
    color: '#fff',
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
    color: colors.brown.primary,
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
  noDataTitleIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    marginRight: 12,
  },
  noDataText: {
    fontSize: 16,
    color: '#8b5a3c',
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
    color: '#8b5a3c',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
});
