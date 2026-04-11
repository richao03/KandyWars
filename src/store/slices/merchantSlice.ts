import { PayloadAction, createSelector, createSlice } from '@reduxjs/toolkit';
import seedrandom from 'seedrandom';
import { STANDARDIZED_JOKERS } from '../../utils/jokerEffectEngine';
import { resetGame } from './gameSlice';

export type MerchantItemType =
  | 'fake_report_card'
  | 'metal_detector'
  | 'hollowed_textbook'
  | 'street_cred'
  | 'double_sided_coin'
  | 'influencer_shoutout'
  | 'hall_monitor_bribe'
  | 'sixth_grade_bodyguard'
  | 'air_delivery_drone';

export interface MerchantItemDefinition {
  id: MerchantItemType;
  name: string;
  description: string;
  type: 'leveled' | 'consumable';

  // For leveled items
  maxLevel?: number;
  prices?: number[]; // Price for each level

  // For consumable items
  basePrice?: number;
  priceMultiplier?: number; // Multiply by this each purchase (1.75x)
}

export interface ActiveMerchantEffect {
  itemId: MerchantItemType;
  level?: number; // For leveled items
  count?: number; // For consumables (how many purchased this visit)
}

export interface DailyJoker {
  jokerId: number;
  jokerName: string;
  jokerDescription: string;
  price: number;
  generatedForDay: number; // Track which day this was generated for
  purchased: boolean; // Whether the player already bought it today
}

interface MerchantState {
  // Per-run state (resets on game reset)
  ownedLevels: Record<string, number>; // itemId -> current level owned
  purchaseCountsThisVisit: Record<string, number>; // itemId -> times purchased this merchant visit
  activeEffects: ActiveMerchantEffect[]; // Effects active for current run

  // Daily joker
  dailyJoker: DailyJoker | null;

  // UI state
  merchantAvailable: boolean; // Whether merchant spawned this period
  hasVisitedMerchant: boolean; // Whether player has visited merchant this period
}

// Define all 9 merchant items
export const MERCHANT_ITEMS: MerchantItemDefinition[] = [
  {
    id: 'fake_report_card',
    name: 'Forged Document',
    description: '+100% Allowance',
    type: 'leveled',
    maxLevel: 3,
    prices: [5000, 15000, 35000],
  },
  {
    id: 'metal_detector',
    name: 'Metal Detector',
    description: 'Find Money Multiplier',
    type: 'leveled',
    maxLevel: 3,
    prices: [10000, 25000, 50000],
  },
  {
    id: 'hollowed_textbook',
    name: 'Hollowed Textbook',
    description: '+10 Capacity',
    type: 'leveled',
    maxLevel: 5,
    prices: [2000, 5000, 15000, 25000, 35000],
  },
  {
    id: 'street_cred',
    name: 'Street Cred',
    description: '+10% Profit',
    type: 'leveled',
    maxLevel: 5,
    prices: [5000, 15000, 30000, 45000, 55000],
  },
  {
    id: 'double_sided_coin',
    name: 'Lucky Coin',
    description: 'Positive Event Magnet',
    type: 'leveled',
    maxLevel: 3,
    prices: [10000, 30000, 45000],
  },
  {
    id: 'influencer_shoutout',
    name: 'Social Shoutout',
    description: '+200% profit next sale',
    type: 'consumable',
    basePrice: 8000,
    priceMultiplier: 1.75,
  },
  {
    id: 'hall_monitor_bribe',
    name: 'Monitor Bribe',
    description: "Can't get busted",
    type: 'consumable',
    basePrice: 4000,
    priceMultiplier: 1.75,
  },
  {
    id: 'sixth_grade_bodyguard',
    name: 'Kid Guard',
    description: "Can't get bullied",
    type: 'consumable',
    basePrice: 2000,
    priceMultiplier: 1.75,
  },
  {
    id: 'air_delivery_drone',
    name: 'Delivery Drone',
    description: 'Deposit $ to stash',
    type: 'consumable',
    basePrice: 7000,
    priceMultiplier: 1.75,
  },
];

const initialState: MerchantState = {
  ownedLevels: {},
  purchaseCountsThisVisit: {},
  activeEffects: [],
  dailyJoker: null,
  merchantAvailable: false,
  hasVisitedMerchant: false,
};

const merchantSlice = createSlice({
  name: 'merchant',
  initialState,
  reducers: {
    // Set whether merchant is available this period
    setMerchantAvailable: (state, action: PayloadAction<boolean>) => {
      state.merchantAvailable = action.payload;
      if (action.payload) {
        // Reset visit counters when merchant becomes available
        state.purchaseCountsThisVisit = {};
        state.hasVisitedMerchant = false;
      }
    },

    // Mark that player has visited merchant
    markMerchantVisited: (state) => {
      state.hasVisitedMerchant = true;
    },

    // Purchase a leveled item (upgrades to next level)
    purchaseLeveledItem: (
      state,
      action: PayloadAction<{ itemId: MerchantItemType }>
    ) => {
      const { itemId } = action.payload;
      const currentLevel = state.ownedLevels[itemId] || 0;
      const item = MERCHANT_ITEMS.find((i) => i.id === itemId);

      if (item && item.type === 'leveled' && item.maxLevel) {
        if (currentLevel < item.maxLevel) {
          state.ownedLevels[itemId] = currentLevel + 1;

          // Update or add active effect
          const existingEffect = state.activeEffects.find(
            (e) => e.itemId === itemId
          );
          if (existingEffect) {
            existingEffect.level = currentLevel + 1;
          } else {
            state.activeEffects.push({
              itemId,
              level: currentLevel + 1,
            });
          }
        }
      }
    },

    // Purchase a consumable item
    purchaseConsumableItem: (
      state,
      action: PayloadAction<{ itemId: MerchantItemType }>
    ) => {
      const { itemId } = action.payload;
      const currentCount = state.purchaseCountsThisVisit[itemId] || 0;
      state.purchaseCountsThisVisit[itemId] = currentCount + 1;

      // Add to active effects
      const existingEffect = state.activeEffects.find(
        (e) => e.itemId === itemId
      );
      if (existingEffect && existingEffect.count !== undefined) {
        existingEffect.count++;
      } else {
        state.activeEffects.push({
          itemId,
          count: 1,
        });
      }
    },

    // Consume a single-use effect (e.g., when bribe is used)
    consumeEffect: (
      state,
      action: PayloadAction<{ itemId: MerchantItemType }>
    ) => {
      const { itemId } = action.payload;
      const effect = state.activeEffects.find((e) => e.itemId === itemId);

      if (effect && effect.count !== undefined && effect.count > 0) {
        effect.count--;
        if (effect.count === 0) {
          // Remove effect if count reaches 0
          state.activeEffects = state.activeEffects.filter(
            (e) => e.itemId !== itemId
          );
        }
      }
    },

    // Clear active effects (called on game reset)
    clearActiveEffects: (state) => {
      state.activeEffects = [];
    },

    // Generate the daily joker based on seed + day for determinism
    generateDailyJoker: (
      state,
      action: PayloadAction<{ seed: string; day: number; ownedJokerIds: string[] }>
    ) => {
      const { seed, day, ownedJokerIds } = action.payload;

      // If already generated for this day, skip
      if (state.dailyJoker && state.dailyJoker.generatedForDay === day) {
        return;
      }

      // Use seeded RNG for deterministic selection
      const rng = seedrandom(`${seed}-daily-joker-${day}`);
      const jokerIndex = Math.floor(rng() * STANDARDIZED_JOKERS.length);
      const selectedJoker = STANDARDIZED_JOKERS[jokerIndex];

      // Determine price based on whether player owns it and current level
      const ownedId = ownedJokerIds.find(
        (id) => id === selectedJoker.id.toString()
      );
      let price = 5000; // Base price for new or L1->L2

      if (ownedId) {
        // Need to check level from joker state - price is determined in the UI/selector
        // Default to base price; actual price logic is in the selector
        price = 5000;
      }

      state.dailyJoker = {
        jokerId: selectedJoker.id,
        jokerName: selectedJoker.name,
        jokerDescription: selectedJoker.description,
        price,
        generatedForDay: day,
        purchased: false,
      };
    },

    // Mark the daily joker as purchased
    markDailyJokerPurchased: (state) => {
      if (state.dailyJoker) {
        state.dailyJoker.purchased = true;
      }
    },

    // Reset merchant state for new period
    resetMerchantForPeriod: (state) => {
      state.merchantAvailable = false;
      state.hasVisitedMerchant = false;
      state.purchaseCountsThisVisit = {};
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetGame, (state) => {
      // Reset everything on game reset - no merchant items carry over
      state.ownedLevels = {};
      state.activeEffects = [];
      state.purchaseCountsThisVisit = {};
      state.dailyJoker = null;
      state.merchantAvailable = false;
      state.hasVisitedMerchant = false;
    });
  },
});

export const {
  setMerchantAvailable,
  markMerchantVisited,
  purchaseLeveledItem,
  purchaseConsumableItem,
  consumeEffect,
  clearActiveEffects,
  resetMerchantForPeriod,
  generateDailyJoker,
  markDailyJokerPurchased,
} = merchantSlice.actions;

// Selectors
export const selectMerchantAvailable = (state: { merchant: MerchantState }) =>
  state.merchant.merchantAvailable;

export const selectHasVisitedMerchant = (state: { merchant: MerchantState }) =>
  state.merchant.hasVisitedMerchant;

export const selectOwnedLevel =
  (itemId: MerchantItemType) => (state: { merchant: MerchantState }) =>
    state.merchant.ownedLevels[itemId] || 0;

export const selectPurchaseCount =
  (itemId: MerchantItemType) => (state: { merchant: MerchantState }) =>
    state.merchant.purchaseCountsThisVisit[itemId] || 0;

export const selectActiveEffects = (state: { merchant: MerchantState }) =>
  state.merchant.activeEffects;

// Get current price for an item
export const selectItemPrice = (itemId: MerchantItemType) =>
  createSelector(
    [
      (state: { merchant: MerchantState }) =>
        state.merchant.ownedLevels[itemId] || 0,
      (state: { merchant: MerchantState }) =>
        state.merchant.purchaseCountsThisVisit[itemId] || 0,
    ],
    (ownedLevel, purchaseCount) => {
      const item = MERCHANT_ITEMS.find((i) => i.id === itemId);
      if (!item) return 0;

      if (item.type === 'leveled' && item.prices) {
        // Return price for next level
        return item.prices[ownedLevel] || 0;
      } else if (
        item.type === 'consumable' &&
        item.basePrice &&
        item.priceMultiplier
      ) {
        // Calculate scaled price based on purchase count
        return Math.floor(
          item.basePrice * Math.pow(item.priceMultiplier, purchaseCount)
        );
      }

      return 0;
    }
  );

// Check if item can be purchased
export const selectCanPurchaseItem = (itemId: MerchantItemType) =>
  createSelector(
    [
      (state: { merchant: MerchantState }) =>
        state.merchant.ownedLevels[itemId] || 0,
    ],
    (ownedLevel) => {
      const item = MERCHANT_ITEMS.find((i) => i.id === itemId);
      if (!item) return false;

      if (item.type === 'leveled' && item.maxLevel) {
        return ownedLevel < item.maxLevel;
      }

      // Consumables can always be purchased
      return true;
    }
  );

// Get active effect count/level for an item
export const selectActiveEffectValue =
  (itemId: MerchantItemType) => (state: { merchant: MerchantState }) => {
    const effect = state.merchant.activeEffects.find(
      (e) => e.itemId === itemId
    );
    if (!effect) return 0;
    return effect.level || effect.count || 0;
  };

// Daily joker selectors
export const selectDailyJoker = (state: { merchant: MerchantState }) =>
  state.merchant.dailyJoker;

// Compute the daily joker price based on owned joker level
export const selectDailyJokerPrice = createSelector(
  [
    (state: { merchant: MerchantState }) => state.merchant.dailyJoker,
    (_state: any, ownedLevel: number) => ownedLevel,
  ],
  (dailyJoker, ownedLevel) => {
    if (!dailyJoker) return 0;
    if (ownedLevel === 0) return 5000; // New joker
    if (ownedLevel === 1) return 5000; // L1 -> L2
    if (ownedLevel === 2) return 30000; // L2 -> L3
    return 0; // Already L3, can't buy
  }
);

export default merchantSlice.reducer;
