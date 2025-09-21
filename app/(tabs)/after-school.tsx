import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
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
import { useDailyStats } from '../../src/hooks/useDailyStats';
import { useFlavorText } from '../../src/context/FlavorTextContext';
import { useGame } from '../../src/hooks/useGame';
import { useJokers } from '../../src/hooks/useJokers';
import { useScoreboard } from '../../src/hooks/useScoreboard';
import { useWallet } from '../../src/hooks/useWallet';
import GameEndModal from '../components/GameEndModal';
import GameHUD from '../components/GameHUD';
import GoingToSchoolModal from '../components/GoingToSchoolModal';
import SleepConfirmModal from '../components/SleepConfirmModal';

const CopilotTouchableOpacity = walkthroughable(TouchableOpacity);

function AfterSchoolPage() {
  const {
    day,
    startNewDay,
    hasStudiedTonight,
    periodCount,
    setLastActiveView,
    markStudiedTonight,
    startAfterSchool,
  } = useGame();

  console.log('🌅 AfterSchoolPage: hasStudiedTonight =', hasStudiedTonight);

  // Force reset hasStudiedTonight when entering after-school to prevent stale state
  useEffect(() => {
    console.log('🌅 AfterSchoolPage: Component mounted/focused, ensuring hasStudiedTonight is correct');
    // Safety net: When first entering after-school, the study button should always be available
    // This ensures the state is correct regardless of timing issues
    if (hasStudiedTonight) {
      console.log('🌅 AfterSchoolPage: hasStudiedTonight is true - calling startAfterSchool to fix this');
      // Call startAfterSchool to reset the state properly
      startAfterSchool();
    } else {
      console.log('🌅 AfterSchoolPage: hasStudiedTonight is correctly false');
    }
  }, []); // Only run on mount

  // Track hasStudiedTonight changes
  useEffect(() => {
    console.log('🌅 AfterSchoolPage: hasStudiedTonight changed to:', hasStudiedTonight);
  }, [hasStudiedTonight]);
  const { resetDailyStats } = useDailyStats();
  const { balance, stashedAmount, addAllowance, difficultyLevel } = useWallet();
  const { jokers } = useJokers();
  const { setEvent } = useFlavorText();
  const { trackGameCompleted } = useScoreboard();
  const { start, copilotEvents } = useCopilot();
  const [tutorialStarted, setTutorialStarted] = useState(false);
  const [sleepConfirmModalVisible, setSleepConfirmModalVisible] =
    useState(false);
  const [goingToSchoolModalVisible, setGoingToSchoolModalVisible] =
    useState(false);
  const [gameEndModalVisible, setGameEndModalVisible] = useState(false);
  const [gameResult, setGameResult] = useState<'won' | 'lost' | null>(null);
  const [allowanceAmount, setAllowanceAmount] = useState(0);

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

    const stopListener = copilotEvents.on('stop', () => {
      setTutorialStarted(true); // Prevent restart
    });

    return () => {
      if (stopListener && stopListener.remove) {
        stopListener.remove();
      }
    };
  }, [copilotEvents]);

  const handleStudy = () => {
    if (hasStudiedTonight) {
      return; // Don't navigate if already studied
    }
    router.push('/(tabs)/study');
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

  const handleGoingToSchoolComplete = async () => {
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

      // Player wins if they have paid off all debt (stashedAmount >= 0)
      const hasWon = stashedAmount >= 0;
      console.log('🎯 Player', hasWon ? 'WON' : 'LOST');

      setGameResult(hasWon ? 'won' : 'lost');

      // Track game completion in scoreboard
      await trackGameCompleted();
      console.log('🎯 Game completion tracked in scoreboard');

      // Show game end modal
      setGameEndModalVisible(true);
      return; // Don't start a new day, game is over
    }

    // Reset daily stats and start new day (only if game hasn't ended)
    resetDailyStats(balance);
    console.log('🌙 AfterSchool: Daily stats reset, calling startNewDay...');
    // Start new day (this will exit after-school mode and increment to next day)
    startNewDay();
    console.log('🌙 AfterSchool: startNewDay completed, navigating to market');
    // Navigate back to market (school)
    router.push('/(tabs)/market');
  };

  const handleSleepCancel = () => {
    // Just close the modal
    setSleepConfirmModalVisible(false);
  };

  const handleGameRestart = () => {
    // Close game end modal and navigate to title screen
    setGameEndModalVisible(false);
    setGameResult(null);
    router.push('/title-screen');
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
        desc: 'Take an evening stroll to the neighborhood store',
        onPress: () => handleGoDeli(),
      },
      {
        id: 'sleep',
        title: 'Go to Sleep',
        desc: 'Rest up and start a new day at school tomorrow',
        onPress: () => handleGoToSleep(),
      },
    ],
    [hasStudiedTonight]
  );

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
          <View style={styles.optionsGrid}>
            {useMemo(() => {
              const shouldShowTutorial = day === 1;

              const stepConfigs = {
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

                // Create button component once
                const ButtonComponent =
                  shouldShowTutorial && stepConfig
                    ? CopilotTouchableOpacity
                    : TouchableOpacity;

                const button = (
                  <ButtonComponent
                    key={item.id}
                    style={[
                      styles.circleOption,
                      item.disabled && styles.disabledCircle,
                    ]}
                    onPress={item.disabled ? undefined : item.onPress}
                    disabled={item.disabled}
                  >
                    <Text
                      style={[
                        styles.circleTitle,
                        item.disabled && styles.disabledText,
                      ]}
                    >
                      {item.title}
                    </Text>
                  </ButtonComponent>
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
            }, [options, day])}
          </View>
        </View>
        <View style={styles.buttonContainer}>
          {/* DEBUG: Temporary button to test state reset */}
          {hasStudiedTonight && (
            <TouchableOpacity style={styles.debugButton} onPress={handleDebugReset}>
              <Text style={styles.debugButtonText}>🔧 DEBUG: Reset Study State</Text>
            </TouchableOpacity>
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
        difficultyLevel={difficultyLevel || 1}
        onRestart={handleGameRestart}
        onClose={() => setGameEndModalVisible(false)}
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
  circleOption: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(90,99,127, 0.8)',
    borderWidth: 3,
    borderColor: '#f7e98e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#2d1b3d',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  circleEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  circleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f7e98e',
    textAlign: 'center',
    fontFamily: 'CrayonPastel',
    textShadowColor: 'rgba(125,125,125,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    paddingHorizontal: 8,
  },
  disabledCircle: {
    opacity: 0.5,
    backgroundColor: 'rgba(93, 76, 112, 0.4)',
  },
  disabledEmoji: {
    opacity: 0.6,
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
