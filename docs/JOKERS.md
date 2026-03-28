# SugarWars — Joker Reference

## System Overview

- **47 total jokers** across 9 minigame subjects
- **Level system:** 1–3 (higher = stronger). Some jokers are not upgradeable (max level 1).
- **Types:** `persistent` (always active, capped at 5 aura slots) or `one-time` (consumed on use, unlimited)
- **Upgrade costs:** $5,000 (L1→L2), $30,000 (L2→L3)
- All jokers are available from any minigame (no subject lock)

---

## Sale Formula

```
finalProfit = (baseProfit × profitBoost) × multiplier
totalGain   = purchaseValue + finalProfit
```

**Profit boosts** and **multipliers** are two separate layers. Each layer stacks additively within itself.

---

## Jokers by Category

### Profit Boosts — Candy Type

Scale the profit directly. A 1.5x boost on $100 profit = $150. Multiple type boosts add together:
> $100 × (1 + 0.5 + 0.5) = $200

| # | Name | Subject | Max Lv | Target | Boost (Lv 1/2/3) |
|---|------|---------|--------|--------|-------------------|
| 23 | Cocoa Futures | Art | 3 | Chocolate | 1.5x/2x/3x |
| 19 | Bear Market | Economy | 3 | Gummy | 1.5x/2x/3x |
| 26 | Hard Knocks | Gym | 3 | Hard Candy | 1.5x/2x/3x |
| 46 | Sour Logic | Logic | 3 | Sour | 1.5x/2x/3x |
| 32 | Double Dutch | Recess | 3 | Chewy | 1.5x/2x/3x |
| 42 | Tropical Import | Geography | 3 | Fruity | 1.5x/2x/3x |

### Profit Boosts — Conditional

Same profit boost layer, but triggered by sale context (quantity, cash, timing) instead of candy type.

| # | Name | Subject | Max Lv | Condition | Boost (Lv 1/2/3) |
|---|------|---------|--------|-----------|-------------------|
| 45 | Early Bird | Recess | 3 | First sale of each day | 1.5x/2x/3x |
| 47 | Bulk Discount | Economy | 3 | Sell 5+/35+/55+ at once | 1.5x/2x/3x |
| 49 | Underdog | Gym | 3 | Cash < $5k/$10k/$15k | 1.5x/2x/3x |
| 50 | Penny Pincher | Math | 3 | Profit/candy ≤ $5 | 2x/3x/4x |
| 52 | Broke and Hungry | Economy | 3 | Cash < $500 | 2x/3x/4x |

### Multipliers — Candy Size

Multiply the boosted profit. A 2x multiplier on $200 boosted profit = $400. Multiple multipliers add together:
> (1 + 0.5 + 0.5) = 2x

| # | Name | Subject | Max Lv | Target | Multiplier (Lv 1/2/3) |
|---|------|---------|--------|--------|----------------------|
| 2 | Median Formula | Math | 3 | Medium | 1.5x/2x/3x |
| 8 | Micro Chip | Computer | 3 | Small | 1.5x/2x/3x |
| 18 | Super Size Me | Home Ec | 3 | Big | 1.5x/2x/3x |

### Multipliers — Conditional

Same multiplier layer, but only active when a condition is met.

| # | Name | Subject | Max Lv | Condition | Multiplier (Lv 1/2/3) |
|---|------|---------|--------|-----------|----------------------|
| 29 | Even Stevens | Logic | 3 | Inventory limit is even | 1.5x/2x/3x |
| 30 | Odd Todd | Art | 3 | Inventory limit is odd | 1.5x/2x/3x |
| 38 | Golden Hour | Geography | 3 | Last 2 periods of day | 1.5x/2x/3x |

### Multipliers — One-Time

| # | Name | Subject | Max Lv | Multiplier (Lv 1/2/3) |
|---|------|---------|--------|----------------------|
| 1 | Double Up | Math | 1 | 2x price of 1 candy for 1 period |
| 48 | Pursuasion | Logic | 3 | 2x/4x/6x your next sale |

### Inventory Boosters

| # | Name | Subject | Type | Max Lv | Effect (Lv 1/2/3) |
|---|------|---------|------|--------|--------------------|
| 9 | Data Compression | Computer | persistent | 3 | Inventory +13/+26/+39 |
| 54 | Bulk Up | Gym | persistent | 3 | Inventory +15/+30/+45 |
| 66 | Treasure Chest | Art | persistent | 3 | Inventory +8/+15/+25, plus $20/$50/$100 per empty slot at end of day |
| 43 | Inductive Reasoning | Math | persistent | 3 | Inventory +5/+7/+10 per new day |
| 39 | Trade Routes | Geography | persistent | 3 | +1/+2/+3 inventory limit per period |
| 12 | Vacuum Sealer | Home Ec | persistent | 1 | 2x inventory limit, **-3 to multiplier** (min 1x) |

### Allowance & Income

| # | Name | Subject | Type | Max Lv | Effect (Lv 1/2/3) |
|---|------|---------|------|--------|--------------------|
| 31 | Ace the Test | Math | persistent | 3 | 2x/3x/4x daily allowance |
| 7 | Side Gig | Computer | persistent | 3 | 2x/3x/4x daily allowance |
| 13 | Coaching | Gym | persistent | 3 | +$300/+$600/+$900 daily allowance |
| 11 | Farmers Carry | Gym | persistent | 3 | Inventory count × $5/$25/$100 per period |
| 17 | Home Made | Home Ec | persistent | 3 | +$10/$20/$30 per candy at start of each day |
| 15 | Perfect Bake | Home Ec | persistent | 3 | End day with 0 inventory → +$1k/$3k/$5k |
| 53 | Mysterious Artifact | Geography | persistent | 3 | 8%/15%/25% daily compound interest on stash (capped $5k/day) |
| 22 | Deposit Bonus | Economy | persistent | 3 | +10%/+25%/+50% piggy bank deposit bonus |

### Instant Cash

| # | Name | Subject | Type | Max Lv | Effect (Lv 1/2/3) |
|---|------|---------|------|--------|--------------------|
| 16 | Bake Sale | Home Ec | one-time | 3 | Instantly gain $3k/$6k/$9k |
| 37 | Roman Coin | Economy | one-time | 3 | Instantly gain $2k/$5k/$10k |
| 44 | Atlas Bonus | Geography | one-time | 3 | Instantly gain $2.5k/$5k/$7.5k |

### Market Manipulation

| # | Name | Subject | Type | Max Lv | Effect |
|---|------|---------|------|--------|--------|
| 20 | Market Manipulation | Economy | one-time | 1 | Set any candy to the highest price this period |
| 21 | The Big Short | Economy | one-time | 1 | Set any candy to the lowest price this period |
| 40 | Continental Drift | Geography | one-time | 1 | Shuffle all candy prices this period |
| 25 | Bet You I'm Faster | Gym | one-time | 1 | Fill entire inventory with any 1 candy |

### Protection & Utility

| # | Name | Subject | Type | Max Lv | Effect |
|---|------|---------|------|--------|--------|
| 6 | Tapped In | Computer | persistent | 1 | 100% event hints (see events before they happen) |
| 67 | Medieval Shield | Art | persistent | 1 | Protect money from LOSE_MONEY events (consumed) |
| 74 | Secret Hideout | Recess | persistent | 1 | Protect stash from confiscation permanently |
| 51 | Hide and Seek | Recess | persistent | 1 | 2x found money from events |
| 24 | The Good Old Days | Art | persistent | 3 | Deli prices 50%/75%/90% off |
| 55 | Extra Credit | Logic | persistent | 1 | +1 joker choice after completing a minigame |
| 56 | Sixth Sense | Computer | persistent | 1 | Hold 6 aura jokers instead of 5 |

---

## Full Calculation Example

Small Chocolate candy, base profit = $100

| Layer | Joker | Value | Running |
|-------|-------|-------|---------|
| **Profit boost** | Cocoa Futures Lv1 (Chocolate) | +0.5 | 1.5x |
| **Profit boost** | — no more type matches | — | **1.5x** |
| Boosted profit | $100 × 1.5 | | **$150** |
| **Multiplier** | Micro Chip Lv2 (Small) | +1.0 | 2x |
| **Multiplier** | Even Stevens Lv1 | +0.5 | 2.5x |
| Final profit | $150 × 2.5 | | **$375** |

### Vacuum Sealer Penalty

Vacuum Sealer subtracts **3** from the multiplier (minimum 1x). If your multiplier is 2.5x, it becomes 1x (since 2.5 - 3 < 1).

---

## Economy Constraints

| Constraint | Value |
|------------|-------|
| Persistent (aura) joker slots | 5 max |
| One-time joker slots | Unlimited |
| Allowance multiplier cap | 8x combined |
| Stash interest cap | $5,000/day |
| Upgrade L1→L2 | $5,000 |
| Upgrade L2→L3 | $30,000 |

---

## Joker Counts by Subject

| Subject | Jokers | Persistent | One-Time |
|---------|--------|------------|----------|
| Math | 5 | 4 | 1 |
| Computer | 5 | 5 | 0 |
| Home Economics | 5 | 4 | 1 |
| Art | 5 | 5 | 0 |
| Economy | 7 | 4 | 3 |
| Gym | 6 | 5 | 1 |
| Logic | 4 | 3 | 1 |
| Recess | 4 | 4 | 0 |
| Geography | 6 | 4 | 2 |
| **Total** | **47** | **38** | **9** |
