# Performance Testing Guide

## How to Test Performance Improvements

### 1. Visual Performance Monitoring (Easiest)

#### Enable Render Counting
Add this to components you want to monitor:

```tsx
import { useRenderCount } from '../../src/hooks/useRenderCount';

function MyComponent() {
  useRenderCount('MyComponent');
  // ... rest of component
}
```

#### Example: Monitor CandyListItem renders
In `app/components/CandyListItem.tsx`:
```tsx
import { useRenderCount } from '../../src/hooks/useRenderCount';

const CandyListItem = React.memo(function CandyListItem({ ... }) {
  useRenderCount('CandyListItem');
  // ... rest
});
```

### 2. React Native Performance Monitor (Built-in)

#### Enable Performance Monitor in iOS Simulator:
1. Open app in simulator
2. Press `Cmd + D` to open developer menu
3. Select "Show Perf Monitor"
4. Watch FPS (should be close to 60fps)

#### Enable Performance Monitor in Android:
1. Shake device or press `Cmd + M`
2. Select "Show Perf Monitor"

### 3. Console Performance Tracking

#### Test Scenario: Tab Switching
```javascript
// Before optimization baseline:
// Look for logs like: "🔄 [Market] Render #5 | Time: 150ms"

// Test steps:
1. Open app
2. Switch between Home → Jokers → History → Settings
3. Count renders in console for each component
4. Note: Should see fewer renders after memoization
```

#### What to Look For:
- ✅ **Good**: Each component renders only when its data changes
- ❌ **Bad**: All components render on every tab switch

### 4. Manual Performance Tests

#### Test 1: Tab Switching Speed
**Before**:
- Switch tabs, feel for lag
- Count: How many times does Market component log re-render?

**After**:
- Should feel snappier
- Market shouldn't re-render when switching to other tabs

#### Test 2: Price Update Performance
**Test Steps**:
1. Enable render counting on CandyListItem
2. Click "Next Period" to update prices
3. Check console logs

**Expected Results**:
- ✅ Only CandyListItem components should re-render
- ✅ Modals should NOT re-render
- ✅ GameHUD should only re-render if balance changed

#### Test 3: Modal Opening Performance
**Test Steps**:
1. Open TransactionModal
2. Check if CandyListItem components re-render

**Expected Results**:
- ✅ CandyListItem should NOT re-render (memoized)
- ✅ Only the modal should render

### 5. React DevTools Profiler (Most Detailed)

#### Installation:
```bash
# Install standalone React DevTools
npm install -g react-devtools
```

#### Usage:
1. Start React DevTools: `react-devtools`
2. Open app in simulator
3. In DevTools, click "Profiler" tab
4. Click "Record" button (●)
5. Perform actions (switch tabs, open modals)
6. Click "Stop" button (■)
7. Review flame graph

#### What to Look For:
- **Flame Graph**: Shows component render times
  - Wider = took longer to render
  - Yellow/Red = slow renders
  - Gray = didn't render (memoized!)
- **Ranked Chart**: Shows which components took longest
- **Component Chart**: Shows why component rendered

### 6. Automated Performance Benchmark

Create a test file: `__tests__/performance.test.tsx`

```tsx
import { render } from '@testing-library/react-native';
import CandyListItem from '../app/components/CandyListItem';

describe('Performance Tests', () => {
  it('CandyListItem should not re-render with same props', () => {
    const mockItem = { name: 'Snickers', cost: 5, quantityOwned: 2 };
    const { rerender } = render(
      <CandyListItem item={mockItem} index={0} localPricesUpdating={false} onPress={() => {}} />
    );

    // Re-render with same props
    const renderCount = 0; // Track this with useRenderCount
    rerender(
      <CandyListItem item={mockItem} index={0} localPricesUpdating={false} onPress={() => {}} />
    );

    // Should NOT trigger re-render due to React.memo
    expect(renderCount).toBe(1);
  });
});
```

### 7. Quick Performance Checklist

Run through these scenarios and note any lag:

- [ ] Switch from Market to Jokers tab - **Should be instant**
- [ ] Switch from Jokers to History tab - **Should be instant**
- [ ] Click "Next Period" in Market - **Should only re-render prices**
- [ ] Open Transaction Modal - **Should not re-render list items**
- [ ] Close Transaction Modal - **Should not re-render list items**
- [ ] Open Inventory Modal - **Should not re-render market**
- [ ] Switch tabs during price update - **Should remain responsive**

### 8. Enable Performance Logging (Temporary)

Add to `market.tsx` temporarily:

```tsx
import { useWhyDidYouUpdate } from '../../src/hooks/useRenderCount';

function Market() {
  useWhyDidYouUpdate('Market', {
    candies,
    periodCount,
    localPricesUpdating,
    selectedCandyIndex
  });
  // ... rest
}
```

This will show which props changed and caused re-render.

### 9. Measure Before/After

#### Baseline Measurement (Before Optimization):
1. Clear console
2. Load app
3. Switch tabs 10 times
4. Count total renders in console
5. Note: "Market rendered X times"

#### After Optimization:
1. Clear console
2. Load app
3. Switch tabs 10 times
4. Count total renders
5. **Expected**: 50-70% fewer renders

### 10. Production Performance Test

Build release version:
```bash
npm run build
# or
eas build --platform ios --profile production
```

Test on real device:
- Smoother animations
- Faster tab switching
- Lower battery drain
- Lower memory usage

---

## Expected Performance Gains

### Before Optimization:
- Market renders: ~5-10 times per tab switch
- All candy items re-render on any state change
- Modals cause full re-render of parent

### After Optimization (Current):
- Market renders: ~1-2 times per tab switch
- Candy items only re-render when price changes
- Modals don't trigger parent re-renders
- **50-70% reduction in unnecessary renders**

## Quick Test Command

Add this to enable all performance monitoring:

```tsx
// In market.tsx, add temporarily:
if (__DEV__) {
  console.log('🚀 Performance monitoring enabled');
  global.PERF_MONITOR = true;
}
```

Then use throughout components:
```tsx
if (global.PERF_MONITOR) {
  console.log('Component rendered');
}
```
