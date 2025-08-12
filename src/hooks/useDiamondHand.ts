import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { useInventory } from '../context/InventoryContext';
import { useJokers } from '../context/JokerContext';
import { useWallet } from '../context/WalletContext';
import { JokerService } from '../utils/jokerService';

export const useDiamondHand = () => {
  const { periodCount } = useGame();
  const { getTotalInventoryCount } = useInventory();
  const { jokers } = useJokers();
  const { add: addMoney } = useWallet();
  
  // Track if player sold anything this period
  const [soldThisPeriod, setSoldThisPeriod] = useState(false);
  const [lastPeriod, setLastPeriod] = useState(periodCount);

  // Reset sold tracking when period changes
  useEffect(() => {
    if (periodCount !== lastPeriod) {
      // Check Diamond Hand conditions for the previous period
      checkDiamondHandBonus();
      
      // Reset for new period
      setSoldThisPeriod(false);
      setLastPeriod(periodCount);
    }
  }, [periodCount]);

  const checkDiamondHandBonus = () => {
    // Skip the first period (period 0)
    if (lastPeriod === 0) return;

    // Check if player has Diamond Hand joker
    const diamondHandJoker = jokers.find(j => j.name.replace(' (Copy)', '') === 'Diamond Hand');
    if (!diamondHandJoker) return;

    // Check if player had inventory and didn't sell
    const currentInventory = getTotalInventoryCount();
    const hasInventory = currentInventory > 0;
    const didntSell = !soldThisPeriod;

    if (hasInventory && didntSell) {
      // Get the bonus amount from joker service
      const jokerService = JokerService.getInstance();
      const bonusAmount = jokerService.applyJokerEffects(0, 'holding_inventory_bonus', jokers, periodCount);
      
      if (bonusAmount > 0) {
        addMoney(bonusAmount);
        console.log(`💎 Diamond Hand: +$${bonusAmount} for holding inventory without selling!`);
        
        // Show notification to user
        setTimeout(() => {
          alert(`💎 Diamond Hand!\n\nYou held your inventory without selling and earned $${bonusAmount}!\n\n"Hold the line! 🚀"`);
        }, 1000); // Delay to ensure period transition is complete
      }
    }
  };

  // Function to be called when player makes a sale
  const recordSale = () => {
    setSoldThisPeriod(true);
  };

  return { recordSale };
};