# SugarWars — Merchant Items (The Connect)

## Overview

**The Connect** is a special merchant location with a **40% chance** of appearing each period. It offers 9 items: 5 leveled (permanent upgrades within a run) and 4 consumable (single-use charges), plus a separate **daily joker** for direct purchase (see [Daily Joker](#daily-joker)). All items reset on game reset.

---

## Leveled Items

Leveled items are permanent upgrades that persist across periods within a single run. Each can be upgraded multiple times up to a max level.

### Forged Document (`fake_report_card`)

| Level | Price | Effect |
|-------|-------|--------|
| 1 | $5,000 | 2x daily allowance |
| 2 | $15,000 | 4x daily allowance |
| 3 | $35,000 | 8x daily allowance |

Exponential scaling: `2^level`. Applied via `MerchantUtils.applyAllowanceBonus()` in `useWallet.ts`.

### Metal Detector (`metal_detector`)

| Level | Price | Effect |
|-------|-------|--------|
| 1 | $10,000 | 2x found money |
| 2 | $25,000 | 4x found money |
| 3 | $50,000 | 8x found money |

Multiplies FOUND_MONEY event amounts. Applied via `MerchantUtils.applyFoundMoneyMultiplier()` in `useEventHandler.ts`.

### Hollowed Textbook (`hollowed_textbook`)

| Level | Price | Effect |
|-------|-------|--------|
| 1 | $2,000 | +10 inventory |
| 2 | $5,000 | +20 inventory |
| 3 | $15,000 | +30 inventory |
| 4 | $25,000 | +40 inventory |
| 5 | $35,000 | +50 inventory |

Linear: +10 per level. Applied via `MerchantUtils.applyInventoryBonus()` in `useInventory.ts`.

### Street Cred (`street_cred`)

| Level | Price | Effect |
|-------|-------|--------|
| 1 | $5,000 | +10% profit |
| 2 | $15,000 | +20% profit |
| 3 | $30,000 | +30% profit |
| 4 | $45,000 | +40% profit |
| 5 | $55,000 | +50% profit |

Linear: +10% per level. The canonical sale path applies it inline in `saleCalculations.ts` as `profitBoost += level * 0.1`. The `MerchantUtils.applyProfitBonus()` helper performs the same +10%/level math and is used by `useHallPass.ts`.

### Lucky Coin (`double_sided_coin`)

| Level | Price | Effect |
|-------|-------|--------|
| 1 | $10,000 | 25% chance to convert negative event to positive |
| 2 | $30,000 | 50% chance |
| 3 | $45,000 | 75% chance |

Applied via `MerchantUtils.shouldConvertNegativeEvent()` in `useEventHandler.ts`.

---

## Consumable Items

Consumable items are single-use charges. Prices increase by **1.75x** per additional purchase within the same merchant visit. Visit purchase counts reset each time the merchant appears.

### Social Shoutout (`influencer_shoutout`)

| Purchase | Price |
|----------|-------|
| 1st | $8,000 |
| 2nd | $14,000 |
| 3rd | $24,500 |

**Effect:** +200% profit on the next sale (consumed after sale).
Applied in `saleCalculations.ts` as a `profitBoost += 2.0` addition to the profit-boost bucket. Consumed in `market.tsx` after the sale completes.

### Monitor Bribe (`hall_monitor_bribe`)

| Purchase | Price |
|----------|-------|
| 1st | $4,000 |
| 2nd | $7,000 |

**Effect:** Prevents one STASH_LOCKED confiscation event (consumed on trigger).
Priority 2 protection — checked after the Safe House joker. Consumed in `useEventHandler.ts`.

### Kid Guard (`sixth_grade_bodyguard`)

| Purchase | Price |
|----------|-------|
| 1st | $2,000 |
| 2nd | $3,500 |

**Effect:** Prevents one LOSE_MONEY bully event (consumed on trigger).
Priority 2 protection — checked after the Safe House joker. Consumed in `useEventHandler.ts`.

### Delivery Drone (`air_delivery_drone`)

| Purchase | Price |
|----------|-------|
| 1st | $7,000 |
| 2nd | $12,250 |

**Effect:** Deposit wallet money into piggy bank from anywhere (consumed on successful deposit).
Opens a StashMoneyModal. If the player backs out without depositing, the charge is NOT consumed.

---

## Protection Priority

When negative events fire, protection items are checked in order:

| Event | Priority 1 (Joker) | Priority 2 (Merchant) |
|-------|--------------------|-----------------------|
| LOSE_MONEY | Safe House | Kid Guard |
| STASH_LOCKED | Safe House | Monitor Bribe |

The Safe House joker (ID 67) is a single merged aura that protects both the wallet (LOSE_MONEY) and the stash (STASH_LOCKED). It takes priority over the merchant items and, being a persistent aura, is NOT consumed on use. If the joker is present, the merchant item is left untouched; otherwise the merchant item is consumed on trigger.

---

## Consumable Price Formula

```
price = Math.floor(basePrice * 1.75 ^ purchaseCountThisVisit)
```

Purchase counts reset each time the merchant spawns (not per day, per visit).

---

## Daily Joker

Separate from the 9 shop items, The Connect also offers **one joker per day** for direct purchase.

- **Selection:** Seeded and deterministic — `generateDailyJoker` picks an index into `STANDARDIZED_JOKERS` via `seedrandom(\`${seed}-daily-joker-${day}\`)`. The same seed+day always yields the same joker.
- **Once per day:** Generation is cached by `generatedForDay`; re-generating on the same day is a no-op. `markDailyJokerPurchased` flags it as bought.
- **Pricing** (`selectDailyJokerPrice`): depends on whether you already own the offered joker and at what level —

  | Situation | Price |
  |-----------|-------|
  | New joker (not owned) | $5,000 |
  | Owned at L1 → upgrade to L2 | $5,000 |
  | Owned at L2 → upgrade to L3 | $30,000 |

  These match the `UPGRADE_L1_TO_L2` / `UPGRADE_L2_TO_L3` constants in `shopkeeperData.ts`.

State lives in `merchantSlice.ts` (`dailyJoker`, actions `generateDailyJoker` / `markDailyJokerPurchased`, selectors `selectDailyJoker` / `selectDailyJokerPrice`).

---

## Key Source Files

| File | Purpose |
|------|---------|
| `src/store/slices/merchantSlice.ts` | All 9 item definitions, Redux state, purchase/consume actions |
| `src/utils/merchantUtils.ts` | Effect application helpers (allowance, profit, inventory, found money, event conversion) |
| `app/merchant-shop.tsx` | Shop UI and purchase flow |
| `app/components/LocationModal.tsx` | 40% spawn chance gating |
