import { Redirect } from 'expo-router';
import { useGame } from '../../src/hooks/useGame';

export default function HomePage() {
  const { isAfterSchool } = useGame();

  // Direct redirect without any rendering delay - no conditional return
  return <Redirect href={isAfterSchool ? "/(tabs)/after-school" : "/(tabs)/market"} />;
}