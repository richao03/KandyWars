import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCandySales } from '../../src/context/CandySalesContext';
import { useDailyStats } from '../../src/context/DailyStatsContext';
import { useEventHandler } from '../../src/context/EventHandlerContext';
import { useGame } from '../../src/context/GameContext';
import { useInventory } from '../../src/context/InventoryContext';
import { useJokers } from '../../src/context/JokerContext';
import { useSeed } from '../../src/context/SeedContext';
import { useWallet } from '../../src/context/WalletContext';
import { useDiamondHand } from '../../src/hooks/useDiamondHand';
import { useDroughtRelief } from '../../src/hooks/useDroughtRelief';
import { useEmptyInventoryBonus } from '../../src/hooks/useEmptyInventoryBonus';
import { usePriceDoubling } from '../../src/hooks/usePriceDoubling';
import { JokerService } from '../../src/utils/jokerService';
import DayStatsModal from '../components/DayStatsModal';
import DeliModal from '../components/DeliModal';
import EndOfDayModal from '../components/EndOfDayModal';
import EventModal from '../components/EventModal';
import GameHUD from '../components/GameHUD';
import LocationModal, { Location } from '../components/LocationModal';
import SleepConfirmModal from '../components/SleepConfirmModal';
import StashMoneyModal from '../components/StashMoneyModal';
import TransactionModal from '../components/TransactionModal';

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
  const { addSale, resetSales } = useCandySales();
  const [pendingLocationModal, setPendingLocationModal] = useState(false);
  const { activeEffects, jokers } = useJokers();
  const jokerService = JokerService.getInstance();
  usePriceDoubling(); // This hook handles price restoration on period change
  useEmptyInventoryBonus(); // This hook handles Embrace the Grind joker bonus
  const { recordSale } = useDiamondHand(); // This hook handles Diamond Hand joker bonus
  const { recordSale: recordDroughtSale } = useDroughtRelief(); // This hook handles Drought Relief joker bonus

  // Removed debug code
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
      cost: candy.baseMin, // Initialize with base minimum price
      quantityOwned: 0,
      averagePrice: null,
    }))
  );

  useEffect(() => {
    const currentInventoryLimit = getInventoryLimit();

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

        // Get the current price from game data, fallback to base range if not available
        let basePrice = gameData.candyPrices[candy.name]?.[periodCount];
        if (basePrice === undefined || basePrice === null) {
          // Fallback to a random price in base range
          basePrice =
            candy.baseMin + Math.random() * (candy.baseMax - candy.baseMin);
        }

        // Apply joker effects to the price (like Even Stevens)
        const modifiedPrice = jokerService.applyJokerEffects(
          basePrice,
          'candy_price',
          jokers,
          periodCount,
          currentInventoryLimit
        );

        const finalCost =
          currentEvent?.priceOverride !== undefined
            ? currentEvent.priceOverride
            : modifiedPrice;

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
  }, [
    periodCount,
    gameData,
    currentLocation,
    inventory,
    jokers,
    getInventoryLimit,
  ]);

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
  const [sleepConfirmModalVisible, setSleepConfirmModalVisible] = useState(false);

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
          if (balance < totalCost) {
            return candy;
          }

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

          // Reset consecutive sales tracking when buying
          resetSales();

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
          // Record sale for Diamond Hand tracking
          recordSale();

          // Record sale for Drought Relief tracking
          recordDroughtSale();

          // Check if this sale should get the 5x Candy Salad bonus
          const shouldApplyBonus = addSale(candy.name);
          const multiplier = shouldApplyBonus ? 5 : 1;

          const baseGain = candy.cost * quantity;
          const totalGain = baseGain * multiplier;

          add(totalGain);
          addProfit(totalGain); // Track daily profit
          addCandySold(quantity); // Track daily candy sales
          removeFromInventory(candy.name, quantity);

          // Show bonus notification if applied
          if (shouldApplyBonus) {
            setTimeout(() => {
              alert(
                `🥗 Candy Salad Bonus! 5x multiplier applied!\nBase gain: $${baseGain.toFixed(2)}\nBonus gain: $${totalGain.toFixed(2)}`
              );
            }, 100);
          }

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
    // Show confirmation modal instead of immediately ending the day
    setEndOfDayModalVisible(false);
    setSleepConfirmModalVisible(true);
  };

  const handleSleepConfirm = () => {
    // End the day and start new day
    setSleepConfirmModalVisible(false);
    incrementPeriod('home room'); // Start next day at home room
  };

  const handleSleepCancel = () => {
    // Return to end of day modal
    setSleepConfirmModalVisible(false);
    setEndOfDayModalVisible(true);
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
          <TouchableOpacity
            style={styles.nextPeriodButton}
            onPress={handleNextDay}
            activeOpacity={0.8}
          >
            <Text style={styles.nextPeriodButtonText}>
              {period === 8 ? '🏠 Leave School for the Day' : '⏰ Next Period'}
            </Text>
            <Text style={styles.nextPeriodSubtext}>
              {period === 8
                ? 'Time to head home!'
                : `Going to period ${period + 1}`}
            </Text>
          </TouchableOpacity>
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

      <SleepConfirmModal
        visible={sleepConfirmModalVisible}
        onConfirm={handleSleepConfirm}
        onCancel={handleSleepCancel}
        currentDay={day}
      />

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
    borderTopWidth: 3,
    borderColor: '#d4a574',
    padding: 10,
    alignItems: 'center',
  },
  nextPeriodButton: {
    backgroundColor: 'rgba(154,193,118,1)',
    paddingVertical: 8,
    paddingHorizontal: 32,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'rgba(123,169,101,1)',
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 280,
    alignItems: 'center',
  },
  nextPeriodButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    textShadowColor: '#166534',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  nextPeriodSubtext: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f0fdf4',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.9,
  },
});
