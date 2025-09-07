import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

interface ExactFontHandwritingProps {
  onAnimationComplete?: () => void;
  onCandyComplete?: () => void;
}

export default function ExactFontHandwriting({
  onAnimationComplete,
  onCandyComplete,
}: ExactFontHandwritingProps) {
  const [currentLetter, setCurrentLetter] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fillProgress, setFillProgress] = useState(0);
  const [candyCompleted, setCandyCompleted] = useState(false);
  const candyCallbackTriggered = useRef(false);

  // Exact DonGraffiti font paths from the provided SVGs
  const exactPaths = {
    C: {
      path: 'M 23.705 10.242 L 23.708 10.245 C 22.136 13.677 20.697 17.173 19.397 20.703 C 18.178 24.019 26.744 24.189 27.83 21.239 C 30.208 14.78 33.001 8.412 36.358 2.394 C 37.949 -0.463 29.474 -0.913 27.928 1.861 C 27.676 2.315 27.449 2.781 27.2 3.238 C 22.395 -0.101 16.241 -0.22 10.818 4.038 C 2.082 10.9 -0.884 24.867 0.221 35.363 C 1.415 46.681 9.184 60.132 22.209 58.969 C 37.753 57.587 43.189 39.136 41.479 26.063 C 41.048 22.772 32.431 23.601 32.85 26.819 C 33.82 34.235 32.592 51.204 22.962 53.887 C 14.04 56.375 9.247 39.665 8.774 33.697 C 8.242 26.951 9.448 19.957 12.386 13.844 C 13.438 11.659 15.035 8.176 17.239 6.847 C 20.496 4.885 21.762 7.136 23.705 10.242 Z M 17.369 26.97 C 16.395 30.472 15.655 34.012 15.296 37.63 C 15.111 39.479 18.701 39.725 19.819 39.627 C 21.466 39.482 23.733 38.789 23.925 36.878 C 24.243 33.694 24.946 30.586 25.802 27.506 C 26.775 24.001 18.2 23.988 17.369 26.97 Z',
      length: 800,
    },
    a: {
      path: 'M 44.445 56.219 C 42.095 51.07 39.97 45.867 38.046 40.611 C 38.379 40.491 38.719 40.387 39.054 40.265 C 42.054 39.15 42.521 30.455 39.261 31.667 C 37.998 32.137 36.726 32.575 35.438 32.987 C 32.248 22.972 29.895 12.719 28.677 2.106 C 28.5 0.566 26.516 -0.067 24.494 0.018 C 22.274 -0.13 19.761 0.647 19.49 2.216 C 17.292 14.955 13.649 26.975 8.821 38.643 C 8.37 38.709 7.917 38.782 7.466 38.848 C 5.13 39.191 4.078 44.324 5.36 46.5 C 3.731 50.003 2.025 53.488 0.189 56.947 C -1.364 59.872 7.13 60.287 8.619 57.479 C 10.569 53.803 12.376 50.107 14.093 46.384 C 19.424 45.511 24.766 44.475 29.986 43.093 C 31.879 48.179 33.958 53.218 36.234 58.203 C 37.504 60.987 45.972 59.563 44.445 56.219 Z M 18.095 37.135 C 20.117 32.083 21.887 26.95 23.436 21.731 C 24.529 26.292 25.808 30.795 27.256 35.248 C 24.226 35.97 21.166 36.583 18.095 37.135 Z',
      length: 700,
    },
    n: {
      path: 'M 26.848 20.694 C 26.668 28.949 26.423 37.206 26.092 45.46 C 21.311 31.241 15.243 17.397 8.532 4.189 C 7.631 1.585 0.662 2.136 0.054 4.816 C 0.038 4.885 0.042 4.958 0.035 5.027 C 0.026 5.137 0.001 5.238 0.01 5.355 C 1.493 22.405 1.975 39.845 0.01 56.892 C -0.333 59.861 8.242 59.559 8.639 56.136 C 9.763 46.367 10.069 36.469 9.858 26.59 C 16.219 41.473 21.444 56.911 24.646 72.688 C 24.549 74.14 26.435 74.804 28.466 74.745 C 30.945 74.782 33.634 73.712 33.272 71.932 C 34.447 54.627 35.092 37.278 35.47 19.939 C 35.543 16.805 26.92 17.303 26.848 20.694 Z M 27.03 2.857 C 27.03 6.406 27.005 9.952 26.964 13.502 C 26.926 16.651 35.552 16.131 35.593 12.746 C 35.637 9.197 35.659 5.651 35.662 2.101 C 35.659 -1.067 27.034 -0.522 27.03 2.857 Z',
      length: 650,
    },
    d: {
      path: 'M 8.493 0.041 C 7.457 -0.085 6.48 0.091 5.668 0.434 C 4.194 0.878 3.104 1.744 3.344 2.916 C 4.355 7.901 4.777 13.034 5.032 18.105 C 5.192 21.333 13.824 20.681 13.661 17.349 C 13.484 13.882 13.217 10.386 12.751 6.922 C 21.162 11.683 27.313 23.14 29.101 31.42 C 30.289 36.918 30.786 45.182 26.758 49.66 C 22.012 54.938 15.072 51.162 10.82 46.706 C 12.543 40.178 13.418 33.473 13.714 26.677 C 13.85 23.575 5.233 24.028 5.085 27.433 C 4.859 32.619 4.222 37.705 3.158 42.713 C 1.02 43.154 -0.693 44.319 0.28 45.805 C 0.765 46.542 1.316 47.232 1.886 47.906 C 1.372 49.691 0.828 51.471 0.169 53.231 C -1.068 56.531 7.495 56.711 8.6 53.763 C 8.641 53.656 8.666 53.546 8.704 53.439 C 19.78 59.624 35.148 57.857 37.982 42.908 C 41.39 24.929 27.12 2.343 8.493 0.041 Z',
      length: 750,
    },
    y: {
      path: 'M 32.831 39.811 C 34.689 27.296 35.832 14.668 35.99 2.096 C 36.028 -1.053 27.405 -0.534 27.361 2.852 C 27.225 13.987 26.315 25.145 24.81 36.224 C 21.579 35.493 18.187 35.434 14.843 35.906 C 18.477 25.303 19.324 13.521 17.954 2.559 C 17.545 -0.729 8.922 0.087 9.325 3.315 C 10.846 15.493 9.624 28.445 4.696 39.802 C 3.354 42.891 9.958 42.497 11.268 41.927 C 15.605 40.038 20.052 40.013 23.985 41.93 C 22.98 48.412 21.768 54.858 20.395 61.254 C 16.827 60.013 13.085 59.834 9.382 60.495 C 10.374 57.154 11.851 53.904 13.385 50.858 C 14.89 47.867 6.384 47.489 4.954 50.326 C 2.816 54.571 0.756 59.194 0.022 63.937 C -0.018 64.205 0 64.447 0.048 64.674 C -0.135 65.483 0.394 66.356 1.336 66.834 C 3.194 67.786 5.713 67.266 7.436 66.299 C 11.709 63.909 15.51 64.74 19.277 67.59 C 19.308 67.615 19.352 67.622 19.387 67.644 C 20.549 69.943 27.093 69.552 27.692 66.96 C 29.342 59.793 30.775 52.534 31.984 45.231 C 34.588 44.803 36.953 43.294 35.048 41.524 C 34.352 40.875 33.59 40.346 32.831 39.811 Z',
      length: 900,
    },
    W: {
      path: 'M 34.828 2.101 C 34.415 -1.187 25.796 -0.371 26.199 2.856 C 28.004 17.252 28.167 31.647 26.804 45.995 C 23.768 36.937 22.536 27.096 22.244 17.919 C 22.19 16.187 19.645 15.576 17.334 15.904 C 15.608 16.102 14.015 16.817 13.715 18.029 C 13.715 18.033 13.712 18.036 13.712 18.042 C 13.697 18.086 13.693 18.13 13.681 18.174 C 11.678 26.309 10.138 34.588 9.004 42.93 C 8.466 36.103 8.519 29.203 9.105 22.262 C 9.36 19.232 0.766 19.598 0.476 23.018 C -0.932 39.747 0.709 56.16 6.721 71.875 C 6.724 72.498 7.08 72.971 7.641 73.308 C 7.672 73.33 7.713 73.346 7.748 73.364 C 7.845 73.418 7.94 73.478 8.05 73.522 C 9.99 74.435 13.649 73.868 14.865 72.3 C 14.893 72.265 14.931 72.231 14.956 72.193 C 14.981 72.158 14.994 72.117 15.016 72.08 C 15.208 71.777 15.334 71.447 15.344 71.075 C 15.555 62.144 16.219 53.175 17.365 44.275 C 19.091 50.3 21.478 56.075 24.839 61.155 C 25.185 61.681 25.805 62.024 26.552 62.226 C 28.904 63.196 33.099 62.474 33.436 60.427 C 36.62 41.025 37.278 21.635 34.828 2.101 Z M 5.716 18.924 C 7.436 18.773 9.543 18.083 9.823 16.175 C 10.292 12.943 10.843 9.687 11.687 6.525 C 12.629 3.001 4.054 3.008 3.257 5.993 C 2.303 9.574 1.726 13.268 1.194 16.93 C 0.926 18.76 4.658 19.018 5.716 18.924 Z',
      length: 1000,
    },
    a2: {
      path: 'M 44.445 56.219 C 42.095 51.07 39.97 45.867 38.046 40.611 C 38.379 40.491 38.719 40.387 39.054 40.265 C 42.054 39.15 42.521 30.455 39.261 31.667 C 37.998 32.137 36.726 32.575 35.438 32.987 C 32.248 22.972 29.895 12.719 28.677 2.106 C 28.5 0.566 26.516 -0.067 24.494 0.018 C 22.274 -0.13 19.761 0.647 19.49 2.216 C 17.292 14.955 13.649 26.975 8.821 38.643 C 8.37 38.709 7.917 38.782 7.466 38.848 C 5.13 39.191 4.078 44.324 5.36 46.5 C 3.731 50.003 2.025 53.488 0.189 56.947 C -1.364 59.872 7.13 60.287 8.619 57.479 C 10.569 53.803 12.376 50.107 14.093 46.384 C 19.424 45.511 24.766 44.475 29.986 43.093 C 31.879 48.179 33.958 53.218 36.234 58.203 C 37.504 60.987 45.972 59.563 44.445 56.219 Z M 18.095 37.135 C 20.117 32.083 21.887 26.95 23.436 21.731 C 24.529 26.292 25.808 30.795 27.256 35.248 C 24.226 35.97 21.166 36.583 18.095 37.135 Z',
      length: 700,
    },
    r: {
      path: 'M 32.66 33.871 C 33.208 32.942 32.087 31.953 31.35 31.66 C 27.971 30.322 24.394 30.026 20.822 30.401 C 22.381 29.226 23.893 28.001 25.278 26.703 C 29.917 22.354 38.556 12.526 34.717 5.604 C 31.687 0.146 23.773 -0.739 18.309 0.483 C 14.64 1.299 11.623 3.072 9.136 5.415 C 8.991 4.344 8.839 3.273 8.654 2.209 C 8.081 -1.095 -0.52 -0.182 0.025 2.965 C 0.929 8.176 1.319 13.499 1.634 18.774 C 1.788 21.343 7.243 21.441 9.394 19.718 C 9.432 19.687 9.479 19.659 9.517 19.627 C 9.872 19.312 10.115 18.941 10.209 18.519 C 11.718 13.464 14.993 5.487 21.181 4.835 C 24.334 4.504 27.272 7.008 27.017 10.249 C 26.513 16.645 19.679 23.605 14.867 27.273 C 13.507 28.313 12.067 29.305 10.568 30.19 C 10.568 29.229 10.594 28.265 10.587 27.302 C 10.559 24.121 1.93 24.688 1.958 28.058 C 2.047 37.826 1.511 47.545 0.343 57.245 C -0.013 60.205 8.559 59.912 8.972 56.489 C 9.671 50.682 10.115 44.862 10.364 39.036 C 13.812 37.171 19.119 34.841 23.266 35.106 C 17.443 46.254 17.009 60.104 24.346 70.83 C 26.119 73.422 34.503 71.687 32.556 68.84 C 25.272 58.199 26.337 44.6 32.66 33.871 Z',
      length: 850,
    },
    s: {
      path: 'M 37.445 37.877 C 34.916 29.248 28.151 25.727 20.757 21.907 C 16.814 19.869 4.636 14.201 8.724 7.512 C 12.493 1.342 20.813 16.027 22.505 19.923 C 22.568 20.452 22.886 20.865 23.38 21.167 C 23.456 21.22 23.547 21.258 23.632 21.305 C 23.686 21.331 23.733 21.362 23.79 21.387 C 25.522 22.2 28.633 21.825 30.113 20.603 C 30.142 20.581 30.176 20.559 30.204 20.537 C 30.283 20.465 30.346 20.389 30.415 20.31 C 30.765 19.929 30.995 19.488 31.001 18.969 C 31.083 13.426 31.996 7.78 33.98 2.58 C 35.221 -0.667 26.756 -0.856 25.644 2.051 C 24.986 3.78 24.476 5.575 24.032 7.392 C 19.453 2.297 13.328 -1.196 6.595 1.198 C -0.97 3.887 -1.773 12.179 2.91 17.911 C 7.055 22.981 13.432 24.382 18.855 27.491 C 28.283 32.895 32.403 42.972 28.287 53.519 C 25.569 60.479 15.835 66.588 10.572 58.255 C 8.818 55.478 8.497 51.557 8.765 48.36 C 9.032 45.164 10.342 37.631 15.154 38.135 C 20.801 38.727 15.45 47.542 13.46 49.409 C 10.604 52.089 18.896 53.138 21.034 51.132 C 32.163 40.698 20.278 27.85 7.977 34.636 C -4.635 41.593 -1.483 63.209 11.759 67.35 C 28.901 72.717 41.948 53.261 37.445 37.877 Z',
      length: 950,
    },
  };

  const letters = [
    { key: 'C', ...exactPaths.C, fillColor: '#ffd6e8', strokeColor: '#b85c8a' },
    { key: 'a', ...exactPaths.a, fillColor: '#ffd6e8', strokeColor: '#b85c8a' },
    { key: 'n', ...exactPaths.n, fillColor: '#ffd6e8', strokeColor: '#b85c8a' },
    { key: 'd', ...exactPaths.d, fillColor: '#ffd6e8', strokeColor: '#b85c8a' },
    { key: 'y', ...exactPaths.y, fillColor: '#ffd6e8', strokeColor: '#b85c8a' },
    { key: 'W', ...exactPaths.W, fillColor: '#d4f6d4', strokeColor: '#4a7c4a' },
    {
      key: 'a2',
      ...exactPaths.a2,
      fillColor: '#d4f6d4',
      strokeColor: '#4a7c4a',
    },
    { key: 'r', ...exactPaths.r, fillColor: '#d4f6d4', strokeColor: '#4a7c4a' },
    { key: 's', ...exactPaths.s, fillColor: '#d4f6d4', strokeColor: '#4a7c4a' },
  ];

  useEffect(() => {
    console.log('🎨 Starting ExactFontHandwriting animation');

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

      // Check if "Candy" (first 5 letters) is completed
      // Since letters now overlap, check if we're past the 5th letter or well into it
      const candyCompletionTime = 5 * effectiveDelay; // Time when 5th letter starts
      if (!candyCallbackTriggered.current && totalElapsed >= candyCompletionTime + letterDuration * 0.5) {
        candyCallbackTriggered.current = true;
        setCandyCompleted(true);
        console.log('🎨 Candy animation completed, showing buttons');
        if (onCandyComplete) {
          onCandyComplete(); // Call immediately, don't use setTimeout in animation loop
        }
      }

      // Calculate fill progress for current letter (start fill earlier for smoother transition)
      if (letterProgress > 0.4) {
        const fillStart = 0.4; // Start filling at 40% for smoother overlap
        const fillRange = 1 - fillStart;
        const normalizedFillProgress = (letterProgress - fillStart) / fillRange;
        // Apply easing for smoother fade-in with faster ramp-up
        const easedProgress = Math.pow(normalizedFillProgress, 0.8); // Faster fade-in curve
        setFillProgress(easedProgress);
      } else {
        setFillProgress(0);
      }

      // Continue animation if not done
      if (letterIndex < letters.length || letterProgress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        console.log('🎨 ExactFontHandwriting animation complete');
        if (onAnimationComplete) {
          setTimeout(onAnimationComplete, 1000);
        }
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  const renderLetter = (letter: any, index: number, transform: string) => {
    const isActive = index === currentLetter;
    const isComplete = index < currentLetter;
    const isNext = index === currentLetter + 1;

    // Calculate opacity for fill
    let fillOpacity = 0;
    if (isComplete) {
      fillOpacity = 1; // Completed letters are fully visible
    } else if (isActive && progress > 0.4) {
      fillOpacity = fillProgress; // Current letter fades in based on fillProgress
    }

    const shouldShowFill = fillOpacity > 0;
    const shouldShowShadow = shouldShowFill;

    // Calculate stroke dash for animation
    const dashArray = letter.length;
    let dashOffset: number;
    
    if (isActive) {
      dashOffset = dashArray * (1 - progress);
    } else if (isComplete) {
      dashOffset = 0;
    } else if (isNext && progress > 0.6) {
      // Start outlining next letter when current is 60% done for overlap
      const nextProgress = (progress - 0.6) / 0.4; // 0.6-1.0 maps to 0-1
      dashOffset = dashArray * (1 - Math.max(0, nextProgress));
    } else {
      dashOffset = dashArray; // Not started yet
    }

    return (
      <G key={`${letter.key}-${index}`} transform={transform}>
        {/* Shadow layer */}
        {shouldShowShadow && (
          <Path
            d={letter.path}
            fill={letter.strokeColor}
            transform="translate(3, 3)"
            opacity={fillOpacity}
          />
        )}

        {/* Filled path */}
        {shouldShowFill && (
          <Path d={letter.path} fill={letter.fillColor} opacity={fillOpacity} />
        )}

        {/* Animated outline stroke */}
        <Path
          d={letter.path}
          stroke={letter.strokeColor}
          strokeWidth="2"
          fill="none"
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
        {/* "Candy" positioned like final layout */}
        <View style={styles.candyContainer}>
          <Svg width="300" height="150" viewBox="0 0 300 150">
            <G>
              {renderLetter(letters[0], 0, 'translate(0, 0) scale(1.8)')}
              {renderLetter(letters[1], 1, 'translate(50, 15) scale(1.26)')}
              {renderLetter(letters[2], 2, 'translate(85, 15) scale(1.26)')}
              {renderLetter(letters[3], 3, 'translate(120, 15) scale(1.26)')}
              {renderLetter(letters[4], 4, 'translate(155, 15) scale(1.26)')}
            </G>
          </Svg>
        </View>

        {/* "Wars" positioned like final layout */}
        <View style={styles.warsContainer}>
          <Svg width="250" height="150" viewBox="0 0 250 150">
            <G>
              {renderLetter(letters[5], 5, 'translate(0, 0) scale(1.8)')}
              {renderLetter(letters[6], 6, 'translate(50, 15) scale(1.26)')}
              {renderLetter(letters[7], 7, 'translate(85, 15) scale(1.26)')}
              {renderLetter(letters[8], 8, 'translate(120, 15) scale(1.26)')}
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
    minHeight: 270,
  },
  titleContainer: {
    width: '100%',
  },
  candyContainer: {
    alignSelf: 'flex-start',
    marginLeft: 60,
    marginTop: 50,
    marginBottom: 30,
  },
  warsContainer: {
    alignSelf: 'flex-end',
    marginRight: 5,
    marginTop: -65,
  },
});
