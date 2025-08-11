# Centralized Joker System Guide

## Overview
The new centralized joker system eliminates scattered logic and provides a clean, standardized way to handle all joker effects.

## Key Benefits
1. **Single Source of Truth**: All joker logic is in `JokerEffectEngine`
2. **Standardized Format**: All effects use `target + operation + amount`
3. **Easy to Add**: New jokers follow a simple pattern
4. **Automatic Cleanup**: Expired effects are handled automatically
5. **Debug Friendly**: Built-in debugging and logging

## Effect System

### Targets (What the joker affects)
- `inventory_limit` - Inventory capacity
- `candy_price` - Candy prices  
- `period_count` - Game time/periods
- `money` - Player wallet
- `hint_chance` - Event hint visibility
- `stash_protection` - Protects from confiscation
- `event_immunity` - Prevents negative events

### Operations (How the effect is applied)
- `add` - Adds to current value: `current + amount`
- `multiply` - Multiplies current value: `current * amount`
- `set` - Sets to specific value: `amount`
- `enable` - Boolean flag: activates feature

### Duration
- `persistent` - Lasts forever until removed
- `one-time` - Used once then expires
- `number` - Lasts for N periods

## How to Add New Jokers

### Step 1: Define the Joker
```typescript
const newJoker: StandardizedJoker = {
  id: 100, // Unique ID
  name: 'Super Saver',
  description: 'Triples your inventory space and gives $50',
  subject: 'Economy',
  effects: [
    {
      target: 'inventory_limit',
      operation: 'multiply',
      amount: 3,
      duration: 'persistent'
    },
    {
      target: 'money',
      operation: 'add', 
      amount: 50,
      duration: 'one-time'
    }
  ]
};
```

### Step 2: Add to Available Jokers
Add your joker to the `STANDARDIZED_JOKERS` array in `jokerEffectEngine.ts`:

```typescript
export const STANDARDIZED_JOKERS: StandardizedJoker[] = [
  // ... existing jokers
  {
    id: 100,
    name: 'Super Saver',
    // ... rest of definition
  }
];
```

### Step 3: Use in Game
The centralized context automatically handles the effect:

```typescript
const { addJoker, getInventoryLimit } = useCentralizedJokers();

// Player acquires joker
addJoker(newJoker);

// System automatically applies effects
const currentLimit = getInventoryLimit(30); // Returns 90 (30 * 3)
```

## Common Joker Examples

### Inventory Jokers
```typescript
// Add 10 slots
{ target: 'inventory_limit', operation: 'add', amount: 10, duration: 'persistent' }

// Double capacity  
{ target: 'inventory_limit', operation: 'multiply', amount: 2, duration: 'persistent' }

// Set to exact amount
{ target: 'inventory_limit', operation: 'set', amount: 100, duration: 'persistent' }
```

### Price Jokers
```typescript
// Double price of specific candy for 1 period
{
  target: 'candy_price',
  operation: 'multiply', 
  amount: 2,
  duration: 1,
  conditions: { candyType: 'Snickers' }
}

// Crash price of any candy at gym
{
  target: 'candy_price',
  operation: 'multiply',
  amount: 0.1, // 10% of original
  duration: 'one-time',
  conditions: { location: 'gym' }
}
```

### Time Jokers
```typescript
// Go back 1 period
{ target: 'period_count', operation: 'add', amount: -1, duration: 'one-time' }

// Skip forward 2 periods  
{ target: 'period_count', operation: 'add', amount: 2, duration: 'one-time' }
```

### Money Jokers
```typescript
// Gain $100 instantly
{ target: 'money', operation: 'add', amount: 100, duration: 'one-time' }

// Double all money (dangerous!)
{ target: 'money', operation: 'multiply', amount: 2, duration: 'one-time' }
```

### Special Ability Jokers
```typescript
// Always see hints
{ target: 'hint_chance', operation: 'set', amount: 1.0, duration: 'persistent' }

// Protect stash from confiscation
{ target: 'stash_protection', operation: 'enable', amount: 1, duration: 'persistent' }

// Immune to negative events
{ target: 'event_immunity', operation: 'enable', amount: 1, duration: 'persistent' }
```

## Migration from Old System

### Before (scattered logic):
```typescript
// In InventoryContext
const hasGeometricExpansion = jokers.some(j => j.effect === 'double_inventory_space');
return hasGeometricExpansion ? inventoryLimit * 2 : inventoryLimit;

// In GameContext  
const scoutJoker = jokers.find(j => j.name === 'Scout');
let hintChance = scoutJoker ? 1.0 : 0.25;

// In market logic
const priceMultiplier = getPriceMultiplier(candy.name);
const finalPrice = basePrice * priceMultiplier;
```

### After (centralized):
```typescript
const { getInventoryLimit, getHintChance, getCandyPrice } = useCentralizedJokers();

// All logic handled automatically
const actualLimit = getInventoryLimit(30);
const actualHintChance = getHintChance(0.25);
const actualPrice = getCandyPrice(basePrice, candy.name, currentPeriod);
```

## Advanced Features

### Conditional Effects
```typescript
// Only works on Snickers
conditions: { candyType: 'Snickers' }

// Only works in gym
conditions: { location: 'gym' }

// Only works on period 5
conditions: { period: 5 }

// Multiple conditions (ALL must match)
conditions: { 
  candyType: 'M&Ms', 
  location: 'cafeteria',
  period: 3 
}
```

### Multi-Effect Jokers
```typescript
{
  id: 200,
  name: 'Master Trader',
  description: 'Ultimate trading power',
  subject: 'Economy',
  effects: [
    { target: 'inventory_limit', operation: 'multiply', amount: 2, duration: 'persistent' },
    { target: 'candy_price', operation: 'multiply', amount: 1.5, duration: 'persistent' },
    { target: 'hint_chance', operation: 'set', amount: 1.0, duration: 'persistent' },
    { target: 'money', operation: 'add', amount: 200, duration: 'one-time' }
  ]
}
```

### Debugging
```typescript
const { effectEngine } = useCentralizedJokers();
console.log(effectEngine.getDebugInfo(currentPeriod));

// Output:
// Geometric Expansion (ID: 1, Active for: 5 periods)
//   - inventory_limit add 10
// Scout (ID: 4, Active for: 2 periods)  
//   - hint_chance set 1.0
```

## Testing New Jokers

1. **Create the joker definition**
2. **Add to STANDARDIZED_JOKERS array**  
3. **Test in debug mode**:
   ```typescript
   const testJoker = STANDARDIZED_JOKERS.find(j => j.id === yourJokerId);
   addJoker(testJoker);
   
   // Verify effects
   console.log('Inventory limit:', getInventoryLimit(30));
   console.log('Debug info:', effectEngine.getDebugInfo(currentPeriod));
   ```
4. **Verify persistence** (restart app, check if joker effects still work)

## Benefits Summary

✅ **Centralized**: All logic in one place  
✅ **Consistent**: Same format for all jokers  
✅ **Flexible**: Easy to add complex multi-effect jokers  
✅ **Maintainable**: Clear separation of concerns  
✅ **Debuggable**: Built-in logging and state inspection  
✅ **Performant**: Efficient effect resolution  
✅ **Extensible**: Easy to add new targets and operations  

The new system makes adding jokers as simple as defining the effect pattern and the engine handles everything else automatically!