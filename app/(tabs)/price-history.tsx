// app/(tabs)/price-history.tsx
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import GameHUD from '../components/GameHUD';
import CandyPriceChart from '../components/CandyPriceChart';
import { useGame } from '../../src/context/GameContext';
import { useSeed } from '../../src/context/SeedContext';

export default function PriceHistory() {
  const { periodCount } = useGame();
  const { gameData } = useSeed();

  const candyNames = Object.keys(gameData.candyPrices);

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
        {candyNames.map((candyName) => (
          <CandyPriceChart
            key={candyName}
            candyName={candyName}
            prices={gameData.candyPrices[candyName]}
            currentPeriod={periodCount}
          />
        ))}
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
});
