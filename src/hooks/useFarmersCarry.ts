import { useEffect } from 'react';
import { JOKER_IDS, findJokerById } from '../constants/jokerIds';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { markFarmersCarryBonusApplied } from '../store/slices/gameSlice';
import { useInventory } from './useInventory';
import { useJokers } from './useJokers';
import { useWallet } from './useWallet';
import { getJokerEffectsAtLevel } from '../utils/jokerEffectEngine';

/**
 * Farmers Carry Hook
 *
 * Applies a bonus of inventory count × $5/$25/$100 per period
 * at the start of each new period if the player has the Farmers Carry joker.
 *
 * Bonuses are tracked in Redux to ensure persistence across app reloads.
 */
export const useFarmersCarry = () => {
  const dispatch = useAppDispatch();
  const periodCount = useAppSelector((state) => state.game.periodCount);
  const bonusesApplied = useAppSelector(
    (state) => state.game.markFarmersCarryBonusApplied ?? []
  );

  const { getTotalInventoryCount } = useInventory();
  const { jokers } = useJokers();
  const { add: addMoney } = useWallet();

  // Check and apply Farmers Carry bonus when period changes
  useEffect(() => {
    // Skip if period 0 or bonus already applied for this period
    if (periodCount <= 0 || bonusesApplied.includes(periodCount)) {
      return;
    }

    // Check if player has Farmers Carry joker
    const farmersCarryJoker = findJokerById(jokers, JOKER_IDS.FARMERS_CARRY);
    if (!farmersCarryJoker) {
      return;
    }

    // Get inventory count
    const inventoryCount = getTotalInventoryCount();
    if (inventoryCount <= 0) {
      return;
    }

    // Get per-candy rate from joker level ($5/$25/$100)
    const level = (farmersCarryJoker as any).level ?? 1;
    const effects = getJokerEffectsAtLevel(JOKER_IDS.FARMERS_CARRY, level);
    const bonusEffect = effects.find(e => e.target === 'farmers_carry_bonus');
    const perCandyRate = bonusEffect?.amount ?? 5;

    // Apply bonus: inventory count × rate
    const bonusAmount = inventoryCount * perCandyRate;
    addMoney(bonusAmount);

    // Mark this period as having received the bonus
    dispatch(markFarmersCarryBonusApplied(periodCount));

    if (__DEV__) {
      console.log(
        `🏭 Farmers Carry: +$${bonusAmount} (${inventoryCount} candy × $${perCandyRate}) at period ${periodCount}!`
      );
    }
  }, [
    periodCount,
    bonusesApplied,
    jokers,
    getTotalInventoryCount,
    addMoney,
    dispatch,
  ]);

  return {};
};
