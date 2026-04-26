import { ImageSourcePropType } from 'react-native';

export const SHOPKEEPER_IMAGES: Record<'normal' | 'happy' | 'mad', ImageSourcePropType> = {
  normal: require('../assets/images/emojis/shopOwner-normal.png'),
  happy: require('../assets/images/emojis/shopOwner-happy.png'),
  mad: require('../assets/images/emojis/shopOwner-mad.png'),
};
