import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DayStatsModal from '../components/DayStatsModal';
import DeliModal from '../components/DeliModal';
import EndOfDayModal from '../components/EndOfDayModal';
import EventModal from '../components/EventModal';
import GameHUD from '../components/GameHUD';
import LocationModal, { Location } from '../components/LocationModal';
import StashMoneyModal from '../components/StashMoneyModal';
import TransactionModal from '../components/TransactionModal';
import { useDailyStats } from '../context/DailyStatsContext';
import { useEventHandler } from '../context/EventHandlerContext';
import { useGame } from '../context/GameContext';
import { useInventory } from '../context/InventoryContext';
import { useJokers } from '../context/JokerContext';
import { useSeed } from '../context/SeedContext';
import { useWallet } from '../context/WalletContext';
import { usePriceDoubling } from '../hooks/usePriceDoubling';

type CandyForMarket = Candy & {
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

export default function Market() {
  const {
    rng,
    seed,
    gameData,
    modifyCandyPrice,
    getOriginalCandyPrice,
    restoreCandyPrice,
  } = useSeed();

  const { balance, spend, add } = useWallet();
  const {
    inventory,
    addToInventory,
    removeFromInventory,
    getTotalInventoryCount,
    getInventoryLimit,
  } = useInventory();
  const {
    day,
    period,
    incrementPeriod,
    periodCount,
    currentLocation,
    startAfterSchool,
  } = useGame();
  const { hasActiveEvent } = useEventHandler();
  const { getTotalStats, addProfit, addSpent, addCandySold } = useDailyStats();
  const [pendingLocationModal, setPendingLocationModal] = useState(false);
  const { activeEffects } = useJokers();
  console.log('periodCount', periodCount);
  usePriceDoubling(); // This hook handles price restoration on period change

  // Show location modal after event modal is dismissed
  useEffect(() => {
    if (pendingLocationModal && !hasActiveEvent) {
      console.log('Market - Event dismissed, showing pending location modal');
      // Small delay to ensure event modal is fully dismissed
      setTimeout(() => {
        setLocationModalVisible(true);
        setPendingLocationModal(false);
      }, 200);
    }
  }, [hasActiveEvent, pendingLocationModal]);

  // Safety: Clear pending modal if location changes (period advanced)
  useEffect(() => {
    if (pendingLocationModal) {
      console.log('Market - Location/period changed, clearing pending modal');
      setPendingLocationModal(false);
    }
  }, [currentLocation, periodCount]);

  const [candies, setCandies] = useState<CandyForMarket[]>(() =>
    baseCandies.map((candy) => ({
      ...candy,
      cost: 0, // Will be set in useEffect
      quantityOwned: 0,
      averagePrice: null,
    }))
  );

  useEffect(() => {
    setCandies((prev) =>
      prev.map((candy) => {
        // Check for current location-specific events with price overrides
        const currentEvent = gameData.periodEvents.find(
          (e) =>
            e.period === periodCount &&
            e.location === currentLocation &&
            e.candy === candy.name &&
            e.priceOverride !== undefined
        );

        // Get the current price from game data (which may already be modified by joker)
        const finalCost =
          currentEvent?.priceOverride !== undefined
            ? currentEvent.priceOverride
            : gameData.candyPrices[candy.name][periodCount];

        // Get inventory information for this candy
        const inventoryItem = inventory[candy.name];

        return {
          ...candy,
          cost: finalCost,
          quantityOwned: inventoryItem?.quantity || 0,
          averagePrice: inventoryItem?.averagePrice || null,
        };
      })
    );
  }, [periodCount, gameData, currentLocation, inventory]);

  const [selectedCandyIndex, setSelectedCandyIndex] = useState<number | null>(
    null
  );
  const [modalMode, setModalMode] = useState<'buy' | 'sell'>('buy');
  const [isTransactionModalOpening, setIsTransactionModalOpening] =
    useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [dayStatsModalVisible, setDayStatsModalVisible] = useState(false);
  const [endOfDayModalVisible, setEndOfDayModalVisible] = useState(false);
  const [stashMoneyModalVisible, setStashMoneyModalVisible] = useState(false);
  const [completedActivities, setCompletedActivities] = useState({
    studiedHome: false,
    stashedMoney: false,
    visitedDeli: false,
  });
  const [deliModalVisible, setDeliModalVisible] = useState(false);

  const openModal = useCallback((index: number) => {
    setIsTransactionModalOpening(true);
    setSelectedCandyIndex(index);
    setModalMode('buy'); // default to buy, but modal will let user pick
  }, []);

  const closeModal = () => {
    setIsTransactionModalOpening(false);
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

          // Try to add to inventory first - this will check inventory limits
          const inventorySuccess = addToInventory(
            candy.name,
            quantity,
            candy.cost
          );
          if (!inventorySuccess) {
            // Inventory is full, transaction fails
            return candy;
          }

          spend(totalCost);
          addSpent(totalCost); // Track daily spending

          const newQty = candy.quantityOwned + quantity;
          const newAvg =
            candy.averagePrice === null
              ? candy.cost
              : (candy.averagePrice * candy.quantityOwned +
                  candy.cost * quantity) /
                newQty;

          return {
            ...candy,
            quantityOwned: newQty,
            averagePrice: newAvg,
          };
        } else {
          const totalGain = candy.cost * quantity;
          add(totalGain);
          addProfit(totalGain); // Track daily profit
          addCandySold(quantity); // Track daily candy sales
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

  const handleNextDay = () => {
    if (period === 8) {
      // End of day - show day stats first
      setDayStatsModalVisible(true);
    } else {
      // Check if there's an active event
      if (hasActiveEvent) {
        console.log(
          'Market - Active event detected, will show location modal after event is dismissed'
        );
        setPendingLocationModal(true);
      } else {
        console.log(
          'Market - No active event, showing location modal immediately'
        );
        setLocationModalVisible(true);
      }
    }
  };

  const handleLocationSelect = (location: Location) => {
    console.log('Market - Location selected:', location);
    setLocationModalVisible(false); // Ensure modal closes
    incrementPeriod(location);
  };

  // Day stats modal handler
  const handleDayStatsClose = () => {
    setDayStatsModalVisible(false);
    // Enter after school mode and navigate
    startAfterSchool();
    router.push('/(tabs)/after-school');
  };

  // End of day handlers
  const handleGoHome = () => {
    console.log('Going home to study...');
    setEndOfDayModalVisible(false);
    // Navigate to the study page
    router.push('/study');
  };

  const handleStashMoney = () => {
    setEndOfDayModalVisible(false);
    setStashMoneyModalVisible(true);
  };

  const handleGoDeli = () => {
    setEndOfDayModalVisible(false);
    setDeliModalVisible(true);
  };

  const handleGoToSleep = () => {
    // End the day and start new day
    setEndOfDayModalVisible(false);
    incrementPeriod('home room'); // Start next day at home room
  };

  const handleMoneyStashed = () => {
    setStashMoneyModalVisible(false);
    // Mark stashing as completed and return to end-of-day modal
    setCompletedActivities((prev) => ({ ...prev, stashedMoney: true }));
    setEndOfDayModalVisible(true);
  };

  // Handle returning from deli
  const handleDeliReturn = () => {
    setDeliModalVisible(false);
    setCompletedActivities((prev) => ({ ...prev, visitedDeli: true }));
    setEndOfDayModalVisible(true);
  };

  const selectedCandy =
    selectedCandyIndex !== null ? candies[selectedCandyIndex] : null;

  // Calculate max buy quantity considering both money and inventory space
  const totalInventory = getTotalInventoryCount();
  const inventoryCapacity = getInventoryLimit();
  const availableInventorySpace = inventoryCapacity - totalInventory;

  const maxBuyQty =
    selectedCandy && selectedCandy.cost > 0
      ? Math.min(
          Math.floor(balance / selectedCandy.cost), // Money constraint
          availableInventorySpace // Inventory space constraint
        )
      : 0;

  const maxSellQty = selectedCandy ? selectedCandy.quantityOwned : 0;

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/images/school.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <GameHUD
          isModalOpening={isTransactionModalOpening}
          isModalOpen={selectedCandyIndex !== null}
        />
        <FlatList
          data={candies}
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.list}
          renderItem={useCallback(
            ({ item, index }) => {
              return (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => openModal(index)}
                >
                  <View style={styles.candyInfo}>
                    <View style={styles.candyNameRow}>
                      <Text style={styles.name}>{item.name}</Text>
                      {item.quantityOwned > 0 && (
                        <View style={styles.ownedBadge}>
                          <Text style={styles.ownedText}>
                            {item.quantityOwned}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.price}>
                      ${item.cost ? item.cost.toFixed(2) : '0.00'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            },
            [openModal]
          )}
        />
        <View style={styles.buttonContainer}>
          <Button
            title={period === 8 ? 'Leave School for the Day' : 'Next Period'}
            onPress={handleNextDay}
          />
        </View>
      </ImageBackground>

      <LocationModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        onSelectLocation={handleLocationSelect}
      />

      <DayStatsModal
        visible={dayStatsModalVisible}
        onClose={handleDayStatsClose}
        stats={getTotalStats()}
        day={day}
      />

      <EndOfDayModal
        visible={endOfDayModalVisible}
        onClose={() => setEndOfDayModalVisible(false)}
        onGoHome={handleGoHome}
        onStashMoney={handleStashMoney}
        onGoDeli={handleGoDeli}
        onGoToSleep={handleGoToSleep}
        completedActivities={completedActivities}
      />

      <StashMoneyModal
        visible={stashMoneyModalVisible}
        onClose={() => setStashMoneyModalVisible(false)}
        onConfirm={handleMoneyStashed}
      />

      <DeliModal visible={deliModalVisible} onClose={handleDeliReturn} />

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

      {/* EventModal for special events */}
      <EventModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fefaf5', // Warm off-white paper (fallback)
  },
  backgroundImage: {
    flex: 1,
  },
  list: {
    padding: 16,
  },
  item: {
    marginBottom: 12,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#d4a574', // Brown crayon border
    shadowColor: '#8b4513',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  candyInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  candyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontWeight: '700',
    fontSize: 19,
    color: '#6b4423', // Dark brown crayon
    textShadow: '0.5px 0.5px 0px #d4a574',
    fontFamily: 'CrayonPastel',
  },
  ownedBadge: {
    backgroundColor: '#4ade80',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  ownedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'CrayonPastel',
  },
  price: {
    fontSize: 17,
    fontWeight: '700',
    color: '#8b0000', // Dark red crayon
    backgroundColor: '#ffe6e6', // Light red background
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffb3b3',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
});
