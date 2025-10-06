import { useCallback, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  addJoker,
  removeJoker,
  lockJoker,
  unlockJoker,
  setJokers,
  resetJokers,
  addActiveEffect,
  removeActiveEffect,
  clearAllActiveEffects,
} from '../store/slices/jokerSlice';
import { scoreboardService } from '../services/firebase';

interface ActiveJokerEffect {
  jokerId: number;
  candyType?: string;
  period?: number;
}

export const useJokers = () => {
  const dispatch = useAppDispatch();
  const jokerState = useAppSelector(state => state.joker);
  const activeEffects = useAppSelector(state => state.joker.activeEffects);
  const [onFirstJokerCallbacks] = useState<(() => void)[]>([]);

  const addJokerAction = useCallback(async (joker: any, source?: 'minigame' | 'purchase' | 'event', minigameType?: string) => {
    dispatch(addJoker(joker));

    // Track analytics when joker is added from minigame
    if (source === 'minigame' && minigameType && joker.name && joker.id) {
      console.log('🃏 Attempting to track joker from minigame:', joker.name, 'ID:', joker.id, 'from', minigameType);

      try {
        await scoreboardService.trackJokerFromMinigame(joker.name, joker.id, minigameType);
        console.log('✅ Successfully tracked joker to Firebase:', joker.name);
      } catch (error) {
        console.error('❌ Failed to track joker from minigame:', error);
      }
    } else {
      console.log('🃏 Joker not tracked - source:', source, 'minigameType:', minigameType, 'hasName:', !!joker.name, 'hasId:', !!joker.id);
    }
  }, [dispatch]);

  const removeJokerAction = useCallback((jokerId: string | number) => {
    dispatch(removeJoker(typeof jokerId === 'string' ? jokerId : jokerId.toString()));
  }, [dispatch]);

  const hasJoker = useCallback((jokerId: number): boolean => {
    return jokerState.jokers.some(j => j.id === jokerId.toString());
  }, [jokerState.jokers]);

  const getJokersBySubject = useCallback((subject: string) => {
    return jokerState.jokers.filter(joker =>
      joker.tier === subject || joker.name.toLowerCase().includes(subject.toLowerCase())
    );
  }, [jokerState.jokers]);

  const activateJoker = useCallback(async (
    jokerId: number,
    candyType?: string,
    period?: number
  ): Promise<boolean> => {
    const effect = { jokerId, candyType, period };
    dispatch(addActiveEffect(effect));
    return true;
  }, [dispatch]);

  const clearActiveEffect = useCallback((jokerId: number) => {
    dispatch(removeActiveEffect(jokerId));
  }, [dispatch]);

  const reorderJokers = useCallback((newOrder: any[]) => {
    dispatch(setJokers(newOrder));
  }, [dispatch]);

  const registerOnFirstJoker = useCallback((callback: () => void) => {
    onFirstJokerCallbacks.push(callback);
  }, [onFirstJokerCallbacks]);

  const unregisterOnFirstJoker = useCallback((callback: () => void) => {
    const index = onFirstJokerCallbacks.indexOf(callback);
    if (index > -1) {
      onFirstJokerCallbacks.splice(index, 1);
    }
  }, [onFirstJokerCallbacks]);

  const lockJokerAction = useCallback((jokerId: string) => {
    dispatch(lockJoker(jokerId));
  }, [dispatch]);

  const unlockJokerAction = useCallback((jokerId: string) => {
    dispatch(unlockJoker(jokerId));
  }, [dispatch]);

  const resetJokersAction = useCallback(() => {
    dispatch(resetJokers());
  }, [dispatch]);

  return {
    jokers: jokerState.jokers,
    jokersOwned: jokerState.jokersOwned,
    allJokers: jokerState.allJokers,
    lockedJokerIds: jokerState.lockedJokerIds,
    activeEffects,
    isLoaded: true, // Always loaded in Redux
    addJoker: addJokerAction,
    removeJoker: removeJokerAction,
    hasJoker,
    getJokersBySubject,
    activateJoker,
    clearActiveEffect,
    reorderJokers,
    registerOnFirstJoker,
    unregisterOnFirstJoker,
    lockJoker: lockJokerAction,
    unlockJoker: unlockJokerAction,
    resetJokers: resetJokersAction,
  };
};