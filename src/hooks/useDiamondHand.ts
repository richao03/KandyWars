import { useEffect, useState, useCallback } from 'react';
import { useGame } from './useGame';
import { useInventory } from './useInventory';
import { useJokers } from './useJokers';
import { useWallet } from './useWallet';
import { JokerService } from '../utils/jokerService';
import { JOKER_IDS, findJokerById } from '../constants/jokerIds';

export const useDiamondHand = () => {
  const { periodCount } = useGame();
  const { getTotalInventoryCount } = useInventory();
  const { jokers } = useJokers();
  const { add: addMoney } = useWallet();
  
  const [lastPeriod, setLastPeriod] = useState(periodCount);

  // Check for Diamond Hand bonus when period changes
  useEffect(() => {
    if (periodCount !== lastPeriod && periodCount > 0) {
      checkDiamondHandBonus();
      setLastPeriod(periodCount);
    }
  }, [periodCount]); // Only trigger when period changes

  const checkDiamondHandBonus = useCallback(() => {
    // Check if player has Diamond Hand joker
    const diamondHandJoker = findJokerById(jokers, JOKER_IDS.DIAMOND_HAND);
    if (!diamondHandJoker) return;

    // Get current inventory count
    const currentInventory = getTotalInventoryCount();
    
    if (currentInventory > 0) {
      // Calculate bonus: $50 per candy in inventory
      const bonusAmount = currentInventory * 50;
      
      addMoney(bonusAmount);
      console.log(`💎 Diamond Hand: +$${bonusAmount} for ${currentInventory} candies at period start!`);
    }
  }, [jokers, getTotalInventoryCount, addMoney]);

  // Legacy function for backwards compatibility (no longer used)
  const recordSale = () => {
    // No longer needed since we're not tracking sales
  };

  return { recordSale };
};