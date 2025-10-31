import { useEffect } from 'react';
import { JOKER_IDS, findJokerById } from '../constants/jokerIds';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { markFarmersCarryBonusApplied } from '../store/slices/gameSlice';
import { useInventory } from './useInventory';
import { useJokers } from './useJokers';
import { useWallet } from './useWallet';

/**
 * Farmers Carry Hook
 *
 * Applies a bonus of $2000 per period at the start of each new period
 * if the player has the Farmers Carry joker and 75+ inventory capacity.
 *
 * Bonuses are tracked in Redux to ensure persistence across app reloads.
 */
export const useFarmersCarry = () => {
  const dispatch = useAppDispatch();
  const periodCount = useAppSelector((state) => state.game.periodCount);
  const bonusesApplied = useAppSelector(
    (state) => state.game.markFarmersCarryBonusApplied ?? []
  );

  const { getInventoryLimit } = useInventory();
  const { jokers } = useJokers();
  const { add: addMoney } = useWallet();

  // Check and apply Farmers Carry bonus when period changes
  useEffect(() => {
    // Skip if period 0 or bonus already applied for this period
    if (periodCount <= 0 || bonusesApplied.includes(periodCount)) {
      return;
    }

    // Check if player has Farmers Carry joker
    const FarmersCarryJoker = findJokerById(jokers, JOKER_IDS.FARMERS_CARRY);
    if (!FarmersCarryJoker) {
      return;
    }

    // Check if inventory limit is >= 75
    const inventoryLimit = getInventoryLimit();
    if (inventoryLimit < 75) {
      return;
    }

    // Apply flat bonus of $2000
    const bonusAmount = 2000;
    addMoney(bonusAmount);

    // Mark this period as having received the bonus
    dispatch(markFarmersCarryBonusApplied(periodCount));

    if (__DEV__) {
      console.log(
        `🏭 Farmers Carry: +$${bonusAmount} at period ${periodCount} (75+ inventory limit)!`
      );
    }
  }, [
    periodCount,
    bonusesApplied,
    jokers,
    getInventoryLimit,
    addMoney,
    dispatch,
  ]);

  return {};
};
