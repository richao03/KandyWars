/**
 * SparkController — imperative singleton that bridges game logic and the
 * particle-rendering pool (`<SparkPool />` in `app/components/SparkEffect.tsx`).
 *
 * Pattern mirrors JuiceController / SoundEffects / MusicController:
 *   - No React state, no hooks.
 *   - API is queue-before-register: calls made before a pool mounts are
 *     buffered (cap 16, oldest dropped) and flushed on `register`.
 *   - Call sites (e.g. sale completion) need no knowledge of pool lifecycle.
 *
 * Wave-3 (J-Spark-Polish) will extend this with symbol-tier overrides,
 * jackpot physics, and device-specific caps. This file only provides the
 * scaffolding API + tier helpers.
 */

import type { TierLevel } from './computeEffectTier';

export type { TierLevel };

/* --------------------------------------------------------------------------
 * Public option types
 * ------------------------------------------------------------------------ */

export interface BurstOptions {
  origin: { x: number; y: number };
  tier: TierLevel;
  count?: number;
  symbol?: string;
}

export interface ArcOptions {
  from: { x: number; y: number };
  to: { x: number; y: number };
  tier: TierLevel;
  symbol: string;
  /**
   * Optional bezier control-point offset relative to the default midpoint.
   * Use to force the arc trajectory to bend in a specific direction
   * regardless of from/to positions (e.g., positive X = arc bends right,
   * negative X = arc bends left).
   */
  controlOffset?: { x: number; y: number };
}

export interface PulseOptions {
  tier: TierLevel;
  /** Milliseconds. */
  duration: number;
}

export interface SparkPoolApi {
  fireBurst: (opts: BurstOptions) => void;
  fireArc: (opts: ArcOptions) => void;
  firePulse: (opts: PulseOptions) => void;
  reset: () => void;
}

/* --------------------------------------------------------------------------
 * Internal state
 * ------------------------------------------------------------------------ */

const QUEUE_CAP = 16;

type QueueItem =
  | { kind: 'burst'; opts: BurstOptions }
  | { kind: 'arc'; opts: ArcOptions }
  | { kind: 'pulse'; opts: PulseOptions }
  | { kind: 'reset' };

let registeredApi: SparkPoolApi | null = null;
let queue: QueueItem[] = [];

const enqueue = (item: QueueItem): void => {
  if (queue.length >= QUEUE_CAP) {
    queue.shift();
  }
  queue.push(item);
};

const flush = (): void => {
  if (!registeredApi) return;
  const pending = queue;
  queue = [];
  for (const item of pending) {
    switch (item.kind) {
      case 'burst':
        registeredApi.fireBurst(item.opts);
        break;
      case 'arc':
        registeredApi.fireArc(item.opts);
        break;
      case 'pulse':
        registeredApi.firePulse(item.opts);
        break;
      case 'reset':
        registeredApi.reset();
        break;
    }
  }
};

/* --------------------------------------------------------------------------
 * Pure tier helpers (exposed for testing + for SparkPool defaults)
 * ------------------------------------------------------------------------ */

const TIER_PARTICLE_COUNT: Record<TierLevel, number> = {
  none: 0,
  bronze: 3,
  silver: 5,
  gold: 7,
  emerald: 12,
  sapphire: 20,
  jackpot: 24,
};

export function getTierParticleCount(tier: TierLevel): number {
  return TIER_PARTICLE_COUNT[tier] ?? 0;
}

const TIER_PALETTE: Record<TierLevel, string[]> = {
  none: [],
  bronze: ['rgba(123,169,101,1)', '#7ba965', '#6a9a54'],
  silver: ['#5ced00', '#4caf50', '#43a047'],
  gold: ['#4caf50', '#43a047', '#388e3c', '#2e7d32'],
  emerald: ['#3dff88', '#2ecc71', '#27ae60', '#16a085', '#1abc9c', '#20c997'],
  sapphire: [
    '#00cccc',
    '#00e6e6',
    '#00d9ff',
    '#00c3ff',
    '#00b0ff',
    '#009fff',
    '#1e90ff',
    '#4db8ff',
  ],
  jackpot: [
    '#0066ff',
    '#0080ff',
    '#0099ff',
    '#00b3ff',
    '#1e90ff',
    '#4169e1',
    '#5a7fff',
    '#00bfff',
  ],
};

export function getTierPalette(tier: TierLevel): string[] {
  // Return a copy so callers cannot mutate our tables.
  return [...(TIER_PALETTE[tier] ?? [])];
}

/* --------------------------------------------------------------------------
 * Controller singleton
 * ------------------------------------------------------------------------ */

export const SparkController = {
  /** Called by `<SparkPool />` once it mounts. Flushes any queued calls. */
  register(api: SparkPoolApi): void {
    registeredApi = api;
    flush();
  },

  /**
   * Explicit unregister — useful in tests to isolate module state. Not part
   * of the documented contract but safe to call; the pool itself doesn't
   * currently need it because mount/unmount is app-lifetime.
   */
  _unregister(): void {
    registeredApi = null;
  },

  burst(opts: BurstOptions): void {
    if (registeredApi) {
      registeredApi.fireBurst(opts);
      return;
    }
    enqueue({ kind: 'burst', opts });
  },

  arc(opts: ArcOptions): void {
    if (registeredApi) {
      registeredApi.fireArc(opts);
      return;
    }
    enqueue({ kind: 'arc', opts });
  },

  pulse(opts: PulseOptions): void {
    if (registeredApi) {
      registeredApi.firePulse(opts);
      return;
    }
    enqueue({ kind: 'pulse', opts });
  },

  reset(): void {
    // Always drop the queue — and if we have an API, forward the reset.
    queue = [];
    if (registeredApi) {
      registeredApi.reset();
    }
  },
};

/* --------------------------------------------------------------------------
 * Test-only escape hatch: inspect queue length.
 *
 * Exported so tests can assert "queued N, capped at 16" without poking at
 * module internals via a tangled mock. NOT part of the production surface.
 * ------------------------------------------------------------------------ */

export function __getQueueSizeForTests(): number {
  return queue.length;
}

export function __resetForTests(): void {
  registeredApi = null;
  queue = [];
}
