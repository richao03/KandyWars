import { router } from 'expo-router';
import React from 'react';
import HomeEcGame from './minigames/HomeEcGame';

export default function HomeEcGameScreen() {
  const handleGameComplete = () => {
    // TODO: Mark study as completed in game state
    console.log('History game completed! Study session finished.');
    // Return to market/study flow
    router.back();
  };

  return <HomeEcGame onComplete={handleGameComplete} />;
}