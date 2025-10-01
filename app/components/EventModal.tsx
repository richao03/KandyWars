import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  ImageBackground,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ReAnimated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useEventHandler } from '../../src/hooks/useEventHandler';
import { useWallet } from '../../src/hooks/useWallet';
import PixelBorder from './PixelBorder';

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

const AnimatedTextInput = ReAnimated.createAnimatedComponent(TextInput);

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

  useEffect(() => {
    if (isActive) {
      animatedValue.value = withTiming(endValue, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      animatedValue.value = startValue;
    }
  }, [isActive, startValue, endValue, duration]);

  const animatedProps = useAnimatedProps(() => {
    return {
      text: `${prefix}${animatedValue.value.toFixed(2)}`,
      defaultValue: `${prefix}${animatedValue.value.toFixed(2)}`,
    };
  });

  return (
    <AnimatedTextInput
      animatedProps={animatedProps}
      editable={false}
      style={{
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        fontFamily: 'CrayonPastel',
        textShadowColor: moneyLoss ? 'red' : '#00ff00',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: isActive && endValue < startValue ? 3 : 4,
      }}
    />
  );
};

const EventModal = React.memo(function EventModal() {
  const { currentEvent, dismissEvent, getTheme } = useEventHandler();
  const { balance } = useWallet();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [canDismiss, setCanDismiss] = useState(true);
  const [showMoneyLoss, setShowMoneyLoss] = useState(false);
  const [showMoneyGain, setShowMoneyGain] = useState(false);
  const [startAmount, setStartAmount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);

  // Reanimated shared values for smooth UI thread animations
  const moneyValue = useSharedValue(0);
  const animationTimeouts = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    if (currentEvent) {
      // Reset shake animation
      shakeAnim.setValue(0);

      // Check if this is a money-stealing event (bully or similar)
      const isMoneyStealingEvent =
        currentEvent.effect === 'LOSE_MONEY' || // Direct check for LOSE_MONEY effect
        (currentEvent.category === 'bad' &&
          (currentEvent.title?.toLowerCase().includes('bully') ||
            currentEvent.subtitle
              ?.toLowerCase()
              .includes('took all your money') ||
            currentEvent.subtitle?.toLowerCase().includes('took') ||
            currentEvent.subtitle?.toLowerCase().includes('stole')));

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

      // For LOSE_MONEY events, calculate the amount that will be stolen
      let endAmount = balance;
      if (isMoneyStealingEvent) {
        if (currentEvent.effect === 'LOSE_MONEY') {
          // Bully event: steal 50% of money (before joker protection)
          const fiftyPercent = Math.floor(balance * 0.5);
          const amountToSteal = currentEvent.dollarAmount || fiftyPercent;
          endAmount = Math.max(0, balance - amountToSteal);
        } else {
          // Other money-stealing events: check if they take all money
          const takesAllMoney = currentEvent.subtitle
            ?.toLowerCase()
            .includes('all your money');
          endAmount = takesAllMoney ? 0 : balance * 0.5;
        }
      }

      if (currentEvent.category === 'bad') {
        // Trigger warning haptic feedback for negative events
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        // For BAD events: Immediate appearance with shake
        fadeAnim.setValue(1);
        scaleAnim.setValue(1);

        // If it's a money-stealing event, show money loss and delay dismissal
        if (isMoneyStealingEvent && balance > 0) {
          setCanDismiss(false);
          setShowMoneyLoss(true);
          setStartAmount(balance);
          setFinalAmount(endAmount);
          moneyValue.value = balance;

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
          setTimeout(() => {
            setCanDismiss(true);
          }, 1000);
        }

        // Shake animation for 0.5 seconds
        Animated.sequence([
          Animated.timing(shakeAnim, {
            toValue: 10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 5,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -5,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 5,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -5,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        // For GOOD/NEUTRAL events: Smooth fade in and scale up
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start();

        // If it's a money-gaining event, start count-up animation
        if (isMoneyGainingEvent) {
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
    };
  }, [currentEvent, fadeAnim, scaleAnim, shakeAnim]);

  const handleDismiss = useCallback(() => {
    // Only allow dismissal if canDismiss is true
    if (!canDismiss) {
      return;
    }

    // Fade out and scale down before dismissing
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Reset all animation state
      setShowMoneyLoss(false);
      setShowMoneyGain(false);
      setStartAmount(0);
      setFinalAmount(0);
      moneyValue.value = 0;
      // Clear any running animation timeouts
      animationTimeouts.current.forEach((timeout) => clearTimeout(timeout));
      animationTimeouts.current = [];
      // Callback will be executed in dismissEvent
      dismissEvent();
    });
  }, [canDismiss, fadeAnim, scaleAnim, dismissEvent]);

  if (!currentEvent) {
    return null;
  }

  const theme = getTheme(currentEvent.category!);

  // Use absolute positioning for proper visibility
  return (
    <Animated.View
      style={[styles.modalOverlay, { opacity: fadeAnim }]}
      pointerEvents="auto"
    >
      <TouchableOpacity
        style={styles.backgroundTouchable}
        onPress={handleDismiss}
        activeOpacity={1}
      />

      <Animated.View
        style={[
          styles.centeredContainer,
          {
            transform: [{ scale: scaleAnim }, { translateX: shakeAnim }],
          },
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
                      <Text
                        style={[styles.subtitle, { color: theme.textColor }]}
                      >
                        {currentEvent.subtitle}
                      </Text>
                      {showMoneyLoss && (
                        <PixelBorder
                          borderColor="#ef4444"
                          borderWidth={3}
                          backgroundColor="rgba(0, 0, 0, 0.2)"
                          innerPadding={12}
                          style={{ marginTop: 12 }}
                        >
                          <View style={styles.moneyCountdownContainer}>
                            <Text style={styles.moneyLabel}>
                              ${startAmount.toFixed(2)} →
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
                          borderWidth={2}
                          backgroundColor="rgba(0, 0, 0, 0.2)"
                          innerPadding={12}
                          style={{ marginTop: 12 }}
                        >
                          <View style={styles.moneyGainContainer}>
                            <Text style={styles.moneyLabel}>
                              ${startAmount.toFixed(2)} →
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

                  <PixelBorder
                    borderColor={canDismiss ? theme.borderColor : '#666'}
                    borderWidth={3}
                    backgroundColor={canDismiss ? theme.buttonColor : '#888888'}
                    innerPadding={0}
                    style={{ opacity: canDismiss ? 1 : 0.5, marginTop: 12 }}
                  >
                    <TouchableOpacity
                      style={styles.dismissButton}
                      onPress={handleDismiss}
                      disabled={!canDismiss}
                    >
                      <Text style={styles.dismissText}>
                        {!canDismiss
                          ? 'Please wait...'
                          : currentEvent.dismissText ||
                              currentEvent.category === 'bad'
                            ? 'Ah Shucks!'
                            : 'Noice!'}
                      </Text>
                    </TouchableOpacity>
                  </PixelBorder>
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
                  <Text style={[styles.title, { color: '#333' }]}>
                    {currentEvent.title}
                  </Text>
                  <Text style={[styles.subtitle, { color: '#444' }]}>
                    {currentEvent.subtitle}
                  </Text>
                  {showMoneyLoss && (
                    <PixelBorder
                      borderColor="#ef4444"
                      borderWidth={2}
                      backgroundColor="rgba(0, 0, 0, 0.2)"
                      innerPadding={12}
                      style={{ marginTop: 12 }}
                    >
                      <View style={styles.moneyCountdownContainer}>
                        <Text style={styles.moneyLabel}>
                          ${startAmount.toFixed(2)} →
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
                      borderWidth={2}
                      backgroundColor="rgba(0, 0, 0, 0.2)"
                      innerPadding={12}
                      style={{ marginTop: 12 }}
                    >
                      <View style={styles.moneyGainContainer}>
                        <Text style={styles.moneyLabel}>
                          ${startAmount.toFixed(2)} →
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

              <PixelBorder
                borderColor={canDismiss ? theme.borderColor : '#666'}
                borderWidth={3}
                backgroundColor={canDismiss ? theme.buttonColor : '#888888'}
                innerPadding={0}
                style={{ opacity: canDismiss ? 1 : 0.5, marginTop: 12 }}
              >
                <TouchableOpacity
                  style={styles.dismissButton}
                  onPress={handleDismiss}
                  disabled={!canDismiss}
                >
                  <Text style={styles.dismissText}>
                    {!canDismiss
                      ? '⏳ Please wait...'
                      : currentEvent.dismissText || 'Got it!'}
                  </Text>
                </TouchableOpacity>
              </PixelBorder>
            </View>
          </PixelBorder>
        )}
      </Animated.View>
    </Animated.View>
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
    minHeight: 450,
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: '#000', // Fallback color to see if container is working
  },
  backgroundImage: {
    borderRadius: 20,
  },
  overlayContent: {
    padding: 24,
    justifyContent: 'space-between',
    minHeight: 450,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 12,
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitleContainer: {
    marginVertical: 8,
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
  moneyLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'CrayonPastel',
    marginRight: 5,
  },
});
