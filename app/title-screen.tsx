import React, { useState, useEffect } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import CandyWarsTitleScreen from './components/CandyWarsTitleScreen';
import { useWallet } from '../src/context/WalletContext';
import { useGame } from '../src/context/GameContext';
import { useInventory } from '../src/context/InventoryContext';
import { useJokers } from '../src/context/JokerContext';
import { useFlavorText } from '../src/context/FlavorTextContext';
import { useSeed } from '../src/context/SeedContext';
import { nameValidationService } from '../src/services/nameValidationService';
import { loadPlayerId } from '../src/utils/persistence';

export default function TitleScreenPage() {
  const walletContext = useWallet();
  const { resetGame } = useGame();
  const { resetInventory } = useInventory();
  const { resetJokers } = useJokers();
  const { resetFlavorText } = useFlavorText();
  const { setSeed } = useSeed();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const [firebaseCheckComplete, setFirebaseCheckComplete] = useState(false);

  const initializeWallet = walletContext?.initializeWallet || (() => {});

  // Load player data from Firebase before showing title screen
  useEffect(() => {
    const loadPlayerDataFromFirebase = async () => {
      try {
        console.log('🔍 TitleScreen: Starting Firebase user data lookup...');
        setIsLoadingUserData(true);
        
        // Try to get persistent player ID
        const persistentPlayerId = await loadPlayerId();
        console.log('🔍 TitleScreen: Persistent player ID from storage:', persistentPlayerId);
        
        if (persistentPlayerId) {
          // Check Firebase for existing name using this ID
          console.log('🔍 TitleScreen: Checking Firebase for existing name with player ID:', persistentPlayerId);
          
          try {
            const existingName = await nameValidationService.getPlayerName(persistentPlayerId);
            console.log('🔍 TitleScreen: Firebase lookup result - existing name:', existingName);
            
            if (existingName) {
              console.log('✅ TitleScreen: Found existing player name in Firebase:', existingName);
              // The name will be loaded by WalletContext, we just log here for visibility
            } else {
              console.log('❌ TitleScreen: No existing name found in Firebase for player ID:', persistentPlayerId);
            }
          } catch (firebaseError) {
            console.error('❌ TitleScreen: Firebase query failed:', firebaseError);
          }
        } else {
          console.log('❌ TitleScreen: No persistent player ID found in storage');
        }
        
        setFirebaseCheckComplete(true);
      } catch (error) {
        console.error('❌ TitleScreen: Error during Firebase user data lookup:', error);
        setFirebaseCheckComplete(true);
      } finally {
        setIsLoadingUserData(false);
        console.log('✅ TitleScreen: Firebase user data lookup complete');
      }
    };

    loadPlayerDataFromFirebase();
  }, []);

  // Force component refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('📱 Title screen focused, refreshing component');
      setRefreshKey(prev => prev + 1);
    }, [])
  );

  const handleNewGame = async (difficulty: 'easy' | 'medium' | 'hard' | number) => {
    try {
      // Reset all game data for a fresh start
      await resetGame();

      // Reset all contexts
      resetInventory();
      resetJokers();
      resetFlavorText();

      // Generate new seed for fresh game data and candy prices
      const newSeed = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setSeed(newSeed);

      // Note: Wallet reset and initialization is already handled in CandyWarsTitleScreen
      // when the user selects difficulty and optionally enters a name
      // Don't call resetWallet() here as it would override the debt set by initializeWallet()

      router.replace('/(tabs)/market');
    } catch (error) {
      console.error('Error starting new game:', error);
    }
  };

  const handleContinue = () => {
    // Navigate directly to market tab
    router.replace('/(tabs)/market');
  };

  const handleSettings = () => {
    router.push('/(tabs)/settings');
  };

  // Show loading screen while checking Firebase
  if (isLoadingUserData || !firebaseCheckComplete) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading player data...</Text>
        <Text style={styles.loadingSubtext}>Checking Firebase for existing profile</Text>
      </View>
    );
  }

  return (
    <CandyWarsTitleScreen
      key={refreshKey} // Force remount when screen comes into focus
      onNewGame={handleNewGame}
      onContinue={handleContinue}
      onSettings={handleSettings}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  loadingSubtext: {
    color: '#CCCCCC',
    fontSize: 16,
    textAlign: 'center',
  },
});