import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GameHUD from '../components/GameHUD';
import TransactionModal from '../components/TransactionModal';
import { useGame } from '../context/GameContext';
import { useInventory } from '../context/InventoryContext';
import { useSeed } from '../context/SeedContext';
import { useWallet } from '../context/WalletContext';
import { Candy } from '../types';

type CandyForDeli = Candy & {
  cost: number;
  quantityOwned: number;
  averagePrice: number | null;
};

const baseCandies = [
  { name: 'Snickers', baseMin: 1.5, baseMax: 20 },
  { name: 'M&Ms', baseMin: 1.0, baseMax: 25 },
  { name: 'Skittles', baseMin: 0.75, baseMax: 22 },
  { name: 'Warheads', baseMin: 0.25, baseMax: 10 },
  { name: 'Sour Patch Kids', baseMin: 1.0, baseMax: 27 },
  { name: 'Bubble Gum', baseMin: 0.1, baseMax: 5 },
];

export default function Deli() {
  const { gameData } = useSeed();
  const { balance, spend, add } = useWallet();
  const { addToInventory, removeFromInventory } = useInventory();
  const { day } = useGame();

  const [candies, setCandies] = useState<CandyForDeli[]>(() =>
    baseCandies.map((candy) => {
      // Calculate average price across all periods
      const prices = gameData.candyPrices[candy.name];
      const averageCost = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      
      return {
        ...candy,
        cost: parseFloat(averageCost.toFixed(2)),
        quantityOwned: 0,
        averagePrice: null,
      };
    })
  );

  const [selectedCandyIndex, setSelectedCandyIndex] = useState<number | null>(null);
  const [modalMode, setModalMode] = useState<'buy' | 'sell'>('buy');

  const openModal = (index: number) => {
    setSelectedCandyIndex(index);
    setModalMode('buy');
  };

  const closeModal = () => {
    setSelectedCandyIndex(null);
  };

  const handleTransaction = (quantity: number, mode: 'buy' | 'sell') => {
    if (selectedCandyIndex === null) return;
    
    setCandies((prev) =>
      prev.map((candy, i) => {
        if (i !== selectedCandyIndex) return candy;

        if (mode === 'buy') {
          const totalCost = candy.cost * quantity;
          if (balance < totalCost) return candy;

          spend(totalCost);
          addToInventory(candy.name, quantity, candy.cost);

          const newQty = candy.quantityOwned + quantity;
          const newAvg =
            candy.averagePrice === null
              ? candy.cost
              : (candy.averagePrice * candy.quantityOwned + candy.cost * quantity) / newQty;

          return {
            ...candy,
            quantityOwned: newQty,
            averagePrice: newAvg,
          };
        } else {
          const totalGain = candy.cost * quantity;
          add(totalGain);
          removeFromInventory(candy.name, quantity);

          return {
            ...candy,
            quantityOwned: candy.quantityOwned - quantity,
          };
        }
      })
    );

    closeModal();
  };

  const handleReturnToAfterSchool = () => {
    router.push('/(tabs)/after-school');
  };

  const selectedCandy = selectedCandyIndex !== null ? candies[selectedCandyIndex] : null;
  const maxBuyQty =
    selectedCandy && selectedCandy.cost > 0 ? Math.floor(balance / selectedCandy.cost) : 0;
  const maxSellQty = selectedCandy ? selectedCandy.quantityOwned : 0;

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#2a1845" />
      <GameHUD 
        theme="evening" 
        customHeaderText={`After School - Day ${day}`}
        customLocationText="Peaceful Evening"
      />
      <View style={styles.header}>
        <Text style={styles.title}>🏪 Corner Deli</Text>
        <Text style={styles.subtitle}>Stable prices • Average market rates</Text>
      </View>
      
      <FlatList
        data={candies}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <TouchableOpacity style={styles.item} onPress={() => openModal(index)}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.price}>Price: ${item.cost.toFixed(2)} (avg)</Text>
            <Text style={styles.owned}>Owned: {item.quantityOwned}</Text>
            <Text style={styles.avgPrice}>
              Avg Price: {item.averagePrice !== null ? `$${item.averagePrice.toFixed(2)}` : '—'}
            </Text>
          </TouchableOpacity>
        )}
      />

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleReturnToAfterSchool}>
          <Text style={styles.backButtonText}>🌅 Back to After School</Text>
        </TouchableOpacity>
      </View>

      {selectedCandy && (
        <TransactionModal
          visible={selectedCandyIndex !== null}
          onClose={closeModal}
          onConfirm={handleTransaction}
          maxBuyQuantity={maxBuyQty}
          maxSellQuantity={maxSellQty}
          candy={selectedCandy}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2a1845', // Match after-school background
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(93, 76, 112, 0.85)',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#8a7ca8',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f7e98e',
    fontFamily: 'CrayonPastel',
    textShadowColor: 'rgba(247,233,142,0.4)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#b8a9c9',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  list: {
    padding: 16,
  },
  item: {
    marginBottom: 12,
    padding: 16,
    flexDirection: 'column',
    backgroundColor: 'rgba(93, 76, 112, 0.85)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#8a7ca8',
    shadowColor: '#2d1b3d',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f7e98e',
    marginBottom: 6,
    fontFamily: 'CrayonPastel',
    textShadowColor: 'rgba(247,233,142,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  price: {
    fontSize: 16,
    color: '#b8a9c9',
    fontWeight: '600',
    marginBottom: 4,
  },
  owned: {
    fontSize: 16,
    color: '#b8a9c9',
    marginBottom: 4,
  },
  avgPrice: {
    fontSize: 16,
    color: '#b8a9c9',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: '#ffcc99',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#cc7a00',
    shadowColor: '#8b4513',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
  },
});