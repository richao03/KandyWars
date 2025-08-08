import { Marquee } from '@animatereactnative/marquee';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFlavorText } from '../context/FlavorTextContext';
import { useGame } from '../context/GameContext';
import { useInventory } from '../context/InventoryContext';
import { useWallet } from '../context/WalletContext';

const locationNames = {
  'gym': 'Gymnasium',
  'cafeteria': 'Cafeteria', 
  'home room': 'Home Room',
  'library': 'Library',
  'science lab': 'Science Lab',
  'school yard': 'School Yard',
  'bathroom': 'Bathroom'
} as const;

export default function GameHUD() {
  const { balance, piggyBank } = useWallet();
  const { day, period, currentLocation } = useGame();
  const { getTotalInventoryCount, getInventoryLimit } = useInventory();
  const { text } = useFlavorText();

  const totalInventory = getTotalInventoryCount();
  const inventoryCapacity = getInventoryLimit();

  return (
    <View style={styles.container}>
      {/* Header with day/period */}
      <View style={styles.headerRow}>
        <Text style={styles.headerText}>Day {day} • Period {period}</Text>
      </View>
      
      {/* Stats in crayon boxes */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, styles.cashBox]}>
          <Text style={styles.statTitle}>My Money</Text>
          <Text style={styles.cashAmount}>${balance.toFixed(2)}</Text>
        </View>
        
        <View style={[styles.statBox, styles.piggyBox]}>
          <Text style={styles.statTitle}>Saved</Text>
          <Text style={styles.piggyAmount}>${piggyBank ? piggyBank.toFixed(2) : '0.00'}</Text>
        </View>
        
        <View style={[styles.statBox, styles.inventoryBox]}>
          <Text style={styles.statTitle}>Candy</Text>
          <Text style={styles.inventoryAmount}>{totalInventory}/{inventoryCapacity}</Text>
        </View>
      </View>

      {/* Location badge */}
      <View style={styles.locationRow}>
        <View style={styles.locationBadge}>
          <Text style={styles.locationText}>@ {locationNames[currentLocation]}</Text>
        </View>
      </View>

      {/* Flavor text scroll */}
      {text && (
        <View style={styles.flavorContainer}>
          <Marquee
            spacing={250}
            speed={.75}
            style={styles.marquee}
            delay={2000}
          >
            <Text style={styles.flavor}>{text}</Text>
          </Marquee>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fef7e3', // Warm cream paper background
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderColor: '#d4a574', // Brown crayon border
  },
  headerRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8b4513', // Saddle brown
    textShadow: '1px 1px 0px #e6d4b7',
    fontFamily: 'CrayonPastel',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  statBox: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cashBox: {
    backgroundColor: '#d4f6d4', // Light green crayon
    borderColor: '#4a7c4a',
  },
  piggyBox: {
    backgroundColor: '#ffd6e8', // Light pink crayon  
    borderColor: '#b85c8a',
  },
  inventoryBox: {
    backgroundColor: '#d6e8ff', // Light blue crayon
    borderColor: '#5c7cb8',
  },
  statTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5d4e37', // Dark brown
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'CrayonPastel',
  },
  cashAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d5a2d',
  },
  piggyAmount: {
    fontSize: 16,
    fontWeight: '700', 
    color: '#8a4a6b',
  },
  inventoryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4a5a8a',
  },
  locationRow: {
    alignItems: 'center',
    marginBottom: 10,
  },
  locationBadge: {
    backgroundColor: '#ffcc99', // Orange crayon
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#cc7a00',
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8b4513',
    fontFamily: 'CrayonPastel',
  },
  flavorContainer: {
    height: 28,
    overflow: 'hidden',
    backgroundColor: '#fff9e6', // Very light yellow
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: '#f4d03f', // Yellow crayon border
  },
  marquee: {
    flex: 1,
    height: '100%',
  },
  flavor: {
    fontSize: 13,
    color: '#7d6608', // Dark yellow-brown
    fontWeight: '500',
    lineHeight: 20,
    fontFamily: 'System', // Could be replaced with a more handwritten font
  },
});
