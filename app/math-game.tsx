import React from 'react';
import { router } from 'expo-router';
import { useGame } from '../src/hooks/useGame';
import MathGame from './minigames/MathGame';

export default function MathGameScreen() {
  const { markStudiedTonight, markLunchMinigamePlayed, minigameContext, setMinigameContext } = useGame();

  const navigateBack = () => {
    // Since we use router.push() to get here, we can use router.back() to return
    router.back();
  };

  const handleGameComplete = () => {
    console.log('Math game completed! Context:', minigameContext);

    // Mark study as completed based on context
    if (minigameContext === 'after-school') {
      markStudiedTonight();
      console.log('After-school study session finished.');
    } else if (minigameContext === 'lunch') {
      markLunchMinigamePlayed();
      console.log('Lunch minigame finished.');
    }

    // Clear context and navigate back
    setMinigameContext(null);
    navigateBack();
  };

  const handleBack = () => {
    // Clear context when going back
    setMinigameContext(null);
    navigateBack();
  };

  return <MathGame onComplete={handleGameComplete} onBack={handleBack} />;
}