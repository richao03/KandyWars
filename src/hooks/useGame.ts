import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  incrementPeriod,
  startAfterSchool,
  startNewDay,
  resetGame,
  fullResetGame,
  revertToPreviousPeriod,
  jumpToPeriod,
  markStudiedTonight,
  markLunchMinigamePlayed,
  setLastActiveView,
  setPricesUpdating,
  setIsInitialized,
  setMinigameContext,
  setIsAfterSchool,
  selectDay,
  selectPeriod,
  selectGameResetSignal,
} from '../store/slices/gameSlice';

export const useGame = () => {
  const dispatch = useAppDispatch();
  // Subscribe to specific values instead of entire state slice
  const day = useAppSelector(selectDay);
  const period = useAppSelector(selectPeriod);
  const periodCount = useAppSelector(state => state.game.periodCount);
  const currentLocation = useAppSelector(state => state.game.currentLocation);
  const lastActiveView = useAppSelector(state => state.game.lastActiveView);
  const hasStudiedTonight = useAppSelector(state => state.game.hasStudiedTonight);
  const hasPlayedLunchMinigame = useAppSelector(state => state.game.hasPlayedLunchMinigame);
  const minigameContext = useAppSelector(state => state.game.minigameContext);
  const pricesUpdating = useAppSelector(state => state.game.pricesUpdating);
  const isInitialized = useAppSelector(state => state.game.isInitialized);
  const locationHistory = useAppSelector(state => state.game.locationHistory);
  const isAfterSchool = useAppSelector(state => state.game.isAfterSchool);
  const gameResetSignal = useAppSelector(selectGameResetSignal);

  const incrementPeriodAction = useCallback((location: Parameters<typeof incrementPeriod>[0]) => {
    dispatch(incrementPeriod(location));
  }, [dispatch]);

  const startAfterSchoolAction = useCallback(() => {
    dispatch(startAfterSchool());
  }, [dispatch]);

  const startNewDayAction = useCallback((periodsPerDay?: number) => {
    dispatch(startNewDay(periodsPerDay));
  }, [dispatch]);

  const resetGameAction = useCallback(() => {
    dispatch(resetGame());
  }, [dispatch]);

  const fullResetGameAction = useCallback(() => {
    dispatch(fullResetGame());
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

  const markLunchMinigamePlayedAction = useCallback(() => {
    dispatch(markLunchMinigamePlayed());
  }, [dispatch]);

  const setLastActiveViewAction = useCallback((view: 'market' | 'after-school') => {
    dispatch(setLastActiveView(view));
  }, [dispatch]);

  const setPricesUpdatingAction = useCallback((updating: boolean) => {
    dispatch(setPricesUpdating(updating));
  }, [dispatch]);

  const setIsInitializedAction = useCallback((initialized: boolean) => {
    dispatch(setIsInitialized(initialized));
  }, [dispatch]);

  const setMinigameContextAction = useCallback((context: 'lunch' | 'after-school' | null) => {
    dispatch(setMinigameContext(context));
  }, [dispatch]);

  const setIsAfterSchoolAction = useCallback((isAfterSchool: boolean) => {
    dispatch(setIsAfterSchool(isAfterSchool));
  }, [dispatch]);

  // Return object directly - useAppSelector calls are already optimized
  return {
    day,
    period,
    periodCount,
    currentLocation,
    locationHistory,
    isAfterSchool,
    hasStudiedTonight,
    hasPlayedLunchMinigame,
    minigameContext,
    lastActiveView,
    pricesUpdating,
    isInitialized,
    gameResetSignal,
    incrementPeriod: incrementPeriodAction,
    startAfterSchool: startAfterSchoolAction,
    startNewDay: startNewDayAction,
    resetGame: resetGameAction,
    fullResetGame: fullResetGameAction,
    revertToPeriousPeriod: revertToPreviousPeriodAction,
    jumpToPeriod: jumpToPeriodAction,
    markStudiedTonight: markStudiedTonightAction,
    markLunchMinigamePlayed: markLunchMinigamePlayedAction,
    setLastActiveView: setLastActiveViewAction,
    setPricesUpdating: setPricesUpdatingAction,
    setIsInitialized: setIsInitializedAction,
    setMinigameContext: setMinigameContextAction,
    setIsAfterSchool: setIsAfterSchoolAction,
  };
};