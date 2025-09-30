# Emoji Migration Plan - CandyWarz

## Overview
This document tracks the migration of text emojis to PNG images across the CandyWarz codebase to ensure consistent cross-platform rendering and better visual quality.

## Migration Status Summary
- **Total emojis in codebase**: 101
- **Already mapped**: 48 (47.5%)
- **Need mapping**: 53 (52.5%)
- **Migration system**: TextWithEmojis component + EMOJI_TO_IMAGE_MAP in eventImages.ts

## ✅ Already Mapped Emojis (48)

These emojis have been successfully mapped to PNG files:

### UI & Navigation
- 👀 → eyes.png
- 🏠 → home.png
- ⚙️ → gear.png
- 🔧 → gear.png (shares with ⚙️)
- ❌ → x.png
- 🎨 → palette.png
- ⚡ → lightning.png
- 🌙 → moon.png
- 🚪 → door.png
- ⚠️ → warning.png

### Game & Activities
- 🃏 → joker.png
- 🎯 → bullseye.png
- 🎮 → controller.png
- 🏆 → trophy.png
- 🎉 → celebrate.png
- 🎲 → dice.png

### Stats & Data
- 📊 → chart.png
- 📈 → chart.png (shares with 📊)

### Currency & Items
- 💰 → money.png
- 💸 → moneyWithWings.png
- 🎒 → backpack.png

### Food & Candy
- 🍭 → lollipop.png
- 🍬 → candy.png
- 🧁 → cupcake.png
- 🍫 → chocolate.png
- 🍩 → donut.png
- 🍪 → cookie.png
- 🍰 → sliceOfCake.png
- 🎂 → birthdayCake.png
- 🍊 → orange.png
- 🍓 → strawberry.png
- 🍇 → grapes.png
- 🍉 → watermelon.png
- 🍒 → cherry.png
- 🥧 → pie.png

### Characters & Objects
- 🏃‍♂️ → student.png
- 🐴 → horse.png
- 🗣️ → talkingHead.png
- 📰 → newspaper.png

### Time & Nature
- ⏱️ → clock.png
- 🕘 → clock.png (shares with ⏱️)
- 🌅 → sunrise.png

### Special Joker Emojis
- 🔮 → crystalball.png
- 🏔️ → mountain.png
- 🎭 → theaterMask.png
- ⚖️ → scale.png

## ❌ Unmapped Emojis Requiring PNG Files (53)

### Priority 1 - Frequently Used in UI (HIGH PRIORITY)
These emojis appear frequently in the user interface and should be migrated first:

- **❤️** - Heart (story screen, art game)
- **🔄** - Refresh/Reset (settings, game restart)
- **🗑️** - Trash (settings, clear data)
- **📦** - Package box (inventory, bulk sales)
- **🎖️** - Medal (hall pass bonus)
- **🗺️** - Map (geography game, trade routes)
- **💡** - Light bulb (ideas, hints)
- **📚** - Books (study, school)
- **🏫** - School building
- **🛒** - Shopping cart (market)
- **🐷** - Pig face (piggy bank)
- **✅** - Check mark (success, completion)
- **🔥** - Fire (hot items, streaks)

### Priority 2 - Game Mechanics & Jokers (MEDIUM PRIORITY)
Used in gameplay mechanics and joker effects:

- **💎** - Diamond (diamond hands joker)
- **🚀** - Rocket (to the moon flavor text)
- **💪** - Muscle (strength, power)
- **🏛️** - Bank/Institution
- **🏦** - Bank
- **🏪** - Store
- **🤝** - Handshake (trade)
- **📉** - Chart down
- **⛹️** - Bouncing ball (swingset joker)
- **🏃** - Running (without gender modifier)
- **🎓** - Graduation cap
- **🎊** - Confetti
- **🎁** - Gift
- **🏷️** - Price tag
- **🌟** - Star
- **🍀** - Four leaf clover

### Priority 3 - Minigames & Special Features (LOWER PRIORITY)
Used in specific minigames or special contexts:

- **⌨️** - Keyboard (computer game)
- **💻** - Computer
- **🖥️** - Desktop computer
- **📱** - Mobile phone
- **📺** - TV
- **🕹️** - Joystick
- **🎬** - Movie clapper
- **🎧** - Headphones
- **🖌️** - Paintbrush
- **🖼️** - Picture frame
- **👁️** - Eye
- **🧠** - Brain
- **📖** - Book
- **📡** - Satellite
- **🔋** - Battery
- **🔌** - Plug
- **🪙** - Coin

### Priority 4 - Emotions & Faces (OPTIONAL)
Emotion emojis that might be kept as text:

- **😤** - Huffing face
- **😩** - Weary face
- **😴** - Sleeping face
- **🙌** - Raising hands

### Priority 5 - Symbols & Indicators (OPTIONAL)
Basic symbols that work well as text:

- **⏰** - Alarm clock
- **⏳** - Hourglass
- **✏️** - Pencil
- **✓** - Check mark (simple)
- **✕** - X mark (simple)
- **✨** - Sparkles
- **❓** - Question mark
- **➡️** - Right arrow
- **⬅️** - Left arrow
- **⬆️** - Up arrow
- **⬇️** - Down arrow
- **▲** - Triangle up
- **▼** - Triangle down
- **●** - Circle
- **🔴** - Red circle
- **🔵** - Blue circle
- **🟡** - Yellow circle
- **🟢** - Green circle
- **🔍** - Magnifying glass
- **🔒** - Lock
- **🔙** - Back arrow

### Special Multi-Character Emojis
- **🧑‍🍳** - Chef (uses ZWJ sequence)
- **🧑** - Person

### Animals & Characters
- **🐎** - Horse face
- **🐕** - Dog
- **👑** - Crown
- **💀** - Skull

### Miscellaneous Items
- **🍳** - Cooking egg
- **🍮** - Custard
- **🍯** - Honey pot
- **💾** - Floppy disk
- **💿** - CD/DVD
- **🚨** - Siren
- **🛰️** - Satellite
- **🥇** - First place medal
- **🥈** - Second place medal
- **🥉** - Third place medal
- **💔** - Broken heart
- **💥** - Explosion

## Implementation Strategy

### Phase 1: Critical UI Elements (Week 1)
1. Create PNG files for Priority 1 emojis
2. Add mappings to eventImages.ts
3. Update components using these emojis
4. Test across all screens

### Phase 2: Game Mechanics (Week 2)
1. Create PNG files for Priority 2 emojis
2. Focus on joker-related emojis
3. Update market and trading interfaces
4. Test game mechanics thoroughly

### Phase 3: Minigames (Week 3)
1. Create PNG files for Priority 3 emojis
2. Update each minigame individually
3. Test minigame functionality

### Phase 4: Optional Elements (Week 4)
1. Evaluate which Priority 4-5 emojis need conversion
2. Some simple symbols may remain as text
3. Create PNGs only where visual consistency is needed

## Technical Implementation

### Current System
- **Component**: TextWithEmojis.tsx
- **Mapping**: EMOJI_TO_IMAGE_MAP in eventImages.ts
- **Image Location**: /assets/images/emojis/
- **Usage**: Replace `<Text>` with `<TextWithEmojis>` where emojis appear

### Adding New Emoji Mappings
1. Add PNG file to `/assets/images/emojis/`
2. Import in eventImages.ts: `emojiName: require('../assets/images/emojis/emojiName.png')`
3. Add to EMOJI_TO_IMAGE_MAP: `'emoji': 'emojiName'`
4. Update components to use TextWithEmojis

### Special Cases
- **Direct Image rendering**: Game grids (GymGame, etc.) use Image component directly
- **Modal messages**: Already use TextWithEmojis via ConfirmationModal
- **Console.log**: No changes needed (not visible to users)
- **Copilot tutorials**: Handled separately by react-native-copilot

## Files Most Affected

### High Impact Files (10+ emojis)
- `/app/(tabs)/market.tsx`
- `/app/(tabs)/jokers.tsx`
- `/app/(tabs)/settings.tsx`
- `/app/minigames/[various].tsx`
- `/src/utils/jokerEffectEngine.ts`

### Components Already Using TextWithEmojis
- ConfirmationModal
- GameModal
- MinigameHUD
- TransactionModal
- Most tab screens

## Testing Checklist
- [ ] All emojis render as images on iOS
- [ ] All emojis render as images on Android
- [ ] Image sizes are consistent
- [ ] No performance degradation
- [ ] Fallback to text if image fails to load
- [ ] Dark mode compatibility
- [ ] All modals display correctly
- [ ] Minigames function properly

## Notes
- Some emojis like simple arrows (➡️⬅️⬆️⬇️) might be kept as text for simplicity
- Emotion emojis (😤😩😴) are rarely used and low priority
- Focus on emojis that represent game items, currency, and actions
- Console.log emojis don't need conversion (developer-only)