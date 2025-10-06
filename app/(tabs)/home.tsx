import { useIsFocused } from '@react-navigation/native';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useGame } from '../../src/hooks/useGame';

export default function HomePage() {
  const { isAfterSchool } = useGame();
  const isFocused = useIsFocused();

  // Redirect whenever this tab becomes focused
  useEffect(() => {
    if (isFocused) {
      router.replace(isAfterSchool ? "/(tabs)/after-school" : "/(tabs)/market");
    }
  }, [isFocused, isAfterSchool]);

  return <View />;
}