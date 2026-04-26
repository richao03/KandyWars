import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { SparkController } from '../utils/sparkController';
import { JuiceController } from '../utils/juiceController';
import { MusicController } from '../utils/musicController';
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
  setSelectedMinigame,
  selectDay,
  selectPeriod,
  selectGameResetSignal,
  selectPeriodCount,
  selectCurrentLocation,
  selectLastActiveView,
  selectHasStudiedTonight,
  selectHasPlayedLunchMinigame,
  selectMinigameContext,
  selectPricesUpdating,
  selectIsInitialized,
  selectIsAfterSchool,
  selectSelectedMinigame,
  selectShowLunchMinigames,
} from '../store/slices/gameSlice';

export const useGame = () => {
  const dispatch = useAppDispatch();
  // Subscribe to specific values using named selectors
  const day = useAppSelector(selectDay);
  const period = useAppSelector(selectPeriod);
  const periodCount = useAppSelector(selectPeriodCount);
  const currentLocation = useAppSelector(selectCurrentLocation);
  const lastActiveView = useAppSelector(selectLastActiveView);
  const hasStudiedTonight = useAppSelector(selectHasStudiedTonight);
  const hasPlayedLunchMinigame = useAppSelector(selectHasPlayedLunchMinigame);
  const minigameContext = useAppSelector(selectMinigameContext);
  const pricesUpdating = useAppSelector(selectPricesUpdating);
  const isInitialized = useAppSelector(selectIsInitialized);
  // locationHistory intentionally not subscribed here — no consumer of useGame reads it.
  // The two places that need it (TransactionModalManager, useTransactionHandler) read
  // state.game.locationHistory directly so they don't re-trigger every useGame consumer.
  const isAfterSchool = useAppSelector(selectIsAfterSchool);
  const selectedMinigame = useAppSelector(selectSelectedMinigame);
  const gameResetSignal = useAppSelector(selectGameResetSignal);
  const showLunchMinigames = useAppSelector(selectShowLunchMinigames);

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
    // Stop any in-flight particle/flash/music-duck state from the prior run.
    SparkController.reset();
    JuiceController.reset();
    MusicController.restore(0);
    dispatch(resetGame());
  }, [dispatch]);

  const fullResetGameAction = useCallback(() => {
    SparkController.reset();
    JuiceController.reset();
    MusicController.restore(0);
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

  const setSelectedMinigameAction = useCallback((minigame: string | null) => {
    dispatch(setSelectedMinigame(minigame));
  }, [dispatch]);

  // Return object directly - useAppSelector calls are already optimized
  return {
    day,
    period,
    periodCount,
    currentLocation,
    isAfterSchool,
    hasStudiedTonight,
    hasPlayedLunchMinigame,
    minigameContext,
    selectedMinigame,
    lastActiveView,
    pricesUpdating,
    isInitialized,
    gameResetSignal,
    showLunchMinigames,
    incrementPeriod: incrementPeriodAction,
    startAfterSchool: startAfterSchoolAction,
    startNewDay: startNewDayAction,
    resetGame: resetGameAction,
    fullResetGame: fullResetGameAction,
    revertToPreviousPeriod: revertToPreviousPeriodAction,
    jumpToPeriod: jumpToPeriodAction,
    markStudiedTonight: markStudiedTonightAction,
    markLunchMinigamePlayed: markLunchMinigamePlayedAction,
    setLastActiveView: setLastActiveViewAction,
    setPricesUpdating: setPricesUpdatingAction,
    setIsInitialized: setIsInitializedAction,
    setMinigameContext: setMinigameContextAction,
    setSelectedMinigame: setSelectedMinigameAction,
    setIsAfterSchool: setIsAfterSchoolAction,
  };
};