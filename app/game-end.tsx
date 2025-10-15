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
import { useDailyStats } from '../src/hooks/useDailyStats';
import { useGame } from '../src/hooks/useGame';
import { useHallPass } from '../src/hooks/useHallPass';
import { useJokers } from '../src/hooks/useJokers';
import { useMinigameTracking } from '../src/hooks/useMinigameTracking';
import { useWallet } from '../src/hooks/useWallet';
import { scoreboardService } from '../src/services/firebase';
import { useAppDispatch, useAppSelector } from '../src/store/hooks';
import { setTotalCompletions } from '../src/store/slices/gameSlice';
import { resetLocalAnalytics } from '../src/store/slices/localAnalyticsSlice';
import { setWonDifficulties } from '../src/store/slices/scoreboardSlice';
import {
  setCachedUserObject,
} from '../src/store/slices/userObjectSlice';
import { forceSave } from '../src/store/store';
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

  const totalStats = getTotalStats();
  const playthroughStats = getPlaythroughStats();
  const bestSale = getBestSale();
  const mostSoldCandy = getMostSoldCandy();
  const finalScore = balance + stashedAmount;
  // Win condition: paid off the debt (stashedAmount >= 0)
  // The game starts with stashedAmount = -adoptionFee (negative = debt)
  const gameResult = finalScore >= 0 ? 'won' : 'lost';

  // Check for hall pass unlocks when screen loads
  useEffect(() => {
    const checkHallPassUnlocks = async () => {
      console.log('🎯 Game End Screen: Checking hall pass unlocks');

      // Clear any previously newly unlocked passes from last session
      // This ensures we only show passes unlocked in THIS game
      clearNewlyUnlocked();
      console.log('🎓 Cleared previously newly unlocked passes');

      const hasWon = finalScore >= 0;

      try {
        // Ensure Firebase is initialized first
        await scoreboardService.initializeAuth();

        // Get cached user object from service
        let userObject = scoreboardService.getCachedUserObject();

        // If service cache is empty, restore from Redux
        if (!userObject) {
          console.log('⚠️ Service cache empty, checking Redux...');

          if (reduxUserObject) {
            console.log('✅ Restoring user object from Redux to service cache');
            scoreboardService.setCachedUserObject(reduxUserObject);
            userObject = reduxUserObject;
          } else {
            console.error('❌ User object not found in service or Redux cache');

            // Try to initialize Firebase as last resort
            console.log('🔄 Attempting to fetch user object from Firebase...');
            try {
              userObject = await scoreboardService.fetchUserObject();
              scoreboardService.setCachedUserObject(userObject);
              console.log('✅ User object loaded from Firebase:', userObject);
            } catch (error) {
              console.error('❌ Failed to fetch user object:', error);
              return;
            }
          }
        }

        console.log('📊 Current user object:', userObject);

        // Always update played minigames (regardless of win/loss)
        const updates: any = {
          playedMinigames: playedMinigames,
        };
        console.log('🎮 Updating played minigames:', playedMinigames);

        if (hasWon) {
          console.log('🏆 Player won - updating user object...');

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
            console.log('🏆 Adding difficulty to won list:', difficultyLevel);
          }
        } else {
          console.log('😢 Player lost - saving minigame progress only');
        }

        // Update local cache
        scoreboardService.updateLocalUserObject(updates);

        // Save to Firebase
        const updatedUserObject = scoreboardService.getCachedUserObject();
        if (updatedUserObject) {
          await scoreboardService.saveUserObject(updatedUserObject);
          console.log('✅ User object saved to Firebase:', updatedUserObject);

          // Update Redux (persisted across app restarts)
          dispatch(setCachedUserObject(updatedUserObject));
          dispatch(setTotalCompletions(updatedUserObject.totalWinCount));
          dispatch(setWonDifficulties(updatedUserObject.difficultyWon));
        }

        // Batch update universal analytics to Firebase
        console.log('📊 Syncing local analytics to Firebase...');
        console.log('📊 Jokers obtained:', localAnalytics.jokersObtained);
        console.log('📊 Minigames played:', localAnalytics.minigamesPlayed);

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
        console.log('✅ Local analytics synced and reset');

        // Track game completion to scoreboard
        try {
          const day = Math.floor(periodCount / 8) + 1;
          await scoreboardService.trackGameCompletion(
            balance,
            difficultyLevel?.toString() || '1',
            day,
            updatedUserObject?.playerName || 'Player',
            playthroughStats?.totalProfit || 0,
            playthroughStats?.totalCandiesSold || 0,
            jokers.length,
            periodCount * 5, // Approximate minutes (5 min per period)
            periodCount
          );
          console.log('✅ Game completion tracked to scoreboard');
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
        };

        console.log('🎓 Checking hall pass unlocks with gameStats:', gameStats);

        const unlocked = checkUnlockRequirements(gameStats, {
          hasPlayedAllMinigames: hasPlayedAllMinigames,
        });
        console.log('🎓 Newly unlocked Hall Passes:', unlocked);

        if (unlocked.length > 0) {
          console.log(`🎓 ${unlocked.length} hall pass(es) were unlocked!`);

          // Get current unlocked passes from Redux
          const currentUnlockedPassIds = unlockedPasses.map((p) => p.id);
          console.log('🎓 Current unlocked passes:', currentUnlockedPassIds);

          // Merge with newly unlocked (avoid duplicates)
          const allUnlockedPassIds = [
            ...new Set([...currentUnlockedPassIds, ...unlocked]),
          ];
          console.log('🎓 All unlocked passes:', allUnlockedPassIds);

          // Update user object with hall passes
          scoreboardService.updateLocalUserObject({
            unlockedHallPasses: allUnlockedPassIds,
          });

          // Save to Firebase
          const updatedUserObject = scoreboardService.getCachedUserObject();
          if (updatedUserObject) {
            await scoreboardService.saveUserObject(updatedUserObject);
            console.log(
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

    console.log('🎮 Play Again: Resetting navigation stack to title screen');

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
                {`🎯 Difficulty: ${difficultyName} `}
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
                <Text style={styles.statValueRight}>${balance.toFixed(2)}</Text>
              </View>

              <View style={styles.statItemRow}>
                <TextWithEmojis style={styles.statLabelLeft} imageSize={24}>
                  {stashedAmount >= 0 ? '⚖️ Savings' : '⚖️ Debt'}
                </TextWithEmojis>
                <Text style={styles.statValueRight}>
                  ${Math.abs(stashedAmount).toFixed(2) || '0.00'}
                </Text>
              </View>

              <View style={styles.statItemRow}>
                <TextWithEmojis style={styles.statLabelLeft} imageSize={24}>
                  {gameResult === 'won' ? '🎉 Status' : '❌ Status'}
                </TextWithEmojis>
                <Text style={styles.statValueRight}>
                  {gameResult === 'won'
                    ? 'All debt paid off!'
                    : `$${(Math.abs(stashedAmount) - balance).toFixed(2)} remaining`}
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
                  ${playthroughStats?.totalProfit?.toFixed(2) || '0.00'}
                </Text>
              </View>

              <View style={styles.statItemRow}>
                <TextWithEmojis style={styles.statLabelLeft} imageSize={24}>
                  💸 Spent on Candy
                </TextWithEmojis>
                <Text style={styles.statValueRight}>
                  ${playthroughStats?.totalSpentOnCandy?.toFixed(2) || '0.00'}
                </Text>
              </View>

              <View style={styles.statItemRow}>
                <TextWithEmojis style={styles.statLabelLeft} imageSize={24}>
                  💰 Total Allowance
                </TextWithEmojis>
                <Text style={styles.statValueRight}>
                  ${playthroughStats?.totalAllowance?.toFixed(2) || '0.00'}
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
                    {bestSale.candyName} (+${bestSale.profit.toFixed(2)})
                  </Text>
                </View>
              )}
            </PixelBorder>

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

            {/* Leaderboard notification */}
            <TextWithEmojis style={styles.leaderboardText} imageSize={95}>
              🏆
            </TextWithEmojis>
            <Text style={styles.leaderboardText}>
              Your score has been submitted to the leaderboard!
            </Text>

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
});
