# Pull Request Notes

## Summary
This PR includes major cleanup, bug fixes, and a new feature for instant jokers. The changes improve code maintainability by removing unused tutorial code, fix critical bugs with hall passes and joker mechanics, and implement a "once per day" reusable system for instant jokers.

**Files Changed:** 41 files modified, 2 files deleted
**Lines Changed:** +1,687 additions, -1,470 deletions

---

## 🧹 1. Tutorial Code Removal

### Overview
Completely removed all tutorial-related code from the codebase as it was no longer being used.

### Files Deleted
- `app/components/CustomCopilotTooltip.tsx` (206 lines)
- `app/components/MarketWithCopilot.tsx` (148 lines)

### Files Modified
- **app/_layout.tsx**
  - Removed `CopilotProvider` wrapper
  - Removed `TutorialTooltip` import

- **app/components/GameHUD.tsx**
  - Removed `CopilotStep` and `walkthroughable` imports
  - Removed 5 tutorial step wrappers: WalletContainer, PiggyBankContainer, InventoryContainer, HeaderContainer, FlavorTextContainer
  - Replaced with standard View/Animated.View components

- **app/components/MarketActionButtons.tsx**
  - Removed Copilot imports and walkthroughable wrapper

- **app/(tabs)/market.tsx**
  - Removed tutorial dependencies from useEffect
  - Cleaned up dependency array: removed `isTutorialActive`, `tutorialStep`, `TUTORIAL_STEPS`, `advanceTutorialToStep`

- **app/components/CandyWarsTitleScreen.tsx**
  - Removed "Reset Tutorial" button

- **src/store/store.ts**
  - Removed `tutorial` reducer from combineReducers
  - Removed `tutorial` from persist whitelist

- **src/store/slices/gameSlice.ts**
  - Removed tutorial state fields: `hasCompletedMarketTutorial`, `hasCompletedAfterSchoolTutorial`
  - Removed related actions

- **src/hooks/useGame.ts**
  - Removed tutorial-related exports

---

## 🎓 2. Hall Pass Modal Fix

### Issue
Hall pass modal was only showing 13 passes instead of all 17 passes due to old persisted Redux state.

### Solution
Implemented a state migration to force hall pass re-initialization.

### Changes
- **src/store/store.ts**
  - Incremented persist version from `2` to `3`
  - Added migration logic:
    ```typescript
    migrate: (state: any) => {
      if (state && state._persist?.version < 3) {
        console.log('🔄 Migrating to version 3: Forcing hall pass refresh');
        if (state.hallPass) {
          state.hallPass.isLoaded = false; // Force re-initialization
        }
      }
      return Promise.resolve(state);
    }
    ```

- **app/components/HallPassModal.tsx**
  - Added debug logging: `console.log('🎓 HALL PASS MODAL: All pass IDs:', allPasses.map((p) => p.id));`

### Impact
All 17 hall passes (common, rare, epic, legendary) now display correctly in the modal for users with persisted state.

---

## 💰 3. Inheritance Hall Pass Fix

### Issue
The Inheritance hall pass was incorrectly removing 10% from the user's wallet when transferring to the piggy bank. It should add 10% of wallet to piggy bank as **free money** (bonus) without deducting from wallet.

### Solution
Changed the `stashMoney` call to not deduct from wallet.

### Changes
- **src/hooks/useWallet.ts** (Line ~124)
  ```typescript
  // Before (incorrect):
  dispatch(stashMoney({
    amountPaid: transferAmount,
    amountStashed: transferAmount
  }));

  // After (correct):
  dispatch(stashMoney({
    amountPaid: 0,              // Don't remove from wallet
    amountStashed: transferAmount // Add free money to piggy bank
  }));
  ```

  - Updated log message to clarify behavior:
    ```typescript
    console.log(`💼 Inheritance: Added 10% of wallet ($${transferAmount.toFixed(2)}) to piggy bank (wallet unchanged)`);
    ```

### Impact
Inheritance hall pass now correctly gives players a 10% bonus without penalizing their wallet.

---

## 🃏 4. Instant Jokers "Once Per Day" Feature

### Overview
Implemented a comprehensive system to allow instant jokers to be reused daily instead of being consumed on first use.

### New Behavior
- Instant jokers remain in inventory after use (except Glitch in the Matrix)
- Each instant joker can be used once per day
- Visual indicator shows when a joker has been used
- Used jokers are automatically reset when starting a new day
- USE button is hidden for already-used jokers

**Exception:** Glitch in the Matrix (ID: 1) is still removed after use (one-time only)

### Implementation

#### A. State Management (jokerSlice.ts)
Added new state fields and reducers:

```typescript
interface JokerState {
  // ... existing fields
  usedTodayJokerIds: string[];  // Tracks which jokers have been used today
  currentDay: number;            // Track current day for daily reset
}

const initialState: JokerState = {
  // ... existing
  usedTodayJokerIds: [],
  currentDay: 1,
};
```

**New Reducers:**
- `markJokerUsedToday(jokerId: string)` - Marks an instant joker as used for the current day
- `resetDailyJokerUsage(day: number)` - Clears used joker list when starting a new day

**New Selectors:**
- `selectUsedTodayJokerIds` - Get list of joker IDs used today
- `selectCurrentDay` - Get current game day

#### B. Hook Updates (useJokers.ts)
- Exported `usedTodayJokerIds` from state
- Exported `markJokerUsedToday` and `resetDailyJokerUsage` actions
- Made available to all components using the hook

#### C. Joker Activation Logic (app/(tabs)/jokers.tsx)
Changed all instant joker activations from removing the joker to marking it as used:

**Affected Jokers (18 total):**
1. Double Up (ID: 1)
2. Time Equation (ID: 2)
3. Propacandies (ID: 8)
4. Bake Sale (ID: 16)
5. Market Crash (ID: 19)
6. Market Manipulation (ID: 20)
7. The Big Short (ID: 21)
8. Bet You I'm Faster (ID: 25)
9. Master Negotiator (ID: 27)
10. Temporary Emperor (ID: 35)
11. Roman Coin (ID: 37)
12. Dodgeball Dash (ID: 39)
13. Continental Drift (ID: 40)
14. Atlas Bonus (ID: 43)
15. Tachyonic Sprint (ID: 44)
16. Trojan Horse (ID: 47)
17. Pursuasion (ID: 48)
18. Lost and Found (ID: 52)

**Note:** Glitch in the Matrix (ID: 10) remains a one-time use joker and is removed after activation.

```typescript
// Before:
removeJoker(joker.id);

// After:
markJokerUsedToday(joker.id);
```

#### D. Daily Reset (app/(tabs)/after-school.tsx)
Added reset logic when sleeping and starting a new day:

```typescript
const { jokers, resetDailyJokerUsage } = useJokers();

// In handleSleepConfirm:
resetDailyStats();
dispatch(resetEarlySaleFlag());
resetDailyJokerUsage(day + 1);  // Reset instant jokers
startNewDay(periodsPerDay);
```

#### E. UI Updates (app/components/JokerCard.tsx)

**Visual Changes:**
1. **Disabled State** (Line 974)
   - Check if instant joker has been used: `isUsedToday = joker.type === 'one-time' && usedTodayJokerIds.includes(joker.id.toString())`
   - Apply 50% opacity to grayed out card: `style={[styles.cardContainer, isUsedToday && styles.cardUsedToday]}`

2. **"USED TODAY" Badge** (Line 984-988)
   - Red badge displayed in card header when used
   - Styled with `PixeloidMono` font, uppercase text

3. **Hide USE Button** (Line 999-1009)
   - USE button only shows when `!isUsedToday`
   - Prevents accidental activation attempts

**New Styles:**
```typescript
cardUsedToday: {
  opacity: 0.5,  // Gray out used cards
},
usedTodayBadge: {
  backgroundColor: '#dc2626',  // Red badge
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 4,
  marginLeft: 8,
},
usedTodayText: {
  fontSize: 8,
  fontWeight: '700',
  color: '#fff',
  fontFamily: 'PixeloidMono',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
},
```

### Impact
- Players can now strategically use instant jokers throughout the game
- Instant jokers become valuable permanent assets instead of one-time consumables
- Clear visual feedback prevents confusion about joker availability
- Balances game economy by limiting instant joker use to once per day

---

## 📊 Testing Checklist

- [ ] Hall pass modal displays all 17 passes correctly
- [ ] Inheritance hall pass adds to piggy bank without removing from wallet
- [ ] Instant jokers can be used once per day (18 jokers affected)
- [ ] Used instant jokers show "USED TODAY" badge and grayed out appearance
- [ ] Used instant jokers reset when sleeping and starting a new day
- [ ] USE button hidden for already-used instant jokers
- [ ] Glitch in the Matrix is REMOVED after use (one-time only)
- [ ] No tutorial-related errors in console
- [ ] Game state persists correctly across app restarts

---

## 🔧 Technical Notes

### Breaking Changes
- **State Migration Required:** Users will need to reload hall passes on first launch after update (handled automatically by migration)
- **Instant Joker Behavior Change:** Existing users who had instant jokers will now keep them after use (except Glitch in the Matrix, which remains one-time use)

### Performance Improvements
- Removed unused tutorial code reduces bundle size
- Simplified useEffect dependencies in market.tsx

### State Management
- Redux persist version: `2` → `3`
- New state fields in `jokerSlice`: `usedTodayJokerIds`, `currentDay`

---

## 📝 Code Quality

- Removed 354 lines of unused tutorial code
- Added comprehensive logging for debugging
- Maintained consistent code style
- Used TypeScript types throughout
- Followed existing patterns and conventions

---

## 🐛 Bug Fixes Summary

1. ✅ Fixed hall pass modal showing only 13/17 passes
2. ✅ Fixed Inheritance hall pass removing money from wallet
3. ✅ Fixed instant jokers being consumed on first use

## ✨ New Features Summary

1. ✨ Instant jokers now reusable once per day (18 jokers including: Propacandies, Market Manipulation, The Big Short, Double Up, Bake Sale, Market Crash, Temporary Emperor, Roman Coin, and 10 more)
2. ✨ Visual indicators for used jokers
3. ✨ Automatic daily reset for instant jokers
4. ℹ️ Glitch in the Matrix remains one-time use (removed after activation)

---

## 📸 Visual Changes

### JokerCard Component
- **Before:** Instant jokers disappeared after use
- **After:**
  - Instant jokers remain visible
  - Used jokers display at 50% opacity
  - Red "USED TODAY" badge appears
  - USE button hidden when already used
  - Resets automatically each new day

---

## 🚀 Deployment Notes

- No database migrations required
- Redux state will auto-migrate on first app launch
- Users may see a brief re-initialization of hall passes on first launch
- No API changes

---

## 👥 Credits

Generated with Claude Code
