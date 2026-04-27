import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CANDY_REGISTRY } from '../src/constants/candyRegistry';
import colors from '../src/constants/colors';
import { JOKER_IDS, findJokerById } from '../src/constants/jokerIds';
import { useGame } from '../src/hooks/useGame';
import { useInventory } from '../src/hooks/useInventory';
import { useJokers } from '../src/hooks/useJokers';
import { useSeed } from '../src/hooks/useSeed';
import { useShopkeeper } from '../src/hooks/useShopkeeper';
import { useWallet } from '../src/hooks/useWallet';
import { STANDARDIZED_JOKERS } from '../src/utils/jokerEffectEngine';
import { formatCurrency } from '../src/utils/priceUtils';
import DeliJokerShop from './components/DeliJokerShop';
import DeliTriviaModal from './components/DeliTriviaModal';
import GameHUD from './components/GameHUD';
import NightlyQuestBanner from './components/NightlyQuestBanner';
import PixelBorder from './components/PixelBorder';
import ShopkeeperNPC from './components/ShopkeeperNPC';
import TransactionModal from './components/TransactionModal';
import { Candy } from './types';

type CandyForDeli = Candy & {
  cost: number;
  quantityOwned: number;
  averagePrice: number | null;
  isDailySpecial: boolean;
  specialDiscount: number;
};

const baseCandies = CANDY_REGISTRY.map((c) => ({
  name: c.name,
  baseMin: c.baseMin,
  baseMax: c.baseMax,
  types: c.types,
  size: c.size,
}));

interface DeliPageProps {
  onBack?: () => void;
}

export default function Deli({ onBack }: DeliPageProps = {}) {
  const { gameData, seed } = useSeed();
  const { balance, spend, add } = useWallet();
  const {
    inventory,
    addToInventory,
    removeFromInventory,
    inventoryCount,
    getInventoryLimit,
  } = useInventory();
  const { day } = useGame();
  const { jokers, addJoker: addJokerAction } = useJokers();
  const shopkeeper = useShopkeeper();

  // Initialize shopkeeper visit
  useEffect(() => {
    if (!shopkeeper.hasVisitedDeliToday) {
      // Get IDs of jokers at max level (to filter from shop)
      const ownedMaxLevelIds = jokers
        .filter((j) => {
          const std = STANDARDIZED_JOKERS.find(
            (s) => s.id.toString() === j.id.toString()
          );
          return std && (j.level ?? 1) >= (std.maxLevel || 3);
        })
        .map((j) => Number(j.id));

      shopkeeper.initialize(seed || 'default', day, ownedMaxLevelIds);
    }
  }, []);

  // Tab state
  const [activeTab, setActiveTab] = useState<'candy' | 'joker'>('candy');
  const [sizeFilter, setSizeFilter] = useState<'all' | 'small' | 'medium' | 'big'>('all');

  // Trivia modal
  const [showTrivia, setShowTrivia] = useState(false);
  const [triviaReaction, setTriviaReaction] = useState('');

  // Transaction modal
  const [selectedCandyIndex, setSelectedCandyIndex] = useState<number | null>(
    null
  );
  const [modalMode, setModalMode] = useState<'buy' | 'sell'>('buy');

  // Greeting dialogue
  const [currentDialogue, setCurrentDialogue] = useState(() =>
    shopkeeper.getDialogue(
      shopkeeper.pendingQuestReward ? 'quest_complete' : 'greeting'
    )
  );

  // Check for Shrinking Glass joker (provides deli discount)
  const shrinkingGlassJoker = findJokerById(
    jokers,
    JOKER_IDS.SHRINKING_GLASS
  );

  // Build candy list with all discounts
  const candies = useMemo(() => {
    const currentShrinkingGlassJoker = findJokerById(
      jokers,
      JOKER_IDS.SHRINKING_GLASS
    );
    const friendshipDiscount = shopkeeper.discount;

    return baseCandies.map((candy) => {
      const prices = gameData.candyPrices?.[candy.name] ?? [];
      let averageCost =
        prices.length > 0
          ? prices.reduce((sum: number, price: number) => sum + price, 0) /
            prices.length
          : 0;

      // Apply Shrinking Glass discount — 50%/75%/90% off by level.
      // Matches the deli_price_discount multiplier in jokerEffectEngine (0.5/0.25/0.1).
      if (currentShrinkingGlassJoker) {
        const level = (currentShrinkingGlassJoker as any).level ?? 1;
        const priceMultiplier = level === 3 ? 0.1 : level === 2 ? 0.25 : 0.5;
        averageCost = averageCost * priceMultiplier;
      }

      // Apply friendship discount
      if (friendshipDiscount > 0) {
        averageCost = averageCost * (1 - friendshipDiscount);
      }

      // Check daily special
      const special = shopkeeper.dailySpecials.find(
        (s) => s.candyName === candy.name
      );
      if (special) {
        averageCost = averageCost * (1 - special.discountPercent);
      }

      const inventoryItem = inventory.find((item) => item.name === candy.name);

      return {
        ...candy,
        cost: parseFloat(averageCost.toFixed(2)),
        quantityOwned: inventoryItem?.quantity || 0,
        averagePrice: inventoryItem?.price || null,
        isDailySpecial: !!special,
        specialDiscount: special
          ? Math.round(special.discountPercent * 100)
          : 0,
      };
    });
  }, [
    jokers,
    gameData,
    inventory,
    shopkeeper.discount,
    shopkeeper.dailySpecials,
  ]);

  const openModal = (index: number) => {
    setSelectedCandyIndex(index);
    setModalMode('buy');
  };

  const closeModal = () => {
    setSelectedCandyIndex(null);
  };

  const handleTransaction = useCallback(
    (quantity: number, mode: 'Buy' | 'Sell') => {
      if (selectedCandyIndex === null) return;

      const candy = candies[selectedCandyIndex];
      if (!candy) return;

      if (mode === 'Buy') {
        const totalCost = candy.cost * quantity;
        if (balance < totalCost) return;

        spend(totalCost);
        addToInventory(candy.name, quantity, candy.cost);
        shopkeeper.recordPurchase();
        setCurrentDialogue(shopkeeper.getDialogue('purchase'));
      } else {
        const totalGain = candy.cost * quantity;
        add(totalGain);
        removeFromInventory(candy.name, quantity);
      }

      closeModal();
    },
    [
      selectedCandyIndex,
      candies,
      balance,
      spend,
      add,
      addToInventory,
      removeFromInventory,
      shopkeeper,
    ]
  );

  const handleReturnToAfterSchool = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (onBack) {
      onBack();
    } else {
      router.replace('/(tabs)/after-school');
    }
  };

  // Shopkeeper actions
  const handleChat = useCallback(() => {
    shopkeeper.chat();
    setCurrentDialogue(shopkeeper.getDialogue('chat'));
  }, [shopkeeper]);

  const handleTriviaOpen = useCallback(() => {
    setCurrentDialogue(shopkeeper.getDialogue('trivia_intro'));
    setShowTrivia(true);
  }, [shopkeeper]);

  const handleTriviaAnswer = useCallback(
    (correct: boolean) => {
      shopkeeper.submitTriviaAnswer(correct);
      const reaction = shopkeeper.getDialogue(
        correct ? 'trivia_correct' : 'trivia_wrong'
      );
      setTriviaReaction(reaction);
    },
    [shopkeeper]
  );

  const handleTriviaClose = useCallback(() => {
    if (!shopkeeper.canAnswerTrivia) {
      setShowTrivia(false);
    }
    // If more questions remain, modal stays open but resets for next question
  }, [shopkeeper.canAnswerTrivia]);

  const handleBuyJoker = useCallback(
    (jokerId: number, price: number) => {
      if (balance < price) return;
      spend(price);
      shopkeeper.buyDeliJoker(jokerId);

      // Add joker to player's collection
      const standardized = STANDARDIZED_JOKERS.find((j) => j.id === jokerId);
      if (standardized) {
        const owned = jokers.find(
          (j) => j.id.toString() === jokerId.toString()
        );
        if (owned) {
          // Upgrade existing joker
          // The upgrade is handled by useJokers
        } else {
          addJokerAction({
            id: jokerId,
            name: standardized.name,
            type: standardized.type,
            description: standardized.description,
            level: 1,
          });
        }
      }

      setCurrentDialogue(shopkeeper.getDialogue('purchase'));
    },
    [balance, spend, shopkeeper, jokers, addJokerAction]
  );

  const handleReroll = useCallback(() => {
    if (!shopkeeper.canReroll || balance < shopkeeper.rerollCost) return;
    spend(shopkeeper.rerollCost);

    const ownedMaxLevelIds = jokers
      .filter((j) => {
        const std = STANDARDIZED_JOKERS.find(
          (s) => s.id.toString() === j.id.toString()
        );
        return std && (j.level ?? 1) >= (std.maxLevel || 3);
      })
      .map((j) => Number(j.id));

    shopkeeper.reroll(seed || 'default', day, ownedMaxLevelIds);

    if (shopkeeper.canReroll) {
      setCurrentDialogue(shopkeeper.getDialogue('reroll'));
    } else {
      setCurrentDialogue(shopkeeper.getDialogue('reroll_limit'));
    }
  }, [shopkeeper, balance, spend, jokers, seed, day]);

  const handleClaimQuestReward = useCallback(() => {
    if (!shopkeeper.nightlyQuest) return;
    add(shopkeeper.nightlyQuest.reward.cash);
    shopkeeper.claimQuestReward();
    setCurrentDialogue(shopkeeper.getDialogue('quest_complete'));
  }, [shopkeeper, add]);

  const selectedCandy =
    selectedCandyIndex !== null ? candies[selectedCandyIndex] : null;

  const inventoryLimit = getInventoryLimit();
  const availableInventorySpace = Math.max(0, inventoryLimit - inventoryCount);

  const maxBuyQty =
    selectedCandy && selectedCandy.cost > 0
      ? Math.min(
          Math.floor(balance / selectedCandy.cost),
          availableInventorySpace
        )
      : 0;
  const maxSellQty = selectedCandy ? selectedCandy.quantityOwned : 0;

  // Discount info for banners
  const hasShrinkingGlass = !!shrinkingGlassJoker;
  const shrinkingGlassLevel = shrinkingGlassJoker
    ? ((shrinkingGlassJoker as any).level ?? 1)
    : 0;
  const shrinkingGlassPercent =
    shrinkingGlassLevel === 3 ? 90 : shrinkingGlassLevel === 2 ? 75 : 50;
  const hasFriendshipDiscount = shopkeeper.discount > 0;

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#2d1b69" />
      <GameHUD
        theme="evening"
        customHeaderText={`After School - Day ${day}`}
        customLocationText="Corner Store"
        showLunchMinigames={false}
      />
      <View style={styles.contentContainer}>
        {/* Shopkeeper NPC */}
        <ShopkeeperNPC
          mood={shopkeeper.mood}
          level={shopkeeper.level}
          totalXP={shopkeeper.totalXP}
          dialogue={currentDialogue}
          hasChattedToday={shopkeeper.hasChattedToday}
          canAnswerTrivia={shopkeeper.canAnswerTrivia}
          triviaAnsweredToday={shopkeeper.triviaAnsweredToday}
          onChat={handleChat}
          onTrivia={handleTriviaOpen}
        />

        {/* Nightly Quest Banner */}
        <NightlyQuestBanner
          quest={shopkeeper.nightlyQuest}
          completed={shopkeeper.nightlyQuestCompleted}
          pendingReward={shopkeeper.pendingQuestReward}
          onClaimReward={handleClaimQuestReward}
        />

        {/* Discount Banners */}
        {(hasShrinkingGlass || hasFriendshipDiscount) && (
          <PixelBorder
            borderColor="#22c55e"
            borderWidth={2}
            backgroundColor="rgba(34, 197, 94, 0.9)"
            innerPadding={6}
            style={styles.discountBanner}
          >
            <Text style={styles.discountText}>
              {hasShrinkingGlass && hasFriendshipDiscount
                ? `Shrinking Glass ${shrinkingGlassPercent}% + Friend ${Math.round(shopkeeper.discount * 100)}% off!`
                : hasShrinkingGlass
                  ? `Shrinking Glass Active - ${shrinkingGlassPercent}% off!`
                  : `Friend Discount - ${Math.round(shopkeeper.discount * 100)}% off!`}
            </Text>
          </PixelBorder>
        )}

        {/* Tab Switcher */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'candy' && styles.tabActive]}
            onPress={() => setActiveTab('candy')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'candy' && styles.tabTextActive,
              ]}
            >
              Candy
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'joker' && styles.tabActive]}
            onPress={() => setActiveTab('joker')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'joker' && styles.tabTextActive,
              ]}
            >
              Jokers
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Area */}
        {activeTab === 'candy' ? (
          <>
            <View style={styles.sizeChipRow}>
              {(['all', 'small', 'medium', 'big'] as const).map((id) => {
                const isActive = sizeFilter === id;
                const label = id === 'all' ? 'All' : id[0].toUpperCase() + id.slice(1);
                return (
                  <TouchableOpacity
                    key={id}
                    onPress={() => setSizeFilter(id)}
                    style={[styles.sizeChip, isActive && styles.sizeChipActive]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.sizeChipText,
                        isActive && styles.sizeChipTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          <FlatList
            data={
              sizeFilter === 'all'
                ? candies
                : candies.filter((c) => c.size === sizeFilter)
            }
            keyExtractor={(item) => item.name}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => (
              <View style={{ marginBottom: 8 }}>
                <PixelBorder
                  borderColor={item.isDailySpecial ? '#22c55e' : '#ff6b35'}
                  borderWidth={3}
                  backgroundColor={
                    item.isDailySpecial
                      ? 'rgba(34, 197, 94, 0.15)'
                      : 'rgba(255, 255, 255, 0.9)'
                  }
                  innerPadding={12}
                >
                  <TouchableOpacity
                    style={styles.item}
                    onPress={() => openModal(index)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.itemHeader}>
                      <View style={styles.nameRow}>
                        <Text
                          style={[
                            styles.name,
                            item.isDailySpecial && styles.nameSpecial,
                          ]}
                        >
                          {item.name}
                        </Text>
                        {item.isDailySpecial && (
                          <Text style={styles.saleTag}>
                            SALE -{item.specialDiscount}%
                          </Text>
                        )}
                      </View>
                      <Text style={styles.price}>
                        ${formatCurrency(item.cost)}
                      </Text>
                    </View>
                    <View style={styles.itemDetails}>
                      <Text style={styles.owned}>
                        Owned: {item.quantityOwned}
                      </Text>
                      <Text style={styles.avgPrice}>
                        Avg Cost:{' '}
                        {item.averagePrice !== null
                          ? `$${formatCurrency(item.averagePrice)}`
                          : '—'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </PixelBorder>
              </View>
            )}
          />
          </>
        ) : (
          <DeliJokerShop
            deliJokerIds={shopkeeper.deliJokerIds}
            deliJokersPurchased={shopkeeper.deliJokersPurchased}
            rerollCount={shopkeeper.rerollCount}
            rerollCost={shopkeeper.rerollCost}
            canReroll={shopkeeper.canReroll}
            balance={balance}
            discount={shopkeeper.discount}
            onBuyJoker={handleBuyJoker}
            onReroll={handleReroll}
          />
        )}

        {/* Footer */}
        <View style={styles.buttonContainer}>
          <PixelBorder
            borderColor="rgba(185,28,28,1)"
            borderWidth={3}
            backgroundColor="rgba(239,68,68,1)"
            innerPadding={0}
            style={styles.backButton}
          >
            <TouchableOpacity
              style={styles.backButtonInner}
              onPress={handleReturnToAfterSchool}
              activeOpacity={0.8}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </PixelBorder>
        </View>
      </View>

      {/* Transaction Modal */}
      {selectedCandy && (
        <TransactionModal
          visible={selectedCandyIndex !== null}
          onClose={closeModal}
          onConfirm={handleTransaction}
          maxBuyQuantity={maxBuyQty}
          maxSellQuantity={maxSellQty}
          candy={selectedCandy}
        />
      )}

      {/* Trivia Modal */}
      <DeliTriviaModal
        visible={showTrivia}
        question={shopkeeper.currentTriviaQuestion}
        questionNumber={shopkeeper.triviaAnsweredToday + 1}
        onAnswer={handleTriviaAnswer}
        onClose={handleTriviaClose}
        shopkeeperReaction={triviaReaction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2d1b69',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  signContainer: {
    alignItems: 'center',
    width: '100%',
  },
  storeBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  neonStrip: {
    width: '80%',
    height: 4,
    backgroundColor: '#ff1493',
    marginVertical: 6,
    shadowColor: '#ff1493',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
    borderRadius: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.white,
    fontFamily: 'PixeloidMono',
    textShadowColor: colors.orange.primary,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#ff1493',
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
    textShadowColor: '#660033',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 1,
  },
  // Tab switcher
  tabRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  tabActive: {
    backgroundColor: colors.orange.primary,
    borderColor: colors.orange.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gray.light,
    fontFamily: 'PixeloidMono',
  },
  tabTextActive: {
    color: colors.white,
  },
  // Size filter chips
  sizeChipRow: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    paddingTop: 6,
    paddingBottom: 6,
    gap: 6,
  },
  sizeChip: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#ff6b35',
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
  },
  sizeChipActive: {
    backgroundColor: '#ff6b35',
    borderColor: '#b94714',
  },
  sizeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b94714',
    fontFamily: 'PixeloidMono',
  },
  sizeChipTextActive: {
    color: '#fff',
  },
  // Candy list
  list: {
    padding: 0,
    paddingBottom: 16,
  },
  item: {
    flexDirection: 'column',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d1b69',
    fontFamily: 'PixeloidMono',
  },
  nameSpecial: {
    color: '#166534',
  },
  saleTag: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.white,
    fontFamily: 'PixeloidMono',
    backgroundColor: colors.green.success,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    overflow: 'hidden',
  },
  price: {
    fontSize: 18,
    color: colors.orange.primary,
    fontWeight: '800',
    fontFamily: 'PixeloidMono',
    textShadowColor: '#cc5529',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  owned: {
    fontSize: 14,
    color: colors.gray.medium,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
  },
  avgPrice: {
    fontSize: 14,
    color: colors.gray.medium,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
  },
  buttonContainer: {
    borderTopColor: colors.orange.primary,
    borderTopWidth: 3,
    alignItems: 'center',
  },
  backButton: {
    shadowColor: colors.red.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  backButtonInner: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PixeloidMono',
    textShadowColor: colors.red.dark,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  discountBanner: {
    marginBottom: 8,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    textShadowColor: '#166534',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
