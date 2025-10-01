import React from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FastModal from './FastModal';
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

  return (
    <FastModal
      visible={visible}
      onClose={dismissible ? onCancel : undefined}
      animationType="spring"
      backdropOpacity={0.6}
      modalStyle={[
        styles.modal,
        {
          backgroundColor: themeStyles.background,
          borderColor: themeStyles.border,
          zIndex: 1000000,
          elevation: 1000000,
        },
      ]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TextWithEmojis style={styles.emoji}>{emoji}</TextWithEmojis>
        <TextWithEmojis style={[styles.title, { color: themeStyles.titleColor }]}>
          {title}
        </TextWithEmojis>
        <TextWithEmojis style={[styles.message, { color: themeStyles.messageColor }]}>
          {message}
        </TextWithEmojis>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              {
                backgroundColor: themeStyles.confirmBg,
                borderColor: themeStyles.confirmBorder,
              },
            ]}
            onPress={onConfirm}
          >
            <Text style={[styles.confirmButtonText, { color: '#ffffff' }]}>
              {confirmText}
            </Text>
          </TouchableOpacity>

          {cancelText && (
            <TouchableOpacity
              style={[
                styles.cancelButton,
                {
                  backgroundColor: themeStyles.cancelBg,
                  borderColor: themeStyles.cancelBorder,
                },
              ]}
              onPress={onCancel}
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  { color: themeStyles.textColor },
                ]}
              >
                {cancelText}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </FastModal>
  );
}

const styles = StyleSheet.create({
  modal: {
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
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
    lineHeight: 22,
    fontFamily: 'PixeloidMono',
  },
  buttonContainer: {
    gap: 12,
  },
  confirmButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
  },
});
