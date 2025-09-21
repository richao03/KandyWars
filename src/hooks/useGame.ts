import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  incrementPeriod,
  startAfterSchool,
  startNewDay,
  resetGame,
  revertToPreviousPeriod,
  jumpToPeriod,
  markStudiedTonight,
  setLastActiveView,
  selectDay,
  selectPeriod,
} from '../store/slices/gameSlice';

export const useGame = () => {
  const dispatch = useAppDispatch();
  const gameState = useAppSelector(state => state.game);
  const day = useAppSelector(selectDay);
  const period = useAppSelector(selectPeriod);

  const incrementPeriodAction = useCallback((location: Parameters<typeof incrementPeriod>[0]) => {
    dispatch(incrementPeriod(location));
  }, [dispatch]);

  const startAfterSchoolAction = useCallback(() => {
    dispatch(startAfterSchool());
  }, [dispatch]);

  const startNewDayAction = useCallback(() => {
    dispatch(startNewDay());
  }, [dispatch]);

  const resetGameAction = useCallback(() => {
    dispatch(resetGame());
  }, [dispatch]);

  const revertToPreviousPeriodAction = useCallback(() => {
    dispatch(revertToPreviousPeriod());
    return true;
  }, [dispatch]);

  const jumpToPeriodAction = useCallback((targetPeriod: number) => {
    dispatch(jumpToPeriod(targetPeriod));
    return true;
  }, [dispatch]);

  const markStudiedTonightAction = useCallback(() => {
    dispatch(markStudiedTonight());
  }, [dispatch]);

  const setLastActiveViewAction = useCallback((view: 'market' | 'after-school') => {
    dispatch(setLastActiveView(view));
  }, [dispatch]);

  return {
    day,
    period,
    periodCount: gameState.periodCount,
    currentLocation: gameState.currentLocation,
    locationHistory: gameState.locationHistory,
    isAfterSchool: gameState.isAfterSchool,
    hasStudiedTonight: gameState.hasStudiedTonight,
    lastActiveView: gameState.lastActiveView,
    incrementPeriod: incrementPeriodAction,
    startAfterSchool: startAfterSchoolAction,
    startNewDay: startNewDayAction,
    resetGame: resetGameAction,
    revertToPreviousPeriod: revertToPreviousPeriodAction,
    jumpToPeriod: jumpToPeriodAction,
    markStudiedTonight: markStudiedTonightAction,
    setLastActiveView: setLastActiveViewAction,
  };
};