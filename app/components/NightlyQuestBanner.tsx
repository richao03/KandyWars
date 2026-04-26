import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../src/constants/colors';
import { type NightlyQuest } from '../../src/store/slices/shopkeeperSlice';
import PixelBorder from './PixelBorder';

interface NightlyQuestBannerProps {
  quest: NightlyQuest | null;
  completed: boolean;
  pendingReward: boolean;
  onClaimReward: () => void;
}

function NightlyQuestBanner({
  quest,
  completed,
  pendingReward,
  onClaimReward,
}: NightlyQuestBannerProps) {
  if (!quest) return null;

  const progressPercent = Math.min((quest.progress / quest.goal) * 100, 100);
  const isComplete = completed || quest.progress >= quest.goal;

  return (
    <PixelBorder
      borderColor={isComplete ? '#22c55e' : '#f7e98e'}
      borderWidth={2}
      backgroundColor={isComplete ? 'rgba(34, 197, 94, 0.2)' : 'rgba(247, 233, 142, 0.1)'}
      innerPadding={8}
      style={styles.container}
    >
      <View style={styles.row}>
        <View style={styles.questInfo}>
          <Text style={styles.questLabel}>
            {pendingReward ? 'Quest Complete!' : isComplete ? 'Done!' : 'Quest'}
          </Text>
          <Text style={styles.questDescription}>{quest.description}</Text>
          {!isComplete && (
            <View style={styles.progressRow}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {quest.progress}/{quest.goal}
              </Text>
            </View>
          )}
        </View>

        {pendingReward && (
          <TouchableOpacity style={styles.claimButton} onPress={onClaimReward} activeOpacity={0.7}>
            <Text style={styles.claimButtonText}>Claim ${quest.reward.cash}</Text>
          </TouchableOpacity>
        )}

        {isComplete && !pendingReward && (
          <Text style={styles.rewardText}>+${quest.reward.cash}</Text>
        )}
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
    alignItems: 'center',
  },
  questInfo: {
    flex: 1,
  },
  questLabel: {
    fontSize: 10,
    color: colors.gold.light,
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
    marginBottom: 2,
  },
  questDescription: {
    fontSize: 11,
    color: colors.white,
    fontFamily: 'PixeloidMono',
    lineHeight: 14,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.gold.medium,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 9,
    color: colors.gray.light,
    fontFamily: 'PixeloidMono',
  },
  claimButton: {
    backgroundColor: colors.green.success,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  claimButtonText: {
    fontSize: 10,
    color: colors.white,
    fontFamily: 'PixeloidMono',
    fontWeight: '800',
  },
  rewardText: {
    fontSize: 12,
    color: colors.green.success,
    fontFamily: 'PixeloidMono',
    fontWeight: '800',
    marginLeft: 8,
  },
});

export default memo(NightlyQuestBanner);
