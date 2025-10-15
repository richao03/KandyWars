# Event System Revamp Summary

## Changes Made

### 1. Event Generation (`utils/generateSeededGameData.tsx`)
**Complete rewrite** with new event system rules:

#### Event Structure
- **Days**: 8 periods per day, 5 days total (40 periods)
- **Blocked Periods**: No events in first period of each day (periods 1, 9, 17, 25, 33)
- **Major Events**: 1-3 per day (FOUND_MONEY, LOSE_MONEY, STASH_LOCKED)
  - 0-1 can be "universal" (period-only trigger, works anywhere)
  - Rest are location-based (require specific location visit)
- **Minor Events**: 0-3 per day (PRICE_SPIKE, PRICE_DROP)
  - Always location-based
  - No modals, only flavor text

#### New Features
- **Randomized Templates**: 5 variations each for hints, titles, and subtitles
- **Actor Pools**:
  - Teachers: "Mrs. Johnson", "Mr. Smith", "The Principal", "The Dean"
  - Bullies: "A bully", "The lunch thief", "Some tough kid"
  - Found money: "Somebody", "A student", "Someone"
- **Template Functions**: Dynamic text generation with/without location

#### Updated Interface
```typescript
export type SpecialEventEffect = {
  period: number;
  effect: 'PRICE_DROP' | 'PRICE_SPIKE' | 'FOUND_MONEY' | 'LOSE_MONEY' | 'STASH_LOCKED';

  // NEW REQUIRED FIELDS
  hint: string; // Pre-generated hint text
  isUniversal: boolean; // Universal vs location-based
  location?: string; // Required if isUniversal=false

  // Major event properties (modal display)
  category?: 'good' | 'neutral' | 'bad';
  heading?: string;
  title?: string;
  subtitle?: string;
  backgroundImage?: any;
  dismissText?: string;
  dollarAmount?: number;

  // Minor event properties (flavor text only)
  candy?: string;
  multiplier?: number;
  flavorText?: string; // NEW: Pre-generated flavor text for minor events
};
```

### 2. Event Triggering (`app/(tabs)/market.tsx`)
Updated event filtering and processing logic:

#### Changes
- **Universal Events**: Trigger at any location when period matches
- **Location Events**: Trigger only when both period and location match
- **Major Events**: Call `handleEvent()` to show modal
- **Minor Events**: Show `flavorText` only (no modal)
- **Multiple Hints**: Show all upcoming event hints concatenated with `\n\n`

#### Key Code
```typescript
// Universal events (isUniversal=true) trigger at any location
// Location-based events (isUniversal=false) require matching location
const currentEvent = gameData.periodEvents.find(
  (e) => e.period === periodCount + 1 && (e.isUniversal || e.location === currentLocation)
);

// Show hints for ALL upcoming events (Option 3: Hybrid)
const nextPeriodEvents = gameData.periodEvents.filter(
  (e) => e.period === periodCount + 2
);

// Minor events: flavor text only
if (currentEvent.effect === 'PRICE_SPIKE' || currentEvent.effect === 'PRICE_DROP') {
  setFlavorText(currentEvent.flavorText || '');
}
// Major events: modal
else {
  handleEvent(currentEvent);
}
```

### 3. Event Handler (`src/hooks/useEventHandler.ts`)
Added safety guard to prevent minor events from reaching handler:

```typescript
// Safety guard: Only handle major events
if (eventData.effect === 'PRICE_SPIKE' || eventData.effect === 'PRICE_DROP') {
  console.warn('⚠️ EVENT: Minor event should not reach handleEvent, use flavor text instead');
  return;
}
```

## Manual Testing Guide

### Test 1: Event Generation
1. Start a new game with any seed
2. Check console logs for event generation output:
   - Should see `📅 Day X, Period Y: EVENT_TYPE` logs
   - Should see `📊 Total events generated: X` summary
   - Major events: X count
   - Minor events: X count

### Test 2: Day Boundaries
1. Start a new game
2. Play through periods 1, 9, 17, 25, 33 (first period of each day)
3. **Expected**: No events should trigger in these periods
4. **Expected**: Only see "Morning Trade" or similar flavor text

### Test 3: Universal vs Location-Based Events
1. Play through the game
2. Universal events:
   - Should trigger regardless of location
   - Hint should mention location (e.g., "in cafeteria")
   - Modal should NOT mention location in title/subtitle
3. Location-based events:
   - Should only trigger when you visit the specified location
   - Hint should mention location
   - Modal should NOT mention location in title/subtitle

### Test 4: Major Events (Modals)
1. Look for major events: FOUND_MONEY, LOSE_MONEY, STASH_LOCKED
2. **Expected**: Full modal with:
   - Heading (🚨 BUSTED!, 💰 Lucky!, 💸 Robbed!)
   - Randomized title (e.g., "Mrs. Johnson confiscated your stash!")
   - Randomized subtitle
   - Background image
   - Dismiss button
3. **Expected**: Actual game effect applied (money added/removed, inventory cleared)

### Test 5: Minor Events (Flavor Text)
1. Look for minor events: PRICE_SPIKE, PRICE_DROP
2. **Expected**: NO modal
3. **Expected**: Only flavor text in marquee (e.g., "Snickers is spiking in cafeteria")
4. **Expected**: Price changes applied when buying/selling

### Test 6: Event Hints
1. Play through periods
2. **Expected**: Hints show for ALL upcoming events (not filtered by location)
3. **Expected**: Multiple hints can appear at once (separated by blank lines)
4. **Expected**: Hints respect joker effects (hint_chance modification)
5. **Expected**: 70% base chance to see hints

### Test 7: Event Count Limits
For each day (Days 1-5):
1. Count major events (FOUND_MONEY, LOSE_MONEY, STASH_LOCKED)
   - **Expected**: 1-3 per day
2. Count minor events (PRICE_SPIKE, PRICE_DROP)
   - **Expected**: 0-3 per day
3. Check for overlaps
   - **Expected**: No two events in same period

### Test 8: Text Variations
1. Play multiple games with different seeds
2. **Expected**: Different hints/titles/subtitles each time
3. **Expected**: 5 variations per event type observed over multiple runs

## Expected Console Logs

During event generation (when starting new game):
```
📅 Day 1, Period 3: STASH_LOCKED (Universal)
📅 Day 1, Period 5: FOUND_MONEY (cafeteria)
📅 Day 1, Period 7: PRICE_SPIKE - Snickers in gym
📊 Total events generated: 15
   Major events: 10
   Minor events: 5
```

During gameplay:
```
💡 Hint check - 2 events next period, baseChance: 0.7, effectiveChance: 0.7
💡 Showing hints for 2 events:
👀 Mrs. Johnson is doing inspections in library 👀

👀 Skittles is going to spike in library
```

```
🎯 MINOR EVENT: Showing flavor text only (no modal): Skittles is spiking in library
```

```
🎯 MAJOR EVENT: Triggering event modal for period 3: Mrs. Johnson confiscated your stash!
```

## Known Issues / Notes

- Pre-existing TypeScript errors in other files (not related to event system)
- Dev server package version warnings (not related to changes)
- Image loading in test environment requires React Native context

## Files Modified

1. ✅ `utils/generateSeededGameData.tsx` - Complete rewrite
2. ✅ `app/(tabs)/market.tsx` - Event triggering logic updated (lines 389-489)
3. ✅ `src/hooks/useEventHandler.ts` - Safety guard added (lines 27-32)

## Pending Tasks

- Review jokers that handle event hints/prediction (Scout, Predictor, etc.)
- Test with actual gameplay
- Verify joker interactions with new event system
