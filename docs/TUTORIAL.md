# Tutorial System

## Overview

The tutorial is a 9-step guided walkthrough that teaches new players how to buy, sell, and profit. It triggers automatically on **difficulty 1, first game, first period** and persists across sessions via Redux Persist.

---

## Files

| File | Role |
|------|------|
| `src/store/slices/tutorialSlice.ts` | Redux state (step counter, completion flag) |
| `src/hooks/useTutorial.ts` | Hook for accessing state + layout registration |
| `app/components/TutorialProvider.tsx` | Context provider — stores measured positions of UI targets |
| `app/components/TutorialOverlay.tsx` | Overlay UI — cutout, tooltip, step configs |
| `app/(tabs)/market.tsx` | Registers targets (wallet, piggy, gummy bears, next period), advances steps 3–6 |
| `app/components/TransactionModal.tsx` | Highlights buy/sell buttons, advances steps 4, 7, 8 |
| `app/(tabs)/_layout.tsx` | Handles step 9 (Jokers tab highlight) |
| `app/components/SugarWarsTitleScreen.tsx` | Passes `tutorialMode` flag to seed data (cheap Gummy Bears in periods 1–2) |
| `app/(tabs)/settings.tsx` | Debug reset button |

---

## Redux State

```typescript
interface TutorialState {
  tutorialStep: number;      // 0 = inactive, 1–9 = active steps
  tutorialComplete: boolean; // persisted, prevents re-triggering
}
```

**Actions:**
- `startTutorial()` — sets step to 1 (only if not already complete)
- `advanceTutorial()` — increments step; marks complete at step 11
- `skipTutorial()` — sets step to 0, marks complete
- `resetTutorial()` — resets both fields (available in Settings)

---

## The 11 Steps

| Step | Target Element | Message | Advancement |
|------|---------------|---------|-------------|
| 1 | Wallet display | "This is your cash. You start with $20 — spend it wisely!" | Tap **Next** |
| 2 | Piggy Bank / Debt | "This is your debt. Pay it off by the end of Day 5 to win!" | Tap **Next** |
| 3 | Gummy Bears row | "Gummy Bears are cheap right now! Tap to buy some." | Tap the candy row |
| 4 | Buy button (modal) | "Tap the Buy button to purchase Gummy Bears!" | Tap Buy in TransactionModal |
| 5 | Next Period button | "Nice! Now travel to the next period — prices will change!" | Tap Next Period |
| 6 | Gummy Bears row | "Gummy Bears went up! Tap to sell them for a profit!" | Tap the candy row |
| 7 | Sell tab (modal) | "Switch to the Sell tab to sell your candy." | Tap Sell tab in TransactionModal |
| 8 | Sell button (modal) | "Now tap Sell to pocket your profit!" | Tap Sell in TransactionModal |
| 9 | Jokers tab (bottom tabs) | "You can collect Jokers by completing minigames. Click here!" | Tap the Jokers tab |
| 10 | Owned tab (jokers page) | "You can find all the Jokers you own here." | Tap **Next** |
| 11 | All tab (jokers page) | "Click here to see what subjects offer which Jokers. Good luck!" | Tap **Got it!** |

Steps 1–2, 10–11 show a button. Steps 3–9 are **action-based** — the user must interact with the highlighted element to advance.

---

## How It Triggers

In `market.tsx`:

```typescript
useEffect(() => {
  if (difficultyLevel === 1 && !tutorialComplete && periodCount === 0 && !tutorialActive) {
    startTutorial();
  }
}, [difficultyLevel, tutorialComplete, periodCount, tutorialActive, startTutorial]);
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

## Target Registration (Layout Measurement)

`TutorialProvider` stores a `Map<number, LayoutRect>` of screen positions per step. Components register their targets using `measureInWindow` to get absolute coordinates, then convert to container-local coords.

Market targets (steps 1–6) are measured relative to the market container. The Jokers tab (step 9) is measured in window coords from `_layout.tsx`.

The overlay polls for layout at 400ms, 800ms, and 1500ms delays to handle async rendering.

---

## Overlay Rendering

- **Steps 1–8**: `<TutorialOverlay />` renders inside `market.tsx`
- **Step 9**: `<TutorialOverlay />` renders inside `(tabs)/_layout.tsx`

The overlay is a full-screen absolute view with:
- Semi-transparent backdrop (`rgba(0,0,0,0.7)`)
- Gold-bordered cutout around the target element (8px padding, #FFD700 border)
- Tooltip positioned above or below the target depending on screen space
- 300ms fade-in, 200ms fade-out animations

---

## Resetting

In Settings (debug section), `resetTutorial()` clears the completion flag. The tutorial will re-trigger the next time the player starts a difficulty 1 game.
