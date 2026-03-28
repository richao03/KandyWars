import React, { useEffect, useMemo, useRef } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useCandySales } from '../../src/hooks/useCandySales';
import { useGame } from '../../src/hooks/useGame';
import { useInventory } from '../../src/hooks/useInventory';
import { useJokers } from '../../src/hooks/useJokers';
import { useWallet } from '../../src/hooks/useWallet';
import { selectJokerActiveEffects } from '../../src/store/slices/jokerSlice';
import {
  selectActiveEffects,
  selectOwnedLevel,
} from '../../src/store/slices/merchantSlice';
import TextWithEmojis from './TextWithEmojis';

interface StatusIndicatorsProps {
  theme?: 'school' | 'evening';
  type?: 'merchant' | 'joker' | 'combined'; // Add combined option
  singleRow?: boolean; // New prop for single-row layout
}

interface StatusIcon {
  type: 'merchant' | 'joker';
  icon: string | any;
  key: string;
  level?: number;
  isImage?: boolean; // true if icon is an image source, false if emoji text
  name?: string; // Display name for tooltips
}

function StatusIndicators({
  theme = 'school',
  type = 'merchant',
  singleRow = false,
}: StatusIndicatorsProps) {
  const merchantActiveEffects = useSelector(selectActiveEffects);
  const jokerActiveEffects = useSelector(selectJokerActiveEffects);
  const { jokers } = useJokers();
  const { period } = useGame();
  const { getTotalInventoryCount, getInventoryLimit } = useInventory();
  const { consecutivePeriodSales, totalCandiesSold, hasEarlySaleToday } = useCandySales();
  const { balance: currentCash } = useWallet();

  const [tooltip, setTooltip] = React.useState<{
    name: string;
    visible: boolean;
  }>({ name: '', visible: false });
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup tooltip timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  // Get leveled item levels
  const streetCredLevel = useSelector(selectOwnedLevel('street_cred'));
  const fakeReportCardLevel = useSelector(selectOwnedLevel('fake_report_card'));
  const metalDetectorLevel = useSelector(selectOwnedLevel('metal_detector'));
  const hollowedTextbookLevel = useSelector(
    selectOwnedLevel('hollowed_textbook')
  );
  const doubleSidedCoinLevel = useSelector(
    selectOwnedLevel('double_sided_coin')
  );

  const { merchantIcons, jokerIcons } = useMemo(() => {
    const merchantIcons: StatusIcon[] = [];
    const jokerIcons: StatusIcon[] = [];

    const totalInventory = getTotalInventoryCount();
    const inventoryLimit = getInventoryLimit();

    // MERCHANT ITEMS - Leveled (always show when owned)
    if (streetCredLevel > 0) {
      merchantIcons.push({
        type: 'merchant',
        icon: require('../../assets/images/icons/streetCred.png'),
        key: 'streetcred',
        level: streetCredLevel,
        name: 'Street Cred',
      });
    }

    if (fakeReportCardLevel > 0) {
      merchantIcons.push({
        type: 'merchant',
        icon: require('../../assets/images/icons/fakeReportCard.png'),
        key: 'fakereportcard',
        level: fakeReportCardLevel,
        name: 'Fake Report Card',
      });
    }

    if (metalDetectorLevel > 0) {
      merchantIcons.push({
        type: 'merchant',
        icon: require('../../assets/images/icons/metalDetector.png'),
        key: 'metaldetector',
        level: metalDetectorLevel,
        name: 'Metal Detector',
      });
    }

    if (hollowedTextbookLevel > 0) {
      merchantIcons.push({
        type: 'merchant',
        icon: require('../../assets/images/icons/hollowedBook.png'),
        key: 'hollowedtextbook',
        level: hollowedTextbookLevel,
        name: 'Hollowed Textbook',
      });
    }

    if (doubleSidedCoinLevel > 0) {
      merchantIcons.push({
        type: 'merchant',
        icon: require('../../assets/images/icons/luckyCoin.png'),
        key: 'doublesidedcoin',
        level: doubleSidedCoinLevel,
        name: 'Lucky Coin',
      });
    }

    // MERCHANT ITEMS - Consumable (show when active count > 0)
    merchantActiveEffects.forEach((effect) => {
      if (effect.itemId === 'influencer_shoutout' && (effect.count || 0) > 0) {
        merchantIcons.push({
          type: 'merchant',
          icon: require('../../assets/images/icons/influencerShoutout.png'),
          key: 'influencer',
          name: 'Influencer Shoutout',
        });
      } else if (
        effect.itemId === 'hall_monitor_bribe' &&
        (effect.count || 0) > 0
      ) {
        merchantIcons.push({
          type: 'merchant',
          icon: require('../../assets/images/icons/bribe.png'),
          key: 'bribe',
          name: 'Hall Monitor Bribe',
        });
      } else if (
        effect.itemId === 'sixth_grade_bodyguard' &&
        (effect.count || 0) > 0
      ) {
        merchantIcons.push({
          type: 'merchant',
          icon: require('../../assets/images/icons/bodyguard.png'),
          key: 'bodyguard',
          name: 'Sixth Grade Bodyguard',
        });
      }
    });

    // JOKERS — Icon lookup by name (always show when owned)
    const JOKER_ICON_MAP: Record<string, any> = {
      'Double Up': require('../../assets/images/emojis/dice.png'),
      'Median Formula': require('../../assets/images/emojis/bullseye.png'),
      'Geometric Expansion': require('../../assets/images/emojis/backpack.png'),
      'Ace the Test': require('../../assets/images/emojis/book.png'),
      'Inductive Reasoning': require('../../assets/images/emojis/logic.png'),
      'Tapped in': require('../../assets/images/emojis/tappedIn.png'),
      'Side Gig': require('../../assets/images/emojis/coin.png'),
      'Micro Chip': require('../../assets/images/emojis/computer.png'),
      'Data Compression': require('../../assets/images/emojis/gear.png'),
      'Vacuum Sealer': require('../../assets/images/emojis/vacuumsealer.png'),
      'Perfect Bake': require('../../assets/images/emojis/statusCupcake.png'),
      'Bake Sale': require('../../assets/images/emojis/cupcake.png'),
      'Home Made': require('../../assets/images/emojis/homemade.png'),
      'Super Size Me': require('../../assets/images/emojis/slowcooker.png'),
      'Treasure Chest': require('../../assets/images/emojis/vault.png'),
      'Odd Todd': require('../../assets/images/emojis/theater.png'),
      'Cocoa Futures': require('../../assets/images/emojis/chocolate.png'),
      'Medieval Shield': require('../../assets/images/emojis/shield.png'),
      'The Good Old Days': require('../../assets/images/emojis/oldTv.png'),
      'Bear Market': require('../../assets/images/emojis/priceCrash.png'),
      'Market Manipulation': require('../../assets/images/emojis/priceSpike.png'),
      'The Big Short': require('../../assets/images/emojis/chart.png'),
      'Deposit Bonus': require('../../assets/images/emojis/piggyBank.png'),
      'Roman Coin': require('../../assets/images/emojis/coin.png'),
      'Farmers Carry': require('../../assets/images/emojis/farmersCarry.png'),
      'Coaching': require('../../assets/images/emojis/gym.png'),
      "Bet You I'm Faster": require('../../assets/images/emojis/recess.png'),
      'Bulk Up': require('../../assets/images/emojis/bulkSale.png'),
      'Hard Knocks': require('../../assets/images/emojis/diamondHand.png'),
      'Even Stevens': require('../../assets/images/emojis/scale.png'),
      'Sour Logic': require('../../assets/images/emojis/magic.png'),
      'Double Dutch': require('../../assets/images/emojis/jumpRope.png'),
      'Hide and Seek': require('../../assets/images/emojis/magnifyingGlass.png'),
      'Secret Hideout': require('../../assets/images/emojis/lock.png'),
      'Golden Hour': require('../../assets/images/emojis/sunrise.png'),
      'Trade Routes': require('../../assets/images/emojis/treasureMap.png'),
      'Continental Drift': require('../../assets/images/emojis/geography.png'),
      'Mysterious Artifact': require('../../assets/images/emojis/artifact.png'),
      'Tropical Import': require('../../assets/images/emojis/clock.png'),
      'Atlas Bonus': require('../../assets/images/emojis/mountain.png'),
      'Jump Rope Rhythm': require('../../assets/images/emojis/jumpRope.png'),
      'Pursuasion': require('../../assets/images/emojis/talkingHead.png'),
      'Early Bird': require('../../assets/images/emojis/sunrise.png'),
      'Bulk Discount': require('../../assets/images/emojis/bulkSale.png'),
      'Underdog': require('../../assets/images/emojis/gym.png'),
      'Penny Pincher': require('../../assets/images/emojis/coin.png'),
      'Broke and Hungry': require('../../assets/images/emojis/priceCrash.png'),
      'Extra Credit': require('../../assets/images/emojis/book.png'),
      'Sixth Sense': require('../../assets/images/emojis/computer.png'),
    };

    // Conditional jokers — only show icon when their condition is currently met
    const CONDITIONAL_JOKERS: Record<string, () => boolean> = {
      'Golden Hour': () => period >= 5 && period <= 8,
      'Tropical Import': () => period >= 1 && period <= 4,
      'Hopscotch Bonus': () => period % 2 === 0,
      'Farmers Carry': () => inventoryLimit >= 75,
      'Even Stevens': () => inventoryLimit % 2 === 0,
      'Odd Todd': () => inventoryLimit % 2 === 1,
      'Super Size Me': () => totalInventory > 0,
      'Bulk Up': () => totalInventory / inventoryLimit > 0.5,
      'Jump Rope Rhythm': () => ((totalCandiesSold || 0) + 1) % 3 === 0,
      'Swingset Momentum': () => consecutivePeriodSales() > 1,
      'Early Bird': () => !hasEarlySaleToday,
      'Broke and Hungry': () => currentCash < 500,
      'Underdog': () => currentCash < 15000,
    };

    const addedJokerNames = new Set<string>();

    jokers.forEach((joker) => {
      if (addedJokerNames.has(joker.name)) return;

      const iconSource = JOKER_ICON_MAP[joker.name];
      if (!iconSource) return;

      // If it's a conditional joker, check if condition is met
      const condition = CONDITIONAL_JOKERS[joker.name];
      if (condition && !condition()) return;

      jokerIcons.push({
        type: 'joker',
        icon: iconSource,
        key: `${joker.name}-${joker.id}`,
        name: joker.name,
        isImage: true,
      });
      addedJokerNames.add(joker.name);
    });

    // ONE-TIME JOKERS - Check activeEffects for activated jokers
    jokerActiveEffects.forEach((effect: any) => {
      if (effect.jokerId === 48 || effect.jokerId === '48') {
        jokerIcons.push({
          type: 'joker',
          icon: JOKER_ICON_MAP['Pursuasion'],
          key: 'pursuasion',
          name: 'Pursuasion',
          isImage: true,
        });
      }
    });

    return { merchantIcons, jokerIcons };
  }, [
    merchantActiveEffects,
    jokerActiveEffects,
    jokers,
    period,
    getTotalInventoryCount,
    getInventoryLimit,
    consecutivePeriodSales,
    totalCandiesSold,
    streetCredLevel,
    fakeReportCardLevel,
    metalDetectorLevel,
    hollowedTextbookLevel,
    doubleSidedCoinLevel,
    currentCash,
    hasEarlySaleToday,
  ]);

  // Filter icons based on type prop
  const iconsToShow =
    type === 'merchant'
      ? merchantIcons
      : type === 'joker'
        ? jokerIcons
        : [...jokerIcons, ...merchantIcons]; // Combined shows both

  const handleLongPress = (name: string) => {
    if (name) {
      // Clear any existing timeout before setting a new one
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }

      setTooltip({ name, visible: true });

      // Auto-hide tooltip after 2 seconds
      tooltipTimeoutRef.current = setTimeout(() => {
        setTooltip({ name: '', visible: false });
        tooltipTimeoutRef.current = null;
      }, 2000);
    }
  };

  // Always render container with fixed width, even if empty
  return (
    <View
      style={singleRow ? styles.singleRowContainer : styles.fixedWidthContainer}
    >
      {iconsToShow.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scrollView}
        >
          <View
            style={
              singleRow ? styles.singleRowGridContainer : styles.gridContainer
            }
          >
            {iconsToShow.map((indicator) => (
              <Pressable
                key={indicator.key}
                onLongPress={() => handleLongPress(indicator.name || '')}
                style={styles.iconContainer}
              >
                {type === 'merchant' ||
                (type === 'combined' && indicator.type === 'merchant') ? (
                  <>
                    <Image
                      source={indicator.icon}
                      style={styles.merchantIcon}
                    />
                    {indicator.level && indicator.level > 0 && (
                      <View style={styles.levelBadge}>
                        <Text style={styles.levelText}>{indicator.level}</Text>
                      </View>
                    )}
                  </>
                ) : (
                  <>
                    {indicator.isImage ? (
                      <Image
                        source={indicator.icon}
                        style={styles.jokerImageIcon}
                      />
                    ) : (
                      <TextWithEmojis style={styles.jokerIcon} imageSize={20}>
                        {indicator.icon}
                      </TextWithEmojis>
                    )}
                  </>
                )}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
      {tooltip.visible && (
        <View style={styles.tooltipContainer}>
          <View style={styles.tooltip}>
            <Text style={styles.tooltipText}>{tooltip.name}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fixedWidthContainer: {
    width: 119, // Fixed width: 4.25 icons × 28px (24px icon + 4px gap)
    height: 52, // Fixed height: 2 rows (24px + 4px gap + 24px)
  },
  singleRowContainer: {
    height: 28, // Single row: 24px icon + 4px padding
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'column',
    flexWrap: 'wrap',
    height: 52, // 2 rows: 24px + 4px gap + 24px
    gap: 4,
    alignContent: 'flex-start',
  },
  singleRowGridContainer: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(139, 69, 19, 0.3)',
    position: 'relative',
  },
  merchantIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  jokerIcon: {
    fontSize: 16,
  },
  jokerImageIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 6,
    minWidth: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  levelText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
    lineHeight: 10,
  },
  tooltipContainer: {
    position: 'absolute',
    top: -35,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  tooltip: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  tooltipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
  },
});

export default React.memo(StatusIndicators);
