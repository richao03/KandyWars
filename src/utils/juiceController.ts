/**
 * JuiceController — imperative singleton for screen-wide juice effects.
 *
 * Mirrors the SoundEffects / MusicController pattern: a plain object with
 * imperative methods. React-free, so any module (hooks, slices, handlers)
 * can trigger visual feedback without prop drilling.
 *
 * The actual rendering lives in `app/components/JuiceLayer.tsx`. On mount
 * the layer calls `register({ fireFlash, fireVignette, firePopup })` which
 * wires the controller to the animated overlay. Before registration, any
 * calls are queued up to 16 deep and flushed on register.
 *
 * Overflow policy: when the queue is full, the OLDEST pending call is
 * dropped to make room for the newest. The rationale is that juice is
 * ephemeral feedback — stale effects that never got to render are less
 * useful than the most recent user-driven feedback.
 */

export interface PopupOptions {
  /** Hex color, e.g. '#FFFFFF'. Default is decided by the layer (white/gold). */
  color?: string;
  /** Base scale. Default 1.0. */
  scale?: number;
  /** Lifetime in ms. Default 600. */
  duration?: number;
}

export interface FlashOptions {
  /** Hex color, required. */
  color: string;
  /** Peak opacity 0..1. Default 0.5. */
  maxOpacity?: number;
  /** Total duration in ms (fade-in 120, fade-out remainder). Default 400. */
  duration?: number;
}

export interface VignetteOptions {
  /** Hex color, required. */
  color: string;
  /** Peak intensity 0..1. Default 0.6. */
  intensity?: number;
  /** Total duration in ms. Default 500. */
  duration?: number;
}

export interface PopupOrigin {
  x: number;
  y: number;
}

export interface JuiceLayerApi {
  fireFlash: (opts: FlashOptions) => void;
  fireVignette: (opts: VignetteOptions) => void;
  firePopup: (text: string, origin: PopupOrigin, opts?: PopupOptions) => void;
  /** Optional — if provided, reset() forwards to it. */
  fireReset?: () => void;
}

type QueuedCall =
  | { kind: 'flash'; opts: FlashOptions }
  | { kind: 'vignette'; opts: VignetteOptions }
  | { kind: 'popup'; text: string; origin: PopupOrigin; opts?: PopupOptions };

export const MAX_QUEUE_SIZE = 16;

// Module-level singleton state
let registeredApi: JuiceLayerApi | null = null;
let queue: QueuedCall[] = [];

/** Push with FIFO overflow (drop oldest when full). Exported for tests. */
export function enqueueCall(q: QueuedCall[], call: QueuedCall, max = MAX_QUEUE_SIZE): QueuedCall[] {
  q.push(call);
  if (q.length > max) {
    q.shift();
  }
  return q;
}

/** Round-robin helper for the popup pool in JuiceLayer. */
export function nextPoolIndex(currentIndex: number, poolSize: number): number {
  if (poolSize <= 0) return 0;
  return (currentIndex + 1) % poolSize;
}

function flushQueue(api: JuiceLayerApi): void {
  const pending = queue;
  queue = [];
  for (const call of pending) {
    try {
      if (call.kind === 'flash') api.fireFlash(call.opts);
      else if (call.kind === 'vignette') api.fireVignette(call.opts);
      else if (call.kind === 'popup') api.firePopup(call.text, call.origin, call.opts);
    } catch (err) {
      // Swallow: a single bad queued call must not break the flush.
      if (__DEV__) console.error('[JuiceController] flush error:', err);
    }
  }
}

export const JuiceController = {
  /**
   * Register the live rendering API. Called once by `<JuiceLayer />` on mount.
   * If called again (e.g. layer re-mount after a route swap), the new API
   * replaces the old one. Any queued calls are flushed to the new API.
   */
  register(api: JuiceLayerApi): void {
    registeredApi = api;
    if (queue.length > 0) {
      flushQueue(api);
    }
  },

  /**
   * Unregister the current API (called on layer unmount). Future calls will
   * queue again until a new layer registers.
   */
  unregister(): void {
    registeredApi = null;
  },

  popup(text: string, origin: PopupOrigin, opts?: PopupOptions): void {
    if (registeredApi) {
      registeredApi.firePopup(text, origin, opts);
    } else {
      enqueueCall(queue, { kind: 'popup', text, origin, opts });
    }
  },

  flash(opts: FlashOptions): void {
    if (registeredApi) {
      registeredApi.fireFlash(opts);
    } else {
      enqueueCall(queue, { kind: 'flash', opts });
    }
  },

  vignette(opts: VignetteOptions): void {
    if (registeredApi) {
      registeredApi.fireVignette(opts);
    } else {
      enqueueCall(queue, { kind: 'vignette', opts });
    }
  },

  /**
   * Stop all in-flight effects and clear any pending queue.
   * Forwards to `fireReset` if the registered API exposes it.
   */
  reset(): void {
    queue = [];
    if (registeredApi && registeredApi.fireReset) {
      try {
        registeredApi.fireReset();
      } catch (err) {
        if (__DEV__) console.error('[JuiceController] reset error:', err);
      }
    }
  },

  // ---- test helpers ----
  /** @internal Inspect current queue length (tests only). */
  _getQueueLength(): number {
    return queue.length;
  },
  /** @internal Clear singleton state between tests. */
  _resetForTests(): void {
    registeredApi = null;
    queue = [];
  },
};
