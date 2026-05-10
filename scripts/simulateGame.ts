#!/usr/bin/env tsx
import './lib/registerStubs';
import * as path from 'path';
import { generateSeededGameData } from '../utils/generateSeededGameData';
import { CANDY_REGISTRY } from '../src/constants/candyRegistry';
import { CandyTypeName, CandySize } from '../src/types/candy';
import {
  createInitialState,
  netWorth,
  recordTrajectory,
  recordPrice,
  PERIODS_PER_DAY,
  TOTAL_PERIODS,
  SimState,
} from './lib/simState';
import { applyEventsForPeriod } from './lib/eventApplication';
import {
  executePeriodTrades,
  tryUnlockSizes,
  decideEndOfDayStash,
  applyStash,
  tryUpgradeJokers,
} from './lib/botPolicy';
import {
  drawJokerOffer,
  pickJoker,
  rollMinigameOutcome,
  PickPolicy,
  scoreJoker,
} from './lib/jokerSampler';
import { applyMorning, computeCarryCap } from './lib/morningStep';
import {
  ScenarioConfig,
  RunResult,
  ScenarioSummary,
  summarizeScenario,
  renderConsole,
  writeJSON,
  writeCSV,
  writeConsoleFile,
  buildRunResult,
} from './lib/output';

interface CliArgs {
  runs: number;
  difficulties: number[];
  winrates: number[];
  pickPolicies: PickPolicy[];
  carryCapVariants: boolean[];
  outputBase: string;
  verbose: boolean;
}

function parseList<T>(raw: string, parser: (s: string) => T): T[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(parser);
}

function parseArgs(argv: string[]): CliArgs {
  const defaults: CliArgs = {
    runs: 25,
    difficulties: [1, 5],
    winrates: [1.0, 0.5],
    pickPolicies: ['synergy'],
    carryCapVariants: [false, true],
    outputBase: path.resolve('scripts/output/sim'),
    verbose: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const eq = arg.indexOf('=');
    let key: string;
    let value: string;
    if (eq >= 0) {
      key = arg.slice(0, eq);
      value = arg.slice(eq + 1);
    } else {
      key = arg;
      value = argv[i + 1];
      if (value && !value.startsWith('--')) i++;
      else value = 'true';
    }
    switch (key) {
      case '--runs':
        defaults.runs = parseInt(value, 10);
        break;
      case '--difficulty':
        defaults.difficulties = parseList(value, (s) => parseInt(s, 10));
        break;
      case '--winrate':
        defaults.winrates = parseList(value, parseFloat);
        break;
      case '--joker-pick':
        defaults.pickPolicies = parseList(value, (s) => s as PickPolicy);
        break;
      case '--carry-cap':
        defaults.carryCapVariants = parseList(value, (s) => s === 'on' || s === 'true');
        break;
      case '--output':
        defaults.outputBase = path.resolve(value);
        break;
      case '--verbose':
        defaults.verbose = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }
  return defaults;
}

function printHelp(): void {
  console.log(`
SugarWars Replay Simulator

Usage: tsx scripts/simulateGame.ts [options]

Options:
  --runs N                 Runs per scenario cell (default: 25)
  --difficulty 1,5,10,16   Difficulty levels to sim (default: 1,5)
  --winrate 1.0,0.75,0.5   Minigame win rates (default: 1.0,0.5)
  --joker-pick random,synergy,best   Pick policies (default: synergy)
  --carry-cap on,off       Carry-cap variants (default: off,on)
  --output PATH            Output base path (default: scripts/output/sim)
  --verbose                Verbose per-run logging
  --help                   Show this help
`);
}

function lookupPrice(
  data: ReturnType<typeof generateSeededGameData>,
  candy: string,
  period: number,
): number {
  const periodIdx = period - 1;
  const universalEvent = data.eventPrices[periodIdx]?.['any']?.[candy];
  if (universalEvent !== undefined) return universalEvent;
  for (const loc of Object.keys(data.eventPrices[periodIdx] ?? {})) {
    const p = data.eventPrices[periodIdx][loc][candy];
    if (p !== undefined) return p;
  }
  return data.candyPrices?.[candy]?.[periodIdx] ?? 0;
}

function runOneSimulation(scenario: ScenarioConfig, runIndex: number): SimState {
  const seed = `sim-${scenario.difficultyLevel}-${scenario.winRate}-${scenario.pickPolicy}-${scenario.carryCapEnabled}-${runIndex}`;
  const state = createInitialState({ difficultyLevel: scenario.difficultyLevel, seed });
  const data = generateSeededGameData(seed, TOTAL_PERIODS, scenario.difficultyLevel, false);

  for (let period = 1; period <= TOTAL_PERIODS; period++) {
    state.period = period;
    state.day = Math.floor((period - 1) / PERIODS_PER_DAY) + 1;

    if ((period - 1) % PERIODS_PER_DAY === 0 && period > 1) {
      applyMorning(state, { carryCapEnabled: scenario.carryCapEnabled });
    }

    tryUnlockSizes(state);

    applyEventsForPeriod(state, data.periodEvents, period);

    const currentPrices: Record<string, number> = {};
    for (const candy of CANDY_REGISTRY) {
      const price = lookupPrice(data, candy.name, period);
      currentPrices[candy.name] = price;
      recordPrice(state, candy.name, price);
    }

    executePeriodTrades(state, currentPrices);

    if (period % 4 === 0) {
      const recentTypes = new Set<CandyTypeName>();
      const recentSizes = new Set<CandySize>();
      for (const item of state.inventory) {
        const def = CANDY_REGISTRY.find((c) => c.name === item.candy);
        if (!def) continue;
        for (const t of def.types) recentTypes.add(t);
        recentSizes.add(def.size);
      }
      const outcome = rollMinigameOutcome(state, scenario.winRate);
      if (outcome.won && outcome.completionLevel > 0) {
        const offered = drawJokerOffer(state, outcome.completionLevel);
        const picked = pickJoker(state, offered, scenario.pickPolicy as PickPolicy, recentTypes, recentSizes);
        if (picked) state.jokers.push({ id: picked.id, level: 1 });
        // After the pick, opportunistically upgrade existing jokers
        tryUpgradeJokers(state, scoreJoker);
      }
    }

    if (period % PERIODS_PER_DAY === 0 && period < TOTAL_PERIODS) {
      const stashAmount = decideEndOfDayStash(
        state,
        scenario.carryCapEnabled,
        (s) => computeCarryCap(s).cap,
      );
      applyStash(state, stashAmount);
    }

    recordTrajectory(state, currentPrices);
  }

  const finalPrices: Record<string, number> = {};
  for (const candy of CANDY_REGISTRY) {
    finalPrices[candy.name] = lookupPrice(data, candy.name, TOTAL_PERIODS);
  }
  state.finalNetWorth = netWorth(state, finalPrices);
  state.paidOff = state.balance + state.stash >= 0;
  state.done = true;

  return state;
}

function main(): void {
  const args = parseArgs(process.argv);

  console.log('═══ SugarWars Replay Simulator ═══');
  console.log(
    `Runs/cell: ${args.runs}  Difficulties: [${args.difficulties.join(',')}]  Winrates: [${args.winrates.join(',')}]  Picks: [${args.pickPolicies.join(',')}]  CarryCap: [${args.carryCapVariants.map((c) => (c ? 'on' : 'off')).join(',')}]`,
  );
  console.log('');

  const allRuns: RunResult[] = [];
  const summaries: ScenarioSummary[] = [];

  const totalCells = args.difficulties.length * args.winrates.length * args.pickPolicies.length * args.carryCapVariants.length;
  let cellIdx = 0;
  const tStart = Date.now();

  for (const difficultyLevel of args.difficulties) {
    for (const winRate of args.winrates) {
      for (const pickPolicy of args.pickPolicies) {
        for (const carryCapEnabled of args.carryCapVariants) {
          cellIdx++;
          const scenario: ScenarioConfig = { difficultyLevel, winRate, pickPolicy, carryCapEnabled };
          const cellRuns: RunResult[] = [];
          process.stdout.write(
            `[${cellIdx}/${totalCells}] Lvl ${difficultyLevel} | win ${(winRate * 100).toFixed(0)}% | ${pickPolicy} | cap ${carryCapEnabled ? 'on' : 'off'}: `,
          );
          for (let i = 0; i < args.runs; i++) {
            const state = runOneSimulation(scenario, i);
            const result = buildRunResult(scenario, i, state);
            cellRuns.push(result);
            allRuns.push(result);
            if (args.verbose) {
              process.stdout.write(`\n  run ${i}: NW=${result.finalNetWorth.toFixed(0)} paid=${result.paidOff} jokers=${result.jokersAcquired}`);
            } else {
              process.stdout.write('.');
            }
          }
          summaries.push(summarizeScenario(scenario, cellRuns));
          process.stdout.write('\n');
        }
      }
    }
  }

  const elapsed = ((Date.now() - tStart) / 1000).toFixed(1);
  console.log(`\nCompleted ${allRuns.length} runs in ${elapsed}s\n`);

  console.log(renderConsole(summaries));

  writeJSON(summaries, `${args.outputBase}-summary.json`);
  writeCSV(allRuns, `${args.outputBase}-trajectories.csv`);
  writeConsoleFile(summaries, `${args.outputBase}-summary.txt`);

  console.log(`Saved:`);
  console.log(`  ${args.outputBase}-summary.json`);
  console.log(`  ${args.outputBase}-trajectories.csv`);
  console.log(`  ${args.outputBase}-summary.txt`);
}

main();
