import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import seedrandom from 'seedrandom';
import { CANDY_REGISTRY } from '../constants/candyRegistry';
import { JOKER_IDS } from '../constants/jokerIds';
import { scoreboardService } from '../services/firebase';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getPeriodsPerDay, selectBulkEmpireStacks } from '../store/slices/gameSlice';
import { incrementStat, selectJokerStats } from '../store/slices/jokerStatsSlice';
import { consumeEffect, selectActiveEffects } from '../store/slices/merchantSlice';
import {
  clearActiveQuest,
  completeQuest,
  selectActiveQuest,
  setPendingJokerChoices,
} from '../store/slices/questSlice';
import { updateQuestProgress } from '../store/slices/shopkeeperSlice';
import { incrementSalesAtLocation } from '../store/slices/userObjectSlice';
import { JokerService } from '../utils/jokerService';
import { MerchantUtils } from '../utils/merchantUtils';
import { STANDARDIZED_JOKERS } from '../utils/jokerEffectEngine';
import { calculateSaleTotal } from '../utils/saleCalculations';
import { SoundEffects } from '../utils/soundEffects';
import { useCandySales } from './useCandySales';
import { useDailyStats } from './useDailyStats';
import { useHallPass } from './useHallPass';
import { useInventory } from './useInventory';
import { useJokers } from './useJokers';
import { useWallet } from './useWallet';

type CandyForMarket = {
  name: string;
  cost: number;
  quantityOwned: number;
  averagePrice: number | null;
  [key: string]: any;
};

interface UseTransactionHandlerInput<T extends CandyForMarket> {
  candies: T[];
  setCandies: React.Dispatch<React.SetStateAction<T[]>>;
  closeModal: () => void;
  setShowQuestJokerSelection: (v: boolean) => void;
}

/**
 * Orchestrates the buy/sell transaction flow for the market screen.
 * Extracted from app/(tabs)/market.tsx to keep cross-slice side effects
 * out of the UI layer.
 */
export const useTransactionHandler = <T extends CandyForMarket>({
  candies,
  setCandies,
  closeModal,
  setShowQuestJokerSelection,
}: UseTransactionHandlerInput<T>) => {
  const dispatch = useAppDispatch();

  const { balance, spend, add } = useWallet();
  const {
    inventory,
    addToInventory,
    removeFromInventory,
    getTotalInventoryCount,
    getInventoryLimit,
  } = useInventory();
  const { jokers, activeEffects, clearActiveEffect, removeJoker } = useJokers();
  const { selectedPassIds } = useHallPass();
  const { addSale, resetSales, consecutivePeriodSales, totalCandiesSold, hasEarlySaleToday } =
    useCandySales();
  const { addProfit, addSpent, addCandySold, recordSale: recordDailyStatsSale } = useDailyStats();

  const hallPassModifiers = useAppSelector((state) => state.hallPassModifiers);
  const merchantEffects = useAppSelector(selectActiveEffects);
  const jokerStats = useAppSelector(selectJokerStats);
  const activeQuest = useAppSelector(selectActiveQuest);
  const bulkEmpireStacks = useAppSelector(selectBulkEmpireStacks);
  const locationHistory = useAppSelector((state) => state.game.locationHistory);
  const currentLocation = useAppSelector((state) => state.game.currentLocation);
  const periodCount = useAppSelector((state) => state.game.periodCount);
  const periodsPerDay = useAppSelector(getPeriodsPerDay);
  const candySales = useAppSelector((state) => state.candySales.sales);

  const jokerService = useMemo(() => JokerService.getInstance(), []);

  const candiesRef = useRef(candies);
  const balanceRef = useRef(balance);
  const inventoryRef = useRef(inventory);
  const jokersRef = useRef(jokers);
  const activeEffectsRef = useRef(activeEffects);
  const merchantEffectsRef = useRef(merchantEffects);
  const hallPassModifiersRef = useRef(hallPassModifiers);
  const hasEarlySaleTodayRef = useRef(hasEarlySaleToday);
  const periodsPerDayRef = useRef(periodsPerDay);
  const periodCountRef = useRef(periodCount);
  const totalCandiesSoldRef = useRef(totalCandiesSold);
  const locationHistoryRef = useRef(locationHistory);
  const bulkEmpireStacksRef = useRef(bulkEmpireStacks);
  const activeQuestRef = useRef(activeQuest);
  const jokerStatsRef = useRef(jokerStats);
  const candySalesRef = useRef(candySales);
  const selectedPassIdsRef = useRef(selectedPassIds);
  const currentLocationRef = useRef(currentLocation);

  useEffect(() => {
    candiesRef.current = candies;
    balanceRef.current = balance;
    inventoryRef.current = inventory;
    jokersRef.current = jokers;
    activeEffectsRef.current = activeEffects;
    merchantEffectsRef.current = merchantEffects;
    hallPassModifiersRef.current = hallPassModifiers;
    hasEarlySaleTodayRef.current = hasEarlySaleToday;
    periodsPerDayRef.current = periodsPerDay;
    periodCountRef.current = periodCount;
    totalCandiesSoldRef.current = totalCandiesSold;
    locationHistoryRef.current = locationHistory;
    bulkEmpireStacksRef.current = bulkEmpireStacks;
    activeQuestRef.current = activeQuest;
    jokerStatsRef.current = jokerStats;
    candySalesRef.current = candySales;
    selectedPassIdsRef.current = selectedPassIds;
    currentLocationRef.current = currentLocation;
  }, [candies, balance, inventory, jokers, activeEffects, merchantEffects, hallPassModifiers, hasEarlySaleToday, periodsPerDay, periodCount, totalCandiesSold, locationHistory, bulkEmpireStacks, activeQuest, jokerStats, candySales, selectedPassIds, currentLocation]);

  const handleTransaction = useCallback(
    (candyIndex: number, quantity: number, mode: 'buy' | 'sell') => {
      if (candyIndex === null || candyIndex === undefined) return;
      const candy = candiesRef.current[candyIndex];
      if (!candy) return;

      if (mode === 'buy') {
        // Check for Time Zone Arbitrage joker effect (morning purchase discount)
        const currentPeriodCount = periodCountRef.current;
        const periodWithinDay = currentPeriodCount % 8;
        const isMorning = periodWithinDay <= 2; // Periods 0, 1, 2 are "morning"
        const currentJokers = jokersRef.current;
        const hasTimeZoneArbitrage = currentJokers.some(
          (joker: any) => joker.id == 42 || joker.id === '42'
        );

        let purchasePrice = candy.cost;
        if (hasTimeZoneArbitrage && isMorning) {
          purchasePrice = candy.cost * 0.9;
        }

        const totalCost = purchasePrice * quantity;
        if (balanceRef.current < totalCost) {
          return;
        }

        // Try to add to inventory first - this will check inventory limits
        const inventorySuccess = addToInventory(
          candy.name,
          quantity,
          purchasePrice,
          currentPeriodCount // Track when candy was purchased
        );
        if (!inventorySuccess) {
          // Inventory is full, transaction fails
          return;
        }

        spend(totalCost);
        addSpent(totalCost); // Track daily spending

        // Hoarder: track when inventory hits max capacity
        if (getTotalInventoryCount() + quantity >= getInventoryLimit()) {
          dispatch(incrementStat({ stat: 'hoarderMaxHits' }));
        }

        // Reset consecutive sales tracking when buying
        resetSales();

        // Pure state update — no side effects
        const newQty = candy.quantityOwned + quantity;
        const newAvg =
          candy.averagePrice === null
            ? purchasePrice
            : (candy.averagePrice * candy.quantityOwned +
                purchasePrice * quantity) /
              newQty;

        setCandies((prev) =>
          prev.map((c, i) =>
            i !== candyIndex
              ? c
              : { ...c, quantityOwned: newQty, averagePrice: newAvg }
          )
        );
      } else {
        // === SELLING LOGIC ===
        const currentPeriodCount = periodCountRef.current;
        const currentJokers = jokersRef.current;
        const currentActiveEffects = activeEffectsRef.current;
        const currentInventory = inventoryRef.current;
        const currentHallPassModifiers = hallPassModifiersRef.current;
        const currentMerchantEffects = merchantEffectsRef.current;
        const currentHasEarlySaleToday = hasEarlySaleTodayRef.current;
        const currentPeriodsPerDay = periodsPerDayRef.current;

        // === HANDLE ONE-TIME JOKERS (with side effects) ===
        let oneTimeMultiplier = 1;
        const bonusDetails: Array<{
          emoji: string;
          name: string;
          multiplier: number;
          flatBonus?: number;
        }> = [];

        // 1. Check for one-time sell multiplier jokers (Persuasion, etc) from Redux state
        const sellMultiplierInfo = jokerService.hasOneTimeSellMultiplier(
          currentJokers,
          currentPeriodCount,
          currentActiveEffects
        );
        if (sellMultiplierInfo.hasEffect && sellMultiplierInfo.multiplier) {
          oneTimeMultiplier *= sellMultiplierInfo.multiplier;
          bonusDetails.push({
            emoji: sellMultiplierInfo.jokerEmoji || '🗣️',
            name: sellMultiplierInfo.jokerName,
            multiplier: sellMultiplierInfo.multiplier,
          });

          if (sellMultiplierInfo.jokerId) {
            clearActiveEffect(sellMultiplierInfo.jokerId);
          }
        }

        // Consume Influencer Shoutout if active (before calculation)
        if (MerchantUtils.hasInfluencerShoutout(currentMerchantEffects)) {
          dispatch(consumeEffect({ itemId: 'influencer_shoutout' }));
        }

        // === CALCULATE SALE USING SHARED FUNCTION ===
        const inventoryItem = currentInventory.find(
          (item) => item.name === candy.name
        );
        const purchasePrice = inventoryItem?.price ?? candy.cost;

        // Compute dynamic sale params from refs
        const currentPeriodsPerDayVal = currentPeriodsPerDay;
        const currentDay = Math.max(1, Math.floor(currentPeriodCount / currentPeriodsPerDayVal) + 1);
        const currentPeriodInDay = Math.max(1, (currentPeriodCount % currentPeriodsPerDayVal) + 1);
        const currentInventoryCount = getTotalInventoryCount();
        const dayStartPeriod = Math.floor(currentPeriodCount / currentPeriodsPerDayVal) * currentPeriodsPerDayVal;
        const todayLocations = new Set(
          (locationHistoryRef.current || [])
            .filter((h: any) => h.period >= dayStartPeriod)
            .map((h: any) => h.location)
        );

        // Compute unique candy types sold this period (for Diversifier)
        const salesThisPeriod = candySalesRef.current.filter(
          (s: any) => s.period === currentPeriodCount
        );
        const typesSoldThisPeriod = new Set(salesThisPeriod.map((s: any) => s.candyName));
        typesSoldThisPeriod.add(candy.name); // include current sale
        const uniqueTypesSoldThisPeriod = typesSoldThisPeriod.size;

        if (__DEV__) {
          const hasDiversifier = currentJokers.some((j: any) => {
            const jId = typeof j.id === 'string' ? parseInt(j.id) : j.id;
            return jId === JOKER_IDS.DIVERSIFIER;
          });
          if (hasDiversifier) {
            console.log('🌈 DIVERSIFIER DEBUG:', {
              currentPeriodCount,
              sellingCandy: candy.name,
              salesThisPeriodCount: salesThisPeriod.length,
              salesThisPeriodCandies: salesThisPeriod.map((s: any) => s.candyName),
              typesSoldSet: Array.from(typesSoldThisPeriod),
              uniqueTypesSoldThisPeriod,
              threshold: 3,
              willTrigger: uniqueTypesSoldThisPeriod >= 3,
              allSalesInState: candySalesRef.current.map((s: any) => ({ candy: s.candyName, period: s.period })),
            });
          }
        }

        const saleResult = calculateSaleTotal({
          candyName: candy.name,
          basePrice: candy.cost,
          purchasePrice,
          quantity,
          jokers: currentJokers,
          periodCount: currentPeriodCount,
          inventoryLimit: getInventoryLimit(),
          activeEffects: currentActiveEffects,
          hallPassModifiers: currentHallPassModifiers,
          merchantEffects: currentMerchantEffects,
          consecutivePeriodSales: consecutivePeriodSales(),
          totalCandiesSold: totalCandiesSoldRef.current || 0,
          currentCash: balanceRef.current,
          hasEarlySaleToday: currentHasEarlySaleToday,
          initialMultiplier: oneTimeMultiplier,
          inventoryCount: currentInventoryCount,
          day: currentDay,
          uniqueLocationsToday: todayLocations.size,
          period: currentPeriodInDay,
          periodsPerDay: currentPeriodsPerDayVal,
          bulkEmpireStacks: bulkEmpireStacksRef.current,
          inventory: currentInventory,
          uniqueTypesSoldThisPeriod,
          clearanceSaleStacks: jokerStatsRef.current.clearanceSaleLosses,
          compoundInterestDays: jokerStatsRef.current.compoundInterestDays,
          reputationTypesSold: jokerStatsRef.current.reputationTypesSold,
          streetSmartsEventsSurvived: jokerStatsRef.current.streetSmartsEventsSurvived,
          hoarderMaxHits: jokerStatsRef.current.hoarderMaxHits,
          pennyWiseStashes: jokerStatsRef.current.pennyWiseStashes,
          survivorCandiesMelted: jokerStatsRef.current.survivorCandiesMelted,
          selectedPassIds: selectedPassIdsRef.current,
          currentLocation: currentLocationRef.current,
          // Class Clown: previous period's location for the location-change boost.
          // locationHistory is append-only per period; the last entry is current, second-to-last is prior.
          previousLocation: (() => {
            const hist = locationHistoryRef.current || [];
            if (hist.length < 2) return '';
            return hist[hist.length - 2]?.location ?? '';
          })(),
        });

        // Merge bonus breakdown from one-time jokers
        bonusDetails.push(...saleResult.bonusBreakdown);

        const {
          totalGain,
          profitPerUnit,
          totalProfit,
          purchaseValue,
          hallPassBonus,
          jokerMultiplier,
          vacuumSealerPenalty,
        } = saleResult;

        const finalProfit = totalGain - purchaseValue;

        // All dispatches in the flat function body — React batches these
        add(totalGain);
        addProfit(finalProfit); // Track daily profit (profit only, not purchase value)
        addCandySold(quantity); // Track daily candy sales
        recordDailyStatsSale(candy.name, quantity, totalGain, currentPeriodCount);

        // Triple Threat (ID 18) — no daily sales tracking needed (handled in saleCalculations)

        // Track sale for period-based hall pass unlocks (Time Crunch, Final Exam)
        // IMPORTANT: Pass finalProfit (profit after all bonuses/penalties) not revenue for accurate tracking
        addSale({
          candyId: candy.name,
          candyName: candy.name,
          quantity: quantity,
          price: candy.cost,
          total: finalProfit, // ✅ Pass PROFIT (after all bonuses and penalties), not revenue
          timestamp: Date.now(),
          period: currentPeriodCount,
          periodsPerDay: currentPeriodsPerDay,
        });

        // Track Clearance Sale (loss sale counter)
        if (finalProfit < 0) {
          dispatch(incrementStat({ stat: 'clearanceSaleLosses' }));
        }

        // Reputation — increment when this is the first time the player has sold THIS candy.
        // Check against the pre-sale history ref (addSale ran earlier this call, but only updates
        // the Redux slice on the next render — the ref reflects the pre-sale state, which is what we want).
        const alreadySoldThisCandy = candySalesRef.current.some(
          (s: any) => s.candyName === candy.name
        );
        if (!alreadySoldThisCandy) {
          dispatch(incrementStat({ stat: 'reputationTypesSold' }));
        }

        // Lunchroom Monopoly / future location-gated unlocks: +1 per sale
        // transaction, keyed by current location. Redux mirror updates
        // immediately for progress UI; service cache updates so the next
        // saveUserObject (at game-end) persists to Firebase.
        const saleLocation = currentLocationRef.current;
        if (saleLocation) {
          dispatch(incrementSalesAtLocation(saleLocation));
          scoreboardService.incrementSalesAtLocation(saleLocation);
        }

        removeFromInventory(candy.name, quantity);

        // Pure state update — no side effects
        setCandies((prev) =>
          prev.map((c, i) =>
            i !== candyIndex
              ? c
              : { ...c, quantityOwned: c.quantityOwned - quantity }
          )
        );

        // Track shopkeeper nightly quest progress
        const candyDef = CANDY_REGISTRY.find((c) => c.name === candy.name);
        dispatch(updateQuestProgress({
          candyName: candy.name,
          candyTypes: candyDef?.types,
          quantity,
          profit: finalProfit > 0 ? finalProfit : 0,
        }));

        // Check Student Delivery Quest completion
        const questRef = activeQuestRef.current;
        if (
          questRef &&
          !questRef.completed &&
          candy.name === questRef.candyName &&
          currentDay === questRef.day &&
          currentPeriodInDay === questRef.targetPeriod &&
          quantity >= questRef.quantity
        ) {
          dispatch(completeQuest());
          // Generate 2 random joker choices for the reward (seeded)
          const questRng = seedrandom(`${questRef.id}-reward`);
          const ownedIds = new Set(jokersRef.current.map((j: any) => j.id.toString()));
          const unowned = STANDARDIZED_JOKERS.filter((sj) => !ownedIds.has(sj.id.toString()));
          if (unowned.length > 0) {
            // Shuffle unowned jokers deterministically
            const shuffled = [...unowned];
            for (let si = shuffled.length - 1; si > 0; si--) {
              const sj = Math.floor(questRng() * (si + 1));
              [shuffled[si], shuffled[sj]] = [shuffled[sj], shuffled[si]];
            }
            dispatch(setPendingJokerChoices(shuffled.slice(0, Math.min(2, shuffled.length))));
            setShowQuestJokerSelection(true);
            SoundEffects.playPositiveSound();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (__DEV__) console.log('📦 QUEST: Completed! Showing joker reward');
          } else {
            dispatch(clearActiveQuest());
            if (__DEV__) console.log('📦 QUEST: Completed but no unowned jokers available');
          }
        }

        // Glass Cannon — after every sell, roll self-destruct.
        // L1: 10% / L2: 7% / L3: 5% chance to shatter the joker itself.
        const glassCannon = currentJokers.find(
          (j: any) => j.id === JOKER_IDS.GLASS_CANNON || j.id === String(JOKER_IDS.GLASS_CANNON)
        );
        if (glassCannon) {
          const gcLevel = (glassCannon as any).level ?? 1;
          const destroyChance = gcLevel === 3 ? 0.05 : gcLevel === 2 ? 0.07 : 0.10;
          if (Math.random() < destroyChance) {
            removeJoker(glassCannon.id);
            if (__DEV__) console.log(`💥 GLASS CANNON: shattered after sale (L${gcLevel}, ${Math.round(destroyChance * 100)}% roll)`);
          }
        }
      }

      closeModal();
    },
    [
      // Only stable dispatch callbacks remain as deps:
      addToInventory, spend, addSpent, resetSales, add, addProfit,
      addCandySold, recordDailyStatsSale, addSale, removeFromInventory,
      closeModal, jokerService, clearActiveEffect, removeJoker,
      dispatch, getInventoryLimit, consecutivePeriodSales,
    ]
  );

  return { handleTransaction };
};
