# Balance Simulator — TODO / Plan

> Status: **v1 implemented and smoke-tested.** Replay simulator working at `scripts/simulateGame.ts`; analytic at `scripts/balanceCalc.ts`. See "Calibration findings" at the bottom for v1 numbers and known gaps.
> Goal: Monte Carlo simulation of full SugarWars runs to validate game balance — carry-cap impact, adoption-fee scaling per difficulty, joker access rates, joker composition. Lets us tune economy without playing 100 manual runs.

## Context

We have a proposed morning-carry-cap mechanic (see `MORNING_CARRY_CAP_PLAN.md`) and 16 difficulty levels with adoption fees from $5k to $10M. We don't actually know whether the existing balance is right at any difficulty, much less whether the carry-cap formula is well-calibrated. Need a tool to simulate runs at scale and produce trajectory distributions.

User wants a **two-tier** approach: a fast analytic Monte Carlo for rapid formula iteration, plus a fuller headless game replay for validation.

## Architecture (two tiers)

| Tier | File | Approach | Speed | Use |
|---|---|---|---|---|
| 1 | `scripts/balanceCalc.ts` | Pure analytic statistical model. Per-period EV math, sampled events, sampled jokers. No buy/sell decisions. | ~10k runs in <2s | Fast formula iteration; sweep parameters cheaply |
| 2 | `scripts/simulateGame.ts` | Headless game replay. Reuses `generateSeededGameData` for prices/events, runs a "greedy with rolling memory" bot for buy/sell, models actual joker drafting. | ~100 runs in ~30s | Validation that analytic model isn't lying; realistic distributions |

Both export the same `SimResult` shape so outputs are comparable. If their medians diverge by >25% we know one is miscalibrated.

## Tier 1: Analytic model — `scripts/balanceCalc.ts`

Closed-form per-period expected value:

```
E[periodProfit] = avgInventoryValue × avgMarginPct × avgProfitBoost × avgMultiplier
                 - eventLossRate × E[lossSize]
                 + foundMoneyRate × E[foundAmount]
```

Sample inputs from distributions:
- `avgMarginPct` from candy registry `baseMin/baseMax` ratios, weighted by which sizes are unlocked on which day
- `avgProfitBoost`/`avgMultiplier` from sampled joker compositions (uniform draw from owned-pool given win rate × periodsWithJokers)
- Event rates from `generateSeededGameData` event-generation logic (without actually generating; just probabilities)

Per-day: 8 × E[periodProfit] − morning carry-cap loss.
Per-run: 5 × E[dayResult].
Run N=10,000 trials per scenario, output percentile bands.

## Tier 2: Replay simulator — `scripts/simulateGame.ts`

Reuses (no copy):
- `generateSeededGameData(seed, 40, difficulty)` from `utils/generateSeededGameData.tsx`
- `computeFinalSaleValue` (and friends) from `src/utils/saleCalculations.ts`
- `STANDARDIZED_JOKERS`, `getJokerEffectsAtLevel` from `src/utils/jokerEffectEngine.ts`
- `JOKER_IDS`, candy registry constants
- New `computeCarryCap` from `src/utils/morningCarryCap.ts` (built in carry-cap plan)

Pure (no Redux) sim state:

```ts
type SimState = {
  day: number; period: number;
  balance: number; stash: number; adoptionFee: number;
  inventory: { candy: string; qty: number; avgCost: number }[];
  jokers: { id: number; level: number }[];
  priceHistory: Record<string, number[]>;   // for rolling-avg memory
  trajectory: { period: number; netWorth: number }[]; // for plotting
};
```

### Bot policy: "greedy with rolling memory"

Each period:
1. **Sell:** for each candy held, if `currentPrice >= rollingAvg3 × 0.95`, sell entirely. Aggressive to avoid hoarding.
2. **Buy:** pick the candy with `currentPrice <= rollingAvg3 × 0.85` and the highest `(rollingAvg3 / currentPrice)` ratio. Spend up to 70% of balance. Reserve 30% for next period.
3. If no candy meets buy threshold, hold.

This is a tunable heuristic — the ×0.95/×0.85/×0.70 numbers are first-pass guesses to be revisited after seeing first results.

### Minigames

~2 per day × 5 days = ~10 per run. For each:
1. Roll `Math.random() < winRate` (configurable: 1.0 / 0.75 / 0.5 / 0.25).
2. If win: `completionLevel` ~ Beta(α=2,β=1) → biased to 2 (~70% skill).
3. Offer N = `completionLevel` random jokers from unowned `STANDARDIZED_JOKERS`.
4. Pick policy:
   - `random`: pick uniformly from offered
   - `synergy`: prefer jokers matching candy types/sizes already owned
   - `best`: pick the one with highest static effect value (rough proxy)

### Events

For each pre-generated event in `periodEvents`, apply at correct period:
- `LOSE_MONEY`: `balance × 0.5` (v1 ignores Medieval Shield / Bodyguard)
- `STASH_LOCKED`: clear inventory (v1 ignores Secret Hideout / Hall Monitor Bribe)
- `FOUND_MONEY`: `+= dollarAmount`
- `PRICE_SPIKE` / `PRICE_DROP`: already baked into `eventPrices` from generator — bot reads this naturally

### Morning step (between days)

1. Apply daily interest (if Mysterious Artifact / Piggy Bank Pro owned)
2. **Carry-cap (if enabled):** compute via `computeCarryCap`, confiscate excess
3. Allowance: $10 base + joker effects

## Scenarios sweep

User picked: **joker win rate × difficulty × random joker combos**.

```
difficulty:  [1, 5, 10, 16]              // 4 cells
winrate:     [1.0, 0.75, 0.5, 0.25]      // 4 cells
jokerPick:   [random, synergy]            // 2 cells
carryCap:    [off, on]                   // 2 cells (so we can see the impact, even though not user-requested explicitly)
```

= 64 scenario cells × 100 runs = 6,400 runs ≈ 30 min for tier-2. Tier-1 runs the same matrix in seconds.

## CLI

```bash
npx tsx scripts/simulateGame.ts \
  --tier replay        # or 'analytic' or 'both'
  --runs 100 \
  --difficulty 1,5,10,16 \
  --winrate 1.0,0.75,0.5,0.25 \
  --joker-pick random,synergy \
  --carry-cap on,off \
  --output ./scripts/output/sim-results
```

Defaults run a sensible smaller matrix (`--runs 50 --difficulty 1,5 --winrate 1.0,0.5`) so an unflagged invocation finishes quickly.

## Output

Per scenario cell:
- `winRatePct` — fraction of runs that beat the adoption fee
- `netWorth.median`, `.p10`, `.p90` at end-of-day-5
- `trajectory.median[period]` — median net worth at each of 40 periods
- `jokersAcquired.median`

Formats written to `scripts/output/`:
- `sim-summary.json` — full results, machine-readable
- `sim-summary.txt` — console-friendly ASCII table + sparkline trajectories per cell
- `sim-trajectories.csv` — one row per `(scenario, run, period)` for plotting in Python/Excel

## Critical files

- `scripts/balanceCalc.ts` *(NEW)* — analytic Monte Carlo entry
- `scripts/simulateGame.ts` *(NEW)* — replay sim entry, CLI parsing, output formatting
- `scripts/lib/simState.ts` *(NEW)* — state + transitions
- `scripts/lib/botPolicy.ts` *(NEW)* — exports `greedyRollingMemory`, leaves room for `random` and `optimal` if added later
- `scripts/lib/jokerSampler.ts` *(NEW)* — draft simulation + pick policies
- `scripts/lib/eventApplication.ts` *(NEW)* — apply events to state
- `scripts/lib/output.ts` *(NEW)* — JSON/CSV/console formatters

Existing-only changes:
- `package.json` — add `tsx` to devDependencies, add `npm run sim` script
- `tsconfig.json` — confirm `scripts/` is included or add a `scripts/tsconfig.json`

## Verification

1. **Smoke:** `npx tsx scripts/simulateGame.ts --runs 5 --difficulty 1` runs in <5s, prints sensible output.
2. **Sanity:** Lvl 1, winrate 1.0, synergy pick → win rate should be ≥95%. If <50%, bot is broken.
3. **Cross-tier check:** Tier-1 and Tier-2 medians for the same scenario within 25%. If diverging, log discrepancy.
4. **Manual calibration:** play one Lvl 1 run, compare your end-of-day trajectory vs. simulator median. Should land in the p10–p90 band.
5. **Carry-cap signal:** with `--carry-cap on,off`, the cap-on case should show lower end-of-day-5 net worth on Lvl 1 (since cap binds) and similar on Lvl 16 (since cap is constant). Validates the carry-cap formula.

## Out of scope for v1

- **Hall passes:** none selected in sim. Add via flag later.
- **Merchant ("The Connect"):** ignored. Add later.
- **Event protection jokers:** Medieval Shield / Bodyguard / Secret Hideout / Hall Monitor Bribe treated as no-ops. Worth adding once basic numbers look right.
- **Joker upgrades (L2/L3):** skipped — most realistic runs don't afford the $5k/$30k upgrade costs anyway. Note in comments.
- **Tutorial mode:** sim always runs in non-tutorial mode.
- **In-app dev screen / interactive UI:** out of scope; this is a CLI tool.

## Dependencies

- This plan can be built **independently** of the carry-cap plan, but the `--carry-cap` flag depends on `src/utils/morningCarryCap.ts` existing. If carry-cap isn't built yet, the simulator can include a placeholder copy of the formula or the flag can be a no-op until then.
- **v1 used the placeholder approach** — formula lives in `scripts/lib/morningStep.ts:computeCarryCap`. Once `src/utils/morningCarryCap.ts` lands, swap the import.

## v1.1 Calibration Findings (after bot retune)

**Tuning changes from v1:** joker picker biased 10× toward `sell_flat_bonus` / `type_multiplier` / `sell_multiplier` / `size_multiplier` (the canonical profit/mult bucket targets); `BOT_JOKER_EFFICIENCY` 0.5 → 0.85; `MIN_HOLD_PERIODS` 2 → 1; buy/sell thresholds tightened to 0.95/1.05 (more turnover); inventory cap 50 → 200 units; bot now runs 2 parallel positions; sale calc now also picks up specialty boost targets at 50% fire rate.

**Run:** 1600 runs across 32 scenario cells (Lvl 1/3/6/10 × winrate 1.0/0.75/0.5/0.25 × cap on/off, synergy pick).

| Lvl | Win | Cap | Win% | Median NW | p10    | p90    |
|-----|-----|-----|------|-----------|--------|--------|
| 1   |100% | off | 100% | $179k     | $43k   | $374k  |
| 1   |100% | on  | 100% | $107k     | $44k   | $290k  |
| 1   | 50% | off | 100% | $149k     | $48k   | $483k  |
| 1   | 50% | on  | 100% | $87k      | $19k   | $213k  |
| 3   |100% | off | 98%  | $125k     | $29k   | $493k  |
| 3   |100% | on  | 92%  | $101k     | $8k    | $363k  |
| 3   | 50% | off | 90%  | $99k      | $9k    | $471k  |
| 6   |100% | off | 46%  | -$17k     | -$164k | $389k  |
| 6   | 50% | off | 42%  | -$33k     | -$169k | $176k  |
| 6   | 25% | off | 26%  | -$76k     | -$161k | $240k  |
| 10  |100% | off | 2%   | -$863k    | -$980k | -$474k |
| 10  |100% | on  | 2%   | -$802k    | -$943k | -$549k |

### v1.1 findings

1. **Difficulty curve now realistic.** Lvl 1-3 ~95-100% beat (easy), Lvl 6 ~30-50% (borderline, joker-access dependent), Lvl 10 ~2-6% (hard), Lvl 16 ~0% (currently unreachable in 5 days with this bot). Matches the intuition that higher difficulties are progressively harder.

2. **Joker access dominates Lvl 6.** Win rate drops from 46% (winrate 1.0) to 18% (winrate 0.25). At borderline difficulty, the joker stack is the deciding factor.

3. **Carry cap impact reversed from v1.** Now that the bot earns enough to fill the cap, cap-on barely affects win rate at Lvl 1-3 (still ~100% beat), and *roughly neutral* at Lvl 6 (cap-on sometimes wins more by forcing earlier stashing). The earlier "cap kills win rate" finding was a v1 artifact of the conservative bot. **The cap is fine as designed for any player who can earn money.** It's harshest on truly weak players who can't even fill the floor — but those players were going to lose anyway.

4. **Analytic tier still pessimistic.** Hasn't been retuned; remains a lower-bound estimator. Use replay for trustworthy numbers.

### Caveats for current calibration

- Lvl 1 p90 of $374k is ~75× the goal — bot is *very* efficient at low difficulty with the new tunings. Real player upside likely caps lower because of inventory micromanagement realism. Treat Lvl 1 numbers as "skilled player ceiling."
- v1.1 still ignores: hall passes, merchant, event-protection jokers, joker upgrades.
- Bot's parallel-position logic splits budget evenly across top 2 candidates — doesn't prioritize the better one.
- Lvl 16 ($10M) likely needs hall passes + merchant + joker upgrades to be beatable in 5 days.

### Tuning history

| Version | Key change | Lvl 1 win% | Lvl 6 win% (winrate 1.0) |
|---------|-----------|------------|--------------------------|
| v1.0 (initial) | aggressive bot | 80% | $93B explosion (broken) |
| v1.0 (retuned) | min-hold 2, eff 0.5, thresholds 0.75/1.25 | 70% | 0% |
| v1.1 | + joker pick bias, eff 0.85, min-hold 1, parallel positions, larger inventory | 100% | 46% |
| v1.2 (calibrated to player data) | eff 1.0, min-hold 0, BUY 95%, SELL/BUY thresholds 1.0/1.0, EOD wallet target $200, joker upgrades, 3 parallel positions, specialty fire 0.75 | 100% (median $174k, p90 $731k, max $1.7M) | 77% |

### v1.2 calibration vs real player data (2026-05-08)

User-reported Lvl 1 game (no super-synergy joker combo):

| Day | Net worth | Jokers |
|-----|-----------|--------|
| 2 | $43k | 2 |
| 3 | $279k | 5 |
| 4 | $2.9M | 7 |
| 5 | $4.97M | 10 |

Sim v1.2 Lvl 1 100%-winrate distribution: median $174k, p90 $731k, max in 30 runs $1.7M. **Player's $5M is ~3× the sim's max** — sim is in the right ballpark but still under-models the upper tail. Likely missing factors:

1. **Hall passes** — sim ignores them entirely. Lunchroom Monopoly (+5× mult on cafeteria), Sale Price Bonus passes, and minigame skip passes all materially affect end-game numbers.
2. **Merchant items** — Fake Report Card, 6th Grade Bodyguard, etc. give one-time boosts the sim ignores.
3. **Player-perfect price timing** — bot uses rolling avg; player sees the actual spike-event hint and times sells precisely.
4. **Opportunistic position sizing** — player goes harder than 95% on known-good buys; bot is uniform.

Player observation: bully event only took $500 (not 50% of millions) because money was stashed. Sim now mirrors this with `END_OF_DAY_WALLET_TARGET = 200`.

### Output locations

- `scripts/output/sim-summary.json` — replay-tier results
- `scripts/output/sim-trajectories.csv` — one row per (scenario, run, period) for plotting
- `scripts/output/sim-summary.txt` — console-friendly ASCII table
- `scripts/output/calc-summary.json` / `calc-summary.txt` — analytic tier
