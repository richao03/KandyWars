import React, { useEffect, useState } from 'react';
import { Button, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import GameHUD from '../components/GameHUD';
import TransactionModal from '../components/TransactionModal';
import { useGame } from '../context/GameContext';
import { useInventory } from '../context/InventoryContext';
import { useSeed } from '../context/SeedContext';
import { useWallet } from '../context/WalletContext';

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
          addToInventory(candy.name, quantity);

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

  const handleReturnToSchool = () => {
    router.push('/market');
  };

  const selectedCandy = selectedCandyIndex !== null ? candies[selectedCandyIndex] : null;
  const maxBuyQty =
    selectedCandy && selectedCandy.cost > 0 ? Math.floor(balance / selectedCandy.cost) : 0;
  const maxSellQty = selectedCandy ? selectedCandy.quantityOwned : 0;

  return (
    <>
      <GameHUD />
      <View style={styles.header}>
        <Text style={styles.title}>🏪 DELI</Text>
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
        <Button 
          title="Return to School" 
          onPress={handleReturnToSchool} 
        />
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
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#28a745',
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#d4edda',
  },
  list: {
    padding: 20,
  },
  item: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#28a745',
  },
  name: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#333',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    color: '#28a745',
    fontWeight: '600',
  },
  owned: {
    fontSize: 14,
    color: '#666',
  },
  avgPrice: {
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
});