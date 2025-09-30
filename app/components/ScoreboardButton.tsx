/**
 * Scoreboard Button Component
 * 
 * A simple button to open the scoreboard modal.
 * Add this to your game UI wherever makes sense.
 */

import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { ScoreboardModal } from './ScoreboardModal';
import { useScoreboard } from '../../src/hooks/useScoreboard';
import TextWithEmojis from './TextWithEmojis';

interface ScoreboardButtonProps {
  style?: any;
  position?: 'top-right' | 'bottom-right' | 'custom';
}

export const ScoreboardButton: React.FC<ScoreboardButtonProps> = ({ 
  style, 
  position = 'top-right' 
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const { playerRank, betaStats } = useScoreboard();

  const getPositionStyle = () => {
    switch (position) {
      case 'top-right':
        return styles.topRight;
      case 'bottom-right':
        return styles.bottomRight;
      default:
        return {};
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.button, getPositionStyle(), style]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <View style={styles.buttonContent}>
          <TextWithEmojis style={styles.emoji}>🏆</TextWithEmojis>
          <Text style={styles.label}>Leaderboard</Text>
          {playerRank > 0 && (
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>#{playerRank}</Text>
            </View>
          )}
          {betaStats && (
            <Text style={styles.playersCount}>
              {betaStats.totalGames} games played
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <ScoreboardModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmitScore={() => {
          // Optionally close modal after successful submission
          // setModalVisible(false);
        }}
      />
    </>
  );
};

// Compact version for smaller spaces
export const CompactScoreboardButton: React.FC<{ onPress?: () => void }> = ({ onPress }) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handlePress = () => {
    setModalVisible(true);
    onPress?.();
  };

  return (
    <>
      <TouchableOpacity style={styles.compactButton} onPress={handlePress}>
        <TextWithEmojis style={styles.compactEmoji}>🏆</TextWithEmojis>
      </TouchableOpacity>

      <ScoreboardModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topRight: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 100,
  },
  bottomRight: {
    position: 'absolute',
    bottom: 50,
    right: 20,
    zIndex: 100,
  },
  buttonContent: {
    alignItems: 'center',
    minWidth: 80,
  },
  emoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  label: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  rankBadge: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  rankText: {
    color: '#1f2937',
    fontSize: 10,
    fontWeight: 'bold',
  },
  playersCount: {
    color: '#dbeafe',
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  compactButton: {
    backgroundColor: '#3b82f6',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactEmoji: {
    fontSize: 20,
  },
});

export default ScoreboardButton;