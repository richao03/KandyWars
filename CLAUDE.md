# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: SugarWars (package name: candywarz)

React Native / Expo candy-trading game. The player has 5 school days (8 periods each) to earn enough to pay off a pet adoption fee. Buy candy cheap, sell it high, collect jokers, dodge random events, and stash profits.

More detail lives in `docs/`:
- `docs/ARCHITECTURE.md` — project layout, state slices, audio, navigation
- `docs/GAME_MECHANICS.md` — game flow, difficulty, events, minigames
- `docs/CANDY.md`, `docs/JOKERS.md`, `docs/HALLPASS.md`, `docs/MERCHANT.md`, `docs/TUTORIAL.md`

Always consult `docs/ARCHITECTURE.md` first before making non-trivial changes.

## Commands

```bash
npm start                 # expo start
npm run ios               # expo run:ios
npm run android           # expo run:android
npm run lint              # expo lint (ESLint)
npm run format            # prettier write
npm test                  # jest (all)
npm run test:watch        # jest --watch
npm run test:coverage     # jest --coverage (enforces 70% threshold)
npm run test:jokers       # src/__tests__/jokers
npm run test:hallpass     # src/__tests__/hallpass
npm run test:merchant     # src/__tests__/merchant
npm run test:integration  # src/__tests__/integration
```

Run a single test file: `npx jest path/to/file.test.ts`. Run by name: `npx jest -t "test name pattern"`.

Jest is configured with `testEnvironment: jsdom` and maps `react-native` → `react-native-web`, with `@/*` → `src/*`.

## Big-Picture Architecture

### Tech
- Expo (managed workflow), React Native 0.81, React 19, TypeScript, expo-router file-based routing
- Redux Toolkit + redux-persist (version 5, whitelist/blacklist pattern) in `src/store/store.ts`
- expo-audio for music/SFX, Firebase for analytics/leaderboards
- Seeded RNG (`seedrandom`) for price and event generation

### Layout
- `app/` — screens and navigation (expo-router). `app/(tabs)/` holds the main game tabs (market, after-school, jokers, price-history, settings). Top-level screens: `title-screen.tsx`, `story-screen.tsx`, `game-end.tsx`, `deli.tsx`, etc.
- `app/components/` — shared UI components
- `app/minigames/` — 9 minigame screens (Math, Computer, Logic, Art, Economy, Geography, HomeEc, Gym/Nim, Recess)
- `src/` — business logic (constants, hooks, slices, utils, types, services, data, config, context)
- `utils/generateSeededGameData.tsx` — pre-generates all 40-period prices and events at game start
- `docs/` — authoritative docs (architecture, mechanics, subsystems)

### Core Systems and Single-Source-of-Truth Files
- **Candy Registry** — `src/constants/candyRegistry.ts`: 15 candies, each with exactly 2 types (from 6) and 1 size (small/medium/big). A multi-type candy triggers ALL matching type jokers independently (stacked multiplicatively).
- **Joker IDs** — `src/constants/jokerIds.ts`: constants for all jokers.
- **Joker Effect Engine** — `src/utils/jokerEffectEngine.ts`: `JOKER_EFFECT_FACTORIES` keyed by joker ID, returns level-dependent effects (levels 1–3). `getJokerEffectsAtLevel(id, level)` is the canonical lookup.
- **Sale Calculations** — `src/utils/saleCalculations.ts`: canonical profit formula
  ```
  profitBoost = 1 + Σ(profit-boost contributions)        // type jokers, hall pass %, scaling jokers, etc.
  multiplier  = 1 + Σ(multiplier contributions)          // size jokers, conditional mults, Final Exam +14, Lunchroom +5
  finalProfit = totalProfit × profitBoost × multiplier × finalExamPenalty × lunchroomPenalty
  ```
  Both buckets sum **additively** (Balatro-style: per-joker contributions add into a single bucket, no joker-on-joker product). Vacuum Sealer subtracts 2 from the multiplier bucket (min 1x). Hall pass *bonuses* (Final Exam in last period, Lunchroom Monopoly in cafeteria) are folded into the additive multiplier bucket so they don't compound multiplicatively with jokers; their *penalties* (off-period 0.25×, off-site 0.5×) remain as final multiplicative factors so the punishment is unaffected by joker buildup. Total returned to player is `purchaseValue + finalProfit`.
- **Price Generation** — `utils/generateSeededGameData.tsx`: seeded per-period prices; no global trend system. Each candy has its own "home price," volatility, and random-walk momentum. Prices stay within day-progress-scaled `[baseMin, baseMax]`.
- **Hall Pass Modifiers** — `src/utils/computeHallPassModifiers.ts` + `src/store/slices/hallPassModifiersSlice.ts`: hall passes are unlocked persistently but selected per-run. Modifiers are computed and cached into a slice.
- **Audio** — `src/utils/musicController.ts` uses a SINGLE persistent `AudioPlayer` and calls `player.replace(source)` to swap tracks. Do NOT create/destroy players per track — expo-audio bugs out after ~40 cycles (permanent silence). Queued target track handles rapid transitions. SFX pools in `soundEffects.ts` use round-robin playback.

### State (Redux slices in `src/store/slices/`)
Key slices: `gameSlice` (period/day/location), `walletSlice` (balance, stash, difficulty, player name), `jokerSlice`, `inventorySlice`, `eventHandlerSlice`, `candySalesSlice`, `hallPassSlice` + `hallPassModifiersSlice`, `merchantSlice` (The Connect), `seedSlice`, `minigameTrackingSlice`, `dailyStatsSlice`, `priceDoublingSlice`, `tutorialSlice`, `shopkeeperSlice`, `hustleSlice`, `questSlice`.

Hooks in `src/hooks/` bridge Redux to UI; prefer using these over direct `useSelector`/`useDispatch` for game state.

### Navigation Flow
```
/index → /title-screen → /story-screen → /(tabs)/market
/(tabs)/market ↔ /(tabs)/after-school   # day cycle
lunch period & after-school study → /minigames/*
after day 5 → /game-end
```

### Event System
Pre-generated per seed. Protection has priority (consumed on use):
- `LOSE_MONEY`: Medieval Shield (joker) > 6th Grade Bodyguard (merchant)
- `STASH_LOCKED`: Secret Hideout (joker) > Hall Monitor Bribe (merchant); Teacher's Pet hall pass reduces to 25% loss

### Win Condition
`balance + stashedAmount >= 0` at end of day 5 (adoption fee starts as negative debt).

## Gotchas

- Pre-existing TS errors exist in `EventModal.tsx`, `firebase.ts`, `GameHUD`, and several minigames — unrelated to recent work, don't try to "fix" them en masse.
- React Native uses `textShadowColor` / `textShadowOffset` / `textShadowRadius` — NOT CSS `textShadow`.
- `Object.keys()` on typed objects returns `string[]`; use `as Array<keyof typeof X>` for safe indexing.
- Multi-type candy triggers every matching type joker independently — tests in `src/__tests__/jokers/jokerCombos.test.ts` cover combinations.
- Selling at a loss returns `currentPrice × quantity`, not purchase price.
- Continental Drift shuffles prices only within the same size group.
- When removing a joker handler, also check JSX modals that still reference it.
- `PlayMeGames` font is registered in `app/_layout.tsx` (used by the typewriter title).

## Testing Conventions

Tests live under `src/__tests__/` organized by subsystem: `jokers/`, `hallpass/`, `merchant/`, `events/`, `integration/`, `store/`, `optimization/`, `utils/`. Coverage threshold is 70% across branches/functions/lines/statements (`jest.config.js`). Asset imports (`.png`, `.mp3`, etc.) are stubbed via `src/__tests__/utils/fileMock.js`.
