import { JOKER_IDS, findJokerById } from '../constants/jokerIds';
import { getJokerEffectsAtLevel } from './jokerEffectEngine';

export type EndDayBonus = {
  jokerName: string;
  amount: number;
  emoji?: string;
};

type ComputeEndDayBonusesArgs = {
  jokers: any[];
  totalInventoryCount: number;
  inventoryLimit: number;
};

/**
 * Pure computation of end-of-day joker bonuses (Perfect Bake, Treasure Chest, Loan Shark debt).
 * Returns the list of bonuses with amounts; the caller dispatches the wallet add.
 * Negative amounts represent debts/penalties (e.g. Loan Shark end-of-day repayment).
 */
export function computeEndDayBonuses({
  jokers,
  totalInventoryCount,
  inventoryLimit,
}: ComputeEndDayBonusesArgs): EndDayBonus[] {
  const bonuses: EndDayBonus[] = [];

  const perfectBakeJoker = findJokerById(jokers, JOKER_IDS.PERFECT_BAKE);
  if (perfectBakeJoker && totalInventoryCount === 0) {
    const level = (perfectBakeJoker as any).level ?? 1;
    // $1k/$3k/$5k per level — matches the Perfect Bake effect definition in jokerEffectEngine.
    const bonus = level === 3 ? 5000 : level === 2 ? 3000 : 1000;
    bonuses.push({
      jokerName: 'Perfect Bake',
      amount: bonus,
      emoji: '🧁',
    });
  }

  const treasureChestJoker = findJokerById(jokers, JOKER_IDS.TREASURE_CHEST);
  if (treasureChestJoker) {
    const emptySlots = Math.max(0, inventoryLimit - totalInventoryCount);
    if (emptySlots > 0) {
      const level = (treasureChestJoker as any).level ?? 1;
      const cashPerSlot = level === 1 ? 20 : level === 2 ? 50 : 100;
      bonuses.push({
        jokerName: 'Treasure Chest',
        amount: emptySlots * cashPerSlot,
        emoji: '🏴‍☠️',
      });
    }
  }

  // Loan Shark — owe cash at end of day ($6k/$9.5k/$14k).
  // Negative amount = debt; the caller's wallet `add` dispatcher handles negative amounts
  // by simply adding them to the balance (addBalance supports negative payloads).
  const loanSharkJoker = findJokerById(jokers, JOKER_IDS.LOAN_SHARK);
  if (loanSharkJoker) {
    const level = (loanSharkJoker as any).level ?? 1;
    const effects = getJokerEffectsAtLevel(JOKER_IDS.LOAN_SHARK, level);
    const debtEffect = effects.find((e) => e.target === 'loan_shark_debt');
    if (debtEffect) {
      bonuses.push({
        jokerName: 'Loan Shark',
        amount: debtEffect.amount, // already negative
        emoji: '🦈',
      });
    }
  }

  return bonuses;
}
