import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useGame } from './useGame';
import { useJokers } from './useJokers';
import { useSeed } from './useSeed';
import {
  setPreviousPeriod,
  addModifiedPrice,
  clearModifiedPricesForPeriod,
  selectPreviousPeriod,
  selectModifiedPrices,
} from '../store/slices/priceDoublingSlice';

export const usePriceDoubling = () => {
  const dispatch = useAppDispatch();
  const { periodCount } = useGame();
  const { activeEffects, clearActiveEffect } = useJokers();
  const { restoreCandyPrice } = useSeed();
  const previousPeriod = useAppSelector(selectPreviousPeriod);
  const modifiedPrices = useAppSelector(selectModifiedPrices);

  // Track when prices are modified
  const trackPriceModification = useCallback((candyType: string, period: number, originalPrice: number, modifiedPrice: number) => {
    dispatch(addModifiedPrice({ candyType, period, originalPrice, modifiedPrice }));
  }, [dispatch]);

  // Restore prices when period changes
  useEffect(() => {
    if (previousPeriod !== periodCount && previousPeriod !== -1) {
      // Period has changed, restore all modified prices from the previous period
      activeEffects
        .filter(effect =>
          effect.effect === 'double_candy_price' &&
          effect.period === previousPeriod &&
          effect.candyType
        )
        .forEach(effect => {
          if (effect.candyType) {
            restoreCandyPrice(effect.candyType, previousPeriod);
          }
          clearActiveEffect(effect.jokerId);
        });

      // Clear modified prices for the previous period
      dispatch(clearModifiedPricesForPeriod(previousPeriod));

      // Update the previous period
      dispatch(setPreviousPeriod(periodCount));
    } else if (previousPeriod === -1) {
      // Initialize the previous period
      dispatch(setPreviousPeriod(periodCount));
    }
  }, [periodCount, activeEffects, clearActiveEffect, restoreCandyPrice, previousPeriod, dispatch]);

  return { trackPriceModification };
};