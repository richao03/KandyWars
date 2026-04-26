---
sidebar_position: 3
---

# Sale Celebration Tiers

When a candy is sold, the game classifies the sale into one of seven **celebration tiers**. The tier drives the visual + audio + haptic ceremony shown in `TransactionModal`'s scoring animation: spark particle counts, palette colors, climax burst intensity, coin-cascade timing, and haptic strength.

Tiers are computed by `src/utils/computeEffectTier.ts` and surfaced to the visuals via `src/utils/sparkController.ts`.

## Quick Reference

| Tier      | Particles | Palette                     | Symbols    |
|-----------|-----------|-----------------------------|------------|
| `none`    | 0         | —                           | —          |
| `bronze`  | 3         | Muted greens                | `$`        |
| `silver`  | 5         | Bright greens               | `$`        |
| `gold`    | 7         | Forest greens               | `$`, `$$`  |
| `emerald` | 12        | Rich greens                 | `$`, `$$`  |
| `sapphire`| 20        | Teal → cyan                 | `$$`, `$$$`|
| `jackpot` | 24        | Deep blue                   | `💎`, `$$$`|

## Trigger Rules

The final tier is the **MAX** across four independent rules. Each rule can promote (never demote) the tier:

### 1. Absolute-gain ladder *(primary)*

Based on `totalGain` — the total amount the player receives from the sale (purchase value + final profit).

| `totalGain` range | Tier      |
|-------------------|-----------|
| `<= 0` or `< 100` | `none`    |
| `[100, 500)`      | `bronze`  |
| `[500, 1000)`     | `silver`  |
| `[1000, 5000)`    | `gold`    |
| `[5000, 10000)`   | `emerald` |
| `[10000, 30000)`  | `sapphire`|
| `>= 30000`        | `jackpot` |

### 2. Ratio override *(Clover-Pit rule)*

When a tiny purchase blows up into a respectable gain, even a small absolute payout deserves celebration. Skipped when `purchaseValue <= 0`.

| `totalGain / purchaseValue` | Promotes to |
|-----------------------------|-------------|
| `>= 20`                     | `jackpot`   |
| `>= 10`                     | `sapphire`  |

### 3. Combo override *(many jokers firing)*

Number of jokers that contributed bonuses on this sale.

| `jokerBonusCount` | Promotes to |
|-------------------|-------------|
| `>= 7`            | `sapphire`  |
| `>= 5`            | `emerald`   |
| `>= 3`            | `gold`      |

### 4. Crit override *(single huge multiplier)*

Largest single multiplier any one joker contributed to the sale.

| `maxJokerMult` | Promotes to |
|----------------|-------------|
| `>= 8`         | `jackpot`   |
| `>= 5`         | `sapphire`  |
| `>= 3`         | `emerald`   |

### Edge cases

- `totalGain <= 0` (or `NaN`) → always returns `none` and short-circuits with empty symbols and palette.
- `purchaseValue <= 0` → ratio rule is skipped (no divide-by-tiny boost).
- `NaN` in any field → coerced to `0`. The function still returns a valid result.

## What each tier drives

The tier feeds three subsystems:

1. **`SparkController`** — particle count and palette via `getTierParticleCount(tier)` and `getTierPalette(tier)`. Used by both:
   - `SparkController.arc({ from, to, tier, symbol })` — particle arc from a joker icon to the running total
   - `SparkController.burst({ origin, tier })` — climax explosion at the running-total position
2. **Audio** — `playJokerChip(i)` / `playJokerMult(i)` per cascade step + `playCoinCascade()` at climax. Tier doesn't change which sounds play, but more sounds layer when more jokers fire.
3. **Haptics** — `triggerTieredHaptic(intensity, kind)` at the climax (intensity ≈ 0.9, kind = `success`). Tier doesn't change haptic intensity directly, but the ceremony length scales with `scoringSteps.length`.

## Big-sale screen FX (independent ladder)

Layered **on top** of the tier-aware sparks above, sales over certain dollar thresholds also trigger screen-wide celebrations driven by `computeBigSaleFX(totalGain)` and `ScreenFXController`:

| `totalGain` | Screen Shake | Edge Lights |
|-------------|--------------|-------------|
| `< 6,000`   | —            | —           |
| `>= 6,000`  | ✓ 6px / 2 cycles, 350ms | — |
| `>= 10,000` | ✓ 8px / 3 cycles, 450ms | ✓ cyan/teal pulse, 1.8s |
| `>= 15,000` | ✓ 10px / 3 cycles, 500ms | ✓ purple/magenta pulse, 2.1s |
| `>= 20,000` | ✓ 14px / 4 cycles, 600ms | ✓ pink/orange/yellow pulse, 2.4s |

**Notes:**

- These are **additive**: a $20k sale gets all three effects layered on top of the jackpot tier's spark burst.
- The system is gated by `juiceSettings.reduceMotion` — none of these fire when reduce-motion is enabled.
- All animations use the post-RE4-migration pattern (no worklet callbacks; no `withTiming` third-arg callback).
- Edge lights are four thin (~22px) bands on the screen edges (top/bottom/left/right). Each band is rendered as an SVG with:
  - A **straight outer boundary** flush with the screen edge
  - A **wavy inner boundary** (sin-wave sampled, ~5px amplitude, ~38px wavelength)
  - A **linear gradient** fading from full color at the outer edge to transparent at the inner edge
  - A **per-side palette color** picked from `EDGE_LIGHT_PALETTES[tier]` so each side shows a different hue
- The whole ring pulses opacity 0 → 1 → 0.45 → 1 → ... → 0 over the configured duration, then auto-fades.
- Source files:
  - `src/utils/computeBigSaleFX.ts` — pure threshold mapping
  - `src/utils/screenFXController.ts` — singleton API (mirrors `SparkController`)
  - `app/components/ScreenFX.tsx` — owner component, wraps the navigator and renders flash + edge bands
  - `app/_layout.tsx` — mounts `<ScreenFX>` around the root `<Stack>`

## Palette source-of-truth

Both `computeEffectTier.ts` and `sparkController.ts` carry their own copy of `TIER_PALETTE`. They are kept aligned by hand — if you change colors in one, change them in both. The legacy "sellValue tier colors" originally lived in `TransactionModal.tsx` around the sparkColors block; tier palettes mirror those to preserve the established visual language.

## Previewing tiers

In `__DEV__` builds, **Settings → Debug Tools → 🎨 Sale Tier Preview** opens a screen that fires the actual scoring cascade for any chosen tier — joker chip/mult sounds, particle arc, climax burst, coin cascade, and tiered haptic. Useful for visual QA without running real sales.

## Related files

- `src/utils/computeEffectTier.ts` — pure tier classification, well-tested in `src/__tests__/computeEffectTier.test.ts`
- `src/utils/sparkController.ts` — global controller + palette/particle-count tables
- `app/components/SparkEffect.tsx` — `<SparkPool />` renderer + per-spark animations
- `app/components/TransactionModal.tsx` — `runScoringAnimation` consumes the tier in Phase 4 (climax)
- `app/debug-tier-preview.tsx` — dev-only preview screen
