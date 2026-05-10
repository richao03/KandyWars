import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Image,
  Pressable,
  Animated as RNAnimated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import colors from '../../src/constants/colors';
import { scoreboardService } from '../../src/services/firebase';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { selectReduceMotion } from '../../src/store/slices/juiceSettingsSlice';
import {
  selectTxnProfitBoostCollapsed,
  selectTxnMultiplierCollapsed,
  toggleTxnProfitBoostCollapsed,
  toggleTxnMultiplierCollapsed,
} from '../../src/store/slices/settingsSlice';
import {
  advanceTutorial,
  selectTutorialStep,
} from '../../src/store/slices/tutorialSlice';
import { Candy } from '../../src/types/candy';
import { computeBigSaleFX } from '../../src/utils/computeBigSaleFX';
import { computeEffectTier } from '../../src/utils/computeEffectTier';
import {
  computeSparkScale,
  type SparkScale,
} from '../../src/utils/computeSparkScale';
import { triggerTieredHaptic } from '../../src/utils/hapticTier';
import { MerchantUtils } from '../../src/utils/merchantUtils';
import { formatCurrency } from '../../src/utils/priceUtils';
import { calculateSaleTotal } from '../../src/utils/saleCalculations';
import { ScreenFXController } from '../../src/utils/screenFXController';
import {
  SoundEffects,
  playCashRegister,
  playJokerChip,
  playJokerMult,
} from '../../src/utils/soundEffects';
import { SparkController } from '../../src/utils/sparkController';
import { JOKER_ICON_MAP as JOKER_ICON_BY_NAME } from '../../utils/jokerIcons';
import FastModal from './FastModal';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';
import PressableScale from './PressableScale';
import SparkEffect from './SparkEffect';
import TextWithEmojis from './TextWithEmojis';
import type { SaleInputs } from './TransactionModalManager';

type PriceBreakdown = {
  basePrice: number;
  jokerEffects: Array<{
    jokerName: string;
    jokerEmoji: string;
    effect: string;
    amount: number;
    effectType: 'buy' | 'sell';
    isActive: boolean;
  }>;
  hallPassEffect?: {
    bonusPercent: number;
    bonusAmount: number;
  };
  merchantEffect?: {
    bonusPercent: number;
    bonusAmount: number;
  };
  influencerShoutoutEffect?: {
    bonusPercent: number;
    bonusAmount: number;
  };
  vacuumSealerPenalty?: {
    penaltyPercent: number; // e.g., 50 for -50%
    isActive: boolean;
  };
  finalPrice: number;
};

type SaleResultLike = {
  totalGain: number;
  profitPerUnit: number;
  totalProfit: number;
  purchaseValue: number;
  hallPassBonus: number;
  jokerMultiplier: number;
  vacuumSealerPenalty: number;
  bonusBreakdown: Array<{
    emoji: string;
    name: string;
    multiplier: number;
    flatBonus?: number;
  }>;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (quantity: number, mode: 'buy' | 'sell') => void;
  maxBuyQuantity: number;
  maxSellQuantity: number;
  candy: Candy & {
    cost: number;
    quantityOwned: number;
    averagePrice: number | null;
  };
  priceBreakdown?: PriceBreakdown;
  playerBalance?: number;
  availableInventorySpace?: number;
  saleInputs?: SaleInputs | null;
  /**
   * Debug-only: forces mode='Sell' and bypasses calculateSaleTotal so the
   * modal renders against a synthesized sale. Used by `app/debug-tier-preview.tsx`
   * to preview the scoring animation + screen FX at any tier without needing
   * real game state. Has no effect when `undefined`.
   */
  debugSaleOverride?: {
    saleResult: SaleResultLike;
    /** Optional synthetic candy override. Falls back to the `candy` prop. */
    candy?: Candy & {
      cost: number;
      quantityOwned: number;
      averagePrice: number | null;
    };
  };
};

/** Format a number for the cascade arc symbol: strip if whole, else max 2 decimals. */
function formatSparkNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return Number(n.toFixed(2)).toString();
}

function TransactionModal({
  visible,
  onClose,
  onConfirm,
  maxBuyQuantity,
  maxSellQuantity,
  candy: candyProp,
  priceBreakdown,
  playerBalance,
  availableInventorySpace,
  saleInputs,
  debugSaleOverride,
}: Props) {
  // Debug override swaps the displayed candy without affecting the real prop
  // contract upstream — keeps TransactionModalManager / market.tsx unchanged.
  const candy = debugSaleOverride?.candy ?? candyProp;
  const { height: windowHeight } = useWindowDimensions();
  // Cap the breakdown scroll area as a fraction of the screen so the sell-mode
  // modal doesn't overflow on small devices. ~22% of screen, capped at 180.
  const breakdownScrollHeight = Math.max(
    110,
    Math.min(120, windowHeight * 0.22)
  );
  // Cap the entire modal so it can never exceed the visible area on small
  // devices. The inner content is wrapped in a ScrollView below.
  const modalMaxHeight = windowHeight * 0.9;
  const [mode, setMode] = useState<'Buy' | 'Sell'>('Buy');
  const [quantity, setQuantity] = useState(1);
  const [isClosing, setIsClosing] = useState(false);
  const reduceMotion = useAppSelector(selectReduceMotion);

  // Scoring animation state
  const [scoringActive, setScoringActive] = useState(false);
  const [scoringStep, setScoringStep] = useState(-1); // -1 = not started, 0+ = current bonus index
  const [animatedProfit, setAnimatedProfit] = useState(0);
  const [animatedMult, setAnimatedMult] = useState(1);
  const [scoringDone, setScoringDone] = useState(false);
  const pulseScale = useRef(new RNAnimated.Value(1)).current;
  const pendingConfirmRef = useRef<(() => void) | null>(null);

  // Phase 6 sequence: tracks pending timers (so they can be cleared on skip/unmount)
  const sequenceTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // skipRef forces skip-to-finish on tap during phases 1-4
  const skipRef = useRef(false);
  // Refs to joker icon wrappers (for measureInWindow-based particle arcs).
  // Typed as `any` because the element may be a plain RN View or an
  // Animated.View — both expose measureInWindow at runtime.
  const jokerIconRefs = useRef<Record<string, any>>({});
  // Ref to running total ("You Pocket" value) for spark arc destination
  const totalDisplayRef = useRef<any>(null);
  // Refs to the running aggregate values shown in each section header.
  // Boost-bucket joker arcs target the profit-boost value; mult-bucket
  // joker arcs target the multiplier value. Each arc visually feeds into
  // its own running counter rather than jumping all the way to You Pocket.
  const profitBoostValueRef = useRef<any>(null);
  const multValueRef = useRef<any>(null);
  // Captured size of the total-display element so the climax burst can be
  // rendered as a child (always centered on the value, no runtime measurement).
  const [totalDisplaySize, setTotalDisplaySize] = useState({
    width: 0,
    height: 0,
  });
  // Climax explosion state — the climax bumps `climaxExplosionTrigger` to
  // restart the SparkEffect inside the total-display wrapper.
  // `climaxExplosionScale` is a granular {count, colors} preset chosen by
  // sale value (see computeSparkScale). null hides the explosion entirely so
  // the SparkEffect doesn't auto-fire when the modal reopens.
  const [climaxExplosionScale, setClimaxExplosionScale] =
    useState<SparkScale | null>(null);
  const [climaxExplosionTrigger, setClimaxExplosionTrigger] = useState(0);

  // sellButtonSpark dispersal — fires once when the user clicks Sell. The
  // existing ambient sparks themselves explode outward (upward + horizontally
  // away from center) over ~500ms via SparkEffect's `disperseTrigger` prop.
  // After ~600ms we unmount the SparkEffect entirely so the loop stops.
  const [sellButtonBurstTrigger, setSellButtonBurstTrigger] = useState(0);
  const [sellButtonSparkActive, setSellButtonSparkActive] = useState(true);

  // Buy-confirmation feedback — totalCostPunch scales the Total Cost box
  // briefly when the player commits a purchase (1 → 1.25 → 1).
  const totalCostPunch = useSharedValue(1);

  // Target value for the climax count-up (driven by useAnimatedMoney)
  const [finalTotalTarget, setFinalTotalTarget] = useState(0);

  // Reanimated shared values for 6-phase flourishes
  const totalPunch = useSharedValue(1); // total number scale (Phase 4 climax bounce)
  const modalExit = useSharedValue(0); // 0..1 modal decay progress (Phase 6)
  // Running-total text (score) punch that fires when a spark lands on it
  const runningTotalPunch = useSharedValue(1);
  // NOTE: finalTotalTarget (state) drives useAnimatedMoney; no shared value
  // here — that hook owns the shared value internally.

  // Per-joker icon scales (bounded: 16 is more than enough for any real sale).
  // Declared at top level so React's hook rules are satisfied.
  const iconScale0 = useSharedValue(1);
  const iconScale1 = useSharedValue(1);
  const iconScale2 = useSharedValue(1);
  const iconScale3 = useSharedValue(1);
  const iconScale4 = useSharedValue(1);
  const iconScale5 = useSharedValue(1);
  const iconScale6 = useSharedValue(1);
  const iconScale7 = useSharedValue(1);
  const iconScale8 = useSharedValue(1);
  const iconScale9 = useSharedValue(1);
  const iconScale10 = useSharedValue(1);
  const iconScale11 = useSharedValue(1);
  const iconScale12 = useSharedValue(1);
  const iconScale13 = useSharedValue(1);
  const iconScale14 = useSharedValue(1);
  const iconScale15 = useSharedValue(1);
  const iconScales = useMemo(
    () => [
      iconScale0,
      iconScale1,
      iconScale2,
      iconScale3,
      iconScale4,
      iconScale5,
      iconScale6,
      iconScale7,
      iconScale8,
      iconScale9,
      iconScale10,
      iconScale11,
      iconScale12,
      iconScale13,
      iconScale14,
      iconScale15,
    ],
    [
      iconScale0,
      iconScale1,
      iconScale2,
      iconScale3,
      iconScale4,
      iconScale5,
      iconScale6,
      iconScale7,
      iconScale8,
      iconScale9,
      iconScale10,
      iconScale11,
      iconScale12,
      iconScale13,
      iconScale14,
      iconScale15,
    ]
  );

  const clearSequenceTimers = useCallback(() => {
    sequenceTimersRef.current.forEach(clearTimeout);
    sequenceTimersRef.current = [];
  }, []);

  const scheduleSequence = useCallback((cb: () => void, delay: number) => {
    const timer = setTimeout(() => {
      // Remove from ref list when fired
      const idx = sequenceTimersRef.current.indexOf(timer);
      if (idx >= 0) sequenceTimersRef.current.splice(idx, 1);
      cb();
    }, delay);
    sequenceTimersRef.current.push(timer);
    return timer;
  }, []);

  // Tutorial
  const tutorialStep = useAppSelector(selectTutorialStep);
  const bulkEmpireStacks = useAppSelector(
    (state: any) => state.game?.bulkEmpireStacks ?? 0
  );
  const tutorialDispatch = useAppDispatch();
  // Per-section collapse state — persisted via settingsSlice. Collapsed view
  // shows just the icon row; totals stay hidden until the scoring sequence
  // (which already animates per-icon wobble + arc into the totals) reveals them.
  const profitBoostCollapsed = useAppSelector(selectTxnProfitBoostCollapsed);
  const multiplierCollapsed = useAppSelector(selectTxnMultiplierCollapsed);
  const isTutorialModal = tutorialStep === 4 || tutorialStep === 7;
  const dimOpacity = isTutorialModal ? 0.25 : 1;

  // Read from snapshotted saleInputs prop (captured when modal opens) — no Redux subscriptions
  const jokers = saleInputs?.jokers ?? [];
  const activeEffects = saleInputs?.activeEffects ?? [];
  const computedInventoryLimit = saleInputs?.computedInventoryLimit ?? 30;
  const hallPassModifiers = saleInputs?.hallPassModifiers ?? {
    inventoryBonusSlots: 0,
    salePriceBonusPercent: 0,
  };
  const periodCount = saleInputs?.periodCount ?? 0;
  const hasEarlySaleToday = saleInputs?.hasEarlySaleToday ?? false;
  const merchantEffects = saleInputs?.merchantEffects ?? [];
  const candySales = saleInputs?.candySales ?? [];
  const totalCandiesSold = saleInputs?.totalCandiesSold ?? 0;
  const jokerStatsData = saleInputs?.jokerStats ?? {};
  const inventoryCount = saleInputs?.inventoryCount ?? 0;
  const saleDay = saleInputs?.day ?? 1;
  const uniqueLocationsToday = saleInputs?.uniqueLocationsToday ?? 0;
  const salePeriod = saleInputs?.period ?? 1;
  const periodsPerDay = saleInputs?.periodsPerDay ?? 8;
  const selectedPassIds = saleInputs?.selectedPassIds ?? [];
  const currentLocation = saleInputs?.currentLocation ?? '';

  // Clamp maxBuyQuantity and maxSellQuantity to prevent negative values
  // If value is negative, set to 0
  const clampedMaxBuyQuantity = maxBuyQuantity < 0 ? 0 : maxBuyQuantity;
  const clampedMaxSellQuantity = maxSellQuantity < 0 ? 0 : maxSellQuantity;
  const maxQuantity =
    mode === 'Buy' ? clampedMaxBuyQuantity : clampedMaxSellQuantity;

  // Inline getInventoryLimit (from useInventory.ts:82-91)
  const inventoryLimit = useMemo(() => {
    let limit = computedInventoryLimit + hallPassModifiers.inventoryBonusSlots;
    return MerchantUtils.applyInventoryBonus(limit, merchantEffects);
  }, [
    computedInventoryLimit,
    hallPassModifiers.inventoryBonusSlots,
    merchantEffects,
  ]);

  // Inline consecutivePeriodSales (from useCandySales.ts:48-94)
  const consecutiveSalesCount = useMemo(() => {
    if (!visible) return 0;
    if (candySales.length === 0) return 1;
    const periodsWithSales = Array.from(
      new Set(candySales.map((sale: any) => sale.period))
    ).sort((a: number, b: number) => b - a);
    if (periodsWithSales.length === 0) return 1;
    const mostRecentPeriod = periodsWithSales[0];
    let consecutiveCount = 1;
    for (let i = 1; i < periodsWithSales.length; i++) {
      if (periodsWithSales[i] === mostRecentPeriod - i) {
        consecutiveCount++;
      } else {
        break;
      }
    }
    return consecutiveCount;
  }, [visible, candySales]);

  // Pick the opening mode + max quantity when the modal becomes visible.
  // Priority:
  //   1. Tutorial step 7 → force Sell (script-driven).
  //   2. Inventory full (no buy capacity) → open in Sell with max sell qty.
  //   3. Otherwise → open in Buy with max buy qty.
  // The 0 → rAF → max sequence is the same "wake-up" pattern used in
  // changeMode: @react-native-community/slider sometimes ignores a value
  // prop change on remount; touching it through 0 first forces the visual
  // thumb to jump to the new max.
  useEffect(() => {
    if (!visible) return;
    const setMaxQuantityNextFrame = (max: number) => {
      setQuantity(0);
      requestAnimationFrame(() => setQuantity(Math.max(1, max)));
    };
    if (tutorialStep === 7) {
      setMode('Sell');
      setMaxQuantityNextFrame(clampedMaxSellQuantity);
      return;
    }
    const inventoryFull =
      availableInventorySpace !== undefined && availableInventorySpace <= 0;
    if (inventoryFull) {
      setMode('Sell');
      setMaxQuantityNextFrame(clampedMaxSellQuantity);
    } else {
      setMode('Buy');
      setMaxQuantityNextFrame(clampedMaxBuyQuantity);
    }
  }, [visible]);

  const finalUnitPrice =
    mode === 'Sell' && priceBreakdown ? priceBreakdown.finalPrice : candy.cost;

  // Calculate sale result for selling - contains pocket value and bonus breakdown
  // Skip expensive calculation when modal is hidden (stays mounted by TransactionModalManager)
  const saleResult = useMemo(() => {
    if (!visible) return null;
    // Debug preview: skip calculateSaleTotal entirely and render the synthetic result.
    if (debugSaleOverride) return debugSaleOverride.saleResult;
    if (mode === 'Sell' && candy.averagePrice !== null) {
      // Use shared calculation function to ensure consistency with actual sale
      return calculateSaleTotal({
        candyName: candy.name,
        basePrice: candy.cost,
        purchasePrice: candy.averagePrice,
        quantity,
        jokers,
        periodCount,
        inventoryLimit,
        activeEffects,
        hallPassModifiers,
        merchantEffects,
        consecutivePeriodSales: consecutiveSalesCount,
        totalCandiesSold: totalCandiesSold || 0,
        hasEarlySaleToday,
        initialMultiplier: 1, // Don't include one-time jokers in preview
        inventoryCount,
        day: saleDay,
        uniqueLocationsToday,
        period: salePeriod,
        periodsPerDay,
        bulkEmpireStacks,
        inventory: saleInputs?.inventory ?? [],
        uniqueTypesSoldThisPeriod: (() => {
          const salesThisPeriod = candySales.filter(
            (s: any) => s.period === periodCount
          );
          const types = new Set(salesThisPeriod.map((s: any) => s.candyName));
          types.add(candy.name);
          return types.size;
        })(),
        clearanceSaleStacks: jokerStatsData.clearanceSaleLosses ?? 0,
        compoundInterestDays: jokerStatsData.compoundInterestDays ?? 0,
        reputationTypesSold: jokerStatsData.reputationTypesSold ?? 0,
        streetSmartsEventsSurvived:
          jokerStatsData.streetSmartsEventsSurvived ?? 0,
        hoarderMaxHits: jokerStatsData.hoarderMaxHits ?? 0,
        pennyWiseStashes: jokerStatsData.pennyWiseStashes ?? 0,
        survivorCandiesMelted: jokerStatsData.survivorCandiesMelted ?? 0,
        selectedPassIds,
        currentLocation,
      });
    }
    return null;
  }, [
    visible,
    mode,
    candy.name,
    candy.cost,
    candy.averagePrice,
    quantity,
    jokers,
    periodCount,
    inventoryLimit,
    activeEffects,
    hallPassModifiers,
    merchantEffects,
    consecutiveSalesCount,
    totalCandiesSold,
    hasEarlySaleToday,
    inventoryCount,
    saleDay,
    uniqueLocationsToday,
    salePeriod,
    periodsPerDay,
    debugSaleOverride,
  ]);

  // Debug preview: lock mode to Sell so the scoring animation runs.
  useEffect(() => {
    if (debugSaleOverride && mode !== 'Sell') {
      setMode('Sell');
    }
  }, [debugSaleOverride, mode]);

  const pocketValue = saleResult
    ? formatCurrency(saleResult.totalGain)
    : mode === 'Sell'
      ? formatCurrency(candy.cost * quantity)
      : formatCurrency(finalUnitPrice * quantity);

  // Build ordered scoring steps: boosts first, then mults
  const scoringSteps = useMemo(() => {
    if (!saleResult) return [];
    const boosts = saleResult.bonusBreakdown
      .filter((b) => b.flatBonus && b.flatBonus > 0)
      .map((b) => ({ ...b, bucket: 'boost' as const }));
    const mults = saleResult.bonusBreakdown
      .filter((b) => b.multiplier > 1 && !b.flatBonus)
      .map((b) => ({ ...b, bucket: 'mult' as const }));
    return [...boosts, ...mults];
  }, [saleResult]);

  /**
   * 6-phase joker reveal sequence — replaces the old 300ms pulse cascade.
   *
   * Phase 0: Tap-down (lever click + micro-haptic) — fired from handleConfirm
   * Phase 1: Anticipation — 200ms, staggered wiggle across joker icons + duck music
   * Phase 2: Cascade — per-joker pre-pulse, bounce, chip/mult SFX, particle arc,
   *                    banner flash, score punch, micro-haptic. Gap accelerates.
   * Phase 3: Dual counters — running Base/Bonuses/Mult ticker (handled in render)
   * Phase 4: Climax — coin cascade, final total count-up, success haptic, tiered
   *                   vignette + particle burst
   * Phase 5: Wallet receipt — restore music volume, fire confirm
   * Phase 6: Decay — modal opacity/translate fade
   */
  const runScoringAnimation = useCallback(() => {
    if (!saleResult || scoringSteps.length === 0) {
      // No bonuses — just confirm immediately.
      pendingConfirmRef.current?.();
      pendingConfirmRef.current = null;
      return;
    }

    skipRef.current = false;
    clearSequenceTimers();

    const baseProfit = saleResult.totalProfit;
    const finalMult = saleResult.jokerMultiplier;
    const finalProfit = saleResult.totalGain - saleResult.purchaseValue;
    const finalTotal = saleResult.totalGain;

    // Initialize counters/state
    setScoringActive(true);
    setScoringDone(false);
    setAnimatedProfit(baseProfit);
    setAnimatedMult(1);
    setScoringStep(-1);
    totalPunch.value = 1;
    runningTotalPunch.value = 1;
    // Seed the final-total counter at its pre-bonus starting point so the
    // Phase 4 count-up goes from "base total" -> "full total".
    setFinalTotalTarget(baseProfit + saleResult.purchaseValue);

    // Tier classification up front — drives climax flair gating
    const maxJokerMult = scoringSteps.reduce(
      (acc, s) => (s.bucket === 'mult' ? Math.max(acc, s.multiplier) : acc),
      1
    );
    const tierResult = computeEffectTier({
      totalGain: finalTotal,
      purchaseValue: saleResult.purchaseValue,
      jokerBonusCount: scoringSteps.length,
      maxJokerMult,
    });

    // Measure running-total position for spark arcs. Fallback = screen center.
    let totalPos: { x: number; y: number } = { x: 200, y: 400 };
    if (totalDisplayRef.current) {
      totalDisplayRef.current.measureInWindow(
        (x: number, y: number, w: number, h: number) => {
          totalPos = { x: x + w / 2, y: y + h / 2 };
        }
      );
    }

    // Measure each section header's running-value position so per-bonus
    // arcs can land on their own aggregate counter (boost arcs → profit-boost
    // value; mult arcs → multiplier value). Falls back to totalPos if a ref
    // isn't ready yet.
    let boostValuePos: { x: number; y: number } | null = null;
    let multValuePos: { x: number; y: number } | null = null;
    if (profitBoostValueRef.current) {
      profitBoostValueRef.current.measureInWindow(
        (x: number, y: number, w: number, h: number) => {
          boostValuePos = { x: x + w / 2, y: y + h / 2 };
        }
      );
    }
    if (multValueRef.current) {
      multValueRef.current.measureInWindow(
        (x: number, y: number, w: number, h: number) => {
          multValuePos = { x: x + w / 2, y: y + h / 2 };
        }
      );
    }

    // SLOW: animation timings multiplied by 1.33 — slower, smoother cascade.
    const SLOW = 1.33;
    const ms = (n: number) => Math.round(n * SLOW);
    // (No MusicController.duck — the sell flow shouldn't touch background
    //  music. Volume changes on the singleton player can inadvertently kick
    //  off playback even when music wasn't playing.)
    // Phase 1 anticipation pulse removed — each icon gets exactly ONE bounce
    // when its turn arrives in Phase 2. Multiple animation phases hitting
    // the same iconScale read as a continuous wobble, not a single trigger.

    // ------------- Phase 2: Cascade -------------
    let runningProfit = baseProfit;
    let runningMult = 1;
    let cursor = ms(200);

    const beatOffsets: number[] = [];

    scoringSteps.forEach((bonus, i) => {
      const gap = ms(Math.max(100, 250 - i * 30));
      const beatStart = cursor;
      beatOffsets.push(beatStart);

      // Pre-pulse removed — only one bounce per joker (in the next block).

      // Bounce: single pop + SFX + particle arc + score punch
      scheduleSequence(
        () => {
          if (skipRef.current) return;
          setScoringStep(i);

          const sv = iconScales[Math.min(i, iconScales.length - 1)];
          if (!reduceMotion) {
            // Grow once then ease back — no springy bounce.
            sv.value = withSequence(
              withTiming(1.4, { duration: ms(120) }),
              withTiming(1, { duration: ms(180) })
            );
          }

          // SFX routed by bonus type — coin-cluster pitch ladder
          if (bonus.bucket === 'boost') {
            playJokerChip(i);
          } else {
            playJokerMult(i);
          }

          // Particle arc — each joker's particle flies from its row icon up
          // to its bucket's running aggregate (profit-boost value for boost
          // jokers, multiplier value for mult jokers). Falls back to the
          // You Pocket position if the bucket's header ref isn't measured.
          const iconRef = jokerIconRefs.current[`${bonus.name}-${i}`];
          const arcSymbol =
            bonus.bucket === 'boost'
              ? `+$${formatSparkNumber(bonus.flatBonus ?? 0)}`
              : `×${formatSparkNumber(bonus.multiplier)}`;
          const fireArc = (from: { x: number; y: number }) => {
            const target =
              bonus.bucket === 'boost'
                ? (boostValuePos ?? totalPos)
                : (multValuePos ?? totalPos);
            SparkController.arc({
              from,
              to: target,
              tier: tierResult.level,
              symbol: arcSymbol,
            });
          };
          // measureInWindow now targets a tight inner View that wraps just
          // the icon image (see renderIcon), so x + w/2 lands on the visual
          // icon center directly — no fudge constant needed.
          if (iconRef) {
            iconRef.measureInWindow(
              (x: number, y: number, w: number, h: number) => {
                fireArc({ x: x + w / 2, y: y + h / 2 });
              }
            );
          } else {
            // Fallback — arc from a fake center if the icon ref isn't ready
            fireArc({ x: totalPos.x, y: totalPos.y - 100 });
          }

          // Tick the counters
          if (bonus.bucket === 'boost') {
            runningProfit += bonus.flatBonus ?? 0;
            setAnimatedProfit(runningProfit);
          } else {
            runningMult += bonus.multiplier - 1;
            setAnimatedMult(runningMult);
          }

          // Per-joker haptic — intensity ramps up across the cascade so each
          // joker hits a touch harder than the last. boost jokers ride the
          // selection→Medium tier boundary; mult jokers ride Medium→Success.
          // The climax at 0.9 + delayed Heavy still tops out above the final
          // beat so the cash-register punctuation reads as the peak.
          const progress =
            scoringSteps.length > 1 ? i / (scoringSteps.length - 1) : 0;
          if (bonus.bucket === 'mult') {
            triggerTieredHaptic(0.4 + progress * 0.45);
          } else {
            triggerTieredHaptic(0.15 + progress * 0.5);
          }
        },
        beatStart + ms(60 + 40)
      );

      // Score-punch on running total when particle "lands"
      scheduleSequence(
        () => {
          if (skipRef.current) return;
          if (!reduceMotion) {
            runningTotalPunch.value = withSequence(
              withTiming(1.15, { duration: ms(90) }),
              withSpring(1, { damping: 10, stiffness: 200 })
            );
          }
        },
        beatStart + ms(180)
      );

      cursor += gap;
    });

    // ------------- Phase 4: Climax -------------
    // Wait for the last joker's bounce + score-punch animations to fully settle
    // before firing the cash-register. Each beat schedules its bounce at
    // `beatStart + ms(100)` and the resulting animation runs ~ms(280) more,
    // so add a buffer beyond `cursor` (which may have advanced by only the
    // smaller of the next gap = ms(100)).
    const climaxAt = cursor + ms(300);

    scheduleSequence(() => {
      if (skipRef.current) {
        // Skip handler has already forced climax — nothing more to do here.
        return;
      }
      setScoringDone(true);

      // Kick off final count-up via state update — useAnimatedMoney will
      // interpolate from the seeded base total to the full total.
      setFinalTotalTarget(finalTotal);
      // Cash-register punctuation closes the joker cascade.
      playCashRegister();

      // Big-sale screen FX — shake @ $6k+, edge lights @ $10k/$15k/$20k
      const bigFX = computeBigSaleFX(finalTotal);
      if (bigFX.shake && !reduceMotion) ScreenFXController.shake(bigFX.shake);
      if (bigFX.edgeLights !== 'none' && !reduceMotion) {
        ScreenFXController.edgeLights(
          bigFX.edgeLights,
          bigFX.edgeLightsDuration
        );
      }

      // Number bounce
      if (!reduceMotion) {
        totalPunch.value = withSequence(
          withTiming(1.25, { duration: ms(140) }),
          withSpring(1, { damping: 8, stiffness: 180 })
        );
      }

      // Climax haptic — base success notification + tier-scaled extra weight.
      // $15k+ stacks an additional Heavy impact for the higher tiers so a
      // jackpot truly thumps; below $15k just the success notification fires.
      triggerTieredHaptic(0.9, 'success');
      if (finalTotal >= 50000) {
        // Stack a delayed Heavy impact for jackpot-scale sales
        setTimeout(() => triggerTieredHaptic(0.8), 80);
        setTimeout(() => triggerTieredHaptic(0.8), 200);
      } else if (finalTotal >= 15000) {
        setTimeout(() => triggerTieredHaptic(0.8), 100);
      }

      // climaxExplosion — rendered as a CHILD of the total-display
      // Animated.View (see JSX below), so its center always matches the
      // current position of the running-total Text. The {count, colors}
      // preset is chosen by `finalTotal` via computeSparkScale (granular
      // tier lookup). Bumping the trigger restarts the SparkEffect.
      if (!reduceMotion) {
        const scale = computeSparkScale(finalTotal);
        if (scale.count > 0) {
          setClimaxExplosionScale(scale);
          setClimaxExplosionTrigger((t) => t + 1);
        }
      }
    }, climaxAt);

    // ------------- Phase 5: Wallet receipt -------------
    // Tier-gated total runtime budget (slowed by 33%).
    const tierTailMs = ms(
      tierResult.level === 'jackpot'
        ? 1400
        : tierResult.level === 'sapphire'
          ? 900
          : tierResult.level === 'gold' || tierResult.level === 'emerald'
            ? 500
            : 400
    );

    scheduleSequence(() => {
      // (No MusicController.restore — see duck-removal note above.)
      // Phase 6: decay — fade + translate the modal content before handoff.
      // Skipped in debug preview mode so the modal stays visible while the
      // caller (debug-tier-preview) holds it open to admire the screen FX.
      if (debugSaleOverride) {
        modalExit.value = 0;
      } else if (!reduceMotion) {
        modalExit.value = withTiming(1, { duration: ms(250) });
      } else {
        modalExit.value = 0; // no decay for reduce-motion — snap close
      }
      setScoringActive(false);
      setScoringStep(-1);
      // Fire the pending onConfirm — TransactionModalManager will close the modal.
      pendingConfirmRef.current?.();
      pendingConfirmRef.current = null;
    }, climaxAt + tierTailMs);

    // Suppress unused (beatOffsets is exported as future cache for skip interpolation).
    void finalProfit;
    void finalMult;
    void beatOffsets;
  }, [
    saleResult,
    scoringSteps,
    reduceMotion,
    iconScales,
    totalPunch,
    runningTotalPunch,
    modalExit,
    clearSequenceTimers,
    scheduleSequence,
    debugSaleOverride,
  ]);

  /**
   * Skip-to-finish handler — fires when user taps anywhere during phases 1-4.
   * Snaps all counters/state to their final values and immediately triggers
   * climax SFX/haptic (once), then cues dismissal.
   */
  const skipToFinish = useCallback(() => {
    if (!scoringActive || skipRef.current) return;
    if (!saleResult) return;
    skipRef.current = true;
    clearSequenceTimers();

    const finalProfit = saleResult.totalGain - saleResult.purchaseValue;
    const finalTotal = saleResult.totalGain;

    // Snap all counters/state immediately
    setScoringStep(scoringSteps.length);
    setAnimatedProfit(finalProfit / Math.max(saleResult.jokerMultiplier, 1));
    setAnimatedMult(saleResult.jokerMultiplier);
    setScoringDone(true);
    setFinalTotalTarget(finalTotal);

    // Single climax haptic + cash-register punctuation (no pop cascade).
    // Same tier-stacked thump as the normal climax for jackpot-scale sales.
    triggerTieredHaptic(0.9, 'success');
    if (finalTotal >= 50000) {
      setTimeout(() => triggerTieredHaptic(0.8), 80);
      setTimeout(() => triggerTieredHaptic(0.8), 200);
    } else if (finalTotal >= 15000) {
      setTimeout(() => triggerTieredHaptic(0.8), 100);
    }
    playCashRegister();
    // (No MusicController.restore — sell flow doesn't touch background music.)

    // Big-sale screen FX — fire on skip-to-finish too
    const bigFX = computeBigSaleFX(finalTotal);
    if (bigFX.shake && !reduceMotion) ScreenFXController.shake(bigFX.shake);
    if (bigFX.edgeLights !== 'none' && !reduceMotion) {
      ScreenFXController.edgeLights(bigFX.edgeLights, bigFX.edgeLightsDuration);
    }

    // Dismiss after a beat so the user sees the snapped total
    scheduleSequence(() => {
      setScoringActive(false);
      setScoringStep(-1);
      pendingConfirmRef.current?.();
      pendingConfirmRef.current = null;
    }, 250);
  }, [
    scoringActive,
    saleResult,
    scoringSteps.length,
    clearSequenceTimers,
    scheduleSequence,
  ]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearSequenceTimers();
    };
  }, [clearSequenceTimers]);

  const doConfirm = useCallback(() => {
    setIsClosing(true);
    // No pop sound on confirm — sell flow plays coin-cluster cascade + cash-register only.

    if (mode === 'Sell' && priceBreakdown) {
      const saleRevenue = priceBreakdown.finalPrice * quantity;
      const userObject = scoreboardService.getCachedUserObject();
      if (userObject && saleRevenue > userObject.highestSingleSale) {
        scoreboardService.updateLocalUserObject({
          highestSingleSale: saleRevenue,
        });
      }
    }

    onConfirm(quantity, mode.toLowerCase() as 'buy' | 'sell');

    if (tutorialStep === 4 || tutorialStep === 7) {
      tutorialDispatch(advanceTutorial());
    }
  }, [
    mode,
    quantity,
    priceBreakdown,
    onConfirm,
    tutorialStep,
    tutorialDispatch,
  ]);

  const handleConfirm = () => {
    if (quantity > 0 && quantity <= maxQuantity) {
      // Loss sales skip the joker cascade entirely — saleCalculations
      // short-circuits to currentPrice × quantity and no joker effects
      // apply, so there's nothing to celebrate. Falls through to the
      // bonus-less sell path below (cash register + confirm).
      const isProfitableSale =
        candy.averagePrice === null || candy.cost >= candy.averagePrice;
      // For sells with bonuses, play scoring animation first
      if (
        mode === 'Sell' &&
        scoringSteps.length > 0 &&
        !scoringActive &&
        isProfitableSale
      ) {
        // Phase 0: tap-down haptic only — no pop sound. The joker cascade
        // (coin-cluster pings) carries the audio from here.
        triggerTieredHaptic(0.2, 'selection');
        // Disperse the sellButtonSpark — the existing ambient sparks
        // explode outward (~500ms) and we unmount them entirely after
        // ~600ms so the loop stops for good.
        setSellButtonBurstTrigger((t) => t + 1);
        setTimeout(() => setSellButtonSparkActive(false), 720);
        pendingConfirmRef.current = doConfirm;
        runScoringAnimation();
        return;
      }
      // Same dispersal for sells without bonuses (no scoring animation).
      if (mode === 'Sell') {
        setSellButtonBurstTrigger((t) => t + 1);
        setTimeout(() => setSellButtonSparkActive(false), 720);
        // Cash-register punctuation fires for EVERY sale regardless of tier
        // — bonus-less sells get the same closing audio as the cascade ones.
        playCashRegister();
        // Tier-scaled completion haptic — matches the climax weight for
        // bigger sales so even bonus-less sells feel proportionate.
        const sellTotal = saleResult?.totalGain ?? candy.cost * quantity;
        triggerTieredHaptic(0.9, 'success');
        if (sellTotal >= 50000) {
          setTimeout(() => triggerTieredHaptic(0.8), 80);
          setTimeout(() => triggerTieredHaptic(0.8), 200);
        } else if (sellTotal >= 15000) {
          setTimeout(() => triggerTieredHaptic(0.8), 100);
        }
      }
      // Buy-confirmation feedback — Total Cost punch + cash-register sound
      // + a Medium impact haptic so a purchase actually feels like one.
      if (mode === 'Buy') {
        totalCostPunch.value = withSequence(
          withTiming(1.3, { duration: 120 }),
          withTiming(1, { duration: 220 })
        );
        playCashRegister();
        triggerTieredHaptic(0.5);
      }
      doConfirm();
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    onClose();
  };

  // Pulse animation when scoring step advances
  useEffect(() => {
    if (scoringActive && scoringStep >= 0) {
      pulseScale.setValue(1);
      RNAnimated.sequence([
        RNAnimated.timing(pulseScale, {
          toValue: 1.35,
          duration: 150,
          useNativeDriver: true,
        }),
        RNAnimated.timing(pulseScale, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [scoringStep, scoringActive]);

  // Reset state when modal visibility changes
  useEffect(() => {
    if (visible) {
      setIsClosing(false);
      setScoringActive(false);
      setScoringStep(-1);
      setScoringDone(false);
      skipRef.current = false;
      clearSequenceTimers();
      totalPunch.value = 1;
      runningTotalPunch.value = 1;
      modalExit.value = 0;
      iconScales.forEach((sv) => {
        sv.value = 1;
      });
      // Hide the climaxExplosion until the next sale's climax sets a scale.
      // Without this reset, reopening the modal would re-mount the SparkEffect
      // (whose initial `useEffect` always kicks off a burst) and the
      // explosion would replay on every modal open.
      setClimaxExplosionScale(null);
      // Same idea for the sellButtonSpark dispersal — reset to 0 so the
      // burst doesn't auto-fire on next open. Also re-enable the ambient
      // sparks so they restart fresh on each modal open.
      setSellButtonBurstTrigger(0);
      setSellButtonSparkActive(true);
    }
  }, [
    visible,
    clearSequenceTimers,
    totalPunch,
    runningTotalPunch,
    modalExit,
    iconScales,
  ]);

  const changeMode = (newMode: 'Buy' | 'Sell') => {
    const newMaxQuantity =
      newMode === 'Buy' ? clampedMaxBuyQuantity : clampedMaxSellQuantity;

    // Update mode first
    setMode(newMode);

    // Set to 0 temporarily, then to max - this "wakes up" the slider
    setQuantity(0);
    requestAnimationFrame(() => {
      setQuantity(newMaxQuantity);
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    SoundEffects.playRandomPop();
  };

  const handleSliderChange = (value: number) => {
    // Prevent slider updates if modal is closing
    if (isClosing) return;

    // Ensure quantity is at least 1 (since minimumValue is 1)
    setQuantity(Math.max(1, Math.round(value)));
  };

  const handleSliderComplete = (value: number) => {
    // Trigger haptic feedback only when slider is released (not on every drag)
    if (!isClosing) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Sell value for tier-based styling. Read the raw number directly —
  // parseFloat(pocketValue) was broken because formatCurrency adds commas
  // ("1,234.50" → parseFloat = 1), zeroing out numSparks for every real sale.
  const sellValue =
    mode === 'Sell' ? (saleResult?.totalGain ?? candy.cost * quantity) : 0;

  // sellButtonSpark — ambient sparks rising behind the Sell button. count +
  // colors come from a granular tier lookup (computeSparkScale; no runtime
  // math beyond a single table walk).
  const sellButtonSpark = computeSparkScale(sellValue);

  // Sell-button border color matches the sellButtonSpark palette starting at
  // the gold tier ($3000+, the emerald stop). Below that, keep the muted
  // green default so the button doesn't look colored when there's nothing
  // worth celebrating.
  const buttonBorderColor =
    sellValue >= 3000 && sellButtonSpark.colors.length > 0
      ? (sellButtonSpark.colors[0] ?? 'rgba(123,169,101,1)')
      : sellValue >= 1000
        ? '#4caf50'
        : 'rgba(123,169,101,1)';

  const buttonBackgroundColor =
    sellValue >= 20000
      ? 'rgba(0, 102, 255,1)'
      : sellValue >= 15000
        ? 'rgba(0, 204, 204, 1)'
        : sellValue >= 10000
          ? 'rgba(0, 255, 204, 1)'
          : sellValue >= 5000
            ? 'rgba(0, 255, 153,1)'
            : sellValue >= 2000
              ? 'rgba(46, 204, 113,1)'
              : sellValue >= 1000
                ? 'rgba(76, 175, 80,1)'
                : 'rgba(154,193,118,1)';

  // Final total (Phase 4) renders from finalTotalTarget state directly —
  // React Native's <Text> has no native `text` prop, so the previous
  // AnimatedText + useAnimatedMoney pattern silently failed and on Android
  // produced native setNativeProps errors that could crash the app.

  // Reanimated styles
  const totalPunchStyle = useAnimatedStyle(() => ({
    transform: [{ scale: totalPunch.value }],
  }));
  const runningTotalPunchStyle = useAnimatedStyle(() => ({
    transform: [{ scale: runningTotalPunch.value }],
  }));
  const totalCostPunchStyle = useAnimatedStyle(() => ({
    transform: [{ scale: totalCostPunch.value }],
  }));
  const modalExitStyle = useAnimatedStyle(() => ({
    opacity: 1 - modalExit.value,
    transform: [{ translateY: modalExit.value * 20 }],
  }));

  // Per-icon animated styles (bounded at 16)
  const iconStyle0 = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale0.value }],
  }));
  const iconStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale1.value }],
  }));
  const iconStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale2.value }],
  }));
  const iconStyle3 = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale3.value }],
  }));
  const iconStyle4 = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale4.value }],
  }));
  const iconStyle5 = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale5.value }],
  }));
  const iconStyle6 = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale6.value }],
  }));
  const iconStyle7 = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale7.value }],
  }));
  const iconStyle8 = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale8.value }],
  }));
  const iconStyle9 = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale9.value }],
  }));
  const iconStyle10 = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale10.value }],
  }));
  const iconStyle11 = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale11.value }],
  }));
  const iconStyle12 = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale12.value }],
  }));
  const iconStyle13 = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale13.value }],
  }));
  const iconStyle14 = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale14.value }],
  }));
  const iconStyle15 = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale15.value }],
  }));
  const iconStylesMemo = useMemo(
    () => [
      iconStyle0,
      iconStyle1,
      iconStyle2,
      iconStyle3,
      iconStyle4,
      iconStyle5,
      iconStyle6,
      iconStyle7,
      iconStyle8,
      iconStyle9,
      iconStyle10,
      iconStyle11,
      iconStyle12,
      iconStyle13,
      iconStyle14,
      iconStyle15,
    ],
    [
      iconStyle0,
      iconStyle1,
      iconStyle2,
      iconStyle3,
      iconStyle4,
      iconStyle5,
      iconStyle6,
      iconStyle7,
      iconStyle8,
      iconStyle9,
      iconStyle10,
      iconStyle11,
      iconStyle12,
      iconStyle13,
      iconStyle14,
      iconStyle15,
    ]
  );

  // -------- Breakdown derived values (hoisted out of the JSX IIFE) --------
  // Computed every render but cheap (small arrays, simple math). Falls back
  // to safe empty/zero values when not in sell mode or saleResult is null.
  // Skip the breakdown on loss sales: saleCalculations short-circuits to
  // `currentPrice × quantity` and no joker effects apply, so the breakdown
  // would just show empty sections (+$0.00 / x1.0) — not informative.
  const showBreakdown =
    !!saleResult &&
    mode === 'Sell' &&
    candy.averagePrice !== null &&
    candy.cost > candy.averagePrice;
  const boosts = saleResult
    ? saleResult.bonusBreakdown.filter((b) => b.flatBonus && b.flatBonus > 0)
    : [];
  const mults = saleResult
    ? saleResult.bonusBreakdown.filter((b) => b.multiplier > 1 && !b.flatBonus)
    : [];
  const baseProfit = saleResult?.totalProfit ?? 0;
  const totalBoostAmount = boosts.reduce(
    (sum, b) => sum + (b.flatBonus ?? 0),
    0
  );
  // animatedProfit starts at baseProfit and increments by each boost's
  // flatBonus, so (animatedProfit - baseProfit) is the running boost total.
  const displayBoost = scoringActive
    ? Math.max(0, animatedProfit - baseProfit)
    : totalBoostAmount;
  const displayMult = scoringActive
    ? animatedMult
    : (saleResult?.jokerMultiplier ?? 1);
  const displayProfit = scoringActive
    ? animatedProfit
    : baseProfit + totalBoostAmount;
  const displayTotal = saleResult
    ? scoringActive
      ? scoringDone
        ? saleResult.totalGain
        : displayProfit * displayMult + saleResult.purchaseValue
      : saleResult.totalGain
    : 0;
  const activeBonus =
    scoringActive && scoringStep >= 0 && scoringStep < scoringSteps.length
      ? scoringSteps[scoringStep]
      : null;
  const isActiveBonus = (bonus: { name: string; emoji: string }) =>
    activeBonus?.name === bonus.name && activeBonus?.emoji === bonus.emoji;

  // One row = icon + name + value. The icon ref is on a tight inner View so
  // measureInWindow returns a snug center for the cascade arc trajectory.
  // When `collapsed` is true, render an icon-only cell for the horizontal row.
  const renderRow = (
    bonus: (typeof boosts)[0],
    i: number,
    prefix: string,
    globalIndex: number,
    isMult: boolean,
    collapsed: boolean = false
  ) => {
    const iconSource = JOKER_ICON_BY_NAME[bonus.name];
    const isActive = isActiveBonus(bonus);
    const iconKey = `${bonus.name}-${globalIndex}`;
    const scaleStyle =
      iconStylesMemo[Math.min(globalIndex, iconStylesMemo.length - 1)];
    const activeGlow =
      isActive && scoringActive
        ? {
            shadowColor: '#ffd54a',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 16,
            elevation: 14,
          }
        : undefined;
    const valueText = isMult
      ? `x${bonus.multiplier.toFixed(1)}`
      : `+$${formatCurrency(bonus.flatBonus ?? 0)}`;
    const valueColor = isMult ? '#d97706' : colors.green.success;

    const iconElement = iconSource ? (
      <Image source={iconSource} style={styles.receiptIcon} />
    ) : (
      <TextWithEmojis style={{ fontSize: 14 }} imageSize={18}>
        {bonus.emoji}
      </TextWithEmojis>
    );

    if (collapsed) {
      // Compact cell for the horizontal icon row. Existing per-icon scale/glow
      // animation in runScoringAnimation still drives this — measureInWindow on
      // jokerIconRefs[iconKey] continues to work the same way.
      return (
        <Animated.View
          key={`${prefix}-${i}`}
          style={[scaleStyle, activeGlow, { marginRight: 8 }]}
          collapsable={false}
        >
          <View
            ref={(ref) => {
              jokerIconRefs.current[iconKey] = ref;
            }}
            collapsable={false}
          >
            {iconElement}
          </View>
        </Animated.View>
      );
    }

    return (
      <View key={`${prefix}-${i}`} style={styles.jokerBreakdownRow}>
        <Animated.View
          style={[scaleStyle, activeGlow, { marginRight: 8 }]}
          collapsable={false}
        >
          <View
            ref={(ref) => {
              jokerIconRefs.current[iconKey] = ref;
            }}
            collapsable={false}
          >
            {iconElement}
          </View>
        </Animated.View>
        <Text
          style={styles.jokerBreakdownName}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {bonus.name}
        </Text>
        <Text style={[styles.jokerBreakdownValue, { color: valueColor }]}>
          {valueText}
        </Text>
      </View>
    );
  };

  return (
    <FastModal
      visible={visible}
      onClose={undefined}
      animationType="spring"
      backdropOpacity={0.6}
      modalStyle={{ ...styles.modalWrapper, maxHeight: modalMaxHeight }}
    >
      <View style={styles.modalRoot}>
        <PixelBorder
          borderColor={'#cc7a00'}
          borderWidth={3}
          backgroundColor={colors.gold.beige}
          innerPadding={0}
        >
          <Animated.View
            style={[
              styles.container,
              isTutorialModal && { overflow: 'visible' },
              modalExitStyle,
            ]}
          >
            {/* Tutorial dim overlay */}
            {isTutorialModal && (
              <View style={styles.tutorialDimOverlay} pointerEvents="none" />
            )}
            {/* Skip-to-finish overlay — only during scoring, above everything */}
            {scoringActive && !scoringDone && (
              <Pressable
                style={styles.skipOverlay}
                onPress={skipToFinish}
                accessible={false}
              />
            )}

            <PixelBorder
              borderColor="#e5e7eb"
              borderWidth={3}
              backgroundColor="#ffffff"
              innerPadding={0}
              style={{ marginBottom: 8 }}
            >
              <View style={styles.priceInfoContainer}>
                <View style={styles.priceRow}>
                  <Text style={{ ...styles.priceValue, fontSize: 20 }}>
                    {candy.name}
                  </Text>
                </View>

                {/* Sell mode only: avg purchase + base profit. Buy mode hides
                  these per the redesign — quantityOwned is already conveyed
                  by the slider's max value. */}
                {mode === 'Sell' && candy.averagePrice !== null && (
                  <>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>avg purchase price</Text>
                      <Text style={[styles.priceValue]}>
                        ${formatCurrency(candy.averagePrice)}
                      </Text>
                    </View>
                  </>
                )}
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>current price</Text>
                  {(() => {
                    const isPositive = candy.cost > (candy.averagePrice ?? 0);
                    return (
                      <Text
                        style={[
                          styles.priceValue,
                          { color: isPositive ? '#22c55e' : '#ef4444' },
                        ]}
                      >
                        ${formatCurrency(candy.cost)}
                      </Text>
                    );
                  })()}
                </View>
                {mode === 'Sell' && candy.averagePrice !== null && (
                  <>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>you pocket</Text>
                      {(() => {
                        const baseProfit = candy.cost * quantity;
                        const isPositive = candy.cost > candy.averagePrice;
                        return (
                          <Text
                            style={[
                              styles.priceValue,
                              {
                                color: isPositive
                                  ? '#22c55e'
                                  : colors.brown.secondary,
                              },
                            ]}
                          >
                            +$
                            {formatCurrency(Math.abs(baseProfit))}
                          </Text>
                        );
                      })()}
                    </View>
                  </>
                )}
              </View>
            </PixelBorder>

            {/* Sale breakdown — sell mode only.
              Layout: aggregate header rows + per-joker rows under each, all
              inside a height-capped ScrollView so many jokers don't push the
              "You Pocket" + footer off-screen. The cascade animates each
              joker's icon (bounce + glow) and ticks the section aggregates;
              "You Pocket" gets the climax burst. */}
            {showBreakdown && (
              <PixelBorder
                borderColor="#fde047"
                borderWidth={3}
                backgroundColor="#fef3c7"
                innerPadding={0}
              >
                <View style={styles.priceBreakdownContainer}>
                  {/* Fixed-height wrapper around the ScrollView. `overflow:
                      hidden` is the load-bearing rule — without it, the
                      ScrollView's overflowing rows render past the wrapper
                      and visually overlap the slider section below.
                      `height` on the ScrollView alone is treated as a hint
                      on some platforms; the wrapper makes the cap firm. */}
                  <View
                    style={{
                      height: breakdownScrollHeight,
                      overflow: 'hidden',
                    }}
                  >
                    <ScrollView
                      style={{ flex: 1 }}
                      showsVerticalScrollIndicator={false}
                    >
                      {/* profit boost section */}
                      <Pressable
                        onPress={() =>
                          tutorialDispatch(toggleTxnProfitBoostCollapsed())
                        }
                        style={styles.receiptRow}
                        hitSlop={8}
                      >
                        <View style={styles.breakdownLabelGroup}>
                          <Text style={styles.collapseChevron}>
                            {profitBoostCollapsed ? '▶' : '▼'}
                          </Text>
                          <Text style={styles.breakdownLabel}>
                            profit boost
                          </Text>
                        </View>
                        <View
                          ref={profitBoostValueRef}
                          collapsable={false}
                          style={{
                            opacity:
                              !profitBoostCollapsed || scoringActive ? 1 : 0,
                          }}
                        >
                          <Text
                            style={[
                              styles.breakdownValue,
                              { color: colors.green.success },
                            ]}
                          >
                            +${formatCurrency(displayBoost)}
                          </Text>
                        </View>
                      </Pressable>
                      {profitBoostCollapsed ? (
                        boosts.length > 0 && (
                          <View style={styles.collapsedIconRow}>
                            {boosts.map((b, i) =>
                              renderRow(b, i, 'b', i, false, true)
                            )}
                          </View>
                        )
                      ) : (
                        boosts.map((b, i) => renderRow(b, i, 'b', i, false))
                      )}

                      {/* multiplier section */}
                      <Pressable
                        onPress={() =>
                          tutorialDispatch(toggleTxnMultiplierCollapsed())
                        }
                        style={[styles.receiptRow, { marginTop: 8 }]}
                        hitSlop={8}
                      >
                        <View style={styles.breakdownLabelGroup}>
                          <Text style={styles.collapseChevron}>
                            {multiplierCollapsed ? '▶' : '▼'}
                          </Text>
                          <Text style={styles.breakdownLabel}>multiplier</Text>
                        </View>
                        <Animated.View
                          ref={multValueRef}
                          style={[
                            runningTotalPunchStyle,
                            {
                              opacity:
                                !multiplierCollapsed || scoringActive ? 1 : 0,
                            },
                          ]}
                          collapsable={false}
                        >
                          <Text
                            style={[
                              styles.breakdownValue,
                              { color: '#d97706' },
                            ]}
                          >
                            x{displayMult.toFixed(1)}
                          </Text>
                        </Animated.View>
                      </Pressable>
                      {multiplierCollapsed ? (
                        mults.length > 0 && (
                          <View style={styles.collapsedIconRow}>
                            {mults.map((b, i) =>
                              renderRow(
                                b,
                                i,
                                'm',
                                boosts.length + i,
                                true,
                                true
                              )
                            )}
                          </View>
                        )
                      ) : (
                        mults.map((b, i) =>
                          renderRow(b, i, 'm', boosts.length + i, true)
                        )
                      )}
                    </ScrollView>
                  </View>

                  {/* You Pocket */}
                  <View
                    style={{
                      ...styles.receiptRow,
                      borderTopColor: colors.brown.primary,
                      borderTopWidth: 2,
                      paddingTop: 2,
                    }}
                  >
                    <Text style={styles.finalPriceLabel}>Grand Total</Text>
                    <Animated.View
                      ref={totalDisplayRef}
                      style={[totalPunchStyle, { overflow: 'visible' }]}
                      collapsable={false}
                      onLayout={(e) => {
                        const { width, height } = e.nativeEvent.layout;
                        setTotalDisplaySize({ width, height });
                      }}
                    >
                      {/* climaxExplosion — centered on the total Text. count
                          + colors come from computeSparkScale (granular tier
                          lookup keyed by sale value). */}
                      {climaxExplosionScale && totalDisplaySize.width > 0 && (
                        <View
                          pointerEvents="none"
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: totalDisplaySize.width,
                            height: totalDisplaySize.height,
                            overflow: 'visible',
                          }}
                        >
                          <SparkEffect
                            mode="burst"
                            numSparks={climaxExplosionScale.climaxCount}
                            sparkColors={climaxExplosionScale.colors}
                            origin={{
                              x: totalDisplaySize.width / 2,
                              y: totalDisplaySize.height / 2,
                            }}
                            trigger={climaxExplosionTrigger}
                            imageSource={require('../../assets/images/emojis/candy.png')}
                          />
                        </View>
                      )}
                      {scoringActive && scoringDone ? (
                        <Text style={styles.finalPriceValue}>
                          ${formatCurrency(finalTotalTarget)}
                        </Text>
                      ) : (
                        <Text style={styles.finalPriceValue}>
                          ${formatCurrency(displayTotal)}
                        </Text>
                      )}
                    </Animated.View>
                  </View>
                </View>
              </PixelBorder>
            )}

            <View style={styles.sliderSection}>
              <Text style={styles.quantityLabel}>
                {mode === 'Buy' && maxQuantity <= 0
                  ? playerBalance !== undefined && playerBalance < candy.cost
                    ? 'Not Enough Money'
                    : availableInventorySpace !== undefined &&
                        availableInventorySpace <= 0
                      ? 'Inventory Full'
                      : 'Cannot Buy'
                  : `Quantity: ${quantity} / ${maxQuantity}`}
              </Text>

              {mode === 'Buy' ? (
                maxQuantity > 0 ? (
                  <Slider
                    key={`buy-${maxQuantity}`}
                    style={styles.sliderStyle}
                    minimumValue={0}
                    maximumValue={maxQuantity}
                    step={1}
                    value={Math.max(0, Math.min(quantity, maxQuantity))}
                    onValueChange={handleSliderChange}
                    onSlidingComplete={handleSliderComplete}
                    minimumTrackTintColor="#ef4444"
                    maximumTrackTintColor="#ccc"
                  />
                ) : (
                  <Slider
                    key="buy-disabled"
                    style={styles.sliderStyle}
                    minimumValue={0}
                    maximumValue={1}
                    step={1}
                    value={0}
                    onValueChange={() => {}}
                    minimumTrackTintColor="#ef4444"
                    maximumTrackTintColor="#ccc"
                    disabled={true}
                  />
                )
              ) : maxQuantity > 0 ? (
                <Slider
                  key={`sell-${maxQuantity}`}
                  style={styles.sliderStyle}
                  minimumValue={10000}
                  maximumValue={10000 + maxQuantity}
                  step={1}
                  value={10000 + Math.max(0, Math.min(quantity, maxQuantity))}
                  onValueChange={(value) => handleSliderChange(value - 10000)}
                  onSlidingComplete={(value) =>
                    handleSliderComplete(value - 10000)
                  }
                  minimumTrackTintColor="#4ade80"
                  maximumTrackTintColor="#ccc"
                />
              ) : (
                <Slider
                  key="sell-disabled"
                  style={styles.sliderStyle}
                  minimumValue={10000}
                  maximumValue={10001}
                  step={1}
                  value={10000}
                  onValueChange={() => {}}
                  minimumTrackTintColor="#4ade80"
                  maximumTrackTintColor="#ccc"
                  disabled={true}
                />
              )}
              {/* Hide tabs during tutorial: step 4 = buy only, step 7 = sell only */}
              {tutorialStep !== 4 && tutorialStep !== 7 && (
                <View style={styles.tabContainer}>
                  <PixelBorder
                    borderColor={mode === 'Buy' ? '#cc7a00' : '#e5e7eb'}
                    borderWidth={3}
                    backgroundColor={mode === 'Buy' ? '#ffcc99' : '#f3f4f6'}
                    style={{ flex: 1, marginRight: 6 }}
                  >
                    <TouchableOpacity
                      style={styles.tab}
                      onPress={() => changeMode('Buy')}
                    >
                      <Text style={styles.tabText}>Buy</Text>
                    </TouchableOpacity>
                  </PixelBorder>
                  <PixelBorder
                    borderColor={mode === 'Sell' ? '#cc7a00' : '#e5e7eb'}
                    borderWidth={3}
                    backgroundColor={mode === 'Sell' ? '#ffcc99' : '#f3f4f6'}
                    style={{ flex: 1 }}
                  >
                    <TouchableOpacity
                      style={styles.tab}
                      onPress={() => {
                        changeMode('Sell');
                      }}
                    >
                      <Text style={styles.tabText}>Sell</Text>
                    </TouchableOpacity>
                  </PixelBorder>
                </View>
              )}
              {mode === 'Buy' ? (
                <PixelBorder
                  borderColor="#bae6fd"
                  borderWidth={2}
                  backgroundColor="#f0f9ff"
                  innerPadding={0}
                >
                  <View style={styles.totalValueContainer}>
                    <Text style={styles.totalValueLabel}>Total Cost:</Text>
                    <Animated.Text
                      style={[
                        styles.totalValueAmount,
                        { color: '#ef4444' },
                        totalCostPunchStyle,
                      ]}
                    >
                      ${formatCurrency(quantity * candy.cost)}
                    </Animated.Text>
                  </View>
                </PixelBorder>
              ) : (
                <PixelBorder
                  borderColor="#bae6fd"
                  borderWidth={2}
                  backgroundColor="#f0f9ff"
                  innerPadding={0}
                >
                  <View style={styles.totalValueContainer}>
                    <Text style={styles.totalValueLabel}>Total Value:</Text>
                    <Text
                      style={[styles.totalValueAmount, { color: '#22c55e' }]}
                    >
                      ${pocketValue}
                    </Text>
                  </View>
                </PixelBorder>
              )}

              {mode === 'Buy' && maxBuyQuantity === 0 && (
                <TextWithEmojis style={styles.warningText}>
                  {playerBalance !== undefined &&
                  availableInventorySpace !== undefined
                    ? playerBalance < candy.cost
                      ? "⚠️ You don't have enough money!"
                      : availableInventorySpace <= 0
                        ? '⚠️ Your stash is full!'
                        : "⚠️ You can't buy this item!"
                    : '⚠️ Your stash is full!'}
                </TextWithEmojis>
              )}
            </View>

            {/* Tutorial hint banner */}
            {(tutorialStep === 4 || tutorialStep === 7) && (
              <View
                style={[styles.tutorialHint, { zIndex: 10, elevation: 10 }]}
              >
                <Text style={styles.tutorialHintText}>
                  {tutorialStep === 4 && 'Smash that Buy button!'}
                  {tutorialStep === 7 &&
                    'Cash out! Hit Sell and watch the money roll in'}
                </Text>
              </View>
            )}

            {/* Bottom action — single full-width Confirm. Cancel is gone;
              the user closes via the X in the top-right corner. The Sell-mode
              spark layer still sits behind the button so the build-up effect
              and the dispersal-on-tap behavior are preserved. */}
            <View
              style={[
                styles.buttonRow,
                (tutorialStep === 4 || tutorialStep === 7) && {
                  zIndex: 10,
                  elevation: 10,
                },
              ]}
            >
              <View
                style={{ flex: 1, position: 'relative', overflow: 'visible' }}
              >
                {mode === 'Sell' &&
                  sellButtonSparkActive &&
                  sellButtonSpark.count > 0 && (
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 0,
                        elevation: 1,
                        overflow: 'visible',
                      }}
                    >
                      <SparkEffect
                        numSparks={sellButtonSpark.count}
                        sparkColors={sellButtonSpark.colors}
                        imageSource={sellButtonSpark.imageSource}
                        disperseTrigger={sellButtonBurstTrigger}
                      />
                    </View>
                  )}
                {/* Intrinsic content height — without a sibling Cancel button
                  in the row, `flex: 1` here would collapse to 0 because the
                  parent wrapper has no defined height. Let the Confirm text
                  + padding determine height; the wrapper's own `flex: 1`
                  still handles full-width fill. */}
                <PressableScale onPress={handleConfirm}>
                  <PressableButton
                    onPress={undefined}
                    shadowColor={
                      tutorialStep === 4 || tutorialStep === 7
                        ? '#FFD700'
                        : buttonBorderColor
                    }
                    shadowOffset={{ width: 0, height: 4 }}
                    shadowOpacity={0.5}
                    shadowRadius={5}
                    elevation={8}
                  >
                    <PixelBorder
                      borderColor={
                        tutorialStep === 4 || tutorialStep === 7
                          ? '#FFD700'
                          : buttonBorderColor
                      }
                      borderWidth={
                        tutorialStep === 4 || tutorialStep === 7 ? 4 : 3
                      }
                      backgroundColor={buttonBackgroundColor}
                      innerPadding={0}
                      style={{ overflow: 'visible' }}
                    >
                      <View style={styles.confirmButton}>
                        <Text style={styles.confirmButtonText}>Confirm</Text>
                      </View>
                    </PixelBorder>
                  </PressableButton>
                </PressableScale>
              </View>
            </View>
          </Animated.View>
        </PixelBorder>
        {/* X close button — sibling of the outer PixelBorder so it can be
            positioned with negative offsets to overlap the modal's
            top-right corner (50% above top, 50% past right edge). Uses
            PixelBorder for the bordered look matching the inner containers. */}
        <View style={styles.closeButtonWrapper} pointerEvents="box-none">
          <PressableScale onPress={handleClose}>
            <PixelBorder
              borderColor="rgba(185,28,28,1)"
              borderWidth={3}
              backgroundColor="rgba(239,68,68,1)"
              innerPadding={0}
            >
              <View style={styles.closeButtonInner}>
                <Text style={styles.closeButtonText}>×</Text>
              </View>
            </PixelBorder>
          </PressableScale>
        </View>
      </View>
    </FastModal>
  );
}

const MemoizedTransactionModal = React.memo(TransactionModal);
export default MemoizedTransactionModal;

const styles = StyleSheet.create({
  modalWrapper: {
    shadowColor: colors.brown.secondary,
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    borderRadius: 30,
    elevation: 8,
    minWidth: '90%',
    // Transparent override: FastModal's `styles.modal` paints a white bg
    // that, on some platforms, ends up taller than the inner PixelBorder
    // and shows through as empty space below the content. With transparent
    // here, the only visible surface is the yellow PixelBorder, which
    // sizes precisely to its content.
    backgroundColor: 'transparent',
    // overflow:visible lets the close-button corner sticker extend past
    // the rounded edge (otherwise borderRadius + Android elevation clips it).
    overflow: 'visible',
  },
  modalRoot: {
    position: 'relative',
    overflow: 'visible',
  },
  container: {
    padding: 16,
    alignItems: 'stretch',
    fontFamily: 'PixeloidMono',
  },
  priceInfoContainer: {
    padding: 12,
    marginVertical: 2,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  priceLabel: {
    fontSize: 16,
    color: colors.brown.primary,
    fontFamily: 'PixeloidMono',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.brown.secondary,
    fontFamily: 'PixeloidMono',
  },
  sliderSection: {
    paddingVertical: 8,
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: '600',
    alignSelf: 'center',
    color: colors.brown.secondary,
    backgroundColor: '#fff9e6',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f4d03f',
    fontFamily: 'PixeloidMono',
  },
  sliderStyle: {
    width: '100%',
    height: 20,
    marginBottom: 8,
  },
  totalValueContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  totalValueLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brown.primary,
    fontFamily: 'PixeloidMono',
    marginRight: 8,
  },
  totalValueAmount: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
  },
  buttonRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    // Allow sellButtonSpark to extend above the row (over the Total Value
    // PixelBorder). Without this, Android can clip particles at the row edge.
    overflow: 'visible',
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 16,
    justifyContent: 'center',
    gap: 10,
  },
  tab: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  tabText: {
    color: colors.brown.secondary,
    fontWeight: '700',
    fontSize: 14,
    fontFamily: 'PixeloidMono',
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  receiptIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  priceBreakdownContainer: {
    padding: 12,
    marginVertical: 4,
    flexDirection: 'column',
    gap: 4,
  },
  breakdownLabel: {
    fontSize: 14,
    color: colors.brown.primary,
    fontFamily: 'PixeloidMono',
    fontWeight: '600',
  },
  breakdownLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  collapseChevron: {
    fontSize: 10,
    color: colors.brown.primary,
    width: 12,
    fontFamily: 'PixeloidMono',
  },
  collapsedIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingVertical: 4,
    paddingLeft: 18,
    rowGap: 6,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brown.secondary,
    fontFamily: 'PixeloidMono',
  },
  finalPriceLabel: {
    paddingTop: 4,
    fontSize: 16,
    color: colors.brown.primary,
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
  },
  finalPriceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.green.success,
    fontFamily: 'PixeloidMono',
  },
  warningText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  tutorialDimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 5,
    elevation: 5,
    borderRadius: 8,
  },
  skipOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 20,
    elevation: 20,
  },
  tutorialHint: {
    backgroundColor: '#1a1a2e',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 10,
  },
  tutorialHintText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  closeButtonWrapper: {
    position: 'absolute',
    // Negative offsets place the button's CENTER on the modal's top-right
    // corner — half above the top edge, half past the right edge. With a
    // 44×44 button, top:-22, right:-22 nails the corner.
    top: -18,
    right: -18,
    // Above normal content; below the skipOverlay (zIndex 20) so taps during
    // the cascade route to skip-to-finish before reaching close.
    zIndex: 15,
    elevation: 15,
  },
  closeButtonInner: {
    // 40×40 inner + 2px PixelBorder margin per side = 44×44 outer.
    // Matches the closeButtonWrapper's -22 offset so the button's center
    // lands3exactly on the modal's top-right corner.
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  closeButtonText: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
    lineHeight: 24,
  },
  jokerBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingLeft: 12,
  },
  jokerBreakdownName: {
    flex: 1,
    fontSize: 13,
    color: colors.brown.primary,
    fontFamily: 'PixeloidMono',
    fontWeight: '600',
  },
  jokerBreakdownValue: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
  },
  confirmButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    backgroundColor: 'transparent',
    position: 'relative',
    overflow: 'visible',
  },
  confirmButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
    zIndex: 10,
  },
});
