# Pixel Border Migration Guide

## How to Replace Borders Throughout the App

### 1. Import the Components

Add this import to any file that needs pixel borders:

```tsx
import { GamePixelBorder, GamePixelButton, GamePixelCard } from '../components/GamePixelBorder';
```

### 2. Replace Section/Card Styles

#### Before:
```tsx
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Title</Text>
  {/* content */}
</View>
```

Where `styles.section` has:
```tsx
section: {
  marginBottom: 30,
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  borderRadius: 16,
  padding: 20,
  borderWidth: 2,
  borderColor: '#d4a574',
}
```

#### After:
```tsx
<GamePixelCard
  borderColor="#d4a574"
  backgroundColor="rgba(255, 255, 255, 0.8)"
  style={{ marginBottom: 30 }}
>
  <Text style={styles.sectionTitle}>Title</Text>
  {/* content */}
</GamePixelCard>
```

### 3. Replace Button Styles

#### Before:
```tsx
<TouchableOpacity
  style={[styles.button, styles.dangerButton]}
  onPress={handleAction}
>
  <Text style={styles.dangerButtonText}>Button Text</Text>
</TouchableOpacity>
```

#### After:
```tsx
<GamePixelButton
  borderColor="#ef4444"
  backgroundColor="#fee2e2"
  textColor="#dc2626"
  onPress={handleAction}
  style={styles.button}
>
  Button Text
</GamePixelButton>
```

### 4. Color Mapping Guide

Replace these common border color combinations:

| Original Style | Border Color | Background Color | Text Color |
|---------------|--------------|------------------|------------|
| titleScreenButton | #3b82f6 | #dbeafe | #1d4ed8 |
| dangerButton | #ef4444 | #fee2e2 | #dc2626 |
| leaderboardButton | #fbbf24 | #f3e8ff | #7c2d93 |
| clearDataButton | #660000 | #8b0000 | #ffffff |
| saveButton | #4a7c4a | #d4f6d4 | #2d5a2d |
| cancelButton | #ef4444 | #fee2e2 | #dc2626 |
| editNameButton | #5c7cb8 | #d6e8ff | #4a5a8a |

### 5. Replace Modal Borders

#### Before:
```tsx
<View style={styles.modalContent}>
  {/* content */}
</View>
```

Where `styles.modalContent` has:
```tsx
modalContent: {
  backgroundColor: 'white',
  borderRadius: 20,
  padding: 20,
  borderWidth: 3,
  borderColor: '#d4a574',
}
```

#### After:
```tsx
<GamePixelCard
  borderColor="#d4a574"
  backgroundColor="white"
>
  {/* content */}
</GamePixelCard>
```

### 6. Replace Input Borders

#### Before:
```tsx
<TextInput
  style={styles.input}
  // other props
/>
```

Where `styles.input` has:
```tsx
input: {
  borderWidth: 2,
  borderColor: '#d4a574',
  borderRadius: 8,
  backgroundColor: '#fef7e7',
  padding: 12,
}
```

#### After:
```tsx
<GamePixelBorder
  borderColor="#d4a574"
  backgroundColor="#fef7e7"
>
  <TextInput
    style={styles.inputNoBorder}
    // other props
  />
</GamePixelBorder>
```

### 7. Files to Update

Priority files for border replacement:

#### High Priority (User-facing screens):
- [x] `/app/(tabs)/settings.tsx` - Game settings
- [ ] `/app/title-settings.tsx` - Title screen settings
- [ ] `/app/leaderboard.tsx` - Leaderboard
- [ ] `/app/(tabs)/market.tsx` - Market screen
- [ ] `/app/(tabs)/after-school.tsx` - After school screen
- [ ] `/app/(tabs)/jokers.tsx` - Jokers screen

#### Medium Priority (Modals):
- [ ] `/app/components/GameEndModal.tsx`
- [ ] `/app/components/InventoryModal.tsx`
- [ ] `/app/components/DayStatsModal.tsx`
- [ ] `/app/components/ConfirmationModal.tsx`
- [ ] `/app/components/TransactionModal.tsx`
- [ ] `/app/components/StudyModal.tsx`

#### Low Priority (Minigames):
- [ ] `/app/minigames/MathGame.tsx`
- [ ] `/app/minigames/ArtGame.tsx`
- [ ] `/app/minigames/ComputerGame.tsx`
- [ ] `/app/minigames/EconomyGame.tsx`
- [ ] `/app/minigames/GymGame.tsx`
- [ ] `/app/minigames/HistoryGame.tsx`
- [ ] `/app/minigames/HomeEcGame.tsx`
- [ ] `/app/minigames/LogicGame.tsx`
- [ ] `/app/minigames/RecessGame.tsx`

### 8. Testing Checklist

After replacing borders, test:
- [ ] Visual appearance on iOS
- [ ] Visual appearance on Android
- [ ] Touch/press interactions work
- [ ] Disabled states display correctly
- [ ] Dark mode compatibility (if applicable)
- [ ] Performance (no lag or jank)

### 9. Style Cleanup

After migration, you can remove these style properties:
- `borderWidth`
- `borderColor`
- `borderRadius`
- `borderTopWidth`, `borderBottomWidth`, etc.
- `shadowColor`, `shadowOffset` (if using GamePixelCard)

Keep these properties:
- `margin`, `marginTop`, etc.
- `width`, `height`
- `flex` properties
- Text styles

### 10. Example Complete Migration

Here's a complete before/after for a settings button:

#### Before:
```tsx
<TouchableOpacity
  style={[styles.button, styles.leaderboardButton]}
  onPress={() => router.push('/leaderboard')}
>
  <Text style={styles.leaderboardButtonText}>
    🏆 View Leaderboard & Stats
  </Text>
  <Text style={styles.buttonSubtext}>
    See your personal stats, achievements, and global rankings
  </Text>
</TouchableOpacity>
```

With styles:
```tsx
button: {
  padding: 16,
  borderRadius: 12,
  alignItems: 'center',
  marginBottom: 10,
},
leaderboardButton: {
  backgroundColor: '#f3e8ff',
  borderWidth: 2,
  borderColor: '#fbbf24',
},
leaderboardButtonText: {
  fontSize: 16,
  fontWeight: '700',
  color: '#7c2d93',
  marginBottom: 4,
},
```

#### After:
```tsx
<GamePixelButton
  borderColor="#fbbf24"
  backgroundColor="#f3e8ff"
  onPress={() => router.push('/leaderboard')}
  style={{ marginBottom: 10 }}
>
  <View style={{ alignItems: 'center' }}>
    <Text style={styles.leaderboardButtonText}>
      🏆 View Leaderboard & Stats
    </Text>
    <Text style={styles.buttonSubtext}>
      See your personal stats, achievements, and global rankings
    </Text>
  </View>
</GamePixelButton>
```

With reduced styles:
```tsx
leaderboardButtonText: {
  fontSize: 16,
  fontWeight: '700',
  color: '#7c2d93',
  marginBottom: 4,
  textAlign: 'center',
},
buttonSubtext: {
  fontSize: 12,
  color: '#6b5b73',
  fontStyle: 'italic',
  textAlign: 'center',
},
```