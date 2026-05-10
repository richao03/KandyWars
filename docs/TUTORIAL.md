# Tutorial System

## Overview

The tutorial is a 9-step guided walkthrough that teaches new players how to buy, sell, and find their Jokers. It triggers automatically on **difficulty 1, first game, first period** and persists across sessions via Redux Persist.

---

## Files

| File | Role |
|------|------|
| `src/store/slices/tutorialSlice.ts` | Redux state (step counter, completion flag) |
| `app/components/TutorialOverlay.tsx` | Overlay UI — cutout, tooltip, step configs |
| `app/(tabs)/market.tsx` | Owns measurements (wallet, piggy, gummy bears, next period) and renders the overlay for steps 1–7 |
| `app/components/TransactionModal.tsx` | Highlights buy/sell buttons; advances steps 4 and 7 |
| `app/(tabs)/_layout.tsx` | Renders the overlay for steps 8 (Jokers tab spotlight) and 9 (congrats); auto-advances 8→9 when pathname becomes `/jokers` |
| `app/components/SugarWarsTitleScreen.tsx` | Passes `tutorialMode` flag to seed data (cheap Gummy Bears in periods 1–2) |
| `app/(tabs)/settings.tsx` | Debug reset button |

> Note: there is no `TutorialProvider` or `useTutorial` hook. Measurement state lives directly in `market.tsx`'s component state, and the bottom-tab spotlight (step 8) uses computed geometry (`screenWidth / 4 × tabIndex`) rather than `measureInWindow`.

---

## Redux State

```typescript
interface TutorialState {
  tutorialStep: number;      // 0 = inactive, 1–9 = active steps
  tutorialComplete: boolean; // persisted, prevents re-triggering
}
```

**Actions:**
- `startTutorial()` — sets step to 1
- `advanceTutorial()` — increments step; marks complete when advancing past step 9
- `skipTutorial()` — sets step to 0, marks complete
- `resetTutorial()` — resets both fields (available in Settings)

---

## The 9 Steps

| Step | Target Element | Message | Advancement |
|------|---------------|---------|-------------|
| 1 | Wallet display | "This is your wallet…" | Tap anywhere |
| 2 | Piggy Bank / Debt | "This is your goal…" | Tap anywhere |
| 3 | Gummy Bears row | "Gummy Bears for $2?!…" | Tap the candy row |
| 4 | Buy button (modal) | "Smash that Buy button!" | Tap Buy in TransactionModal |
| 5 | Next Period button | "Time to move!" | Tap Next Period |
| 6 | Gummy Bears row | "Gummy Bears jumped to $8!" | Tap the candy row |
| 7 | Sell button (modal) | (handled inside TransactionModal) | Tap Sell in TransactionModal |
| 8 | Jokers tab (bottom tabs) | "Now meet your Jokers…" | Tap the Jokers tab |
| 9 | Centered congrats modal | "Buy low, sell high…" | Tap **Got it!** → complete |

Steps 1, 2, and 9 show a tap-anywhere overlay. Steps 3, 5, 6, 8 are **action-based** — the user must interact with the highlighted element to advance. Steps 4 and 7 are advanced from inside `TransactionModal`.

---

## How It Triggers

In `market.tsx`:

```typescript
useEffect(() => {
  if (
    difficultyLevel === 1 &&
    periodCount === 0 &&
    !tutorialComplete &&
    tutorialStep === 0
  ) {
    dispatch(startTutorial());
  }
}, [difficultyLevel, periodCount, tutorialComplete, tutorialStep, dispatch]);
```

Only fires on difficulty 1, before the player has moved to any period.

---

## Seeded Price Setup

When tutorial mode is active, `generateSeededGameData` overrides Gummy Bears prices so the lesson works:

```typescript
if (tutorialMode && candyPrices['Gummy Bears']) {
  candyPrices['Gummy Bears'][0] = 2;   // Period 1: cheap buy
  candyPrices['Gummy Bears'][1] = 8;   // Period 2: profitable sell
}
```

This guarantees the "buy low, sell high" loop succeeds during the tutorial.

---

## Target Measurement

Steps 1–6 use `onLayout`-driven measurements stored in `market.tsx` state, then adjusted by the market container's window offset so coordinates are container-local. The overlay renders inside the market container.

Step 8 (Jokers tab) does NOT use `onLayout`. Because the bottom tab bar has a fixed height (49px) and four equally-spaced visible tabs, the rect is computed directly from `useWindowDimensions()` and `useSafeAreaInsets()`:

```typescript
const tabWidth = screenWidth / 4;
const jokersTabRect = {
  x: 1 * tabWidth,                          // Jokers is index 1 of 4
  y: screenHeight - insets.bottom - 49,
  width: tabWidth,
  height: 49,
};
```

If the visible tab order or count ever changes, update `JOKERS_TAB_INDEX` / `VISIBLE_TAB_COUNT` in `(tabs)/_layout.tsx`.

---

## Overlay Rendering

- **Steps 1–7**: `<TutorialOverlay />` is rendered inside `market.tsx`, gated on `tutorialStep <= 7`.
- **Steps 8–9**: `<TutorialOverlay />` is rendered inside `(tabs)/_layout.tsx`, gated on `tutorialStep === 8 || tutorialStep === 9`. Rendering at the layout level means the congrats modal (step 9) survives the tab switch from market → jokers.

The overlay is a full-screen absolute view with:
- Semi-transparent backdrop (`rgba(0,0,0,0.7)`)
- Gold-bordered cutout around the target element
- Tooltip positioned above or below the target depending on screen space

---

## Step 8 Auto-Advance

When the player is on step 8 and the route changes to `/jokers`, the layout effect in `(tabs)/_layout.tsx` fires `advanceTutorial()` automatically:

```typescript
useEffect(() => {
  if (tutorialStep === 8 && pathname === '/jokers') {
    dispatch(advanceTutorial());
  }
}, [tutorialStep, pathname, dispatch]);
```

This means the user can reach step 9 by tapping the Jokers tab from anywhere — even if the cutout geometry is slightly off on an unusual device.

---

## Resetting

In Settings (debug section), `resetTutorial()` clears the completion flag. The tutorial will re-trigger the next time the player starts a difficulty 1 game.
