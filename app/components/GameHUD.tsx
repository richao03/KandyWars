import { Marquee } from '@animatereactnative/marquee';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useFlavorText } from '../../src/context/FlavorTextContext';
import { useGame } from '../../src/hooks/useGame';
import { useInventory } from '../../src/hooks/useInventory';
import { useWallet } from '../../src/hooks/useWallet';
import { EMOJI_IMAGES, EMOJI_TO_IMAGE_MAP } from '../../utils/eventImages';
import PixelBorder from './PixelBorder';

// Helper function to render text with emojis replaced by images
const renderTextWithEmojis = (text: string, textStyle: any) => {
  // Check if text contains any mappable emojis
  const hasEmojis = Object.keys(EMOJI_TO_IMAGE_MAP).some((emoji) =>
    text.includes(emoji)
  );

  if (!hasEmojis) {
    return <Text style={textStyle}>{text}</Text>;
  }

  // Create a regex pattern for all supported emojis
  const emojiPattern = Object.keys(EMOJI_TO_IMAGE_MAP)
    .map((emoji) => emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // Escape special regex chars
    .join('|');

  const regex = new RegExp(`(${emojiPattern})`, 'g');
  const parts = text.split(regex);
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (part && EMOJI_TO_IMAGE_MAP[part as keyof typeof EMOJI_TO_IMAGE_MAP]) {
      // This part is a supported emoji, replace with image(s)
      const imageKey =
        EMOJI_TO_IMAGE_MAP[part as keyof typeof EMOJI_TO_IMAGE_MAP];

      // Regular emoji becomes 1 image
      elements.push(
        <Image
          key={`${imageKey}-${i}`}
          source={EMOJI_IMAGES[imageKey]}
          style={styles.emojiImage}
          resizeMode="contain"
        />
      );
    } else if (part) {
      // This part is regular text
      elements.push(
        <Text key={`text-${i}`} style={textStyle}>
          {part}
        </Text>
      );
    }
  }

  return <View style={styles.textWithEmojis}>{elements}</View>;
};

const locationNames = {
  gym: 'Gymnasium',
  cafeteria: 'Cafeteria',
  'home room': 'Home Room',
  library: 'Library',
  'science lab': 'Science Lab',
  'school yard': 'School Yard',
  bathroom: 'Bathroom',
  'the connect': 'The Connect',
} as const;

interface GameHUDProps {
  isModalOpening?: boolean;
  isModalOpen?: boolean;
  theme?: 'school' | 'evening';
  customHeaderText?: string;
  customLocationText?: string;
  flavorTextWrapper?: (children: React.ReactNode) => React.ReactNode;
  inventoryWrapper?: (children: React.ReactNode) => React.ReactNode;
  onInventoryPress?: () => void;
  disableBalanceAnimation?: boolean;
  showLunchMinigames: boolean;
}

function GameHUD({
  isModalOpening = false,
  isModalOpen = false,
  theme = 'school',
  customHeaderText,
  customLocationText,
  flavorTextWrapper,
  inventoryWrapper,
  onInventoryPress,
  showLunchMinigames,
  disableBalanceAnimation = false,
}: GameHUDProps) {
  const { balance, stashedAmount } = useWallet();
  const { day, period, currentLocation } = useGame();
  const { getTotalInventoryCount, getInventoryLimit } = useInventory();
  const { text, isHint, eventType } = useFlavorText();

  // Animation state for money change indicator
  const [moneyChange, setMoneyChange] = useState<number | null>(null);
  const previousBalance = useRef<number | null>(null);
  const isInitialized = useRef(false);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const shakeX = useSharedValue(0);

  // Animation state for stashed amount change indicator (piggy bank)
  const [stashedChange, setStashedChange] = useState<number | null>(null);
  const previousStashed = useRef<number | null>(null);
  const isStashedInitialized = useRef(false);
  const stashedTranslateY = useSharedValue(0);
  const stashedOpacity = useSharedValue(0);
  const stashedScale = useSharedValue(0.8);
  const piggyShakeX = useSharedValue(0);

  // Initialize previous balance on first render
  useEffect(() => {
    if (!isInitialized.current) {
      previousBalance.current = balance;
      isInitialized.current = true;
    }
  }, []);

  // Initialize previous stashed amount on first render
  useEffect(() => {
    if (!isStashedInitialized.current) {
      previousStashed.current = stashedAmount;
      isStashedInitialized.current = true;
    }
  }, []);

  // Detect balance changes and trigger animation
  useEffect(() => {
    if (!isInitialized.current || previousBalance.current === null) {
      return;
    }

    const change = balance - previousBalance.current;

    if (change !== 0) {
      // Set the change amount
      setMoneyChange(change);

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
          runOnJS(setMoneyChange)(null);
        })
      );

      scale.value = withSequence(
        withSpring(1.2, { damping: 12, stiffness: 200 }),
        withSpring(1, { damping: 15, stiffness: 150 })
      );

      // Shake the wallet container
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

    previousBalance.current = balance;
  }, [balance]);

  // Detect stashed amount changes and trigger animation
  useEffect(() => {
    if (!isStashedInitialized.current || previousStashed.current === null) {
      return;
    }

    const change = stashedAmount - previousStashed.current;

    if (change !== 0) {
      // Set the change amount
      setStashedChange(change);

      // Start animation sequence
      stashedTranslateY.value = 0;
      stashedOpacity.value = 0;
      stashedScale.value = 0.8;
      piggyShakeX.value = 0;

      // Animate in, hold, then fade out
      stashedTranslateY.value = withSequence(
        withSpring(-40, { damping: 15, stiffness: 200 }),
        withTiming(-50, { duration: 1000 }),
        withTiming(-60, { duration: 300 })
      );

      stashedOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 300 }, () => {
          runOnJS(setStashedChange)(null);
        })
      );

      stashedScale.value = withSequence(
        withSpring(1.2, { damping: 12, stiffness: 200 }),
        withSpring(1, { damping: 15, stiffness: 150 })
      );

      // Shake the piggy bank container
      piggyShakeX.value = withSequence(
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

  // Animated style for money change indicator
  const animatedMoneyChangeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  // Animated style for wallet shake
  const animatedWalletStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  // Animated style for stashed change indicator
  const animatedStashedChangeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: stashedTranslateY.value },
      { scale: stashedScale.value },
    ],
    opacity: stashedOpacity.value,
  }));

  // Animated style for piggy bank shake
  const animatedPiggyBankStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: piggyShakeX.value }],
  }));

  // Animation state for location badge bounce
  const previousLocation = useRef<string | null>(null);
  const isLocationInitialized = useRef(false);
  const locationBounceScale = useSharedValue(1);

  // Animated style for location badge bounce
  const animatedLocationBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: locationBounceScale.value }],
  }));

  const totalInventory = getTotalInventoryCount();
  const inventoryCapacity = useMemo(
    () => getInventoryLimit(),
    [getInventoryLimit]
  );
  const containerStyle =
    theme === 'evening' ? styles.eveningContainer : styles.container;
  const headerStyle =
    theme === 'evening' ? styles.eveningHeaderText : styles.headerText;
  const statTitleStyle =
    theme === 'evening' ? styles.eveningStatTitle : styles.statTitle;

  const headerText =
    customHeaderText ||
    `Day ${day || 1} • ${showLunchMinigames ? 'Lunch' : `Period ${period || 1}`}`;
  const locationText =
    customLocationText || locationNames[currentLocation] || 'Home Room';

  // Initialize previous location on first render
  useEffect(() => {
    if (!isLocationInitialized.current) {
      previousLocation.current = locationText;
      isLocationInitialized.current = true;
    }
  }, [locationText]);

  // Detect location changes and trigger bounce animation
  useEffect(() => {
    if (!isLocationInitialized.current || previousLocation.current === null) {
      return;
    }

    if (locationText !== previousLocation.current) {
      console.log(
        '🎯 Location changed from',
        previousLocation.current,
        'to',
        locationText
      );
      // Trigger quick bounce animation
      locationBounceScale.value = withSequence(
        withSpring(1.2, { damping: 20, stiffness: 400, mass: 0.5 }),
        withSpring(1, { damping: 20, stiffness: 300, mass: 0.5 })
      );
    }

    previousLocation.current = locationText;
  }, [locationText]);

  // Calculate dynamic font size for piggy bank amount based on text length
  const piggyAmountText = `$${(stashedAmount || 0).toFixed(2)}`;
  const piggyFontSize = useMemo(() => {
    const textLength = piggyAmountText.length;
    if (textLength <= 8) return 16; // Normal size for amounts like $1000.00
    if (textLength <= 10) return 15; // Slightly smaller for $10000.00
    if (textLength <= 12) return 10; // Smaller for $-30000.00
    return 9; // Even smaller for very large negative amounts
  }, [piggyAmountText]);

  // Get glow style and border color based on event type
  const getGlowStyleAndBorderColor = useMemo(() => {
    const glowColors = {
      HINT: '#FFD700', // Gold for hints
      FOUND_MONEY: '#32CD32', // Lime green for found money
      LOSE_MONEY: '#FF4444', // Red for losing money
      PRICE_SPIKE: '#FF6B35', // Orange for price increases
      PRICE_DROP: '#4CAF50', // Green for price drops
      JOKER_UNLOCKED: '#9C27B0', // Purple for jokers
      NEW_DAY: '#2196F3', // Blue for new day
      DEFAULT: '#f4d03f', // Default yellow
    };

    const color =
      glowColors[eventType as keyof typeof glowColors] || glowColors['DEFAULT'];

    const glowStyle =
      !isHint && !eventType
        ? {}
        : {
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1.0,
            shadowRadius: 15,
            elevation: 15,
            backgroundColor: isHint ? `${color}15` : `${color}08`, // Light tint background
          };

    return { glowStyle, borderColor: color };
  }, [isHint, eventType]);

  return (
    <View style={containerStyle}>
      {/* Header with day/period */}
      <View style={styles.headerRow}>
        <Text style={headerStyle}>{headerText}</Text>
      </View>

      {/* Stats in crayon boxes */}
      <View style={styles.statsRow}>
        <Animated.View
          style={[{ flex: 1, overflow: 'visible' }, animatedWalletStyle]}
        >
          <PixelBorder
            borderColor="#4a7c4a"
            borderWidth={3}
            backgroundColor="#d4f6d4"
            innerPadding={0}
            style={{ overflow: 'visible' }}
          >
            <View style={[styles.statBox, styles.cashBox]}>
              <Text style={statTitleStyle}>Wallet</Text>
              <Text style={styles.cashAmount}>
                ${(balance || 0).toFixed(2)}
              </Text>

              {/* Animated money change indicator */}
              {moneyChange !== null && (
                <Animated.View
                  style={[
                    styles.moneyChangeIndicator,
                    animatedMoneyChangeStyle,
                  ]}
                >
                  <Text
                    style={[
                      styles.moneyChangeText,
                      moneyChange > 0 ? styles.moneyGain : styles.moneyLoss,
                    ]}
                  >
                    {moneyChange > 0 ? '+' : '-'}$
                    {Math.abs(moneyChange).toFixed(2)}
                  </Text>
                </Animated.View>
              )}
            </View>
          </PixelBorder>
        </Animated.View>

        <Animated.View style={[{ flex: 1 }, animatedPiggyBankStyle]}>
          <PixelBorder
            borderColor="#b85c8a"
            borderWidth={3}
            backgroundColor="#ffd6e8"
            innerPadding={0}
            style={{ overflow: 'visible' }}
          >
            <View style={[styles.statBox, styles.piggyBox]}>
              <Text style={statTitleStyle}>Piggy Bank</Text>
              <Text style={[styles.piggyAmount, { fontSize: piggyFontSize }]}>
                {piggyAmountText}
              </Text>

              {/* Animated stashed change indicator */}
              {stashedChange !== null && (
                <Animated.View
                  style={[
                    styles.moneyChangeIndicator,
                    animatedStashedChangeStyle,
                  ]}
                >
                  <Text
                    style={[
                      styles.moneyChangeText,
                      stashedChange > 0 ? styles.moneyGain : styles.moneyLoss,
                    ]}
                  >
                    {stashedChange > 0 ? '+' : '-'}$
                    {Math.abs(stashedChange).toFixed(2)}
                  </Text>
                </Animated.View>
              )}
            </View>
          </PixelBorder>
        </Animated.View>

        <PixelBorder
          borderColor="#5c7cb8"
          borderWidth={3}
          backgroundColor="#d6e8ff"
          innerPadding={0}
          style={{ flex: 1 }}
        >
          {inventoryWrapper ? (
            inventoryWrapper(
              <TouchableOpacity
                style={[styles.statBox, styles.inventoryBox]}
                onPress={onInventoryPress}
              >
                <Text style={statTitleStyle}>Inventory</Text>
                <Text
                  style={[
                    styles.inventoryAmount,
                    { fontFamily: 'PixeloidMono' },
                  ]}
                >
                  {totalInventory || 0}/{inventoryCapacity || 30}
                </Text>
              </TouchableOpacity>
            )
          ) : (
            <TouchableOpacity
              style={[styles.statBox, styles.inventoryBox]}
              onPress={onInventoryPress}
            >
              <Text style={statTitleStyle}>Inventory</Text>
              <Text
                style={[styles.inventoryAmount, { fontFamily: 'PixeloidMono' }]}
              >
                {totalInventory || 0}/{inventoryCapacity || 30}
              </Text>
            </TouchableOpacity>
          )}
        </PixelBorder>
      </View>

      {/* Location badge */}
      <Animated.View style={[styles.locationRow, animatedLocationBadgeStyle]}>
        <PixelBorder
          borderColor="#cc7a00"
          borderWidth={3}
          backgroundColor="#ffcc99"
          innerPadding={0}
        >
          <View style={styles.locationBadge}>
            <Text style={styles.locationText}>@ {locationText}</Text>
          </View>
        </PixelBorder>
      </Animated.View>

      {/* Flavor text scroll */}
      {text &&
        (() => {
          const marquee = (
            <PixelBorder
              borderColor={getGlowStyleAndBorderColor.borderColor}
              borderWidth={3}
              backgroundColor="#fff9e6"
              innerPadding={0}
            >
              <View
                style={[
                  styles.flavorContainer,
                  getGlowStyleAndBorderColor.glowStyle,
                ]}
              >
                <Marquee
                  spacing={250}
                  speed={0.75}
                  style={styles.marquee}
                  delay={2000}
                >
                  {renderTextWithEmojis(text, [
                    styles.flavor,
                    isHint && styles.hintText,
                  ])}
                </Marquee>
              </View>
            </PixelBorder>
          );
          return flavorTextWrapper ? flavorTextWrapper(marquee) : marquee;
        })()}
    </View>
  );
}

export default React.memo(GameHUD);

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(254, 247, 227, 0.7)', // Warm cream paper background
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderColor: '#d4a574', // Brown crayon border
    fontFamily: 'PixeloidMono',
  },
  eveningContainer: {
    backgroundColor: 'rgba(25,25,25, 0.3)', // Evening theme background
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderColor: '#f7e98e', // Evening theme border
  },
  headerRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8b4513', // Saddle brown
    textShadow: '1px 1px 0px #e6d4b7',
    fontFamily: 'PixeloidMono',
  },
  eveningHeaderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f7e98e', // Evening theme yellow
    textShadowColor: 'rgba(247,233,142,0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    fontFamily: 'PixeloidMono',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
    overflow: 'visible',
  },
  statBox: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'visible',
  },
  cashBox: {
    fontFamily: 'PixeloidMono',
  },
  piggyBox: {
    fontFamily: 'PixeloidMono',
  },
  inventoryBox: {
    fontFamily: 'PixeloidMono',
  },
  statTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5d4e37', // Dark brown
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'PixeloidMono',
  },
  eveningStatTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#c9b4d4', // Evening theme lavender
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'PixeloidMono',
  },
  cashAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d5a2d',
    fontFamily: 'PixeloidMono',
    lineHeight: 16,
  },
  piggyAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8a4a6b',
    fontFamily: 'PixeloidMono',
    lineHeight: 16,
  },
  inventoryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4a5a8a',
    fontFamily: 'PixeloidMono',
    lineHeight: 16,
  },
  locationRow: {
    alignItems: 'center',
    marginBottom: 10,
  },
  locationBadge: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8b4513',
    fontFamily: 'PixeloidMono',
  },
  flavorContainer: {
    height: 28,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  marquee: {
    flex: 1,
    height: '100%',
  },
  flavor: {
    fontSize: 13,
    color: '#7d6608', // Dark yellow-brown
    fontWeight: '500',
    lineHeight: 20,
    fontFamily: 'PixeloidMono',
  },
  hintText: {
    fontWeight: '700',
    color: '#B8860B', // Darker gold for hints
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  textWithEmojis: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  emojiImage: {
    width: 30,
    height: 30,
    paddingHorizontal: 2,
    marginTop: -8,
  },
  moneyChangeIndicator: {
    position: 'absolute',
    top: 8,
    left: -20, // Allow text to extend left
    right: -20, // Allow text to extend right
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    pointerEvents: 'none',
  },
  moneyChangeText: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'PixeloidMono',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 10,
    flexShrink: 0, // Prevent text from shrinking
  },
  moneyGain: {
    color: '#22c55e',
    textShadowColor: '#22c55e',
  },
  moneyLoss: {
    color: '#dc2626',
    textShadowColor: '#dc2626',
  },
});
