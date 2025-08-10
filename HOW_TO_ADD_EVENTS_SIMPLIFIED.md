# How to Add Events (Simplified System)

The event system has been greatly simplified! All event properties are now stored directly in your gameData, eliminating the need for a separate EventRegistry system.

## ✅ What Changed

**BEFORE** (Complex):
- EventRegistry system with separate files
- EventDefinition types and mapping
- Complex context management 
- Multiple imports and registrations

**AFTER** (Simple):
- All event properties stored directly in `SpecialEventEffect` in gameData
- Single source of truth
- Default fallbacks handled automatically
- Much less code!

## 🎯 How to Add New Events

### Option 1: Add Event Properties to Existing gameData Events

When your `generateSeededGameData` function creates events, you can now include modal properties directly:

```typescript
// In your game data generation
const specialEvent: SpecialEventEffect = {
  period: 5,
  effect: 'STASH_LOCKED',
  location: 'home room',
  description: 'Teachers found your stash!', // This is used as fallback subtitle
  
  // NEW: Add these modal properties directly
  category: 'bad',
  heading: '🚨 BUSTED!',
  title: 'Teachers Found Your Stash',
  subtitle: 'Sometimes it be your own teachers...\nYour candy inventory has been confiscated!',
  backgroundImage: require('../assets/images/confiscate.png'),
  dismissText: '😤 Dang it!',
  callback: () => {
    // Your custom logic here
    console.log('Custom callback executed!');
  }
};
```

### Option 2: Rely on Smart Defaults

If you don't specify modal properties, the system provides intelligent defaults based on the `effect` type:

```typescript
// Minimal event - defaults will be applied automatically
const simpleEvent: SpecialEventEffect = {
  period: 10,
  effect: 'PRICE_SPIKE',
  location: 'science lab',
  description: 'Prices are going up!',
  // category, heading, title, etc. will be auto-generated
};
```

**Auto-generated defaults:**
- `STASH_LOCKED` → Bad category, red theme, confiscate image, inventory clearing callback
- `PRICE_SPIKE` → Good category, green theme, positive messaging  
- `PRICE_DROP` → Neutral category, gray theme, informational messaging
- `resale_bonus` → Good category, green theme, profit messaging

### Option 3: Mix Custom and Default Properties

```typescript
const customEvent: SpecialEventEffect = {
  period: 15,
  effect: 'PRICE_SPIKE',
  location: 'cafeteria',
  description: 'Lunch rush demand!',
  
  // Override just the properties you want to customize
  heading: '🍕 LUNCH RUSH!',
  title: 'Pizza Day Boost',
  backgroundImage: require('../assets/images/cafeteria.png'),
  // category, dismissText, etc. will use defaults for PRICE_SPIKE
};
```

## 📊 Available Properties

All these properties are optional in your `SpecialEventEffect`:

```typescript
export type SpecialEventEffect = {
  // Existing game logic properties
  period: number;
  effect: 'PRICE_DROP' | 'PRICE_SPIKE' | 'resale_bonus' | 'STASH_LOCKED';
  location?: string;
  description: string;
  // ... other existing properties

  // NEW: Optional modal properties
  category?: 'good' | 'neutral' | 'bad';        // Theme color (auto-detected if not set)
  heading?: string;                              // Large heading with emoji
  title?: string;                                // Main title text
  subtitle?: string;                             // Detailed description (falls back to 'description')
  backgroundImage?: any;                         // Background image (require('path/to/image.png'))
  dismissText?: string;                          // Button text
  callback?: () => void;                         // Function to execute when dismissed
};
```

## 🎨 Event Categories & Themes

### Good Events (Green Theme)
- `category: 'good'`
- Use for: Price spikes, bonuses, lucky finds
- Colors: Green buttons, positive messaging

### Neutral Events (Gray Theme)  
- `category: 'neutral'`
- Use for: Information, price drops, general news
- Colors: Gray buttons, neutral messaging

### Bad Events (Red Theme)
- `category: 'bad'`
- Use for: Confiscations, penalties, setbacks  
- Colors: Red buttons, warning messaging

## 🔧 Complete Example

Here's how you might modify your game data generation to include rich event experiences:

```typescript
// In generateSeededGameData.tsx
const createRichEvent = (period: number): SpecialEventEffect => {
  return {
    period,
    effect: 'STASH_LOCKED',
    location: 'home room',
    description: 'Your stash was discovered!',
    
    // Rich modal experience
    category: 'bad',
    heading: '🚨 BUSTED BY MRS. JOHNSON!',
    title: 'Your Secret Stash Discovered',
    subtitle: 'Mrs. Johnson found your candy stash behind the radiator!\nAll inventory has been confiscated.',
    backgroundImage: require('../assets/images/busted.png'),
    dismissText: '😭 Not again!',
    callback: () => {
      // Custom callback for this specific event
      console.log('Mrs. Johnson strikes again!');
      // Could trigger additional game effects here
    }
  };
};
```

## ✨ Benefits of the Simplified System

1. **Single Source of Truth**: All event data in one place
2. **No Complex Setup**: No registries, no imports, no mapping
3. **Smart Defaults**: System provides sensible fallbacks automatically  
4. **Easy Customization**: Override only what you need
5. **Less Code**: Removed hundreds of lines of boilerplate
6. **Better Performance**: No context switching or registry lookups

## 🚀 Quick Start

1. Find where your game generates `SpecialEventEffect` objects
2. Add any of the new optional modal properties  
3. Test your event - defaults will fill in the rest!

That's it! The system is now much simpler while being just as powerful and extensible.