#!/usr/bin/env tsx
/**
 * Analytic Monte Carlo balance estimator.
 *
 * Closed-form per-period expected value, sampled across N trials per scenario.
 * Much faster than the replay simulator (~10k trials/sec) — useful for fast
 * formula iteration on the carry-cap and adoption-fee scaling.
 *
 * Per-period EV:
 *   profit ≈ avgInvestment × spreadCapture × jokerStackBoost
 *           - eventLossEV
 *           + foundMoneyEV
 *
 * spreadCapture = expected fraction of (max - min) the player captures per
 * trade. Bot at ~0.30 captures 30% of available spread on average. Real
 * skilled players ~0.50.
 *
 * Run: npx tsx scripts/balanceCalc.ts
 */
import './lib/registerStubs';
import * as path from 'path';
import { adoptionFeeForLevel, TOTAL_PERIODS } from './lib/simState';
import {
  ScenarioConfig,
  RunResult,
  ScenarioSummary,
  summarizeScenario,
  renderConsole,
  writeJSON,
  writeConsoleFile,
} from './lib/output';

const TRIALS_PER_SCENARIO = 5000;

// Per-candy expected base profit (max - min midpoint × spreadCapture)
const SMALL_AVG_SPREAD = (10 - 0.5) * 0.5;     // ~$4.75 per unit
const MEDIUM_AVG_SPREAD = (200 - 5) * 0.5;     // ~$97 per unit
const BIG_AVG_SPREAD = (1000 - 50) * 0.5;      // ~$475 per unit

// Tuned so the analytic tier roughly matches replay-sim Lvl 1 outcomes.
// This is a coarse lower-bound estimator — use the replay sim for fidelity.
const SPREAD_CAPTURE = 0.7;
const EVENT_PERIOD_RATE = 0.15;       // ~15% of periods have an applied event
const LOSE_MONEY_PROB = 0.5 / 3;
const STASH_LOCKED_PROB = 0.5 / 3;
const FOUND_MONEY_PROB = 0.5 / 3;
const FOUND_MONEY_EV = 300;
const LOSE_MONEY_FRACTION = 0.5;

function jokerStackBoostForPeriod(period: number, winRate: number): number {
  // Bot can have up to ~10 jokers (2 minigames/day × 5 days). Assume linear
  // accumulation × winRate. Each joker contributes ~0.05 to the boost bucket
  // on average (some hit, some don't, conditional jokers diluted).
  const periodsOfMinigames = Math.min(10, Math.floor(period / 4));
  const jokersOwned = periodsOfMinigames * winRate;
  // Apply same efficiency haircut as replay sim
  return 1 + jokersOwned * 0.05 * 0.5;
}

function pickTier(
  investment: number,
  day: number,
  sizeUnlocked: { medium: boolean; big: boolean },
): { spread: number; unitPrice: number } {
  const dayScale = 0.5 + ((day - 1) / 4) * 0.5;
  const tiers: { spread: number; unitPrice: number }[] = [
    { spread: SMALL_AVG_SPREAD * dayScale, unitPrice: 5 * dayScale },
  ];
  if (sizeUnlocked.medium) {
    tiers.push({ spread: MEDIUM_AVG_SPREAD * dayScale, unitPrice: 100 * dayScale });
  }
  if (sizeUnlocked.big) {
    tiers.push({ spread: BIG_AVG_SPREAD * dayScale, unitPrice: 500 * dayScale });
  }
  // Pick the highest tier the bot can afford to buy at least 1 unit of.
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (investment >= tiers[i].unitPrice) return tiers[i];
  }
  return tiers[0];
}

function unlockedForDay(day: number): { medium: boolean; big: boolean } {
  return { medium: day >= 2, big: day >= 3 };
}

function simulateAnalyticRun(scenario: ScenarioConfig, runIndex: number): RunResult {
  const adoptionFee = adoptionFeeForLevel(scenario.difficultyLevel);
  let balance = 20;
  let stash = -adoptionFee;
  const trajectory: { period: number; netWorth: number }[] = [];

  for (let period = 1; period <= TOTAL_PERIODS; period++) {
    const day = Math.floor((period - 1) / 8) + 1;
    const unlocked = unlockedForDay(day);
    const jokerBoost = jokerStackBoostForPeriod(period, scenario.winRate);

    // Bot effectively does ~0.5 round-trip cycles per period after amortizing
    // the 2-period min-hold and warm-up.
    const tradeFraction = 0.5;
    const investment = Math.max(0, balance * 0.4);
    const tier = pickTier(investment, day, unlocked);
    const unitsBought = Math.max(0, Math.floor(investment / tier.unitPrice));
    const expectedProfitPerUnit = tier.spread * SPREAD_CAPTURE * jokerBoost;
    const profitThisPeriod = unitsBought * expectedProfitPerUnit * tradeFraction;
    balance += profitThisPeriod;

    // Apply event sample
    if (Math.random() < EVENT_PERIOD_RATE) {
      const r = Math.random();
      if (r < LOSE_MONEY_PROB) balance *= 1 - LOSE_MONEY_FRACTION;
      else if (r < LOSE_MONEY_PROB + STASH_LOCKED_PROB) {
        // model as small balance hit (stash is unaffected)
        balance *= 0.95;
      } else if (r < LOSE_MONEY_PROB + STASH_LOCKED_PROB + FOUND_MONEY_PROB) {
        balance += FOUND_MONEY_EV;
      }
    }

    // End of day stash + morning step (simplified)
    if (period % 8 === 0 && period < TOTAL_PERIODS) {
      if (scenario.carryCapEnabled) {
        const savings = Math.max(0, stash + adoptionFee);
        const floor = Math.max(20, adoptionFee * 0.02);
        const cap = Math.min(100_000, Math.max(floor, savings * 0.10));
        const stashable = Math.max(0, balance - cap);
        balance -= stashable;
        stash += stashable;
      } else {
        const stashable = balance * 0.3;
        balance -= stashable;
        stash += stashable;
      }
      // morning allowance approximation
      balance += 10;
    }

    trajectory.push({ period, netWorth: balance + stash });
  }

  return {
    scenario,
    runIndex,
    finalNetWorth: balance + stash,
    paidOff: balance + stash >= 0,
    jokersAcquired: Math.floor(10 * scenario.winRate),
    trajectory,
  };
}

function main(): void {
  const difficulties = [1, 5, 10, 16];
  const winrates = [1.0, 0.75, 0.5, 0.25];
  const carryCapVariants = [false, true];

  console.log('═══ SugarWars Analytic Monte Carlo ═══');
  console.log(`Trials/cell: ${TRIALS_PER_SCENARIO}`);
  console.log('');

  const summaries: ScenarioSummary[] = [];
  const tStart = Date.now();

  for (const difficultyLevel of difficulties) {
    for (const winRate of winrates) {
      for (const carryCapEnabled of carryCapVariants) {
        const scenario: ScenarioConfig = {
          difficultyLevel,
          winRate,
          pickPolicy: 'analytic',
          carryCapEnabled,
        };
        const runs: RunResult[] = [];
        for (let i = 0; i < TRIALS_PER_SCENARIO; i++) {
          runs.push(simulateAnalyticRun(scenario, i));
        }
        summaries.push(summarizeScenario(scenario, runs));
      }
    }
  }

  const elapsed = ((Date.now() - tStart) / 1000).toFixed(2);
  console.log(`Completed ${summaries.length * TRIALS_PER_SCENARIO} trials in ${elapsed}s\n`);

  console.log(renderConsole(summaries));

  const outputBase = path.resolve('scripts/output/calc');
  writeJSON(summaries, `${outputBase}-summary.json`);
  writeConsoleFile(summaries, `${outputBase}-summary.txt`);
  console.log(`Saved:`);
  console.log(`  ${outputBase}-summary.json`);
  console.log(`  ${outputBase}-summary.txt`);
}

main();
