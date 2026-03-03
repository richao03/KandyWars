# Hall Pass System

## Overview

Hall passes are **permanent unlockable modifiers** that persist across games. Players earn them by hitting specific milestones, then select which ones to activate before starting a new game. Multiple passes can be active simultaneously, and their bonuses stack.

---

## All Hall Passes

### Common (White)

| Pass | Unlock | Effects |
|------|--------|---------|
| **Not a Freshman** | Win the game once | +50% profit bonus on candy sales |
| **Sophomore Swagger** | Win the game 3 times | +15 inventory slots |

### Magical (Green)

| Pass | Unlock | Effects |
|------|--------|---------|
| **Valedictorian Vendor** | Play every minigame at least once | +1 extra joker at selection screen |
| **Maximalist** | Deposit your entire wallet 4 times in one game | +1000% daily allowance |
| **Junior Genius** | Win with $100,000+ profit | +1000% daily allowance |

### Rare (Blue)

| Pass | Unlock | Effects |
|------|--------|---------|
| **Senior Executive** | Win the game 5 times | +75% profit bonus, +10 inventory slots |
| **Finance Club** | Win with $35,000+ in the piggy bank | 10% of previous day's profit added to daily allowance |
| **Forged Pass** | Win with 8+ jokers | +1 reroll in joker selection |

### Epic (Purple)

| Pass | Unlock | Effects |
|------|--------|---------|
| **Teacher's Pet** | Get stash confiscated 3+ times in one game | Confiscation only takes 25% of candy instead of 100% |
| **Inheritance** | Win with $50,000+ in the piggy bank | 10% of wallet transferred to piggy bank at start of each day |
| **Candy Kingpin** | Win the game 10 times | +125% profit bonus, +100% daily allowance |

### Legendary (Orange)

| Pass | Unlock | Effects |
|------|--------|---------|
| **Minimalist Master** | Win without using any jokers | +150% profit bonus |
| **High Roller** | Win and sell over 1,000 units of candy | +150% profit bonus, +15 inventory slots |
| **Perfect Scholar** | Win on difficulty level 6 | +1000% daily allowance |
| **Time Crunch** | Win with 50%+ profit from periods 1–4 | Only 6 periods/day, but +400% profit bonus |
| **Final Exam** | Win with 50%+ profit from periods 7–8 | Period 8 = 15x profit, periods 1–7 = -75% profit |
| **Speedrun Champion** | Win with fewer than 20 total sales | +100% sales profit |

**Total: 17 hall passes** (2 Common, 3 Magical, 3 Rare, 3 Epic, 6 Legendary)

---

## Mutual Exclusivity

**Time Crunch** and **Final Exam** cannot be selected together. Selecting one auto-deselects the other.

---

## Effect Types

Hall pass effects fall into 5 categories:

| Type | Stacking | Examples |
|------|----------|---------|
| `sale_price_bonus` | Additive | Not a Freshman (+10), Senior Executive (+15), Candy Kingpin (+25) |
| `inventory_bonus` | Additive | Sophomore Swagger (+15), Senior Executive (+10), High Roller (+15) |
| `allowance_bonus` | Additive (%) | Junior Genius (+1000%), Candy Kingpin (+100%) |
| `joker_bonus` | Additive | Valedictorian Vendor (+1) |
| `special` | Varies | Finance Club, Teacher's Pet, Time Crunch, Final Exam, etc. |

### Internal Value Multiplier

Sale price bonus values use an internal multiplier of **5x** for display:
- Internal value `10` = displayed as "+50% profit bonus"
- Internal value `15` = displayed as "+75% profit bonus"
- Internal value `25` = displayed as "+125% profit bonus"
- Internal value `30` = displayed as "+150% profit bonus"

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
}
```

Special passes get converted during computation:
- **Time Crunch**: +80 to `salePriceBonusPercent` (displayed as +400%)
- **Speedrun Champion**: +20 to `salePriceBonusPercent` (displayed as +100%)
- **Forged Pass**: +1 to `rerollBonusCount`

---

## Special Mechanics

### Finance Club
Each day, 10% of the previous day's profit is added to the daily allowance. Only applies when yesterday's profit was positive. Computed in `useWallet`.

### Inheritance
At the start of each day, 10% of the current wallet balance is automatically transferred to the piggy bank. Only applies when wallet balance is positive. Computed in `useWallet`.

### Teacher's Pet
When a STASH_LOCKED event fires, only 25% of the player's candy is confiscated instead of the full 100%. Checked in the event handler.

### Time Crunch
Reduces periods per day from 8 to 6, but all sales get a +400% profit bonus. Fewer opportunities but much higher payoff per sale.

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
3. Player toggles passes on/off with checkboxes
4. Accumulated effects are previewed at the bottom of the modal
5. Player taps "Let's go!" to proceed to difficulty selection
6. `computeHallPassModifiers()` runs on the selected passes
7. Modifiers are dispatched to `hallPassModifiersSlice` and applied throughout the game

Selected passes are preserved across game resets — the player doesn't have to re-select every time.

---

## Key Source Files

| File | Purpose |
|------|---------|
| `src/store/slices/hallPassSlice.ts` | All 17 pass definitions, Redux state, unlock/select reducers |
| `src/store/slices/hallPassModifiersSlice.ts` | Computed modifier state for active game |
| `src/hooks/useHallPass.ts` | Hook: unlock checks, effect getters, bonus application |
| `src/utils/computeHallPassModifiers.ts` | Combines selected passes into modifier object |
| `src/utils/hallPassUtils.ts` | Utility functions for applying bonuses to sales/allowance/inventory |
| `app/components/HallPassModal.tsx` | UI: gallery view + selection modal |
| `src/hooks/useWallet.ts` | Finance Club + Inheritance daily computations |
