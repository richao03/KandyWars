import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../src/constants/colors';
import { type NightlyQuest } from '../../src/store/slices/shopkeeperSlice';
import PixelBorder from './PixelBorder';

interface DeliQuestTabProps {
  quest: NightlyQuest | null;
  completed: boolean;
  pendingReward: boolean;
  accepted: boolean;
  rerollCost: number;
  balance: number;
  canRerollToday: boolean;
  onAccept: () => void;
  onReroll: () => void;
  onClaimReward: () => void;
}

function DeliQuestTab({
  quest,
  completed,
  pendingReward,
  accepted,
  rerollCost,
  balance,
  canRerollToday,
  onAccept,
  onReroll,
  onClaimReward,
}: DeliQuestTabProps) {
  if (!quest) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>No quest tonight.</Text>
      </View>
    );
  }

  const progressPercent = Math.min((quest.progress / quest.goal) * 100, 100);
  const isComplete = completed || quest.progress >= quest.goal;
  const canAfford = balance >= rerollCost;
  const rerollDisabled =
    accepted || isComplete || !canRerollToday || !canAfford;

  return (
    <View style={styles.outer}>
      <PixelBorder
        borderColor={isComplete ? '#22c55e' : '#f7e98e'}
        borderWidth={2}
        backgroundColor={
          isComplete ? 'rgba(34, 197, 94, 0.2)' : 'rgba(247, 233, 142, 0.1)'
        }
        innerPadding={12}
        style={styles.container}
      >
        <Text style={styles.label}>
          {pendingReward
            ? 'Quest Complete!'
            : isComplete
              ? 'Done!'
              : accepted
                ? "Tonight's Quest (Accepted)"
                : "Tonight's Quest"}
        </Text>

        <Text style={styles.description}>{quest.description}</Text>

        {!isComplete && (
          <View style={styles.progressRow}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressPercent}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {quest.progress}/{quest.goal}
            </Text>
          </View>
        )}

        <View style={styles.rewardBlock}>
          <Text style={styles.rewardLabel}>Reward</Text>
          <Text style={styles.rewardValue}>+${quest.reward.cash}</Text>
          {quest.reward.xp > 0 && (
            <Text style={styles.rewardXp}>+{quest.reward.xp} XP</Text>
          )}
        </View>

        {pendingReward ? (
          <TouchableOpacity
            style={styles.claimButton}
            onPress={onClaimReward}
            activeOpacity={0.7}
          >
            <Text style={styles.claimButtonText}>
              Claim ${quest.reward.cash}
            </Text>
          </TouchableOpacity>
        ) : !isComplete ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.acceptButton,
                accepted && styles.disabledButton,
              ]}
              onPress={onAccept}
              activeOpacity={0.7}
              disabled={accepted}
            >
              <Text style={styles.acceptButtonText}>
                {accepted ? 'Accepted' : 'Accept'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.rerollButton,
                rerollDisabled && styles.disabledButton,
              ]}
              onPress={onReroll}
              activeOpacity={0.7}
              disabled={rerollDisabled}
            >
              <Text style={styles.rerollButtonText}>
                Reroll ${rerollCost}
              </Text>
              {!accepted && !canRerollToday && (
                <Text style={styles.rerollHint}>used today</Text>
              )}
              {!accepted && canRerollToday && !canAfford && (
                <Text style={styles.rerollHint}>need ${rerollCost}</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </PixelBorder>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    paddingTop: 8,
  },
  container: {
    marginBottom: 8,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    color: colors.gray.light,
    fontFamily: 'PixeloidMono',
    fontSize: 12,
  },
  label: {
    fontSize: 11,
    color: colors.gold.light,
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: colors.white,
    fontFamily: 'PixeloidMono',
    lineHeight: 18,
    marginBottom: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.gold.medium,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    color: colors.gray.light,
    fontFamily: 'PixeloidMono',
  },
  rewardBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  rewardLabel: {
    fontSize: 10,
    color: colors.gray.light,
    fontFamily: 'PixeloidMono',
    textTransform: 'uppercase',
  },
  rewardValue: {
    fontSize: 14,
    color: colors.green.success,
    fontFamily: 'PixeloidMono',
    fontWeight: '800',
  },
  rewardXp: {
    fontSize: 10,
    color: colors.gold.light,
    fontFamily: 'PixeloidMono',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: colors.green.success,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 12,
    color: colors.white,
    fontFamily: 'PixeloidMono',
    fontWeight: '800',
  },
  rerollButton: {
    flex: 1,
    backgroundColor: colors.orange.primary,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  rerollButtonText: {
    fontSize: 12,
    color: colors.white,
    fontFamily: 'PixeloidMono',
    fontWeight: '800',
  },
  rerollHint: {
    fontSize: 8,
    color: colors.white,
    fontFamily: 'PixeloidMono',
    marginTop: 2,
    opacity: 0.8,
  },
  disabledButton: {
    opacity: 0.4,
  },
  claimButton: {
    backgroundColor: colors.green.success,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  claimButtonText: {
    fontSize: 13,
    color: colors.white,
    fontFamily: 'PixeloidMono',
    fontWeight: '800',
  },
});

export default memo(DeliQuestTab);
