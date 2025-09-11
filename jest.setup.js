/**
 * Jest Setup File
 * 
 * This file runs before all tests and sets up the testing environment
 * with enhanced matchers, mocks, and global configurations.
 */

// Import jest-extended for additional matchers (CommonJS format)
require('jest-extended');

// Global test timeout (can be overridden per test)
jest.setTimeout(15000);

// Mock AsyncStorage globally
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock Expo Haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Mock Expo Router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    navigate: jest.fn(),
    dismiss: jest.fn(),
    dismissAll: jest.fn(),
  },
  useFocusEffect: jest.fn((callback) => {
    // Call the callback immediately in tests
    callback();
  }),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  useGlobalSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => []),
  usePathname: jest.fn(() => '/'),
  Redirect: ({ href }) => null,
  Link: ({ children, href, ...props }) => children,
}));

// Mock React Native Modal
jest.mock('react-native-modal', () => {
  const React = require('react');
  const { View } = require('react-native');
  
  return ({ visible, children, testID = 'modal', ...props }) => {
    if (!visible) return null;
    return React.createElement(View, { testID, ...props }, children);
  };
});

// Mock React Native components that might cause issues
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  
  return {
    ...RN,
    // Mock ImageBackground to avoid image loading issues
    ImageBackground: ({ children, testID = 'image-background', ...props }) => {
      const React = require('react');
      return React.createElement(RN.View, { testID, ...props }, children);
    },
    // Mock Animated components
    Animated: {
      ...RN.Animated,
      timing: jest.fn(() => ({
        start: jest.fn((callback) => callback && callback()),
      })),
      Value: jest.fn(() => ({
        setValue: jest.fn(),
        addListener: jest.fn(),
        removeAllListeners: jest.fn(),
      })),
    },
    // Mock Dimensions for consistent testing
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })), // iPhone X dimensions
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
  };
});

// Mock specific React Native community packages
jest.mock('@react-native-community/slider', () => {
  const React = require('react');
  const { View } = require('react-native');
  
  return ({ onValueChange, value, testID = 'slider', ...props }) => {
    return React.createElement(View, { 
      testID,
      onTouchEnd: () => onValueChange && onValueChange(value || 0),
      ...props 
    });
  };
});

// Mock SVG components (if using react-native-svg)
jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Path: 'Path',
  G: 'G',
  Circle: 'Circle',
  Rect: 'Rect',
  Line: 'Line',
  Text: 'Text',
}));

// Enhanced console logging for tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Filter out known React Native testing warnings
console.error = (...args) => {
  const message = args[0];
  
  // Ignore common React Native testing warnings
  if (typeof message === 'string') {
    if (message.includes('Warning: ReactDOM.render is no longer supported') ||
        message.includes('Warning: An invalid form control') ||
        message.includes('Warning: componentWillReceiveProps') ||
        message.includes('Warning: componentWillMount')) {
      return;
    }
  }
  
  originalConsoleError.apply(console, args);
};

console.warn = (...args) => {
  const message = args[0];
  
  // Ignore common React Native testing warnings
  if (typeof message === 'string') {
    if (message.includes('Warning: React.createFactory() is deprecated') ||
        message.includes('Warning: Legacy context API')) {
      return;
    }
  }
  
  originalConsoleWarn.apply(console, args);
};

// Global test utilities
global.testUtils = {
  // Helper to create mock functions with better tracking
  createMockFunction: (name) => {
    const mockFn = jest.fn();
    mockFn.mockName(name);
    return mockFn;
  },
  
  // Helper to wait for async operations
  waitFor: async (callback, { timeout = 5000, interval = 50 } = {}) => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        await callback();
        return;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    
    throw new Error(`waitFor timed out after ${timeout}ms`);
  },
  
  // Helper to mock timers consistently
  mockTimers: () => {
    jest.useFakeTimers();
    return {
      advance: (ms) => jest.advanceTimersByTime(ms),
      restore: () => jest.useRealTimers(),
    };
  },
  
  // Helper to create consistent test data
  createTestGameState: () => ({
    day: 1,
    period: 1,
    periodCount: 0,
    currentLocation: 'home room',
    isAfterSchool: false,
    hasStudiedTonight: false,
  }),
  
  createTestWalletState: () => ({
    balance: 20,
    stashedAmount: 0,
    difficulty: null,
  }),
  
  createTestCandy: (overrides = {}) => ({
    name: 'Test Candy',
    quantity: 5,
    avgCost: 2.5,
    ...overrides,
  }),
  
  createTestJoker: (overrides = {}) => ({
    id: 1,
    name: 'Test Joker',
    description: 'A test joker',
    rarity: 'common',
    category: 'math',
    minigame: 'math',
    ...overrides,
  }),
};

// Custom matchers for game-specific assertions
expect.extend({
  // Check if a value is a valid game period (1-8)
  toBeValidPeriod(received) {
    const pass = typeof received === 'number' && 
                  Number.isInteger(received) && 
                  received >= 1 && 
                  received <= 8;
                  
    return {
      message: () => `expected ${received} to be a valid period (1-8)`,
      pass,
    };
  },
  
  // Check if a value is a valid day (>= 1)
  toBeValidDay(received) {
    const pass = typeof received === 'number' && 
                  Number.isInteger(received) && 
                  received >= 1;
                  
    return {
      message: () => `expected ${received} to be a valid day (>= 1)`,
      pass,
    };
  },
  
  // Check if a money amount is properly formatted (2 decimal places max)
  toBeValidMoneyAmount(received) {
    const pass = typeof received === 'number' && 
                  !isNaN(received) && 
                  isFinite(received) &&
                  Math.round(received * 100) === received * 100;
                  
    return {
      message: () => `expected ${received} to be a valid money amount`,
      pass,
    };
  },
  
  // Check if an array contains valid candies
  toContainValidCandies(received) {
    if (!Array.isArray(received)) {
      return {
        message: () => `expected ${received} to be an array`,
        pass: false,
      };
    }
    
    const pass = received.every(candy => 
      candy && 
      typeof candy.name === 'string' &&
      typeof candy.quantity === 'number' &&
      typeof candy.avgCost === 'number' &&
      candy.quantity >= 0 &&
      candy.avgCost >= 0
    );
    
    return {
      message: () => `expected array to contain valid candy objects`,
      pass,
    };
  },
  
  // Check if difficulty is valid
  toBeValidDifficulty(received) {
    const validDifficulties = ['easy', 'medium', 'hard', null];
    const pass = validDifficulties.includes(received);
    
    return {
      message: () => `expected ${received} to be a valid difficulty (easy, medium, hard, or null)`,
      pass,
    };
  },
});

// Setup before each test
beforeEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset console overrides
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Setup after each test
afterEach(() => {
  // Clean up any timers
  jest.clearAllTimers();
  jest.useRealTimers();
});

// Global error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Performance monitoring for slow tests
const originalTest = global.test;
global.test = (name, fn, timeout) => {
  return originalTest(name, async () => {
    const start = Date.now();
    await fn();
    const duration = Date.now() - start;
    
    if (duration > 2000) {
      console.warn(`⚠️  Slow test detected: "${name}" took ${duration}ms`);
    }
  }, timeout);
};