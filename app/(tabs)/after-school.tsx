import { useIsFocused } from '@react-navigation/native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useWallet } from '../../src/hooks/useWallet';
import { scoreboardService } from '../../src/services/firebase';
import { useAppDispatch } from '../../src/store/hooks';
import { setTotalCompletions } from '../../src/store/slices/gameSlice';
import { forceSave } from '../../src/store/store';
import CustomCopilotTooltip from '../components/CustomCopilotTooltip';
import GameEndModal from '../components/GameEndModal';
import GameHUD from '../components/GameHUD';
import GoingToSchoolModal from '../components/GoingToSchoolModal';
import InventoryModal from '../components/InventoryModal';
import PixelBorder from '../components/PixelBorder';
import SleepConfirmModal from '../components/SleepConfirmModal';
import StudySubjectSelector from '../components/StudySubjectSelector';
import DeliPage from '../deli';
import PiggyBankPage from '../piggy-bank';

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
  const { start, copilotEvents, eventEmitter } = useCopilot();
  const [tutorialStarted, setTutorialStarted] = useState(false);
  const [sleepConfirmModalVisible, setSleepConfirmModalVisible] =
    useState(false);
  const [goingToSchoolModalVisible, setGoingToSchoolModalVisible] =
    useState(false);
  const [gameEndModalVisible, setGameEndModalVisible] = useState(false);
  const [gameResult, setGameResult] = useState<'won' | 'lost' | null>(null);
  const [allowanceAmount, setAllowanceAmount] = useState(0);
  const [showStudySubjects, setShowStudySubjects] = useState(false);
  const [showStash, setShowStash] = useState(false);
  const [showDeli, setShowDeli] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [unlockedHallPasses, setUnlockedHallPasses] = useState<string[]>([]);
  const [totalCompletionsForModal, setTotalCompletionsForModal] = useState(0);

  // Set afternoon flavor text when component loads and track active view
  useEffect(() => {
    setEvent('AFTERNOON');
    // Track that user is now in after-school view
    setLastActiveView('after-school');
  }, [setEvent, setLastActiveView]);

  // Check if game should end (when entering after-school on day 5)
  useEffect(() => {
    console.log(`🎯 After-school useEffect: day=${day}, gameEndModalVisible=${gameEndModalVisible}`);
    if (day === 5 && !gameEndModalVisible) {
      console.log('🎯 Game End: Condition met - starting game end sequence');
      const handleGameEnd = async () => {
        console.log('🎯 Game End: Entered handleGameEnd function');

        // Calculate final score
        const finalScore = balance + stashedAmount;
        const targetScore = adoptionFee;

        console.log('🎯 Final Score:', finalScore, 'Target:', targetScore);

        // Determine win/lose
        const hasWon = finalScore >= targetScore;
        if (hasWon) {
          console.log('🎉 Player WON! Score exceeds adoption fee');
          setGameResult('won');
        } else {
          console.log('😢 Player LOST! Score below adoption fee');
          setGameResult('lost');
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
            setTotalCompletionsForModal(totalCompletions);
            console.log('🏆 Total completions:', totalCompletions);
          } else {
            console.log(
              '😢 Player lost - fetching total completions for hall pass checks...'
            );
            totalCompletions = await scoreboardService.getTotalCompletions();
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
            perfectAttendance: periodCount >= 40, // 5 days * 8 periods
            totalCandySold: totalCandiesSold,
            noJokers: jokers.length === 0, // For minimalist_master
          };

          const minigameTrackingData = {
            hasPlayedAllMinigames,
          };

          console.log('🎓 Checking hall pass unlocks with gameStats:', gameStats);
          console.log('🎓 Minigame tracking data:', minigameTrackingData);

          const unlocked = checkUnlockRequirements(
            gameStats,
            minigameTrackingData
          );
          console.log('🎓 Newly unlocked Hall Passes:', unlocked);
          setUnlockedHallPasses(unlocked);
        } catch (error) {
          console.error('❌ Error checking Hall Pass unlocks:', error);
          setUnlockedHallPasses([]);
        }

        // Track game completion in leaderboard
        try {
          trackGameCompleted(finalScore, difficultyLevel, totalCandiesSold);
        } catch (error) {
          console.error('❌ Error tracking game completion:', error);
        }

        // Show game end modal
        setGameEndModalVisible(true);

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
    gameEndModalVisible,
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

  // Start copilot tutorial on first after-school visit (only if not already completed)
  useEffect(() => {
    if (day === 1 && !hasCompletedAfterSchoolTutorial) {
      console.log('🎯 After school day 1 - checking tutorial status:', {
        day,
        tutorialStarted,
        hasCompletedAfterSchoolTutorial,
      });

      if (!tutorialStarted) {
        // Small delay to ensure UI is ready
        const timeoutId = setTimeout(() => {
          console.log('🎯 Starting after-school copilot tutorial');
          setTutorialStarted(true);
          start();
        }, 300);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [day, start, tutorialStarted, hasCompletedAfterSchoolTutorial]);

  // Mark tutorial as completed when it finishes or is skipped
  useEffect(() => {
    if (eventEmitter && copilotEvents) {
      const handleComplete = () => {
        console.log('🎓 After-school tutorial completed');
        setHasCompletedAfterSchoolTutorial(true);
        // Force immediate save to AsyncStorage
        setTimeout(() => {
          forceSave();
          console.log('💾 Tutorial completion saved to AsyncStorage');
        }, 100);
      };

      // Listen for both STOP (finish) and SKIP events
      eventEmitter.on(copilotEvents.STOP, handleComplete);
      eventEmitter.on(copilotEvents.SKIP, handleComplete);
      return () => {
        eventEmitter.off(copilotEvents.STOP, handleComplete);
        eventEmitter.off(copilotEvents.SKIP, handleComplete);
      };
    }
  }, [eventEmitter, copilotEvents, setHasCompletedAfterSchoolTutorial]);

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

    // Game end is now handled when entering after-school on day 5
    // This function should never be called on day 5 anymore
    if (day >= 5) {
      console.log(
        '🎯 Game already ended - sleep button should not be accessible on day 5'
      );
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
  ]);

  const handleSleepCancel = () => {
    // Just close the modal
    setSleepConfirmModalVisible(false);
  };

  const handleGameRestart = () => {
    // Close game end modal and navigate to title screen
    setGameEndModalVisible(false);
    setGameResult(null);
    setUnlockedHallPasses([]);

    // Reset all game state
    resetGame();
    setIsInitialized(false);
    console.log('🔄 Complete game reset performed for restart');

    router.push('/title-screen');
  };

  const handleGameEndModalClose = () => {
    // Close game end modal but stay in current screen
    setGameEndModalVisible(false);
    setGameResult(null);
    setUnlockedHallPasses([]);

    // Reset all game state so no continue option is available
    resetGame();
    setIsInitialized(false);
    console.log('🔄 Game state cleared after closing game end modal');
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

    // Don't show sleep button on day 5 (game ends when entering after-school)
    if (day >= 5) {
      return allOptions.filter((opt) => opt.id !== 'sleep');
    }

    return allOptions;
  }, [hasStudiedTonight, handleStudy, day]);

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
        <PixelBorder
          key={item.id}
          borderColor={item.disabled ? '#666' : '#f7e98e'}
          borderWidth={3}
          backgroundColor={
            item.disabled ? 'rgba(60,60,60, 0.8)' : 'rgba(0,0,0, 0.3)'
          }
          innerPadding={0}
          style={styles.gridButtonWrapper}
        >
          <TouchableOpacity
            style={[
              styles.gridButtonInner,
              item.disabled && styles.disabledButton,
            ]}
            onPress={item.disabled ? undefined : item.onPress}
            disabled={item.disabled}
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
          </TouchableOpacity>
        </PixelBorder>
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

          <View style={styles.optionsContainer}>
            {showStudySubjects ? (
              isFocused && (
                <StudySubjectSelector
                  onBack={handleBackToOptions}
                  disabled={hasStudiedTonight}
                  disabledMessage="You've already studied tonight! Rest up for tomorrow."
                />
              )
            ) : (
              // Main options view
              <View style={styles.optionsGrid}>{renderMainOptions}</View>
            )}
          </View>
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
      />

      <GameEndModal
        visible={gameEndModalVisible}
        gameResult={gameResult || 'lost'}
        finalScore={balance + stashedAmount}
        balance={balance}
        stashedAmount={stashedAmount}
        adoptionFee={adoptionFee}
        difficultyLevel={difficultyLevel || 1}
        unlockedHallPasses={unlockedHallPasses}
        totalCompletions={totalCompletionsForModal}
        totalCandiesSold={totalCandiesSold}
        onRestart={handleGameRestart}
        onClose={handleGameEndModalClose}
      />

      <InventoryModal
        visible={showInventory}
        onClose={() => setShowInventory(false)}
        inventory={inventory}
        totalCount={getTotalInventoryCount()}
        capacity={getInventoryLimit()}
      />
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
    fontSize: 13,
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
    width: 40,
    height: 40,
    marginBottom: 8,
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
