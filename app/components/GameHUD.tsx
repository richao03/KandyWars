import { Marquee } from '@animatereactnative/marquee';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFlavorText } from '../../src/context/FlavorTextContext';
import { useGame } from '../../src/hooks/useGame';
import { useInventory } from '../../src/hooks/useInventory';
import { useWallet } from '../../src/hooks/useWallet';
import PixelBorder from './PixelBorder';

const locationNames = {
  gym: 'Gymnasium',
  cafeteria: 'Cafeteria',
  'home room': 'Home Room',
  library: 'Library',
  'science lab': 'Science Lab',
  'school yard': 'School Yard',
  bathroom: 'Bathroom',
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
}

export default function GameHUD({
  isModalOpening = false,
  isModalOpen = false,
  theme = 'school',
  customHeaderText,
  customLocationText,
  flavorTextWrapper,
  inventoryWrapper,
  onInventoryPress,
}: GameHUDProps) {
  const { balance, stashedAmount } = useWallet();
  const { day, period, currentLocation } = useGame();
  const { getTotalInventoryCount, getInventoryLimit } = useInventory();
  const { text, isHint, eventType } = useFlavorText();

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
    customHeaderText || `Day ${day || 1} • Period ${period || 1}`;
  const locationText =
    customLocationText || locationNames[currentLocation] || 'Home Room';

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
        <PixelBorder
          borderColor="#4a7c4a"
          borderWidth={2}
          backgroundColor="#d4f6d4"
          innerPadding={0}
          style={{ flex: 1 }}
        >
          <View style={[styles.statBox, styles.cashBox]}>
            <Text style={statTitleStyle}>Wallet</Text>
            <Text style={styles.cashAmount}>${(balance || 0).toFixed(2)}</Text>
          </View>
        </PixelBorder>

        <PixelBorder
          borderColor="#b85c8a"
          borderWidth={2}
          backgroundColor="#ffd6e8"
          innerPadding={0}
          style={{ flex: 1 }}
        >
          <View style={[styles.statBox, styles.piggyBox]}>
            <Text style={statTitleStyle}>Piggy Bank</Text>
            <Text style={[styles.piggyAmount, { fontSize: piggyFontSize }]}>
              {piggyAmountText}
            </Text>
          </View>
        </PixelBorder>

        <PixelBorder
          borderColor="#5c7cb8"
          borderWidth={2}
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
      <View style={styles.locationRow}>
        <PixelBorder
          borderColor="#cc7a00"
          borderWidth={2}
          backgroundColor="#ffcc99"
          innerPadding={0}
        >
          <View style={styles.locationBadge}>
            <Text style={styles.locationText}>@ {locationText}</Text>
          </View>
        </PixelBorder>
      </View>

      {/* Flavor text scroll */}
      {text &&
        (() => {
          const marquee = (
            <PixelBorder
              borderColor={getGlowStyleAndBorderColor.borderColor}
              borderWidth={2}
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
                  <Text style={[styles.flavor, isHint && styles.hintText]}>
                    {text}
                  </Text>
                </Marquee>
              </View>
            </PixelBorder>
          );
          return flavorTextWrapper ? flavorTextWrapper(marquee) : marquee;
        })()}
    </View>
  );
}

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
});
