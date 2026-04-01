import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTutorial } from '../../src/hooks/useTutorial';

interface FirstTimeHintProps {
  hintKey: string;
  message: string;
  autoDismissMs?: number;
}

export default function FirstTimeHint({
  hintKey,
  message,
  autoDismissMs = 8000,
}: FirstTimeHintProps) {
  const { showHint, dismissHint } = useTutorial();
  const opacity = useRef(new Animated.Value(0)).current;
  const visible = showHint(hintKey);

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => dismissHint(hintKey));
      }, autoDismissMs);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  const handleDismiss = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => dismissHint(hintKey));
  };

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.banner}>
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
          <Text style={styles.dismissText}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
  },
  banner: {
    backgroundColor: '#1a1a2e',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  message: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'PixeloidMono',
    flex: 1,
    lineHeight: 18,
  },
  dismissButton: {
    marginLeft: 10,
    padding: 4,
  },
  dismissText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
  },
});
