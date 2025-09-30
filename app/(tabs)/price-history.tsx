// app/(tabs)/price-history.tsx
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Text, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useGame } from '../../src/hooks/useGame';
import { useSeed } from '../../src/hooks/useSeed';
import CandyPriceChart from '../components/CandyPriceChart';
import GameHUD from '../components/GameHUD';

export default function PriceHistory() {
  const { periodCount } = useGame();
  const { gameData } = useSeed();
  const [isTabFocused, setIsTabFocused] = useState(false);

  const candyNames = Object.keys(gameData.candyPrices || {});

  // Only render charts when this tab is focused
  useFocusEffect(
    React.useCallback(() => {
      setIsTabFocused(true);
      return () => setIsTabFocused(false);
    }, [])
  );

  return (
    <View style={styles.container}>
      <GameHUD
        theme="evening"
        customHeaderText="Price History"
        customLocationText="Trading Floor"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!isTabFocused ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading charts...</Text>
          </View>
        ) : candyNames.length > 0 ? (
          candyNames.map((candyName) => (
            <CandyPriceChart
              key={candyName}
              candyName={candyName}
              prices={gameData.candyPrices[candyName] || []}
              currentPeriod={periodCount}
            />
          ))
        ) : (
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
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a', // Warm paper background
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
    color: '#6b4423',
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
