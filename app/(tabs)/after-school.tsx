import { useIsFocused } from '@react-navigation/native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CopilotProvider,
  CopilotStep,
  useCopilot,
  walkthroughable,
} from 'react-native-copilot';
import colors from '../../src/constants/colors';
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
import { scoreboardService } from '../../src/services/firebase';
import { useAppDispatch } from '../../src/store/hooks';
import { setTotalCompletions } from '../../src/store/slices/gameSlice';
import { forceSave } from '../../src/store/store';
import CustomCopilotTooltip from '../components/CustomCopilotTooltip';
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

const CopilotTouchableOpacity = walkthroughable(TouchableOpacity);

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
    hasCompletedAfterSchoolTutorial,
    setHasCompletedAfterSchoolTutorial,
  } = useGame();
  const { resetDailyStats, addAllowance: addAllowanceToStats } =
    useDailyStats();
  const { balance, stashedAmount, adoptionFee, addAllowance, difficultyLevel } =
    useWallet();
  const { jokers } = useJokers();
  const { inventory, getTotalInventoryCount, getInventoryLimit } =
    useInventory();
  const { setEvent } = useFlavorText();
  const { trackGameCompleted } = useScoreboard();
  const { checkUnlockRequirements } = useHallPass();
  const { hasPlayedAllMinigames } = useMinigameTracking();
  const { totalCandiesSold } = useCandySales();
  const { gameData } = useSeed();
  const { start, copilotEvents, eventEmitter } = useCopilot();
  const [sleepConfirmModalVisible, setSleepConfirmModalVisible] =
    useState(false);
  const [goingToSchoolModalVisible, setGoingToSchoolModalVisible] =
    useState(false);
  const [allowanceAmount, setAllowanceAmount] = useState(0);
  const [guaranteedEventWarnings, setGuaranteedEventWarnings] = useState<string[]>([]);
  const [showStudySubjects, setShowStudySubjects] = useState(false);
  const [showStash, setShowStash] = useState(false);
  const [showDeli, setShowDeli] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [hasTriggeredGameEnd, setHasTriggeredGameEnd] = useState(false);

  // Set afternoon flavor text when component loads and track active view
  useEffect(() => {
    setEvent('AFTERNOON');
    // Track that user is now in after-school view
    setLastActiveView('after-school');
  }, [setEvent, setLastActiveView]);

  // Check if game should end (only via periodCount >= 40, handled in market.tsx)
  useEffect(() => {
    console.log(`🎯 After-school useEffect: day=${day}, hasTriggeredGameEnd=${hasTriggeredGameEnd}`);
    // Removed premature day 5 check - game should end after ALL periods complete (periodCount >= 40)
    if (false && day === 5 && !hasTriggeredGameEnd) {
      setHasTriggeredGameEnd(true);
      console.log('🎯 Game End: Condition met - starting game end sequence');
      const handleGameEnd = async () => {
        console.log('🎯 Game End: Entered handleGameEnd function');

        // Calculate final score
        const finalScore = balance + stashedAmount;
        const targetScore = 0; // Win condition: net worth >= 0 (debt paid off)

        console.log('🎯 Final Score:', finalScore, 'Target:', targetScore);

        // Determine win/lose (net worth >= 0 means debt is paid)
        const hasWon = finalScore >= 0;
        if (hasWon) {
          console.log('🎉 Player WON! Score exceeds adoption fee');
        } else {
          console.log('😢 Player LOST! Score below adoption fee');
        }

        // Get total completions count
        let totalCompletions = 0;
        try {
          if (hasWon) {
            console.log(
              '🏆 Player won - incrementing game completions in Firebase...'
            );
            totalCompletions =
              await scoreboardService.incrementGameCompletions();
            dispatch(setTotalCompletions(totalCompletions));
            console.log('🏆 Total completions:', totalCompletions);
          } else {
            console.log(
              '😢 Player lost - getting total completions from cache...'
            );
            totalCompletions = scoreboardService.getTotalWinCount();
            console.log('🏆 Total completions (lost game):', totalCompletions);
          }
        } catch (error) {
          console.error('❌ Error tracking/fetching game completion:', error);
        }

        // Check for newly unlocked Hall Passes
        try {
          // Construct game stats for Hall Pass unlock checking
          const gameStats = {
            completions: totalCompletions, // Use actual total from Firebase
            finalProfit: finalScore, // Total profit from this game
            difficulty: difficultyLevel,
            completionTime: periodCount, // Number of periods played
            totalCandySold: totalCandiesSold,
            noJokers: jokers.length === 0, // For minimalist_master
          };

          const minigameTrackingData = {
            hasPlayedAllMinigames,
          };

          console.log(
            '🎓 Checking hall pass unlocks with gameStats:',
            gameStats
          );
          console.log('🎓 Minigame tracking data:', minigameTrackingData);

          const unlocked = checkUnlockRequirements(
            gameStats,
            minigameTrackingData
          );
          console.log('🎓 Newly unlocked Hall Passes:', unlocked);
        } catch (error) {
          console.error('❌ Error checking Hall Pass unlocks:', error);
        }

        // Track game completion in leaderboard
        try {
          trackGameCompleted(finalScore, difficultyLevel, totalCandiesSold);
        } catch (error) {
          console.error('❌ Error tracking game completion:', error);
        }

        // Navigate to game end screen
        console.log('🎮 Navigating to game end screen');
        router.push('/game-end');

        // Clear game state so there's no continue option available after game ends
        setIsInitialized(false);
        console.log(
          '🎯 Game state cleared - no continue option will be available'
        );
      };

      handleGameEnd();
    }
  }, [
    day,
    balance,
    stashedAmount,
    adoptionFee,
    checkUnlockRequirements,
    trackGameCompleted,
    difficultyLevel,
    totalCandiesSold,
    jokers.length,
    hasPlayedAllMinigames,
    dispatch,
    setIsInitialized,
  ]);

  // Tutorial using Copilot - only show if not already completed
  const shouldShowTutorial =
    day === 1 && periodCount === 0 && !hasCompletedAfterSchoolTutorial;
  const tutorialStartedRef = useRef(false);

  // Reset tutorialStartedRef when not on day 1
  useEffect(() => {
    if (day !== 1) {
      tutorialStartedRef.current = false;
    }
  }, [day]);

  // Simple tutorial auto-start - only run on day 1
  useEffect(() => {
    // Skip entirely if not day 1
    if (day !== 1) return;

    if (process.env.NODE_ENV === 'development') {
      console.log('🎓 After-school tutorial check:', {
        day,
        periodCount,
        hasCompletedAfterSchoolTutorial,
        shouldShowTutorial,
        tutorialStarted: tutorialStartedRef.current,
      });
    }

    if (shouldShowTutorial && !tutorialStartedRef.current) {
      console.log('🎓 Auto-starting after-school tutorial');

      // Small delay to ensure UI is ready
      const timeoutId = setTimeout(() => {
        console.log('🎯 Starting after-school copilot tutorial');
        tutorialStartedRef.current = true;
        start();
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [shouldShowTutorial, start, day, periodCount, hasCompletedAfterSchoolTutorial]);

  // Mark tutorial as completed when it finishes or is skipped - only on day 1
  useEffect(() => {
    // Skip entirely if not day 1
    if (day !== 1) return;

    if (eventEmitter && copilotEvents) {
      console.log('🎓 Setting up after-school tutorial event listeners');

      const handleStop = () => {
        console.log('🎓 After-school tutorial STOP event fired');
        console.log(
          '🎓 Current hasCompletedAfterSchoolTutorial:',
          hasCompletedAfterSchoolTutorial
        );
        setHasCompletedAfterSchoolTutorial(true);
        forceSave();
      };

      const handleSkip = () => {
        console.log('🎓 After-school tutorial SKIP event fired');
        console.log(
          '🎓 Current hasCompletedAfterSchoolTutorial:',
          hasCompletedAfterSchoolTutorial
        );
        setHasCompletedAfterSchoolTutorial(true);
        forceSave();
      };

      // Try to listen to all events
      if (copilotEvents.STOP) {
        eventEmitter.on(copilotEvents.STOP, handleStop);
        console.log('✅ Registered after-school STOP listener');
      }
      if (copilotEvents.SKIP) {
        eventEmitter.on(copilotEvents.SKIP, handleSkip);
        console.log('✅ Registered after-school SKIP listener');
      }

      console.log('🎓 After-school event listeners registered');

      return () => {
        console.log('🎓 Cleaning up after-school event listeners');
        if (copilotEvents.STOP)
          eventEmitter.off(copilotEvents.STOP, handleStop);
        if (copilotEvents.SKIP)
          eventEmitter.off(copilotEvents.SKIP, handleSkip);
      };
    }
  }, [
    eventEmitter,
    copilotEvents,
    setHasCompletedAfterSchoolTutorial,
    hasCompletedAfterSchoolTutorial,
    day,
  ]);

  // Fallback: Mark tutorial as complete when user navigates away or advances to period 1+
  useEffect(() => {
    if (
      day === 1 &&
      periodCount > 0 &&
      !hasCompletedAfterSchoolTutorial &&
      tutorialStartedRef.current
    ) {
      console.log(
        '🎓 Fallback: Marking after-school tutorial complete (user advanced period)'
      );
      setHasCompletedAfterSchoolTutorial(true);
      forceSave();
    }
  }, [
    day,
    periodCount,
    hasCompletedAfterSchoolTutorial,
    setHasCompletedAfterSchoolTutorial,
  ]);

  // Fallback: Mark tutorial as complete when screen loses focus after tutorial started
  useFocusEffect(
    useCallback(() => {
      return () => {
        // On blur/unfocus
        if (
          day === 1 &&
          !hasCompletedAfterSchoolTutorial &&
          tutorialStartedRef.current
        ) {
          console.log(
            '🎓 Fallback: Marking after-school tutorial complete (user navigated away)'
          );
          setHasCompletedAfterSchoolTutorial(true);
          forceSave();
        }
      };
    }, [day, hasCompletedAfterSchoolTutorial, setHasCompletedAfterSchoolTutorial])
  );

  const handleStudy = () => {
    if (hasStudiedTonight) {
      return; // Don't show subjects if already studied
    }
    setShowStudySubjects(true);
  };

  const handleBackToOptions = () => {
    setShowStudySubjects(false);
  };

  // Reset study subjects view when returning from minigame
  useFocusEffect(
    useCallback(() => {
      if (hasStudiedTonight && showStudySubjects) {
        setShowStudySubjects(false);
      }
    }, [hasStudiedTonight, showStudySubjects])
  );

  const handleStashMoney = () => {
    setShowStash(true);
  };

  const handleGoDeli = () => {
    setShowDeli(true);
  };

  const handleGoToSleep = () => {
    // Show confirmation modal instead of immediately ending the day
    setSleepConfirmModalVisible(true);
  };

  const handleSleepConfirm = () => {
    console.log('🌙 AfterSchool: handleSleepConfirm called');
    console.log(
      '🌙 AfterSchool: Current wallet balance before allowance:',
      balance
    );

    // Close the sleep modal and add allowance before showing going to school modal
    setSleepConfirmModalVisible(false);

    // Add daily allowance (jokers could modify this amount)
    const receivedAllowance = addAllowance(jokers, periodCount);
    console.log('🌙 AfterSchool: Allowance received:', receivedAllowance);
    setAllowanceAmount(receivedAllowance);

    // Track allowance in daily stats
    addAllowanceToStats(receivedAllowance);

    // Find guaranteed events for the next day
    const nextDayStart = Math.floor(periodCount / 8) * 8 + 8 + 1; // Start of next day (1-indexed)
    const nextDayEnd = nextDayStart + 7; // End of next day
    const guaranteedEventsForTomorrow = gameData.periodEvents.filter(
      (event) =>
        event.isGuaranteedEvent &&
        event.period >= nextDayStart &&
        event.period <= nextDayEnd
    );

    const warnings = guaranteedEventsForTomorrow.map((event) => event.hint);
    setGuaranteedEventWarnings(warnings);
    console.log('🚨 Guaranteed events for tomorrow:', warnings);

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

    // Check if starting a new day would complete the game (day 6 = periodCount 40)
    const nextPeriodCount = Math.floor(periodCount / 8) * 8 + 8;
    if (nextPeriodCount >= 40) {
      console.log(
        '🎯 Day 5 complete - navigating to game end screen instead of starting day 6'
      );
      console.log('🎯 Current periodCount:', periodCount, 'Next would be:', nextPeriodCount);
      router.push('/game-end');
      return;
    }

    // Reset daily stats and start new day (only if game hasn't ended)
    resetDailyStats();
    console.log('🌙 AfterSchool: Daily stats reset, calling startNewDay...');
    // Start new day (this will exit after-school mode and increment to next day)
    startNewDay();
    console.log('🌙 AfterSchool: startNewDay completed, navigating to market');
    // Navigate back to market (school)
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
    startNewDay,
    setIsInitialized,
    periodCount,
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
      },
      {
        id: 'deli',
        title: 'Deli',
        desc: 'Walk to the neighborhood store',
        onPress: () => handleGoDeli(),
      },
      {
        id: 'sleep',
        title: 'Sleep',
        desc: 'Rest up and start a new day at school tomorrow',
        onPress: () => handleGoToSleep(),
      },
    ];

    // Don't show sleep button after game ends (periodCount >= 40)
    if (periodCount >= 40) {
      return allOptions.filter((opt) => opt.id !== 'sleep');
    }

    return allOptions;
  }, [hasStudiedTonight, handleStudy, periodCount]);

  const renderMainOptions = useMemo(() => {
    const shouldShowTutorial = day === 1 && !hasCompletedAfterSchoolTutorial;

    const stepConfigs: Record<
      string,
      { order: number; name: string; text: string }
    > = {
      study: {
        order: 1,
        name: 'study_step',
        text: `Study to get better:
• Play mini-games to win jokers
• Jokers have auras or instant abilities
• Knowledge is power!`,
      },
      stash: {
        order: 2,
        name: 'stash_step',
        text: `Go to Your Stash:
• Stash money for the pet fund
• A dollar saved is a dollar earned
`,
      },
      deli: {
        order: 3,
        name: 'deli_step',
        text: `Visit the Corner Deli:
• Shoot the breeze and hang out
• Find fair priced candy around the corner
`,
      },
      sleep: {
        order: 4,
        name: 'sleep_step',
        text: `Get some rest for tomorrow
• End the day and get your allowance
• Start fresh tomorrow at school
• We rest to travel further!`,
      },
    };

    return options.map((item, index) => {
      const stepConfig = stepConfigs[item.id];

      const button = (
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
      );

      // Wrap with CopilotStep only if tutorial should show
      if (shouldShowTutorial && stepConfig) {
        const WalkthroughableView = walkthroughable(View);
        return (
          <CopilotStep
            key={`step-${item.id}`}
            text={stepConfig.text}
            order={stepConfig.order}
            name={stepConfig.name}
          >
            <WalkthroughableView
              style={{ width: '100%', alignItems: 'center' }}
            >
              {button}
            </WalkthroughableView>
          </CopilotStep>
        );
      }

      return button;
    });
  }, [options, day, hasCompletedAfterSchoolTutorial]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#2a1845" />

      {showStash ? (
        <PiggyBankPage onBack={() => setShowStash(false)} />
      ) : showDeli ? (
        <DeliPage onBack={() => setShowDeli(false)} />
      ) : (
        <ImageBackground
          source={require('../../assets/images/evening-street.png')}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <GameHUD
            theme="evening"
            customHeaderText={`After School - Day ${day}`}
            customLocationText="Peaceful Evening"
            onInventoryPress={() => setShowInventory(true)}
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

// Wrap with CopilotProvider using CustomCopilotTooltip
function AfterSchoolPageWithCopilot() {
  return (
    <CopilotProvider
      overlay="svg"
      animated={true}
      backdropColor="rgba(0, 0, 0, 0.9)"
      labels={{
        previous: 'Back',
        next: 'Next',
        skip: 'Skip',
        finish: 'Got it!',
      }}
      tooltipComponent={CustomCopilotTooltip}
      stopOnOutsideClick={false}
      arrowSize={{ width: 0, height: 0 }}
      maskOffset={8}
    >
      <AfterSchoolPage />
    </CopilotProvider>
  );
}

export default React.memo(AfterSchoolPageWithCopilot);
