import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ReAnimated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import colors from '../../src/constants/colors';
import { useEventHandler } from '../../src/hooks/useEventHandler';
import { useJokers, Joker as JokerType } from '../../src/hooks/useJokers';
import { useWallet } from '../../src/hooks/useWallet';
import { SoundEffects } from '../../src/utils/soundEffects';
import { StandardizedJoker, getJokerEffectsAtLevel } from '../../src/utils/jokerEffectEngine';
import { formatCurrency } from '../../src/utils/priceUtils';
import JokerCard from './JokerCard';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';
import TextWithEmojis from './TextWithEmojis';

// Image resolver to handle cached image IDs and string references
const getResolvedImage = (backgroundImage: any, eventEffect?: string) => {
  // Handle string references (new format)
  if (typeof backgroundImage === 'string') {
    switch (backgroundImage) {
      case 'pricedrop':
        return require('../../assets/images/pricedrop.png');
      case 'bully':
        return require('../../assets/images/bully.png');
      case 'foundmoney':
        return require('../../assets/images/foundmoney.png');
      case 'pricehike':
        return require('../../assets/images/pricehike.png');
      case 'confiscate':
        return require('../../assets/images/confiscate.png');
      default:
        return require('../../assets/images/pricedrop.png');
    }
  }

  // Handle cached module IDs (numbers) - map based on event effect
  if (typeof backgroundImage === 'number') {
    switch (eventEffect) {
      case 'LOSE_MONEY':
        return require('../../assets/images/bully.png');
      case 'FOUND_MONEY':
        return require('../../assets/images/foundmoney.png');
      case 'PRICE_SPIKE':
        return require('../../assets/images/pricehike.png');
      case 'PRICE_DROP':
        return require('../../assets/images/pricedrop.png');
      case 'STASH_LOCKED':
        return require('../../assets/images/confiscate.png');
      default:
        return require('../../assets/images/pricedrop.png');
    }
  }

  // Fallback for any other format
  return require('../../assets/images/pricedrop.png');
};

// Custom component for animated money display
const AnimatedMoneyCounter = ({
  startValue,
  endValue,
  duration = 2000,
  isActive,
  moneyLoss,
  prefix = '$',
}) => {
  const animatedValue = useSharedValue(startValue);
  const [displayText, setDisplayText] = useState(`${prefix}${formatCurrency(startValue)}`);

  const updateDisplay = useCallback((val: number) => {
    setDisplayText(`${prefix}${formatCurrency(val)}`);
  }, [prefix]);

  useEffect(() => {
    if (isActive) {
      animatedValue.value = withTiming(endValue, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      animatedValue.value = startValue;
      setDisplayText(`${prefix}${formatCurrency(startValue)}`);
    }
    // Cancel any in-flight animation on unmount so the worklet doesn't keep
    // running after the parent EventModal swaps events.
    return () => {
      cancelAnimation(animatedValue);
    };
  }, [isActive, startValue, endValue, duration]);

  useAnimatedReaction(
    () => Math.round(animatedValue.value * 100) / 100,
    (current, previous) => {
      if (current !== previous) {
        runOnJS(updateDisplay)(current);
      }
    }
  );

  return (
    <Text
      style={{
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.white,
        textAlign: 'center',
        fontFamily: 'CrayonPastel',
        textShadowColor: moneyLoss ? 'red' : '#00ff00',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: isActive && endValue < startValue ? 3 : 4,
      }}
    >
      {displayText}
    </Text>
  );
};

const EventModal = React.memo(function EventModal() {
  const { currentEvent, dismissEvent, getTheme } = useEventHandler();
  const { balance } = useWallet();
  const { addJoker, canAddPersistentJoker } = useJokers();
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.8);
  const shakeAnim = useSharedValue(0);
  const [canDismiss, setCanDismiss] = useState(true);
  const [showMoneyLoss, setShowMoneyLoss] = useState(false);
  const [showMoneyGain, setShowMoneyGain] = useState(false);
  const [startAmount, setStartAmount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);
  // Detention Discovery state
  const [showDetentionDiscovery, setShowDetentionDiscovery] = useState(false);
  const [detentionChoices, setDetentionChoices] = useState<StandardizedJoker[]>([]);
  const [detentionChosen, setDetentionChosen] = useState(false);

  // Ref to hold the latest currentEvent so Reanimated worklet callbacks
  // (which capture stale closures) can read the up-to-date value.
  const currentEventRef = useRef(currentEvent);
  currentEventRef.current = currentEvent;

  // Reanimated shared values for smooth UI thread animations
  const moneyValue = useSharedValue(0);
  const animationTimeouts = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    if (currentEvent) {
      // Reset shake animation
      shakeAnim.value = 0;

      // Check if this is a money-stealing event (bully or similar)
      // Note: STASH_LOCKED is NOT a money-stealing event, it confiscates inventory/candy
      const isMoneyStealingEvent = currentEvent.effect === 'LOSE_MONEY'; // Only LOSE_MONEY events show money counter

      // Check if this is a money-gaining event (found money or similar)
      const isMoneyGainingEvent =
        currentEvent.effect === 'FOUND_MONEY' || // Direct check for FOUND_MONEY effect
        (currentEvent.category === 'good' &&
          (currentEvent.title?.toLowerCase().includes('found') ||
            currentEvent.title?.toLowerCase().includes('money') ||
            currentEvent.title?.toLowerCase().includes('cash') ||
            currentEvent.title?.toLowerCase().includes('jackpot') ||
            currentEvent.heading?.toLowerCase().includes('jackpot') ||
            currentEvent.heading?.toLowerCase().includes('lucky') ||
            currentEvent.subtitle?.toLowerCase().includes('found') ||
            currentEvent.subtitle?.toLowerCase().includes('picked up')));

      // For LOSE_MONEY events, use the stored original balance and amount stolen
      let startAmount = balance;
      let endAmount = balance;
      if (isMoneyStealingEvent) {
        if (currentEvent.effect === 'LOSE_MONEY') {
          // Use the stored original balance (before spend) and amount stolen
          if (
            currentEvent.originalBalance !== undefined &&
            currentEvent.amountStolen !== undefined
          ) {
            startAmount = currentEvent.originalBalance;
            endAmount =
              currentEvent.originalBalance - currentEvent.amountStolen;
          } else {
            // Fallback for old events without stored values
            const fiftyPercent = Math.floor(balance * 0.5);
            const amountToSteal = currentEvent.dollarAmount || fiftyPercent;
            endAmount = Math.max(0, balance - amountToSteal);
          }
        } else {
          // Other money-stealing events: check if they take all money
          const takesAllMoney = currentEvent.subtitle
            ?.toLowerCase()
            .includes('all your money');
          endAmount = takesAllMoney ? 0 : balance * 0.5;
        }
      }

      if (currentEvent.category === 'bad') {
        // Trigger warning haptic feedback and negative sound for negative events
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        const negSoundTimeout = setTimeout(() => {
          SoundEffects.playNegativeSound();
        }, 300);
        animationTimeouts.current.push(negSoundTimeout);

        // For BAD events: Immediate appearance with shake
        fadeAnim.value = 1;
        scaleAnim.value = 1;

        // If it's a money-stealing event, show money loss and delay dismissal
        if (isMoneyStealingEvent && startAmount > 0) {
          setCanDismiss(false);
          setShowMoneyLoss(true);
          setStartAmount(startAmount);
          setFinalAmount(endAmount);
          moneyValue.value = startAmount;

          // Animate on UI thread with Reanimated
          moneyValue.value = withTiming(
            endAmount,
            {
              duration: 2000,
              easing: Easing.out(Easing.cubic),
            },
            (finished) => {
              if (finished) {
                runOnJS(setCanDismiss)(true);
              }
            }
          );
        } else {
          // For other bad events, enforce 1 second minimum display time
          setCanDismiss(false);
          setShowMoneyLoss(false);
          const dismissTimeout = setTimeout(() => {
            setCanDismiss(true);
          }, 1000);
          animationTimeouts.current.push(dismissTimeout);
        }

        // Shake animation for 0.5 seconds (runs on UI thread via Reanimated)
        shakeAnim.value = withSequence(
          withTiming(10, { duration: 50 }),
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 50 }),
          withTiming(-10, { duration: 50 }),
          withTiming(5, { duration: 50 }),
          withTiming(-5, { duration: 50 }),
          withTiming(5, { duration: 50 }),
          withTiming(-5, { duration: 50 }),
          withTiming(0, { duration: 100 })
        );
      } else {
        // For GOOD/NEUTRAL events: Smooth fade in and scale up
        fadeAnim.value = withTiming(1, { duration: 800 });
        scaleAnim.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.5)) });

        // If it's a money-gaining event, start count-up animation and play positive sound
        if (isMoneyGainingEvent) {
          SoundEffects.playPositiveSound();
          // Get the actual amount from the event data
          const moneyGained = currentEvent.dollarAmount || 10;
          // For FOUND_MONEY events, the money has already been added to balance
          // So we need to calculate what the balance was before
          const startingAmount = balance - moneyGained;
          const endingAmount = balance;

          setCanDismiss(false);
          setShowMoneyGain(true);
          setStartAmount(startingAmount);
          setFinalAmount(endingAmount);
          moneyValue.value = startingAmount;

          // Animate on UI thread with Reanimated
          moneyValue.value = withTiming(
            endingAmount,
            {
              duration: 1500,
              easing: Easing.out(Easing.cubic),
            },
            (finished) => {
              if (finished) {
                runOnJS(setCanDismiss)(true);
              }
            }
          );
        } else {
          // For other good/neutral events
          setCanDismiss(true);
          setShowMoneyLoss(false);
          setShowMoneyGain(false);
        }
      }
    }

    // Cleanup animation on unmount or event change
    return () => {
      // Clear any running animation timeouts
      animationTimeouts.current.forEach((timeout) => clearTimeout(timeout));
      animationTimeouts.current = [];
      // Cancel running UI-thread animations so completion callbacks don't fire
      // against stale state on the next event (worklet -> runOnJS leak).
      cancelAnimation(moneyValue);
      cancelAnimation(shakeAnim);
      cancelAnimation(fadeAnim);
      cancelAnimation(scaleAnim);
    };
  }, [currentEvent]);

  const handleDetentionClaim = useCallback((joker: StandardizedJoker) => {
    if (detentionChosen) return;

    const isOneTime = joker.type === 'one-time';

    // Block persistent jokers if slots are full — but still allow dismissal
    if (!isOneTime && !canAddPersistentJoker()) {
      // Can't add this joker, but don't silently block — just skip it
      if (__DEV__) console.log('Detention: Aura slots full, cannot claim persistent joker');
      return;
    }

    const jokerToAdd: JokerType = {
      id: joker.id,
      name: joker.name,
      description: joker.description,
      type: isOneTime ? 'one-time' : 'persistent',
      effect: '',
      effects: joker.effects,
      level: 1,
    };

    addJoker(jokerToAdd, 'event');
    setDetentionChosen(true);
    SoundEffects.playPositiveSound();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Auto-dismiss after a short delay
    const detentionTimeout = setTimeout(() => {
      setShowDetentionDiscovery(false);
      setDetentionChoices([]);
      setDetentionChosen(false);
      dismissEvent();
    }, 1200);
    animationTimeouts.current.push(detentionTimeout);
  }, [detentionChosen, addJoker, canAddPersistentJoker, dismissEvent]);

  const handleDismissCleanup = useCallback(() => {
    // Reset all animation state
    setShowMoneyLoss(false);
    setShowMoneyGain(false);
    setStartAmount(0);
    setFinalAmount(0);
    moneyValue.value = 0;
    // Clear any running animation timeouts
    animationTimeouts.current.forEach((timeout) => clearTimeout(timeout));
    animationTimeouts.current = [];

    // Read from ref to avoid stale closure from Reanimated worklet callbacks.
    // runOnJS captures the function reference at worklet creation time, so
    // the useCallback closure may hold an outdated currentEvent.
    const event = currentEventRef.current;

    if (__DEV__) {
      console.log('🎲 DETENTION CHECK:', {
        hasEvent: !!event,
        effect: event?.effect,
        hasJokerDrop: event?.hasJokerDrop,
        choicesCount: event?.detentionJokerChoices?.length ?? 0,
      });
    }

    if (event?.hasJokerDrop && event?.detentionJokerChoices?.length > 0) {
      if (__DEV__) console.log('🎲 DETENTION: Showing joker selection!', event.detentionJokerChoices.map((j: any) => j.name));
      setDetentionChoices(event.detentionJokerChoices);
      setShowDetentionDiscovery(true);
      setDetentionChosen(false);
      // Play a discovery sound
      SoundEffects.playPositiveSound();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return; // Don't dismiss yet — show joker selection first
    }

    // Callback will be executed in dismissEvent
    dismissEvent();
  }, [dismissEvent]);

  const handleDismiss = useCallback(() => {
    // Only allow dismissal if canDismiss is true
    if (!canDismiss) {
      return;
    }

    // Fade out and scale down before dismissing.
    // RE4-safe: invoke cleanup via JS-side timeout instead of withTiming
    // callback (UI-thread worklet callback crashes when calling non-worklet
    // functions like the JS-side cleanup).
    fadeAnim.value = withTiming(0, { duration: 300 });
    scaleAnim.value = withTiming(0.8, { duration: 300 });
    setTimeout(handleDismissCleanup, 300);
  }, [canDismiss, handleDismissCleanup]);

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scaleAnim.value },
      { translateX: shakeAnim.value },
    ],
  }));

  // Show Detention Discovery joker selection overlay
  if (__DEV__) console.log('🎲 DETENTION RENDER CHECK:', { showDetentionDiscovery, choicesLength: detentionChoices.length, currentEventExists: !!currentEvent });
  if (showDetentionDiscovery && detentionChoices.length > 0) {
    if (__DEV__) console.log('🎲 DETENTION: Rendering joker selection UI!');
    return (
      <View
        style={[styles.modalOverlay, { opacity: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)' }]}
        pointerEvents="auto"
      >
        <View style={styles.centeredContainer}>
          <PixelBorder
            borderColor="#d4af37"
            borderWidth={4}
            backgroundColor="#00512C"
            innerPadding={0}
            style={{ width: '90%', maxWidth: 400, maxHeight: '90%' }}
          >
            <View style={{ padding: 20 }}>
              <Text style={styles.detentionTitle}>
                Detention Discovery!
              </Text>
              <Text style={styles.detentionSubtitle}>
                While hiding, you found something interesting...
              </Text>
              <Text style={styles.detentionInstruction}>
                Pick one to keep:
              </Text>

              <ScrollView
                style={{ maxHeight: 400 }}
                contentContainerStyle={{ gap: 12, paddingBottom: 8 }}
              >
                {detentionChoices.map((joker) => (
                  <JokerCard
                    key={joker.id.toString()}
                    joker={{
                      id: Number(joker.id),
                      name: joker.name,
                      type: joker.type === 'one-time' ? 'one-time' : 'persistent',
                      flavorText: (joker as any).flavorText || '',
                      description: joker.description,
                    }}
                    isAfterSchool={false}
                    isCompact={true}
                    showOwned={false}
                    disableActivation={true}
                    onPress={
                      detentionChosen ? undefined : () => handleDetentionClaim(joker)
                    }
                    selectionDisabled={detentionChosen}
                  />
                ))}
              </ScrollView>

              {detentionChosen && (
                <Text style={styles.detentionClaimedText}>
                  Nice find!
                </Text>
              )}

              {/* Skip/close button — always available as escape hatch */}
              {!detentionChosen && (
                <TouchableOpacity
                  style={{ marginTop: 12, alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16 }}
                  onPress={() => {
                    setShowDetentionDiscovery(false);
                    setDetentionChoices([]);
                    setDetentionChosen(false);
                    dismissEvent();
                  }}
                >
                  <Text style={{ color: '#d4af37', fontSize: 12, fontFamily: 'PixeloidMono' }}>Skip</Text>
                </TouchableOpacity>
              )}
            </View>
          </PixelBorder>
        </View>
      </View>
    );
  }

  if (!currentEvent) {
    return null;
  }

  const theme = getTheme(currentEvent.category!);

  // Use absolute positioning for proper visibility
  return (
    <ReAnimated.View
      style={[styles.modalOverlay, overlayAnimatedStyle]}
      pointerEvents="auto"
    >
      <TouchableOpacity
        style={styles.backgroundTouchable}
        onPress={handleDismiss}
        activeOpacity={1}
      />

      <ReAnimated.View
        style={[
          styles.centeredContainer,
          containerAnimatedStyle,
        ]}
      >
        {currentEvent.backgroundImage ? (
          <PixelBorder
            borderColor={
              currentEvent.category === 'bad'
                ? '#ef4444'
                : currentEvent.category === 'good'
                  ? '#86efac'
                  : theme.borderColor
            }
            borderWidth={4}
            backgroundColor="transparent"
            innerPadding={0}
            style={{
              width: '90%',
              maxWidth: 400,
              maxHeight: '90%',
            }}
          >
            <View style={styles.modalWithBackground}>
              <ImageBackground
                source={getResolvedImage(
                  currentEvent.backgroundImage,
                  currentEvent.effect
                )}
                style={{ flex: 1 }}
                resizeMode="cover"
              >
                <View style={[styles.overlayContent]}>
                  <Text style={[styles.heading, { color: theme.titleColor }]}>
                    {currentEvent.heading}
                  </Text>

                  <PixelBorder
                    borderColor={theme.borderColor}
                    borderWidth={3}
                    backgroundColor={theme.containerColor}
                    innerPadding={12}
                  >
                    <View style={styles.subtitleContainer}>
                      <Text style={[styles.title, { color: theme.titleColor }]}>
                        {currentEvent.title}
                      </Text>
                      {currentEvent.protectedByBodyguard ? (
                        <Text
                          style={[styles.subtitle, { color: theme.textColor }]}
                        >
                          STOP!
                        </Text>
                      ) : (
                        <Text
                          style={[styles.subtitle, { color: theme.textColor }]}
                        >
                          {currentEvent.subtitle}
                        </Text>
                      )}
                      {currentEvent.bullyHasMercy && (
                        // <PixelBorder
                        //   borderColor="white"
                        //   borderWidth={3}
                        //   innerPadding={12}
                        //   style={{ marginTop: 12 }}
                        // >
                        <View style={styles.protectionContainer}>
                          <TextWithEmojis style={styles.protectionEmoji}>
                            💸
                          </TextWithEmojis>
                          <Text style={styles.protectionText}>
                            The bully has mercy on your poor wallet
                          </Text>
                        </View>
                        // </PixelBorder>
                      )}
                      {currentEvent.protectedByBodyguard && (
                        <View style={styles.protectionContainer}>
                          <Image
                            source={require('../../assets/images/icons/bodyguard.png')}
                            style={{
                              width: 64,
                              height: 64,
                              resizeMode: 'contain',
                              marginBottom: 8,
                            }}
                          />
                          <Text style={styles.protectionText}>
                            Why dont you pick on someone your own size
                          </Text>
                          <Text style={styles.protectionSubtext}>
                            Bully ran away
                          </Text>
                        </View>
                      )}
                      {currentEvent.protectedByMedievalShield && (
                        <View style={styles.protectionContainer}>
                          <Image
                            source={require('../../assets/images/emojis/shield.png')}
                            style={{
                              width: 64,
                              height: 64,
                              resizeMode: 'contain',
                              marginBottom: 8,
                            }}
                          />
                          <Text style={styles.protectionText}>
                            Medieval Shield Activated!
                          </Text>
                          <Text style={styles.protectionSubtext}>
                            Your money is safe
                          </Text>
                          <Text style={styles.protectionSubtext}>
                            Shield has been used
                          </Text>
                        </View>
                      )}
                      {currentEvent.protectedByCandyVault && (
                        <View style={styles.protectionContainer}>
                          <Image
                            source={require('../../assets/images/emojis/lock.png')}
                            style={{
                              width: 64,
                              height: 64,
                              resizeMode: 'contain',
                              marginBottom: 8,
                            }}
                          />
                          <Text style={styles.protectionText}>
                            Candy Vault Activated!
                          </Text>
                          <Text style={styles.protectionSubtext}>
                            Your candy is safe
                          </Text>
                          <Text style={styles.protectionSubtext}>
                            Vault has been used
                          </Text>
                        </View>
                      )}
                      {currentEvent.protectedByHallMonitorBribe && (
                        <PixelBorder
                          borderColor="#52c41a"
                          borderWidth={3}
                          backgroundColor="rgba(0, 0, 0, 0.2)"
                          innerPadding={12}
                          style={{ marginTop: 12 }}
                        >
                          <View style={styles.protectionContainer}>
                            <Image
                              source={require('../../assets/images/icons/bribe.png')}
                              style={{
                                width: 48,
                                height: 48,
                                resizeMode: 'contain',
                                marginBottom: 8,
                              }}
                            />
                            <Text style={styles.protectionText}>
                              Hall Monitor Bribed!
                            </Text>
                            <Text style={styles.protectionSubtext}>
                              Your candy is protected
                            </Text>
                          </View>
                        </PixelBorder>
                      )}
                      {showMoneyLoss &&
                        !currentEvent.protectedByBodyguard &&
                        !currentEvent.protectedByMedievalShield &&
                        !currentEvent.bullyHasMercy && (
                          <PixelBorder
                            borderColor="#ef4444"
                            borderWidth={3}
                            backgroundColor="rgba(239, 68, 68, 0.2)"
                            innerPadding={12}
                            style={{ marginTop: 12 }}
                          >
                            <Text style={styles.moneyChangeLabel}>
                              Lost: -${formatCurrency(startAmount - finalAmount)}
                            </Text>
                            <View style={styles.moneyCountdownContainer}>
                              <Text style={styles.moneyLabel}>
                                ${formatCurrency(startAmount)} →
                              </Text>
                              <AnimatedMoneyCounter
                                startValue={startAmount}
                                endValue={finalAmount}
                                duration={2000}
                                moneyLoss={true}
                                isActive={showMoneyLoss}
                              />
                            </View>
                          </PixelBorder>
                        )}
                      {showMoneyGain && (
                        <PixelBorder
                          borderColor="#86efac"
                          borderWidth={3}
                          backgroundColor="rgba(134, 239, 172, 0.2)"
                          innerPadding={12}
                          style={{ marginTop: 12 }}
                        >
                          <Text style={styles.moneyGainLabel}>
                            Gained: +${formatCurrency(finalAmount - startAmount)}
                          </Text>
                          <View style={styles.moneyGainContainer}>
                            <Text style={styles.moneyLabel}>
                              ${formatCurrency(startAmount)} →
                            </Text>
                            <AnimatedMoneyCounter
                              startValue={startAmount}
                              endValue={finalAmount}
                              duration={1500}
                              moneyLoss={false}
                              isActive={showMoneyGain}
                            />
                          </View>
                        </PixelBorder>
                      )}
                    </View>
                  </PixelBorder>

                  <PressableButton
                    onPress={handleDismiss}
                    disabled={!canDismiss}
                    shadowColor={
                      currentEvent.category === 'bad'
                        ? 'rgba(185,28,28,1)'
                        : 'rgba(123,169,101,1)'
                    }
                    shadowOffset={{ width: 0, height: 4 }}
                    shadowOpacity={canDismiss ? 0.5 : 0.2}
                    shadowRadius={5}
                    elevation={8}
                    style={{ opacity: canDismiss ? 1 : 0.5, marginTop: 12 }}
                  >
                    <PixelBorder
                      borderColor={
                        currentEvent.category === 'bad'
                          ? 'rgba(185,28,28,1)'
                          : 'rgba(123,169,101,1)'
                      }
                      borderWidth={3}
                      backgroundColor={
                        currentEvent.category === 'bad'
                          ? 'rgba(239,68,68,1)'
                          : 'rgba(154,193,118,1)'
                      }
                      innerPadding={0}
                    >
                      <View style={styles.dismissButton}>
                        <Text style={styles.dismissText}>
                          {!canDismiss
                            ? 'Please wait...'
                            : currentEvent.protectedByBodyguard ||
                                currentEvent.protectedByMedievalShield ||
                                currentEvent.protectedByCandyVault ||
                                currentEvent.protectedByHallMonitorBribe
                              ? 'Noice!'
                              : currentEvent.dismissText
                                ? currentEvent.dismissText
                                : currentEvent.category === 'bad'
                                  ? 'Ah Shucks!'
                                  : 'Noice!'}
                        </Text>
                      </View>
                    </PixelBorder>
                  </PressableButton>
                </View>
              </ImageBackground>
            </View>
          </PixelBorder>
        ) : (
          <PixelBorder
            borderColor={
              currentEvent.category === 'bad'
                ? '#ef4444'
                : currentEvent.category === 'good'
                  ? '#86efac'
                  : theme.borderColor
            }
            borderWidth={4}
            backgroundColor={theme.backgroundColor}
            innerPadding={0}
            style={{ width: '90%', maxWidth: 400, maxHeight: '90%' }}
          >
            <View
              style={[
                styles.modal,
                {
                  backgroundColor: theme.backgroundColor,
                  borderColor: theme.borderColor,
                },
              ]}
            >
              <Text style={[styles.heading, { color: theme.buttonColor }]}>
                {currentEvent.heading}
              </Text>

              <PixelBorder
                borderColor={theme.borderColor}
                borderWidth={2}
                backgroundColor="rgba(255, 255, 255, 0.1)"
                innerPadding={16}
              >
                <View style={styles.subtitleContainer}>
                  <Text style={[styles.title, { color: colors.gray.dark }]}>
                    {currentEvent.title}
                  </Text>
                  <Text style={[styles.subtitle, { color: '#444' }]}>
                    {currentEvent.subtitle}
                  </Text>
                  {showMoneyLoss && (
                    <PixelBorder
                      borderColor="#ef4444"
                      borderWidth={3}
                      backgroundColor="rgba(239, 68, 68, 0.2)"
                      innerPadding={12}
                      style={{ marginTop: 12 }}
                    >
                      <Text style={styles.moneyChangeLabel}>
                        Lost: -${formatCurrency(startAmount - finalAmount)}
                      </Text>
                      <View style={styles.moneyCountdownContainer}>
                        <Text style={styles.moneyLabel}>
                          ${formatCurrency(startAmount)} →
                        </Text>
                        <AnimatedMoneyCounter
                          startValue={startAmount}
                          endValue={finalAmount}
                          duration={2000}
                          isActive={showMoneyLoss}
                        />
                      </View>
                    </PixelBorder>
                  )}
                  {showMoneyGain && (
                    <PixelBorder
                      borderColor="#86efac"
                      borderWidth={3}
                      backgroundColor="rgba(134, 239, 172, 0.2)"
                      innerPadding={12}
                      style={{ marginTop: 12 }}
                    >
                      <Text style={styles.moneyGainLabel}>
                        Gained: +${formatCurrency(finalAmount - startAmount)}
                      </Text>
                      <View style={styles.moneyGainContainer}>
                        <Text style={styles.moneyLabel}>
                          ${formatCurrency(startAmount)} →
                        </Text>
                        <AnimatedMoneyCounter
                          startValue={startAmount}
                          endValue={finalAmount}
                          duration={1500}
                          isActive={showMoneyGain}
                        />
                      </View>
                    </PixelBorder>
                  )}
                </View>
              </PixelBorder>

              <PressableButton
                onPress={handleDismiss}
                disabled={!canDismiss}
                shadowColor={
                  currentEvent.category === 'bad'
                    ? 'rgba(185,28,28,1)'
                    : 'rgba(123,169,101,1)'
                }
                shadowOffset={{ width: 0, height: 4 }}
                shadowOpacity={canDismiss ? 0.5 : 0.2}
                shadowRadius={5}
                elevation={8}
                style={{ opacity: canDismiss ? 1 : 0.5, marginTop: 12 }}
              >
                <PixelBorder
                  borderColor={
                    currentEvent.category === 'bad'
                      ? 'rgba(185,28,28,1)'
                      : 'rgba(123,169,101,1)'
                  }
                  borderWidth={3}
                  backgroundColor={
                    currentEvent.category === 'bad'
                      ? 'rgba(239,68,68,1)'
                      : 'rgba(154,193,118,1)'
                  }
                  innerPadding={0}
                >
                  <View style={styles.dismissButton}>
                    <Text style={styles.dismissText}>
                      {!canDismiss
                        ? '⏳ Please wait...'
                        : currentEvent.dismissText || 'Got it!'}
                    </Text>
                  </View>
                </PixelBorder>
              </PressableButton>
            </View>
          </PixelBorder>
        )}
      </ReAnimated.View>
    </ReAnimated.View>
  );
});

export default EventModal;

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 999999,
    elevation: 999999,
  },
  backgroundTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    padding: 24,
  },
  modalWithBackground: {
    width: '100%',
    height: 500,
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: colors.black, // Fallback color to see if container is working
  },
  backgroundImage: {
    borderRadius: 20,
  },
  overlayContent: {
    padding: 16,
    justifyContent: 'space-between',
    flex: 1,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 8,
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitleContainer: {
    marginVertical: 4,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: 'CrayonPastel',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  dismissButton: {
    padding: 16,
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'PixeloidMono',
  },
  moneyCountdownContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moneyGainContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  protectionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  protectionEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  protectionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 4,
  },
  protectionSubtext: {
    fontSize: 14,
    color: colors.white,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  moneyLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    fontFamily: 'CrayonPastel',
    marginRight: 5,
  },
  moneyChangeLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(239, 68, 68, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  moneyGainLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(34, 197, 94, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  // Detention Discovery styles — matches joker tab color scheme
  detentionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#d4af37',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  detentionSubtitle: {
    fontSize: 14,
    color: '#f7e98e',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  detentionInstruction: {
    fontSize: 16,
    color: '#d4af37',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 12,
  },
  detentionJokerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d4af37',
    fontFamily: 'PixeloidMono',
    marginBottom: 4,
  },
  detentionJokerDesc: {
    fontSize: 13,
    color: '#f7e98e',
    fontFamily: 'CrayonPastel',
    lineHeight: 18,
    marginBottom: 4,
  },
  detentionJokerType: {
    fontSize: 11,
    color: '#8a9a7c',
    fontFamily: 'PixeloidMono',
    textAlign: 'right',
  },
  detentionClaimedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22c55e',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginTop: 12,
  },
});
