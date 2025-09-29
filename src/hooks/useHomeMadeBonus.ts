import { useEffect, useState } from 'react';
import { useGame } from './useGame';
import { useInventory } from './useInventory';
import { useJokers } from './useJokers';
import { useWallet } from './useWallet';
import { JOKER_IDS, findJokerById } from '../constants/jokerIds';

export const useHomeMadeBonus = () => {
  const { day, periodCount } = useGame();
  const { getTotalInventoryCount } = useInventory();
  const { jokers } = useJokers();
  const { add: addMoney } = useWallet();

  const [lastDay, setLastDay] = useState(day);

  // Check for Home Made bonus when a new day starts (period 1 of new day)
  useEffect(() => {
    // Check if it's the start of a new day (period 1)
    const periodWithinDay = periodCount % 8;
    const isNewDayStart = periodWithinDay === 0 && day !== lastDay;

    if (isNewDayStart) {
      checkHomeMadeBonus();
      setLastDay(day);
    }
  }, [day, periodCount]);

  const checkHomeMadeBonus = () => {
    // Check if player has Home Made joker
    const homeMadeJoker = findJokerById(jokers, JOKER_IDS.HOME_MADE);
    if (!homeMadeJoker) return;

    // Get current inventory count
    const currentInventory = getTotalInventoryCount();

    if (currentInventory > 0) {
      // Calculate bonus: $10 per candy in inventory at start of new day
      const bonusAmount = currentInventory * 10;

      addMoney(bonusAmount);
      console.log(`🏠 Home Made: +$${bonusAmount} for ${currentInventory} candies at start of day ${day}!`);
    }
  };

  return {};
};