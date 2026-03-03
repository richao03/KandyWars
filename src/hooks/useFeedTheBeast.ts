import { useCallback, useEffect, useState } from 'react';
import { JOKER_IDS, findJokerById } from '../constants/jokerIds';
import { getJokerEffectsAtLevel } from '../utils/jokerEffectEngine';
import { useGame } from './useGame';
import { useInventory } from './useInventory';
import { useJokers } from './useJokers';
import { useWallet } from './useWallet';

export const useFeedTheBeast = () => {
  const { periodCount } = useGame();
  const { getTotalInventoryCount, getInventoryLimit } = useInventory();
  const { jokers } = useJokers();
  const { add: addMoney } = useWallet();

  const [lastPeriod, setLastPeriod] = useState(periodCount);

  // Check for Feed the Beast bonus when period changes
  useEffect(() => {
    if (periodCount !== lastPeriod && periodCount > 0) {
      checkFeedTheBeastBonus();
      setLastPeriod(periodCount);
    }
  }, [periodCount]); // Only trigger when period changes

  const checkFeedTheBeastBonus = useCallback(() => {
    const feedTheBeastJoker = findJokerById(jokers, JOKER_IDS.FEED_THE_BEAST);
    if (!feedTheBeastJoker) return;

    const currentInventory = getTotalInventoryCount();
    const inventoryLimit = getInventoryLimit();

    // Only award bonus when inventory is >= 50% full
    if (inventoryLimit > 0 && currentInventory >= inventoryLimit * 0.5) {
      const level = (feedTheBeastJoker as any).level ?? 1;
      const effects = getJokerEffectsAtLevel(JOKER_IDS.FEED_THE_BEAST, level);
      const bonusEffect = effects.find(e => e.target === 'inventory_fullness_bonus');
      const bonusAmount = bonusEffect?.amount ?? 300;

      addMoney(bonusAmount);
      if (__DEV__) {
        console.log(
          `🍖 Feed the Beast: +$${bonusAmount} for ${currentInventory}/${inventoryLimit} inventory (${Math.round(currentInventory / inventoryLimit * 100)}% full)!`
        );
      }
    }
  }, [jokers, getTotalInventoryCount, getInventoryLimit, addMoney]);
};
