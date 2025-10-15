import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { nameValidationService } from '../../src/services/nameValidationService';
import FastModal from './FastModal';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';

interface NamePromptModalProps {
  visible: boolean;
  onSubmitName: (name: string) => void;
  onSkip: () => void;
}

export default function NamePromptModal({
  visible,
  onSubmitName,
  onSkip,
}: NamePromptModalProps) {
  const [name, setName] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      Alert.alert(
        'Invalid Name',
        'Please enter a valid name or skip this step.'
      );
      return;
    }

    if (trimmedName.length > 20) {
      Alert.alert(
        'Name Too Long',
        'Please enter a name with 20 characters or less.'
      );
      return;
    }

    // Validate name uniqueness
    setIsValidating(true);
    setValidationError(null);

    try {
      const isAvailable =
        await nameValidationService.isNameAvailable(trimmedName);

      if (!isAvailable) {
        setValidationError(
          'This name is already taken. Please choose a different name.'
        );

        // Get suggested alternatives
        const suggestions =
          await nameValidationService.getSuggestedNames(trimmedName);
        setIsValidating(false);
        return;
      }

      // Name is available, proceed
      setValidationError(null);
      onSubmitName(trimmedName);
      setName(''); // Reset for next time
    } catch (error) {
      console.error('Error validating name:', error);
      Alert.alert(
        'Validation Error',
        'Unable to check name availability. Please try again.'
      );
    } finally {
      setIsValidating(false);
    }
  };

  const handleSkip = () => {
    onSkip();
    setName(''); // Reset for next time
  };

  return (
    <FastModal
      visible={visible}
      onClose={undefined}
      animationType="spring"
      backdropOpacity={0.7}
      modalStyle={styles.modalContainer}
    >
      <>
        <Text style={styles.subtitle}>What's your name?</Text>

        <TextInput
          style={[styles.textInput, validationError && styles.textInputError]}
          value={name}
          onChangeText={(text) => {
            setName(text);
            setValidationError(null); // Clear error when user types
          }}
          placeholder="Enter your name"
          placeholderTextColor="#999"
          maxLength={20}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          editable={!isValidating}
        />

        {validationError && (
          <Text style={styles.errorText}>{validationError}</Text>
        )}

        <View style={styles.buttonContainer}>
          <PressableButton
            onPress={handleSubmit}
            disabled={isValidating}
            shadowColor="rgba(123,169,101,1)"
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={isValidating ? 0.2 : 0.5}
            shadowRadius={5}
            elevation={8}
            style={[styles.submitButton, isValidating && styles.disabledButton]}
          >
            <PixelBorder
              borderColor="rgba(123,169,101,1)"
              borderWidth={3}
              backgroundColor="rgba(154,193,118,1)"
              innerPadding={0}
            >
              <View style={styles.buttonInner}>
                {isValidating ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.submitButtonText}>Checking...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>Start Playing!</Text>
                )}
              </View>
            </PixelBorder>
          </PressableButton>

          <PressableButton
            onPress={handleSkip}
            shadowColor="#666"
            shadowOffset={{ width: 0, height: 3 }}
            shadowOpacity={0.3}
            shadowRadius={4}
            elevation={5}
            style={styles.skipButton}
          >
            <PixelBorder
              borderColor="#999"
              borderWidth={2}
              backgroundColor="#f0f0f0"
              innerPadding={0}
            >
              <View style={styles.buttonInner}>
                <Text style={styles.skipButtonText}>Skip (use default)</Text>
              </View>
            </PixelBorder>
          </PressableButton>
        </View>
      </>
    </FastModal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#d4a574', // School theme border
  },
  subtitle: {
    fontSize: 20,
    fontFamily: 'PixeloidMono',
    color: '#8b5a3c',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    color: '#666',
    marginBottom: 25,
    textAlign: 'center',
    lineHeight: 20,
  },
  textInput: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#d4a574',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 18,
    fontFamily: 'PixeloidMono',
    backgroundColor: '#fef7e7',
    color: '#6b4423',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  submitButton: {
    width: '100%',
  },
  skipButton: {
    width: '100%',
  },
  buttonInner: {
    paddingVertical: 15,
    paddingHorizontal: 25,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'PixeloidMono',
    color: '#ffffff',
  },
  skipButtonText: {
    fontSize: 16,
    fontFamily: 'PixeloidMono',
    color: '#666',
  },
  textInputError: {
    borderColor: '#ef4444',
    borderWidth: 3,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    marginTop: 5,
    marginBottom: 10,
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
