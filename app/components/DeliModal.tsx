import React, { useState } from 'react';
import { Button, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';
import TransactionModal from './TransactionModal';
import { useSeed } from '../../src/context/SeedContext';
import { useWallet } from '../../src/context/WalletContext';
import { useInventory } from '../../src/context/InventoryContext';

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

interface DeliModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function DeliModal({ visible, onClose }: DeliModalProps) {
  const { gameData } = useSeed();
  const { balance, spend, add } = useWallet();
  const { addToInventory, removeFromInventory, inventory, getInventoryLimit } = useInventory();

  const [candies, setCandies] = useState<CandyForDeli[]>(() =>
    baseCandies.map((candy) => {
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

  const openModal = (index: number) => {
    setSelectedCandyIndex(index);
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

          // Try to add to inventory first - this will check inventory limits
          const inventorySuccess = addToInventory(candy.name, quantity, candy.cost);
          if (!inventorySuccess) {
            // Inventory is full, transaction fails
            return candy;
          }

          spend(totalCost);

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

  const selectedCandy = selectedCandyIndex !== null ? candies[selectedCandyIndex] : null;
  
  // Calculate max buy quantity considering both money and inventory space
  const totalInventory = Object.values(inventory).reduce((sum, item) => sum + item.quantity, 0);
  const inventoryLimit = getInventoryLimit();
  const availableInventorySpace = inventoryLimit - totalInventory;
  
  const maxBuyQty = selectedCandy && selectedCandy.cost > 0 
    ? Math.min(
        Math.floor(balance / selectedCandy.cost), // Money constraint
        availableInventorySpace // Inventory space constraint
      )
    : 0;
    
  const maxSellQty = selectedCandy ? selectedCandy.quantityOwned : 0;

  return (
    <Modal
      isVisible={visible}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      animationInTiming={400}
      animationOutTiming={300}
      backdropTransitionInTiming={400}
      backdropTransitionOutTiming={300}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      useNativeDriver={true}
      hideModalContentWhileAnimating={true}
      style={styles.modalContainer}
    >
      <View style={styles.container}>
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
              <Text style={styles.price}>${item.cost.toFixed(2)} (avg)</Text>
            </TouchableOpacity>
          )}
        />

        <View style={styles.buttonContainer}>
          <Button title="Return to School" onPress={onClose} />
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
    maxHeight: '90%',
  },
  header: {
    backgroundColor: '#28a745',
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    paddingTop: 60,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#28a745',
  },
  name: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#333',
  },
  price: {
    fontSize: 16,
    color: '#28a745',
    fontWeight: '600',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
});