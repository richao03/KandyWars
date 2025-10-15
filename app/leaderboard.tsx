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
  Image,
} from 'react-native';
import { useScoreboard } from '../src/hooks/useScoreboard';
import { scoreboardService } from '../src/services/firebase';
import TextWithEmojis from './components/TextWithEmojis';
import colors from '../src/constants/colors';


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
      ? `$${balance.toLocaleString()}`
      : `-$${Math.abs(balance).toLocaleString()}`;
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
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>🚀 Live Tracking Active</Text>
        <Text style={styles.infoSubtitle}>
          Your progress is automatically tracked as you play!
        </Text>

        {playerRank > 0 && (
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>Your Rank: #{playerRank}</Text>
          </View>
        )}
      </View>

      <View style={styles.leaderboardSection}>
        <TextWithEmojis style={styles.sectionTitle}>💰 Top Players by Net Worth</TextWithEmojis>

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
                    <Text style={styles.difficultyText}>
                      {getDifficultyName(score.difficulty).toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.gameStats}>
                  {score.daysPlayed} days • {formatTime(score.completionTime)} •{' '}
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
            <TextWithEmojis style={styles.sectionTitle}>🎮 Most Played Minigames</TextWithEmojis>
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
              <Image
                source={require('../assets/images/emojis/joker.png')}
                style={styles.sectionTitleIcon}
              />
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
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🏆 Leaderboard</Text>
        <View style={{ width: 80 }} />
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
          >
            💰 Leaderboard
          </TextWithEmojis>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'analytics' && styles.activeTab]}
          onPress={() => setActiveTab('analytics')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'analytics' && styles.activeTabText,
            ]}
          >
            Analytics
          </Text>
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
    backgroundColor: '#D2691E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#D2691E',
    borderBottomWidth: 3,
    borderBottomColor: '#d4a574',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
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
    backgroundColor: 'rgba(212, 165, 116, 0.3)',
    borderBottomWidth: 3,
    borderBottomColor: '#F4A460',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#F4A460',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'PixeloidMono',
  },
  activeTabText: {
    color: '#F4A460',
  },
  tabContent: {
    flex: 1,
  },
  infoSection: {
    padding: 20,
    backgroundColor: 'rgba(212, 165, 116, 0.3)',
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#d4a574',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#32CD32',
    marginBottom: 8,
    fontFamily: 'PixeloidMono',
  },
  infoSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'PixeloidMono',
  },
  rankBadge: {
    backgroundColor: '#F4A460',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rankText: {
    color: '#8B4513',
    fontWeight: 'bold',
    fontSize: 14,
    fontFamily: 'PixeloidMono',
  },
  leaderboardSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
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
    padding: 40,
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#6b7280',
    fontSize: 14,
  },
  leaderboardItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(244, 164, 96, 0.2)',
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#d4a574',
  },
  topThreeItem: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    borderWidth: 3,
    borderColor: '#F4A460',
  },
  rankContainer: {
    marginRight: 16,
    minWidth: 40,
    alignItems: 'center',
  },
  rankEmoji: {
    fontSize: 24,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  scoreDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  finalBalance: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#32CD32',
    marginRight: 12,
    fontFamily: 'PixeloidMono',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.white,
  },
  gameStats: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statsSection: {
    padding: 16,
    backgroundColor: 'rgba(222, 184, 135, 0.3)',
    margin: 16,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#DEB887',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F4A460',
    fontFamily: 'PixeloidMono',
  },
  statLabel: {
    fontSize: 12,
    color: '#ffffff',
    marginTop: 4,
    fontFamily: 'PixeloidMono',
  },
  analyticsSection: {
    padding: 16,
  },
  analyticsItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(205, 133, 63, 0.2)',
    marginBottom: 8,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#CD853F',
  },
  analyticsRank: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F4A460',
    marginRight: 12,
    minWidth: 30,
    fontFamily: 'PixeloidMono',
  },
  analyticsName: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    fontFamily: 'PixeloidMono',
  },
  analyticsCount: {
    fontSize: 14,
    color: '#DEB887',
    fontFamily: 'PixeloidMono',
  },
  emptyAnalyticsText: {
    color: '#ffffff',
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
    fontFamily: 'PixeloidMono',
  },
});
