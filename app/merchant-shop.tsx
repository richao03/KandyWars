import { router, Stack } from 'expo-router';
import React, { lazy, Suspense, useCallback } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useDailyStats } from '../src/hooks/useDailyStats';
import { useWallet } from '../src/hooks/useWallet';
import { selectDay } from '../src/store/slices/gameSlice';
import {
  addJoker,
  selectJokers,
  upgradeJoker,
} from '../src/store/slices/jokerSlice';
import {
  consumeEffect,
  generateDailyJoker,
  markDailyJokerPurchased,
  MERCHANT_ITEMS,
  MerchantItemType,
  purchaseConsumableItem,
  purchaseLeveledItem,
  selectActiveEffects,
  selectCanPurchaseItem,
  selectDailyJoker,
  selectItemPrice,
  selectOwnedLevel,
  selectPurchaseCount,
} from '../src/store/slices/merchantSlice';
import { STANDARDIZED_JOKERS } from '../src/utils/jokerEffectEngine';
import { formatNumber } from '../src/utils/priceUtils';
import FastModal from './components/FastModal';
import GameHUD from './components/GameHUD';
import JokerCard from './components/JokerCard';
import PixelBorder from './components/PixelBorder';
import PressableButton from './components/PressableButton';
import PressableScale from './components/PressableScale';

// Lazy load the StashMoneyModal
const StashMoneyModal = lazy(() => import('./components/StashMoneyModal'));

// Merchant item icons mapping
const MERCHANT_ICONS: Record<MerchantItemType, any> = {
  fake_report_card: require('../assets/images/icons/fakeReportCard.png'),
  metal_detector: require('../assets/images/icons/metalDetector.png'),
  hollowed_textbook: require('../assets/images/icons/hollowedBook.png'),
  street_cred: require('../assets/images/icons/streetCred.png'),
  double_sided_coin: require('../assets/images/icons/luckyCoin.png'),
  influencer_shoutout: require('../assets/images/icons/influencerShoutout.png'),
  hall_monitor_bribe: require('../assets/images/icons/bribe.png'),
  sixth_grade_bodyguard: require('../assets/images/icons/bodyguard.png'),
  air_delivery_drone: require('../assets/images/icons/drone.png'),
};

// Component for each merchant item button
const MerchantItemButton = React.memo(function MerchantItemButton({
  itemId,
  onPress,
  onActivate,
}: {
  itemId: MerchantItemType;
  onPress: (
    itemId: MerchantItemType,
    price: number,
    canPurchase: boolean,
    ownedLevel: number
  ) => void;
  onActivate: (itemId: MerchantItemType) => void;
}) {
  const { balance } = useWallet();
  const item = MERCHANT_ITEMS.find((i) => i.id === itemId);
  const price = useSelector(selectItemPrice(itemId));
  const canPurchase = useSelector(selectCanPurchaseItem(itemId));
  const ownedLevel = useSelector(selectOwnedLevel(itemId));
  const purchaseCount = useSelector(selectPurchaseCount(itemId));
  const activeEffects = useSelector(selectActiveEffects);

  if (!item) return null;

  // Check for active effects on consumable items
  const activeEffect = activeEffects.find((e) => e.itemId === itemId);
  const hasActiveEffect = activeEffect && (activeEffect.count || 0) > 0;

  // Determine activation text based on item type
  let activationText = '';
  if (hasActiveEffect) {
    switch (itemId) {
      case 'air_delivery_drone':
        activationText = 'ACTIVATE';
        break;
      case 'sixth_grade_bodyguard':
        activationText = 'PROTECTED';
        break;
      case 'hall_monitor_bribe':
        activationText = 'PROTECTED';
        break;
      case 'influencer_shoutout':
        activationText = 'UPLOADED';
        break;
      default:
        activationText = 'ACTIVE';
    }
  }

  const canAfford = balance >= price;

  // Determine display text
  let displayLevel = '';
  if (item.type === 'leveled') {
    const nextLevel = ownedLevel + 1;
    if (nextLevel <= (item.maxLevel || 0)) {
      displayLevel = `Lvl ${nextLevel}`;
    } else {
      displayLevel = 'MAX';
    }
  } else if (purchaseCount > 0 && !hasActiveEffect) {
    // Only show count if no active effect
    displayLevel = `×${purchaseCount}`;
  }

  // Item colors
  const itemColor = getItemColor(itemId);

  // Determine if item should activate vs purchase
  const isDroneActivation = itemId === 'air_delivery_drone' && hasActiveEffect;
  const shouldShowActivation = hasActiveEffect;

  return (
    // PressableScale for press-down spring feedback (I3 game-feel)
    <PressableScale
      onPress={() =>
        isDroneActivation
          ? onActivate(itemId)
          : onPress(itemId, price, canPurchase, ownedLevel)
      }
      style={styles.itemButtonWrapper}
    >
    <PressableButton
      onPress={undefined}
      shadowColor={itemColor.border}
      shadowOffset={{ width: 0, height: 4 }}
      shadowOpacity={0.5}
      shadowRadius={6}
      elevation={8}
      style={{ flex: 1 }}
    >
      <View style={styles.itemContainer}>
        <Image source={MERCHANT_ICONS[itemId]} style={styles.itemIcon} />
        <View style={styles.borderWrapper}>
          <PixelBorder
            borderColor={itemColor.border}
            borderWidth={3}
            backgroundColor={itemColor.bg}
            innerPadding={0}
          >
            <View style={styles.itemButton}>
              <Text style={styles.itemName}>{item.name}</Text>
              {shouldShowActivation ? (
                <Text
                  style={[
                    styles.activateText,
                    (itemId === 'sixth_grade_bodyguard' ||
                      itemId === 'hall_monitor_bribe') &&
                      styles.protectedText,
                    itemId === 'influencer_shoutout' && styles.uploadedText,
                  ]}
                >
                  {activationText}
                </Text>
              ) : (
                <Text
                  style={[
                    styles.itemPrice,
                    !canAfford && styles.cannotAffordPrice,
                  ]}
                >
                  ${(price / 1000).toFixed(1)}k
                </Text>
              )}
              {displayLevel && (
                <Text style={styles.itemLevel}>{displayLevel}</Text>
              )}
            </View>
          </PixelBorder>
        </View>
      </View>
    </PressableButton>
    </PressableScale>
  );
});

// Helper function to get item-specific colors
function getItemColor(itemId: MerchantItemType): {
  bg: string;
  border: string;
} {
  const colors: Record<MerchantItemType, { bg: string; border: string }> = {
    fake_report_card: { bg: '#e6f7ff', border: '#1890ff' },
    metal_detector: { bg: '#f9f0ff', border: '#722ed1' },
    hollowed_textbook: { bg: '#fff1f0', border: '#f5222d' },
    street_cred: { bg: '#feffe6', border: '#a0d911' },
    double_sided_coin: { bg: '#fffbe6', border: '#faad14' },
    influencer_shoutout: { bg: '#fff0f6', border: '#eb2f96' },
    hall_monitor_bribe: { bg: '#e6ffe6', border: '#52c41a' },
    sixth_grade_bodyguard: { bg: '#f0f5ff', border: '#2f54eb' },
    air_delivery_drone: { bg: '#e0f2fe', border: '#0ea5e9' },
  };

  return colors[itemId] || { bg: '#f0f0f0', border: '#999' };
}

// Get detailed description based on item
const getDetailedDescription = (itemId: MerchantItemType, item: any) => {
  switch (itemId) {
    case 'fake_report_card':
      return 'Doubles your daily allowance.\n\nLvl 1: $10→$20, Lvl 2: $10→$40, Lvl 3: $10→$80';
    case 'metal_detector':
      return 'Increases money found from random events.\n\nLvl 1: 2x, Lvl 2: 4x, Lvl 3: 8x';
    case 'hollowed_textbook':
      return 'Hide candy in this modified textbook.\n\n Each level adds +10 to your inventory capacity.';
    case 'street_cred':
      return 'Your reputation increases profit margins.\n\n Each level adds +10% to profit.';
    case 'double_sided_coin':
      return 'Rigged coin that attracts positive events. Higher levels increase your luck even more.';
    case 'influencer_shoutout':
      return 'A viral social media post triples your profit on the next sale.\n\n Single use.';
    case 'hall_monitor_bribe':
      return 'Bribe the hall monitor to avoid getting busted.\n\n Single use protection.';
    case 'sixth_grade_bodyguard':
      return 'Hire muscle to protect you from bullies.\n\n Single use protection.';
    case 'air_delivery_drone':
      return 'High-tech drone that lets you deposit money into your piggy bank from anywhere. \n\nSingle use.';
    default:
      return item.description;
  }
};

// Item Info Modal Component
const ItemInfoModal = React.memo(function ItemInfoModal({
  selectedItem,
  balance,
  onPurchase,
  onClose,
}: {
  selectedItem: {
    itemId: MerchantItemType;
    price: number;
    canPurchase: boolean;
    ownedLevel: number;
  };
  balance: number;
  onPurchase: () => void;
  onClose: () => void;
}) {
  const item = MERCHANT_ITEMS.find((i) => i.id === selectedItem.itemId);
  const purchaseCount = useSelector(selectPurchaseCount(selectedItem.itemId));

  if (!item) return null;

  const canAfford = balance >= selectedItem.price;
  const isMaxed = !selectedItem.canPurchase;

  let levelText = '';
  if (item.type === 'leveled' && item.maxLevel) {
    levelText = `Lvl ${selectedItem.ownedLevel}/${item.maxLevel}`;
  } else if (item.type === 'consumable') {
    levelText = `Owned: ${purchaseCount || 0}`;
  }

  return (
    <FastModal
      visible={true}
      onClose={onClose}
      animationType="fade"
      backdropOpacity={0.8}
      position="center"
    >
      <PixelBorder
        borderColor="blue"
        borderWidth={3}
        backgroundColor="#2a2a2a"
        innerPadding={0}
      >
        <View style={styles.infoModal}>
          <Text style={styles.infoTitle}>{item.name}</Text>

          <Text style={styles.infoLevel}>{levelText}</Text>

          <Text style={styles.infoDescription}>
            {getDetailedDescription(item.id, item)}
          </Text>

          <Text style={styles.infoPrice}>
            Price: ${formatNumber(selectedItem.price)}
          </Text>

          {!canAfford && (
            <Text style={styles.cantAffordText}>Not enough money!</Text>
          )}

          {isMaxed && <Text style={styles.maxedText}>Max level reached!</Text>}

          <View style={styles.modalButtons}>
            <PressableButton
              onPress={onClose}
              shadowColor="#f44336"
              shadowOffset={{ width: 0, height: 2 }}
              shadowOpacity={0.4}
              shadowRadius={3}
              elevation={5}
              style={{ flex: 1 }}
            >
              <PixelBorder
                borderColor="#c62828"
                borderWidth={3}
                backgroundColor="#f44336"
                innerPadding={0}
              >
                <View style={styles.modalButtonInner}>
                  <Text style={styles.modalButtonText}>Back</Text>
                </View>
              </PixelBorder>
            </PressableButton>
            <PressableButton
              onPress={onPurchase}
              disabled={!canAfford || isMaxed}
              shadowColor="#4CAF50"
              shadowOffset={{ width: 0, height: 2 }}
              shadowOpacity={canAfford && !isMaxed ? 0.4 : 0.2}
              shadowRadius={3}
              elevation={5}
              style={{ flex: 1 }}
            >
              <PixelBorder
                borderColor="#388E3C"
                borderWidth={3}
                backgroundColor={canAfford && !isMaxed ? '#4CAF50' : '#666'}
                innerPadding={0}
              >
                <View style={styles.modalButtonInner}>
                  <Text style={styles.modalButtonText}>Buy</Text>
                </View>
              </PixelBorder>
            </PressableButton>
          </View>
        </View>
      </PixelBorder>
    </FastModal>
  );
});

// Daily Joker Section Component
const DailyJokerSection = React.memo(function DailyJokerSection({
  onPurchase,
}: {
  onPurchase: (
    jokerId: number,
    jokerName: string,
    price: number,
    ownedLevel: number
  ) => void;
}) {
  const dailyJoker = useSelector(selectDailyJoker);
  const jokers = useSelector(selectJokers);
  const { balance } = useWallet();

  if (!dailyJoker) return null;

  // Find the owned joker level
  const ownedJoker = jokers.find(
    (j: any) => j.id.toString() === dailyJoker.jokerId.toString()
  );
  const ownedLevel = ownedJoker ? (ownedJoker.level ?? 1) : 0;

  // Calculate price based on owned level
  let price: number;
  let badgeText: string;
  let badgeColor: string;
  let isMaxed = false;

  if (ownedLevel === 0) {
    price = 5000;
    badgeText = '';
    badgeColor = '#22c55e';
  } else if (ownedLevel === 1) {
    price = 5000;
    badgeText = 'L1\u2192L2';
    badgeColor = '#3b82f6';
  } else if (ownedLevel === 2) {
    price = 30000;
    badgeText = 'L2\u2192L3';
    badgeColor = '#a855f7';
  } else {
    price = 0;
    badgeText = 'MAX LEVEL';
    badgeColor = '#fbbf24';
    isMaxed = true;
  }

  const canAfford = balance >= price;
  const canBuy = canAfford && !isMaxed && !dailyJoker.purchased;

  // Build a JokerCard-compatible joker from the standardized definition.
  const standardized = STANDARDIZED_JOKERS.find(
    (sj) => sj.id.toString() === dailyJoker.jokerId.toString()
  );
  const cardJoker = standardized
    ? {
        id: Number(standardized.id),
        name: standardized.name,
        type: (standardized.type === 'one-time' ? 'one-time' : 'persistent') as
          | 'one-time'
          | 'persistent',
        flavorText: standardized.flavorText || '',
        description: standardized.description,
      }
    : {
        id: Number(dailyJoker.jokerId),
        name: dailyJoker.jokerName,
        type: 'persistent' as const,
        flavorText: '',
        description: dailyJoker.jokerDescription,
      };

  return (
    <View style={styles.dailyJokerContainer}>
      <View style={styles.dailyJokerTitleRow}>
        <Text style={styles.dailyJokerTitle}>Joker of the Day</Text>
        {!isMaxed && !dailyJoker.purchased && (
          <Text
            style={[
              styles.dailyJokerInlinePrice,
              !canAfford && styles.cannotAffordPrice,
            ]}
          >
            ${formatNumber(price)}
          </Text>
        )}
      </View>

      <View style={styles.dailyJokerCardWrapper}>
        {/* PressableScale for press-down spring feedback (I3 game-feel) — via JokerCard onPress CardWrapper */}
        <JokerCard
          joker={cardJoker}
          isAfterSchool={true}
          isCompact={true}
          disableActivation={true}
          onPress={
            canBuy
              ? () =>
                  onPurchase(
                    dailyJoker.jokerId,
                    dailyJoker.jokerName,
                    price,
                    ownedLevel
                  )
              : undefined
          }
          selectionDisabled={!canBuy}
          containerStyle={styles.dailyJokerSquareContainer}
        />
        {dailyJoker.purchased && (
          <View style={styles.dailyJokerSoldOverlay}>
            <Text style={styles.dailyJokerSoldOverlayText}>SOLD</Text>
          </View>
        )}
      </View>

      {isMaxed && !dailyJoker.purchased && (
        <Text style={styles.dailyJokerMaxText}>Already at max level</Text>
      )}
    </View>
  );
});

const MERCHANT_SUBTITLES = [
  '',
  'I was never here.',
  'Some things fell off a truck.',
  'We never met.',
  'Psst.',
];

export default function MerchantShopPage() {
  const dispatch = useDispatch();
  const { spend, balance } = useWallet();
  const { recordMerchantPurchase } = useDailyStats();
  const [inventoryModalVisible, setInventoryModalVisible] =
    React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<{
    itemId: MerchantItemType;
    price: number;
    canPurchase: boolean;
    ownedLevel: number;
  } | null>(null);
  const [stashMoneyModalVisible, setStashMoneyModalVisible] =
    React.useState(false);

  // Daily joker state
  const day = useSelector(selectDay);
  const seed = useSelector((state: any) => state.seed?.seed || 'default');
  const jokers = useSelector(selectJokers);

  // Generate daily joker on mount / day change
  React.useEffect(() => {
    const ownedJokerIds = jokers.map((j: any) => j.id.toString());
    dispatch(generateDailyJoker({ seed, day, ownedJokerIds }));
  }, [dispatch, seed, day]); // Intentionally excluding jokers to avoid re-triggering on purchase

  // Pick a random subtitle on mount
  const randomSubtitle = React.useMemo(
    () =>
      MERCHANT_SUBTITLES[Math.floor(Math.random() * MERCHANT_SUBTITLES.length)],
    []
  );

  const handleItemPress = useCallback(
    (
      itemId: MerchantItemType,
      price: number,
      canPurchase: boolean,
      ownedLevel: number
    ) => {
      if (__DEV__) console.log('🛒 Merchant item pressed:', itemId);
      // Show item info modal instead of direct purchase
      setSelectedItem({
        itemId,
        price,
        canPurchase,
        ownedLevel,
      });
    },
    []
  );

  const handleActivateDrone = useCallback((itemId: MerchantItemType) => {
    if (itemId === 'air_delivery_drone') {
      if (__DEV__)
        console.log('✈️ Activating Air Delivery Drone - opening stash modal');
      setStashMoneyModalVisible(true);
    }
  }, []);

  const handleDailyJokerPurchase = useCallback(
    (jokerId: number, jokerName: string, price: number, ownedLevel: number) => {
      if (balance < price) return;

      // Deduct money
      spend(price);

      if (ownedLevel === 0) {
        // New joker - find it from STANDARDIZED_JOKERS and add it
        const standardJoker = STANDARDIZED_JOKERS.find((j) => j.id === jokerId);
        if (standardJoker) {
          dispatch(
            addJoker({
              id: jokerId.toString(),
              name: standardJoker.name,
              tier: 'common',
              type: standardJoker.type,
              level: 1,
            })
          );
        }
      } else {
        // Upgrade existing joker
        dispatch(upgradeJoker(jokerId.toString()));
      }

      // Mark as purchased
      dispatch(markDailyJokerPurchased());

      // Record purchase for stats
      recordMerchantPurchase({
        itemId: `daily_joker_${jokerId}` as any,
        itemName: `Daily Joker: ${jokerName}`,
        price,
        type: 'consumable',
        level: ownedLevel > 0 ? ownedLevel + 1 : 1,
      });

      if (__DEV__)
        console.log(
          `✅ Daily Joker "${jokerName}" ${ownedLevel > 0 ? 'upgraded to L' + (ownedLevel + 1) : 'purchased'}`
        );
    },
    [balance, spend, dispatch, recordMerchantPurchase]
  );

  const handlePurchase = useCallback(() => {
    if (!selectedItem) return;

    const { itemId, price, canPurchase, ownedLevel } = selectedItem;
    const item = MERCHANT_ITEMS.find((i) => i.id === itemId);

    if (!item || !canPurchase || balance < price) {
      setSelectedItem(null);
      return;
    }

    // Deduct money
    spend(price);

    // Dispatch appropriate purchase action
    if (item.type === 'leveled') {
      dispatch(purchaseLeveledItem({ itemId }));
    } else {
      dispatch(purchaseConsumableItem({ itemId }));
    }

    // Record purchase for playthrough stats
    recordMerchantPurchase({
      itemId,
      itemName: item.name,
      price,
      type: item.type,
      level: item.type === 'leveled' ? ownedLevel + 1 : undefined,
    });

    // Close modal
    setSelectedItem(null);

    if (__DEV__) console.log(`✅ ${item.name} purchased successfully`);
  }, [selectedItem, balance, spend, dispatch, recordMerchantPurchase]);

  const handleBack = useCallback(() => {
    if (__DEV__) console.log('🕶️ Leaving merchant shop - returning to market');
    router.back();
  }, []);

  const handleMoneyStashed = useCallback(() => {
    // Consume the Air Delivery Drone after using it
    dispatch(consumeEffect({ itemId: 'air_delivery_drone' }));
    if (__DEV__)
      console.log('✈️ Air Delivery Drone consumed after depositing money');
    setStashMoneyModalVisible(false);
  }, [dispatch]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <GameHUD
          theme="evening"
          showLunchMinigames={false}
          customLocationText="Shhhh..."
          onInventoryPress={() => setInventoryModalVisible(true)}
        />

        <DailyJokerSection onPurchase={handleDailyJokerPurchase} />

        <View style={styles.itemsContainer}>
          {/* Row 1 */}
          <View style={styles.itemsRow}>
            <MerchantItemButton
              itemId="fake_report_card"
              onPress={handleItemPress}
              onActivate={handleActivateDrone}
            />
            <MerchantItemButton
              itemId="metal_detector"
              onPress={handleItemPress}
              onActivate={handleActivateDrone}
            />
            <MerchantItemButton
              itemId="hollowed_textbook"
              onPress={handleItemPress}
              onActivate={handleActivateDrone}
            />
          </View>

          {/* Row 2 */}
          <View style={styles.itemsRow}>
            <MerchantItemButton
              itemId="street_cred"
              onPress={handleItemPress}
              onActivate={handleActivateDrone}
            />
            <MerchantItemButton
              itemId="double_sided_coin"
              onPress={handleItemPress}
              onActivate={handleActivateDrone}
            />
            <MerchantItemButton
              itemId="influencer_shoutout"
              onPress={handleItemPress}
              onActivate={handleActivateDrone}
            />
          </View>

          {/* Row 3 */}
          <View style={styles.itemsRow}>
            <MerchantItemButton
              itemId="hall_monitor_bribe"
              onPress={handleItemPress}
              onActivate={handleActivateDrone}
            />
            <MerchantItemButton
              itemId="sixth_grade_bodyguard"
              onPress={handleItemPress}
              onActivate={handleActivateDrone}
            />
            <MerchantItemButton
              itemId="air_delivery_drone"
              onPress={handleItemPress}
              onActivate={handleActivateDrone}
            />
          </View>
        </View>

        <PressableButton
          onPress={handleBack}
          shadowColor="rgba(185,28,28,1)"
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.5}
          shadowRadius={5}
          elevation={8}
          style={styles.backButton}
        >
          <View style={styles.backButtonInner}>
            <Text style={styles.backButtonText}>Leave</Text>
          </View>
        </PressableButton>

        {/* Item Info Modal */}
        {selectedItem && (
          <ItemInfoModal
            selectedItem={selectedItem}
            balance={balance}
            onPurchase={handlePurchase}
            onClose={() => setSelectedItem(null)}
          />
        )}

        {/* Stash Money Modal - shown after purchasing Air Delivery Drone */}
        <Suspense fallback={null}>
          <StashMoneyModal
            visible={stashMoneyModalVisible}
            onClose={() => {
              // If user backs out without depositing, don't consume the drone
              if (__DEV__)
                console.log(
                  '✈️ User backed out of drone deposit - not consuming drone'
                );
              setStashMoneyModalVisible(false);
            }}
            onConfirm={handleMoneyStashed}
            isDroneMode={true}
          />
        </Suspense>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2a2a2a',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    color: '#FFD700',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    fontFamily: 'PixeloidMono',
  },
  subtitle: {
    fontSize: 16,
    color: '#FFF',
    fontFamily: 'PixeloidMono',
    marginTop: 8,
  },
  itemsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 15,
    paddingHorizontal: 20,
  },
  itemsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  itemButtonWrapper: {
    flex: 1,
    aspectRatio: 1,
  },
  itemContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIcon: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
  borderWrapper: {
    width: '90%',
    marginTop: 25, // Position below the icon
  },
  itemButton: {
    height: 88,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 36, // Space for the icon overlap
    paddingBottom: 18,
    paddingHorizontal: 12,
  },
  itemName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    width: '100%',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    fontFamily: 'PixeloidMono',
    marginTop: 4,
  },
  cannotAffordPrice: {
    color: '#ff0000',
  },
  activateText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#22c55e',
    fontFamily: 'PixeloidMono',
    marginTop: 4,
    textTransform: 'uppercase',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  protectedText: {
    color: '#3b82f6', // Blue for protected status
  },
  uploadedText: {
    color: '#ec4899', // Pink for influencer shoutout
  },
  itemLevel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'green',
    fontFamily: 'PixeloidMono',
    textShadowColor: 'green',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  backButton: {
    marginBottom: 30,
    marginTop: 20,
    marginHorizontal: 20,
    backgroundColor: 'rgba(239,68,68,1)',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: 'rgba(185,28,28,1)',
  },
  backButtonInner: {
    paddingVertical: 16,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  infoModal: {
    backgroundColor: '#2a2a2a',
    padding: 24,
    alignItems: 'center',
    minWidth: 300,
    maxWidth: 400,
    borderRadius: 10,
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFD700',
    fontFamily: 'PixeloidMono',
    marginBottom: 8,
    textAlign: 'center',
  },
  infoLevel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#93c5fd',
    fontFamily: 'PixeloidMono',
    marginBottom: 16,
  },
  infoDescription: {
    fontSize: 14,
    color: '#e0e0e0',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  infoPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4ade80',
    fontFamily: 'PixeloidMono',
    marginBottom: 20,
  },
  cantAffordText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f87171',
    fontFamily: 'PixeloidMono',
    marginBottom: 12,
  },
  maxedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fbbf24',
    fontFamily: 'PixeloidMono',
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButtonInner: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
  },
  // Daily Joker styles
  dailyJokerContainer: {
    paddingHorizontal: 10,
    marginTop: 8,
    alignItems: 'center',
  },
  dailyJokerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 6,
    marginTop: 6,
  },
  dailyJokerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFD700',
    fontFamily: 'PixeloidMono',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  dailyJokerInlinePrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4ade80',
    fontFamily: 'PixeloidMono',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  dailyJokerCardWrapper: {
    position: 'relative',
    width: 180,
    height: 130,
    marginBottom: 4,
  },
  dailyJokerSquareContainer: {
    minHeight: undefined,
    height: '100%',
    padding: 6,
  },
  dailyJokerSoldOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  dailyJokerSoldOverlayText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
    letterSpacing: 4,
  },
  dailyJokerBadgeOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 6,
  },
  dailyJokerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  dailyJokerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'PixeloidMono',
  },
  dailyJokerMaxText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fbbf24',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginTop: 4,
  },
});
