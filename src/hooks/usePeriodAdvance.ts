import { useRouter } from 'expo-router';
import { startTransition, useCallback } from 'react';
import { JOKER_IDS } from '../constants/jokerIds';
import { useFlavorText } from '../context/FlavorTextContext';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { resetDailyStats } from '../store/slices/candySalesSlice';
import {
  getPeriodsPerDay,
  selectShowLunchMinigames,
  setShowLunchMinigames as setShowLunchMinigamesAction,
} from '../store/slices/gameSlice';
import {
  clearNotEnoughCandyMessage,
  setNotEnoughCandyMessage,
} from '../store/slices/hustleSlice';
import {
  incrementMaxInventory,
  meltExpiredCandy,
} from '../store/slices/inventorySlice';
import { incrementStat } from '../store/slices/jokerStatsSlice';
import { advanceTutorial, selectTutorialStep } from '../store/slices/tutorialSlice';
import { Location } from '../../app/components/LocationModal';
import { useGame } from './useGame';
import { useHustle } from './useHustle';
import { useInventory } from './useInventory';
import { useJokers } from './useJokers';
import { useSeed } from './useSeed';

type MeltedCandy = { name: string; quantity: number; value: number };

interface UsePeriodAdvanceArgs {
  setLocationModalVisible: (visible: boolean) => void;
  setLocalPricesUpdating: (updating: boolean) => void;
  setMeltedCandies: (candies: MeltedCandy[]) => void;
  setMeltModalVisible: (visible: boolean) => void;
  setShowHustleJokerSelection: (visible: boolean) => void;
}

/**
 * Orchestrates advancing to the next period after location selection.
 * Handles Deep Freeze melt check, period increment, day-boundary resets,
 * Hallway Hustle matching, Trade Routes inventory bonus, tutorial step 5,
 * and concurrent-rendering (startTransition) guard. Routes to merchant-shop
 * when 'the connect' is picked.
 */
export const usePeriodAdvance = ({
  setLocationModalVisible,
  setLocalPricesUpdating,
  setMeltedCandies,
  setMeltModalVisible,
  setShowHustleJokerSelection,
}: UsePeriodAdvanceArgs) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { periodCount, day, incrementPeriod } = useGame();
  const periodsPerDay = useAppSelector(getPeriodsPerDay);
  const showLunchMinigames = useAppSelector(selectShowLunchMinigames);
  const tutorialStep = useAppSelector(selectTutorialStep);
  const { setEvent } = useFlavorText();
  const { jokers } = useJokers();
  const { inventory, removeFromInventory } = useInventory();
  const { getHustleForLocation, completeHustle: completeHustleAction } = useHustle();
  const { gameData } = useSeed();

  const handleLocationSelect = useCallback(
    (location: Location) => {
      if (location === 'the connect') {
        setLocationModalVisible(false);
        router.push('/merchant-shop');
        return;
      }

      startTransition(() => {
        setLocationModalVisible(false);
        setLocalPricesUpdating(true);

        const tradeRoutes = jokers.find((joker: any) => joker.id === 39);
        if (tradeRoutes) {
          const level = (tradeRoutes as any).level ?? 1;
          // +2/+3/+4 per level — matches the Trade Routes effect definition in jokerEffectEngine.
          const slotsPerPeriod = level === 3 ? 4 : level === 2 ? 3 : 2;
          dispatch(incrementMaxInventory(slotsPerPeriod));
          // Track periods elapsed so getLiveJokerValueText can show the
          // accumulated bonus, and so sellJoker can revert it cleanly.
          dispatch(incrementStat({ stat: 'tradeRoutesPeriods' }));
        }

        if (showLunchMinigames) {
          dispatch(setShowLunchMinigamesAction(false));
        }

        const oldDay = day;

        incrementPeriod(location);
        setEvent('PERIOD_CHANGE');

        const hasDeepFreeze = jokers.some((joker: any) => joker.id === JOKER_IDS.DEEP_FREEZE);
        if (!hasDeepFreeze) {
          // Hot Potato shortens the melt window from 5 → 3 periods.
          const hasHotPotato = jokers.some((joker: any) => joker.id === JOKER_IDS.HOT_POTATO);
          const MELT_WINDOW = hasHotPotato ? 3 : 5;
          const newPeriod = periodCount + 1;
          const melted = inventory
            .filter((candy) => {
              if (candy.purchasedAt === undefined || !candy.quantity) return false;
              return (newPeriod - candy.purchasedAt) >= MELT_WINDOW;
            })
            .map((candy) => ({
              name: candy.name,
              quantity: candy.quantity || 0,
              value: (gameData.candyPrices[candy.name]?.[newPeriod] || candy.price || 0) * (candy.quantity || 0),
            }));

          if (melted.length > 0) {
            setMeltedCandies(melted);
            dispatch(meltExpiredCandy({ currentPeriod: newPeriod, meltWindow: MELT_WINDOW }));
            dispatch(incrementStat({ stat: 'survivorCandiesMelted', amount: melted.length }));
            setMeltModalVisible(true);
          }
        }

        if (tutorialStep === 5) {
          dispatch(advanceTutorial());
        }

        const newPeriodCount = periodCount + 1;
        const newDay = Math.floor((newPeriodCount - 1) / periodsPerDay) + 1;
        if (newDay > oldDay) {
          dispatch(resetDailyStats());
          dispatch(incrementStat({ stat: 'compoundInterestDays' }));
        }

        const newPeriodInDay = (newPeriodCount % periodsPerDay) + 1;
        const matchingHustle = getHustleForLocation(location, newPeriodInDay);
        if (matchingHustle) {
          const candyInInventory = inventory.find(
            (item) => item.name === matchingHustle.candyName || item.id === matchingHustle.candyName
          );
          const ownedQty = candyInInventory?.quantity ?? 0;

          if (ownedQty >= matchingHustle.quantity) {
            removeFromInventory(matchingHustle.candyName, matchingHustle.quantity);
            completeHustleAction(matchingHustle.id);
            if (__DEV__) console.log(`🤝 HUSTLE: Completed! Took ${matchingHustle.quantity} ${matchingHustle.candyName}`);
            setTimeout(() => {
              setShowHustleJokerSelection(true);
            }, 500);
          } else {
            dispatch(
              setNotEnoughCandyMessage(
                `A kid here wants ${matchingHustle.quantity} ${matchingHustle.candyName}, but you only have ${ownedQty}...`
              )
            );
            if (__DEV__) console.log(`🤝 HUSTLE: Not enough candy. Need ${matchingHustle.quantity} ${matchingHustle.candyName}, have ${ownedQty}`);
            setTimeout(() => dispatch(clearNotEnoughCandyMessage()), 4000);
          }
        }

        setTimeout(() => {
          setLocalPricesUpdating(false);
        }, 400);
      });
    },
    [
      jokers,
      dispatch,
      incrementPeriod,
      setEvent,
      periodCount,
      showLunchMinigames,
      day,
      periodsPerDay,
      tutorialStep,
      getHustleForLocation,
      inventory,
      removeFromInventory,
      completeHustleAction,
      gameData,
      router,
      setLocationModalVisible,
      setLocalPricesUpdating,
      setMeltedCandies,
      setMeltModalVisible,
      setShowHustleJokerSelection,
    ]
  );

  return { handleLocationSelect };
};
