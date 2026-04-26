import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../src/constants/colors';
import { getLevelConfig, getXPForNextLevel } from '../../src/constants/shopkeeperData';
import { SHOPKEEPER_IMAGES } from '../../utils/shopkeeperIcons';
import PixelBorder from './PixelBorder';

interface ShopkeeperNPCProps {
  mood: 'normal' | 'happy' | 'mad';
  level: number;
  totalXP: number;
  dialogue: string;
  hasChattedToday: boolean;
  canAnswerTrivia: boolean;
  triviaAnsweredToday: number;
  onChat: () => void;
  onTrivia: () => void;
}

function ShopkeeperNPC({
  mood,
  level,
  totalXP,
  dialogue,
  hasChattedToday,
  canAnswerTrivia,
  triviaAnsweredToday,
  onChat,
  onTrivia,
}: ShopkeeperNPCProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [prevMood, setPrevMood] = useState(mood);

  // Bounce animation on mood change
  useEffect(() => {
    if (mood !== prevMood) {
      setPrevMood(mood);
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [mood, prevMood, scaleAnim]);

  const config = getLevelConfig(level);
  const nextLevelXP = getXPForNextLevel(level);
  const currentLevelXP = config.xpRequired;
  const xpProgress = nextLevelXP
    ? (totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)
    : 1;

  return (
    <PixelBorder
      borderColor="#ff6b35"
      borderWidth={3}
      backgroundColor="rgba(13, 51, 81, 0.95)"
      innerPadding={12}
      style={styles.container}
    >
      <View style={styles.row}>
        {/* Portrait */}
        <Animated.View style={[styles.portraitContainer, { transform: [{ scale: scaleAnim }] }]}>
          <Image
            source={SHOPKEEPER_IMAGES[mood]}
            style={styles.portrait}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Dialogue + Info */}
        <View style={styles.infoContainer}>
          {/* Speech bubble */}
          <View style={styles.speechBubble}>
            <Text style={styles.dialogueText}>{dialogue}</Text>
          </View>

          {/* Level bar */}
          <View style={styles.levelRow}>
            <Text style={styles.levelLabel}>Lv.{level} {config.label}</Text>
            <View style={styles.xpBarBg}>
              <View style={[styles.xpBarFill, { width: `${Math.min(xpProgress * 100, 100)}%` }]} />
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            {!hasChattedToday && (
              <TouchableOpacity style={styles.actionButton} onPress={onChat} activeOpacity={0.7}>
                <Text style={styles.actionButtonText}>Chat</Text>
              </TouchableOpacity>
            )}
            {canAnswerTrivia && (
              <TouchableOpacity style={styles.actionButton} onPress={onTrivia} activeOpacity={0.7}>
                <Text style={styles.actionButtonText}>Trivia {triviaAnsweredToday}/3</Text>
              </TouchableOpacity>
            )}
            {hasChattedToday && !canAnswerTrivia && (
              <Text style={styles.doneText}>Come back tomorrow!</Text>
            )}
          </View>
        </View>
      </View>
    </PixelBorder>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  portraitContainer: {
    width: 70,
    height: 70,
    marginRight: 12,
  },
  portrait: {
    width: 70,
    height: 70,
  },
  infoContainer: {
    flex: 1,
  },
  speechBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
  },
  dialogueText: {
    fontSize: 12,
    color: colors.white,
    fontFamily: 'PixeloidMono',
    lineHeight: 16,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  levelLabel: {
    fontSize: 10,
    color: colors.gold.light,
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
  },
  xpBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: colors.gold.medium,
    borderRadius: 3,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: colors.orange.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  actionButtonText: {
    fontSize: 10,
    color: colors.white,
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
  },
  doneText: {
    fontSize: 10,
    color: colors.gray.light,
    fontFamily: 'PixeloidMono',
    fontStyle: 'italic',
  },
});

export default memo(ShopkeeperNPC);
