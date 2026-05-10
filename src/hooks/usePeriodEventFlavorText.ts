import { useEffect, useMemo, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useFlavorText } from '../context/FlavorTextContext';
import { useEventHandler } from './useEventHandler';
import { useGame } from './useGame';
import { useHustle } from './useHustle';
import { useJokers } from './useJokers';
import { useSeed } from './useSeed';
import { useAppSelector } from '../store/hooks';
import {
  getPeriodsPerDay,
  selectMediumCandiesUnlocked,
  selectBigCandiesUnlocked,
} from '../store/slices/gameSlice';
import { selectActiveQuest } from '../store/slices/questSlice';
import { getCandyDefinition } from '../constants/candyRegistry';
import { JokerService } from '../utils/jokerService';

/**
 * Drives the period-event detection, hint rolls, and flavor-text selection
 * that runs once per period change. Debounced 50ms to avoid firing during
 * rapid navigation. Gated by `isFocused` so a zombie market instance on a
 * background tab cannot double-trigger events.
 *
 * Called as a side-effect hook: `usePeriodEventFlavorText()`.
 */
export function usePeriodEventFlavorText(): void {
  const isFocused = useIsFocused();
  const { setEvent, setFlavorText, setHint } = useFlavorText();
  const { handleEvent } = useEventHandler();
  const { periodCount, currentLocation, period, day } = useGame();
  const periodsPerDay = useAppSelector(getPeriodsPerDay);
  const { jokers, activeEffects } = useJokers();
  const { activeHustles } = useHustle();
  const activeQuest = useAppSelector(selectActiveQuest);
  const mediumUnlocked = useAppSelector(selectMediumCandiesUnlocked);
  const bigUnlocked = useAppSelector(selectBigCandiesUnlocked);
  const { gameData } = useSeed();

  const jokerService = useMemo(() => JokerService.getInstance(), []);

  const lastEventPeriodRef = useRef<number>(-1);
  const lastHintPeriodRef = useRef<number>(-1);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    const timeoutId = setTimeout(() => {
      // Pre-generated period events and hustles can both name candies that the
      // player has not unlocked yet. The price-effect for those events still
      // applies to a hidden tier (harmless), but the marquee/modal text would
      // confusingly reference candies the player can't see, so we filter them
      // out at display time.
      const isCandyAccessible = (candyName?: string): boolean => {
        if (!candyName) return true;
        const def = getCandyDefinition(candyName);
        if (!def) return true;
        if (def.size === 'small') return true;
        if (def.size === 'medium') return mediumUnlocked;
        if (def.size === 'big') return bigUnlocked;
        return true;
      };

      // Universal events fire anywhere; location-based events only at matching location.
      // periodCount is 0-indexed (0-39), but event periods are 1-indexed (1-40).
      const currentEventRaw = gameData.periodEvents.find(
        (e: any) =>
          e.period === periodCount + 1 &&
          (e.isUniversal || e.location === currentLocation)
      );
      const currentEvent =
        currentEventRaw && isCandyAccessible(currentEventRaw.candy)
          ? currentEventRaw
          : undefined;

      const nextPeriodEvents = gameData.periodEvents.filter(
        (e: any) => e.period === periodCount + 2 && isCandyAccessible(e.candy)
      );

      const hustleRumors = activeHustles
        .filter((h) => isCandyAccessible(h.candyName))
        .map(
          (h) =>
            `A kid in the ${h.location} wants ${h.quantity} ${h.candyName} by period ${h.period}. Says he's got something good...`
        );

      // Suppress the quest hint if the quest names a candy the player can't currently access.
      const questHint =
        activeQuest &&
        !activeQuest.completed &&
        day === activeQuest.day &&
        isCandyAccessible(activeQuest.candyName)
          ? `A student needs you to hold ${activeQuest.quantity} ${activeQuest.candyName} until period ${activeQuest.targetPeriod}. Sell them then for a reward!`
          : null;

      const allRumors = [...hustleRumors];
      if (questHint) allRumors.push(questHint);

      if (period === 0) {
        setEvent('NEW_DAY');
        if (allRumors.length > 0) {
          setTimeout(() => {
            setHint(allRumors.join('  ---  '));
          }, 3000);
        }
      } else if (currentEvent) {
        setEvent(currentEvent.effect);

        if (lastEventPeriodRef.current !== periodCount) {
          lastEventPeriodRef.current = periodCount;

          if (
            currentEvent.effect === 'PRICE_SPIKE' ||
            currentEvent.effect === 'PRICE_DROP'
          ) {
            setFlavorText(currentEvent.flavorText || '');
          } else {
            handleEvent(currentEvent);
          }
        }
      } else if (nextPeriodEvents.length > 0) {
        if (lastHintPeriodRef.current !== periodCount) {
          lastHintPeriodRef.current = periodCount;

          const baseHintChance = 0.7;
          const effectiveHintChance = jokerService.applyJokerEffects(
            baseHintChance,
            'hint_chance',
            jokers,
            periodCount,
            baseHintChance,
            undefined,
            activeEffects,
            periodsPerDay
          );

          if (Math.random() < effectiveHintChance) {
            const allHints = nextPeriodEvents
              .map((e: any) => e.hint)
              .filter((h: string | undefined) => h)
              .join('\n\n');
            setHint(allHints);
          } else if (allRumors.length > 0) {
            setHint(allRumors.join('  ---  '));
          } else {
            if (period <= 2) {
              setEvent('MORNING_TRADE');
            } else if (
              period >= Math.floor(periodsPerDay / 2) &&
              period <= Math.ceil(periodsPerDay * 0.75)
            ) {
              setEvent('LUNCH_RUSH');
            } else if (period === periodsPerDay) {
              setEvent('FINAL_PERIOD');
            } else {
              setEvent('PERIOD_CHANGE');
            }
          }
        }
      } else if (allRumors.length > 0) {
        setHint(allRumors.join('  ---  '));
      } else {
        if (period <= 2) {
          setEvent('MORNING_TRADE');
        } else if (
          period >= Math.floor(periodsPerDay / 2) &&
          period <= Math.ceil(periodsPerDay * 0.75)
        ) {
          setEvent('LUNCH_RUSH');
        } else if (period === periodsPerDay) {
          setEvent('FINAL_PERIOD');
        } else {
          setEvent('PERIOD_CHANGE');
        }
      }
    }, 50);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps match the original monolithic effect in market.tsx; handleEvent/jokerService are stable refs and excluded to avoid extra reruns
  }, [
    isFocused,
    periodCount,
    currentLocation,
    gameData.periodEvents,
    setEvent,
    setFlavorText,
    setHint,
    jokers,
    activeEffects,
    period,
    periodsPerDay,
    activeHustles,
    activeQuest,
    day,
    mediumUnlocked,
    bigUnlocked,
  ]);
}
