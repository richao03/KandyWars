# Candy System

## Overview

SugarWars has **15 candies**, each with a unique combination of 2 types drawn from 6 possible types. Candies are grouped by **size** (5 small, 5 medium, 5 big), with size correlating to price (small = cheap, medium = mid, big = expensive). Each type appears exactly 5 times across all candies (C(6,2) = 15 unique pairs).

Sizes unlock progressively: small from Day 1, medium from Day 2, big from Day 3.

---

## Candy Registry

### Small candies

| Candy | Size | Types | Base Min | Base Max |
|-------|------|-------|----------|----------|
| Gummy Bears | Small | Gummy, Chewy | $0.10 | $2 |
| Jolly Ranchers | Small | Hard Candy, Fruity | $0.50 | $5 |
| Warheads | Small | Sour, Hard Candy | $1.50 | $10 |
| M&Ms | Small | Chocolate, Hard Candy | $3 | $15 |
| Nerd Rope | Small | Chewy, Fruity | $5 | $20 |

### Medium candies

| Candy | Size | Types | Base Min | Base Max |
|-------|------|-------|----------|----------|
| Bubble Gum | Medium | Gummy, Sour | $5 | $20 |
| Swedish Fish | Medium | Gummy, Fruity | $10 | $50 |
| Sour Straws | Medium | Sour, Chewy | $20 | $80 |
| Caramel | Medium | Hard Candy, Chewy | $40 | $150 |
| Snickers | Medium | Chocolate, Chewy | $60 | $200 |

### Big candies

| Candy | Size | Types | Base Min | Base Max |
|-------|------|-------|----------|----------|
| Tootsie Roll | Big | Gummy, Chocolate | $50 | $150 |
| Jaw Breaker | Big | Hard Candy, Gummy | $100 | $300 |
| Strawberry Bark | Big | Chocolate, Sour | $200 | $500 |
| Sour Patch Kids | Big | Sour, Fruity | $350 | $750 |
| Taffy | Big | Chocolate, Fruity | $500 | $1,000 |

---

## 6 Candy Types

Each type appears exactly 5 times across all 15 candies (size in parentheses):

| Type | Candies (Size) |
|------|----------------|
| Gummy | Gummy Bears (S), Bubble Gum (M), Swedish Fish (M), Jaw Breaker (B), Tootsie Roll (B) |
| Chocolate | M&Ms (S), Snickers (M), Tootsie Roll (B), Strawberry Bark (B), Taffy (B) |
| Hard Candy | Jolly Ranchers (S), Warheads (S), M&Ms (S), Caramel (M), Jaw Breaker (B) |
| Sour | Warheads (S), Bubble Gum (M), Sour Straws (M), Strawberry Bark (B), Sour Patch Kids (B) |
| Chewy | Gummy Bears (S), Nerd Rope (S), Sour Straws (M), Caramel (M), Snickers (M) |
| Fruity | Jolly Ranchers (S), Nerd Rope (S), Swedish Fish (M), Sour Patch Kids (B), Taffy (B) |

The six type identifiers are `gummy`, `chocolate`, `hard_candy`, `sour`, `chewy`, and `fruity`; the three sizes are `small`, `medium`, and `big`.

Multi-type candies trigger **all** matching joker effects independently. A candy with types [Gummy, Chocolate] activates both Gummy jokers and Chocolate jokers, with each matching joker's contribution summing additively into the profit-boost bucket (see Sale Profit Formula below).

---

## Price Generation

Prices are generated per-seed in `utils/generateSeededGameData.tsx`. Each period gets a fresh, independent random price drawn from the candy's `[baseMin, baseMax]` range, scaled by the current day. There is no global trend system, no carry-over from the previous period's price, and no mean reversion.

### Price Range
- Each period's price is drawn from `[periodMin, periodMax]` where `periodMin = baseMin × dayScale`.
- `periodMax = max(baseMax × dayScale, periodMin × sizeFloor)`, where `sizeFloor` is 5 for small, 3 for medium, 2 for big candies. This floor gives low-spread (especially small) candies some guaranteed upside.
- No artificial spike multipliers in the base prices — prices stay within their range unless an event overlay applies (see below).

### Per-Candy Volatility
Each candy gets a seeded volatility factor. Per size group, exactly one candy is forced to low volatility (`0.4`) and one to high volatility (`1.3`); the rest are randomized in roughly `0.4–1.3`. Volatility shapes the *distribution* of each period's random draw, not a trend: high-volatility candies (volatility > 0.8) use a U-shaped distribution that biases toward the low and high extremes of the range, while low-volatility candies draw uniformly. Volatility assignment uses a separate `seed + '-volatility'` RNG so it doesn't shift the main price sequence.

### Day-Based Price Scaling
Prices are compressed early and expand late:
- **Day 1**: Range compressed to 50% (`dayScale = 0.5`)
- **Day 5**: Full range unlocked (`dayScale = 1.0`)

`dayScale` interpolates linearly from 0.5 to 1.0 across the days. This creates natural progression — early game is safer, late game has bigger swings and potential payoffs.

### Difficulty Price-Range Shuffle
On difficulty levels above 3, the `[baseMin, baseMax]` ranges are Fisher–Yates shuffled (seeded) across candy names at game start, so a candy may trade at a different tier of prices than its name suggests.

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
| `baseMin` | Base minimum price for the candy |
| `baseMax` | Base maximum price for the candy |
| `cost` | Current market price |
| `quantityOwned` | Units in inventory |
| `averagePrice` | Weighted average purchase price (for profit calc) |
| `types` | Tuple of 2 candy type names |
| `size` | small, medium, or big |

---

## Sale Profit Formula

The canonical formula lives in `src/utils/saleCalculations.ts` and uses two additive (Balatro-style) buckets:

```
totalProfit = max(0, salePrice − purchasePrice) × quantity
profitBoost = 1 + Σ(profit-boost contributions)
multiplier  = 1 + Σ(multiplier contributions)
finalProfit = totalProfit × profitBoost × multiplier × penalties
totalGain   = (purchasePrice × quantity) + finalProfit
```

Where:
- `profitBoost` collects per-unit/profit-scaling contributions (candy TYPE jokers, hall pass bonus, Tax Collector %, Bulk Discount, scaling jokers like Reputation/Momentum/Compound Interest, etc.). Each contribution adds into the single bucket, so jokers do **not** multiply against each other.
- `multiplier` collects size jokers, conditional/one-time multipliers (Odd Todd, Pursuasion, size jokers, Lucky 7, etc.). Vacuum Sealer subtracts 2 from this bucket (floored at 1×). Hall pass *bonuses* (Final Exam +14 in the last period) fold additively into this bucket so they don't compound with the joker stack.
- `penalties` are the remaining multiplicative factors — e.g. the Final Exam off-period 0.25× penalty — which stay multiplicative so the punishment is unaffected by joker buildup.

Jokers that match either of a candy's two types apply their effects, and a multi-type candy fires every matching type joker independently into the profit-boost bucket.

**Selling at a loss:** if the current price is below the purchase price (`profitPerUnit` is 0), the player simply receives the current market value (`currentPrice × quantity`) rather than their purchase value plus profit.

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
