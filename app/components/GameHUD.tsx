import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFlavorText } from '../context/FlavorTextContext';
import { useGame } from '../context/GameContext';
import { useInventory } from '../context/InventoryContext';
import { useWallet } from '../context/WalletContext';

export default function GameHUD() {
  const { balance } = useWallet();
  const { day, period } = useGame();
  const { getTotalInventoryCount, getInventoryLimit } = useInventory();
  const { text } = useFlavorText();

  const totalInventory = getTotalInventoryCount();
  const inventoryCapacity = getInventoryLimit();

  return (
    <View style={styles.container}>
      <Text style={styles.stats}>
        💵 ${balance.toFixed(2)}   📦 {totalInventory}/{inventoryCapacity}   📅 Period {period} / 8 - Day {day} / 5
      </Text>
      {text && <Text style={styles.flavor}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f3f3f3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  stats: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  flavor: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});
