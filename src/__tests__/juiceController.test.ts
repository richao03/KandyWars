/**
 * Tests for JuiceController singleton + nextPoolIndex helper.
 *
 * JuiceController is React-free so these are pure function tests with no
 * rendering needed. Between tests we call `_resetForTests()` to wipe the
 * singleton state (api registration + queued calls).
 */

import {
  JuiceController,
  MAX_QUEUE_SIZE,
  enqueueCall,
  nextPoolIndex,
} from '../utils/juiceController';

function makeApi() {
  return {
    fireFlash: jest.fn(),
    fireVignette: jest.fn(),
    firePopup: jest.fn(),
    fireReset: jest.fn(),
  };
}

beforeEach(() => {
  JuiceController._resetForTests();
});

describe('nextPoolIndex', () => {
  it('wraps around at pool size boundary', () => {
    expect(nextPoolIndex(0, 8)).toBe(1);
    expect(nextPoolIndex(6, 8)).toBe(7);
    expect(nextPoolIndex(7, 8)).toBe(0);
  });

  it('handles pool of 1 (always returns 0)', () => {
    expect(nextPoolIndex(0, 1)).toBe(0);
  });

  it('handles pool size of 0 safely', () => {
    expect(nextPoolIndex(0, 0)).toBe(0);
    expect(nextPoolIndex(5, 0)).toBe(0);
  });
});

describe('enqueueCall overflow behavior', () => {
  it('drops the OLDEST call when queue exceeds max', () => {
    const q: Parameters<typeof enqueueCall>[0] = [];
    for (let i = 0; i < 5; i++) {
      enqueueCall(q, { kind: 'flash', opts: { color: `#${i}${i}${i}${i}${i}${i}` } }, 3);
    }
    expect(q.length).toBe(3);
    // Oldest three dropped; remaining are calls 2,3,4
    expect((q[0] as { opts: { color: string } }).opts.color).toBe('#222222');
    expect((q[2] as { opts: { color: string } }).opts.color).toBe('#444444');
  });
});

describe('JuiceController — pre-register queueing', () => {
  it('queues flash/vignette/popup calls up to MAX_QUEUE_SIZE', () => {
    for (let i = 0; i < MAX_QUEUE_SIZE; i++) {
      JuiceController.flash({ color: '#FF0000' });
    }
    expect(JuiceController._getQueueLength()).toBe(MAX_QUEUE_SIZE);
  });

  it('caps queue at MAX_QUEUE_SIZE (drops oldest)', () => {
    for (let i = 0; i < MAX_QUEUE_SIZE + 5; i++) {
      JuiceController.flash({ color: '#FF0000' });
    }
    expect(JuiceController._getQueueLength()).toBe(MAX_QUEUE_SIZE);
  });

  it('dispatches all queued calls to the api on register, in order', () => {
    JuiceController.flash({ color: '#FF0000' });
    JuiceController.vignette({ color: '#00FF00' });
    JuiceController.popup('+$10', { x: 100, y: 200 }, { color: '#FFD700' });

    const api = makeApi();
    JuiceController.register(api);

    expect(api.fireFlash).toHaveBeenCalledTimes(1);
    expect(api.fireFlash).toHaveBeenCalledWith({ color: '#FF0000' });
    expect(api.fireVignette).toHaveBeenCalledTimes(1);
    expect(api.fireVignette).toHaveBeenCalledWith({ color: '#00FF00' });
    expect(api.firePopup).toHaveBeenCalledTimes(1);
    expect(api.firePopup).toHaveBeenCalledWith('+$10', { x: 100, y: 200 }, { color: '#FFD700' });

    // Queue is empty after flush
    expect(JuiceController._getQueueLength()).toBe(0);
  });

  it('preserves call order when flushing mixed kinds', () => {
    const callLog: string[] = [];
    JuiceController.flash({ color: '#A' });
    JuiceController.popup('first', { x: 0, y: 0 });
    JuiceController.vignette({ color: '#B' });
    JuiceController.flash({ color: '#C' });

    const api = {
      fireFlash: jest.fn((opts) => callLog.push(`flash:${opts.color}`)),
      fireVignette: jest.fn((opts) => callLog.push(`vignette:${opts.color}`)),
      firePopup: jest.fn((text) => callLog.push(`popup:${text}`)),
    };
    JuiceController.register(api);

    expect(callLog).toEqual(['flash:#A', 'popup:first', 'vignette:#B', 'flash:#C']);
  });
});

describe('JuiceController — post-register passthrough', () => {
  it('calls made after register pass through immediately', () => {
    const api = makeApi();
    JuiceController.register(api);

    JuiceController.flash({ color: '#FF0000' });
    JuiceController.vignette({ color: '#00FF00', intensity: 0.8 });
    JuiceController.popup('+$5', { x: 50, y: 60 });

    expect(api.fireFlash).toHaveBeenCalledWith({ color: '#FF0000' });
    expect(api.fireVignette).toHaveBeenCalledWith({ color: '#00FF00', intensity: 0.8 });
    expect(api.firePopup).toHaveBeenCalledWith('+$5', { x: 50, y: 60 }, undefined);
    expect(JuiceController._getQueueLength()).toBe(0);
  });
});

describe('JuiceController — re-registration', () => {
  it('replaces the registered API idempotently', () => {
    const api1 = makeApi();
    const api2 = makeApi();

    JuiceController.register(api1);
    JuiceController.flash({ color: '#AAA' });
    expect(api1.fireFlash).toHaveBeenCalledTimes(1);

    JuiceController.register(api2);
    JuiceController.flash({ color: '#BBB' });
    expect(api2.fireFlash).toHaveBeenCalledTimes(1);
    // api1 not called after re-register
    expect(api1.fireFlash).toHaveBeenCalledTimes(1);
  });

  it('flushes any pending queue to the new api on re-register', () => {
    // Register then unregister to build a pending queue
    const api1 = makeApi();
    JuiceController.register(api1);
    JuiceController.unregister();

    JuiceController.flash({ color: '#777' });
    expect(JuiceController._getQueueLength()).toBe(1);

    const api2 = makeApi();
    JuiceController.register(api2);
    expect(api2.fireFlash).toHaveBeenCalledWith({ color: '#777' });
  });
});

describe('JuiceController.reset()', () => {
  it('clears the queue when no api is registered', () => {
    JuiceController.flash({ color: '#F' });
    JuiceController.popup('x', { x: 0, y: 0 });
    expect(JuiceController._getQueueLength()).toBe(2);

    JuiceController.reset();
    expect(JuiceController._getQueueLength()).toBe(0);
  });

  it('forwards to api.fireReset when exposed', () => {
    const api = makeApi();
    JuiceController.register(api);
    JuiceController.reset();
    expect(api.fireReset).toHaveBeenCalledTimes(1);
  });

  it('is safe when api has no fireReset', () => {
    const apiNoReset = {
      fireFlash: jest.fn(),
      fireVignette: jest.fn(),
      firePopup: jest.fn(),
    };
    JuiceController.register(apiNoReset);
    expect(() => JuiceController.reset()).not.toThrow();
  });

  it('clears pending queue even if api is registered (queue already flushed)', () => {
    JuiceController.flash({ color: '#F' });
    const api = makeApi();
    JuiceController.register(api); // flushes
    JuiceController.flash({ color: '#G' });
    expect(JuiceController._getQueueLength()).toBe(0);

    JuiceController.reset();
    expect(JuiceController._getQueueLength()).toBe(0);
    expect(api.fireReset).toHaveBeenCalledTimes(1);
  });
});

describe('JuiceController.unregister()', () => {
  it('future calls queue again after unregister', () => {
    const api = makeApi();
    JuiceController.register(api);
    JuiceController.unregister();

    JuiceController.flash({ color: '#ABC' });
    expect(api.fireFlash).not.toHaveBeenCalled();
    expect(JuiceController._getQueueLength()).toBe(1);
  });
});
