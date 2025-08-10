import { useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { useJokers } from '../context/JokerContext';
import { useSeed } from '../context/SeedContext';

export const usePriceDoubling = () => {
  const { periodCount } = useGame();
  const { activeEffects, clearActiveEffect } = useJokers();
  const { restoreCandyPrice } = useSeed();
  const previousPeriod = useRef(periodCount);
  const modifiedPrices = useRef<{ candyType: string; period: number }[]>([]);

  // Track when prices are modified
  const trackPriceModification = (candyType: string, period: number) => {
    modifiedPrices.current.push({ candyType, period });
  };

  // Restore prices when period changes
  useEffect(() => {
    if (previousPeriod.current !== periodCount && previousPeriod.current !== -1) {
      // Period has changed, restore all modified prices from the previous period
      activeEffects
        .filter(effect => 
          effect.effect === 'double_candy_price' && 
          effect.period === previousPeriod.current &&
          effect.candyType
        )
        .forEach(effect => {
          if (effect.candyType) {
            restoreCandyPrice(effect.candyType, previousPeriod.current);
          }
          clearActiveEffect(effect.jokerId);
        });

      previousPeriod.current = periodCount;
    } else if (previousPeriod.current === -1) {
      // Initialize the ref
      previousPeriod.current = periodCount;
    }
  }, [periodCount, activeEffects, clearActiveEffect, restoreCandyPrice]);

  return { trackPriceModification };
};