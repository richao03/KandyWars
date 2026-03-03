# Candy System

## Overview

SugarWars has **15 candies**, each with a unique combination of 2 types drawn from 6 possible types. Candies are divided into 3 size tiers that determine their base price range. Each type appears exactly 5 times across all candies (C(6,2) = 15 unique pairs).

---

## Candy Registry

### Small Candies ($1–$10 base)

| Candy | Types | Base Min | Base Max |
|-------|-------|----------|----------|
| Gummy Bears | Gummy, Chewy | $1 | $10 |
| M&Ms | Chocolate, Hard Candy | $1 | $10 |
| Jolly Ranchers | Hard Candy, Fruity | $1 | $10 |
| Warheads | Sour, Hard Candy | $1 | $10 |
| Nerd Rope | Chewy, Fruity | $1 | $10 |

### Medium Candies ($500–$1,000 base)

| Candy | Types | Base Min | Base Max |
|-------|-------|----------|----------|
| Swedish Fish | Gummy, Fruity | $500 | $1,000 |
| Snickers | Chocolate, Chewy | $500 | $1,000 |
| Caramel | Hard Candy, Chewy | $500 | $1,000 |
| Sour Straws | Sour, Chewy | $500 | $1,000 |
| Bubble Gum | Gummy, Sour | $500 | $1,000 |

### Big Candies ($1,000–$2,000 base)

| Candy | Types | Base Min | Base Max |
|-------|-------|----------|----------|
| Tootsie Roll | Gummy, Chocolate | $1,000 | $2,000 |
| Strawberry Bark | Chocolate, Sour | $1,000 | $2,000 |
| Jaw Breaker | Hard Candy, Gummy | $1,000 | $2,000 |
| Sour Patch Kids | Sour, Fruity | $1,000 | $2,000 |
| Taffy | Chocolate, Fruity | $1,000 | $2,000 |

---

## 6 Candy Types

| Type | Candies |
|------|---------|
| Gummy | Gummy Bears, Swedish Fish, Bubble Gum, Tootsie Roll, Jaw Breaker |
| Chocolate | M&Ms, Snickers, Tootsie Roll, Strawberry Bark, Taffy |
| Hard Candy | M&Ms, Jolly Ranchers, Warheads, Caramel, Jaw Breaker |
| Sour | Warheads, Sour Straws, Bubble Gum, Strawberry Bark, Sour Patch Kids |
| Chewy | Gummy Bears, Nerd Rope, Snickers, Caramel, Sour Straws |
| Fruity | Jolly Ranchers, Nerd Rope, Swedish Fish, Sour Patch Kids, Taffy |

Multi-type candies trigger **all** matching joker effects independently (multiplicative stacking). A candy with types [Gummy, Chocolate] activates both Gummy jokers and Chocolate jokers.

---

## Price Generation

Prices are generated per-seed in `utils/generateSeededGameData.tsx`. The system uses 5 layered features to make each candy feel unique:

### Price Range
- **Max spike price**: `baseMax * 14` (e.g., small candies max at $140, big at $28,000)
- **Floor price**: `max(maxSpikePrice * 0.03, 0.01)`

### Feature 1: Per-Candy Volatility
Each candy gets a seeded volatility factor (0.3–2.0). Low volatility = stable, predictable prices. High volatility = wild swings with high-risk/high-reward potential.

### Feature 2: Random Walk / Momentum
Prices are based on the previous period's price plus a delta, creating visible trends rather than pure noise. The delta combines trend bias, random noise, mean reversion, and occasional shocks.

### Feature 3: Day-Based Price Scaling
Prices are compressed early and expand late:
- **Day 1**: Ceiling at 50% of max spike price
- **Day 5**: Full ceiling unlocked

This creates natural progression — early game is safer, late game has bigger swings and potential payoffs.

### Feature 4: Per-Candy Personality Bands
Each candy gets a seeded "center" and "width" within its size tier. Some candies tend cheap, others premium. This means not all small candies behave the same — Gummy Bears might hover low while Warheads run hot.

### Feature 5: Trend Clusters
Prices trend in one direction for 2–5 periods before reversing. This creates buy-the-dip and sell-the-peak patterns that reward attentive players.

### Event Overlays
On top of base prices, special events can modify prices:
- **PRICE_SPIKE**: Multiplies price by 5x (capped at $100 for small)
- **PRICE_DROP**: Multiplies price by 0.2x (floored at $0.01)

These are location-specific and appear as hints the period before.

---

## Candy Properties at Runtime

Each candy in the player's inventory tracks:

| Property | Description |
|----------|-------------|
| `name` | Display name |
| `baseMin` | Tier minimum price |
| `baseMax` | Tier maximum price |
| `cost` | Current market price |
| `quantityOwned` | Units in inventory |
| `averagePrice` | Weighted average purchase price (for profit calc) |
| `types` | Tuple of 2 candy type names |
| `size` | small, medium, or big |

---

## Sale Profit Formula

```
profit = (baseProfit + flatBonuses) * multipliers
```

Where:
- `baseProfit` = `salePrice - purchasePrice` per unit
- `flatBonuses` = additive bonuses from jokers (e.g., +$5 per sale)
- `multipliers` = multiplicative bonuses from jokers (e.g., 2x for Gummy type)

Jokers that match either of a candy's two types apply their effects. Multiple matching jokers stack multiplicatively.

---

## Key Source Files

| File | Purpose |
|------|---------|
| `src/constants/candyRegistry.ts` | Single source of truth for all 15 candies |
| `src/types/candy.tsx` | TypeScript types (`Candy`, `CandyTypeName`, `CandySize`) |
| `utils/generateSeededGameData.tsx` | Seeded price generation algorithm |
| `src/utils/saleCalculations.ts` | Profit formula and joker effect application |
| `app/(tabs)/market.tsx` | Market UI for buying/selling |
| `app/(tabs)/price-history.tsx` | Price history chart |
| `app/components/CandyListItem.tsx` | Individual candy display component |
