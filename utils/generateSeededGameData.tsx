import seedrandom from 'seedrandom';

export type CandyPriceTable = Record<string, number[]>;
export type JokerDraft = { day: number; subject: string; jokers: string[] };

export type SpecialEventEffect = {
  period: number;
  description: string;
  candy?: string;
  effect: 'PRICE_DROP' | 'PRICE_SPIKE' | 'resale_bonus' | 'STASH_LOCKED';
  multiplier?: number;
};

const candyBasePrices: Record<string, [number, number]> = {
  'Snickers': [1.5, 3.0],
  'M&Ms': [1.0, 2.5],
  'Skittles': [0.75, 2.25],
  'Warheads': [0.25, 1.0],
  'Sour Patch Kids': [1.0, 2.75],
  'Bubble Gum': [0.1, 0.5],
};

const subjects = ["Math", "Science", "History", "Art", "Gym", "Music", "English", "Geography"];
const allJokers = [
  "Compounder", "Addict", "Predictor", "Trader", "Flashback",
  "Deal With It", "Collector", "Scout", "Hoarder", "Sneak"
];

export function generateSeededGameData(seed: string, totalPeriods = 40) {
  const rng = seedrandom(seed);

  // Price table
  const candyPrices: CandyPriceTable = {};
  Object.entries(candyBasePrices).forEach(([candy, [min, max]]) => {
    candyPrices[candy] = Array.from({ length: totalPeriods }, () =>
      parseFloat((rng() * (max - min) + min).toFixed(2))
    );
  });

  // Special events
  const eventTemplates: (() => Omit<SpecialEventEffect, 'period'>)[] = [
    () => ({
      description: "Snickers discount!",
      candy: "Snickers",
      effect: "PRICE_DROP",
      multiplier: 0.5,
    }),
    () => ({
      description: "Gum resale value doubled!",
      candy: "Bubble Gum",
      effect: "resale_bonus",
      multiplier: 2,
    }),
    () => ({
      description: "Skittles prices skyrocketed!",
      candy: "Skittles",
      effect: "PRICE_SPIKE",
      multiplier: 2,
    }),
    () => ({
      description: "Stash locked due to surprise audit!",
      effect: "STASH_LOCKED"
    }),
    () => {
      const candies = Object.keys(candyBasePrices);
      const randomCandy = candies[Math.floor(rng() * candies.length)];
      return {
        description: `Rare batch of ${randomCandy} released!`,
        candy: randomCandy,
        effect: "markup",
        multiplier: 1.5,
      };
    }
  ];

  const periodEvents: SpecialEventEffect[] = [];
  for (let i = 0; i < totalPeriods; i++) {
    if (rng() < 0.1) {
      const template = eventTemplates[Math.floor(rng() * eventTemplates.length)];
      periodEvents.push({ ...template(), period: i });
    }
  }

  // Joker drafts
  const jokerDrafts: JokerDraft[] = [];
  for (let day = 0; day < totalPeriods / 8; day++) {
    const jokers = Array.from(new Set(
      Array.from({ length: 3 }, () => allJokers[Math.floor(rng() * allJokers.length)])
    ));
    jokerDrafts.push({
      day: day + 1,
      subject: subjects[Math.floor(rng() * subjects.length)],
      jokers,
    });
  }

  return {
    candyPrices,
    periodEvents,
    jokerDrafts,
    totalPeriods,
  };
}
