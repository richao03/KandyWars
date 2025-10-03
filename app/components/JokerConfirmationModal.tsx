import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FastModal from './FastModal';
import TextWithEmojis from './TextWithEmojis';

interface JokerConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  emoji?: string;
  dismissible?: boolean;
}

export default function JokerConfirmationModal({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText,
  onConfirm,
  onCancel,
  emoji = '❓',
  dismissible = true,
}: JokerConfirmationModalProps) {
  return (
    <FastModal
      visible={visible}
      onClose={dismissible ? onCancel : undefined}
      animationType="spring"
      backdropOpacity={0.5}
      modalStyle={styles.modal}
    >
      <>
        <View style={{ alignItems: 'center' }}>
          <TextWithEmojis style={styles.emoji} imageSize={54}>
            {emoji}
          </TextWithEmojis>
        </View>
        <TextWithEmojis style={styles.title} imageSize={24}>
          {title}
        </TextWithEmojis>
        <TextWithEmojis style={styles.message} imageSize={16}>
          {message}
        </TextWithEmojis>

        <TouchableOpacity
          style={styles.confirmButton}
          onPress={onConfirm}
        >
          <Text style={styles.confirmButtonText}>
            {confirmText}
          </Text>
        </TouchableOpacity>

        {cancelText && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
          >
            <Text style={styles.cancelButtonText}>
              {cancelText}
            </Text>
          </TouchableOpacity>
        )}
      </>
    </FastModal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  emoji: {
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#d4af37',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'PixeloidMono',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  message: {
    fontSize: 16,
    color: '#cccccc',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    fontFamily: 'PixeloidMono',
  },
  confirmButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#b91c1c',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
});
