import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import FastModal from './FastModal';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';
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

        <PressableButton
          onPress={onConfirm}
          shadowColor="rgba(123,169,101,1)"
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.5}
          shadowRadius={5}
          elevation={8}
          style={styles.confirmButton}
        >
          <PixelBorder
            borderColor="rgba(123,169,101,1)"
            borderWidth={3}
            backgroundColor="rgba(154,193,118,1)"
            innerPadding={0}
          >
            <View style={styles.buttonInner}>
              <Text style={styles.confirmButtonText}>
                {confirmText}
              </Text>
            </View>
          </PixelBorder>
        </PressableButton>

        {cancelText && (
          <PressableButton
            onPress={onCancel}
            shadowColor="rgba(185,28,28,1)"
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.5}
            shadowRadius={5}
            elevation={8}
            style={styles.cancelButton}
          >
            <PixelBorder
              borderColor="rgba(185,28,28,1)"
              borderWidth={3}
              backgroundColor="rgba(239,68,68,1)"
              innerPadding={0}
            >
              <View style={styles.buttonInner}>
                <Text style={styles.cancelButtonText}>
                  {cancelText}
                </Text>
              </View>
            </PixelBorder>
          </PressableButton>
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
    marginVertical: 4,
  },
  cancelButton: {
    marginVertical: 4,
  },
  buttonInner: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
  },
});
