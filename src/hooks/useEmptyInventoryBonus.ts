import { useEffect } from 'react';
import { useGame } from './useGame';
import { useInventory } from './useInventory';
import { useJokers } from './useJokers';
import { useWallet } from './useWallet';
import { useAppSelector } from '../store/hooks';
import { selectComputedEmptyInventoryBonus } from '../store/slices/jokerSlice';
import { JOKER_IDS, findJokerById } from '../constants/jokerIds';

export const useEmptyInventoryBonus = () => {
  const { periodCount } = useGame();
  const { getTotalInventoryCount } = useInventory();
  const { jokers } = useJokers();
  const { add: addMoney } = useWallet();
  const emptyInventoryBonus = useAppSelector(selectComputedEmptyInventoryBonus);

  useEffect(() => {
    // Skip the first period (period 0)
    if (periodCount === 0) return;

    // Check if player has Embrace the Grind joker
    const embraceGrindJoker = findJokerById(jokers, JOKER_IDS.EMBRACE_THE_GRIND);
    if (!embraceGrindJoker) return;

    // Check if inventory is empty
    const totalInventory = getTotalInventoryCount();
    if (totalInventory === 0) {
      // Get the bonus amount from computed effects
      const bonusAmount = emptyInventoryBonus;

      if (bonusAmount > 0) {
        addMoney(bonusAmount);
        console.log(`💪 Embrace the Grind: +$${bonusAmount} for ending period with empty inventory!`);
      }
    }
  }, [periodCount, jokers]); // Trigger when period changes
};