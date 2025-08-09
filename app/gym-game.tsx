import { router } from 'expo-router';
import React from 'react';
import GymGame from './minigames/GymGame';

export default function GymGameScreen() {
  const handleGameComplete = () => {
    // TODO: Mark study as completed in game state
    console.log('Gym game completed! Study session finished.');
    // Return to market/study flow
    router.back();
  };

  return <GymGame onComplete={handleGameComplete} />;
}