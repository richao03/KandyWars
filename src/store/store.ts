import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from '@reduxjs/toolkit';
import gameReducer from './slices/gameSlice';
import flavorTextReducer from './slices/flavorTextSlice';
import jokerReducer from './slices/jokerSlice';
import walletReducer from './slices/walletSlice';
import inventoryReducer from './slices/inventorySlice';
import eventHandlerReducer from './slices/eventHandlerSlice';
import scoreboardReducer from './slices/scoreboardSlice';
import candySalesReducer from './slices/candySalesSlice';
import seedReducer from './slices/seedSlice';
import tabBarReducer from './slices/tabBarSlice';
import dailyStatsReducer from './slices/dailyStatsSlice';
import priceDoublingReducer from './slices/priceDoublingSlice';
import hallPassReducer from './slices/hallPassSlice';
import hallPassModifiersReducer from './slices/hallPassModifiersSlice';
import minigameTrackingReducer from './slices/minigameTrackingSlice';
import localAnalyticsReducer from './slices/localAnalyticsSlice';
import userObjectReducer from './slices/userObjectSlice';
import merchantReducer from './slices/merchantSlice';
import tutorialReducer from './slices/tutorialSlice';
import hustleReducer from './slices/hustleSlice';
import questReducer from './slices/questSlice';
import settingsReducer from './slices/settingsSlice';
import jokerStatsReducer from './slices/jokerStatsSlice';
import shopkeeperReducer from './slices/shopkeeperSlice';
import juiceSettingsReducer from './slices/juiceSettingsSlice';

// Per-slice persist config: keep showLunchMinigames transient (lunch modal UI flag)
const gamePersistConfig = {
  key: 'game',
  storage: AsyncStorage,
  blacklist: ['showLunchMinigames'],
};

// Combine reducers
const rootReducer = combineReducers({
  game: persistReducer(gamePersistConfig, gameReducer),
  flavorText: flavorTextReducer,
  joker: jokerReducer,
  wallet: walletReducer,
  inventory: inventoryReducer,
  eventHandler: eventHandlerReducer,
  scoreboard: scoreboardReducer,
  candySales: candySalesReducer,
  seed: seedReducer,
  tabBar: tabBarReducer,
  dailyStats: dailyStatsReducer,
  priceDoubling: priceDoublingReducer,
  hallPass: hallPassReducer,
  hallPassModifiers: hallPassModifiersReducer,
  minigameTracking: minigameTrackingReducer,
  localAnalytics: localAnalyticsReducer,
  userObject: userObjectReducer,
  merchant: merchantReducer,
  tutorial: tutorialReducer,
  hustle: hustleReducer,
  quest: questReducer,
  settings: settingsReducer,
  jokerStats: jokerStatsReducer,
  shopkeeper: shopkeeperReducer,
  juiceSettings: juiceSettingsReducer,
});

// Persist configuration
const persistConfig = {
  key: 'root',
  version: 7, // Increment version to trigger migration
  storage: AsyncStorage,
  whitelist: ['game', 'wallet', 'inventory', 'joker', 'seed', 'dailyStats', 'priceDoubling', 'hallPass', 'hallPassModifiers', 'minigameTracking', 'scoreboard', 'localAnalytics', 'userObject', 'merchant', 'tutorial', 'hustle', 'quest', 'settings', 'jokerStats', 'shopkeeper', 'juiceSettings'], // Only persist these slices
  blacklist: ['flavorText', 'eventHandler', 'candySales', 'tabBar'], // Don't persist these
  // Performance optimizations
  timeout: 10000, // 10 second timeout for persistence operations
  writeFailHandler: (err: Error) => {
    console.error('Redux persist write failed:', err);
  },
  migrate: (state: any) => {
    // Handle migrations if needed
    if (state && !state._persist?.version) {
      if (__DEV__) console.log('🔄 Migrating legacy state to new persist format');
      // If there's legacy state without version, keep it as-is
      return Promise.resolve(state);
    }

    // Migration to version 2: Force hall pass re-initialization for new passes
    if (state && state._persist?.version < 2) {
      if (__DEV__) console.log('🔄 Migrating to version 2: Resetting hall pass isLoaded flag');
      if (state.hallPass) {
        state.hallPass.isLoaded = false; // Force re-initialization
      }
    }

    // Migration to version 3: Force hall pass re-initialization for 4 new passes
    if (state && state._persist?.version < 3) {
      if (__DEV__) console.log('🔄 Migrating to version 3: Forcing hall pass refresh for new passes');
      if (state.hallPass) {
        state.hallPass.isLoaded = false; // Force re-initialization to load all 17 passes
      }
    }

    // Migration to version 4: Update hall pass rarities (add magical tier, reorder by difficulty)
    if (state && state._persist?.version < 4) {
      if (__DEV__) console.log('🔄 Migrating to version 4: Updating hall pass rarities and order');
      if (state.hallPass) {
        state.hallPass.isLoaded = false; // Force re-initialization to load updated rarities
      }
    }

    // Migration to version 5: Money-making system revamp
    // - 15 candies (was 7), new types/sizes, new joker effects
    // - Clear inventory (old candies don't exist anymore)
    // - Reset seed data for new candy count
    // - Add joker level field
    // - Preserve money/wallet
    if (state && state._persist?.version < 5) {
      if (__DEV__) console.log('🔄 Migrating to version 5: Money-making system revamp (15 candies, joker levels)');
      if (state.inventory) {
        state.inventory.items = []; // Clear old candy inventory
        state.inventory.totalQuantity = 0;
      }
      if (state.seed) {
        state.seed.gameData = null; // Force regeneration with 15 candies
        state.seed.currentSeed = null;
      }
      if (state.joker?.ownedJokers) {
        // Add level field to existing jokers
        state.joker.ownedJokers = state.joker.ownedJokers.map((j: any) => ({
          ...j,
          level: j.level ?? 1,
        }));
      }
      if (state.hallPass) {
        state.hallPass.isLoaded = false;
      }
    }

    // Migration to version 6: Candy size unlock system
    // - Candy prices now correlate with size (small=cheap, medium=mid, big=expensive)
    // - Clear inventory and seed data (candy price ranges changed)
    // - mediumCandiesUnlocked/bigCandiesUnlocked default to false via gameSlice initialState
    if (state && state._persist?.version < 6) {
      if (__DEV__) console.log('🔄 Migrating to version 6: Candy size unlock system');
      if (state.inventory) {
        state.inventory.items = [];
        state.inventory.totalQuantity = 0;
      }
      if (state.seed) {
        state.seed.gameData = null;
        state.seed.currentSeed = null;
      }
    }

    // Migration to version 7: Shopkeeper NPC system
    // - New shopkeeper slice with persistent level/XP across runs
    // - No data changes needed, slice initializes with defaults
    if (state && state._persist?.version < 7) {
      if (__DEV__) console.log('🔄 Migrating to version 7: Shopkeeper NPC system');
      // Shopkeeper slice will initialize with defaults automatically
    }

    return Promise.resolve(state);
  },
};

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Optimize for production
      immutableCheck: { warnAfter: 32 },
      serializableCheck: {
        warnAfter: 32,
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        ignoredActionPaths: ['payload.timestamp'],
        ignoredPaths: ['seed.gameData'],
      },
    }),
  // Enable devTools only in development
  devTools: process.env.NODE_ENV !== 'production',
});

export const persistor = persistStore(store);

// Manual save function for critical game state changes
export const forceSave = () => {
  const startTime = performance.now();
  try {
    persistor.flush();
    const endTime = performance.now();
    if (__DEV__) console.log(`💾 Manual save triggered successfully - took ${(endTime - startTime).toFixed(2)}ms`);
  } catch (error) {
    console.error('❌ Manual save failed:', error);
  }
};

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;