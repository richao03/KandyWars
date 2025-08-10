import React, { useEffect, useRef } from 'react';
import {
  Animated,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useEventHandler } from '../../src/context/EventHandlerContext';

export default function EventModal() {
  const { currentEvent, dismissEvent, getTheme } = useEventHandler();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (currentEvent) {
      // Reset shake animation
      shakeAnim.setValue(0);
      
      if (currentEvent.category === 'bad') {
        // For BAD events: Immediate appearance with shake
        fadeAnim.setValue(1);
        scaleAnim.setValue(1);
        
        // Shake animation for 0.5 seconds
        Animated.sequence([
          Animated.timing(shakeAnim, {
            toValue: 10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 5,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -5,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 5,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -5,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        // For GOOD/NEUTRAL events: Smooth fade in and scale up
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          })
        ]).start();
      }
    }
  }, [currentEvent, fadeAnim, scaleAnim, shakeAnim]);

  const handleDismiss = () => {
    // Fade out and scale down before dismissing
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Callback will be executed in dismissEvent
      dismissEvent();
    });
  };

  if (!currentEvent) {
    return null;
  }
  
  const theme = getTheme(currentEvent.category!);

  // Use absolute positioning for proper visibility
  return (
    <Animated.View 
      style={[styles.modalOverlay, { opacity: fadeAnim }]} 
      pointerEvents="auto"
    >
      <TouchableOpacity
        style={styles.backgroundTouchable}
        onPress={handleDismiss}
        activeOpacity={1}
      />

      <Animated.View style={[
        styles.centeredContainer, 
        { 
          transform: [
            { scale: scaleAnim },
            { translateX: shakeAnim }
          ] 
        }
      ]}>
        {currentEvent.backgroundImage ? (
          <View style={styles.modalWithBackground}>
            <ImageBackground
              source={currentEvent.backgroundImage}
              style={{ flex: 1 }}
              imageStyle={styles.backgroundImage}
              resizeMode="cover"
              onError={(error) => console.log('ImageBackground error:', error)}
              onLoad={() => console.log('ImageBackground loaded successfully')}
            >
              <View style={[styles.overlayContent]}>
                <Text style={[styles.heading, { color: theme.titleColor }]}>
                  {currentEvent.heading}
                </Text>

                <View
                  style={[
                    styles.subtitleContainer,
                    { backgroundColor: theme.containerColor },
                  ]}
                >
                  <Text style={[styles.title, { color: theme.titleColor }]}>
                    {currentEvent.title}
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.textColor }]}>
                    {currentEvent.subtitle}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.dismissButton,
                    { backgroundColor: theme.buttonColor },
                  ]}
                  onPress={handleDismiss}
                >
                  <Text style={styles.dismissText}>
                    {currentEvent.dismissText || '👍 Got it!'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ImageBackground>
          </View>
        ) : (
          <View
            style={[
              styles.modal,
              {
                backgroundColor: theme.backgroundColor,
                borderColor: theme.borderColor,
              },
            ]}
          >
            <Text style={[styles.heading, { color: theme.buttonColor }]}>
              {currentEvent.heading}
            </Text>

            <Text style={[styles.title, { color: '#333' }]}>
              {currentEvent.title}
            </Text>

            <View style={styles.subtitleContainer}>
              <Text style={[styles.subtitle, { color: '#444' }]}>
                {currentEvent.subtitle}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.dismissButton,
                { backgroundColor: theme.buttonColor },
              ]}
              onPress={handleDismiss}
            >
              <Text style={styles.dismissText}>
                {currentEvent.dismissText || '👍 Got it!'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 999999,
    elevation: 999999,
  },
  backgroundTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 350,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  modalWithBackground: {
    width: '100%',
    maxWidth: 350,
    height: 400,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
    backgroundColor: '#000', // Fallback color to see if container is working
  },
  backgroundImage: {
    borderRadius: 20,
    resizeMode: 'cover',
  },
  overlayContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'CrayonPastel',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 12,
    fontFamily: 'CrayonPastel',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitleContainer: {
    backgroundColor: 'rgba(50, 50, 50, 0.4)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: 'CrayonPastel',
    fontWeight: '600',
  },
  dismissButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  dismissText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'CrayonPastel',
  },
});
