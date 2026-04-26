import React, { memo, useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PressableScale from './PressableScale';
import colors from '../../src/constants/colors';
import { JOKER_SHOP, getJokerPriceForReroll } from '../../src/constants/shopkeeperData';
import { STANDARDIZED_JOKERS } from '../../src/utils/jokerEffectEngine';
import { formatCurrency } from '../../src/utils/priceUtils';
import { useJokers } from '../../src/hooks/useJokers';
import PixelBorder from './PixelBorder';
import JokerCard from './JokerCard';

interface DeliJokerShopProps {
  deliJokerIds: number[];
  deliJokersPurchased: number[];
  rerollCount: number;
  rerollCost: number;
  canReroll: boolean;
  balance: number;
  discount: number;
  onBuyJoker: (jokerId: number, price: number) => void;
  onReroll: () => void;
}

function DeliJokerShop({
  deliJokerIds,
  deliJokersPurchased,
  rerollCount,
  rerollCost,
  canReroll,
  balance,
  discount,
  onBuyJoker,
  onReroll,
}: DeliJokerShopProps) {
  const { jokers } = useJokers();

  const getJokerData = useCallback(
    (jokerId: number) => {
      const standardized = STANDARDIZED_JOKERS.find(
        (j) => j.id === jokerId
      );
      if (!standardized) return null;

      const owned = jokers.find(
        (j) => j.id.toString() === jokerId.toString()
      );
      const currentLevel = owned?.level ?? 0;
      const isOwned = !!owned;
      const isPurchased = deliJokersPurchased.includes(jokerId);
      const isMaxLevel = isOwned && currentLevel >= (standardized.maxLevel || 3);

      // Calculate price
      let basePrice: number;
      if (!isOwned) {
        basePrice = getJokerPriceForReroll(rerollCount);
      } else if (currentLevel === 1) {
        basePrice = JOKER_SHOP.UPGRADE_L1_TO_L2;
      } else if (currentLevel === 2) {
        basePrice = JOKER_SHOP.UPGRADE_L2_TO_L3;
      } else {
        basePrice = 0;
      }
      const price = Math.floor(basePrice * (1 - discount));

      return {
        standardized,
        isOwned,
        currentLevel,
        isPurchased,
        isMaxLevel,
        price,
      };
    },
    [jokers, deliJokersPurchased, discount, rerollCount]
  );

  if (deliJokerIds.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No jokers available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Joker Cards */}
      <View style={styles.jokerRow}>
        {deliJokerIds.map((jokerId) => {
          const data = getJokerData(jokerId);
          if (!data) return null;

          const { standardized, isOwned, currentLevel, isPurchased, isMaxLevel, price } = data;
          const canAfford = balance >= price;
          const canBuy = !isPurchased && !isMaxLevel && canAfford;

          return (
            <View key={jokerId} style={styles.jokerItem}>
              <View style={styles.cardWrapper}>
                <JokerCard
                  joker={standardized}
                  isAfterSchool={true}
                  isCompact={true}
                  disableActivation={true}
                />
                {isPurchased && (
                  <View style={styles.soldOverlay}>
                    <Text style={styles.soldText}>SOLD</Text>
                  </View>
                )}
              </View>

              {/* Status labels */}
              {isOwned && !isMaxLevel && !isPurchased && (
                <Text style={styles.upgradeLabel}>
                  Upgrade L{currentLevel} → L{currentLevel + 1}
                </Text>
              )}
              {isMaxLevel && (
                <Text style={styles.maxLabel}>MAX LEVEL</Text>
              )}

              {/* Buy button */}
              {/* PressableScale for press-down spring feedback (I3 game-feel) */}
              {!isPurchased && !isMaxLevel && (
                <PressableScale
                  style={[
                    styles.buyButton,
                    !canBuy && styles.buyButtonDisabled,
                  ]}
                  onPress={() => canBuy && onBuyJoker(jokerId, price)}
                  disabled={!canBuy}
                >
                  <Text style={[styles.buyButtonText, !canBuy && styles.buyButtonTextDisabled]}>
                    {isOwned ? 'Upgrade' : 'Buy'} ${formatCurrency(price)}
                  </Text>
                  {discount > 0 && (
                    <Text style={styles.discountTag}>-{Math.round(discount * 100)}%</Text>
                  )}
                </PressableScale>
              )}
            </View>
          );
        })}
      </View>

      {/* Reroll section */}
      <View style={styles.rerollRow}>
        <TouchableOpacity
          style={[
            styles.rerollButton,
            (!canReroll || balance < rerollCost) && styles.rerollButtonDisabled,
          ]}
          onPress={onReroll}
          activeOpacity={canReroll && balance >= rerollCost ? 0.7 : 1}
          disabled={!canReroll || balance < rerollCost}
        >
          <Text style={styles.rerollButtonText}>
            {canReroll ? `Reroll $${formatCurrency(rerollCost)}` : 'No rerolls left'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.rerollCounter}>
          {JOKER_SHOP.MAX_REROLLS_PER_VISIT - rerollCount}/{JOKER_SHOP.MAX_REROLLS_PER_VISIT} left
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.gray.light,
    fontFamily: 'PixeloidMono',
  },
  jokerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  jokerItem: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 180,
  },
  cardWrapper: {
    width: '100%',
    position: 'relative',
  },
  soldOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  soldText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.red.error,
    fontFamily: 'PixeloidMono',
    transform: [{ rotate: '-15deg' }],
  },
  upgradeLabel: {
    fontSize: 9,
    color: colors.blue.cyan,
    fontFamily: 'PixeloidMono',
    marginTop: 4,
  },
  maxLabel: {
    fontSize: 9,
    color: colors.gold.light,
    fontFamily: 'PixeloidMono',
    marginTop: 4,
  },
  buyButton: {
    backgroundColor: colors.green.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  buyButtonDisabled: {
    backgroundColor: colors.gray.medium,
    opacity: 0.6,
  },
  buyButtonText: {
    fontSize: 11,
    color: colors.white,
    fontFamily: 'PixeloidMono',
    fontWeight: '800',
  },
  buyButtonTextDisabled: {
    color: colors.gray.light,
  },
  discountTag: {
    fontSize: 9,
    color: colors.gold.light,
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
  },
  rerollRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  rerollButton: {
    backgroundColor: colors.purple.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  rerollButtonDisabled: {
    backgroundColor: colors.gray.medium,
    opacity: 0.6,
    borderColor: 'transparent',
  },
  rerollButtonText: {
    fontSize: 11,
    color: colors.white,
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
  },
  rerollCounter: {
    fontSize: 10,
    color: colors.gray.light,
    fontFamily: 'PixeloidMono',
  },
});

export default memo(DeliJokerShop);
