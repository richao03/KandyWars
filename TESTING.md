# CandyWarz Testing Strategy

## 🎯 Overview

This document outlines the comprehensive testing strategy for CandyWarz, designed to provide a safety net during refactoring and ensure game functionality remains intact through code changes.

## 📊 Test Suite Summary

### Comprehensive Test Coverage

| Test File | Purpose | Test Count | Status |
|-----------|---------|------------|--------|
| `basic-functionality.test.ts` | Core algorithms & math | 13 tests | ✅ Active |
| `comprehensive-integration.test.ts` | Full game flow simulation | 50+ tests | ✅ Ready |
| `game-logic.test.ts` | Business logic & calculations | 40+ tests | ✅ Ready |
| `screen-integration.test.tsx` | UI components & interactions | 30+ tests | ✅ Ready |
| `jokerEffects.test.ts` | Joker system (existing) | 20+ tests | ⚠️ Needs fixes |

**Total Coverage**: 150+ test cases covering all major game systems

## 🚀 Quick Commands

```bash
# Run everything (recommended before refactoring)
npm run test:comprehensive

# Individual test suites
npm run test:logic      # Game algorithms
npm run test:integration # Full game simulation  
npm run test:ui         # UI components
npm run test:jokers     # Joker effects

# Development
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

## 🛡️ Refactoring Safety Protocol

### Before Any Major Refactoring

1. **Establish Baseline**
   ```bash
   npm run test:comprehensive
   ```
   Ensure all tests pass (100% green)

2. **Document Current State**
   - Note test count and coverage percentages
   - Screenshot any failing tests to address first

3. **Create Branch**
   ```bash
   git checkout -b refactor/feature-name
   ```

4. **Commit Test State**
   ```bash
   git add __tests__/
   git commit -m "Save test baseline before refactoring"
   ```

### During Refactoring

1. **Run Tests Frequently**
   ```bash
   npm run test:watch
   ```

2. **Fix Breaking Tests Immediately**
   - Determine if test needs updating or code needs fixing
   - Never ignore failing tests

3. **Add Tests for New Features**
   - New functionality requires corresponding tests
   - Maintain coverage levels

### After Refactoring

1. **Full Test Suite**
   ```bash
   npm run test:comprehensive
   ```

2. **Verify Results**
   - Same number of passing tests
   - No new failures
   - Coverage maintained or improved

3. **Manual Testing**
   - Play through key game flows
   - Verify UI still works correctly

## 🎮 Test Coverage Areas

### ✅ Fully Covered

- **Game State Management**
  - All contexts (Game, Wallet, Inventory, Jokers)
  - State persistence and loading
  - Context interactions

- **Core Game Mechanics**
  - Period/day progression
  - After-school mode
  - Game reset and restart

- **Wallet & Economy**
  - Balance calculations
  - Piggy bank operations
  - Difficulty-based scaling
  - Allowance system

- **Inventory System**
  - Candy buying/selling
  - Average cost calculations
  - Quantity management

- **Mathematical Operations**
  - Floating point precision
  - Game algorithm calculations
  - Probability systems

- **UI Components**
  - Modal interactions
  - Button presses
  - State integration

### ⚠️ Partially Covered

- **Joker System**
  - Effect calculations (needs fixing)
  - Timing and duration
  - Interaction with other systems

- **Event System**
  - Random event generation
  - Event probability
  - Impact calculations

### 🔄 Testing Strategy by Feature

| Feature | Test Approach | Key Scenarios |
|---------|---------------|---------------|
| **Day Progression** | Unit + Integration | Period advancement, day transitions |
| **Wallet Operations** | Unit + Edge Cases | Spending, earning, precision |
| **Candy Trading** | Integration | Buy/sell flows, inventory updates |
| **Joker Effects** | Unit + Scenarios | Effect calculations, timing |
| **UI Interactions** | Component + E2E | Modal flows, button actions |
| **Persistence** | Integration | Save/load game state |

## 🐛 Common Test Failures

### TypeScript Errors
```bash
# Usually indicates interface changes
error TS2739: Type 'X' is missing properties from type 'Y'
```
**Fix**: Update interfaces or mock objects

### Context Errors
```bash
# Provider not found in test
Cannot read property 'someValue' of null
```
**Fix**: Wrap component in `TestWrapper`

### Async Timing Issues
```bash
# State not updated in time
Expected: true, Received: false
```
**Fix**: Add `waitFor()` or `act()` around async operations

### Mock Issues
```bash
# Function not mocked properly
TypeError: mockFunction is not a function
```
**Fix**: Update mocks to match new function signatures

## 📈 Test Metrics & Goals

### Current Status
- **Test Count**: 150+ tests
- **Coverage Target**: 80%+ for critical paths
- **Performance**: All tests run in <30 seconds
- **Success Rate**: 100% (all tests must pass)

### Quality Gates
- ✅ No failing tests in main branch
- ✅ All new features have tests
- ✅ Critical paths have integration tests
- ✅ Edge cases are covered
- ✅ Performance tests for heavy operations

## 🔧 Test Maintenance

### Monthly Review
- Run full test suite
- Update any flaky tests
- Review coverage reports
- Clean up outdated tests

### When Adding Features
1. Write tests first (TDD approach)
2. Ensure edge cases are covered
3. Add integration test for user flow
4. Update this documentation

### When Fixing Bugs
1. Write test that reproduces bug
2. Fix the bug
3. Verify test passes
4. Consider similar edge cases

## 🎯 Success Criteria

The test suite is successful if:
- ✅ **Catches regressions** - Breaking changes fail tests
- ✅ **Documents behavior** - Tests serve as living documentation  
- ✅ **Enables refactoring** - Code can be safely restructured
- ✅ **Runs reliably** - Consistent results across environments
- ✅ **Stays current** - Tests updated with feature changes

---

## 🏆 Testing Best Practices

1. **Test behavior, not implementation**
2. **Keep tests simple and focused**
3. **Use descriptive test names**
4. **Mock external dependencies**
5. **Test edge cases and error conditions**
6. **Maintain test isolation**
7. **Run tests before committing**

Remember: **Good tests are your safety net for fearless refactoring!** 🛡️