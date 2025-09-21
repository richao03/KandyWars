import { router } from 'expo-router';
import React from 'react';
import { useGame } from '../src/hooks/useGame';
import EconomyGame from './minigames/EconomyGame';

export default function EconomyGameScreen() {
  const { markStudiedTonight } = useGame();

  const handleGameComplete = () => {
    // Mark study as completed in game state
    markStudiedTonight();
    console.log('Economy game completed! Study session finished.');
    // Return to market/study flow
    router.push('/(tabs)/after-school');
  };

  return <EconomyGame onComplete={handleGameComplete} />;
}