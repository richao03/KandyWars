import React from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import FastModal from './FastModal';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';
import TextWithEmojis from './TextWithEmojis';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  theme?: 'school' | 'evening' | 'market';
  emoji?: string;
  dismissible?: boolean; // Allow dismissing by clicking background or back button
  isBonusModal?: boolean; // Special formatting for sale bonus modals
}

export default function ConfirmationModal({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText,
  onConfirm,
  onCancel,
  theme = 'school',
  emoji = '❓',
  dismissible = true,
  isBonusModal = false,
}: ConfirmationModalProps) {
  // Theme-specific styles
  const getThemeStyles = () => {
    switch (theme) {
      case 'evening':
        return {
          background: '#1a1f36', // Night-time dark blue
          border: '#2d3561',
          titleColor: '#ffffff',
          messageColor: '#a8b2d1',
          confirmBg: '#4a90e2',
          confirmBorder: '#3a7bc8',
          cancelBg: 'rgba(255, 255, 255, 0.2)',
          cancelBorder: 'rgba(255, 255, 255, 0.3)',
          textColor: '#ffffff',
        };
      case 'market':
        return {
          background: '#fefaf5', // Warm paper background
          border: '#d4a574',
          titleColor: '#6b4423',
          messageColor: '#8b4513',
          confirmBg: '#4ade80',
          confirmBorder: '#22c55e',
          cancelBg: '#f3f4f6',
          cancelBorder: '#d1d5db',
          textColor: '#374151',
        };
      default: // school
        return {
          background: '#fefaf5',
          border: '#d4a574',
          titleColor: '#6b4423',
          messageColor: '#8b4513',
          confirmBg: '#3b82f6',
          confirmBorder: '#2563eb',
          cancelBg: '#f3f4f6',
          cancelBorder: '#d1d5db',
          textColor: '#374151',
        };
    }
  };

  const themeStyles = getThemeStyles();

  // Parse bonus lines if this is a bonus modal
  const renderMessage = () => {
    if (isBonusModal) {
      // Message format: "emoji|jokerName|$amount\nemoji|jokerName|$amount\n\n$baseGain\n$totalGain"
      // Split by double newline to separate bonuses from summary
      const parts = message.split('\n\n');
      const bonusLines = parts[0]?.split('\n').filter((l) => l.trim()) || [];
      const summaryParts = parts[1]?.split('\n').filter((l) => l.trim()) || [];

      console.log('what is parts', parts);

      return (
        <View style={styles.messageContainer}>
          {bonusLines.length > 0 && (
            <View style={styles.bonusContainer}>
              {bonusLines.map((line, i) => {
                // Each line format: "emoji|jokerName|$amount"
                const [emoji, jokerName, amount] = line.split('|');
                if (!emoji || !jokerName || !amount) return null;

                return (
                  <View key={`bonus-${i}`} style={styles.bonusLine}>
                    <TextWithEmojis style={styles.bonusEmoji} imageSize={16}>
                      {emoji}
                    </TextWithEmojis>
                    <TextWithEmojis
                      style={[
                        styles.bonusText,
                        { color: themeStyles.messageColor },
                      ]}
                      imageSize={12}
                    >
                      {jokerName}
                    </TextWithEmojis>
                    <TextWithEmojis
                      style={[
                        styles.bonusAmount,
                        { color: themeStyles.messageColor },
                      ]}
                      imageSize={12}
                    >
                      {amount}
                    </TextWithEmojis>
                  </View>
                );
              })}
            </View>
          )}
          {summaryParts.length >= 2 && (
            <View style={styles.summaryContainer}>
              <TextWithEmojis
                style={[styles.summaryText, { color: themeStyles.messageColor }]}
                imageSize={12}
              >
                Base: {summaryParts[0]}
              </TextWithEmojis>
              <TextWithEmojis
                style={[styles.summaryText, { color: themeStyles.messageColor, fontWeight: 'bold' }]}
                imageSize={12}
              >
                Total: {summaryParts[1]}
              </TextWithEmojis>
            </View>
          )}
        </View>
      );
    }

    return (
      <TextWithEmojis
        style={[styles.message, { color: themeStyles.messageColor }]}
        imageSize={12}
      >
        {message}
      </TextWithEmojis>
    );
  };

  return (
    <FastModal
      visible={visible}
      onClose={dismissible ? onCancel : undefined}
      animationType="spring"
      backdropOpacity={0.6}
      modalStyle={styles.modal}
    >
      <PixelBorder
        borderColor="#d4a574"
        borderWidth={3}
        backgroundColor="rgba(255, 255, 255, 0.95)"
        innerPadding={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TextWithEmojis style={styles.emoji}>{emoji}</TextWithEmojis>
          <TextWithEmojis
            style={[styles.title, { color: themeStyles.titleColor }]}
          >
            {title}
          </TextWithEmojis>
          {renderMessage()}

          <View style={styles.buttonContainer}>
            <PressableButton
              onPress={onConfirm}
              shadowColor="rgba(123,169,101,1)"
              shadowOffset={{ width: 0, height: 4 }}
              shadowOpacity={0.5}
              shadowRadius={5}
              elevation={8}
            >
              <PixelBorder
                borderColor="rgba(123,169,101,1)"
                borderWidth={3}
                backgroundColor="rgba(154,193,118,1)"
                innerPadding={0}
              >
                <View style={styles.confirmButtonInner}>
                  <Text style={styles.confirmButtonText}>
                    {confirmText}
                  </Text>
                </View>
              </PixelBorder>
            </PressableButton>

            {cancelText && (
              <PressableButton
                onPress={onCancel}
                shadowColor="#6b5a2d"
                shadowOffset={{ width: 0, height: 3 }}
                shadowOpacity={0.4}
                shadowRadius={4}
                elevation={6}
              >
                <PixelBorder
                  borderColor="#d1d5db"
                  borderWidth={3}
                  backgroundColor="#f3f4f6"
                  innerPadding={0}
                >
                  <View style={styles.cancelButtonInner}>
                    <Text style={styles.cancelButtonText}>
                      {cancelText}
                    </Text>
                  </View>
                </PixelBorder>
              </PressableButton>
            )}
          </View>
        </ScrollView>
      </PixelBorder>
    </FastModal>
  );
}

const styles = StyleSheet.create({
  modal: {
    borderRadius: 24,
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    shadowColor: '#8b4513',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  scrollView: {
    maxHeight: SCREEN_HEIGHT * 0.8 - 48, // Account for modal padding and borders
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    fontFamily: 'PixeloidMono',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageContainer: {
    width: '100%',
    marginBottom: 24,
  },
  bonusContainer: {
    width: '100%',
    marginBottom: 16,
  },
  bonusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  bonusEmoji: {
    fontSize: 16,
    width: 24,
    marginRight: 8,
    textAlign: 'left',
  },
  bonusText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    lineHeight: 20,
  },
  bonusAmount: {
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    lineHeight: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  summaryContainer: {
    width: '100%',
    marginTop: 16,
    gap: 4,
  },
  summaryText: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
    width: '100%',
  },
  confirmButtonInner: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
    textShadowColor: '#166534',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  cancelButtonInner: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
  },
});
