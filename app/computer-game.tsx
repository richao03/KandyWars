import { router } from 'expo-router';
import React from 'react';
import { useGame } from '../src/hooks/useGame';
import ComputerGame from './minigames/ComputerGame';

export default function ComputerGameScreen() {
  const { markStudiedTonight, markLunchMinigamePlayed, minigameContext, setMinigameContext } = useGame();

  const handleGameComplete = () => {
    console.log('Computer game completed! Context:', minigameContext);

    // Mark study as completed based on context
    if (minigameContext === 'after-school') {
      markStudiedTonight();
      console.log('After-school study session finished.');
    } else if (minigameContext === 'lunch') {
      markLunchMinigamePlayed();
      console.log('Lunch minigame finished.');
    }

    // Clear context and navigate to appropriate view
    setMinigameContext(null);

    // Navigate based on context
    if (minigameContext === 'lunch') {
      router.push('/(tabs)/market');
    } else {
      router.push('/(tabs)/after-school');
    }
  };

  return <ComputerGame onComplete={handleGameComplete} />;
}