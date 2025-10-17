import seedrandom from 'seedrandom';

// Image mapping to resolve references at runtime
const getBackgroundImage = (imageType: string) => {
  const imageMap = {
    pricedrop: require('../assets/images/pricedrop.png'),
    bully: require('../assets/images/bully.png'),
    foundmoney: require('../assets/images/foundmoney.png'),
    pricehike: require('../assets/images/pricehike.png'),
    confiscate: require('../assets/images/confiscate.png'),
  };
  return (
    imageMap[imageType as keyof typeof imageMap] ||
    require('../assets/images/react-logo.png')
  );
};

export type CandyPriceTable = Record<string, number[]>;
export type JokerDraft = { day: number; subject: string; jokers: string[] };

export type SpecialEventEffect = {
  period: number;
  effect:
    | 'PRICE_DROP'
    | 'PRICE_SPIKE'
    | 'FOUND_MONEY'
    | 'LOSE_MONEY'
    | 'STASH_LOCKED';

  // Common properties
  hint: string; // Text shown in period before
  isUniversal: boolean; // True = period-only trigger, False = location+period trigger
  location?: string; // Required if isUniversal=false
  isGuaranteedEvent?: boolean; // True = shown at day start, no period hints

  // Major event properties (FOUND_MONEY, LOSE_MONEY, STASH_LOCKED)
  category?: 'good' | 'neutral' | 'bad';
  heading?: string; // Modal heading
  title?: string; // Modal title
  subtitle?: string; // Modal subtitle
  backgroundImage?: any; // Modal background
  dismissText?: string; // Modal button text
  dollarAmount?: number; // For money events

  // Minor event properties (PRICE_SPIKE, PRICE_DROP)
  candy?: string; // Which candy is affected
  multiplier?: number; // Price multiplier
  flavorText?: string; // Text shown when triggered (no modal)

  // Legacy (for compatibility)
  description?: string;
  priceOverride?: number;
};

// [minPrice, maxPrice, floorPrice]
const candyBasePrices: Record<string, [number, number, number]> = {
  Snickers: [1.5, 2.0, 0.55],
  'M&Ms': [2.0, 3.5, 2.35],
  Skittles: [1, 2.25, 3.2],
  Warheads: [0.5, 1.0, 4.15],
  'Sour Patch Kids': [1.8, 3.0, 1.3],
  'Bubble Gum': [0.1, 0.5, 0.05],
  'Jaw Breaker': [3, 5, 4.5],
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

// Locations (for event generation only - excludes special locations like 'the connect')
const locations = [
  'gym',
  'cafeteria',
  'home room',
  'library',
  'science lab',
  'school yard',
  'bathroom',
] as const;

// Actor pools for major events
const teachers = ['Mrs. Johnson', 'Mr. Smith', 'The Principal', 'The Dean'];
const bullies = ['A bully', 'The lunch thief', 'Some tough kid'];
const foundMoneySubjects = ['Somebody', 'A student', 'Someone'];

// Hint templates for major events (5 variations each)
const stashLockedHints = [
  (teacher: string, loc?: string) =>
    `👀 ${teacher} heard about your stash and is looking for you${loc ? ` in the ${loc}` : ''} 👀`,
  (teacher: string, loc?: string) =>
    `👀 ${teacher} is doing inspections${loc ? ` in the ${loc}` : ''} 👀`,
  (teacher: string, loc?: string) =>
    `👀 Word is ${teacher} is cracking down${loc ? ` in the ${loc}` : ''} 👀`,
  (teacher: string, loc?: string) =>
    `👀 ${teacher} has been tipped off and is searching${loc ? ` ${loc}` : ''} 👀`,
  (teacher: string, loc?: string) =>
    `👀 Heads up! ${teacher} is on a confiscation spree${loc ? ` in the ${loc}` : ''} 👀`,
];

const loseMoneyHints = [
  (bully: string, loc?: string) =>
    `👀 ${bully} is hungry and has no lunch money, he's looking for you${loc ? ` in the ${loc}` : ''} 👀`,
  (bully: string, loc?: string) =>
    `👀 ${bully} is shaking kids down${loc ? ` in the ${loc}` : ''} 👀`,
  (bully: string, loc?: string) =>
    `👀 Watch out! ${bully} is hunting for cash${loc ? ` in the ${loc}` : ''} 👀`,
  (bully: string, loc?: string) =>
    `👀 ${bully} is broke and looking for victims${loc ? ` in the ${loc}` : ''} 👀`,
  (bully: string, loc?: string) =>
    `👀 ${bully} needs money and he's prowling${loc ? ` ${loc}` : ''} 👀`,
];

const foundMoneyHints = [
  (subject: string, loc?: string) =>
    `👀 ${subject} lost some money${loc ? ` in the ${loc}` : ''} 👀`,
  (subject: string, loc?: string) =>
    `👀 Word is there's cash lying around${loc ? ` in the ${loc}` : ''} 👀`,
  (subject: string, loc?: string) =>
    `👀 ${subject} dropped their wallet${loc ? ` in the ${loc}` : ''} 👀`,
  (subject: string, loc?: string) =>
    `👀 I heard ${subject} lost a wad of cash${loc ? ` in the ${loc}` : ''} 👀`,
  (subject: string, loc?: string) =>
    `👀 There's money on the ground${loc ? ` in the ${loc}` : ''} apparently 👀`,
];

// Modal title templates (5 variations each - no location)
const stashLockedTitles = [
  (teacher: string) => `${teacher} confiscated your stash!`,
  (teacher: string) => `Your candy was found by ${teacher}!`,
  (teacher: string) => `${teacher} busted you!`,
  (teacher: string) => `Caught by ${teacher}!`,
  (teacher: string) => `${teacher} took everything!`,
];

const loseMoneyTitles = [
  (bully: string) => `${bully} took your lunch money!`,
  (bully: string) => `Robbed by ${bully}!`,
  (bully: string) => `${bully} shook you down!`,
  (bully: string) => `${bully} emptied your pockets!`,
  (bully: string) => `You got jumped by ${bully}!`,
];

const foundMoneyTitles = [
  () => 'You found some cash!',
  () => 'Money on the ground!',
  () => 'Easy money!',
  () => 'Jackpot!',
  () => 'Finders keepers!',
];

// Modal subtitle templates (5 variations each)
const stashLockedSubtitles = [
  'Sometimes it be your own teachers... Your inventory has been cleared!',
  'All your candy is gone. Time to rebuild.',
  'Confiscated! Better luck hiding it next time.',
  'Your entrepreneurial empire just took a hit.',
  'Clean sweep! Your stash is history.',
];

const loseMoneySubtitles = [
  'Better hit the weights to get your weight up!',
  'Half your money is gone. Stay alert out there.',
  'That hurt. Keep your head on a swivel.',
  'Lesson learned: watch your back.',
  'Ouch. Time to earn it back.',
];

const foundMoneySubtitles = [
  'Street rules: Finders Keepers!',
  'Your lucky day! Cha-ching!',
  "Score! Someone's loss is your gain.",
  'Nothing like free money.',
  "Today's your day!",
];

export function generateSeededGameData(seed: string, totalPeriods = 40, difficultyLevel?: number) {
  const rng = seedrandom(seed);

  // Helper to pick random from array (supports both mutable and readonly arrays)
  const pickRandom = <T,>(arr: readonly T[]): T =>
    arr[Math.floor(rng() * arr.length)];

  // For difficulty level > 3, shuffle price ranges between candies
  let basePrices = { ...candyBasePrices };

  if (difficultyLevel && difficultyLevel > 3) {
    console.log('🎲 Difficulty > 3 detected: Shuffling candy price ranges');

    // Extract candy names and price ranges separately
    const candyNames = Object.keys(candyBasePrices);
    const priceRanges = Object.values(candyBasePrices);

    // Fisher-Yates shuffle using seeded RNG for reproducibility
    for (let i = priceRanges.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [priceRanges[i], priceRanges[j]] = [priceRanges[j], priceRanges[i]];
    }

    // Rebuild basePrices with shuffled ranges
    basePrices = {};
    candyNames.forEach((name, index) => {
      basePrices[name] = priceRanges[index];
      console.log(`🍬 ${name}: [${priceRanges[index][0]}, ${priceRanges[index][1]}]`);
    });
  }

  // Price table (0-indexed: periods 0-39 for internal array indexing)
  const candyPrices: CandyPriceTable = {};
  Object.entries(basePrices).forEach(
    ([candy, [min, max, _unusedFloorPrice]]) => {
      candyPrices[candy] = Array.from({ length: totalPeriods }, () => {
        const maxSpikePrice = max * 14;
        const floorPrice = Math.max(maxSpikePrice * 0.03, 0.01);
        const price = rng() * (maxSpikePrice - floorPrice) + floorPrice;
        return parseFloat(price.toFixed(2));
      });
    }
  );

  const periodEvents: SpecialEventEffect[] = [];
  const numDays = Math.floor(totalPeriods / 8); // 5 days

  // Generate events for each day
  for (let day = 0; day < numDays; day++) {
    const dayStartPeriod = day * 8 + 1; // 1, 9, 17, 25, 33

    // Available periods (exclude first period of each day)
    const availablePeriods = Array.from(
      { length: 7 },
      (_, i) => dayStartPeriod + 1 + i
    ); // 2-8, 10-16, etc.

    // Decide number of major events (1-3)
    const numMajorEvents = Math.floor(rng() * 3) + 1; // 1, 2, or 3

    // Decide if one major event is universal (50% chance)
    const hasUniversalEvent = rng() < 0.5 && numMajorEvents > 0;

    // Decide number of minor events (0-3)
    const numMinorEvents = Math.floor(rng() * 4); // 0, 1, 2, or 3

    // Total events for this day
    const totalEventsThisDay = numMajorEvents + numMinorEvents;

    // Shuffle available periods
    const shuffledPeriods = [...availablePeriods];
    for (let i = shuffledPeriods.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffledPeriods[i], shuffledPeriods[j]] = [
        shuffledPeriods[j],
        shuffledPeriods[i],
      ];
    }

    // Select periods for events (ensure no overlap)
    const selectedPeriods = shuffledPeriods.slice(
      0,
      Math.min(totalEventsThisDay, shuffledPeriods.length)
    );

    let eventIndex = 0;

    // Generate major events
    for (
      let i = 0;
      i < numMajorEvents && eventIndex < selectedPeriods.length;
      i++
    ) {
      const period = selectedPeriods[eventIndex++];
      const isUniversal = hasUniversalEvent && i === 0; // First major event can be universal
      const location = isUniversal ? undefined : pickRandom(locations);

      // Pick random major event type
      const majorEventTypes = [
        'STASH_LOCKED',
        'LOSE_MONEY',
        'FOUND_MONEY',
      ] as const;
      const eventType = pickRandom(majorEventTypes);

      let event: SpecialEventEffect;

      if (eventType === 'STASH_LOCKED') {
        const teacher = pickRandom(teachers);
        const hintTemplate = pickRandom(stashLockedHints);
        const titleTemplate = pickRandom(stashLockedTitles);
        const subtitle = pickRandom(stashLockedSubtitles);

        event = {
          period,
          effect: 'STASH_LOCKED',
          isUniversal,
          location,
          hint: hintTemplate(teacher, location),
          category: 'bad',
          heading: 'BUSTED!',
          title: titleTemplate(teacher),
          subtitle,
          backgroundImage: getBackgroundImage('confiscate'),
          dismissText: '😤 Dang it!',
        };
      } else if (eventType === 'LOSE_MONEY') {
        const bully = pickRandom(bullies);
        const hintTemplate = pickRandom(loseMoneyHints);
        const titleTemplate = pickRandom(loseMoneyTitles);
        const subtitle = pickRandom(loseMoneySubtitles);

        event = {
          period,
          effect: 'LOSE_MONEY',
          isUniversal,
          location,
          hint: hintTemplate(bully, location),
          category: 'bad',
          heading: 'Robbed!',
          title: titleTemplate(bully),
          subtitle,
          backgroundImage: getBackgroundImage('bully'),
        };
      } else {
        // FOUND_MONEY
        const subject = pickRandom(foundMoneySubjects);
        const hintTemplate = pickRandom(foundMoneyHints);
        const titleTemplate = pickRandom(foundMoneyTitles);
        const subtitle = pickRandom(foundMoneySubtitles);
        const amount = Math.floor(rng() * 401) + 100; // 100-500

        event = {
          period,
          effect: 'FOUND_MONEY',
          isUniversal,
          location,
          hint: hintTemplate(subject, location),
          category: 'good',
          heading: 'Lucky!',
          title: titleTemplate(),
          subtitle,
          dollarAmount: amount,
          backgroundImage: getBackgroundImage('foundmoney'),
        };
      }

      periodEvents.push(event);
      console.log(
        `📅 Day ${day + 1}, Period ${period}: ${eventType} (${isUniversal ? 'Universal' : location})`
      );
    }

    // Generate minor events (price changes)
    const candies = Object.keys(candyBasePrices);
    for (
      let i = 0;
      i < numMinorEvents && eventIndex < selectedPeriods.length;
      i++
    ) {
      const period = selectedPeriods[eventIndex++];
      const location = pickRandom(locations);
      const candy = pickRandom(candies);

      // Pick spike or drop
      const isSpike = rng() < 0.5;
      const effect = isSpike ? 'PRICE_SPIKE' : 'PRICE_DROP';
      const multiplier = isSpike ? 5 : 0.2;
      const verb = isSpike ? 'spike' : 'drop';
      const verbPresent = isSpike ? 'spiking' : 'dropping';

      const event: SpecialEventEffect = {
        period,
        effect,
        isUniversal: false,
        location,
        candy,
        multiplier,
        hint: `${candy} is going to ${verb} in ${location}`,
        flavorText: `${candy} is ${verbPresent} in ${location}`,
        category: 'neutral',
      };

      periodEvents.push(event);
      console.log(
        `📅 Day ${day + 1}, Period ${period}: ${effect} - ${candy} in ${location}`
      );
    }
  }

  // Generate guaranteed unavoidable events (0-1 bully, 0-1 stash lock)
  // These events happen on days 2-5 (not day 1) and are always universal
  const guaranteedBully = rng() < 0.5; // 50% chance
  const guaranteedStashLock = rng() < 0.5; // 50% chance

  if (guaranteedBully) {
    // Pick a random day from 2-5 (days 1-4 in 0-indexed)
    const dayIndex = Math.floor(rng() * 4) + 1; // 1, 2, 3, or 4
    const dayStartPeriod = dayIndex * 8 + 1;
    // Pick a random period from that day (2-8 within the day)
    const periodOffset = Math.floor(rng() * 7) + 1; // 1-7
    const period = dayStartPeriod + periodOffset;

    const bully = pickRandom(bullies);
    const titleTemplate = pickRandom(loseMoneyTitles);
    const subtitle = pickRandom(loseMoneySubtitles);

    const guaranteedBullyEvent: SpecialEventEffect = {
      period,
      effect: 'LOSE_MONEY',
      isUniversal: true,
      isGuaranteedEvent: true,
      hint: `🚨 ${bully} said he's going to find you today no matter what! 🚨`,
      category: 'bad',
      heading: 'Robbed!',
      title: titleTemplate(bully),
      subtitle,
      backgroundImage: getBackgroundImage('bully'),
    };

    periodEvents.push(guaranteedBullyEvent);
    console.log(`🎯 Guaranteed bully event added on Day ${dayIndex + 1}, Period ${period}`);
  }

  if (guaranteedStashLock) {
    // Pick a random day from 2-5 (days 1-4 in 0-indexed)
    const dayIndex = Math.floor(rng() * 4) + 1; // 1, 2, 3, or 4
    const dayStartPeriod = dayIndex * 8 + 1;
    // Pick a random period from that day (2-8 within the day)
    const periodOffset = Math.floor(rng() * 7) + 1; // 1-7
    const period = dayStartPeriod + periodOffset;

    const teacher = pickRandom(teachers);
    const titleTemplate = pickRandom(stashLockedTitles);
    const subtitle = pickRandom(stashLockedSubtitles);

    const guaranteedStashEvent: SpecialEventEffect = {
      period,
      effect: 'STASH_LOCKED',
      isUniversal: true,
      isGuaranteedEvent: true,
      hint: `🚨 ${teacher} caught wind of your operation and wants to speak with you today! 🚨`,
      category: 'bad',
      heading: 'BUSTED!',
      title: titleTemplate(teacher),
      subtitle,
      backgroundImage: getBackgroundImage('confiscate'),
      dismissText: '😤 Dang it!',
    };

    periodEvents.push(guaranteedStashEvent);
    console.log(`🎯 Guaranteed stash lock event added on Day ${dayIndex + 1}, Period ${period}`);
  }

  console.log(`📊 Total events generated: ${periodEvents.length}`);
  console.log(
    `   Major events: ${periodEvents.filter((e) => ['STASH_LOCKED', 'LOSE_MONEY', 'FOUND_MONEY'].includes(e.effect)).length}`
  );
  console.log(
    `   Minor events: ${periodEvents.filter((e) => ['PRICE_SPIKE', 'PRICE_DROP'].includes(e.effect)).length}`
  );

  // Pre-calculate event prices for hybrid lookup
  const eventPrices: Record<
    number,
    Record<string, Record<string, number>>
  > = {};

  periodEvents.forEach((event) => {
    if (event.candy && event.multiplier !== undefined) {
      const period = event.period - 1; // Convert to 0-indexed
      const location = event.location || 'any';

      if (!eventPrices[period]) {
        eventPrices[period] = {};
      }
      if (!eventPrices[period][location]) {
        eventPrices[period][location] = {};
      }

      const basePrice = candyPrices[event.candy][period];
      let finalPrice = basePrice * event.multiplier;

      // Apply caps
      if (event.effect === 'PRICE_SPIKE') {
        finalPrice = Math.min(finalPrice, 100);
      } else if (event.effect === 'PRICE_DROP') {
        finalPrice = Math.max(finalPrice, 0.01);
      }

      eventPrices[period][location][event.candy] = parseFloat(
        finalPrice.toFixed(2)
      );
    }
  });

  return {
    candyPrices,
    periodEvents,
    eventPrices,
    totalPeriods,
  };
}
