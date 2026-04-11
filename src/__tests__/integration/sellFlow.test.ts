import { createMockStore } from '../utils/testStore';
import { createStoreWithEffects } from '../utils/testHelpers';
import { calculateSaleTotal } from '../../utils/saleCalculations';
import { addBalance, spendBalance } from '../../store/slices/walletSlice';
import { addCandy, removeCandy } from '../../store/slices/inventorySlice';
import { addSale } from '../../store/slices/candySalesSlice';
import { JOKER_IDS } from '../../constants/jokerIds';

/**
 * Default sale params with no joker effects.
 * Override individual fields as needed per test.
 */
const baseSaleParams = {
  candyName: 'Gummy Bears',
  basePrice: 10,
  purchasePrice: 5,
  quantity: 3,
  jokers: [] as any[],
  periodCount: 4,
  inventoryLimit: 30,
  activeEffects: [] as any[],
  hallPassModifiers: { salePriceBonusPercent: 0 },
  merchantEffects: [] as any[],
  consecutivePeriodSales: 0,
  totalCandiesSold: 0,
  hasEarlySaleToday: false,
};

describe('Sell Flow Integration Tests', () => {
  describe('calculateSaleTotal — basic cases', () => {
    it('returns correct totalGain for a basic sale with no jokers', () => {
      const result = calculateSaleTotal(baseSaleParams);

      // profit per unit = 10 - 5 = 5, total profit = 15
      // boostedProfit = 15 * 1 (no boost) = 15, multiplier = 1
      // totalGain = purchaseValue + finalProfit = 15 + 15 = 30
      expect(result.profitPerUnit).toBe(5);
      expect(result.totalProfit).toBe(15);
      expect(result.purchaseValue).toBe(15); // 5 * 3
      expect(result.totalGain).toBe(30); // 15 + 15
    });

    it('returns purchaseValue + profit when basePrice > purchasePrice', () => {
      const params = {
        ...baseSaleParams,
        basePrice: 20,
        purchasePrice: 8,
        quantity: 5,
      };
      const result = calculateSaleTotal(params);

      const profitPerUnit = 20 - 8; // 12
      const totalProfit = 12 * 5; // 60
      const purchaseValue = 8 * 5; // 40

      expect(result.profitPerUnit).toBe(profitPerUnit);
      expect(result.totalProfit).toBe(totalProfit);
      expect(result.purchaseValue).toBe(purchaseValue);
      expect(result.totalGain).toBe(purchaseValue + totalProfit); // 100
    });

    it('returns basePrice * quantity when selling at a loss', () => {
      const params = {
        ...baseSaleParams,
        basePrice: 3,
        purchasePrice: 10,
        quantity: 4,
      };
      const result = calculateSaleTotal(params);

      // profitPerUnit = max(0, 3 - 10) = 0 → selling at a loss
      // totalGain = basePrice * quantity = 3 * 4 = 12
      expect(result.profitPerUnit).toBe(0);
      expect(result.totalGain).toBe(12);
    });
  });

  describe('calculateSaleTotal — joker effects', () => {
    it('type multiplier joker boosts profit correctly for matching candy', () => {
      // Cocoa Futures (id 23) boosts chocolate candy
      // M&Ms is chocolate + hard_candy
      const cocoaJoker = { id: JOKER_IDS.COCOA_FUTURES.toString(), level: 1 };
      const params = {
        ...baseSaleParams,
        candyName: 'M&Ms',
        basePrice: 100,
        purchasePrice: 50,
        quantity: 2,
        jokers: [cocoaJoker],
      };
      const result = calculateSaleTotal(params);

      // profitPerUnit = 50, totalProfit = 100
      // Cocoa Futures level 1: type_multiplier multiply 1.5 → profitBoost += 0.5
      // boostedProfit = 100 * 1.5 = 150
      // multiplier = 1 (no step 3 effects)
      // totalGain = purchaseValue (100) + 150 = 250
      expect(result.profitPerUnit).toBe(50);
      expect(result.totalGain).toBe(250);
      expect(result.bonusBreakdown.length).toBeGreaterThan(0);
    });

    it('Vacuum Sealer caps multiplier at 1x minimum', () => {
      const vacuumJoker = { id: JOKER_IDS.VACUUM_SEALER.toString(), level: 1 };
      const params = {
        ...baseSaleParams,
        basePrice: 20,
        purchasePrice: 10,
        quantity: 2,
        jokers: [vacuumJoker],
      };
      const result = calculateSaleTotal(params);

      // profitPerUnit = 10, totalProfit = 20
      // Vacuum Sealer: multiplier = max(1, 1 - 2) = max(1, -1) = 1
      // boostedProfit = 20 * 1 = 20, finalProfit = 20 * 1 = 20
      // totalGain = purchaseValue (20) + 20 = 40
      expect(result.jokerMultiplier).toBe(1);
      expect(result.totalGain).toBe(40);
    });
  });

  describe('Store dispatches after sale', () => {
    it('addBalance after a sale increases wallet balance correctly', () => {
      const store = createMockStore({
        wallet: {
          balance: 100,
        } as any,
      });

      const saleAmount = 45.50;
      store.dispatch(addBalance(saleAmount));

      expect(store.getState().wallet.balance).toBeCloseTo(145.50, 2);
    });

    it('removeCandy after a sale decreases inventory', () => {
      const store = createMockStore({
        inventory: {
          inventory: [
            { id: 'gummy-bears', name: 'Gummy Bears', price: 5, quantity: 10 },
          ],
          maxInventory: 30,
        } as any,
      });

      store.dispatch(removeCandy({ id: 'gummy-bears', quantity: 3 }));

      const inv = store.getState().inventory.inventory;
      const gummy = inv.find((c: any) => c.id === 'gummy-bears');
      expect(gummy).toBeDefined();
      expect(gummy!.quantity).toBe(7);
    });
  });

  describe('Full sell flow sequence', () => {
    it('calculate → update wallet → update inventory in correct order', () => {
      // Set up store with inventory and wallet
      const store = createMockStore({
        wallet: {
          balance: 50,
        } as any,
        inventory: {
          inventory: [
            { id: 'gummy-bears', name: 'Gummy Bears', price: 5, quantity: 5 },
          ],
          maxInventory: 30,
        } as any,
      });

      // Step 1: Calculate sale total
      const saleResult = calculateSaleTotal({
        ...baseSaleParams,
        candyName: 'Gummy Bears',
        basePrice: 12,
        purchasePrice: 5,
        quantity: 3,
      });

      // profitPerUnit = 7, totalProfit = 21, purchaseValue = 15
      // totalGain = 15 + 21 = 36
      expect(saleResult.totalGain).toBe(36);

      // Step 2: Update wallet
      store.dispatch(addBalance(saleResult.totalGain));
      expect(store.getState().wallet.balance).toBeCloseTo(86, 2);

      // Step 3: Update inventory
      store.dispatch(removeCandy({ id: 'gummy-bears', quantity: 3 }));
      const remainingCandy = store.getState().inventory.inventory.find(
        (c: any) => c.id === 'gummy-bears'
      );
      expect(remainingCandy).toBeDefined();
      expect(remainingCandy!.quantity).toBe(2);

      // Step 4: Record the sale
      store.dispatch(addSale({
        candyId: 'gummy-bears',
        candyName: 'Gummy Bears',
        quantity: 3,
        price: 12,
        total: saleResult.totalGain,
        timestamp: Date.now(),
        period: 4,
      }));

      const sales = store.getState().candySales;
      expect(sales.totalCandiesSold).toBe(3);
      expect(sales.totalRevenue).toBe(36);
    });
  });
});
