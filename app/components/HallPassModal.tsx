import * as Haptics from 'expo-haptics';
import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import colors from '../../src/constants/colors';
import { useHallPass } from '../../src/hooks/useHallPass';
import {
  getHallPassActiveLimit,
  HallPass,
} from '../../src/store/slices/hallPassSlice';
import { computeHallPassModifiers } from '../../src/utils/computeHallPassModifiers';
import FastModal from './FastModal';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';
import ScrollViewWithFade from './ScrollViewWithFade';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MONO = 'PixeloidMono';

interface HallPassModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPass?: (passId: string | null) => void; // Optional for view-only mode
  onConfirm?: () => void; // Called when "Let's go!" is clicked (for new game flow)
  viewMode?: 'selection' | 'gallery';
}

// ─────────────────────────────────────────────────────────────────────────────
// Look-up tables
// ─────────────────────────────────────────────────────────────────────────────
type Rarity = HallPass['rarity'];

const RARITY_ORDER: Rarity[] = [
  'common',
  'magical',
  'rare',
  'epic',
  'legendary',
];

const RARITY_STYLE: Record<
  Rarity,
  { label: string; border: string; bg: string; text: string; stripe: string }
> = {
  common: {
    label: 'Common',
    border: '#6b7280',
    bg: '#f3f4f6',
    text: '#374151',
    stripe: '#9ca3af',
  },
  magical: {
    label: 'Magical',
    border: '#00A86B',
    bg: '#dcfce7',
    text: '#047857',
    stripe: '#34d399',
  },
  rare: {
    label: 'Rare',
    border: '#0070dd',
    bg: '#dbeafe',
    text: '#1d4ed8',
    stripe: '#60a5fa',
  },
  epic: {
    label: 'Epic',
    border: '#a335ee',
    bg: '#f3e8ff',
    text: '#7e22ce',
    stripe: '#c084fc',
  },
  legendary: {
    label: 'Legendary',
    border: '#ff8000',
    bg: '#ffedd5',
    text: '#c2410c',
    stripe: '#fb923c',
  },
};

const DEFAULT_ICON = require('../../assets/images/emojis/hallpass.png');
const LOCK_ICON = require('../../assets/images/emojis/lock.png');

// One pixel icon per pass so the binder reads at a glance.
const PASS_ICONS: Record<string, any> = {
  no_longer_freshman: require('../../assets/images/emojis/student.png'),
  sophomore_swagger: require('../../assets/images/emojis/backpack.png'),
  the_valedictorian: require('../../assets/images/emojis/book.png'),
  maximalist: require('../../assets/images/emojis/piggyBank.png'),
  junior_genius: require('../../assets/images/emojis/joker.png'),
  senior_executive: require('../../assets/images/emojis/money.png'),
  finance_club: require('../../assets/images/emojis/chart.png'),
  forged_pass: require('../../assets/images/emojis/refresh.png'),
  teachers_pet: require('../../assets/images/emojis/shield.png'),
  inheritance: require('../../assets/images/emojis/vault.png'),
  candy_kingpin: require('../../assets/images/emojis/crown.png'),
  minimalist_master: require('../../assets/images/emojis/minimalist.png'),
  high_roller: require('../../assets/images/emojis/pokerChips.png'),
  perfect_scholar: require('../../assets/images/emojis/study.png'),
  time_crunch: require('../../assets/images/emojis/clock.png'),
  final_exam: require('../../assets/images/emojis/books.png'),
  speedrun_champion: require('../../assets/images/emojis/rushing.png'),
  joker_monopoly: require('../../assets/images/emojis/joker.png'),
  overachiever: require('../../assets/images/emojis/trophy.png'),
};

const iconFor = (id: string) => PASS_ICONS[id] ?? DEFAULT_ICON;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function HallPassModal({
  visible,
  onClose,
  onSelectPass,
  onConfirm,
  viewMode = 'selection',
}: HallPassModalProps) {
  const { allPasses, unlockedPasses, selectedPassIds } = useHallPass();
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(
    selectedPassIds || []
  );
  const [expandedPassId, setExpandedPassId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unlocked'>('all');

  const isSelectionMode = viewMode === 'selection' && !!onSelectPass;

  // Sync local state with Redux when modal opens
  React.useEffect(() => {
    if (visible) {
      setLocalSelectedIds(selectedPassIds || []);
      setExpandedPassId(null);
    }
  }, [visible, selectedPassIds]);

  const selectedPasses = useMemo(
    () => allPasses.filter((p) => localSelectedIds.includes(p.id)),
    [allPasses, localSelectedIds]
  );

  const computedModifiers = useMemo(() => {
    if (!visible || !isSelectionMode || selectedPasses.length === 0)
      return null;
    return computeHallPassModifiers(selectedPasses);
  }, [visible, isSelectionMode, selectedPasses]);

  // Effective cap on simultaneously-active passes, given the current
  // selection (an extension pass like Overachiever raises it from 3 → 4).
  const maxActivePasses = useMemo(
    () => getHallPassActiveLimit(selectedPasses),
    [selectedPasses]
  );

  const lockedCount = allPasses.length - unlockedPasses.length;
  const visiblePasses = useMemo(
    () =>
      filter === 'unlocked' ? allPasses.filter((p) => p.isUnlocked) : allPasses,
    [allPasses, filter]
  );

  // Group by rarity for section labels (list is already rarity-sorted, but
  // grouping keeps it robust if the source order ever changes).
  const groupedPasses = useMemo(
    () =>
      RARITY_ORDER.map((rarity) => ({
        rarity,
        passes: visiblePasses.filter((p) => p.rarity === rarity),
      })).filter((g) => g.passes.length > 0),
    [visiblePasses]
  );

  // ── Cap rejection feedback (timing only — no springs) ────────────────────
  const counterPulse = useRef(new Animated.Value(0)).current;
  const cardFlash = useRef(new Animated.Value(0)).current;
  const [rejectedPassId, setRejectedPassId] = useState<string | null>(null);

  const triggerCapRejection = (passId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
      () => {}
    );
    counterPulse.stopAnimation();
    counterPulse.setValue(0);
    Animated.sequence([
      Animated.timing(counterPulse, {
        toValue: 1,
        duration: 120,
        useNativeDriver: false,
      }),
      Animated.timing(counterPulse, {
        toValue: 0,
        duration: 120,
        useNativeDriver: false,
      }),
      Animated.timing(counterPulse, {
        toValue: 1,
        duration: 120,
        useNativeDriver: false,
      }),
      Animated.timing(counterPulse, {
        toValue: 0,
        duration: 160,
        useNativeDriver: false,
      }),
    ]).start();

    setRejectedPassId(passId);
    cardFlash.stopAnimation();
    cardFlash.setValue(0);
    Animated.sequence([
      Animated.timing(cardFlash, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(cardFlash, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(cardFlash, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(cardFlash, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => setRejectedPassId(null));
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const toggleExpand = (passId: string) =>
    setExpandedPassId((cur) => (cur === passId ? null : passId));

  const toggleSelect = (passId: string) => {
    if (!isSelectionMode) return;
    const isCurrentlySelected = localSelectedIds.includes(passId);

    // Enforce the active-pass cap when adding. Include the candidate in the
    // limit calc so an extension pass can always be added to raise its own
    // cap. Mirrors the reducer so the optimistic UI never desyncs.
    if (!isCurrentlySelected) {
      const passesForLimit = allPasses.filter(
        (p) => localSelectedIds.includes(p.id) || p.id === passId
      );
      const limit = getHallPassActiveLimit(passesForLimit);
      if (localSelectedIds.length >= limit) {
        triggerCapRejection(passId);
        return;
      }
    }

    Haptics.selectionAsync().catch(() => {});
    onSelectPass?.(passId); // toggles in Redux
    setLocalSelectedIds((ids) =>
      isCurrentlySelected ? ids.filter((id) => id !== passId) : [...ids, passId]
    );
  };

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    else onClose();
  };

  // ── Sub-renders ──────────────────────────────────────────────────────────
  const renderSlots = () => {
    if (!isSelectionMode) return null;
    const slots = Array.from({ length: maxActivePasses });
    return (
      <View style={styles.slotsBlock}>
        <View style={styles.slotsRow}>
          {slots.map((_, i) => {
            const pass = selectedPasses[i];
            if (!pass) {
              return (
                <View key={`empty-${i}`} style={styles.slotEmpty}>
                  <Text style={styles.slotPlus}>+</Text>
                </View>
              );
            }
            const rs = RARITY_STYLE[pass.rarity];
            return (
              <TouchableOpacity
                key={pass.id}
                onPress={() => toggleSelect(pass.id)}
                activeOpacity={0.7}
                style={[
                  styles.slotFilled,
                  { borderColor: rs.border, backgroundColor: rs.bg },
                ]}
              >
                <Image source={iconFor(pass.id)} style={styles.slotIcon} />
                <View
                  style={[styles.slotRemove, { backgroundColor: rs.border }]}
                >
                  <Text style={styles.slotRemoveText}>×</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <Animated.Text
            style={[
              styles.slotCounter,
              {
                transform: [
                  {
                    scale: counterPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.25],
                    }),
                  },
                ],
                color: counterPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [colors.brown.primary, colors.red.error],
                }),
              },
            ]}
          >
            {localSelectedIds.length}/{maxActivePasses}
          </Animated.Text>
        </View>

        {computedModifiers ? (
          <View style={styles.chipRow}>
            {computedModifiers.salePriceBonusPercent > 0 && (
              <Chip
                text={`💰 +${(computedModifiers.salePriceBonusPercent * 5).toFixed(0)}% profit`}
              />
            )}
            {computedModifiers.inventoryBonusSlots > 0 && (
              <Chip
                text={`🎒 +${computedModifiers.inventoryBonusSlots} slots`}
              />
            )}
            {computedModifiers.allowanceBonusPercent > 0 && (
              <Chip
                text={`💵 +${computedModifiers.allowanceBonusPercent}% allowance`}
              />
            )}
            {computedModifiers.jokerBonusCount > 0 && (
              <Chip
                text={`🃏 +${computedModifiers.jokerBonusCount} joker${
                  computedModifiers.jokerBonusCount !== 1 ? 's' : ''
                }`}
              />
            )}
            {computedModifiers.rerollBonusCount > 0 && (
              <Chip
                text={`🔄 +${computedModifiers.rerollBonusCount} reroll${
                  computedModifiers.rerollBonusCount !== 1 ? 's' : ''
                }`}
              />
            )}
          </View>
        ) : (
          <Text style={styles.slotsHint}>
            Clip up to {maxActivePasses} passes to your backpack
          </Text>
        )}
      </View>
    );
  };

  const renderPassCard = (pass: HallPass) => {
    const rs = RARITY_STYLE[pass.rarity];
    const isUnlocked = pass.isUnlocked;
    const isSelected = isSelectionMode
      ? localSelectedIds.includes(pass.id)
      : selectedPassIds.includes(pass.id);
    const isExpanded = expandedPassId === pass.id;
    const summary = pass.effects.map((e) => e.description).join(' · ');

    return (
      <View key={pass.id} style={styles.cardWrap}>
        <PixelBorder
          borderColor={isUnlocked ? rs.border : '#c9c9c9'}
          borderWidth={isSelected ? 4 : 3}
          backgroundColor={isUnlocked ? rs.bg : '#f1f1f1'}
          innerPadding={0}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => toggleExpand(pass.id)}
            style={styles.card}
          >
            {/* Left punched stripe */}
            <View
              style={[
                styles.stripe,
                { backgroundColor: isUnlocked ? rs.stripe : '#d4d4d4' },
              ]}
            >
              <View style={styles.punchHole} />
            </View>

            {/* Icon */}
            <View
              style={[
                styles.iconFrame,
                { borderColor: isUnlocked ? rs.border : '#bdbdbd' },
                !isUnlocked && styles.iconFrameLocked,
              ]}
            >
              <Image
                source={isUnlocked ? iconFor(pass.id) : LOCK_ICON}
                style={[styles.icon, !isUnlocked && { opacity: 0.55 }]}
              />
            </View>

            {/* Text */}
            <View style={styles.cardText}>
              <View style={styles.nameRow}>
                <Text
                  style={[
                    styles.passName,
                    { color: isUnlocked ? rs.text : '#8a8a8a' },
                  ]}
                  numberOfLines={1}
                >
                  {pass.name}
                </Text>
                <View
                  style={[
                    styles.rarityPill,
                    { backgroundColor: isUnlocked ? rs.border : '#bdbdbd' },
                  ]}
                >
                  <Text style={styles.rarityPillText}>
                    {rs.label.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.summary,
                  { color: isUnlocked ? colors.gray.dark : '#9a9a9a' },
                ]}
                numberOfLines={isExpanded ? undefined : 2}
              >
                {summary}
              </Text>
              {!isUnlocked && (
                <Text
                  style={styles.howToEarn}
                  numberOfLines={isExpanded ? undefined : 1}
                >
                  🔒 {pass.unlockRequirement}
                </Text>
              )}

              {isExpanded && (
                <View style={styles.expanded}>
                  <Text style={styles.flavor}>“{pass.description}”</Text>
                  {isUnlocked && (
                    <Text style={styles.earnedLine}>
                      ✓ Earned: {pass.unlockRequirement}
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Right action */}
            <View style={styles.cardRight}>
              {isSelectionMode && isUnlocked ? (
                <TouchableOpacity
                  onPress={() => toggleSelect(pass.id)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={[
                    styles.clipButton,
                    isSelected
                      ? {
                          backgroundColor: colors.green.success,
                          borderColor: '#15803d',
                        }
                      : { backgroundColor: '#fffaf0', borderColor: rs.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.clipText,
                      { color: isSelected ? '#fff' : rs.text },
                    ]}
                  >
                    {isSelected ? '✓' : 'CLIP'}
                  </Text>
                </TouchableOpacity>
              ) : isSelected ? (
                <View
                  style={[
                    styles.clipButton,
                    {
                      backgroundColor: colors.green.success,
                      borderColor: '#15803d',
                    },
                  ]}
                >
                  <Text style={[styles.clipText, { color: '#fff' }]}>✓</Text>
                </View>
              ) : null}
              <Text style={styles.chevron}>{isExpanded ? '▾' : '▸'}</Text>
            </View>
          </TouchableOpacity>
        </PixelBorder>

        {isSelected && (
          <View style={styles.clippedTag} pointerEvents="none">
            <Text style={styles.clippedTagText}>CLIPPED</Text>
          </View>
        )}

        {rejectedPassId === pass.id && (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              styles.rejectFlash,
              { opacity: cardFlash },
            ]}
          />
        )}
      </View>
    );
  };

  const collectedPct = allPasses.length
    ? Math.round((unlockedPasses.length / allPasses.length) * 100)
    : 0;

  return (
    <FastModal
      visible={visible}
      onClose={onClose}
      animationType="fade"
      backdropOpacity={0.8}
      modalStyle={styles.modalContainer}
    >
      <PixelBorder
        borderColor={colors.brown.secondary}
        borderWidth={3}
        backgroundColor="#fef7e7"
        innerPadding={14}
      >
        {/* Header */}
        <View style={styles.header}>
          <Image source={DEFAULT_ICON} style={styles.titleIcon} />
          <View>
            <Text style={styles.title}>Hall Pass Binder</Text>
            <Text style={styles.subtitle}>
              Permanent perks. Pick your loadout.
            </Text>
          </View>
        </View>

        {renderSlots()}

        {/* Filter */}
        {lockedCount > 0 && (
          <View style={styles.filterRow}>
            <FilterChip
              label={`ALL · ${allPasses.length}`}
              active={filter === 'all'}
              onPress={() => setFilter('all')}
            />
            <FilterChip
              label={`MINE · ${unlockedPasses.length}`}
              active={filter === 'unlocked'}
              onPress={() => setFilter('unlocked')}
            />
          </View>
        )}

        {/* List */}
        <ScrollViewWithFade
          fadeColor="#fef7e7"
          fadeHeight={12}
          wrapperStyle={styles.scrollWrapper}
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {groupedPasses.map(({ rarity, passes }) => (
            <View key={rarity}>
              <View style={styles.groupHeader}>
                <View
                  style={[
                    styles.groupLine,
                    { backgroundColor: RARITY_STYLE[rarity].stripe },
                  ]}
                />
                <Text
                  style={[
                    styles.groupLabel,
                    { color: RARITY_STYLE[rarity].text },
                  ]}
                >
                  {RARITY_STYLE[rarity].label.toUpperCase()}
                </Text>
                <View
                  style={[
                    styles.groupLine,
                    { backgroundColor: RARITY_STYLE[rarity].stripe },
                  ]}
                />
              </View>
              {passes.map(renderPassCard)}
            </View>
          ))}
          {visiblePasses.length === 0 && (
            <Text style={styles.emptyText}>
              No passes yet — win a game to earn your first one!
            </Text>
          )}
        </ScrollViewWithFade>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          {isSelectionMode && onConfirm ? (
            <>
              <PressableButton
                onPress={onClose}
                shadowColor="#6b5a2d"
                shadowOffset={{ width: 0, height: 3 }}
                shadowOpacity={0.4}
                shadowRadius={4}
                elevation={6}
                style={{ flex: 1 }}
              >
                <PixelBorder
                  borderColor="#d1d5db"
                  borderWidth={3}
                  backgroundColor="#f3f4f6"
                  innerPadding={0}
                >
                  <View style={styles.buttonInner}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </View>
                </PixelBorder>
              </PressableButton>
              <PressableButton
                onPress={handleConfirm}
                shadowColor="rgba(123,169,101,1)"
                shadowOffset={{ width: 0, height: 4 }}
                shadowOpacity={0.5}
                shadowRadius={5}
                elevation={8}
                style={{ flex: 1.4 }}
              >
                <PixelBorder
                  borderColor="rgba(123,169,101,1)"
                  borderWidth={3}
                  backgroundColor="rgba(154,193,118,1)"
                  innerPadding={0}
                >
                  <View style={styles.buttonInner}>
                    <Text style={styles.confirmText}>
                      {localSelectedIds.length > 0
                        ? "Let's go! 🎒"
                        : 'Skip passes'}
                    </Text>
                  </View>
                </PixelBorder>
              </PressableButton>
            </>
          ) : (
            <PressableButton
              onPress={onClose}
              shadowColor="rgba(123,169,101,1)"
              shadowOffset={{ width: 0, height: 4 }}
              shadowOpacity={0.5}
              shadowRadius={5}
              elevation={8}
              style={{ width: '100%' }}
            >
              <PixelBorder
                borderColor="rgba(123,169,101,1)"
                borderWidth={3}
                backgroundColor="rgba(154,193,118,1)"
                innerPadding={0}
              >
                <View style={styles.buttonInner}>
                  <Text style={styles.confirmText}>Done</Text>
                </View>
              </PixelBorder>
            </PressableButton>
          )}
        </View>

        {/* Collection progress */}
        <View style={styles.collectRow}>
          <View style={styles.collectBar}>
            <View style={[styles.collectFill, { width: `${collectedPct}%` }]} />
          </View>
          <Text style={styles.collectText}>
            {unlockedPasses.length}/{allPasses.length} collected
          </Text>
        </View>
      </PixelBorder>
    </FastModal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bits
// ─────────────────────────────────────────────────────────────────────────────
function Chip({ text }: { text: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.filterChip, active && styles.filterChipActive]}
    >
      <Text
        style={[styles.filterChipText, active && styles.filterChipTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  modalContainer: {
    borderRadius: 36,
    width: '95%',
    maxWidth: 500,
    maxHeight: '92%',
    shadowColor: colors.brown.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  titleIcon: { width: 40, height: 40, resizeMode: 'contain' },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: MONO,
    color: colors.brown.primary,
    textShadowColor: 'rgba(139, 111, 71, 0.2)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: MONO,
    color: colors.brown.secondary,
    fontStyle: 'italic',
  },

  // Slots
  slotsBlock: {
    backgroundColor: '#fff5d4',
    borderWidth: 3,
    borderColor: colors.brown.secondary,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  slotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotEmpty: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#b8a27a',
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotPlus: {
    fontFamily: MONO,
    fontSize: 20,
    color: '#b8a27a',
    fontWeight: 'bold',
  },
  slotFilled: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotIcon: { width: 30, height: 30, resizeMode: 'contain' },
  slotRemove: {
    position: 'absolute',
    top: -7,
    right: -7,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  slotRemoveText: {
    color: '#fff',
    fontSize: 11,
    lineHeight: 12,
    fontWeight: 'bold',
  },
  slotCounter: {
    marginLeft: 'auto',
    fontFamily: MONO,
    fontWeight: 'bold',
    fontSize: 18,
  },
  slotsHint: {
    marginTop: 8,
    fontFamily: MONO,
    fontSize: 10,
    color: colors.brown.secondary,
    fontStyle: 'italic',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  chip: {
    backgroundColor: '#fffaf0',
    borderWidth: 2,
    borderColor: colors.brown.secondary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    fontFamily: MONO,
    fontSize: 10,
    color: colors.brown.primary,
    fontWeight: 'bold',
  },

  // Filter
  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d4a574',
    backgroundColor: '#fffaf0',
  },
  filterChipActive: {
    backgroundColor: colors.brown.secondary,
    borderColor: colors.brown.secondary,
  },
  filterChipText: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.brown.secondary,
  },
  filterChipTextActive: { color: '#fff5d4' },

  // Scroll
  scrollWrapper: {
    position: 'relative',
    maxHeight: SCREEN_HEIGHT * 0.42,
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  scroll: {
    maxHeight: SCREEN_HEIGHT * 0.42,
    paddingHorizontal: 2,
    paddingTop: 6,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  groupLine: { flex: 1, height: 2, borderRadius: 1 },
  groupLabel: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  emptyText: {
    fontFamily: MONO,
    fontSize: 12,
    color: colors.brown.secondary,
    textAlign: 'center',
    paddingVertical: 24,
  },

  // Card
  cardWrap: { marginBottom: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: 8,
    paddingLeft: 0,
  },
  stripe: {
    width: 14,
    alignSelf: 'stretch',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    alignItems: 'center',
    paddingTop: 6,
    marginRight: 8,
  },
  punchHole: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fef7e7',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.25)',
  },
  iconFrame: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    backgroundColor: '#fffaf0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  iconFrameLocked: { backgroundColor: '#e5e5e5' },
  icon: { width: 28, height: 28, resizeMode: 'contain' },
  cardText: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  passName: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: MONO,
  },
  rarityPill: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 },
  rarityPillText: {
    fontFamily: MONO,
    fontSize: 7,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  summary: { fontFamily: MONO, fontSize: 10, lineHeight: 14 },
  howToEarn: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#7a5200',
    marginTop: 3,
    fontWeight: 'bold',
  },
  expanded: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.12)',
    gap: 3,
  },
  flavor: {
    fontFamily: MONO,
    fontSize: 10,
    fontStyle: 'italic',
    color: colors.gray.medium,
  },
  earnedLine: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#15803d',
    fontWeight: 'bold',
  },
  cardRight: { alignItems: 'center', marginLeft: 6, gap: 4 },
  clipButton: {
    minWidth: 40,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clipText: { fontFamily: MONO, fontSize: 11, fontWeight: 'bold' },
  chevron: { fontSize: 12, color: colors.gray.medium, fontFamily: MONO },
  clippedTag: {
    position: 'absolute',
    top: -6,
    right: 10,
    backgroundColor: colors.green.success,
    borderWidth: 2,
    borderColor: '#15803d',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    transform: [{ rotate: '3deg' }],
  },
  clippedTagText: {
    fontFamily: MONO,
    fontSize: 8,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  rejectFlash: { backgroundColor: 'rgba(220, 38, 38, 0.55)', borderRadius: 10 },

  // Buttons
  buttonRow: { flexDirection: 'row', gap: 10 },
  buttonInner: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontFamily: MONO,
    color: colors.gray.dark,
    fontWeight: '700',
  },
  confirmText: {
    fontSize: 15,
    fontFamily: MONO,
    color: colors.white,
    fontWeight: '800',
  },

  // Collection
  collectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  collectBar: {
    flex: 1,
    height: 10,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: colors.brown.secondary,
    backgroundColor: '#e8d4a8',
    overflow: 'hidden',
  },
  collectFill: { height: '100%', backgroundColor: '#d4af37' },
  collectText: {
    fontFamily: MONO,
    fontSize: 10,
    color: colors.brown.secondary,
    fontWeight: 'bold',
  },
});
