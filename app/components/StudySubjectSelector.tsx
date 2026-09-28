import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { UPGRADE_COSTS } from '../../src/constants/jokerUpgrades';
import { useGame } from '../../src/hooks/useGame';
import { useJokers } from '../../src/hooks/useJokers';
import { useAppSelector } from '../../src/store/hooks';
import { selectBalance } from '../../src/store/slices/walletSlice';
import { STANDARDIZED_JOKERS } from '../../src/utils/jokerEffectEngine';
import { SoundEffects } from '../../src/utils/soundEffects';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';
import UpgradeJokersModal from './UpgradeJokersModal';

// Neutral palette for tiles that are NOT the picked game.
const MUTED = {
  border: '#c9c2b4',
  bg: '#efeae0',
  accent: '#a39c8f',
};

// Each subject carries its own route so renaming the display name can never
// break navigation (the route is no longer keyed by name).
const subjects = [
  {
    name: 'Math',
    route: '/math-game',
    color: { bg: '#e6f7ff', border: '#1890ff' },
    icon: require('../../assets/images/emojis/math.png'),
  },
  {
    name: 'Captain',
    route: '/history-game',
    color: { bg: '#e6f2ff', border: '#4169e1' },
    icon: require('../../assets/images/emojis/gym.png'),
  },
  {
    name: 'Cooking',
    route: '/home-ec-game',
    color: { bg: '#f6ffed', border: '#52c41a' },
    icon: require('../../assets/images/emojis/cooking.png'),
  },
  {
    name: 'Trades',
    route: '/economy-game',
    color: { bg: '#fff1f0', border: '#f5222d' },
    icon: require('../../assets/images/emojis/economy.png'),
  },
  {
    name: 'Logic',
    route: '/logic-game',
    color: { bg: '#f9f0ff', border: '#722ed1' },
    icon: require('../../assets/images/emojis/logic.png'),
  },
  {
    name: 'R.P.S',
    route: '/recess-game',
    color: { bg: '#fff0f6', border: '#eb2f96' },
    icon: require('../../assets/images/emojis/recess.png'),
  },
  {
    name: 'Hax0r',
    route: '/computer-game',
    color: { bg: '#f0f5ff', border: '#2f54eb' },
    icon: require('../../assets/images/emojis/computer.png'),
  },
  {
    name: 'Hue',
    route: '/art-game',
    color: { bg: '#feffe6', border: '#a0d911' },
    icon: require('../../assets/images/emojis/art.png'),
  },
  {
    name: 'Pangea',
    route: '/geography-game',
    color: { bg: '#e6f3ff', border: '#3182ce' },
    icon: require('../../assets/images/emojis/geography.png'),
  },
];

// Hues the pixel border steps through to give a "moving rainbow" feel that
// suits the chunky pixel-art corners (continuous gradients don't).
const PIXEL_RAINBOW = [
  '#ff3b3b',
  '#ff7a00',
  '#ffd000',
  '#7ad000',
  '#00c2a8',
  '#00a3ff',
  '#5b6bff',
  '#a64bff',
  '#ff3bd0',
];
const FAB_SHIMMER_TRAVEL = 130; // how far the shimmer streak sweeps each pass

// PixelBorder whose border color cycles through the rainbow while `active`.
// Self-contained so the per-step re-render stays inside this subtree and never
// touches the parent selector / subject grid.
const RainbowPixelBorder = React.memo(function RainbowPixelBorder({
  active,
  backgroundColor,
  children,
}: {
  active: boolean;
  backgroundColor: string;
  children: React.ReactNode;
}) {
  const [color, setColor] = React.useState(PIXEL_RAINBOW[0]);
  React.useEffect(() => {
    if (!active) return;
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % PIXEL_RAINBOW.length;
      setColor(PIXEL_RAINBOW[i]);
    }, 220);
    return () => clearInterval(id);
  }, [active]);

  return (
    <PixelBorder
      borderColor={active ? color : '#555'}
      borderWidth={3}
      backgroundColor={backgroundColor}
      innerPadding={0}
    >
      {children}
    </PixelBorder>
  );
});

interface StudySubjectSelectorProps {
  onBack: () => void;
  disabled?: boolean;
  disabledMessage?: string;
  isLunchPeriod?: boolean;
  hasPlayedLunchMinigame?: boolean;
}

const StudySubjectSelector = React.memo(function StudySubjectSelector({
  onBack,
  disabled = false,
  disabledMessage = "You've already studied tonight! Rest up for tomorrow.",
  isLunchPeriod = false,
  hasPlayedLunchMinigame = false,
}: StudySubjectSelectorProps) {
  const { setMinigameContext, selectedMinigame, setSelectedMinigame } =
    useGame();
  const { jokersOwned } = useJokers();
  const [gridHeight, setGridHeight] = React.useState(300);
  const tileHeight = Math.max(0, Math.min(92, (gridHeight - 28) / 3 - 8));
  const balance = useAppSelector(selectBalance);
  // How many owned jokers are below max level (total) and how many of those the
  // player can currently afford. Drives the button badge / pulse state.
  const upgradeInfo = React.useMemo(() => {
    let total = 0;
    let affordable = 0;
    let minimumCost = Infinity;
    for (const owned of jokersOwned) {
      const std = STANDARDIZED_JOKERS.find(
        (sj) => sj.id.toString() === owned.id.toString()
      );
      if (!std) continue;
      const currentLevel = (owned as any).level ?? 1;
      const maxLevel = std.maxLevel ?? 1;
      if (currentLevel >= maxLevel) continue;
      const cost = UPGRADE_COSTS[currentLevel];
      if (!cost) continue;
      total += 1;
      minimumCost = Math.min(minimumCost, cost);
      if (balance >= cost) affordable += 1;
    }
    return { total, affordable, minimumCost };
  }, [jokersOwned, balance]);
  // The button is only interactive when there's a joker to upgrade AND the
  // wallet can pay for at least one of them.
  const canUpgrade = upgradeInfo.affordable > 0;
  const totalUnobtainedCount = React.useMemo(() => {
    const ownedIds = new Set(jokersOwned.map((j) => j.id.toString()));
    return STANDARDIZED_JOKERS.filter((j) => !ownedIds.has(j.id.toString()))
      .length;
  }, [jokersOwned]);
  const [highlightedIndex, setHighlightedIndex] = React.useState<number | null>(
    // If a minigame was already selected, highlight it immediately
    selectedMinigame
      ? subjects.findIndex((s) => s.name === selectedMinigame)
      : null
  );
  const [isSpinning, setIsSpinning] = React.useState(false);
  const [selectedSubject, setSelectedSubject] = React.useState<string | null>(
    selectedMinigame
  );
  const spinTimersRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const hasStartedSpin = React.useRef(false);
  const highlightScale = React.useRef(new Animated.Value(1)).current;

  // Roulette animation on mount
  React.useEffect(() => {
    if (hasStartedSpin.current) return;
    if (disabled || (isLunchPeriod && hasPlayedLunchMinigame)) return;
    // If minigame already locked in, don't spin
    if (selectedMinigame) return;

    hasStartedSpin.current = true;
    setIsSpinning(true);

    // Pick the winner upfront
    const winnerIndex = Math.floor(Math.random() * subjects.length);

    // Build a randomized sequence of indices that ends on the winner
    // ~20 total steps: fast at start, slowing down
    const totalSteps = 18 + Math.floor(Math.random() * 5); // 18-22 steps
    const sequence: number[] = [];

    // Generate random order visits, ensuring last one is the winner
    for (let i = 0; i < totalSteps - 1; i++) {
      let next: number;
      do {
        next = Math.floor(Math.random() * subjects.length);
      } while (sequence.length > 0 && next === sequence[sequence.length - 1]);
      sequence.push(next);
    }
    // Make sure the second-to-last isn't the winner (so there's a visible transition)
    if (sequence[sequence.length - 1] === winnerIndex) {
      sequence[sequence.length - 1] =
        (winnerIndex + 1 + Math.floor(Math.random() * (subjects.length - 1))) %
        subjects.length;
    }
    sequence.push(winnerIndex);

    // Schedule highlights with increasing delays. Timers go into the
    // spinTimersRef so handleSkipGame can cancel them on a successful skip.
    let elapsed = 0;
    const timers: ReturnType<typeof setTimeout>[] = spinTimersRef.current;

    sequence.forEach((idx, step) => {
      // Easing: starts at ~80ms, ramps up to ~400ms for last few steps
      const progress = step / (sequence.length - 1);
      const delay = 80 + Math.pow(progress, 2.5) * 350;
      elapsed += delay;

      const timer = setTimeout(() => {
        setHighlightedIndex(idx);
        SoundEffects.playRandomPop();

        // Pulse animation on each highlight
        highlightScale.setValue(1.08);
        Animated.spring(highlightScale, {
          toValue: 1,
          friction: 8,
          tension: 200,
          useNativeDriver: true,
        }).start();
      }, elapsed);
      timers.push(timer);
    });

    // After the spin completes, navigate
    const navTimer = setTimeout(() => {
      setIsSpinning(false);
      const winnerName = subjects[winnerIndex].name;
      setSelectedSubject(winnerName);
      setSelectedMinigame(winnerName);

      const route = subjects[winnerIndex].route;
      if (__DEV__) console.log(`🎲 Roulette landed on: ${winnerName}`);
      setMinigameContext(isLunchPeriod ? 'lunch' : 'after-school');

      // Brief pause to show the final selection before navigating
      const goTimer = setTimeout(() => {
        const doNav = () => {
          if (route) {
            router.push(route as any);
          } else {
            onBack();
          }
        };
        // If the upgrade modal is open, defer navigation until it closes so we
        // don't push the minigame screen out from under it.
        if (upgradeModalOpenRef.current) {
          pendingNavRef.current = doNav;
        } else {
          doNav();
        }
      }, 600);
      timers.push(goTimer);
    }, elapsed + 200);
    timers.push(navTimer);

    return () => {
      timers.forEach((t) => clearTimeout(t));
      spinTimersRef.current = [];
    };
  }, [disabled, isLunchPeriod, hasPlayedLunchMinigame]);

  // Hold the Back button for 1s after the roulette settles so it doesn't pop
  // in the instant a game is selected/locked in. Hidden entirely while spinning.
  const [backButtonVisible, setBackButtonVisible] = React.useState(false);
  React.useEffect(() => {
    if (isSpinning) {
      setBackButtonVisible(false);
      return;
    }
    const timer = setTimeout(() => setBackButtonVisible(true), 1000);
    return () => clearTimeout(timer);
  }, [isSpinning]);

  // Upgrade-jokers overlay. Opening it pauses any pending auto-navigation into
  // the chosen minigame (stored in pendingNavRef) until the player closes it.
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
  const upgradeModalOpenRef = React.useRef(false);
  const pendingNavRef = React.useRef<(() => void) | null>(null);

  const openUpgradeModal = React.useCallback(() => {
    upgradeModalOpenRef.current = true;
    setShowUpgradeModal(true);
  }, []);

  const closeUpgradeModal = React.useCallback(() => {
    upgradeModalOpenRef.current = false;
    setShowUpgradeModal(false);
    // Run any navigation that fired while the modal was open.
    const pending = pendingNavRef.current;
    if (pending) {
      pendingNavRef.current = null;
      pending();
    }
  }, []);

  // Gentle breathing pulse on the Upgrade button while affordable upgrades are
  // waiting, so it reads as a call-to-action rather than a static button.
  const upgradePulse = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    if (upgradeInfo.affordable > 0) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(upgradePulse, {
            toValue: 1.04,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.timing(upgradePulse, {
            toValue: 1,
            duration: 650,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    upgradePulse.setValue(1);
  }, [upgradeInfo.affordable, upgradePulse]);

  // Periodic diagonal shimmer sweep across the gold face. Runs on the native
  // driver (translateX only) so it never re-renders, only while upgradable.
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (upgradeInfo.total === 0) return;
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(1400),
      ])
    );
    shimmer.start();
    return () => {
      shimmer.stop();
    };
  }, [upgradeInfo.total, shimmerAnim]);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-FAB_SHIMMER_TRAVEL, FAB_SHIMMER_TRAVEL],
  });

  const handleSubjectSelect = (subject: string) => {
    // During lunch, check if a game has already been played
    if (disabled || (isLunchPeriod && hasPlayedLunchMinigame)) {
      return;
    }

    // Only allow the locked-in minigame (if one is set)
    if (selectedMinigame && subject !== selectedMinigame) {
      return;
    }

    if (__DEV__) console.log(`Starting ${subject} minigame...`);

    // Set the context for where this minigame was started
    setMinigameContext(isLunchPeriod ? 'lunch' : 'after-school');

    const route = subjects.find((s) => s.name === subject)?.route;
    if (route) {
      router.push(route as any);
    } else {
      onBack();
    }
  };

  // Calculate if buttons should be disabled
  const isLockedIn = !!selectedMinigame && !isSpinning;
  const buttonsDisabled =
    disabled || (isLunchPeriod && hasPlayedLunchMinigame) || isSpinning;
  const isComplete = isLunchPeriod && hasPlayedLunchMinigame;

  const renderSubject = (
    subject: (typeof subjects)[number],
    globalIndex: number
  ) => {
    const isHighlighted = highlightedIndex === globalIndex;
    const isWinner = selectedSubject === subject.name;
    const isLocked = isLockedIn && subject.name !== selectedMinigame;
    const isActive = isHighlighted || isWinner;
    // Only the picked (or currently spinning-highlighted) game keeps its
    // color. Every other tile drops to neutral greys and fades as a whole —
    // border, background, footer and shadow included — so the pick reads at
    // a glance.
    const isMuted =
      !isActive &&
      (disabled ||
        (isLunchPeriod && hasPlayedLunchMinigame) ||
        isLocked ||
        highlightedIndex !== null);
    const accent = isMuted ? MUTED.accent : subject.color.border;

    return (
      <Animated.View
        key={subject.name}
        style={[
          styles.subjectButtonWrapper,
          isHighlighted && { transform: [{ scale: highlightScale }] },
          isMuted && styles.mutedWrapper,
        ]}
      >
        <PressableButton
          onPress={() => handleSubjectSelect(subject.name)}
          disabled={buttonsDisabled || isLocked}
          shadowColor={isActive ? '#FFD700' : accent}
          shadowOffset={{ width: 0, height: isActive ? 6 : isMuted ? 2 : 4 }}
          shadowOpacity={0.9}
          shadowRadius={isActive ? 12 : isMuted ? 2 : 6}
          elevation={isActive ? 16 : isMuted ? 2 : 8}
          style={{ flex: 1 }}
        >
          <View style={styles.subjectContainer}>
            <View style={styles.subjectBorderWrapper}>
              <PixelBorder
                borderColor={
                  isActive
                    ? '#FFD700'
                    : isMuted
                      ? MUTED.border
                      : subject.color.border
                }
                borderWidth={3}
                backgroundColor={
                  isActive ? '#FFF8DC' : isMuted ? MUTED.bg : subject.color.bg
                }
                innerPadding={0}
              >
                <View
                  style={[styles.subjectButtonInner, { height: tileHeight }]}
                >
                  <View style={styles.tileTopline}>
                    <Text style={[styles.tileNumber, { color: accent }]}>
                      {String(globalIndex + 1).padStart(2, '0')}
                    </Text>
                    <View
                      style={[styles.tileLight, { backgroundColor: accent }]}
                    />
                  </View>
                  <Image
                    source={subject.icon}
                    style={[styles.subjectIcon, isMuted && styles.dimmedIcon]}
                  />
                  <Text
                    style={[
                      styles.subjectText,
                      isActive && styles.highlightedText,
                      isMuted && styles.dimmedText,
                    ]}
                  >
                    {subject.name}
                  </Text>
                  <View
                    style={[styles.tileFooter, { backgroundColor: accent }]}
                  >
                    <Text style={styles.tileFooterText}>
                      {isComplete
                        ? 'CLOSED'
                        : disabled || isLocked
                          ? 'LOCKED'
                          : isActive
                            ? 'PICKED!'
                            : 'PLAY'}
                    </Text>
                  </View>
                </View>
              </PixelBorder>
            </View>
          </View>
        </PressableButton>
      </Animated.View>
    );
  };

  return (
    <View style={styles.studyContainer}>
      <View style={styles.studyHeader}>
        <View style={styles.headerTopline}>
          <Text style={styles.arcadeEyebrow}>
            {isLunchPeriod ? 'LUNCH BREAK' : 'AFTER SCHOOL'}
          </Text>
          <Text style={styles.sessionBadge}>
            {isComplete ? 'COMPLETE' : disabled ? 'REST TIME' : 'LETS GO!'}
          </Text>
        </View>
        <Text style={styles.alreadyStudiedText}>
          {isComplete ? 'GG. WELL DONE!' : 'WHAT TO PLAY?'}
        </Text>
      </View>

      <View
        style={styles.subjectsContainer}
        onLayout={({ nativeEvent }) => setGridHeight(nativeEvent.layout.height)}
      >
        {/* First Row - 3 subjects */}
        <View style={styles.subjectsRow}>
          {subjects.slice(0, 3).map((subject, i) => renderSubject(subject, i))}
        </View>

        {/* Second Row - 3 subjects */}
        <View style={styles.subjectsRow}>
          {subjects
            .slice(3, 6)
            .map((subject, i) => renderSubject(subject, i + 3))}
        </View>

        {/* Third Row - 3 subjects */}
        <View style={styles.subjectsRow}>
          {subjects
            .slice(6, 9)
            .map((subject, i) => renderSubject(subject, i + 6))}
        </View>
      </View>

      {/* Reserve a separate row so upgrades never overlap the subject grid. */}
      <Animated.View
        style={[
          styles.upgradeRow,
          {
            transform: [{ scale: upgradePulse }],
          },
        ]}
      >
        <PressableButton
          onPress={openUpgradeModal}
          disabled={!canUpgrade}
          shadowColor={canUpgrade ? 'rgba(21,128,61,1)' : 'rgba(60,60,60,1)'}
          shadowOffset={{ width: 0, height: 5 }}
          shadowOpacity={0.8}
          shadowRadius={10}
          elevation={12}
        >
          <RainbowPixelBorder
            active={canUpgrade}
            backgroundColor={canUpgrade ? '#FFD700' : '#eeeadd'}
          >
            <View style={[styles.upgradeButtonInner, styles.fabClip]}>
              <Image
                source={require('../../assets/images/emojis/joker.png')}
                style={styles.upgradeButtonJokerIcon}
                resizeMode="contain"
              />
              <View style={styles.upgradeCopy}>
                <Text style={styles.upgradeButtonText}>WILDCARD POWER-UP</Text>
                <Text style={styles.upgradeCaption}>
                  {upgradeInfo.total === 0
                    ? 'No wildcards ready to level up'
                    : canUpgrade
                      ? 'Ready to level up!'
                      : `Save $${upgradeInfo.minimumCost.toLocaleString('en-US')} to upgrade`}
                </Text>
              </View>
              {canUpgrade && (
                <View
                  style={[
                    styles.upgradeCountBadge,
                    canUpgrade
                      ? styles.upgradeCountBadgeReady
                      : styles.upgradeCountBadgeIdle,
                  ]}
                >
                  <Text style={styles.upgradeCountBadgeText}>
                    {upgradeInfo.affordable}
                  </Text>
                </View>
              )}

              {/* Diagonal shimmer streak sweeping across the gold face */}
              {canUpgrade && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.fabShimmer,
                    {
                      transform: [
                        { translateX: shimmerTranslate },
                        { rotate: '18deg' },
                      ],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[
                      'rgba(255,255,255,0)',
                      'rgba(255,255,255,0.65)',
                      'rgba(255,255,255,0)',
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
              )}
            </View>
          </RainbowPixelBorder>
        </PressableButton>
      </Animated.View>

      {!isLunchPeriod && (
        <View
          style={!backButtonVisible && styles.hiddenBackButton}
          pointerEvents={backButtonVisible ? 'auto' : 'none'}
          accessibilityElementsHidden={!backButtonVisible}
          importantForAccessibility={
            backButtonVisible ? 'auto' : 'no-hide-descendants'
          }
        >
          <PressableButton
            onPress={onBack}
            disabled={!backButtonVisible}
            shadowColor="rgba(185,28,28,1)"
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.5}
            shadowRadius={5}
            elevation={8}
            style={{ marginBottom: 20, width: '90%', alignSelf: 'center' }}
          >
            <PixelBorder
              borderColor="rgba(185,28,28,1)"
              borderWidth={3}
              backgroundColor="rgba(239,68,68,1)"
              innerPadding={0}
            >
              <View style={styles.backButtonInner}>
                <Text style={styles.backButtonText}>Back</Text>
              </View>
            </PixelBorder>
          </PressableButton>
        </View>
      )}

      <UpgradeJokersModal
        visible={showUpgradeModal}
        onClose={closeUpgradeModal}
      />
    </View>
  );
});

export default StudySubjectSelector;

const styles = StyleSheet.create({
  studyContainer: {
    flex: 1,
    width: '100%',
  },
  studyHeader: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
    padding: 8,
    borderWidth: 2,
    borderColor: '#d6ab52',
    borderRadius: 12,
    backgroundColor: '#fff6d9',
  },
  headerTopline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  arcadeEyebrow: {
    fontFamily: 'PixeloidMono',
    fontSize: 9,
    color: '#94602b',
    flexShrink: 1,
  },
  sessionBadge: {
    fontFamily: 'PixeloidMono',
    fontSize: 8,
    color: '#fff9e8',
    backgroundColor: '#80512d',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 4,
  },
  alreadyStudiedText: {
    color: '#70421f',
    fontSize: 17,
    fontFamily: 'PixeloidMono',
    marginTop: 4,
  },
  headerCaption: {
    color: '#88683e',
    fontSize: 10,
    lineHeight: 15,
    fontFamily: 'PixeloidMono',
    marginTop: 5,
  },
  tileTopline: {
    position: 'absolute',
    top: 4,
    left: 0,
    right: 0,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 7,
  },
  tileNumber: { fontFamily: 'PixeloidMono', fontSize: 8 },
  tileLight: { width: 5, height: 5, borderRadius: 1 },
  tileFooter: {
    alignSelf: 'stretch',
    paddingVertical: 1,
    marginTop: 1,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  tileFooterText: {
    fontFamily: 'PixeloidMono',
    fontSize: 8,
    color: '#fff',
    textAlign: 'center',
    textShadowColor: '#594325',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  upgradeCopy: { flex: 1, gap: 5 },
  upgradeCaption: {
    fontFamily: 'PixeloidMono',
    fontSize: 9,
    lineHeight: 13,
    color: '#775b38',
  },
  subjectsContainer: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  subjectsRow: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  subjectDayTimeButtonWrapper: {
    flex: 1,
    aspectRatio: 1,
  },
  subjectButtonWrapper: {
    flex: 1,
    minWidth: 0,
  },
  subjectContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectIcon: {
    width: '88%',
    flex: 1,
    minHeight: 0,
    maxHeight: 72,
    resizeMode: 'contain',
    marginVertical: 0,
  },
  disabledIcon: {
    opacity: 0.5,
  },
  dimmedIcon: {
    opacity: 0.72,
  },
  dimmedButton: {
    opacity: 0.72,
  },
  // Whole-tile fade for unpicked games (border, bg, footer, shadow included).
  mutedWrapper: {
    opacity: 0.95,
  },
  dimmedText: {
    color: '#8a8378',
  },
  highlightedText: {
    color: '#B8860B',
    fontSize: 11,
  },
  subjectBorderWrapper: {
    width: '100%',
  },
  subjectButtonInner: {
    paddingTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  disabledSubjectButton: {
    opacity: 0.5,
  },
  subjectText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: 'bold',
    color: '#000000',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    width: '100%',
  },
  jokerCount: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginTop: 8,
  },
  disabledText: {
    color: '#666',
  },
  backButtonInner: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  hiddenBackButton: {
    opacity: 0,
  },
  upgradeRow: {
    alignSelf: 'stretch',
    flexShrink: 0,
    marginHorizontal: 18,
    marginTop: 4,
    marginBottom: 6,
  },
  fabClip: {
    borderRadius: 12,
    overflow: 'hidden', // clip the shimmer streak to the pill face
  },
  fabShimmer: {
    position: 'absolute',
    top: -24,
    bottom: -24,
    width: 28,
  },
  upgradeButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 12,
    backgroundColor: 'transparent',
  },
  upgradeButtonIcon: {
    fontSize: 18,
  },
  upgradeButtonText: {
    color: '#3a2a1a',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    textAlign: 'left',
    textShadowColor: 'rgba(255,255,255,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  upgradeButtonJokerIcon: {
    width: 32,
    height: 32,
  },
  upgradeButtonTextDim: {
    color: '#2e2e28',
    textShadowColor: 'rgba(255,255,255,0.2)',
  },
  upgradeCountBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.35)',
  },
  upgradeCountBadgeReady: {
    backgroundColor: '#15803d',
  },
  upgradeCountBadgeIdle: {
    backgroundColor: '#9ca3af',
  },
  upgradeCountBadgeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    textShadowColor: 'rgba(125,125,125,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
