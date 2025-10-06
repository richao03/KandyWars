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
} from '../store/slices/eventHandlerSlice';
import { useInventory } from './useInventory';
import { useJokers } from './useJokers';
import { useWallet } from './useWallet';

export const useEventHandler = () => {
  const dispatch = useAppDispatch();
  const eventHandlerState = useAppSelector((state) => state.eventHandler);
  const wallet = useWallet();
  const { clearInventory } = useInventory();
  const { jokers } = useJokers();

  const handleEvent = useCallback(
    (eventData: any) => {
      // Create a unique ID for this event based on period and effect
      const eventId = `${eventData.period}_${eventData.effect}_${eventData.title}`;

      // Check if this exact event has already been processed
      if (eventHandlerState.processedEventIds?.includes(eventId)) {
        console.log('⏭️ EVENT: Already processed event', eventId, '- skipping duplicate');
        return;
      }

      console.log('🎯 EVENT: Processing event:', eventId);
      console.log('🎯 EVENT: Processed IDs so far:', eventHandlerState.processedEventIds);
      console.log(
        '🎯 EVENT: Received backgroundImage ID:',
        eventData.backgroundImage
      );

      // Check for protection jokers
      const hasMedievalShield = jokers.some(
        (j) => j.id.toString() === JOKER_IDS.MEDIEVAL_SHIELD.toString()
      );
      const hasCandyVault = jokers.some(
        (j) => j.id.toString() === JOKER_IDS.CANDY_VAULT.toString()
      );
      const hasHideAndSeek = jokers.some(
        (j) => j.id.toString() === JOKER_IDS.HIDE_AND_SEEK.toString()
      );

      // Create a mutable copy of eventData to add protection flags
      let processedEventData = { ...eventData };

      // Apply event effects immediately when event is triggered
      if (eventData.effect === 'LOSE_MONEY') {
        // Check for Medieval Shield protection
        if (hasMedievalShield) {
          console.log('🛡️ Medieval Shield: Protected from money loss!');
          // Add protection flag to event data
          processedEventData.protectedByMedievalShield = true;
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
            console.log('💸 EVENT: Bully has mercy - player has less than $1');
          } else {
            console.log(
              '💸 EVENT: Bully stealing $' + actualSteal.toFixed(2),
              'from balance of $' + currentBalance.toFixed(2),
              '(amount calculated: $' + amountToSteal.toFixed(2) + ')'
            );
            // Store the original balance and amount stolen for countdown animation
            processedEventData.originalBalance = currentBalance;
            processedEventData.amountStolen = actualSteal;
            wallet.spend(actualSteal);
          }
        }
      } else if (eventData.effect === 'FOUND_MONEY') {
        // Found money event
        let amountFound = eventData.dollarAmount || Math.floor(Math.random() * (500 - 100 + 1)) + 100;
        console.log('💰 EVENT: Found $', amountFound);
        if (hasHideAndSeek) {
          amountFound = amountFound * 3;
        }
        // Store the actual amount found (after joker multiplier) in the processed event
        processedEventData.dollarAmount = amountFound;
        wallet.add(amountFound);
      } else if (eventData.effect === 'STASH_LOCKED') {
        // Check for Candy Vault protection
        if (hasCandyVault) {
          console.log('🔒 Candy Vault: Protected from confiscation!');
          // Add protection flag to event data
          processedEventData.protectedByCandyVault = true;
        } else {
          // Teacher confiscates candy inventory
          console.log('📚 EVENT: Teacher confiscating all candy inventory');
          clearInventory();
        }
      }

      console.log(
        '🔄 EVENT: About to store in Redux - backgroundImage ID:',
        processedEventData.backgroundImage
      );
      dispatch(setCurrentEvent(processedEventData));
      console.log('🔄 EVENT: Stored in Redux successfully');
    },
    [dispatch, wallet, clearInventory, jokers]
  );

  const clearEvent = useCallback(() => {
    dispatch(clearCurrentEvent());
  }, [dispatch]);

  const dismissEvent = useCallback(() => {
    console.log('🎯 EVENT: Dismissing event modal');
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
    return eventHandlerState.currentEvent !== null;
  }, [eventHandlerState.currentEvent]);

  return {
    currentEvent: eventHandlerState.currentEvent,
    eventHistory: eventHandlerState.eventHistory,
    isProcessing: eventHandlerState.isProcessing,
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
