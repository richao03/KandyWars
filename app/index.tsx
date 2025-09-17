import { Redirect } from 'expo-router';

export default function Index() {
  // Directly redirect to title-screen without going through tabs
  return <Redirect href="/title-screen" />;
}
