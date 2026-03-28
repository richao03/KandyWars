import { router } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import PixelBorder from './components/PixelBorder';

const MINIGAMES = [
  { label: 'Math', route: '/math-game', emoji: '🧮' },
  { label: 'Computer', route: '/computer-game', emoji: '💻' },
  { label: 'Logic', route: '/logic-game', emoji: '🧩' },
  { label: 'Art', route: '/art-game', emoji: '🎨' },
  { label: 'Economy', route: '/economy-game', emoji: '📈' },
  { label: 'Geography', route: '/geography-game', emoji: '🌍' },
  { label: 'Home Ec', route: '/home-ec-game', emoji: '🍳' },
  { label: 'Gym', route: '/history-game', emoji: '🏋️' },
  { label: 'Recess', route: '/recess-game', emoji: '⛹️' },
] as const;

export default function DebugMinigames() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>🐛 Minigame Picker</Text>
        <Text style={styles.subtitle}>Choose a minigame to play</Text>

        {MINIGAMES.map((game) => (
          <PixelBorder
            key={game.route}
            borderColor="#a855f7"
            borderWidth={3}
            backgroundColor="#f3e8ff"
            innerPadding={0}
            style={styles.buttonWrapper}
          >
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.push(game.route as any)}
            >
              <Text style={styles.buttonText}>
                {game.emoji} {game.label}
              </Text>
            </TouchableOpacity>
          </PixelBorder>
        ))}

        <PixelBorder
          borderColor="#ef4444"
          borderWidth={3}
          backgroundColor="#fee2e2"
          innerPadding={0}
          style={styles.buttonWrapper}
        >
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={[styles.buttonText, { color: '#cc3333' }]}>
              ← Back
            </Text>
          </TouchableOpacity>
        </PixelBorder>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#a855f7',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#c4b5fd',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonWrapper: {
    marginBottom: 10,
  },
  button: {
    padding: 18,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7e22ce',
    fontFamily: 'PixeloidMono',
  },
});
