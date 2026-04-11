import React from 'react';
import { Image, Text, TextStyle, View } from 'react-native';
import { EMOJI_IMAGES, EMOJI_TO_IMAGE_MAP } from '../../utils/eventImages';

interface TextWithEmojisProps {
  children: string;
  style?: TextStyle | TextStyle[];
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  testID?: string;
  accessibilityLabel?: string;
  imageSize?: number; // Custom image size for emojis
  textSize?: number; // Custom text size (overrides fontSize from style)
}

/**
 * Global component that renders text with emojis replaced by images
 * Can be used as a drop-in replacement for React Native's Text component
 *
 * @param imageSize - Custom size for emoji images (overrides automatic calculation)
 * @param textSize - Custom font size for text (overrides fontSize from style)
 */
export const TextWithEmojis: React.FC<TextWithEmojisProps> = ({
  children,
  style,
  numberOfLines,
  ellipsizeMode,
  testID,
  accessibilityLabel,
  imageSize,
  textSize,
}) => {
  // Calculate styles early so we can use them in both branches
  const flatStyle = Array.isArray(style)
    ? Object.assign({}, ...style)
    : style || {};

  // Create updated style with custom textSize if provided
  const updatedStyle = textSize ? { ...flatStyle, fontSize: textSize } : style;
  // Check if text contains any mappable emojis
  const hasEmojis = Object.keys(EMOJI_TO_IMAGE_MAP).some((emoji) =>
    children.includes(emoji)
  );

  if (!hasEmojis) {
    return (
      <Text
        style={updatedStyle}
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </Text>
    );
  }

  // Create a regex pattern for all supported emojis
  const emojiPattern = Object.keys(EMOJI_TO_IMAGE_MAP)
    .map((emoji) => emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // Escape special regex chars
    .join('|');

  const regex = new RegExp(`(${emojiPattern})`, 'g');
  const parts = children.split(regex);
  const elements: React.ReactNode[] = [];

  // Use custom textSize if provided, otherwise fallback to style fontSize
  const fontSize = textSize || flatStyle.fontSize || 16;

  // Use custom imageSize if provided, otherwise calculate based on fontSize
  const emojiSize = imageSize || Math.max(fontSize * 0.9, 12);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (part && EMOJI_TO_IMAGE_MAP[part as keyof typeof EMOJI_TO_IMAGE_MAP]) {
      // This part is a supported emoji, replace with image(s)
      const imageKey =
        EMOJI_TO_IMAGE_MAP[part as keyof typeof EMOJI_TO_IMAGE_MAP];

      if (part === '👀') {
        if (__DEV__) console.log('ere?');
        elements.push(
          <Image
            key={`${imageKey}-right-${i}`}
            source={EMOJI_IMAGES[imageKey]}
            style={{
              width: emojiSize,
              height: emojiSize,
              marginHorizontal: 1,
            }}
            resizeMode="contain"
          />
        );
      } else {
        // Regular emoji becomes 1 image
        elements.push(
          <Image
            key={`${imageKey}-${i}`}
            source={EMOJI_IMAGES[imageKey]}
            style={{
              width: emojiSize,
              height: emojiSize,
              marginHorizontal: 1,
            }}
            resizeMode="contain"
          />
        );
      }
    } else if (part) {
      // This part is regular text
      elements.push(
        <Text key={`text-${i}`} style={updatedStyle}>
          {part}
        </Text>
      );
    }
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
      testID={testID}
      accessibilityLabel={accessibilityLabel || children}
    >
      {elements}
    </View>
  );
};

export default TextWithEmojis;
