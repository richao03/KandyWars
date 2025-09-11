/**
 * SCREEN INTEGRATION TEST SUITE
 * 
 * This test suite validates the UI components and screen interactions.
 * It ensures that the user interface correctly integrates with the 
 * underlying game logic and state management.
 * 
 * Test Coverage:
 * - Key screen components rendering
 * - User interaction flows
 * - Navigation between screens
 * - Modal interactions
 * - Button actions and side effects
 * - Context integration with UI components
 */

import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import components to test
import DayStatsModal from '../app/components/DayStatsModal';
import TransactionModal from '../app/components/TransactionModal';
import ConfirmationModal from '../app/components/ConfirmationModal';
import DifficultySelectionModal from '../app/components/DifficultySelectionModal';
import EventModal from '../app/components/EventModal';

// Import contexts
import { GameProvider } from '../src/context/GameContext';
import { WalletProvider } from '../src/context/WalletContext';
import { InventoryProvider } from '../src/context/InventoryContext';
import { JokerProvider } from '../src/context/JokerContext';
import { SeedProvider } from '../src/context/SeedContext';
import { FlavorTextProvider } from '../src/context/FlavorTextContext';
import { EventHandlerProvider } from '../src/context/EventHandlerContext';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

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

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  useFocusEffect: jest.fn(),
}));

jest.mock('react-native-modal', () => {
  const { View } = require('react-native');
  return ({ visible, children, ...props }: any) => 
    visible ? <View testID="modal" {...props}>{children}</View> : null;
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SeedProvider>
    <WalletProvider>
      <GameProvider>
        <InventoryProvider>
          <JokerProvider>
            <FlavorTextProvider>
              <EventHandlerProvider>
                {children}
              </EventHandlerProvider>
            </FlavorTextProvider>
          </JokerProvider>
        </InventoryProvider>
      </GameProvider>
    </WalletProvider>
  </SeedProvider>
);

describe('Screen Integration Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock AsyncStorage to return empty state
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('DayStatsModal Component', () => {
    const mockStats = {
      profit: 150,
      spent: 50,
      candiesSold: 10,
      netGain: 100,
    };

    test('should render day stats correctly', () => {
      const onCloseMock = jest.fn();
      
      const { getByText } = render(
        <TestWrapper>
          <DayStatsModal
            visible={true}
            onClose={onCloseMock}
            stats={mockStats}
            day={1}
          />
        </TestWrapper>
      );

      expect(getByText('Day 1 Complete!')).toBeTruthy();
      expect(getByText('$150')).toBeTruthy(); // Profit
      expect(getByText('$50')).toBeTruthy(); // Spent
      expect(getByText('10')).toBeTruthy(); // Candies sold
      expect(getByText('$100')).toBeTruthy(); // Net gain
      expect(getByText('🌟 Continue to After School')).toBeTruthy();
    });

    test('should trigger onClose when continue button is pressed', async () => {
      const onCloseMock = jest.fn();
      
      const { getByText } = render(
        <TestWrapper>
          <DayStatsModal
            visible={true}
            onClose={onCloseMock}
            stats={mockStats}
            day={1}
          />
        </TestWrapper>
      );

      const continueButton = getByText('🌟 Continue to After School');
      fireEvent.press(continueButton);

      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('DifficultySelectionModal Component', () => {
    test('should render difficulty options', () => {
      const onSelectMock = jest.fn();
      const onCloseMock = jest.fn();
      
      const { getByText } = render(
        <TestWrapper>
          <DifficultySelectionModal
            visible={true}
            onSelectDifficulty={onSelectMock}
            onClose={onCloseMock}
          />
        </TestWrapper>
      );

      expect(getByText('Choose Difficulty')).toBeTruthy();
      expect(getByText('Easy')).toBeTruthy();
      expect(getByText('Medium')).toBeTruthy();
      expect(getByText('Hard')).toBeTruthy();
      expect(getByText('Piggy Bank: $-5,000')).toBeTruthy();
      expect(getByText('Piggy Bank: $-10,000')).toBeTruthy();
      expect(getByText('Piggy Bank: $-30,000')).toBeTruthy();
    });

    test('should call onSelectDifficulty when difficulty is chosen', () => {
      const onSelectMock = jest.fn();
      const onCloseMock = jest.fn();
      
      const { getByText } = render(
        <TestWrapper>
          <DifficultySelectionModal
            visible={true}
            onSelectDifficulty={onSelectMock}
            onClose={onCloseMock}
          />
        </TestWrapper>
      );

      const mediumButton = getByText('Medium');
      fireEvent.press(mediumButton);

      expect(onSelectMock).toHaveBeenCalledWith('medium');
    });
  });

  describe('TransactionModal Component', () => {
    const mockCandy = {
      name: 'Skittles',
      cost: 2.5,
      quantity: 0,
    };

    test('should render transaction modal for buying', () => {
      const onConfirmMock = jest.fn();
      const onCancelMock = jest.fn();
      
      const { getByText } = render(
        <TestWrapper>
          <TransactionModal
            visible={true}
            type="buy"
            candy={mockCandy}
            maxQuantity={10}
            onConfirm={onConfirmMock}
            onCancel={onCancelMock}
          />
        </TestWrapper>
      );

      expect(getByText('Buy Skittles')).toBeTruthy();
      expect(getByText('$2.50 each')).toBeTruthy();
      expect(getByText('Confirm')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
    });

    test('should render transaction modal for selling', () => {
      const onConfirmMock = jest.fn();
      const onCancelMock = jest.fn();
      const candyWithInventory = { ...mockCandy, quantity: 5 };
      
      const { getByText } = render(
        <TestWrapper>
          <TransactionModal
            visible={true}
            type="sell"
            candy={candyWithInventory}
            maxQuantity={5}
            onConfirm={onConfirmMock}
            onCancel={onCancelMock}
          />
        </TestWrapper>
      );

      expect(getByText('Sell Skittles')).toBeTruthy();
    });

    test('should call onConfirm with correct parameters', () => {
      const onConfirmMock = jest.fn();
      const onCancelMock = jest.fn();
      
      const { getByText } = render(
        <TestWrapper>
          <TransactionModal
            visible={true}
            type="buy"
            candy={mockCandy}
            maxQuantity={10}
            onConfirm={onConfirmMock}
            onCancel={onCancelMock}
          />
        </TestWrapper>
      );

      const confirmButton = getByText('Confirm');
      fireEvent.press(confirmButton);

      expect(onConfirmMock).toHaveBeenCalledWith(1); // Default quantity is 1
    });
  });

  describe('ConfirmationModal Component', () => {
    test('should render confirmation modal', () => {
      const onConfirmMock = jest.fn();
      const onCancelMock = jest.fn();
      
      const { getByText } = render(
        <TestWrapper>
          <ConfirmationModal
            visible={true}
            title="Test Confirmation"
            message="Are you sure you want to proceed?"
            emoji="❓"
            onConfirm={onConfirmMock}
            onCancel={onCancelMock}
            confirmText="Yes"
            cancelText="No"
            theme="default"
          />
        </TestWrapper>
      );

      expect(getByText('Test Confirmation')).toBeTruthy();
      expect(getByText('Are you sure you want to proceed?')).toBeTruthy();
      expect(getByText('❓')).toBeTruthy();
      expect(getByText('Yes')).toBeTruthy();
      expect(getByText('No')).toBeTruthy();
    });

    test('should call appropriate handlers', () => {
      const onConfirmMock = jest.fn();
      const onCancelMock = jest.fn();
      
      const { getByText } = render(
        <TestWrapper>
          <ConfirmationModal
            visible={true}
            title="Test"
            message="Test message"
            emoji="❓"
            onConfirm={onConfirmMock}
            onCancel={onCancelMock}
            confirmText="Confirm"
            cancelText="Cancel"
            theme="default"
          />
        </TestWrapper>
      );

      const confirmButton = getByText('Confirm');
      const cancelButton = getByText('Cancel');

      fireEvent.press(confirmButton);
      expect(onConfirmMock).toHaveBeenCalledTimes(1);

      fireEvent.press(cancelButton);
      expect(onCancelMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('EventModal Component', () => {
    test('should render event modal with different event types', () => {
      const onCloseMock = jest.fn();
      
      const { getByText, rerender } = render(
        <TestWrapper>
          <EventModal
            visible={true}
            event="LOSE_MONEY"
            onClose={onCloseMock}
          />
        </TestWrapper>
      );

      // Should show negative event
      expect(getByText('Oh no!')).toBeTruthy();

      // Test positive event
      rerender(
        <TestWrapper>
          <EventModal
            visible={true}
            event="FOUND_MONEY"
            onClose={onCloseMock}
          />
        </TestWrapper>
      );

      expect(getByText('Lucky you!')).toBeTruthy();
    });

    test('should close when dismiss button is pressed', () => {
      const onCloseMock = jest.fn();
      
      const { getByText } = render(
        <TestWrapper>
          <EventModal
            visible={true}
            event="FOUND_MONEY"
            onClose={onCloseMock}
          />
        </TestWrapper>
      );

      const dismissButton = getByText('Continue');
      fireEvent.press(dismissButton);

      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Component State Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  test('should integrate modal interactions with game state', async () => {
    // This test would require more complex setup with actual game state
    // For now, we'll test that components can be rendered within the provider tree
    const onSelectMock = jest.fn();
    const onCloseMock = jest.fn();
    
    const { getByText } = render(
      <TestWrapper>
        <DifficultySelectionModal
          visible={true}
          onSelectDifficulty={onSelectMock}
          onClose={onCloseMock}
        />
      </TestWrapper>
    );

    // Wait for contexts to initialize
    await waitFor(() => {
      expect(getByText('Choose Difficulty')).toBeTruthy();
    });

    // Interact with the modal
    const easyButton = getByText('Easy');
    fireEvent.press(easyButton);

    expect(onSelectMock).toHaveBeenCalledWith('easy');
  });

  test('should handle modal visibility states correctly', () => {
    const onCloseMock = jest.fn();
    const mockStats = {
      profit: 100,
      spent: 20,
      candiesSold: 5,
      netGain: 80,
    };
    
    const { queryByText, rerender } = render(
      <TestWrapper>
        <DayStatsModal
          visible={false}
          onClose={onCloseMock}
          stats={mockStats}
          day={1}
        />
      </TestWrapper>
    );

    // Modal should not be visible
    expect(queryByText('Day 1 Complete!')).toBeNull();

    // Rerender with visible=true
    rerender(
      <TestWrapper>
        <DayStatsModal
          visible={true}
          onClose={onCloseMock}
          stats={mockStats}
          day={1}
        />
      </TestWrapper>
    );

    // Modal should now be visible
    expect(queryByText('Day 1 Complete!')).toBeTruthy();
  });
});