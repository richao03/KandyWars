import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UPGRADE_COSTS } from '../../src/constants/jokerUpgrades';
import { useJokers } from '../../src/hooks/useJokers';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { addBalance, selectBalance } from '../../src/store/slices/walletSlice';
import {
  STANDARDIZED_JOKERS,
  getJokerEffectsAtLevel,
} from '../../src/utils/jokerEffectEngine';
import { formatNumber } from '../../src/utils/priceUtils';
import AdBanner from './AdBanner';
import ConfirmationModal from './ConfirmationModal';
import JokerCard from './JokerCard';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';

interface UpgradeableJoker {
  id: string | number;
  name: string;
  currentLevel: number;
  maxLevel: number;
  cost: number;
}

interface UpgradeJokersModalProps {
  visible: boolean;
  onClose: () => void;
}

// Readable summary of a joker's effects at a given level (e.g. "+0.5 profit boost").
const describeEffectsAtLevel = (jokerId: number, level: number): string => {
  console.log('joker id', jokerId);
  console.log('level', level);
  const effects = getJokerEffectsAtLevel(jokerId, level);
  if (effects.length === 0) return 'No effects';
  return effects
    .map((e) => {
      const op =
        e.operation === 'multiply' ? 'x' : e.operation === 'add' ? '+' : '';
      const amt =
        e.operation === 'multiply' ? `${e.amount}x` : `${op}${e.amount}`;
      const target = (e.target || '').replace(/_/g, ' ');
      const cond = e.conditions
        ? Object.values(e.conditions)
            .filter((v) => v !== undefined && v !== -1)
            .join(' ')
        : '';
      return `${amt} ${target}${cond ? ` (${cond})` : ''}`;
    })
    .join(', ');
};

/**
 * Standalone "Level Up Jokers" overlay. Lists owned jokers below max level and
 * lets the player spend cash to level them up. Mirrors the upgrade flow in
 * JokerSelection so it can be opened from the lunch / after-school selectors.
 */
const UpgradeJokersModal = React.memo(function UpgradeJokersModal({
  visible,
  onClose,
}: UpgradeJokersModalProps) {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const balance = useAppSelector(selectBalance);
  const { jokersOwned, upgradeJoker: upgradeJokerAction } = useJokers();
  const [confirmJoker, setConfirmJoker] = useState<UpgradeableJoker | null>(
    null
  );

  const upgradeableJokers = useMemo<UpgradeableJoker[]>(() => {
    return jokersOwned
      .map((owned) => {
        const standardized = STANDARDIZED_JOKERS.find(
          (sj) => sj.id.toString() === owned.id.toString()
        );
        if (!standardized) return null;
        const currentLevel = (owned as any).level ?? 1;
        const maxLevel = standardized.maxLevel ?? 1;
        if (currentLevel >= maxLevel) return null;
        const cost = UPGRADE_COSTS[currentLevel];
        if (!cost) return null;
        return {
          id: owned.id,
          name: owned.name || standardized.name,
          currentLevel,
          maxLevel,
          cost,
        } as UpgradeableJoker;
      })
      .filter(Boolean) as UpgradeableJoker[];
  }, [jokersOwned]);

  const toCardJoker = (id: string | number, level: number) => {
    const std = STANDARDIZED_JOKERS.find(
      (sj) => sj.id.toString() === id.toString()
    );
    const owned = jokersOwned.find((j) => j.id.toString() === id.toString());
    return {
      id: Number(id),
      name: owned?.name || std?.name || 'Unknown',
      type: (std?.type === 'one-time' ? 'one-time' : 'persistent') as
        | 'one-time'
        | 'persistent',
      flavorText: std?.flavorText || '',
      description: std?.description || '',
      level,
    };
  };

  const handleConfirmUpgrade = () => {
    if (!confirmJoker) return;
    if (balance < confirmJoker.cost) {
      setConfirmJoker(null);
      return;
    }
    dispatch(addBalance(-confirmJoker.cost));
    upgradeJokerAction(confirmJoker.id.toString());
    setConfirmJoker(null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* AdMob banner at the top, matching the global screen chrome. The
            modal covers the app-wide banner, so we render our own here. */}
        <View style={[styles.adBar, { paddingTop: insets.top }]}>
          <AdBanner />
        </View>

        {/* Fixed header */}
        <View style={styles.header}>
          <Text style={styles.title}>Level Up Wildcards</Text>
          <Text style={styles.subtitle}>Balance: ${formatNumber(balance)}</Text>
        </View>

        {/* Scrollable joker list */}
        <PixelBorder
          fill
          borderColor="#d4af37"
          borderWidth={3}
          backgroundColor="transparent"
          innerPadding={0}
          style={styles.scrollBorder}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
          >
            {upgradeableJokers.length === 0 ? (
              <Text style={styles.emptyText}>
                No jokers available to upgrade.
              </Text>
            ) : (
              <View style={styles.cardGrid}>
                {upgradeableJokers.map((joker) => {
                  const canAfford = balance >= joker.cost;
                  const cardJoker = toCardJoker(joker.id, joker.currentLevel);
                  return (
                    <PressableButton
                      key={joker.id.toString()}
                      onPress={() => canAfford && setConfirmJoker(joker)}
                      disabled={!canAfford}
                      shadowOpacity={0}
                      elevation={0}
                      style={{
                        backgroundColor: 'transparent',
                        opacity: canAfford ? 1 : 0.5,
                      }}
                    >
                      <View style={styles.cardContainer}>
                        <JokerCard
                          joker={cardJoker}
                          isAfterSchool={false}
                          variant="tile"
                          showOwned={false}
                          disableActivation
                        />
                      </View>
                      <View style={styles.cardOverlayRow}>
                        <View style={styles.upgradeBadge}>
                          <Text style={styles.upgradeBadgeText}>
                            LV{joker.currentLevel} → LV{joker.currentLevel + 1}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.upgradeCost,
                            canAfford ? styles.canAfford : styles.cantAfford,
                          ]}
                        >
                          ${formatNumber(joker.cost)}
                        </Text>
                      </View>
                    </PressableButton>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </PixelBorder>

        {/* Fixed footer */}
        <View style={styles.footer}>
          <PressableButton
            onPress={onClose}
            shadowOpacity={0}
            elevation={0}
            style={{ alignItems: 'center', backgroundColor: 'transparent' }}
          >
            <PixelBorder
              borderColor="#d4af37"
              borderWidth={3}
              backgroundColor="#3a2a1a"
              innerPadding={0}
            >
              <View style={{ padding: 16, alignItems: 'center' }}>
                <Text style={styles.closeButtonText}>Back</Text>
              </View>
            </PixelBorder>
          </PressableButton>
        </View>
      </View>
      {confirmJoker && (
        <ConfirmationModal
          visible={!!confirmJoker}
          theme="school"
          emoji="🃏"
          title={`Level Up ${confirmJoker.name}?`}
          message={
            `LV${confirmJoker.currentLevel} → LV${confirmJoker.currentLevel + 1}\n\n` +
            `Now: ${describeEffectsAtLevel(Number(confirmJoker.id), confirmJoker.currentLevel)}\n` +
            `Next: ${describeEffectsAtLevel(Number(confirmJoker.id), confirmJoker.currentLevel + 1)}\n\n` +
            `Cost: $${formatNumber(confirmJoker.cost)}`
          }
          confirmText={`Upgrade ($${formatNumber(confirmJoker.cost)})`}
          cancelText="Cancel"
          onConfirm={handleConfirmUpgrade}
          onCancel={() => setConfirmJoker(null)}
        />
      )}
    </Modal>
  );
});

export default UpgradeJokersModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  adBar: {
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 8,
    color: '#d4af37',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    color: '#f5e9c4',
  },
  scrollBorder: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 5,
    paddingBottom: 8,
    paddingTop: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    color: '#f5e9c4',
    marginTop: 24,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  cardContainer: {
    width: 160,
    height: 166,
  },
  cardOverlayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  upgradeBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  upgradeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
    color: '#fff',
    letterSpacing: 0.5,
  },
  upgradeCost: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
  },
  canAfford: {
    color: '#10b981',
  },
  cantAfford: {
    color: '#ef4444',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
    color: '#d4af37',
  },
});
