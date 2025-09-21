import { router } from 'expo-router';
import React from 'react';
import { useGame } from '../src/hooks/useGame';
import ArtGame from './minigames/ArtGame';

export default function ArtGameScreen() {
  const { markStudiedTonight } = useGame();

  const handleGameComplete = () => {
    // Mark study as completed in game state
    markStudiedTonight();
    console.log('Art game completed! Study session finished.');
    // Return to market/study flow
    router.push('/(tabs)/after-school');
  };

  return <ArtGame onComplete={handleGameComplete} />;
}
