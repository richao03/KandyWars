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

// Emoji replacement images
export const EMOJI_IMAGES = {
  eyes: require('../assets/images/emojis/eyes.png'),
  joker: require('../assets/images/emojis/joker.png'),
  chart: require('../assets/images/emojis/chart.png'),
  home: require('../assets/images/emojis/home.png'),
  gear: require('../assets/images/emojis/gear.png'),
  x: require('../assets/images/emojis/x.png'),
  palette: require('../assets/images/emojis/palette.png'),
  lightning: require('../assets/images/emojis/lightning.png'),
  moon: require('../assets/images/emojis/moon.png'),
  bullseye: require('../assets/images/emojis/bullseye.png'),
  money: require('../assets/images/emojis/money.png'),
  moneyWithWings: require('../assets/images/emojis/moneyWithWings.png'),
  backpack: require('../assets/images/emojis/backpack.png'),
  lollipop: require('../assets/images/emojis/lollipop.png'),
  candy: require('../assets/images/emojis/candy.png'),
  cupcake: require('../assets/images/emojis/cupcake.png'),
  chocolate: require('../assets/images/emojis/chocolate.png'),
  donut: require('../assets/images/emojis/donut.png'),
  cookie: require('../assets/images/emojis/cookie.png'),
  sliceOfCake: require('../assets/images/emojis/sliceOfCake.png'),
  birthdayCake: require('../assets/images/emojis/birthdayCake.png'),
  orange: require('../assets/images/emojis/orange.png'),
  strawberry: require('../assets/images/emojis/strawberry.png'),
  grapes: require('../assets/images/emojis/grapes.png'),
  watermelon: require('../assets/images/emojis/watermelon.png'),
  cherry: require('../assets/images/emojis/cherry.png'),
  pie: require('../assets/images/emojis/pie.png'),
  controller: require('../assets/images/emojis/controller.png'),
  trophy: require('../assets/images/emojis/trophy.png'),
  celebrate: require('../assets/images/emojis/celebrate.png'),
  warning: require('../assets/images/emojis/warning.png'),
  door: require('../assets/images/emojis/door.png'),
  student: require('../assets/images/emojis/student.png'),
  clock: require('../assets/images/emojis/clock.png'),
  dice: require('../assets/images/emojis/dice.png'),
  newspaper: require('../assets/images/emojis/newspaper.png'),
  talkingHead: require('../assets/images/emojis/talkingHead.png'),
  horse: require('../assets/images/emojis/horse.png'),
  sunrise: require('../assets/images/emojis/sunrise.png'),
  crystalBall: require('../assets/images/emojis/crystalBall.png'),
  mountain: require('../assets/images/emojis/mountain.png'),
  theater: require('../assets/images/emojis/theater.png'),
  scale: require('../assets/images/emojis/scale.png'),
  hallpass: require('../assets/images/emojis/hallpass.png'),
  bulkSale: require('../assets/images/emojis/bulkSale.png'),
  jumpRope: require('../assets/images/emojis/jumpRope.png'),
  cafeteria: require('../assets/images/emojis/cafeteria.png'),
  // Add more emoji images as needed
  // heart: require('../assets/images/emojis/heart.png'),
  // etc...
} as const;

// Mapping of emoji characters to image keys
export const EMOJI_TO_IMAGE_MAP = {
  '👀': 'eyes', // Eyes emoji maps to single eyes image
  '🃏': 'joker', // Joker card emoji
  '📊': 'chart', // Chart/stats emoji
  '📈': 'chart', // Chart increasing emoji
  '🏠': 'home', // House/home emoji
  '⚙️': 'gear', // Settings gear emoji
  '🔧': 'gear', // Wrench/tool emoji (also use gear image)
  '❌': 'x', // X/close emoji
  '🎨': 'palette', // Art palette emoji
  '⚡': 'lightning', // Lightning bolt emoji
  '🌙': 'moon', // Moon emoji
  '🎯': 'bullseye', // Target/bullseye emoji
  '💰': 'money', // Money bag emoji
  '💸': 'moneyWithWings', // Money with wings emoji
  '🎒': 'backpack', // Backpack emoji
  '🍭': 'lollipop', // Lollipop emoji
  '🍬': 'candy', // Candy emoji
  '🧁': 'cupcake', // Cupcake emoji
  '🍫': 'chocolate', // Chocolate emoji
  '🍩': 'donut', // Donut emoji
  '🍪': 'cookie', // Cookie emoji
  '🍰': 'sliceOfCake', // Slice of cake emoji
  '🎂': 'birthdayCake', // Birthday cake emoji
  '🍊': 'orange', // Orange emoji
  '🍓': 'strawberry', // Strawberry emoji
  '🍇': 'grapes', // Grapes emoji
  '🍉': 'watermelon', // Watermelon emoji
  '🍒': 'cherry', // Cherry emoji
  '🥧': 'pie', // Pie emoji
  '🎮': 'controller', // Game controller emoji
  '🏆': 'trophy', // Trophy emoji
  '🎉': 'celebrate', // Party/celebration emoji
  '⚠️': 'warning', // Warning emoji
  '🚪': 'door', // Door emoji
  '🏃‍♂️': 'student', // Running man emoji (student character)
  '⏱️': 'clock', // Stopwatch emoji
  '🕘': 'clock', // Nine o'clock emoji
  '🎲': 'dice', // Dice emoji
  '📰': 'newspaper', // Newspaper emoji
  '🗣️': 'talkingHead', // Talking head emoji
  '🐴': 'horse', // Horse emoji
  '🌅': 'sunrise', // Sunrise emoji
  '🔮': 'crystalBall', // Crystal ball emoji
  '🏔️': 'mountain', // Mountain emoji
  '🎭': 'theater', // Theater masks emoji
  '⚖️': 'scale', // Scale emoji
  '❤️': 'loveheart', // Heart emoji
  '🎖️': 'hallpass', // Hall pass / military medal emoji
  '🛒': 'bulkSale', // Shopping cart emoji
  '🪢': 'jumpRope', // Knot/rope emoji (jump rope)
  '🍽️': 'cafeteria', // Fork and knife with plate emoji (cafeteria)
  // Add more mappings as images become available
} as const;

// Debug logging to verify stable loading
if (__DEV__) {
  console.log('🖼️ Image Registry - Stable References Loaded');
  console.log('📊 Event Images:', Object.keys(EVENT_IMAGES));
  console.log('🖼️ Background Images:', Object.keys(BACKGROUND_IMAGES));
  console.log('🐕 Dog Images:', Object.keys(DOG_IMAGES));
  console.log('🎮 Game Images:', Object.keys(GAME_IMAGES));

  // Debug specific image values
  console.log('🔍 titleScreen image value:', BACKGROUND_IMAGES.titleScreen);
  console.log('🔍 school image value:', BACKGROUND_IMAGES.school);
  console.log('👀 Emoji Images:', Object.keys(EMOJI_IMAGES));
}
