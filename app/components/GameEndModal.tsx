import { router } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FastModal from './FastModal';
import PixelBorder from './PixelBorder';
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
  totalCompletions?: number;
  totalCandiesSold?: number;
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
  totalCompletions = 0,
  totalCandiesSold = 0,
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
      <PixelBorder
        borderColor="#FFD700"
        borderWidth={4}
        backgroundColor="#1a0d2e"
        innerPadding={0}
      >
        <View style={styles.container}>
          <TextWithEmojis style={styles.title} imageSize={24}>
            {gameResult === 'won'
              ? '🎉 CONGRATULATIONS! 🎉'
              : '💸 GAME OVER 💸'}
          </TextWithEmojis>

          <PixelBorder
            borderColor="#FFD700"
            borderWidth={3}
            backgroundColor="transparent"
            innerPadding={0}
            borderRadius={10}
            style={styles.dogImageBorder}
          >
            <Image source={dogImage} style={styles.dogImage} />
          </PixelBorder>

          <Text style={styles.subtitle}>
            {gameResult === 'won'
              ? `You paid off all your debt and adapted ${dogBreed}`
              : `${dogBreed} has gone with another loving family`}
          </Text>

          <PixelBorder
            borderColor="#FFD700"
            borderWidth={3}
            backgroundColor="rgba(255, 255, 255, 0.1)"
            innerPadding={16}
            style={styles.scoreContainerBorder}
          >
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreTitle}>NET FINAL SCORE</Text>
              <Text style={styles.finalScore}>${finalScore.toFixed(2)}</Text>

              <View style={styles.breakdown}>
                <TextWithEmojis style={styles.breakdownText} imageSize={14}>
                  💰 Balance: ${balance.toFixed(2)}
                </TextWithEmojis>
                <TextWithEmojis style={styles.breakdownText} imageSize={14}>
                  🏦 {stashedAmount >= 0 ? 'Savings' : 'Debt'}: $
                  {Math.abs(stashedAmount).toFixed(2)}
                </TextWithEmojis>
                <TextWithEmojis style={styles.breakdownText} imageSize={14}>
                  {gameResult === 'won'
                    ? '✅ All debt paid off!'
                    : `❌ $${Math.abs(stashedAmount).toFixed(2)} debt remaining`}
                </TextWithEmojis>
              </View>
            </View>
          </PixelBorder>

          <PixelBorder
            borderColor="#4CAF50"
            borderWidth={3}
            backgroundColor="rgba(76, 175, 80, 0.1)"
            innerPadding={12}
            style={styles.statsContainerBorder}
          >
            <View style={styles.statsContainer}>
              <Text style={styles.statsTitle}>GAME STATISTICS</Text>
              <View style={styles.statsRow}>
                <TextWithEmojis style={styles.statsText} imageSize={14}>
                  🏆 Total Wins: {totalCompletions}
                </TextWithEmojis>
                <TextWithEmojis style={styles.statsText} imageSize={14}>
                  💵 Total Profit: ${finalScore.toFixed(2)}
                </TextWithEmojis>
                <TextWithEmojis style={styles.statsText} imageSize={14}>
                  🍬 Candies Sold: {totalCandiesSold}
                </TextWithEmojis>
              </View>
            </View>
          </PixelBorder>

          <TextWithEmojis style={styles.scoreboardText} imageSize={14}>
            🏆 Your score has been submitted to the leaderboard!
          </TextWithEmojis>

          {unlockedHallPasses.length > 0 && (
            <PixelBorder
              borderColor="#FFD700"
              borderWidth={3}
              backgroundColor="rgba(255, 215, 0, 0.1)"
              innerPadding={12}
              style={styles.hallPassContainerBorder}
            >
              <View style={styles.hallPassContainer}>
                <TextWithEmojis style={styles.hallPassTitle} imageSize={16}>
                  🎖️ Hall Passes Unlocked!
                </TextWithEmojis>
                {unlockedHallPasses.map((passId, index) => (
                  <TextWithEmojis
                    key={index}
                    style={styles.hallPassText}
                    imageSize={14}
                  >
                    ✨ {passId}
                  </TextWithEmojis>
                ))}
              </View>
            </PixelBorder>
          )}

          <View style={styles.buttonContainer}>
            <PixelBorder
              borderColor="#4CAF50"
              borderWidth={3}
              backgroundColor="#4CAF50"
              innerPadding={0}
              style={styles.buttonBorder}
            >
              <TouchableOpacity
                style={styles.button}
                onPress={handleViewScoreboard}
              >
                <Text style={styles.buttonText}>View Leaderboard</Text>
              </TouchableOpacity>
            </PixelBorder>

            <PixelBorder
              borderColor="#FF6B6B"
              borderWidth={3}
              backgroundColor="#FF6B6B"
              innerPadding={0}
              style={styles.buttonBorder}
            >
              <TouchableOpacity style={styles.button} onPress={onRestart}>
                <Text style={styles.buttonText}>Play Again</Text>
              </TouchableOpacity>
            </PixelBorder>
          </View>
        </View>
      </PixelBorder>
    </FastModal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    width: '90%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  container: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'PixeloidMono',
  },
  dogImageBorder: {
    marginBottom: 16,
  },
  dogImage: {
    width: 120,
    height: 120,
  },
  dogMessage: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 15,
    paddingHorizontal: 10,
    fontWeight: '600',
    lineHeight: 22,
    fontFamily: 'PixeloidMono',
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'PixeloidMono',
  },
  scoreContainerBorder: {
    width: '100%',
    marginBottom: 16,
  },
  scoreContainer: {
    width: '100%',
    alignItems: 'center',
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 10,
    fontFamily: 'PixeloidMono',
  },
  finalScore: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00FF00',
    marginBottom: 12,
    fontFamily: 'PixeloidMono',
  },
  breakdown: {
    width: '100%',
  },
  breakdownText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: 'PixeloidMono',
  },
  statsContainerBorder: {
    width: '100%',
    marginBottom: 16,
  },
  statsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
    fontFamily: 'PixeloidMono',
  },
  statsRow: {
    width: '100%',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: 'PixeloidMono',
  },
  scoreboardText: {
    fontSize: 14,
    color: '#90EE90',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'PixeloidMono',
  },
  hallPassContainerBorder: {
    marginBottom: 16,
  },
  hallPassContainer: {
    alignItems: 'center',
  },
  hallPassTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'PixeloidMono',
  },
  hallPassText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: 'PixeloidMono',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonBorder: {
    flex: 1,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
  },
});
