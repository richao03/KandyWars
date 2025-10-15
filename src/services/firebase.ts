/**
 * Firebase Configuration for CandyWarz
 *
 * This file handles Firebase setup with optimized data structure:
 * - Single user object per device
 * - Universal analytics counters
 * - In-memory caching for performance
 */

import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, User, getAuth, signInAnonymously } from 'firebase/auth';
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  increment,
  collection,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  addDoc,
  where,
  deleteDoc,
} from 'firebase/firestore';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Firebase configuration
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

// User object interface - single record per device
export interface UserObject {
  deviceId: string;
  playerName?: string; // Optional player name (defaults to "Player")
  difficultyWon: number[]; // Array of difficulty levels won
  unlockedHallPasses: string[]; // Array of hall pass IDs
  playedMinigames: string[]; // Array of minigame IDs that have been played at least once
  totalWinCount: number; // Total number of wins
  highestSingleSale: number; // Highest single transaction
  lastUpdated: number; // Timestamp in milliseconds (serializable for Redux)
}

// Universal minigame counter
export interface MinigameStats {
  [minigameName: string]: number; // Game name -> play count
}

// Universal joker counter
export interface JokerStats {
  [jokerName: string]: number; // Joker name -> selection count
}

class ScoreboardService {
  private isInitialized = false;
  private currentUser: User | null = null;
  private deviceId: string | null = null;
  private cachedUserObject: UserObject | null = null; // In-memory cache
  private lastFetchTime: number | null = null; // Timestamp of last Firebase fetch
  private readonly CACHE_STALE_MS = 5 * 60 * 1000; // 5 minutes

  // Initialize Firebase auth only (for scoreboard/settings that don't need user object)
  async initializeAuth(): Promise<void> {
    if (this.isInitialized) {
      console.log('📊 Firebase auth already initialized');
      return;
    }

    try {
      console.log('📊 Initializing Firebase auth...');
      initializeFirebase();

      console.log('📊 Signing in anonymously...');
      const userCredential = await signInAnonymously(auth);
      this.currentUser = userCredential.user;

      // Use Firebase Auth UID as the document ID (for security rules)
      this.deviceId = userCredential.user.uid;
      console.log('📱 User ID (Auth UID):', this.deviceId);

      this.isInitialized = true;

      console.log('✅ Firebase auth initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Firebase auth:', error);
      throw error;
    }
  }

  // Initialize Firebase and fetch user object (for app start)
  async initialize(): Promise<UserObject> {
    // First ensure auth is initialized
    await this.initializeAuth();

    // If we have cached user object, return it
    if (this.cachedUserObject) {
      console.log('📊 Returning cached user object');
      return this.cachedUserObject;
    }

    try {
      // Fetch and cache user object
      const userObject = await this.fetchUserObject();
      this.cachedUserObject = userObject;
      this.lastFetchTime = Date.now();

      console.log('✅ User object loaded and cached:', userObject);
      return userObject;
    } catch (error) {
      console.error('❌ Failed to initialize Firebase:', error);
      throw error;
    }
  }

  // Fetch user object from Firebase (or create if doesn't exist)
  async fetchUserObject(): Promise<UserObject> {
    if (!this.isInitialized || !this.deviceId) {
      throw new Error('Firebase not initialized');
    }

    try {
      const userDocRef = doc(db, 'users', this.deviceId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const rawData = userDoc.data();
        // Convert Firebase data to UserObject with serializable timestamp
        const userData: UserObject = {
          deviceId: rawData.deviceId,
          playerName: rawData.playerName || 'Player',
          difficultyWon: rawData.difficultyWon || [],
          unlockedHallPasses: rawData.unlockedHallPasses || [],
          playedMinigames: rawData.playedMinigames || [],
          totalWinCount: rawData.totalWinCount || 0,
          highestSingleSale: rawData.highestSingleSale || 0,
          // Convert Firebase Timestamp to number (milliseconds)
          lastUpdated: rawData.lastUpdated?.toMillis?.() || Date.now(),
        };
        console.log('📊 User object fetched from Firebase:', userData);
        return userData;
      } else {
        // Create new user object
        const newUser: UserObject = {
          deviceId: this.deviceId,
          playerName: 'Player',
          difficultyWon: [],
          unlockedHallPasses: [],
          playedMinigames: [],
          totalWinCount: 0,
          highestSingleSale: 0,
          lastUpdated: Date.now(),
        };

        // Save to Firebase with serverTimestamp
        await setDoc(userDocRef, {
          ...newUser,
          lastUpdated: serverTimestamp(),
        });
        console.log('📊 New user object created:', newUser);
        return newUser;
      }
    } catch (error) {
      console.error('❌ Failed to fetch user object:', error);
      throw error;
    }
  }

  // Get cached user object (fast, no Firebase call)
  getCachedUserObject(): UserObject | null {
    return this.cachedUserObject;
  }

  // Set cached user object from external source (e.g., Redux)
  setCachedUserObject(userObject: UserObject): void {
    this.cachedUserObject = userObject;
    this.lastFetchTime = Date.now();
    console.log('📦 User object restored to service cache:', userObject);
  }

  // Refresh user object from Firebase and update cache (with staleness check)
  async refreshUserObject(force: boolean = false): Promise<UserObject> {
    // Check if cache is still fresh
    if (!force && this.cachedUserObject && this.lastFetchTime) {
      const cacheAge = Date.now() - this.lastFetchTime;
      if (cacheAge < this.CACHE_STALE_MS) {
        console.log(`📊 Cache is still fresh (${Math.round(cacheAge / 1000)}s old), skipping refresh`);
        return this.cachedUserObject;
      }
      console.log(`🔄 Cache is stale (${Math.round(cacheAge / 1000)}s old), refreshing...`);
    }

    console.log('🔄 Refreshing user object from Firebase...');
    const userObject = await this.fetchUserObject();
    this.cachedUserObject = userObject;
    this.lastFetchTime = Date.now();
    console.log('✅ User object refreshed and cached:', userObject);
    return userObject;
  }

  // Update local cache (call this when values change during gameplay)
  updateLocalUserObject(updates: Partial<UserObject>): void {
    if (this.cachedUserObject) {
      this.cachedUserObject = {
        ...this.cachedUserObject,
        ...updates,
      };
      console.log('📝 Local user object updated:', this.cachedUserObject);
    }
  }

  // Clear user object cache (call when starting new game to force fresh fetch)
  clearUserObjectCache(): void {
    this.cachedUserObject = null;
    this.lastFetchTime = null;
    console.log('🗑️ User object cache cleared - next access will fetch from Firebase');
  }

  // Write user object to Firebase (call at game end)
  async saveUserObject(userObject: UserObject): Promise<void> {
    if (!this.isInitialized || !this.deviceId) {
      throw new Error('Firebase not initialized');
    }

    try {
      const userDocRef = doc(db, 'users', this.deviceId);
      // Save to Firebase with serverTimestamp
      await setDoc(userDocRef, {
        ...userObject,
        lastUpdated: serverTimestamp(),
      });

      // Update cache with current timestamp (serializable)
      const updatedUserObject = {
        ...userObject,
        lastUpdated: Date.now(),
      };
      this.cachedUserObject = updatedUserObject;
      console.log('✅ User object saved to Firebase:', updatedUserObject);
    } catch (error) {
      console.error('❌ Failed to save user object:', error);
      throw error;
    }
  }

  // Delete user object from Firebase (call when clearing all data)
  async deleteUserObject(): Promise<void> {
    if (!this.isInitialized || !this.deviceId) {
      throw new Error('Firebase not initialized');
    }

    try {
      // Delete user-scoped analytics subcollection
      console.log('🗑️ Deleting user analytics subcollection...');
      const analyticsCollectionRef = collection(db, 'users', this.deviceId, 'analytics');
      const analyticsSnapshot = await getDocs(analyticsCollectionRef);

      const deletePromises = analyticsSnapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      console.log(`✅ Deleted ${analyticsSnapshot.size} analytics documents`);

      // Delete main user document
      const userDocRef = doc(db, 'users', this.deviceId);
      await deleteDoc(userDocRef);
      console.log('✅ User object deleted from Firebase');

      // Clear local cache
      this.cachedUserObject = null;
      this.lastFetchTime = null;
    } catch (error) {
      console.error('❌ Failed to delete user object:', error);
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

  // Batch update minigame stats - called at game end
  // Writes to BOTH user-scoped AND global analytics for hybrid approach
  async batchUpdateMinigameStats(minigameCounts: { [minigameName: string]: number }): Promise<void> {
    if (!this.isInitialized || !this.deviceId) return;

    try {
      const updates: any = {};

      // Create increment operations for each minigame
      Object.entries(minigameCounts).forEach(([minigame, count]) => {
        updates[minigame] = increment(count);
      });

      // Write to user-scoped analytics (secure, audit trail)
      const userAnalyticsRef = doc(db, 'users', this.deviceId, 'analytics', 'minigameStats');
      await setDoc(userAnalyticsRef, updates, { merge: true });

      // Write to global analytics (fast reads for leaderboard)
      const globalAnalyticsRef = doc(db, 'analytics', 'minigameStats');
      await setDoc(globalAnalyticsRef, updates, { merge: true });

      console.log('✅ Batch updated minigame stats (user-scoped + global):', minigameCounts);
    } catch (error) {
      console.error('❌ Failed to batch update minigame stats:', error);
      throw error;
    }
  }

  // Deprecated - use batchUpdateMinigameStats
  async trackMinigamePlay(minigameType: string): Promise<void> {
    console.warn('⚠️ trackMinigamePlay is deprecated - use batchUpdateMinigameStats');
    await this.batchUpdateMinigameStats({ [minigameType]: 1 });
  }

  // Get global joker stats for leaderboard/popularity display
  async getGlobalJokerStats(): Promise<{ [jokerName: string]: number } | null> {
    if (!this.isInitialized) return null;

    try {
      const statsDocRef = doc(db, 'analytics', 'jokerStats');
      const statsDoc = await getDoc(statsDocRef);

      if (statsDoc.exists()) {
        const data = statsDoc.data() as { [jokerName: string]: number };
        console.log('📊 Fetched global joker stats:', data);
        return data;
      }

      console.log('📊 No global joker stats found');
      return {};
    } catch (error) {
      console.error('❌ Failed to fetch global joker stats:', error);
      return null;
    }
  }

  // Get global minigame stats for leaderboard/popularity display
  async getGlobalMinigameStats(): Promise<{ [minigameName: string]: number } | null> {
    if (!this.isInitialized) return null;

    try {
      const statsDocRef = doc(db, 'analytics', 'minigameStats');
      const statsDoc = await getDoc(statsDocRef);

      if (statsDoc.exists()) {
        const data = statsDoc.data() as { [minigameName: string]: number };
        console.log('📊 Fetched global minigame stats:', data);
        return data;
      }

      console.log('📊 No global minigame stats found');
      return {};
    } catch (error) {
      console.error('❌ Failed to fetch global minigame stats:', error);
      return null;
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

  // Batch update joker stats - called at game end
  // Writes to BOTH user-scoped AND global analytics for hybrid approach
  async batchUpdateJokerStats(jokerCounts: { [jokerName: string]: number }): Promise<void> {
    if (!this.isInitialized || !this.deviceId) return;

    try {
      const updates: any = {};

      // Create increment operations for each joker
      Object.entries(jokerCounts).forEach(([joker, count]) => {
        updates[joker] = increment(count);
      });

      // Write to user-scoped analytics (secure, audit trail)
      const userAnalyticsRef = doc(db, 'users', this.deviceId, 'analytics', 'jokerStats');
      await setDoc(userAnalyticsRef, updates, { merge: true });

      // Write to global analytics (fast reads for leaderboard)
      const globalAnalyticsRef = doc(db, 'analytics', 'jokerStats');
      await setDoc(globalAnalyticsRef, updates, { merge: true });

      console.log('✅ Batch updated joker stats (user-scoped + global):', jokerCounts);
    } catch (error) {
      console.error('❌ Failed to batch update joker stats:', error);
      throw error;
    }
  }

  // Deprecated - use batchUpdateJokerStats
  async trackJokerFromMinigame(jokerName: string): Promise<void> {
    console.warn('⚠️ trackJokerFromMinigame is deprecated - use batchUpdateJokerStats');
    await this.batchUpdateJokerStats({ [jokerName]: 1 });
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

  // Deprecated - use updateLocalUserObject and saveUserObject instead
  // Kept for backward compatibility during migration
  async incrementGameCompletions(): Promise<number> {
    console.log('⚠️ incrementGameCompletions is deprecated - use user object methods');
    return this.getTotalWinCount();
  }

  // Renamed from getTotalCompletions - now uses cached user object
  getTotalWinCount(): number {
    console.log('🏆 Getting total win count from cache...');

    if (!this.cachedUserObject) {
      console.warn('⚠️ User object not cached yet');
      return 0;
    }

    console.log('✅ Total win count:', this.cachedUserObject.totalWinCount);
    return this.cachedUserObject.totalWinCount;
  }

  // Backward compatibility alias
  async getTotalCompletions(): Promise<number> {
    console.log('⚠️ getTotalCompletions is deprecated - use getTotalWinCount');
    return this.getTotalWinCount();
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

  // Now uses cached user object instead of Firebase query
  getWonDifficulties(): number[] {
    console.log('🏆 Getting won difficulties from cache...');

    if (!this.cachedUserObject) {
      console.warn('⚠️ User object not cached yet');
      return [];
    }

    console.log('✅ Won difficulties:', this.cachedUserObject.difficultyWon);
    return this.cachedUserObject.difficultyWon;
  }

  hasDifficultyBeenWon(difficultyLevel: number): boolean {
    const wonDifficulties = this.getWonDifficulties();
    return wonDifficulties.includes(difficultyLevel);
  }

  // Analytics methods for leaderboard - reads from universal counters
  async getMostObtainedJokersFromMinigames(limit: number = 10): Promise<Array<{jokerName: string, count: number}>> {
    if (!this.isInitialized) await this.initialize();

    try {
      console.log('📊 Fetching joker stats from universal counters...');

      const statsDocRef = doc(db, 'analytics', 'jokerStats');
      const statsDoc = await getDoc(statsDocRef);

      if (!statsDoc.exists()) {
        console.log('📊 No joker stats found');
        return [];
      }

      const jokerStats = statsDoc.data() as JokerStats;

      const sortedJokers = Object.entries(jokerStats)
        .map(([jokerName, count]) => ({jokerName, count}))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      console.log('✅ Most obtained jokers:', sortedJokers);
      return sortedJokers;
    } catch (error) {
      console.error('❌ Failed to fetch joker analytics:', error);
      return [];
    }
  }

  async getMostPlayedMinigames(limit: number = 10): Promise<Array<{minigameType: string, count: number}>> {
    if (!this.isInitialized) await this.initialize();

    try {
      console.log('📊 Fetching minigame stats from universal counters...');

      const statsDocRef = doc(db, 'analytics', 'minigameStats');
      const statsDoc = await getDoc(statsDocRef);

      if (!statsDoc.exists()) {
        console.log('📊 No minigame stats found');
        return [];
      }

      const minigameStats = statsDoc.data() as MinigameStats;

      const sortedMinigames = Object.entries(minigameStats)
        .map(([minigameType, count]) => ({minigameType, count}))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      console.log('✅ Most played minigames:', sortedMinigames);
      return sortedMinigames;
    } catch (error) {
      console.error('❌ Failed to fetch minigame analytics:', error);
      return [];
    }
  }

}

// Export singleton instance
export const scoreboardService = new ScoreboardService();
