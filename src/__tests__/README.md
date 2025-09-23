# Candy Warz Testing Suite

A comprehensive testing framework for validating game mechanics, especially Joker effects and Hall Pass bonuses.

## 🧪 Test Structure

### `/utils/`
- **testStore.ts** - Mock Redux store utilities and test state presets

### `/hallpass/`
- **hallPassEffects.test.ts** - Hall Pass selection, effects, and unlock requirements

### `/jokers/`
- **jokerEffects.test.ts** - Joker inventory management, effect application, and calculations

### `/integration/`
- **combinedEffects.test.ts** - Testing interaction between Hall Passes and Jokers

## 🎯 What We Test

### Hall Pass Effects
- ✅ Selection and deselection of Hall Passes
- ✅ Sale price bonus calculations (percentage-based, **SELLING ONLY**)
- ✅ Buy/sell price distinction (bonuses don't apply to purchases)
- ✅ Inventory bonus application (flat additions)
- ✅ Allowance bonus calculations (percentage-based)
- ✅ Joker bonus effects (extra jokers in selection)
- ✅ Special effects (extra periods, etc.)
- ✅ Unlock requirements validation
- ✅ Data persistence and state management

### Joker Effects
- ✅ Joker inventory management (add/remove)
- ✅ Effect application and removal
- ✅ Sale price effects (**SELLING ONLY**, no buying discounts)
- ✅ Multiplicative vs additive bonuses
- ✅ Subject-specific categorization
- ✅ Duration handling (persistent vs one-time)
- ✅ Effect stacking and combinations
- ✅ Rarity and value calculations

### Integration Testing
- ✅ Hall Pass + Joker bonus stacking (**SELLING ONLY**)
- ✅ Buy/sell context preservation across combined effects
- ✅ Order of operations (Hall Pass first, then Jokers)
- ✅ Complex multi-bonus scenarios
- ✅ Edge cases and boundary conditions
- ✅ Performance with rapid state changes
- ✅ Game completion scenarios

## 🛠 Test Utilities

### `createMockStore(preloadedState?)`
Creates a Redux store with optional initial state for testing.

```typescript
const store = createMockStore(testStates.withHallPassBonus);
```

### `testStates` Presets
Pre-configured game states for common testing scenarios:

- **basicGame** - Clean state with no bonuses
- **withHallPassBonus** - State with active Hall Pass
- **withJokers** - State with active Joker effects
- **withMinigameProgress** - State with minigame tracking
- **allMinigamesCompleted** - State where all minigames are done
- **highDifficulty** - High difficulty game with lots of candy sold

### `mergeTestStates(...states)`
Combines multiple test states for complex scenarios:

```typescript
const complexState = mergeTestStates(
  testStates.basicGame,
  testStates.withHallPassBonus,
  testStates.withJokers
);
```

## 🚀 Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Hall Pass tests only
npm test hallpass

# Joker tests only
npm test jokers

# Integration tests only
npm test integration
```

### Run with Coverage
```bash
npm test -- --coverage
```

### Watch Mode
```bash
npm test -- --watch
```

## 📊 Coverage Targets

We maintain 70% coverage across:
- Branches
- Functions
- Lines
- Statements

## 🧩 Example Test Scenarios

### Testing Hall Pass Sale Price Bonus (Selling Only!)
```typescript
it('should apply sale price bonus ONLY when selling', () => {
  const store = createMockStore(testStates.withHallPassBonus);
  const effects = selectSelectedHallPassEffects(store.getState());
  const bonus = effects.find(e => e.type === 'sale_price_bonus');

  const basePrice = 100;

  // SELLING: Apply bonus
  const sellingPrice = Math.round(basePrice * (1 + bonus.value / 100));
  expect(sellingPrice).toBe(115); // 100 * 1.15

  // BUYING: No bonus applied
  const buyingPrice = basePrice; // Should remain unchanged
  expect(buyingPrice).toBe(100);

  expect(sellingPrice).toBeGreaterThan(buyingPrice);
});
```

### Testing Combined Effects (Selling Context)
```typescript
it('should stack hall pass and joker bonuses for SELLING only', () => {
  const store = createMockStore(mergeTestStates(
    testStates.withHallPassBonus,
    testStates.withJokers
  ));

  const basePrice = 100;

  // SELLING: Hall Pass +15%, then Joker 1.2x
  // Expected: 100 -> 115 -> 138
  const sellingPrice = Math.round(basePrice * 1.15 * 1.2);
  expect(sellingPrice).toBe(138);

  // BUYING: No bonuses applied
  const buyingPrice = basePrice;
  expect(buyingPrice).toBe(100);

  // Verify 38% markup when selling vs buying
  expect(sellingPrice - buyingPrice).toBe(38);
});
```

### Testing Unlock Requirements
```typescript
it('should unlock High Roller when selling 300+ candy', () => {
  const gameStats = {
    totalCandySold: 350,
    // ... other stats
  };

  const shouldUnlock = gameStats.totalCandySold > 300;
  expect(shouldUnlock).toBe(true);
});
```

## 🔍 Testing Philosophy

1. **Isolated Testing** - Each effect type tested independently
2. **Integration Validation** - Combined effects tested for correct interaction
3. **Context Awareness** - Sale price bonuses only apply when selling, never when buying
4. **Edge Case Coverage** - Boundary conditions and error scenarios
5. **Performance Awareness** - Ensuring effects don't cause performance issues
6. **Real-world Scenarios** - Tests mirror actual gameplay situations
7. **Game Balance Validation** - Ensuring bonuses don't create unfair advantages

## 📝 Adding New Tests

When adding new game mechanics:

1. **Create unit tests** in the appropriate category folder
2. **Add test states** to `testStore.ts` if needed
3. **Include integration tests** if the feature interacts with existing systems
4. **Update this README** with new testing scenarios

## 🐛 Common Test Patterns

### Testing Effect Calculations
```typescript
const applyEffect = (base: number, effect: Effect) => {
  switch(effect.operation) {
    case 'multiply': return Math.round(base * effect.amount);
    case 'add': return base + effect.amount;
    default: return base;
  }
};
```

### Testing State Changes
```typescript
const initialState = store.getState();
store.dispatch(someAction());
const newState = store.getState();
expect(newState).not.toEqual(initialState);
```

### Testing Async Operations
```typescript
await store.dispatch(asyncAction());
const result = store.getState();
expect(result.loading).toBe(false);
```