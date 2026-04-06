import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ImageBackground,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import colors from '../src/constants/colors';
import { formatCurrency } from '../src/utils/priceUtils';
import { JOKER_IDS, findJokerById } from '../src/constants/jokerIds';
import { useFlavorText } from '../src/context/FlavorTextContext';
import { useGame } from '../src/hooks/useGame';
import { useJokers } from '../src/hooks/useJokers';
import { useWallet } from '../src/hooks/useWallet';
import { useAppDispatch } from '../src/store/hooks';
import { incrementMaxDeposit } from '../src/store/slices/dailyStatsSlice';
import ConfirmationModal from './components/ConfirmationModal';
import GameHUD from './components/GameHUD';
import PixelBorder from './components/PixelBorder';
import PressableButton from './components/PressableButton';
import FirstTimeHint from './components/FirstTimeHint';
import TextWithEmojis from './components/TextWithEmojis';

interface PiggyBankPageProps {
  onBack?: () => void;
}

export default function PiggyBankPage({ onBack }: PiggyBankPageProps) {
  console.log(
    '🏦 PiggyBankPage rendering, onBack:',
    onBack ? 'provided' : 'not provided'
  );

  const { balance, stashedAmount, adoptionFee, stashMoney, withdrawFromStash } =
    useWallet();

  console.log(
    '🏦 PiggyBankPage wallet data - balance:',
    balance,
    'stashed:',
    stashedAmount
  );
  const { day, period } = useGame();
  const { setEvent } = useFlavorText();
  const { jokers } = useJokers();
  const dispatch = useAppDispatch();
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typingValue, setTypingValue] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    emoji: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    emoji: '',
    onConfirm: () => {},
  });

  // Animation state for stashed amount change indicator
  const [stashedChange, setStashedChange] = useState<number | null>(null);
  const previousStashed = useRef<number | null>(null);
  const isInitialized = useRef(false);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const shakeX = useSharedValue(0);

  // Set piggy bank flavor text when component loads
  // TEMPORARILY DISABLED to debug crash
  // useEffect(() => {
  //   setEvent('PIGGY_BANK');
  // }, [setEvent]);

  // Initialize previous stashed amount on first render
  useEffect(() => {
    if (!isInitialized.current) {
      previousStashed.current = stashedAmount;
      isInitialized.current = true;
    }
  }, []);

  // Detect stashed amount changes and trigger animation
  useEffect(() => {
    if (!isInitialized.current || previousStashed.current === null) {
      return;
    }

    const change = stashedAmount - previousStashed.current;

    if (change !== 0) {
      // Set the change amount
      setStashedChange(change);

      // Start animation sequence
      translateY.value = 0;
      opacity.value = 0;
      scale.value = 0.8;
      shakeX.value = 0;

      // Animate in, hold, then fade out
      translateY.value = withSequence(
        withSpring(-40, { damping: 15, stiffness: 200 }),
        withTiming(-50, { duration: 1000 }),
        withTiming(-60, { duration: 300 })
      );

      opacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 300 }, () => {
          runOnJS(setStashedChange)(null);
        })
      );

      scale.value = withSequence(
        withSpring(1.2, { damping: 12, stiffness: 200 }),
        withSpring(1, { damping: 15, stiffness: 150 })
      );

      // Shake the piggy bank container
      shakeX.value = withSequence(
        withTiming(6, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(4, { duration: 50 }),
        withTiming(-4, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }

    previousStashed.current = stashedAmount;
  }, [stashedAmount]);

  // Animated style for stashed change indicator
  const animatedStashedChangeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  // Animated style for piggy bank shake
  const animatedPiggyBankStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  // Use percentage-based slider (0-100%) to handle any balance size
  const maxAmount =
    mode === 'deposit' ? Math.max(0, balance) : Math.max(0, stashedAmount);

  // Convert amount to percentage for slider
  const amountPercentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;

  const handleTextInput = (text: string) => {
    // Remove any non-numeric characters except decimal point and dollar sign
    const cleanText = text.replace(/[^0-9.]/g, '');

    // Parse and cap the value at max
    const numValue = parseFloat(cleanText) || 0;
    const cappedValue = Math.min(numValue, maxAmount);

    // If value exceeds max, update typing value to show capped amount
    if (numValue > maxAmount) {
      setTypingValue(cappedValue.toFixed(2));
    } else {
      setTypingValue(cleanText);
    }

    setAmount(cappedValue);
  };

  const handleSliderChange = (percentage: number) => {
    // Convert percentage (0-100) to dollar amount and round to 2 decimals
    const dollarAmount = (percentage / 100) * maxAmount;
    let roundedAmount = Math.round(dollarAmount * 100) / 100;

    // If slider is at or very close to 100%, set to exact max to avoid floating point issues
    if (percentage >= 99.5 || Math.abs(roundedAmount - maxAmount) < 0.01) {
      roundedAmount = maxAmount;
    }

    setAmount(roundedAmount);
    // Also update typing value if currently focused so input reflects slider position
    if (isTyping) {
      setTypingValue(roundedAmount.toFixed(2));
    }
  };

  const handleInputFocus = () => {
    setIsTyping(true);
    // Initialize typing value with current amount
    setTypingValue(amount > 0 ? amount.toString() : '');
  };

  const handleInputBlur = () => {
    setIsTyping(false);
    setTypingValue('');
  };

  // Check for deposit bonus joker
  const depositBonusJoker = findJokerById(jokers, JOKER_IDS.DEPOSIT_BONUS);
  const hasBonus = depositBonusJoker && mode === 'deposit' && amount > 0;
  const displayAmount = hasBonus ? amount * 1.1 : amount;

  // Calculate dynamic font size for stashed amount based on text length
  const stashedAmountText = formatCurrency(stashedAmount);
  const stashedAmountFontSize = useMemo(() => {
    const textLength = stashedAmountText.length;
    if (textLength <= 8) return 28; // Normal size for amounts like $1000.00
    if (textLength <= 10) return 24; // Slightly smaller for $10000.00
    if (textLength <= 12) return 20; // Smaller for $-30000.00
    return 18; // Even smaller for very large negative amounts
  }, [stashedAmountText]);

  const handleTransaction = () => {
    if (amount <= 0) {
      setConfirmModal({
        visible: true,
        title: 'Invalid Amount',
        message: 'Please select an amount greater than 0',
        emoji: '⚠️',
        onConfirm: () =>
          setConfirmModal((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    if (mode === 'deposit') {
      // Check if depositing entire wallet (for Maximalist hall pass)
      const epsilon = 0.01; // Small tolerance for floating point comparison
      const isMaxDeposit = Math.abs(amount - balance) < epsilon;

      console.log(
        `💰 Piggy Bank - amount: ${amount}, balance: ${balance}, diff: ${Math.abs(amount - balance)}, isMaxDeposit: ${isMaxDeposit}`
      );

      if (isMaxDeposit) {
        dispatch(incrementMaxDeposit());
        console.log(
          `🏆 Maximalist: Full wallet deposited! (${formatCurrency(amount)})`
        );
      }
    }

    const success =
      mode === 'deposit'
        ? stashMoney(amount)
        : withdrawFromStash(amount);

    if (success) {
      // Just reset the amount, no modal needed - animation will show the change
      setAmount(0);
    } else {
      // Show error if transaction failed
      setConfirmModal({
        visible: true,
        title: 'Transaction Failed',
        message:
          mode === 'deposit'
            ? `Unable to deposit ${formatCurrency(amount)}. Current balance: ${formatCurrency(balance)}`
            : `Unable to withdraw ${formatCurrency(amount)}. Stashed amount: ${formatCurrency(stashedAmount)}`,

        onConfirm: () =>
          setConfirmModal((prev) => ({ ...prev, visible: false })),
      });
    }
  };

  return (
    <>
      <View style={styles.container}>
        <FirstTimeHint
          hintKey="piggy_bank"
          message="Deposit cash here to pay off your $5,000 adoption fee. Anything you deposit counts toward your goal!"
        />
        <ImageBackground
          source={require('../assets/images/piggy-bank.png')}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <GameHUD
            theme="evening"
            customHeaderText={`After School - Day ${day}`}
            customLocationText="Piggy Bank"
          />

          <View style={styles.content}>
            {/* Piggy Bank Visual */}
            <PixelBorder
              borderWidth={3}
              borderColor="rgba(247, 233, 142, 0.8)"
              style={{ marginBottom: 12 }}
              innerPadding={0}
            >
              <View style={{ position: 'relative' }}>
                <Animated.View
                  style={[styles.piggyBankContainer, animatedPiggyBankStyle]}
                >
                  <View style={styles.piggyBankInfo}>
                    <Text style={styles.piggyBankLabel}>Stashed Away</Text>
                    <Text
                      style={[
                        styles.piggyBankAmount,
                        { fontSize: stashedAmountFontSize },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {stashedAmountText}
                    </Text>
                  </View>
                </Animated.View>
                {/* Animated change indicator positioned absolutely relative to container */}
                {stashedChange !== null && (
                  <Animated.View
                    style={[
                      styles.stashedChangeIndicator,
                      animatedStashedChangeStyle,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stashedChangeText,
                        {
                          color: stashedChange > 0 ? '#4ade80' : '#f87171',
                        },
                      ]}
                    >
                      {stashedChange > 0 ? '+' : ''}{formatCurrency(stashedChange)}
                    </Text>
                  </Animated.View>
                )}
              </View>
            </PixelBorder>

            {/* Tab-style Mode Selector */}
            <PixelBorder
              borderWidth={3}
              borderColor="rgba(247, 233, 142, 0.8)"
              style={{ marginBottom: 12 }}
              innerPadding={0}
            >
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tab, mode === 'deposit' && styles.tabActive]}
                  onPress={() => {
                    setMode('deposit');
                    setAmount(0);
                  }}
                >
                  <TextWithEmojis
                    style={[
                      styles.tabText,
                      mode === 'deposit' && styles.tabTextActive,
                    ]}
                    imageSize={28}
                  >
                    💰 Deposit
                  </TextWithEmojis>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tab, mode === 'withdraw' && styles.tabActive]}
                  onPress={() => {
                    setMode('withdraw');
                    setAmount(0);
                  }}
                >
                  <TextWithEmojis
                    style={[
                      styles.tabText,
                      mode === 'withdraw' && styles.tabTextActive,
                    ]}
                    imageSize={28}
                  >
                    💸 Withdraw
                  </TextWithEmojis>
                </TouchableOpacity>
              </View>
            </PixelBorder>

            {/* Amount Selector */}
            <PixelBorder
              borderWidth={3}
              borderColor="rgba(247, 233, 142, 0.8)"
              style={{ marginBottom: 12 }}
              innerPadding={0}
            >
              <View style={styles.amountSection}>
                <Text style={styles.amountLabel}>
                  {mode === 'deposit'
                    ? 'Amount to Deposit'
                    : 'Amount to Withdraw'}
                </Text>

                <View style={styles.amountDisplay}>
                  <View style={styles.amountInputContainer}>
                    <TextInput
                      style={[
                        styles.amountValue,
                        { color: mode === 'deposit' ? '#4ade80' : '#22c55e' },
                      ]}
                      value={
                        isTyping
                          ? `$${typingValue}`
                          : amount > 0
                            ? formatCurrency(amount)
                            : '$0.00'
                      }
                      onChangeText={handleTextInput}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      keyboardType="numeric"
                      selectTextOnFocus
                    />
                  </View>
                </View>

                {hasBonus && (
                  <View style={styles.bonusIndicator}>
                    <Text style={styles.bonusText}>
                      💰 +10% bonus = {formatCurrency(displayAmount)}
                    </Text>
                  </View>
                )}

                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  value={amountPercentage}
                  onValueChange={handleSliderChange}
                  minimumTrackTintColor={
                    mode === 'deposit' ? '#4ade80' : '#22c55e'
                  }
                  maximumTrackTintColor="#ccc"
                />

                {/* Action Button inside container */}
                <PressableButton
                  onPress={handleTransaction}
                  disabled={amount === 0}
                  shadowColor={
                    mode === 'deposit'
                      ? 'rgba(123,169,101,1)'
                      : 'rgba(185,28,28,1)'
                  }
                  shadowOffset={{ width: 0, height: 4 }}
                  shadowOpacity={0.5}
                  shadowRadius={5}
                  elevation={8}
                  style={{ marginTop: 10, width: '100%' }}
                >
                  <PixelBorder
                    borderColor={
                      mode === 'deposit'
                        ? 'rgba(123,169,101,1)'
                        : 'rgba(185,28,28,1)'
                    }
                    borderWidth={3}
                    backgroundColor={
                      mode === 'deposit'
                        ? 'rgba(154,193,118,1)'
                        : 'rgba(239,68,68,1)'
                    }
                    innerPadding={0}
                  >
                    <View
                      style={[
                        styles.inlineActionButtonInner,
                        amount === 0 && styles.actionButtonDisabled,
                      ]}
                    >
                      <TextWithEmojis
                        style={styles.actionButtonText}
                        imageSize={28}
                      >
                        {mode === 'deposit'
                          ? '💰 Deposit Money'
                          : '💸 Withdraw Money'}
                      </TextWithEmojis>
                    </View>
                  </PixelBorder>
                </PressableButton>
              </View>
            </PixelBorder>

            {/* Back to After School Button */}
            <PressableButton
              onPress={() => {
                // Trigger success haptic feedback when going back to after school
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success
                );
                if (onBack) {
                  onBack();
                } else {
                  router.replace('/(tabs)/after-school');
                }
              }}
              shadowColor="rgba(185,28,28,1)"
              shadowOffset={{ width: 0, height: 4 }}
              shadowOpacity={0.5}
              shadowRadius={5}
              elevation={8}
              style={{ marginTop: 0 }}
            >
              <PixelBorder
                borderColor="rgba(185,28,28,1)"
                borderWidth={3}
                backgroundColor="rgba(239,68,68,1)"
                innerPadding={0}
              >
                <View style={styles.backButtonInner}>
                  <Text style={styles.backButtonText}>← Back</Text>
                </View>
              </PixelBorder>
            </PressableButton>
          </View>
        </ImageBackground>
      </View>

      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        emoji={confirmModal.emoji}
        confirmText="OK"
        onConfirm={confirmModal.onConfirm}
        onCancel={() =>
          setConfirmModal((prev) => ({ ...prev, visible: false }))
        }
        theme="evening"
        dismissible={false}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.purple.darkBg,
  },
  backgroundImage: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  piggyBankContainer: {
    padding: 8,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
  },
  piggyBankInfo: {
    alignItems: 'center',
  },
  piggyBankLabel: {
    fontSize: 16,
    color: colors.offWhite,
    fontFamily: 'PixeloidMono',
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  piggyBankAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gold.light,
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.offWhite,
    fontFamily: 'PixeloidMono',
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    fontFamily: 'PixeloidMono',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, .2)',
    padding: 2,
    borderRadius: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(0,0,0,.4)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.offWhite,
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  tabTextActive: {
    color: colors.gold.light,
  },
  amountSection: {
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0, 0.2)',
    padding: 12,
  },
  amountLabel: {
    fontSize: 16,
    color: colors.gold.light,
    fontFamily: 'PixeloidMono',
    marginBottom: 10,
    textAlign: 'center',
  },
  amountDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountInputContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(251, 191, 36, 0.5)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  bonusIndicator: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',

    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#22c55e',

    alignItems: 'center',
  },
  bonusText: {
    fontSize: 14,
    color: '#86efac',
    fontFamily: 'PixeloidMono',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  maxAmount: {
    fontSize: 14,
    color: colors.offWhite,
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: -10,
  },
  sliderNote: {
    fontSize: 12,
    color: '#fbbf24',
    textAlign: 'center',
  },
  quickPercentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  quickPercentButton: {
    flex: 1,
    backgroundColor: 'rgba(123, 169, 101, 0.3)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(123, 169, 101, 0.6)',
  },
  quickPercentText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  quickAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },

  actionButton: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  inlineActionButtonInner: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  infoText: {
    fontSize: 14,
    color: colors.offWhite,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  backButtonInner: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  stashedChangeIndicator: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  stashedChangeText: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
});
