import { router } from 'expo-router';
import React from 'react';
import { useGame } from '../src/hooks/useGame';
import RecessGame from './minigames/RecessGame';

export default function RecessGameScreen() {
  const { markStudiedTonight, markLunchMinigamePlayed, minigameContext, setMinigameContext } = useGame();

  const navigateBack = () => {
    router.back();
  };

  const handleComplete = () => {
    console.log('Recess game completed! Context:', minigameContext);

    if (minigameContext === 'after-school') {
      markStudiedTonight();
      console.log('After-school study session finished.');
    } else if (minigameContext === 'lunch') {
      markLunchMinigamePlayed();
      console.log('Lunch minigame finished.');
    }

    setMinigameContext(null);

    setTimeout(() => {
      navigateBack();
    }, 100);
  };

  const handleBack = () => {
    setMinigameContext(null);
    navigateBack();
  };

  return <RecessGame onComplete={handleComplete} onBack={handleBack} />;
}
