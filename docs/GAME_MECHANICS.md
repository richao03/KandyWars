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
Each day has **8 periods** (5 days × 8 = 40 total). Each period:

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
After day 5 completes, final score = balance + stashed amount - adoption fee. Win if >= 0.

**Early adoption**: the moment `balance + stash >= adoptionFee` (on the market or after-school screen), an `AdoptionReadyModal` offers "Adopt Now" (go straight to `/game-end`, which scores the run as a win and unlocks the next level) or "Keep Trading". It shows once per run; "Keep Trading" sets `game.adoptionPromptDismissed`, which resets with the rest of the game state on a new run. After dismissing, the player can still end early from the Settings tab: a featured `PickUpPetButton` (pet image, gold ticket) sits at the top while the fee is covered and confirms before routing to `/game-end`. Logic lives in `src/hooks/useAdoptionPrompt.ts`; pet names/images per level in `src/constants/petData.ts`.

---

## Difficulty System

16 levels, each with a pet and adoption fee (debt target):

| Level | Adoption Fee (debt) |
|-------|--------------------|
| 1     | $5,000             |
| 2     | $12,000            |
| 3     | $25,000            |
| 4     | $50,000            |
| 5     | $100,000           |
| 6     | $175,000           |
| 7     | $300,000           |
| 8     | $500,000           |
| 9     | $750,000           |
| 10    | $1,000,000         |
| 11    | $1,500,000         |
| 12    | $2,500,000         |
| 13    | $3,500,000         |
| 14    | $5,000,000         |
| 15    | $7,500,000         |
| 16    | $10,000,000        |

Each level has its own pet and adoption fee. Starting balance is **$20**; the adoption fee is stored as negative debt in the stash (`stashedAmount = -adoptionFee`).

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
Since each candy has 2 types, it triggers **all matching type jokers independently**. Contributions add into a single bucket rather than multiplying joker-on-joker: a Gummy+Chocolate candy triggers both Bear Market (Gummy) and Cocoa Futures (Chocolate), and two such "2×" type jokers each add +1 to the profit-boost bucket for a combined **3×** boost (not 4×). See the Sale Calculation section below.

---

## Sale Calculation

The canonical profit formula (Balatro-style additive buckets — see `src/utils/saleCalculations.ts`) is:

```
profitBoost = 1 + Σ(profit-boost contributions)   // type jokers, hall pass %, scaling jokers, etc.
multiplier  = 1 + Σ(multiplier contributions)      // size jokers, conditional mults, Final Exam, Lunchroom
finalProfit = totalProfit × profitBoost × multiplier × finalExamPenalty × lunchroomPenalty
```

Where:
- **totalProfit** = `(salePrice - purchasePrice) × quantity`
- Both `profitBoost` and `multiplier` start at 1 and each per-joker contribution **adds** into its bucket (no joker-on-joker product).
- Hall-pass *bonuses* (Final Exam in the last period, Lunchroom Monopoly in the cafeteria) fold into the additive multiplier bucket; their *penalties* (off-period 0.25×, off-site 0.5×) stay as final multiplicative factors.

**Vacuum Sealer penalty:** Subtracts 2 from the multiplier bucket (min 1×).

**Total returned to player:** `purchaseValue + finalProfit` on a profitable sale (cost basis back plus profit). Selling at a loss instead returns `currentPrice × quantity` (the market value).

---

## Random Events

Pre-generated per game seed. Trigger at random periods.

| Event | Effect |
|-------|--------|
| **FOUND_MONEY** | +25% of current wallet balance, min $100 (multiplied by Lucky Charm joker and Metal Detector merchant item) |
| **LOSE_MONEY** | -50% of balance (blocked by Safe House or 6th Grade Bodyguard; Bully Bait joker converts it into a cash windfall) |
| **STASH_LOCKED** | Confiscates all candy inventory (blocked by Safe House or Hall Monitor Bribe; reduced to 25% with Teacher's Pet hall pass). At most one confiscation per day. |
| **PRICE_SPIKE** | Candy prices increase 5x for the affected candy/location (flavor text) |
| **PRICE_DROP** | Candy prices drop to 0.2x for the affected candy/location (flavor text) |

FOUND_MONEY, LOSE_MONEY, and STASH_LOCKED are the three "major" event types (one chosen at random per major-event slot); PRICE_SPIKE / PRICE_DROP are "minor" events.

### Event Protection Priority
- **LOSE_MONEY:** Safe House (joker, #67) > 6th Grade Bodyguard (merchant item). Safe House is a persistent aura — it is **not** consumed on use; the merchant bodyguard **is** consumed.
- **STASH_LOCKED:** Safe House (joker, #67) > Hall Monitor Bribe (merchant item). Again Safe House is persistent (not consumed); the merchant bribe is consumed.
- **Detention Dodge** (joker #81) grants full event immunity for the rest of the current day.

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

Each minigame has 3 difficulty levels. Completing levels earns joker rewards. Playing minigames counts toward hall pass unlocks (e.g., The Valedictorian requires playing all 9).

---

## Day Transitions

### End of Day (Sleep)
1. Daily allowance added (base $10, modified by hall passes, jokers, and merchant items — not difficulty-based)
2. Joker interest applied (Mysterious Artifact: compound interest on stash)
3. Inheritance hall pass transfer (10% of wallet to piggy bank)
4. Daily tracking resets (minigame flags, etc.)

### Day Calculation
```
periodsPerDay = 8 (fixed; getPeriodsPerDay always returns 8)
day = Math.floor(periodCount / periodsPerDay) + 1
lunchPeriod = Math.floor(periodsPerDay / 2)   // = 4
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
