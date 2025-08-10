// app/(tabs)/settings.tsx
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import GameHUD from '../components/GameHUD';
import { useGame } from '../../src/context/GameContext';
import { useSeed } from '../../src/context/SeedContext';

export default function Settings() {
  const { resetGame } = useGame();
  const { setSeed } = useSeed();
  const [isRestarting, setIsRestarting] = useState(false);

  const handleRestartGame = () => {
    Alert.alert(
      'Restart Game',
      'Are you sure you want to restart the game? This will delete all progress and cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Restart',
          style: 'destructive',
          onPress: async () => {
            setIsRestarting(true);
            try {
              // Reset all game data
              await resetGame();
              
              // Generate new seed for fresh game
              const newSeed = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              setSeed(newSeed);
              
              // Navigate back to market (home)
              router.push('/(tabs)/market');
              
              Alert.alert('Game Restarted', 'A fresh game has started with a new seed!');
            } catch (error) {
              console.error('Error restarting game:', error);
              Alert.alert('Error', 'Failed to restart the game. Please try again.');
            } finally {
              setIsRestarting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <GameHUD 
        customHeaderText="Game Settings" 
        customLocationText="Principal's Office"
      />
      
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Game Controls</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleRestartGame}
            disabled={isRestarting}
          >
            <Text style={styles.dangerButtonText}>
              {isRestarting ? 'Restarting...' : '🔄 Restart Game'}
            </Text>
            <Text style={styles.buttonSubtext}>
              Delete all progress and start fresh
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>
            CandyWarz - The ultimate school trading simulation game
          </Text>
          <Text style={styles.aboutText}>
            Build your candy empire, collect jokers, and dominate the market!
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef7e7', // Warm paper background
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#d4a574', // Brown crayon border
    shadowColor: '#8b4513',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6b4423', // Dark brown
    marginBottom: 15,
    fontFamily: 'CrayonPastel',
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  dangerButton: {
    backgroundColor: '#fee2e2', // Light red background
    borderWidth: 2,
    borderColor: '#ef4444', // Red border
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dc2626', // Dark red text
    marginBottom: 4,
  },
  buttonSubtext: {
    fontSize: 12,
    color: '#7f1d1d', // Darker red
    fontStyle: 'italic',
  },
  aboutText: {
    fontSize: 14,
    color: '#8b5a3c',
    lineHeight: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
});
