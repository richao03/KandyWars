import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setCurrentEvent,
  clearCurrentEvent,
  setIsProcessing,
  addToEventHistory,
  clearEventHistory,
  resetEventHandler,
} from '../store/slices/eventHandlerSlice';
import { useWallet } from './useWallet';
import { useInventory } from './useInventory';

export const useEventHandler = () => {
  const dispatch = useAppDispatch();
  const eventHandlerState = useAppSelector(state => state.eventHandler);
  const { balance, spend, add } = useWallet();
  const { clearInventory } = useInventory();

  const handleEvent = useCallback((eventData: any) => {
    console.log('🎯 EVENT: Processing event effect:', eventData.effect, 'for event:', eventData.title);

    // Apply event effects immediately when event is triggered
    if (eventData.effect === 'LOSE_MONEY') {
      // Bully steals 50% of money (or specific amount)
      const amountToSteal = eventData.dollarAmount || Math.floor(balance * 0.5);
      const actualSteal = Math.min(amountToSteal, balance);
      console.log('💸 EVENT: Bully stealing $', actualSteal, 'from balance of $', balance);
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

    dispatch(setCurrentEvent(eventData));
  }, [dispatch, balance, spend, add, clearInventory]);

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
          borderColor: '#4a7c4a',
          titleColor: '#2d5a2d',
          textColor: '#1a3a1a',
          buttonColor: '#4ade80',
          containerColor: 'rgba(0, 128, 0, 0.2)',
        };
      case 'bad':
        return {
          backgroundColor: '#ffd6d6', // Light red
          borderColor: '#b85c5c',
          titleColor: '#8a2d2d',
          textColor: '#5a1a1a',
          buttonColor: '#ef4444',
          containerColor: 'rgba(128, 0, 0, 0.2)',
        };
      default: // neutral
        return {
          backgroundColor: '#fff2d6', // Light gold
          borderColor: '#b8a05c',
          titleColor: '#8a7a4a',
          textColor: '#5a4a2a',
          buttonColor: '#fbbf24',
          containerColor: 'rgba(128, 128, 0, 0.2)',
        };
    }
  }, []);

  const setProcessing = useCallback((isProcessing: boolean) => {
    dispatch(setIsProcessing(isProcessing));
  }, [dispatch]);

  const addHistoryEntry = useCallback((eventData: any) => {
    dispatch(addToEventHistory(eventData));
  }, [dispatch]);

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