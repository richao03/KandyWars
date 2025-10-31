# PR Review: Time Crunch & Vacuum Sealer Implementation
**Reviewer:** Staff Engineer (Edge Case & Bug Hunter)
**Date:** 2025-10-25
**Branch:** Current implementation
**Severity Levels:** 🔴 Critical | 🟠 High | 🟡 Medium | 🔵 Low

---

## Executive Summary

This PR implements two major features:
1. **Vacuum Sealer** early sale penalty tracking (-50% profit if any sale before period 6)
2. **Time Crunch** hall pass (6 periods/day instead of 8, with 4x sales profit)

**Overall Assessment:** ⚠️ **NOT PRODUCTION READY**

**Critical Issues Found:** 5
**High Priority Issues:** 3
**Medium Priority Issues:** 4
**Low Priority Issues:** 2

---

## 🔴 CRITICAL ISSUES

### 1. Time Crunch Hall Pass Cannot Be Unlocked
**File:** `src/hooks/useHallPass.ts` (Lines 164-260)
**Severity:** 🔴 **BLOCKER**

**Problem:**
The `checkUnlockRequirements` function has NO unlock logic for:
- `time_crunch` - Win with 50%+ profit from periods 1-4
- `final_exam` - Win with 50%+ profit from periods 7-8
- `speedrun_champion` - Win with <30 total sales
- `inheritance` - Win with $50,000+ in piggy bank

**Impact:**
- Players can NEVER unlock these hall passes through normal gameplay
- Time Crunch feature is completely inaccessible to legitimate players
- These hall passes are "dead code" - defined but unreachable

**Evidence:**
```typescript
// checkUnlockRequirements switch statement (lines 194-246)
case 'no_longer_freshman': ✅ Implemented
case 'sophomore_swagger': ✅ Implemented
...
case 'time_crunch': ❌ NOT IMPLEMENTED - Missing entirely
case 'final_exam': ❌ NOT IMPLEMENTED - Missing entirely
case 'speedrun_champion': ❌ NOT IMPLEMENTED - Missing entirely
case 'inheritance': ❌ NOT IMPLEMENTED - Missing entirely
```

**User Flow Impact:**
```
Title Screen → New Game → Hall Pass Selection
                            ↓
                  Time Crunch shows as LOCKED
                            ↓
                  User wins with early sales strategy
                            ↓
                  Game End Screen checks unlocks
                            ↓
                  ❌ Time Crunch unlock check NEVER RUNS
                            ↓
                  Time Crunch stays LOCKED FOREVER
```

**Required Fix:**
1. Add period-profit tracking to `candySalesSlice.ts`:
   ```typescript
   interface CandySalesState {
     // ... existing fields
     earlyPeriodProfit: number;    // Periods 1-4
     latePeriodProfit: number;     // Periods 7-8
   }
   ```

2. Update `addSale` reducer to track profit by period range:
   ```typescript
   if (periodInDay >= 1 && periodInDay <= 4) {
     state.earlyPeriodProfit += profit;
   } else if (periodInDay >= 7 && periodInDay <= 8) {
     state.latePeriodProfit += profit;
   }
   ```

3. Add unlock cases in `useHallPass.ts`:
   ```typescript
   case 'time_crunch':
     const totalProfit = gameStats.earlyPeriodProfit + gameStats.latePeriodProfit;
     const earlyPercent = (gameStats.earlyPeriodProfit / totalProfit) * 100;
     if (earlyPercent >= 50 && gameStats.completions > 0) {
       newUnlocks.push(pass.id);
     }
     break;
   ```

---

### 2. Game End Screen Uses Hardcoded Period Calculation
**File:** `app/game-end.tsx` (Line 263)
**Severity:** 🔴 **CRITICAL**

**Problem:**
```typescript
const day = Math.floor(periodCount / 8) + 1;
```

This hardcodes 8 periods per day, causing incorrect day calculation when Time Crunch is active.

**Impact:**
- **With Time Crunch:** Player completes 30 periods (5 days × 6) but day shows as `Math.floor(30/8)+1 = 4.75 = Day 5` ✅ (accidentally correct)
- **Edge case at period 24:** Day shows as `Math.floor(24/8)+1 = Day 4` when it should be Day 5 (24 = 4 complete days, on day 5)
- **Stats are misleading:** Game duration calculated as `periodCount * 5 minutes` ignores different day lengths

**User-Facing Bug:**
```
Game End Screen displays:
"You made it through Day 5 in 150 minutes across 30 periods"
                         ↑ Wrong!    ↑ Wrong!        ↑ Correct

With Time Crunch (6 periods/day):
- Should show Day 5, Period 6 (last period of day 5)
- Duration should be ~125 minutes (30 periods × ~4.16 min/period avg)
```

**Required Fix:**
```typescript
import { getPeriodsPerDay } from '../src/store/slices/gameSlice';

const periodsPerDay = useAppSelector(state => getPeriodsPerDay(state));
const day = Math.floor((periodCount - 1) / periodsPerDay) + 1;
const estimatedMinutes = periodsPerDay === 6
  ? periodCount * 4
  : periodCount * 5;
```

**Also affects:**
- Line 272: Duration calculation
- Line 295: `completionTime` stat

---

### 3. Test Helper Functions Use Hardcoded Periods
**File:** `src/__tests__/utils/testHelpers.ts` (Lines 142, 317)
**Severity:** 🔴 **CRITICAL**

**Problem:**
```typescript
// Line 142
return Math.floor(periodCount / 8) + 1;

// Line 317
day: Math.floor(period / 8) + 1,
```

**Impact:**
- ALL tests for Time Crunch will fail or pass incorrectly
- Test suite gives false confidence
- Regression testing is impossible for Time Crunch feature

**Required Fix:**
```typescript
// Add periodsPerDay parameter to helper functions
export const calculateDay = (periodCount: number, periodsPerDay: number = 8): number => {
  return Math.floor((periodCount - 1) / periodsPerDay) + 1;
};
```

---

### 4. Joker Service Uses Hardcoded Period Math
**File:** `src/utils/jokerService.ts` (Line 214)
**Severity:** 🔴 **CRITICAL**

**Problem:**
```typescript
const completedDays = Math.floor(currentPeriod / 8);
```

**Impact:**
- Joker effects that depend on completed days will calculate wrong values with Time Crunch
- Could affect joker selection, bonuses, or special effects
- Silent data corruption - no error thrown, just wrong values

**Context Needed:**
Without seeing the full context of line 214, I cannot determine which joker is affected. Need to investigate what `completedDays` is used for.

**Required Fix:**
Pass `periodsPerDay` as parameter to joker service or fetch from Redux state.

---

### 5. Vacuum Sealer Inconsistency with Time Crunch
**File:** `src/store/slices/candySalesSlice.ts` (Lines 36-42)
**Severity:** 🟠 **HIGH**

**Problem:**
```typescript
const periodInDay = ((action.payload.period - 1) % periodsPerDay) + 1;
if (periodInDay < 6) {  // ← Always uses 6 regardless of periodsPerDay
  state.hasEarlySaleToday = true;
}
```

**Impact:**
**Case 1: Normal game (8 periods/day)**
- Early sale penalty applies to periods 1-5 ✅ Correct (before period 6)

**Case 2: Time Crunch (6 periods/day)**
- Early sale penalty applies to periods 1-5 ❌ WRONG!
- Should apply to periods 1-3 (first half of 6 periods)
- Period 4-6 should be "late" sales (no penalty)

**Current Behavior:**
```
Time Crunch Day:
Period 1: ❌ Penalty applies
Period 2: ❌ Penalty applies
Period 3: ❌ Penalty applies
Period 4: ❌ Penalty applies (SHOULD NOT PENALIZE)
Period 5: ❌ Penalty applies (SHOULD NOT PENALIZE)
Period 6: ✅ No penalty

Result: Player gets penalized on 5/6 periods instead of 3/6!
```

**Design Question:**
What is the intended behavior? Two options:

**Option A: Keep absolute threshold (period 6)**
```typescript
if (periodInDay < 6) {  // Penalty before period 6 regardless of day length
  state.hasEarlySaleToday = true;
}
```
- Normal: Periods 1-5 penalized (62.5% of day)
- Time Crunch: Periods 1-5 penalized (83% of day) ← Disproportionate!

**Option B: Proportional threshold (first half)**
```typescript
const earlyThreshold = Math.ceil(periodsPerDay / 2);
if (periodInDay < earlyThreshold) {
  state.hasEarlySaleToday = true;
}
```
- Normal: Periods 1-4 penalized (50% of day)
- Time Crunch: Periods 1-3 penalized (50% of day) ← Fair!

**Recommendation:** Option B - Make penalty proportional to day length

---

## 🟠 HIGH PRIORITY ISSUES

### 6. Missing Vacuum Sealer Daily Reset in Market Flow
**File:** `app/(tabs)/market.tsx`
**Severity:** 🟠 **HIGH**

**Problem:**
When player advances periods via the market tab (not sleeping), the Vacuum Sealer flag persists across days.

**Affected Flow:**
```
Day 1, Period 1: Player sells candy → flag set to true
Day 1, Period 2-8: Player continues → penalty applies ✅ Correct
Player clicks "End Day" button
Day Stats Modal shows
Schools Out Modal shows
→ after-school.tsx navigation
→ Player goes to sleep
→ resetEarlySaleFlag() dispatched ✅ Correct

BUT ALSO:

Day 1, Period 8: Player sells candy → flag set to true
Player continues clicking Next Period
Period increments to Day 2, Period 1
→ NO resetEarlySaleFlag() called!
→ Flag still true from yesterday
→ Day 2 sales get penalized incorrectly ❌ BUG!
```

**Required Fix:**
Add flag reset in `market.tsx` when period increments to a new day:

```typescript
// In handleLocationSelected or wherever period advances
const oldDay = selectDay(getState());
dispatch(incrementPeriod(location));
const newDay = selectDay(getState());

if (newDay > oldDay) {
  dispatch(resetEarlySaleFlag());
  console.log('🔄 New day detected in market - resetting early sale flag');
}
```

---

### 7. Race Condition: PeriodsPerDay Selection Not Validated
**File:** `src/store/slices/gameSlice.ts` (Line 245)
**Severity:** 🟠 **HIGH**

**Problem:**
```typescript
export const getPeriodsPerDay = (state: any): number => {
  const selectedPassIds = state.hallPass?.selectedPassIds || [];
  return selectedPassIds.includes('time_crunch') ? 6 : 8;
};
```

**Edge Case:**
1. Player selects Time Crunch hall pass
2. Hall pass state not yet persisted
3. App crashes or closes
4. Player reopens app
5. Game state loaded: `periodCount = 15` (middle of day 3 with 6 periods/day)
6. Hall pass state loaded: `selectedPassIds = []` (Time Crunch not persisted yet)
7. Game calculates: `day = Math.floor(15 / 8) + 1 = Day 2, Period 8`
8. **SHOULD BE:** Day 3, Period 4

**Impact:**
- Period/day mismatch after crash
- Player could be on "Period 8" of a 6-period day
- Could trigger multiple period-8 Final Exam bonuses in one day

**Required Fix:**
Add validation in game initialization:

```typescript
// After loading persisted state
if (periodsPerDay === 6 && currentPeriod % 6 >= 0) {
  // Validate period is within bounds
  const day = Math.floor((periodCount - 1) / periodsPerDay) + 1;
  const periodInDay = ((periodCount - 1) % periodsPerDay) + 1;

  if (periodInDay > periodsPerDay) {
    console.error('Invalid period state detected - resetting to last valid period');
    dispatch(jumpToPeriod(day * periodsPerDay));
  }
}
```

---

### 8. Final Exam + Time Crunch Interaction Edge Case
**File:** `src/utils/hallPassUtils.ts` (Lines 142-155)
**Severity:** 🟠 **HIGH**

**Problem:**
The interaction between Final Exam and Time Crunch is implemented, but has an edge case:

```typescript
static applyFinalExamMultiplier(basePrice, selectedPassIds, period) {
  if (selectedPassIds.includes('final_exam')) {
    const periodsPerDay = selectedPassIds.includes('time_crunch') ? 6 : 8;
    const periodInDay = ((period - 1) % periodsPerDay) + 1;

    if (periodInDay === periodsPerDay) {  // Last period
      return basePrice * 15;  // 15x multiplier
    } else {
      return basePrice * 0.25;  // -75% penalty
    }
  }
  return basePrice;
}
```

**Edge Case Scenario:**
Player selects BOTH Time Crunch AND Final Exam:
- Time Crunch: 4x profit on ALL sales
- Final Exam: 15x profit on last period, -75% on others

**What happens:**
```
Period 1-5: basePrice × 0.25 (Final Exam) × 4 (Time Crunch) = 1.0x (NORMAL)
Period 6: basePrice × 15 (Final Exam) × 4 (Time Crunch) = 60x (!!!)
```

**Analysis:**
- Final Exam penalty EXACTLY cancels Time Crunch bonus on periods 1-5
- Period 6 becomes 60x multiplier (obscenely overpowered)
- This creates a "win button" strategy: buy cheap in periods 1-5, sell everything period 6

**Is this intended?**
If yes: Document this as a valid strategy, maybe add achievement
If no: Final Exam penalties should stack multiplicatively or be mutually exclusive

**Recommendation:** Make Final Exam and Time Crunch mutually exclusive:

```typescript
// In hallPassSlice.ts - selectHallPass reducer
if (passId === 'final_exam' && state.selectedPassIds.includes('time_crunch')) {
  // Deselect Time Crunch when selecting Final Exam
  state.selectedPassIds = state.selectedPassIds.filter(id => id !== 'time_crunch');
  console.warn('⚠️ Final Exam and Time Crunch are mutually exclusive');
}
```

---

## 🟡 MEDIUM PRIORITY ISSUES

### 9. Vacuum Sealer Penalty Applied After Sale Recorded
**File:** `app/(tabs)/market.tsx` (Lines 652-665, 771-780)
**Severity:** 🟡 **MEDIUM**

**Problem:**
Order of operations:

```typescript
// 1. Record sale (sets flag)
addSale({
  period: periodCount,
  periodsPerDay: periodsPerDay,  // ← Sets hasEarlySaleToday = true
});

// 2. Calculate multipliers
const hasVacuumSealer = jokers.some(j => j.id === JOKER_IDS.VACUUM_SEALER);
const hasEarlySaleToday = candySalesState.hasEarlySaleToday;  // ← Already true!

// 3. Apply penalty
if (hasVacuumSealer && hasEarlySaleToday) {
  vacuumSealerPenalty = 0.5;
}
```

**Impact:**
The FIRST sale of the day (before period 6) triggers the penalty flag, then immediately checks it.

**Scenario:**
```
Day 1, Period 3, First Sale:
1. addSale called → hasEarlySaleToday set to TRUE
2. Penalty check → hasEarlySaleToday is TRUE
3. Penalty applied to this sale ✅ Correct

BUT: The flag is set BEFORE the sale is finalized, so this sale gets penalized correctly.
```

**Actually NOT a bug** - the order is correct! The flag is set during `addSale`, and the penalty check happens after, so the first early sale IS penalized.

**BUT:** The naming is confusing. `hasEarlySaleToday` suggests "has made an early sale previously" but it's set during the current sale.

**Recommendation:** Rename to `hasEarlySaleOrSellingEarly` or add comment explaining timing.

---

### 10. Speedrun Champion Unlock Metric Not Tracked
**File:** Missing implementation
**Severity:** 🟡 **MEDIUM**

**Problem:**
Hall pass definition says "Win with less than 30 total sales" but:
- No transaction counter exists
- `totalCandiesSold` tracks QUANTITY, not transaction count
- A single 500-candy sale counts as 1 transaction OR 500?

**Example:**
Player sells:
- 100 Gummy Bears in period 1
- 50 Lollipops in period 2
- 200 Chocolate in period 3

**Total transactions:** 3
**Total candies sold:** 350

Which number matters for Speedrun Champion?

**Required Implementation:**
```typescript
// In candySalesSlice.ts
interface CandySalesState {
  transactionCount: number;  // ← Add this
  totalCandiesSold: number;  // ← Already exists
}

// In useHallPass.ts
case 'speedrun_champion':
  if (gameStats.transactionCount && gameStats.transactionCount < 30) {
    newUnlocks.push(pass.id);
  }
  break;
```

---

### 11. Inheritance Hall Pass Unlock Not Implemented
**File:** `src/hooks/useHallPass.ts`
**Severity:** 🟡 **MEDIUM**

**Problem:**
Unlock requirement: "Win with $50,000+ in piggy bank"

Current check: **DOES NOT EXIST**

**Required Implementation:**
```typescript
case 'inheritance':
  // stashedAmount is the piggy bank in this game
  if (gameStats.stashedAmount && gameStats.stashedAmount >= 50000) {
    newUnlocks.push(pass.id);
  }
  break;
```

**BUT WAIT:** Semantic issue!

In this game:
- `stashedAmount` starts NEGATIVE (it's your debt to the piggy bank)
- You START with stashedAmount = -adoptionFee (e.g., -$15,000)
- "Paying off debt" means going from negative to zero or positive

**So:**
- `stashedAmount >= 50000` means you DEPOSITED $50,000 MORE than your debt
- If adoptionFee = $15,000, you need to deposit $65,000 total

**Is this intended?** Verify with game designer.

---

### 12. No Migration Path for Existing Save Games
**File:** `src/store/store.ts`
**Severity:** 🟡 **MEDIUM**

**Problem:**
Existing players with saved games at period 15 (for example):
- Current state: `periodCount = 15`, no hall passes selected
- They select Time Crunch and start new game
- Previous save might interfere

**Edge Case:**
```
Player with existing save:
- periodCount: 32 (day 5, period 1 with 8 periods/day)
- selectedPassIds: []

Player selects Time Crunch:
- selectedPassIds: ['time_crunch']
- periodsPerDay now returns 6
- Day calculation: Math.floor((32-1)/6) + 1 = Day 6, Period 2

But game ends at Day 5!
Player is beyond game end condition but game doesn't realize it.
```

**Required Fix:**
```typescript
// In resetGame or fullResetGame
resetGame: (state) => {
  // ... existing reset logic

  // Validate period count matches selected hall passes
  const selectedPassIds = getState().hallPass.selectedPassIds;
  const periodsPerDay = selectedPassIds.includes('time_crunch') ? 6 : 8;
  const maxPeriods = periodsPerDay * 5;

  if (state.periodCount >= maxPeriods) {
    console.warn('Period count exceeds max for selected hall passes - resetting to 0');
    state.periodCount = 0;
  }
}
```

---

## 🔵 LOW PRIORITY ISSUES

### 13. Console Logs Need Cleanup
**Files:** Multiple
**Severity:** 🔵 **LOW**

**Problem:**
Production code has extensive debug logging:

```typescript
console.log(`🚫 Vacuum Sealer: Early sale detected...`);
console.log(`⏱️ Time Crunch: ${basePrice} × 4 = ...`);
console.log(`📝 Final Exam (Period ${periodInDay}/${periodsPerDay})...`);
```

**Impact:**
- Performance overhead in production
- Exposes game mechanics to players (console inspection)
- Large log files on mobile devices

**Recommendation:**
Replace with debug flag:

```typescript
const DEBUG = __DEV__;  // Only log in development builds

if (DEBUG) console.log('...');
```

---

### 14. TypeScript `any` Type in Selectors
**File:** `src/store/slices/gameSlice.ts` (Lines 245, 250, 255, 260)
**Severity:** 🔵 **LOW**

**Problem:**
```typescript
export const getPeriodsPerDay = (state: any): number => { ... }
export const selectDay = (state: any) => { ... }
export const selectPeriod = (state: any) => { ... }
```

**Impact:**
- No type safety
- IDE autocomplete doesn't work
- Potential runtime errors if state structure changes

**Required Fix:**
```typescript
import type { RootState } from '../store';

export const getPeriodsPerDay = (state: RootState): number => {
  const selectedPassIds = state.hallPass?.selectedPassIds || [];
  return selectedPassIds.includes('time_crunch') ? 6 : 8;
};
```

---

## End-to-End User Flow Analysis

### Flow 1: Player Unlocks Time Crunch (BROKEN)

```
┌─────────────────────────────────────────────────────────┐
│ 1. Player Strategy: Focus on early-period sales         │
│    - Periods 1-4: Make 60% of total profit             │
│    - Periods 5-8: Make 40% of total profit             │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. During Gameplay: No tracking occurs                  │
│    - candySalesSlice tracks total profit only           │
│    - No earlyPeriodProfit or latePeriodProfit vars     │
│    ❌ MISSING: Period-based profit accumulation         │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Game End: Player wins                                │
│    - finalProfit: $100,000                              │
│    - periodCount: 40                                    │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. checkUnlockRequirements() called                     │
│    - gameStats passed to function                       │
│    - earlyPeriodProfit: undefined (not tracked)         │
│    - latePeriodProfit: undefined (not tracked)          │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Switch statement executes                            │
│    case 'no_longer_freshman': ✅ Checks completions     │
│    case 'sophomore_swagger': ✅ Checks completions      │
│    ...                                                   │
│    case 'time_crunch': ❌ NOT IN SWITCH - SKIPPED!      │
│    default: (nothing happens)                           │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Result: newUnlocks = []                              │
│    - Time Crunch NOT unlocked                           │
│    - No error message                                   │
│    - Player has no idea why it didn't unlock            │
└─────────────────────────────────────────────────────────┘

OUTCOME: ❌ COMPLETELY BROKEN - UNREACHABLE FEATURE
```

---

### Flow 2: Player Uses Time Crunch (PARTIALLY BROKEN)

```
┌─────────────────────────────────────────────────────────┐
│ 1. Title Screen → New Game                              │
│    - Player selects Time Crunch (if unlocked via debug) │
│    - selectedPassIds: ['time_crunch']                   │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Difficulty Selection → Game Starts                   │
│    - periodCount: 0                                     │
│    - getPeriodsPerDay(state) → 6 ✅                     │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Day 1, Period 1                                      │
│    - selectDay(state) → 1 ✅                            │
│    - selectPeriod(state) → 1 ✅                         │
│    - Display: "Day 1, Period 1" ✅                      │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Player sells candy                                   │
│    - Base profit: $100                                  │
│    - Time Crunch: $100 × 4 = $400 ✅                    │
│    - Sale recorded with periodsPerDay: 6 ✅             │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Player advances through Day 1                        │
│    - Periods 2, 3, 4, 5, 6 complete ✅                  │
│    - Display: "Day 1, Period 6" ✅                      │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 6. End of Day 1 → Sleep                                 │
│    - periodCount: 6                                     │
│    - startNewDay(6) called ✅                           │
│    - New periodCount: 12 ✅                             │
│    - Early sale flag reset ✅                           │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 7. Days 2-5 Progress Normally                           │
│    - Each day: 6 periods ✅                             │
│    - Game end check: periodCount >= 30 ✅              │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 8. Game End Screen                                      │
│    - periodCount: 30                                    │
│    - Day calculation: floor(30/8)+1 = Day 4 ❌ WRONG!  │
│      (Should be Day 5)                                  │
│    - Duration: 30 × 5 = 150 min ❌ WRONG!              │
│      (Should be ~120 min for 6-period days)            │
└─────────────────────────────────────────────────────────┘

OUTCOME: ⚠️ PARTIALLY WORKS - Display bugs on game end
```

---

### Flow 3: Vacuum Sealer With Time Crunch (BROKEN)

```
┌─────────────────────────────────────────────────────────┐
│ 1. Player has both:                                     │
│    - Vacuum Sealer joker (2x inventory, -50% if early)  │
│    - Time Crunch hall pass (6 periods/day, 4x profit)  │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Day 1, Period 4 - Player sells candy                │
│    - periodInDay: 4 (out of 6 total)                   │
│    - Is this "early"? Threshold check...                │
│    - if (periodInDay < 6) → if (4 < 6) → TRUE ❌        │
│    - hasEarlySaleToday: true                            │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Penalty Applied                                      │
│    - Base profit: $200                                  │
│    - Time Crunch: $200 × 4 = $800                       │
│    - Vacuum Sealer: $800 × 0.5 = $400 ❌                │
│    EXPECTED: No penalty (period 4 is LATE in 6-day)    │
│    - Should be $800 final profit                        │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Rest of Day 1                                        │
│    - Period 5: Penalty applied ❌ (should be safe)      │
│    - Period 6: No penalty ✅ (correct)                  │
│    - Player penalized on 5/6 periods (83%)              │
│    - Normal game: penalized on 5/8 periods (62.5%)      │
└─────────────────────────────────────────────────────────┘

OUTCOME: ❌ VACUUM SEALER OVERLY HARSH WITH TIME CRUNCH
         Player gets penalized 83% of the time vs 62.5%
```

---

## Recommended Action Plan

### Phase 1: Critical Blockers (Must fix before ANY release)
1. ✅ Implement Time Crunch unlock logic
2. ✅ Implement Final Exam unlock logic
3. ✅ Implement Speedrun Champion unlock logic
4. ✅ Implement Inheritance unlock logic
5. ✅ Fix game-end.tsx hardcoded period calculation
6. ✅ Fix test helpers hardcoded period calculation
7. ✅ Investigate and fix jokerService.ts period calculation

### Phase 2: High Priority (Fix before beta)
1. ⚠️ Decide on Vacuum Sealer threshold behavior (proportional vs absolute)
2. ⚠️ Implement daily flag reset in market.tsx period advancement
3. ⚠️ Add hall pass state validation on game init
4. ⚠️ Document or restrict Final Exam + Time Crunch interaction

### Phase 3: Medium Priority (Fix before 1.0)
1. 📋 Add transaction count tracking for Speedrun Champion
2. 📋 Clarify Inheritance unlock requirement
3. 📋 Add save game migration logic

### Phase 4: Polish (Can defer)
1. 🔧 Replace console.log with debug flag
2. 🔧 Add proper TypeScript types to selectors

---

## Testing Checklist

### Manual Testing Required

- [ ] **Time Crunch Basic Flow**
  - [ ] Select Time Crunch hall pass
  - [ ] Start new game
  - [ ] Verify day has only 6 periods
  - [ ] Verify sales have 4x multiplier
  - [ ] Complete all 5 days (30 periods)
  - [ ] Verify game ends correctly

- [ ] **Time Crunch + Final Exam Combo**
  - [ ] Select both hall passes
  - [ ] Verify period 6 has 60x multiplier
  - [ ] Verify periods 1-5 have 1x multiplier (penalties cancel bonuses)
  - [ ] Decide if this is intended or needs restriction

- [ ] **Vacuum Sealer + Time Crunch**
  - [ ] Get Vacuum Sealer joker
  - [ ] Have Time Crunch active
  - [ ] Sell in period 1 → should penalize ✅
  - [ ] Sell in period 4 → should penalize? (depends on fix)
  - [ ] Sell in period 6 → should NOT penalize ✅

- [ ] **Time Crunch Unlock Flow**
  - [ ] Play game with early-period strategy
  - [ ] Win with 50%+ profit from periods 1-4
  - [ ] Verify Time Crunch unlocks (after implementing unlock logic)

- [ ] **Edge Cases**
  - [ ] App crash and reload during Time Crunch game
  - [ ] Switch hall passes mid-game (shouldn't be possible, verify)
  - [ ] Period 6 sale with Final Exam + Time Crunch + Vacuum Sealer
  - [ ] Test with 0 periods per day (error handling)

---

## Code Quality Assessment

### Positive Aspects
✅ Good use of Redux for centralized state
✅ Clear separation of concerns (utils, slices, hooks)
✅ Comprehensive logging for debugging
✅ Backwards compatibility considerations (old selectedPassId migration)
✅ Proper use of memoized selectors

### Areas for Improvement
❌ Missing feature implementations (4 hall pass unlocks)
❌ Hardcoded magic numbers (8, 6, 40, etc.)
❌ Inconsistent TypeScript usage (`any` types)
❌ Tight coupling between hall passes and game logic
❌ No unit tests for new features
❌ No error handling for invalid states

---

## Final Verdict

**🔴 REJECT - Critical issues must be resolved**

This PR demonstrates good architectural thinking but has too many critical bugs to merge. The Time Crunch feature is fundamentally broken (cannot be unlocked), and there are calculation errors that affect game-end displays.

**Estimated effort to fix:** 2-3 days
- Day 1: Implement missing unlock logic + period profit tracking
- Day 2: Fix all hardcoded period calculations
- Day 3: Testing and edge case resolution

**Recommendation:**
1. Create separate PRs for Vacuum Sealer (lower risk) and Time Crunch (higher risk)
2. Implement unlock logic FIRST, then test that it can be unlocked
3. Add unit tests for period calculations with both 6 and 8 periods/day
4. Get product owner decision on Vacuum Sealer threshold behavior

---

**Reviewer:** Staff Engineer
**Date:** 2025-10-25
**Review Status:** ❌ Changes Requested
