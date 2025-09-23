import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  initializeMinigameTracking,
  markMinigamePlayed,
  selectPlayedMinigames,
  selectMinigameCompletions,
  selectHasPlayedAllMinigames,
  selectMinigameProgress,
  MinigameType,
} from '../store/slices/minigameTrackingSlice';

export const useMinigameTracking = () => {
  const dispatch = useAppDispatch();
  const minigameState = useAppSelector(state => state.minigameTracking);
  const playedMinigames = useAppSelector(selectPlayedMinigames);
  const minigameCompletions = useAppSelector(selectMinigameCompletions);
  const hasPlayedAllMinigames = useAppSelector(selectHasPlayedAllMinigames);
  const minigameProgress = useAppSelector(selectMinigameProgress);

  // Initialize minigame tracking on first use
  useEffect(() => {
    if (!minigameState.isLoaded) {
      dispatch(initializeMinigameTracking());
    }
  }, [dispatch, minigameState.isLoaded]);

  const trackMinigamePlayed = useCallback((minigame: MinigameType) => {
    console.log(`🎮 Minigame played: ${minigame}`);
    dispatch(markMinigamePlayed(minigame));

    // Log progress
    const newProgress = {
      ...minigameProgress,
      played: playedMinigames.includes(minigame) ? minigameProgress.played : minigameProgress.played + 1
    };

    console.log(`📊 Minigame progress: ${newProgress.played}/${newProgress.total} played`);

    if (newProgress.played === newProgress.total) {
      console.log('🎉 All minigames completed! Valedictorian Vendor Hall Pass should be unlocked.');
    }
  }, [dispatch, minigameProgress, playedMinigames]);

  const hasPlayedMinigame = useCallback((minigame: MinigameType): boolean => {
    return playedMinigames.includes(minigame);
  }, [playedMinigames]);

  const getMinigameCompletionCount = useCallback((minigame: MinigameType): number => {
    return minigameCompletions[minigame] || 0;
  }, [minigameCompletions]);

  const getRemainingMinigames = useCallback((): MinigameType[] => {
    return minigameProgress.remaining;
  }, [minigameProgress.remaining]);

  const getMinigameProgressPercentage = useCallback((): number => {
    return Math.round((minigameProgress.played / minigameProgress.total) * 100);
  }, [minigameProgress.played, minigameProgress.total]);

  return {
    // State
    playedMinigames,
    minigameCompletions,
    hasPlayedAllMinigames,
    minigameProgress,
    isLoaded: minigameState.isLoaded,

    // Actions
    trackMinigamePlayed,

    // Utilities
    hasPlayedMinigame,
    getMinigameCompletionCount,
    getRemainingMinigames,
    getMinigameProgressPercentage,
  };
};