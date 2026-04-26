# SugarWars — Joker Reference

## System Overview

- **76 total jokers**
- **Level system:** 1–3 (higher = stronger). Some jokers are max level 1 (not upgradeable).
- **Types:** `persistent` (always active, capped at 5 aura slots, 6 with Sixth Sense) or `one-time` (activated manually)
- **Upgrade costs:** $5,000 (L1->L2), $30,000 (L2->L3)
- **Level colors:** L1 = green, L2 = blue, L3 = purple

---

## Sale Formula

```
finalProfit = (baseProfit x profitBoost) x multiplier
```

- **profitBoost** starts at 1 (100%). Profit jokers ADD to this (e.g., +50% = profitBoost becomes 1.5).
- **multiplier** starts at 1. Mult jokers ADD to this (e.g., +0.5 = multiplier becomes 1.5).
- Both layers stack additively within themselves, then multiply together.

---

## Complete Joker Table

### Profit Boosts (% added to profit)

| ID  | Name            | Description                                              | L1/L2/L3 Values | Code Effect                 |
| --- | --------------- | -------------------------------------------------------- | --------------- | --------------------------- |
| 23  | Cocoa Futures   | +50%/+100%/+200% profit on Chocolate candy               | 1.5/2/3         | profitBoost += (amount - 1) |
| 26  | Hard Knocks     | +50%/+100%/+200% profit on Hard Candy                    | 1.5/2/3         | profitBoost += (amount - 1) |
| 46  | Sour Logic      | +50%/+100%/+200% profit on Sour candy                    | 1.5/2/3         | profitBoost += (amount - 1) |
| 32  | Double Dutch    | +50%/+100%/+200% profit on Chewy candy                   | 1.5/2/3         | profitBoost += (amount - 1) |
| 42  | Tropical Import | +50%/+100%/+200% profit on Fruity candy                  | 1.5/2/3         | profitBoost += (amount - 1) |
| 8   | Combo Platter   | +100%/+150%/+200% profit when 2 candy types are covered  | 1/1.5/2         | profitBoost += amount       |
| 47  | Bulk Discount   | +50%/+100%/+200% profit when selling 20+ at once         | 1.5/2/3         | profitBoost += (amount - 1) |
| 87  | Tax Collector   | 5%/8%/12% of sale as bonus cash                          | 0.05/0.08/0.12  | profitBoost += amount       |
| 29  | Even Stevens    | +50%/+100%/+200% profit when inventory limit is even     | 1.5/2/3         | profitBoost += (amount - 1) |
| 38  | Golden Hour     | +50%/+100%/+200% profit in last 2 periods of day         | 1.5/2/3         | profitBoost += (amount - 1) |
| 45  | Early Bird      | +50%/+100%/+200% profit on first sale each day           | 1.5/2/3         | profitBoost += (amount - 1) |
| 49  | Underdog        | +50%/+100%/+200% profit when cash < $5k/$10k/$15k        | 1.5/2/3         | profitBoost += (amount - 1) |
| 50  | Variety Pack    | +50%/+100%/+200% profit when 3+ candy types in inventory | 1.5/2/3         | profitBoost += (amount - 1) |
| 91  | Peak Hours      | +100%/+200%/+300% profit during periods 3-5              | 2/3/4           | profitBoost += (amount - 1) |

### Mult Boosts (added to sale multiplier)

| ID  | Name             | Description                                     | L1/L2/L3 Values | Code Effect                |
| --- | ---------------- | ----------------------------------------------- | --------------- | -------------------------- |
| 19  | Bear Market      | +1.5/+2/+3 mult on Gummy candy                  | 1.5/2/3         | multiplier += amount       |
| 70  | Mint Condition   | +1/+1.5/+2 mult on small candy                  | 1/1.5/2         | multiplier += amount       |
| 71  | King Size        | +1/+1.5/+2 mult on big candy                    | 1/1.5/2         | multiplier += amount       |
| 72  | Medium Rare      | +1/+1.5/+2 mult on medium candy                 | 1/1.5/2         | multiplier += amount       |
| 18  | Triple Threat    | +2/+3/+4 mult when 3+ candy types covered       | 2/3/4           | multiplier += amount       |
| 30  | Odd Todd         | +0.5/+1/+2 mult when inventory limit is odd     | 1.5/2/3         | multiplier += (amount - 1) |
| 52  | Broke and Hungry | +1/+2/+3 mult when cash < $2k/$3k/$5k           | 2/3/4           | multiplier += (amount - 1) |
| 2   | Flip Artist      | +0.5/+1/+2 mult when selling at 3x+ markup      | 1.5/2/3         | multiplier += (amount - 1) |
| 48  | Pursuasion       | +1/+3/+5 mult on your next sale (one-time)      | 2/4/6           | multiplier += (amount - 1) |
| 61  | All In           | +3/+5/+7 mult when selling full stack and cash < $500/$5k/$15k | 4/6/8 | multiplier += (amount - 1) (requires qty == ownedQty) |
| 83  | Minimalist       | +2/+4/+7 mult if exactly 3 jokers owned         | 3/5/8           | multiplier += (amount - 1) |
| 84  | Lucky 7          | +6/+9/+14 mult if selling exactly 7 candy       | 7/10/15         | multiplier += (amount - 1) |
| 85  | Night Owl        | +2/+3/+4 mult in last period of day             | 3/4/5           | multiplier += (amount - 1) |
| 88  | Last Stand       | +9/+14/+19 mult if selling < 5 candy            | 10/15/20        | multiplier += (amount - 1) |
| 90  | Diversifier      | +1/+2/+3 mult when selling 3+ types same period | 2/3/4           | multiplier += (amount - 1) |
| 92  | Patience Pays    | +0.5/+0.75/+1 mult when no sale previous period | 1.5/1.75/2      | multiplier += (amount - 1) |

### Scaling Profit (grows over time, added to profit boost)

| ID  | Name              | Description                                       | L1/L2/L3 Values | Code Effect                                   |
| --- | ----------------- | ------------------------------------------------- | --------------- | --------------------------------------------- |
| 63  | Compound Interest | +20%/+40%/+60% profit (grows each day)            | 1.2/1.4/1.6     | profitBoost += (amount - 1), scales with days |
| 64  | Reputation        | +20%/+30%/+40% profit per unique candy sold       | 0.2/0.3/0.4     | profitBoost += (amount x uniqueCandiesSold)   |
| 89  | Momentum          | +30%/+50%/+80% profit per consecutive sale period | 0.3/0.5/0.8     | profitBoost += (amount x consecutiveSales)    |
| 96  | Penny Wise        | +15%/+25%/+40% profit per time money was stashed  | 0.15/0.25/0.4   | profitBoost += (amount x pennyWiseStashes)    |

### Scaling Mult (grows over time, added to multiplier)

| ID  | Name           | Description                                    | L1/L2/L3 Values | Code Effect                             |
| --- | -------------- | ---------------------------------------------- | --------------- | --------------------------------------- |
| 65  | Street Smarts  | +0.5/+0.75/+1 mult per event survived          | 0.5/0.75/1.0    | multiplier += (amount x eventsSurvived) |
| 73  | Clearance Sale | +10%/+15%/+20% permanent mult per loss sale    | 0.1/0.15/0.2    | multiplier += (amount x lossSaleCount)  |
| 82  | Collector      | +0.3/+0.5/+0.7 mult per unique joker owned     | 0.3/0.5/0.7     | multiplier += (amount x jokerCount)     |
| 95  | Hoarder        | +0.3/+0.5/+0.8 mult per time inventory hit max | 0.3/0.5/0.8     | multiplier += (amount x hoarderMaxHits) |
| 97  | Survivor       | +0.5/+0.75/+1 mult per candy batch melted      | 0.5/0.75/1.0    | multiplier += (amount x candiesMelted)  |

### Tradeoff (high reward + penalty)

| ID  | Name         | Description                                                  | L1/L2/L3 Values                      | Code Effect                                      |
| --- | ------------ | ------------------------------------------------------------ | ------------------------------------ | ------------------------------------------------ |
| 57  | Sugar Rush   | +1/+2/+3 mult on every sale                                  | sell: 2/3/4                          | multiplier += (amount - 1)                       |
| 58  | Loan Shark   | +$5k/+$8k/+$12k daily cash, owe $6k/$9.5k/$14k at end of day | income: 5k/8k/12k, debt: 6k/9.5k/14k | flat income, flat debt                           |
| 59  | Glass Cannon | +4/+6/+9 mult on every sale; 10%/7%/5% chance to shatter itself | 5/7/10                            | multiplier += (amount - 1); self-remove on roll  |
| 60  | Contraband   | +1/+2/+3 mult, confiscation takes 100%                       | 2/3/4                                | multiplier += (amount - 1), 100% confiscation    |
| 62  | Hot Potato   | +3/+5/+7 mult on every sale; candy melts in 3 periods        | sell: 4/6/8                          | multiplier += (amount - 1); MELT_WINDOW = 3      |

### Inventory

| ID  | Name                | Description                                                      | L1/L2/L3 Values                 | Code Effect                              |
| --- | ------------------- | ---------------------------------------------------------------- | ------------------------------- | ---------------------------------------- |
| 9   | Data Compression    | +13/+26/+39 inventory                                            | 13/26/39                        | inventory limit += amount                |
| 43  | Inductive Reasoning | +5/+7/+10 inventory each new day                                 | 5/7/10                          | inventory limit += amount per day        |
| 39  | Trade Routes        | +2/+3/+4 inventory every period                                  | 2/3/4                           | inventory limit += amount per period     |
| 66  | Treasure Chest      | +8/+15/+25 inventory, $20/$50/$100 cash per empty inventory at end of day | inv: 8/15/25, cash: 20/50/100   | inventory limit + income                 |
| 12  | Vacuum Sealer       | 2x inventory limit, -2 mult (min 1x)                             | L1 only                         | inventory x 2, multiplier -= 2 (floor 1) |

### Income & Allowance

| ID  | Name                | Description                                                 | L1/L2/L3 Values                               | Code Effect                                 |
| --- | ------------------- | ----------------------------------------------------------- | --------------------------------------------- | ------------------------------------------- |
| 31  | Ace the Test        | 2x/3x/4x allowance                                          | 2/3/4                                         | allowance x amount                          |
| 22  | Deposit Bonus       | 5%/10%/15% of stash added to daily allowance                | 0.05/0.1/0.15                                 | allowance += stash x amount                 |
| 86  | Penny Pincher       | 10%/15%/20% of stash to allowance, min $50/$100/$200 cash   | 0.1/0.15/0.2                                  | allowance += stash x amount                 |
| 11  | Farmers Carry       | $5/$25/$100 cash per candy in inventory each period         | 5/25/100                                      | cash += amount x inventoryCount per period  |
| 17  | Home Made           | $25/$50/$100 cash per candy in inventory at start of day    | 25/50/100                                     | cash += amount x inventoryCount per day     |
| 15  | Perfect Bake        | $1k/$3k/$5k cash for ending day with 0 inventory            | 1000/3000/5000                                | cash += amount if inventory = 0             |
| 53  | Mysterious Artifact | 8%/15%/25% daily compound interest on stash                 | 1.08/1.15/1.25                                | stash x= amount daily                       |
| 74  | Piggy Bank Pro      | 15%/20%/25% daily stash interest                            | 1.15/1.2/1.25                                 | stash x= amount daily                       |
| 93  | Spare Change        | $5/$10/$20 cash per empty inventory per period              | 5/10/20                                       | cash += amount x emptyInventory per period  |

### Instant Cash (one-time)

| ID  | Name       | Description               | L1/L2/L3 Values | Code Effect    |
| --- | ---------- | ------------------------- | --------------- | -------------- |
| 16  | Bake Sale  | $3k/$6k/$9k instant cash  | 3000/6000/9000  | cash += amount |
| 37  | Roman Coin | $2k/$5k/$10k instant cash | 2000/5000/10000 | cash += amount |

### Market Manipulation (one-time)

| ID  | Name                | Description                                    | L1/L2/L3 Values | Code Effect             |
| --- | ------------------- | ---------------------------------------------- | --------------- | ----------------------- |
| 1   | Double Up           | 2x/3x/4x price of any 1 candy for 1 period     | 2/3/4           | candy price x= amount   |
| 20  | Market Manipulation | Set any candy to the highest price this period | L1 only         | candy price = max price |
| 25  | Bet You I'm Faster  | Fill entire inventory with any 1 candy         | L1 only         | fill inventory          |
| 75  | Market Crash        | All prices x0.5/x0.4/x0.3 for 1 period         | 0.5/0.4/0.3     | all prices x= amount    |
| 76  | Inflation           | All prices x2/x3/x4 for 1 period               | 2/3/4           | all prices x= amount    |

### Event Modifiers

| ID  | Name            | Description                                  | L1/L2/L3 Values | Code Effect             |
| --- | --------------- | -------------------------------------------- | --------------- | ----------------------- |
| 77  | Lucky Charm     | 3x/4x/5x found money multiplier              | 3/4/5           | found money x= amount   |
| 78  | Bully Bait      | Convert bully events to +$500/+$1k/+$2k cash | 500/1000/2000   | bully -> cash += amount |
| 79  | Teacher's Pet   | See next-period price arrow on 1/2/3 candies | 1/2/3           | market-list UI hint     |
| 80  | Class Clown     | +10%/+25%/+50% profit when location changed  | 0.1/0.25/0.5    | profitBoost += amount if prev ≠ curr |
| 81  | Detention Dodge | Event immunity for 1 day                     | L1 only         | skip events for 1 day   |

### Utility & Protection

| ID  | Name            | Description                                              | L1/L2/L3 Values             | Code Effect                      |
| --- | --------------- | -------------------------------------------------------- | --------------------------- | -------------------------------- |
| 6   | Tapped In       | Preview upcoming events                                  | L1 only                     | 100% event hints                 |
| 67  | Safe House      | Protects wallet from bullies and stash from confiscation | L1 only                     | blocks bully + confiscation      |
| 24  | Shrinking Glass | 50%/75%/90% off deli candy                               | 0.5/0.25/0.1                | deli price x= amount             |
| 55  | Extra Credit    | +1 joker choice after minigames                          | L1 only                     | +1 pick                          |
| 56  | Sixth Sense     | +1 aura slot (hold 6 instead of 5)                       | L1 only                     | max aura slots += 1              |
| 94  | Deep Freeze     | Candy never melts                                        | L1 only                     | skip melt check                  |

---

## Full Calculation Example

Selling 10 Chocolate Gummy Bears (small candy) at $5 each, bought at $2 each:

| Step                                    | Detail             | Value    |
| --------------------------------------- | ------------------ | -------- |
| Base profit                             | ($5 - $2) x 10     | $30      |
| **Profit boost layer**                  | starts at 1 (100%) |          |
| + Cocoa Futures L1 (Chocolate)          | +50%               | 1.5      |
| + Combo Platter L1 (both types covered) | +100%              | 2.5      |
| + Even Stevens L1 (even inv)            | +50%               | 3.0      |
| Boosted profit                          | $30 x 3.0          | **$90**  |
| **Mult layer**                          | starts at 1        |          |
| + Bear Market L1 (Gummy)                | +1.5               | 2.5      |
| + Mint Condition L1 (small)             | +1.0               | 3.5      |
| Final profit                            | $90 x 3.5          | **$315** |

---

## Economy Constraints

| Constraint                    | Value                               |
| ----------------------------- | ----------------------------------- |
| Persistent (aura) joker slots | 5 (6 with Sixth Sense)              |
| One-time joker slots          | Unlimited                           |
| Allowance multiplier cap      | 8x combined                         |
| Stash interest cap            | $5,000/day                          |
| Upgrade L1->L2                | $5,000                              |
| Upgrade L2->L3                | $30,000                             |
| Candy melt window             | 5 periods (disabled by Deep Freeze) |
