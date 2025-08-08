import React from 'react';
import { router } from 'expo-router';
import MathGame from './minigames/MathGame';

export default function MathGameScreen() {
  const handleGameComplete = () => {
    // TODO: Mark study as completed in game state
    console.log('Math game completed! Study session finished.');
    // Return to market/study flow
    router.back();
  };

  return <MathGame onComplete={handleGameComplete} />;
}