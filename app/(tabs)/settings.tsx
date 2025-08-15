// app/(tabs)/settings.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import GameHUD from '../components/GameHUD';
import ConfirmationModal from '../components/ConfirmationModal';
import { useGame } from '../../src/context/GameContext';
import { useSeed } from '../../src/context/SeedContext';
import { useWallet } from '../../src/context/WalletContext';
import { useInventory } from '../../src/context/InventoryContext';
import { useJokers } from '../../src/context/JokerContext';
import { useFlavorText } from '../../src/context/FlavorTextContext';

export default function Settings() {
  const { resetGame } = useGame();
  const { setSeed } = useSeed();
  const { resetWallet } = useWallet();
  const { resetInventory } = useInventory();
  const { resetJokers } = useJokers();
  const { resetFlavorText } = useFlavorText();
  const [isRestarting, setIsRestarting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    emoji: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({ visible: false, title: '', message: '', emoji: '', onConfirm: () => {} });

  const handleRestartGame = () => {
    setConfirmModal({
      visible: true,
      title: 'Restart Game',
      message: 'Are you sure you want to restart the game? This will delete all progress and cannot be undone.',
      emoji: '🔄',
      confirmText: 'Restart',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, visible: false }));
        setIsRestarting(true);
        try {
          // Reset all game data
          await resetGame();
          
          // Reset all contexts
          resetWallet();
          resetInventory();
          resetJokers();
          resetFlavorText();
          
          // Generate new seed for fresh game
          const newSeed = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          setSeed(newSeed);
          
          // Navigate back to market (home)
          router.push('/(tabs)/market');
          
          setTimeout(() => {
            setConfirmModal({
              visible: true,
              title: 'Game Restarted',
              message: 'A fresh game has started with a new seed!',
              emoji: '✨',
              onConfirm: () => setConfirmModal(prev => ({ ...prev, visible: false }))
            });
          }, 500);
        } catch (error) {
          console.error('Error restarting game:', error);
          setConfirmModal({
            visible: true,
            title: 'Error',
            message: 'Failed to restart the game. Please try again.',
            emoji: '❌',
            onConfirm: () => setConfirmModal(prev => ({ ...prev, visible: false }))
          });
        } finally {
          setIsRestarting(false);
        }
      },
      onCancel: () => setConfirmModal(prev => ({ ...prev, visible: false }))
    });
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

      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        emoji={confirmModal.emoji}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        onConfirm={confirmModal.onConfirm}
        onCancel={confirmModal.onCancel || (() => setConfirmModal(prev => ({ ...prev, visible: false })))}
        theme="school"
      />
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
