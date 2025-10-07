import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { JOKER_IDS, findJokerById } from '../src/constants/jokerIds';
import { useGame } from '../src/hooks/useGame';
import { useInventory } from '../src/hooks/useInventory';
import { useJokers } from '../src/hooks/useJokers';
import { useSeed } from '../src/hooks/useSeed';
import { useWallet } from '../src/hooks/useWallet';
import GameHUD from './components/GameHUD';
import PixelBorder from './components/PixelBorder';
import TransactionModal from './components/TransactionModal';
import { Candy } from './types';
import colors from '../src/constants/colors';


type CandyForDeli = Candy & {
  cost: number;
  quantityOwned: number;
  averagePrice: number | null;
};

const baseCandies = [
  { name: 'Snickers', baseMin: 1.5, baseMax: 20 },
  { name: 'M&Ms', baseMin: 2.0, baseMax: 35 },
  { name: 'Skittles', baseMin: 1, baseMax: 22 },
  { name: 'Warheads', baseMin: 0.5, baseMax: 10 },
  { name: 'Sour Patch Kids', baseMin: 1.8, baseMax: 30 },
  { name: 'Bubble Gum', baseMin: 0.1, baseMax: 7 },
  { name: 'Jaw Breaker', baseMin: 3, baseMax: 50 },
];

interface DeliPageProps {
  onBack?: () => void;
}

export default function Deli({ onBack }: DeliPageProps = {}) {
  const { gameData } = useSeed();
  const { balance, spend, add } = useWallet();
  const { inventory, addToInventory, removeFromInventory } = useInventory();
  const { day } = useGame();
  const { jokers } = useJokers();

  // Check for The Good Old Days joker (provides deli discount)
  const vendorKickbackJoker = findJokerById(
    jokers,
    JOKER_IDS.THE_GOOD_OLD_DAYS
  );

  const [candies, setCandies] = useState<CandyForDeli[]>(() =>
    baseCandies.map((candy) => {
      // Calculate average price across all periods
      const prices = gameData.candyPrices[candy.name];
      let averageCost =
        prices.reduce((sum, price) => sum + price, 0) / prices.length;

      // Apply Vendor Kickback discount if joker is present
      if (vendorKickbackJoker) {
        averageCost = averageCost * 0.5; // 50% discount
      }

      // Get inventory information for this candy
      const inventoryItem = inventory.find((item) => item.name === candy.name);

      return {
        ...candy,
        cost: parseFloat(averageCost.toFixed(2)),
        quantityOwned: inventoryItem?.quantity || 0,
        averagePrice: inventoryItem?.price || null,
      };
    })
  );

  const [selectedCandyIndex, setSelectedCandyIndex] = useState<number | null>(
    null
  );
  const [modalMode, setModalMode] = useState<'buy' | 'sell'>('buy');

  // Pulsating glow animation
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulsate = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    );
    pulsate.start();
    return () => pulsate.stop();
  }, [glowAnim]);

  const shadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.9],
  });

  const shadowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 16],
  });

  // Update candy prices when jokers or inventory changes
  useEffect(() => {
    const currentVendorKickbackJoker = findJokerById(
      jokers,
      JOKER_IDS.THE_GOOD_OLD_DAYS
    );

    setCandies(
      baseCandies.map((candy) => {
        // Calculate average price across all periods
        const prices = gameData.candyPrices[candy.name];
        let averageCost =
          prices.reduce((sum, price) => sum + price, 0) / prices.length;

        // Apply Vendor Kickback discount if joker is present
        if (currentVendorKickbackJoker) {
          averageCost = averageCost * 0.5; // 50% discount
          console.log(
            `🏪 Vendor Kickback: Applied 50% discount to ${candy.name} at deli`
          );
        }

        // Get inventory information for this candy
        const inventoryItem = inventory.find((item) => item.name === candy.name);

        return {
          ...candy,
          cost: parseFloat(averageCost.toFixed(2)),
          quantityOwned: inventoryItem?.quantity || 0,
          averagePrice: inventoryItem?.price || null,
        };
      })
    );
  }, [jokers, gameData, inventory]);

  const openModal = (index: number) => {
    setSelectedCandyIndex(index);
    setModalMode('buy');
  };

  const closeModal = () => {
    setSelectedCandyIndex(null);
  };

  const handleTransaction = (quantity: number, mode: 'buy' | 'sell') => {
    if (selectedCandyIndex === null) return;

    const candy = candies[selectedCandyIndex];
    if (!candy) return;

    if (mode === 'buy') {
      const totalCost = candy.cost * quantity;
      if (balance < totalCost) return;

      spend(totalCost);
      addToInventory(candy.name, quantity, candy.cost);
      console.log(
        '🍭 Deli: Bought candy:',
        candy.name,
        'quantity:',
        quantity,
        'price:',
        candy.cost,
        'totalCost:',
        totalCost
      );
    } else {
      const totalGain = candy.cost * quantity;
      console.log(
        '🍭 Deli: Selling candy:',
        candy.name,
        'quantity:',
        quantity,
        'price:',
        candy.cost,
        'totalGain:',
        totalGain
      );
      add(totalGain);
      removeFromInventory(candy.name, quantity);
    }

    closeModal();
  };

  const handleReturnToAfterSchool = () => {
    // Trigger success haptic feedback when going back to after school
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (onBack) {
      onBack();
    } else {
      router.replace('/(tabs)/after-school');
    }
  };

  const selectedCandy =
    selectedCandyIndex !== null ? candies[selectedCandyIndex] : null;
  const maxBuyQty =
    selectedCandy && selectedCandy.cost > 0
      ? Math.floor(balance / selectedCandy.cost)
      : 0;
  const maxSellQty = selectedCandy ? selectedCandy.quantityOwned : 0;

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#2d1b69" />
      <GameHUD
        theme="evening"
        customHeaderText={`After School - Day ${day}`}
        customLocationText="Peaceful Evening"
      />
      <View style={styles.contentContainer}>
        {vendorKickbackJoker && (
          <PixelBorder
            borderColor="#22c55e"
            borderWidth={3}
            backgroundColor="rgba(34, 197, 94, 0.9)"
            innerPadding={12}
            style={styles.discountBanner}
          >
            <Text style={styles.discountText}>
              🤝 Vendor Kickback Active - All prices 50% off!
            </Text>
          </PixelBorder>
        )}

        <FlatList
          data={candies}
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <View style={{ marginBottom: 8 }}>
              <PixelBorder
                borderColor="#ff6b35"
                borderWidth={3}
                backgroundColor="rgba(255, 255, 255, 0.9)"
                innerPadding={12}
              >
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => openModal(index)}
                  activeOpacity={0.8}
                >
                  <View style={styles.itemHeader}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.price}>${item.cost.toFixed(2)}</Text>
                  </View>
                  <View style={styles.itemDetails}>
                    <Text style={styles.owned}>
                      Owned: {item.quantityOwned}
                    </Text>
                    <Text style={styles.avgPrice}>
                      Avg Cost:{' '}
                      {item.averagePrice !== null
                        ? `$${item.averagePrice.toFixed(2)}`
                        : '—'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </PixelBorder>
            </View>
          )}
        />

        <View style={styles.buttonContainer}>
          <Animated.View
            style={{
              shadowColor: colors.orange.primary,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: shadowOpacity,
              shadowRadius: shadowRadius,
              elevation: 10,
            }}
          >
            <PixelBorder
              borderColor="#ff6b35"
              borderWidth={4}
              backgroundColor="rgba(13, 51, 81, 0.95)"
              innerPadding={12}
              style={styles.header}
            >
              <View style={styles.signContainer}>
                <View style={styles.storeBranding}></View>
                <Text style={styles.title}>CORNER DELI</Text>
                <View style={styles.neonStrip} />
                <Text style={styles.subtitle}>
                  CANDY • STEADY PRICES • ALWAYS OPEN
                </Text>
              </View>
            </PixelBorder>
          </Animated.View>
          <PixelBorder
            borderColor="rgba(185,28,28,1)"
            borderWidth={3}
            backgroundColor="rgba(239,68,68,1)"
            innerPadding={0}
            style={styles.backButton}
          >
            <TouchableOpacity
              style={styles.backButtonInner}
              onPress={handleReturnToAfterSchool}
              activeOpacity={0.8}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </PixelBorder>
        </View>
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
    backgroundColor: '#2d1b69', // Deep purple/blue like Circle K or Wawa
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  signContainer: {
    alignItems: 'center',
    width: '100%',
  },
  storeBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  storeNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.orange.primary,
    fontFamily: 'PixeloidMono',
    textShadowColor: '#ffaa66',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.orange.primary,
  },
  separatorLine: {
    width: 20,
    height: 3,
    backgroundColor: colors.orange.primary,
    shadowColor: colors.orange.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 5,
  },
  neonStrip: {
    width: '80%',
    height: 4,
    backgroundColor: '#ff1493',
    marginVertical: 6,
    shadowColor: '#ff1493',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
    borderRadius: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.white,
    fontFamily: 'PixeloidMono',
    textShadowColor: colors.orange.primary,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#ff1493',
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
    textShadowColor: '#660033',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 1,
  },
  list: {
    padding: 0,
    paddingBottom: 16,
  },
  item: {
    flexDirection: 'column',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d1b69', // Dark blue like 7-Eleven
    fontFamily: 'PixeloidMono',
    flex: 1,
  },
  price: {
    fontSize: 18,
    color: colors.orange.primary, // Orange pricing
    fontWeight: '800',
    fontFamily: 'PixeloidMono',
    textShadowColor: '#cc5529',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  owned: {
    fontSize: 14,
    color: colors.gray.medium,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
  },
  avgPrice: {
    fontSize: 14,
    color: colors.gray.medium,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
  },
  buttonContainer: {
    borderTopColor: colors.orange.primary,
    borderTopWidth: 3,
    alignItems: 'center',
  },
  backButton: {
    shadowColor: colors.red.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  backButtonInner: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PixeloidMono',
    textShadowColor: colors.red.dark,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  backButtonSubtext: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fef2f2',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  discountBanner: {
    marginBottom: 12,
    shadowColor: colors.green.success,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  discountText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    textShadowColor: '#166534',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
