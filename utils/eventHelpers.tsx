import { SpecialEventEffect } from './generateSeededGameData';

export function applyPriceModifiers(
  candy: string,
  basePrice: number,
  period: number,
  events: SpecialEventEffect[]
): number {
  const event = events.find(e => e.period === period && e.candy === candy);
  if (!event || !event.multiplier) return basePrice;

  if (event.effect === 'discount' || event.effect === 'markup') {
    return parseFloat((basePrice * event.multiplier).toFixed(2));
  }

  return basePrice;
}
