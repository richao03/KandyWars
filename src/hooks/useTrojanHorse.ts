import { useEffect, useState } from 'react';
import { useGame } from './useGame';
import { useJokers } from './useJokers';
import { useSeed } from './useSeed';
import { JOKER_IDS, findJokerById } from '../constants/jokerIds';

export const useTrojanHorse = () => {
  const { day, periodCount } = useGame();
  const { jokers } = useJokers();
  const { gameData, modifyCandyPrice } = useSeed();

  const [lastPeriod, setLastPeriod] = useState(periodCount);
  const [lastDay, setLastDay] = useState(day);

  // Apply Trojan Horse price increases when period changes
  useEffect(() => {
    // Check if player has Trojan Horse joker
    const trojanHorseJoker = findJokerById(jokers, JOKER_IDS.TROJAN_HORSE);
    if (!trojanHorseJoker) return;

    // Check if period changed
    if (periodCount !== lastPeriod) {
      // If it's a new day, don't apply increase (prices reset daily)
      if (day !== lastDay) {
        console.log(`🐎 Trojan Horse: Prices reset for new day ${day}`);
        setLastDay(day);
      } else {
        // Apply $10 increase to all candy prices for this period
        applyTrojanHorseIncrease();
      }
      setLastPeriod(periodCount);
    }
  }, [periodCount, day, jokers]);

  const applyTrojanHorseIncrease = () => {
    // Get all candy types from game data
    const candyTypes = Object.keys(gameData.candyPrices || {});

    if (candyTypes.length === 0) {
      // If no candies exist yet, create the CANDY_TYPES list manually
      const CANDY_TYPES = ['Snickers', 'M&Ms', 'Skittles', 'Warheads', 'Sour Patch Kids', 'Bubble Gum', 'Jaw Breaker'];

      for (const candyType of CANDY_TYPES) {
        const currentPrice = gameData.candyPrices[candyType]?.[periodCount] || 0;
        const newPrice = currentPrice + 10;
        modifyCandyPrice(candyType, newPrice, periodCount);
        console.log(`🐎 Trojan Horse: ${candyType} price increased by $10 (${currentPrice.toFixed(2)} → ${newPrice.toFixed(2)})`);
      }
    } else {
      for (const candyType of candyTypes) {
        const currentPrice = gameData.candyPrices[candyType]?.[periodCount] || 0;
        const newPrice = currentPrice + 10;
        modifyCandyPrice(candyType, newPrice, periodCount);
        console.log(`🐎 Trojan Horse: ${candyType} price increased by $10 (${currentPrice.toFixed(2)} → ${newPrice.toFixed(2)})`);
      }
    }
  };

  return {};
};