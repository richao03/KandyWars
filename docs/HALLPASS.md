# Hall Pass System

## Overview

Hall passes are **permanent unlockable modifiers** that persist across games. Players earn them by hitting specific milestones, then select which ones to activate before starting a new game. Multiple passes can be active simultaneously, and their bonuses stack — up to an **active-pass cap** (see below).

---

## Active Pass Limit

A run can have at most **3 hall passes active at once** (`BASE_MAX_ACTIVE_HALL_PASSES` in `hallPassSlice.ts`). The cap is **data-driven and extensible**: any pass carrying an `extra_active_slot` effect widens it.

- **Overachiever** (legendary) grants `extra_active_slot: 2`, raising the cap from 3 → 5. The expander itself occupies a slot, so a build with Overachiever runs *Overachiever + 4 others = 5 total*.
- The effective cap is `getHallPassActiveLimit(passes)` = `3 + Σ(extra_active_slot values)`.
- Enforced centrally in the `selectHallPass` reducer (the candidate pass is included in the limit calc, so an extension pass can always be added to raise its own cap). The selection modal (`app/components/HallPassModal.tsx`, the "Hall Pass Binder") mirrors this: it renders one backpack slot per allowed pass (filled slots show the pass icon and can be tapped to unclip), an `X/max` counter, and flashes the card red on a rejected tap past the cap.
- Adding a new cap-extending pass requires **no code changes** beyond the pass definition — just give it an `extra_active_slot` effect.

---

## All Hall Passes

### Common (White) — 2 passes

| Pass | Unlock | Effects |
|------|--------|---------|
| **Not a Freshman** | Win the game once | +50% profit bonus on candy sales |
| **Sophomore Swagger** | Win the game 3 times | +15 inventory slots |

### Magical (Green) — 3 passes

| Pass | Unlock | Effects |
|------|--------|---------|
| **The Valedictorian** | Play every single minigame at least once | 50% chance to skip a minigame and go straight to a joker reward |
| **Maximalist** | Deposit your entire wallet 4 times in one game | +1000% daily allowance |
| **Junior Genius** | Win with $100,000+ profit | All jokers obtained start at Level 2 |

### Rare (Blue) — 3 passes

| Pass | Unlock | Effects |
|------|--------|---------|
| **Senior Executive** | Win the game 5 times | Start with $2,000 instead of $20 |
| **Finance Club** | Win with $35,000+ in the piggy bank | 10% of previous day's profit added to daily allowance |
| **Forged Pass** | Win with 8+ jokers | +1 reroll in joker selection |

### Epic (Purple) — 3 passes

| Pass | Unlock | Effects |
|------|--------|---------|
| **Teacher's Pet** | Get stash confiscated 3+ times in one game | Confiscation only takes 25% of candy instead of 100% |
| **Inheritance** | Win with $50,000+ in the piggy bank | 10% of wallet transferred to piggy bank at start of each day |
| **Candy Kingpin** | Win the game 10 times | +125% profit bonus, +100% daily allowance |

### Legendary (Orange) — 8 passes

| Pass | Unlock | Effects |
|------|--------|---------|
| **Minimalist Master** | Win without using any jokers | +150% profit bonus |
| **High Roller** | Win and sell over 1,000 units of candy | +150% profit bonus, +15 inventory slots |
| **Perfect Scholar** | Play 75 minigames (lifetime) | 75% chance to skip a minigame and go straight to a joker reward |
| **Time Crunch** | Win with 50%+ profit from periods 1–4 | Start with medium candy unlocked |
| **Final Exam** | Win with 50%+ profit from periods 7–8 | Period 8 = 15x profit, periods 1–7 = -75% profit |
| **Speedrun Champion** | Win a run with a single sale over $10,000 | +100% sales profit |
| **Joker Monopoly** | Win 100 minigames (lifetime) | 90% chance to skip a minigame and go straight to a joker reward |
| **Overachiever** | Win a run with 3 hall passes active | +2 active-pass slots (max active 3 → 5) |

---

## Mutual Exclusivity

No mutual exclusions currently.

---

## Effect Types

Hall pass effects fall into these categories:

| Type | Stacking | Examples |
|------|----------|---------|
| `sale_price_bonus` | Additive | Not a Freshman (+10), Candy Kingpin (+25), Minimalist Master / High Roller (+30) |
| `inventory_bonus` | Additive | Sophomore Swagger (+15), High Roller (+15) |
| `allowance_bonus` | Additive (%) | Maximalist (+1000%), Candy Kingpin (+100%) |
| `joker_bonus` | Additive | (no pass currently uses this effect) |
| `minigame_skip_chance` | Max (not sum) | The Valedictorian (0.5), Perfect Scholar (0.75), Joker Monopoly (0.9) |
| `extra_active_slot` | Additive | Overachiever (+2 active-pass slots) — selection-time only, no in-game modifier |
| `special` | Varies | Finance Club, Teacher's Pet, Time Crunch, Final Exam, etc. |

### Internal Value Multiplier

Sale price bonus values use an internal multiplier of **5x** for display:
- Internal value `10` = displayed as "+50% profit bonus" (Not a Freshman)
- Internal value `20` = displayed as "+100% profit bonus" (Speedrun Champion, added via special)
- Internal value `25` = displayed as "+125% profit bonus" (Candy Kingpin)
- Internal value `30` = displayed as "+150% profit bonus" (Minimalist Master, High Roller)

---

## Computed Modifiers

When a game starts, all selected passes are combined into a single `HallPassModifiers` object:

```typescript
interface HallPassModifiers {
  salePriceBonusPercent: number;   // Accumulated sale bonus %
  inventoryBonusSlots: number;     // Accumulated extra slots
  allowanceBonusPercent: number;   // Accumulated allowance bonus %
  jokerBonusCount: number;         // Extra jokers at selection
  rerollBonusCount: number;        // Extra rerolls at selection
  salesMultiplier: number;         // Flat sales multiplier (default 1x)
  minigameSkipChance: number;      // 0..1 — highest skip chance of selected passes
}
```

Special passes get converted during computation:
- **Speedrun Champion**: +20 to `salePriceBonusPercent` (displayed as +100%)
- **Forged Pass**: +1 to `rerollBonusCount`
- **Time Crunch**: Dispatches `unlockMediumCandies()` at game start (no modifier)

Minigame-skip passes set `minigameSkipChance` to the **MAX** of their values (not the sum), so multiple skip passes share a single roll at the highest probability: The Valedictorian (0.5), Perfect Scholar (0.75), Joker Monopoly (0.9).

---

## Special Mechanics

### Finance Club
Each day, 10% of the previous day's profit is added to the daily allowance. Only applies when yesterday's profit was positive. Computed in `useWallet`.

### Inheritance
At the start of each day, 10% of the current wallet balance is automatically transferred to the piggy bank. Only applies when wallet balance is positive. Computed in `useWallet`.

### Teacher's Pet
When a STASH_LOCKED event fires, only 25% of the player's candy is confiscated instead of the full 100%. Checked in the event handler.

### Time Crunch
Starts the game with medium candy already unlocked (normally unlocked Day 2 at $500). Applied in `SugarWarsTitleScreen.tsx` at game init by dispatching `unlockMediumCandies()`.

### Final Exam
Completely reshapes the day:
- **Periods 1–7**: Sales earn only 25% of normal profit (-75%)
- **Period 8**: Sales earn 15x normal profit

Rewards patience — stockpile candy and dump everything in the last period.

---

## Unlock Flow

1. Player completes a game
2. Game-end screen calculates final stats (profit, sales count, joker count, piggy bank, etc.)
3. `checkUnlockRequirements(gameStats)` runs against all locked passes
4. Newly unlocked passes are dispatched via `unlockHallPass({ passId })`
5. UI shows a "Hall Passes Unlocked" section with the new passes
6. Unlocked passes persist via redux-persist (and sync to Firebase)

---

## Selection Flow

1. Player taps "New Game" on the title screen
2. If any passes are unlocked, the Hall Pass Modal opens in selection mode
3. Player toggles passes on/off with checkboxes, up to the active-pass cap (default 3, see [Active Pass Limit](#active-pass-limit)). Taps beyond the cap are ignored.
4. Accumulated effects are previewed at the bottom of the modal, alongside an `X / max` selected counter
5. Player taps "Let's go!" to proceed to difficulty selection
6. `computeHallPassModifiers()` runs on the selected passes
7. Modifiers are dispatched to `hallPassModifiersSlice` and applied throughout the game

Selected passes are preserved across game resets — the player doesn't have to re-select every time.

---

## Key Source Files

| File | Purpose |
|------|---------|
| `src/store/slices/hallPassSlice.ts` | All 19 pass definitions, Redux state, unlock/select reducers |
| `src/store/slices/hallPassModifiersSlice.ts` | Computed modifier state for active game |
| `src/hooks/useHallPass.ts` | Hook: unlock checks, effect getters, bonus application |
| `src/utils/computeHallPassModifiers.ts` | Combines selected passes into modifier object |
| `src/utils/hallPassUtils.ts` | Utility functions for applying bonuses to sales/allowance/inventory |
| `app/components/HallPassModal.tsx` | UI: gallery view + selection modal |
| `src/hooks/useWallet.ts` | Finance Club + Inheritance daily computations |
