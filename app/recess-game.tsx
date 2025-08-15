import React from 'react';
import RecessGame from './minigames/RecessGame';
import { useRouter } from 'expo-router';

export default function RecessGameScreen() {
  const router = useRouter();

  const handleComplete = () => {
    console.log('Recess game completed! Going back to previous screen...');
    router.back();
  };

  return <RecessGame onComplete={handleComplete} />;
}