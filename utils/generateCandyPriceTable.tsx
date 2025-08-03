
import seedrandom from 'seedrandom';

export type Candy = {
  name: string;
  baseMin: number;
  baseMax: number;
};

type PriceTable = {
  [candyName: string]: number[];
};

export function generateCandyPriceTable(
  seed: string,
  candies: Candy[],
  periods: number = 40
): PriceTable {
  const rng = seedrandom(seed);
  const priceTable: PriceTable = {};

  for (const candy of candies) {
    const prices: number[] = [];

    for (let i = 0; i < periods; i++) {
      const roll = rng();
      const price = roll * (candy.baseMax - candy.baseMin) + candy.baseMin;
      prices.push(Number(price.toFixed(2)));
    }

    priceTable[candy.name] = prices;
  }

  return priceTable;
}
