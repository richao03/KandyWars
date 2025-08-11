import { useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { useInventory } from '../context/InventoryContext';
import { useJokers } from '../context/JokerContext';
import { useWallet } from '../context/WalletContext';
import { JokerService } from '../utils/jokerService';

export const useEmptyInventoryBonus = () => {
  const { periodCount } = useGame();
  const { getTotalInventoryCount } = useInventory();
  const { jokers } = useJokers();
  const { add: addMoney } = useWallet();

  useEffect(() => {
    // Skip the first period (period 0)
    if (periodCount === 0) return;

    // Check if player has Embrace the Grind joker
    const embraceGrindJoker = jokers.find(j => j.name === 'Embrace the Grind');
    if (!embraceGrindJoker) return;

    // Check if inventory is empty
    const totalInventory = getTotalInventoryCount();
    if (totalInventory === 0) {
      // Get the bonus amount from joker service
      const jokerService = JokerService.getInstance();
      const bonusAmount = jokerService.applyJokerEffects(0, 'empty_inventory_bonus', jokers, periodCount);
      
      if (bonusAmount > 0) {
        addMoney(bonusAmount);
        console.log(`💪 Embrace the Grind: +$${bonusAmount} for ending period with empty inventory!`);
        
        // Show notification to user
        setTimeout(() => {
          alert(`💪 Embrace the Grind!\n\nYou ended the period with 0 inventory and earned $${bonusAmount}!\n\n"No pain, no gain!"`);
        }, 1000); // Delay to ensure period transition is complete
      }
    }
  }, [periodCount, jokers]); // Trigger when period changes
};