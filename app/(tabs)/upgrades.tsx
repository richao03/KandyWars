// app/(tabs)/upgrades.tsx
import { StyleSheet, Text, View } from 'react-native';

export default function Upgrades() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Upgrades coming soon...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center'
  },
  text: {
    fontSize: 18, fontWeight: '500'
  }
});
