import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  GAME_STATE: 'candyWarz_gameState',
  INVENTORY: 'candyWarz_inventory',
  WALLET: 'candyWarz_wallet',
  JOKERS: 'candyWarz_jokers',
  SEED: 'candyWarz_seed',
  PROCESSED_EVENTS: 'candyWarz_processedEvents',
} as const;

// Generic save/load functions
export const saveData = async (key: string, data: any): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
    console.log(`Saved ${key} successfully`);
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
      console.log(`Loaded ${key} successfully`);
      return parsed;
    }
    console.log(`No data found for ${key}, using default`);
    return defaultValue;
  } catch (error) {
    console.error(`Failed to load ${key}:`, error);
    return defaultValue;
  }
};

export const clearData = async (key: string): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(key);
    console.log(`Cleared ${key} successfully`);
    return true;
  } catch (error) {
    console.error(`Failed to clear ${key}:`, error);
    return false;
  }
};

export const clearAllGameData = async (): Promise<boolean> => {
  try {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    console.log('Cleared all game data successfully');
    return true;
  } catch (error) {
    console.error('Failed to clear all game data:', error);
    return false;
  }
};

// Specific save/load functions for each context
export const saveGameState = (gameState: any) => 
  saveData(STORAGE_KEYS.GAME_STATE, gameState);

export const loadGameState = (defaultState: any) => 
  loadData(STORAGE_KEYS.GAME_STATE, defaultState);

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

// Helper function to save all game data at once
export const saveCompleteGameState = async (gameState: {
  game: any;
  inventory: any;
  wallet: any;
  jokers: any;
  seed: string;
  processedEvents: Set<string>;
}): Promise<boolean> => {
  try {
    await Promise.all([
      saveGameState(gameState.game),
      saveInventory(gameState.inventory),
      saveWallet(gameState.wallet),
      saveJokers(gameState.jokers),
      saveSeed(gameState.seed),
      saveProcessedEvents(gameState.processedEvents),
    ]);
    console.log('Complete game state saved successfully');
    return true;
  } catch (error) {
    console.error('Failed to save complete game state:', error);
    return false;
  }
};