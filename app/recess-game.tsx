import React from 'react';
import RecessGame from './minigames/RecessGame';
import { router } from 'expo-router';
import { useGame } from '../src/hooks/useGame';

export default function RecessGameScreen() {
  const { markStudiedTonight, markLunchMinigamePlayed, minigameContext, setMinigameContext } = useGame();

  const handleComplete = () => {
    console.log('Recess game completed! Context:', minigameContext);

    // Mark study as completed based on context
    if (minigameContext === 'after-school') {
      markStudiedTonight();
      console.log('After-school study session finished.');
    } else if (minigameContext === 'lunch') {
      markLunchMinigamePlayed();
      console.log('Lunch minigame finished.');
    }

    // Clear context and navigate to appropriate screen
    setMinigameContext(null);

    // Use navigate() to go to the tab without creating new instances
    if (minigameContext === 'lunch') {
      router.navigate('/(tabs)/market');
    } else {
      router.navigate('/(tabs)/after-school');
    }
  };

  return <RecessGame onComplete={handleComplete} />;
}
