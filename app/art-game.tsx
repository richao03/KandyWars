import { router } from 'expo-router';
import React from 'react';
import ArtGame from './minigames/ArtGame';

export default function ArtGameScreen() {
  const handleGameComplete = () => {
    // TODO: Mark study as completed in game state
    console.log('art game completed! Study session finished.');
    // Return to market/study flow
    router.back();
  };

  return <ArtGame onComplete={handleGameComplete} />;
}
