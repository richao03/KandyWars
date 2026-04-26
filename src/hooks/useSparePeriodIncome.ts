import { useEffect } from 'react';
import { JOKER_IDS, findJokerById } from '../constants/jokerIds';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { markSpareChangeBonusApplied } from '../store/slices/gameSlice';
import { useInventory } from './useInventory';
import { useJokers } from './useJokers';
import { useWallet } from './useWallet';
import { getJokerEffectsAtLevel } from '../utils/jokerEffectEngine';
import { useToast } from '../context/ToastContext';

/**
 * Spare Change Hook (Joker #93)
 *
 * Gives the player cash = (level amount) × (empty inventory slots) each period.
 * Level amounts: $5 / $10 / $20.
 *
 * Tracks applied periods in Redux to ensure idempotency across app reloads
 * (parallels the Farmers Carry dedup pattern).
 */
export const useSparePeriodIncome = () => {
  const dispatch = useAppDispatch();
  const periodCount = useAppSelector((state) => state.game.periodCount);
  const bonusesApplied = useAppSelector(
    (state) => state.game.spareChangeBonusAppliedPeriods ?? []
  );

  const { getTotalInventoryCount, getInventoryLimit } = useInventory();
  const { jokers } = useJokers();
  const { add: addMoney } = useWallet();
  const { showToast } = useToast();

  useEffect(() => {
    // Skip period 0 or if bonus already applied for this period
    if (periodCount <= 0 || bonusesApplied.includes(periodCount)) {
      return;
    }

    const spareChangeJoker = findJokerById(jokers, JOKER_IDS.SPARE_CHANGE);
    if (!spareChangeJoker) {
      return;
    }

    const inventoryLimit = getInventoryLimit();
    const totalInventory = getTotalInventoryCount();
    const emptySlots = Math.max(0, inventoryLimit - totalInventory);
    if (emptySlots <= 0) {
      // Still mark period as processed so we don't re-check every render.
      dispatch(markSpareChangeBonusApplied(periodCount));
      return;
    }

    const level = (spareChangeJoker as any).level ?? 1;
    const effects = getJokerEffectsAtLevel(JOKER_IDS.SPARE_CHANGE, level);
    const incomeEffect = effects.find((e) => e.target === 'spare_change_income');
    const perSlotAmount = incomeEffect?.amount ?? 5;

    const bonusAmount = emptySlots * perSlotAmount;
    addMoney(bonusAmount);
    showToast(`Spare Change +$${bonusAmount}`);

    dispatch(markSpareChangeBonusApplied(periodCount));

    if (__DEV__) {
      console.log(
        `🪙 Spare Change: +$${bonusAmount} (${emptySlots} empty × $${perSlotAmount}) at period ${periodCount}!`
      );
    }
  }, [
    periodCount,
    bonusesApplied,
    jokers,
    getTotalInventoryCount,
    getInventoryLimit,
    addMoney,
    dispatch,
    showToast,
  ]);

  return {};
};
