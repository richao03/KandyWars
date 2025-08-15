import { Dimensions } from 'react-native';

// Get screen dimensions
export const getScreenDimensions = () => {
  const { width, height } = Dimensions.get('window');
  return { width, height };
};

// Device categories based on screen height
export const getDeviceCategory = () => {
  const { height } = getScreenDimensions();
  
  if (height <= 667) return 'extra-small'; // iPhone SE, older devices
  if (height <= 736) return 'small';       // iPhone 8 Plus
  if (height <= 844) return 'medium';      // iPhone 12/13/14/15 Pro, standard sizes
  if (height <= 932) return 'large';       // iPhone 12/13/14/15 Pro Max
  return 'extra-large';                    // Future devices or tablets
};

// Check device categories
export const isExtraSmallScreen = () => getDeviceCategory() === 'extra-small';
export const isSmallScreen = () => ['extra-small', 'small'].includes(getDeviceCategory());
export const isMediumScreen = () => getDeviceCategory() === 'medium';
export const isLargeScreen = () => ['large', 'extra-large'].includes(getDeviceCategory());

// Get responsive values based on device category
export const getResponsiveValue = (
  extraSmallValue: number,
  smallValue: number,
  mediumValue: number,
  largeValue: number
) => {
  const category = getDeviceCategory();
  switch (category) {
    case 'extra-small': return extraSmallValue;
    case 'small': return smallValue;
    case 'medium': return mediumValue;
    case 'large':
    case 'extra-large':
    default: return largeValue;
  }
};

// Standardized responsive spacing system - optimized for single view height
export const ResponsiveSpacing = {
  // Container spacing
  containerPadding: () => getResponsiveValue(8, 12, 16, 16),
  containerPaddingBottom: () => getResponsiveValue(40, 50, 60, 80),
  
  // Header spacing
  headerMargin: () => getResponsiveValue(6, 8, 12, 16),
  headerPadding: () => getResponsiveValue(8, 10, 12, 16),
  
  // Section spacing (between major components)
  sectionMargin: () => getResponsiveValue(8, 12, 16, 20),
  sectionPadding: () => getResponsiveValue(8, 10, 12, 16),
  
  // Button/footer spacing
  buttonMargin: () => getResponsiveValue(4, 6, 8, 12),
  buttonPadding: () => getResponsiveValue(6, 8, 12, 16),
  buttonGap: () => getResponsiveValue(6, 8, 12, 16),
  
  // Font sizes - optimized for readability and space
  titleSize: () => getResponsiveValue(20, 22, 24, 28),
  subtitleSize: () => getResponsiveValue(12, 13, 14, 16),
  textSize: () => getResponsiveValue(14, 15, 16, 18),
  buttonTextSize: () => getResponsiveValue(13, 14, 15, 16),
  
  // Component specific spacing
  gameInfoGap: () => getResponsiveValue(8, 12, 16, 20),
  inputMargin: () => getResponsiveValue(6, 8, 12, 16),
  
  // Special compact mode for extra-small screens
  isCompactMode: () => isExtraSmallScreen() || isSmallScreen(),
};

// Device reference (heights in points):
// iPhone SE (2nd/3rd gen): 667pt
// iPhone 8 Plus: 736pt
// iPhone X/XS/11 Pro: 812pt
// iPhone XR/11: 896pt
// iPhone 12 mini: 812pt
// iPhone 12/13/14: 844pt
// iPhone 12/13/14 Pro: 844pt
// iPhone 12/13/14 Pro Max: 926pt
// iPhone 15: 852pt
// iPhone 15 Pro: 852pt  
// iPhone 15 Pro Max: 932pt