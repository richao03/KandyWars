# PR Review: Tutorial System & Warehouse Manager Implementation
**Reviewer:** Staff Engineer (Edge Case & Bug Hunter)
**Date:** 2025-10-25
**Branch:** Current working branch
**Severity Levels:** 🔴 Critical | 🟠 High | 🟡 Medium | 🔵 Low

---

## Executive Summary

This PR introduces two major features:
1. **Tutorial System** - Interactive tutorial for new players using `rn-tourguide` library
2. **Warehouse Manager Joker** - Bonus income based on inventory capacity and quantity

**Overall Assessment:** ⚠️ **NOT PRODUCTION READY**

**Critical Issues Found:** 6
**High Priority Issues:** 5
**Medium Priority Issues:** 4
**Low Priority Issues:** 3

**Main Concerns:**
- 🔴 Tutorial uses TWO conflicting step systems (rn-tourguide + custom overlay)
- 🔴 Warehouse Manager has no persistence - bonuses lost on app reload
- 🔴 Tutorial can enter inconsistent states with no recovery
- 🔴 Async operations not awaited in Redux actions

---

## 🔴 CRITICAL ISSUES

### 1. Dual Tutorial Systems - Conflicting Implementations
**Files:** `TutorialOverlay.tsx`, `TutorialTooltip.tsx`, `tutorialSlice.ts`, `tutorialSteps.ts`
**Severity:** 🔴 **BLOCKER**

**Problem:**
The codebase implements **TWO COMPLETELY DIFFERENT** tutorial systems that conflict:

**System A: Custom Modal Overlay (TutorialOverlay.tsx)**
- Uses `TUTORIAL_STEPS` from `tutorialSlice.ts` (steps 0-14)
- Custom modal with backdrop
- Step flow: WELCOME_MESSAGE → HUD_INTRODUCTION → RUMOR_MARQUEE → ... → SLEEP_BUTTON → COMPLETED (14 steps)

**System B: rn-tourguide Library (TutorialTooltip.tsx + tutorialSteps.ts)**
- Uses zones from `tutorialSteps.ts` (9 zones)
- Library-driven tooltips with spotlight
- Zone flow: hud → rumor → candy-list → next-period → joker-tab → study → stash → deli → sleep (9 zones)

**Evidence:**
```typescript
// tutorialSlice.ts - 14 steps (0-13 + COMPLETED = 14)
export const TUTORIAL_STEPS = {
  WELCOME_MESSAGE: 0,
  HUD_INTRODUCTION: 1,
  RUMOR_MARQUEE: 2,
  MARKET_VIEW_BUY_CANDY: 3,
  NEXT_PERIOD_LOCATION: 4,
  SELL_CANDY: 5,
  SEE_YOU_AT_LUNCH: 6,
  LUNCH_GAMES_OVERVIEW: 7,
  JOKER_TAB_HIGHLIGHT: 8,
  GAMES_TO_AFTER_SCHOOL_TRANSITION: 9,
  STUDY_BUTTON: 10,
  STASH_BUTTON: 11,
  DELI_BUTTON: 12,
  SLEEP_BUTTON: 13,
  COMPLETED: 14,
}

// tutorialSteps.ts - 9 zones
export const TUTORIAL_STEPS = [
  { zone: 'hud', order: 1, ... },
  { zone: 'rumor', order: 2, ... },
  { zone: 'candy-list', order: 3, ... },
  // ... 9 zones total
]
```

**Impact:**
```
User Flow:
1. TutorialManager calls start() from rn-tourguide (System B)
2. rn-tourguide expects zones to be registered
3. TutorialOverlay (System A) shows modal instead
4. User clicks "Next" in TutorialOverlay → advanceToStep(1) in Redux
5. rn-tourguide is still on zone 'hud'
6. ❌ State desync - Redux thinks step 1, tourguide thinks zone 'hud'
7. ❌ Which system actually controls the flow?
```

**Which System Is Actually Used?**
Looking at integrations:
- `app/_layout.tsx:51` - `<TourGuideProvider>` is set up ✅
- `app/(tabs)/market.tsx` - Imports `TutorialManager` ✅
- `TutorialManager:23` - Calls `useTourGuideController()` ✅
- `TutorialManager:44` - Calls `start()` from tourguide ✅

But... TutorialOverlay is never imported anywhere! It's orphaned code.

**Required Fix:**
1. **Decision:** Pick ONE system
   - Option A: Use rn-tourguide only (remove TutorialOverlay)
   - Option B: Use custom overlay only (remove rn-tourguide dependency)
   - Option C: Use both but properly orchestrate (complex)

2. **If keeping rn-tourguide:**
   - Remove `TutorialOverlay.tsx` (orphaned)
   - Update `tutorialSlice.ts` to use zone names instead of numeric steps
   - Ensure `TutorialTooltip` properly handles all step transitions

3. **If keeping custom overlay:**
   - Remove `rn-tourguide` library from `package.json`
   - Remove `TutorialTooltip.tsx`
   - Remove `tutorialSteps.ts` config
   - Actually render `TutorialOverlay` somewhere!

---

### 2. Warehouse Manager - No Persistence, Bonuses Lost on Reload
**File:** `src/hooks/useWarehouseManager.ts`
**Severity:** 🔴 **CRITICAL**

**Problem:**
The Warehouse Manager bonus is applied based on period changes, but has NO persistence. Player loses all bonuses if app reloads.

**Code Analysis:**
```typescript
export const useWarehouseManager = () => {
  const { periodCount } = useGame();
  const [lastPeriod, setLastPeriod] = useState(periodCount); // ← Initializes with CURRENT period

  useEffect(() => {
    if (periodCount !== lastPeriod && periodCount > 0) {
      checkWarehouseManagerBonus(); // ← Only triggers when period CHANGES
      setLastPeriod(periodCount);
    }
  }, [periodCount]);
  // ...
}
```

**Scenario 1: Mid-Game Reload**
```
Player State:
- Period 10
- Has Warehouse Manager joker
- Has 50 candies in inventory (75+ capacity)
- Expected: $5,000 bonus each period × 10 periods = $50,000 total

What Actually Happens:
1. Player completes periods 1-9 normally → $45,000 in bonuses ✅
2. App crashes or player closes app at period 10
3. Player reopens app
4. Hook remounts: lastPeriod = useState(10) = 10 ← CURRENT PERIOD!
5. periodCount = 10 from Redux
6. useEffect: (10 !== 10) → FALSE ❌
7. checkWarehouseManagerBonus() NEVER CALLED
8. Player continues to period 11
9. useEffect: (11 !== 10) → TRUE ✅
10. Player gets $5,000 for period 11 ✅

Result: Player LOST $5,000 bonus for period 10! (The period they were on when they reloaded)
```

**Scenario 2: Getting Joker Mid-Game**
```
Player State:
- Period 15
- Just earned Warehouse Manager joker at period 15
- Has 60 candies in inventory (75+ capacity)

What Happens:
1. Player gets joker at period 15
2. Hook is already mounted since period 1
3. lastPeriod = 14 (from previous period)
4. periodCount = 15
5. useEffect: (15 !== 14) → TRUE ✅
6. checkWarehouseManagerBonus() called
7. Has joker ✅, has 75+ capacity ✅, has 60 candies ✅
8. Player gets $6,000 bonus ✅

For period 16 onwards: Normal behavior ✅

Result: Works correctly ONLY if you get the joker and keep app running!
```

**Scenario 3: Starting New Game**
```
Player starts new game with Warehouse Manager unlocked:
1. Hook mounts at period 0
2. lastPeriod = 0
3. Period advances to 1
4. useEffect: (1 !== 0 && 1 > 0) → TRUE ✅
5. Bonus applied for period 1 ✅

Result: Works fine for fresh games
```

**Required Fix:**
```typescript
// Option A: Track bonuses in Redux
interface GameState {
  warehouseManagerBonusesApplied: number[]; // Array of periods where bonus was given
}

// In useWarehouseManager:
const bonusesApplied = useAppSelector(state => state.game.warehouseManagerBonusesApplied);

useEffect(() => {
  if (periodCount > 0 && !bonusesApplied.includes(periodCount)) {
    checkWarehouseManagerBonus();
  }
}, [periodCount]);

// Option B: Store lastPeriod in Redux (simpler)
interface GameState {
  lastWarehouseManagerPeriod: number;
}

// Option C: Apply bonus at start of NEW period instead of end of previous
// This naturally handles reloads since Redux periodCount is authoritative
```

---

### 3. Tutorial Async Operations Not Awaited
**File:** `src/store/slices/tutorialSlice.ts:107, 126`
**Severity:** 🔴 **CRITICAL**

**Problem:**
Redux actions call async `tutorialStorage.markTutorialCompleted()` but don't await it. Tutorial completion may not persist.

**Code:**
```typescript
advanceToStep: (state, action: PayloadAction<number>) => {
  // ... step logic
  if (newStep >= TUTORIAL_STEPS.COMPLETED) {
    state.hasCompletedFullTutorial = true;
    state.isActive = false;
    console.log('🎓 Tutorial: Tutorial completed!');
    tutorialStorage.markTutorialCompleted(); // ❌ NOT AWAITED!
  }
},

skipTutorial: (state) => {
  console.log('🎓 Tutorial: User skipped tutorial');
  state.isActive = false;
  state.hasSkippedTutorial = true;
  state.hasCompletedFullTutorial = true;
  tutorialStorage.markTutorialCompleted(); // ❌ NOT AWAITED!
},
```

**Impact:**
```
Scenario: User completes tutorial, app crashes before AsyncStorage write completes
1. User completes tutorial
2. Redux state updated: hasCompletedFullTutorial = true ✅
3. tutorialStorage.markTutorialCompleted() called (but not awaited)
4. AsyncStorage.setItem() starts writing...
5. ❌ App crashes BEFORE write completes
6. User reopens app
7. Redux state loaded from persistence: hasCompletedFullTutorial = true ✅ (Redux persistence worked)
8. But AsyncStorage for tutorial completion: false ❌ (AsyncStorage write didn't complete)

Actually... wait, this might be fine because Redux persistence handles it!
```

**Wait, checking persistence config...**
Actually, looking at `store.ts`, the `tutorial` reducer IS included in the root reducer (line 45), so it WILL be persisted by redux-persist. The `tutorialStorage` is a SEPARATE global flag.

**Actual Impact:**
The issue is that there are TWO sources of truth:
1. **Redux state** (persisted): `state.tutorial.hasCompletedFullTutorial`
2. **AsyncStorage flag** (separate): `@tutorial_ever_completed`

What is `tutorialStorage` even for? Let me check usage...

Looking at `TutorialManager.tsx:62`, it calls `await tutorialStorage.markTutorialCompleted()` (correctly awaited!), but the Redux action also calls it (not awaited).

**The Real Problem:**
```typescript
// tutorialStorage.ts purpose: Global flag across ALL GAMES
// Redux state purpose: Per-game tutorial state

// But... why have both?
// If tutorial is "show once ever", AsyncStorage is correct
// If tutorial is "show once per game", Redux is correct
// Having both creates confusion!
```

**Recommended Fix:**
1. **Clarify intent:** Tutorial shown once EVER or once PER GAME?
2. **If once ever:** Remove from Redux, use only `tutorialStorage`
3. **If per game:** Remove `tutorialStorage`, use only Redux

Also, Redux reducers cannot be async! This is a fundamental Redux rule.

**Proper Pattern:**
```typescript
// Create an async thunk instead
export const completeTutorial = createAsyncThunk(
  'tutorial/complete',
  async () => {
    await tutorialStorage.markTutorialCompleted();
  }
);

// Then in reducer:
extraReducers: (builder) => {
  builder.addCase(completeTutorial.fulfilled, (state) => {
    state.hasCompletedFullTutorial = true;
    state.isActive = false;
  });
}
```

---

### 4. Tutorial State Can Become Inconsistent with No Recovery
**File:** `src/hooks/useTutorialControls.ts`
**Severity:** 🔴 **CRITICAL**

**Problem:**
Tutorial has many interconnected state checks that can become inconsistent. No validation or recovery mechanism exists.

**Inconsistent State Example 1:**
```typescript
// useTutorialControls.ts:95-97
const isCandyEnabled = useCallback((candyName: string) => {
  if (currentStep === TUTORIAL_STEPS.MARKET_VIEW_BUY_CANDY) {
    return candyName === tutorial.selectedCandyForTutorial; // Only "Snickers"
  }
  // ...
}, []);

// What if "Snickers" is not available in the market?
// - No Snickers event active
// - Player used all allowance on other candies
// - Market prices changed and Snickers isn't sold

Result: Player STUCK! Can't buy any candy because only Snickers is enabled,
but Snickers might not be buyable or available!
```

**Inconsistent State Example 2:**
```typescript
// Tutorial state can be:
{
  isActive: true,
  currentStep: 5, // SELL_CANDY
  hasBoughtCandyInTutorial: false, // ❌ Should be true!
  selectedCandyForTutorial: "Snickers"
}

// How does this happen?
1. User at step 3 (MARKET_VIEW_BUY_CANDY)
2. User buys Snickers → markCandyBought() dispatched
3. Redux update queued
4. User IMMEDIATELY clicks Next → advanceToStep(4) dispatched
5. User clicks Next again → advanceToStep(5) dispatched
6. Redux processes: markCandyBought(), advanceToStep(4), advanceToStep(5)
7. Now at step 5 but hasBoughtCandyInTutorial might still be false due to race

Result: At SELL_CANDY step but isCandyEnabled() returns false for Snickers
because hasBoughtCandyInTutorial is false (line 101)
Player STUCK!
```

**Inconsistent State Example 3:**
```typescript
// useTutorialControls.ts:160-164
resumeTutorialAtLunch: (state) => {
  if (state.isActive && state.currentStep === TUTORIAL_STEPS.SEE_YOU_AT_LUNCH) {
    state.currentStep = TUTORIAL_STEPS.LUNCH_GAMES_OVERVIEW;
    state.hasReachedLunch = true;
  }
},

// What if user is at step 7 (LUNCH_GAMES_OVERVIEW) already?
// Or what if user skipped ahead to step 8 (JOKER_TAB_HIGHLIGHT)?
// resumeTutorialAtLunch() does NOTHING!

// What if user navigates to lunch screen but tutorial is at step 3?
// resumeTutorialAtLunch() does NOTHING!

Result: Tutorial can desync from actual game state (player at lunch but tutorial at step 3)
```

**Required Fix:**
1. **Add state validation:**
```typescript
const validateTutorialState = (state: TutorialState): boolean => {
  // If at SELL_CANDY, must have bought candy
  if (state.currentStep === TUTORIAL_STEPS.SELL_CANDY && !state.hasBoughtCandyInTutorial) {
    console.error('Tutorial state invalid: At SELL_CANDY but hasBoughtCandyInTutorial is false');
    return false;
  }

  // If at NEXT_PERIOD_LOCATION, must have bought candy
  if (state.currentStep === TUTORIAL_STEPS.NEXT_PERIOD_LOCATION && !state.hasBoughtCandyInTutorial) {
    console.error('Tutorial state invalid: At NEXT_PERIOD_LOCATION but hasBoughtCandyInTutorial is false');
    return false;
  }

  return true;
};
```

2. **Add recovery mechanism:**
```typescript
const recoverTutorialState = (state: TutorialState) => {
  if (!validateTutorialState(state)) {
    console.warn('Tutorial state is inconsistent, resetting to safe state');
    // Option A: Skip tutorial
    state.isActive = false;
    state.hasSkippedTutorial = true;

    // Option B: Reset to last valid step
    state.currentStep = Math.max(...state.completedSteps) || 0;
  }
};
```

3. **Add fallback for selectedCandyForTutorial:**
```typescript
const isCandyEnabled = useCallback((candyName: string) => {
  if (!isActive) return true;

  if (currentStep === TUTORIAL_STEPS.MARKET_VIEW_BUY_CANDY) {
    // Fallback: If selected candy isn't in market, allow ANY candy
    const isTutorialCandyAvailable = checkIfCandyAvailable(tutorial.selectedCandyForTutorial);
    if (!isTutorialCandyAvailable) {
      console.warn('Tutorial candy not available, allowing any candy');
      return true; // Allow any candy
    }
    return candyName === tutorial.selectedCandyForTutorial;
  }
}, []);
```

---

### 5. Missing useEffect Dependencies
**File:** `src/hooks/useWarehouseManager.ts:17-22, 24-45`
**Severity:** 🔴 **CRITICAL**

**Problem:**
Multiple React hooks violations that can cause stale closures and unexpected behavior.

**Issue 1: useEffect Missing Dependencies**
```typescript
useEffect(() => {
  if (periodCount !== lastPeriod && periodCount > 0) {
    checkWarehouseManagerBonus(); // ❌ Function not in dependency array!
    setLastPeriod(periodCount);
  }
}, [periodCount]); // ❌ Missing: checkWarehouseManagerBonus
```

**What This Means:**
The `useEffect` captures `checkWarehouseManagerBonus` from the FIRST render only. If the function's dependencies change (e.g., `jokers` array updates), the effect still uses the OLD function.

**Scenario:**
```
1. Component mounts at period 1, player has NO jokers
2. checkWarehouseManagerBonus (v1) created with jokers = []
3. useEffect captures checkWarehouseManagerBonus (v1)
4. Period advances to 2 → effect runs checkWarehouseManagerBonus (v1)
5. No joker found ✅ correct

6. Player earns Warehouse Manager joker
7. jokers array updates to [{ id: 11, ... }]
8. checkWarehouseManagerBonus (v2) created with jokers = [{ id: 11 }]
9. useEffect STILL HAS checkWarehouseManagerBonus (v1) with jokers = [] ❌

10. Period advances to 3 → effect runs checkWarehouseManagerBonus (v1)
11. No joker found ❌ WRONG! Player has the joker but old function doesn't see it!

Result: Player has Warehouse Manager but gets NO bonuses because effect uses stale closure!
```

**Issue 2: useCallback Missing Dependencies**
```typescript
const checkWarehouseManagerBonus = useCallback(() => {
  const warehouseManagerJoker = findJokerById(jokers, JOKER_IDS.WAREHOUSE_MANAGER);
  const inventoryLimit = getInventoryLimit();
  const currentInventory = getTotalInventoryCount();

  if (inventoryLimit >= 75 && currentInventory > 0) {
    const bonusAmount = currentInventory * 100;
    addMoney(bonusAmount);
  }
}, [jokers, getTotalInventoryCount, getInventoryLimit, addMoney]);
// ❌ CLAIMED dependencies, but actually missing periodCount!
```

Wait, `periodCount` is NOT used inside the function, so that's fine.

But the actual issue is the function is NOT in the useEffect dependencies!

**Required Fix:**
```typescript
const checkWarehouseManagerBonus = useCallback(() => {
  const warehouseManagerJoker = findJokerById(jokers, JOKER_IDS.WAREHOUSE_MANAGER);
  if (!warehouseManagerJoker) return;

  const inventoryLimit = getInventoryLimit();
  if (inventoryLimit < 75) return;

  const currentInventory = getTotalInventoryCount();
  if (currentInventory > 0) {
    const bonusAmount = currentInventory * 100;
    addMoney(bonusAmount);
    console.log(`🏭 Warehouse Manager: +$${bonusAmount}`);
  }
}, [jokers, getTotalInventoryCount, getInventoryLimit, addMoney]);

useEffect(() => {
  if (periodCount !== lastPeriod && periodCount > 0) {
    checkWarehouseManagerBonus();
    setLastPeriod(periodCount);
  }
}, [periodCount, lastPeriod, checkWarehouseManagerBonus]); // ✅ All dependencies
```

**Alternative Fix (Simpler):**
```typescript
useEffect(() => {
  if (periodCount !== lastPeriod && periodCount > 0) {
    // Inline the logic instead of useCallback
    const warehouseManagerJoker = findJokerById(jokers, JOKER_IDS.WAREHOUSE_MANAGER);
    if (!warehouseManagerJoker) return;

    const inventoryLimit = getInventoryLimit();
    if (inventoryLimit < 75) return;

    const currentInventory = getTotalInventoryCount();
    if (currentInventory > 0) {
      const bonusAmount = currentInventory * 100;
      addMoney(bonusAmount);
    }

    setLastPeriod(periodCount);
  }
}, [periodCount, lastPeriod, jokers, getTotalInventoryCount, getInventoryLimit, addMoney]);
```

---

### 6. TutorialManager Phase Logic Has Timing Issues
**File:** `app/components/TutorialManager.tsx:29-50`
**Severity:** 🔴 **CRITICAL**

**Problem:**
The tutorial start logic has race conditions and hardcoded delays that can fail.

**Code:**
```typescript
useEffect(() => {
  if (shouldStart && !isCompleted && canStart) {
    const phaseChanged = currentPhaseRef.current !== phase;

    if (!hasStartedRef.current || phaseChanged) {
      hasStartedRef.current = true;
      currentPhaseRef.current = phase;

      const timer = setTimeout(() => {
        start(); // ← Called after 800ms delay
      }, 800); // ❌ Hardcoded magic number!

      return () => clearTimeout(timer);
    }
  }
}, [shouldStart, isCompleted, canStart, phase, start]);
```

**Issue 1: Why 800ms?**
Comment says "Small delay to ensure all zones are registered" but:
- What if zones take 900ms to register?
- What if device is slow and needs 1200ms?
- What if zones are ready in 100ms (wasted 700ms)?

**Issue 2: No Validation That Zones Are Actually Ready**
```typescript
setTimeout(() => {
  start(); // What if zones STILL aren't registered?
}, 800);

// Should be:
const checkZonesReady = () => {
  const zonesReady = tourguide.getAllZones().length === EXPECTED_ZONE_COUNT;
  if (zonesReady) {
    start();
  } else {
    console.warn('Zones not ready yet, retrying...');
    setTimeout(checkZonesReady, 100);
  }
};
```

**Issue 3: Phase Change While Tour Is Running**
```typescript
// Scenario:
1. User at market screen, phase = 'market'
2. Tutorial starts for 'market' phase
3. User navigates to after-school screen
4. phase prop changes to 'after-school'
5. useEffect runs again
6. phaseChanged = true ('market' !== 'after-school')
7. hasStartedRef.current = true (still true from before)
8. Condition: (!hasStartedRef.current || phaseChanged) = (false || true) = TRUE
9. start() called AGAIN!
10. ❌ Tour restarts? Or conflict with existing tour?
```

**Issue 4: Ref Updates Happen Before Async Operation**
```typescript
hasStartedRef.current = true; // ← Set IMMEDIATELY
currentPhaseRef.current = phase; // ← Set IMMEDIATELY

const timer = setTimeout(() => {
  start(); // ← But start() happens 800ms LATER
}, 800);

// What if component unmounts before start() is called?
// Refs are updated but tour never started!

// What if props change before start() is called?
// Refs think we started but we haven't!
```

**Required Fix:**
```typescript
useEffect(() => {
  if (!shouldStart || isCompleted || !canStart) return;

  const phaseChanged = currentPhaseRef.current !== phase;
  const shouldStartTour = !hasStartedRef.current || phaseChanged;

  if (!shouldStartTour) return;

  let mounted = true;

  const startTourWhenReady = async () => {
    // Wait for zones to be registered
    let attempts = 0;
    const maxAttempts = 20; // 2 seconds total (20 * 100ms)

    while (attempts < maxAttempts && mounted) {
      const zonesRegistered = tourguide?.getZones()?.length > 0;
      if (zonesRegistered) {
        hasStartedRef.current = true;
        currentPhaseRef.current = phase;
        start();
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    console.error('Tutorial zones never registered after 2 seconds');
  };

  startTourWhenReady();

  return () => {
    mounted = false;
  };
}, [shouldStart, isCompleted, canStart, phase, start]);
```

---

## 🟠 HIGH PRIORITY ISSUES

### 7. Tutorial Resume Functions Don't Handle Edge Cases
**File:** `src/store/slices/tutorialSlice.ts:159-174`
**Severity:** 🟠 **HIGH**

**Problem:**
The `resumeTutorialAtLunch` and `resumeTutorialAtAfterSchool` functions only work under very specific conditions.

**Code:**
```typescript
resumeTutorialAtLunch: (state) => {
  if (state.isActive && state.currentStep === TUTORIAL_STEPS.SEE_YOU_AT_LUNCH) {
    state.currentStep = TUTORIAL_STEPS.LUNCH_GAMES_OVERVIEW;
    state.hasReachedLunch = true;
  }
},
```

**Edge Cases:**
```
Case 1: User skips ahead
- Player at step 3, navigates to lunch directly
- resumeTutorialAtLunch() called
- Condition: (isActive && currentStep === 6) = (true && 3 === 6) = FALSE
- ❌ Tutorial doesn't resume! Player at lunch but tutorial stuck at step 3

Case 2: User goes backwards
- Player at step 8 (JOKER_TAB_HIGHLIGHT), navigates back to market
- Then navigates to lunch again
- resumeTutorialAtLunch() called
- Condition: (isActive && currentStep === 6) = (true && 8 === 6) = FALSE
- ❌ Tutorial doesn't resume!

Case 3: Tutorial was skipped
- Player skipped tutorial (isActive = false)
- Later navigates to lunch
- resumeTutorialAtLunch() called
- Condition: (false && currentStep === 6) = FALSE
- ✅ Correct! Tutorial stays skipped

Case 4: App reloaded at lunch
- Player was at step 6, closed app
- Redux persisted: { currentStep: 6, isActive: true }
- User reopens app directly at lunch screen
- resumeTutorialAtLunch() called
- Condition: (true && 6 === 6) = TRUE ✅
- Tutorial resumes correctly ✅
```

**Recommended Fix:**
```typescript
resumeTutorialAtLunch: (state) => {
  if (!state.isActive) return;

  // If we haven't reached lunch yet in tutorial, jump to it
  if (state.currentStep < TUTORIAL_STEPS.LUNCH_GAMES_OVERVIEW) {
    console.log('Tutorial: Jumping to lunch phase (user navigated early)');
    state.currentStep = TUTORIAL_STEPS.LUNCH_GAMES_OVERVIEW;
    state.hasReachedLunch = true;
  }

  // If we're exactly at SEE_YOU_AT_LUNCH, advance
  if (state.currentStep === TUTORIAL_STEPS.SEE_YOU_AT_LUNCH) {
    state.currentStep = TUTORIAL_STEPS.LUNCH_GAMES_OVERVIEW;
    state.hasReachedLunch = true;
  }

  // If we've already passed lunch, do nothing (already reached)
},
```

---

### 8. Warehouse Manager Bonus Calculation Ambiguity
**File:** `src/hooks/useWarehouseManager.ts:29-32, 38-40`
**Severity:** 🟠 **HIGH**

**Problem:**
The bonus calculation has unclear intent about WHEN it applies and HOW it scales.

**Code:**
```typescript
const inventoryLimit = getInventoryLimit();
if (inventoryLimit < 75) return; // ← Threshold

const currentInventory = getTotalInventoryCount();
if (currentInventory > 0) {
  const bonusAmount = currentInventory * 100; // ← $100 per candy
  addMoney(bonusAmount);
}
```

**Ambiguity 1: Bonus Timing**
Q: When does the bonus apply?
- A) At START of period (before market opens)?
- B) At END of period (before sleep)?
- C) When period COUNT changes (current implementation)?

Current: Triggers when `periodCount` changes. But when does that happen?
- When player clicks "Next Period" → before location select → before market
- So bonus applies BEFORE player can sell

**This creates an exploit:**
```
Exploit Flow:
1. Player at period 1, has 50 candies (75+ capacity)
2. Player clicks "Next Period"
3. ✅ Period changes to 2 → Warehouse bonus: +$5,000
4. Player sells all 50 candies at period 2 market
5. Player has $0 inventory but already got the bonus!
6. Player buys 60 new candies at period 2
7. Player clicks "Next Period"
8. ✅ Period changes to 3 → Warehouse bonus: +$6,000
9. Player sells all 60 candies
10. Repeat infinitely!

Result: Player gets bonus EVERY period regardless of holding candies!
This might be intended, but it's VERY powerful!
```

**Ambiguity 2: Inventory Limit Threshold**
Q: Should the 75+ threshold check happen:
- A) Once when getting joker (if you have 75+ at that moment, bonus enabled forever)?
- B) Every period (bonus only applies on periods where limit >= 75)?

Current: Checks EVERY period (option B)

**But this creates a confusing scenario:**
```
Scenario:
1. Player has 80 inventory capacity (from Buy-Up! joker)
2. Player gets Warehouse Manager
3. Player has 40 candies → +$4,000 bonus ✅
4. Player loses Buy-Up! joker somehow (sold? expired?)
5. Inventory capacity drops to 50
6. Next period: check fails (50 < 75) ❌
7. Player still has 40 candies but gets NO bonus!

Is this intended? Or should threshold check only happen once?
```

**Ambiguity 3: Stacking With Other Bonuses**
Q: If player has multiple inventory-boosting jokers:
- Buy-Up! (+15)
- Data Compression (doubles capacity)
- Fridge Organizer (???)

And they get to 100+ capacity, then sell one joker... does bonus stay or go?

**Required Clarification:**
1. **Document the design intent:**
   - When should bonus apply (start of period, end of period, etc.)?
   - Is the 75+ check one-time or recurring?
   - Should bonus be based on inventory at period START or period END?

2. **Recommended implementation (if exploit should be fixed):**
```typescript
// Apply bonus at END of period (after market, before sleep)
// This prevents "get bonus, immediately sell" exploit

// In after-school screen or sleep screen:
const applyWarehouseBonus = () => {
  const hasJoker = findJokerById(jokers, JOKER_IDS.WAREHOUSE_MANAGER);
  if (!hasJoker) return;

  const inventoryLimit = getInventoryLimit();
  if (inventoryLimit < 75) return;

  const currentInventory = getTotalInventoryCount();
  if (currentInventory > 0) {
    const bonusAmount = currentInventory * 100;
    addMoney(bonusAmount);
    console.log(`🏭 Warehouse Manager end-of-day bonus: +$${bonusAmount}`);
  }
};
```

---

### 9. No Integration Between Tutorial State and Game State
**File:** `src/store/slices/tutorialSlice.ts`
**Severity:** 🟠 **HIGH**

**Problem:**
Tutorial state tracks `hasBoughtCandyInTutorial`, `hasSoldCandyInTutorial`, etc., but these are only set when actions are explicitly called. If player performs actions without tutorial knowing, state becomes desynced.

**Example:**
```typescript
// In market.tsx (hypothetically):
const buyCandy = (candy: string) => {
  dispatch(addToInventory(candy));
  dispatch(subtractMoney(price));

  // ❌ What if developer forgets to call this?
  tutorialControls.onCandyBought();
};

// Or worse, multiple places to buy candy:
// - Market screen
// - Deli screen
// - Event popup
// - Merchant screen

// Each place must remember to call tutorialControls.onCandyBought()!
// This is fragile and error-prone!
```

**Better Approach:**
Tutorial should OBSERVE game state, not maintain separate tracking state.

```typescript
// Instead of:
interface TutorialState {
  hasBoughtCandyInTutorial: boolean; // ❌ Separate tracking
}

// Do this:
const hasBoughtCandy = (state: RootState) => {
  const tutorialStartInventory = state.tutorial.startingInventory;
  const currentInventory = state.inventory.candies;
  return currentInventory.length > tutorialStartInventory.length;
};

// Or use transaction history:
const hasBoughtCandy = (state: RootState) => {
  const tutorialStartPeriod = state.tutorial.startPeriod;
  const purchases = state.dailyStats.transactions.filter(
    t => t.type === 'buy' && t.period >= tutorialStartPeriod
  );
  return purchases.length > 0;
};
```

**Required Fix:**
1. Remove tracking booleans from tutorial state
2. Derive tutorial progress from actual game state
3. This makes tutorial robust to any code path

---

### 10. Tutorial Doesn't Handle Navigation Edge Cases
**File:** `app/components/TutorialManager.tsx`
**Severity:** 🟠 **HIGH**

**Problem:**
What happens if user navigates away during tutorial?

**Scenarios:**
```
Scenario 1: User on step 3 (MARKET_VIEW_BUY_CANDY), navigates to Settings
- shouldStart = true (tutorial active)
- phase = 'market' (still set from market screen)
- User is on Settings screen but tutorial UI is for market
- ❌ Tutorial overlay showing but user can't interact with market!

Scenario 2: User on step 7 (LUNCH_GAMES_OVERVIEW), app backgrounds
- iOS backgrounds app
- Tutorial state persisted: { currentStep: 7, isActive: true }
- User returns hours later
- Tutorial automatically resumes at step 7
- ✅ This might be fine, but could be jarring

Scenario 3: User skips tutorial at step 2, then starts new game
- First game: Tutorial skipped, hasCompletedFullTutorial = true
- Start new game (fullResetGame called)
- Does tutorial reset? Let me check resetGame logic...
```

Looking at the code, `tutorialStorage` is GLOBAL across all games (separate from Redux persistence). So:
- First game: Skip tutorial → `@tutorial_ever_completed` = true
- New game: Tutorial won't show because `hasEverCompletedTutorial()` = true
- ✅ This is intended! Tutorial shown "once ever"

But what if player WANTS to replay tutorial in settings?

**Required Fix:**
```typescript
// In settings screen, add option:
<Button onPress={async () => {
  await tutorialStorage.resetTutorialCompletion();
  dispatch(resetTutorial());
  dispatch(startTutorial());
  router.push('/market');
}}>
  Replay Tutorial
</Button>
```

Also need to handle navigation away:
```typescript
// In TutorialManager:
useEffect(() => {
  if (shouldStart && isActive) {
    const currentRoute = getCurrentRoute();
    const expectedRoute = getExpectedRouteForStep(currentStep);

    if (currentRoute !== expectedRoute) {
      console.warn(`Tutorial active but user navigated away from ${expectedRoute} to ${currentRoute}`);
      // Option A: Pause tutorial
      // Option B: Skip tutorial
      // Option C: Force navigate back
    }
  }
}, [currentRoute, currentStep]);
```

---

### 11. Warehouse Manager Hook Runs on Every Screen
**File:** `src/hooks/useWarehouseManager.ts`
**Severity:** 🟠 **HIGH**

**Problem:**
Currently, `useWarehouseManager()` is only called in `app/(tabs)/market.tsx:242`. But the hook logic depends on `periodCount` changing.

**What if:**
```
1. Player is on Settings screen (not Market screen)
2. Player somehow advances period (e.g., via event, or debug button)
3. periodCount changes from 5 → 6
4. Market screen is NOT mounted
5. useWarehouseManager hook is NOT running
6. ❌ No bonus applied!

OR:

1. Player is on Market screen at period 5
2. useWarehouseManager hook is mounted and running ✅
3. Player navigates to After School screen
4. Market screen unmounts
5. useWarehouseManager hook STOPS running ❌
6. Player clicks Sleep → new day starts → periodCount changes
7. Hook not running → no bonus!
```

**Required Fix:**
Move hook to a location that's ALWAYS mounted, like:
```typescript
// app/_layout.tsx (root layout):
export default function RootLayout() {
  useWarehouseManager(); // ✅ Always runs

  return <Stack>...</Stack>;
}
```

Or create a "game effects manager" component:
```typescript
// app/components/GameEffectsManager.tsx
export default function GameEffectsManager() {
  useWarehouseManager();
  useDiamondHand(); // If similar hooks exist
  // ... other global game effects
  return null;
}

// app/_layout.tsx:
<Stack>
  <GameEffectsManager />
  ...
</Stack>
```

---

## 🟡 MEDIUM PRIORITY ISSUES

### 12. Console Logs in Production Code
**Files:** All tutorial files
**Severity:** 🟡 **MEDIUM**

**Problem:**
Extensive console logging throughout tutorial system:

```typescript
// TutorialManager.tsx
console.log('🎓 TutorialManager: shouldStart =', ...);
console.log('🎓 TutorialManager: Starting tour for phase:', phase);
console.log('🎓 TutorialManager: Calling start() for phase:', phase);
console.log('🎓 TutorialManager: Tour stopped (skipped) in phase:', phase);
console.log('🎓 TutorialManager: Step changed:', step);

// tutorialSlice.ts
console.log('🎓 Tutorial: Starting tutorial');
console.log(`🎓 Tutorial: Advancing from step ${state.currentStep} to ${newStep}`);
console.log(`🎓 Tutorial: Completing step ${step}`);
console.log('🎓 Tutorial: User skipped tutorial');
console.log('🎓 Tutorial: Resetting tutorial');
console.log('🎓 Tutorial: Candy bought');
console.log('🎓 Tutorial: Candy sold');
console.log('🎓 Tutorial: Location selected');
console.log('🎓 Tutorial: Resuming at lunch');
console.log('🎓 Tutorial: Resuming at after school');
console.log('🎓 Tutorial: Tutorial completed!');

// useWarehouseManager.ts
console.log(`🏭 Warehouse Manager: +$${bonusAmount}...`);
```

**Impact:**
- Performance overhead
- Large log files on devices
- Exposes internal logic to users (console inspection)

**Recommended Fix:**
```typescript
// utils/logger.ts
const DEBUG = __DEV__; // Only log in development

export const logger = {
  tutorial: (message: string, ...args: any[]) => {
    if (DEBUG) console.log('🎓', message, ...args);
  },
  warehouse: (message: string, ...args: any[]) => {
    if (DEBUG) console.log('🏭', message, ...args);
  },
};

// Then replace:
console.log('🎓 Tutorial: Starting tutorial');
// With:
logger.tutorial('Starting tutorial');
```

---

### 13. TutorialOverlay Uses Hardcoded Content Instead of Config
**File:** `app/components/TutorialOverlay.tsx:16-105`
**Severity:** 🟡 **MEDIUM**

**Problem:**
Tutorial content is hardcoded in a 90-line switch statement instead of using configuration.

**Code:**
```typescript
const getTutorialContent = (step: number): { title: string; message: string } => {
  switch (step) {
    case TUTORIAL_STEPS.WELCOME_MESSAGE:
      return {
        title: 'Welcome to Kandy Warz! 🍬',
        message: "You're a kid trying to save up money to adopt a pet...",
      };
    case TUTORIAL_STEPS.HUD_INTRODUCTION:
      return {
        title: 'Game HUD',
        message: 'This is your HUD:\n\n💰 Wallet - Your cash on hand\n...',
      };
    // ... 12 more cases
  }
};
```

**Problems:**
1. Content not reusable (can't use in other components)
2. Hard to localize (if adding i18n later)
3. Hard to A/B test different tutorial copy
4. Duplicates information from `tutorialSteps.ts` config

**Recommended Fix:**
```typescript
// src/config/tutorialContent.ts
export const TUTORIAL_CONTENT = {
  [TUTORIAL_STEPS.WELCOME_MESSAGE]: {
    title: 'Welcome to Kandy Warz! 🍬',
    message: "You're a kid trying to save up money to adopt a pet. Let's learn how to play!",
  },
  [TUTORIAL_STEPS.HUD_INTRODUCTION]: {
    title: 'Game HUD',
    message: 'This is your HUD:\n\n💰 Wallet - Your cash on hand\n...',
  },
  // ... all steps
};

// TutorialOverlay.tsx:
const { title, message } = TUTORIAL_CONTENT[currentStep] || { title: '', message: '' };
```

---

### 14. No Analytics for Tutorial Completion
**File:** `src/store/slices/tutorialSlice.ts`
**Severity:** 🟡 **MEDIUM**

**Problem:**
No tracking for tutorial analytics:
- How many users complete the tutorial?
- At which step do users skip?
- How long does tutorial take?
- Which steps do users repeat?

**Recommended Addition:**
```typescript
// tutorialSlice.ts
import { logEvent } from '../analytics';

advanceToStep: (state, action: PayloadAction<number>) => {
  const newStep = action.payload;
  const oldStep = state.currentStep;

  // Log step progression
  logEvent('tutorial_step_advanced', {
    from_step: oldStep,
    to_step: newStep,
    timestamp: Date.now(),
  });

  // ... existing logic
},

skipTutorial: (state) => {
  logEvent('tutorial_skipped', {
    at_step: state.currentStep,
    completed_steps: state.completedSteps,
  });

  // ... existing logic
},
```

---

### 15. Tutorial Content Doesn't Match Step Flow
**File:** `app/components/TutorialOverlay.tsx:48-52, 55-58`
**Severity:** 🟡 **MEDIUM**

**Problem:**
Tutorial message content doesn't align with actual game flow.

**Example 1: Step 5 (SELL_CANDY)**
```typescript
case TUTORIAL_STEPS.SELL_CANDY:
  return {
    title: 'Sell Candy 💵',
    message: 'Now click on the candy you bought to sell it and make a profit!',
  };
```

But at step 5, player might be at a LOCATION screen (after clicking Next Period and selecting location). The message says "click on the candy" but player isn't at the market yet!

**Example 2: Step 6 (SEE_YOU_AT_LUNCH)**
```typescript
case TUTORIAL_STEPS.SEE_YOU_AT_LUNCH:
  return {
    title: 'Great Job! 🎉',
    message: "See you at lunch! Keep playing until lunch period (period 4).",
  };
```

This is a "passive" step (Line 120), meaning it shows then auto-advances. But the message says "keep playing until lunch period (period 4)" which implies the player should DO something.

Also, lunch is period 4 in an 8-period day, but with Time Crunch (6 periods/day), lunch might be period 3! Hardcoded period number!

**Required Fix:**
1. Verify tutorial messages match the actual UI state at each step
2. Remove hardcoded period numbers
3. Clarify what "passive" vs "active" steps mean

---

## 🔵 LOW PRIORITY ISSUES

### 16. Unused TourGuide Zones
**File:** `src/config/tutorialSteps.ts`
**Severity:** 🔵 **LOW**

**Problem:**
The `tutorialSteps.ts` config defines 9 zones for `rn-tourguide`, but it's unclear if these zones are actually registered in the components.

**To verify:**
Need to check if components have `<TourGuideZone zone="hud">` wrappers. If not, these zones are dead code.

**Recommended Action:**
1. Search codebase for `TourGuideZone` usage
2. If not found, remove `tutorialSteps.ts` config
3. If found, document which components register which zones

---

### 17. Warehouse Manager Name Inconsistency
**File:** `src/hooks/useWarehouseManager.ts:1-47`
**Severity:** 🔵 **LOW**

**Problem:**
Hook is named `useWarehouseManager` but file exports object with empty return:

```typescript
export const useWarehouseManager = () => {
  // ... all the logic
  return {}; // ❌ Returns nothing!
};
```

This is confusing because:
1. Hook doesn't return anything useful
2. Called for side effects only
3. Name suggests it returns warehouse management utilities

**Recommended Fix:**
Either:
```typescript
// Option A: Return utilities
export const useWarehouseManager = () => {
  // ... logic
  return {
    isWarehouseManagerActive: hasJoker,
    currentBonus: calculateCurrentBonus(),
    nextBonusAmount: calculateNextBonus(),
  };
};

// Option B: Rename to reflect side-effect nature
export const useWarehouseManagerEffect = () => {
  // ... logic
  return; // Explicit void return
};
```

---

### 18. Missing Error Boundaries
**File:** `app/components/TutorialManager.tsx`, `TutorialOverlay.tsx`
**Severity:** 🔵 **LOW**

**Problem:**
If tutorial components throw errors, entire app could crash. No error boundary protection.

**Recommended Addition:**
```typescript
// app/components/TutorialErrorBoundary.tsx
export class TutorialErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    console.error('Tutorial error:', error);
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to analytics
    logError('tutorial_error', { error, errorInfo });

    // Skip tutorial to prevent infinite error loop
    this.props.dispatch(skipTutorial());
  }

  render() {
    if (this.state.hasError) {
      return null; // Fail silently, don't show tutorial
    }
    return this.props.children;
  }
}

// Usage:
<TutorialErrorBoundary>
  <TutorialManager shouldStart={...} />
</TutorialErrorBoundary>
```

---

## End-to-End Feature Flow Analysis

### Tutorial System Flow (Start to Finish)

#### 🎯 **Expected User Journey**
```
1. New Player Opens App
   ↓
2. App checks tutorialStorage.hasEverCompletedTutorial()
   ↓
3. Returns false (first time player)
   ↓
4. Game starts with tutorial.isActive = true
   ↓
5. Player reaches Market screen
   ↓
6. TutorialManager mounts, calls start() from rn-tourguide
   ↓
7. Tutorial zones render with spotlights (rn-tourguide)
   ↓
8. Player clicks through tutorial tooltips
   ↓
9. Tutorial advances through market → lunch → after-school
   ↓
10. Player completes step 13 (SLEEP_BUTTON)
    ↓
11. advanceToStep(14) called → COMPLETED
    ↓
12. tutorialStorage.markTutorialCompleted() called (NOT AWAITED! 🔴)
    ↓
13. Redux: hasCompletedFullTutorial = true, isActive = false
    ↓
14. Tutorial never shows again
```

#### ❌ **Actual Implementation Issues**
```
1. ❌ TWO tutorial systems defined (rn-tourguide + custom overlay)
2. ❌ TutorialOverlay never imported/rendered anywhere
3. ❌ tutorialSteps.ts has 9 zones, tutorialSlice has 14 steps (mismatch!)
4. ❌ No validation that rn-tourguide zones are registered
5. ❌ 800ms hardcoded delay with no fallback
6. ❌ Async storage operations not awaited
7. ❌ Tutorial state can become inconsistent
8. ❌ No error recovery if state becomes invalid
```

#### 🐛 **Critical Bug Flow**
```
Bug: Tutorial State Desync
1. Player at step 3 (MARKET_VIEW_BUY_CANDY)
2. Player buys Snickers candy
3. Redux action queued: markCandyBought()
4. Player QUICKLY clicks Next → advanceToStep(4)
5. Player clicks Next again → advanceToStep(5)
6. Redux batches updates
7. Final state: currentStep = 5, hasBoughtCandyInTutorial = true
8. ✅ Looks good!

BUT if Redux processes in different order:
7. Final state: currentStep = 5, hasBoughtCandyInTutorial = false
8. At SELL_CANDY step but candy is disabled!
9. ❌ Player stuck, can't proceed!
```

---

### Warehouse Manager Flow (Earn to Effect)

#### 🎯 **Expected User Journey**
```
1. Player Plays Game at Lunch
   ↓
2. Wins game → earns Warehouse Manager joker
   ↓
3. Joker added to state.joker.earnedJokers
   ↓
4. Player continues to After School
   ↓
5. Player buys Buy-Up! joker → inventory capacity increases to 80
   ↓
6. Player goes to Deli
   ↓
7. Player buys 50 candies
   ↓
8. Player sleeps → new day starts
   ↓
9. Period advances from X → X+1
   ↓
10. useWarehouseManager detects period change
    ↓
11. Checks: Has joker? ✅ Has 75+ capacity? ✅ Has candies? ✅
    ↓
12. Applies bonus: 50 candies × $100 = $5,000 ✅
    ↓
13. Player sees wallet increase!
```

#### ❌ **Critical Bug Flows**

**Bug 1: App Reload Loses Bonus**
```
1. Player at period 5, has 50 candies
2. Should get $5,000 bonus
3. Player closes app BEFORE period advances
4. App reopens
5. useWarehouseManager hook remounts
6. lastPeriod = useState(5) = 5 ← CURRENT PERIOD!
7. periodCount from Redux = 5
8. useEffect: (5 !== 5) = false ❌
9. No bonus applied!
10. Player advances to period 6
11. useEffect: (6 !== 5) = true ✅
12. Bonus applied for period 6 ✅
13. ❌ But player LOST bonus for period 5!
```

**Bug 2: Hook Not Always Mounted**
```
1. Player on Settings screen
2. Some event advances period (rare but possible)
3. Market screen NOT mounted
4. useWarehouseManager NOT running
5. ❌ No bonus applied!
```

**Bug 3: Missing Dependencies Cause Stale Closure**
```
1. Hook mounts, player has NO jokers
2. checkWarehouseManagerBonus (v1) created with jokers = []
3. useEffect captures checkWarehouseManagerBonus (v1)
4. Player earns Warehouse Manager
5. jokers array updates
6. checkWarehouseManagerBonus (v2) created with jokers = [WAREHOUSE_MANAGER]
7. useEffect STILL uses checkWarehouseManagerBonus (v1) ❌
8. Period advances
9. Old function checks jokers = [] → no bonus ❌
10. ❌ Player has joker but gets no money!
```

---

## Recommended Action Plan

### Phase 1: CRITICAL BLOCKERS (Must fix before ANY testing)
1. 🔴 **Decide on tutorial system** - Keep ONE system, remove the other
2. 🔴 **Add Warehouse Manager persistence** - Track which periods received bonuses
3. 🔴 **Fix async operations** - Use createAsyncThunk for AsyncStorage calls
4. 🔴 **Add tutorial state validation** - Prevent inconsistent states
5. 🔴 **Fix useEffect dependencies** - Add all dependencies to avoid stale closures
6. 🔴 **Fix TutorialManager timing** - Replace hardcoded delay with zone readiness check

### Phase 2: HIGH PRIORITY (Fix before beta)
1. 🟠 **Improve tutorial resume logic** - Handle edge cases for navigation
2. 🟠 **Clarify Warehouse Manager design** - Document when bonuses apply and threshold behavior
3. 🟠 **Derive tutorial progress from game state** - Remove separate tracking booleans
4. 🟠 **Handle tutorial navigation edge cases** - What happens if user navigates away?
5. 🟠 **Move Warehouse Manager to root** - Ensure hook always runs

### Phase 3: MEDIUM PRIORITY (Fix before 1.0)
1. 🟡 **Remove console.logs** - Use debug flag
2. 🟡 **Extract tutorial content to config** - Centralize copy
3. 🟡 **Add tutorial analytics** - Track completion rates
4. 🟡 **Fix tutorial content accuracy** - Match messages to actual game state

### Phase 4: POLISH (Can defer)
1. 🔵 **Verify TourGuide zones** - Check if zones are registered
2. 🔵 **Improve Warehouse Manager API** - Return useful values
3. 🔵 **Add error boundaries** - Protect against tutorial crashes

---

## Testing Checklist

### Tutorial System Testing

- [ ] **Fresh Install Flow**
  - [ ] Install app for first time
  - [ ] Verify tutorial starts automatically
  - [ ] Complete entire tutorial without skipping
  - [ ] Verify tutorial marked as completed
  - [ ] Start new game, verify tutorial doesn't show

- [ ] **Tutorial Skip Flow**
  - [ ] Start tutorial
  - [ ] Skip at step 3
  - [ ] Verify tutorial never shows again
  - [ ] Check AsyncStorage: `@tutorial_ever_completed` = true

- [ ] **Tutorial Replay Flow**
  - [ ] Complete tutorial once
  - [ ] Go to Settings
  - [ ] Click "Replay Tutorial" (if button exists)
  - [ ] Verify tutorial starts from beginning

- [ ] **Tutorial State Consistency**
  - [ ] Start tutorial
  - [ ] Buy candy at step 3
  - [ ] IMMEDIATELY click Next twice quickly
  - [ ] Verify you can sell candy (not stuck)

- [ ] **Tutorial Navigation**
  - [ ] Start tutorial at market (step 3)
  - [ ] Navigate to Settings
  - [ ] Navigate back to Market
  - [ ] Verify tutorial resumes correctly

- [ ] **Tutorial App Reload**
  - [ ] Start tutorial
  - [ ] Advance to step 7 (lunch)
  - [ ] Close app completely
  - [ ] Reopen app
  - [ ] Verify tutorial resumes at step 7

### Warehouse Manager Testing

- [ ] **Basic Bonus Flow**
  - [ ] Earn Warehouse Manager joker
  - [ ] Get inventory capacity to 75+
  - [ ] Buy 50 candies
  - [ ] Advance period
  - [ ] Verify +$5,000 bonus applied

- [ ] **App Reload Mid-Game**
  - [ ] Period 5, has 50 candies, has Warehouse Manager
  - [ ] Close app
  - [ ] Reopen app
  - [ ] Advance to period 6
  - [ ] Verify period 5 bonus was NOT lost

- [ ] **Get Joker Mid-Game**
  - [ ] Play game without Warehouse Manager
  - [ ] At period 10, earn Warehouse Manager
  - [ ] Verify bonus applies from period 11 onwards

- [ ] **Inventory Threshold Changes**
  - [ ] Have 80 capacity (75+ threshold met)
  - [ ] Have 50 candies
  - [ ] Get bonus ✅
  - [ ] Lose capacity-boosting joker → drop to 60 capacity
  - [ ] Next period: verify NO bonus (below 75 threshold)

- [ ] **Bonus Timing**
  - [ ] Have Warehouse Manager + 75+ capacity
  - [ ] Have 50 candies at START of period
  - [ ] Verify bonus applies
  - [ ] Sell all candies during period
  - [ ] Verify next period has NO bonus (0 candies)

---

## Code Quality Assessment

### ✅ **Positive Aspects**
- Clean separation of concerns (hooks, slices, components)
- Good use of TypeScript types
- Comprehensive tutorial step definitions
- Redux integration follows best practices (mostly)
- Good attempt at complex state management

### ❌ **Areas for Improvement**
- Conflicting tutorial implementations
- Missing persistence for Warehouse Manager
- Async operations in reducers (Redux anti-pattern)
- Missing error handling and recovery
- React hooks violations (missing dependencies)
- Excessive console logging
- No error boundaries
- No analytics tracking
- Hardcoded timing values

---

## Final Verdict

**🔴 REJECT - Critical architectural issues must be resolved**

This PR demonstrates good effort but has fundamental design issues that make it unsuitable for production:

1. **Tutorial system is incoherent** - Two systems conflict, unclear which is used
2. **Warehouse Manager loses state** - Bonuses disappear on app reload
3. **State inconsistencies possible** - No validation or recovery
4. **React hooks violations** - Will cause bugs in production
5. **Async operations in reducers** - Violates Redux principles

**Estimated Effort to Fix:** 3-4 days
- Day 1: Decide on tutorial system, remove the other, fix state management
- Day 2: Add Warehouse Manager persistence, fix hooks violations
- Day 3: Add validation and error recovery for tutorial
- Day 4: Testing and edge case resolution

**Recommendation:**
1. **Tutorial System:** Choose rn-tourguide OR custom overlay, not both
2. **Warehouse Manager:** Add Redux persistence for applied bonuses
3. **State Management:** Use createAsyncThunk for async operations
4. **Testing:** Add comprehensive tests BEFORE merging
5. **Consider:** Splitting into two separate PRs (Tutorial + Warehouse Manager)

---

**Reviewer:** Staff Engineer
**Date:** 2025-10-25
**Review Status:** ❌ **Changes Requested**
