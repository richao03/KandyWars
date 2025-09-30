import React from 'react';
import { router } from 'expo-router';
import { useGame } from '../src/hooks/useGame';
import GymGame from './minigames/GymGame';

export default function GymGameScreen() {
  const { markStudiedTonight, markLunchMinigamePlayed, minigameContext, setMinigameContext } = useGame();

  const handleGameComplete = () => {
    console.log('Gym game completed! Context:', minigameContext);

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

  return <GymGame onComplete={handleGameComplete} />;
}