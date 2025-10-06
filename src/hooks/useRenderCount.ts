import { useEffect, useRef } from 'react';

/**
 * Hook to track how many times a component renders
 * Usage: useRenderCount('MyComponent');
 */
export function useRenderCount(componentName: string, enabled: boolean = __DEV__) {
  const renderCount = useRef(0);
  const startTime = useRef(Date.now());

  renderCount.current += 1;

  useEffect(() => {
    if (enabled) {
      const renderTime = Date.now() - startTime.current;
      console.log(
        `📊 [${componentName}] Render #${renderCount.current} (${renderTime}ms)`
      );
      startTime.current = Date.now();
    }
  });

  return renderCount.current;
}

/**
 * Hook to track why a component re-rendered
 * Shows which props/state changed
 */
export function useWhyDidYouUpdate(name: string, props: any, enabled: boolean = __DEV__) {
  const previousProps = useRef<any>();

  useEffect(() => {
    if (!enabled) return;

    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: any = {};

      allKeys.forEach((key) => {
        if (previousProps.current[key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current[key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length > 0) {
        console.log(`🔍 [${name}] Props changed:`, changedProps);
      }
    }

    previousProps.current = props;
  });
}
