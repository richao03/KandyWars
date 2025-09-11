/**
 * Scoreboard Context for CandyWarz Beta
 * 
 * Manages scoreboard state, privacy settings, and score submission
 * for beta testing leaderboard functionality.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { scoreboardService, ScoreboardEntry, PrivacySettings, generateScoreData } from '../services/firebase';
import { useGame } from './GameContext';
import { useWallet } from './WalletContext';
import { useInventory } from './InventoryContext';
import { useJokers } from './JokerContext';
import { saveData, loadData } from '../utils/persistence';

interface ScoreboardContextType {
  // Scoreboard data
  topScores: ScoreboardEntry[];
  playerRank: number;
  betaStats: {
    totalGames: number;
    averageScore: number;
    popularDifficulty: string;
    averagePlayTime: number;
  } | null;
  
  // Privacy settings
  privacySettings: PrivacySettings;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => void;
  
  // Player info
  playerName: string;
  setPlayerName: (name: string) => void;
  
  // Actions  
  refreshScoreboard: () => Promise<void>;
  
  // Auto-tracking methods
  trackJokerUsed: (jokerId: number) => Promise<void>;
  trackGameCompleted: () => Promise<void>;
  trackMinigamePlayed: (minigameType: string) => Promise<void>;
  trackDayEnded: (periodsCount: number) => Promise<void>;
  
  // State
  isLoading: boolean;
  isSubmitting: boolean;
  lastSubmissionId: string | null;
  gameStartTime: number;
}

const ScoreboardContext = createContext<ScoreboardContextType | undefined>(undefined);

interface ScoreboardProviderProps {
  children: React.ReactNode;
}


export const ScoreboardProvider: React.FC<ScoreboardProviderProps> = ({ children }) => {
  // Game state hooks
  const game = useGame();
  const wallet = useWallet();
  const inventory = useInventory();
  const jokers = useJokers();
  
  // Local state
  const [topScores, setTopScores] = useState<ScoreboardEntry[]>([]);
  const [playerRank, setPlayerRank] = useState<number>(-1);
  const [betaStats, setBetaStats] = useState<ScoreboardContextType['betaStats']>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmissionId, setLastSubmissionId] = useState<string | null>(null);
  const [gameStartTime, setGameStartTime] = useState<number>(Date.now());
  
  // Privacy settings with sensible defaults for beta testing
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    shareScore: true,      // Enable by default for beta testing
    sharePlayerName: true, // Enable by default for beta testing
    shareStrategies: true, // Enable by default for beta testing
    allowAnalytics: true,  // Enable by default for beta testing
  });
  
  // Get player name from wallet context - use actual name, don't generate random
  const playerName = wallet?.playerName || 'Player';

  // Initialize Firebase and load saved settings
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('📊 Initializing scoreboard context...');
        
        // Initialize Firebase
        await scoreboardService.initialize();
        console.log('✅ Firebase initialized');
        
        // Player name is now managed by WalletContext
        // No need to load/save here
        
        // Load saved privacy settings
        const savedPrivacy = await loadData('privacy_settings', null);
        if (savedPrivacy) {
          setPrivacySettings(savedPrivacy);
        }
        
        // Load game start time or set new one
        const savedStartTime = await loadData('game_start_time', null);
        if (savedStartTime) {
          setGameStartTime(savedStartTime);
        } else {
          const startTime = Date.now();
          setGameStartTime(startTime);
          await saveData('game_start_time', startTime);
        }
        
        console.log('📊 Scoreboard context initialized with player:', playerName);
      } catch (error) {
        console.error('Failed to initialize scoreboard context:', error);
      }
    };
    
    initialize();
  }, [wallet?.playerName]);

  // Update privacy settings
  const updatePrivacySettings = useCallback(async (newSettings: Partial<PrivacySettings>) => {
    const updated = { ...privacySettings, ...newSettings };
    setPrivacySettings(updated);
    await saveData('privacy_settings', updated);
  }, [privacySettings]);

  // Update player name - delegate to wallet context
  const setPlayerName = useCallback(async (name: string) => {
    if (wallet?.setPlayerName) {
      wallet.setPlayerName(name);
    }
  }, [wallet]);

  // Auto-tracking methods
  const trackJokerUsed = useCallback(async (jokerId: number): Promise<void> => {
    console.log('🔄 ScoreboardContext: trackJokerUsed called with ID:', jokerId);
    console.log('🔄 Player name:', playerName);
    
    try {
      console.log('🔄 Calling scoreboardService.trackJokerUsage...');
      await scoreboardService.trackJokerUsage(jokerId, playerName);
      console.log('✅ Joker tracking completed');
      // Note: Removed auto-refresh to prevent excessive calls
    } catch (error) {
      console.error('❌ Failed to track joker usage:', error);
    }
  }, [wallet?.playerName]);

  const trackGameCompleted = useCallback(async (): Promise<void> => {
    console.log('🔄 ScoreboardContext: trackGameCompleted called');
    console.log('🔄 Game state:', !!game);
    console.log('🔄 Wallet state:', !!wallet);
    
    if (!game || !wallet) {
      console.log('❌ Cannot track game completion - missing game or wallet state');
      return;
    }
    
    try {
      const finalBalance = wallet.balance + wallet.stashedAmount;
      const totalProfit = Math.max(0, finalBalance - 20); // Starting amount is $20
      const completionTime = Math.round((Date.now() - gameStartTime) / 60000);
      const jokersCollected = jokers?.jokers?.length || 0;
      const totalPeriods = game.periodCount * game.day; // Total periods played
      
      console.log('🔄 Calculated game completion data:');
      console.log('  - Final Balance:', finalBalance);
      console.log('  - Total Profit:', totalProfit);
      console.log('  - Completion Time:', completionTime, 'minutes');
      console.log('  - Jokers Collected:', jokersCollected);
      console.log('  - Total Periods:', totalPeriods);
      console.log('  - Difficulty:', wallet.difficulty);
      
      console.log('🔄 Calling scoreboardService.trackGameCompletion...');
      await scoreboardService.trackGameCompletion(
        finalBalance,
        wallet.difficulty || 'easy',
        game.day,
        playerName,
        totalProfit,
        0, // candiesSold - would need inventory tracking
        jokersCollected,
        completionTime,
        totalPeriods
      );
      
      console.log('✅ Game completion tracking completed');
      // Note: Removed auto-refresh to prevent excessive calls
    } catch (error) {
      console.error('❌ Failed to track game completion:', error);
    }
  }, [game, wallet, jokers, playerName, gameStartTime]);

  const trackMinigamePlayed = useCallback(async (minigameType: string): Promise<void> => {
    try {
      await scoreboardService.trackMinigamePlay(minigameType, playerName);
      console.log('✅ Minigame tracking completed');
      // Note: Removed auto-refresh to prevent excessive calls
    } catch (error) {
      console.error('Failed to track minigame play:', error);
    }
  }, [wallet?.playerName]);

  const trackDayEnded = useCallback(async (periodsCount: number): Promise<void> => {
    try {
      await scoreboardService.trackDailyPeriods(periodsCount, playerName);
      console.log('✅ Daily periods tracking completed');
      // Note: Removed auto-refresh to prevent excessive calls
    } catch (error) {
      console.error('Failed to track day end:', error);
    }
  }, [wallet?.playerName]);

  // Manual refresh function (only called when user explicitly requests it)
  const refreshScoreboard = useCallback(async () => {
    console.log('🔄 ScoreboardContext: Manual refresh requested');
    
    if (isLoading) {
      console.log('❌ Already loading, skipping refresh');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const difficulty = wallet?.difficulty || 'easy';
      const scores = await scoreboardService.getTopScores(difficulty, 50);
      setTopScores(scores);
      
      if (lastSubmissionId) {
        const rank = await scoreboardService.getPlayerRank(lastSubmissionId, difficulty);
        setPlayerRank(rank);
      }
      
      const stats = await scoreboardService.getBetaStats();
      setBetaStats(stats);
      
      console.log('✅ Manual refresh completed');
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [wallet?.difficulty, lastSubmissionId, isLoading]); // Include necessary dependencies

  // No automatic loading - data will be loaded when modal opens

  // Reset game start time when starting a new game
  useEffect(() => {
    if (game?.periodCount === 0 && game?.day === 1) {
      const startTime = Date.now();
      setGameStartTime(startTime);
      saveData('game_start_time', startTime);
    }
  }, [game?.periodCount, game?.day]);

  const value: ScoreboardContextType = {
    // Scoreboard data
    topScores,
    playerRank,
    betaStats,
    
    // Privacy settings
    privacySettings,
    updatePrivacySettings,
    
    // Player info
    playerName,
    setPlayerName,
    
    // Actions
    refreshScoreboard,
    
    // Auto-tracking methods
    trackJokerUsed,
    trackGameCompleted,
    trackMinigamePlayed,
    trackDayEnded,
    
    // State
    isLoading,
    isSubmitting,
    lastSubmissionId,
    gameStartTime,
  };

  return (
    <ScoreboardContext.Provider value={value}>
      {children}
    </ScoreboardContext.Provider>
  );
};

export const useScoreboard = (): ScoreboardContextType => {
  const context = useContext(ScoreboardContext);
  if (!context) {
    throw new Error('useScoreboard must be used within ScoreboardProvider');
  }
  return context;
};

export default ScoreboardProvider;