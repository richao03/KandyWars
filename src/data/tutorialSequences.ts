export const TUTORIAL_SEQUENCES = {
  FIRST_TIME_PLAYER: {
    id: 'first_time_player',
    steps: [
      {
        id: 'welcome',
        title: '🎒 Welcome to Candy Wars!',
        description: 'Hi there, new student! I\'m Mrs. Johnson, your homeroom teacher. Ready to learn the ropes of our school\'s underground candy economy?',
        character: 'teacher' as const,
        position: 'center' as const,
      },
      {
        id: 'game_concept',
        title: '📚 How School Works',
        description: 'Every day has 7 periods. You\'ll buy candy cheap in the morning and sell it for profit throughout the day. Watch the prices - they change!',
        character: 'teacher' as const,
        position: 'center' as const,
      },
      {
        id: 'wallet_intro',
        title: '💰 Your Wallet',
        description: 'See that "Wallet" box at the top? That\'s your spending money. You start with some cash, but you also have debt to pay off!',
        character: 'teacher' as const,
        position: 'top' as const,
        target: 'wallet',
      },
      {
        id: 'buying_candy',
        title: '🍭 Buying Candy',
        description: 'Tap on any candy to buy it. Prices are low in the morning - that\'s when smart dealers stock up!',
        character: 'student' as const,
        position: 'center' as const,
        target: 'candy_list',
      },
      {
        id: 'time_matters',
        title: '⏰ Time is Money',
        description: 'See "Period 1" at the top? Time moves when you buy/sell. Later periods = higher prices = more profit!',
        character: 'teacher' as const,
        position: 'top' as const,
        target: 'period_display',
      },
      {
        id: 'first_purchase',
        title: '🛒 Your Turn!',
        description: 'Go ahead - buy some candy! Start with something cheap. Don\'t worry, I\'ll guide you through selling it.',
        character: 'teacher' as const,
        position: 'bottom' as const,
      },
    ],
  },

  SELLING_TUTORIAL: {
    id: 'selling_tutorial',
    steps: [
      {
        id: 'inventory_intro',
        title: '🎒 Your Inventory',
        description: 'Great purchase! Now you have candy in your inventory. Tap the "Inventory" box to see what you own.',
        character: 'teacher' as const,
        position: 'top' as const,
        target: 'inventory',
      },
      {
        id: 'selling_process',
        title: '💸 Selling Candy',
        description: 'Tap any candy in your inventory to sell it. The price shown is what you\'ll get per piece!',
        character: 'student' as const,
        position: 'center' as const,
      },
      {
        id: 'profit_concept',
        title: '📈 Making Profit',
        description: 'Buy low, sell high! If you bought for $1 and sell for $3, that\'s $2 profit per candy. Easy money!',
        character: 'teacher' as const,
        position: 'center' as const,
      },
    ],
  },

  ADVANCED_FEATURES: {
    id: 'advanced_features',
    steps: [
      {
        id: 'piggy_bank',
        title: '🐷 Piggy Bank',
        description: 'Smart dealers save their profits! The Piggy Bank keeps your money safe from... complications.',
        character: 'student' as const,
        position: 'top' as const,
        target: 'piggy_bank',
      },
      {
        id: 'jokers_intro',
        title: 'Joker Cards',
        description: 'Sometimes you\'ll find special Joker cards. These give you powerful advantages - collect them wisely!',
        character: 'teacher' as const,
        position: 'center' as const,
      },
      {
        id: 'after_school',
        title: '🌅 After School',
        description: 'When school ends, you can visit the Deli, manage your Piggy Bank, or prep for tomorrow!',
        character: 'student' as const,
        position: 'center' as const,
      },
    ],
  },

  DEBT_WARNING: {
    id: 'debt_warning',
    steps: [
      {
        id: 'debt_explanation',
        title: '⚠️ About Your Debt',
        description: 'See that negative number? That\'s debt you owe. If you don\'t pay it back, there might be... consequences.',
        character: 'principal' as const,
        position: 'center' as const,
      },
      {
        id: 'payment_strategy',
        title: '💡 Paying It Off',
        description: 'Make smart trades, save your profits, and pay down that debt. The school takes this very seriously.',
        character: 'principal' as const,
        position: 'center' as const,
      },
    ],
  },

  JOKER_TUTORIAL: {
    id: 'joker_tutorial',
    steps: [
      {
        id: 'joker_found',
        title: '🎉 You Found a Joker!',
        description: 'Excellent! Joker cards give you special abilities. Some help with prices, others with capacity or money.',
        character: 'teacher' as const,
        position: 'center' as const,
      },
      {
        id: 'joker_effects',
        title: '✨ How Jokers Work',
        description: 'Each Joker has a unique effect. Read the description carefully - some work automatically, others need activation!',
        character: 'student' as const,
        position: 'center' as const,
      },
      {
        id: 'joker_strategy',
        title: '🧠 Strategic Use',
        description: 'Choose your Jokers wisely! You can only hold a few at a time, so pick the ones that match your strategy.',
        character: 'teacher' as const,
        position: 'center' as const,
      },
    ],
  },
};

export const TUTORIAL_TRIGGERS = {
  // When to show each tutorial
  FIRST_TIME_PLAYER: 'game_start',
  SELLING_TUTORIAL: 'after_first_purchase',
  ADVANCED_FEATURES: 'day_2_start',
  DEBT_WARNING: 'negative_balance',
  JOKER_TUTORIAL: 'first_joker_found',
} as const;