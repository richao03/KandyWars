import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setScores,
  addScore,
  setCurrentScore,
  setHighScore,
  setIsLoading,
  resetScoreboard,
} from '../store/slices/scoreboardSlice';

export const useScoreboard = () => {
  const dispatch = useAppDispatch();
  const scoreboardState = useAppSelector(state => state.scoreboard);

  const updateScores = useCallback((scores: any[]) => {
    dispatch(setScores(scores));
  }, [dispatch]);

  const submitScore = useCallback((score: any) => {
    dispatch(addScore(score));
  }, [dispatch]);

  const updateCurrentScore = useCallback((score: number) => {
    dispatch(setCurrentScore(score));
  }, [dispatch]);

  const updateHighScore = useCallback((score: number) => {
    dispatch(setHighScore(score));
  }, [dispatch]);

  const setLoading = useCallback((loading: boolean) => {
    dispatch(setIsLoading(loading));
  }, [dispatch]);

  const trackGameCompleted = useCallback(async (): Promise<void> => {
    // This would integrate with your Firebase scoreboard service
    console.log('Game completion tracked via Redux');
  }, []);

  const trackMinigamePlayed = useCallback(async (minigameType: string): Promise<void> => {
    console.log(`Minigame played: ${minigameType}`);
  }, []);

  const trackDayEnded = useCallback(async (periodsCount: number): Promise<void> => {
    console.log(`Day ended with ${periodsCount} periods`);
  }, []);

  const reset = useCallback(() => {
    dispatch(resetScoreboard());
  }, [dispatch]);

  return {
    scores: scoreboardState.scores,
    currentScore: scoreboardState.currentScore,
    highScore: scoreboardState.highScore,
    isLoading: scoreboardState.isLoading,
    isSubmitting: false, // Would need state management for this
    lastSubmissionId: null, // Would need state management for this
    gameStartTime: Date.now(), // Would need state management for this
    updateScores,
    submitScore,
    updateCurrentScore,
    updateHighScore,
    setLoading,
    trackGameCompleted,
    trackMinigamePlayed,
    trackDayEnded,
    reset,
  };
};