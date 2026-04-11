import { createMockStore } from '../utils/testStore';
import {
  addCandy,
  removeCandy,
  clearInventory,
  setMaxInventory,
  incrementMaxInventory,
} from '../../store/slices/inventorySlice';

describe('inventorySlice', () => {
  it('addCandy adds a new candy to inventory', () => {
    const store = createMockStore();

    store.dispatch(addCandy({ id: 'gummy_bear', name: 'Gummy Bear', price: 5, quantity: 3 }));
    const inventory = store.getState().inventory.inventory;
    expect(inventory).toHaveLength(1);
    expect(inventory[0]).toMatchObject({ id: 'gummy_bear', name: 'Gummy Bear', quantity: 3 });
  });

  it('addCandy increases quantity of existing candy', () => {
    const store = createMockStore({
      inventory: {
        inventory: [{ id: 'lollipop', name: 'Lollipop', price: 3, quantity: 2 }],
        maxInventory: 30,
      },
    });

    store.dispatch(addCandy({ id: 'lollipop', name: 'Lollipop', price: 3, quantity: 5 }));
    const inventory = store.getState().inventory.inventory;
    expect(inventory).toHaveLength(1);
    expect(inventory[0].quantity).toBe(7);
  });

  it('removeCandy decreases quantity', () => {
    const store = createMockStore({
      inventory: {
        inventory: [{ id: 'jawbreaker', name: 'Jawbreaker', price: 10, quantity: 5 }],
        maxInventory: 30,
      },
    });

    store.dispatch(removeCandy({ id: 'jawbreaker', quantity: 2 }));
    const inventory = store.getState().inventory.inventory;
    expect(inventory).toHaveLength(1);
    expect(inventory[0].quantity).toBe(3);
  });

  it('removeCandy removes candy entirely when quantity reaches 0', () => {
    const store = createMockStore({
      inventory: {
        inventory: [{ id: 'taffy', name: 'Taffy', price: 2, quantity: 3 }],
        maxInventory: 30,
      },
    });

    store.dispatch(removeCandy({ id: 'taffy', quantity: 3 }));
    const inventory = store.getState().inventory.inventory;
    expect(inventory).toHaveLength(0);
  });

  it('clearInventory empties all items', () => {
    const store = createMockStore({
      inventory: {
        inventory: [
          { id: 'candy1', name: 'Candy 1', price: 1, quantity: 10 },
          { id: 'candy2', name: 'Candy 2', price: 2, quantity: 5 },
        ],
        maxInventory: 30,
      },
    });

    store.dispatch(clearInventory());
    expect(store.getState().inventory.inventory).toEqual([]);
  });

  it('setMaxInventory updates the max', () => {
    const store = createMockStore();

    store.dispatch(setMaxInventory(50));
    expect(store.getState().inventory.maxInventory).toBe(50);
  });

  it('incrementMaxInventory adds to current max', () => {
    const store = createMockStore({
      inventory: {
        inventory: [],
        maxInventory: 30,
      },
    });

    store.dispatch(incrementMaxInventory(10));
    expect(store.getState().inventory.maxInventory).toBe(40);
  });

  it('inventory state has correct default structure', () => {
    const store = createMockStore();
    const state = store.getState().inventory;

    expect(state).toHaveProperty('inventory');
    expect(state).toHaveProperty('maxInventory');
    expect(Array.isArray(state.inventory)).toBe(true);
    expect(state.inventory).toEqual([]);
    expect(state.maxInventory).toBe(30);
  });
});
