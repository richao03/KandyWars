import { useEffect } from 'react';
import { JOKER_IDS, findJokerById } from '../constants/jokerIds';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { markHomeMadeBonusApplied, selectDay } from '../store/slices/gameSlice';
import { useInventory } from './useInventory';
import { useJokers } from './useJokers';
import { useWallet } from './useWallet';
import { getJokerEffectsAtLevel } from '../utils/jokerEffectEngine';
import { useToast } from '../context/ToastContext';

/**
 * Home Made Hook
 *
 * At the start of each new day, if the player owns the Home Made joker,
 * they receive $25/$50/$100 (per joker level) × total candy count in inventory.
 *
 * Bonus is tracked per-day in Redux to ensure no duplicate payouts across reloads.
 */
export const useHomeMadeBonus = () => {
  const dispatch = useAppDispatch();
  const currentDay = useAppSelector(selectDay);
  const bonusDaysApplied = useAppSelector(
    (state: any) => state.game.homeMadeBonusAppliedDays ?? []
  );

  const { getTotalInventoryCount } = useInventory();
  const { jokers } = useJokers();
  const { add: addMoney } = useWallet();
  const { showToast } = useToast();

  useEffect(() => {
    // Skip day 0/invalid and days already rewarded
    if (currentDay <= 0 || bonusDaysApplied.includes(currentDay)) {
      return;
    }

    // Check if player has Home Made joker
    const homeMadeJoker = findJokerById(jokers, JOKER_IDS.HOME_MADE);
    if (!homeMadeJoker) {
      return;
    }

    // Get inventory count
    const inventoryCount = getTotalInventoryCount();

    // Mark this day as applied (even if no candy — prevents repeated checks)
    dispatch(markHomeMadeBonusApplied(currentDay));

    if (inventoryCount <= 0) {
      return;
    }

    // Get per-candy rate from joker level ($25/$50/$100)
    const level = (homeMadeJoker as any).level ?? 1;
    const effects = getJokerEffectsAtLevel(JOKER_IDS.HOME_MADE, level);
    const bonusEffect = effects.find((e: any) => e.target === 'morning_inventory_bonus');
    const perCandyRate = bonusEffect?.amount ?? 25;

    // Apply bonus: inventory count × rate
    const bonusAmount = inventoryCount * perCandyRate;
    addMoney(bonusAmount);
    showToast(`Home Made +$${bonusAmount}`);

    if (__DEV__) {
      console.log(
        `🍬 Home Made: +$${bonusAmount} (${inventoryCount} candy × $${perCandyRate}) at day ${currentDay}!`
      );
    }
  }, [
    currentDay,
    bonusDaysApplied,
    jokers,
    getTotalInventoryCount,
    addMoney,
    dispatch,
    showToast,
  ]);

  return {};
};