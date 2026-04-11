import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  GAME_STATE: 'candyWarz_gameState',
  INVENTORY: 'candyWarz_inventory',
  WALLET: 'candyWarz_wallet',
  JOKERS: 'candyWarz_jokers',
  SEED: 'candyWarz_seed',
  PROCESSED_EVENTS: 'candyWarz_processedEvents',
  PLAYER_ID: 'candyWarz_playerId',
  PLAYER_NAME_STATUS: 'candyWarz_playerNameStatus',
  FORCE_RESET_FLAG: 'candyWarz_forceResetFlag',
} as const;

// Generic save/load functions
export const saveData = async (key: string, data: any): Promise<boolean> => {
  try {
    const jsonString = JSON.stringify(data);
    await AsyncStorage.setItem(key, jsonString);
    return true;
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
    return false;
  }
};

export const loadData = async <T>(key: string, defaultValue: T): Promise<T> => {
  try {
    const data = await AsyncStorage.getItem(key);
    if (data !== null) {
      const parsed = JSON.parse(data);
      return parsed;
    }
    return defaultValue;
  } catch (error) {
    console.error(`Failed to load ${key}:`, error);
    return defaultValue;
  }
};

export const clearData = async (key: string): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(key);
    if (__DEV__) console.log(`Cleared ${key} successfully`);
    return true;
  } catch (error) {
    console.error(`Failed to clear ${key}:`, error);
    return false;
  }
};

export const clearGameProgress = async (): Promise<boolean> => {
  try {
    // Clear only game progress data, preserve player identity
    const gameProgressKeys = [
      STORAGE_KEYS.GAME_STATE,
      STORAGE_KEYS.INVENTORY,
      STORAGE_KEYS.WALLET,
      STORAGE_KEYS.JOKERS,
      STORAGE_KEYS.SEED,
      STORAGE_KEYS.PROCESSED_EVENTS,
    ];
    await AsyncStorage.multiRemove(gameProgressKeys);
    if (__DEV__) console.log('🗑️ Cleared game progress data successfully (preserved player identity)');

    // Set force reset flag to ensure GameContext ignores any remaining saved state
    await setForceResetFlag();
    if (__DEV__) console.log('🔄 Set force reset flag for next GameContext load');

    // Double-check that game state is actually cleared
    const gameState = await AsyncStorage.getItem(STORAGE_KEYS.GAME_STATE);
    if (gameState) {
      console.warn('⚠️ Game state still exists after clear, forcing removal');
      await AsyncStorage.removeItem(STORAGE_KEYS.GAME_STATE);
    } else {
      if (__DEV__) console.log('✅ Confirmed game state cleared');
    }

    return true;
  } catch (error) {
    console.error('Failed to clear game progress data:', error);
    return false;
  }
};

export const clearAllGameData = async (): Promise<boolean> => {
  try {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    if (__DEV__) console.log('Cleared all game data successfully');
    return true;
  } catch (error) {
    console.error('Failed to clear all game data:', error);
    return false;
  }
};

// Specific save/load functions for each context
export const saveGameState = (gameState: any, customKey?: string) => 
  saveData(customKey || STORAGE_KEYS.GAME_STATE, gameState);

export const loadGameState = (defaultState: any, customKey?: string) => 
  loadData(customKey || STORAGE_KEYS.GAME_STATE, defaultState);

export const saveInventory = (inventory: any) => 
  saveData(STORAGE_KEYS.INVENTORY, inventory);

export const loadInventory = (defaultInventory: any) => 
  loadData(STORAGE_KEYS.INVENTORY, defaultInventory);

export const saveWallet = (wallet: any) => 
  saveData(STORAGE_KEYS.WALLET, wallet);

export const loadWallet = (defaultWallet: any) => 
  loadData(STORAGE_KEYS.WALLET, defaultWallet);

export const saveJokers = (jokers: any) => 
  saveData(STORAGE_KEYS.JOKERS, jokers);

export const loadJokers = (defaultJokers: any) => 
  loadData(STORAGE_KEYS.JOKERS, defaultJokers);

export const saveSeed = (seed: string) => 
  saveData(STORAGE_KEYS.SEED, seed);

export const loadSeed = (defaultSeed: string) => 
  loadData(STORAGE_KEYS.SEED, defaultSeed);

export const saveProcessedEvents = (events: Set<string>) => 
  saveData(STORAGE_KEYS.PROCESSED_EVENTS, Array.from(events));

export const loadProcessedEvents = async (): Promise<Set<string>> => {
  const events = await loadData(STORAGE_KEYS.PROCESSED_EVENTS, []);
  return new Set(events);
};

export const savePlayerId = (playerId: string) => 
  saveData(STORAGE_KEYS.PLAYER_ID, playerId);

export const loadPlayerId = (): Promise<string | null> => 
  loadData(STORAGE_KEYS.PLAYER_ID, null);

export const savePlayerNameStatus = (hasSetName: boolean) => 
  saveData(STORAGE_KEYS.PLAYER_NAME_STATUS, hasSetName);

export const loadPlayerNameStatus = (): Promise<boolean> =>
  loadData(STORAGE_KEYS.PLAYER_NAME_STATUS, false);

export const setForceResetFlag = (): Promise<boolean> =>
  saveData(STORAGE_KEYS.FORCE_RESET_FLAG, true);

export const checkAndClearForceResetFlag = async (): Promise<boolean> => {
  const shouldReset = await loadData(STORAGE_KEYS.FORCE_RESET_FLAG, false);
  if (shouldReset) {
    await clearData(STORAGE_KEYS.FORCE_RESET_FLAG);
  }
  return shouldReset;
};

