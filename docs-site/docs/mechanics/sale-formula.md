---
sidebar_position: 1
---

# Sale Formula

```
finalProfit = (baseProfit x profitBoost) x multiplier x finalExamMultiplier
```

## Layers

### 1. Base Profit
```
profitPerUnit = max(0, currentPrice - purchasePrice)
totalProfit = profitPerUnit x quantity
```

### 2. Profit Boost (additive)
Starts at **1.0** (100%). Jokers and hall passes ADD to this.

Sources:
- Candy type jokers (Cocoa Futures, Hard Knocks, etc.)
- Conditional profit jokers (Even Stevens, Golden Hour, Early Bird, etc.)
- Scaling profit jokers (Momentum, Reputation, Compound Interest)
- Hall pass sale bonus (`salePriceBonusPercent * 5 / 100`)
- Bulk Discount, Tax Collector, Combo Platter

```
boostedProfit = totalProfit x profitBoost
```

### 3. Multiplier (additive)
Starts at **1.0**. Mult jokers ADD to this.

Sources:
- Size multipliers (Mint Condition, King Size, Medium Rare)
- Candy type multipliers (Bear Market)
- Conditional multipliers (Odd Todd, Broke and Hungry, All In, etc.)
- Scaling multipliers (Street Smarts, Clearance Sale, Hoarder, etc.)
- Tradeoff jokers (Sugar Rush, Contraband, Hot Potato)

```
finalProfit = boostedProfit x multiplier
```

### 4. Final Exam (if active)
- Last period: **15x**
- Other periods: **0.25x** (-75%)

### 5. Total Gain
```
totalGain = purchaseValue + finalProfit   (if selling at profit)
totalGain = marketValue                   (if selling at loss)
```
