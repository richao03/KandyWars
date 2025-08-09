import { router } from 'expo-router';
import React from 'react';
import ComputerGame from './minigames/ComputerGame';

export default function ComputerGameScreen() {
  const handleGameComplete = () => {
    // TODO: Mark study as completed in game state
    console.log('Computer game completed! Study session finished.');
    // Return to market/study flow
    router.back();
  };

  return <ComputerGame onComplete={handleGameComplete} />;
}