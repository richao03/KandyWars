import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import seedrandom from 'seedrandom';
import { resetGame } from './gameSlice';
import {
  getLevelFromXP,
  getLevelConfig,
  getJokerPoolForLevel,
  XP_REWARDS,
  JOKER_SHOP,
  DAILY_SPECIAL_CONFIG,
  TRIVIA_POOL,
  TRIVIA_QUESTIONS_PER_VISIT,
  NIGHTLY_QUEST_TEMPLATES,
  QUEST_DIFFICULTY,
  QUEST_REWARDS,
  NightlyQuestType,
  SMALL_CANDY_NAMES,
  MEDIUM_CANDY_NAMES,
  BIG_CANDY_NAMES,
  CANDY_TYPES_FOR_QUESTS,
  getQuestCashReward,
} from '../../constants/shopkeeperData';
import { CANDY_REGISTRY } from '../../constants/candyRegistry';

// ========================================
// TYPES
// ========================================

export interface NightlyQuest {
  id: string;
  type: NightlyQuestType;
  description: string;
  target: {
    candyName?: string;
    candyType?: string;
    quantity?: number;
    amount?: number;
  };
  progress: number;
  goal: number;
  reward: { xp: number; cash: number };
  day: number;
  expiresDay?: number;
}

export interface DailySpecial {
  candyName: string;
  discountPercent: number;
}

export interface ShopkeeperState {
  // === PERSISTENT (survives resetGame) ===
  level: number;
  totalXP: number;

  // === PER-RUN (reset on resetGame) ===
  deliVisitsThisRun: number;

  // === PER-VISIT (reset on sleep) ===
  hasVisitedDeliToday: boolean;
  hasChattedToday: boolean;
  hasPurchasedCandyToday: boolean;
  hasPurchasedJokerToday: boolean;
  hasRerolledToday: boolean;

  // Trivia
  triviaAnsweredToday: number;
  triviaCorrectToday: number;
  todaysTriviaIds: string[];

  // Nightly quest
  nightlyQuest: NightlyQuest | null;
  nightlyQuestCompleted: boolean;
  pendingQuestReward: boolean;
  completedNightlyQuestIds: string[];

  // Deli joker shop
  deliJokerIds: number[];
  deliJokersPurchased: number[];
  rerollCount: number;

  // Daily specials
  dailySpecials: DailySpecial[];

  // Mood (real-time reactive)
  mood: 'normal' | 'happy' | 'mad';
}

const initialState: ShopkeeperState = {
  level: 1,
  totalXP: 0,

  deliVisitsThisRun: 0,

  hasVisitedDeliToday: false,
  hasChattedToday: false,
  hasPurchasedCandyToday: false,
  hasPurchasedJokerToday: false,
  hasRerolledToday: false,

  triviaAnsweredToday: 0,
  triviaCorrectToday: 0,
  todaysTriviaIds: [],

  nightlyQuest: null,
  nightlyQuestCompleted: false,
  pendingQuestReward: false,
  completedNightlyQuestIds: [],

  deliJokerIds: [],
  deliJokersPurchased: [],
  rerollCount: 0,

  dailySpecials: [],

  mood: 'normal',
};

// ========================================
// HELPERS
// ========================================

function addXP(state: ShopkeeperState, amount: number) {
  state.totalXP += amount;
  state.level = getLevelFromXP(state.totalXP);
}

function generateDeliJokers(
  seed: string,
  day: number,
  rerollCount: number,
  level: number,
  ownedMaxLevelJokerIds: number[],
): number[] {
  const rng = seedrandom(`${seed}-delijoker-${day}-${rerollCount}`);
  const pool = getJokerPoolForLevel(level).filter(
    (id) => !ownedMaxLevelJokerIds.includes(id)
  );

  if (pool.length === 0) return [];

  const config = getLevelConfig(level);
  const count = Math.min(config.jokerSlots, pool.length);
  const selected: number[] = [];

  for (let i = 0; i < count; i++) {
    const remaining = pool.filter((id) => !selected.includes(id));
    if (remaining.length === 0) break;
    const index = Math.floor(rng() * remaining.length);
    selected.push(remaining[index]);
  }

  return selected;
}

function generateDailySpecials(
  seed: string,
  day: number,
  level: number,
): DailySpecial[] {
  const config = getLevelConfig(level);
  if (config.dailySpecials === 0) return [];

  const rng = seedrandom(`${seed}-special-${day}`);
  const candyNames = CANDY_REGISTRY.map((c) => c.name);
  const specials: DailySpecial[] = [];

  for (let i = 0; i < config.dailySpecials; i++) {
    const remaining = candyNames.filter(
      (name) => !specials.some((s) => s.candyName === name)
    );
    if (remaining.length === 0) break;
    const index = Math.floor(rng() * remaining.length);
    const discountRange = DAILY_SPECIAL_CONFIG.DISCOUNT_MAX - DAILY_SPECIAL_CONFIG.DISCOUNT_MIN;
    const discount = DAILY_SPECIAL_CONFIG.DISCOUNT_MIN + rng() * discountRange;

    specials.push({
      candyName: remaining[index],
      discountPercent: parseFloat(discount.toFixed(2)),
    });
  }

  return specials;
}

function generateTriviaIds(seed: string, day: number): string[] {
  const rng = seedrandom(`${seed}-trivia-${day}`);
  const pool = [...TRIVIA_POOL];
  const selected: string[] = [];

  for (let i = 0; i < TRIVIA_QUESTIONS_PER_VISIT && pool.length > 0; i++) {
    const index = Math.floor(rng() * pool.length);
    selected.push(pool[index].id);
    pool.splice(index, 1);
  }

  return selected;
}

function generateNightlyQuest(
  seed: string,
  day: number,
  level: number,
  completedIds: string[],
): NightlyQuest | null {
  const rng = seedrandom(`${seed}-nquest-${day}`);

  // Filter quest templates by level
  const availableTemplates = NIGHTLY_QUEST_TEMPLATES.filter(
    (t) => level >= t.minLevel
  );
  if (availableTemplates.length === 0) return null;

  const template = availableTemplates[Math.floor(rng() * availableTemplates.length)];
  const questId = `nq-${day}-${template.type}`;

  // Skip if already completed this quest this run
  if (completedIds.includes(questId)) {
    // Try another template
    const remaining = availableTemplates.filter(
      (t) => !completedIds.includes(`nq-${day}-${t.type}`)
    );
    if (remaining.length === 0) return null;
    const fallback = remaining[Math.floor(rng() * remaining.length)];
    return buildQuest(fallback, `nq-${day}-${fallback.type}`, day, level, rng);
  }

  return buildQuest(template, questId, day, level, rng);
}

function buildQuest(
  template: { type: NightlyQuestType; descriptionTemplate: string },
  questId: string,
  day: number,
  level: number,
  rng: () => number,
): NightlyQuest {
  const isMultiDay = template.type === 'multi_day';

  switch (template.type) {
    case 'sell_candy':
    case 'multi_day': {
      // Pick a candy name (use small candies for reliability, medium if day >= 2)
      const availableCandies = day >= 3
        ? [...SMALL_CANDY_NAMES, ...MEDIUM_CANDY_NAMES, ...BIG_CANDY_NAMES]
        : day >= 2
          ? [...SMALL_CANDY_NAMES, ...MEDIUM_CANDY_NAMES]
          : SMALL_CANDY_NAMES;
      const candyName = availableCandies[Math.floor(rng() * availableCandies.length)];
      const diff = isMultiDay ? QUEST_DIFFICULTY.MULTI_DAY_QTY : QUEST_DIFFICULTY.SELL_CANDY_QTY;
      const quantity = diff.min + Math.floor(rng() * (diff.max - diff.min + 1));
      const description = template.descriptionTemplate
        .replace('{quantity}', quantity.toString())
        .replace('{target}', candyName);

      return {
        id: questId,
        type: template.type,
        description,
        target: { candyName, quantity },
        progress: 0,
        goal: quantity,
        reward: {
          xp: isMultiDay ? XP_REWARDS.MULTI_DAY_QUEST_COMPLETE : XP_REWARDS.NIGHTLY_QUEST_COMPLETE,
          cash: getQuestCashReward(day, isMultiDay),
        },
        day,
        ...(isMultiDay ? { expiresDay: day + 2 } : {}),
      };
    }

    case 'sell_quantity': {
      const diff = QUEST_DIFFICULTY.SELL_TOTAL_QTY;
      const quantity = diff.min + Math.floor(rng() * (diff.max - diff.min + 1));
      const description = template.descriptionTemplate.replace('{quantity}', quantity.toString());

      return {
        id: questId,
        type: template.type,
        description,
        target: { quantity },
        progress: 0,
        goal: quantity,
        reward: {
          xp: XP_REWARDS.NIGHTLY_QUEST_COMPLETE,
          cash: getQuestCashReward(day, false),
        },
        day,
      };
    }

    case 'earn_profit': {
      const diff = QUEST_DIFFICULTY.EARN_PROFIT;
      const amount = diff.min + Math.floor(rng() * (diff.max - diff.min + 1));
      // Round to nearest 100
      const roundedAmount = Math.round(amount / 100) * 100;
      const description = template.descriptionTemplate.replace('{amount}', roundedAmount.toString());

      return {
        id: questId,
        type: template.type,
        description,
        target: { amount: roundedAmount },
        progress: 0,
        goal: roundedAmount,
        reward: {
          xp: XP_REWARDS.NIGHTLY_QUEST_COMPLETE,
          cash: getQuestCashReward(day, false),
        },
        day,
      };
    }

    case 'sell_type': {
      const candyType = CANDY_TYPES_FOR_QUESTS[Math.floor(rng() * CANDY_TYPES_FOR_QUESTS.length)];
      const diff = QUEST_DIFFICULTY.SELL_TYPE_QTY;
      const quantity = diff.min + Math.floor(rng() * (diff.max - diff.min + 1));
      const description = template.descriptionTemplate.replace('{target}', candyType);

      return {
        id: questId,
        type: template.type,
        description,
        target: { candyType, quantity },
        progress: 0,
        goal: quantity,
        reward: {
          xp: XP_REWARDS.NIGHTLY_QUEST_COMPLETE,
          cash: getQuestCashReward(day, false),
        },
        day,
      };
    }

    default:
      // Fallback to sell_quantity
      return {
        id: questId,
        type: 'sell_quantity',
        description: 'Sell 10 candies tomorrow',
        target: { quantity: 10 },
        progress: 0,
        goal: 10,
        reward: {
          xp: XP_REWARDS.NIGHTLY_QUEST_COMPLETE,
          cash: getQuestCashReward(day, false),
        },
        day,
      };
  }
}

// ========================================
// SLICE
// ========================================

const shopkeeperSlice = createSlice({
  name: 'shopkeeper',
  initialState,
  reducers: {
    // Called when entering the deli
    initializeDeliVisit: (
      state,
      action: PayloadAction<{
        seed: string;
        day: number;
        ownedMaxLevelJokerIds: number[];
      }>
    ) => {
      const { seed, day, ownedMaxLevelJokerIds } = action.payload;

      if (state.hasVisitedDeliToday) return; // Already initialized today

      state.hasVisitedDeliToday = true;
      state.deliVisitsThisRun += 1;

      // Generate trivia
      state.todaysTriviaIds = generateTriviaIds(seed, day);

      // Generate jokers for shop
      state.deliJokerIds = generateDeliJokers(
        seed, day, 0, state.level, ownedMaxLevelJokerIds
      );
      state.deliJokersPurchased = [];
      state.rerollCount = 0;

      // Generate daily specials
      state.dailySpecials = generateDailySpecials(seed, day, state.level);

      // Check if there's a pending quest reward from yesterday
      if (state.nightlyQuestCompleted && state.nightlyQuest) {
        state.pendingQuestReward = true;
      }

      // Generate new nightly quest (if no active uncompleted one)
      if (!state.nightlyQuest || state.nightlyQuestCompleted) {
        state.nightlyQuest = generateNightlyQuest(
          seed, day, state.level, state.completedNightlyQuestIds
        );
        state.nightlyQuestCompleted = false;
      }

      // Set initial mood
      state.mood = 'normal';
    },

    // Chat with shopkeeper
    recordChat: (state) => {
      if (state.hasChattedToday) return;
      state.hasChattedToday = true;
      addXP(state, XP_REWARDS.CHAT);
      // Happy mood when chatting at higher levels
      if (state.level >= 5) {
        state.mood = 'happy';
      }
    },

    // Trivia
    answerTrivia: (state, action: PayloadAction<{ correct: boolean }>) => {
      if (state.triviaAnsweredToday >= TRIVIA_QUESTIONS_PER_VISIT) return;

      state.triviaAnsweredToday += 1;
      if (action.payload.correct) {
        state.triviaCorrectToday += 1;
        addXP(state, XP_REWARDS.TRIVIA_CORRECT);
        state.mood = 'happy';
      }
    },

    // Purchase tracking
    recordCandyPurchase: (state) => {
      if (state.hasPurchasedCandyToday) return;
      state.hasPurchasedCandyToday = true;
      addXP(state, XP_REWARDS.PURCHASE_CANDY);
      state.mood = 'happy';
    },

    // Joker shop
    purchaseDeliJoker: (state, action: PayloadAction<{ jokerId: number }>) => {
      const { jokerId } = action.payload;
      if (state.deliJokersPurchased.includes(jokerId)) return;

      state.deliJokersPurchased.push(jokerId);
      if (!state.hasPurchasedJokerToday) {
        state.hasPurchasedJokerToday = true;
        addXP(state, XP_REWARDS.PURCHASE_JOKER);
      }
      state.mood = 'happy';
    },

    rerollDeliJoker: (
      state,
      action: PayloadAction<{
        seed: string;
        day: number;
        ownedMaxLevelJokerIds: number[];
      }>
    ) => {
      if (state.rerollCount >= JOKER_SHOP.MAX_REROLLS_PER_VISIT) return;

      state.rerollCount += 1;

      if (!state.hasRerolledToday) {
        state.hasRerolledToday = true;
        addXP(state, XP_REWARDS.REROLL);
      }

      const { seed, day, ownedMaxLevelJokerIds } = action.payload;
      state.deliJokerIds = generateDeliJokers(
        seed, day, state.rerollCount, state.level, ownedMaxLevelJokerIds
      );

      // Mad mood if rerolled 3 times without buying
      if (
        state.rerollCount >= JOKER_SHOP.MAX_REROLLS_PER_VISIT &&
        state.deliJokersPurchased.length === 0
      ) {
        state.mood = 'mad';
      }
    },

    // Nightly quest progress
    updateQuestProgress: (
      state,
      action: PayloadAction<{
        candyName?: string;
        candyTypes?: string[];
        quantity: number;
        profit?: number;
      }>
    ) => {
      if (!state.nightlyQuest || state.nightlyQuestCompleted) return;
      const quest = state.nightlyQuest;
      const { candyName, candyTypes, quantity, profit } = action.payload;

      switch (quest.type) {
        case 'sell_candy':
        case 'multi_day':
          if (candyName === quest.target.candyName) {
            quest.progress += quantity;
          }
          break;
        case 'sell_quantity':
          quest.progress += quantity;
          break;
        case 'earn_profit':
          if (profit !== undefined) {
            quest.progress += profit;
          }
          break;
        case 'sell_type':
          if (candyTypes && quest.target.candyType && candyTypes.includes(quest.target.candyType)) {
            quest.progress += quantity;
          }
          break;
      }

      // Check completion
      if (quest.progress >= quest.goal) {
        state.nightlyQuestCompleted = true;
        state.completedNightlyQuestIds.push(quest.id);
      }
    },

    // Acknowledge quest reward (when visiting deli after completion)
    acknowledgeQuestReward: (state) => {
      if (!state.pendingQuestReward) return;
      state.pendingQuestReward = false;
      if (state.nightlyQuest) {
        addXP(state, state.nightlyQuest.reward.xp);
      }
      state.mood = 'happy';
    },

    // Set mood directly
    setMood: (state, action: PayloadAction<'normal' | 'happy' | 'mad'>) => {
      state.mood = action.payload;
    },

    // Reset daily state (called during sleep)
    resetDailyShopkeeperState: (state) => {
      state.hasVisitedDeliToday = false;
      state.hasChattedToday = false;
      state.hasPurchasedCandyToday = false;
      state.hasPurchasedJokerToday = false;
      state.hasRerolledToday = false;
      state.triviaAnsweredToday = 0;
      state.triviaCorrectToday = 0;
      state.todaysTriviaIds = [];
      state.deliJokerIds = [];
      state.deliJokersPurchased = [];
      state.rerollCount = 0;
      state.dailySpecials = [];
      state.mood = 'normal';
      // Don't reset nightlyQuest - it carries over to the next day
      // Don't reset pendingQuestReward - it needs to be acknowledged at next visit
    },

    // Apply end-of-run XP bonus (call before resetGame)
    applyEndOfRunBonus: (state) => {
      if (state.deliVisitsThisRun >= XP_REWARDS.MIN_VISITS_FOR_BONUS) {
        addXP(state, XP_REWARDS.END_OF_RUN_BONUS);
      }
    },
  },

  extraReducers: (builder) => {
    builder.addCase(resetGame, (state) => {
      if (__DEV__) {
        console.log(
          '🏪 SHOPKEEPER: resetGame - preserving level and XP',
          { level: state.level, totalXP: state.totalXP }
        );
      }

      // Preserve persistent progression
      const { level, totalXP } = state;

      // Reset everything else
      Object.assign(state, {
        ...initialState,
        level,
        totalXP,
      });
    });
  },
});

export const {
  initializeDeliVisit,
  recordChat,
  answerTrivia,
  recordCandyPurchase,
  purchaseDeliJoker,
  rerollDeliJoker,
  updateQuestProgress,
  acknowledgeQuestReward,
  setMood,
  resetDailyShopkeeperState,
  applyEndOfRunBonus,
} = shopkeeperSlice.actions;

// ========================================
// SELECTORS
// ========================================

export const selectShopkeeperLevel = (state: { shopkeeper: ShopkeeperState }) =>
  state.shopkeeper.level;

export const selectShopkeeperXP = (state: { shopkeeper: ShopkeeperState }) =>
  state.shopkeeper.totalXP;

export const selectShopkeeperMood = (state: { shopkeeper: ShopkeeperState }) =>
  state.shopkeeper.mood;

export const selectDeliJokerIds = (state: { shopkeeper: ShopkeeperState }) =>
  state.shopkeeper.deliJokerIds;

export const selectDeliJokersPurchased = (state: { shopkeeper: ShopkeeperState }) =>
  state.shopkeeper.deliJokersPurchased;

export const selectRerollCount = (state: { shopkeeper: ShopkeeperState }) =>
  state.shopkeeper.rerollCount;

export const selectDailySpecials = (state: { shopkeeper: ShopkeeperState }) =>
  state.shopkeeper.dailySpecials;

export const selectNightlyQuest = (state: { shopkeeper: ShopkeeperState }) =>
  state.shopkeeper.nightlyQuest;

export const selectNightlyQuestCompleted = (state: { shopkeeper: ShopkeeperState }) =>
  state.shopkeeper.nightlyQuestCompleted;

export const selectPendingQuestReward = (state: { shopkeeper: ShopkeeperState }) =>
  state.shopkeeper.pendingQuestReward;

export const selectTriviaAnsweredToday = (state: { shopkeeper: ShopkeeperState }) =>
  state.shopkeeper.triviaAnsweredToday;

export const selectTriviaCorrectToday = (state: { shopkeeper: ShopkeeperState }) =>
  state.shopkeeper.triviaCorrectToday;

export const selectTodaysTriviaIds = (state: { shopkeeper: ShopkeeperState }) =>
  state.shopkeeper.todaysTriviaIds;

export const selectHasChattedToday = (state: { shopkeeper: ShopkeeperState }) =>
  state.shopkeeper.hasChattedToday;

export const selectHasVisitedDeliToday = (state: { shopkeeper: ShopkeeperState }) =>
  state.shopkeeper.hasVisitedDeliToday;

export const selectDeliVisitsThisRun = (state: { shopkeeper: ShopkeeperState }) =>
  state.shopkeeper.deliVisitsThisRun;

export const selectCanReroll = (state: { shopkeeper: ShopkeeperState }) =>
  state.shopkeeper.rerollCount < JOKER_SHOP.MAX_REROLLS_PER_VISIT;

export const selectRerollCost = (state: { shopkeeper: ShopkeeperState }) => {
  const config = getLevelConfig(state.shopkeeper.level);
  return config.rerollBaseCost * Math.pow(JOKER_SHOP.REROLL_COST_MULTIPLIER, state.shopkeeper.rerollCount);
};

export default shopkeeperSlice.reducer;
