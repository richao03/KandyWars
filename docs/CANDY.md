# Candy System

## Overview

SugarWars has **15 candies**, each with a unique combination of 2 types drawn from 6 possible types. Candies are spread across **5 price tiers** (3 candies per tier) for a smooth economic progression. Each type appears exactly 5 times across all candies (C(6,2) = 15 unique pairs).

---

## Candy Registry

### Tier 1 — Penny ($1–$10)

| Candy | Size | Types | Base Min | Base Max |
|-------|------|-------|----------|----------|
| Gummy Bears | Small | Gummy, Chewy | $1 | $10 |
| Jolly Ranchers | Small | Hard Candy, Fruity | $2 | $8 |
| Warheads | Small | Sour, Hard Candy | $3 | $10 |

### Tier 2 — Budget ($10–$200)

| Candy | Size | Types | Base Min | Base Max |
|-------|------|-------|----------|----------|
| M&Ms | Small | Chocolate, Hard Candy | $10 | $200 |
| Nerd Rope | Small | Chewy, Fruity | $15 | $150 |
| Bubble Gum | Medium | Gummy, Sour | $20 | $200 |

### Tier 3 — Mid ($200–$1,000)

| Candy | Size | Types | Base Min | Base Max |
|-------|------|-------|----------|----------|
| Swedish Fish | Medium | Gummy, Fruity | $200 | $800 |
| Sour Straws | Medium | Sour, Chewy | $250 | $900 |
| Caramel | Medium | Hard Candy, Chewy | $300 | $1,000 |

### Tier 4 — Premium ($1,000–$5,000)

| Candy | Size | Types | Base Min | Base Max |
|-------|------|-------|----------|----------|
| Snickers | Medium | Chocolate, Chewy | $1,000 | $4,000 |
| Jaw Breaker | Big | Hard Candy, Gummy | $1,200 | $4,500 |
| Tootsie Roll | Big | Gummy, Chocolate | $1,500 | $5,000 |

### Tier 5 — Elite ($5,000–$10,000)

| Candy | Size | Types | Base Min | Base Max |
|-------|------|-------|----------|----------|
| Strawberry Bark | Big | Chocolate, Sour | $5,000 | $9,000 |
| Sour Patch Kids | Big | Sour, Fruity | $5,500 | $10,000 |
| Taffy | Big | Chocolate, Fruity | $6,000 | $10,000 |

---

## 6 Candy Types

Each type appears exactly 5 times across all 15 candies:

| Type | Candies (Tier) |
|------|----------------|
| Gummy | Gummy Bears (T1), Bubble Gum (T2), Swedish Fish (T3), Jaw Breaker (T4), Tootsie Roll (T4) |
| Chocolate | M&Ms (T2), Snickers (T4), Tootsie Roll (T4), Strawberry Bark (T5), Taffy (T5) |
| Hard Candy | Jolly Ranchers (T1), Warheads (T1), M&Ms (T2), Caramel (T3), Jaw Breaker (T4) |
| Sour | Warheads (T1), Bubble Gum (T2), Sour Straws (T3), Strawberry Bark (T5), Sour Patch Kids (T5) |
| Chewy | Gummy Bears (T1), Nerd Rope (T2), Sour Straws (T3), Caramel (T3), Snickers (T4) |
| Fruity | Jolly Ranchers (T1), Nerd Rope (T2), Swedish Fish (T3), Sour Patch Kids (T5), Taffy (T5) |

Multi-type candies trigger **all** matching joker effects independently (multiplicative stacking). A candy with types [Gummy, Chocolate] activates both Gummy jokers and Chocolate jokers.

---

## Price Generation

Prices are generated per-seed in `utils/generateSeededGameData.tsx`. Each candy trades within its `[baseMin, baseMax]` range, scaled by the current day.

### Price Range
- Prices are clamped to `[baseMin × dayScale, baseMax × dayScale]`
- No artificial spike multipliers — prices stay within their intended tier

### Per-Candy Volatility
Each candy gets a seeded volatility factor (0.3–1.5). Low volatility = stable, predictable prices. High volatility = wild swings. Each size group has 1 guaranteed low-vol and 1 guaranteed high-vol candy.

### Per-Candy Home Price
Each candy gets a unique "home price" — a resting point between 20%–80% of its range. This is what makes same-tier candies trade at different levels (e.g., one Tier 4 candy might hover around $1,800, another around $3,500). Gentle mean reversion pulls prices back toward the home price.

### Random Walk / Momentum
Prices are based on the previous period's price plus a delta, creating visible trends rather than pure noise. The delta combines trend bias, random noise, mean reversion toward home price, and occasional shocks (10% chance per period).

### Day-Based Price Scaling
Prices are compressed early and expand late:
- **Day 1**: Range compressed to 50% (`dayScale = 0.5`)
- **Day 5**: Full range unlocked (`dayScale = 1.0`)

This creates natural progression — early game is safer, late game has bigger swings and potential payoffs.

### Trend Clusters
Prices trend in one direction for 2–5 periods before reversing. This creates buy-the-dip and sell-the-peak patterns that reward attentive players.

### Event Overlays
On top of base prices, special events can modify prices:
- **PRICE_SPIKE**: Multiplies price by 5x (capped at 5× the base price)
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
