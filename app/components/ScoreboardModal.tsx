/**
 * Scoreboard Modal Component
 *
 * Displays the beta testing leaderboard with rankings, stats,
 * and privacy controls for score submission.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useScoreboard } from '../../src/hooks/useScoreboard';
import { scoreboardService } from '../../src/services/firebase';
import FastModal from './FastModal';
import TextWithEmojis from './TextWithEmojis';

interface ScoreboardModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmitScore?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export const ScoreboardModal: React.FC<ScoreboardModalProps> = React.memo(
  ({ visible, onClose, onSubmitScore }) => {
    const {
      topScores,
      playerRank,
      betaStats,
      privacySettings,
      updatePrivacySettings,
      playerName,
      setPlayerName,
      refreshScoreboard,
      isLoading,
      isSubmitting,
    } = useScoreboard();

    const [activeTab, setActiveTab] = useState<
      'money' | 'jokers' | 'minigames' | 'periods' | 'privacy'
    >('money');
    const [tempPlayerName, setTempPlayerName] = useState(playerName);

    // Analytics state
    const [topJokersFromMinigames, setTopJokersFromMinigames] = useState<
      Array<{ jokerName: string; count: number; jokerId: number }>
    >([]);
    const [topMinigames, setTopMinigames] = useState<
      Array<{ minigameType: string; count: number }>
    >([]);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    // Load analytics data with debouncing
    const loadAnalytics = useCallback(async () => {
      if (analyticsLoading) return;

      setAnalyticsLoading(true);
      try {
        console.log('📊 Loading analytics data...');
        const [jokersData, minigamesData] = await Promise.all([
          scoreboardService.getMostObtainedJokersFromMinigames(10),
          scoreboardService.getMostPlayedMinigames(10),
        ]);

        setTopJokersFromMinigames(jokersData);
        setTopMinigames(minigamesData);
        console.log('📊 Analytics data loaded successfully');
      } catch (error) {
        console.error('❌ Failed to load analytics data:', error);
      } finally {
        setAnalyticsLoading(false);
      }
    }, [analyticsLoading]);

    // Optimize data loading with debounced effect
    useEffect(() => {
      if (visible) {
        // Use setTimeout to delay heavy operations until after animation
        const delayedLoad = setTimeout(() => {
          // Only refresh if we don't have data yet
          if (topScores.length === 0 && !isLoading) {
            console.log('📊 ScoreboardModal: No data exists, fetching...');
            refreshScoreboard();
          }

          // Load analytics data when modal opens, but only if needed
          if (
            topJokersFromMinigames.length === 0 ||
            topMinigames.length === 0
          ) {
            loadAnalytics();
          }
        }, 300); // Delay to allow modal animation to complete

        // Immediate UI updates that don't block animation
        setTempPlayerName(playerName);

        return () => clearTimeout(delayedLoad);
      }
    }, [
      visible,
      playerName,
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

    const getDifficultyColor = (difficulty: string): string => {
      switch (difficulty) {
        case 'easy':
          return '#22c55e';
        case 'medium':
          return '#f59e0b';
        case 'hard':
          return '#ef4444';
        default:
          return '#6b7280';
      }
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
          <TextWithEmojis style={styles.sectionTitle}>
            💰 Top Money Earners
          </TextWithEmojis>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading scores...</Text>
            </View>
          ) : topScores.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No scores submitted yet.</Text>
              <Text style={styles.emptySubtext}>
                Be the first to join the leaderboard!
              </Text>
            </View>
          ) : (
            topScores.map((entry, index) => (
              <View key={entry.id || index} style={styles.scoreEntry}>
                <View style={styles.rankContainer}>
                  <Text style={styles.rankNumber}>{getRankDisplay(index)}</Text>
                </View>

                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{entry.playerName}</Text>
                  <View style={styles.gameDetails}>
                    <View
                      style={[
                        styles.difficultyBadge,
                        {
                          backgroundColor: getDifficultyColor(entry.difficulty),
                        },
                      ]}
                    >
                      <Text style={styles.difficultyText}>
                        {entry.difficulty}
                      </Text>
                    </View>
                    <Text style={styles.gameTime}>
                      Day {entry.daysPlayed} • Final Balance
                    </Text>
                  </View>
                </View>

                <View style={styles.scoreContainer}>
                  <Text style={styles.finalBalance}>
                    {formatBalance(entry.finalBalance)}
                  </Text>
                  <Text style={styles.profit}>
                    +{formatBalance(entry.totalProfit)} profit
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    );

    const renderJokersLeaderboard = () => (
      <ScrollView style={styles.tabContent}>
        <View style={styles.leaderboardSection}>
          <View style={styles.sectionTitleRow}>
            <Image
              source={require('../../assets/images/emojis/joker.png')}
              style={styles.sectionTitleIcon}
            />
            <Text style={styles.sectionTitle}>
              Most Obtained Jokers from Minigames
            </Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Shows which jokers are won most often from minigames (no player
            info)
          </Text>

          {analyticsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading joker analytics...</Text>
            </View>
          ) : topJokersFromMinigames.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No joker data yet.</Text>
              <Text style={styles.emptySubtext}>
                Play some minigames to earn jokers and see statistics!
              </Text>
            </View>
          ) : (
            topJokersFromMinigames.map((joker, index) => (
              <View key={joker.jokerId} style={styles.scoreEntry}>
                <View style={styles.rankContainer}>
                  <Text style={styles.rankNumber}>{getRankDisplay(index)}</Text>
                </View>

                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{joker.jokerName}</Text>
                  <View style={styles.gameDetails}>
                    <Text style={styles.gameTime}>
                      Joker ID: {joker.jokerId}
                    </Text>
                  </View>
                </View>

                <View style={styles.scoreContainer}>
                  <Text style={styles.finalBalance}>{joker.count}</Text>
                  <Text style={styles.profit}>obtained</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    );

    const renderMinigamesLeaderboard = () => (
      <ScrollView style={styles.tabContent}>
        <View style={styles.leaderboardSection}>
          <TextWithEmojis style={styles.sectionTitle}>
            🎮 Most Played Minigames
          </TextWithEmojis>
          <Text style={styles.sectionSubtitle}>
            Shows which minigames are played most often (no player info)
          </Text>

          {analyticsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>
                Loading minigame analytics...
              </Text>
            </View>
          ) : topMinigames.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No minigame data yet.</Text>
              <Text style={styles.emptySubtext}>
                Play some minigames to see statistics!
              </Text>
            </View>
          ) : (
            topMinigames.map((minigame, index) => (
              <View key={minigame.minigameType} style={styles.scoreEntry}>
                <View style={styles.rankContainer}>
                  <Text style={styles.rankNumber}>{getRankDisplay(index)}</Text>
                </View>

                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{minigame.minigameType}</Text>
                  <View style={styles.gameDetails}>
                    <Text style={styles.gameTime}>Minigame Type</Text>
                  </View>
                </View>

                <View style={styles.scoreContainer}>
                  <Text style={styles.finalBalance}>{minigame.count}</Text>
                  <Text style={styles.profit}>plays</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    );

    const renderPeriodsLeaderboard = () => (
      <ScrollView style={styles.tabContent}>
        <View style={styles.leaderboardSection}>
          <View style={styles.sectionTitleRow}>
            <Image
              source={require('../../assets/images/emojis/book.png')}
              style={styles.sectionTitleIcon}
            />
            <Text style={styles.sectionTitle}>Lifetime Periods Played</Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading period stats...</Text>
            </View>
          ) : topScores.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No period data yet.</Text>
              <Text style={styles.emptySubtext}>
                Play some games to see period statistics!
              </Text>
            </View>
          ) : (
            topScores
              .sort(
                (a, b) =>
                  (b.totalPeriodsPlayed || 0) - (a.totalPeriodsPlayed || 0)
              )
              .map((entry, index) => (
                <View key={entry.id || index} style={styles.scoreEntry}>
                  <View style={styles.rankContainer}>
                    <Text style={styles.rankNumber}>
                      {getRankDisplay(index)}
                    </Text>
                  </View>

                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{entry.playerName}</Text>
                    <View style={styles.gameDetails}>
                      <View
                        style={[
                          styles.difficultyBadge,
                          {
                            backgroundColor: getDifficultyColor(
                              entry.difficulty
                            ),
                          },
                        ]}
                      >
                        <Text style={styles.difficultyText}>
                          {entry.difficulty}
                        </Text>
                      </View>
                      <Text style={styles.gameTime}>
                        Day {entry.daysPlayed} • Lifetime Total
                      </Text>
                    </View>
                  </View>

                  <View style={styles.scoreContainer}>
                    <Text style={styles.finalBalance}>
                      {entry.totalPeriodsPlayed || 0}
                    </Text>
                    <Text style={styles.profit}>periods</Text>
                  </View>
                </View>
              ))
          )}
        </View>
      </ScrollView>
    );

    const renderPrivacy = () => (
      <ScrollView style={styles.tabContent}>
        <View style={styles.sectionTitleRow}>
          <Image
            source={require('../../assets/images/emojis/lock.png')}
            style={styles.sectionTitleIcon}
          />
          <Text style={styles.sectionTitle}>Privacy Settings</Text>
        </View>

        <View style={styles.playerNameSection}>
          <Text style={styles.inputLabel}>Player Name</Text>
          <TextInput
            style={styles.textInput}
            value={tempPlayerName}
            onChangeText={setTempPlayerName}
            placeholder="Enter your name"
            onBlur={() => setPlayerName(tempPlayerName)}
          />
        </View>

        <View style={styles.privacyOptions}>
          <View style={styles.privacyItem}>
            <View style={styles.privacyTextContainer}>
              <Text style={styles.privacyTitle}>Share Scores</Text>
              <Text style={styles.privacyDescription}>
                Allow your scores to appear on the leaderboard
              </Text>
            </View>
            <Switch
              value={privacySettings.shareScore}
              onValueChange={(value) =>
                updatePrivacySettings({ shareScore: value })
              }
            />
          </View>

          <View style={styles.privacyItem}>
            <View style={styles.privacyTextContainer}>
              <Text style={styles.privacyTitle}>Share Player Name</Text>
              <Text style={styles.privacyDescription}>
                Display your name instead of "Anonymous"
              </Text>
            </View>
            <Switch
              value={privacySettings.sharePlayerName}
              onValueChange={(value) =>
                updatePrivacySettings({ sharePlayerName: value })
              }
            />
          </View>

          <View style={styles.privacyItem}>
            <View style={styles.privacyTextContainer}>
              <Text style={styles.privacyTitle}>Share Strategies</Text>
              <Text style={styles.privacyDescription}>
                Help us analyze gameplay patterns and strategies
              </Text>
            </View>
            <Switch
              value={privacySettings.shareStrategies}
              onValueChange={(value) =>
                updatePrivacySettings({ shareStrategies: value })
              }
            />
          </View>

          <View style={styles.privacyItem}>
            <View style={styles.privacyTextContainer}>
              <Text style={styles.privacyTitle}>Analytics</Text>
              <Text style={styles.privacyDescription}>
                Allow anonymous gameplay analytics for beta testing
              </Text>
            </View>
            <Switch
              value={privacySettings.allowAnalytics}
              onValueChange={(value) =>
                updatePrivacySettings({ allowAnalytics: value })
              }
            />
          </View>
        </View>
      </ScrollView>
    );

    return (
      <FastModal
        visible={visible}
        onClose={onClose}
        animationType="spring"
        backdropOpacity={0.5}
        modalStyle={styles.container}
      >
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Beta Leaderboard</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

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
                💰 Money
              </TextWithEmojis>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'jokers' && styles.activeTab]}
              onPress={() => setActiveTab('jokers')}
            >
              <View style={styles.tabTextRow}>
                <Image
                  source={require('../../assets/images/emojis/joker.png')}
                  style={styles.tabIcon}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'jokers' && styles.activeTabText,
                  ]}
                >
                  Jokers
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'minigames' && styles.activeTab,
              ]}
              onPress={() => setActiveTab('minigames')}
            >
              <TextWithEmojis
                style={[
                  styles.tabText,
                  activeTab === 'minigames' && styles.activeTabText,
                ]}
              >
                🎮 Games
              </TextWithEmojis>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'periods' && styles.activeTab]}
              onPress={() => setActiveTab('periods')}
            >
              <View style={styles.tabTextRow}>
                <Image
                  source={require('../../assets/images/emojis/book.png')}
                  style={styles.tabIcon}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'periods' && styles.activeTabText,
                  ]}
                >
                  Periods
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'privacy' && styles.activeTab]}
              onPress={() => setActiveTab('privacy')}
            >
              <View style={styles.tabTextRow}>
                <Image
                  source={require('../../assets/images/emojis/lock.png')}
                  style={styles.tabIcon}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'privacy' && styles.activeTabText,
                  ]}
                >
                  Privacy
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {activeTab === 'money' && renderMoneyLeaderboard()}
            {activeTab === 'jokers' && renderJokersLeaderboard()}
            {activeTab === 'minigames' && renderMinigamesLeaderboard()}
            {activeTab === 'periods' && renderPeriodsLeaderboard()}
            {activeTab === 'privacy' && renderPrivacy()}
          </View>
        </>
      </FastModal>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6b7280',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 16,
    color: '#6b7280',
  },
  activeTabText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  infoSection: {
    padding: 20,
    backgroundColor: '#f0f9ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  rankBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  rankText: {
    fontSize: 14,
    color: '#1d4ed8',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    padding: 20,
    paddingBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitleIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    marginRight: 8,
  },
  tabTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    marginRight: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    paddingHorizontal: 20,
    paddingBottom: 12,
    fontStyle: 'italic',
  },
  leaderboardSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#1f2937',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  scoreEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  playerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  gameDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  difficultyText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  gameTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  finalBalance: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  profit: {
    fontSize: 12,
    color: '#059669',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
  },
  statItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 20,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  betaInfo: {
    margin: 20,
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  betaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  betaText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  playerNameSection: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1f2937',
  },
  privacyOptions: {
    paddingHorizontal: 20,
  },
  privacyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  privacyTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  privacyDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
});

export default ScoreboardModal;
