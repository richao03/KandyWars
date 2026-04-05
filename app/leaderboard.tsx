import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import colors from '../src/constants/colors';
import { formatNumber } from '../src/utils/priceUtils';
import { useScoreboard } from '../src/hooks/useScoreboard';
import { scoreboardService } from '../src/services/firebase';
import PixelBorder from './components/PixelBorder';
import TextWithEmojis from './components/TextWithEmojis';

const { width: screenWidth } = Dimensions.get('window');

export default function LeaderboardScreen() {
  const { topScores, playerRank, betaStats, isLoading, refreshScoreboard } =
    useScoreboard();

  const [activeTab, setActiveTab] = useState('money');
  const [topJokersFromMinigames, setTopJokersFromMinigames] = useState<
    Array<{ jokerName: string; count: number; jokerId: number }>
  >([]);
  const [topMinigames, setTopMinigames] = useState<
    Array<{ minigameType: string; count: number }>
  >([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Load analytics data
  const loadAnalytics = useCallback(async () => {
    if (analyticsLoading) return;

    setAnalyticsLoading(true);
    try {
      const [jokersData, minigamesData] = await Promise.all([
        scoreboardService.getMostObtainedJokersFromMinigames(10),
        scoreboardService.getMostPlayedMinigames(10),
      ]);

      setTopJokersFromMinigames(jokersData || []);
      setTopMinigames(minigamesData || []);
    } catch (error) {
      console.error('❌ Failed to load analytics data:', error);
      setTopJokersFromMinigames([]);
      setTopMinigames([]);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsLoading]);

  // Load data when screen mounts
  useEffect(() => {
    const delayedLoad = setTimeout(() => {
      // Refresh scoreboard if no data exists
      if (topScores.length === 0 && !isLoading) {
        refreshScoreboard();
      }

      // Load analytics data if needed
      if (topJokersFromMinigames.length === 0 || topMinigames.length === 0) {
        loadAnalytics();
      }
    }, 300);

    return () => clearTimeout(delayedLoad);
  }, [
    topScores.length,
    isLoading,
    topJokersFromMinigames.length,
    topMinigames.length,
    refreshScoreboard,
  ]);

  const formatBalance = (balance: number): string => {
    return balance >= 0
      ? `$${formatNumber(balance)}`
      : `-$${formatNumber(Math.abs(balance))}`;
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getDifficultyName = (level: number | string): string => {
    // Convert string to number if needed
    const levelNum = typeof level === 'string' ? parseInt(level, 10) : level;

    switch (levelNum) {
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

  const getDifficultyColor = (level: number | string): string => {
    // Convert string to number if needed
    const levelNum = typeof level === 'string' ? parseInt(level, 10) : level;

    // Color based on difficulty level ranges
    if (levelNum <= 2) return '#22c55e'; // Green for Tutorial/Easy
    if (levelNum <= 5) return '#3b82f6'; // Blue for Simple/Normal/Medium
    if (levelNum <= 8) return '#f59e0b'; // Yellow for Hard/Challenging/Expert
    if (levelNum <= 12) return '#ef4444'; // Red for Difficult/Master/Extreme/Insane
    return '#9333ea'; // Purple for Brutal+
  };

  const getRankDisplay = (index: number): string => {
    switch (index) {
      case 0:
        return '🥇';
      case 1:
        return '🥈';
      case 2:
        return '🥉';
      default:
        return `#${index + 1}`;
    }
  };

  const renderMoneyLeaderboard = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.leaderboardSection}>
        <TextWithEmojis imageSize={44} style={styles.sectionTitle}>
          Top Players by Net Worth
        </TextWithEmojis>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading leaderboard...</Text>
          </View>
        ) : topScores.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No scores available</Text>
            <Text style={styles.emptySubtext}>
              Be the first to complete a game!
            </Text>
          </View>
        ) : (
          topScores.map((score, index) => (
            <View
              key={score.id || index}
              style={[styles.leaderboardItem, index < 3 && styles.topThreeItem]}
            >
              <View style={styles.rankContainer}>
                <Text style={styles.rankEmoji}>{getRankDisplay(index)}</Text>
              </View>

              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{score.playerName}</Text>
                <View style={styles.scoreDetails}>
                  <Text style={styles.finalBalance}>
                    {formatBalance(score.finalBalance)}
                  </Text>
                  <View
                    style={[
                      styles.difficultyBadge,
                      { backgroundColor: getDifficultyColor(score.difficulty) },
                    ]}
                  >
                    <Text style={styles.difficultyText} numberOfLines={1}>
                      {getDifficultyName(score.difficulty).toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.gameStats}>
                  {score.jokersCollected} jokers
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {betaStats && (
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Beta Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{betaStats.totalGames}</Text>
              <Text style={styles.statLabel}>Games Played</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{betaStats.totalPlayers}</Text>
              <Text style={styles.statLabel}>Players</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{betaStats.averageScore}</Text>
              <Text style={styles.statLabel}>Avg Score</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );

  const renderAnalytics = () => (
    <ScrollView style={styles.tabContent}>
      {analyticsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      ) : (
        <>
          <View style={styles.analyticsSection}>
            <TextWithEmojis style={styles.sectionTitle}>
              Most Played Minigames
            </TextWithEmojis>
            {topMinigames.length === 0 ? (
              <Text style={styles.emptyAnalyticsText}>
                No minigame data yet - play some minigames to see stats!
              </Text>
            ) : (
              topMinigames.map((minigame, index) => (
                <View key={minigame.minigameType} style={styles.analyticsItem}>
                  <Text style={styles.analyticsRank}>#{index + 1}</Text>
                  <Text style={styles.analyticsName}>
                    {minigame.minigameType}
                  </Text>
                  <Text style={styles.analyticsCount}>
                    {minigame.count} plays
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.analyticsSection}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Most Obtained Jokers</Text>
            </View>
            {topJokersFromMinigames.length === 0 ? (
              <Text style={styles.emptyAnalyticsText}>
                No joker data yet - win some minigames to see stats!
              </Text>
            ) : (
              topJokersFromMinigames.map((joker, index) => (
                <View key={joker.jokerId} style={styles.analyticsItem}>
                  <Text style={styles.analyticsRank}>#{index + 1}</Text>
                  <Text style={styles.analyticsName}>{joker.jokerName}</Text>
                  <Text style={styles.analyticsCount}>
                    {joker.count} earned
                  </Text>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#D2691E"
        translucent={true}
      />

      {/* Header */}
      <View style={styles.header}>
        <PixelBorder
          borderColor="#ff85c0"
          borderWidth={3}
          backgroundColor="rgba(255, 255, 255, 0.4)"
          innerPadding={0}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </PixelBorder>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={{ width: 90 }} />
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'money' && styles.activeTab]}
          onPress={() => setActiveTab('money')}
        >
          <TextWithEmojis
            style={[
              styles.tabText,
              activeTab === 'money' && styles.activeTabText,
            ]}
            imageSize={22}
          >
            💰 Leaderboard
          </TextWithEmojis>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'analytics' && styles.activeTab]}
          onPress={() => setActiveTab('analytics')}
        >
          <TextWithEmojis
            style={[
              styles.tabText,
              activeTab === 'analytics' && styles.activeTabText,
            ]}
            imageSize={22}
          >
            🎮 Analytics
          </TextWithEmojis>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'money' ? renderMoneyLeaderboard() : renderAnalytics()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff5f7', // Cotton Candy Pink
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#ffb3d9', // Bubblegum
    borderBottomWidth: 4,
    borderBottomColor: '#ff85c0',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  backButton: {
    padding: 12,
    width: 76,
    backgroundColor: 'transparent',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    fontSize: 18,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffa3cc', // Cherry Blossom lighter
    borderBottomWidth: 4,
    borderBottomColor: '#ff6bb3',
  },
  tab: {
    flex: 1,
    paddingVertical: 18,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#cc2a6f', // Cherry Blossom
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  tabText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'PixeloidMono',
  },
  activeTabText: {
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  tabContent: {
    flex: 1,
  },
  infoSection: {
    padding: 24,
    backgroundColor: '#ffc0cb', // Strawberry Milk
    margin: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ff91a4',
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00a372', // Mint green for success
    marginBottom: 10,
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  infoSubtitle: {
    fontSize: 16,
    color: '#4a2c5c', // Deep Purple
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'PixeloidMono',
    lineHeight: 22,
  },
  rankBadge: {
    backgroundColor: '#e65c00', // Orange Creamsicle darker
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#ff9955',
  },
  rankText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  leaderboardSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#cc2a6f', // Cherry Blossom
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(255, 255, 255, 0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  sectionTitleIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
    marginRight: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 50,
  },
  loadingText: {
    color: '#cc2a6f', // Cherry Blossom
    marginTop: 16,
    fontSize: 18,
    fontFamily: 'PixeloidMono',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 50,
  },
  emptyText: {
    color: '#cc2a6f', // Cherry Blossom
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: 'PixeloidMono',
  },
  emptySubtext: {
    color: '#6b5080', // Medium Purple
    fontSize: 16,
    fontFamily: 'PixeloidMono',
  },
  leaderboardItem: {
    flexDirection: 'row',
    backgroundColor: '#ffdab9', // Peach Sorbet
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ffb380',
  },
  topThreeItem: {
    backgroundColor: '#fffacd', // Lemon Meringue for top 3
    borderWidth: 4,
    borderColor: '#ffe55c',
  },
  rankContainer: {
    marginRight: 20,
    minWidth: 50,
    alignItems: 'center',
  },
  rankEmoji: {
    fontSize: 32,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4a2c5c', // Deep Purple
    marginBottom: 6,
    fontFamily: 'PixeloidMono',
  },
  scoreDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 8,
  },
  finalBalance: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00a372', // Mint green for money
    fontFamily: 'PixeloidMono',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    flexShrink: 1,
  },
  difficultyText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'PixeloidMono',
  },
  gameStats: {
    fontSize: 14,
    color: '#6b5080', // Medium Purple
    fontFamily: 'PixeloidMono',
  },
  statsSection: {
    padding: 24,
    backgroundColor: '#b3f0d9', // Mint Ice Cream
    margin: 20,
    borderRadius: 16,
    borderWidth: 4,
    borderColor: '#66e0b8',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00a372', // Mint darker
    fontFamily: 'PixeloidMono',
  },
  statLabel: {
    fontSize: 14,
    color: '#4a2c5c', // Deep Purple
    marginTop: 6,
    fontFamily: 'PixeloidMono',
    fontWeight: 'bold',
  },
  analyticsSection: {
    padding: 20,
  },
  analyticsItem: {
    flexDirection: 'row',
    backgroundColor: '#e6d5ff', // Lavender Taffy
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#c79fff',
  },
  analyticsRank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8e44cc', // Grape Soda darker
    marginRight: 16,
    minWidth: 40,
    fontFamily: 'PixeloidMono',
  },
  analyticsName: {
    flex: 1,
    fontSize: 18,
    color: '#4a2c5c', // Deep Purple
    fontFamily: 'PixeloidMono',
    fontWeight: 'bold',
  },
  analyticsCount: {
    fontSize: 16,
    color: '#7700cc', // Purple accent
    fontFamily: 'PixeloidMono',
    fontWeight: 'bold',
  },
  emptyAnalyticsText: {
    color: '#6b5080', // Medium Purple
    textAlign: 'center',
    padding: 24,
    fontSize: 16,
    fontFamily: 'PixeloidMono',
    lineHeight: 22,
  },
});
