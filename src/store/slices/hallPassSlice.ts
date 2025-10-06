import { PayloadAction, createSelector, createSlice } from '@reduxjs/toolkit';

export interface HallPassEffect {
  type:
    | 'sale_price_bonus'
    | 'inventory_bonus'
    | 'allowance_bonus'
    | 'joker_bonus'
    | 'special';
  value: number; // percentage or flat amount
  description: string;
}

export interface HallPass {
  id: string;
  name: string;
  description: string;
  unlockRequirement: string;
  effects: HallPassEffect[];
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isUnlocked: boolean;
  unlockedAt?: string; // timestamp
}

interface HallPassState {
  availablePasses: HallPass[];
  unlockedPassIds: string[];
  selectedPassIds: string[];
  isLoaded: boolean;
  newlyUnlockedPassIds: string[]; // Hall passes unlocked in the current playthrough
}

// Define all possible Hall Passes
const ALL_HALL_PASSES: Omit<HallPass, 'isUnlocked' | 'unlockedAt'>[] = [
  {
    id: 'no_longer_freshman',
    name: 'No Longer a Freshman',
    description: "You've graduated from rookie status!",
    unlockRequirement: 'Win the game once (pay off adoption fee)',
    effects: [
      {
        type: 'sale_price_bonus',
        value: 10,
        description: '+50% profit bonus on candy sales',
      },
    ],
    rarity: 'common',
  },
  {
    id: 'sophomore_swagger',
    name: 'Sophomore Swagger',
    description: 'Experience brings confidence and efficiency.',
    unlockRequirement: 'Win the game 3 times',
    effects: [
      {
        type: 'inventory_bonus',
        value: 10,
        description: '+10 inventory slots',
      },
    ],
    rarity: 'common',
  },
  {
    id: 'junior_genius',
    name: 'Junior Genius',
    description: 'Your business acumen is showing!',
    unlockRequirement: 'Win the game with $100,000+ profit',
    effects: [
      {
        type: 'allowance_bonus',
        value: 100,
        description: '+100% daily allowance',
      },
    ],
    rarity: 'rare',
  },
  {
    id: 'senior_executive',
    name: 'Senior Executive',
    description: "You run this school's candy economy.",
    unlockRequirement: 'Win the game 5 times',
    effects: [
      {
        type: 'sale_price_bonus',
        value: 15,
        description: '+75% profit bonus on candy sales (15% × 5x multiplier)',
      },
      {
        type: 'inventory_bonus',
        value: 5,
        description: '+5 inventory slots',
      },
    ],
    rarity: 'epic',
  },
  {
    id: 'valedictorian_vendor',
    name: 'Valedictorian Vendor',
    description: 'Academic excellence across all subjects.',
    unlockRequirement: 'Play every single minigame at least once',
    effects: [
      {
        type: 'joker_bonus',
        value: 1,
        description: 'Get +1 extra joker at joker selection screen',
      },
    ],
    rarity: 'epic',
  },
  {
    id: 'candy_kingpin',
    name: 'Candy Kingpin',
    description: 'You ARE the candy economy.',
    unlockRequirement: 'Win the game 10 times',
    effects: [
      {
        type: 'sale_price_bonus',
        value: 25,
        description: '+125% profit bonus on candy sales (25% × 5x multiplier)',
      },
      {
        type: 'allowance_bonus',
        value: 100,
        description: '+100% daily allowance',
      },
    ],
    rarity: 'legendary',
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Lightning fast completion shows true mastery.',
    unlockRequirement: 'Win the game in under 10 minutes',
    effects: [
      {
        type: 'special',
        value: 1,
        description: 'Start each day with +1 extra period',
      },
    ],
    rarity: 'epic',
  },
  {
    id: 'minimalist_master',
    name: 'Minimalist Master',
    description: "Proof that less is more when you know what you're doing.",
    unlockRequirement: 'Win the game without using any jokers',
    effects: [
      {
        type: 'sale_price_bonus',
        value: 20,
        description: '+100% profit bonus on candy sales (20% × 5x multiplier)',
      },
    ],
    rarity: 'epic',
  },
  {
    id: 'high_roller',
    name: 'High Roller',
    description: 'Big sales, bigger rewards.',
    unlockRequirement: 'Win the game and sell over 1000 units of candy',
    effects: [
      {
        type: 'sale_price_bonus',
        value: 30,
        description: '+150% profit bonus on candy sales (30% × 5x multiplier)',
      },
      {
        type: 'inventory_bonus',
        value: 10,
        description: '+10 inventory slots',
      },
    ],
    rarity: 'legendary',
  },
  {
    id: 'perfect_scholar',
    name: 'Perfect Scholar',
    description: 'Academic excellence meets business prowess.',
    unlockRequirement: 'Win the game on difficulty level 6',
    effects: [
      {
        type: 'allowance_bonus',
        value: 75,
        description: '+75% daily allowance',
      },
    ],
    rarity: 'legendary',
  },
];

const initialState: HallPassState = {
  availablePasses: ALL_HALL_PASSES.map((pass) => ({
    ...pass,
    isUnlocked: false,
  })),
  unlockedPassIds: [],
  selectedPassIds: [],
  isLoaded: false,
  newlyUnlockedPassIds: [],
};

const hallPassSlice = createSlice({
  name: 'hallPass',
  initialState,
  reducers: {
    initializeHallPasses: (state) => {
      state.isLoaded = true;

      // Migration: convert old selectedPassId to selectedPassIds array
      if (!state.selectedPassIds) {
        state.selectedPassIds = [];
      }
      // Check if there's an old selectedPassId field (for backwards compatibility)
      const oldState = state as any;
      if (
        oldState.selectedPassId &&
        typeof oldState.selectedPassId === 'string'
      ) {
        if (!state.selectedPassIds.includes(oldState.selectedPassId)) {
          state.selectedPassIds.push(oldState.selectedPassId);
        }
        delete oldState.selectedPassId;
      }

      // Refresh Hall Pass definitions from static data while preserving unlock status
      state.availablePasses = ALL_HALL_PASSES.map((pass) => ({
        ...pass,
        isUnlocked: state.unlockedPassIds.includes(pass.id),
        // Preserve unlock timestamp if it exists
        unlockedAt: state.availablePasses.find((p) => p.id === pass.id)
          ?.unlockedAt,
      }));
    },
    unlockHallPass: (
      state,
      action: PayloadAction<{ passId: string; timestamp?: string }>
    ) => {
      const { passId, timestamp = new Date().toISOString() } = action.payload;

      if (!state.unlockedPassIds.includes(passId)) {
        state.unlockedPassIds.push(passId);
        // Track as newly unlocked in this playthrough
        if (!state.newlyUnlockedPassIds.includes(passId)) {
          state.newlyUnlockedPassIds.push(passId);
        }
      }

      const passIndex = state.availablePasses.findIndex(
        (pass) => pass.id === passId
      );
      if (passIndex !== -1) {
        state.availablePasses[passIndex].isUnlocked = true;
        state.availablePasses[passIndex].unlockedAt = timestamp;
      }
    },
    selectHallPass: (state, action: PayloadAction<string>) => {
      const passId = action.payload;
      // Toggle: add if not present, remove if present
      if (state.selectedPassIds.includes(passId)) {
        state.selectedPassIds = state.selectedPassIds.filter(
          (id) => id !== passId
        );
      } else {
        state.selectedPassIds.push(passId);
      }
    },
    resetHallPassSelection: (state) => {
      state.selectedPassIds = [];
    },
    clearNewlyUnlockedPasses: (state) => {
      state.newlyUnlockedPassIds = [];
    },
    resetHallPasses: () => initialState,
  },
});

export const {
  initializeHallPasses,
  unlockHallPass,
  selectHallPass,
  resetHallPassSelection,
  clearNewlyUnlockedPasses,
  resetHallPasses,
} = hallPassSlice.actions;

// Selectors
export const selectAllHallPasses = (state: { hallPass: HallPassState }) =>
  state.hallPass.availablePasses;

// Memoized selector to prevent unnecessary re-renders
export const selectUnlockedHallPasses = createSelector(
  [selectAllHallPasses],
  (passes) => passes.filter((pass) => pass.isUnlocked)
);

// Selector for newly unlocked passes in current playthrough
export const selectNewlyUnlockedHallPasses = createSelector(
  [
    (state: { hallPass: HallPassState }) =>
      state.hallPass.newlyUnlockedPassIds || [],
    selectAllHallPasses,
  ],
  (newlyUnlockedIds, passes) => {
    return passes.filter((pass) => newlyUnlockedIds.includes(pass.id));
  }
);

// Memoized selector for selected hall passes (now returns array)
export const selectSelectedHallPasses = createSelector(
  [
    (state: { hallPass: HallPassState }) => state.hallPass.selectedPassIds,
    selectAllHallPasses,
  ],
  (selectedPassIds, passes) => {
    if (!selectedPassIds || selectedPassIds.length === 0) return [];
    return passes.filter((pass) => selectedPassIds.includes(pass.id));
  }
);

// Keep backwards compatibility - returns first selected pass (or null)
export const selectSelectedHallPass = createSelector(
  [selectSelectedHallPasses],
  (selectedPasses) => selectedPasses[0] || null
);

// Memoized factory selector for finding hall pass by ID
export const selectHallPassById = (passId: string) =>
  createSelector([selectAllHallPasses], (passes) =>
    passes.find((pass) => pass.id === passId)
  );

export const selectUnlockedPassIds = (state: { hallPass: HallPassState }) =>
  state.hallPass.unlockedPassIds;

export const selectIsHallPassUnlocked =
  (passId: string) => (state: { hallPass: HallPassState }) =>
    state.hallPass.unlockedPassIds.includes(passId);

export const selectSelectedHallPassEffects = createSelector(
  [selectSelectedHallPasses],
  (selectedPasses) => {
    // Combine all effects from all selected passes
    return selectedPasses.flatMap((pass) => pass.effects);
  }
);

export const selectSelectedPassIds = (state: { hallPass: HallPassState }) =>
  state.hallPass.selectedPassIds;

export default hallPassSlice.reducer;
