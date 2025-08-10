import seedrandom from 'seedrandom';

export type CandyPriceTable = Record<string, number[]>;
export type JokerDraft = { day: number; subject: string; jokers: string[] };

export type SpecialEventEffect = {
  period: number;
  description: string;
  candy?: string;
  effect: 'PRICE_DROP' | 'PRICE_SPIKE' | 'resale_bonus' | 'STASH_LOCKED';
  multiplier?: number;
  location?:
    | 'gym'
    | 'cafeteria'
    | 'home room'
    | 'library'
    | 'science lab'
    | 'school yard'
    | 'bathroom';
  priceOverride?: number; // For setting specific prices like 0.01
  hint?: string; // Hint to show in previous period

  // Modal display properties
  category?: 'good' | 'neutral' | 'bad';
  heading?: string;
  title?: string;
  subtitle?: string;
  backgroundImage?: any;
  dismissText?: string;
  callback?: () => void;
};

const candyBasePrices: Record<string, [number, number]> = {
  Snickers: [1.5, 3.0],
  'M&Ms': [1.0, 2.5],
  Skittles: [0.75, 2.25],
  Warheads: [0.25, 1.0],
  'Sour Patch Kids': [1.0, 2.75],
  'Bubble Gum': [0.1, 0.5],
};

const subjects = [
  'Math',
  'Science',
  'History',
  'Art',
  'Gym',
  'Music',
  'English',
  'Geography',
];
const allJokers = [
  'Compounder',
  'Addict',
  'Predictor',
  'Trader',
  'Flashback',
  'Deal With It',
  'Collector',
  'Scout',
  'Hoarder',
  'Sneak',
];

export function generateSeededGameData(seed: string, totalPeriods = 40) {
  const rng = seedrandom(seed);

  // Price table
  const candyPrices: CandyPriceTable = {};
  Object.entries(candyBasePrices).forEach(([candy, [min, max]]) => {
    candyPrices[candy] = Array.from({ length: totalPeriods }, () => {
      const roll = rng();
      let price: number;

      if (roll < 0.1) {
        // Crash event (super cheap)
        const crashFactor = rng() * 0.4 + 0.1; // 0.1x–0.5x min
        price = min * crashFactor;
      } else if (roll < 0.2) {
        // Spike event (super expensive)
        const spikeFactor = rng() * 10 + 4; // 4x–8x max
        price = max * spikeFactor;
      } else {
        // Aggressive normal range
        const low = min * 0.5;
        const high = max * 10;
        price = rng() * (high - low) + low;
      }

      return parseFloat(price.toFixed(2));
    });
  });

  // Special events with location-specific events
  const locations = [
    'gym',
    'cafeteria',
    'home room',
    'library',
    'science lab',
    'school yard',
    'bathroom',
  ] as const;

  const eventTemplates: (() => Omit<SpecialEventEffect, 'period'>)[] = [
    () => ({
      description: 'Snickers discount at the vending machine!',
      candy: 'Snickers',
      effect: 'PRICE_DROP',
      multiplier: 0.2,
      location: 'cafeteria',
      hint: '👀 Theres rumbling that the vending machine in cafeteria is giving out cheap snickers...👀',
    }),
    () => ({
      description: 'Gum resale value doubled in the gym!',
      candy: 'Bubble Gum',
      effect: 'resale_bonus',
      multiplier: 5,
      location: 'gym',
      hint: "👀 There's a bubble blowing contest in the gym next period, people will PAY for some gum...👀",
    }),
    () => ({
      description: 'Skittles are popular in the school yard!',
      candy: 'Skittles',
      effect: 'PRICE_SPIKE',
      multiplier: 5,
      location: 'school yard',
      hint: '👀 psst, come to the school yard next period... make sure you bring skittles... lots of them... 👀',
    }),
    () => ({
      description: 'Teacher confiscated stash in home room!',
      effect: 'STASH_LOCKED',
      location: 'home room',
      hint: '👀 The dean is making round confiscating any and all candies, better avoid the home room next period... 👀',
    }),
    () => ({
      description: 'Science lab experiment creates demand for Warheads!',
      candy: 'Warheads',
      effect: 'PRICE_SPIKE',
      multiplier: 5,
      location: 'science lab',
      hint: "👀 The lab folks can use some Warhead wake-me-ups next period, and they're willing to pay... 👀",
    }),
    () => ({
      description: 'Library study group wants brain food!',
      candy: 'M&Ms',
      effect: 'PRICE_SPIKE',
      multiplier: 4,
      location: 'library',
      hint: "👀 The Finer Things Club is meeting in the library next period, they'll want some classy M&M's to go with their tea 👀",
    }),
    () => ({
      description: 'Bathroom black market deals going down!',
      candy: 'Sour Patch Kids',
      effect: 'resale_bonus',
      multiplier: 0.2,
      location: 'bathroom',
      hint: "👀 Someone found a case of Sour Patch Kids, and they are selling it dirt cheap in the bathroom... if you're ok with that... 👀 ",
    }),
    // General events without location requirements
    () => {
      const candies = Object.keys(candyBasePrices);
      const randomCandy = candies[Math.floor(rng() * candies.length)];
      return {
        description: `Rare batch of ${randomCandy} released!`,
        candy: randomCandy,
        effect: 'PRICE_SPIKE' as const,
        multiplier: 1.5,
      };
    },
  ];

  const periodEvents: SpecialEventEffect[] = [];

  // Always add the test event for library period 3 cheap gum
  periodEvents.push({
    period: 3,
    description: 'Library study group desperate for gum!',
    candy: 'Bubble Gum',
    effect: 'PRICE_DROP',
    location: 'library',
    priceOverride: 0.01,
    hint: '👀 You hear whispers about students needing gum for the study session at the library next period...👀',
  });

  // Generate 10-15 random events
  const targetEventCount = Math.floor(rng() * 6) + 10; // 10-15 events
  const availablePeriods = Array.from({ length: totalPeriods }, (_, i) => i)
    .filter((period) => !periodEvents.some((e) => e.period === period));
  
  // Shuffle available periods
  for (let i = availablePeriods.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [availablePeriods[i], availablePeriods[j]] = [availablePeriods[j], availablePeriods[i]];
  }

  // Generate events for the first targetEventCount periods
  for (let i = 0; i < Math.min(targetEventCount, availablePeriods.length); i++) {
    const period = availablePeriods[i];
    const template = eventTemplates[Math.floor(rng() * eventTemplates.length)];
    const event = { ...template(), period };

    // Randomly assign location if template doesn't have one
    if (!event.location && rng() < 0.7) {
      // 70% chance to be location-specific
      event.location = locations[Math.floor(rng() * locations.length)];

      // Generate hint for previous period
      if (period > 0) {
        event.hint = `You overhear students talking about something happening at the ${event.location} next period...`;
      }
    }

    periodEvents.push(event);
  }

  // Joker drafts
  const jokerDrafts: JokerDraft[] = [];
  for (let day = 0; day < totalPeriods / 8; day++) {
    const jokers = Array.from(
      new Set(
        Array.from(
          { length: 3 },
          () => allJokers[Math.floor(rng() * allJokers.length)]
        )
      )
    );
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
