import { router } from 'expo-router';
import React from 'react';
import EconomyGame from './minigames/EconomyGame';

export default function EconomyGameScreen() {
  const handleGameComplete = () => {
    // TODO: Mark study as completed in game state
    console.log('Economy game completed! Study session finished.');
    // Return to market/study flow
    router.back();
  };

  return <EconomyGame onComplete={handleGameComplete} />;
}