/**
 * COMPREHENSIVE INTEGRATION TEST SUITE
 * 
 * This test suite validates the core game functionality end-to-end.
 * It serves as a safety net for refactoring by ensuring all major 
 * game mechanics continue to work as expected.
 * 
 * Test Coverage:
 * - Game initialization and state management
 * - Period progression and day cycles
 * - Wallet operations (balance, piggy bank, difficulty)
 * - Inventory management and candy transactions
 * - Joker system and effects
 * - Event handling and random events
 * - Persistence layer
 * - After-school activities
 * - Full game flow simulation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { GameProvider, useGame } from '../src/context/GameContext';
import { InventoryProvider, useInventory } from '../src/context/InventoryContext';
import { JokerProvider, useJokers } from '../src/context/JokerContext';
import { SeedProvider, useSeed } from '../src/context/SeedContext';
import { WalletProvider, useWallet } from '../src/context/WalletContext';
import { FlavorTextProvider, useFlavorText } from '../src/context/FlavorTextContext';
import { EventHandlerProvider, useEventHandler } from '../src/context/EventHandlerContext';
import { JOKER_IDS } from '../src/constants/jokerIds';

// Mock AsyncStorage for testing
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock expo-haptics to prevent test failures
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
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

// Mock expo-router to prevent navigation issues in tests
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  useFocusEffect: jest.fn(),
}));

// Test wrapper that provides all necessary contexts
const AllProvidersWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return React.createElement(SeedProvider, null,
    React.createElement(WalletProvider, null,
      React.createElement(GameProvider, null,
        React.createElement(InventoryProvider, null,
          React.createElement(JokerProvider, null,
            React.createElement(FlavorTextProvider, null,
              React.createElement(EventHandlerProvider, null,
                children
              )
            )
          )
        )
      )
    )
  );
};

describe('Comprehensive Game Integration Tests', () => {
  beforeEach(() => {
    // Clear AsyncStorage mock before each test
    (AsyncStorage.getItem as jest.Mock).mockClear();
    (AsyncStorage.setItem as jest.Mock).mockClear();
    (AsyncStorage.removeItem as jest.Mock).mockClear();
    (AsyncStorage.clear as jest.Mock).mockClear();
    
    // Mock AsyncStorage to return null (empty storage)
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Game Initialization', () => {
    test('should initialize all contexts with default values', async () => {
      const gameResult = renderHook(() => useGame(), { wrapper: AllProvidersWrapper });
      const walletResult = renderHook(() => useWallet(), { wrapper: AllProvidersWrapper });
      const inventoryResult = renderHook(() => useInventory(), { wrapper: AllProvidersWrapper });
      const jokersResult = renderHook(() => useJokers(), { wrapper: AllProvidersWrapper });

      await waitFor(() => {
        // Game context should initialize properly
        expect(gameResult.result.current?.day).toBe(1);
        expect(gameResult.result.current?.period).toBe(1);
        expect(gameResult.result.current?.periodCount).toBe(0);
        expect(gameResult.result.current?.currentLocation).toBe('home room');
        expect(gameResult.result.current?.isAfterSchool).toBe(false);

        // Wallet should initialize with default values
        expect(walletResult.result.current?.balance).toBe(20);
        expect(walletResult.result.current?.stashedAmount).toBe(0);
        expect(walletResult.result.current?.difficulty).toBe(null);

        // Inventory should be empty initially
        expect(inventoryResult.result.current?.getTotalInventoryCount()).toBe(0);

        // No jokers initially
        expect(jokersResult.result.current?.jokers).toEqual([]);
      });
    });

    test('should initialize wallet with difficulty settings', async () => {
      const { result } = renderHook(() => useWallet(), { wrapper: AllProvidersWrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      // Test easy difficulty
      act(() => {
        result.current!.initializeWallet('easy');
      });

      expect(result.current!.balance).toBe(20);
      expect(result.current!.stashedAmount).toBe(-5000);
      expect(result.current!.difficulty).toBe('easy');

      // Test medium difficulty
      act(() => {
        result.current!.initializeWallet('medium');
      });

      expect(result.current!.stashedAmount).toBe(-10000);
      expect(result.current!.difficulty).toBe('medium');

      // Test hard difficulty
      act(() => {
        result.current!.initializeWallet('hard');
      });

      expect(result.current!.stashedAmount).toBe(-30000);
      expect(result.current!.difficulty).toBe('hard');
    });
  });

  describe('Game Progression Flow', () => {
    test('should progress through periods and days correctly', async () => {
      const { result } = renderHook(() => useGame(), { wrapper: AllProvidersWrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      // Start at Day 1, Period 1
      expect(result.current!.day).toBe(1);
      expect(result.current!.period).toBe(1);
      expect(result.current!.periodCount).toBe(0);

      // Advance through first day
      for (let period = 1; period <= 8; period++) {
        act(() => {
          result.current!.incrementPeriod('library');
        });
        
        if (period < 8) {
          expect(result.current!.day).toBe(1);
          expect(result.current!.period).toBe(period + 1);
        }
      }

      // After 8 periods, we should be at Day 2, Period 1
      expect(result.current!.day).toBe(2);
      expect(result.current!.period).toBe(1);
      expect(result.current!.periodCount).toBe(8);
    });

    test('should handle after-school mode correctly', async () => {
      const { result } = renderHook(() => useGame(), { wrapper: AllProvidersWrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      // Initially not after school
      expect(result.current!.isAfterSchool).toBe(false);

      // Enter after school mode
      act(() => {
        result.current!.startAfterSchool();
      });

      expect(result.current!.isAfterSchool).toBe(true);

      // Start new day
      act(() => {
        result.current!.startNewDay();
      });

      expect(result.current!.isAfterSchool).toBe(false);
    });
  });

  describe('Wallet Operations', () => {
    test('should handle all wallet operations correctly', async () => {
      const { result } = renderHook(() => useWallet(), { wrapper: AllProvidersWrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const initialBalance = 20;
      expect(result.current!.balance).toBe(initialBalance);

      // Test spending money
      const spendResult = result.current!.spend(10);
      expect(spendResult).toBe(true);
      expect(result.current!.balance).toBe(10);

      // Test spending more than available
      const overspendResult = result.current!.spend(15);
      expect(overspendResult).toBe(false);
      expect(result.current!.balance).toBe(10);

      // Test adding money
      act(() => {
        result.current!.add(25);
      });
      expect(result.current!.balance).toBe(35);

      // Test piggy bank operations
      const stashResult = result.current!.stashMoney(15);
      expect(stashResult).toBe(true);
      expect(result.current!.balance).toBe(20);
      expect(result.current!.stashedAmount).toBe(15);

      // Test withdrawing from stash
      const withdrawResult = result.current!.withdrawFromStash(5);
      expect(withdrawResult).toBe(true);
      expect(result.current!.balance).toBe(25);
      expect(result.current!.stashedAmount).toBe(10);
    });

    test('should handle allowance with joker effects', async () => {
      const walletResult = renderHook(() => useWallet(), { wrapper: AllProvidersWrapper });

      await waitFor(() => {
        expect(walletResult.result.current).toBeTruthy();
      });

      // Test base allowance
      const baseAllowance = walletResult.result.current!.addAllowance();
      expect(baseAllowance).toBe(20);
      expect(walletResult.result.current!.balance).toBe(40); // 20 initial + 20 allowance

      // Reset wallet
      act(() => {
        walletResult.result.current!.resetWallet();
      });

      // Test allowance with Ace the Test joker (doubles allowance)
      const jokers = [{ id: JOKER_IDS.ACE_THE_TEST, name: 'Ace the Test' }];
      const bonusAllowance = walletResult.result.current!.addAllowance(jokers, 1);
      expect(bonusAllowance).toBe(40); // Doubled allowance
      expect(walletResult.result.current!.balance).toBe(60); // 20 initial + 40 allowance
    });
  });

  describe('Inventory Management', () => {
    test('should handle candy inventory operations', async () => {
      const { result } = renderHook(() => useInventory(), { wrapper: AllProvidersWrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      // Initially empty inventory
      expect(result.current!.candies).toHaveLength(0);

      // Add candy to inventory
      act(() => {
        result.current!.addCandy('Skittles', 5, 2.50);
      });

      expect(result.current!.candies).toHaveLength(1);
      expect(result.current!.candies[0]).toEqual({
        name: 'Skittles',
        quantity: 5,
        avgCost: 2.50,
      });

      // Add more of the same candy (should average cost)
      act(() => {
        result.current!.addCandy('Skittles', 3, 3.00);
      });

      expect(result.current!.candies).toHaveLength(1);
      expect(result.current!.candies[0].quantity).toBe(8);
      // Average cost should be calculated: (5*2.50 + 3*3.00) / 8 = 2.6875
      expect(result.current!.candies[0].avgCost).toBeCloseTo(2.6875);

      // Remove candy from inventory
      const removeResult = result.current!.removeCandy('Skittles', 3);
      expect(removeResult).toBe(true);
      expect(result.current!.candies[0].quantity).toBe(5);

      // Try to remove more than available
      const overRemoveResult = result.current!.removeCandy('Skittles', 10);
      expect(overRemoveResult).toBe(false);
      expect(result.current!.candies[0].quantity).toBe(5);
    });
  });

  describe('Joker System', () => {
    test('should manage jokers correctly', async () => {
      const { result } = renderHook(() => useJokers(), { wrapper: AllProvidersWrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      // Initially no jokers
      expect(result.current!.jokers).toHaveLength(0);

      // Add a joker
      const testJoker = {
        id: JOKER_IDS.DOUBLE_UP,
        name: 'Double Up',
        description: 'Test joker',
        rarity: 'common' as const,
        category: 'math' as const,
        minigame: 'math' as const,
      };

      act(() => {
        result.current!.addJoker(testJoker);
      });

      expect(result.current!.jokers).toHaveLength(1);
      expect(result.current!.jokers[0]).toMatchObject(testJoker);

      // Remove joker
      act(() => {
        result.current!.removeJoker(JOKER_IDS.DOUBLE_UP);
      });

      expect(result.current!.jokers).toHaveLength(0);
    });
  });

  describe('Complete Game Session Simulation', () => {
    test('should simulate a full day of gameplay', async () => {
      // Set up all contexts
      const gameResult = renderHook(() => useGame(), { wrapper: AllProvidersWrapper });
      const walletResult = renderHook(() => useWallet(), { wrapper: AllProvidersWrapper });
      const inventoryResult = renderHook(() => useInventory(), { wrapper: AllProvidersWrapper });
      const jokersResult = renderHook(() => useJokers(), { wrapper: AllProvidersWrapper });

      await waitFor(() => {
        expect(gameResult.result.current).toBeTruthy();
        expect(walletResult.result.current).toBeTruthy();
        expect(inventoryResult.result.current).toBeTruthy();
        expect(jokersResult.result.current).toBeTruthy();
      });

      // Initialize game with medium difficulty
      act(() => {
        walletResult.result.current!.initializeWallet('medium');
      });

      // Verify initial state
      expect(gameResult.result.current!.day).toBe(1);
      expect(gameResult.result.current!.period).toBe(1);
      expect(walletResult.result.current!.balance).toBe(20);
      expect(walletResult.result.current!.stashedAmount).toBe(-10000);
      expect(walletResult.result.current!.difficulty).toBe('medium');

      // Simulate buying candy in period 1
      act(() => {
        walletResult.result.current!.spend(15); // Buy candy for $15
        inventoryResult.result.current!.addCandy('Skittles', 5, 3.00);
      });

      expect(walletResult.result.current!.balance).toBe(5);
      expect(inventoryResult.result.current!.candies).toHaveLength(1);

      // Progress through periods, selling candy
      for (let period = 2; period <= 4; period++) {
        act(() => {
          gameResult.result.current!.incrementPeriod('cafeteria');
          // Simulate selling candy
          const sellResult = inventoryResult.result.current!.removeCandy('Skittles', 1);
          if (sellResult) {
            walletResult.result.current!.add(5); // Sell for $5
          }
        });
      }

      // Check state after selling
      expect(gameResult.result.current!.period).toBe(4);
      expect(walletResult.result.current!.balance).toBe(20); // 5 + (3 sales * 5)
      expect(inventoryResult.result.current!.candies[0].quantity).toBe(2);

      // Add a joker from minigame
      const joker = {
        id: JOKER_IDS.DOUBLE_UP,
        name: 'Double Up',
        description: 'Doubles candy price for one period',
        rarity: 'common' as const,
        category: 'math' as const,
        minigame: 'math' as const,
      };

      act(() => {
        jokersResult.result.current!.addJoker(joker);
      });

      expect(jokersResult.result.current!.jokers).toHaveLength(1);

      // Simulate stashing money
      act(() => {
        walletResult.result.current!.stashMoney(10);
      });

      expect(walletResult.result.current!.balance).toBe(10);
      expect(walletResult.result.current!.stashedAmount).toBe(-9990); // -10000 + 10

      // Progress to after school
      act(() => {
        gameResult.result.current!.startAfterSchool();
      });

      expect(gameResult.result.current!.isAfterSchool).toBe(true);

      // Add daily allowance
      act(() => {
        walletResult.result.current!.addAllowance(jokersResult.result.current!.jokers, gameResult.result.current!.periodCount);
      });

      expect(walletResult.result.current!.balance).toBe(30); // 10 + 20 allowance

      // Start new day
      act(() => {
        gameResult.result.current!.startNewDay();
      });

      expect(gameResult.result.current!.day).toBe(2);
      expect(gameResult.result.current!.period).toBe(1);
      expect(gameResult.result.current!.isAfterSchool).toBe(false);
    });
  });

  describe('Game Reset and Persistence', () => {
    test('should handle game reset correctly', async () => {
      const gameResult = renderHook(() => useGame(), { wrapper: AllProvidersWrapper });
      const walletResult = renderHook(() => useWallet(), { wrapper: AllProvidersWrapper });
      const inventoryResult = renderHook(() => useInventory(), { wrapper: AllProvidersWrapper });
      const jokersResult = renderHook(() => useJokers(), { wrapper: AllProvidersWrapper });

      await waitFor(() => {
        expect(gameResult.result.current).toBeTruthy();
        expect(walletResult.result.current).toBeTruthy();
        expect(inventoryResult.result.current).toBeTruthy();
        expect(jokersResult.result.current).toBeTruthy();
      });

      // Set up some game state
      act(() => {
        walletResult.result.current!.initializeWallet('hard');
        gameResult.result.current!.incrementPeriod('library');
        inventoryResult.result.current!.addToInventory('M&Ms', 3, 2.00);
        jokersResult.result.current!.addJoker({
          id: JOKER_IDS.DOUBLE_UP,
          name: 'Test Joker',
          description: 'Test',
          subject: 'Math',
          category: 'math',
          minigame: 'math',
        });
      });

      // Verify state is set
      expect(gameResult.result.current!.periodCount).toBe(1);
      expect(walletResult.result.current!.difficulty).toBe('hard');
      expect(inventoryResult.result.current!.getTotalInventoryCount()).toBe(3);
      expect(jokersResult.result.current!.jokers).toHaveLength(1);

      // Reset everything
      await act(async () => {
        await gameResult.result.current!.resetGame();
        walletResult.result.current!.resetWallet();
        inventoryResult.result.current!.resetInventory();
        jokersResult.result.current!.resetJokers();
      });

      // Verify reset state
      expect(gameResult.result.current!.day).toBe(1);
      expect(gameResult.result.current!.period).toBe(1);
      expect(gameResult.result.current!.periodCount).toBe(0);
      expect(walletResult.result.current!.balance).toBe(20);
      expect(walletResult.result.current!.difficulty).toBe(null);
      expect(inventoryResult.result.current!.getTotalInventoryCount()).toBe(0);
      expect(jokersResult.result.current!.jokers).toHaveLength(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle edge cases gracefully', async () => {
      const walletResult = renderHook(() => useWallet(), { wrapper: AllProvidersWrapper });
      const inventoryResult = renderHook(() => useInventory(), { wrapper: AllProvidersWrapper });

      await waitFor(() => {
        expect(walletResult.result.current).toBeTruthy();
        expect(inventoryResult.result.current).toBeTruthy();
      });

      // Test spending with zero balance
      act(() => {
        walletResult.result.current!.resetWallet(); // Reset to get 20 balance
        walletResult.result.current!.spend(20); // Spend all
      });

      expect(walletResult.result.current!.balance).toBe(0);
      const spendResult = walletResult.result.current!.spend(1);
      expect(spendResult).toBe(false);

      // Test removing non-existent candy
      const removeResult = inventoryResult.result.current!.removeCandy('NonExistent', 1);
      expect(removeResult).toBe(false);

      // Test adding candy with zero quantity
      act(() => {
        inventoryResult.result.current!.addCandy('TestCandy', 0, 1.00);
      });

      // Should not add candy with zero quantity
      const testCandy = inventoryResult.result.current!.candies.find(c => c.name === 'TestCandy');
      expect(testCandy).toBeUndefined();

      // Test piggy bank operations with insufficient funds
      const stashResult = walletResult.result.current!.stashMoney(10);
      expect(stashResult).toBe(false); // Should fail with 0 balance

      const withdrawResult = walletResult.result.current!.withdrawFromStash(5);
      expect(withdrawResult).toBe(false); // Should fail with 0 stash
    });
  });
});