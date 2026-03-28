# SugarWars — Architecture

## Tech Stack
- **React Native / Expo** (managed workflow)
- **TypeScript** throughout
- **Redux** with `redux-persist` for state management
- **expo-audio** for sound effects and music
- **Firebase** for analytics, leaderboards, difficulty tracking
- **expo-router** for file-based navigation

---

## Project Structure

```
candyWarz/
├── app/                          # Screens & navigation (expo-router)
│   ├── _layout.tsx               # Root stack navigator, Redux Provider
│   ├── index.tsx                 # Redirects to title-screen
│   ├── title-screen.tsx          # Main menu, difficulty selection
│   ├── story-screen.tsx          # Narrative intro before Day 1
│   ├── game-end.tsx              # Final results screen
│   ├── deli.tsx                  # After-school corner store
│   ├── (tabs)/                   # Tab navigator (main game)
│   │   ├── _layout.tsx           # Tab config, GameHUD, ad banner
│   │   ├── market.tsx            # Core trading screen (8 periods/day)
│   │   ├── after-school.tsx      # Evening activities
│   │   ├── jokers.tsx            # Joker inventory view
│   │   ├── price-history.tsx     # Price charts
│   │   └── settings.tsx          # Game settings
│   ├── components/               # Shared UI components
│   │   ├── CandyListItem.tsx     # Single candy row in market
│   │   ├── TransactionModal.tsx  # Buy/sell modal
│   │   ├── TransactionModalManager.tsx
│   │   ├── EventModal.tsx        # Random event popup
│   │   ├── HallPassModal.tsx     # Hall pass selection
│   │   ├── DifficultySelectionModal.tsx
│   │   ├── JokerCard.tsx         # Single joker display
│   │   ├── JokerSelection.tsx    # Post-day joker pick
│   │   ├── FastModal.tsx         # Lightweight modal wrapper
│   │   ├── StatusIndicators.tsx  # HUD elements
│   │   ├── SugarWarsTitleScreen.tsx
│   │   ├── TutorialOverlay.tsx   # Tutorial step overlay with cutouts
│   │   ├── TutorialProvider.tsx  # Tutorial context (layout measurements)
│   │   ├── AvailableJokersModal.tsx # Joker preview in minigame instructions
│   │   └── SparkEffect.tsx       # Visual effects
│   └── minigames/                # 9 minigame screens
│       ├── MathGame.tsx
│       ├── ComputerGame.tsx
│       ├── LogicGame.tsx
│       ├── ArtGame.tsx
│       ├── EconomyGame.tsx
│       ├── GeographyGame.tsx
│       ├── HomeEcGame.tsx
│       ├── NimGame.tsx           # Gym minigame (Misère Nim)
│       └── RecessGame.tsx
├── src/                          # Business logic
│   ├── constants/
│   │   ├── candyRegistry.ts      # 15 candy definitions (single source of truth)
│   │   └── jokerIds.ts           # All 47 joker ID constants
│   ├── hooks/                    # React hooks (bridge Redux ↔ UI)
│   │   ├── useGame.ts            # Period/day/location state
│   │   ├── useWallet.ts          # Balance, stash, difficulty
│   │   ├── useJokers.ts          # Joker ownership, effects
│   │   ├── useInventory.ts       # Candy inventory
│   │   ├── useEventHandler.ts    # Event logic and protections
│   │   ├── useHallPass.ts        # Hall pass selection/effects
│   │   ├── usePriceUpdater.ts    # Price generation per period
│   │   ├── useComputedJokerEffects.ts
│   │   ├── useFarmersCarry.ts    # Farmers Carry joker (inventory count × $ per period)
│   │   ├── useHomeMadeBonus.ts   # Home Made joker (daily inventory bonus)
│   │   ├── useCandySales.ts      # Sale tracking and stats
│   │   ├── useDailyStats.ts      # Per-day statistics
│   │   ├── useSeed.ts            # Game seed management
│   │   ├── useScoreboard.ts      # Leaderboard hooks
│   │   ├── useMinigameTracking.ts # Minigame completion tracking
│   │   ├── usePriceDoubling.ts   # Double Up joker state
│   │   ├── useAdVisibility.ts    # Ad banner visibility
│   │   └── useTabBar.ts          # Tab navigation state
│   ├── store/
│   │   ├── store.ts              # Redux store config (persist v5)
│   │   └── slices/
│   │       ├── gameSlice.ts      # Periods, days, locations
│   │       ├── walletSlice.ts    # Money, difficulty, player info
│   │       ├── jokerSlice.ts     # Owned jokers
│   │       ├── eventHandlerSlice.ts
│   │       ├── candySalesSlice.ts
│   │       ├── inventorySlice.ts    # Candy inventory state
│   │       ├── hallPassSlice.ts     # 17 hall pass definitions, unlock/select
│   │       ├── hallPassModifiersSlice.ts # Computed modifiers for active game
│   │       ├── merchantSlice.ts     # The Connect merchant items/effects
│   │       ├── seedSlice.ts         # Game seed for RNG
│   │       ├── scoreboardSlice.ts   # Leaderboard/scores
│   │       ├── dailyStatsSlice.ts   # Per-day tracking
│   │       ├── minigameTrackingSlice.ts # Minigame completion tracking
│   │       ├── priceDoublingSlice.ts # Double Up joker state
│   │       ├── flavorTextSlice.ts   # Event flavor text display
│   │       ├── tabBarSlice.ts       # Tab navigation state
│   │       ├── localAnalyticsSlice.ts # Local analytics
│   │       └── userObjectSlice.ts   # User profile state
│   ├── types/
│   │   └── candy.tsx             # CandyTypeName, CandySize types
│   └── utils/
│       ├── jokerEffectEngine.ts  # 54 joker effect factories, JokerEffectEngine class
│       ├── jokerService.ts       # Joker business logic helpers
│       ├── saleCalculations.ts   # Profit formula implementation
│       ├── musicController.ts    # Background music (singleton player + replace())
│       ├── soundEffects.ts       # SFX pools (pop, coin, achievement, etc.)
│       ├── audioConfig.ts        # Global audio mode init
│       ├── merchantUtils.ts      # Merchant item helpers
│       └── computeHallPassModifiers.ts
├── utils/
│   └── generateSeededGameData.tsx # Seeded RNG for prices & events
├── assets/
│   ├── music/                    # Background tracks (menu, day1-5, results, victory)
│   └── soundEffects/             # Pop sounds, coins, birds, etc.
└── docs/                         # This documentation
```

---

## State Management (Redux)

### Key Slices

| Slice | Key State | Purpose |
|-------|-----------|---------|
| `gameSlice` | periodCount, day, period, currentLocation, isAfterSchool, minigameContext, selectedMinigame | Game progression |
| `walletSlice` | balance, stashedAmount, adoptionFee, difficultyLevel, playerName | Money & identity |
| `jokerSlice` | jokers[], activeEffects[] | Owned jokers |
| `inventorySlice` | candyInventory[], inventoryLimit | Candy inventory |
| `eventHandlerSlice` | currentEvent, eventHistory, isProcessing | Random events |
| `candySalesSlice` | Sales tracking, consecutive sales | Sale stats |
| `hallPassSlice` | allPasses[], unlockedPassIds[], selectedPassIds[] | Hall pass unlocks/selection |
| `hallPassModifiersSlice` | Computed bonus modifiers for active game | Hall pass effects |
| `merchantSlice` | Merchant items and active effects | The Connect shop |
| `seedSlice` | gameSeed | Seeded RNG for price/event generation |
| `minigameTrackingSlice` | Played minigames per subject | Minigame completion |
| `dailyStatsSlice` | Per-day profit, sales, locations visited | Daily tracking |

### Persistence
- `redux-persist` v5 with whitelist/blacklist pattern
- Persists across app restarts (continue game feature)

---

## Audio System

### Music Controller (`musicController.ts`)
- **Single persistent AudioPlayer** — created once, reuses `player.replace(source)` to swap tracks
- Avoids expo-audio bug where ~40 create/destroy cycles causes permanent silence
- Tracks: menu, day1–5, minigame, results, victory, bird, cricket
- Looping tracks: menu, day1–5, minigame, results
- Queue mechanism handles rapid transitions (stores `targetTrack`)

### Sound Effects (`soundEffects.ts`)
- Pre-created audio player pools (lazy init on first play)
- 10 pop sound players, 2 instances each for other sounds
- Round-robin playback for overlapping sounds

### Audio Config (`audioConfig.ts`)
- One-time `setAudioModeAsync` call
- `interruptionMode: 'mixWithOthers'` — allows music + SFX simultaneously

---

## Navigation

**expo-router** file-based routing:

```
/ (index) → redirects to /title-screen
/title-screen → /story-screen → /(tabs)/market
/(tabs)/market ↔ /(tabs)/after-school (day cycle)
/(tabs)/market → /minigames/* (lunch minigames)
/(tabs)/after-school → /minigames/* (study)
/(tabs)/market → /game-end (after day 5)
/(tabs)/settings → /debug-minigames (DEV only)
```

Tab navigator has 4 visible tabs (Home, Jokers, History, Settings) and 2 hidden (Market, After-School). Initial route is `market`.

---

## Data Flow

### Price Generation
1. Game seed generated at start
2. `generateSeededGameData.tsx` produces all 40-period prices upfront
3. `usePriceUpdater.ts` feeds current period prices to the market UI

### Sale Flow
1. Player selects candy → `TransactionModal` opens
2. Quantity chosen (limited by wallet/inventory)
3. `calculateSaleTotal()` computes profit with all joker/hall pass bonuses
4. Redux state updated (wallet balance, inventory, sales tracking)

### Joker Effect Resolution
1. `JOKER_EFFECT_FACTORIES` in `jokerEffectEngine.ts` — keyed by joker ID, returns level-dependent effects
2. `getJokerEffectsAtLevel(id, level)` — used by sale calculations
3. Effects categorized: flat bonuses (additive) then multipliers (multiplicative)
4. Multi-type candies trigger ALL matching type jokers independently

---

## Key File Reference

| What | File |
|------|------|
| Candy definitions | `src/constants/candyRegistry.ts` |
| Joker IDs | `src/constants/jokerIds.ts` |
| Joker effects | `src/utils/jokerEffectEngine.ts` |
| Profit formula | `src/utils/saleCalculations.ts` |
| Game state hook | `src/hooks/useGame.ts` |
| Money hook | `src/hooks/useWallet.ts` |
| Event handling | `src/hooks/useEventHandler.ts` |
| Price generation | `utils/generateSeededGameData.tsx` |
| Music | `src/utils/musicController.ts` |
| Sound effects | `src/utils/soundEffects.ts` |

---

## Known Gotchas

- **Pre-existing TS errors** in EventModal.tsx (64 errors), firebase.ts, GameHUD, various minigames — these are from older code, not recent changes
- `Object.keys()` on typed objects returns `string[]` — use `as Array<keyof typeof X>` for safe indexing
- React Native uses `textShadowColor`/`textShadowOffset`/`textShadowRadius`, not CSS `textShadow`
- When removing joker handlers, also check JSX modals that reference those handlers
