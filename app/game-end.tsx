import { CommonActions, useNavigation } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import React, { useEffect } from 'react';
import {
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import colors from '../src/constants/colors';
import { formatCurrency } from '../src/utils/priceUtils';
import { useDailyStats } from '../src/hooks/useDailyStats';
import { useGame } from '../src/hooks/useGame';
import { useHallPass } from '../src/hooks/useHallPass';
import { useJokers } from '../src/hooks/useJokers';
import { useMinigameTracking } from '../src/hooks/useMinigameTracking';
import { useWallet } from '../src/hooks/useWallet';
import { scoreboardService } from '../src/services/firebase';
import { useAppDispatch, useAppSelector } from '../src/store/hooks';
import {
  getPeriodsPerDay,
  setTotalCompletions,
} from '../src/store/slices/gameSlice';
import { resetLocalAnalytics } from '../src/store/slices/localAnalyticsSlice';
import { setWonDifficulties } from '../src/store/slices/scoreboardSlice';
import { setCachedUserObject } from '../src/store/slices/userObjectSlice';
import { forceSave } from '../src/store/store';
import { MusicController } from '../src/utils/musicController';
import PixelBorder from './components/PixelBorder';
import TextWithEmojis from './components/TextWithEmojis';

export default function GameEndScreen() {
  const { balance, stashedAmount, adoptionFee, difficultyLevel } = useWallet();
  const { jokers } = useJokers();
  const {
    getTotalStats,
    getPlaythroughStats,
    getBestSale,
    getMostSoldCandy,
    resetPlaythrough,
  } = useDailyStats();
  const { resetGame, fullResetGame, periodCount } = useGame();
  const {
    allPasses,
    unlockedPasses,
    newlyUnlockedPasses,
    clearNewlyUnlocked,
    checkUnlockRequirements,
  } = useHallPass();
  const { hasPlayedAllMinigames, playedMinigames } = useMinigameTracking();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const localAnalytics = useAppSelector((state) => state.localAnalytics);
  const reduxUserObject = useAppSelector(
    (state) => state.userObject.cachedUser
  );
  const periodsPerDay = useAppSelector((state) => getPeriodsPerDay(state));
  const candySalesState = useAppSelector((state) => state.candySales);

  const totalStats = getTotalStats();
  const playthroughStats = getPlaythroughStats();
  const bestSale = getBestSale();
  const mostSoldCandy = getMostSoldCandy();
  const finalScore = balance + stashedAmount;
  // Win condition: paid off the debt (stashedAmount >= 0)
  // The game starts with stashedAmount = -adoptionFee (negative = debt)
  const gameResult = finalScore >= 0 ? 'won' : 'lost';

  // Track total wins from Firebase for hall pass progress
  const [totalWinCount, setTotalWinCount] = React.useState(0);

  // Play results music when screen loads
  useEffect(() => {
    if (__DEV__) console.log('🎵 [GAME-END] Setting results music');
    MusicController.setTrack('results');
  }, []);

  // Helper function to get hall pass progress
  const getHallPassProgress = (passId: string) => {
    switch (passId) {
      case 'no_longer_freshman':
        return { current: totalWinCount, required: 1, label: 'wins' };
      case 'sophomore_swagger':
        return { current: totalWinCount, required: 3, label: 'wins' };
      case 'junior_genius':
        return {
          current: finalScore,
          required: 100000,
          label: 'profit*',
          isThisGame: true,
        };
      case 'senior_executive':
        return { current: totalWinCount, required: 5, label: 'wins' };
      case 'valedictorian_vendor':
        return {
          current: playedMinigames.length,
          required: 9,
          label: 'minigames',
        };
      case 'candy_kingpin':
        return { current: totalWinCount, required: 10, label: 'wins' };
      case 'forged_pass':
        return {
          current: jokers.length,
          required: 8,
          label: 'jokers*',
        };
      case 'minimalist_master':
        return {
          current: jokers.length === 0 && gameResult === 'won' ? 1 : 0,
          required: 1,
          label:
            jokers.length === 0 && gameResult === 'won'
              ? 'Achieved!'
              : 'Used jokers',
          isBoolean: true,
        };
      case 'high_roller':
        return {
          current: playthroughStats?.totalCandiesSold || 0,
          required: 1000,
          label: 'candies*',
        };
      case 'perfect_scholar':
        return {
          current: difficultyLevel >= 6 && gameResult === 'won' ? 1 : 0,
          required: 1,
          label:
            difficultyLevel >= 6 && gameResult === 'won'
              ? 'Achieved!'
              : `Difficulty ${difficultyLevel} (need 6+)`,
          isBoolean: true,
        };
      case 'teachers_pet':
        return {
          current: playthroughStats?.confiscationCount || 0,
          required: 3,
          label: 'confiscations*',
        };
      case 'finance_club':
        return {
          current: Math.max(0, stashedAmount),
          required: 35000,
          label: 'stashed*',
          isThisGame: true,
        };
      case 'maximalist':
        return {
          current: playthroughStats?.maxDepositsCount || 0,
          required: 4,
          label: 'max deposits*',
        };
      case 'inheritance':
        return {
          current: Math.max(0, stashedAmount),
          required: 50000,
          label: 'stashed*',
          isThisGame: true,
        };
      case 'time_crunch': {
        const totalProfit = finalScore + adoptionFee; // Total profit = final score + debt paid
        const earlyPercent =
          totalProfit > 0
            ? (candySalesState.earlyPeriodProfit / totalProfit) * 100
            : 0;
        return {
          current: Math.round(earlyPercent),
          required: 50,
          label: 'early profit*',
          isThisGame: true,
          isPercentage: true,
        };
      }
      case 'final_exam': {
        const totalProfit = finalScore + adoptionFee; // Total profit = final score + debt paid
        const latePercent =
          totalProfit > 0
            ? (candySalesState.latePeriodProfit / totalProfit) * 100
            : 0;
        return {
          current: Math.round(latePercent),
          required: 50,
          label: 'late profit*',
          isThisGame: true,
          isPercentage: true,
        };
      }
      default:
        return { current: 0, required: 1, label: 'unknown' };
    }
  };

  // Check for hall pass unlocks when screen loads
  useEffect(() => {
    const checkHallPassUnlocks = async () => {
      if (__DEV__) console.log('🎯 Game End Screen: Checking hall pass unlocks');

      // Clear any previously newly unlocked passes from last session
      // This ensures we only show passes unlocked in THIS game
      clearNewlyUnlocked();
      if (__DEV__) console.log('🎓 Cleared previously newly unlocked passes');

      const hasWon = finalScore >= 0;

      try {
        // Ensure Firebase is initialized first
        await scoreboardService.initializeAuth();

        // Get cached user object from service
        let userObject = scoreboardService.getCachedUserObject();

        // If service cache is empty, restore from Redux
        if (!userObject) {
          if (__DEV__) console.log('⚠️ Service cache empty, checking Redux...');

          if (reduxUserObject) {
            if (__DEV__) console.log('✅ Restoring user object from Redux to service cache');
            scoreboardService.setCachedUserObject(reduxUserObject);
            userObject = reduxUserObject;
          } else {
            console.error('❌ User object not found in service or Redux cache');

            // Try to initialize Firebase as last resort
            if (__DEV__) console.log('🔄 Attempting to fetch user object from Firebase...');
            try {
              userObject = await scoreboardService.fetchUserObject();
              scoreboardService.setCachedUserObject(userObject);
              if (__DEV__) console.log('✅ User object loaded from Firebase:', userObject);
            } catch (error) {
              console.error('❌ Failed to fetch user object:', error);
              return;
            }
          }
        }

        if (__DEV__) console.log('📊 Current user object:', userObject);

        // Set total win count for hall pass progress display
        setTotalWinCount(userObject.totalWinCount || 0);

        // Always update played minigames (regardless of win/loss)
        const updates: any = {
          playedMinigames: playedMinigames,
        };
        if (__DEV__) console.log('🎮 Updating played minigames:', playedMinigames);

        if (hasWon) {
          if (__DEV__) console.log('🏆 Player won - updating user object...');

          // Add win-related updates
          updates.totalWinCount = userObject.totalWinCount + 1;

          // Add difficulty to won list if not already there
          if (
            difficultyLevel &&
            !userObject.difficultyWon.includes(difficultyLevel)
          ) {
            updates.difficultyWon = [
              ...userObject.difficultyWon,
              difficultyLevel,
            ];
            if (__DEV__) console.log('🏆 Adding difficulty to won list:', difficultyLevel);
          }
        } else {
          if (__DEV__) console.log('😢 Player lost - saving minigame progress only');
        }

        // Update local cache
        scoreboardService.updateLocalUserObject(updates);

        // Save to Firebase
        const updatedUserObject = scoreboardService.getCachedUserObject();
        if (updatedUserObject) {
          await scoreboardService.saveUserObject(updatedUserObject);
          if (__DEV__) console.log('✅ User object saved to Firebase:', updatedUserObject);

          // Update Redux (persisted across app restarts)
          dispatch(setCachedUserObject(updatedUserObject));
          dispatch(setTotalCompletions(updatedUserObject.totalWinCount));
          dispatch(setWonDifficulties(updatedUserObject.difficultyWon));
        }

        // Batch update universal analytics to Firebase
        if (__DEV__) {
          console.log('📊 Syncing local analytics to Firebase...');
          console.log('📊 Jokers obtained:', localAnalytics.jokersObtained);
          console.log('📊 Minigames played:', localAnalytics.minigamesPlayed);
        }

        // Update joker stats
        if (Object.keys(localAnalytics.jokersObtained).length > 0) {
          await scoreboardService.batchUpdateJokerStats(
            localAnalytics.jokersObtained
          );
        }

        // Update minigame stats
        if (Object.keys(localAnalytics.minigamesPlayed).length > 0) {
          await scoreboardService.batchUpdateMinigameStats(
            localAnalytics.minigamesPlayed
          );
        }

        // Reset local analytics for next game
        dispatch(resetLocalAnalytics());
        if (__DEV__) console.log('✅ Local analytics synced and reset');

        // Track game completion to scoreboard
        try {
          const day = Math.floor((periodCount - 1) / periodsPerDay) + 1;
          const estimatedMinutes =
            periodsPerDay === 6 ? periodCount * 4 : periodCount * 5;
          await scoreboardService.trackGameCompletion(
            balance,
            difficultyLevel?.toString() || '1',
            day,
            updatedUserObject?.playerName || 'Player',
            playthroughStats?.totalProfit || 0,
            playthroughStats?.totalCandiesSold || 0,
            jokers.length,
            estimatedMinutes, // Approximate minutes (4 min for 6-period days, 5 min for 8-period days)
            periodCount
          );
          if (__DEV__) console.log('✅ Game completion tracked to scoreboard');
        } catch (error) {
          console.error('❌ Failed to track game completion:', error);
        }
      } catch (error) {
        console.error('❌ Error updating user object:', error);
      }

      // Check for newly unlocked Hall Passes
      try {
        const userObject = scoreboardService.getCachedUserObject();
        if (!userObject) {
          console.error('❌ User object not available for hall pass checks');
          return;
        }

        const gameStats = {
          completions: userObject.totalWinCount,
          finalProfit: finalScore,
          difficulty: difficultyLevel || 1,
          completionTime: periodCount,
          totalCandySold: playthroughStats?.totalCandiesSold || 0,
          noJokers: jokers.length === 0,
          confiscationCount: playthroughStats?.confiscationCount || 0,
          stashedAmount: stashedAmount,
          jokerCount: jokers.length,
          maxDepositsCount: playthroughStats?.maxDepositsCount || 0,
          earlyPeriodProfit: candySalesState.earlyPeriodProfit,
          latePeriodProfit: candySalesState.latePeriodProfit,
          transactionCount: candySalesState.transactionCount,
        };

        if (__DEV__) {
          console.log('🎓 Checking hall pass unlocks with gameStats:', gameStats);
          console.log('🎓 Minigame tracking data:', {
            hasPlayedAllMinigames: hasPlayedAllMinigames,
            playedMinigames: playedMinigames,
            playedCount: playedMinigames.length,
          });
        }

        const unlocked = checkUnlockRequirements(gameStats, {
          hasPlayedAllMinigames: hasPlayedAllMinigames,
        });
        if (__DEV__) console.log('🎓 Newly unlocked Hall Passes:', unlocked);

        if (unlocked.length > 0) {
          if (__DEV__) console.log(`🎓 ${unlocked.length} hall pass(es) were unlocked!`);

          // Get current unlocked passes from Redux
          const currentUnlockedPassIds = unlockedPasses.map((p) => p.id);
          if (__DEV__) console.log('🎓 Current unlocked passes:', currentUnlockedPassIds);

          // Merge with newly unlocked (avoid duplicates)
          const allUnlockedPassIds = [
            ...new Set([...currentUnlockedPassIds, ...unlocked]),
          ];
          if (__DEV__) console.log('🎓 All unlocked passes:', allUnlockedPassIds);

          // Update user object with hall passes
          scoreboardService.updateLocalUserObject({
            unlockedHallPasses: allUnlockedPassIds,
          });

          // Save to Firebase
          const updatedUserObject = scoreboardService.getCachedUserObject();
          if (updatedUserObject) {
            await scoreboardService.saveUserObject(updatedUserObject);
            if (__DEV__) console.log(
              '✅ Hall passes synced to Firebase:',
              updatedUserObject.unlockedHallPasses
            );

            // Update Redux
            dispatch(setCachedUserObject(updatedUserObject));
          }

          // Force save Redux persist
          forceSave();
        }
      } catch (error) {
        console.error('❌ Error checking Hall Pass unlocks:', error);
      }
    };

    checkHallPassUnlocks();
  }, []); // Empty deps - only run once when screen loads

  // Get dog breed and image based on difficulty level
  const getDogBreed = (level: number) => {
    switch (level) {
      case 1:
        return 'Rock';
      case 2:
        return 'Peg the Pug';
      case 3:
        return 'Hamster';
      case 4:
        return 'Brussels Griffon';
      case 5:
        return 'Clownfish';
      case 6:
        return 'Evee Cat';
      case 7:
        return 'Chicken';
      case 8:
        return 'Byul Terrier';
      case 9:
        return 'Parrot';
      case 10:
        return 'Cane Corso';
      case 11:
        return 'Bearded Dragon';
      case 12:
        return 'Pitbull';
      case 13:
        return 'Pet Horse';
      case 14:
        return 'Afghan Hound';
      case 15:
        return 'German Shepherd';
      case 16:
        return 'Dragon';
      default:
        return 'Rock';
    }
  };

  const getDogImage = (level: number) => {
    switch (level) {
      case 1:
        return require('../assets/images/doggs/rock.png');
      case 2:
        return require('../assets/images/doggs/pug.png');
      case 3:
        return require('../assets/images/doggs/hamster.png');
      case 4:
        return require('../assets/images/doggs/brussleGriffon.png');
      case 5:
        return require('../assets/images/doggs/clownfish.png');
      case 6:
        return require('../assets/images/doggs/evee.png');
      case 7:
        return require('../assets/images/doggs/chicken.png');
      case 8:
        return require('../assets/images/doggs/byul.png');
      case 9:
        return require('../assets/images/doggs/parrot.png');
      case 10:
        return require('../assets/images/doggs/caneCorso.png');
      case 11:
        return require('../assets/images/doggs/beardedDragon.png');
      case 12:
        return require('../assets/images/doggs/pitbull.png');
      case 13:
        return require('../assets/images/doggs/petHorse.png');
      case 14:
        return require('../assets/images/doggs/afghan.png');
      case 15:
        return require('../assets/images/doggs/germanShepard.png');
      case 16:
        return require('../assets/images/doggs/dragon.png');
      default:
        return require('../assets/images/doggs/rock.png');
    }
  };

  // Fallback to level 1 if difficultyLevel is null
  const safeDifficultyLevel = difficultyLevel ?? 1;
  const dogBreed = getDogBreed(safeDifficultyLevel);
  const dogImage = getDogImage(safeDifficultyLevel);

  // Get difficulty name
  const getDifficultyName = (level: number) => {
    switch (level) {
      case 1:
        return 'Tutorial';
      case 2:
        return 'Easy';
      case 3:
        return 'Simple';
      case 4:
        return 'Normal';
      case 5:
        return 'Medium';
      case 6:
        return 'Hard';
      case 7:
        return 'Challenging';
      case 8:
        return 'Expert';
      case 9:
        return 'Difficult';
      case 10:
        return 'Master';
      case 11:
        return 'Extreme';
      case 12:
        return 'Insane';
      case 13:
        return 'Brutal';
      case 14:
        return 'Nightmare';
      case 15:
        return 'Hell';
      case 16:
        return 'Impossible';
      default:
        return 'Unknown';
    }
  };

  const difficultyName = getDifficultyName(difficultyLevel);

  const handleViewLeaderboard = () => {
    router.push('/leaderboard');
  };

  const handlePlayAgain = () => {
    clearNewlyUnlocked(); // Clear the newly unlocked list for next playthrough
    resetPlaythrough(); // Clear playthrough stats for next game
    fullResetGame(); // Full reset including isInitialized to disable "Continue" button

    // Note: We don't clear user object cache here because it contains
    // persistent user data like playerName that should carry over between games
    forceSave(); // Persist Redux changes to AsyncStorage

    if (__DEV__) console.log('🎮 Play Again: Resetting navigation stack to title screen');

    // Reset the entire navigation stack to only have title-screen
    // This ensures all old screen instances (including all Market instances) are unmounted
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'title-screen' }],
      })
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ImageBackground
        source={require('../assets/images/school.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.container}>
            {/* Title */}
            <PixelBorder
              borderColor={gameResult === 'won' ? '#FFB6D9' : '#FFB4B4'}
              borderWidth={4}
              backgroundColor={
                gameResult === 'won'
                  ? 'rgba(255, 230, 245, 0.95)'
                  : 'rgba(255, 235, 235, 0.95)'
              }
              innerPadding={12}
              style={styles.difficultyBadge}
            >
              <TextWithEmojis style={styles.title} imageSize={28}>
                {gameResult === 'won' ? '🎉 WOOT! 🎉' : '💸 GAME OVER 💸'}
              </TextWithEmojis>
            </PixelBorder>
            {/* Difficulty Badge */}
            <PixelBorder
              borderColor="#B5E7E3"
              borderWidth={3}
              backgroundColor="rgba(230, 250, 248, 0.95)"
              innerPadding={10}
              style={styles.difficultyBadge}
            >
              <TextWithEmojis style={styles.difficultyText} imageSize={24}>
                {`Difficulty: ${difficultyName} `}
              </TextWithEmojis>
            </PixelBorder>

            {/* Dog Section */}
            <PixelBorder
              borderColor="#FFD4A3"
              borderWidth={4}
              backgroundColor="rgba(255, 250, 240, 0.95)"
              innerPadding={20}
              style={styles.section}
            >
              <Image source={dogImage} style={styles.dogImage} />

              <Text style={styles.subtitle}>
                {gameResult === 'won'
                  ? `You saved up enough money and adopted ${dogBreed}!`
                  : `${dogBreed} has gone with another loving family`}
              </Text>
            </PixelBorder>

            {/* Final Score */}
            <PixelBorder
              borderColor="#D4A5FF"
              borderWidth={4}
              backgroundColor="rgba(245, 235, 255, 0.95)"
              innerPadding={16}
              style={styles.section}
            >
              <TextWithEmojis style={styles.sectionTitle} imageSize={30}>
                🗣️ TLDR:
              </TextWithEmojis>

              <View style={{ ...styles.statItemRow, marginTop: 12 }}>
                <TextWithEmojis style={styles.statLabelLeft} imageSize={24}>
                  💰 Balance
                </TextWithEmojis>
                <Text style={styles.statValueRight}>${formatCurrency(balance)}</Text>
              </View>

              <View style={styles.statItemRow}>
                <TextWithEmojis style={styles.statLabelLeft} imageSize={24}>
                  {stashedAmount >= 0 ? '⚖️ Savings' : '⚖️ Debt'}
                </TextWithEmojis>
                <Text style={styles.statValueRight}>
                  ${formatCurrency(Math.abs(stashedAmount))}
                </Text>
              </View>

              <View style={styles.statItemRow}>
                <TextWithEmojis style={styles.statLabelLeft} imageSize={24}>
                  {gameResult === 'won' ? '🎉 Status' : '❌ Status'}
                </TextWithEmojis>
                <Text style={styles.statValueRight}>
                  {gameResult === 'won'
                    ? 'All debt paid off!'
                    : `$${formatCurrency(Math.abs(stashedAmount) - balance)} remaining`}
                </Text>
              </View>
            </PixelBorder>

            {/* Playthrough Statistics */}
            <PixelBorder
              borderColor="#A8E6A1"
              borderWidth={4}
              backgroundColor="rgba(240, 255, 240, 0.95)"
              innerPadding={16}
              style={styles.section}
            >
              <TextWithEmojis style={styles.sectionTitle} imageSize={40}>
                🎮 Playthrough Stats
              </TextWithEmojis>

              <View style={styles.statItemRow}>
                <TextWithEmojis
                  style={{ ...styles.statLabelLeft, marginTop: 12 }}
                  imageSize={24}
                >
                  💰 Total Profit
                </TextWithEmojis>
                <Text style={styles.statValueRight}>
                  ${playthroughStats?.totalProfit != null ? formatCurrency(playthroughStats.totalProfit) : '0.00'}
                </Text>
              </View>

              <View style={styles.statItemRow}>
                <TextWithEmojis style={styles.statLabelLeft} imageSize={24}>
                  💸 Spent on Candy
                </TextWithEmojis>
                <Text style={styles.statValueRight}>
                  ${playthroughStats?.totalSpentOnCandy != null ? formatCurrency(playthroughStats.totalSpentOnCandy) : '0.00'}
                </Text>
              </View>

              <View style={styles.statItemRow}>
                <TextWithEmojis style={styles.statLabelLeft} imageSize={24}>
                  💰 Total Allowance
                </TextWithEmojis>
                <Text style={styles.statValueRight}>
                  ${playthroughStats?.totalAllowance != null ? formatCurrency(playthroughStats.totalAllowance) : '0.00'}
                </Text>
              </View>

              <View style={styles.statItemRow}>
                <TextWithEmojis style={styles.statLabelLeft} imageSize={24}>
                  🍬 Candies Sold
                </TextWithEmojis>
                <Text style={styles.statValueRight}>
                  {playthroughStats?.totalCandiesSold || 0}
                </Text>
              </View>

              {mostSoldCandy && (
                <View style={styles.statItemRow}>
                  <TextWithEmojis style={styles.statLabelLeft} imageSize={24}>
                    🏆 Most Sold Candy
                  </TextWithEmojis>
                  <Text style={styles.statValueRight}>
                    {mostSoldCandy.candy} ({mostSoldCandy.count})
                  </Text>
                </View>
              )}

              {bestSale && (
                <View style={styles.statItemRow}>
                  <TextWithEmojis style={styles.statLabelLeft} imageSize={24}>
                    💎 Best Single Sale
                  </TextWithEmojis>
                  <Text style={styles.statValueRight}>
                    {bestSale.candyName} (+${formatCurrency(bestSale.profit)})
                  </Text>
                </View>
              )}
            </PixelBorder>

            {/* Merchant Items Purchased */}
            {playthroughStats?.merchantPurchases &&
              playthroughStats.merchantPurchases.length > 0 && (
                <PixelBorder
                  borderColor="#FFD700"
                  borderWidth={4}
                  backgroundColor="rgba(255, 250, 205, 0.95)"
                  innerPadding={16}
                  style={styles.section}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      minWidth: '100%',
                      marginBottom: 12,
                    }}
                  >
                    <Image
                      source={require('../assets/images/icons/merchant.png')}
                      style={{
                        width: 32,
                        height: 32,
                        resizeMode: 'contain',
                        marginRight: 8,
                      }}
                    />
                    <TextWithEmojis style={styles.sectionTitle} imageSize={30}>
                      Merchant Items (
                      {playthroughStats.merchantPurchases.length})
                    </TextWithEmojis>
                  </View>

                  <View style={styles.merchantGrid}>
                    {(() => {
                      // Filter to show only the highest level of each item
                      const highestLevelItems =
                        playthroughStats.merchantPurchases.reduce(
                          (acc, purchase) => {
                            const existing = acc.find(
                              (p) => p.itemId === purchase.itemId
                            );
                            if (
                              !existing ||
                              (purchase.level &&
                                existing.level &&
                                purchase.level > existing.level)
                            ) {
                              return [
                                ...acc.filter(
                                  (p) => p.itemId !== purchase.itemId
                                ),
                                purchase,
                              ];
                            }
                            return acc;
                          },
                          [] as typeof playthroughStats.merchantPurchases
                        );

                      return highestLevelItems.map((purchase, index) => (
                        <PixelBorder
                          key={index}
                          borderColor="#DAA520"
                          borderWidth={2}
                          backgroundColor="rgba(255, 245, 220, 0.8)"
                          innerPadding={8}
                          style={styles.merchantItem}
                        >
                          <Image
                            source={(() => {
                              const iconMap: Record<string, any> = {
                                fake_report_card: require('../assets/images/icons/fakeReportCard.png'),
                                metal_detector: require('../assets/images/icons/metalDetector.png'),
                                hollowed_textbook: require('../assets/images/icons/hollowedBook.png'),
                                street_cred: require('../assets/images/icons/streetCred.png'),
                                double_sided_coin: require('../assets/images/icons/luckyCoin.png'),
                                influencer_shoutout: require('../assets/images/icons/influencerShoutout.png'),
                                hall_monitor_bribe: require('../assets/images/icons/bribe.png'),
                                sixth_grade_bodyguard: require('../assets/images/icons/bodyguard.png'),
                                air_delivery_drone: require('../assets/images/icons/drone.png'),
                              };
                              return iconMap[purchase.itemId];
                            })()}
                            style={{
                              width: 24,
                              height: 24,
                              resizeMode: 'contain',
                              marginBottom: 4,
                              alignSelf: 'center',
                            }}
                          />
                          <Text style={styles.merchantItemText}>
                            {purchase.itemName}
                            {purchase.level && ` Lv${purchase.level}`}
                          </Text>
                          <Text style={styles.merchantItemPrice}>
                            ${(purchase.price / 1000).toFixed(1)}k
                          </Text>
                        </PixelBorder>
                      ));
                    })()}
                  </View>
                </PixelBorder>
              )}

            {/* Hall Passes Unlocked */}
            {newlyUnlockedPasses.length > 0 && (
              <PixelBorder
                borderColor="#FFE4B5"
                borderWidth={4}
                backgroundColor="rgba(255, 250, 230, 0.95)"
                innerPadding={16}
                style={styles.section}
              >
                <TextWithEmojis style={styles.sectionTitle} imageSize={30}>
                  🎖️ Hall Passes Unlocked ({newlyUnlockedPasses.length})
                </TextWithEmojis>

                <View style={styles.hallPassGrid}>
                  {newlyUnlockedPasses.map((pass, index) => (
                    <PixelBorder
                      key={index}
                      borderColor="#FFD4A3"
                      borderWidth={2}
                      backgroundColor="rgba(255, 245, 220, 0.8)"
                      innerPadding={8}
                      style={styles.hallPassItem}
                    >
                      <TextWithEmojis
                        style={styles.hallPassText}
                        imageSize={12}
                      >
                        {pass.name}
                      </TextWithEmojis>
                    </PixelBorder>
                  ))}
                </View>
              </PixelBorder>
            )}

            {/* Jokers Used */}
            {jokers.length > 0 && (
              <PixelBorder
                borderColor="#E0B0FF"
                borderWidth={4}
                innerPadding={16}
                backgroundColor="rgba(250, 240, 255, 0.95)"
                style={styles.section}
              >
                <TextWithEmojis
                  style={{
                    ...styles.sectionTitle,
                  }}
                  imageSize={30}
                  numberOfLines={1}
                >
                  🃏 All Jokers Obtained
                </TextWithEmojis>

                <View style={{ ...styles.jokerGrid }}>
                  {jokers.map((joker, index) => (
                    <PixelBorder
                      key={index}
                      borderColor="#D4A5FF"
                      borderWidth={2}
                      backgroundColor="rgba(240, 220, 255, 0.8)"
                      innerPadding={8}
                      style={styles.jokerItem}
                    >
                      <TextWithEmojis style={styles.jokerText} imageSize={24}>
                        {joker.emoji} {joker.name}
                      </TextWithEmojis>
                    </PixelBorder>
                  ))}
                </View>
                <Text style={{ ...styles.subtitle, fontSize: 14 }}>
                  Try out different combinations of jokers for different play
                  styles!
                </Text>
              </PixelBorder>
            )}

            {/* Hall Pass Progress - Only show locked passes */}
            {(() => {
              if (__DEV__) {
                console.log(
                  '🎖️ Game End - allPasses count:',
                  allPasses?.length || 0
                );
                console.log(
                  '🎖️ Game End - locked passes:',
                  allPasses
                    ?.filter((pass) => !pass.isUnlocked)
                    .map((p) => p.id) || []
                );
              }
              return (
                allPasses &&
                allPasses.filter((pass) => !pass.isUnlocked).length > 0
              );
            })() && (
              <PixelBorder
                borderColor="#A3D5FF"
                borderWidth={4}
                backgroundColor="rgba(230, 245, 255, 0.95)"
                innerPadding={16}
                style={styles.section}
              >
                <TextWithEmojis style={styles.sectionTitle} imageSize={32}>
                  🎖️ Hall Pass Progress
                </TextWithEmojis>

                <View style={{ marginTop: 12 }}>
                  {allPasses
                    .filter((pass) => !pass.isUnlocked)
                    .map((pass) => {
                      const progress = getHallPassProgress(pass.id);
                      const isBoolean = (progress as any).isBoolean;
                      const isThisGame = (progress as any).isThisGame;
                      const isPercentage = (progress as any).isPercentage;

                      if (__DEV__) console.log(
                        `🎖️ Rendering progress for ${pass.id}:`,
                        progress
                      );

                      return (
                        <View key={pass.id} style={styles.statItemRow}>
                          <Text style={styles.hallPassName}>{pass.name}</Text>
                          <Text style={styles.hallPassProgress}>
                            {isBoolean
                              ? progress.label
                              : isThisGame && isPercentage
                                ? `${progress.current}%/${progress.required}% ${progress.label}`
                                : isThisGame
                                  ? `$${progress.current >= 1000 ? (progress.current / 1000).toFixed(1) + 'k' : progress.current}/$${progress.required >= 1000 ? (progress.required / 1000).toFixed(0) + 'k' : progress.required} ${progress.label}`
                                  : `${progress.current}/${progress.required} ${progress.label}`}
                          </Text>
                        </View>
                      );
                    })}
                </View>

                <Text
                  style={{
                    ...styles.subtitle,
                    fontSize: 12,
                    marginTop: 12,
                    fontStyle: 'italic',
                  }}
                >
                  *stats show current playthrough only
                </Text>
              </PixelBorder>
            )}
            {/* Leaderboard notification */}
            <PixelBorder
              borderColor="#FFD700"
              borderWidth={4}
              backgroundColor="rgba(255, 250, 205, 0.95)"
              innerPadding={16}
              style={styles.section}
            >
              <View
                style={{
                  alignItems: 'center',
                  width: '100%',
                  marginBottom: 12,
                  minWidth: '100%',
                }}
              >
                <TextWithEmojis
                  style={{
                    ...styles.leaderboardText,
                    alignSelf: 'center',
                  }}
                  imageSize={95}
                >
                  🏆
                </TextWithEmojis>
              </View>
              <Text style={styles.leaderboardText}>
                Your score has been submitted to the leaderboard!
              </Text>
            </PixelBorder>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <PixelBorder
                borderColor="#A8E6A1"
                borderWidth={3}
                backgroundColor="#B8F0B2"
                innerPadding={0}
                style={styles.buttonBorder}
              >
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleViewLeaderboard}
                >
                  <Text style={styles.buttonText}>Leaderboard</Text>
                </TouchableOpacity>
              </PixelBorder>

              <PixelBorder
                borderColor="#FFB6D9"
                borderWidth={3}
                backgroundColor="#FFC9E3"
                innerPadding={0}
                style={styles.buttonBorder}
              >
                <TouchableOpacity
                  style={styles.button}
                  onPress={handlePlayAgain}
                >
                  <Text style={styles.buttonText}>Play Again</Text>
                </TouchableOpacity>
              </PixelBorder>
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 40,
    paddingBottom: 40,
  },
  container: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#D946A6',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'PixeloidMono',
  },
  difficultyBadge: {
    marginBottom: 16,
  },
  difficultyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D9B99',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
  },
  section: {
    width: '100%',
    maxWidth: 500,
    marginBottom: 16,
    alignItems: 'center',
  },

  dogImage: {
    alignSelf: 'center',
    objectFit: 'contain',
    width: 170,
    height: 170,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: '#8B6914',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#8B6914',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6B9B3F',
    marginBottom: 12,
    fontFamily: 'PixeloidMono',
  },
  finalScore: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.green.neon,
    marginBottom: 12,
    fontFamily: 'PixeloidMono',
  },
  breakdown: {
    width: '100%',
    gap: 4,
  },
  breakdownText: {
    fontSize: 14,
    color: '#7B4BA6',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
    flexWrap: 'wrap', // Allow wrapping if content is too long
  },
  statItem: {
    width: '100%',
    marginBottom: 12,
  },
  statItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B9B3F',
    fontFamily: 'PixeloidMono',
    flexShrink: 1,
    flex: 1, // Take available space but can shrink
  },
  statLabelLeft: {
    fontSize: 16,
    color: '#6B9B3F',
    fontFamily: 'PixeloidMono',
    textAlign: 'left',
    flexShrink: 1,
  },
  statValue: {
    fontSize: 14,
    color: '#D9A83F',
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    marginLeft: 8,
    flexShrink: 1, // Allow shrinking to prevent overflow
    textAlign: 'right', // Keep right-aligned even when shrinking
  },
  statValueRight: {
    fontSize: 15,
    color: '#D9A83F',
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    textAlign: 'right',
    marginLeft: 8,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '60%',
  },
  hallPassGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  hallPassItem: {
    minWidth: 120,
  },
  hallPassText: {
    fontSize: 12,
    color: '#B8860B',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
  },
  jokerGrid: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 16,
  },
  jokerItem: {
    minWidth: 100,
  },
  jokerText: {
    fontSize: 14,
    color: '#8B5FBF',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
  },
  merchantGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  merchantItem: {
    minWidth: 100,
    alignItems: 'center',
  },
  merchantItemText: {
    fontSize: 12,
    color: '#B8860B',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
    marginBottom: 2,
  },
  merchantItemPrice: {
    fontSize: 10,
    color: '#DAA520',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
    fontWeight: 'bold',
  },
  leaderboardText: {
    fontSize: 16,
    color: '#6B9B3F',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'PixeloidMono',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    maxWidth: 500,
  },
  buttonBorder: {
    flex: 1,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'transparent',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
  },
  hallPassName: {
    fontSize: 14,
    color: '#2D9B99',
    fontFamily: 'PixeloidMono',
    fontWeight: '600',
    flex: 1,
  },
  hallPassProgress: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'PixeloidMono',
    textAlign: 'right',
    marginLeft: 8,
  },
});
