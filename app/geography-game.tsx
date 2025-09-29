import { router } from 'expo-router';
import React from 'react';
import GeographyGame from './minigames/GeographyGame';

export default function GeographyGameScreen() {
  const handleComplete = () => {
    // Navigate back to after-school screen
    router.replace('/(tabs)/after-school');
  };

  return <GeographyGame onComplete={handleComplete} />;
}