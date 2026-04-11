import { router } from 'expo-router';
import React from 'react';
import { useGame } from '../src/hooks/useGame';
import NimGame from './minigames/NimGame';

export default function HistoryGameScreen() {
  const {
    markStudiedTonight,
    markLunchMinigamePlayed,
    minigameContext,
    setMinigameContext,
  } = useGame();

  const navigateBack = () => {
    // Since we use router.push() to get here, we can use router.back() to return
    router.back();
  };

  const handleGameComplete = () => {
    // Mark study as completed based on context BEFORE navigating
    // This ensures the state is updated before Market re-renders
    if (minigameContext === 'after-school') {
      markStudiedTonight();
      if (__DEV__) console.log('After-school study session finished.');
    } else if (minigameContext === 'lunch') {
      markLunchMinigamePlayed();
      if (__DEV__) console.log('Lunch minigame finished.');
    }

    // Clear context
    setMinigameContext(null);

    // Use setTimeout to ensure state updates are flushed before navigation
    // Increased delay to give Redux time to propagate the state change
    setTimeout(() => {
      navigateBack();
    }, 100);
  };

  const handleBack = () => {
    // Clear context when going back
    setMinigameContext(null);
    navigateBack();
  };

  return <NimGame onComplete={handleGameComplete} onBack={handleBack} />;
}
