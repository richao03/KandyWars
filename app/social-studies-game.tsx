import { router } from 'expo-router';
import React from 'react';
import SocialStudiesGame from './minigames/SocialStudiesGame';

export default function SocialStudiesGameScreen() {
  const handleGameComplete = () => {
    // TODO: Mark study as completed in game state
    console.log('Social Studies game completed! Study session finished.');
    // Return to market/study flow
    router.back();
  };

  return <SocialStudiesGame onComplete={handleGameComplete} />;
}