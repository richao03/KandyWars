# Tutorial System

## Overview

The tutorial is an 11-step guided walkthrough that teaches new players how to buy, sell, and find their Jokers. It triggers automatically on **difficulty 1, first period** and persists across sessions via Redux Persist. Because `startNewGame` calls `resetTutorial()` whenever a difficulty-1 game is started, the tutorial replays on every new difficulty-1 game.

---

## Files

| File | Role |
|------|------|
| `src/store/slices/tutorialSlice.ts` | Redux state (step counter, completion flag) |
| `app/components/TutorialOverlay.tsx` | Overlay UI — cutout, tooltip, step configs |
| `app/(tabs)/market.tsx` | Owns measurements (wallet, piggy, gummy bears, next period), starts the tutorial, and renders the overlay for steps 1–7 |
| `app/components/TransactionModal.tsx` | Highlights buy/sell buttons; advances steps 4 and 7 |
| `app/(tabs)/jokers.tsx` | Renders the overlay for step 9 (All-jokers tab spotlight); advances 9→10 when the All tab is tapped |
| `app/(tabs)/_layout.tsx` | Renders the overlay for steps 8 (Jokers tab spotlight), 10 (Home tab spotlight), and 11 (congrats); auto-advances 8→9 when pathname becomes `/jokers` and 10→11 when it becomes `/home` |
| `src/store/thunks/startNewGame.ts` | Sets `isTutorialMode = level === 1` for seed data (cheap Gummy Bears in periods 1–2) and calls `resetTutorial()` on level 1 |
| `app/(tabs)/settings.tsx` | Debug reset button |

> Note: there is no `TutorialProvider` or `useTutorial` hook. Measurement state lives directly in each screen's component state. The bottom-tab spotlights (steps 8 and 10) measure the actual tab views via `measureInWindow` on refs in `(tabs)/_layout.tsx`, offset by the layout root.

---

## Redux State

```typescript
interface TutorialState {
  tutorialStep: number;      // 0 = inactive, 1–11 = active steps
  tutorialComplete: boolean; // persisted, prevents re-triggering
}
```

**Actions:**
- `startTutorial()` — sets step to 1, clears `tutorialComplete`
- `advanceTutorial()` — increments step; when at step ≥ 11, resets step to 0 and marks complete
- `skipTutorial()` — sets step to 0, marks complete
- `resetTutorial()` — resets both fields (called by `startNewGame` on level 1, and from Settings)

---

## The 11 Steps

| Step | Target Element | Message | Advancement |
|------|---------------|---------|-------------|
| 1 | Wallet display | "This is your wallet…" | Tap anywhere |
| 2 | Piggy Bank / Debt | "This is your goal…" | Tap anywhere |
| 3 | Gummy Bears row | "Gummy Bears for $0.02?!…" | Tap the candy row |
| 4 | Buy button (modal) | (handled inside TransactionModal) | Tap Buy in TransactionModal |
| 5 | Next Period button | "Time to move!" | Tap Next Period |
| 6 | Gummy Bears row | "Gummy Bears jumped to $0.08!…" | Tap the candy row |
| 7 | Sell button (modal) | (handled inside TransactionModal) | Tap Sell in TransactionModal |
| 8 | Jokers tab (bottom tabs) | "Now meet your Jokers…" | Tap the Jokers tab |
| 9 | All tab (inside Jokers screen) | "Jokers can affect your profit and multiplier count…" | Tap the All tab |
| 10 | Home tab (bottom tabs) | "Last stop — head back home…" | Tap the Home tab |
| 11 | Centered congrats modal | "Buy low, sell high…" | Tap to continue → complete |

Steps 1 and 2 show a tap-anywhere overlay, and step 11 is a centered congrats modal that advances on tap. Steps 3, 5, 6, 8, 9, 10 are **action-based** — the user must interact with the highlighted element to advance. Steps 4 and 7 are advanced from inside `TransactionModal`.

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

Only fires on difficulty 1, before the player has moved to any period. Since `startNewGame` resets the completion flag on every difficulty-1 game, the tutorial re-triggers each time a level-1 game begins.

---

## Seeded Price Setup

When tutorial mode is active, `generateSeededGameData` overrides Gummy Bears prices so the lesson works:

```typescript
if (tutorialMode && candyPrices['Gummy Bears']) {
  candyPrices['Gummy Bears'][0] = 0.02; // periodCount 0: cheap buy ($0.02)
  candyPrices['Gummy Bears'][1] = 0.08; // periodCount 1: profitable sell ($0.08)
}
```

`tutorialMode` is derived in `startNewGame` as `isTutorialMode = level === 1`.

This guarantees the "buy low, sell high" loop succeeds during the tutorial.

---

## Target Measurement

Steps 1–6 use `onLayout`-driven measurements stored in `market.tsx` state, then adjusted by the market container's window offset so coordinates are container-local. The overlay renders inside the market container.

Steps 8 and 10 (Jokers tab, Home tab) measure the actual tab `View`s in `(tabs)/_layout.tsx`. Each tab has a ref; `measureInWindow` records the window-space rect, which is then offset by the layout root's window position (`measureLayoutRoot`) so coordinates are layout-local. Measurement re-runs whenever the tutorial reaches step 8 or 10. Step 9 (the All tab) is measured the same way inside `(tabs)/jokers.tsx`.

---

## Overlay Rendering

- **Steps 1–7**: `<TutorialOverlay />` is rendered inside `market.tsx`, gated on `isTutorialActive && tutorialStep <= 7`.
- **Step 9**: `<TutorialOverlay />` is rendered inside `(tabs)/jokers.tsx`, gated on `tutorialStep === 9`, spotlighting the All tab within the jokers screen.
- **Steps 8, 10, 11**: `<TutorialOverlay />` is rendered inside `(tabs)/_layout.tsx`, gated on `tutorialStep === 8 || tutorialStep === 10 || tutorialStep === 11`. Rendering at the layout level means the congrats modal (step 11) survives tab switches.

The overlay is a full-screen absolute view with:
- Semi-transparent backdrop (`rgba(0,0,0,0.7)`)
- Gold-bordered cutout around the target element
- Tooltip positioned above or below the target depending on screen space

---

## Route-Based Auto-Advance

The layout effect in `(tabs)/_layout.tsx` advances the tutorial automatically when the route matches the current step's target tab:

```typescript
useEffect(() => {
  if (tutorialStep === 8 && pathname === '/jokers') {
    dispatch(advanceTutorial());
  } else if (tutorialStep === 10 && pathname === '/home') {
    dispatch(advanceTutorial());
  }
}, [tutorialStep, pathname, dispatch]);
```

This means the user can advance step 8 → 9 by reaching `/jokers`, and step 10 → 11 by reaching `/home`, from anywhere — even if the cutout geometry is slightly off on an unusual device. (Step 9 → 10 is advanced directly by tapping the All tab in `jokers.tsx`.)

---

## Resetting

In Settings (debug section), `resetTutorial()` clears the completion flag. `startNewGame` also calls `resetTutorial()` for every difficulty-1 game, so the tutorial re-triggers the next time the player starts a difficulty 1 game.
