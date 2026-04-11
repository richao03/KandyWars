import { createMockStore } from '../utils/testStore';
import {
  addBalance,
  spendBalance,
  stashMoney,
  withdrawFromStash,
  resetWallet,
  completeReset,
  initializeWallet,
  selectBalance,
  selectStashedAmount,
  selectDifficultyLevel,
} from '../../store/slices/walletSlice';

// Mock SoundEffects to avoid audio calls in tests
jest.mock('../../utils/soundEffects', () => ({
  SoundEffects: {
    playCoinSound: jest.fn(),
  },
}));

describe('walletSlice', () => {
  it('addBalance increases balance correctly', () => {
    const store = createMockStore({
      wallet: { balance: 100, stashedAmount: 0, difficultyLevel: 1 },
    });

    store.dispatch(addBalance(50));
    expect(store.getState().wallet.balance).toBe(150);
  });

  it('spendBalance decreases balance correctly', () => {
    const store = createMockStore({
      wallet: { balance: 100, stashedAmount: 0, difficultyLevel: 1 },
    });

    store.dispatch(spendBalance(30));
    expect(store.getState().wallet.balance).toBe(70);
  });

  it('spendBalance with insufficient funds silently rejects (balance unchanged)', () => {
    const store = createMockStore({
      wallet: { balance: 20, stashedAmount: 0, difficultyLevel: 1 },
    });

    store.dispatch(spendBalance(50));
    // Reducer silently rejects — balance should remain unchanged
    expect(store.getState().wallet.balance).toBe(20);
  });

  it('stashMoney moves money from balance to stash', () => {
    const store = createMockStore({
      wallet: { balance: 100, stashedAmount: 0, difficultyLevel: 1 },
    });

    store.dispatch(stashMoney({ amountPaid: 40, amountStashed: 40 }));
    expect(store.getState().wallet.balance).toBe(60);
    expect(store.getState().wallet.stashedAmount).toBe(40);
  });

  it('withdrawFromStash moves money from stash to balance', () => {
    const store = createMockStore({
      wallet: { balance: 50, stashedAmount: 200, difficultyLevel: 1 },
    });

    store.dispatch(withdrawFromStash(100));
    expect(store.getState().wallet.balance).toBe(150);
    expect(store.getState().wallet.stashedAmount).toBe(100);
  });

  it('initializeWallet sets correct starting balance and adoption fee based on difficulty', () => {
    const store = createMockStore();

    store.dispatch(initializeWallet({ level: 3 }));
    const state = store.getState().wallet;
    // Balance is always reset to 20
    expect(state.balance).toBe(20);
    expect(state.difficultyLevel).toBe(3);
    // Level 3 adoption fee is 25000
    expect(state.adoptionFee).toBe(25000);
    // Stash set to negative adoption fee (debt)
    expect(state.stashedAmount).toBe(-25000);
    expect(state.isFirstTimeDifficultySelection).toBe(false);
  });

  it('resetWallet preserves difficultyLevel', () => {
    const store = createMockStore({
      wallet: {
        balance: 5000,
        stashedAmount: 300,
        difficultyLevel: 7,
        adoptionFee: 300000,
      },
    });

    store.dispatch(resetWallet());
    const state = store.getState().wallet;
    // resetWallet sets balance to 20, adoptionFee to 5000, stash to -adoptionFee
    expect(state.balance).toBe(20);
    expect(state.adoptionFee).toBe(5000);
    expect(state.stashedAmount).toBe(-5000);
    // difficultyLevel is preserved (resetWallet does NOT touch difficultyLevel)
    expect(state.difficultyLevel).toBe(7);
  });

  it('selectBalance returns current balance', () => {
    const store = createMockStore({
      wallet: { balance: 42, stashedAmount: 0, difficultyLevel: 1 },
    });

    expect(selectBalance(store.getState())).toBe(42);
  });

  it('selectStashedAmount returns stashed amount', () => {
    const store = createMockStore({
      wallet: { balance: 0, stashedAmount: -500, difficultyLevel: 1 },
    });

    expect(selectStashedAmount(store.getState())).toBe(-500);
  });

  it('selectDifficultyLevel returns difficulty level', () => {
    const store = createMockStore({
      wallet: { balance: 0, stashedAmount: 0, difficultyLevel: 5 },
    });

    expect(selectDifficultyLevel(store.getState())).toBe(5);
  });

  it('balance stays accurate after multiple operations', () => {
    const store = createMockStore({
      wallet: { balance: 100, stashedAmount: 50, difficultyLevel: 1 },
    });

    // Add 200 -> balance = 300
    store.dispatch(addBalance(200));
    expect(store.getState().wallet.balance).toBe(300);

    // Spend 80 -> balance = 220
    store.dispatch(spendBalance(80));
    expect(store.getState().wallet.balance).toBe(220);

    // Stash 100 (paid 100, stashed 100) -> balance = 120, stash = 150
    store.dispatch(stashMoney({ amountPaid: 100, amountStashed: 100 }));
    expect(store.getState().wallet.balance).toBe(120);
    expect(store.getState().wallet.stashedAmount).toBe(150);

    // Withdraw 50 from stash -> balance = 170, stash = 100
    store.dispatch(withdrawFromStash(50));
    expect(store.getState().wallet.balance).toBe(170);
    expect(store.getState().wallet.stashedAmount).toBe(100);
  });
});
