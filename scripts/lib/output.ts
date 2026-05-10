import * as fs from 'fs';
import * as path from 'path';
import { SimState, TOTAL_PERIODS } from './simState';

export interface ScenarioConfig {
  difficultyLevel: number;
  winRate: number;
  pickPolicy: string;
  carryCapEnabled: boolean;
}

export interface RunResult {
  scenario: ScenarioConfig;
  runIndex: number;
  finalNetWorth: number;
  paidOff: boolean;
  jokersAcquired: number;
  trajectory: { period: number; netWorth: number }[];
}

export interface ScenarioSummary {
  scenario: ScenarioConfig;
  runs: number;
  winRatePct: number;
  netWorth: { median: number; p10: number; p90: number; mean: number };
  jokersAcquired: { median: number };
  trajectoryMedian: number[];
}

function pct(arr: number[], q: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))));
  return sorted[idx];
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function summarizeScenario(scenario: ScenarioConfig, runs: RunResult[]): ScenarioSummary {
  const netWorths = runs.map((r) => r.finalNetWorth);
  const jokers = runs.map((r) => r.jokersAcquired);

  const trajectoryMedian: number[] = [];
  for (let p = 1; p <= TOTAL_PERIODS; p++) {
    const valuesAtP = runs
      .map((r) => r.trajectory.find((t) => t.period === p)?.netWorth)
      .filter((v): v is number => v !== undefined);
    trajectoryMedian.push(pct(valuesAtP, 0.5));
  }

  return {
    scenario,
    runs: runs.length,
    winRatePct: (runs.filter((r) => r.paidOff).length / runs.length) * 100,
    netWorth: {
      median: pct(netWorths, 0.5),
      p10: pct(netWorths, 0.1),
      p90: pct(netWorths, 0.9),
      mean: mean(netWorths),
    },
    jokersAcquired: { median: pct(jokers, 0.5) },
    trajectoryMedian,
  };
}

function fmt(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(0);
}

const SPARK = '▁▂▃▄▅▆▇█';
function sparkline(values: number[]): string {
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((v) => SPARK[Math.min(SPARK.length - 1, Math.floor(((v - min) / range) * (SPARK.length - 1)))])
    .join('');
}

export function renderConsole(summaries: ScenarioSummary[]): string {
  const lines: string[] = [];
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════════════════════════');
  lines.push(' SugarWars Balance Simulator Results');
  lines.push('═══════════════════════════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(
    ' Lvl │ WinR │ Pick    │ Cap │ Win% │ Median NW  │ p10        │ p90        │ Trajectory',
  );
  lines.push(
    '─────┼──────┼─────────┼─────┼──────┼────────────┼────────────┼────────────┼─────────────────────────────',
  );
  for (const s of summaries) {
    lines.push(
      [
        ` ${String(s.scenario.difficultyLevel).padStart(3)} `,
        ` ${(s.scenario.winRate * 100).toFixed(0).padStart(3)}% `,
        ` ${s.scenario.pickPolicy.padEnd(7)} `,
        ` ${(s.scenario.carryCapEnabled ? 'on' : 'off').padEnd(3)} `,
        ` ${s.winRatePct.toFixed(0).padStart(3)}% `,
        ` ${fmt(s.netWorth.median).padStart(9)}  `,
        ` ${fmt(s.netWorth.p10).padStart(9)}  `,
        ` ${fmt(s.netWorth.p90).padStart(9)}  `,
        ` ${sparkline(s.trajectoryMedian.slice(0, 40))}`,
      ].join('│'),
    );
  }
  lines.push('');
  lines.push(' Legend: NW = net worth (balance + stash + inventory). Cap = carry-cap enabled.');
  lines.push(' Trajectory: median net worth across 40 periods, low → high.');
  lines.push('');
  return lines.join('\n');
}

export function writeJSON(summaries: ScenarioSummary[], outPath: string): void {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(summaries, null, 2));
}

export function writeCSV(runs: RunResult[], outPath: string): void {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const header = 'difficulty,winrate,pickPolicy,carryCap,run,period,netWorth\n';
  const rows: string[] = [header];
  for (const run of runs) {
    for (const point of run.trajectory) {
      rows.push(
        [
          run.scenario.difficultyLevel,
          run.scenario.winRate,
          run.scenario.pickPolicy,
          run.scenario.carryCapEnabled ? 'on' : 'off',
          run.runIndex,
          point.period,
          point.netWorth.toFixed(2),
        ].join(','),
      );
      rows.push('\n');
    }
  }
  fs.writeFileSync(outPath, rows.join(''));
}

export function writeConsoleFile(summaries: ScenarioSummary[], outPath: string): void {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, renderConsole(summaries));
}

export function buildRunResult(
  scenario: ScenarioConfig,
  runIndex: number,
  state: SimState,
): RunResult {
  return {
    scenario,
    runIndex,
    finalNetWorth: state.finalNetWorth ?? 0,
    paidOff: state.paidOff ?? false,
    jokersAcquired: state.jokers.length,
    trajectory: state.trajectory.map((t) => ({ period: t.period, netWorth: t.netWorth })),
  };
}
