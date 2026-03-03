# SugarWars — Joker Reference

## System Overview

- **54 total jokers** (9 subjects x 6 each)
- **Level system:** 1–3 (higher = stronger). Some jokers are not upgradeable (max level 1).
- **Types:** `persistent` (always active) or `one-time` (consumed on use)
- Each subject is associated with a **candy type multiplier** or **candy size multiplier**

### Subject → Multiplier Mapping

| Subject | Multiplier Target |
|---------|------------------|
| Math | Size: Medium |
| Computer | Size: Small |
| Home Economics | Size: Big |
| Art | Type: Chocolate |
| Economy | Type: Gummy |
| Gym | Type: Hard Candy |
| Logic | Type: Sour |
| Recess | Type: Chewy |
| Geography | Type: Fruity |

---

## All 54 Jokers by Subject

### Math (Medium size multiplier)

| # | Name | Type | Max Lv | Effect (Lv 1/2/3) |
|---|------|------|--------|-------------------|
| 1 | Double Up | one-time | 1 | 2x price of 1 candy for 1 period |
| 2 | Median Formula | persistent | 3 | 2x/4x/6x multiplier on Medium candy |
| 3 | Geometric Expansion | persistent | 3 | Inventory +3/+5/+8 per day elapsed |
| 31 | Ace the Test | persistent | 3 | 2x/4x/6x daily allowance |
| 43 | Inductive Reasoning | persistent | 3 | Inventory +5/+7/+10 per new day |
| 35 | Temporary Emperor | one-time | 3 | Sell 3/6/9 of all candy |

### Computer (Small size multiplier)

| # | Name | Type | Max Lv | Effect (Lv 1/2/3) |
|---|------|------|--------|-------------------|
| 6 | Tapped In | persistent | 1 | 100% event hints (see events before they happen) |
| 7 | Side Gig | persistent | 3 | 2x/4x/6x daily allowance |
| 8 | Micro Chip | persistent | 3 | 2x/4x/6x multiplier on Small candy |
| 9 | Data Compression | persistent | 3 | Inventory +13/+26/+39 |
| 10 | Overclock | persistent | 3 | +0.3%/+0.6%/+1% profit per candy in inventory |
| 50 | Diamond Hand | persistent | 3 | +$10/+$20/+$30 per candy in inventory at start of each period |

### Home Economics (Big size multiplier)

| # | Name | Type | Max Lv | Effect (Lv 1/2/3) |
|---|------|------|--------|-------------------|
| 12 | Vacuum Sealer | persistent | 1 | 2x inventory limit, -2 to final sale multiplier (min 1x) |
| 14 | Fridge Organizer | persistent | 3 | Inventory +15/+30/+45 |
| 15 | Perfect Bake | persistent | 3 | End day with 0 inventory → +$1k/$3k/$5k |
| 16 | Bake Sale | one-time | 3 | Instantly gain $3k/$6k/$9k |
| 17 | Home Made | persistent | 3 | +$10/$20/$30 per candy at start of each day |
| 18 | Super Size Me | persistent | 3 | 2x/4x/6x multiplier on Big candy |

### Art (Chocolate type multiplier)

| # | Name | Type | Max Lv | Effect (Lv 1/2/3) |
|---|------|------|--------|-------------------|
| 66 | Treasure Chest | persistent | 3 | Inventory +8/+15/+25, plus $20/$50/$100 per empty slot at end of day |
| 30 | Odd Todd | persistent | 3 | If inventory limit is odd → 2x/3x/4x all candy profits |
| 23 | Cocoa Futures | persistent | 3 | 2x/4x/6x multiplier on Chocolate candy |
| 67 | Medieval Shield | persistent | 1 | Protect money from LOSE_MONEY events (consumed) |
| 52 | Art Auction | persistent | 3 | +5%/+10%/+20% profit per day elapsed |
| 24 | The Good Old Days | persistent | 3 | Deli prices 50%/75%/90% off |

### Economy (Gummy type multiplier)

| # | Name | Type | Max Lv | Effect (Lv 1/2/3) |
|---|------|------|--------|-------------------|
| 19 | Bear Market | persistent | 3 | 2x/4x/6x multiplier on Gummy candy |
| 20 | Market Manipulation | one-time | 1 | Set any candy to the highest price this period |
| 21 | The Big Short | one-time | 1 | Set any candy to the lowest price this period |
| 22 | Deposit Bonus | persistent | 3 | +10%/+25%/+50% piggy bank deposit bonus |
| 41 | The Bounceback | persistent | 3 | $500/$1k/$2k per period with no sale |
| 37 | Roman Coin | one-time | 3 | Instantly gain $2k/$5k/$10k |

### Gym (Hard Candy type multiplier)

| # | Name | Type | Max Lv | Effect (Lv 1/2/3) |
|---|------|------|--------|-------------------|
| 11 | Farmers Carry | persistent | 3 | If inventory limit >= 75 → +$2k/$4k/$6k per period |
| 13 | Coaching | persistent | 3 | +$300/$600/$900 daily allowance |
| 25 | Bet You I'm Faster | one-time | 1 | Fill entire inventory with any 1 candy |
| 54 | Bulk Up | persistent | 3 | Inventory +15/+30/+45 |
| 45 | Perfect Change | persistent | 3 | If cash ends in .00 → 10x/20x/30x all candy profits |
| 26 | Hard Knocks | persistent | 3 | 2x/4x/6x multiplier on Hard Candy |

### Logic (Sour type multiplier)

| # | Name | Type | Max Lv | Effect (Lv 1/2/3) |
|---|------|------|--------|-------------------|
| 27 | Master Negotiator | one-time | 1 | Replace 1 candy type for another |
| 28 | Therefore... | persistent | 3 | +$200/$500/$1k daily allowance |
| 29 | Even Stevens | persistent | 3 | If inventory limit is even → 2x/3x/4x all candy profits |
| 55 | Embrace the Grind | persistent | 3 | End period with 0 inventory → +$500/$1k/$2k |
| 48 | Pursuasion | one-time | 3 | 2x/4x/6x your next sale |
| 46 | Sour Logic | persistent | 3 | 2x/4x/6x multiplier on Sour candy |

### Recess (Chewy type multiplier)

| # | Name | Type | Max Lv | Effect (Lv 1/2/3) |
|---|------|------|--------|-------------------|
| 32 | Double Dutch | persistent | 3 | 2x/4x/6x multiplier on Chewy candy |
| 33 | Feed the Beast | persistent | 3 | +$300/$600/$1000 per period when inventory >= 50% full |
| 34 | Hopscotch Bonus | persistent | 3 | +5%/+10%/+15% profit per unique location visited today |
| 51 | Hide and Seek | persistent | 1 | 2x found money from events |
| 36 | Swingset Momentum | persistent | 3 | +10%/+20%/+30% per consecutive period with a sale |
| 74 | Secret Hideout | persistent | 1 | Protect stash from STASH_LOCKED confiscation (consumed) |

### Geography (Fruity type multiplier)

| # | Name | Type | Max Lv | Effect (Lv 1/2/3) |
|---|------|------|--------|-------------------|
| 38 | Golden Hour | persistent | 3 | Last 2 periods of day: +50%/+100%/+200% profit |
| 39 | Trade Routes | persistent | 3 | +1/+2/+3 inventory limit per period |
| 40 | Continental Drift | one-time | 1 | Shuffle all candy prices this period |
| 53 | Mysterious Artifact | persistent | 3 | 8%/15%/25% daily compound interest on stash |
| 42 | Tropical Import | persistent | 3 | 2x/4x/6x multiplier on Fruity candy |
| 44 | Atlas Bonus | one-time | 3 | Instantly gain $2.5k/$5k/$7.5k |

---

## Effect Categories

### Profit Multipliers (multiplicative stacking)
Type multipliers, size multipliers, conditional multipliers — all multiply together.

Example: Selling a Gummy+Chocolate Big candy with Bear Market (2x Gummy), Cocoa Futures (2x Chocolate), Super Size Me (2x Big):
→ 2 x 2 x 2 = **8x profit multiplier**

### Flat Bonuses (additive, then multiplied)
Overclock, Art Auction, Hopscotch, Golden Hour, Swingset Momentum — these add a percentage of base profit, then the total is multiplied by the multiplier stack.

### Inventory Bonuses
Geometric Expansion, Data Compression, Fridge Organizer, Bulk Up, Treasure Chest, Inductive Reasoning, Trade Routes — all add to inventory limit.

Vacuum Sealer doubles the final inventory limit but penalizes sale multiplier by -2.

### Money Generation
Bake Sale, Roman Coin, Atlas Bonus (one-time cash), Coaching/Therefore (allowance boost), Diamond Hand/Farmers Carry/Bounceback/Home Made (periodic income).

### Protection
Medieval Shield (money loss), Secret Hideout (stash confiscation), Tapped In (event hints).

### Special Mechanics
- **Even Stevens / Odd Todd:** Conditional on inventory limit parity
- **Perfect Change:** Conditional on cash ending in .00
- **Swingset Momentum:** Scales with consecutive sales across periods
- **Vacuum Sealer:** Double-edged — more inventory, less profit multiplier
