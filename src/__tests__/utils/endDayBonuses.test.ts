/**
 * Tests for computeEndDayBonuses — pure EOD bonus computation.
 *
 * Covers Perfect Bake, Treasure Chest, Loan Shark EOD debt.
 */

import { computeEndDayBonuses } from '../../utils/endDayBonuses';
import { JOKER_IDS } from '../../constants/jokerIds';

function perfectBake(level = 1) {
  return { id: JOKER_IDS.PERFECT_BAKE, name: 'Perfect Bake', level };
}
function treasureChest(level = 1) {
  return { id: JOKER_IDS.TREASURE_CHEST, name: 'Treasure Chest', level };
}
function loanShark(level = 1) {
  return { id: JOKER_IDS.LOAN_SHARK, name: 'Loan Shark', level };
}

describe('computeEndDayBonuses — Perfect Bake', () => {
  it('Awards $1k L1 / $3k L2 / $5k L3 when inventory is empty', () => {
    expect(
      computeEndDayBonuses({
        jokers: [perfectBake(1)],
        totalInventoryCount: 0,
        inventoryLimit: 20,
      })
    ).toEqual([{ jokerName: 'Perfect Bake', amount: 1000, emoji: '🧁' }]);

    expect(
      computeEndDayBonuses({
        jokers: [perfectBake(2)],
        totalInventoryCount: 0,
        inventoryLimit: 20,
      })
    ).toEqual([{ jokerName: 'Perfect Bake', amount: 3000, emoji: '🧁' }]);

    expect(
      computeEndDayBonuses({
        jokers: [perfectBake(3)],
        totalInventoryCount: 0,
        inventoryLimit: 20,
      })
    ).toEqual([{ jokerName: 'Perfect Bake', amount: 5000, emoji: '🧁' }]);
  });

  it('Does NOT award Perfect Bake when inventory has any candy', () => {
    const bonuses = computeEndDayBonuses({
      jokers: [perfectBake(1)],
      totalInventoryCount: 1,
      inventoryLimit: 20,
    });
    expect(bonuses.find((b) => b.jokerName === 'Perfect Bake')).toBeUndefined();
  });
});

describe('computeEndDayBonuses — Treasure Chest', () => {
  it('Awards cashPerSlot × emptySlots (L1 $20, L2 $50, L3 $100)', () => {
    // L1: 5 empty × $20 = $100
    expect(
      computeEndDayBonuses({
        jokers: [treasureChest(1)],
        totalInventoryCount: 15,
        inventoryLimit: 20,
      })
    ).toEqual([{ jokerName: 'Treasure Chest', amount: 100, emoji: '🏴‍☠️' }]);

    // L2: 10 empty × $50 = $500
    expect(
      computeEndDayBonuses({
        jokers: [treasureChest(2)],
        totalInventoryCount: 10,
        inventoryLimit: 20,
      })
    ).toEqual([{ jokerName: 'Treasure Chest', amount: 500, emoji: '🏴‍☠️' }]);

    // L3: 20 empty × $100 = $2000
    expect(
      computeEndDayBonuses({
        jokers: [treasureChest(3)],
        totalInventoryCount: 0,
        inventoryLimit: 20,
      })
    ).toEqual([{ jokerName: 'Treasure Chest', amount: 2000, emoji: '🏴‍☠️' }]);
  });

  it('Omits Treasure Chest when inventory is full', () => {
    const bonuses = computeEndDayBonuses({
      jokers: [treasureChest(1)],
      totalInventoryCount: 20,
      inventoryLimit: 20,
    });
    expect(bonuses.find((b) => b.jokerName === 'Treasure Chest')).toBeUndefined();
  });
});

describe('computeEndDayBonuses — Loan Shark EOD debt', () => {
  it('Adds a negative-amount Loan Shark row for each level', () => {
    const l1 = computeEndDayBonuses({
      jokers: [loanShark(1)],
      totalInventoryCount: 0,
      inventoryLimit: 20,
    });
    expect(l1.find((b) => b.jokerName === 'Loan Shark')).toEqual({
      jokerName: 'Loan Shark',
      amount: -6000,
      emoji: '🦈',
    });

    const l2 = computeEndDayBonuses({
      jokers: [loanShark(2)],
      totalInventoryCount: 0,
      inventoryLimit: 20,
    });
    expect(l2.find((b) => b.jokerName === 'Loan Shark')).toEqual({
      jokerName: 'Loan Shark',
      amount: -9500,
      emoji: '🦈',
    });

    const l3 = computeEndDayBonuses({
      jokers: [loanShark(3)],
      totalInventoryCount: 0,
      inventoryLimit: 20,
    });
    expect(l3.find((b) => b.jokerName === 'Loan Shark')).toEqual({
      jokerName: 'Loan Shark',
      amount: -14000,
      emoji: '🦈',
    });
  });

  it('Omits Loan Shark when joker is not owned', () => {
    const bonuses = computeEndDayBonuses({
      jokers: [],
      totalInventoryCount: 0,
      inventoryLimit: 20,
    });
    expect(bonuses.find((b) => b.jokerName === 'Loan Shark')).toBeUndefined();
  });

  it('Loan Shark debt stacks with other EOD bonuses (net sum can be negative)', () => {
    // Perfect Bake L1 ($1000) + Loan Shark L1 (-$6000) = net -$5000
    const bonuses = computeEndDayBonuses({
      jokers: [perfectBake(1), loanShark(1)],
      totalInventoryCount: 0,
      inventoryLimit: 20,
    });
    const total = bonuses.reduce((sum, b) => sum + b.amount, 0);
    expect(total).toBe(-5000);
    expect(bonuses).toHaveLength(2);
  });
});

describe('computeEndDayBonuses — empty / no-joker cases', () => {
  it('Returns [] when no relevant jokers owned', () => {
    expect(
      computeEndDayBonuses({
        jokers: [],
        totalInventoryCount: 5,
        inventoryLimit: 20,
      })
    ).toEqual([]);
  });
});
