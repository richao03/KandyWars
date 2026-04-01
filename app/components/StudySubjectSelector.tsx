import colors from '@/src/constants/colors';
import { router } from 'expo-router';
import React from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { useGame } from '../../src/hooks/useGame';
import { useJokers } from '../../src/hooks/useJokers';
import { STANDARDIZED_JOKERS } from '../../src/utils/jokerEffectEngine';
import { SoundEffects } from '../../src/utils/soundEffects';
import AvailableJokersModal from './AvailableJokersModal';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';

// Map subject names to joker subjects
const subjectToJokerSubject: Record<string, string> = {
  Math: 'Math',
  Gym: 'Gym',
  Cooking: 'Home Economics',
  Economy: 'Economy',
  Logic: 'Logic',
  Recess: 'Recess',
  'Comp Sci': 'Computer',
  Art: 'Art',
  Geography: 'Geography',
};

const subjects = [
  {
    name: 'Math',
    color: { bg: '#e6f7ff', border: '#1890ff' },
    icon: require('../../assets/images/emojis/math.png'),
  },
  {
    name: 'Gym',
    color: { bg: '#e6f2ff', border: '#4169e1' },
    icon: require('../../assets/images/emojis/gym.png'),
  },
  {
    name: 'Cooking',
    color: { bg: '#f6ffed', border: '#52c41a' },
    icon: require('../../assets/images/emojis/cooking.png'),
  },
  {
    name: 'Economy',
    color: { bg: '#fff1f0', border: '#f5222d' },
    icon: require('../../assets/images/emojis/economy.png'),
  },
  {
    name: 'Logic',
    color: { bg: '#f9f0ff', border: '#722ed1' },
    icon: require('../../assets/images/emojis/logic.png'),
  },
  {
    name: 'Recess',
    color: { bg: '#fff0f6', border: '#eb2f96' },
    icon: require('../../assets/images/emojis/recess.png'),
  },
  {
    name: 'Comp Sci',
    color: { bg: '#f0f5ff', border: '#2f54eb' },
    icon: require('../../assets/images/emojis/computer.png'),
  },
  {
    name: 'Art',
    color: { bg: '#feffe6', border: '#a0d911' },
    icon: require('../../assets/images/emojis/art.png'),
  },
  {
    name: 'Geography',
    color: { bg: '#e6f3ff', border: '#3182ce' },
    icon: require('../../assets/images/emojis/geography.png'),
  },
];

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
  const { period, markLunchMinigamePlayed, setMinigameContext, selectedMinigame, setSelectedMinigame } = useGame();
  const { jokersOwned } = useJokers();
  const [highlightedIndex, setHighlightedIndex] = React.useState<number | null>(
    // If a minigame was already selected, highlight it immediately
    selectedMinigame ? subjects.findIndex(s => s.name === selectedMinigame) : null
  );
  const [isSpinning, setIsSpinning] = React.useState(false);
  const [selectedSubject, setSelectedSubject] = React.useState<string | null>(selectedMinigame);
  const [showAvailableJokers, setShowAvailableJokers] = React.useState(false);
  const hasStartedSpin = React.useRef(false);
  const highlightScale = React.useRef(new Animated.Value(1)).current;

  // Route map for all subjects
  const subjectRoutes: Record<string, string> = {
    Math: '/math-game',
    Gym: '/history-game',
    Cooking: '/home-ec-game',
    Economy: '/economy-game',
    Logic: '/logic-game',
    Recess: '/recess-game',
    'Comp Sci': '/computer-game',
    Art: '/art-game',
    Geography: '/geography-game',
  };

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
      sequence[sequence.length - 1] = (winnerIndex + 1 + Math.floor(Math.random() * (subjects.length - 1))) % subjects.length;
    }
    sequence.push(winnerIndex);

    // Schedule highlights with increasing delays
    let elapsed = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

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

      const route = subjectRoutes[winnerName];
      console.log(`🎲 Roulette landed on: ${winnerName}`);
      setMinigameContext(isLunchPeriod ? 'lunch' : 'after-school');

      // Brief pause to show the final selection before navigating
      const goTimer = setTimeout(() => {
        if (route) {
          router.push(route as any);
        } else {
          onBack();
        }
      }, 600);
      timers.push(goTimer);
    }, elapsed + 200);
    timers.push(navTimer);

    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [disabled, isLunchPeriod, hasPlayedLunchMinigame]);

  // Calculate unobtained jokers for each subject
  const getUnobtainedJokerCount = React.useCallback(
    (subjectName: string) => {
      const jokerSubject = subjectToJokerSubject[subjectName];
      if (!jokerSubject) return 0;

      // Get all jokers for this subject
      const subjectJokers = STANDARDIZED_JOKERS.filter(
        (j) => j.subject === jokerSubject
      );

      // Get IDs of owned jokers
      const ownedIds = new Set(jokersOwned.map((j) => j.id.toString()));

      // Count unobtained jokers
      const unobtained = subjectJokers.filter(
        (j) => !ownedIds.has(j.id.toString())
      );

      return unobtained.length;
    },
    [jokersOwned]
  );

  const handleSubjectSelect = (subject: string) => {
    // During lunch, check if a game has already been played
    if (disabled || (isLunchPeriod && hasPlayedLunchMinigame)) {
      return;
    }

    // Only allow the locked-in minigame (if one is set)
    if (selectedMinigame && subject !== selectedMinigame) {
      return;
    }

    console.log(`Starting ${subject} minigame...`);

    // Set the context for where this minigame was started
    setMinigameContext(isLunchPeriod ? 'lunch' : 'after-school');

    const route = subjectRoutes[subject];
    if (route) {
      router.push(route as any);
    } else {
      onBack();
    }
  };

  // Calculate if buttons should be disabled
  const isLockedIn = !!selectedMinigame && !isSpinning;
  const buttonsDisabled = disabled || (isLunchPeriod && hasPlayedLunchMinigame) || isSpinning;
  const displayMessage =
    isLunchPeriod && hasPlayedLunchMinigame
      ? 'Game Complete!'
      : disabledMessage;

  const renderSubject = (subject: typeof subjects[number], globalIndex: number) => {
    const isHighlighted = highlightedIndex === globalIndex;
    const isWinner = selectedSubject === subject.name;
    const isLocked = isLockedIn && subject.name !== selectedMinigame;
    const shouldDim = disabled || (isLunchPeriod && hasPlayedLunchMinigame) || isLocked || (!isHighlighted && !isWinner && highlightedIndex !== null);

    return (
      <Animated.View
        key={subject.name}
        style={[
          isLunchPeriod
            ? styles.subjectDayTimeButtonWrapper
            : styles.subjectButtonWrapper,
          isHighlighted && { transform: [{ scale: highlightScale }] },
        ]}
      >
        <PressableButton
          onPress={() => handleSubjectSelect(subject.name)}
          disabled={buttonsDisabled || isLocked}
          shadowColor={isHighlighted || isWinner ? '#FFD700' : subject.color.border}
          shadowOffset={{ width: 0, height: (isHighlighted || isWinner) ? 6 : 4 }}
          shadowOpacity={(isHighlighted || isWinner) ? 0.9 : 0.5}
          shadowRadius={(isHighlighted || isWinner) ? 12 : 6}
          elevation={(isHighlighted || isWinner) ? 16 : 8}
          style={{ flex: 1 }}
        >
          <View style={styles.subjectContainer}>
            <Image
              source={subject.icon}
              style={[
                styles.subjectIcon,
                shouldDim && styles.dimmedIcon,
              ]}
            />
            <View style={styles.subjectBorderWrapper}>
              <PixelBorder
                borderColor={isHighlighted || isWinner ? '#FFD700' : subject.color.border}
                borderWidth={isHighlighted || isWinner ? 4 : 3}
                backgroundColor={isHighlighted || isWinner ? '#FFF8DC' : subject.color.bg}
                innerPadding={0}
              >
                <View
                  style={[
                    styles.subjectButtonInner,
                    shouldDim && styles.dimmedButton,
                  ]}
                >
                  <Text
                    style={[
                      styles.subjectText,
                      (isHighlighted || isWinner) && styles.highlightedText,
                    ]}
                  >
                    {subject.name}
                  </Text>
                  <Text
                    style={[
                      styles.jokerCount,
                      shouldDim && styles.dimmedText,
                    ]}
                  >
                    {getUnobtainedJokerCount(subject.name)} jokers left
                  </Text>
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
      {buttonsDisabled && isLunchPeriod && !isSpinning && !selectedSubject && (
        <View style={styles.studyHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.alreadyStudiedText}>{displayMessage}</Text>
          </View>
        </View>
      )}

      <View style={styles.subjectsContainer}>
          {/* First Row - 3 subjects */}
          <View style={styles.subjectsRow}>
          {subjects.slice(0, 3).map((subject, i) => renderSubject(subject, i))}
        </View>

        {/* Second Row - 3 subjects */}
        <View style={styles.subjectsRow}>
          {subjects.slice(3, 6).map((subject, i) => renderSubject(subject, i + 3))}
        </View>

        {/* Third Row - 3 subjects */}
        <View style={styles.subjectsRow}>
          {subjects.slice(6, 9).map((subject, i) => renderSubject(subject, i + 6))}
        </View>
      </View>

      {!isLunchPeriod && (
        isSpinning ? (
          <PressableButton
            onPress={() => {
              SoundEffects.playRandomPop();
              setShowAvailableJokers(true);
            }}
            shadowColor="#9C27B0"
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.5}
            shadowRadius={5}
            elevation={8}
            style={{ marginBottom: 20, width: '90%', alignSelf: 'center' }}
          >
            <PixelBorder
              borderColor="#9C27B0"
              borderWidth={3}
              backgroundColor="#6A1B9A"
              innerPadding={0}
            >
              <View style={styles.backButtonInner}>
                <Text style={styles.backButtonText}>Available Jokers</Text>
              </View>
            </PixelBorder>
          </PressableButton>
        ) : (
          <PressableButton
            onPress={onBack}
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
        )
      )}

      <AvailableJokersModal
        visible={showAvailableJokers}
        onClose={() => setShowAvailableJokers(false)}
        jokers={STANDARDIZED_JOKERS}
        subject="All"
        themeColors={{
          borderColor: '#f5f5dc',
          backgroundColor: '#0d2818',
          headerColor: '#2d4a3e',
          textColor: '#f5f5dc',
        }}
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
    alignItems: 'center',
    marginBottom: 4,
    borderRadius: 3,
    borderWidth: 3,
    borderColor: colors.gold.light,
    padding: 4,
    marginTop: 4,
    backgroundColor: 'white',
  },
  alreadyStudiedText: {
    color: colors.brown.primary,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    textShadowColor: 'rgba(125,125,125,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subjectsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 15,
    paddingHorizontal: 20,
  },
  subjectsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  subjectDayTimeButtonWrapper: {
    flex: 1,
    aspectRatio: 1,
  },
  subjectButtonWrapper: {
    flex: 1,
    aspectRatio: 1,
  },
  subjectContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectIcon: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
  disabledIcon: {
    opacity: 0.5,
  },
  dimmedIcon: {
    opacity: 0.4,
  },
  dimmedButton: {
    opacity: 0.4,
  },
  dimmedText: {
    color: '#999',
  },
  highlightedText: {
    color: '#B8860B',
    fontSize: 13,
  },
  subjectBorderWrapper: {
    width: '90%',
    marginTop: 25, // Position below the icon
  },
  subjectButtonInner: {
    height: 88,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingTop: 36, // Space for the icon overlap
    paddingBottom: 18,
    paddingHorizontal: 12,
  },
  disabledSubjectButton: {
    opacity: 0.5,
  },
  subjectText: {
    fontSize: 12,
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
