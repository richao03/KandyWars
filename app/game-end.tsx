import { CommonActions, useNavigation } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import React from 'react';
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
import { useWallet } from '../src/hooks/useWallet';
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
  const { resetGame } = useGame();
  const { newlyUnlockedPasses, clearNewlyUnlocked } = useHallPass();
  const navigation = useNavigation();

  const totalStats = getTotalStats();
  const playthroughStats = getPlaythroughStats();
  const bestSale = getBestSale();
  const mostSoldCandy = getMostSoldCandy();
  const finalScore = balance + stashedAmount;
  // Win condition: paid off the debt (stashedAmount >= 0)
  // The game starts with stashedAmount = -adoptionFee (negative = debt)
  const gameResult = finalScore >= 0 ? 'won' : 'lost';

  // Get dog breed and image based on difficulty level
  const getDogBreed = (level: number) => {
    switch (level) {
      case 1:
        return 'Peg the Pug';
      case 2:
        return 'Brussels Griffon';
      case 3:
        return 'Evee Cat';
      case 4:
        return 'Byul Terrier';
      case 5:
        return 'Cane Corso';
      case 6:
        return 'Pitbull';
      case 7:
        return 'Afghan Hound';
      case 8:
        return 'German Shepherd';
      default:
        return 'Pug';
    }
  };

  const getDogImage = (level: number) => {
    switch (level) {
      case 1:
        return require('../assets/images/doggs/pug.png');
      case 2:
        return require('../assets/images/doggs/brussleGriffon.png');
      case 3:
        return require('../assets/images/doggs/evee.png');
      case 4:
        return require('../assets/images/doggs/byul.png');
      case 5:
        return require('../assets/images/doggs/caneCorso.png');
      case 6:
        return require('../assets/images/doggs/pitbull.png');
      case 7:
        return require('../assets/images/doggs/afghan.png');
      case 8:
        return require('../assets/images/doggs/germanShepard.png');
      default:
        return require('../assets/images/doggs/pug.png');
    }
  };

  const dogBreed = getDogBreed(difficultyLevel);
  const dogImage = getDogImage(difficultyLevel);

  // Get difficulty name
  const getDifficultyName = (level: number) => {
    switch (level) {
      case 1:
        return 'Easy';
      case 2:
        return 'Normal';
      case 3:
        return 'Hard';
      case 4:
        return 'Expert';
      case 5:
        return 'Master';
      case 6:
        return 'Insane';
      case 7:
        return 'Nightmare';
      case 8:
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
    resetGame();

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
              <TextWithEmojis style={styles.difficultyText} imageSize={16}>
                {`🎯 Difficulty: ${difficultyName} (Level ${difficultyLevel})`}
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
                  ? `You paid off all your debt and adopted ${dogBreed}!`
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
                📊 TLDR:
              </TextWithEmojis>

              <View style={styles.statItemRow}>
                <TextWithEmojis style={styles.statLabelLeft} imageSize={20}>
                  💰 Balance
                </TextWithEmojis>
                <Text style={styles.statValueRight}>${balance.toFixed(2)}</Text>
              </View>

              <View style={styles.statItemRow}>
                <TextWithEmojis style={styles.statLabelLeft} imageSize={20}>
                  {stashedAmount >= 0 ? '⚖️ Savings' : '⚖️ Debt'}
                </TextWithEmojis>
                <Text style={styles.statValueRight}>
                  ${Math.abs(stashedAmount).toFixed(2) || '0.00'}
                </Text>
              </View>

              <View style={styles.statItemRow}>
                <TextWithEmojis style={styles.statLabelLeft} imageSize={20}>
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
              <TextWithEmojis style={styles.sectionTitle} imageSize={30}>
                🎮 Playthrough Stats
              </TextWithEmojis>

              <View style={styles.statItemRow}>
                <TextWithEmojis style={styles.statLabelLeft} imageSize={20}>
                  💰 Total Profit
                </TextWithEmojis>
                <Text style={styles.statValueRight}>
                  ${totalStats?.profit?.toFixed(2) || '0.00'}
                </Text>
              </View>

              <View style={styles.statItemRow}>
                <TextWithEmojis style={styles.statLabelLeft} imageSize={20}>
                  💸 Spent on Candy
                </TextWithEmojis>
                <Text style={styles.statValueRight}>
                  ${totalStats?.spent?.toFixed(2) || '0.00'}
                </Text>
              </View>

              <View style={styles.statItemRow}>
                <TextWithEmojis style={styles.statLabelLeft} imageSize={20}>
                  💰 Total Allowance
                </TextWithEmojis>
                <Text style={styles.statValueRight}>
                  ${playthroughStats?.totalAllowance?.toFixed(2) || '0.00'}
                </Text>
              </View>

              <View style={styles.statItemRow}>
                <TextWithEmojis style={styles.statLabelLeft} imageSize={20}>
                  🍬 Candies Sold
                </TextWithEmojis>
                <Text style={styles.statValueRight}>
                  {totalStats?.candiesSold || 0}
                </Text>
              </View>

              {mostSoldCandy && (
                <View style={styles.statItemRow}>
                  <TextWithEmojis style={styles.statLabelLeft} imageSize={20}>
                    🏆 Most Sold Candy
                  </TextWithEmojis>
                  <Text style={styles.statValueRight}>
                    {mostSoldCandy.candy} ({mostSoldCandy.count})
                  </Text>
                </View>
              )}

              {bestSale && (
                <View style={styles.statItemRow}>
                  <TextWithEmojis style={styles.statLabelLeft} imageSize={20}>
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
                backgroundColor="rgba(250, 240, 255, 0.95)"
                innerPadding={30}
                style={styles.section}
              >
                <TextWithEmojis style={styles.sectionTitle} imageSize={30}>
                  🃏 Jokers Collected ({jokers.length})
                </TextWithEmojis>

                <View style={styles.jokerGrid}>
                  {jokers.map((joker, index) => (
                    <PixelBorder
                      key={index}
                      borderColor="#D4A5FF"
                      borderWidth={2}
                      backgroundColor="rgba(240, 220, 255, 0.8)"
                      innerPadding={8}
                      style={styles.jokerItem}
                    >
                      <TextWithEmojis style={styles.jokerText} imageSize={20}>
                        {joker.emoji} {joker.name}
                      </TextWithEmojis>
                    </PixelBorder>
                  ))}
                </View>
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
    textAlign: 'center',
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
    fontSize: 13,
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
    flexShrink: 0,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  jokerItem: {
    minWidth: 100,
  },
  jokerText: {
    fontSize: 12,
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
