import { PayloadAction, createSelector, createSlice } from '@reduxjs/toolkit';
import { resetGame } from './gameSlice';

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
  rarity: 'common' | 'magical' | 'rare' | 'epic' | 'legendary';
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
// Sorted by rarity: Common → Magical → Rare → Epic → Legendary
const ALL_HALL_PASSES: Omit<HallPass, 'isUnlocked' | 'unlockedAt'>[] = [
  // ===== COMMON (White #ffffff) - Very Easy =====
  {
    id: 'no_longer_freshman',
    name: 'Not a Freshman',
    description: "That's the first W",
    unlockRequirement: 'Win the game once',
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
        value: 15,
        description: '+15 inventory slots',
      },
    ],
    rarity: 'common',
  },

  // ===== MAGICAL (Green #1eff00) - Easy to Medium =====
  {
    id: 'valedictorian_vendor',
    name: 'Valedictorian Vendor',
    description: 'Academic excellence across all minigames.',
    unlockRequirement: 'Play every single minigame at least once',
    effects: [
      {
        type: 'joker_bonus',
        value: 1,
        description: 'Get +1 extra joker at joker selection screen',
      },
    ],
    rarity: 'magical',
  },
  {
    id: 'maximalist',
    name: 'Maximalist',
    description: 'All in, every time.',
    unlockRequirement: 'Deposit your entire wallet 4 times in one game',
    effects: [
      {
        type: 'allowance_bonus',
        value: 1000,
        description: '+1000% daily allowance',
      },
    ],
    rarity: 'magical',
  },
  {
    id: 'junior_genius',
    name: 'Junior Genius',
    description: 'Your business acumen is showing!',
    unlockRequirement: 'Win the game with $100,000+ profit',
    effects: [
      {
        type: 'special',
        value: 2,
        description: 'All jokers obtained start at Level 2',
      },
    ],
    rarity: 'magical',
  },

  // ===== RARE (Blue #0070dd) - Medium =====
  {
    id: 'senior_executive',
    name: 'Senior Executive',
    description: "You run this school's candy economy.",
    unlockRequirement: 'Win the game 5 times',
    effects: [
      {
        type: 'special',
        value: 2000,
        description: 'Start the game with $2,000 instead of $200',
      },
    ],
    rarity: 'rare',
  },
  {
    id: 'finance_club',
    name: 'Finance Club',
    description: "What's sweeter than getting paid?",
    unlockRequirement: 'Win the game with $35,000+ in the piggy bank',
    effects: [
      {
        type: 'special',
        value: 10,
        description: "10% of previous day's profit is added to daily allowance",
      },
    ],
    rarity: 'rare',
  },
  {
    id: 'forged_pass',
    name: 'Forged Pass',
    description: 'Fake it till you make it.',
    unlockRequirement: 'Win the game with 8+ jokers',
    effects: [
      {
        type: 'special',
        value: 1,
        description: '+1 reroll in joker selection',
      },
    ],
    rarity: 'rare',
  },

  // ===== EPIC (Purple #a335ee) - Hard =====
  {
    id: 'teachers_pet',
    name: "Teacher's Pet",
    description: 'Bring an apple for the teacher every morning.',
    unlockRequirement: 'Get your stash confiscated 3 or more times in one game',
    effects: [
      {
        type: 'special',
        value: 75,
        description:
          'Stash confiscation only takes 25% of candy instead of 100%',
      },
    ],
    rarity: 'epic',
  },
  {
    id: 'inheritance',
    name: 'Inheritance',
    description: 'Build generational wealth.',
    unlockRequirement: 'Win the game with $50,000+ in the piggy bank',
    effects: [
      {
        type: 'special',
        value: 10,
        description:
          '10% of wallet transferred to piggy bank at start of each day',
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
        value: 25, //25 * 5 = 125
        description: '+125% profit bonus on candy sales',
      },
      {
        type: 'allowance_bonus',
        value: 100,
        description: '+100% daily allowance',
      },
    ],
    rarity: 'epic',
  },

  // ===== LEGENDARY (Orange #ff8000) - Very Hard =====
  {
    id: 'minimalist_master',
    name: 'Minimalist Master',
    description: 'Les is mor.',
    unlockRequirement: 'Win without using any jokers',
    effects: [
      {
        type: 'sale_price_bonus',
        value: 30, //20*5=100
        description: '+150% profit bonus on candy sales',
      },
    ],
    rarity: 'legendary',
  },
  {
    id: 'high_roller',
    name: 'High Roller',
    description: 'Those are big boy numbers.',
    unlockRequirement: 'Win the game and sell over 1000 units of candy',
    effects: [
      {
        type: 'sale_price_bonus',
        value: 30, //30* 5 = 150
        description: '+150% profit bonus on candy sales',
      },
      {
        type: 'inventory_bonus',
        value: 15,
        description: '+15 inventory slots',
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
        value: 1000,
        description: '+1000% daily allowance',
      },
    ],
    rarity: 'legendary',
  },
  {
    id: 'time_crunch',
    name: 'Time Crunch',
    description: "Ain't nobody got time for that",
    unlockRequirement: 'Win the game with 50%+ profit from periods 1-4',
    effects: [
      {
        type: 'special',
        value: 1,
        description: 'Start the game with medium candy unlocked',
      },
    ],
    rarity: 'legendary',
  },
  {
    id: 'final_exam',
    name: 'Final Exam',
    description: 'Everything rides on the last period.',
    unlockRequirement: 'Win the game with 50%+ profit from periods 7-8',
    effects: [
      {
        type: 'special',
        value: 15,
        description:
          'Period 8 sales are 15x profit, periods 1-7 are -75% profit',
      },
    ],
    rarity: 'legendary',
  },
  {
    id: 'speedrun_champion',
    name: 'Speedrun Champion',
    description: 'Why make more sale if little sale get job done',
    unlockRequirement: 'Win a run with a single sale over $10,000',
    effects: [
      {
        type: 'special',
        value: 2,
        description: '+100% sales profit',
      },
    ],
    rarity: 'legendary',
  },
  {
    id: 'lunchroom_monopoly',
    name: 'Lunchroom Monopoly',
    description: 'Cafeteria sales print money, but the lunch lady needs a break after each one.',
    unlockRequirement: 'Make 50 lifetime Cafeteria sales',
    effects: [
      {
        type: 'special',
        value: 6,
        description: 'Cafeteria sales 6x profit (+500%); every other location −50%. Cafeteria locked for 2 periods after each visit.',
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
      if (__DEV__) {
        console.log('🎓 REDUCER: initializeHallPasses called');
        console.log(
          '🎓 REDUCER: Current unlockedPassIds:',
          state.unlockedPassIds
        );
        console.log(
          '🎓 REDUCER: Current newlyUnlockedPassIds:',
          state.newlyUnlockedPassIds
        );
      }

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

      if (__DEV__) console.log(
        '🎓 REDUCER: After initialization, availablePasses unlocked status:',
        state.availablePasses.map((p) => ({
          id: p.id,
          isUnlocked: p.isUnlocked,
        }))
      );
    },
    unlockHallPass: (
      state,
      action: PayloadAction<{ passId: string; timestamp?: string }>
    ) => {
      const { passId, timestamp = new Date().toISOString() } = action.payload;

      if (__DEV__) {
        console.log(`🎓 REDUCER: unlockHallPass called for passId: ${passId}`);
        console.log(
          `🎓 REDUCER: Current unlockedPassIds before:`,
          state.unlockedPassIds
        );
      }

      if (!state.unlockedPassIds.includes(passId)) {
        state.unlockedPassIds.push(passId);
        if (__DEV__) console.log(`🎓 REDUCER: Added ${passId} to unlockedPassIds`);
        // Track as newly unlocked in this playthrough
        // Initialize newlyUnlockedPassIds if it doesn't exist (backwards compatibility)
        if (!state.newlyUnlockedPassIds) {
          state.newlyUnlockedPassIds = [];
        }
        if (!state.newlyUnlockedPassIds.includes(passId)) {
          state.newlyUnlockedPassIds.push(passId);
          if (__DEV__) console.log(`🎓 REDUCER: Added ${passId} to newlyUnlockedPassIds`);
        }
      } else {
        if (__DEV__) console.log(`🎓 REDUCER: ${passId} already in unlockedPassIds`);
      }

      const passIndex = state.availablePasses.findIndex(
        (pass) => pass.id === passId
      );
      if (passIndex !== -1) {
        state.availablePasses[passIndex].isUnlocked = true;
        state.availablePasses[passIndex].unlockedAt = timestamp;
        if (__DEV__) console.log(
          `🎓 REDUCER: Updated availablePasses[${passIndex}] isUnlocked to true`
        );
      } else {
        if (__DEV__) console.log(
          `🎓 REDUCER: WARNING - Could not find passId ${passId} in availablePasses`
        );
      }

      if (__DEV__) console.log(
        `🎓 REDUCER: Current unlockedPassIds after:`,
        state.unlockedPassIds
      );
    },
    // Batch sync multiple passes from Firebase at once (prevents multiple re-renders)
    syncHallPassesFromFirebase: (state, action: PayloadAction<string[]>) => {
      const passIds = action.payload;
      if (__DEV__) console.log(
        `🎓 REDUCER: syncHallPassesFromFirebase called with ${passIds.length} passes`
      );

      let newlyAdded = 0;
      passIds.forEach((passId) => {
        // Only add if not already unlocked
        if (!state.unlockedPassIds.includes(passId)) {
          state.unlockedPassIds.push(passId);
          newlyAdded++;
        }

        // Update availablePasses
        const passIndex = state.availablePasses.findIndex(
          (pass) => pass.id === passId
        );
        if (passIndex !== -1) {
          state.availablePasses[passIndex].isUnlocked = true;
          if (!state.availablePasses[passIndex].unlockedAt) {
            state.availablePasses[passIndex].unlockedAt =
              new Date().toISOString();
          }
        }
      });

      if (__DEV__) {
        if (newlyAdded > 0) {
          console.log(
            `🎓 REDUCER: Synced ${newlyAdded} new passes, ${passIds.length - newlyAdded} already unlocked`
          );
        } else {
          console.log(
            `🎓 REDUCER: All ${passIds.length} passes were already unlocked`
          );
        }
      }
    },
    selectHallPass: (state, action: PayloadAction<string>) => {
      const passId = action.payload;
      if (__DEV__) console.log(`🎖️ REDUCER: selectHallPass called for passId: ${passId}`);

      // Initialize selectedPassIds if it doesn't exist (backwards compatibility)
      if (!state.selectedPassIds) {
        state.selectedPassIds = [];
      }

      if (__DEV__) console.log(
        `🎖️ REDUCER: Current selectedPassIds:`,
        state.selectedPassIds
      );

      // Mutually exclusive pass groups
      const mutuallyExclusiveGroups: string[][] = [
        // No mutual exclusions currently
      ];

      // Check if selecting this pass would conflict with any mutually exclusive passes
      const conflictingGroup = mutuallyExclusiveGroups.find((group) =>
        group.includes(passId)
      );
      if (conflictingGroup && !state.selectedPassIds.includes(passId)) {
        // Deselect any other passes in the same group
        const othersInGroup = conflictingGroup.filter((id) => id !== passId);
        othersInGroup.forEach((otherId) => {
          if (state.selectedPassIds.includes(otherId)) {
            state.selectedPassIds = state.selectedPassIds.filter(
              (id) => id !== otherId
            );
            if (__DEV__) console.log(
              `⚠️ REDUCER: Auto-deselected ${otherId} because it's mutually exclusive with ${passId}`
            );
          }
        });
      }

      // Toggle: add if not present, remove if present
      if (state.selectedPassIds.includes(passId)) {
        state.selectedPassIds = state.selectedPassIds.filter(
          (id) => id !== passId
        );
        if (__DEV__) console.log(`🎖️ REDUCER: Removed ${passId} from selection`);
      } else {
        state.selectedPassIds.push(passId);
        if (__DEV__) console.log(`🎖️ REDUCER: Added ${passId} to selection`);
      }
      if (__DEV__) console.log(`🎖️ REDUCER: New selectedPassIds:`, state.selectedPassIds);
    },
    resetHallPassSelection: (state) => {
      state.selectedPassIds = [];
    },
    clearNewlyUnlockedPasses: (state) => {
      state.newlyUnlockedPassIds = [];
    },
    resetHallPasses: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(resetGame, (state) => {
      if (__DEV__) {
        console.log(
          '🎓 REDUCER: resetGame called - preserving unlocked hall passes AND selected passes'
        );
        console.log(
          '🎓 REDUCER: Unlocked passes before reset:',
          state.unlockedPassIds
        );
        console.log(
          '🎓 REDUCER: Selected passes before reset:',
          state.selectedPassIds
        );
      }

      // Preserve both unlocked AND selected hall passes across game resets
      // The player intentionally selected these passes before starting the game
      // Only clear the newly unlocked list for the current playthrough
      state.newlyUnlockedPassIds = [];
      // DO NOT clear selectedPassIds - preserve player's selection for the new game

      if (__DEV__) {
        console.log(
          '🎓 REDUCER: Unlocked passes after reset (preserved):',
          state.unlockedPassIds
        );
        console.log(
          '🎓 REDUCER: Selected passes after reset (preserved):',
          state.selectedPassIds
        );
      }
    });
  },
});

export const {
  initializeHallPasses,
  unlockHallPass,
  syncHallPassesFromFirebase,
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
