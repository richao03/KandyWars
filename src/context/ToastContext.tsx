import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface ToastItem {
  id: number;
  message: string;
  opacity: Animated.Value;
}

interface ToastContextType {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((message: string) => {
    const id = nextId.current++;
    const opacity = new Animated.Value(0);

    setToasts((prev) => [...prev, { id, message, opacity }]);

    // Fade in
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Fade out after 2 seconds, then remove
    setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      });
    }, 2000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={styles.container} pointerEvents="none">
        {toasts.map((toast, index) => (
          <Animated.View
            key={toast.id}
            style={[
              styles.toast,
              {
                opacity: toast.opacity,
                transform: [
                  {
                    translateY: toast.opacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-10, 0],
                    }),
                  },
                ],
                marginBottom: 4,
              },
            ]}
          >
            <Text style={styles.toastText}>{toast.message}</Text>
          </Animated.View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    backgroundColor: 'rgba(26, 26, 46, 0.92)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d4af37',
    maxWidth: '80%',
  },
  toastText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
});
