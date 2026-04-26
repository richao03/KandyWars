/**
 * Singleton controller for screen-wide celebration FX:
 *   - shake:        decaying X/Y shake of the wrapped screen content
 *   - edgeLights:   pulsating colored bands on the four screen edges
 *
 * Mirrors the `SparkController` pattern: a JS singleton that queues calls
 * before any consumer mounts, then proxies to a registered API once the
 * consumer (`<ScreenFX />`) registers itself.
 */

export type EdgeLightsTier = 'none' | 'tier-10k' | 'tier-15k' | 'tier-20k';

export interface ScreenShakeOptions {
  /** Peak displacement in px. */
  intensity: number;
  /** Number of cycles. Each cycle is ~80ms. */
  cycles: number;
  /** Total shake duration (ms). */
  duration: number;
}

export interface ScreenFXApi {
  fireShake: (opts: ScreenShakeOptions) => void;
  setEdgeLights: (tier: EdgeLightsTier, durationMs?: number) => void;
  reset: () => void;
}

type QueueItem = (api: ScreenFXApi) => void;

const QUEUE_CAP = 16;
let registeredApi: ScreenFXApi | null = null;
let queue: QueueItem[] = [];

const enqueue = (item: QueueItem) => {
  if (queue.length >= QUEUE_CAP) queue.shift();
  queue.push(item);
};

const flush = () => {
  if (!registeredApi) return;
  while (queue.length > 0) {
    const item = queue.shift()!;
    item(registeredApi);
  }
};

export const ScreenFXController = {
  register(api: ScreenFXApi): void {
    registeredApi = api;
    flush();
  },
  _unregister(): void {
    registeredApi = null;
  },
  shake(opts: ScreenShakeOptions): void {
    if (registeredApi) {
      registeredApi.fireShake(opts);
      return;
    }
    enqueue((api) => api.fireShake(opts));
  },
  edgeLights(tier: EdgeLightsTier, durationMs: number = 1800): void {
    if (registeredApi) {
      registeredApi.setEdgeLights(tier, durationMs);
      return;
    }
    enqueue((api) => api.setEdgeLights(tier, durationMs));
  },
  reset(): void {
    queue = [];
    if (registeredApi) registeredApi.reset();
  },
};
