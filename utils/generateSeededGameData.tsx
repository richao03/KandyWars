import seedrandom from 'seedrandom';

export type CandyPriceTable = Record<string, number[]>;
export type JokerDraft = { day: number; subject: string; jokers: string[] };

export type SpecialEventEffect = {
  period: number;
  description?: string;
  candy?: string;
  effect:
    | 'PRICE_DROP'
    | 'PRICE_SPIKE'
    | 'resale_bonus'
    | 'STASH_LOCKED'
    | 'FOUND_MONEY'
    | 'LOSE_MONEY';
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
  category: 'good' | 'neutral' | 'bad';
  heading: string;
  title: string;
  subtitle: string;
  dollarAmount?: number;
  backgroundImage: any;
  dismissText?: string;
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
      category: 'neutral',
      multiplier: 0.2,
      location: 'cafeteria',
      heading: 'Hot Sale!',
      title: 'Snickers flood the market!',
      subtitle: 'How did the new kid have so many snickers?',
      hint: '👀 Theres rumbling that the vending machine in cafeteria is giving out cheap snickers...👀',
      backgroundImage: require('../assets/images/pricedrop.png'),
    }),
    () => ({
      description: 'Bullying is an epidemic',
      effect: 'LOSE_MONEY',
      category: 'bad',
      heading: 'Give me your lunch money!',
      title: 'A bully took half your money',
      subtitle: 'Better hit the weights to get your weight up!',
      hint: '👀 Rumor is someone is out looking for you....👀',
      backgroundImage: require('../assets/images/bully.png'),
    }),
    () => ({
      description: 'Found some money!',
      effect: 'FOUND_MONEY',
      location: 'home room',
      category: 'good',
      heading: 'Lucky!',
      title: 'You found some money laying around!',
      subtitle: 'Street rules: Finders Keepers',
      dollarAmount: 50,
      hint: '👀 Someone said they left some money in the homeroom... 👀',
      backgroundImage: require('../assets/images/foundmoney.png'),
    }),
    () => ({
      description: 'Skittles are popular in the school yard!',
      candy: 'Skittles',
      effect: 'PRICE_SPIKE',
      multiplier: 5,
      location: 'school yard',
      category: 'neutral',
      heading: 'Hut Hut Price HIKE!!',
      title: 'Skittles prices rockets!',
      subtitle:
        'The football player wants to eat Skittles like their fravorite NFL running back',
      backgroundImage: require('../assets/images/pricehike.png'),
      hint: '👀 psst, come to the school yard next period... make sure you bring skittles... lots of them... 👀',
    }),
    () => ({
      effect: 'STASH_LOCKED',
      location: 'home room',
      category: 'bad',
      heading: '🚨 BUSTED!',
      title: 'Your candy inventory has been confiscated!',
      subtitle: 'Sometimes it be your own teachers...',
      backgroundImage: require('../assets/images/confiscate.png'),
      dismissText: '😤 Dang it!',
      hint: '👀 The dean is making rounds confiscating any and all candies, better avoid the home room next period... 👀',
    }),
    () => ({
      description: 'Science lab experiment creates demand for Warheads!',
      candy: 'Warheads',
      effect: 'PRICE_SPIKE',
      multiplier: 5,
      location: 'science lab',
      category: 'neutral',
      heading: 'ICBM to the moon!',
      title: 'The jolt they need',
      subtitle:
        'Our lab friends are falling asleep, this spike of sour sugar is just what they need',
      backgroundImage: require('../assets/images/pricehike.png'),
      hint: "👀 The lab folks can use some Warhead wake-me-ups next period, and they're willing to pay... 👀",
    }),
    () => ({
      description: 'Bubble Gum chewing contest in the library!',
      candy: 'Bubble Gum',
      effect: 'PRICE_SPIKE',
      multiplier: 4,
      location: 'library',
      category: 'neutral',
      heading: 'Pop Off!',
      title: 'Bubble Gum demand explodes!',
      subtitle: 'Who can blow the biggest bubble? Everyone’s buying in!',
      backgroundImage: require('../assets/images/pricehike.png'),
      hint: '👀 Heard the library is hosting a “silent” bubble blowing contest next period... bring gum! 👀',
    }),
    () => ({
      description: 'Teacher gives out free M&Ms in class!',
      candy: 'M&Ms',
      effect: 'PRICE_DROP',
      multiplier: 0.3,
      location: 'home room',
      category: 'neutral',
      heading: 'Too Many M&Ms!',
      title: 'Candy rains from above!',
      subtitle: 'The teacher brought a giant bag... now the price is tanking!',
      backgroundImage: require('../assets/images/pricedrop.png'),
      hint: '👀 M&Ms are falling into everyone’s hands in homeroom... 👀',
    }),
    () => ({
      description: 'Someone drops their lunch money in the hallway!',
      effect: 'FOUND_MONEY',
      category: 'good',
      heading: 'Jackpot!',
      title: 'Cash on the floor!',
      subtitle: 'Quick pocket move, nobody saw a thing.',
      dollarAmount: 40,
      backgroundImage: require('../assets/images/foundmoney.png'),
      hint: '👀 There’s a commotion in the hallway... someone’s missing cash. 👀',
    }),

    () => ({
      description: 'Sour Patch Kids banned in gym class!',
      candy: 'Sour Patch Kids',
      effect: 'PRICE_DROP',
      multiplier: 0.5,
      location: 'gym',
      category: 'bad',
      heading: 'Coach Says No!',
      title: 'Candy ban after sticky shoes incident!',
      subtitle: 'The floor’s still sticky... prices plummet!',
      backgroundImage: require('../assets/images/pricedrop.png'),
      hint: '👀 Coach is confiscating Sour Patch at the gym doors... 👀',
    }),

    () => ({
      description: 'Bathroom Skittle Project!',
      candy: 'Skittles',
      effect: 'PRICE_SPIKE',
      multiplier: 3.5,
      location: 'bathroom',
      category: 'neutral',
      heading: 'Sweet Colors!',
      title: 'Artists paying top dollar!',
      subtitle: 'Skittles aren’t just for eating — they’re for painting!',
      backgroundImage: require('../assets/images/pricehike.png'),
      hint: '👀 Bathroom is buying Skittles for some “non-edible” art next period... 👀',
    }),

    () => ({
      description: 'Student Council fundraiser in cafeteria!',
      candy: 'Snickers',
      effect: 'PRICE_SPIKE',
      multiplier: 2.5,
      location: 'cafeteria',
      category: 'neutral',
      heading: 'Snack for a Cause!',
      title: 'Buy candy, fund the trip!',
      subtitle: 'Suddenly, Snickers are selling like crazy.',
      backgroundImage: require('../assets/images/pricehike.png'),
      hint: '👀 The student council’s hoarding Snickers for the bake sale next period... 👀',
    }),
    () => ({
      description: 'Principal checks lockers during lunch!',
      effect: 'STASH_LOCKED',
      category: 'bad',
      heading: '🔒 Locker Check!',
      title: 'Your stash is confiscated',
      subtitle: 'Your stash was in the wrong place at the wrong time.',
      backgroundImage: require('../assets/images/confiscate.png'),
      dismissText: '😩 Busted again!',
      hint: '👀 Principal’s patrolling lockers this lunch period... 👀',
    }),
    () => ({
      description: 'Library study group wants brain food!',
      candy: 'M&Ms',
      effect: 'PRICE_SPIKE',
      multiplier: 4,
      category: 'neutral',
      location: 'library',
      heading: 'M&M Trending',
      title: '"The Finer Things Club"',
      subtitle:
        '"M&Ms goes perfectly with out afternoon juice" - a club member',
      backgroundImage: require('../assets/images/pricehike.png'),
      hint: '👀 Theres a secret club M&Meeting in the library next period... 👀',
    }),

    // General events without location requirements
    () => {
      const candies = Object.keys(candyBasePrices);
      const randomCandy = candies[Math.floor(rng() * candies.length)];
      return {
        description: `Rare batch of ${randomCandy} released!`,
        candy: randomCandy,
        effect: 'PRICE_SPIKE' as const,
        multiplier: 5,
        category: 'neutral',
        heading: `Price Hike!!`,
        title: `${randomCandy} is like so hot right now!`,
        subtitle: `People cant get enough of it`,
        backgroundImage: require('../assets/images/pricehike.png'),
        hint: '👀 Psst, I cannot tell you what, or where, but something is going to happen ... 👀',
      };
    },
  ];

  const periodEvents: SpecialEventEffect[] = [];

  // Always add the test event for library period 3 cheap gum
  periodEvents.push({
    period: 2,
    description: 'Bullying is an epidemic',
    effect: 'LOSE_MONEY',
    category: 'bad',
    heading: 'Give me your lunch money!',
    title: 'A bully took all your money',
    subtitle: 'Better hit the weights to get your weight up!',
    hint: '👀 Rumor is someone is out looking for you....👀',
    backgroundImage: require('../assets/images/bully.png'),
  });

  // periodEvents.push({
  //   period: 2,
  //   description: 'Found some money!',
  //   effect: 'FOUND_MONEY',
  //   location: 'home room',
  //   category: 'good',
  //   heading: '🍀 Lucky!',
  //   title: 'You found some money laying around!',
  //   dollarAmount: 50,
  //   subtitle: 'Street rules: Finders Keepers',
  //   hint: '👀 Someone said they left some money in the homeroom... 👀',
  //   backgroundImage: require('../assets/images/foundmoney.png'),
  // });
  periodEvents.push({
    period: 2,
    description: 'Skittles are popular in the school yard!',
    candy: 'Skittles',
    effect: 'PRICE_SPIKE',
    multiplier: 5,
    category: 'neutral',
    heading: 'Hut Hut Price HIKE!!',
    title: 'Skittles price rockets!',
    subtitle:
      'The football team wants to eat Skittles like their fravorite NFL running back',
    backgroundImage: require('../assets/images/pricehike.png'),
    hint: '👀 psst, come to the school yard next period... make sure you bring skittles... lots of them... 👀',
  });

  // Generate 10-15 random events
  const targetEventCount = Math.floor(rng() * 6) + 10; // 10-15 events
  const availablePeriods = Array.from(
    { length: totalPeriods },
    (_, i) => i
  ).filter((period) => !periodEvents.some((e) => e.period === period));

  // Shuffle available periods
  for (let i = availablePeriods.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [availablePeriods[i], availablePeriods[j]] = [
      availablePeriods[j],
      availablePeriods[i],
    ];
  }

  // Generate events for the first targetEventCount periods
  for (
    let i = 0;
    i < Math.min(targetEventCount, availablePeriods.length);
    i++
  ) {
    const period = availablePeriods[i];
    const template = eventTemplates[Math.floor(rng() * eventTemplates.length)];
    const event = { ...template(), period };

    // Only add generic hint for events without location if they don't have one
    if (!event.location && !event.hint && period > 0) {
      event.hint = `You overhear students talking about something happening next period...`;
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
