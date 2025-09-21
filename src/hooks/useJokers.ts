import { useCallback, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  addJoker,
  removeJoker,
  lockJoker,
  unlockJoker,
  setJokers,
  resetJokers,
} from '../store/slices/jokerSlice';

interface ActiveJokerEffect {
  jokerId: number;
  candyType?: string;
  period?: number;
}

export const useJokers = () => {
  const dispatch = useAppDispatch();
  const jokerState = useAppSelector(state => state.joker);
  const [activeEffects, setActiveEffects] = useState<ActiveJokerEffect[]>([]);
  const [onFirstJokerCallbacks] = useState<(() => void)[]>([]);

  const addJokerAction = useCallback((joker: any, source?: 'minigame' | 'purchase' | 'event', minigameType?: string) => {
    dispatch(addJoker(joker));
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
    setActiveEffects(prev => [...prev, effect]);
    return true;
  }, []);

  const clearActiveEffect = useCallback((jokerId: number) => {
    setActiveEffects(prev => prev.filter(effect => effect.jokerId !== jokerId));
  }, []);

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
    setActiveEffects([]);
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