import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useEventHandler } from '../../src/context/EventHandlerContext';
import { useWallet } from '../../src/context/WalletContext';

const AnimatedTextInput = ReAnimated.createAnimatedComponent(TextInput);

// Custom component for animated money display
const AnimatedMoneyCounter = ({ startValue, endValue, duration = 2000, isActive, prefix = '$' }) => {
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
        textShadowColor: isActive && endValue < startValue ? 'red' : '#00ff00',
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
        (currentEvent.effect === 'LOSE_MONEY') ||  // Direct check for LOSE_MONEY effect
        (currentEvent.category === 'bad' &&
          (currentEvent.title?.toLowerCase().includes('bully') ||
           currentEvent.subtitle
             ?.toLowerCase()
             .includes('took all your money') ||
           currentEvent.subtitle?.toLowerCase().includes('took') ||
           currentEvent.subtitle?.toLowerCase().includes('stole')));

      // Check if this is a money-gaining event (found money or similar)
      const isMoneyGainingEvent =
        (currentEvent.effect === 'FOUND_MONEY') ||  // Direct check for FOUND_MONEY effect
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
          moneyValue.value = withTiming(endAmount, {
            duration: 2000,
            easing: Easing.out(Easing.cubic),
          }, (finished) => {
            if (finished) {
              runOnJS(setCanDismiss)(true);
            }
          });
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
          moneyValue.value = withTiming(endingAmount, {
            duration: 1500,
            easing: Easing.out(Easing.cubic),
          }, (finished) => {
            if (finished) {
              runOnJS(setCanDismiss)(true);
            }
          });
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
      animationTimeouts.current.forEach(timeout => clearTimeout(timeout));
      animationTimeouts.current = [];
    };
  }, [currentEvent, fadeAnim, scaleAnim, shakeAnim, balance]);

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
      animationTimeouts.current.forEach(timeout => clearTimeout(timeout));
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
          <View style={styles.modalWithBackground}>
            <ImageBackground
              source={currentEvent.backgroundImage}
              style={{ flex: 1 }}
              imageStyle={styles.backgroundImage}
              resizeMode="cover"
              onError={(error) => console.log('ImageBackground error:', error)}
              onLoad={() => console.log('ImageBackground loaded successfully')}
            >
              <View style={[styles.overlayContent]}>
                <Text style={[styles.heading, { color: theme.titleColor }]}>
                  {currentEvent.heading}
                </Text>

                <View
                  style={[
                    styles.subtitleContainer,
                    { backgroundColor: theme.containerColor },
                  ]}
                >
                  <Text style={[styles.title, { color: theme.titleColor }]}>
                    {currentEvent.title}
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.textColor }]}>
                    {currentEvent.subtitle}
                  </Text>
                  {showMoneyLoss && (
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
                  )}
                  {showMoneyGain && (
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
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.dismissButton,
                    {
                      backgroundColor: canDismiss
                        ? theme.buttonColor
                        : '#888888',
                      opacity: canDismiss ? 1 : 0.5,
                    },
                  ]}
                  onPress={handleDismiss}
                  disabled={!canDismiss}
                >
                  <Text style={styles.dismissText}>
                    {!canDismiss
                      ? '⏳ Please wait...'
                      : currentEvent.dismissText || '👍 Got it!'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ImageBackground>
          </View>
        ) : (
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

            <Text style={[styles.title, { color: '#333' }]}>
              {currentEvent.title}
            </Text>

            <View style={styles.subtitleContainer}>
              <Text style={[styles.subtitle, { color: '#444' }]}>
                {currentEvent.subtitle}
              </Text>
              {showMoneyLoss && (
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
              )}
              {showMoneyGain && (
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
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.dismissButton,
                {
                  backgroundColor: canDismiss ? theme.buttonColor : '#888888',
                  opacity: canDismiss ? 1 : 0.5,
                },
              ]}
              onPress={handleDismiss}
              disabled={!canDismiss}
            >
              <Text style={styles.dismissText}>
                {!canDismiss
                  ? '⏳ Please wait...'
                  : currentEvent.dismissText || '👍 Got it!'}
              </Text>
            </TouchableOpacity>
          </View>
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
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 350,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  modalWithBackground: {
    width: '100%',
    maxWidth: 350,
    height: 400,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
    backgroundColor: '#000', // Fallback color to see if container is working
  },
  backgroundImage: {
    borderRadius: 20,
    resizeMode: 'cover',
  },
  overlayContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'CrayonPastel',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 12,
    fontFamily: 'CrayonPastel',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitleContainer: {
    backgroundColor: 'rgba(50, 50, 50, 0.4)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: 'CrayonPastel',
    fontWeight: '600',
  },
  dismissButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  dismissText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'CrayonPastel',
  },
  moneyCountdownContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moneyGainContainer: {
    backgroundColor: 'rgba(0, 128, 0, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#00ff00',
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
