export type TutorialStage =
  | 'day1_start'
  | 'day1_first_buy'
  | 'day1_first_sell'
  | 'day1_period3'
  | 'day2_start'
  | 'day2_joker'
  | 'day3_advanced';

export type TutorialStep = {
  id: string;
  title: string;
  description: string;
  target?: string;
  position?: 'top' | 'bottom' | 'center';
  character?: 'teacher' | 'student' | 'principal';
  zone?: number;
  borderRadius?: number;
  maskOffset?: number;
};

export type TutorialSequence = {
  id: string;
  stage: TutorialStage;
  name: string;
  steps: TutorialStep[];
  requiresCompletion?: string[];
  autoTrigger?: boolean;
};

export const PROGRESSIVE_TUTORIALS: Record<TutorialStage, TutorialSequence> = {
  day1_start: {
    id: 'day1_start',
    stage: 'day1_start',
    name: 'Welcome to Candy Wars',
    autoTrigger: true,
    steps: [
      {
        id: 'welcome',
        title: '🎒 Welcome to Candy Wars!',
        description:
          "Hi there! I'm Mrs. Johnson, your teacher. Let me show you how to become the school's candy mogul!",
        character: 'teacher',
        position: 'center',
      },
      {
        id: 'hud_intro',
        title: '💰 Your Resources',
        description:
          'This is your HUD. It shows your wallet balance, piggy bank savings, and inventory. Tap inventory to see your candy!',
        character: 'teacher',
        position: 'top',
        zone: 1,
        borderRadius: 16,
        maskOffset: 5,
      },
      {
        id: 'market_intro',
        title: '🍬 The Candy Market',
        description:
          'Here you can buy and sell candy. Prices change throughout the day - buy low in the morning, sell high later!',
        character: 'teacher',
        position: 'center',
        zone: 2,
        borderRadius: 16,
        maskOffset: 5,
      },
      {
        id: 'time_concept',
        title: '⏰ School Periods',
        description:
          "You have 8 periods each day. Each time you advance, prices change. That's your opportunity to profit!",
        character: 'teacher',
        position: 'top',
      },
    ],
  },

  day1_first_buy: {
    id: 'day1_first_buy',
    stage: 'day1_first_buy',
    name: 'Making Your First Purchase',
    autoTrigger: true,
    requiresCompletion: ['day1_start'],
    steps: [
      {
        id: 'buy_tutorial',
        title: '🛒 Time to Buy!',
        description:
          'Great choice! When buying, you can choose how many pieces to purchase. Start small to learn the ropes.',
        character: 'student',
        position: 'center',
      },
      {
        id: 'inventory_space',
        title: '🎒 Inventory Limits',
        description:
          'Your backpack can only hold so much candy. You start with 10 slots, but joker cards can increase this!',
        character: 'teacher',
        position: 'top',
      },
    ],
  },

  day1_first_sell: {
    id: 'day1_first_sell',
    stage: 'day1_first_sell',
    name: 'Your First Sale',
    autoTrigger: true,
    requiresCompletion: ['day1_first_buy'],
    steps: [
      {
        id: 'sell_intro',
        title: '💸 Making Profit!',
        description:
          'Nice work! You just made your first profit. The green number shows how much you gained on this trade.',
        character: 'student',
        position: 'center',
      },
      {
        id: 'profit_strategy',
        title: '📈 Trading Strategy',
        description:
          'Buy multiple candy types to spread risk. Some prices go up, some go down - diversify your portfolio!',
        character: 'teacher',
        position: 'center',
      },
    ],
  },

  day1_period3: {
    id: 'day1_period3',
    stage: 'day1_period3',
    name: 'Mid-Day Tips',
    autoTrigger: true,
    requiresCompletion: ['day1_first_sell'],
    steps: [
      {
        id: 'location_choices',
        title: '📍 Choose Wisely',
        description:
          'Different locations have different candy prices! The gym might have cheap Warheads, while the library has expensive M&Ms.',
        character: 'student',
        position: 'center',
      },
      {
        id: 'debt_warning',
        title: '⚠️ About Your Debt',
        description:
          "See that negative number in your wallet? That's debt you need to pay back. Make smart trades to clear it!",
        character: 'principal',
        position: 'top',
      },
    ],
  },

  day2_start: {
    id: 'day2_start',
    stage: 'day2_start',
    name: 'Day 2 - Advanced Trading',
    autoTrigger: true,
    steps: [
      {
        id: 'day2_welcome',
        title: '☀️ Day 2 Begins!',
        description:
          "Welcome back! Today we'll learn about events and advanced trading strategies.",
        character: 'teacher',
        position: 'center',
      },
      {
        id: 'events_intro',
        title: '🎲 Random Events',
        description:
          "Sometimes special events happen - a teacher might confiscate candy, or there's a sale at certain locations!",
        character: 'student',
        position: 'center',
      },
      {
        id: 'market_trends',
        title: '📊 Watch the Trends',
        description:
          'Notice the 📈📉 indicators? They show if prices are rising or falling. Use this to time your trades!',
        character: 'teacher',
        position: 'center',
      },
    ],
  },

  day2_joker: {
    id: 'day2_joker',
    stage: 'day2_joker',
    name: 'Joker Cards',
    autoTrigger: true,
    steps: [
      {
        id: 'joker_found',
        title: '🃏 You Found a Joker!',
        description:
          'Excellent! Joker cards give you special abilities. This one might boost prices, increase capacity, or provide bonuses.',
        character: 'teacher',
        position: 'center',
      },
      {
        id: 'joker_strategy',
        title: '🎯 Using Jokers Wisely',
        description:
          'You can only hold 3 jokers at first. Choose ones that match your play style - aggressive trading or steady profits?',
        character: 'student',
        position: 'center',
      },
      {
        id: 'joker_effects',
        title: '✨ Joker Indicators',
        description:
          'See those emoji badges on candy prices? They show which jokers are affecting the price. Use this info to maximize profits!',
        character: 'teacher',
        position: 'center',
      },
    ],
  },

  day3_advanced: {
    id: 'day3_advanced',
    stage: 'day3_advanced',
    name: 'Advanced Strategies',
    autoTrigger: false,
    steps: [
      {
        id: 'advanced_intro',
        title: '🎓 Advanced Trading',
        description:
          "You're getting good at this! Let me share some pro tips that top traders use.",
        character: 'principal',
        position: 'center',
      },
      {
        id: 'combo_bonuses',
        title: '🎰 Combo Bonuses',
        description:
          'Some jokers work together! Candy Salad + Jump Rope = massive profits. Experiment with combinations!',
        character: 'student',
        position: 'center',
      },
      {
        id: 'risk_management',
        title: '⚖️ Managing Risk',
        description:
          "Don't put all your money in one candy. Keep some cash for opportunities and always save profits in your piggy bank!",
        character: 'teacher',
        position: 'center',
      },
      {
        id: 'endgame_goal',
        title: '🏆 Your Goal',
        description:
          "Pay off your debt, build wealth, and become the ultimate Candy Wars champion. You've got this!",
        character: 'principal',
        position: 'center',
      },
    ],
  },
};

export const getTutorialForStage = (stage: TutorialStage): TutorialSequence => {
  return PROGRESSIVE_TUTORIALS[stage];
};

export const getNextTutorialStage = (
  currentStage: TutorialStage
): TutorialStage | null => {
  const stages: TutorialStage[] = [
    'day1_start',
    'day1_first_buy',
    'day1_first_sell',
    'day1_period3',
    'day2_start',
    'day2_joker',
    'day3_advanced',
  ];

  const currentIndex = stages.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex === stages.length - 1) {
    return null;
  }

  return stages[currentIndex + 1];
};

export const shouldShowTutorial = (
  stage: TutorialStage,
  completedTutorials: string[],
  gameState: {
    day: number;
    period: number;
    hasJustBought?: boolean;
    hasJustSold?: boolean;
    justFoundJoker?: boolean;
    isAfterSchool?: boolean;
  }
): boolean => {
  const tutorial = PROGRESSIVE_TUTORIALS[stage];

  if (completedTutorials.includes(tutorial.id)) {
    return false;
  }

  if (tutorial.requiresCompletion) {
    const allRequired = tutorial.requiresCompletion.every((req) =>
      completedTutorials.includes(req)
    );
    if (!allRequired) {
      return false;
    }
  }

  switch (stage) {
    case 'day1_start':
      return (
        gameState.day === 1 &&
        gameState.period === 1 &&
        !completedTutorials.includes('day1_start')
      );

    case 'day1_first_buy':
      return gameState.day === 1 && gameState.hasJustBought === true;

    case 'day1_first_sell':
      return gameState.day === 1 && gameState.hasJustSold === true;

    case 'day1_period3':
      return gameState.day === 1 && gameState.period === 3;

    case 'day2_start':
      return gameState.day === 2 && gameState.period === 1;

    case 'day2_joker':
      return gameState.day >= 2 && gameState.justFoundJoker === true;

    case 'day3_advanced':
      return gameState.day === 3 && gameState.period === 1;

    default:
      return false;
  }
};
