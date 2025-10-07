import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useCopilot } from 'react-native-copilot';
import TextWithEmojis from './TextWithEmojis';

export default function CustomCopilotTooltip(props: any) {
  // Use the useCopilot hook to get step data and navigation functions
  const {
    isFirstStep,
    isLastStep,
    goToNext,
    goToPrev,
    stop,
    currentStep,
  } = useCopilot();

  const labels = props.labels || {};

  console.log('📘 currentStep keys:', Object.keys(currentStep || {}));
  console.log('📘 currentStep.text:', currentStep?.text);
  console.log('📘 currentStep.name:', currentStep?.name);
  console.log('📘 currentStep.order:', currentStep?.order);

  // Parse text for bullet points and formatting
  const renderText = () => {
    const text = currentStep?.text;

    console.log('📘 Rendering text:', text);

    if (!text) {
      return <Text style={styles.text}>No text available</Text>;
    }

    // Check if text contains bullet points
    if (text.includes('•') || text.includes('-')) {
      // Split by line breaks
      const lines = text.split('\n').filter(line => line.trim());

      return (
        <View style={styles.bulletContainer}>
          {lines.map((line, index) => {
            const trimmedLine = line.trim();
            // Check if this line starts with a bullet
            const isBullet = /^[•\-]\s*/.test(trimmedLine);

            if (isBullet) {
              // Remove bullet/dash if present
              const cleanedLine = trimmedLine.replace(/^[•\-]\s*/, '');

              return (
                <View key={index} style={styles.bulletRow}>
                  <Text style={styles.bullet}>•</Text>
                  <TextWithEmojis style={styles.bulletText} imageSize={14}>
                    {cleanedLine}
                  </TextWithEmojis>
                </View>
              );
            } else {
              // Regular line without bullet
              return (
                <TextWithEmojis key={index} style={styles.text} imageSize={16}>
                  {trimmedLine}
                </TextWithEmojis>
              );
            }
          })}
        </View>
      );
    }

    // Regular text without bullets
    return (
      <TextWithEmojis style={styles.text} imageSize={16}>
        {text}
      </TextWithEmojis>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {renderText()}
      </View>

      <View style={styles.buttonContainer}>
        {!isFirstStep && (
          <TouchableOpacity
            style={[styles.button, styles.prevButton]}
            onPress={goToPrev}
          >
            <Text style={styles.buttonText}>
              {labels.previous || 'Previous'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.skipButton]}
          onPress={stop}
        >
          <Text style={styles.skipButtonText}>{labels.skip || 'Skip'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.nextButton]}
          onPress={() => {
            console.log('📘 Button pressed - isLastStep:', isLastStep);
            if (isLastStep) {
              console.log('📘 Calling stop() to finish tutorial');
              stop();
            } else {
              console.log('📘 Calling goToNext()');
              goToNext();
            }
          }}
        >
          <Text style={styles.buttonText}>
            {isLastStep ? labels.finish || 'Finish' : labels.next || 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 20,
    minWidth: 280,
    maxWidth: 340,
  },
  content: {
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: '#2a2a2a',
    fontFamily: 'PixeloidMono',
  },
  bulletContainer: {
    gap: 12,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    fontSize: 18,
    color: '#2a2a2a',
    fontWeight: 'bold',
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#2a2a2a',
    fontFamily: 'PixeloidMono',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    minWidth: 60,
    alignItems: 'center',
    flex: 1,
  },
  prevButton: {
    backgroundColor: '#4a5a8a',
    borderColor: '#5c7cb8',
  },
  nextButton: {
    backgroundColor: '#4a7c4a',
    borderColor: '#6b9b6b',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderColor: '#999',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  skipButtonText: {
    color: '#999',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
});
