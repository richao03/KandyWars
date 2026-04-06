import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { JOKER_IDS, findJokerById } from '../../src/constants/jokerIds';
import { formatCurrency } from '../../src/utils/priceUtils';
import { SoundEffects } from '../../src/utils/soundEffects';
import { useJokers } from '../../src/hooks/useJokers';
import { useWallet } from '../../src/hooks/useWallet';
import { useAppDispatch } from '../../src/store/hooks';
import { incrementMaxDeposit } from '../../src/store/slices/dailyStatsSlice';
import FastModal from './FastModal';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';

interface StashMoneyModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDroneMode?: boolean;
}

function StashMoneyModal({
  visible,
  onClose,
  onConfirm,
  isDroneMode = false,
}: StashMoneyModalProps) {
  const { balance, stashedAmount, stashMoney } = useWallet();
  const { jokers } = useJokers();
  const dispatch = useAppDispatch();

  const [amount, setAmount] = useState(0);
  const [lastStashedAmount, setLastStashedAmount] = useState(stashedAmount);
  const [isTyping, setIsTyping] = useState(false);
  const [typingValue, setTypingValue] = useState('');

  // Animation values
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const shakeX = useSharedValue(0);

  // Reset amount when modal opens
  useEffect(() => {
    if (visible) {
      setAmount(0);
      setLastStashedAmount(stashedAmount);
    }
  }, [visible, stashedAmount]);

  // Animate change indicator when stashed amount changes
  useEffect(() => {
    if (stashedAmount !== lastStashedAmount && visible) {
      // Reset animation values
      translateY.value = 0;
      opacity.value = 0;
      scale.value = 0.8;

      // Trigger animation sequence
      translateY.value = withSequence(
        withSpring(-40, { damping: 15, stiffness: 200 }),
        withTiming(-50, { duration: 1000 }),
        withTiming(-60, { duration: 300 })
      );

      opacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(1, { duration: 800 }),
        withTiming(0, { duration: 300 })
      );

      scale.value = withSequence(
        withSpring(1, { damping: 10, stiffness: 200 }),
        withTiming(1, { duration: 800 }),
        withTiming(0.8, { duration: 300 })
      );

      setLastStashedAmount(stashedAmount);
    }
  }, [stashedAmount, lastStashedAmount, visible]);

  const animatedChangeStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }, { scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const animatedShakeStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shakeX.value }],
    };
  });

  const handleDeposit = useCallback(() => {
    if (amount <= 0 || amount > balance) {
      // Shake animation for invalid amount
      shakeX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // Check if depositing entire wallet (for Maximalist hall pass)
    const epsilon = 0.01; // Small tolerance for floating point comparison
    const isMaxDeposit = Math.abs(amount - balance) < epsilon;

    console.log(
      `💰 Stash check - amount: ${amount}, balance: ${balance}, diff: ${Math.abs(amount - balance)}, isMaxDeposit: ${isMaxDeposit}`
    );

    // Track max deposit for Maximalist hall pass BEFORE stashing
    if (isMaxDeposit) {
      dispatch(incrementMaxDeposit());
      console.log(
        `🏆 Maximalist: Full wallet deposited! ($${formatCurrency(amount)})`
      );
    }

    stashMoney(amount);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAmount(0);

    // Call onConfirm which handles drone consumption if in drone mode
    setTimeout(() => {
      onConfirm();
    }, 500);
  }, [amount, balance, jokers, stashMoney, onConfirm, shakeX, dispatch]);

  const handleSliderChange = useCallback(
    (value: number) => {
      setAmount(Math.floor(value));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Also update typing value if currently focused so input reflects slider position
      if (isTyping) {
        setTypingValue(Math.floor(value).toString());
      }
    },
    [isTyping]
  );

  const handleQuickAmount = useCallback(
    (percent: number) => {
      const quickAmount = Math.floor(balance * percent);
      setAmount(quickAmount);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      SoundEffects.playRandomPop();
    },
    [balance]
  );

  const handleTextInput = useCallback(
    (text: string) => {
      // Remove any non-numeric characters except decimal point
      const cleanText = text.replace(/[^0-9.]/g, '');

      // Parse and cap the value
      const numValue = parseFloat(cleanText) || 0;
      const cappedValue = Math.min(numValue, balance);

      // If value exceeds max, update typing value to show capped amount
      if (numValue > balance) {
        setTypingValue(cappedValue.toString());
      } else {
        setTypingValue(cleanText);
      }

      setAmount(cappedValue);
    },
    [balance]
  );

  const handleInputFocus = useCallback(() => {
    setIsTyping(true);
    // Initialize typing value with current amount
    setTypingValue(amount > 0 ? amount.toString() : '');
  }, [amount]);

  const handleInputBlur = useCallback(() => {
    setIsTyping(false);
    setTypingValue('');
  }, []);

  // Calculate display amount with Deposit Bonus joker
  const depositBonusJoker = findJokerById(jokers, JOKER_IDS.DEPOSIT_BONUS);
  const displayAmount = depositBonusJoker ? amount * 1.1 : amount;
  const hasBonus = depositBonusJoker && amount > 0;

  const changeAmount = stashedAmount - lastStashedAmount;

  return (
    <FastModal
      visible={visible}
      onClose={onClose}
      animationType="spring"
      backdropOpacity={0.85}
      position="center"
    >
      <ImageBackground
        source={require('../../assets/images/neighborhood.png')}
        style={styles.background}
        imageStyle={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              {isDroneMode ? (
                <Image
                  source={require('../../assets/images/icons/drone.png')}
                  style={{
                    width: 50,
                    height: 50,
                  }}
                ></Image>
              ) : (
                ''
              )}
              <Text style={styles.title}>
                {isDroneMode ? 'Drone Delivery' : '🏦 Piggy Bank'}
              </Text>
              <Text style={styles.subtitle}>
                {isDroneMode
                  ? 'Safe deposit from anywhere!'
                  : 'Deposit money for safekeeping'}
              </Text>
            </View>

            {/* Stashed Amount Display with Change Indicator */}
            <View style={styles.stashedContainer}>
              <Text style={styles.stashedLabel}>Currently Stashed</Text>
              <Animated.View style={animatedShakeStyle}>
                <Text style={styles.stashedAmount}>
                  ${formatCurrency(stashedAmount)}
                </Text>
              </Animated.View>

              {/* Change indicator that floats up */}
              {changeAmount !== 0 && (
                <Animated.View
                  style={[styles.changeIndicator, animatedChangeStyle]}
                >
                  <Text
                    style={[
                      styles.changeText,
                      changeAmount > 0
                        ? styles.positiveChange
                        : styles.negativeChange,
                    ]}
                  >
                    {changeAmount > 0 ? '+' : ''}${formatCurrency(changeAmount)}
                  </Text>
                </Animated.View>
              )}
            </View>

            {/* Current Balance */}
            <View style={styles.balanceContainer}>
              <Text style={styles.balanceLabel}>Available to Deposit</Text>
              <Text style={styles.balanceAmount}>${formatCurrency(balance)}</Text>
            </View>

            {/* Amount Selection */}
            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>Deposit Amount</Text>
              <View style={styles.amountDisplay}>
                <View style={styles.amountInputContainer}>
                  <TextInput
                    style={styles.amountValue}
                    value={
                      isTyping
                        ? `$${typingValue}`
                        : amount > 0
                          ? `$${formatCurrency(amount)}`
                          : '$0.00'
                    }
                    onChangeText={handleTextInput}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                </View>
                {hasBonus && (
                  <View style={styles.bonusIndicator}>
                    <Text style={styles.bonusText}>
                      💰 +10% = ${formatCurrency(displayAmount)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Slider */}
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={balance}
                value={amount}
                onValueChange={handleSliderChange}
                minimumTrackTintColor="#4ade80"
                maximumTrackTintColor="#cbd5e1"
                thumbTintColor="#22c55e"
              />

              {/* Quick Amount Buttons */}
              <View style={styles.quickAmountRow}>
                <TouchableOpacity
                  style={styles.quickAmountButton}
                  onPress={() => handleQuickAmount(0.25)}
                >
                  <Text style={styles.quickAmountText}>25%</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickAmountButton}
                  onPress={() => handleQuickAmount(0.5)}
                >
                  <Text style={styles.quickAmountText}>50%</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickAmountButton}
                  onPress={() => handleQuickAmount(0.75)}
                >
                  <Text style={styles.quickAmountText}>75%</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickAmountButton}
                  onPress={() => handleQuickAmount(1.0)}
                >
                  <Text style={styles.quickAmountText}>All</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <PressableButton
                onPress={handleDeposit}
                disabled={amount <= 0 || amount > balance}
                shadowColor="#22c55e"
                shadowOffset={{ width: 0, height: 3 }}
                shadowOpacity={0.4}
                shadowRadius={4}
                elevation={6}
                style={{ flex: 1 }}
              >
                <PixelBorder
                  borderColor="#16a34a"
                  borderWidth={3}
                  backgroundColor="#22c55e"
                  innerPadding={0}
                >
                  <View style={styles.buttonInner}>
                    <Text style={styles.buttonText}>
                      {isDroneMode ? '✈️ Send' : '💰 Deposit'}
                      {hasBonus && ` (+10%)`}
                    </Text>
                  </View>
                </PixelBorder>
              </PressableButton>

              <PressableButton
                onPress={onClose}
                shadowColor="#ef4444"
                shadowOffset={{ width: 0, height: 3 }}
                shadowOpacity={0.4}
                shadowRadius={4}
                elevation={6}
                style={{ flex: 1 }}
              >
                <PixelBorder
                  borderColor="#b91c1c"
                  borderWidth={3}
                  backgroundColor="#ef4444"
                  innerPadding={0}
                >
                  <View style={styles.buttonInner}>
                    <Text style={styles.buttonText}>Cancel</Text>
                  </View>
                </PixelBorder>
              </PressableButton>
            </View>
          </View>
        </View>
      </ImageBackground>
    </FastModal>
  );
}

export default React.memo(StashMoneyModal);

const styles = StyleSheet.create({
  background: {
    width: '100%',
    minHeight: 700,
    borderRadius: 20,
    overflow: 'hidden',
  },
  backgroundImage: {
    borderRadius: 20,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 24,
    justifyContent: 'center',
  },
  content: {
    gap: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fbbf24',
    fontFamily: 'PixeloidMono',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#e0e0e0',
    fontFamily: 'PixeloidMono',
    marginTop: 4,
    textAlign: 'center',
  },
  stashedContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 3,
    borderColor: '#22c55e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  stashedLabel: {
    fontSize: 14,
    color: '#86efac',
    fontFamily: 'PixeloidMono',
    marginBottom: 4,
  },
  stashedAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#22c55e',
    fontFamily: 'PixeloidMono',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  changeIndicator: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
  },
  changeText: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  positiveChange: {
    color: '#4ade80',
  },
  negativeChange: {
    color: '#f87171',
  },
  balanceContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 3,
    borderColor: '#3b82f6',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#93c5fd',
    fontFamily: 'PixeloidMono',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3b82f6',
    fontFamily: 'PixeloidMono',
  },
  amountContainer: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 3,
    borderColor: '#fbbf24',
    borderRadius: 12,
    padding: 16,
  },
  amountLabel: {
    fontSize: 14,
    color: '#fde68a',
    fontFamily: 'PixeloidMono',
    marginBottom: 8,
    textAlign: 'center',
  },
  amountDisplay: {
    alignItems: 'center',
    marginBottom: 12,
  },
  amountInputContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(251, 191, 36, 0.5)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fbbf24',
    fontFamily: 'PixeloidMono',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    textAlign: 'center',
  },
  bonusIndicator: {
    marginTop: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  bonusText: {
    fontSize: 14,
    color: '#86efac',
    fontFamily: 'PixeloidMono',
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  quickAmountRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  quickAmountButton: {
    flex: 1,
    backgroundColor: 'rgba(251, 191, 36, 0.3)',
    borderWidth: 2,
    borderColor: '#fbbf24',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fbbf24',
    fontFamily: 'PixeloidMono',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonInner: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
