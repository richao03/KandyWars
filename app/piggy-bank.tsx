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
import { JOKER_IDS, findJokerById } from '../src/constants/jokerIds';
import { useGame } from '../src/hooks/useGame';
import { useJokers } from '../src/hooks/useJokers';
import { useWallet } from '../src/hooks/useWallet';
import { useAppDispatch } from '../src/store/hooks';
import { incrementMaxDeposit } from '../src/store/slices/dailyStatsSlice';
import { incrementStat } from '../src/store/slices/jokerStatsSlice';
import { formatCurrency } from '../src/utils/priceUtils';
import ConfirmationModal from './components/ConfirmationModal';
import GameHUD from './components/GameHUD';
import PixelBorder from './components/PixelBorder';

interface PiggyBankPageProps {
  onBack?: () => void;
}

export default function PiggyBankPage({ onBack }: PiggyBankPageProps) {
  const { balance, stashedAmount, adoptionFee, stashMoney, withdrawFromStash } =
    useWallet();
  const { day } = useGame();
  const { jokers } = useJokers();
  const dispatch = useAppDispatch();

  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typingValue, setTypingValue] = useState('');
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: '',
    message: '',
    emoji: '',
    onConfirm: () => {},
  });

  // Animation
  const [stashedChange, setStashedChange] = useState<number | null>(null);
  const previousStashed = useRef<number | null>(null);
  const isInitialized = useRef(false);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    if (!isInitialized.current) {
      previousStashed.current = stashedAmount;
      isInitialized.current = true;
    }
  }, []);

  useEffect(() => {
    if (!isInitialized.current || previousStashed.current === null) return;
    const change = stashedAmount - previousStashed.current;
    if (change !== 0) {
      setStashedChange(change);
      translateY.value = 0;
      opacity.value = 0;
      scale.value = 0.8;
      shakeX.value = 0;
      translateY.value = withSequence(
        withSpring(-40, { damping: 15, stiffness: 200 }),
        withTiming(-50, { duration: 1000 }),
        withTiming(-60, { duration: 300 })
      );
      opacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 300 })
      );
      // RE4-safe: clear via JS-side timeout instead of withTiming callback
      // (UI-thread worklet callback crashes when invoking non-worklet fns).
      setTimeout(() => setStashedChange(null), 1500);
      scale.value = withSequence(
        withSpring(1.2, { damping: 12, stiffness: 200 }),
        withSpring(1, { damping: 15, stiffness: 150 })
      );
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

  const animatedChangeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));
  const animatedShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const maxAmount =
    mode === 'deposit' ? Math.max(0, balance) : Math.max(0, stashedAmount);
  const amountPct = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;

  const depositBonusJoker = findJokerById(jokers, JOKER_IDS.DEPOSIT_BONUS);
  const hasBonus = !!depositBonusJoker && mode === 'deposit' && amount > 0;
  const displayAmount = hasBonus ? amount * 1.1 : amount;

  const stashedText = formatCurrency(stashedAmount);
  const stashedFontSize = useMemo(() => {
    if (stashedText.length <= 8) return 28;
    if (stashedText.length <= 10) return 24;
    if (stashedText.length <= 12) return 20;
    return 18;
  }, [stashedText]);

  // Debt progress
  const debtPaid = stashedAmount + adoptionFee; // how much of the fee is paid (stash starts negative)
  const debtProgress =
    adoptionFee > 0 ? Math.max(0, Math.min(1, debtPaid / adoptionFee)) : 0;
  const isDebtFree = stashedAmount >= 0;

  const handleSliderChange = (pct: number) => {
    let val = Math.round((pct / 100) * maxAmount * 100) / 100;
    if (pct >= 99.5 || Math.abs(val - maxAmount) < 0.01) val = maxAmount;
    setAmount(val);
    if (isTyping) setTypingValue(val.toFixed(2));
  };

  const handleQuickPercent = (pct: number) => {
    const val = Math.round((pct / 100) * maxAmount * 100) / 100;
    setAmount(val);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleTextInput = (text: string) => {
    const clean = text.replace(/[^0-9.]/g, '');
    const num = parseFloat(clean) || 0;
    const capped = Math.min(num, maxAmount);
    setTypingValue(num > maxAmount ? capped.toFixed(2) : clean);
    setAmount(capped);
  };

  const handleTransaction = () => {
    if (amount <= 0) return;

    if (mode === 'deposit') {
      const isMaxDeposit = Math.abs(amount - balance) < 0.01;
      if (isMaxDeposit) dispatch(incrementMaxDeposit());
    }

    const success =
      mode === 'deposit' ? stashMoney(amount) : withdrawFromStash(amount);
    if (success) {
      setAmount(0);
      if (mode === 'deposit')
        dispatch(incrementStat({ stat: 'pennyWiseStashes' }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleBack = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (onBack) onBack();
    else router.replace('/(tabs)/after-school');
  };

  return (
    <>
      <View style={styles.container}>
        <ImageBackground
          source={require('../assets/images/piggy-bank.png')}
          style={styles.bg}
          resizeMode="cover"
        >
          <GameHUD
            theme="evening"
            customHeaderText={`After School - Day ${day}`}
            customLocationText="Piggy Bank"
            showLunchMinigames={false}
          />

          <View style={styles.content}>
            {/* === Stash Balance === */}
            <PixelBorder
              borderWidth={3}
              borderColor="#f7e98e"
              innerPadding={0}
              style={{ marginBottom: 8 }}
            >
              <View style={{ position: 'relative' }}>
                <Animated.View style={[styles.balanceBox, animatedShakeStyle]}>
                  <Text style={styles.balanceLabel}>Piggy Bank</Text>
                  <Text
                    style={[
                      styles.balanceAmount,
                      { fontSize: stashedFontSize },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {stashedText}
                  </Text>
                  {/* Debt progress bar */}
                  {!isDebtFree && (
                    <View style={styles.debtBarContainer}>
                      <View style={styles.debtBarBg}>
                        <View
                          style={[
                            styles.debtBarFill,
                            { width: `${debtProgress * 100}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.debtLabel}>
                        {formatCurrency(Math.max(0, debtPaid))} /{' '}
                        {formatCurrency(adoptionFee)} paid
                      </Text>
                    </View>
                  )}
                  {isDebtFree && (
                    <Text style={styles.debtFreeLabel}>Debt Free!</Text>
                  )}
                </Animated.View>
                {stashedChange !== null && (
                  <Animated.View
                    style={[styles.changeIndicator, animatedChangeStyle]}
                  >
                    <Text
                      style={[
                        styles.changeText,
                        { color: stashedChange > 0 ? '#4ade80' : '#f87171' },
                      ]}
                    >
                      {stashedChange > 0 ? '+' : ''}
                      {formatCurrency(stashedChange)}
                    </Text>
                  </Animated.View>
                )}
              </View>
            </PixelBorder>

            {/* === Deposit / Withdraw Tabs === */}
            <PixelBorder
              borderWidth={3}
              borderColor="#f7e98e"
              innerPadding={0}
              style={{ marginBottom: 8 }}
            >
              <View style={styles.tabs}>
                <TouchableOpacity
                  style={[styles.tab, mode === 'deposit' && styles.tabActive]}
                  onPress={() => {
                    setMode('deposit');
                    setAmount(0);
                  }}
                >
                  <Text
                    style={[
                      styles.tabText,
                      mode === 'deposit' && styles.tabTextActive,
                    ]}
                  >
                    Deposit
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, mode === 'withdraw' && styles.tabActive]}
                  onPress={() => {
                    setMode('withdraw');
                    setAmount(0);
                  }}
                >
                  <Text
                    style={[
                      styles.tabText,
                      mode === 'withdraw' && styles.tabTextActive,
                    ]}
                  >
                    Withdraw
                  </Text>
                </TouchableOpacity>
              </View>
            </PixelBorder>

            {/* === Amount Section === */}
            <PixelBorder
              borderWidth={3}
              borderColor="#f7e98e"
              innerPadding={0}
              style={{ marginBottom: 8 }}
            >
              <View style={styles.amountSection}>
                {/* Amount input */}
                <View style={styles.amountInputWrap}>
                  <TextInput
                    style={[
                      styles.amountInput,
                      { color: mode === 'deposit' ? '#4ade80' : '#f87171' },
                    ]}
                    value={
                      isTyping
                        ? `$${typingValue}`
                        : amount > 0
                          ? formatCurrency(amount)
                          : '$0.00'
                    }
                    onChangeText={handleTextInput}
                    onFocus={() => {
                      setIsTyping(true);
                      setTypingValue(amount > 0 ? amount.toString() : '');
                    }}
                    onBlur={() => {
                      setIsTyping(false);
                      setTypingValue('');
                    }}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                </View>

                {hasBonus && (
                  <Text style={styles.bonusText}>
                    +10% bonus = {formatCurrency(displayAmount)}
                  </Text>
                )}

                {/* Slider */}
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  value={amountPct}
                  onValueChange={handleSliderChange}
                  minimumTrackTintColor={
                    mode === 'deposit' ? '#4ade80' : '#f87171'
                  }
                  maximumTrackTintColor="rgba(255,255,255,0.2)"
                />

                {/* Quick % buttons */}
                <View style={styles.quickRow}>
                  {[25, 50, 75, 100].map((pct) => (
                    <TouchableOpacity
                      key={pct}
                      style={styles.quickBtn}
                      onPress={() => handleQuickPercent(pct)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickBtnText}>{pct}%</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Action button */}
                <TouchableOpacity
                  onPress={handleTransaction}
                  disabled={amount === 0}
                  activeOpacity={0.7}
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor:
                        mode === 'deposit' ? '#22c55e' : '#ef4444',
                    },
                    amount === 0 && styles.actionBtnDisabled,
                  ]}
                >
                  <Text style={styles.actionBtnText}>
                    {mode === 'deposit' ? 'Deposit' : 'Withdraw'}{' '}
                    {amount > 0 ? formatCurrency(amount) : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            </PixelBorder>

            {/* Spacer pushes back button to bottom */}
            <View style={{ flex: 1 }} />

            {/* === Back Button === */}
            <TouchableOpacity onPress={handleBack} activeOpacity={0.7}>
              <PixelBorder
                borderColor="rgba(185,28,28,1)"
                borderWidth={3}
                backgroundColor="rgba(239,68,68,1)"
                innerPadding={0}
              >
                <View style={styles.backBtn}>
                  <Text style={styles.backBtnText}>← Back</Text>
                </View>
              </PixelBorder>
            </TouchableOpacity>
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
        onCancel={() => setConfirmModal((p) => ({ ...p, visible: false }))}
        theme="evening"
        dismissible={false}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.purple.darkBg },
  bg: { flex: 1 },
  content: { flex: 1, padding: 12 },

  // Balance box
  balanceBox: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    borderRadius: 12,
  },
  balanceLabel: {
    fontSize: 13,
    color: colors.offWhite,
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0,0,0,1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 2,
  },
  balanceAmount: {
    fontWeight: '700',
    color: colors.gold.light,
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0,0,0,1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  debtBarContainer: { width: '90%', marginTop: 6, alignItems: 'center' },
  debtBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  debtBarFill: {
    height: '100%',
    backgroundColor: '#4ade80',
    borderRadius: 4,
  },
  debtLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'PixeloidMono',
    marginTop: 2,
  },
  debtFreeLabel: {
    fontSize: 12,
    color: '#4ade80',
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
    marginTop: 4,
  },

  // Change animation
  changeIndicator: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  changeText: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.25)',
    padding: 3,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  tabActive: { backgroundColor: 'rgba(0,0,0,0.6)' },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.offWhite,
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0,0,0,1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  tabTextActive: { color: colors.gold.light },

  // Amount section
  amountSection: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 12,
    padding: 12,
  },
  amountInputWrap: {
    backgroundColor: 'rgba(0,0,0)',
    borderWidth: 2,
    borderColor: 'rgba(247,233,142,0.4)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 2,
    marginBottom: 6,
  },
  amountInput: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  bonusText: {
    fontSize: 11,
    color: '#86efac',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 4,
  },
  slider: {
    width: '100%',
    height: 36,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
    marginBottom: 10,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 6,
    backgroundColor: 'rgba(247,233,142)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(247,233,142,0.4)',
    alignItems: 'center',
  },
  quickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.black,
    fontFamily: 'PixeloidMono',
  },
  actionBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // Back button
  backBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  backBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
  },
});
