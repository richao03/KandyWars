# 🔥 Firebase Scoreboard Setup Guide

Your CandyWarz beta testing scoreboard is ready! Follow these steps to connect it to Firebase.

## 📋 Quick Setup Checklist

- [ ] Create Firebase project
- [ ] Enable Firestore database
- [ ] Configure authentication
- [ ] Set up security rules
- [ ] Update Firebase config
- [ ] Add ScoreboardProvider to app
- [ ] Test the integration

## 🚀 Step-by-Step Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Name it `candywarz-beta` (or your preferred name)
4. Enable Google Analytics (recommended for beta testing)
5. Create the project

### 2. Enable Firestore Database

1. In your project, go to **Firestore Database**
2. Click "Create database"
3. Choose **Start in test mode** (we'll add security rules later)
4. Select a location (choose closest to your beta testers)

### 3. Enable Authentication

1. Go to **Authentication** > **Sign-in method**
2. Enable **Anonymous** authentication
3. This allows beta testers to submit scores without creating accounts

### 4. Get Firebase Configuration

1. Go to **Project settings** (gear icon)
2. Scroll down to "Your apps"
3. Click **Web app** icon (`</>`)
4. Register app as "CandyWarz Beta"
5. Copy the `firebaseConfig` object

### 5. Update Firebase Config

Replace the placeholder config in `src/services/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com", 
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### 6. Create Database Indexes

**IMPORTANT: You must create these indexes for the scoreboard to work!**

Go to **Firestore Database** > **Indexes** > **Composite** and create these indexes:

**Index 1: For difficulty + finalBalance queries**
- Collection ID: `scoreboard`
- Fields to index:
  1. `difficulty` - Ascending
  2. `finalBalance` - Descending
  3. `__name__` - Ascending

**Index 2: For difficulty + jokersCollected queries** 
- Collection ID: `scoreboard`
- Fields to index:
  1. `difficulty` - Ascending  
  2. `jokersCollected` - Descending
  3. `__name__` - Ascending

**Index 3: For difficulty + minigamesPlayed queries**
- Collection ID: `scoreboard` 
- Fields to index:
  1. `difficulty` - Ascending
  2. `minigamesPlayed` - Descending  
  3. `__name__` - Ascending

**Index 4: For difficulty + totalPeriodsPlayed queries**
- Collection ID: `scoreboard`
- Fields to index:
  1. `difficulty` - Ascending
  2. `totalPeriodsPlayed` - Descending
  3. `__name__` - Ascending

**Quick Setup:** Click this auto-generated link to create the main index:
https://console.firebase.google.com/v1/r/project/candywarz-6fea9/firestore/indexes?create_composite=ClJwcm9qZWN0cy9jYW5keXdhcnotNmZlYTkvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3Njb3JlYm9hcmQvaW5kZXhlcy9fEAEaDgoKZGlmZmljdWx0eRABGhAKDGZpbmFsQmFsYW5jZRACGgwKCF9fbmFtZV9fEAI

### 7. Set Up Security Rules

Go to **Firestore Database** > **Rules** and use these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to scoreboard for all users
    match /scoreboard/{document} {
      allow read: if true;
      
      // Allow authenticated users to create their own scores
      allow create: if request.auth != null 
        && request.auth.uid == request.resource.data.playerId
        && validateScoreData(request.resource.data);
    }
    
    // Allow read access to player_stats for all users
    match /player_stats/{document} {
      allow read: if true;
      
      // Allow authenticated users to create their own stats
      allow create: if request.auth != null 
        && request.auth.uid == request.resource.data.playerId
        && validateStatsData(request.resource.data);
    }
  }
}

function validateScoreData(data) {
  return data.keys().hasAll([
    'playerId', 'playerName', 'difficulty', 'finalBalance', 'daysPlayed',
    'totalProfit', 'candiesSold', 'jokersCollected', 'minigamesPlayed', 
    'totalPeriodsPlayed', 'completionTime', 'gameVersion', 'deviceInfo'
  ])
    && data.difficulty in ['easy', 'medium', 'hard']
    && data.finalBalance is number
    && data.daysPlayed is number && data.daysPlayed >= 1
    && data.totalProfit is number
    && data.candiesSold is number && data.candiesSold >= 0
    && data.jokersCollected is number && data.jokersCollected >= 0
    && data.minigamesPlayed is number && data.minigamesPlayed >= 0
    && data.totalPeriodsPlayed is number && data.totalPeriodsPlayed >= 0
    && data.completionTime is number && data.completionTime >= 0
    && data.playerName is string && data.playerName.size() <= 50
    && data.gameVersion is string
    && data.deviceInfo is string;
}

function validateStatsData(data) {
  return data.keys().hasAll(['playerId', 'playerName', 'action'])
    && data.playerId is string
    && data.playerName is string && data.playerName.size() <= 50
    && data.action in ['joker_used', 'game_completed', 'minigame_played', 'daily_periods'];
}
```

### 7. Add ScoreboardProvider to Your App

Update your main app file (likely `app/_layout.tsx` or `App.tsx`):

```typescript
import { ScoreboardProvider } from '../src/context/ScoreboardContext';

export default function Layout() {
  return (
    <ScoreboardProvider>
      {/* Your existing providers */}
      <YourAppContent />
    </ScoreboardProvider>
  );
}
```

### 8. Add Scoreboard Button to Game

Example integration in your game UI:

```typescript
import { useState } from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { ScoreboardModal } from '../components/ScoreboardModal';

export default function GameScreen() {
  const [showScoreboard, setShowScoreboard] = useState(false);

  return (
    <View>
      {/* Your game UI */}
      
      <TouchableOpacity 
        onPress={() => setShowScoreboard(true)}
        style={styles.scoreboardButton}
      >
        <Text>🏆 Leaderboard</Text>
      </TouchableOpacity>

      <ScoreboardModal
        visible={showScoreboard}
        onClose={() => setShowScoreboard(false)}
      />
    </View>
  );
}
```

## 🎯 Beta Testing Features

### Automatic Score Tracking
- **Final Balance**: Total money (balance + piggy bank)
- **Days Played**: How long the game lasted
- **Difficulty**: Easy/Medium/Hard mode
- **Completion Time**: How long they played
- **Jokers Collected**: Number of jokers obtained
- **Device Info**: Platform and version for debugging

### Privacy Controls
Beta testers can control:
- ✅ **Share Scores** - Appear on leaderboard
- ✅ **Share Name** - Show name vs "Anonymous"
- ✅ **Share Strategies** - Help with game balance analysis
- ✅ **Analytics** - Anonymous gameplay data collection

### Real-time Updates
- Scores update automatically every 30 seconds
- See rankings change in real-time
- Beta testing statistics for all players

## 🔒 Security & Privacy

### Data Collection
Only collects:
- Game performance data (scores, play time)
- Device info (iOS/Android version)
- Gameplay patterns (for balancing)
- Anonymous user IDs

### No Personal Data
- No email, phone, or personal info required
- Anonymous authentication only
- Users control what data to share

### Beta Testing Focus
- Data used only for game improvement
- Helps identify balance issues
- Tracks completion rates and difficulty

## 🧪 Testing Your Setup

### 1. Test Score Submission
1. Play a game to completion
2. Open scoreboard modal
3. Submit your score
4. Check Firebase console for the data

### 2. Test Leaderboard Display
1. Submit a few test scores
2. Refresh the leaderboard
3. Verify scores appear correctly

### 3. Test Privacy Settings
1. Toggle privacy settings
2. Submit scores with different settings
3. Verify data respects privacy choices

## 🔧 Troubleshooting

### "Firebase not initialized"
- Check your Firebase config is correct
- Ensure you added ScoreboardProvider
- Verify internet connection

### "Permission denied"
- Check Firestore security rules
- Ensure anonymous auth is enabled
- Verify user is authenticated

### Scores not appearing
- Check Firebase console for data
- Verify Firestore rules allow reads
- Check for JavaScript errors in console

## 📊 Monitoring Beta Testing

### Firebase Console
- **Firestore**: View submitted scores
- **Analytics**: User engagement data
- **Authentication**: Anonymous user count

### Useful Queries
```javascript
// Top scores by difficulty
db.collection('scoreboard')
  .where('difficulty', '==', 'hard')
  .orderBy('finalBalance', 'desc')
  .limit(10)

// Recent submissions
db.collection('scoreboard')
  .orderBy('timestamp', 'desc')
  .limit(50)
```

## 🎉 You're Ready!

Your beta testing scoreboard is now set up with:

✅ **Real-time leaderboards** for competitive testing  
✅ **Privacy controls** for user comfort  
✅ **Analytics dashboard** for game balance insights  
✅ **Secure data collection** with proper permissions  
✅ **Cross-platform support** for iOS and Android  

Beta testers can now compete while helping you improve CandyWarz! 🍭🎮