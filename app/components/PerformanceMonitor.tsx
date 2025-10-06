import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface PerformanceMonitorProps {
  componentName: string;
  enabled?: boolean;
}

/**
 * Component to monitor render performance
 * Wrap around components you want to track
 */
const PerformanceMonitor: React.FC<React.PropsWithChildren<PerformanceMonitorProps>> = ({
  componentName,
  enabled = __DEV__,
  children,
}) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const renderTimes = useRef<number[]>([]);

  useEffect(() => {
    if (!enabled) return;

    renderCount.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;

    renderTimes.current.push(timeSinceLastRender);

    // Keep only last 10 render times
    if (renderTimes.current.length > 10) {
      renderTimes.current.shift();
    }

    const avgRenderTime =
      renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length;

    console.log(
      `🔄 [${componentName}] Render #${renderCount.current} | Time since last: ${timeSinceLastRender}ms | Avg: ${avgRenderTime.toFixed(1)}ms`
    );
  });

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      {children}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {componentName}: {renderCount.current}
        </Text>
      </View>
    </View>
  );
};

export default PerformanceMonitor;

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 4,
    borderRadius: 4,
    zIndex: 1000,
  },
  badgeText: {
    color: '#00ff00',
    fontSize: 10,
    fontFamily: 'Courier',
  },
});
