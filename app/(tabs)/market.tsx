import React, { useEffect, useState } from 'react';
import { Button, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Candy, generateCandyPriceTable } from '../../utils/generateCandyPriceTable';
import GameHUD from '../components/GameHUD';
import TransactionModal from '../components/TransactionModal';
import { useGame } from '../context/GameContext';
import { useInventory } from '../context/InventoryContext';
import { useSeed } from '../context/SeedContext';
import { useWallet } from '../context/WalletContext';

type CandyForMarket = Candy & {
  cost: number;
  quantityOwned: number;
  averagePrice: number | null;
};

const baseCandies: Candy[] = [
  { name: 'Snickers', baseMin: 1.5, baseMax: 3 },
  { name: 'M&Ms', baseMin: 1.0, baseMax: 2.5 },
  { name: 'Skittles', baseMin: 0.75, baseMax: 2.25 },
  { name: 'Warheads', baseMin: 0.25, baseMax: 1.0 },
  { name: 'Sour Patch Kids', baseMin: 1.0, baseMax: 2.75 },
  { name: 'Bubble Gum', baseMin: 0.1, baseMax: 0.5 },
];

export default function Market() {
  const { rng, seed, gameData } = useSeed();
  const { balance, spend, add } = useWallet();
  const { addToInventory, removeFromInventory } = useInventory();
  const { day, period, incrementPeriod } = useGame();

  useEffect(() => {
    setCandies((prev) =>
      prev.map((candy) => ({
        ...candy,
        cost: priceTable[candy.name][period - 1], // period is 1-based in context
      }))
    );
  }, [period]);

  const priceTable = generateCandyPriceTable(seed, baseCandies);

  const [candies, setCandies] = useState<CandyForMarket[]>(() =>
    baseCandies.map((candy) => ({
      ...candy,
      cost: priceTable[candy.name][period],
      quantityOwned: 0,
      averagePrice: null,
    }))
  );

  const [selectedCandyIndex, setSelectedCandyIndex] = useState<number | null>(null);
  const [modalMode, setModalMode] = useState<'buy' | 'sell'>('buy');

  const openModal = (index: number) => {
    setSelectedCandyIndex(index);
    setModalMode('buy'); // default to buy, but modal will let user pick
  };

  const closeModal = () => {
    setSelectedCandyIndex(null);
  };

  const handleTransaction = (quantity: number, mode: 'buy' | 'sell') => {
    if (selectedCandyIndex === null) return;
    const selectedCandy = candies[selectedCandyIndex];

    setCandies((prev) =>
      prev.map((candy, i) => {
        if (i !== selectedCandyIndex) return candy;

        if (mode === 'buy') {
          const totalCost = candy.cost * quantity;
          if (balance < totalCost) return candy;

          spend(totalCost);
          addToInventory(candy.name, quantity); // ✅ Add to inventory

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
          removeFromInventory(candy.name, quantity); // ✅ Remove from inventory

          return {
            ...candy,
            quantityOwned: candy.quantityOwned - quantity,
          };
        }
      })
    );

    closeModal();
  };


  const handleNextDay = () => {
    incrementPeriod();
    setCandies((prev) =>
      prev.map((candy) => ({
        ...candy,
        cost: priceTable[candy.name][period + 1], // NOTE: you may need to refactor this slightly to avoid stale `period`
      }))
    );
  };

  const selectedCandy = selectedCandyIndex !== null ? candies[selectedCandyIndex] : null;
  const maxBuyQty =
    selectedCandy && selectedCandy.cost > 0 ? Math.floor(balance / selectedCandy.cost) : 0;
  const maxSellQty = selectedCandy ? selectedCandy.quantityOwned : 0;

  return (
    <>
      <GameHUD />

      <FlatList
        data={candies}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          console.log("what is item", item.cost.toFixed(2))
          return (
          <TouchableOpacity style={styles.item} onPress={() => openModal(index)}>
            <Text style={styles.name}>{item.name}</Text>
            <Text>Price: ${item.cost ? item.cost.toFixed(2) : 0.00}</Text>
            <Text>Owned: {item.quantityOwned}</Text>
            <Text>
              Avg Price: {item.averagePrice !== null ? `$${item.averagePrice.toFixed(2)}` : '—'}
            </Text>
          </TouchableOpacity>
        )}}
      />

      <View style={styles.buttonContainer}>
        <Button title="Next Day" onPress={handleNextDay} />
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
  },
  dayPeriodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
  },
  list: {
    padding: 20,
  },
  item: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#eee',
    borderRadius: 10,
  },
  name: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  buttonContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  wallet: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
});
