import { useCallback } from 'react';
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
import { useWallet } from './useWallet';

export const useEventHandler = () => {
  const dispatch = useAppDispatch();
  const eventHandlerState = useAppSelector((state) => state.eventHandler);
  const { balance, spend, add } = useWallet();
  const { clearInventory } = useInventory();

  const handleEvent = useCallback(
    (eventData: any) => {
      console.log(
        '🎯 EVENT: Processing event effect:',
        eventData.effect,
        'for event:',
        eventData.title
      );
      console.log(
        '🎯 EVENT: Received backgroundImage ID:',
        eventData.backgroundImage
      );

      // Apply event effects immediately when event is triggered
      if (eventData.effect === 'LOSE_MONEY') {
        // Bully steals 50% of money (or specific amount)
        const amountToSteal =
          eventData.dollarAmount || Math.floor(balance * 0.5);
        const actualSteal = Math.min(amountToSteal, balance);
        console.log(
          '💸 EVENT: Bully stealing $',
          actualSteal,
          'from balance of $',
          balance
        );
        spend(actualSteal);
      } else if (eventData.effect === 'FOUND_MONEY') {
        // Found money event
        const amountFound = eventData.dollarAmount || 50;
        console.log('💰 EVENT: Found $', amountFound);
        add(amountFound);
      } else if (eventData.effect === 'STASH_LOCKED') {
        // Teacher confiscates candy inventory
        console.log('📚 EVENT: Teacher confiscating all candy inventory');
        clearInventory();
      }

      console.log(
        '🔄 EVENT: About to store in Redux - backgroundImage ID:',
        eventData.backgroundImage
      );
      dispatch(setCurrentEvent(eventData));
      console.log('🔄 EVENT: Stored in Redux successfully');
    },
    [dispatch, balance, spend, add, clearInventory]
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
