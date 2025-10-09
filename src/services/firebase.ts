/**
 * Firebase Configuration for CandyWarz Beta Scoreboard
 *
 * This file handles Firebase setup and provides methods for submitting
 * and retrieving scoreboard data for beta testers.
 */

import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, User, getAuth, signInAnonymously } from 'firebase/auth';
import {
  Firestore,
  Timestamp,
  addDoc,
  collection,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
  updateDoc,
} from 'firebase/firestore';
import * as Device from 'expo-device';

// Firebase configuration - YOU NEED TO REPLACE THESE WITH YOUR PROJECT CONFIG
const firebaseConfig = {
  apiKey: 'AIzaSyBGdQ3vJxHMu8GjbDFkMhP-IwL93NxFmFQ',
  authDomain: 'candywarz-6fea9.firebaseapp.com',
  projectId: 'candywarz-6fea9',
  storageBucket: 'candywarz-6fea9.firebasestorage.app',
  messagingSenderId: '167370146452',
  appId: '1:167370146452:web:f52f763141cd5465c96a81',
  measurementId: 'G-FLWTCBRBKW',
};

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

export const initializeFirebase = () => {
  // Only initialize if not already done
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  db = getFirestore(app);
  auth = getAuth(app);

  return { app, db, auth };
};

// Scoreboard data interface
export interface ScoreboardEntry {
  id?: string;
  playerId: string;
  playerName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  finalBalance: number;
  daysPlayed: number;
  totalProfit: number;
  candiesSold: number;
  jokersCollected: number;
  minigamesPlayed: number;
  totalPeriodsPlayed: number; // lifetime periods across all games by this player
  completionTime: number; // in minutes
  gameVersion: string;
  deviceInfo: string;
  timestamp: Timestamp | typeof serverTimestamp;

  // Additional analytics for beta testing
  crashCount?: number;
  feedbackProvided?: boolean;
  uniqueStrategies?: string[];
}

// Privacy settings
export interface PrivacySettings {
  shareScore: boolean;
  sharePlayerName: boolean;
  shareStrategies: boolean;
  allowAnalytics: boolean;
}

class ScoreboardService {
  private isInitialized = false;
  private currentUser: User | null = null;
  private deviceId: string | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('📊 Scoreboard service already initialized');
      return;
    }

    try {
      console.log('📊 Initializing Firebase...');
      initializeFirebase();

      // Get device ID (unique to this device)
      this.deviceId = Device.osInternalBuildId || Device.osBuildId || Device.modelId || 'unknown-device';
      console.log('📱 Device ID:', this.deviceId);

      console.log('📊 Signing in anonymously...');
      // Sign in anonymously for beta testing
      const userCredential = await signInAnonymously(auth);
      this.currentUser = userCredential.user;
      this.isInitialized = true;

      console.log('📊 Scoreboard service initialized successfully');
      console.log('📊 User ID (Firebase Auth):', this.currentUser.uid);
      console.log('📱 Device ID (Primary Identifier):', this.deviceId);
      console.log('📊 Firebase config loaded');
      console.log('📊 NOTE: Using device ID for player identification. Progress persists on this device.');
    } catch (error) {
      console.error('❌ Failed to initialize scoreboard:', error);
      throw error;
    }
  }

  async submitScore(
    scoreData: Omit<ScoreboardEntry, 'id' | 'playerId' | 'timestamp'>,
    privacySettings: PrivacySettings
  ): Promise<string | null> {
    if (!this.isInitialized || !this.currentUser) {
      console.warn('Scoreboard not initialized, cannot submit score');
      return null;
    }

    if (!privacySettings.shareScore) {
      console.log('Score sharing disabled by user');
      return null;
    }

    try {
      const entry: ScoreboardEntry = {
        ...scoreData,
        playerId: this.deviceId!,
        playerName: privacySettings.sharePlayerName
          ? scoreData.playerName
          : 'Anonymous',
        timestamp: serverTimestamp(),

        // Remove strategies if privacy disabled
        uniqueStrategies: privacySettings.shareStrategies
          ? scoreData.uniqueStrategies
          : undefined,
      };

      const docRef = await addDoc(collection(db, 'scoreboard'), entry);
      console.log('📊 Score submitted successfully:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Failed to submit score:', error);
      return null;
    }
  }

  async getTopScores(
    difficulty: 'easy' | 'medium' | 'hard' | 'all' = 'all',
    limitCount = 20
  ): Promise<ScoreboardEntry[]> {
    console.log('📊 Fetching top scores...');
    console.log('  - Difficulty:', difficulty);
    console.log('  - Limit:', limitCount);
    
    if (!this.isInitialized) {
      console.warn('❌ Scoreboard not initialized, cannot fetch scores');
      return [];
    }

    try {
      console.log('📊 Building Firestore query...');
      let q = query(
        collection(db, 'scoreboard'),
        orderBy('finalBalance', 'desc'),
        limit(limitCount)
      );

      if (difficulty !== 'all') {
        console.log('📊 Adding difficulty filter:', difficulty);
        q = query(
          collection(db, 'scoreboard'),
          where('difficulty', '==', difficulty),
          orderBy('finalBalance', 'desc'),
          limit(limitCount)
        );
      }

      console.log('📊 Executing Firestore query...');
      const querySnapshot = await getDocs(q);
      console.log('📊 Query returned', querySnapshot.size, 'documents');
      
      const scores: ScoreboardEntry[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('📊 Document:', doc.id, data);
        scores.push({
          id: doc.id,
          ...data,
        } as ScoreboardEntry);
      });

      console.log('✅ Successfully fetched', scores.length, 'scores');
      return scores;
    } catch (error) {
      console.error('❌ Failed to fetch scores:', error);
      return [];
    }
  }

  async getPlayerRank(
    playerId: string,
    difficulty: 'easy' | 'medium' | 'hard'
  ): Promise<number> {
    if (!this.isInitialized) return -1;

    try {
      // Get player's best score
      const playerQuery = query(
        collection(db, 'scoreboard'),
        where('playerId', '==', playerId),
        where('difficulty', '==', difficulty),
        orderBy('finalBalance', 'desc'),
        limit(1)
      );

      const playerSnapshot = await getDocs(playerQuery);
      if (playerSnapshot.empty) return -1;

      const playerScore = playerSnapshot.docs[0].data().finalBalance;

      // Count scores better than player's
      const betterScoresQuery = query(
        collection(db, 'scoreboard'),
        where('difficulty', '==', difficulty),
        where('finalBalance', '>', playerScore)
      );

      const betterScoresSnapshot = await getDocs(betterScoresQuery);
      return betterScoresSnapshot.size + 1; // Rank is count + 1
    } catch (error) {
      console.error('Failed to get player rank:', error);
      return -1;
    }
  }

  async getBetaStats(): Promise<{
    totalGames: number;
    averageScore: number;
    popularDifficulty: string;
    averagePlayTime: number;
  } | null> {
    if (!this.isInitialized) return null;

    try {
      const allScoresQuery = query(collection(db, 'scoreboard'));
      const snapshot = await getDocs(allScoresQuery);

      if (snapshot.empty) return null;

      const scores = snapshot.docs.map((doc) => doc.data() as ScoreboardEntry);

      const totalGames = scores.length;
      const averageScore =
        scores.reduce((sum, score) => sum + score.finalBalance, 0) / totalGames;

      // Find most popular difficulty
      const difficultyCounts = scores.reduce(
        (acc, score) => {
          acc[score.difficulty] = (acc[score.difficulty] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const popularDifficulty =
        Object.entries(difficultyCounts).sort(
          ([, a], [, b]) => b - a
        )[0]?.[0] || 'unknown';

      const averagePlayTime =
        scores.reduce((sum, score) => sum + score.completionTime, 0) /
        totalGames;

      return {
        totalGames,
        averageScore,
        popularDifficulty,
        averagePlayTime,
      };
    } catch (error) {
      console.error('Failed to get beta stats:', error);
      return null;
    }
  }

  // Auto-tracking methods for real-time updates
  async trackJokerUsage(jokerId: number, playerName: string): Promise<void> {
    console.log('🃏 Tracking joker usage - ID:', jokerId, 'Player:', playerName);

    if (!this.isInitialized || !this.deviceId) {
      console.log('❌ Cannot track joker usage - not initialized or no device ID');
      console.log('  - isInitialized:', this.isInitialized);
      console.log('  - deviceId:', this.deviceId);
      return;
    }

    try {
      console.log('🃏 Adding joker usage to player_stats collection...');
      const docData = {
        playerId: this.deviceId!,
        playerName,
        action: 'joker_used',
        jokerId,
        timestamp: serverTimestamp(),
      };
      console.log('🃏 Document data:', docData);

      const docRef = await addDoc(collection(db, 'player_stats'), docData);
      console.log('✅ Joker usage tracked successfully! Doc ID:', docRef.id);
    } catch (error) {
      console.error('❌ Failed to track joker usage:', error);
    }
  }

  async trackGameCompletion(
    finalBalance: number, 
    difficulty: string, 
    daysPlayed: number,
    playerName: string,
    totalProfit: number,
    candiesSold: number,
    jokersCollected: number,
    completionTime: number,
    totalPeriodsPlayed: number
  ): Promise<void> {
    console.log('🎮 Tracking game completion...');
    console.log('  - Final Balance:', finalBalance);
    console.log('  - Difficulty:', difficulty);
    console.log('  - Days Played:', daysPlayed);
    console.log('  - Player Name:', playerName);
    console.log('  - Total Periods:', totalPeriodsPlayed);
    
    if (!this.isInitialized || !this.deviceId) {
      console.log('❌ Cannot track game completion - not initialized or no device ID');
      return;
    }

    try {
      console.log('🎮 Adding game completion to scoreboard collection...');
      const docData = {
        playerId: this.deviceId,
        playerName,
        difficulty,
        finalBalance,
        daysPlayed,
        totalProfit,
        candiesSold,
        jokersCollected,
        minigamesPlayed: 0, // Will be tracked separately
        totalPeriodsPlayed,
        completionTime,
        gameVersion: '1.0.0-beta',
        deviceInfo: `${Platform.OS} ${Platform.Version}`,
        timestamp: serverTimestamp(),
      };
      console.log('🎮 Document data:', docData);
      
      const docRef = await addDoc(collection(db, 'scoreboard'), docData);
      console.log('✅ Game completion tracked successfully! Doc ID:', docRef.id);
    } catch (error) {
      console.error('❌ Failed to track game completion:', error);
    }
  }

  async trackMinigamePlay(minigameType: string, playerName: string): Promise<void> {
    if (!this.isInitialized || !this.deviceId) return;

    try {
      await addDoc(collection(db, 'player_stats'), {
        playerId: this.deviceId,
        playerName,
        action: 'minigame_played',
        minigameType,
        timestamp: serverTimestamp(),
      });
      console.log('🎮 Minigame play tracked:', minigameType);
    } catch (error) {
      console.error('Failed to track minigame play:', error);
    }
  }

  async getPlayedMinigames(): Promise<string[]> {
    console.log('🎮 Fetching played minigames...');

    if (!this.isInitialized || !this.deviceId) {
      console.log('❌ Cannot fetch played minigames - not initialized or no device ID');
      return [];
    }

    try {
      const q = query(
        collection(db, 'player_stats'),
        where('playerId', '==', this.deviceId),
        where('action', '==', 'minigame_played')
      );

      const querySnapshot = await getDocs(q);
      const minigames = new Set<string>();

      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.minigameType) {
          minigames.add(data.minigameType);
        }
      });

      const uniqueMinigames = Array.from(minigames);
      console.log('✅ Played minigames:', uniqueMinigames);
      return uniqueMinigames;
    } catch (error) {
      console.error('❌ Failed to fetch played minigames:', error);
      return [];
    }
  }

  async trackJokerFromMinigame(jokerName: string, jokerId: number, minigameType: string): Promise<void> {
    if (!this.isInitialized || !this.deviceId) return;

    try {
      await addDoc(collection(db, 'player_stats'), {
        playerId: this.deviceId,
        action: 'joker_from_minigame',
        jokerName,
        jokerId,
        minigameType,
        timestamp: serverTimestamp(),
      });
      console.log('🃏 Joker from minigame tracked:', jokerName, 'from', minigameType);
    } catch (error) {
      console.error('Failed to track joker from minigame:', error);
    }
  }

  async trackDailyPeriods(periodsCount: number, playerName: string): Promise<void> {
    if (!this.isInitialized || !this.deviceId) return;

    try {
      await addDoc(collection(db, 'player_stats'), {
        playerId: this.deviceId,
        playerName,
        action: 'daily_periods',
        periodsCount,
        timestamp: serverTimestamp(),
      });
      console.log('📚 Daily periods tracked:', periodsCount);
    } catch (error) {
      console.error('Failed to track daily periods:', error);
    }
  }

  async incrementGameCompletions(): Promise<number> {
    console.log('🏆 Incrementing game completions...');

    if (!this.isInitialized) {
      console.log('🏆 Auto-initializing Firebase for game completion tracking...');
      try {
        await this.initialize();
        console.log('🏆 Auto-initialization complete. isInitialized:', this.isInitialized, 'currentUser:', !!this.currentUser);
      } catch (error) {
        console.error('❌ Auto-initialization failed:', error);
        return 0;
      }
    }

    if (!this.isInitialized || !this.deviceId) {
      console.log('❌ Cannot increment completions - initialization failed');
      console.log('   isInitialized:', this.isInitialized);
      console.log('   deviceId:', this.deviceId);
      return 0;
    }

    try {
      // Add a completion record
      await addDoc(collection(db, 'player_stats'), {
        playerId: this.deviceId,
        action: 'game_completed',
        timestamp: serverTimestamp(),
      });

      // Fetch and return total completions
      const totalCompletions = await this.getTotalCompletions();
      console.log('✅ Game completion incremented! Total:', totalCompletions);
      return totalCompletions;
    } catch (error) {
      console.error('❌ Failed to increment game completions:', error);
      return 0;
    }
  }

  async getTotalCompletions(): Promise<number> {
    console.log('🏆 Fetching total game completions...');

    if (!this.isInitialized) {
      console.log('🏆 Auto-initializing Firebase for fetching completions...');
      await this.initialize();
    }

    if (!this.isInitialized || !this.deviceId) {
      console.log('❌ Cannot fetch completions - initialization failed');
      return 0;
    }

    try {
      const q = query(
        collection(db, 'player_stats'),
        where('playerId', '==', this.deviceId),
        where('action', '==', 'game_completed')
      );

      const querySnapshot = await getDocs(q);
      const count = querySnapshot.size;
      console.log('✅ Total completions:', count);
      return count;
    } catch (error) {
      console.error('❌ Failed to fetch total completions:', error);
      return 0;
    }
  }

  async trackDifficultyWin(difficultyLevel: number): Promise<void> {
    console.log('🏆 Tracking difficulty win for level:', difficultyLevel);

    if (!this.isInitialized || !this.deviceId) {
      console.log('❌ Cannot track difficulty win - not initialized or no device ID');
      return;
    }

    if (!difficultyLevel || difficultyLevel < 1) {
      console.error('❌ Cannot track difficulty win - invalid difficulty level:', difficultyLevel);
      return;
    }

    try {
      await addDoc(collection(db, 'player_stats'), {
        playerId: this.deviceId,
        action: 'difficulty_won',
        difficultyLevel,
        timestamp: serverTimestamp(),
      });
      console.log('✅ Difficulty win tracked for level:', difficultyLevel, 'for device:', this.deviceId);
    } catch (error) {
      console.error('❌ Failed to track difficulty win:', error);
    }
  }

  async getWonDifficulties(): Promise<number[]> {
    console.log('🏆 Fetching won difficulties...');

    if (!this.isInitialized) {
      console.log('🏆 Auto-initializing Firebase for fetching won difficulties...');
      await this.initialize();
    }

    if (!this.isInitialized || !this.deviceId) {
      console.log('❌ Cannot fetch won difficulties - initialization failed');
      console.log('   isInitialized:', this.isInitialized);
      console.log('   deviceId:', this.deviceId);
      return [];
    }

    try {
      console.log('🏆 Querying player_stats for device:', this.deviceId);
      const q = query(
        collection(db, 'player_stats'),
        where('playerId', '==', this.deviceId),
        where('action', '==', 'difficulty_won')
      );

      const querySnapshot = await getDocs(q);
      console.log('🏆 Query returned', querySnapshot.size, 'documents');

      const wonDifficulties = new Set<number>();

      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log('🏆 Document data:', data);
        if (data.difficultyLevel) {
          wonDifficulties.add(data.difficultyLevel);
        }
      });

      const uniqueDifficulties = Array.from(wonDifficulties).sort((a, b) => a - b);
      console.log('✅ Won difficulties:', uniqueDifficulties);
      return uniqueDifficulties;
    } catch (error) {
      console.error('❌ Failed to fetch won difficulties:', error);
      return [];
    }
  }

  async hasDifficultyBeenWon(difficultyLevel: number): Promise<boolean> {
    const wonDifficulties = await this.getWonDifficulties();
    return wonDifficulties.includes(difficultyLevel);
  }

  // Analytics methods for leaderboard
  async getMostObtainedJokersFromMinigames(limit: number = 10): Promise<Array<{jokerName: string, count: number, jokerId: number}>> {
    if (!this.isInitialized) await this.initialize();

    try {
      console.log('📊 Fetching most obtained jokers from minigames...');
      
      const q = query(
        collection(db, 'player_stats'),
        where('action', '==', 'joker_from_minigame')
      );
      
      const querySnapshot = await getDocs(q);
      const jokerCounts = new Map<string, {count: number, jokerId: number}>();
      
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const key = data.jokerName;
        if (jokerCounts.has(key)) {
          jokerCounts.get(key)!.count++;
        } else {
          jokerCounts.set(key, {count: 1, jokerId: data.jokerId});
        }
      });
      
      const sortedJokers = Array.from(jokerCounts.entries())
        .map(([jokerName, {count, jokerId}]) => ({jokerName, count, jokerId}))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
      
      console.log('📊 Most obtained jokers from minigames:', sortedJokers);
      return sortedJokers;
    } catch (error) {
      console.error('❌ Failed to fetch joker analytics:', error);
      return [];
    }
  }

  async getMostPlayedMinigames(limit: number = 10): Promise<Array<{minigameType: string, count: number}>> {
    if (!this.isInitialized) await this.initialize();

    try {
      console.log('📊 Fetching most played minigames...');
      
      const q = query(
        collection(db, 'player_stats'),
        where('action', '==', 'minigame_played')
      );
      
      const querySnapshot = await getDocs(q);
      const minigameCounts = new Map<string, number>();
      
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const minigameType = data.minigameType;
        if (minigameCounts.has(minigameType)) {
          minigameCounts.set(minigameType, minigameCounts.get(minigameType)! + 1);
        } else {
          minigameCounts.set(minigameType, 1);
        }
      });
      
      const sortedMinigames = Array.from(minigameCounts.entries())
        .map(([minigameType, count]) => ({minigameType, count}))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
      
      console.log('📊 Most played minigames:', sortedMinigames);
      return sortedMinigames;
    } catch (error) {
      console.error('❌ Failed to fetch minigame analytics:', error);
      return [];
    }
  }

}

// Export singleton instance
export const scoreboardService = new ScoreboardService();

// Helper function to generate score data from game state
export const generateScoreData = (
  gameState: any,
  walletState: any,
  inventoryState: any,
  jokersState: any,
  playerName: string,
  startTime: number
): Omit<ScoreboardEntry, 'id' | 'playerId' | 'timestamp'> => {
  const completionTimeMinutes = Math.round((Date.now() - startTime) / 60000);

  return {
    playerName: playerName || 'Beta Tester',
    difficulty: walletState.difficulty || 'easy',
    finalBalance: walletState.balance + walletState.stashedAmount,
    daysPlayed: gameState.day || 1,
    totalProfit: Math.max(
      0,
      walletState.balance + walletState.stashedAmount - 20
    ), // Profit over starting amount
    candiesSold: calculateTotalCandiesSold(inventoryState),
    jokersCollected: jokersState.jokers?.length || 0,
    completionTime: completionTimeMinutes,
    gameVersion: '1.0.0-beta',
    deviceInfo: `${Platform.OS} ${Platform.Version}`,

    // Beta testing analytics
    crashCount: 0, // Would be tracked separately
    feedbackProvided: false, // Could be set when user provides feedback
    uniqueStrategies: extractStrategies(gameState, jokersState),
  };
};

// Helper to calculate total candies sold (would need inventory tracking)
const calculateTotalCandiesSold = (inventoryState: any): number => {
  // This would need to be tracked during gameplay
  // For now, estimate based on inventory turnover
  return 0; // Placeholder
};

// Helper to extract unique strategies used
const extractStrategies = (gameState: any, jokersState: any): string[] => {
  const strategies: string[] = [];

  // Analyze joker combinations
  if (jokersState.jokers?.length > 3) strategies.push('joker_collector');
  if (gameState.daysPlayed > 10) strategies.push('long_term_player');

  return strategies;
};

// Platform import for device info
import { Platform } from 'react-native';
