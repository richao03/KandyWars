import { Redirect } from 'expo-router';
import { useGame } from '../context/GameContext';

export default function HomePage() {
  const { isAfterSchool } = useGame();

  // Direct redirect without any rendering delay
  if (isAfterSchool) {
    return <Redirect href="/(tabs)/after-school" />;
  } else {
    return <Redirect href="/(tabs)/market" />;
  }
}