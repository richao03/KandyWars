import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { useFlavorText } from '../../src/context/FlavorTextContext';
import { useCandySales } from '../../src/hooks/useCandySales';
import { useDailyStats } from '../../src/hooks/useDailyStats';
import { useGame } from '../../src/hooks/useGame';
import { useHallPass } from '../../src/hooks/useHallPass';
import { useJokers } from '../../src/hooks/useJokers';
import { useMinigameTracking } from '../../src/hooks/useMinigameTracking';
import { useScoreboard } from '../../src/hooks/useScoreboard';
import { useWallet } from '../../src/hooks/useWallet';
import GameEndModal from '../components/GameEndModal';
import GameHUD from '../components/GameHUD';
import GoingToSchoolModal from '../components/GoingToSchoolModal';
import PixelBorder from '../components/PixelBorder';
import SleepConfirmModal from '../components/SleepConfirmModal';

const CopilotTouchableOpacity = walkthroughable(TouchableOpacity);

const subjects = [
  { name: 'Math', color: { bg: '#e6f7ff', border: '#1890ff' } },
  { name: 'Gym', color: { bg: '#e6f2ff', border: '#4169e1' } },
  { name: 'Cooking', color: { bg: '#f6ffed', border: '#52c41a' } },
  { name: 'Economy', color: { bg: '#fff1f0', border: '#f5222d' } },
  { name: 'Logic', color: { bg: '#f9f0ff', border: '#722ed1' } },
  { name: 'Recess', color: { bg: '#fff0f6', border: '#eb2f96' } },
  { name: 'Comp Sci', color: { bg: '#f0f5ff', border: '#2f54eb' } },
  { name: 'Art', color: { bg: '#feffe6', border: '#a0d911' } },
];

function AfterSchoolPage() {
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

  console.log('🌅 AfterSchoolPage: hasStudiedTonight =', hasStudiedTonight);

  // Force reset hasStudiedTonight when entering after-school to prevent stale state
  // Fixed: Remove the problematic useEffect that was causing infinite loops
  // The hasStudiedTonight state should be managed by the game flow, not forced here

  // Track hasStudiedTonight changes
  useEffect(() => {
    console.log(
      '🌅 AfterSchoolPage: hasStudiedTonight changed to:',
      hasStudiedTonight
    );
  }, [hasStudiedTonight]);
  const { resetDailyStats } = useDailyStats();
  const { balance, stashedAmount, adoptionFee, addAllowance, difficultyLevel } =
    useWallet();
  const { jokers } = useJokers();
  const { setEvent } = useFlavorText();
  const { trackGameCompleted } = useScoreboard();
  const { checkUnlockRequirements } = useHallPass();
  const { hasPlayedAllMinigames } = useMinigameTracking();
  const { totalCandiesSold } = useCandySales();
  const { start, copilotEvents } = useCopilot();
  const [tutorialStarted, setTutorialStarted] = useState(false);
  const [sleepConfirmModalVisible, setSleepConfirmModalVisible] =
    useState(false);
  const [goingToSchoolModalVisible, setGoingToSchoolModalVisible] =
    useState(false);
  const [gameEndModalVisible, setGameEndModalVisible] = useState(false);
  const [gameResult, setGameResult] = useState<'won' | 'lost' | null>(null);
  const [allowanceAmount, setAllowanceAmount] = useState(0);
  const [showStudySubjects, setShowStudySubjects] = useState(false);
  const [unlockedHallPasses, setUnlockedHallPasses] = useState<string[]>([]);

  // Set afternoon flavor text when component loads and track active view
  useEffect(() => {
    setEvent('AFTERNOON');
    // Track that user is now in after-school view
    setLastActiveView('after-school');
  }, [setEvent, setLastActiveView]);

  // Start copilot tutorial on first after-school visit
  useEffect(() => {
    if (day === 1) {
      console.log('🎯 After school day 1 - checking tutorial status:', {
        day,
        tutorialStarted,
      });

      if (!tutorialStarted) {
        // Small delay to ensure UI is ready
        const timeoutId = setTimeout(() => {
          console.log('🎯 Starting after-school copilot tutorial');
          setTutorialStarted(true);
          start();
        }, 1000);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [day, start, tutorialStarted]);

  // Handle copilot events
  useEffect(() => {
    if (!copilotEvents) return;

    copilotEvents.on('stop', () => {
      setTutorialStarted(true); // Prevent restart
    });
  }, [copilotEvents]);

  const handleStudy = () => {
    if (hasStudiedTonight) {
      return; // Don't show subjects if already studied
    }
    setShowStudySubjects(true);
  };

  const handleSubjectSelect = (subject: string) => {
    if (hasStudiedTonight) {
      return;
    }

    console.log(`Starting ${subject} minigame...`);

    // Navigate to specific minigame based on subject
    switch (subject) {
      case 'Math':
        router.push('/math-game');
        break;
      case 'Gym':
        router.push('/history-game');
        break;
      case 'Cooking':
        router.push('/home-ec-game');
        break;
      case 'Economy':
        router.push('/economy-game');
        break;
      case 'Logic':
        router.push('/logic-game');
        break;
      case 'Recess':
        router.push('/recess-game');
        break;
      case 'Comp Sci':
        router.push('/computer-game');
        break;
      case 'Art':
        router.push('/art-game');
        break;
      default:
        setShowStudySubjects(false);
    }
  };

  const handleBackToOptions = () => {
    setShowStudySubjects(false);
  };

  const handleStashMoney = () => {
    router.push('/(tabs)/piggy-bank');
  };

  const handleGoDeli = () => {
    router.push('/(tabs)/deli');
  };

  const handleGoToSleep = () => {
    // Show confirmation modal instead of immediately ending the day
    setSleepConfirmModalVisible(true);
  };

  // DEBUG: Temporary button to test hasStudiedTonight state
  const handleDebugReset = () => {
    console.log('🔧 DEBUG: Manual reset of hasStudiedTonight state');
    startAfterSchool(); // This should reset hasStudiedTonight to false
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

    // Check if this is the end of day 5 (game should end after 5 days)
    // We check for day === 5 because we're currently at the end of day 5
    if (day >= 5) {
      console.log('🎯 Game End: 5 days completed, checking win/lose condition');

      // Calculate final score (balance + stashedAmount)
      const finalScore = balance + stashedAmount;
      console.log(
        '🎯 Final Score:',
        finalScore,
        '(balance:',
        balance,
        '+ stashed:',
        stashedAmount,
        ')'
      );

      // Player wins if they have saved enough for the adoption fee
      const hasWon = stashedAmount >= adoptionFee;
      console.log(
        `🎯 Player ${hasWon ? 'WON' : 'LOST'} - Saved: $${stashedAmount}, Needed: $${adoptionFee}`
      );

      setGameResult(hasWon ? 'won' : 'lost');

      // Track game completion in scoreboard
      await trackGameCompleted();
      console.log('🎯 Game completion tracked in scoreboard');

      // Check for Hall Pass unlocks regardless of win/lose (some unlocks are based on achievements)
      try {
        const gameStats = {
          completions: 1, // This would need to be tracked from a persistent store
          finalProfit: balance + stashedAmount,
          difficulty: difficultyLevel || 1,
          completionTime: undefined, // Would need to track game start time
          perfectAttendance: false, // Would need to track attendance
          studyStreak: false, // Would need to track study streak
          noJokers: jokers.length === 0,
          totalCandySold: totalCandiesSold,
          hasWon, // Pass win status for conditional unlocks
        };

        const minigameTrackingData = {
          hasPlayedAllMinigames,
        };
        const newUnlocks = checkUnlockRequirements(
          gameStats,
          minigameTrackingData
        );

        console.log(
          '🎖️ Checking hall pass unlocks - found:',
          newUnlocks.length,
          'unlocks'
        );
        if (newUnlocks.length > 0) {
          console.log('🎖️ Hall Passes unlocked:', newUnlocks);
          setUnlockedHallPasses(newUnlocks);
        } else {
          setUnlockedHallPasses([]);
        }
      } catch (error) {
        console.error('❌ Error checking Hall Pass unlocks:', error);
        setUnlockedHallPasses([]);
      }

      // Show game end modal
      setGameEndModalVisible(true);

      // Clear game state so there's no continue option available after game ends
      setIsInitialized(false);
      console.log(
        '🎯 Game state cleared - no continue option will be available'
      );

      return; // Don't start a new day, game is over
    }

    // Reset daily stats and start new day (only if game hasn't ended)
    resetDailyStats();
    console.log('🌙 AfterSchool: Daily stats reset, calling startNewDay...');
    // Start new day (this will exit after-school mode and increment to next day)
    startNewDay();
    console.log('🌙 AfterSchool: startNewDay completed, navigating to market');
    // Navigate back to market (school)
    router.push('/(tabs)/market');
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

  const options = useMemo(
    () => [
      {
        id: 'study',

        title: 'Study at Home',
        desc: hasStudiedTonight
          ? "You've already studied tonight. Rest up!"
          : 'Cozy up with your books by the warm lamplight',
        onPress: () => handleStudy(),
        disabled: hasStudiedTonight,
      },
      {
        id: 'stash',
        title: 'Go to Your Stash',
        desc: 'Make sure no one is following you',
        onPress: () => handleStashMoney(),
      },
      {
        id: 'deli',
        title: 'Visit the Corner Deli',
        desc: 'Walk to the neighborhood store',
        onPress: () => handleGoDeli(),
      },
      {
        id: 'sleep',
        title: 'Go to Sleep',
        desc: 'Rest up and start a new day at school tomorrow',
        onPress: () => handleGoToSleep(),
      },
    ],
    [hasStudiedTonight, handleStudy]
  );

  const renderMainOptions = useMemo(() => {
    const shouldShowTutorial = day === 1;

    const stepConfigs: Record<
      string,
      { order: number; name: string; text: string }
    > = {
      study: {
        order: 1,
        name: 'study_step',
        text: 'Study at Home: play mini-games to win jokers with auras or instant abilities, knowledge is power!',
      },
      stash: {
        order: 2,
        name: 'stash_step',
        text: 'Go to Your Stash: stash your money away for the pet fund, a dollar saved is a dollar earned',
      },
      deli: {
        order: 3,
        name: 'deli_step',
        text: 'Visit the Corner Deli: come shoot the breeze and hang out, you can always find fair priced candy around the corner!',
      },
      sleep: {
        order: 4,
        name: 'sleep_step',
        text: 'Go to Sleep: End the day, get your daily allowance, and start fresh tomorrow at school. We rest to travel further!',
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
        return (
          <CopilotStep
            key={`step-${item.id}`}
            text={stepConfig.text}
            order={stepConfig.order}
            name={stepConfig.name}
          >
            {button}
          </CopilotStep>
        );
      }

      return button;
    });
  }, [options, day]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#2a1845" />

      <ImageBackground
        source={require('../../assets/images/evening-street.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <GameHUD
          theme="evening"
          customHeaderText={`After School - Day ${day}`}
          customLocationText="Peaceful Evening"
        />

        <View style={styles.optionsContainer}>
          {showStudySubjects ? (
            // Study subjects view
            <View style={styles.studyContainer}>
              <View style={styles.studyHeader}>
                {hasStudiedTonight && (
                  <Text style={styles.alreadyStudiedText}>
                    📚 You&apos;ve already studied tonight! Rest up for
                    tomorrow.
                  </Text>
                )}
              </View>

              <View style={styles.subjectsContainer}>
                {/* First Row - 4 subjects */}
                <View style={styles.subjectsRow}>
                  {subjects.slice(0, 4).map((subject) => (
                    <PixelBorder
                      key={subject.name}
                      borderColor={
                        hasStudiedTonight ? '#999' : subject.color.border
                      }
                      borderWidth={3}
                      backgroundColor={
                        hasStudiedTonight ? '#ccc' : subject.color.bg
                      }
                      innerPadding={0}
                      style={styles.subjectButtonWrapper}
                    >
                      <TouchableOpacity
                        style={[
                          styles.subjectButtonInner,
                          hasStudiedTonight && styles.disabledSubjectButton,
                        ]}
                        onPress={() => handleSubjectSelect(subject.name)}
                        disabled={hasStudiedTonight}
                      >
                        <Text
                          style={[
                            styles.subjectText,
                            hasStudiedTonight && styles.disabledText,
                          ]}
                        >
                          {subject.name}
                        </Text>
                      </TouchableOpacity>
                    </PixelBorder>
                  ))}
                </View>

                {/* Second Row - 4 subjects */}
                <View style={styles.subjectsRow}>
                  {subjects.slice(4, 8).map((subject) => (
                    <PixelBorder
                      key={subject.name}
                      borderColor={
                        hasStudiedTonight ? '#999' : subject.color.border
                      }
                      borderWidth={3}
                      backgroundColor={
                        hasStudiedTonight ? '#ccc' : subject.color.bg
                      }
                      innerPadding={0}
                      style={styles.subjectButtonWrapper}
                    >
                      <TouchableOpacity
                        style={[
                          styles.subjectButtonInner,
                          hasStudiedTonight && styles.disabledSubjectButton,
                        ]}
                        onPress={() => handleSubjectSelect(subject.name)}
                        disabled={hasStudiedTonight}
                      >
                        <Text
                          style={[
                            styles.subjectText,
                            hasStudiedTonight && styles.disabledText,
                          ]}
                        >
                          {subject.name}
                        </Text>
                      </TouchableOpacity>
                    </PixelBorder>
                  ))}
                </View>
              </View>

              <PixelBorder
                borderColor="#f7e98e"
                borderWidth={3}
                backgroundColor="rgba(90,99,127, 0.8)"
                innerPadding={0}
                style={{ marginBottom: 20 }}
              >
                <TouchableOpacity
                  style={styles.backButtonInner}
                  onPress={handleBackToOptions}
                >
                  <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
              </PixelBorder>
            </View>
          ) : (
            // Main options view
            <View style={styles.optionsGrid}>{renderMainOptions}</View>
          )}
        </View>
      </ImageBackground>

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
        onRestart={handleGameRestart}
        onClose={handleGameEndModalClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2a1845', // Fallback color
  },
  backgroundImage: {
    flex: 1,
  },
  optionsContainer: {
    flex: 1,
    paddingTop: 20,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
  },
  gridButton: {
    width: 150,
    height: 150,
    borderRadius: 12,
    backgroundColor: 'rgba(90,99,127, 0.8)',
    borderWidth: 3,
    borderColor: '#f7e98e',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#f7e98e',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 12,
  },
  buttonSubtext: {
    fontSize: 12,
    fontWeight: '400',
    color: '#ffffff',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    lineHeight: 12,
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
    color: '#666',
  },
  debugButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginTop: 10,
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Study subjects styles
  studyContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  studyHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  studyTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f7e98e',
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(247,233,142,0.4)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
    marginBottom: 8,
    textAlign: 'center',
  },
  alreadyStudiedText: {
    fontSize: 14,
    color: '#b8a9c9',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  subjectsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  subjectsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  subjectButton: {
    height: 80,
    width: 80,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subjectButtonWrapper: {
    height: 80,
    width: 80,
    margin: 5,
  },
  subjectButtonInner: {
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  disabledSubjectButton: {
    opacity: 0.5,
  },
  subjectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2a1845',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: 'rgba(90,99,127, 0.8)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f7e98e',
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 20,
    shadowColor: '#2d1b3d',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  backButtonInner: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
  },
  backButtonText: {
    color: '#f7e98e',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    textShadowColor: 'rgba(125,125,125,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  gridButtonWrapper: {
    width: 150,
    height: 150,
    marginBottom: 10,
  },
  gridButtonInner: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: 8,
  },
});

// Wrap with CopilotProvider
function AfterSchoolPageWithCopilot() {
  return (
    <CopilotProvider
      overlay="svg"
      androidStatusBarVisible={false}
      backdropColor="rgba(0, 0, 0, 0.4)"
      animated={false}
      animationDuration={100}
      labels={{
        previous: 'Previous',
        next: 'Next',
        skip: 'Skip',
        finish: 'Finish',
      }}
      stepNumberComponent={() => null}
    >
      <AfterSchoolPage />
    </CopilotProvider>
  );
}

export default React.memo(AfterSchoolPageWithCopilot);
