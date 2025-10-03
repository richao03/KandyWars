import { useEffect, useState } from 'react';
import { JOKER_IDS, findJokerById } from '../constants/jokerIds';
import { useAppSelector } from '../store/hooks';
import { selectComputedDroughtReliefBonus } from '../store/slices/jokerSlice';
import { useGame } from './useGame';
import { useJokers } from './useJokers';
import { useWallet } from './useWallet';

export const useDroughtRelief = () => {
  const { periodCount } = useGame();
  const { jokers } = useJokers();
  const { add: addMoney } = useWallet();
  const droughtReliefBonus = useAppSelector(selectComputedDroughtReliefBonus);

  // Track sales history for the last 3 periods
  const [salesHistory, setSalesHistory] = useState<boolean[]>([]);
  const [lastPeriod, setLastPeriod] = useState(periodCount);

  // Reset and check when period changes
  useEffect(() => {
    if (periodCount !== lastPeriod) {
      // Check Drought Relief conditions for the previous period
      checkDroughtReliefBonus();

      // Update for new period
      setLastPeriod(periodCount);
    }
  }, [periodCount]);

  const checkDroughtReliefBonus = () => {
    // Skip the first few periods (need at least 3 periods of history)
    if (lastPeriod < 3) return;

    // Check if player has The Bounceback joker (provides drought relief)
    const droughtReliefJoker = findJokerById(jokers, JOKER_IDS.THE_BOUNCEBACK);
    if (!droughtReliefJoker) return;

    // Check if the last 3 periods had no sales
    if (salesHistory.length >= 3) {
      const lastThreePeriods = salesHistory.slice(-3);
      const hadNoSalesForThreePeriods = lastThreePeriods.every(
        (hadSales) => !hadSales
      );

      if (hadNoSalesForThreePeriods) {
        // Get the bonus amount from computed effects
        const bonusAmount = droughtReliefBonus;

        if (bonusAmount > 0) {
          addMoney(bonusAmount);
          console.log(
            `🌧️ Drought Relief: +$${bonusAmount} for making no sales for 3 consecutive periods!`
          );

          // Reset the sales history after awarding bonus to prevent multiple awards
          setSalesHistory([]);
        }
      }
    }
  };

  // Function to be called when player makes a sale
  const recordSale = () => {
    setSalesHistory((prev) => {
      const newHistory = [...prev];

      // If this is a new period, add a new entry
      if (newHistory.length === 0 || newHistory.length < periodCount + 1) {
        // Fill in any missing periods with false (no sales)
        while (newHistory.length < periodCount) {
          newHistory.push(false);
        }
        // Add current period with true (has sales)
        newHistory.push(true);
      } else {
        // Update current period to true (has sales)
        newHistory[periodCount] = true;
      }

      // Keep only the last 5 periods to avoid memory bloat
      return newHistory.slice(-5);
    });
  };

  // Function to mark end of period with no sales
  const markPeriodWithoutSales = () => {
    setSalesHistory((prev) => {
      const newHistory = [...prev];

      // Fill in any missing periods and mark current period as no sales
      while (newHistory.length < periodCount + 1) {
        newHistory.push(false);
      }

      // Ensure current period is marked as no sales
      newHistory[periodCount] = false;

      // Keep only the last 5 periods
      return newHistory.slice(-5);
    });
  };

  // Mark periods without sales when period changes
  useEffect(() => {
    if (periodCount > lastPeriod) {
      // Check if we need to mark the previous period as having no sales
      setSalesHistory((prev) => {
        const newHistory = [...prev];

        // If the previous period wasn't recorded, mark it as no sales
        if (newHistory.length <= lastPeriod) {
          while (newHistory.length <= lastPeriod) {
            newHistory.push(false);
          }
        }

        return newHistory.slice(-5);
      });
    }
  }, [periodCount, lastPeriod]);

  return { recordSale, markPeriodWithoutSales };
};
