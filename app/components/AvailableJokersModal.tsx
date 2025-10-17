import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useJokers } from '../../src/hooks/useJokers';
import FastModal from './FastModal';
import JokerCard from './JokerCard';
import PixelBorder from './PixelBorder';
import TextWithEmojis from './TextWithEmojis';

interface AvailableJokersModalProps {
  visible: boolean;
  onClose: () => void;
  jokers: any[]; // Array of jokers for this subject
  subject: string; // e.g., "Math", "Art", etc.
  themeColors: {
    borderColor: string;
    backgroundColor: string;
    headerColor: string;
    textColor: string;
  };
}

export default function AvailableJokersModal({
  visible,
  onClose,
  jokers,
  subject,
  themeColors,
}: AvailableJokersModalProps) {
  const { jokers: ownedJokers } = useJokers();

  // Filter out owned jokers - show only jokers not yet obtained
  const availableJokers = useMemo(() => {
    const ownedIds = new Set(ownedJokers.map((j: any) => j.id?.toString()));
    return jokers.filter((j) => !ownedIds.has(j.id?.toString()));
  }, [jokers, ownedJokers]);

  const ownedCount = jokers.length - availableJokers.length;
  const totalCount = jokers.length;

  return (
    <FastModal
      visible={visible}
      onClose={onClose}
      animationType="spring"
      backdropOpacity={0.8}
      modalStyle={styles.modal}
    >
      <PixelBorder
        borderColor={themeColors.borderColor}
        borderWidth={3}
        backgroundColor={themeColors.backgroundColor}
        innerPadding={16}
      >
        <View style={styles.container}>
          {/* Header */}

          <Text style={[styles.subtitle, { color: themeColors.textColor }]}>
            {ownedCount}/{totalCount} Collected
          </Text>

          {/* Jokers List */}
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {availableJokers.length > 0 ? (
              <View style={styles.jokersGrid}>
                {availableJokers.map((joker) => (
                  <View key={joker.id} style={styles.jokerCardWrapper}>
                    <JokerCard
                      joker={joker}
                      isAfterSchool={false}
                      disableActivation={true}
                      isCompact={true}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <PixelBorder
                borderColor={themeColors.borderColor}
                borderWidth={3}
                backgroundColor={themeColors.backgroundColor}
                innerPadding={20}
                style={styles.emptyContainer}
              >
                <TextWithEmojis
                  style={[styles.emptyText, { color: themeColors.textColor }]}
                  imageSize={32}
                >
                  🎉 All {subject} Jokers Collected!
                </TextWithEmojis>
                <Text
                  style={[
                    styles.emptySubtext,
                    { color: themeColors.textColor },
                  ]}
                >
                  You've discovered every joker from this subject!
                </Text>
              </PixelBorder>
            )}
          </ScrollView>

          {/* Close Button */}
          <PixelBorder
            borderColor={themeColors.borderColor}
            borderWidth={3}
            backgroundColor={themeColors.backgroundColor}
            innerPadding={0}
            style={styles.closeButtonWrapper}
          >
            <View style={styles.closeButton} onTouchEnd={onClose}>
              <Text
                style={[
                  styles.closeButtonText,
                  { color: themeColors.textColor },
                ]}
              >
                Close
              </Text>
            </View>
          </PixelBorder>
        </View>
      </PixelBorder>
    </FastModal>
  );
}

const styles = StyleSheet.create({
  modal: {
    width: '95%',
    maxWidth: 500,
    height: '85%',
    minHeight: 400,
    maxHeight: 700,
  },
  container: {
    height: '100%',
  },
  headerBorder: {
    marginBottom: 16,
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 14,
  },
  scrollView: {
    flex: 1,
    marginBottom: 12,
  },
  jokersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 4,
  },
  jokerCardWrapper: {
    width: 160,
    height: 180,
    marginBottom: 2,
  },
  emptyContainer: {
    marginTop: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    opacity: 0.8,
  },
  closeButtonWrapper: {
    marginTop: 8,
  },
  closeButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
  },
});
