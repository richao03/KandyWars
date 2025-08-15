// app/(tabs)/upgrades.tsx
import { StyleSheet, Text, View } from 'react-native';
import GameHUD from '../components/GameHUD';
import { useGame } from '../../src/context/GameContext';

export default function Upgrades() {
  const { isAfterSchool, day } = useGame();
  
  return (
    <View style={[
      styles.container,
      isAfterSchool && styles.containerAfterSchool
    ]}>
      <GameHUD 
        theme={isAfterSchool ? "evening" : "school"}
        customHeaderText={isAfterSchool ? `After School - Day ${day}` : `School - Day ${day}`}
        customLocationText="Upgrades"
      />
      
      <View style={styles.content}>
        <Text style={[
          styles.text,
          isAfterSchool && styles.textAfterSchool
        ]}>⚡ Upgrades coming soon...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fefaf5',
  },
  containerAfterSchool: {
    backgroundColor: '#2a1845',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
  },
  textAfterSchool: {
    color: '#f7e98e',
    textShadowColor: 'rgba(247,233,142,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  }
});
