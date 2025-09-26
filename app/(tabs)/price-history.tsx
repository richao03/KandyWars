// app/(tabs)/price-history.tsx
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import GameHUD from '../components/GameHUD';
import CandyPriceChart from '../components/CandyPriceChart';
import { useGame } from '../../src/hooks/useGame';
import { useSeed } from '../../src/hooks/useSeed';

export default function PriceHistory() {
  const { periodCount } = useGame();
  const { gameData } = useSeed();

  const candyNames = Object.keys(gameData.candyPrices || {});

  return (
    <View style={styles.container}>
      <GameHUD 
        customHeaderText="Price History" 
        customLocationText="Trading Floor"
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {candyNames.length > 0 ? (
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
            <Text style={styles.noDataTitle}>📊 No Price Data Yet</Text>
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
    backgroundColor: '#fef7e7', // Warm paper background
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
  noDataText: {
    fontSize: 16,
    color: '#8b5a3c',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    lineHeight: 24,
  },
});
