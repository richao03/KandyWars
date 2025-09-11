# Comprehensive Test Suite

This directory contains a comprehensive test suite designed to protect the game's functionality during refactoring. The test suite covers all major game mechanics, UI components, and business logic.

## 🎯 Purpose

This test suite serves as a **safety net for refactoring**. Before making any major code changes, run these tests to establish a baseline. After refactoring, run them again to ensure nothing broke.

## 📊 Test Coverage

### Core Areas Tested
- ✅ **Game State Management** - All contexts and state transitions
- ✅ **Period & Day Progression** - Time-based game mechanics
- ✅ **Wallet Operations** - Money, piggy bank, difficulty scaling
- ✅ **Inventory Management** - Candy buying, selling, storage
- ✅ **Joker System** - Effects, calculations, timing
- ✅ **Event System** - Random events, probabilities, impacts
- ✅ **UI Components** - Modals, buttons, user interactions
- ✅ **Game Logic** - Mathematical calculations, algorithms
- ✅ **Persistence** - Save/load functionality
- ✅ **Error Handling** - Edge cases and error scenarios

### Test Files

| File | Purpose | Coverage |
|------|---------|----------|
| `comprehensive-integration.test.ts` | Full game flow testing | End-to-end gameplay simulation |
| `game-logic.test.ts` | Core algorithms & calculations | Business logic validation |
| `screen-integration.test.tsx` | UI component testing | User interface interactions |
| `jokerEffects.test.ts` | Joker system testing | Effect calculations & timing |
| `HomeEcGame-*.test.ts` | Minigame testing | Game-specific logic |
| `callback-logic.test.ts` | Event system testing | Callback handling |

## 🚀 Quick Start

### Run All Tests
```bash
npm run test:comprehensive
```
This runs the complete test suite with a detailed report.

### Run Individual Test Suites
```bash
# Core game logic
npm run test:logic

# Full integration tests
npm run test:integration

# UI component tests
npm run test:ui

# Joker system tests
npm run test:jokers

# Coverage report
npm run test:coverage
```

### Watch Mode (Development)
```bash
npm run test:watch
```

## 📋 Before Refactoring Checklist

1. **Run comprehensive tests**
   ```bash
   npm run test:comprehensive
   ```

2. **Ensure 100% pass rate**
   - All tests must be green
   - Fix any failing tests before proceeding

3. **Note current test coverage**
   ```bash
   npm run test:coverage
   ```

4. **Document planned changes**
   - What you're refactoring
   - Why you're making the changes
   - Expected impact areas

5. **Create feature branch**
   ```bash
   git checkout -b refactor/your-feature-name
   ```

## 🔄 After Refactoring Checklist

1. **Run comprehensive tests again**
   ```bash
   npm run test:comprehensive
   ```

2. **Compare results**
   - Same number of tests should pass
   - No new failing tests
   - Performance should be similar

3. **Check coverage**
   ```bash
   npm run test:coverage
   ```
   - Coverage should not decrease significantly

4. **Manual testing**
   - Test critical user flows manually
   - Verify game feels the same to play

5. **Performance check**
   - Game should run smoothly
   - No new lag or stuttering

## 🐛 When Tests Fail

### Understanding Failures

1. **Read the error message carefully**
   - What specific assertion failed?
   - Which component or function is affected?

2. **Identify the root cause**
   - Is it a breaking API change?
   - Did business logic change unexpectedly?
   - Is it a test setup issue?

3. **Fix vs. Update**
   - **Fix the code** if behavior changed unintentionally
   - **Update the test** if the change was intentional

### Common Failure Patterns

| Error Type | Likely Cause | Solution |
|------------|--------------|----------|
| Context not found | Provider missing in test | Add to TestWrapper |
| Async timeout | State not updating | Add waitFor() or act() |
| Mock not called | Function signature changed | Update mock |
| Calculation wrong | Business logic changed | Verify and update |

## 📊 Test Metrics

The comprehensive test suite includes:
- **200+** individual test cases
- **Full game simulation** from start to finish
- **All major user flows** covered
- **Edge cases** and error scenarios
- **Performance benchmarks** for critical paths

## 🔧 Adding New Tests

When adding new features, add corresponding tests:

1. **Unit tests** for individual functions
2. **Integration tests** for feature workflows
3. **UI tests** for new components
4. **End-to-end tests** for complete user journeys

### Test Structure
```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup code
  });

  test('should do something specific', () => {
    // Test implementation
  });

  describe('Edge Cases', () => {
    // Edge case tests
  });
});
```

## 🛠️ Test Utilities

### Mock Setup
All external dependencies are mocked:
- `AsyncStorage` - For persistence testing
- `expo-haptics` - For haptic feedback
- `expo-router` - For navigation
- `react-native-modal` - For modal rendering

### Test Wrapper
Use `TestWrapper` component to provide all contexts:
```typescript
const { result } = renderHook(() => useGame(), { 
  wrapper: TestWrapper 
});
```

### Common Patterns
```typescript
// Async state changes
await act(async () => {
  result.current!.someAction();
});

// Waiting for effects
await waitFor(() => {
  expect(result.current!.someValue).toBe(expected);
});

// UI interactions
fireEvent.press(getByText('Button Text'));
```

## 📈 Continuous Integration

For CI/CD pipelines:

```bash
# Run tests with JUnit output
npm test -- --reporters=jest-junit

# Run with coverage for coverage reports
npm run test:coverage -- --coverageReporters=cobertura

# Fast test run (no watch mode)
npm test -- --watchAll=false --passWithNoTests
```

## 🎯 Success Criteria

The test suite is successful if:
- ✅ All tests pass consistently
- ✅ New features get corresponding tests
- ✅ Refactoring doesn't break existing functionality
- ✅ Coverage stays above 80% for critical paths
- ✅ Tests run in reasonable time (< 30 seconds)

---

**Remember**: Tests are living documentation. Keep them updated as the game evolves!