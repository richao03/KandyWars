import { useIsFocused } from '@react-navigation/native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Image, ImageBackground, StyleSheet, Text, View } from 'react-native';
import colors from '../../src/constants/colors';
import { MusicController } from '../../src/utils/musicController';
import { useFlavorText } from '../../src/context/FlavorTextContext';
import { useCandySales } from '../../src/hooks/useCandySales';
import { useDailyStats } from '../../src/hooks/useDailyStats';
import { useGame } from '../../src/hooks/useGame';
import { useHallPass } from '../../src/hooks/useHallPass';
import { useInventory } from '../../src/hooks/useInventory';
import { useJokers } from '../../src/hooks/useJokers';
import { useMinigameTracking } from '../../src/hooks/useMinigameTracking';
import { useScoreboard } from '../../src/hooks/useScoreboard';
import { useSeed } from '../../src/hooks/useSeed';
import { useWallet } from '../../src/hooks/useWallet';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { resetEarlySaleFlag } from '../../src/store/slices/candySalesSlice';
import { getPeriodsPerDay } from '../../src/store/slices/gameSlice';
import GameHUD from '../components/GameHUD';
import GoingToSchoolModal from '../components/GoingToSchoolModal';
import PixelBorder from '../components/PixelBorder';
import PressableButton from '../components/PressableButton';
import SleepConfirmModal from '../components/SleepConfirmModal';
import StudySubjectSelector from '../components/StudySubjectSelector';
import DeliPage from '../deli';
import PiggyBankPage from '../piggy-bank';

// Lazy load InventoryModal - it's rarely used
const InventoryModal = lazy(() => import('../components/InventoryModal'));

// Image mapping for after-school activities
const ACTIVITY_IMAGES = {
  study: require('../../assets/images/emojis/study.png'),
  stash: require('../../assets/images/emojis/piggyBank.png'),
  deli: require('../../assets/images/emojis/deli.png'),
  sleep: require('../../assets/images/emojis/sleep.png'),
};

function AfterSchoolPage() {
  const isFocused = useIsFocused();
  const dispatch = useAppDispatch();

  // Get periods per day based on hall pass selection (6 for Time Crunch, 8 otherwise)
  const periodsPerDay = useAppSelector((state) => getPeriodsPerDay(state));

  const {
    day,
    startNewDay,
    hasStudiedTonight,
    periodCount,
    setLastActiveView,
    markStudiedTonight,
    startAfterSchool,
    setIsInitialized,
    resetGame,
  } = useGame();
  const { resetDailyStats, addAllowance: addAllowanceToStats } =
    useDailyStats();
  const {
    balance,
    stashedAmount,
    adoptionFee,
    addAllowance,
    difficultyLevel,
    applyDailyInterest,
    applyInheritance,
  } = useWallet();
  const { jokers, resetDailyJokerUsage } = useJokers();
  const { inventory, getTotalInventoryCount, getInventoryLimit } =
    useInventory();
  const { setEvent } = useFlavorText();
  const { trackGameCompleted } = useScoreboard();
  const { checkUnlockRequirements } = useHallPass();
  const { hasPlayedAllMinigames } = useMinigameTracking();
  const { totalCandiesSold } = useCandySales();
  const { gameData } = useSeed();

  const [sleepConfirmModalVisible, setSleepConfirmModalVisible] =
    useState(false);
  const [goingToSchoolModalVisible, setGoingToSchoolModalVisible] =
    useState(false);
  const [allowanceAmount, setAllowanceAmount] = useState(0);
  const [guaranteedEventWarnings, setGuaranteedEventWarnings] = useState<
    string[]
  >([]);
  const [showStudySubjects, setShowStudySubjects] = useState(false);
  const [showStash, setShowStash] = useState(false);
  const [showDeli, setShowDeli] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [hasTriggeredGameEnd, setHasTriggeredGameEnd] = useState(false);

  // Set after-school flavor text when component loads and track active view
  useEffect(() => {
    console.log('🏠 [AFTER-SCHOOL] Setting AFTER_SCHOOL flavor text');
    setEvent('AFTER_SCHOOL');
    // Track that user is now in after-school view
    setLastActiveView('after-school');
  }, [setEvent, setLastActiveView]);

  const handleStudy = useCallback(() => {
    if (hasStudiedTonight) {
      return; // Don't show subjects if already studied
    }
    setShowStudySubjects(true);
  }, [hasStudiedTonight]);

  const handleBackToOptions = useCallback(() => {
    setShowStudySubjects(false);
  }, []);

  // Reset study subjects view when returning from minigame
  useFocusEffect(
    useCallback(() => {
      if (hasStudiedTonight && showStudySubjects) {
        setShowStudySubjects(false);
      }
    }, [hasStudiedTonight, showStudySubjects])
  );

  // Set music when screen is focused or study subjects toggle
  // This handles both initial mount and returning from minigames
  useFocusEffect(
    useCallback(() => {
      const targetTrack = showStudySubjects ? 'day2' : 'day5';
      console.log(
        `🎵 [AFTER-SCHOOL] Setting music: ${targetTrack}`
      );
      MusicController.setTrack(targetTrack);
    }, [showStudySubjects])
  );

  const handleStashMoney = useCallback(() => {
    console.log('🏦 Stash button clicked, setting showStash to true');
    setShowStash(true);
  }, []);

  // Debug: Log when showStash changes
  useEffect(() => {
    console.log('🏦 showStash state changed to:', showStash);
  }, [showStash]);

  // Stop bird music when modal is dismissed
  useEffect(() => {
    if (!goingToSchoolModalVisible) {
      MusicController.stop();
    }
  }, [goingToSchoolModalVisible]);

  const handleGoDeli = useCallback(() => {
    console.log('🍖 Deli button clicked');
    setShowDeli(true);
  }, []);

  const handleGoToSleep = useCallback(() => {
    // Show confirmation modal instead of immediately ending the day
    setSleepConfirmModalVisible(true);
  }, []);

  const handleSleepConfirm = () => {
    console.log('🌙 AfterSchool: handleSleepConfirm called');
    console.log(
      '🌙 AfterSchool: Current wallet balance before allowance:',
      balance
    );

    // Close the sleep modal and add allowance before showing going to school modal
    setSleepConfirmModalVisible(false);

    console.log('\n=== 🌙 SLEEP SEQUENCE START ===');
    console.log(`🌙 Current wallet balance: $${balance}`);
    console.log(`🌙 Current stashed amount: $${stashedAmount}`);
    console.log(`🌙 Current day: ${day}`);
    console.log(`🌙 Jokers owned:`, jokers.map(j => ({ id: j.id, name: j.name })));

    // Apply daily interest from High Yield Account joker (if owned)
    console.log('\n--- Step 1: Checking High Yield Account interest ---');
    const earnedInterest = applyDailyInterest(jokers);
    if (earnedInterest > 0) {
      console.log(`✅ Earned interest: $${earnedInterest.toFixed(2)}`);
    } else {
      console.log('ℹ️ No interest earned (joker not owned or no stash)');
    }

    // Apply Inheritance hall pass (10% wallet to piggy bank)
    console.log('\n--- Step 2: Checking Inheritance transfer ---');
    const inheritanceTransfer = applyInheritance();
    if (inheritanceTransfer > 0) {
      console.log(`✅ Inheritance transfer: $${inheritanceTransfer.toFixed(2)}`);
    } else {
      console.log('ℹ️ No inheritance transfer (hall pass not selected or no balance)');
    }

    // Add daily allowance (jokers could modify this amount)
    console.log('\n--- Step 3: Calculating daily allowance ---');
    const receivedAllowance = addAllowance(jokers, periodCount);
    console.log(`✅ Total allowance received: $${receivedAllowance}`);
    console.log('=== 🌙 SLEEP SEQUENCE END ===\n');
    setAllowanceAmount(receivedAllowance);

    // Track allowance in daily stats
    addAllowanceToStats(receivedAllowance);

    // Find guaranteed events for the next day
    const nextDayStart =
      Math.floor(periodCount / periodsPerDay) * periodsPerDay +
      periodsPerDay +
      1; // Start of next day (1-indexed)
    const nextDayEnd = nextDayStart + periodsPerDay - 1; // End of next day
    const guaranteedEventsForTomorrow = gameData.periodEvents.filter(
      (event) =>
        event.isGuaranteedEvent &&
        event.period >= nextDayStart &&
        event.period <= nextDayEnd
    );

    const warnings = guaranteedEventsForTomorrow.map((event) => event.hint);
    setGuaranteedEventWarnings(warnings);
    console.log('🚨 Guaranteed events for tomorrow:', warnings);

    // Stop current music and play bird sounds
    MusicController.stop();
    MusicController.setTrack('bird');
    setGoingToSchoolModalVisible(true);
  };

  const handleGoingToSchoolComplete = useCallback(async () => {
    console.log('🌙 AfterSchool: handleGoingToSchoolComplete called');
    console.log(
      '🌙 AfterSchool: Current wallet balance before startNewDay:',
      balance
    );
    console.log('🌙 AfterSchool: Current day:', day);
    console.log('🌙 AfterSchool: Current stashedAmount (debt):', stashedAmount);

    // Close the interstitial
    setGoingToSchoolModalVisible(false);

    // Check if starting a new day would complete the game (day 6 = periodCount 40 for 8 periods, 30 for 6 periods)
    const nextPeriodCount =
      Math.floor(periodCount / periodsPerDay) * periodsPerDay + periodsPerDay;
    const maxPeriods = periodsPerDay * 5; // 5 days of periods (40 for 8 periods/day, 30 for 6 periods/day)
    if (nextPeriodCount >= maxPeriods) {
      console.log(
        `🎯 Day 5 complete - navigating to game end screen instead of starting day 6 (${periodsPerDay} periods/day)`
      );
      console.log(
        '🎯 Current periodCount:',
        periodCount,
        'Next would be:',
        nextPeriodCount,
        'Max:',
        maxPeriods
      );
      // Stop bird sounds before navigating to game end
      MusicController.stop();
      router.push('/game-end');
      return;
    }

    // Reset daily stats and start new day (only if game hasn't ended)
    resetDailyStats();
    dispatch(resetEarlySaleFlag()); // Reset Vacuum Sealer early sale penalty flag for new day
    resetDailyJokerUsage(day + 1); // Reset instant jokers for the new day
    console.log(
      `🌙 AfterSchool: Daily stats reset, calling startNewDay with ${periodsPerDay} periods/day...`
    );
    // Start new day (this will exit after-school mode and increment to next day)
    startNewDay(periodsPerDay);
    console.log('🌙 AfterSchool: startNewDay completed, navigating to market');
    // Stop bird sounds before navigating
    MusicController.stop();
    // Navigate back to market (school) - market screen will start its own music via useFocusEffect
    router.replace('/(tabs)/market');
  }, [
    balance,
    day,
    stashedAmount,
    adoptionFee,
    difficultyLevel,
    jokers.length,
    totalCandiesSold,
    hasPlayedAllMinigames,
    trackGameCompleted,
    checkUnlockRequirements,
    resetDailyStats,
    resetDailyJokerUsage,
    startNewDay,
    setIsInitialized,
    periodCount,
    periodsPerDay,
    dispatch,
  ]);

  const handleSleepCancel = () => {
    // Just close the modal
    setSleepConfirmModalVisible(false);
  };

  const options = useMemo(() => {
    const allOptions = [
      {
        id: 'study',
        title: 'Study',
        desc: hasStudiedTonight
          ? "You've already studied tonight. Rest up!"
          : 'Cozy up with your books by the warm lamplight',
        onPress: () => handleStudy(),
        disabled: hasStudiedTonight,
      },
      {
        id: 'stash',
        title: 'Stash',
        desc: 'Make sure no one is following you',
        onPress: () => handleStashMoney(),
        disabled: false,
      },
      {
        id: 'deli',
        title: 'Deli',
        desc: 'Walk to the neighborhood store',
        onPress: () => handleGoDeli(),
        disabled: false,
      },
      {
        id: 'sleep',
        title: 'Sleep',
        desc: 'Rest up and start a new day at school tomorrow',
        onPress: () => handleGoToSleep(),
        disabled: false,
      },
    ];

    // Don't show sleep button after game ends (periodCount >= max for 5 days)
    const maxPeriods = periodsPerDay * 5; // 40 for 8/day, 30 for 6/day
    if (periodCount >= maxPeriods) {
      return allOptions.filter((opt) => opt.id !== 'sleep');
    }

    return allOptions;
  }, [
    hasStudiedTonight,
    handleStudy,
    handleStashMoney,
    handleGoDeli,
    handleGoToSleep,
    periodCount,
    periodsPerDay,
  ]);

  const renderMainOptions = useMemo(() => {
    return options.map((item) => (
      <PressableButton
        key={item.id}
        onPress={item.disabled ? undefined : item.onPress}
        disabled={item.disabled}
        shadowColor="#000"
        shadowOffset={{ width: 0, height: 4 }}
        shadowOpacity={0.4}
        shadowRadius={5}
        elevation={8}
      >
        <PixelBorder
          borderColor={item.disabled ? '#666' : '#f7e98e'}
          borderWidth={3}
          backgroundColor={
            item.disabled ? 'rgba(60,60,60, 0.8)' : 'rgba(0,0,0, 0.3)'
          }
          innerPadding={0}
          style={styles.gridButtonWrapper}
        >
          <View
            style={[
              styles.gridButtonInner,
              item.disabled && styles.disabledButton,
            ]}
          >
            <Image
              source={ACTIVITY_IMAGES[item.id as keyof typeof ACTIVITY_IMAGES]}
              style={[styles.buttonIcon, item.disabled && styles.disabledIcon]}
              resizeMode="contain"
            />
            <Text
              style={[styles.buttonTitle, item.disabled && styles.disabledText]}
            >
              {item.title}
            </Text>
            <Text
              style={[
                styles.buttonSubtext,
                item.disabled && styles.disabledText,
              ]}
            >
              {item.desc}
            </Text>
          </View>
        </PixelBorder>
      </PressableButton>
    ));
  }, [options]);

  console.log(
    '🎬 Rendering AfterSchoolPage, showStash:',
    showStash,
    'showDeli:',
    showDeli
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#2a1845" />

      {showStash ? (
        <>
          {console.log('🏦 Rendering PiggyBankPage branch')}
          <PiggyBankPage onBack={() => setShowStash(false)} />
        </>
      ) : showDeli ? (
        <>
          {console.log('🍖 Rendering DeliPage branch')}
          <DeliPage onBack={() => setShowDeli(false)} />
        </>
      ) : (
        <ImageBackground
          source={require('../../assets/images/evening-street.png')}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <GameHUD
            theme="evening"
            customHeaderText={`After School - Day ${day}`}
            customLocationText="Home"
            onInventoryPress={() => setShowInventory(true)}
            showLunchMinigames={false}
          />

          {showStudySubjects ? (
            isFocused && (
              <View style={{ flex: 1 }}>
                <StudySubjectSelector
                  onBack={handleBackToOptions}
                  disabled={hasStudiedTonight}
                  disabledMessage="You've already studied tonight! Rest up for tomorrow."
                />
              </View>
            )
          ) : (
            <View style={styles.optionsContainer}>
              {/* Main options view */}
              <View style={styles.optionsGrid}>{renderMainOptions}</View>
            </View>
          )}
        </ImageBackground>
      )}

      <SleepConfirmModal
        visible={sleepConfirmModalVisible}
        onConfirm={handleSleepConfirm}
        onCancel={handleSleepCancel}
        currentDay={day}
      />

      <GoingToSchoolModal
        visible={goingToSchoolModalVisible}
        allowanceAmount={allowanceAmount}
        onComplete={handleGoingToSchoolComplete}
        guaranteedEventWarnings={guaranteedEventWarnings}
      />

      {/* Lazy load InventoryModal only when needed */}
      {showInventory && (
        <Suspense fallback={null}>
          <InventoryModal
            visible={showInventory}
            onClose={() => setShowInventory(false)}
            inventory={inventory}
            totalCount={getTotalInventoryCount()}
            capacity={getInventoryLimit()}
          />
        </Suspense>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.purple.darkBg, // Fallback color
  },
  backgroundImage: {
    flex: 1,
  },
  optionsContainer: {
    flex: 1,
    paddingTop: 10,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 420,
    width: '100%',
    gap: 10,
  },
  gridButton: {
    width: 150,
    height: 150,
    borderRadius: 12,
    padding: 8,
    backgroundColor: 'rgba(90,99,127, 0.8)',
    borderWidth: 3,
    borderColor: colors.gold.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 12,
    shadowColor: '#2d1b3d',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gold.light,
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0,0,0,1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 4,
  },
  buttonSubtext: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.white,
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    lineHeight: 11,
    marginBottom: 8,
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: 'rgba(93, 76, 112, 0.4)',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  disabledText: {
    color: colors.gray.medium,
  },
  debugButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginTop: 10,
  },
  debugButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  gridButtonWrapper: {
    width: 190,
    height: 100,
    margin: 5,
  },
  gridButtonInner: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: 8,
  },
  buttonIcon: {
    width: 45,
    height: 45,
    marginTop: 8,
  },
  disabledIcon: {
    opacity: 0.3,
  },
});

export default React.memo(AfterSchoolPage);
