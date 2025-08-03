// app/(tabs)/price-history.tsx
import { StyleSheet, Text, View } from 'react-native';

export default function PriceHistory() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Price history will live here!</Text>
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
