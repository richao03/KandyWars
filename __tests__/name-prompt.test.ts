/**
 * Test suite for name prompt functionality
 */

import { renderHook, act } from '@testing-library/react-native';
import { WalletProvider, useWallet } from '../src/context/WalletContext';
import { loadData, saveData } from '../src/utils/persistence';
import React from 'react';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
}));

// Mock persistence utilities
jest.mock('../src/utils/persistence', () => ({
  loadData: jest.fn(),
  saveData: jest.fn(),
  loadWallet: jest.fn(),
  saveWallet: jest.fn(),
}));

const mockLoadData = loadData as jest.MockedFunction<typeof loadData>;
const mockSaveData = saveData as jest.MockedFunction<typeof saveData>;

describe('Name Prompt Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadData.mockImplementation(() => Promise.resolve(null));
    mockSaveData.mockImplementation(() => Promise.resolve(true));
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => 
    React.createElement(WalletProvider, { children });

  it('should initialize with null player name and first time difficulty selection as true', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      // Wait for the useEffect to complete
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current?.playerName).toBeNull();
    expect(result.current?.isFirstTimeDifficultySelection).toBe(true);
  });

  it('should set player name when provided', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      result.current?.setPlayerName('TestPlayer');
    });

    expect(result.current?.playerName).toBe('TestPlayer');
  });

  it('should mark first time difficulty selection as false when initializing wallet with difficulty', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      result.current?.initializeWallet('medium', 'TestPlayer');
    });

    expect(result.current?.isFirstTimeDifficultySelection).toBe(false);
    expect(result.current?.playerName).toBe('TestPlayer');
    expect(result.current?.difficulty).toBe('medium');
  });

  it('should reset name and first time flag when resetting wallet', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Set some values first
    await act(async () => {
      result.current?.initializeWallet('hard', 'TestPlayer');
    });

    // Reset the wallet
    await act(async () => {
      result.current?.resetWallet();
    });

    expect(result.current?.playerName).toBeNull();
    expect(result.current?.isFirstTimeDifficultySelection).toBe(true);
    expect(result.current?.difficulty).toBeNull();
  });

  it('should handle initialization without player name', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      result.current?.initializeWallet('easy');
    });

    expect(result.current?.isFirstTimeDifficultySelection).toBe(false);
    expect(result.current?.playerName).toBeNull();
    expect(result.current?.difficulty).toBe('easy');
  });
});