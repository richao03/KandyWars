import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface GraffitiHandwritingProps {
  onComplete?: () => void;
}

export default function GraffitiHandwriting({ onComplete }: GraffitiHandwritingProps) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, 1600);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Candy Warz</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#8B4513',
    fontFamily: 'Graffiti',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
});