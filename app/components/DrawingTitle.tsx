import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface DrawingTitleProps {
  onComplete?: () => void;
}

export default function DrawingTitle({ onComplete }: DrawingTitleProps) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, 1500);

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
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
});