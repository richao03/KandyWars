// Comprehensive Image Registry - Centralized stable image references
// Using require() statements directly prevents dynamic module ID issues

// Event-specific images
export const EVENT_IMAGES = {
  pricedrop: require('../assets/images/pricedrop.png'),
  pricehike: require('../assets/images/pricehike.png'),
  bully: require('../assets/images/bully.png'),
  foundmoney: require('../assets/images/foundmoney.png'),
  confiscate: require('../assets/images/confiscate.png'),
  eventPriceSpike: require('../assets/images/event_price_spike_unique.png'),
} as const;

// Background images for different screens
export const BACKGROUND_IMAGES = {
  titleScreen: require('../assets/images/titleScreen.png'),
  school: require('../assets/images/school.png'),
  eveningStreet: require('../assets/images/evening-street.png'),
  piggyBank: require('../assets/images/piggy-bank.png'),
  schoolsOut: require('../assets/images/schoolsOut.png'),
  studioLogo: require('../assets/images/studioLogo.png'),
  goingToSchool: require('../assets/images/goingToSchool.png'),
} as const;

// Dog character images (used across multiple components)
export const DOG_IMAGES = {
  pug: require('../assets/images/doggs/pug.png'),
  brusselGriffon: require('../assets/images/doggs/brussleGriffon.png'),
  evee: require('../assets/images/doggs/evee.png'),
  byul: require('../assets/images/doggs/byul.png'),
  caneCorso: require('../assets/images/doggs/caneCorso.png'),
  pitbull: require('../assets/images/doggs/pitbull.png'),
  afghan: require('../assets/images/doggs/afghan.png'),
  germanShepard: require('../assets/images/doggs/germanShepard.png'),
} as const;

// Game mechanic images (rock paper scissors, etc.)
export const GAME_IMAGES = {
  rock: require('../assets/images/rock.png'),
  paper: require('../assets/images/paper.png'),
  scissors: require('../assets/images/scissors.png'),
} as const;

// Combined registry for easy access
export const IMAGE_REGISTRY = {
  events: EVENT_IMAGES,
  backgrounds: BACKGROUND_IMAGES,
  dogs: DOG_IMAGES,
  games: GAME_IMAGES,
} as const;

// Debug logging to verify stable loading
console.log('🖼️ Image Registry - Stable References Loaded');
console.log('📊 Event Images:', Object.keys(EVENT_IMAGES));
console.log('🖼️ Background Images:', Object.keys(BACKGROUND_IMAGES));
console.log('🐕 Dog Images:', Object.keys(DOG_IMAGES));
console.log('🎮 Game Images:', Object.keys(GAME_IMAGES));

// Debug specific image values
console.log('🔍 titleScreen image value:', BACKGROUND_IMAGES.titleScreen);
console.log('🔍 school image value:', BACKGROUND_IMAGES.school);