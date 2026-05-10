import { SpecialEventEffect } from '../../utils/generateSeededGameData';
import { SimState } from './simState';

export const LOCATION_EVENT_HIT_RATE = 0.3;

export interface AppliedEventLog {
  period: number;
  effect: string;
  delta?: number;
  note?: string;
}

export function eventsForPeriod(events: SpecialEventEffect[], period: number): SpecialEventEffect[] {
  return events.filter((e) => e.period === period);
}

export function shouldApplyEvent(state: SimState, event: SpecialEventEffect): boolean {
  if (event.isUniversal || event.isGuaranteedEvent) return true;
  if (event.effect === 'PRICE_SPIKE' || event.effect === 'PRICE_DROP') return false;
  return state.rng() < LOCATION_EVENT_HIT_RATE;
}

export function applyEvent(state: SimState, event: SpecialEventEffect): AppliedEventLog | null {
  switch (event.effect) {
    case 'LOSE_MONEY': {
      const lost = state.balance * 0.5;
      state.balance -= lost;
      return { period: event.period, effect: 'LOSE_MONEY', delta: -lost };
    }
    case 'STASH_LOCKED': {
      const inventoryCount = state.inventory.reduce((sum, item) => sum + item.qty, 0);
      state.inventory = [];
      return {
        period: event.period,
        effect: 'STASH_LOCKED',
        note: `cleared ${inventoryCount} candies`,
      };
    }
    case 'FOUND_MONEY': {
      const amount = event.dollarAmount ?? 0;
      state.balance += amount;
      return { period: event.period, effect: 'FOUND_MONEY', delta: amount };
    }
    case 'PRICE_SPIKE':
    case 'PRICE_DROP':
      return null;
    default:
      return null;
  }
}

export function applyEventsForPeriod(
  state: SimState,
  events: SpecialEventEffect[],
  period: number,
): AppliedEventLog[] {
  const logs: AppliedEventLog[] = [];
  for (const event of eventsForPeriod(events, period)) {
    if (!shouldApplyEvent(state, event)) continue;
    const log = applyEvent(state, event);
    if (log) logs.push(log);
  }
  return logs;
}
