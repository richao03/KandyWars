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

// Combine reducers
const rootReducer = combineReducers({
  game: gameReducer,
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
});

// Persist configuration
const persistConfig = {
  key: 'root',
  version: 4, // Increment version to trigger migration
  storage: AsyncStorage,
  whitelist: ['game', 'wallet', 'inventory', 'joker', 'seed', 'dailyStats', 'priceDoubling', 'hallPass', 'hallPassModifiers', 'minigameTracking', 'scoreboard', 'localAnalytics', 'userObject', 'merchant'], // Only persist these slices
  blacklist: ['flavorText', 'eventHandler', 'candySales', 'tabBar'], // Don't persist these
  // Performance optimizations
  timeout: 10000, // 10 second timeout for persistence operations
  writeFailHandler: (err: Error) => {
    console.error('Redux persist write failed:', err);
  },
  migrate: (state: any) => {
    // Handle migrations if needed
    if (state && !state._persist?.version) {
      console.log('🔄 Migrating legacy state to new persist format');
      // If there's legacy state without version, keep it as-is
      return Promise.resolve(state);
    }

    // Migration to version 2: Force hall pass re-initialization for new passes
    if (state && state._persist?.version < 2) {
      console.log('🔄 Migrating to version 2: Resetting hall pass isLoaded flag');
      if (state.hallPass) {
        state.hallPass.isLoaded = false; // Force re-initialization
      }
    }

    // Migration to version 3: Force hall pass re-initialization for 4 new passes
    if (state && state._persist?.version < 3) {
      console.log('🔄 Migrating to version 3: Forcing hall pass refresh for new passes');
      if (state.hallPass) {
        state.hallPass.isLoaded = false; // Force re-initialization to load all 17 passes
      }
    }

    // Migration to version 4: Update hall pass rarities (add magical tier, reorder by difficulty)
    if (state && state._persist?.version < 4) {
      console.log('🔄 Migrating to version 4: Updating hall pass rarities and order');
      if (state.hallPass) {
        state.hallPass.isLoaded = false; // Force re-initialization to load updated rarities
      }
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
    console.log(`💾 Manual save triggered successfully - took ${(endTime - startTime).toFixed(2)}ms`);
  } catch (error) {
    console.error('❌ Manual save failed:', error);
  }
};

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;