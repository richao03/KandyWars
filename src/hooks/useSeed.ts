import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setSeed,
  setGameData,
  updateGameData,
  modifyCandyPrice,
  batchModifyCandyPrices,
  resetSeed,
} from '../store/slices/seedSlice';

export const useSeed = () => {
  const dispatch = useAppDispatch();
  const seedState = useAppSelector(state => state.seed);

  const setSeedAction = useCallback((seed: string | null) => {
    dispatch(setSeed(seed));
  }, [dispatch]);

  const setGameDataAction = useCallback((gameData: any) => {
    dispatch(setGameData(gameData));
  }, [dispatch]);

  const updateGameDataAction = useCallback((partialGameData: any) => {
    dispatch(updateGameData(partialGameData));
  }, [dispatch]);

  const modifyCandyPriceAction = useCallback((candyId: string, price: number, period?: number) => {
    dispatch(modifyCandyPrice({ candyId, price, period }));
  }, [dispatch]);

  const batchModifyCandyPricesAction = useCallback((updates: Array<{ candyId: string; price: number; period: number }>) => {
    dispatch(batchModifyCandyPrices(updates));
  }, [dispatch]);

  const getOriginalCandyPrice = useCallback((candyId: string, period?: number): number => {
    const candyPriceArray = seedState.gameData.candyPrices?.[candyId];
    if (Array.isArray(candyPriceArray) && period !== undefined) {
      return candyPriceArray[period] || 0;
    }
    return 0;
  }, [seedState.gameData]);

  const restoreCandyPrice = useCallback((candyName: string, period?: number) => {
    const originalPrice = getOriginalCandyPrice(candyName, period);
    modifyCandyPriceAction(candyName, originalPrice);
  }, [getOriginalCandyPrice, modifyCandyPriceAction]);

  const resetSeedAction = useCallback(() => {
    dispatch(resetSeed());
  }, [dispatch]);

  return {
    seed: seedState.seed,
    gameData: seedState.gameData,
    isLoaded: seedState.isLoaded,
    rng: null, // Would need to be implemented for seeded random
    setSeed: setSeedAction,
    setGameData: setGameDataAction,
    updateGameData: updateGameDataAction,
    modifyCandyPrice: modifyCandyPriceAction,
    batchModifyCandyPrices: batchModifyCandyPricesAction,
    getOriginalCandyPrice,
    restoreCandyPrice,
    resetSeed: resetSeedAction,
  };
};