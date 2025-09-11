import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';

interface GameEndModalProps {
  visible: boolean;
  gameResult: 'won' | 'lost';
  finalScore: number;
  balance: number;
  stashedAmount: number;
  onRestart: () => void;
}

export default function GameEndModal({
  visible,
  gameResult,
  finalScore,
  balance,
  stashedAmount,
  onRestart,
}: GameEndModalProps) {
  const handleViewScoreboard = () => {
    router.push('/(tabs)/settings');
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.container}>
            <Text style={styles.title}>
              {gameResult === 'won' ? '🎉 CONGRATULATIONS! 🎉' : '💸 GAME OVER 💸'}
            </Text>
            
            <Text style={styles.subtitle}>
              {gameResult === 'won' 
                ? 'You paid off all your debt and won!'
                : 'You ran out of time with remaining debt.'
              }
            </Text>

            <View style={styles.scoreContainer}>
              <Text style={styles.scoreTitle}>📊 FINAL SCORE</Text>
              <Text style={styles.finalScore}>${finalScore.toFixed(2)}</Text>
              
              <View style={styles.breakdown}>
                <Text style={styles.breakdownText}>💰 Balance: ${balance.toFixed(2)}</Text>
                <Text style={styles.breakdownText}>
                  🏦 {stashedAmount >= 0 ? 'Savings' : 'Debt'}: ${Math.abs(stashedAmount).toFixed(2)}
                </Text>
                <Text style={styles.breakdownText}>
                  {gameResult === 'won' 
                    ? '✅ All debt paid off!'
                    : `❌ $${Math.abs(stashedAmount).toFixed(2)} debt remaining`
                  }
                </Text>
              </View>
            </View>

            <Text style={styles.scoreboardText}>
              🏆 Your score has been submitted to the leaderboard!
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.button} onPress={handleViewScoreboard}>
                <Text style={styles.buttonText}>View Leaderboard</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.button, styles.restartButton]} onPress={onRestart}>
                <Text style={styles.buttonText}>Play Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1a0d2e',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  container: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  scoreContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 10,
  },
  finalScore: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00FF00',
    marginBottom: 15,
  },
  breakdown: {
    width: '100%',
  },
  breakdownText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 5,
  },
  scoreboardText: {
    fontSize: 14,
    color: '#90EE90',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  restartButton: {
    backgroundColor: '#FF6B6B',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});