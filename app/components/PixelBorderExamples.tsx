import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { GamePixelBorder, GamePixelButton, GamePixelCard } from './GamePixelBorder';
import PixelBorder from './PixelBorder';
import SimplePixelBorder from './SimplePixelBorder';

/**
 * Examples of how to use the pixel border components
 * These work on both Android and iOS
 */
const PixelBorderExamples = () => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Pixel Border Examples</Text>

      {/* GamePixelBorder - The recommended option */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>GamePixelBorder (Recommended)</Text>

        {/* Basic border */}
        <GamePixelBorder
          borderColor="#3b82f6"
          backgroundColor="#dbeafe"
          style={styles.example}
        >
          <Text>Basic pixel border</Text>
        </GamePixelBorder>

        {/* Clickable border */}
        <GamePixelBorder
          borderColor="#22c55e"
          backgroundColor="#d4f6d4"
          style={styles.example}
          onPress={() => console.log('Clicked!')}
        >
          <Text>Clickable pixel border</Text>
        </GamePixelBorder>

        {/* Button variant */}
        <GamePixelButton
          borderColor="#ef4444"
          backgroundColor="#fee2e2"
          textColor="#dc2626"
          onPress={() => console.log('Button pressed!')}
        >
          Pixel Button
        </GamePixelButton>

        {/* Card variant */}
        <GamePixelCard>
          <Text style={styles.cardTitle}>Game Stats</Text>
          <Text>Score: 1,000</Text>
          <Text>Level: 5</Text>
        </GamePixelCard>
      </View>

      {/* PixelBorder - Full pixel art style */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PixelBorder (Full Detail)</Text>

        <PixelBorder
          borderColor="#9333ea"
          backgroundColor="#f3e8ff"
          borderWidth={3}
        >
          <Text style={styles.content}>
            Full pixel-art style border with stepped corners
          </Text>
        </PixelBorder>
      </View>

      {/* SimplePixelBorder - Balanced approach */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SimplePixelBorder (Balanced)</Text>

        <SimplePixelBorder
          borderColor="#fbbf24"
          backgroundColor="#fef3c7"
          size="medium"
        >
          <Text style={styles.content}>
            Simpler pixel border with good performance
          </Text>
        </SimplePixelBorder>

        <SimplePixelBorder
          borderColor="#06b6d4"
          backgroundColor="#e0f2fe"
          size="large"
          style={styles.example}
        >
          <Text style={styles.content}>
            Large size variant
          </Text>
        </SimplePixelBorder>
      </View>

      {/* How to replace existing borders */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Replacing Existing Borders</Text>

        <Text style={styles.code}>
          {`// Instead of:
<TouchableOpacity style={{
  borderWidth: 2,
  borderColor: '#4a6c82',
  borderRadius: 8,
  backgroundColor: '#fff',
  padding: 12
}}>
  <Text>Old Button</Text>
</TouchableOpacity>

// Use:
<GamePixelButton
  borderColor="#4a6c82"
  backgroundColor="#fff"
  onPress={handlePress}
>
  New Pixel Button
</GamePixelButton>`}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  example: {
    marginVertical: 8,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  code: {
    backgroundColor: '#1a1a1a',
    color: '#22c55e',
    padding: 12,
    borderRadius: 4,
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

export default PixelBorderExamples;