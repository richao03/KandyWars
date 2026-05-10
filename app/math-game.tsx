import { router } from 'expo-router';
import React from 'react';
import { useGame } from '../src/hooks/useGame';
import { useMinigameTracking } from '../src/hooks/useMinigameTracking';
import MathGame from './minigames/MathGame';

export default function MathGameScreen() {
  const {
    markStudiedTonight,
    markLunchMinigamePlayed,
    minigameContext,
    setMinigameContext,
  } = useGame();
  const { trackMinigameWon } = useMinigameTracking();

  const navigateBack = () => {
    // Since we use router.push() to get here, we can use router.back() to return
    router.back();
  };

  const handleGameComplete = () => {
    // onComplete only fires after the player reaches the joker reward state —
    // i.e. they actually beat the minigame's win condition. Drives Joker
    // Monopoly unlock progress.
    trackMinigameWon('math');
    if (__DEV__) console.log('Math game completed! Context:', minigameContext);

    // Mark study as completed based on context BEFORE navigating
    // This ensures the state is updated before Market re-renders
    if (minigameContext === 'after-school') {
      markStudiedTonight();
      if (__DEV__) console.log('After-school study session finished.');
    } else if (minigameContext === 'lunch') {
      markLunchMinigamePlayed();
      if (__DEV__) console.log('Lunch minigame finished.');
    }

    setMinigameContext(null);

    // Clear context
    // setMinigameContext(null);

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

  return <MathGame onComplete={handleGameComplete} onBack={handleBack} />;
}
