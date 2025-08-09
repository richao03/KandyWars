import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  withSequence 
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// Window component with animated sunlight
const SchoolWindow = ({ windowWidth, windowHeight, leftPosition, topPosition }) => {
  const sunlightOpacity = useSharedValue(0.6);
  const sunlightScale = useSharedValue(1);

  useEffect(() => {
    const sunlightAnimation = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 3000 }),
        withTiming(0.4, { duration: 2000 }),
        withTiming(0.7, { duration: 2500 }),
        withTiming(0.5, { duration: 2000 })
      ),
      -1,
      false
    );

    const scaleAnimation = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 4000 }),
        withTiming(0.9, { duration: 3000 }),
        withTiming(1.05, { duration: 3500 })
      ),
      -1,
      false
    );

    sunlightOpacity.value = sunlightAnimation;
    sunlightScale.value = scaleAnimation;
  }, []);

  const animatedSunlightStyle = useAnimatedStyle(() => ({
    opacity: sunlightOpacity.value,
    transform: [{ scale: sunlightScale.value }],
  }));

  return (
    <View style={[
      styles.window,
      {
        width: windowWidth,
        height: windowHeight,
        left: leftPosition,
        top: topPosition,
      }
    ]}>
      {/* Window frame */}
      <View style={styles.windowFrame} />
      
      {/* Window panes */}
      <View style={styles.windowPanes}>
        <View style={styles.windowPane} />
        <View style={styles.windowPane} />
        <View style={styles.windowPane} />
        <View style={styles.windowPane} />
      </View>
      
      {/* Cross dividers */}
      <View style={styles.windowDividerHorizontal} />
      <View style={styles.windowDividerVertical} />
      
      {/* Animated sunlight streaming through */}
      <Animated.View 
        style={[
          styles.sunlight,
          animatedSunlightStyle
        ]} 
      />
    </View>
  );
};

// Blackboard component
const Blackboard = ({ boardWidth, boardHeight, leftPosition, topPosition }) => {
  return (
    <View style={[
      styles.blackboard,
      {
        width: boardWidth,
        height: boardHeight,
        left: leftPosition,
        top: topPosition,
      }
    ]}>
      {/* Blackboard surface */}
      <View style={styles.blackboardSurface} />
      
      {/* Chalk ledge */}
      <View style={styles.chalkLedge} />
      
      {/* Frame */}
      <View style={styles.blackboardFrame} />
    </View>
  );
};

// Desk component
const SchoolDesk = ({ deskWidth, leftPosition, bottomPosition }) => {
  return (
    <View style={[
      styles.desk,
      {
        width: deskWidth,
        left: leftPosition,
        bottom: bottomPosition,
      }
    ]}>
      {/* Desk top */}
      <View style={styles.deskTop} />
      
      {/* Desk legs */}
      <View style={[styles.deskLeg, { left: 10 }]} />
      <View style={[styles.deskLeg, { right: 10 }]} />
    </View>
  );
};

export default function SchoolBackground() {
  return (
    <View style={styles.container}>
      {/* Sky gradient background */}
      <LinearGradient
        colors={['#87CEEB', '#E0F6FF', '#F0F8FF']} // Sky blue to light blue to almost white
        style={styles.background}
      />
      
      {/* School windows with sunlight */}
      <SchoolWindow
        windowWidth={120}
        windowHeight={100}
        leftPosition={width * 0.1}
        topPosition={height * 0.15}
      />
      <SchoolWindow
        windowWidth={120}
        windowHeight={100}
        leftPosition={width * 0.35}
        topPosition={height * 0.15}
      />
      <SchoolWindow
        windowWidth={120}
        windowHeight={100}
        leftPosition={width * 0.6}
        topPosition={height * 0.15}
      />
      
      {/* Blackboard */}
      <Blackboard
        boardWidth={200}
        boardHeight={120}
        leftPosition={width * 0.5 - 100}
        topPosition={height * 0.08}
      />
      
      {/* School desks */}
      <SchoolDesk
        deskWidth={80}
        leftPosition={width * 0.15}
        bottomPosition={120}
      />
      <SchoolDesk
        deskWidth={80}
        leftPosition={width * 0.45}
        bottomPosition={120}
      />
      <SchoolDesk
        deskWidth={80}
        leftPosition={width * 0.75}
        bottomPosition={120}
      />
      
      {/* Floor */}
      <View style={styles.floor} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  
  // Window styles
  window: {
    position: 'absolute',
    zIndex: 3,
  },
  windowFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#8B4513', // Brown frame
    borderRadius: 8,
  },
  windowPanes: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  windowPane: {
    width: '48%',
    height: '48%',
    backgroundColor: '#E6F3FF', // Light blue glass
    margin: '1%',
    borderWidth: 2,
    borderColor: '#4A90A4', // Darker blue frame
    borderRadius: 4,
  },
  windowDividerHorizontal: {
    position: 'absolute',
    top: '50%',
    left: 8,
    right: 8,
    height: 4,
    backgroundColor: '#8B4513',
    marginTop: -2,
  },
  windowDividerVertical: {
    position: 'absolute',
    left: '50%',
    top: 8,
    bottom: 8,
    width: 4,
    backgroundColor: '#8B4513',
    marginLeft: -2,
  },
  sunlight: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    bottom: 20,
    backgroundColor: '#FFF8DC', // Cornsilk color for sunlight
    borderRadius: 6,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  
  // Blackboard styles
  blackboard: {
    position: 'absolute',
    zIndex: 4,
  },
  blackboardSurface: {
    position: 'absolute',
    top: 15,
    left: 10,
    right: 10,
    bottom: 25,
    backgroundColor: '#2F4F2F', // Dark green blackboard
    borderRadius: 4,
  },
  chalkLedge: {
    position: 'absolute',
    bottom: 10,
    left: 8,
    right: 8,
    height: 8,
    backgroundColor: '#D2B48C', // Tan chalk ledge
    borderRadius: 4,
  },
  blackboardFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 8,
    borderColor: '#8B4513', // Brown frame
    borderRadius: 6,
  },
  
  // Desk styles
  desk: {
    position: 'absolute',
    height: 60,
    zIndex: 2,
  },
  deskTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 25,
    backgroundColor: '#DEB887', // Burlywood desk surface
    borderRadius: 6,
    borderBottomWidth: 3,
    borderBottomColor: '#CD853F', // Darker wood edge
  },
  deskLeg: {
    position: 'absolute',
    top: 25,
    bottom: 0,
    width: 8,
    backgroundColor: '#A0522D', // Sienna wood legs
    borderRadius: 4,
  },
  
  // Floor
  floor: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: '#F5DEB3', // Wheat colored floor
    borderTopWidth: 3,
    borderTopColor: '#DEB887', // Darker floor border
  },
});