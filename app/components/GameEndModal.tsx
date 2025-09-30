import { router } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FastModal from './FastModal';
import TextWithEmojis from './TextWithEmojis';

interface GameEndModalProps {
  visible: boolean;
  gameResult: 'won' | 'lost';
  finalScore: number;
  balance: number;
  stashedAmount: number;
  adoptionFee: number;
  difficultyLevel: number;
  unlockedHallPasses?: string[];
  onRestart: () => void;
  onClose?: () => void;
}

export default function GameEndModal({
  visible,
  gameResult,
  finalScore,
  balance,
  stashedAmount,
  adoptionFee,
  difficultyLevel,
  unlockedHallPasses = [],
  onRestart,
  onClose,
}: GameEndModalProps) {
  const handleViewScoreboard = () => {
    // Close the modal first, then navigate to leaderboard
    if (onClose) {
      onClose();
    }
    // Small delay to ensure modal closes smoothly before navigation
    setTimeout(() => {
      router.push('/leaderboard');
    }, 100);
  };

  // Get dog breed and image based on difficulty level
  const getDogBreed = (level: number) => {
    switch (level) {
      case 1:
        return 'Peg the Pug';
      case 2:
        return 'Brussels Griffon';
      case 3:
        return 'Evee Cat';
      case 4:
        return 'Byul Terrier';
      case 5:
        return 'Cane Corso';
      case 6:
        return 'Pitbull';
      case 7:
        return 'Afghan Hound';
      case 8:
        return 'German Shepherd';
      default:
        return 'Pug';
    }
  };

  const getDogImage = (level: number) => {
    switch (level) {
      case 1:
        return require('../../assets/images/doggs/pug.png');
      case 2:
        return require('../../assets/images/doggs/brussleGriffon.png');
      case 3:
        return require('../../assets/images/doggs/evee.png');
      case 4:
        return require('../../assets/images/doggs/byul.png');
      case 5:
        return require('../../assets/images/doggs/caneCorso.png');
      case 6:
        return require('../../assets/images/doggs/pitbull.png');
      case 7:
        return require('../../assets/images/doggs/afghan.png');
      case 8:
        return require('../../assets/images/doggs/germanShepard.png');
      default:
        return require('../../assets/images/doggs/pug.png');
    }
  };

  const dogBreed = getDogBreed(difficultyLevel);
  const dogImage = getDogImage(difficultyLevel);
  const dogMessage =
    gameResult === 'won'
      ? `Congratulations! You successfully paid off your debt and can now adopt ${dogBreed}! `
      : `💔 You weren't able to pay off your debt in time. ${dogBreed} has gone with another loving family. 💔`;

  return (
    <FastModal
      visible={visible}
      onClose={onClose}
      animationType="spring"
      backdropOpacity={0.8}
      modalStyle={styles.modalContent}
    >
      <View style={styles.container}>
        <Text style={styles.title}>
          {gameResult === 'won' ? '🎉 CONGRATULATIONS! 🎉' : '💸 GAME OVER 💸'}
        </Text>

        <Image source={dogImage} style={styles.dogImage} />

        <Text style={styles.subtitle}>
          {gameResult === 'won'
            ? `You paid off all your debt and adapted ${dogBreed}`
            : `${dogBreed} has gone with another loving family`}
        </Text>

        <View style={styles.scoreContainer}>
          <Text style={styles.scoreTitle}>NET FINAL SCORE</Text>
          <Text style={styles.finalScore}>${finalScore.toFixed(2)}</Text>

          <View style={styles.breakdown}>
            <TextWithEmojis style={styles.breakdownText}>
              💰 Balance: ${balance.toFixed(2)}
            </TextWithEmojis>
            <Text style={styles.breakdownText}>
              🏦 {stashedAmount >= 0 ? 'Savings' : 'Debt'}: $
              {Math.abs(stashedAmount).toFixed(2)}
            </Text>
            <Text style={styles.breakdownText}>
              {gameResult === 'won'
                ? '✅ All debt paid off!'
                : `❌ $${Math.abs(stashedAmount).toFixed(2)} debt remaining`}
            </Text>
          </View>
        </View>

        <Text style={styles.scoreboardText}>
          🏆 Your score has been submitted to the leaderboard!
        </Text>

        {unlockedHallPasses.length > 0 && (
          <View style={styles.hallPassContainer}>
            <Text style={styles.hallPassTitle}>🎖️ Hall Passes Unlocked!</Text>
            {unlockedHallPasses.map((passId, index) => (
              <Text key={index} style={styles.hallPassText}>
                ✨ {passId}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleViewScoreboard}
          >
            <Text style={styles.buttonText}>View Leaderboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.restartButton]}
            onPress={onRestart}
          >
            <Text style={styles.buttonText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    </FastModal>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 15,
  },
  dogImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  dogMessage: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 15,
    paddingHorizontal: 10,
    fontWeight: '600',
    lineHeight: 22,
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
  hallPassContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  hallPassTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 10,
  },
  hallPassText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 5,
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
