import React, { useCallback, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useJokers } from '../../src/hooks/useJokers';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { selectMinigameSkipChance } from '../../src/store/slices/hallPassModifiersSlice';
import {
  clearPendingJokerChoices,
  setPendingJokerChoices,
} from '../../src/store/slices/questSlice';
import { STANDARDIZED_JOKERS } from '../../src/utils/jokerEffectEngine';
import { SoundEffects } from '../../src/utils/soundEffects';
import JokerSelection from './JokerSelection';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';

interface SkipGameButtonProps {
  /**
   * Called when the player successfully picks a joker after a successful skip
   * roll. The parent (a minigame screen wrapper) typically uses this to mark
   * the lunch/study slot as consumed and navigate back — same handler as
   * normal minigame completion.
   */
  onSkipSuccess: () => void;
}

/**
 * Renders only when the player has at least one hall pass with a
 * `minigame_skip_chance` effect selected. The displayed percentage is the
 * highest chance across selected passes (MAX, not sum).
 *
 * Tap → single roll. On success, the joker reward screen opens directly with
 * 3 choices (matches a level-3 mastery completion). On failure, a "Skip
 * Failed!" modal appears and the button greys out so the player can play
 * the minigame manually.
 */
const SKIP_REWARD_JOKER_COUNT = 3;
const BANNER_HEIGHT = 50;

export default function SkipGameButton({ onSkipSuccess }: SkipGameButtonProps) {
  const dispatch = useAppDispatch();
  const minigameSkipChance = useAppSelector(selectMinigameSkipChance);
  const { jokersOwned } = useJokers();
  const insets = useSafeAreaInsets();
  const topReserve = insets.top + BANNER_HEIGHT;

  const [skipRolled, setSkipRolled] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [showSkipReward, setShowSkipReward] = useState(false);
  const [skipRewardJokers, setSkipRewardJokers] = useState<
    typeof STANDARDIZED_JOKERS
  >([]);

  const handleSkip = useCallback(() => {
    if (skipRolled || minigameSkipChance <= 0) return;
    setSkipRolled(true);
    SoundEffects.playRandomPop();

    const success = Math.random() < minigameSkipChance;
    if (!success) {
      setShowFailureModal(true);
      return;
    }

    // Build N random unowned jokers as if the player mastered all 3 levels.
    const ownedIds = new Set(jokersOwned.map((j) => j.id.toString()));
    const unowned = STANDARDIZED_JOKERS.filter(
      (j) => !ownedIds.has(j.id.toString())
    );
    const shuffled = [...unowned].sort(() => Math.random() - 0.5);
    const choices = shuffled.slice(
      0,
      Math.min(SKIP_REWARD_JOKER_COUNT, shuffled.length)
    );

    setSkipRewardJokers(choices);
    dispatch(setPendingJokerChoices(choices));
    setShowSkipReward(true);
  }, [skipRolled, minigameSkipChance, jokersOwned, dispatch]);

  const handleFailureDismiss = useCallback(() => {
    setShowFailureModal(false);
  }, []);

  const handleRewardComplete = useCallback(() => {
    setShowSkipReward(false);
    dispatch(clearPendingJokerChoices());
    onSkipSuccess();
  }, [dispatch, onSkipSuccess]);

  if (minigameSkipChance <= 0) return null;

  return (
    <>
      <PressableButton
        onPress={handleSkip}
        disabled={skipRolled}
        shadowColor="#a87a1c"
        shadowOffset={{ width: 0, height: 4 }}
        shadowOpacity={skipRolled ? 0.2 : 0.5}
        shadowRadius={5}
        elevation={8}
        style={skipRolled ? [styles.button, styles.disabled] : styles.button}
      >
        <PixelBorder
          borderColor="#daa520"
          borderWidth={3}
          backgroundColor="#f5e6c8"
          innerPadding={0}
        >
          <View style={styles.inner}>
            <Text style={styles.label}>
              {skipRolled
                ? 'Skip Failed — Play On'
                : `Skip Game (${Math.round(minigameSkipChance * 100)}% success)`}
            </Text>
          </View>
        </PixelBorder>
      </PressableButton>

      <Modal
        visible={showFailureModal}
        animationType="fade"
        transparent={true}
        onRequestClose={handleFailureDismiss}
      >
        <View style={{ height: topReserve }} pointerEvents="box-none" />
        <View style={[styles.resultBackdrop, { paddingTop: 0 }]}>
          <View style={styles.resultCard}>
            <PixelBorder
              borderColor="#dc2626"
              borderWidth={3}
              backgroundColor="#7f1d1d"
              innerPadding={20}
            >
              <Text style={styles.resultTitle}>Skip Failed!</Text>
              <Text style={styles.resultSubtitle}>
                Your skip pass roll missed — play the game manually.
              </Text>
              <PressableButton
                onPress={handleFailureDismiss}
                shadowOpacity={0}
                elevation={0}
                style={styles.resultButton}
              >
                <PixelBorder
                  borderColor="#daa520"
                  borderWidth={3}
                  backgroundColor="#8b4513"
                  innerPadding={0}
                >
                  <View style={styles.resultButtonInner}>
                    <Text style={styles.resultButtonText}>OK</Text>
                  </View>
                </PixelBorder>
              </PressableButton>
            </PixelBorder>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSkipReward && skipRewardJokers.length > 0}
        animationType="fade"
        transparent={true}
        onRequestClose={handleRewardComplete}
      >
        <View style={{ height: topReserve }} pointerEvents="box-none" />
        <View style={{ flex: 1 }}>
          <JokerSelection
            jokers={skipRewardJokers}
            onComplete={handleRewardComplete}
            rewardTier={1}
            completionLevel={3}
            showSellAndUpgrade={false}
            headerText="Skipped! Pick a Joker"
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 8,
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  inner: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  label: {
    color: '#5a4a30',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  resultBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  resultCard: {
    width: '100%',
    maxWidth: 360,
  },
  resultTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 12,
  },
  resultSubtitle: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.9,
  },
  resultButton: {
    alignSelf: 'stretch',
  },
  resultButtonInner: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  resultButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
  },
});
