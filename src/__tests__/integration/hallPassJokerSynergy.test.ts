/**
 * Integration tests for Hall Pass + Joker synergies.
 * Verifies that hall pass modifiers and joker effects interact correctly
 * through the calculateSaleTotal pipeline.
 */

import { calculateSaleTotal } from '../../utils/saleCalculations';
import { JOKER_IDS } from '../../constants/jokerIds';
import { getJokerEffectsAtLevel } from '../../utils/jokerEffectEngine';
import { computeHallPassModifiers } from '../../utils/computeHallPassModifiers';
import { HallPass } from '../../store/slices/hallPassSlice';

function makeTestJoker(id: number, level: number = 1) {
  return {
    id: id.toString(),
    name: `Joker ${id}`,
    level,
    effects: getJokerEffectsAtLevel(id, level),
  };
}

// Base params: M&Ms (small, chocolate + hard_candy), profit $50/unit, 10 qty
// totalProfit = 500, purchaseValue = 500
const baseSaleParams = {
  candyName: 'M&Ms',
  basePrice: 100,
  purchasePrice: 50,
  quantity: 10,
  jokers: [] as any[],
  periodCount: 0,
  inventoryLimit: 30,
  activeEffects: [],
  hallPassModifiers: { salePriceBonusPercent: 0 },
  merchantEffects: [],
  consecutivePeriodSales: 0,
  totalCandiesSold: 0,
  hasEarlySaleToday: true,
  currentCash: 1000,
  inventoryCount: 10,
  day: 1,
  period: 1,
  periodsPerDay: 8,
  bulkEmpireStacks: 0,
  inventory: [{ name: 'M&Ms', quantity: 10 }],
  didSellPreviousPeriod: true,
  ownedJokerCount: 0,
  uniqueTypesSoldThisPeriod: 0,
  clearanceSaleStacks: 0,
  compoundInterestDays: 0,
  reputationTypesSold: 0,
  streetSmartsEventsSurvived: 0,
  hoarderMaxHits: 0,
  pennyWiseStashes: 0,
  survivorCandiesMelted: 0,
  selectedPassIds: [] as string[],
};

describe('Hall Pass + Joker Synergy Integration', () => {
  // ===== 1. Hall pass profit boost + joker multiplier stacking =====
  describe('Hall pass profit boost + joker multiplier stacking', () => {
    it('Not a Freshman (+50% profit) + Mint Condition (+1 mult) on small candy', () => {
      // Not a Freshman: salePriceBonusPercent = 10 → profitBoost += 10*5/100 = 0.5
      // Mint Condition (70): multiplier += 1 (small candy)
      // profitBoost = 1 + 0.5 = 1.5, multiplier = 1 + 1 = 2
      // boostedProfit = 500 * 1.5 = 750
      // finalProfit = 750 * 2 = 1500
      // totalGain = 500 + 1500 = 2000
      const result = calculateSaleTotal({
        ...baseSaleParams,
        hallPassModifiers: { salePriceBonusPercent: 10 },
        jokers: [makeTestJoker(JOKER_IDS.MINT_CONDITION)],
      });
      expect(result.totalGain).toBe(2000);
      expect(result.jokerMultiplier).toBe(2);
    });

    it('Senior Executive (+75% profit) + Bear Market (+1.5 mult) on Gummy Bears', () => {
      // Senior Executive: salePriceBonusPercent = 15 → profitBoost += 0.75
      // Bear Market (19): multiplier += 1.5 (gummy candy)
      // Gummy Bears: small, gummy + chewy
      // profitBoost = 1 + 0.75 = 1.75, multiplier = 1 + 1.5 = 2.5
      // totalProfit = (100-50)*10 = 500
      // boostedProfit = 500 * 1.75 = 875
      // finalProfit = 875 * 2.5 = 2187.5
      // totalGain = 500 + 2187.5 = 2687.5
      const result = calculateSaleTotal({
        ...baseSaleParams,
        candyName: 'Gummy Bears',
        hallPassModifiers: { salePriceBonusPercent: 15 },
        jokers: [makeTestJoker(JOKER_IDS.BEAR_MARKET)],
      });
      expect(result.totalGain).toBe(2687.5);
    });

    it('Candy Kingpin (+125% profit) + Cocoa Futures (+50% profit) = additive profit boosts', () => {
      // Candy Kingpin: salePriceBonusPercent = 25 → profitBoost += 25*5/100 = 1.25
      // Cocoa Futures (23): profitBoost += 0.5 (chocolate)
      // M&Ms: chocolate + hard_candy
      // profitBoost = 1 + 1.25 + 0.5 = 2.75, multiplier = 1
      // boostedProfit = 500 * 2.75 = 1375
      // totalGain = 500 + 1375 = 1875
      const result = calculateSaleTotal({
        ...baseSaleParams,
        hallPassModifiers: { salePriceBonusPercent: 25 },
        jokers: [makeTestJoker(JOKER_IDS.COCOA_FUTURES)],
      });
      expect(result.totalGain).toBe(1875);
      expect(result.jokerMultiplier).toBe(1);
    });
  });

  // ===== 2. Multiple hall passes stacking =====
  describe('Multiple hall passes stacking', () => {
    it('computeHallPassModifiers correctly combines multiple passes', () => {
      // Not a Freshman (10) + Senior Executive (15) + Candy Kingpin (25) = 50
      const mockPasses: HallPass[] = [
        {
          id: 'no_longer_freshman', name: 'Not a Freshman', description: '', rarity: 'common',
          unlockRequirement: '', isUnlocked: true,
          effects: [{ type: 'sale_price_bonus', value: 10, description: '' }],
        },
        {
          id: 'senior_executive', name: 'Senior Executive', description: '', rarity: 'rare',
          unlockRequirement: '', isUnlocked: true,
          effects: [
            { type: 'sale_price_bonus', value: 15, description: '' },
            { type: 'inventory_bonus', value: 10, description: '' },
          ],
        },
        {
          id: 'candy_kingpin', name: 'Candy Kingpin', description: '', rarity: 'epic',
          unlockRequirement: '', isUnlocked: true,
          effects: [
            { type: 'sale_price_bonus', value: 25, description: '' },
            { type: 'allowance_bonus', value: 100, description: '' },
          ],
        },
      ];

      const modifiers = computeHallPassModifiers(mockPasses);
      expect(modifiers.salePriceBonusPercent).toBe(50); // 10+15+25
      expect(modifiers.inventoryBonusSlots).toBe(10);
      expect(modifiers.allowanceBonusPercent).toBe(100);
    });

    it('Stacked hall pass profit + joker type boost + joker multiplier', () => {
      // Not a Freshman + Senior Executive = salePriceBonusPercent 25
      // → profitBoost += 25*5/100 = 1.25
      // Cocoa Futures (23): profitBoost += 0.5 (chocolate)
      // Mint Condition (70): multiplier += 1 (small candy)
      // profitBoost = 1 + 1.25 + 0.5 = 2.75, multiplier = 1 + 1 = 2
      // boostedProfit = 500 * 2.75 = 1375
      // finalProfit = 1375 * 2 = 2750
      // totalGain = 500 + 2750 = 3250
      const result = calculateSaleTotal({
        ...baseSaleParams,
        hallPassModifiers: { salePriceBonusPercent: 25 },
        jokers: [
          makeTestJoker(JOKER_IDS.COCOA_FUTURES),
          makeTestJoker(JOKER_IDS.MINT_CONDITION),
        ],
      });
      expect(result.totalGain).toBe(3250);
    });
  });

  // ===== 3. Time Crunch hall pass (medium candy unlock — no sale calculation effect) =====
  describe('Time Crunch hall pass', () => {
    it('Time Crunch no longer affects sale calculations', () => {
      // Time Crunch now unlocks medium candy at game start — no profit bonus
      const result = calculateSaleTotal({
        ...baseSaleParams,
        hallPassModifiers: { salePriceBonusPercent: 0 },
        selectedPassIds: ['time_crunch'],
      });
      // No bonus from Time Crunch
      expect(result.totalGain).toBe(1000);
    });

    it('computeHallPassModifiers does NOT add bonus for time_crunch', () => {
      const mockPass: HallPass = {
        id: 'time_crunch', name: 'Time Crunch', description: '', rarity: 'legendary',
        unlockRequirement: '', isUnlocked: true,
        effects: [{ type: 'special', value: 1, description: '' }],
      };
      const modifiers = computeHallPassModifiers([mockPass]);
      expect(modifiers.salePriceBonusPercent).toBe(0);
    });
  });

  // ===== 4. Final Exam hall pass =====
  describe('Final Exam hall pass', () => {
    it('Final Exam last period = 15x profit multiplier', () => {
      // Period 8 of 8 (last period) → finalExamMultiplier = 15
      // profitBoost = 1, multiplier = 1
      // boostedProfit = 500
      // finalProfit = 500 * 1 * 15 = 7500
      // totalGain = 500 + 7500 = 8000
      const result = calculateSaleTotal({
        ...baseSaleParams,
        period: 8,
        periodsPerDay: 8,
        selectedPassIds: ['final_exam'],
      });
      expect(result.totalGain).toBe(8000);
    });

    it('Final Exam non-last period = 0.25x profit penalty', () => {
      // Period 3 of 8 → finalExamMultiplier = 0.25
      // boostedProfit = 500
      // finalProfit = 500 * 1 * 0.25 = 125
      // totalGain = 500 + 125 = 625
      const result = calculateSaleTotal({
        ...baseSaleParams,
        period: 3,
        periodsPerDay: 8,
        selectedPassIds: ['final_exam'],
      });
      expect(result.totalGain).toBe(625);
    });

    it('Final Exam last period + joker multipliers stack', () => {
      // Period 8 of 8 → finalExamMultiplier = 15
      // Mint Condition (70): multiplier += 1 (small candy)
      // Night Owl (85): multiplier += 2 (last period, periodsPerDay-1=7, period 8>=7)
      // multiplier = 1 + 1 + 2 = 4
      // finalProfit = 500 * 1 * 4 * 15 = 30000
      // totalGain = 500 + 30000 = 30500
      const result = calculateSaleTotal({
        ...baseSaleParams,
        period: 8,
        periodsPerDay: 8,
        selectedPassIds: ['final_exam'],
        jokers: [
          makeTestJoker(JOKER_IDS.MINT_CONDITION),
          makeTestJoker(JOKER_IDS.NIGHT_OWL),
        ],
      });
      expect(result.totalGain).toBe(30500);
    });

    it('No Final Exam = no period multiplier', () => {
      // Without final_exam, period 8 is normal
      const result = calculateSaleTotal({
        ...baseSaleParams,
        period: 8,
        periodsPerDay: 8,
        selectedPassIds: [],
      });
      // totalGain = 500 + 500 = 1000 (no bonuses)
      expect(result.totalGain).toBe(1000);
    });
  });

  // ===== 5. Speedrun Champion =====
  describe('Speedrun Champion hall pass', () => {
    it('Speedrun Champion (+100% profit) via salePriceBonusPercent', () => {
      // Speedrun Champion adds +20 (100/5 = 20) to salePriceBonusPercent
      // profitBoost += 20*5/100 = 1.0
      // profitBoost = 2, multiplier = 1
      // boostedProfit = 500 * 2 = 1000
      // totalGain = 500 + 1000 = 1500
      const result = calculateSaleTotal({
        ...baseSaleParams,
        hallPassModifiers: { salePriceBonusPercent: 20 },
      });
      expect(result.totalGain).toBe(1500);
    });
  });

  // ===== 6. Converted profit boost jokers + hall pass =====
  describe('Converted profit boost jokers + hall pass profit', () => {
    it('Early Bird (profit) + Even Stevens (profit) + hall pass profit all stack additively', () => {
      // Not a Freshman: salePriceBonusPercent = 10 → profitBoost += 0.5
      // Early Bird (45): profitBoost += 0.5 (first sale)
      // Even Stevens (29): profitBoost += 0.5 (even inventory=30)
      // profitBoost = 1 + 0.5 + 0.5 + 0.5 = 2.5
      // multiplier = 1
      // boostedProfit = 500 * 2.5 = 1250
      // totalGain = 500 + 1250 = 1750
      const result = calculateSaleTotal({
        ...baseSaleParams,
        hallPassModifiers: { salePriceBonusPercent: 10 },
        hasEarlySaleToday: false, // First sale
        inventoryLimit: 30, // Even
        jokers: [
          makeTestJoker(JOKER_IDS.EARLY_BIRD),
          makeTestJoker(JOKER_IDS.EVEN_STEVENS),
        ],
      });
      expect(result.totalGain).toBe(1750);
    });

    it('Scaling profit jokers + hall pass: Momentum + Reputation + hall pass', () => {
      // Not a Freshman: salePriceBonusPercent = 10 → profitBoost += 0.5
      // Momentum (89): profitBoost += 0.3 * 3 consecutive = 0.9
      // Reputation (64): profitBoost += 0.2 * 4 types sold = 0.8
      // profitBoost = 1 + 0.5 + 0.9 + 0.8 = 3.2
      // totalGain = 500 + (500 * 3.2) = 500 + 1600 = 2100
      const result = calculateSaleTotal({
        ...baseSaleParams,
        hallPassModifiers: { salePriceBonusPercent: 10 },
        consecutivePeriodSales: 3,
        reputationTypesSold: 4,
        jokers: [
          makeTestJoker(JOKER_IDS.MOMENTUM),
          makeTestJoker(JOKER_IDS.REPUTATION),
        ],
      });
      expect(result.totalGain).toBe(2100);
    });
  });

  // ===== 7. computeHallPassModifiers special cases =====
  describe('computeHallPassModifiers special cases', () => {
    it('Speedrun Champion adds +20 to salePriceBonusPercent', () => {
      const mockPass: HallPass = {
        id: 'speedrun_champion', name: 'Speedrun Champion', description: '', rarity: 'legendary',
        unlockRequirement: '', isUnlocked: true,
        effects: [{ type: 'special', value: 2, description: '' }],
      };
      const modifiers = computeHallPassModifiers([mockPass]);
      expect(modifiers.salePriceBonusPercent).toBe(20);
    });

    it('Forged Pass adds +1 rerollBonusCount', () => {
      const mockPass: HallPass = {
        id: 'forged_pass', name: 'Forged Pass', description: '', rarity: 'rare',
        unlockRequirement: '', isUnlocked: true,
        effects: [{ type: 'special', value: 1, description: '' }],
      };
      const modifiers = computeHallPassModifiers([mockPass]);
      expect(modifiers.rerollBonusCount).toBe(1);
    });

    it('Not a Freshman + Speedrun Champion stack correctly', () => {
      const mockPasses: HallPass[] = [
        {
          id: 'no_longer_freshman', name: 'Not a Freshman', description: '', rarity: 'common',
          unlockRequirement: '', isUnlocked: true,
          effects: [{ type: 'sale_price_bonus', value: 10, description: '' }],
        },
        {
          id: 'speedrun_champion', name: 'Speedrun Champion', description: '', rarity: 'legendary',
          unlockRequirement: '', isUnlocked: true,
          effects: [{ type: 'special', value: 2, description: '' }],
        },
      ];
      const modifiers = computeHallPassModifiers(mockPasses);
      // Not a Freshman: +10, Speedrun: +20
      expect(modifiers.salePriceBonusPercent).toBe(30);
    });
  });

  // ===== 8. Extreme synergy scenario =====
  describe('Extreme synergy scenarios', () => {
    it('Max hall pass profit + 3 joker profit boosts + 2 joker multipliers', () => {
      // High Roller + Candy Kingpin = salePriceBonusPercent 55 (30+25)
      // → profitBoost += 55*5/100 = 2.75
      // Cocoa Futures (23): profitBoost += 0.5 (chocolate)
      // Hard Knocks (26): profitBoost += 0.5 (hard_candy)
      // Combo Platter (8): profitBoost += 1.0 (both types covered)
      // profitBoost = 1 + 2.75 + 0.5 + 0.5 + 1.0 = 5.75
      //
      // Mint Condition (70): multiplier += 1 (small)
      // Odd Todd (30): multiplier += 0.5 (inventoryLimit=31, odd)
      // multiplier = 1 + 1 + 0.5 = 2.5
      //
      // boostedProfit = 500 * 5.75 = 2875
      // finalProfit = 2875 * 2.5 = 7187.5
      // totalGain = 500 + 7187.5 = 7687.5
      const result = calculateSaleTotal({
        ...baseSaleParams,
        hallPassModifiers: { salePriceBonusPercent: 55 },
        inventoryLimit: 31,
        jokers: [
          makeTestJoker(JOKER_IDS.COCOA_FUTURES),
          makeTestJoker(JOKER_IDS.HARD_KNOCKS),
          makeTestJoker(JOKER_IDS.COMBO_PLATTER),
          makeTestJoker(JOKER_IDS.MINT_CONDITION),
          makeTestJoker(JOKER_IDS.ODD_TODD),
        ],
      });
      expect(result.totalGain).toBe(7687.5);
      expect(result.jokerMultiplier).toBe(2.5);
    });

    it('Final Exam last period + hall pass profit + jokers = massive payout', () => {
      // High Roller: salePriceBonusPercent = 30 → profitBoost += 1.5
      // Cocoa Futures (23): profitBoost += 0.5
      // profitBoost = 1 + 1.5 + 0.5 = 3.0
      // Mint Condition (70): multiplier += 1
      // multiplier = 2
      // Final Exam last period (8 of 8): finalExamMultiplier = 15
      //
      // boostedProfit = 500 * 3.0 = 1500
      // finalProfit = 1500 * 2 * 15 = 45000
      // totalGain = 500 + 45000 = 45500
      const result = calculateSaleTotal({
        ...baseSaleParams,
        period: 8,
        periodsPerDay: 8,
        hallPassModifiers: { salePriceBonusPercent: 30 },
        selectedPassIds: ['final_exam'],
        jokers: [
          makeTestJoker(JOKER_IDS.COCOA_FUTURES),
          makeTestJoker(JOKER_IDS.MINT_CONDITION),
        ],
      });
      expect(result.totalGain).toBe(45500);
    });
  });

  // ===== 9. Bonus breakdown verification =====
  describe('Bonus breakdown includes all sources', () => {
    it('breakdown shows both hall pass and joker entries', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        hallPassModifiers: { salePriceBonusPercent: 10 },
        jokers: [makeTestJoker(JOKER_IDS.MINT_CONDITION)],
      });
      const hallPassEntry = result.bonusBreakdown.find(b => b.name === 'Hall Pass');
      const jokerEntry = result.bonusBreakdown.find(b => b.name !== 'Hall Pass');
      expect(hallPassEntry).toBeDefined();
      expect(hallPassEntry?.emoji).toBe('🎖️');
      expect(jokerEntry).toBeDefined();
    });

    it('Final Exam appears in breakdown', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        period: 8,
        periodsPerDay: 8,
        selectedPassIds: ['final_exam'],
      });
      const finalExamEntry = result.bonusBreakdown.find(b => b.name.includes('Final Exam'));
      expect(finalExamEntry).toBeDefined();
      expect(finalExamEntry?.multiplier).toBe(15);
    });

    it('Final Exam penalty appears in breakdown', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        period: 3,
        periodsPerDay: 8,
        selectedPassIds: ['final_exam'],
      });
      const penaltyEntry = result.bonusBreakdown.find(b => b.name.includes('Penalty'));
      expect(penaltyEntry).toBeDefined();
      expect(penaltyEntry?.multiplier).toBe(0.25);
    });
  });
});
