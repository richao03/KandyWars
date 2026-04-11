import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

interface ExactFontHandwritingProps {
  onAnimationComplete?: () => void;
  onSugarComplete?: () => void;
}

export default function ExactFontHandwriting({
  onAnimationComplete,
  onSugarComplete,
}: ExactFontHandwritingProps) {
  const [currentLetter, setCurrentLetter] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fillProgress, setFillProgress] = useState(0);
  const [sugarCompleted, setSugarCompleted] = useState(false);
  const sugarCallbackTriggered = useRef(false);
  const animationCompleted = useRef(false);
  const animationStarted = useRef(false);

  // Exact DonGraffiti font paths from the provided SVGs
  const exactPaths = {
    S: {
      path: 'M 46.806 47.346 C 43.645 36.56 35.189 32.159 25.946 27.384 C 21.017 24.837 5.795 17.751 10.905 9.39 C 15.617 1.678 26.017 20.034 28.131 24.904 C 28.21 25.565 28.607 26.081 29.225 26.459 C 29.32 26.525 29.434 26.573 29.54 26.632 C 29.607 26.663 29.666 26.703 29.737 26.734 C 31.902 27.75 35.791 27.281 37.641 25.754 C 37.677 25.726 37.72 25.699 37.756 25.671 C 37.854 25.581 37.933 25.486 38.019 25.388 C 38.456 24.912 38.744 24.36 38.752 23.711 C 38.854 16.783 39.995 9.724 42.476 3.225 C 44.027 -0.833 33.445 -1.07 32.056 2.564 C 31.233 4.725 30.595 6.969 30.04 9.24 C 24.316 2.871 16.66 -1.495 8.243 1.497 C -1.212 4.859 -2.216 15.224 3.638 22.388 C 8.818 28.726 16.79 30.478 23.568 34.363 C 35.354 41.118 40.503 53.715 35.358 66.899 C 31.961 75.598 19.793 83.235 13.215 72.819 C 11.023 69.347 10.621 64.446 10.956 60.451 C 11.29 56.455 12.928 47.039 18.943 47.669 C 26.001 48.409 19.313 59.427 16.825 61.761 C 13.255 65.111 23.62 66.422 26.292 63.915 C 40.204 50.873 25.348 34.812 9.972 43.295 C -5.794 51.991 -1.854 79.011 14.699 84.188 C 36.126 90.896 52.435 66.576 46.806 47.346 Z',
      length: 950,
    },
    u: {
      path: 'M 38.462 67.292 C 34.03 49.609 33.553 30.304 37.474 12.543 C 37.785 11.13 36.947 10.173 35.62 9.638 C 35.608 9.634 35.597 9.63 35.585 9.626 C 35.333 9.527 35.069 9.441 34.79 9.37 C 31.821 8.626 27.436 9.547 26.936 11.878 C 23.692 27.041 19.772 43.189 11.269 56.408 C 11.178 56.553 11.068 56.687 10.974 56.833 C 11.808 38.819 16.256 20.428 20.957 3.382 C 22.165 -1.003 11.446 -1.015 10.418 2.713 C 4.699 23.471 -0.785 46.539 0.093 68.237 C 0.195 70.784 4.565 71.394 7.71 70.441 C 8.238 70.378 8.742 70.272 9.182 70.087 C 13.623 68.245 17.075 64.013 19.768 60.226 C 21.661 57.561 23.299 54.731 24.818 51.833 C 25.413 57.372 26.334 62.867 27.68 68.237 C 28.712 72.362 39.399 71.032 38.462 67.292 Z',
      length: 750,
    },
    g: {
      path: 'M 51.675 40.137 C 48.27 26.784 36.122 20.399 22.974 22.938 C 21.21 23.281 18.612 24.741 19.569 26.871 C 23.82 36.346 25.95 48.923 17.557 56.647 C 13.971 59.946 24.328 61.276 27.017 58.8 C 35.46 51.026 35.071 39.464 31.61 29.268 C 34.441 30.54 37.24 32.878 38.85 35.622 C 41.716 40.507 42.928 47.979 41.881 53.557 C 39.921 64.028 26.784 71.326 17.707 64.233 C 6.558 55.521 11.424 31.981 15.542 21.281 C 18.207 14.353 33.307 -5.609 34.618 14.644 C 34.878 18.648 45.538 17.801 45.274 13.711 C 44.164 -3.385 24.202 -2.866 14.191 6.381 C -0.638 20.077 -8.286 60.922 13.888 71.401 C 35.205 81.471 57.281 62.091 51.675 40.137 Z',
      length: 800,
    },
    a: {
      path: 'M 55.556 70.278 C 52.619 63.841 49.962 57.338 47.557 50.768 C 47.974 50.618 48.399 50.489 48.817 50.335 C 52.568 48.945 53.151 38.073 49.076 39.588 C 47.498 40.175 45.908 40.722 44.297 41.242 C 40.31 28.72 37.369 15.898 35.846 2.632 C 35.625 0.707 33.145 -0.084 30.618 0.022 C 27.843 -0.163 24.701 0.81 24.363 2.77 C 21.615 18.693 17.061 33.719 11.026 48.308 C 10.463 48.386 9.896 48.477 9.333 48.56 C 6.412 48.993 5.098 55.409 6.7 58.129 C 4.664 62.507 2.531 66.861 0.236 71.187 C -1.705 74.844 8.912 75.364 10.774 71.852 C 13.211 67.258 15.47 62.641 17.616 57.984 C 24.28 56.893 30.957 55.594 37.483 53.87 C 39.849 60.228 42.447 66.526 45.293 72.758 C 46.88 76.241 57.469 74.462 55.556 70.278 Z M 22.619 46.422 C 25.146 40.108 27.359 33.687 29.295 27.165 C 30.657 32.865 32.26 38.498 34.07 44.064 C 30.283 44.966 26.457 45.733 22.619 46.422 Z',
      length: 750,
    },
    r: {
      path: 'M 44.115 14.193 C 46.351 6.28 40.057 1.974 32.908 1.013 C 25.503 0.017 17.862 1.773 11.19 5.205 C 11.056 4.339 10.962 3.465 10.816 2.603 C 10.115 -1.526 -0.639 -0.392 0.03 3.548 C 3.813 25.805 3.002 49.094 0.424 71.398 C -0.005 75.11 10.714 74.732 11.21 70.453 C 12.04 63.246 12.658 55.936 13.028 48.594 C 17.343 46.271 23.921 43.394 29.078 43.724 C 21.799 57.66 21.256 74.973 30.424 88.38 C 32.64 91.62 43.119 89.451 40.686 85.893 C 31.585 72.591 32.92 55.589 40.824 42.181 C 41.509 41.016 40.108 39.784 39.187 39.418 C 35.085 37.796 30.751 37.422 26.417 37.827 C 34.628 31.757 41.533 23.329 44.115 14.193 Z M 13.375 37.552 C 13.446 29.38 13.095 21.215 12.229 13.134 C 12.32 13.075 12.426 13.027 12.509 12.964 C 16.882 9.583 25.61 4.257 31.404 7.398 C 37.762 10.843 30.318 21.196 27.676 24.746 C 23.94 29.765 18.961 34.328 13.375 37.552 Z',
      length: 900,
    },
    W: {
      path: 'M 43.535 2.626 C 43.019 -1.484 32.245 -0.464 32.749 3.571 C 35.004 21.565 35.209 39.558 33.505 57.493 C 29.71 46.172 28.171 33.87 27.804 22.399 C 27.738 20.234 24.557 19.47 21.667 19.88 C 19.51 20.128 17.518 21.021 17.144 22.537 C 17.144 22.541 17.14 22.545 17.14 22.553 C 17.121 22.608 17.117 22.663 17.101 22.718 C 14.597 32.886 12.672 43.235 11.255 53.663 C 10.582 45.129 10.649 36.504 11.381 27.828 C 11.7 24.041 0.957 24.497 0.595 28.772 C -1.164 49.683 0.886 70.2 8.401 89.844 C 8.405 90.623 8.85 91.214 9.551 91.635 C 9.59 91.662 9.641 91.682 9.685 91.706 C 9.807 91.773 9.925 91.847 10.063 91.902 C 12.487 93.044 17.062 92.335 18.581 90.375 C 18.617 90.332 18.664 90.288 18.695 90.241 C 18.727 90.198 18.743 90.147 18.77 90.1 C 19.01 89.722 19.168 89.308 19.18 88.844 C 19.443 77.68 20.274 66.469 21.707 55.344 C 23.864 62.874 26.848 70.094 31.048 76.444 C 31.481 77.101 32.257 77.53 33.19 77.782 C 36.13 78.995 41.374 78.093 41.795 75.534 C 45.775 51.281 46.597 27.044 43.535 2.626 Z M 7.146 23.655 C 9.295 23.466 11.928 22.604 12.279 20.218 C 12.865 16.179 13.554 12.109 14.609 8.157 C 15.786 3.752 5.067 3.76 4.071 7.491 C 2.878 11.967 2.158 16.585 1.493 21.163 C 1.158 23.45 5.823 23.773 7.146 23.655 Z',
      length: 1000,
    },
    a2: {
      path: 'M 55.556 70.278 C 52.619 63.841 49.962 57.338 47.557 50.768 C 47.974 50.618 48.399 50.489 48.817 50.335 C 52.568 48.945 53.151 38.073 49.076 39.588 C 47.498 40.175 45.908 40.722 44.297 41.242 C 40.31 28.72 37.369 15.898 35.846 2.632 C 35.625 0.707 33.145 -0.084 30.618 0.022 C 27.843 -0.163 24.701 0.81 24.363 2.77 C 21.615 18.693 17.061 33.719 11.026 48.308 C 10.463 48.386 9.896 48.477 9.333 48.56 C 6.412 48.993 5.098 55.409 6.7 58.129 C 4.664 62.507 2.531 66.861 0.236 71.187 C -1.705 74.844 8.912 75.364 10.774 71.852 C 13.211 67.258 15.47 62.641 17.616 57.984 C 24.28 56.893 30.957 55.594 37.483 53.87 C 39.849 60.228 42.447 66.526 45.293 72.758 C 46.88 76.241 57.469 74.462 55.556 70.278 Z M 22.619 46.422 C 25.146 40.108 27.359 33.687 29.295 27.165 C 30.657 32.865 32.26 38.498 34.07 44.064 C 30.283 44.966 26.457 45.733 22.619 46.422 Z',
      length: 750,
    },
    r2: {
      path: 'M 44.115 14.193 C 46.351 6.28 40.057 1.974 32.908 1.013 C 25.503 0.017 17.862 1.773 11.19 5.205 C 11.056 4.339 10.962 3.465 10.816 2.603 C 10.115 -1.526 -0.639 -0.392 0.03 3.548 C 3.813 25.805 3.002 49.094 0.424 71.398 C -0.005 75.11 10.714 74.732 11.21 70.453 C 12.04 63.246 12.658 55.936 13.028 48.594 C 17.343 46.271 23.921 43.394 29.078 43.724 C 21.799 57.66 21.256 74.973 30.424 88.38 C 32.64 91.62 43.119 89.451 40.686 85.893 C 31.585 72.591 32.92 55.589 40.824 42.181 C 41.509 41.016 40.108 39.784 39.187 39.418 C 35.085 37.796 30.751 37.422 26.417 37.827 C 34.628 31.757 41.533 23.329 44.115 14.193 Z M 13.375 37.552 C 13.446 29.38 13.095 21.215 12.229 13.134 C 12.32 13.075 12.426 13.027 12.509 12.964 C 16.882 9.583 25.61 4.257 31.404 7.398 C 37.762 10.843 30.318 21.196 27.676 24.746 C 23.94 29.765 18.961 34.328 13.375 37.552 Z',
      length: 850,
    },
    s: {
      path: 'M 35.673 32.336 C 27.871 26.974 14.133 25.183 11.074 15.098 C 10.109 11.921 10.342 7.193 14.388 7.327 C 20.376 7.524 26.245 19.581 28.304 24.817 C 28.355 25.506 28.745 26.041 29.367 26.431 C 31.288 27.805 35.575 27.447 37.661 25.872 C 37.764 25.797 37.874 25.726 37.964 25.648 C 37.97 25.64 37.974 25.635 37.98 25.632 C 38.563 25.112 38.933 24.471 38.941 23.711 C 39.043 16.783 40.185 9.724 42.665 3.225 C 44.216 -0.833 33.634 -1.07 32.245 2.564 C 31.434 4.69 30.8 6.902 30.249 9.142 C 24.911 3.268 17.849 -0.798 9.936 1.025 C 2.256 2.792 -2.082 10.705 1 18.007 C 7.007 32.245 27.155 31.037 34.563 44.232 C 40.251 54.369 35.992 69.351 21.785 65.938 C 10.082 63.127 6.976 38.981 19.64 44.063 C 23.057 45.433 32.481 41.528 26.816 39.256 C 14.022 34.123 -2.857 39.091 0.615 55.9 C 4.004 72.303 24.848 75.571 37.842 69.079 C 54.081 60.966 48.447 41.114 35.673 32.336 Z M 37.964 25.648 C 37.965 25.647 37.966 25.646 37.967 25.645',
      length: 950,
    },
  };

  const letters = [
    // "Sugar" in pink
    { key: 'S', ...exactPaths.S, fillColor: '#ffd6e8', strokeColor: '#b85c8a' },
    { key: 'u', ...exactPaths.u, fillColor: '#ffd6e8', strokeColor: '#b85c8a' },
    { key: 'g', ...exactPaths.g, fillColor: '#ffd6e8', strokeColor: '#b85c8a' },
    { key: 'a', ...exactPaths.a, fillColor: '#ffd6e8', strokeColor: '#b85c8a' },
    { key: 'r', ...exactPaths.r, fillColor: '#ffd6e8', strokeColor: '#b85c8a' },
    // "Hustle" in green
    { key: 'W', ...exactPaths.W, fillColor: '#d4f6d4', strokeColor: '#4a7c4a' },
    {
      key: 'a2',
      ...exactPaths.a,
      fillColor: '#d4f6d4',
      strokeColor: '#4a7c4a',
    },
    {
      key: 'r2',
      ...exactPaths.r2,
      fillColor: '#d4f6d4',
      strokeColor: '#4a7c4a',
    },
    { key: 'S', ...exactPaths.S, fillColor: '#d4f6d4', strokeColor: '#4a7c4a' },
  ];

  useEffect(() => {
    // Prevent animation from starting if already started or completed
    if (animationStarted.current || animationCompleted.current) {
      return;
    }

    animationStarted.current = true;
    if (__DEV__) console.log('🎨 Starting ExactFontHandwriting animation');

    let animationFrame: number;
    let startTime: number;
    const letterDuration = 400; // Slightly faster for smoother flow
    const letterOverlap = 150; // Start next letter before current finishes (negative delay)
    const effectiveDelay = letterDuration - letterOverlap; // Letters overlap for smoother flow

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      // Calculate which letter we're on and progress within that letter
      const totalElapsed = elapsed;
      const letterIndex = Math.floor(totalElapsed / effectiveDelay);
      const letterElapsed = totalElapsed - letterIndex * effectiveDelay;
      const letterProgress = Math.min(letterElapsed / letterDuration, 1);

      setCurrentLetter(letterIndex);
      setProgress(letterProgress);

      // Check if "Sugar" (first 5 letters) is completed
      // Since letters now overlap, check if we're past the 5th letter or well into it
      const sugarThreshold = 5 * effectiveDelay + letterDuration * 0.7; // 70% through 5th letter
      if (!sugarCompleted && totalElapsed >= sugarThreshold) {
        setSugarCompleted(true);
        if (__DEV__) console.log('🎨 Sugar animation completed, showing buttons');
        if (onSugarComplete) {
          onSugarComplete(); // Call immediately, don't use setTimeout in animation loop
        }
      }

      // Calculate fill progress (delayed by 100ms to create stroke-then-fill effect)
      const fillDelay = 100;
      const fillElapsed = Math.max(0, letterElapsed - fillDelay);
      const fillDuration = letterDuration - fillDelay;
      const currentFillProgress = Math.min(fillElapsed / fillDuration, 1);
      setFillProgress(currentFillProgress);

      // Continue animation until all letters complete
      if (letterIndex < letters.length) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        // All letters done
        if (!animationCompleted.current) {
          animationCompleted.current = true;
          if (__DEV__) {
            console.log(
              '🎨 All letters completed, triggering onAnimationComplete'
            );
          }
          onAnimationComplete?.();
        }
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - animation should only run once on mount

  const renderLetter = (
    letter: (typeof letters)[0],
    index: number,
    transform: string
  ) => {
    const isActive = currentLetter === index;
    const isPast = currentLetter > index;
    const isFuture = currentLetter < index;

    // Dash array and offset for stroke animation
    const dashArray = letter.length;
    const dashOffset = isActive
      ? dashArray * (1 - progress)
      : isPast
        ? 0
        : dashArray;

    // Fill opacity (0 = transparent, 1 = opaque)
    const fillOpacity = isPast ? 1 : isActive ? fillProgress : 0;

    return (
      <G key={letter.key} transform={transform}>
        {/* Fill (appears as stroke completes) */}
        {
          <Path
            d={letter.path}
            fill={letter.strokeColor}
            transform="translate(3, 3)"
            opacity={fillOpacity}
          />
        }
        <Path
          d={letter.path}
          fill={letter.fillColor}
          fillOpacity={fillOpacity}
          stroke="none"
        />
        {/* Stroke (draws the letter) */}
        <Path
          d={letter.path}
          fill="none"
          stroke={letter.strokeColor}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${dashArray},${dashArray}`}
          strokeDashoffset={dashOffset}
        />
      </G>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        {/* "Sugar" positioned like final layout */}
        <View style={styles.sugarContainer}>
          <Svg width="300" height="170" viewBox="0 0 300 50">
            <G>
              {renderLetter(letters[0], 0, 'translate(0, -43) scale(1.6)')}
              {renderLetter(letters[1], 1, 'translate(65, 5) scale(1.26)')}
              {renderLetter(letters[2], 2, 'translate(105, 5) scale(1.26)')}
              {renderLetter(letters[3], 3, 'translate(145, 5) scale(1.26)')}
              {renderLetter(letters[4], 4, 'translate(205, 5) scale(1.26)')}
            </G>
          </Svg>
        </View>

        {/* "Hustle" positioned like final layout */}
        <View style={styles.hustleContainer}>
          <Svg width="300" height="170" viewBox="0 20 300 50">
            <G>
              {renderLetter(letters[8], 8, 'translate(190, 22) scale(1.6)')}
              {renderLetter(letters[5], 5, 'translate(45, 22) scale(1.26)')}
              {renderLetter(letters[6], 6, 'translate(85, 22) scale(1.26)')}
              {renderLetter(letters[7], 7, 'translate(145, 22) scale(1.26)')}
            </G>
          </Svg>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  titleContainer: {
    width: '100%',
  },
  sugarContainer: {
    alignSelf: 'flex-start',
    marginLeft: 30,
    marginTop: -10,
    marginBottom: 10,
  },
  hustleContainer: {
    alignSelf: 'flex-end',
    marginRight: 5,
    marginTop: -50,
    paddingBottom: 0,
  },
});
