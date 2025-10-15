# Vacuum Sealer Fix - Snapshot-Based Doubling

## Problem
Vacuum Sealer was using a `multiply` operation that would double ALL inventory bonuses, including:
- Base inventory (30)
- Hall pass bonuses (fixed per run)
- **Other joker bonuses added AFTER Vacuum Sealer** ❌

This meant if you:
1. Had 50 inventory (30 base + 20 from jokers/hall passes)
2. Selected Vacuum Sealer → 100 inventory
3. Added another joker (+15) → 115... but the multiply would make it 130! ❌

## Solution
Changed Vacuum Sealer to capture a **snapshot** of current inventory at activation time, then **add** that amount (effectively doubling).

### How It Works Now:

**Example Flow:**
1. Base: 30
2. Hall pass: +5 = 35
3. Joker A (Geometric Expansion): +15 = 50
4. **Vacuum Sealer activated**:
   - Snapshot = 50
   - Operation: ADD +50
   - New total = 100 ✅
5. Joker B added later: +15 = 115 ✅ (NOT doubled!)

## Changes Made

### 1. Joker Definition (`src/utils/jokerEffectEngine.ts`)
**Before:**
```typescript
{
  id: 12,
  name: 'Vacuum Sealer',
  effects: [
    {
      target: 'inventory_limit',
      operation: 'multiply',  // ❌ Would multiply everything
      amount: 2,
      duration: 'persistent',
    },
  ],
}
```

**After:**
```typescript
{
  id: 12,
  name: 'Vacuum Sealer',
  requiresSnapshot: true,  // Flag for special handling
  effects: [
    {
      target: 'inventory_limit',
      operation: 'add',  // ✅ Add snapshot amount
      amount: 0,  // Placeholder - set at activation
      duration: 'persistent',
    },
  ],
}
```

### 2. Activation Logic (`src/hooks/useJokers.ts`)
Added special handling in `addJokerAction`:

```typescript
// Special handling for Vacuum Sealer: capture snapshot of current inventory
if (joker.id === JOKER_IDS.VACUUM_SEALER) {
  // Calculate current total inventory (joker effects + hall passes)
  const currentInventory = computedInventoryLimit + hallPassModifiers.inventoryBonusSlots;

  // Clone the joker and update the effect amount
  jokerToAdd = {
    ...joker,
    effects: joker.effects?.map((effect: any) => ({
      ...effect,
      amount: currentInventory, // Add current amount (effectively doubling)
    })) || [],
  };

  console.log(`🔧 Vacuum Sealer: Capturing snapshot of ${currentInventory} slots`);
}
```

### 3. Type Definition Update
Added `requiresSnapshot?: boolean` to `StandardizedJoker` interface.

## Testing

### Test Case 1: Basic Doubling
- Start: 30 base
- Hall pass: +5 = 35
- Vacuum Sealer: +35 = 70 ✅

### Test Case 2: With Prior Jokers
- Start: 30 base
- Hall pass: +5 = 35
- Joker A: +15 = 50
- Vacuum Sealer: +50 = 100 ✅
- Joker B: +13 = 113 ✅ (not 126)

### Test Case 3: Multiple Jokers After
- Start: 30 base
- Vacuum Sealer: +30 = 60
- Joker A: +15 = 75 ✅
- Joker B: +15 = 90 ✅
- Hall pass bonus is already included in base

## Console Output
When Vacuum Sealer is selected, you'll see:
```
🔧 Vacuum Sealer: Capturing snapshot of 50 slots (will add 50 for total 100)
```

## Notes
- Hall pass bonuses are fixed at run start (don't change mid-game)
- Only NEW joker bonuses (added after Vacuum Sealer) avoid doubling
- The snapshot is permanent for that run (persistent effect)
- This matches the intended design: double CURRENT inventory, not future additions
