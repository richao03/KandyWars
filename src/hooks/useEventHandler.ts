import { useCallback } from 'react';
import { JOKER_IDS } from '../constants/jokerIds';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  addToEventHistory,
  clearCurrentEvent,
  clearEventHistory,
  resetEventHandler,
  setCurrentEvent,
  setIsProcessing,
  selectCurrentEvent,
  selectEventHistory,
  selectIsEventProcessing,
  selectProcessedEventIds,
} from '../store/slices/eventHandlerSlice';
import { recordConfiscation } from '../store/slices/dailyStatsSlice';
import { selectActiveEffects, consumeEffect } from '../store/slices/merchantSlice';
import { removeJoker } from '../store/slices/jokerSlice';
import { selectPeriodCount } from '../store/slices/gameSlice';
import { STANDARDIZED_JOKERS } from '../utils/jokerEffectEngine';
import { useInventory } from './useInventory';
import { useJokers } from './useJokers';
import { useWallet } from './useWallet';
import { MerchantUtils } from '../utils/merchantUtils';

/**
 * Deterministic hash function for seeded random from an event ID string.
 * Returns a number between 0 and 1.
 */
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Normalize to 0-1 range
  return Math.abs((Math.sin(hash) * 10000) % 1);
}

/**
 * Deterministic shuffle using a seed string.
 * Returns a new shuffled array without mutating the original.
 */
function seededShuffle<T>(array: T[], seed: string): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const r = seededRandom(seed + '_shuffle_' + i);
    const j = Math.floor(r * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const useEventHandler = () => {
  const dispatch = useAppDispatch();
  // Subscribe to individual fields instead of entire eventHandler slice
  const currentEvent = useAppSelector(selectCurrentEvent);
  const eventHistory = useAppSelector(selectEventHistory);
  const isProcessing = useAppSelector(selectIsEventProcessing);
  const processedEventIds = useAppSelector(selectProcessedEventIds);
  const wallet = useWallet();
  const { clearInventory, inventory, removeFromInventory } = useInventory();
  const { jokers } = useJokers();
  const selectedPassIds = useAppSelector((state) => state.hallPass.selectedPassIds);
  const merchantEffects = useAppSelector(selectActiveEffects);
  const periodCount = useAppSelector(selectPeriodCount);

  const handleEvent = useCallback(
    (eventData: any) => {
      // Safety guard: Only handle major events (FOUND_MONEY, LOSE_MONEY, STASH_LOCKED)
      // Minor events (PRICE_SPIKE, PRICE_DROP) should be handled in market.tsx via flavor text only
      if (eventData.effect === 'PRICE_SPIKE' || eventData.effect === 'PRICE_DROP') {
        if (__DEV__) console.warn('⚠️ EVENT: Minor event should not reach handleEvent, use flavor text instead');
        return;
      }

      // Create a unique ID for this event based on period and effect
      const eventId = `${eventData.period}_${eventData.effect}_${eventData.title}`;

      // Check if this exact event has already been processed
      if (processedEventIds?.includes(eventId)) {
        if (__DEV__) console.log('⏭️ EVENT: Already processed event', eventId, '- skipping duplicate');
        return;
      }

      if (__DEV__) {
        console.log('🎯 EVENT: Processing event:', eventId);
        console.log('🎯 EVENT: Processed IDs so far:', processedEventIds);
        console.log(
          '🎯 EVENT: Received backgroundImage ID:',
          eventData.backgroundImage
        );
      }

      // Check for protection jokers
      const hasSafeHouse = jokers.some(
        (j) => j.id.toString() === JOKER_IDS.SAFE_HOUSE.toString()
      );

      // Create a mutable copy of eventData to add protection flags
      let processedEventData = { ...eventData };

      // Apply event effects immediately when event is triggered
      if (eventData.effect === 'LOSE_MONEY') {
        // Check for Safe House protection (joker) - PRIORITY 1
        if (hasSafeHouse) {
          if (__DEV__) console.log('🛡️ Safe House: Protected from money loss!');
          processedEventData.protectedByMedievalShield = true;
          dispatch(removeJoker(JOKER_IDS.SAFE_HOUSE.toString()));
        }
        // Check for 6th Grade Bodyguard protection (merchant item) - PRIORITY 2
        else if (MerchantUtils.hasBodyguard(merchantEffects)) {
          if (__DEV__) console.log('💪 6th Grade Bodyguard: Protected from bully!');
          processedEventData.protectedByBodyguard = true;
          // Consume one bodyguard
          dispatch(consumeEffect({ itemId: 'sixth_grade_bodyguard' }));
        } else {
          // Get CURRENT balance at time of execution, not stale closure value
          const currentBalance = wallet.balance;

          // Bully steals 50% of money (or specific amount)
          const amountToSteal =
            eventData.dollarAmount || Math.round(currentBalance * 0.5 * 100) / 100;
          const actualSteal = Math.min(amountToSteal, currentBalance);

          // Check if player has less than $1
          if (currentBalance < 1) {
            processedEventData.bullyHasMercy = true;
            if (__DEV__) console.log('💸 EVENT: Bully has mercy - player has less than $1');
          } else {
            if (__DEV__) {
              console.log(
                '💸 EVENT: Bully stealing $' + actualSteal.toFixed(2),
                'from balance of $' + currentBalance.toFixed(2),
                '(amount calculated: $' + amountToSteal.toFixed(2) + ')'
              );
            }
            // Store the original balance and amount stolen for countdown animation
            processedEventData.originalBalance = currentBalance;
            processedEventData.amountStolen = actualSteal;
            wallet.spend(actualSteal);
          }
        }
      } else if (eventData.effect === 'FOUND_MONEY') {
        // Found money event — 25% of current wallet balance (min $100)
        const currentBalance = wallet.balance;
        let amountFound = Math.max(Math.floor(currentBalance * 0.25), 100);
        if (__DEV__) console.log('💰 EVENT: Found $', amountFound, `(25% of $${currentBalance})`);

        // Apply Metal Detector merchant multiplier
        amountFound = MerchantUtils.applyFoundMoneyMultiplier(amountFound, merchantEffects);

        // Store the actual amount found (after all multipliers) in the processed event
        processedEventData.dollarAmount = amountFound;
        wallet.add(amountFound);
      } else if (eventData.effect === 'STASH_LOCKED') {
        // Check for Safe House protection (joker) - PRIORITY 1
        if (hasSafeHouse) {
          if (__DEV__) console.log('🔒 Safe House: Protected from confiscation!');
          processedEventData.protectedByCandyVault = true;
          dispatch(removeJoker(JOKER_IDS.SAFE_HOUSE.toString()));
        }
        // Check for Hall Monitor Bribe protection (merchant item) - PRIORITY 2
        else if (MerchantUtils.hasHallMonitorBribe(merchantEffects)) {
          if (__DEV__) console.log('🤝 Hall Monitor Bribe: Protected from confiscation!');
          processedEventData.protectedByHallMonitorBribe = true;
          // Consume one bribe
          dispatch(consumeEffect({ itemId: 'hall_monitor_bribe' }));
        } else {
          // Check for Teachers Pet protection (reduces confiscation to 25%)
          const hasTeachersPet = selectedPassIds.includes('teachers_pet');

          if (hasTeachersPet) {
            // Teacher's Pet: Only confiscate 25% of inventory
            if (__DEV__) console.log("📚 EVENT: Teacher's Pet active - confiscating 25% of inventory");
            let totalConfiscated = 0;
            inventory.forEach(item => {
              const confiscateAmount = Math.floor((item.quantity || 1) * 0.25);
              totalConfiscated += confiscateAmount;
              if (confiscateAmount > 0) {
                removeFromInventory(item.id, confiscateAmount);
              }
            });
            if (__DEV__) console.log('📚 EVENT: Confiscated', totalConfiscated, 'candies (25%)');
            processedEventData.reducedByTeachersPet = true;
            processedEventData.confiscatedAmount = totalConfiscated;
          } else {
            // Teacher confiscates all candy inventory
            if (__DEV__) console.log('📚 EVENT: Teacher confiscating all candy inventory');
            clearInventory();
          }

          // Track confiscation for hall pass unlock
          dispatch(recordConfiscation());
        }
      }

      // === Detention Discovery: consolation joker drop after surviving negative events ===
      const wasActuallyHurt =
        (eventData.effect === 'LOSE_MONEY' &&
          !processedEventData.protectedByMedievalShield &&
          !processedEventData.protectedByBodyguard &&
          !processedEventData.bullyHasMercy) ||
        (eventData.effect === 'STASH_LOCKED' &&
          !processedEventData.protectedByCandyVault &&
          !processedEventData.protectedByHallMonitorBribe);

      // Don't trigger on the very first period of the game (let player learn the system)
      const isFirstEvent = periodCount <= 1;

      console.log('🎲 DETENTION PRE-CHECK:', {
        effect: eventData.effect,
        wasActuallyHurt,
        isFirstEvent,
        periodCount,
        protectedByShield: processedEventData.protectedByMedievalShield,
        protectedByBodyguard: processedEventData.protectedByBodyguard,
        bullyHasMercy: processedEventData.bullyHasMercy,
        protectedByCandyVault: processedEventData.protectedByCandyVault,
        protectedByBribe: processedEventData.protectedByHallMonitorBribe,
      });

      if (wasActuallyHurt && !isFirstEvent) {
        // Determine severity: "particularly bad" = lost > $500 or full confiscation
        const isSevere =
          (processedEventData.amountStolen && processedEventData.amountStolen > 500) ||
          (eventData.effect === 'STASH_LOCKED' && !processedEventData.reducedByTeachersPet);

        const dropChance = isSevere ? 0.35 : 0.25;

        // Deterministic roll based on event ID
        const roll = seededRandom(eventId + '_detention');

        if (__DEV__) {
          console.log(`🎲 DETENTION: Roll ${roll.toFixed(3)} vs chance ${dropChance} (severe: ${isSevere})`);
        }

        if (roll < dropChance) {
          // Find jokers the player doesn't already own
          const ownedIds = new Set(jokers.map((j) => j.id.toString()));
          const unownedJokers = STANDARDIZED_JOKERS.filter(
            (sj) => !ownedIds.has(sj.id.toString())
          );

          if (unownedJokers.length > 0) {
            // Pick up to 2 random unowned jokers using deterministic shuffle
            const shuffled = seededShuffle(unownedJokers, eventId + '_joker_pick');
            const choices = shuffled.slice(0, Math.min(2, unownedJokers.length));

            processedEventData.hasJokerDrop = true;
            processedEventData.detentionJokerChoices = choices;

            if (__DEV__) {
              console.log('🎁 DETENTION: Joker drop! Choices:', choices.map((c: any) => c.name));
            }
          }
        }
      }

      if (__DEV__) {
        console.log(
          '🔄 EVENT: About to store in Redux - backgroundImage ID:',
          processedEventData.backgroundImage
        );
      }
      dispatch(setCurrentEvent(processedEventData));
      if (__DEV__) console.log('🔄 EVENT: Stored in Redux successfully');
    },
    [dispatch, wallet, clearInventory, jokers, inventory, removeFromInventory, selectedPassIds, merchantEffects, periodCount]
  );

  const clearEvent = useCallback(() => {
    dispatch(clearCurrentEvent());
  }, [dispatch]);

  const dismissEvent = useCallback(() => {
    if (__DEV__) console.log('🎯 EVENT: Dismissing event modal');
    dispatch(clearCurrentEvent());
  }, [dispatch]);

  const getTheme = useCallback((category: 'good' | 'neutral' | 'bad') => {
    switch (category) {
      case 'good':
        return {
          backgroundColor: '#d4f6d4', // Light green
          borderColor: '#d4f6d4',
          titleColor: '#d4f6d4',
          textColor: '#d4f6d4',
          buttonColor: '#4ade80',
          containerColor: 'rgba(0, 0, 0, 0.2)',
        };
      case 'bad':
        return {
          backgroundColor: '#ffffff', // Light red
          borderColor: '#ffffff',
          titleColor: '#ffffff',
          textColor: '#ffffff',
          buttonColor: '#ef4444',
          containerColor: 'rgba(0, 0, 0, 0.2)',
        };
      default: // neutral
        return {
          backgroundColor: '#fff2d6', // Light gold
          borderColor: '#b8a05c',
          titleColor: '#d4f6d4',
          textColor: '#d4f6d4',
          buttonColor: '#fbbf24',
          containerColor: 'rgba(128, 128, 0, 0.2)',
        };
    }
  }, []);

  const setProcessing = useCallback(
    (isProcessing: boolean) => {
      dispatch(setIsProcessing(isProcessing));
    },
    [dispatch]
  );

  const addHistoryEntry = useCallback(
    (eventData: any) => {
      dispatch(addToEventHistory(eventData));
    },
    [dispatch]
  );

  const clearHistory = useCallback(() => {
    dispatch(clearEventHistory());
  }, [dispatch]);

  const reset = useCallback(() => {
    dispatch(resetEventHandler());
  }, [dispatch]);

  const hasActiveEvent = useCallback(() => {
    return currentEvent !== null;
  }, [currentEvent]);

  return {
    currentEvent,
    eventHistory,
    isProcessing,
    hasActiveEvent,
    handleEvent,
    clearEvent,
    dismissEvent,
    getTheme,
    setProcessing,
    addHistoryEntry,
    clearHistory,
    reset,
  };
};
