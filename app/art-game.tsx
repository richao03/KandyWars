import { router } from 'expo-router';
import React from 'react';
import { useGame } from '../src/hooks/useGame';
import ArtGame from './minigames/ArtGame';

export default function ArtGameScreen() {
  const { markStudiedTonight, markLunchMinigamePlayed, minigameContext, setMinigameContext } = useGame();

  const handleGameComplete = () => {
    console.log('Art game completed! Context:', minigameContext);

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

  return <ArtGame onComplete={handleGameComplete} />;
}
