import { Candy } from "@/app/types";

export function getRandomPrice(candy: Candy, rng: () => number): number {
  const { baseMin, baseMax } = candy;
  return Math.floor(rng() * (baseMax - baseMin + 1)) + baseMin;
}