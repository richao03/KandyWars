import { useEffect, useRef } from 'react';
import { useSeed } from './useSeed';
import { useGame } from './useGame';
import { CANDY_REGISTRY } from '../constants/candyRegistry';

/**
 * Singleton hook that updates candy prices in Redux when period/location changes.
 * Only runs once per period regardless of how many components render.
 */
export const usePriceUpdater = () => {
  const { gameData, batchModifyCandyPrices } = useSeed();
  const { periodCount, currentLocation } = useGame();
  const lastProcessedRef = useRef<{ period: number; location: string }>({
    period: -1,
    location: '',
  });

  useEffect(() => {
    // Skip if we've already processed this period + location combination
    if (
      lastProcessedRef.current.period === periodCount &&
      lastProcessedRef.current.location === currentLocation
    ) {
      return;
    }

    lastProcessedRef.current = { period: periodCount, location: currentLocation };

    // Collect all price updates
    const priceUpdates: Array<{ candyId: string; price: number; period: number }> = [];

    CANDY_REGISTRY.forEach((candy) => {
      if (gameData.candyPrices[candy.name]?.[periodCount]) {
        // Calculate the same price as in the candies state update
        const seed = candy.name.charCodeAt(0) + periodCount;
        const random = Math.sin(seed) * 10000;
        const normalizedRandom = random - Math.floor(random);
        const trueBasePrice =
          candy.baseMin + normalizedRandom * (candy.baseMax - candy.baseMin);

        // Check for current location-specific events with price overrides or multipliers
        const currentEvent = gameData.periodEvents.find(
          (e: any) =>
            e.period === periodCount + 1 &&
            (!e.location || e.location === currentLocation) &&
            e.candy === candy.name &&
            (e.priceOverride !== undefined || e.multiplier !== undefined)
        );

        let finalCost =
          gameData.candyPrices[candy.name]?.[periodCount] || trueBasePrice;

        if (currentEvent?.priceOverride !== undefined) {
          finalCost = currentEvent.priceOverride;
        } else if (currentEvent?.multiplier !== undefined) {
          const calculatedPrice = trueBasePrice * currentEvent.multiplier;

          // Apply caps based on event type
          if (currentEvent.effect === 'PRICE_SPIKE') {
            finalCost = Math.min(calculatedPrice, 100);
          } else if (currentEvent.effect === 'PRICE_DROP') {
            finalCost = Math.max(calculatedPrice, 0.01);
          } else {
            finalCost = calculatedPrice;
          }
        }

        priceUpdates.push({
          candyId: candy.name,
          price: finalCost,
          period: periodCount,
        });
      }
    });

    // Dispatch all price updates at once
    if (priceUpdates.length > 0) {
      batchModifyCandyPrices(priceUpdates);
    }
  }, [periodCount, currentLocation, gameData.periodEvents, gameData.candyPrices, batchModifyCandyPrices]);
};
