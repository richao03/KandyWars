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
  const [filter, setFilter] = useState<'all' | 'unlocked'>('all');

  const isSelectionMode = viewMode === 'selection' && !!onSelectPass;

  // Sync local state with Redux when modal opens
  React.useEffect(() => {
    if (visible) {
      setLocalSelectedIds(selectedPassIds || []);
    }
  }, [visible, selectedPassIds]);

  const selectedPasses = useMemo(
    () => allPasses.filter((p) => localSelectedIds.includes(p.id)),
    [allPasses, localSelectedIds]
  );

  // Effective cap on simultaneously-active passes, given the current
  // selection (an extension pass like Overachiever raises it from 3 → 5).
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

        <Text style={styles.slotsHint}>
          Choose up to {maxActivePasses} abilities
        </Text>
      </View>
    );
  };

  const renderPassCard = (pass: HallPass) => {
    const rs = RARITY_STYLE[pass.rarity];
    const isUnlocked = pass.isUnlocked;
    const isSelected = isSelectionMode
      ? localSelectedIds.includes(pass.id)
      : selectedPassIds.includes(pass.id);
    const summary = pass.effects.map((e) => e.description).join(' · ');

    return (
      <View key={pass.id} style={styles.cardWrap}>
        <PixelBorder
          borderColor={
            isSelected ? '#15803d' : isUnlocked ? rs.border : '#c9c9c9'
          }
          borderWidth={isSelected ? 4 : 3}
          backgroundColor={isUnlocked ? rs.bg : '#f1f1f1'}
          innerPadding={0}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => toggleSelect(pass.id)}
            disabled={!isSelectionMode || !isUnlocked}
            accessibilityRole={
              isSelectionMode && isUnlocked ? 'button' : undefined
            }
            accessibilityState={{ selected: isSelected, disabled: !isUnlocked }}
            accessibilityLabel={`${pass.name}. ${summary}${!isUnlocked ? `. Unlock: ${pass.unlockRequirement}` : ''}`}
            style={styles.card}
          >
            <View
              style={[
                styles.passBanner,
                { backgroundColor: isUnlocked ? rs.border : '#737373' },
              ]}
            >
              <Text style={styles.passName}>{pass.name}</Text>
            </View>
            <View style={styles.abilityBody}>
              <View
                style={[
                  styles.artStage,
                  { backgroundColor: isUnlocked ? rs.bg : '#e5e5e5' },
                ]}
              >
                <View
                  style={[
                    styles.artStripe,
                    { backgroundColor: isUnlocked ? rs.stripe : '#d4d4d4' },
                  ]}
                />
                <View style={styles.iconSticker}>
                  <Image
                    source={iconFor(pass.id)}
                    style={[styles.icon, !isUnlocked && { opacity: 0.45 }]}
                  />
                </View>
                {!isUnlocked && (
                  <Image source={LOCK_ICON} style={styles.lockIcon} />
                )}
              </View>
              <View style={styles.cardText}>
                <Text style={styles.summary}>{summary}</Text>
                {!isUnlocked && (
                  <Text style={styles.howToEarn}>
                    Unlock: {pass.unlockRequirement}
                  </Text>
                )}
              </View>
            </View>
            {isUnlocked && (isSelectionMode || isSelected) && (
              <View style={styles.passFooter}>
                <View
                  style={[
                    styles.selectionPill,
                    { backgroundColor: isSelected ? '#15803d' : rs.bg },
                  ]}
                >
                  <Text
                    style={[
                      styles.selectionText,
                      { color: isSelected ? '#fff' : rs.text },
                    ]}
                  >
                    {isSelected
                      ? isSelectionMode
                        ? 'Selected'
                        : 'Active'
                      : 'Use this pass'}
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        </PixelBorder>

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
            <Text style={styles.title}>Hall Passes</Text>
            <Text style={styles.subtitle}>Small pass. Big perks.</Text>
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
  cardWrap: {
    marginBottom: 14,
    shadowColor: '#694522',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 0,
    elevation: 2,
  },
  card: { paddingVertical: 6 },
  passBanner: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginHorizontal: 5,
  },
  passName: {
    fontSize: 13,
    lineHeight: 18,
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: MONO,
  },
  abilityBody: { flexDirection: 'row', alignItems: 'stretch', minHeight: 108 },
  artStage: {
    width: 86,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginLeft: 5,
  },
  artStripe: {
    position: 'absolute',
    width: 160,
    height: 34,
    transform: [{ rotate: '-40deg' }],
    opacity: 0.5,
  },
  iconSticker: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: '#fffaf0',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
  },
  icon: { width: 56, height: 56, resizeMode: 'contain' },
  lockIcon: {
    position: 'absolute',
    right: 5,
    bottom: 8,
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  cardText: {
    flex: 1,
    minWidth: 0,
    padding: 12,
    justifyContent: 'center',
    backgroundColor: '#fffaf0',
    marginRight: 5,
  },
  summary: {
    fontFamily: MONO,
    fontSize: 16,
    lineHeight: 22,
    color: '#4b301d',
    fontWeight: 'bold',
  },
  passFooter: {
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 2,
  },
  selectionPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 5 },
  selectionText: { fontFamily: MONO, fontSize: 11, fontWeight: 'bold' },
  howToEarn: {
    fontFamily: MONO,
    fontSize: 11,
    lineHeight: 16,
    color: '#7a5200',
    marginTop: 3,
    fontWeight: 'bold',
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
