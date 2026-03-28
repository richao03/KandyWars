# SugarWars — Game Mechanics

## Overview

SugarWars is a candy trading game set in a school. You play as a kid trying to earn enough money in 5 school days to adopt a pet. Buy candy cheap, sell it high, collect joker power-ups, dodge random events, and stash your profits.

**Win condition:** `balance + stashedAmount >= 0` (your adoption fee starts as negative debt)

---

## Game Flow

```
Title Screen → Difficulty Selection → Story Screen → Name Prompt
  → Day 1–5 Loop:
      Market (8 periods) → After School (Study / Deli / Stash / Sleep)
  → Game End (Win/Lose)
```

### Title Screen
- **New Game** — pick a difficulty (1–16), each with a pet and adoption fee
- **Continue** — resume in-progress game

### Story Screen
- Typewriter intro customized to your pet and adoption fee
- Name prompt (default: "Player")

### The Market (core loop)
Each day has **8 periods** (or 6 with Time Crunch hall pass). Each period:

1. Travel to a location (Gym, Cafeteria, Home Room, Library, Science Lab, School Yard, Bathroom, The Connect)
2. Check for random events
3. Buy/sell candy at fluctuating prices
4. At lunch (period 4), optional minigame

### After School
After each day (except day 5), four options:
- **Study** — play a minigame, counts toward hall pass unlocks
- **Stash Money** — deposit into piggy bank (safe from events)
- **Deli** — buy/sell candy at average historical prices
- **Sleep** — end the day, receive daily allowance, advance to next day

### Game End
After day 5 completes, final score = balance + stashed amount. Win if >= 0.

---

## Difficulty System

16 levels, each with a pet and adoption fee (debt target):

| Level | Debt Range |
|-------|-----------|
| 1     | $5,000    |
| ...   | scales up |
| 16    | $500,000  |

Each level must be beaten to unlock the next.

---

## Candy System

### 15 Candies
Every candy has exactly **2 types** from 6 possible types, and a **size**. Each type appears exactly 5 times across all candies (C(6,2) = 15 unique type pairs).

**6 Types:** Gummy, Chocolate, Hard Candy, Sour, Chewy, Fruity
**3 Sizes:** Small, Medium, Big

#### 5 Price Tiers (3 candies each)

| Tier | Range | Candies |
|------|-------|---------|
| Penny | $1–$10 | Gummy Bears, Jolly Ranchers, Warheads |
| Budget | $10–$200 | M&Ms, Nerd Rope, Bubble Gum |
| Mid | $200–$1,000 | Swedish Fish, Sour Straws, Caramel |
| Premium | $1k–$5k | Snickers, Jaw Breaker, Tootsie Roll |
| Elite | $5k–$10k | Strawberry Bark, Sour Patch Kids, Taffy |

### Price Mechanics
- All prices for all 40 periods are pre-generated at game start using a seeded RNG
- Prices stay within `[baseMin, baseMax]` scaled by day progress (50% on Day 1 → 100% on Day 5)
- Each candy has a unique "home price" so same-tier candies trade at different levels
- Per-candy volatility, random walk momentum, trend clusters (2–5 period runs)
- Events (PRICE_SPIKE, PRICE_DROP) overlay on top of base prices
- See [CANDY.md](./CANDY.md) for full price generation details

### Multi-Type Stacking
Since each candy has 2 types, it triggers **all matching type jokers independently**. A Gummy+Chocolate candy would trigger both Bear Market (Gummy 2x) and Cocoa Futures (Chocolate 2x) for a combined 4x multiplier.

---

## Sale Calculation

The profit formula is:

```
finalProfit = (baseProfit + flatBonuses) x productOfAllMultipliers
```

Where:
- **baseProfit** = `(salePrice - purchasePrice) x quantity`
- **flatBonuses** = sum of all additive bonuses (Overclock, Art Auction, Hopscotch, Golden Hour, Swingset, Hall Pass, Influencer Shoutout)
- **multipliers** = product of all type/size/conditional multipliers (stacked multiplicatively)

**Vacuum Sealer penalty:** Subtracts 2 from the final multiplier product (min 1x).

**Total returned to player:** `purchaseValue + finalProfit` (you get your cost basis back plus profit)

---

## Random Events

Pre-generated per game seed. Trigger at random periods.

| Event | Effect |
|-------|--------|
| **FOUND_MONEY** | +25% of current wallet balance, min $100 (multiplied by Hide and Seek joker) |
| **LOSE_MONEY** | -50% of balance (blocked by Medieval Shield or 6th Grade Bodyguard) |
| **STASH_LOCKED** | Confiscates all candy inventory (blocked by Secret Hideout or Hall Monitor Bribe; reduced to 25% with Teacher's Pet hall pass) |
| **PRICE_SPIKE** | Candy prices increase (flavor text) |
| **PRICE_DROP** | Candy prices decrease (flavor text) |

### Event Protection Priority
- **LOSE_MONEY:** Medieval Shield (joker) > 6th Grade Bodyguard (merchant item) — consumed on use
- **STASH_LOCKED:** Secret Hideout (joker) > Hall Monitor Bribe (merchant item) — consumed on use

---

## Minigames

9 subjects, playable at lunch (optional) and after school (study). A random game is selected via roulette — once selected, it's locked for that session (backing out and returning shows the same game).

1. Math
2. Computer
3. Logic
4. Art
5. Economy
6. Geography
7. Home Economics
8. Gym (Misère Nim — take turns removing from piles, last to take loses)
9. Recess

Each minigame has 3 difficulty levels. Completing levels earns joker rewards. Playing minigames counts toward hall pass unlocks (e.g., Valedictorian Vendor requires all 9).

---

## Day Transitions

### End of Day (Sleep)
1. Daily allowance added ($100–$400 based on difficulty, modified by jokers)
2. Joker interest applied (Mysterious Artifact: compound interest on stash)
3. Inheritance hall pass transfer (10% of wallet to piggy bank)
4. Daily tracking resets (minigame flags, etc.)

### Day Calculation
```
periodsPerDay = 8 (or 6 with Time Crunch)
day = Math.floor(periodCount / periodsPerDay) + 1
lunchPeriod = Math.floor(periodsPerDay / 2)
```

---

## Locations

8 school locations the player moves between each period:

- Gym
- Cafeteria
- Home Room
- Library
- Science Lab
- School Yard
- Bathroom
- The Connect (merchant)
