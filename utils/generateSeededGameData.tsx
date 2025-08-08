import seedrandom from 'seedrandom';

export type CandyPriceTable = Record<string, number[]>;
export type JokerDraft = { day: number; subject: string; jokers: string[] };

export type SpecialEventEffect = {
  period: number;
  description: string;
  candy?: string;
  effect: 'PRICE_DROP' | 'PRICE_SPIKE' | 'resale_bonus' | 'STASH_LOCKED';
  multiplier?: number;
  location?: 'gym' | 'cafeteria' | 'home room' | 'library' | 'science lab' | 'school yard' | 'bathroom';
  priceOverride?: number; // For setting specific prices like 0.01
  hint?: string; // Hint to show in previous period
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
  const locations = ['gym', 'cafeteria', 'home room', 'library', 'science lab', 'school yard', 'bathroom'] as const;
  
  const eventTemplates: (() => Omit<SpecialEventEffect, 'period'>)[] = [
    () => ({
      description: "Snickers discount at the vending machine!",
      candy: "Snickers",
      effect: "PRICE_DROP",
      multiplier: 0.5,
      location: "cafeteria"
    }),
    () => ({
      description: "Gum resale value doubled in the gym!",
      candy: "Bubble Gum",
      effect: "resale_bonus",
      multiplier: 2,
      location: "gym"
    }),
    () => ({
      description: "Skittles are popular in the school yard!",
      candy: "Skittles",
      effect: "PRICE_SPIKE",
      multiplier: 2,
      location: "school yard"
    }),
    () => ({
      description: "Teacher confiscated stash in home room!",
      effect: "STASH_LOCKED",
      location: "home room"
    }),
    () => ({
      description: "Science lab experiment creates demand for Warheads!",
      candy: "Warheads", 
      effect: "PRICE_SPIKE",
      multiplier: 1.8,
      location: "science lab"
    }),
    () => ({
      description: "Library study group wants brain food!",
      candy: "M&Ms",
      effect: "PRICE_SPIKE", 
      multiplier: 1.5,
      location: "library"
    }),
    () => ({
      description: "Bathroom black market deals going down!",
      candy: "Sour Patch Kids",
      effect: "resale_bonus",
      multiplier: 1.3,
      location: "bathroom"
    }),
    // General events without location requirements
    () => {
      const candies = Object.keys(candyBasePrices);
      const randomCandy = candies[Math.floor(rng() * candies.length)];
      return {
        description: `Rare batch of ${randomCandy} released!`,
        candy: randomCandy,
        effect: "PRICE_SPIKE" as const,
        multiplier: 1.5,
      };
    }
  ];

  const periodEvents: SpecialEventEffect[] = [];
  
  // Always add the test event for library period 3 cheap gum
  periodEvents.push({
    period: 3,
    description: "Library study group desperate for gum!",
    candy: "Bubble Gum",
    effect: "PRICE_DROP",
    location: "library",
    priceOverride: 0.01,
    hint: "You hear whispers about students needing gum for tomorrow's study session at the library..."
  });
  
  // Generate random events
  for (let i = 0; i < totalPeriods; i++) {
    if (rng() < 0.1 && !periodEvents.some(e => e.period === i)) { // Don't override existing events
      const template = eventTemplates[Math.floor(rng() * eventTemplates.length)];
      const event = { ...template(), period: i };
      
      // Randomly assign location if template doesn't have one
      if (!event.location && rng() < 0.7) { // 70% chance to be location-specific
        event.location = locations[Math.floor(rng() * locations.length)];
        
        // Generate hint for previous period
        if (i > 0) {
          event.hint = `You overhear students talking about something happening at the ${event.location} next period...`;
        }
      }
      
      periodEvents.push(event);
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
